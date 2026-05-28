import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { signToken, verifyTokenSignature } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { logAudit, auditCtx } from "../lib/audit";

const router: IRouter = Router();

const REFRESH_GRACE_MS = 24 * 60 * 60 * 1000; // 24h para refrescar

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  let user;
  try {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
  } catch (dbErr) {
    logger.error({ err: dbErr, email }, "DB error during login query");
    res.status(500).json({ error: "Error interno del servidor" });
    return;
  }

  if (!user) {
    logger.warn({ email, reason: "user_not_found" }, "Login failed");
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  // Verificar que la cuenta esté activa
  if (user.isActive === false) {
    logger.warn({ email, userId: user.id, reason: "account_inactive" }, "Login blocked");
    res.status(403).json({ error: "Tu cuenta ha sido desactivada. Contacta al administrador." });
    return;
  }

  let valid: boolean;
  try {
    valid = await bcrypt.compare(password, user.passwordHash);
  } catch (bcryptErr) {
    logger.error({ err: bcryptErr, userId: user.id }, "bcrypt error during login");
    res.status(500).json({ error: "Error interno del servidor" });
    return;
  }

  if (!valid) {
    logger.warn(
      { email, userId: user.id, reason: "invalid_password" },
      "Login failed",
    );
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  // Registrar último login
  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id, email, role: user.role }, "Login successful");

  let token: string;
  try {
    token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    });
  } catch (jwtErr) {
    logger.error({ err: jwtErr, userId: user.id }, "JWT signing error during login");
    res.status(500).json({ error: "Error interno del servidor" });
    return;
  }

  logAudit({
    ...auditCtx(req),
    userId: user.id,
    action: "LOGIN",
    targetType: "user",
    targetId: user.id,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
    },
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const ctx = auditCtx(req);
  if (ctx.userId) {
    logAudit({ ...ctx, action: "LOGOUT", targetType: "user", targetId: ctx.userId });
  }
  res.json({ ok: true });
});

// ── GET /auth/me — Verificar token vigente ───────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });
});

// ── POST /auth/refresh — Renovar token expirado ─────────────────────────────
// Acepta un token cuya firma sea válida y haya sido emitido en las últimas 24h.
// Devuelve un nuevo JWT con expiración fresca de 2h.
router.post("/auth/refresh", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }

  const payload = verifyTokenSignature(token);
  if (!payload) {
    res.status(401).json({ error: "Token inválido o firma corrupta" });
    return;
  }

  // Verificar que el token no sea demasiado antiguo (máx 24h desde iat)
  if (payload.iat) {
    const elapsed = Date.now() - payload.iat * 1000;
    if (elapsed > REFRESH_GRACE_MS) {
      res.status(401).json({ error: "Token expirado, inicia sesión nuevamente" });
      return;
    }
  }

  // Buscar usuario actualizado en DB
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
      tokenVersion: usersTable.tokenVersion,
    })
    .from(usersTable)
    .where(eq(usersTable.id, payload.sub));

  if (!user) {
    res.status(401).json({ error: "Usuario no encontrado" });
    return;
  }

  const newToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });

  logger.info(
    { userId: user.id, email: user.email },
    "Token refreshed successfully",
  );

  res.json({
    token: newToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
    },
  });
});

export default router;
