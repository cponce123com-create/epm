/**
 * POST /api/cron/fetch-rss — Ejecutar scraper RSS (protegido con CRON_SECRET).
 * POST /api/cron/generate-briefing — Generar Daily Briefing (protegido).
 */
import { Router, type Request, type Response } from "express";
import { db, externalHeadlinesTable, dailyBriefingsTable } from "@workspace/db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { parseAllSources, generateBriefingText } from "@workspace/external-news";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Middleware de autenticación para endpoints cron.
 * Requiere header x-cron-secret igual a CRON_SECRET.
 */
function requireCronSecret(req: Request, res: Response, next: () => void): void {
  const secret = req.headers["x-cron-secret"] as string | undefined;
  const expected = process.env["CRON_SECRET"];

  if (!expected) {
    console.error("[CRON] CRON_SECRET no está configurado en el entorno");
    res.status(500).json({ error: "CRON_SECRET no configurado" });
    return;
  }

  if (!secret || secret !== expected) {
    res.status(401).json({ error: "No autorizado — x-cron-secret inválido" });
    return;
  }

  next();
}

/**
 * POST /api/cron/fetch-rss
 * Parsea todas las fuentes RSS y almacena los titulares en la BD.
 * Protegido con CRON_SECRET.
 */
router.post("/cron/fetch-rss", requireCronSecret, async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const headlines = await parseAllSources();

    if (headlines.length === 0) {
      res.json({
        ok: true,
        message: "No se encontraron nuevos titulares",
        sourcesChecked: 10,
        totalSaved: 0,
        elapsedMs: Date.now() - startTime,
      });
      return;
    }

    // Insert in batches to avoid overwhelming the DB
    const BATCH_SIZE = 50;
    let saved = 0;

    for (let i = 0; i < headlines.length; i += BATCH_SIZE) {
      const batch = headlines.slice(i, i + BATCH_SIZE);

      // Use upsert approach: INSERT ON CONFLICT DO NOTHING
      for (const headline of batch) {
        try {
          await db
            .insert(externalHeadlinesTable)
            .values({
              title: headline.title,
              link: headline.link,
              source: headline.source,
              sourceBias: headline.sourceBias ?? null,
              summary: headline.summary ?? null,
              pubDate: headline.pubDate,
            })
            .onConflictDoNothing({ target: [externalHeadlinesTable.source, externalHeadlinesTable.link] });
          saved++;
        } catch (insertErr) {
          console.warn(`[CRON] Error saving headline "${headline.title}":`, (insertErr as Error).message);
        }
      }
    }

    console.log(`[CRON] RSS fetch complete: ${saved} headlines saved, ${Date.now() - startTime}ms`);

    res.json({
      ok: true,
      message: `Titulares actualizados: ${saved} nuevos`,
      sourcesChecked: 10, // from rss-sources.json
      totalSaved: saved,
      elapsedMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[CRON] Error fetching RSS:", (err as Error).message);
    res.status(500).json({ error: "Error al ejecutar scraper RSS" });
  }
});

/**
 * POST /api/cron/generate-briefing
 * Genera el Daily Briefing a partir de los últimos 15 titulares del día.
 * Protegido con CRON_SECRET.
 */
router.post("/cron/generate-briefing", requireCronSecret, async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Check if briefing already exists for today
    const existing = await db
      .select({ id: dailyBriefingsTable.id })
      .from(dailyBriefingsTable)
      .where(eq(dailyBriefingsTable.briefingDate, today))
      .limit(1);

    if (existing.length > 0) {
      res.json({
        ok: true,
        message: "Ya existe un briefing para hoy",
        existing: true,
      });
      return;
    }

    // Get latest 15 headlines
    const latestHeadlines = await db
      .select({
        title: externalHeadlinesTable.title,
        link: externalHeadlinesTable.link,
        source: externalHeadlinesTable.source,
      })
      .from(externalHeadlinesTable)
      .orderBy(sql`${externalHeadlinesTable.pubDate} DESC`)
      .limit(15);

    if (latestHeadlines.length === 0) {
      res.json({
        ok: true,
        message: "No hay titulares para generar briefing",
      });
      return;
    }

    // Generate briefing text (extractive, no AI)
    const content = generateBriefingText(latestHeadlines);

    // Save to database
    const [saved] = await db
      .insert(dailyBriefingsTable)
      .values({
        briefingDate: today,
        content,
      })
      .returning({ id: dailyBriefingsTable.id });

    console.log(`[CRON] Daily briefing generated for ${today}: ${latestHeadlines.length} headlines`);

    res.json({
      ok: true,
      message: `Briefing generado para ${today}`,
      briefingId: saved.id,
      headlineCount: latestHeadlines.length,
    });
  } catch (err) {
    logger.error("[CRON] Error generating briefing:", (err as Error).message);
    res.status(500).json({ error: "Error al generar briefing" });
  }
});

export default router;

