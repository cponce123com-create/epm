import { Router, type IRouter } from "express";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import { logger } from "../lib/logger";
import multer from "multer";
import AdmZip from "adm-zip";
import * as cheerio from "cheerio";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

interface ParsedPost {
  title: string;
  content: string;
  summary: string;
  publishedAt: Date | null;
  status: "published" | "draft";
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
  $("figure.graf--layoutOutsetLeft").remove();

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

// ── Cover image extraction + Cloudinary upload ────────────────────────────────
async function tryUploadCoverToCloudinary(html: string): Promise<string | null> {
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey     = process.env.CLOUDINARY_API_KEY;
  const apiSecret  = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = m?.[1];
  if (!src || !src.startsWith("http")) return null;

  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const result = await cloudinary.uploader.upload(src, {
      folder: "el-principe-mestizo/covers",
      resource_type: "image",
      transformation: [{ quality: "auto:good", fetch_format: "auto" }],
      headers: { "Referer": "https://medium.com" },
    });
    return result.secure_url;
  } catch (err) {
    logger.warn({ src, err }, "Failed to upload cover image to Cloudinary");
    return null;
  }
}

// ── Auto-categorización por heurística de texto ───────────────────────────────
type CategoryRow = { id: number; name: string; slug: string };

function guessCategoryId(
  title: string,
  content: string,
  categories: CategoryRow[],
): number | null {
  if (categories.length === 0) return null;

  const haystack = (title + " " + content)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents

  for (const cat of categories) {
    const keywords = cat.slug.split("-").filter(k => k.length > 3);
    if (keywords.some(kw => haystack.includes(kw))) return cat.id;
  }

  return categories[0]!.id; // fallback: primera categoría disponible
}

// ── POST /api/admin/import-medium/prepare ────────────────────────────────────
// Recibe el ZIP, parsea los artículos y los devuelve al frontend.
// El frontend los envía de vuelta en lotes pequeños vía /batch.
router.post(
  "/admin/import-medium/prepare",
  requireAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo." });
      return;
    }

    const autoCategorize = req.body.autoCategorize === "true";
    const categoryId     = parseInt((req.body.categoryId as string) ?? "0", 10);

    // Validar categoría sólo si no se auto-categoriza
    if (!autoCategorize) {
      if (!categoryId) {
        res.status(400).json({ error: "Debes indicar un categoryId válido o activar la auto-categorización." });
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
        return {
          title:       parsed.title,
          slug:        makeSlug(parsed.title),
          summary:     parsed.summary,
          content:     parsed.content,
          publishedAt: parsed.publishedAt?.toISOString() ?? null,
          status:      parsed.status,
          readingTime: calcReadingTime(parsed.content),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ ok: true, total: articles.length, articles });
  }
);

// ── POST /api/admin/import-medium/batch ──────────────────────────────────────
// Recibe un lote de hasta N artículos ya parseados e los inserta en la BD.
router.post(
  "/admin/import-medium/batch",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as typeof req & { user: { userId: number } }).user;
    const {
      articles,
      categoryId,
      defaultStatus,
      autoCategorize = false,
      uploadImages   = false,
    } = req.body as {
      articles: Array<{
        title:       string;
        slug:        string;
        summary:     string;
        content:     string;
        publishedAt: string | null;
        status:      "published" | "draft";
        readingTime: number;
      }>;
      categoryId:     number;
      defaultStatus:  "published" | "draft";
      autoCategorize: boolean;
      uploadImages:   boolean;
    };

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      res.status(400).json({ error: "No se recibieron artículos." });
      return;
    }

    // Cargar todas las categorías si se necesita auto-categorizar
    let allCategories: CategoryRow[] = [];
    if (autoCategorize) {
      allCategories = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug })
        .from(categoriesTable);
      if (allCategories.length === 0) {
        res.status(400).json({ error: "No hay categorías disponibles para auto-categorizar." });
        return;
      }
    }

    const results: { title: string; status: "imported" | "skipped"; reason?: string }[] = [];

    for (const article of articles) {
      try {
        const finalStatus = defaultStatus ?? article.status;
        const publishedAt = finalStatus === "published"
          ? (article.publishedAt ? new Date(article.publishedAt) : new Date())
          : undefined;

        const [existing] = await db
          .select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.slug, article.slug));

        if (existing) {
          results.push({ title: article.title, status: "skipped", reason: "Ya existe un artículo con ese slug." });
          continue;
        }

        const resolvedCategoryId = autoCategorize
          ? (guessCategoryId(article.title, article.content, allCategories) ?? categoryId)
          : categoryId;

        if (!resolvedCategoryId) {
          results.push({ title: article.title, status: "skipped", reason: "No se pudo determinar la categoría." });
          continue;
        }

        const coverImageUrl = uploadImages
          ? await tryUploadCoverToCloudinary(article.content)
          : null;

        await db.insert(articlesTable).values({
          title:         article.title,
          slug:          article.slug,
          summary:       article.summary,
          content:       article.content,
          coverImageUrl: coverImageUrl ?? undefined,
          categoryId:    resolvedCategoryId,
          authorId:      user.userId,
          featured:      false,
          status:        finalStatus,
          readingTime:   article.readingTime,
          publishedAt,
        });

        results.push({ title: article.title, status: "imported" });
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

    const user         = (req as typeof req & { user: { userId: number } }).user;
    const categoryId   = parseInt((req.body.categoryId as string) ?? "0", 10);
    const forceStatus  = req.body.defaultStatus as "published" | "draft" | undefined;
    const uploadImages = req.body.uploadImages === "true";

    if (!categoryId) {
      res.status(400).json({ error: "Debes indicar un categoryId válido." });
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
        const html        = entry.getData().toString("utf8");
        const parsed      = parseMediumHtml(html);
        const slug        = makeSlug(parsed.title);
        const readingTime = calcReadingTime(parsed.content);
        const finalStatus = forceStatus ?? parsed.status;
        const publishedAt = finalStatus === "published"
          ? (parsed.publishedAt ?? new Date())
          : undefined;

        const [existing] = await db
          .select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.slug, slug));

        if (existing) {
          results.push({ title: parsed.title, status: "skipped", reason: "Ya existe un artículo con ese slug." });
          continue;
        }

        const coverImageUrl = uploadImages
          ? await tryUploadCoverToCloudinary(parsed.content)
          : null;

        await db.insert(articlesTable).values({
          title:         parsed.title,
          slug,
          summary:       parsed.summary,
          content:       parsed.content,
          coverImageUrl: coverImageUrl ?? undefined,
          categoryId,
          authorId:      user.userId,
          featured:      false,
          status:        finalStatus,
          readingTime,
          publishedAt,
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

export default router;
