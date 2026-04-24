import { Router, type IRouter } from "express";
import { db, articlesTable, commentsTable } from "@workspace/db";
import { eq, sql, count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/stats", requireAuth, async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalArticles: count(articlesTable.id),
      totalViews: sql<number>`coalesce(sum(${articlesTable.views}), 0)`,
      publishedArticles: sql<number>`count(case when ${articlesTable.status} = 'published' then 1 end)`,
      draftArticles: sql<number>`count(case when ${articlesTable.status} = 'draft' then 1 end)`,
    })
    .from(articlesTable);

  const [commentTotals] = await db
    .select({
      totalComments: count(commentsTable.id),
      pendingComments: sql<number>`count(case when ${commentsTable.approved} = false then 1 end)`,
    })
    .from(commentsTable);

  res.json({
    totalArticles: Number(totals?.totalArticles ?? 0),
    totalViews: Number(totals?.totalViews ?? 0),
    publishedArticles: Number(totals?.publishedArticles ?? 0),
    draftArticles: Number(totals?.draftArticles ?? 0),
    totalComments: Number(commentTotals?.totalComments ?? 0),
    pendingComments: Number(commentTotals?.pendingComments ?? 0),
  });
});

export default router;
