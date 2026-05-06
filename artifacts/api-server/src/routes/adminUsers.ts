import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";

const router: IRouter = Router();

// Crear un nuevo usuario (Solo Superadmin)
router.post("/admin/users", requireAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const { email, password, displayName, role } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña son requeridos." });
    return;
  }

  const validRoles = ["superadmin", "admin", "author"];
  const finalRole = validRoles.includes(role ?? "") ? role! : "author";

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Ya existe un usuario con ese email." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    displayName: displayName || email.split("@")[0],
    role: finalRole as "superadmin" | "admin" | "author",
  }).returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  res.status(201).json(user);
});

// Listar todos los usuarios (Solo Superadmin)
router.get("/admin/users", requireAuth, requireSuperAdmin, async (_req, res): Promise<void> => {
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
});

// Cambiar el rol de un usuario (Solo Superadmin)
router.patch("/admin/users/:id/role", requireAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { role } = req.body as { role: "superadmin" | "admin" | "author" };

  if (!["superadmin", "admin", "author"].includes(role)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }

  // Evitar que el superadmin se quite a sí mismo el rol si es el único (opcional pero recomendado)
  // Por ahora permitimos cambios, asumiendo que el usuario sabe lo que hace.

  await db.update(usersTable).set({ role }).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

// Eliminar un usuario (Solo Superadmin)
router.delete("/admin/users/:id", requireAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const user = (req as any).user;

  if (id === user.userId) {
    res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

export default router;
