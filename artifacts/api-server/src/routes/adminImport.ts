import { Router, type IRouter } from "express";
import path from "path";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import { logger } from "../lib/logger";
import multer from "multer";
import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import { v2 as cloudinary } from "cloudinary";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

interface ParsedPost {
  title: string;
  content: string;
  summary: string;
  publishedAt: Date | null;
  status: "published" | "draft";
}

type CategoryLite = { id: number; name: string; slug: string; description: string | null };

function ensureCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return true;
}

function extractCoverImage(content: string): string | null {
  const $ = cheerio.load(content);
  const firstImg = $("img").first();
  if (!firstImg.length) return null;
  const src = firstImg.attr("src") ?? firstImg.attr("data-src") ?? "";
  if (src && (src.startsWith("http") || src.startsWith("/api/proxy-image") || src.startsWith("data:"))) {
    return src;
  }
  // Marcar imágenes locales del ZIP para resolver después
  const zipFile = firstImg.attr("data-zip-image");
  if (zipFile) return `__zip__${zipFile}`;
  return null;
}

function isMediumUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "medium.com" || hostname.endsWith(".medium.com")) return true;
    if (/^cdn-images-\d+\.medium\.com$/i.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

async function migrateMediumImagesToCloudinary(content: string): Promise<string> {
  if (!ensureCloudinaryConfigured()) return content;
  const $ = cheerio.load(content);
  for (const el of $("img").toArray()) {
    const node = $(el);
    const src = node.attr("src");
    if (!src || !isMediumUrl(src)) continue;
    try {
      const up = await cloudinary.uploader.upload(src, {
        folder: "el-principe-mestizo/imported-medium",
        resource_type: "image",
        transformation: [{ fetch_format: "auto", quality: "auto:good" }],
      });
      node.attr("src", up.secure_url);
    } catch {
      // mantener url original
    }
  }
  return $.html() ?? content;
}

function scoreCategory(text: string, category: CategoryLite): number {
  const haystack = text.toLowerCase();
  const tokens = new Set<string>([
    ...category.name.toLowerCase().split(/\W+/).filter(Boolean),
    ...category.slug.toLowerCase().split(/\W+/).filter(Boolean),
    ...(category.description ?? "").toLowerCase().split(/\W+/).filter(Boolean),
  ]);
  let score = 0;
  for (const token of tokens) {
    if (token.length < 4) continue;
    if (haystack.includes(token)) score += token.length;
  }
  return score;
}

function pickCategoryIdByHeuristic(
  article: { title: string; summary: string; content: string },
  categories: CategoryLite[],
): number | null {
  if (categories.length === 0) return null;
  const text = `${article.title}\n${article.summary}\n${article.content}`.slice(0, 8000);
  let best: { id: number; score: number } | null = null;
  for (const cat of categories) {
    const score = scoreCategory(text, cat);
    if (!best || score > best.score) best = { id: cat.id, score };
  }
  return (best?.score ?? 0) > 0 ? best!.id : categories[0].id;
}

function toProxyUrl(imageUrl: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}

/** Sube un Buffer de imagen a Cloudinary usando upload_stream */
async function uploadImageBufferToCloudinary(buffer: Buffer, fileName: string): Promise<string | null> {
  if (!ensureCloudinaryConfigured()) return null;
  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "el-principe-mestizo/imported-medium",
          resource_type: "image",
          transformation: [{ fetch_format: "auto", quality: "auto:good" }],
        },
        (error, res) => {
          if (error || !res) reject(error ?? new Error("Cloudinary error"));
          else resolve(res);
        }
      ).end(buffer);
    });
    return result.secure_url;
  } catch {
    return null;
  }
}

