/**
 * GET /api/trends — Palabras clave más mencionadas en titulares externos (últimas 24h).
 * GET /api/trends/sources — Fuentes más activas.
 */
import { Router, type Request, type Response } from "express";
import { db, externalHeadlinesTable } from "@workspace/db";
import { sql, gte } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Spanish stopwords to filter out from trends
const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "e", "o", "u",
  "de", "del", "en", "al", "a", "con", "por", "para", "que", "es", "se", "su",
  "no", "lo", "como", "más", "pero", "sus", "le", "ya", "este", "entre", "fue",
  "son", "han", "era", "ser", "tiene", "cada", "sin", "tras", "todo", "también",
  "tras", "dijo", "sobre", "este", "esta", "esto", "the", "and", "for", "are",
  "has", "its", "was", "were", "been", "said", "that", "with", "from", "they",
  "what", "have", "will", "when", "their", "after", "into", "than", "then",
  "being", "been", "also", "very", "just", "but", "not", "all", "one", "two",
  "new", "more", "some", "who", "how", "which", "about", "would", "could",
]);

router.get("/trends", async (_req: Request, res: Response) => {
  try {
    // Get headlines from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const headlines = await db
      .select({ title: externalHeadlinesTable.title })
      .from(externalHeadlinesTable)
      .where(gte(externalHeadlinesTable.pubDate, twentyFourHoursAgo))
      .limit(500);

    // Tokenize and count words
    const wordCounts = new Map<string, number>();

    for (const h of headlines) {
      if (!h.title) continue;

      // Normalize: lowercase, remove punctuation
      const words = h.title
        .toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and take top 20
    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    res.json({
      trends: topWords,
      headlinesAnalyzed: headlines.length,
      timeRange: "24h",
    });
  } catch (err) {
    console.error("[Trends] Error:", (err as Error).message);
    res.status(500).json({ error: "Error al obtener tendencias" });
  }
});

router.get("/trends/sources", async (_req: Request, res: Response) => {
  try {
    const sources = await db
      .select({
        source: externalHeadlinesTable.source,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(externalHeadlinesTable)
      .groupBy(externalHeadlinesTable.source)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);

    res.json({ sources });
  } catch (err) {
    logger.error("[Trends Sources] Error:", (err as Error).message);
    res.status(500).json({ error: "Error al obtener fuentes" });
  }
});

export default router;
