import { Router, type IRouter } from "express";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import multer from "multer";
import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import { v2 as cloudinary } from "cloudinary";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const ENABLE_CLOUDINARY_IMPORT = process.env.MEDIUM_IMPORT_MIGRATE_IMAGES === "true";

interface ParsedPost {
  title: string;
  content: string;
  summary: string;
  publishedAt: Date | null;
  status: "published" | "draft";
}

type CategoryLite = { id: number; name: string; slug: string; description: string | null };
const MEDIUM_HOST_RE = /(^|\.)medium\.com$|(^|\.)miro\.medium\.com$|(^|\.)cdn-images-\d+\.medium\.com$/i;

function ensureCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return true;
}

function isMediumUrl(url: string): boolean {
  try {
    return MEDIUM_HOST_RE.test(new URL(url).hostname);
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

function normalizeMediumImageAttributes($: cheerio.CheerioAPI) {
  $("img").each((_, el) => {
    const img = $(el);
    const src = img.attr("src")?.trim();
    const dataSrc = img.attr("data-src")?.trim();
    const candidate = src || dataSrc;
    if (!candidate) return;

    const normalized = candidate.startsWith("//") ? `https:${candidate}` : candidate;
    img.attr("src", normalized);
    img.removeAttr("data-src");

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
// Recibe el ZIP y devuelve la lista de títulos/índices a importar (sin tocar la BD).
// El frontend luego llama a /import-medium/batch en lotes de 10.
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

    const entries = zip.getEntries().filter(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && name.endsWith(".html") && name.includes("posts/");
    });

    if (entries.length === 0) {
      res.status(400).json({ error: "No se encontraron posts en la carpeta 'posts/' del ZIP." });
      return;
    }

    // Parsear todos los artículos en memoria y devolverlos al frontend
    // para que los envíe de vuelta en lotes pequeños
    const articles = entries.map(entry => {
      try {
        const html = entry.getData().toString("utf8");
        const parsed = parseMediumHtml(html);
        return {
          title: parsed.title,
          slug: makeSlug(parsed.title),
          summary: parsed.summary,
          content: parsed.content,
          publishedAt: parsed.publishedAt?.toISOString() ?? null,
          status: parsed.status,
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
// Recibe un lote de hasta 10 artículos ya parseados e insertarlos en la BD.
router.post(
  "/admin/import-medium/batch",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as typeof req & { user: { userId: number } }).user;
    const { articles, categoryId, defaultStatus, migrateImages, autoCategorize } = req.body as {
      articles: Array<{
        title: string;
        slug: string;
        summary: string;
        content: string;
        publishedAt: string | null;
        status: "published" | "draft";
        readingTime: number;
      }>;
      categoryId: number;
      defaultStatus: "published" | "draft";
      migrateImages?: boolean;
      autoCategorize?: boolean;
    };

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      res.status(400).json({ error: "No se recibieron artículos." });
      return;
    }
    if (!autoCategorize && !categoryId) {
      res.status(400).json({ error: "Debes indicar una categoría cuando no hay auto-categorización." });
      return;
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

        const processedContent = (ENABLE_CLOUDINARY_IMPORT && migrateImages)
          ? await migrateMediumImagesToCloudinary(article.content)
          : article.content;
        const categoryToUse = autoCategorize
          ? (pickCategoryIdByHeuristic({ ...article, content: processedContent }, categories) ?? categoryId)
          : categoryId;

        const [existing] = await db
          .select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.slug, article.slug));

        if (existing) {
          results.push({ title: article.title, status: "skipped", reason: "Ya existe un artículo con ese slug." });
          continue;
        }

        await db.insert(articlesTable).values({
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: processedContent,
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
          title: article.title,
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
        const content = (ENABLE_CLOUDINARY_IMPORT && migrateImages)
          ? await migrateMediumImagesToCloudinary(parsed.content)
          : parsed.content;
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
          title: entry.entryName,
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