/** Convierte un Buffer de imagen a data URL como fallback */
function bufferToDataUrl(buffer: Buffer, fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mime = ext === ".png" ? "image/png"
    : ext === ".gif" ? "image/gif"
    : ext === ".webp" ? "image/webp"
    : ext === ".svg" ? "image/svg+xml"
    : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function processLocalZipImages(
  content: string,
  zipImageBuffers: Map<string, Buffer>,
): Promise<string> {
  if (zipImageBuffers.size === 0) return content;

  const $ = cheerio.load(content);
  let changed = false;

  for (const el of $("img[data-zip-image]").toArray()) {
    const imgEl = $(el);
    const fileName = imgEl.attr("data-zip-image") ?? "";
    const imageBuffer = zipImageBuffers.get(fileName);

    if (!imageBuffer) {
      imgEl.removeAttr("data-zip-image");
      continue;
    }

    // Intentar subir a Cloudinary
    const cloudinaryUrl = await uploadImageBufferToCloudinary(imageBuffer, fileName);
    if (cloudinaryUrl) {
      imgEl.attr("src", cloudinaryUrl);
    } else {
      // Fallback: data URL
      imgEl.attr("src", bufferToDataUrl(imageBuffer, fileName));
    }
    imgEl.removeAttr("data-zip-image");
    imgEl.attr("data-original-zip", fileName); // para referencia del coverImageUrl
    changed = true;
  }

  return changed ? ($.html() ?? content) : content;
}

function normalizeMediumImageAttributes($: cheerio.CheerioAPI) {
  // Remove noscript wrappers
  $("noscript").each((_, el) => {
    const ns = $(el);
    if (ns.find("img").length > 0) ns.remove();
  });

  // Fix 4: desenvolver estructuras figure complejas de Medium
  $("figure").each((_, figEl) => {
    const fig = $(figEl);
    const img = fig.find("img").first();
    const figcaption = fig.find("figcaption").first();

    if (img.length) {
      const cleanFigure = $("<figure></figure>");
      cleanFigure.append(img.clone());
      if (figcaption.length) {
        cleanFigure.append(figcaption.clone());
      }
      fig.replaceWith(cleanFigure);
    }
  });

  // Eliminar figuras vacías
  $("figure:not(:has(img))").remove();

  $("img").each((_, el) => {
    const img = $(el);
    const src = img.attr("src")?.trim();
    const dataSrc = img.attr("data-src")?.trim();
    const candidate = src || dataSrc;
    if (!candidate) return;

    const normalized = candidate.startsWith("//") ? `https:${candidate}` : candidate.trim();

    // Fix 1: detectar rutas relativas a la carpeta images/ del ZIP
    const localMatch = normalized.match(/(?:\.\.\/|\.\/)?images\/([^"'\s?]+)/i);
    if (localMatch) {
      const fileName = localMatch[1];
      img.attr("data-zip-image", fileName);
      img.attr("src", ""); // vacío hasta que se suba en /batch
      img.removeAttr("data-src");
      img.removeAttr("srcset");
      if (!img.attr("loading")) img.attr("loading", "lazy");
      if (!img.attr("decoding")) img.attr("decoding", "async");
      return;
    }

    const finalSrc = isMediumUrl(normalized) ? toProxyUrl(normalized) : normalized;
    img.attr("src", finalSrc);
    img.removeAttr("data-src");
    img.removeAttr("srcset");

    if (!img.attr("loading")) img.attr("loading", "lazy");
    if (!img.attr("decoding")) img.attr("decoding", "async");
  });
}

function parseMediumHtml(html: string): ParsedPost {
  const $ = cheerio.load(html);

  const title =
    $("h1").first().text().trim() ||
    $("title").text().replace(" – Medium", "").trim() ||
    "Sin título";

  let publishedAt: Date | null = null;
  const timeEl = $("time[datetime]").first();
  if (timeEl.length) {
    const dt = timeEl.attr("datetime");
    if (dt) {
      const d = new Date(dt);
      if (!isNaN(d.getTime())) publishedAt = d;
    }
  }

  $("header").remove();
  $("footer").remove();
  $("nav").remove();
  $(".js-postMetaLockup").remove();

  let bodyHtml = "";
  const articleEl = $("article").first();
  if (articleEl.length) {
    articleEl.find("h1").first().remove();
    bodyHtml = articleEl.html() ?? "";
  } else {
    $("h1").first().remove();
    bodyHtml = $("body").html() ?? "";
  }

  const $body = cheerio.load(bodyHtml);
  normalizeMediumImageAttributes($body);
  $body("section").each(function () {
    $body(this).replaceWith($body(this).html() ?? "");
  });

  const cleanHtml = $body.html() ?? bodyHtml;

  const firstP = $("p").first().text().trim();
  const summary = firstP.length > 0
    ? firstP.slice(0, 300) + (firstP.length > 300 ? "…" : "")
    : title;

  const status: "published" | "draft" = publishedAt ? "published" : "draft";

  return { title, content: cleanHtml, summary, publishedAt, status };
}

// ── POST /api/admin/import-medium/prepare ────────────────────────────────────
router.post(
  "/admin/import-medium/prepare",
  requireAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo." });
      return;
    }

    const autoCategorize = String(req.body.autoCategorize ?? "false") === "true";
    if (!autoCategorize) {
      const categoryId = parseInt((req.body.categoryId as string) ?? "0", 10);
      if (!categoryId) {
        res.status(400).json({ error: "Debes indicar una categoría o activar auto-categorización." });
        return;
      }
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryId));
      if (!cat) {
        res.status(400).json({ error: `No existe la categoría con id ${categoryId}.` });
        return;
      }
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch {
      res.status(400).json({ error: "No se pudo leer el ZIP." });
      return;
    }

    // Fix 1: extraer imágenes del ZIP
    const zipImages = new Map<string, Buffer>();
    const IMG_EXT_RE = /\.(jpe?g|png|gif|webp|svg)$/i;
    zip.getEntries().forEach(entry => {
      if (!entry.isDirectory) {
        const name = entry.entryName.toLowerCase();
        const fileName = path.basename(entry.entryName);
        if (name.startsWith("images/") && IMG_EXT_RE.test(fileName)) {
          zipImages.set(fileName, entry.getData());
        }
        // También capturar imágenes sueltas en la raíz "images/" que Medium a veces pone
        if (name.startsWith("images/") && !name.endsWith("/")) {
          const baseName = path.basename(entry.entryName);
          if (IMG_EXT_RE.test(baseName) && !zipImages.has(baseName)) {
            zipImages.set(baseName, entry.getData());
          }
        }
      }
    });
    logger.info({ imageCount: zipImages.size }, "ZIP images extracted");

    const entries = zip.getEntries().filter(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && name.endsWith(".html") && name.includes("posts/");
    });

    if (entries.length === 0) {
      res.status(400).json({ error: "No se encontraron posts en la carpeta 'posts/' del ZIP." });
      return;
    }

    const articles = entries.map(entry => {
      try {
        const html = entry.getData().toString("utf8");
        const parsed = parseMediumHtml(html);
        // Fix 3: extraer coverImageUrl
        const coverImageUrl = extractCoverImage(parsed.content);
        return {
          title:         parsed.title,
          slug:          makeSlug(parsed.title),
          summary:       parsed.summary,
          content:       parsed.content,
          coverImageUrl, // nuevo campo
          publishedAt:   parsed.publishedAt?.toISOString() ?? null,
          status:        parsed.status,
          readingTime:   calcReadingTime(parsed.content),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Convertir mapa de imágenes a base64 para enviar al frontend
    const zipImagesB64: Record<string, string> = {};
    zipImages.forEach((buffer, fileName) => {
      zipImagesB64[fileName] = buffer.toString("base64");
    });

    res.json({
      ok: true,
      total: articles.length,
      articles,
      zipImages: zipImagesB64,
    });
  }
);

// ── POST /api/admin/import-medium/batch ──────────────────────────────────────
router.post(
  "/admin/import-medium/batch",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as typeof req & { user: { userId: number } }).user;
    const body = req.body as {
      articles?: Array<{
        title:         string;
        slug:          string;
        summary:       string;
        content:       string;
        coverImageUrl?: string | null;
        publishedAt:   string | null;
        status:        "published" | "draft";
        readingTime:   number;
      }>;
      categoryId?: number;
      defaultStatus?: "published" | "draft";
      migrateImages?: boolean;
      autoCategorize?: boolean;
      zipImages?: Record<string, string>;
    };

    const { articles, categoryId, defaultStatus, migrateImages, autoCategorize, zipImages } = body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      res.status(400).json({ error: "No se recibieron artículos." });
      return;
    }
    if (!autoCategorize && !categoryId) {
      res.status(400).json({ error: "Debes indicar una categoría cuando no hay auto-categorización." });
      return;
    }

    // Reconstruir mapa de buffers de imágenes del ZIP
    const zipImageBuffers = new Map<string, Buffer>();
    if (zipImages && typeof zipImages === "object") {
      for (const [fileName, b64] of Object.entries(zipImages)) {
        try {
          zipImageBuffers.set(fileName, Buffer.from(b64, "base64"));
        } catch { /* ignorar datos corruptos */ }
      }
    }

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
      })
      .from(categoriesTable) as CategoryLite[];
    if (autoCategorize && categories.length === 0) {
      res.status(400).json({ error: "No hay categorías configuradas para auto-clasificar." });
      return;
    }

    const results: { title: string; status: "imported" | "skipped"; reason?: string; categoryId?: number }[] = [];

    for (const article of articles) {
      try {
        const finalStatus = defaultStatus ?? article.status;
        const publishedAt = finalStatus === "published"
          ? (article.publishedAt ? new Date(article.publishedAt) : new Date())
          : undefined;

        // Procesar imágenes locales del ZIP
        let processedContent = article.content;
        if (zipImageBuffers.size > 0) {
          processedContent = await processLocalZipImages(processedContent, zipImageBuffers);
        }

        // Migrar imágenes de Medium a Cloudinary si se solicitó
        if (migrateImages) {
          processedContent = await migrateMediumImagesToCloudinary(processedContent);
        }

        const categoryToUse = autoCategorize
          ? (pickCategoryIdByHeuristic({ ...article, content: processedContent }, categories) ?? categoryId!)
          : categoryId!;

        const [existing] = await db
          .select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.slug, article.slug));

        if (existing) {
          results.push({ title: article.title, status: "skipped", reason: "Ya existe un artículo con ese slug." });
          continue;
        }

        // Fix 3: resolver coverImageUrl
        let finalCoverUrl = article.coverImageUrl ?? null;
        if (finalCoverUrl?.startsWith("__zip__")) {
          const zipFileName = finalCoverUrl.replace("__zip__", "");
          const $processed = cheerio.load(processedContent);
          const matchingImg = $processed(`img[data-original-zip="${zipFileName}"]`).first();
          if (matchingImg.length) {
            finalCoverUrl = matchingImg.attr("src") ?? null;
          } else {
            const firstCloudinaryImg = $processed("img[src*='cloudinary']").first();
            finalCoverUrl = firstCloudinaryImg.attr("src") ?? null;
          }
        }
        if (finalCoverUrl && !finalCoverUrl.startsWith("/api/proxy-image")
            && !finalCoverUrl.startsWith("https://res.cloudinary.com")
            && !finalCoverUrl.startsWith("data:")) {
          if (isMediumUrl(finalCoverUrl)) {
            finalCoverUrl = toProxyUrl(finalCoverUrl);
          }
        }

        await db.insert(articlesTable).values({
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: processedContent,
          coverImageUrl: finalCoverUrl ?? undefined,
          categoryId: categoryToUse,
          authorId: user.userId,
          featured: false,
          status: finalStatus,
          readingTime: article.readingTime,
          publishedAt,
        });

        results.push({ title: article.title, status: "imported", categoryId: categoryToUse });
      } catch (err) {
        results.push({
          title:  article.title,
          status: "skipped",
          reason: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const imported = results.filter(r => r.status === "imported").length;
    const skipped  = results.filter(r => r.status === "skipped").length;

    res.json({ ok: true, imported, skipped, results });
  }
);

// ── POST /api/admin/import-medium (ruta original — mantenida por compatibilidad)
router.post(
  "/admin/import-medium",
  requireAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo." });
      return;
    }

    const user = (req as typeof req & { user: { userId: number } }).user;
    const categoryId = parseInt((req.body.categoryId as string) ?? "0", 10);
    const forceStatus = req.body.defaultStatus as "published" | "draft" | undefined;
    const autoCategorize = String(req.body.autoCategorize ?? "false") === "true";
    const migrateImages = String(req.body.migrateImages ?? "false") === "true";

    if (!autoCategorize) {
      if (!categoryId) {
        res.status(400).json({ error: "Debes indicar una categoría o activar auto-categorización." });
        return;
      }
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryId));
      if (!cat) {
        res.status(400).json({ error: `No existe la categoría con id ${categoryId}.` });
        return;
      }
    }

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
      })
      .from(categoriesTable) as CategoryLite[];

    let zip: AdmZip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch {
      res.status(400).json({ error: "No se pudo leer el ZIP." });
      return;
    }

    const entries = zip.getEntries().filter(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && name.endsWith(".html") && name.includes("posts/");
    });

    if (entries.length === 0) {
      res.status(400).json({ error: "No se encontraron entradas HTML en la carpeta 'posts/' del ZIP." });
      return;
    }

    const results: { title: string; status: "imported" | "skipped"; reason?: string }[] = [];

    for (const entry of entries) {
      try {
        const html = entry.getData().toString("utf8");
        const parsed = parseMediumHtml(html);
        const slug = makeSlug(parsed.title);
        const content = migrateImages ? await migrateMediumImagesToCloudinary(parsed.content) : parsed.content;
        const readingTime = calcReadingTime(content);
        const finalStatus = forceStatus ?? parsed.status;
        const publishedAt = finalStatus === "published"
          ? (parsed.publishedAt ?? new Date())
          : undefined;
        const categoryToUse = autoCategorize
          ? (pickCategoryIdByHeuristic({ title: parsed.title, summary: parsed.summary, content }, categories) ?? categoryId)
          : categoryId;

        const [existing] = await db
          .select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.slug, slug));

        if (existing) {
          results.push({ title: parsed.title, status: "skipped", reason: "Ya existe un artículo con ese slug." });
          continue;
        }

        await db.insert(articlesTable).values({
          title: parsed.title, slug, summary: parsed.summary,
          content, categoryId: categoryToUse, authorId: user.userId,
          featured: false, status: finalStatus, readingTime, publishedAt,
        });

        results.push({ title: parsed.title, status: "imported" });
      } catch (err) {
        results.push({
          title:  entry.entryName,
          status: "skipped",
          reason: `Error interno: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const imported = results.filter(r => r.status === "imported").length;
    const skipped  = results.filter(r => r.status === "skipped").length;
    res.json({ ok: true, imported, skipped, results });
  }
);

// ── POST /api/admin/fix-article-images ───────────────────────────────────────
router.post(
  "/admin/fix-article-images",
  requireAuth,
  async (req: import("express").Request, res: import("express").Response): Promise<void> => {
    const dryRun = String(req.query["dryRun"] ?? req.body?.dryRun ?? "false") === "true";

    const articles = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        content: articlesTable.content,
        coverImageUrl: articlesTable.coverImageUrl,
      })
      .from(articlesTable);

    let fixed = 0;
    let skipped = 0;
    const details: { id: number; title: string; changed: boolean }[] = [];

    for (const article of articles) {
      const original = article.content ?? "";
      const $ = cheerio.load(original);

      $("noscript").each((_, el) => {
        if ($(el).find("img").length > 0) $(el).remove();
      });

      $("img").each((_, el) => {
        const img = $(el);
        const src     = img.attr("src")?.trim() ?? "";
        const dataSrc = img.attr("data-src")?.trim() ?? "";
        const candidate = src || dataSrc;

        if (candidate) {
          const normalized = candidate.startsWith("//") ? `https:${candidate}` : candidate;
          const finalSrc = isMediumUrl(normalized) ? toProxyUrl(normalized) : normalized;
          img.attr("src", finalSrc);
          img.removeAttr("data-src");
          img.removeAttr("srcset");
        }

        if (!img.attr("loading"))  img.attr("loading",  "lazy");
        if (!img.attr("decoding")) img.attr("decoding", "async");
      });

      const updatedContent = $("body").html() ?? original;

      let updatedCover = article.coverImageUrl;
      if (!updatedCover) {
        const firstImgSrc = $("img").first().attr("src");
        if (firstImgSrc) updatedCover = firstImgSrc;
      } else if (isMediumUrl(updatedCover)) {
        updatedCover = toProxyUrl(updatedCover);
      }

      const contentChanged = updatedContent !== original;
      const coverChanged   = updatedCover !== (article.coverImageUrl ?? null);
      const changed        = contentChanged || coverChanged;

      details.push({ id: article.id, title: article.title, changed });

      if (changed && !dryRun) {
        await db
          .update(articlesTable)
          .set({
            content: updatedContent,
            ...(coverChanged ? { coverImageUrl: updatedCover ?? undefined } : {}),
          })
          .where(eq(articlesTable.id, article.id));
        fixed++;
      } else if (!changed) {
        skipped++;
      } else {
        fixed++;
      }
    }

    res.json({
      ok: true,
      dryRun,
      articlesScanned: articles.length,
      fixed,
      skipped,
      details: details.filter(d => d.changed).map(d => ({ id: d.id, title: d.title })),
    });
  },
);

export default router;
