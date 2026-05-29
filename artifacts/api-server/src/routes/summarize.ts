/**
 * POST /api/summarize/article/:id — Genera resumen extractivo de un artículo propio.
 */
import { Router, type Request, type Response } from "express";
import { db, articlesTable, articleSummariesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractiveSummary } from "@workspace/external-news";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/summarize/article/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params["id"]);
    if (Number.isNaN(articleId) || articleId < 1) {
      res.status(400).json({ error: "ID de artículo inválido" });
      return;
    }

    // Check if summary already exists (cache)
    const [existing] = await db
      .select()
      .from(articleSummariesTable)
      .where(eq(articleSummariesTable.articleId, articleId))
      .limit(1);

    if (existing) {
      res.json({
        articleId,
        summary: existing.summary,
        cached: true,
        createdAt: existing.createdAt,
      });
      return;
    }

    // Get article content
    const [article] = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        content: articlesTable.content,
      })
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .limit(1);

    if (!article) {
      res.status(404).json({ error: "Artículo no encontrado" });
      return;
    }

    // Extract text content (strip HTML)
    const textContent = (article.content ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!textContent || textContent.length < 50) {
      res.status(400).json({ error: "El artículo no tiene suficiente contenido para resumir" });
      return;
    }

    // Limit to first 3000 characters for performance
    const contentSample = textContent.slice(0, 3000);

    // Generate extractive summary (first 3-5 sentences)
    const summary = extractiveSummary(contentSample, 5);

    // Save to database (cache)
    const [saved] = await db
      .insert(articleSummariesTable)
      .values({
        articleId,
        summary,
      })
      .returning({ id: articleSummariesTable.id, createdAt: articleSummariesTable.createdAt });

    res.json({
      articleId,
      summary,
      cached: false,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    logger.error("[Summarize] Error:", (err as Error).message);
    res.status(500).json({ error: "Error al generar resumen" });
  }
});

export default router;
