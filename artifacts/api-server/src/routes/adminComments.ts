import { Router, type IRouter } from "express";
import { db, commentsTable, articlesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { logAudit, auditCtx } from "../lib/audit";

const router: IRouter = Router();

function formatComment(
  c: typeof commentsTable.$inferSelect,
  articleTitle?: string | null,
) {
  return {
    id: c.id,
    articleId: c.articleId,
    articleTitle: articleTitle ?? null,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    content: c.content,
    approved: c.approved,
    reported: c.reported,
    reportReason: c.reportReason,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/admin/comments", requireAuth, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;

  let whereClause;
  if (status === "approved") whereClause = eq(commentsTable.approved, true);
  else if (status === "pending") whereClause = eq(commentsTable.approved, false);
  else if (status === "reported") whereClause = eq(commentsTable.reported, true);

  const rows = await db
    .select({
      comment: commentsTable,
      articleTitle: articlesTable.title,
    })
    .from(commentsTable)
    .leftJoin(articlesTable, eq(commentsTable.articleId, articlesTable.id))
    .where(whereClause)
    .orderBy(commentsTable.createdAt);

  res.json(rows.map((r) => formatComment(r.comment, r.articleTitle)));
});

router.patch(
  "/admin/comments/:id/approve",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    const [existing] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    await db
      .update(commentsTable)
      .set({ approved: true })
      .where(eq(commentsTable.id, id));

    logAudit({
      ...auditCtx(req),
      action: "APPROVE",
      targetType: "comment",
      targetId: id,
      newValues: { approved: true },
    });

    const [row] = await db
      .select({ comment: commentsTable, articleTitle: articlesTable.title })
      .from(commentsTable)
      .leftJoin(articlesTable, eq(commentsTable.articleId, articlesTable.id))
      .where(eq(commentsTable.id, id));

    res.json(formatComment(row.comment, row.articleTitle));
  },
);

router.delete(
  "/admin/comments/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    const [existing] = await db
      .select({
        id: commentsTable.id,
        articleId: commentsTable.articleId,
        authorName: commentsTable.authorName,
      })
      .from(commentsTable)
      .where(eq(commentsTable.id, id));

    await db.delete(commentsTable).where(eq(commentsTable.id, id));

    if (existing) {
      const byUser = (req as any).user;
      logger.info(
        {
          commentId: id,
          articleId: existing.articleId,
          authorName: existing.authorName,
          byUserId: byUser?.userId,
        },
        "Comment deleted",
      );
    }

    logAudit({
      ...auditCtx(req),
      action: "DELETE",
      targetType: "comment",
      targetId: id,
    });

    res.json({ ok: true });
  },
);

// ── Bulk actions ──────────────────────────────────────────────────────────
router.post(
  "/admin/comments/bulk",
  requireAuth,
  async (req, res): Promise<void> => {
    const { ids, action } = req.body as { ids?: number[]; action?: string };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "Se requiere un array de IDs." });
      return;
    }
    if (!["approve", "delete", "spam"].includes(action ?? "")) {
      res.status(400).json({ error: "Acción inválida. Usa: approve, delete, spam." });
      return;
    }

    const maxBatch = 100;
    const batchIds = ids.slice(0, maxBatch);

    if (action === "approve") {
      await db
        .update(commentsTable)
        .set({ approved: true })
        .where(inArray(commentsTable.id, batchIds));
    } else if (action === "spam") {
      await db
        .update(commentsTable)
        .set({ approved: false, reported: true, reportReason: "spam (bulk)" })
        .where(inArray(commentsTable.id, batchIds));
    } else if (action === "delete") {
      await db.delete(commentsTable).where(inArray(commentsTable.id, batchIds));
    }

    const byUser = (req as any).user;
    logger.info(
      { count: batchIds.length, action, byUserId: byUser?.userId },
      "Bulk comment action",
    );

    logAudit({
      ...auditCtx(req),
      action: action === "approve" ? "APPROVE" : "DELETE",
      targetType: "comment",
      newValues: { bulk: true, count: batchIds.length, action },
    });

    res.json({
      ok: true,
      updated: batchIds.length,
      message: `${batchIds.length} comentario(s) ${action === "approve" ? "aprobados" : action === "spam" ? "marcados como spam" : "eliminados"}.`,
    });
  },
);

export default router;
