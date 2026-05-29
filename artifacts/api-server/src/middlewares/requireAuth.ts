import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Intentar obtener token del header Authorization primero, luego de la cookie
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = await verifyToken(token);
    // Mapear a la forma que las rutas esperan (userId, email, role)
    (req as AuthenticatedRequest).user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
