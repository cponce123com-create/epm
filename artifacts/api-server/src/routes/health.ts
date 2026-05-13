import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const start = Date.now();
  let dbStatus: "connected" | "error" = "error";
  let dbLatencyMs = 0;

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
    dbLatencyMs = Date.now() - start;
  } catch {
    // dbStatus mantiene "error" de la inicialización
  }

  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
  });
});

export default router;
