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

// Returns a proxy URL — image served through our own API, bypassing Medium 403
function toProxyUrl(imageUrl: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}

async function uploadUrlToCloudinary(imageUrl: string): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary not configured");

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  ];
  const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const headerSets = [
    { "User-Agent": randomUA(), "Referer": "https://medium.com/", "Accept": "image/*,*/*;q=0.8" },
    { "User-Agent": randomUA(), "Referer": "https://www.google.com/", "Accept": "image/*,*/*;q=0.8" },
  ];

  for (const headers of headerSets) {
    try {
      const fetchRes = await fetch(imageUrl, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      if (!fetchRes.ok) continue;

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
    } catch {
      continue;
    }
  }

  throw new Error(`Could not fetch ${imageUrl} after multiple attempts`);
}

// Extract first image src from HTML content
function extractFirstImageSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

/**
 * POST /api/admin/migrate-images
 *
 * Tries to upload Medium images to Cloudinary.
 * If Cloudinary upload fails (403 from Medium), falls back to proxy URLs
 * so images are served through our own API.
 *
 * Query params:
 *   ?dryRun=1  — scan only, no writes
 *   ?limit=N   — process at most N articles (default: all)
 *   ?proxyOnly=1 — skip Cloudinary, just replace with proxy URLs immediately
 */
router.post(
  "/admin/migrate-images",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const dryRun    = req.query["dryRun"]    === "1";
    const proxyOnly = req.query["proxyOnly"] === "1";
    const limit     = req.query["limit"] ? parseInt(req.query["limit"] as string, 10) : undefined;

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const cloudinaryAvailable = !proxyOnly && !!(cloudName && apiKey && apiSecret);

    // Pull articles that have at least one Medium CDN URL
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
    const urlCache = new Map<string, string | null>();

    let totalMigrated = 0;
    let totalFailed   = 0;
    let totalProxy    = 0;

    const summary: {
      articleId: number;
      title: string;
      urlsFound: number;
      urlsMigrated: number;
      urlsFailed: number;
      urlsProxy: number;
      coverSet: boolean;
      error?: string;
    }[] = [];

    for (const article of articles) {
      let content       = article.content       ?? "";
      let coverImageUrl = article.coverImageUrl ?? null;

      const mediumUrls = [...new Set([
        ...Array.from(content.matchAll(MEDIUM_CDN_RE), m => m[0]),
        ...(coverImageUrl?.match(MEDIUM_CDN_RE) ?? []),
      ])];

      if (mediumUrls.length === 0) continue;

      let migrated = 0;
      let failed   = 0;
      let proxied  = 0;
      let coverSet = false;

      for (const originalUrl of mediumUrls) {
        if (!urlCache.has(originalUrl)) {
          if (cloudinaryAvailable) {
            try {
              const newUrl = await uploadUrlToCloudinary(originalUrl);
              urlCache.set(originalUrl, newUrl);
              logger.info({ originalUrl, newUrl }, "Image migrated to Cloudinary");
            } catch (err) {
              // Cloudinary failed — fall back to proxy URL
              const proxyUrl = toProxyUrl(originalUrl);
              urlCache.set(originalUrl, proxyUrl);
              logger.info({ originalUrl, proxyUrl }, "Cloudinary failed, using proxy URL");
            }
          } else {
            // proxyOnly mode or Cloudinary not configured
            urlCache.set(originalUrl, toProxyUrl(originalUrl));
          }
        }

        const newUrl = urlCache.get(originalUrl);
        if (newUrl) {
          const isProxy = newUrl.startsWith("/api/proxy-image");
          content = content.split(originalUrl).join(newUrl);
          if (coverImageUrl === originalUrl) coverImageUrl = newUrl;
          if (isProxy) proxied++; else migrated++;
        } else {
          failed++;
        }
      }

      // Back-fill coverImageUrl if still NULL
      if (!coverImageUrl) {
        const firstSrc = extractFirstImageSrc(content);
        if (firstSrc && !MEDIUM_CDN_RE.test(firstSrc)) {
          coverImageUrl = firstSrc;
          coverSet = true;
        } else if (firstSrc) {
          if (!urlCache.has(firstSrc)) {
            urlCache.set(firstSrc, toProxyUrl(firstSrc));
          }
          const newCover = urlCache.get(firstSrc);
          if (newCover) {
            coverImageUrl = newCover;
            content = content.split(firstSrc).join(newCover);
            coverSet = true;
            if (newCover.startsWith("/api/proxy-image")) proxied++; else migrated++;
          }
        }
      }

      totalMigrated += migrated;
      totalFailed   += failed;
      totalProxy    += proxied;

      if (!dryRun && (migrated > 0 || proxied > 0 || coverSet)) {
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
            urlsProxy: proxied,
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
          urlsProxy: proxied,
          coverSet,
        });
      }
    }

    res.json({
      ok:              true,
      dryRun,
      proxyOnly,
      articlesScanned: articles.length,
      totalMigrated,
      totalProxy,
      totalFailed,
      details:         summary,
    });
  },
);

export default router;
