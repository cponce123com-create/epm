import { Router, type IRouter } from "express";
import { db, commentsTable, articlesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function formatComment(c: typeof commentsTable.$inferSelect, articleTitle?: string | null) {
  return {
    id: c.id,
    articleId: c.articleId,
    articleTitle: articleTitle ?? null,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    content: c.content,
    approved: c.approved,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/admin/comments", requireAuth, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;

  let whereClause;
  if (status === "approved") whereClause = eq(commentsTable.approved, true);
  else if (status === "pending") whereClause = eq(commentsTable.approved, false);

  const rows = await db
    .select({
      comment: commentsTable,
      articleTitle: articlesTable.title,
    })
    .from(commentsTable)
    .leftJoin(articlesTable, eq(commentsTable.articleId, articlesTable.id))
    .where(whereClause)
    .orderBy(commentsTable.createdAt);

  res.json(rows.map(r => formatComment(r.comment, r.articleTitle)));
});

router.patch("/admin/comments/:id/approve", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  await db.update(commentsTable).set({ approved: true }).where(eq(commentsTable.id, id));

  const [row] = await db
    .select({ comment: commentsTable, articleTitle: articlesTable.title })
    .from(commentsTable)
    .leftJoin(articlesTable, eq(commentsTable.articleId, articlesTable.id))
    .where(eq(commentsTable.id, id));

  res.json(formatComment(row.comment, row.articleTitle));
});

router.delete("/admin/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  res.json({ ok: true });
});

export default router;
