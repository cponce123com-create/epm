/**
 * migrate-from-zip.ts
 * Lee imágenes directamente del ZIP de Medium (sin tocar CDN)
 * y las sube a Cloudinary, luego actualiza la BD.
 */
import AdmZip from "adm-zip";
import { createHash } from "node:crypto";
import { db, articlesTable } from "@workspace/db";
import { v2 as cloudinary } from "cloudinary";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { resolve } from "node:path";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Normaliza el nombre de archivo de Medium para buscar dentro del ZIP
// Las imágenes en el ZIP están en  images/  con el nombre original
function getImageFilenamesFromZip(zip: AdmZip): Map<string, AdmZip.IZipEntry> {
  const map = new Map<string, AdmZip.IZipEntry>();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName; // ej: "images/1*AbcXyz.jpeg"
    if (name.startsWith("images/") || name.includes("/images/")) {
      const basename = name.split("/").pop() ?? "";
      if (basename) map.set(basename, entry);
    }
  }
  return map;
}

// Extrae el "filename" de Medium de una URL CDN
// https://cdn-images-1.medium.com/max/800/1*AbcXyz.jpeg  →  1*AbcXyz.jpeg
function basenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.split("/").pop() ?? "";
  } catch {
    return url.split("/").pop() ?? "";
  }
}

function isMediumUrl(url: string): boolean {
  return url.includes("medium.com") || url.includes("miro.medium");
}

function cloudinaryPublicId(sourceUrl: string): string {
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 24);
  return `el-principe-mestizo/medium-migration/${hash}`;
}

async function uploadBufferToCloudinary(
  buffer: Buffer,
  publicId: string,
  mimeType: string
): Promise<string> {
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    unique_filename: false,
    overwrite: false,
    resource_type: "image",
    transformation: [{ fetch_format: "auto", quality: "auto:good" }],
  });
  return result.secure_url;
}

async function main() {
  cloudinary.config({
    cloud_name: mustEnv("CLOUDINARY_CLOUD_NAME"),
    api_key:    mustEnv("CLOUDINARY_API_KEY"),
    api_secret: mustEnv("CLOUDINARY_API_SECRET"),
  });

  const zipArg = process.argv.find(a => a.endsWith(".zip"));
  if (!zipArg) {
    console.error("Uso: tsx migrate-from-zip.ts /ruta/al/medium-export.zip [--dry-run]");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const zipPath = resolve(zipArg);

  console.log(`ZIP: ${zipPath}`);
  console.log(`Modo: ${dryRun ? "DRY-RUN" : "REAL"}`);

  const zip = new AdmZip(zipPath);
  const imageMap = getImageFilenamesFromZip(zip);
  console.log(`Imágenes encontradas en ZIP: ${imageMap.size}`);

  // Cache URL Medium → Cloudinary URL
  const cache = new Map<string, string | null>();

  const articles = await db.select({
    id:            articlesTable.id,
    slug:          articlesTable.slug,
    content:       articlesTable.content,
    coverImageUrl: articlesTable.coverImageUrl,
  }).from(articlesTable);

  let totalArticles = 0;
  let totalMigrated = 0;
  let totalSkipped  = 0;
  let totalNotFound = 0;

  for (const article of articles) {
    let content       = article.content ?? "";
    let cover         = article.coverImageUrl ?? null;
    let changed       = false;

    // Recolectar todas las URLs de Medium en content + cover
    const urlSet = new Set<string>();
    const $ = cheerio.load(content);
    $("img").each((_, el) => {
      const src = $(el).attr("src") ?? "";
      if (isMediumUrl(src)) urlSet.add(src);
    });
    if (cover && isMediumUrl(cover)) urlSet.add(cover);

    if (urlSet.size === 0) continue;

    for (const mediumUrl of urlSet) {
      if (cache.has(mediumUrl)) {
        const cached = cache.get(mediumUrl);
        if (cached) {
          content = content.split(mediumUrl).join(cached);
          if (cover === mediumUrl) cover = cached;
          changed = true;
        }
        continue;
      }

      const basename = basenameFromUrl(mediumUrl);
      const entry    = imageMap.get(basename);

      if (!entry) {
        // Intentar busqueda flexible (diferentes resoluciones del mismo archivo)
        // 1*AbcXyz.jpeg puede estar como 1*AbcXyz.jpeg sin importar la resolución de la URL
        let found: AdmZip.IZipEntry | undefined;
        for (const [key, val] of imageMap) {
          if (key === basename) { found = val; break; }
        }
        if (!found) {
          console.log(`  [not-in-zip] ${basename}`);
          cache.set(mediumUrl, null);
          totalNotFound++;
          continue;
        }
      }

      const zipEntry = entry ?? imageMap.get(basename)!;
      const buffer   = zipEntry.getData();
      const ext      = basename.split(".").pop()?.toLowerCase() ?? "jpeg";
      const mime     = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
      const publicId = cloudinaryPublicId(mediumUrl);

      if (dryRun) {
        const fakeUrl = `https://res.cloudinary.com/dsf0rodtk/image/upload/el-principe-mestizo/medium-migration/${publicId.split("/").pop()}`;
        cache.set(mediumUrl, fakeUrl);
        console.log(`  [dry] ${basename} → Cloudinary`);
        totalMigrated++;
        continue;
      }

      try {
        const cloudUrl = await uploadBufferToCloudinary(buffer, publicId, mime);
        cache.set(mediumUrl, cloudUrl);
        console.log(`  [ok] ${basename} → ${cloudUrl.slice(0, 70)}...`);
        totalMigrated++;
        content = content.split(mediumUrl).join(cloudUrl);
        if (cover === mediumUrl) cover = cloudUrl;
        changed = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("already exists")) {
          // Ya existe en Cloudinary — construir la URL de entrega
          const deliveryUrl = cloudinary.url(publicId, {
            secure: true,
            resource_type: "image",
            transformation: [{ fetch_format: "auto", quality: "auto:good" }],
          });
          cache.set(mediumUrl, deliveryUrl);
          content = content.split(mediumUrl).join(deliveryUrl);
          if (cover === mediumUrl) cover = deliveryUrl;
          changed = true;
          totalMigrated++;
          console.log(`  [exists] ${basename} → reutilizada`);
        } else {
          cache.set(mediumUrl, null);
          totalSkipped++;
          console.log(`  [error] ${basename}: ${msg}`);
        }
      }
    }

    if (changed && !dryRun) {
      await db.update(articlesTable)
        .set({ content, coverImageUrl: cover ?? undefined })
        .where(eq(articlesTable.id, article.id));
      totalArticles++;
      console.log(`[saved] ${article.slug}`);
    } else if (changed && dryRun) {
      totalArticles++;
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Artículos actualizados : ${totalArticles}`);
  console.log(`Imágenes migradas      : ${totalMigrated}`);
  console.log(`Errores                : ${totalSkipped}`);
  console.log(`No encontradas en ZIP  : ${totalNotFound}`);
  console.log(`dryRun                 : ${dryRun}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
