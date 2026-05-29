import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable, articlesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { logger } from "../lib/logger";
import { logAudit, auditCtx } from "../lib/audit";

const router: IRouter = Router();

const userRoleEnum = z.enum(["superadmin", "admin", "editor", "writer", "reader"]);

const CreateUserBody = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  displayName: z.string().min(1).max(255).optional(),
  role: userRoleEnum.optional(),
});

const UpdateUserRoleBody = z.object({
  role: userRoleEnum,
});

// Crear un nuevo usuario (Solo Superadmin)
router.post(
  "/admin/users",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { email, password, displayName, role } = parsed.data;
    const finalRole = role ?? "writer";

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Ya existe un usuario con ese email." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        passwordHash,
        displayName: displayName || email.split("@")[0],
        role: finalRole as "superadmin" | "admin" | "editor" | "writer" | "reader",
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      });

     
    const byUser = (req as any).user;
    logger.info(
      {
        createdUserId: user.id,
        createdEmail: user.email,
        createdRole: user.role,
        byUserId: byUser?.userId,
      },
      "User created by admin",
    );

    logAudit({
      ...auditCtx(req),
      action: "CREATE",
      targetType: "user",
      targetId: user.id,
      newValues: { email: user.email, role: user.role },
    });

    res.status(201).json(user);
  },
);

// Listar todos los usuarios (Solo Superadmin)
router.get(
  "/admin/users",
  requireAuth,
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        role: usersTable.role,
        avatarUrl: usersTable.avatarUrl,
        isActive: usersTable.isActive,
        articleCount: usersTable.articleCount,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable);

    res.json(users);
  },
);

// Cambiar el rol de un usuario (Solo Superadmin)
router.patch(
  "/admin/users/:id/role",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const parsed = UpdateUserRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    const { role } = parsed.data;

    const [targetUser] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!targetUser) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // Incrementar tokenVersion para invalidar sesiones anteriores
    await db
      .update(usersTable)
      .set({
        role,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
      })
      .where(eq(usersTable.id, id));

     
    const byUser = (req as any).user;
    logger.info(
      {
        targetUserId: id,
        targetEmail: targetUser?.email,
        previousRole: targetUser?.role,
        newRole: role,
        byUserId: byUser?.userId,
      },
      "User role changed",
    );

    logAudit({
      ...auditCtx(req),
      action: "ROLE_CHANGE",
      targetType: "user",
      targetId: id,
      oldValues: { role: targetUser.role },
      newValues: { role },
    });

    res.json({ ok: true, message: `Rol actualizado a "${role}". Sesiones anteriores invalidadas.` });
  },
);

// Eliminar un usuario (Solo Superadmin)
router.delete(
  "/admin/users/:id",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
     
    const user = (req as any).user;

    if (id === user.userId) {
      res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
      return;
    }

    const [targetUser] = await db
      .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!targetUser) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // Reasignar artículos del usuario eliminado al admin que ejecuta la acción
    await db
      .update(articlesTable)
      .set({ authorId: user.userId })
      .where(eq(articlesTable.authorId, id));

    await db.delete(usersTable).where(eq(usersTable.id, id));

    logger.info(
      {
        deletedUserId: id,
        deletedEmail: targetUser.email,
        byUserId: user.userId,
      },
      "User deleted by admin",
    );

    logAudit({
      ...auditCtx(req),
      action: "DELETE",
      targetType: "user",
      targetId: id,
      oldValues: { email: targetUser.email, role: targetUser.role },
    });

    res.json({ ok: true });
  },
);

export default router;
