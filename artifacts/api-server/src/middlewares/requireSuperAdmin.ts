import { Request, Response, NextFunction } from "express";

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (user.role !== "superadmin") {
    res.status(403).json({ error: "Se requiere rol de superadmin para esta acción" });
    return;
  }

  next();
}
