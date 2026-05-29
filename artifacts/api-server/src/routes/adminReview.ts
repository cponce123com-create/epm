import { Router, type IRouter } from "express";
import {
  db,
  articlesTable,
  notificationsTable,
  usersTable,
  categoriesTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { logger } from "../lib/logger";
import { safeError } from "../lib/safeError";

const router: IRouter = Router();

// ── Helper: crear notificación ─────────────────────────────────────────────

async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  relatedArticleId?: number;
}) {
  try {
    await db.insert(notificationsTable).values(params);
  } catch (err) {
    logger.error({ err }, "Error creating notification");
  }
}

// ── GET /api/admin/review/queue — cola de revisión ─────────────────────────
router.get(
  "/admin/review/queue",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (_req, res): Promise<void> => {
    try {
      const queue = await db
        .select({
          id: articlesTable.id,
          title: articlesTable.title,
          slug: articlesTable.slug,
          summary: articlesTable.summary,
          content: articlesTable.content,
          status: articlesTable.status,
          authorId: articlesTable.authorId,
          categoryId: articlesTable.categoryId,
          createdAt: articlesTable.createdAt,
          updatedAt: articlesTable.updatedAt,
          authorName: usersTable.displayName,
          authorEmail: usersTable.email,
          categoryName: categoriesTable.name,
        })
        .from(articlesTable)
        .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
        .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
        .where(eq(articlesTable.status, "in_review"))
        .orderBy(desc(articlesTable.updatedAt));

      res.json(queue);
    } catch (err) {
      logger.error({ err }, "Error fetching review queue");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/review/:id/submit — author envía a revisión ────────────
router.post(
  "/admin/review/:id/submit",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

       
      const user = (req as any).user;
      const [article] = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.id, id));

      if (!article) {
        res.status(404).json({ error: "Artículo no encontrado" });
        return;
      }

      // Author solo puede enviar sus propios artículos
      if (user.role === "author" && article.authorId !== user.userId) {
        res.status(403).json({ error: "No puedes enviar artículos de otros autores" });
        return;
      }

      if (article.status !== "draft" && article.status !== "archived") {
        res.status(400).json({
          error: `Solo se pueden enviar artículos en borrador. Estado actual: ${article.status}`,
        });
        return;
      }

      await db
        .update(articlesTable)
        .set({ status: "in_review", updatedAt: new Date() })
        .where(eq(articlesTable.id, id));

      // Notificar a admins
      const admins = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.isActive, true),
            usersTable.role.in(["admin", "superadmin"]),
          ),
        );

      for (const a of admins) {
        await createNotification({
          userId: a.id,
          type: "article_submitted",
          title: `Revisión pendiente: "${article.title}"`,
          body: `"${article.title}" ha sido enviado para revisión por ${user.email}.`,
          relatedArticleId: id,
        });
      }

      logger.info(
        { articleId: id, userId: user.userId },
        "Article submitted for review",
      );

      res.json({ ok: true, status: "in_review" });
    } catch (err) {
      logger.error({ err }, "Error submitting article");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/review/:id/approve — aprobar artículo ──────────────────
router.post(
  "/admin/review/:id/approve",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

       
      const user = (req as any).user;
      const [article] = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.id, id));

      if (!article) {
        res.status(404).json({ error: "Artículo no encontrado" });
        return;
      }

      if (article.status !== "in_review" && article.status !== "approved") {
        res.status(400).json({
          error: `Solo se pueden aprobar artículos en revisión. Actual: ${article.status}`,
        });
        return;
      }

      await db
        .update(articlesTable)
        .set({
          status: "approved",
          reviewedBy: user.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(articlesTable.id, id));

      await createNotification({
        userId: article.authorId,
        type: "article_approved",
        title: `Artículo aprobado: "${article.title}"`,
        body: "Tu artículo ha sido aprobado y está listo para publicar.",
        relatedArticleId: id,
      });

      logger.info(
        { articleId: id, reviewerId: user.userId },
        "Article approved",
      );

      res.json({ ok: true, status: "approved" });
    } catch (err) {
      logger.error({ err }, "Error approving article");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/review/:id/reject — rechazar con nota ─────────────────
router.post(
  "/admin/review/:id/reject",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

       
      const user = (req as any).user;
      const { editorialNote } = req.body as { editorialNote?: string };

      if (!editorialNote || editorialNote.trim().length === 0) {
        res.status(400).json({ error: "Se requiere una nota editorial" });
        return;
      }

      const [article] = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.id, id));

      if (!article) {
        res.status(404).json({ error: "Artículo no encontrado" });
        return;
      }

      if (article.status !== "in_review") {
        res.status(400).json({
          error: `Solo se pueden rechazar artículos en revisión. Actual: ${article.status}`,
        });
        return;
      }

      await db
        .update(articlesTable)
        .set({
          status: "draft",
          editorialNote: editorialNote.trim(),
          reviewedBy: user.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(articlesTable.id, id));

      await createNotification({
        userId: article.authorId,
        type: "article_rejected",
        title: `Artículo rechazado: "${article.title}"`,
        body: `Nota editorial: ${editorialNote.trim()}`,
        relatedArticleId: id,
      });

      logger.info(
        { articleId: id, reviewerId: user.userId },
        "Article rejected",
      );

      res.json({ ok: true, status: "draft" });
    } catch (err) {
      logger.error({ err }, "Error rejecting article");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/review/:id/publish — publicar artículo aprobado ────────
router.post(
  "/admin/review/:id/publish",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

       
      const user = (req as any).user;
      const [article] = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.id, id));

      if (!article) {
        res.status(404).json({ error: "Artículo no encontrado" });
        return;
      }

      // El flujo normal es approved → published, pero también permitimos publicar
      // directamente desde draft/in_review si el usuario es admin/superadmin.
      if (!["approved", "draft", "in_review"].includes(article.status)) {
        res.status(400).json({
          error: `No se puede publicar en estado: ${article.status}`,
        });
        return;
      }

      await db
        .update(articlesTable)
        .set({
          status: "published",
          publishedAt: article.publishedAt ?? new Date(),
          reviewedBy: article.reviewedBy ?? user.userId,
          reviewedAt: article.reviewedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(articlesTable.id, id));

      // Incrementar contador del autor
      await db
        .update(usersTable)
        .set({ articleCount: sql`${usersTable.articleCount} + 1` })
        .where(eq(usersTable.id, article.authorId));

      await createNotification({
        userId: article.authorId,
        type: "article_published",
        title: `Artículo publicado: "${article.title}"`,
        body: "¡Tu artículo ya está visible al público!",
        relatedArticleId: id,
      });

      logger.info(
        { articleId: id, publisherId: user.userId },
        "Article published",
      );

      res.json({ ok: true, status: "published" });
    } catch (err) {
      logger.error({ err }, "Error publishing article");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/review/:id/archive — archivar artículo ─────────────────
router.post(
  "/admin/review/:id/archive",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

       
      const user = (req as any).user;
      const [article] = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.id, id));

      if (!article) {
        res.status(404).json({ error: "Artículo no encontrado" });
        return;
      }

      await db
        .update(articlesTable)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(articlesTable.id, id));

      logger.info(
        { articleId: id, userId: user.userId },
        "Article archived",
      );

      res.json({ ok: true, status: "archived" });
    } catch (err) {
      logger.error({ err }, "Error archiving article");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

export default router;
