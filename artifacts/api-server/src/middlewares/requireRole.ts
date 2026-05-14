import type { Request, Response, NextFunction } from "express";

type UserRole = "superadmin" | "admin" | "author";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

/**
 * Middleware que verifica que el usuario tenga al menos uno de los roles dados.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "No autorizado para esta acción" });
      return;
    }
    next();
  };
}

/**
 * Middleware que permite acceso si el usuario es dueño del recurso o tiene rol
 * superior (admin o superadmin).
 */
export function requireOwnerOrAdmin(
  getOwnerId: (req: AuthRequest) => Promise<number>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    try {
      const ownerId = await getOwnerId(authReq);
      if (
        user.userId === ownerId ||
        user.role === "admin" ||
        user.role === "superadmin"
      ) {
        return next();
      }
    } catch {
      res.status(404).json({ error: "Recurso no encontrado" });
      return;
    }

    res.status(403).json({ error: "No puedes modificar recursos de otros autores" });
  };
}
