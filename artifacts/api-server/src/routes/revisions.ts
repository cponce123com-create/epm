import { Router, type IRouter } from "express";
import { db, articleRevisionsTable, articlesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { safeError } from "../lib/safeError";

const router: IRouter = Router();

// ── GET /api/admin/articles/:id/revisions ───────────────────────────────────
router.get(
  "/admin/articles/:id/revisions",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const articleId = parseInt(req.params.id, 10);
      if (isNaN(articleId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const revisions = await db
        .select({
          id: articleRevisionsTable.id,
          title: articleRevisionsTable.title,
          savedBy: articleRevisionsTable.savedBy,
          savedAt: articleRevisionsTable.savedAt,
        })
        .from(articleRevisionsTable)
        .where(eq(articleRevisionsTable.articleId, articleId))
        .orderBy(desc(articleRevisionsTable.savedAt));

      res.json(revisions);
    } catch (err) {
      logger.error({ err }, "Error fetching revisions");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── GET /api/admin/articles/:id/revisions/:rev — obtener versión ────────────
router.get(
  "/admin/articles/:id/revisions/:rev",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const articleId = parseInt(req.params.id, 10);
      const revId = parseInt(req.params.rev, 10);
      if (isNaN(articleId) || isNaN(revId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const [revision] = await db
        .select()
        .from(articleRevisionsTable)
        .where(
          and(
            eq(articleRevisionsTable.articleId, articleId),
            eq(articleRevisionsTable.id, revId),
          ),
        );

      if (!revision) {
        res.status(404).json({ error: "Revisión no encontrada" });
        return;
      }

      res.json(revision);
    } catch (err) {
      logger.error({ err }, "Error fetching revision");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/articles/:id/revisions — guardar versión ────────────────
router.post(
  "/admin/articles/:id/revisions",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const articleId = parseInt(req.params.id, 10);
      if (isNaN(articleId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const user = (req as any).user;

      // Verificar que el artículo existe
      const [article] = await db
        .select({ id: articlesTable.id, authorId: articlesTable.authorId })
        .from(articlesTable)
        .where(eq(articlesTable.id, articleId));

      if (!article) {
        res.status(404).json({ error: "Artículo no encontrado" });
        return;
      }

      // Author solo puede guardar revisiones de sus propios artículos
      if (
        user.role === "author" &&
        article.authorId !== user.userId
      ) {
        res.status(403).json({ error: "No autorizado" });
        return;
      }

      const { title, content, summary } = req.body as {
        title?: string;
        content?: string;
        summary?: string;
      };

      if (!title || !content) {
        res.status(400).json({ error: "title y content son requeridos" });
        return;
      }

      const [revision] = await db
        .insert(articleRevisionsTable)
        .values({
          articleId,
          title,
          content,
          summary: summary ?? "",
          savedBy: user.userId,
        })
        .returning();

      logger.info(
        { articleId, revisionId: revision.id, userId: user.userId },
        "Revision saved",
      );

      res.status(201).json(revision);
    } catch (err) {
      logger.error({ err }, "Error saving revision");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

export default router;
