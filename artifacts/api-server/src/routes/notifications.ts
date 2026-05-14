import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { safeError } from "../lib/safeError";

const router: IRouter = Router();

// ── GET /api/notifications ──────────────────────────────────────────────────
router.get(
  "/notifications",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const user = (req as any).user;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const notifications = await db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, user.userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, user.userId));

      res.json({
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      logger.error({ err }, "Error fetching notifications");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── PUT /api/notifications/:id/read ─────────────────────────────────────────
router.put(
  "/notifications/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      await db
        .update(notificationsTable)
        .set({ isRead: true })
        .where(
          and(
            eq(notificationsTable.id, id),
            eq(notificationsTable.userId, user.userId),
          ),
        );

      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Error marking notification as read");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── PUT /api/notifications/read-all ─────────────────────────────────────────
router.put(
  "/notifications/read-all",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const user = (req as any).user;

      await db
        .update(notificationsTable)
        .set({ isRead: true })
        .where(
          and(
            eq(notificationsTable.userId, user.userId),
            eq(notificationsTable.isRead, false),
          ),
        );

      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Error marking all notifications as read");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── GET /api/notifications/unread-count ─────────────────────────────────────
router.get(
  "/notifications/unread-count",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const user = (req as any).user;

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, user.userId),
            eq(notificationsTable.isRead, false),
          ),
        );

      res.json({ count: count ?? 0 });
    } catch (err) {
      logger.error({ err }, "Error fetching unread count");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

export default router;
