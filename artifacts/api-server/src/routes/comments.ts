import { Router, type IRouter } from "express";
import { db, commentsTable, articlesTable, reportedCommentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateCommentBody } from "@workspace/api-zod";
import { z } from "zod/v4";

const router: IRouter = Router();

const createReportSchema = z.object({
  commentId: z.number(),
  reason: z.string().min(1).max(255),
  details: z.string().max(1000).optional(),
  reporterEmail: z.string().email().optional(),
});

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

// ── Report a comment ──────────────────────────────────────────────────────────
router.post("/comments/report", async (req, res): Promise<void> => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos: " + parsed.error.message });
    return;
  }

  const [comment] = await db
    .select({ id: commentsTable.id })
    .from(commentsTable)
    .where(eq(commentsTable.id, parsed.data.commentId));

  if (!comment) {
    res.status(404).json({ error: "Comentario no encontrado" });
    return;
  }

  await db.insert(reportedCommentsTable).values({
    commentId: parsed.data.commentId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
    reporterEmail: parsed.data.reporterEmail ?? null,
  });

  res.json({ ok: true, message: "Comentario reportado. Gracias por ayudar a mantener la calidad del diálogo." });
});

export default router;
