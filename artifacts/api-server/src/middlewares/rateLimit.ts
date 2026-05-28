import rateLimit from "express-rate-limit";

// ── Login: 5 intentos cada 15 minutos ──────────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de inicio de sesión. Espera 15 minutos." },
  skipSuccessfulRequests: true, // no contar intentos exitosos
});

// ── Admin API: 100 solicitudes cada 15 minutos ─────────────────────────────
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
});

// ── Artículos (creación): 10 por hora ──────────────────────────────────────
export const articleCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Has alcanzado el límite de creación de artículos. Espera 1 hora." },
});

// ── Comentarios: 3 por minuto ──────────────────────────────────────────────
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados comentarios. Espera un minuto." },
});

// ── Registro / invitación: 3 por hora ─────────────────────────────────────
export const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Has alcanzado el límite de invitaciones. Espera 1 hora." },
});
