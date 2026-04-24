import { Router, type IRouter } from "express";
import { db, commentsTable, articlesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateCommentBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/comments/:articleId", async (req, res): Promise<void> => {
  const articleId = parseInt(req.params.articleId as string, 10);
  if (isNaN(articleId)) {
    res.status(400).json({ error: "Invalid article ID" });
    return;
  }

  const comments = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.articleId, articleId), eq(commentsTable.approved, true)))
    .orderBy(commentsTable.createdAt);

  res.json(comments.map(c => ({
    id: c.id,
    articleId: c.articleId,
    articleTitle: null,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    content: c.content,
    approved: c.approved,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/comments", async (req, res): Promise<void> => {
  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({
      articleId: parsed.data.articleId,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail,
      content: parsed.data.content,
      approved: false,
    })
    .returning();

  res.status(201).json({
    id: comment.id,
    articleId: comment.articleId,
    articleTitle: null,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    content: comment.content,
    approved: comment.approved,
    createdAt: comment.createdAt.toISOString(),
  });
});

export default router;
