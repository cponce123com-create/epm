/**
 * GET /api/daily-briefing/latest — Devuelve el Daily Briefing más reciente.
 */
import { Router, type Request, type Response } from "express";
import { db, dailyBriefingsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/daily-briefing/latest", async (_req: Request, res: Response) => {
  try {
    const [latest] = await db
      .select()
      .from(dailyBriefingsTable)
      .orderBy(desc(dailyBriefingsTable.briefingDate))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "No hay briefings disponibles" });
      return;
    }

    res.json(latest);
  } catch (err) {
    logger.error("[Daily Briefing] Error:", (err as Error).message);
    res.status(500).json({ error: "Error al obtener briefing" });
  }
});

export default router;
