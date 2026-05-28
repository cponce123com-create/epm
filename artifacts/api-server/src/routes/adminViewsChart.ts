import { Router, type IRouter, type Request, type Response } from "express";
import { db, articleViewsTable } from "@workspace/db";
import { sql, gte, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/views-chart", async (_req: Request, res: Response): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select({
      date: sql<string>`DATE(${articleViewsTable.viewedAt})`,
      views: count(articleViewsTable.id),
    })
    .from(articleViewsTable)
    .where(gte(articleViewsTable.viewedAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${articleViewsTable.viewedAt})`)
    .orderBy(sql`DATE(${articleViewsTable.viewedAt})`);

  // Rellenar días sin vistas con 0
  const viewsByDate = new Map<string, number>();
  for (const row of rows) {
    viewsByDate.set(row.date, Number(row.views));
  }

  const result: { date: string; views: number }[] = [];
  const cursor = new Date(thirtyDaysAgo);
  const today = new Date();
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, views: viewsByDate.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  res.json(result);
});

export default router;
