import { Router } from "express";
import { db, subscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { logger } from "../lib/logger";

const router = Router();

// RFC 5322 simplified: nombre@dominio.tld con validación básica de dominio
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email: string): boolean {
  if (!EMAIL_RE.test(email)) return false;

  // Rechazar emails con dominios peligrosos o temporales comunes
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const blockedDomains = [
    "example.com",
    "test.com",
    "localhost",
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "tempmail.com",
    "yopmail.com",
  ];

  if (blockedDomains.some((d) => domain === d || domain.endsWith("." + d))) {
    return false;
  }

  return true;
}

/**
 * POST /api/subscribe/google
 * Recibe un token de Google Identity Services, lo verifica,
 * y registra al usuario como suscriptor.
 */
router.post("/subscribe/google", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token de Google requerido." });
    return;
  }

  try {
    // Verificar el token con Google
    const verifyRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );

    if (!verifyRes.ok) {
      res.status(401).json({ error: "Token de Google inválido." });
      return;
    }

    const payload = (await verifyRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: string;
      aud?: string;
    };

    if (!payload.email || !payload.sub || payload.email_verified !== "true") {
      res.status(401).json({ error: "Email de Google no verificado." });
      return;
    }

    // Validar que el token fue emitido para esta aplicación
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (googleClientId && payload.aud !== googleClientId) {
      return res.status(401).json({ error: "Token de Google no válido para esta aplicación." });
    }

    // Verificar si ya existe
    const [existing] = await db
      .select({ id: subscribersTable.id })
      .from(subscribersTable)
      .where(eq(subscribersTable.email, payload.email));

    if (existing) {
      // Actualizar google_id y reactivar si estaba inactivo
      await db
        .update(subscribersTable)
        .set({
          googleId: payload.sub,
          name: payload.name ?? "",
          active: true,
        })
        .where(eq(subscribersTable.id, existing.id));
      res.json({
        ok: true,
        message: "Ya estabas suscrito. Te hemos reactivado.",
      });
      return;
    }

    await db.insert(subscribersTable).values({
      email: payload.email,
      name: payload.name ?? "",
      googleId: payload.sub,
      active: true,
    });

    logger.info({ email: payload.email }, "New Google subscriber");
    res
      .status(201)
      .json({
        ok: true,
        message: "¡Suscrito! Recibirás las noticias en tu correo.",
      });
  } catch (err) {
    logger.error({ err }, "Google subscribe error");
    res.status(502).json({ error: "Error al verificar con Google." });
  }
});

/**
 * POST /api/subscribe/email
 * Suscripción por email directo (sin Google OAuth).
 */
router.post("/subscribe/email", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "Email válido requerido." });
    return;
  }

  const normalized = email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: subscribersTable.id, active: subscribersTable.active })
    .from(subscribersTable)
    .where(eq(subscribersTable.email, normalized));

  if (existing) {
    if (!existing.active) {
      await db
        .update(subscribersTable)
        .set({ active: true })
        .where(eq(subscribersTable.id, existing.id));
      res.json({ ok: true, message: "Te hemos reactivado la suscripción." });
    } else {
      res.json({ ok: true, message: "Ya estás suscrito." });
    }
    return;
  }

  await db.insert(subscribersTable).values({
    email: normalized,
    active: true,
  });

  logger.info({ email: normalized }, "New email subscriber");
  res
    .status(201)
    .json({
      ok: true,
      message: "¡Suscrito! Recibirás las noticias en tu correo.",
    });
});

/**
 * GET /api/admin/subscribers
 * Lista todos los suscriptores (solo superadmin).
 */
router.get(
  "/admin/subscribers",
  requireAuth,
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    const subs = await db
      .select()
      .from(subscribersTable)
      .orderBy(subscribersTable.subscribedAt);

    res.json(subs);
  },
);

/**
 * DELETE /api/admin/subscribers/:id
 * Elimina un suscriptor (solo superadmin).
 */
router.delete(
  "/admin/subscribers/:id",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }

    await db.delete(subscribersTable).where(eq(subscribersTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
