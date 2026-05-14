import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, userPermissionsTable, articlesTable } from "@workspace/db";
import { eq, and, sql, count, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { logger } from "../lib/logger";
import { safeError } from "../lib/safeError";

const router: IRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function generatePassword(): string {
  return crypto.randomBytes(12).toString("base64url").slice(0, 12);
}

const editorSelect = {
  id: usersTable.id,
  email: usersTable.email,
  displayName: usersTable.displayName,
  avatarUrl: usersTable.avatarUrl,
  role: usersTable.role,
  bio: usersTable.bio,
  twitterHandle: usersTable.twitterHandle,
  articleCount: usersTable.articleCount,
  isActive: usersTable.isActive,
  lastLoginAt: usersTable.lastLoginAt,
  createdAt: usersTable.createdAt,
};

// ── GET /api/admin/editors — lista editores ──────────────────────────────────
router.get(
  "/admin/editors",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (_req, res): Promise<void> => {
    try {
      const editors = await db.select(editorSelect).from(usersTable).orderBy(usersTable.createdAt);
      res.json(editors);
    } catch (err) {
      logger.error({ err }, "Error fetching editors");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/editors — crea editor ──────────────────────────────────
router.post(
  "/admin/editors",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const { email, displayName, role } = req.body as {
        email?: string;
        displayName?: string;
        role?: string;
      };

      if (!email || !displayName) {
        res.status(400).json({ error: "email y displayName son requeridos" });
        return;
      }

      // Validar rol
      const validRoles = ["author", "admin", "superadmin"];
      const targetRole = role ?? "author";
      if (!validRoles.includes(targetRole)) {
        res.status(400).json({ error: `Rol inválido: ${targetRole}` });
        return;
      }

      // Solo superadmin puede crear admins o superadmins
      const currentUser = (req as any).user;
      if (
        (targetRole === "admin" || targetRole === "superadmin") &&
        currentUser.role !== "superadmin"
      ) {
        res.status(403).json({ error: "Solo superadmin puede crear roles admin o superadmin" });
        return;
      }

      // Verificar duplicado
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existing) {
        res.status(409).json({ error: "Ya existe un editor con ese email" });
        return;
      }

      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 12);

      const [editor] = await db
        .insert(usersTable)
        .values({
          email,
          passwordHash,
          displayName,
          role: targetRole as any,
        })
        .returning(editorSelect);

      logger.info(
        { createdById: currentUser.userId, editorId: editor.id, email },
        "Editor created",
      );

      // Retornar la contraseña temporal UNA sola vez
      res.status(201).json({ editor, temporaryPassword: password });
    } catch (err) {
      logger.error({ err }, "Error creating editor");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── PUT /api/admin/editors/:id — actualiza editor ──────────────────────────
router.put(
  "/admin/editors/:id",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const [target] = await db
        .select({ role: usersTable.role, id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, id));

      if (!target) {
        res.status(404).json({ error: "Editor no encontrado" });
        return;
      }

      const currentUser = (req as any).user;
      const body = req.body as {
        displayName?: string;
        role?: string;
        bio?: string;
        twitterHandle?: string;
        isActive?: boolean;
      };

      const updates: Record<string, any> = {};

      if (body.displayName !== undefined) updates.displayName = body.displayName;
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.twitterHandle !== undefined) updates.twitterHandle = body.twitterHandle;
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      // Cambio de rol: solo superadmin
      if (body.role && body.role !== target.role) {
        if (currentUser.role !== "superadmin") {
          res.status(403).json({ error: "Solo superadmin puede cambiar roles" });
          return;
        }
        const validRoles = ["author", "admin", "superadmin"];
        if (!validRoles.includes(body.role)) {
          res.status(400).json({ error: `Rol inválido: ${body.role}` });
          return;
        }
        updates.role = body.role;
      }

      if (Object.keys(updates).length === 0) {
        res.json({ ok: true });
        return;
      }

      const [updated] = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, id))
        .returning(editorSelect);

      logger.info(
        { byUserId: currentUser.userId, targetId: id, updates: Object.keys(updates) },
        "Editor updated",
      );

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error updating editor");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── DELETE /api/admin/editors/:id — desactiva editor ───────────────────────
router.delete(
  "/admin/editors/:id",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const [target] = await db
        .select({ id: usersTable.id, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, id));

      if (!target) {
        res.status(404).json({ error: "Editor no encontrado" });
        return;
      }

      const currentUser = (req as any).user;
      // No permitir borrar otros admins (solo superadmin)
      if (target.role === "admin" && currentUser.role !== "superadmin") {
        res.status(403).json({ error: "Solo superadmin puede desactivar admins" });
        return;
      }

      await db
        .update(usersTable)
        .set({ isActive: false })
        .where(eq(usersTable.id, id));

      logger.info(
        { byUserId: currentUser.userId, targetId: id },
        "Editor deactivated",
      );

      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Error deactivating editor");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── GET /api/admin/editors/:id/articles — artículos del editor ─────────────
router.get(
  "/admin/editors/:id/articles",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const articles = await db
        .select({
          id: articlesTable.id,
          title: articlesTable.title,
          slug: articlesTable.slug,
          status: articlesTable.status,
          views: articlesTable.views,
          publishedAt: articlesTable.publishedAt,
          createdAt: articlesTable.createdAt,
        })
        .from(articlesTable)
        .where(eq(articlesTable.authorId, id))
        .orderBy(articlesTable.createdAt);

      const stats = {
        total: articles.length,
        published: articles.filter((a) => a.status === "published").length,
        inReview: articles.filter((a) => a.status === "in_review").length,
        draft: articles.filter((a) => a.status === "draft").length,
      };

      res.json({ articles, stats });
    } catch (err) {
      logger.error({ err }, "Error fetching editor articles");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── POST /api/admin/editors/:id/permissions — otorga permiso ───────────────
router.post(
  "/admin/editors/:id/permissions",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const { permission } = req.body as { permission?: string };
      const validPerms = [
        "publish_own",
        "edit_others",
        "delete_own",
        "manage_comments",
        "import_articles",
        "upload_images",
      ];

      if (!permission || !validPerms.includes(permission)) {
        res.status(400).json({
          error: `Permiso inválido. Válidos: ${validPerms.join(", ")}`,
        });
        return;
      }

      const currentUser = (req as any).user;
      const [perm] = await db
        .insert(userPermissionsTable)
        .values({
          userId,
          permission,
          grantedBy: currentUser.userId,
        })
        .returning()
        .onConflictDoNothing();

      if (!perm) {
        res.json({ ok: true, note: "Permiso ya existía" });
        return;
      }

      logger.info(
        { byUserId: currentUser.userId, targetId: userId, permission },
        "Permission granted",
      );

      res.status(201).json(perm);
    } catch (err) {
      logger.error({ err }, "Error granting permission");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// ── DELETE /api/admin/editors/:id/permissions/:permission ─────────────────
router.delete(
  "/admin/editors/:id/permissions/:permission",
  requireAuth,
  requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { permission } = req.params;

      if (isNaN(userId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      await db
        .delete(userPermissionsTable)
        .where(
          and(
            eq(userPermissionsTable.userId, userId),
            eq(userPermissionsTable.permission, permission),
          ),
        );

      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Error revoking permission");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

export default router;
