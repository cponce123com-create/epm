/**
 * One-time bulk migration of Medium CDN images to Cloudinary.
 *
 * Usage:
 *   DATABASE_URL=... CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
 *     pnpm --filter @workspace/scripts tsx src/migrate-medium-images.ts
 *
 * Options (env vars):
 *   DRY_RUN=1       — Scan only, do not write to DB
 *   ARTICLE_IDS=1,2  — Comma-separated list of article IDs to process (default: all)
 */

import { db, articlesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";

const DRY_RUN     = process.env["DRY_RUN"] === "1";
const ARTICLE_IDS = process.env["ARTICLE_IDS"]
  ? process.env["ARTICLE_IDS"].split(",").map(s => parseInt(s.trim(), 10)).filter(Boolean)
  : null;

const MEDIUM_CDN_RE = /https?:\/\/(cdn-images-\d+\.medium\.com|miro\.medium\.com)\/[^\s"'<>)]+/g;

function log(msg: string, data?: object) {
  const ts = new Date().toISOString();
  if (data) console.log(`[${ts}] ${msg}`, JSON.stringify(data, null, 0));
  else       console.log(`[${ts}] ${msg}`);
}

async function uploadUrl(imageUrl: string): Promise<string> {
  // 1) Try direct URL upload (Cloudinary fetches it with our Referer header)
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "el-principe-mestizo/migrated",
      resource_type: "image",
      transformation: [{ quality: "auto:good", fetch_format: "auto" }],
      headers: { "Referer": "https://medium.com" },
    });
    return result.secure_url;
  } catch {
    // fall through to manual fetch
  }

  // 2) Fetch locally and upload as buffer
  const res = await fetch(imageUrl, {
    headers: { "Referer": "https://medium.com", "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${imageUrl}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const ct  = res.headers.get("content-type") ?? "image/jpeg";
  const dataUri = `data:${ct};base64,${buf.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "el-principe-mestizo/migrated",
    resource_type: "image",
    transformation: [{ quality: "auto:good", fetch_format: "auto" }],
  });
  return result.secure_url;
}

function extractFirstImageSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

async function main() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Missing CLOUDINARY_* env vars.");
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  log(`Starting migration (dryRun=${DRY_RUN})`);

  const articles = ARTICLE_IDS
    ? await db.select({ id: articlesTable.id, title: articlesTable.title, content: articlesTable.content, coverImageUrl: articlesTable.coverImageUrl })
        .from(articlesTable)
        .where(inArray(articlesTable.id, ARTICLE_IDS))
    : await db.select({ id: articlesTable.id, title: articlesTable.title, content: articlesTable.content, coverImageUrl: articlesTable.coverImageUrl })
        .from(articlesTable);

  log(`Found ${articles.length} articles to process`);

  // Deduplicated URL cache: Medium URL → Cloudinary URL (or null on failure)
  const urlCache = new Map<string, string | null>();

  let totalArticlesUpdated = 0;
  let totalUrlsMigrated    = 0;
  let totalUrlsFailed      = 0;

  for (const article of articles) {
    let content       = article.content ?? "";
    let coverImageUrl = article.coverImageUrl ?? null;

    const mediumUrls = [
      ...new Set([
        ...(content.match(MEDIUM_CDN_RE) ?? []),
        ...(coverImageUrl ? (coverImageUrl.match(MEDIUM_CDN_RE) ?? []) : []),
      ]),
    ];

    if (mediumUrls.length === 0 && coverImageUrl !== null) continue;

    let migrated = 0;
    let failed   = 0;

    for (const originalUrl of mediumUrls) {
      if (!urlCache.has(originalUrl)) {
        try {
          const newUrl = await uploadUrl(originalUrl);
          urlCache.set(originalUrl, newUrl);
          log(`  ✓ migrated`, { from: originalUrl.slice(0, 80), to: newUrl.slice(0, 60) });
        } catch (err) {
          urlCache.set(originalUrl, null);
          log(`  ✗ failed`, { url: originalUrl.slice(0, 80), err: String(err) });
        }
      }

      const newUrl = urlCache.get(originalUrl)!;
      if (newUrl) {
        content       = content.split(originalUrl).join(newUrl);
        if (coverImageUrl === originalUrl) coverImageUrl = newUrl;
        migrated++;
      } else {
        failed++;
      }
    }

    // Back-fill missing cover
    let coverSet = false;
    if (!coverImageUrl) {
      const firstSrc = extractFirstImageSrc(content);
      if (firstSrc) {
        if (!MEDIUM_CDN_RE.test(firstSrc)) {
          coverImageUrl = firstSrc;
          coverSet = true;
        } else {
          if (!urlCache.has(firstSrc)) {
            try {
              urlCache.set(firstSrc, await uploadUrl(firstSrc));
            } catch {
              urlCache.set(firstSrc, null);
            }
          }
          const newCover = urlCache.get(firstSrc);
          if (newCover) {
            content = content.split(firstSrc).join(newCover);
            coverImageUrl = newCover;
            coverSet = true;
            migrated++;
          }
        }
      }
    }

    totalUrlsMigrated += migrated;
    totalUrlsFailed   += failed;

    if (migrated > 0 || coverSet) {
      totalArticlesUpdated++;
      log(`Article "${article.title.slice(0, 60)}" — ${migrated} migrated, ${failed} failed, coverSet=${coverSet}`);

      if (!DRY_RUN) {
        await db
          .update(articlesTable)
          .set({ content, coverImageUrl: coverImageUrl ?? undefined })
          .where(eq(articlesTable.id, article.id));
      }
    }
  }

  log("Migration complete", {
    dryRun:               DRY_RUN,
    articlesScanned:      articles.length,
    articlesUpdated:      totalArticlesUpdated,
    totalUrlsMigrated,
    totalUrlsFailed,
    uniqueUrlsCached:     urlCache.size,
  });

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
