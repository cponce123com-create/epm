/**
 * GET /api/external-news — Devuelve los últimos titulares agregados vía RSS.
 */
import { Router, type Request, type Response } from "express";
import { db, externalHeadlinesTable } from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/external-news", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query["limit"] as string) || 20));
    const source = req.query["source"] as string | undefined;

    // Build filters
    const filters: (ReturnType<typeof eq>)[] = [];
    if (source) {
      filters.push(eq(externalHeadlinesTable.source, source));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(externalHeadlinesTable)
      .where(where);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    // Get headlines
    const headlines = await db
      .select()
      .from(externalHeadlinesTable)
      .where(where)
      .orderBy(desc(externalHeadlinesTable.pubDate))
      .limit(limit)
      .offset((page - 1) * limit);

    // Get distinct sources for filter dropdown
    const sources = await db
      .select({ name: externalHeadlinesTable.source })
      .from(externalHeadlinesTable)
      .groupBy(externalHeadlinesTable.source)
      .orderBy(externalHeadlinesTable.source);

    res.json({
      headlines,
      sources: sources.map((s) => s.name),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    logger.error("[External News] Error fetching headlines:", (err as Error).message);
    res.status(500).json({ error: "Error al obtener noticias externas" });
  }
});

export default router;
