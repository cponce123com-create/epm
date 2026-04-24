import { Router, type IRouter } from "express";
import { db, articlesTable, categoriesTable, usersTable } from "@workspace/db";
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

  // Title
  const title =
    $("h1").first().text().trim() ||
    $("title").text().replace(" – Medium", "").trim() ||
    "Sin título";

  // Published date from <time> tag
  let publishedAt: Date | null = null;
  const timeEl = $("time[datetime]").first();
  if (timeEl.length) {
    const dt = timeEl.attr("datetime");
    if (dt) {
      const d = new Date(dt);
      if (!isNaN(d.getTime())) publishedAt = d;
    }
  }

  // Remove header/meta cruft and keep article body
  $("header").remove();
  $("footer").remove();
  $("nav").remove();
  $(".js-postMetaLockup").remove();
  $("figure.graf--layoutOutsetLeft").remove();

  // Try to grab the main article element
  let bodyHtml = "";
  const articleEl = $("article").first();
  if (articleEl.length) {
    // Remove the h1 (already captured as title) to avoid duplication
    articleEl.find("h1").first().remove();
    bodyHtml = articleEl.html() ?? "";
  } else {
    $("h1").first().remove();
    bodyHtml = $("body").html() ?? "";
  }

  // Clean up Medium-specific section/div wrappers but keep inner HTML
  const $body = cheerio.load(bodyHtml);
  $body("section").each(function () {
    $body(this).replaceWith($body(this).html() ?? "");
  });

  const cleanHtml = $body.html() ?? bodyHtml;

  // Summary: first meaningful paragraph (up to 300 chars)
  const firstP = $("p").first().text().trim();
  const summary = firstP.length > 0
    ? firstP.slice(0, 300) + (firstP.length > 300 ? "…" : "")
    : title;

  // Determine draft vs published
  const status: "published" | "draft" = publishedAt ? "published" : "draft";

  return { title, content: cleanHtml, summary, publishedAt, status };
}

// POST /api/admin/import-medium
// Accepts a multipart form-data with field "file" (the Medium .zip export)
// Query param: categoryId (number), defaultStatus ("published" | "draft")
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

    // Validate category exists
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

    // Parse ZIP
    let zip: AdmZip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch {
      res.status(400).json({ error: "No se pudo leer el ZIP. Asegúrate de subir el archivo exportado de Medium." });
      return;
    }

    const entries = zip.getEntries().filter(e => {
      const name = e.entryName.toLowerCase();
      // Medium exports posts inside a "posts/" folder as .html files
      return !e.isDirectory && name.endsWith(".html") && name.includes("posts/");
    });

    if (entries.length === 0) {
      res.status(400).json({
        error: "No se encontraron entradas HTML en la carpeta 'posts/' del ZIP. Asegúrate de subir el export de Medium sin modificar.",
      });
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
        const publishedAt =
          finalStatus === "published"
            ? (parsed.publishedAt ?? new Date())
            : undefined;

        // Skip if slug already exists
        const [existing] = await db
          .select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.slug, slug));

        if (existing) {
          results.push({ title: parsed.title, status: "skipped", reason: "Ya existe un artículo con ese slug." });
          continue;
        }

        await db.insert(articlesTable).values({
          title: parsed.title,
          slug,
          summary: parsed.summary,
          content: parsed.content,
          categoryId,
          authorId: user.userId,
          featured: false,
          status: finalStatus,
          readingTime,
          publishedAt,
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
    const skipped = results.filter(r => r.status === "skipped").length;

    res.json({ ok: true, imported, skipped, results });
  }
);

export default router;
