import { Router, type IRouter, type Request, type Response } from "express";
import { db, articlesTable } from "@workspace/db";
import { isNotNull, or, like, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MEDIUM_CDN_RE = /https?:\/\/(cdn-images-\d+\.medium\.com|miro\.medium\.com)\/[^\s"'<>)]+/g;

function getCloudinaryConfig() {
  return {
    cloudName:  process.env.CLOUDINARY_CLOUD_NAME,
    apiKey:     process.env.CLOUDINARY_API_KEY,
    apiSecret:  process.env.CLOUDINARY_API_SECRET,
  };
}

async function uploadUrlToCloudinary(imageUrl: string): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary not configured");

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  // Try direct URL upload first (fastest, no bandwidth used on server)
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "el-principe-mestizo/migrated",
      resource_type: "image",
      transformation: [{ quality: "auto:good", fetch_format: "auto" }],
      // Pass Referer so Medium CDN allows the request
      headers: { "Referer": "https://medium.com" },
    });
    return result.secure_url;
  } catch {
    // Fall back to fetching locally then uploading as buffer
  }

  const fetchRes = await fetch(imageUrl, {
    headers: {
      "Referer": "https://medium.com",
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status} fetching ${imageUrl}`);

  const arrayBuffer = await fetchRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = fetchRes.headers.get("content-type") ?? "image/jpeg";
  const b64 = buffer.toString("base64");
  const dataUri = `data:${contentType};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "el-principe-mestizo/migrated",
    resource_type: "image",
    transformation: [{ quality: "auto:good", fetch_format: "auto" }],
  });
  return result.secure_url;
}

// Extract first image src from HTML content
function extractFirstImageSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

/**
 * POST /api/admin/migrate-images
 *
 * Finds all Medium CDN image URLs in articles (content + coverImageUrl),
 * re-uploads each unique URL to Cloudinary, replaces references in the DB,
 * and back-fills missing coverImageUrl from the first image in content.
 *
 * Query params:
 *   ?dryRun=1  — scan only, no writes
 *   ?limit=N   — process at most N articles (default: all)
 */
router.post(
  "/admin/migrate-images",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({ error: "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET." });
      return;
    }

    const dryRun = req.query["dryRun"] === "1";
    const limit  = req.query["limit"] ? parseInt(req.query["limit"] as string, 10) : undefined;

    // Pull articles that have at least one Medium CDN URL in content or coverImageUrl
    const allArticles = await db
      .select({
        id:            articlesTable.id,
        title:         articlesTable.title,
        slug:          articlesTable.slug,
        content:       articlesTable.content,
        coverImageUrl: articlesTable.coverImageUrl,
      })
      .from(articlesTable)
      .where(
        or(
          like(articlesTable.content, "%medium.com%"),
          like(articlesTable.coverImageUrl, "%medium.com%"),
          isNotNull(sql`CASE WHEN ${articlesTable.coverImageUrl} IS NULL AND ${articlesTable.content} LIKE '%<img%' THEN 1 END`),
        ),
      );

    const articles = limit ? allArticles.slice(0, limit) : allArticles;

    // Build a deduplicated map of Medium URLs → Cloudinary URLs
    const urlCache = new Map<string, string | null>();

    const summary: {
      articleId: number;
      title: string;
      urlsFound: number;
      urlsMigrated: number;
      urlsFailed: number;
      coverSet: boolean;
      error?: string;
    }[] = [];

    let totalMigrated = 0;
    let totalFailed = 0;

    for (const article of articles) {
      let content       = article.content ?? "";
      let coverImageUrl = article.coverImageUrl ?? null;

      const mediumUrls = [
        ...new Set([
          ...(content.match(MEDIUM_CDN_RE) ?? []),
          ...(coverImageUrl ? (coverImageUrl.match(MEDIUM_CDN_RE) ?? []) : []),
        ]),
      ];

      let migrated = 0;
      let failed   = 0;
      let coverSet = false;

      for (const originalUrl of mediumUrls) {
        if (!urlCache.has(originalUrl)) {
          try {
            const newUrl = await uploadUrlToCloudinary(originalUrl);
            urlCache.set(originalUrl, newUrl);
            logger.info({ originalUrl, newUrl }, "Image migrated");
          } catch (err) {
            urlCache.set(originalUrl, null);
            logger.warn({ originalUrl, err }, "Image migration failed");
          }
        }

        const newUrl = urlCache.get(originalUrl);
        if (newUrl) {
          content       = content.split(originalUrl).join(newUrl);
          if (coverImageUrl === originalUrl) coverImageUrl = newUrl;
          migrated++;
        } else {
          failed++;
        }
      }

      // Back-fill coverImageUrl if it's still NULL
      if (!coverImageUrl) {
        const firstSrc = extractFirstImageSrc(content);
        if (firstSrc) {
          // If it's still a Medium URL that failed, skip; otherwise use it
          if (!MEDIUM_CDN_RE.test(firstSrc)) {
            coverImageUrl = firstSrc;
            coverSet = true;
          } else {
            // Try migrating the cover independently
            if (!urlCache.has(firstSrc)) {
              try {
                const newUrl = await uploadUrlToCloudinary(firstSrc);
                urlCache.set(firstSrc, newUrl);
              } catch {
                urlCache.set(firstSrc, null);
              }
            }
            const newCover = urlCache.get(firstSrc);
            if (newCover) {
              coverImageUrl = newCover;
              content = content.split(firstSrc).join(newCover);
              coverSet = true;
              migrated++;
            }
          }
        }
      }

      totalMigrated += migrated;
      totalFailed   += failed;

      if (!dryRun && (migrated > 0 || coverSet)) {
        try {
          await db
            .update(articlesTable)
            .set({ content, coverImageUrl: coverImageUrl ?? undefined })
            .where(sql`${articlesTable.id} = ${article.id}`);
        } catch (err) {
          summary.push({
            articleId: article.id,
            title: article.title,
            urlsFound: mediumUrls.length,
            urlsMigrated: migrated,
            urlsFailed: failed,
            coverSet,
            error: `DB update failed: ${err instanceof Error ? err.message : String(err)}`,
          });
          continue;
        }
      }

      if (mediumUrls.length > 0 || coverSet) {
        summary.push({
          articleId: article.id,
          title: article.title,
          urlsFound: mediumUrls.length,
          urlsMigrated: migrated,
          urlsFailed: failed,
          coverSet,
        });
      }
    }

    res.json({
      ok:           true,
      dryRun,
      articlesScanned:   articles.length,
      totalMigrated,
      totalFailed,
      details:      summary,
    });
  },
);

export default router;
