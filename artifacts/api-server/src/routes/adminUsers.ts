import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";

const router: IRouter = Router();

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
  const id = parseInt(req.params.id, 10);
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
  const id = parseInt(req.params.id, 10);
  const user = (req as any).user;

  if (id === user.userId) {
    res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

export default router;
