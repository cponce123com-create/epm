import { Router, type IRouter, type Request, type Response } from "express";
import { db, articlesTable } from "@workspace/db";
import { isNotNull, or, like } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Detecta URLs de Medium CDN directas
const MEDIUM_CDN_RE = /https?:\/\/(cdn-images-\d+\.medium\.com|miro\.medium\.com)\/[^\s"'<>)]+/g;

// Detecta URLs que ya pasaron por nuestro proxy local
// Ej: /api/proxy-image?url=https%3A%2F%2Fcdn-images-1.medium.com%2F...
const PROXY_URL_RE = /\/api\/proxy-image\?url=([^\s"'<>)]+)/g;

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

async function uploadUrlToCloudinary(imageUrl: string): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary not configured");

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  // Intentar subida directa con Referer de Medium para evitar bloqueo
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "el-principe-mestizo/imported-medium",
      resource_type: "image",
      transformation: [{ quality: "auto:good", fetch_format: "auto" }],
      headers: { Referer: "https://medium.com" },
    });
    return result.secure_url;
  } catch (firstErr) {
    logger.warn({ imageUrl, firstErr }, "Direct upload failed, trying manual fetch");
  }

  // Fallback: descargar localmente y subir como base64
  const fetchRes = await fetch(imageUrl, {
    headers: {
      Referer: "https://medium.com",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status} fetching ${imageUrl}`);

  const arrayBuffer = await fetchRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = fetchRes.headers.get("content-type") ?? "image/jpeg";
  const b64 = buffer.toString("base64");
  const dataUri = `data:${contentType};base64,${b64}`;

  const { v2: cloudinary2 } = await import("cloudinary");
  cloudinary2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const result = await cloudinary2.uploader.upload(dataUri, {
    folder: "el-principe-mestizo/imported-medium",
    resource_type: "image",
    transformation: [{ quality: "auto:good", fetch_format: "auto" }],
  });
  return result.secure_url;
}

// Extrae la URL original de Medium de dentro de una URL de proxy local
// /api/proxy-image?url=https%3A%2F%2Fmiro.medium.com%2Fv2%2Fxxx → https://miro.medium.com/v2/xxx
function extractOriginalFromProxy(proxyUrl: string): string | null {
  try {
    // proxyUrl puede ser relativa (/api/proxy-image?url=...) o absoluta
    const search = proxyUrl.includes("?") ? proxyUrl.slice(proxyUrl.indexOf("?")) : "";
    const params = new URLSearchParams(search);
    const raw = params.get("url");
    if (!raw) return null;
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

// Reúne todas las URLs de Medium que hay en un HTML, incluyendo las que
// están encapsuladas dentro de nuestro proxy.
function collectMediumUrls(html: string): Set<string> {
  const found = new Set<string>();

  // 1. URLs directas de Medium CDN
  const directMatches = html.matchAll(new RegExp(MEDIUM_CDN_RE.source, "g"));
  for (const m of directMatches) found.add(m[0]);

  // 2. URLs de Medium encapsuladas en nuestro proxy
  const proxyMatches = html.matchAll(new RegExp(PROXY_URL_RE.source, "g"));
  for (const m of proxyMatches) {
    const encoded = m[1]; // la parte tras ?url=
    try {
      const decoded = decodeURIComponent(encoded);
      if (decoded.includes("medium.com")) found.add(decoded);
    } catch {
      // ignorar URLs malformadas
    }
  }

  return found;
}

// Reemplaza en un HTML todas las apariciones de una URL de Medium
// (tanto directas como dentro del proxy) por la nueva URL de Cloudinary.
function replaceAllOccurrences(html: string, originalMediumUrl: string, newUrl: string): string {
  // Reemplazar aparición directa
  let result = html.split(originalMediumUrl).join(newUrl);

  // Reemplazar aparición dentro del proxy: /api/proxy-image?url=ENCODED
  const encoded = encodeURIComponent(originalMediumUrl);
  result = result.split(`/api/proxy-image?url=${encoded}`).join(newUrl);

  return result;
}

// Extrae la primera imagen src del HTML
function extractFirstImageSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

/**
 * POST /api/admin/migrate-images
 *
 * Recorre todos los artículos y:
 * 1. Detecta URLs de Medium CDN (directas o encapsuladas en el proxy local).
 * 2. Sube cada imagen única a Cloudinary.
 * 3. Reemplaza TODAS las referencias en content y coverImageUrl.
 * 4. Rellena coverImageUrl si está vacío.
 *
 * Query params:
 *   ?dryRun=1  — escanea sin escribir
 *   ?limit=N   — procesa solo N artículos
 */
router.post(
  "/admin/migrate-images",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({
        error:
          "Cloudinary no está configurado. Completa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en las variables de entorno de Render.",
      });
      return;
    }

    const dryRun = req.query["dryRun"] === "1";
    const limit = req.query["limit"] ? parseInt(req.query["limit"] as string, 10) : undefined;

    // Traer artículos que aún tienen rastro de Medium (directo o vía proxy)
    const allArticles = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        slug: articlesTable.slug,
        content: articlesTable.content,
        coverImageUrl: articlesTable.coverImageUrl,
      })
      .from(articlesTable)
      .where(
        or(
          like(articlesTable.content, "%medium.com%"),
          like(articlesTable.content, "%proxy-image%"),
          like(articlesTable.coverImageUrl, "%medium.com%"),
          like(articlesTable.coverImageUrl, "%proxy-image%"),
          isNotNull(
            sql`CASE WHEN ${articlesTable.coverImageUrl} IS NULL AND ${articlesTable.content} LIKE '%<img%' THEN 1 END`,
          ),
        ),
      );

    const articles = limit ? allArticles.slice(0, limit) : allArticles;

    // Cache de Medium URL → Cloudinary URL (evita subir la misma imagen dos veces)
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
      let content = article.content ?? "";
      let coverImageUrl = article.coverImageUrl ?? null;

      // Recolectar todas las URLs de Medium presentes (directas + dentro del proxy)
      const contentUrls = collectMediumUrls(content);
      const coverUrls = coverImageUrl ? collectMediumUrls(coverImageUrl) : new Set<string>();
      const mediumUrls = [...new Set([...contentUrls, ...coverUrls])];

      let migrated = 0;
      let failed = 0;
      let coverSet = false;

      for (const originalUrl of mediumUrls) {
        if (!urlCache.has(originalUrl)) {
          try {
            const newUrl = await uploadUrlToCloudinary(originalUrl);
            urlCache.set(originalUrl, newUrl);
            logger.info({ originalUrl, newUrl }, "Image migrated to Cloudinary");
          } catch (err) {
            urlCache.set(originalUrl, null);
            logger.warn({ originalUrl, err }, "Image migration failed");
          }
        }

        const newUrl = urlCache.get(originalUrl);
        if (newUrl) {
          content = replaceAllOccurrences(content, originalUrl, newUrl);
          if (coverImageUrl) {
            coverImageUrl = replaceAllOccurrences(coverImageUrl, originalUrl, newUrl);
          }
          migrated++;
        } else {
          failed++;
        }
      }

      // Rellenar coverImageUrl si sigue vacío tras la migración
      if (!coverImageUrl || coverImageUrl.includes("proxy-image") || coverImageUrl.includes("medium.com")) {
        const firstSrc = extractFirstImageSrc(content);
        if (firstSrc && !firstSrc.includes("medium.com") && !firstSrc.includes("proxy-image")) {
          coverImageUrl = firstSrc;
          coverSet = true;
        } else if (firstSrc && (firstSrc.includes("medium.com") || firstSrc.includes("proxy-image"))) {
          // La primera imagen también es Medium — intentar migrarla
          const rawSrc = firstSrc.includes("proxy-image")
            ? extractOriginalFromProxy(firstSrc) ?? firstSrc
            : firstSrc;

          if (!urlCache.has(rawSrc)) {
            try {
              const newUrl = await uploadUrlToCloudinary(rawSrc);
              urlCache.set(rawSrc, newUrl);
            } catch {
              urlCache.set(rawSrc, null);
            }
          }
          const newCover = urlCache.get(rawSrc);
          if (newCover) {
            content = replaceAllOccurrences(content, rawSrc, newCover);
            coverImageUrl = newCover;
            coverSet = true;
            migrated++;
          }
        }
      }

      totalMigrated += migrated;
      totalFailed += failed;

      if (!dryRun && (migrated > 0 || coverSet)) {
        try {
          await db
            .update(articlesTable)
            .set({ content, coverImageUrl: coverImageUrl ?? undefined })
            .where(eq(articlesTable.id, article.id));
        } catch (err) {
          summary.push({
            articleId: article.id,
            title: article.title,
            urlsFound: mediumUrls.length,
            urlsMigrated: migrated,
            urlsFailed: failed,
            coverSet,
            error: `Error al guardar en BD: ${err instanceof Error ? err.message : String(err)}`,
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
      ok: true,
      dryRun,
      articlesScanned: articles.length,
      totalMigrated,
      totalFailed,
      details: summary,
    });
  },
);

export default router;
