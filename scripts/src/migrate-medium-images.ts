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
    await cloudinary.uploader.upload(normalized, {
      public_id: publicId,
      unique_filename: false,
      overwrite: false,
      resource_type: "image",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Si ya existía, seguimos y reutilizamos.
    if (!msg.toLowerCase().includes("already exists")) throw err;
  }

  migratedCache.set(normalized, deliveryUrl);
  return deliveryUrl;
}

async function migrateArticleImages(article: ArticleRow, dryRun: boolean) {
  let changed = false;
  let migratedCount = 0;

  let nextCover = article.coverImageUrl;
  if (article.coverImageUrl && isMediumImageUrl(article.coverImageUrl)) {
    nextCover = await migrateOneImage(article.coverImageUrl, dryRun);
    if (nextCover !== article.coverImageUrl) {
      changed = true;
      migratedCount += 1;
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
    migratedCount += 1;
    changed = true;
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

  return { changed, migratedCount };
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

  for (const article of candidates) {
    const result = await migrateArticleImages(article, dryRun);
    if (result.changed) {
      changedArticles += 1;
      migratedImages += result.migratedCount;
      console.log(`[updated] ${article.slug} · ${result.migratedCount} imágenes`);
    }
  }

  console.log(`Done. changedArticles=${changedArticles} migratedImages=${migratedImages} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err);

  process.exit(1);
});
