import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { db, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";

type ArticleRow = {
  id: number;
  slug: string;
  coverImageUrl: string | null;
  content: string;
};

const MEDIUM_HOST_RE = /(^|\.)medium\.com$|(^|\.)miro\.medium\.com$|(^|\.)cdn-images-\d+\.medium\.com$/i;

function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function normalizeUrl(raw: string): string {
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw.trim();
}

function isMediumImageUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeUrl(raw));
    return MEDIUM_HOST_RE.test(url.hostname);
  } catch {
    return false;
  }
}

function cloudinaryPublicIdFor(sourceUrl: string): string {
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 24);
  return `el-principe-mestizo/medium-migration/${hash}`;
}

function cloudinaryDeliveryUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    transformation: [{ fetch_format: "auto", quality: "auto:good" }],
  });
}

// Descarga la imagen como buffer para evitar el bloqueo 403 de Medium
async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://medium.com/",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al descargar: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const migratedCache = new Map<string, string>();

async function migrateOneImage(sourceUrl: string, dryRun: boolean): Promise<string> {
  const normalized = normalizeUrl(sourceUrl);
  if (!isMediumImageUrl(normalized)) return normalized;
  const cached = migratedCache.get(normalized);
  if (cached) return cached;

  const publicId = cloudinaryPublicIdFor(normalized);
  const deliveryUrl = cloudinaryDeliveryUrl(publicId);

  if (dryRun) {
    migratedCache.set(normalized, deliveryUrl);
    return deliveryUrl;
  }

  try {
    // Descargamos primero como buffer y subimos a Cloudinary
    const buffer = await fetchImageAsBuffer(normalized);

    await new Promise<void>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          unique_filename: false,
          overwrite: false,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            const msg = error.message ?? "";
            // Si ya existía, lo reutilizamos sin error
            if (msg.toLowerCase().includes("already exists")) {
              resolve();
            } else {
              reject(error);
            }
          } else {
            resolve();
          }
        }
      );
      uploadStream.end(buffer);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already exists")) {
      // OK, reutilizamos
    } else {
      console.warn(`  [skip] No se pudo migrar ${normalized}: ${msg}`);
      // Devolvemos la URL original para no romper el artículo
      return normalized;
    }
  }

  migratedCache.set(normalized, deliveryUrl);
  return deliveryUrl;
}

async function migrateArticleImages(article: ArticleRow, dryRun: boolean) {
  let changed = false;
  let migratedCount = 0;
  let skippedCount = 0;

  let nextCover = article.coverImageUrl;
  if (article.coverImageUrl && isMediumImageUrl(article.coverImageUrl)) {
    nextCover = await migrateOneImage(article.coverImageUrl, dryRun);
    if (nextCover !== article.coverImageUrl) {
      changed = true;
      migratedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  const $ = cheerio.load(article.content);
  const imgNodes = $("img");
  for (const el of imgNodes.toArray()) {
    const node = $(el);
    const raw = node.attr("src") ?? node.attr("data-src");
    if (!raw) continue;
    if (!isMediumImageUrl(raw)) continue;
    const cloudinaryUrl = await migrateOneImage(raw, dryRun);
    node.attr("src", cloudinaryUrl);
    node.removeAttr("data-src");
    if (cloudinaryUrl !== normalizeUrl(raw)) {
      migratedCount += 1;
      changed = true;
    } else {
      skippedCount += 1;
    }
  }
  const nextContent = $.html() ?? article.content;

  if (changed && !dryRun) {
    await db
      .update(articlesTable)
      .set({
        coverImageUrl: nextCover ?? undefined,
        content: nextContent,
      })
      .where(eq(articlesTable.id, article.id));
  }

  return { changed, migratedCount, skippedCount };
}

async function main() {
  cloudinary.config({
    cloud_name: mustEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: mustEnv("CLOUDINARY_API_KEY"),
    api_secret: mustEnv("CLOUDINARY_API_SECRET"),
  });

  const dryRun = process.argv.includes("--dry-run");
  const onlySlugArg = process.argv.find((arg) => arg.startsWith("--slug="));
  const onlySlug = onlySlugArg ? onlySlugArg.replace("--slug=", "") : null;

  console.log(`Modo: ${dryRun ? "DRY-RUN (sin cambios)" : "REAL (escribiendo en BD y Cloudinary)"}`);

  const rows = (await db
    .select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      coverImageUrl: articlesTable.coverImageUrl,
      content: articlesTable.content,
    })
    .from(articlesTable)) as ArticleRow[];

  const candidates = onlySlug ? rows.filter((r) => r.slug === onlySlug) : rows;
  let changedArticles = 0;
  let migratedImages = 0;
  let skippedImages = 0;

  for (const article of candidates) {
    const result = await migrateArticleImages(article, dryRun);
    if (result.changed) {
      changedArticles += 1;
      migratedImages += result.migratedCount;
      skippedImages += result.skippedCount;
      console.log(`[updated] ${article.slug} · ${result.migratedCount} migradas, ${result.skippedCount} saltadas`);
    }
  }

  console.log(`\nDone. changedArticles=${changedArticles} migratedImages=${migratedImages} skippedImages=${skippedImages} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
