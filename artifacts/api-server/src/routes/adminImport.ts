import { Router, type IRouter } from "express";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { makeSlug, calcReadingTime } from "../lib/slugify";
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

    const categoryId = parseInt((req.body.categoryId as string) ?? "0", 10);
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
    const { articles, categoryId, defaultStatus } = req.body as {
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
    };

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      res.status(400).json({ error: "No se recibieron artículos." });
      return;
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

        await db.insert(articlesTable).values({
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: article.content,
          categoryId,
          authorId: user.userId,
          featured: false,
          status: finalStatus,
          readingTime: article.readingTime,
          publishedAt,
        });

        results.push({ title: article.title, status: "imported" });
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
        const html = entry.getData().toString("utf8");
        const parsed = parseMediumHtml(html);
        const slug = makeSlug(parsed.title);
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

        await db.insert(articlesTable).values({
          title: parsed.title, slug, summary: parsed.summary,
          content: parsed.content, categoryId, authorId: user.userId,
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
