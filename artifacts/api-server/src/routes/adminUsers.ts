import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const userRoleEnum = z.enum(["superadmin", "admin", "author"]);

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
    const finalRole = role ?? "author";

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
        role: finalRole as "superadmin" | "admin" | "author",
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

    // Evitar que el superadmin se quite a sí mismo el rol si es el único (opcional pero recomendado)
    // Por ahora permitimos cambios, asumiendo que el usuario sabe lo que hace.

    const [targetUser] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    await db.update(usersTable).set({ role }).where(eq(usersTable.id, id));

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

    res.json({ ok: true });
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
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    await db.delete(usersTable).where(eq(usersTable.id, id));

    logger.info(
      {
        deletedUserId: id,
        deletedEmail: targetUser?.email,
        byUserId: user.userId,
      },
      "User deleted by admin",
    );

    res.json({ ok: true });
  },
);

export default router;
