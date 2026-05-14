import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { ogMiddleware } from "./lib/ogMiddleware";

const app: Express = express();

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// CORS_ORIGINS: orígenes permitidos separados por coma (ej: "https://a.com,https://b.com")
// Con el servidor unificado las peticiones del frontend son same-origin.
// CORS solo es necesario para acceso externo (OG bots, futuras apps).
const rawOrigins = process.env["CORS_ORIGINS"] ?? "";
const allowedOrigins: string[] | boolean = rawOrigins
  ? rawOrigins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

const corsOptions: cors.CorsOptions = {
  origin:
    allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
          }
        }
      : false,
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ── Rate limiting ────────────────────────────────────────────────────────────
// En producción, Render usa un proxy → confiar en X-Forwarded-For
if (process.env["NODE_ENV"] === "production") {
  app.set("trust proxy", 1);
}

// Rate limiter general para toda la API (100 req / 15 min por IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones. Intenta de nuevo en 15 minutos." },
});

// Rate limiter estricto para login (5 intentos / 15 min por IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de login. Intenta de nuevo en 15 minutos.",
  },
  skipSuccessfulRequests: true, // solo cuenta los fallos
});

// Aplicar limiters a ambas versiones de la API
app.use("/api/auth/login", loginLimiter);
app.use("/api/v1/auth/login", loginLimiter);
app.use("/api", apiLimiter);
app.use("/api/v1", apiLimiter);

// ── Cabeceras de seguridad (Helmet) ──────────────────────────────────────────
// CSP con nonces para scripts inline (SSR). Sin 'unsafe-inline'.
// En desarrollo se permite 'unsafe-inline' para React HMR.
const isProduction = process.env["NODE_ENV"] === "production";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? [
              "'self'",
              (_req: Request, res: Response) =>
                `'nonce-${(res as any).locals.cspNonce}'`,
            ]
          : ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https:"],
        connectSrc: [
          "'self'",
          "https://api.open-meteo.com",
          "https://www.sunat.gob.pe",
          "https://api.exchangerate-api.com",
          "https://www.googleapis.com",
        ],
        fontSrc: ["'self'"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Rutas de API ──────────────────────────────────────────────────────────────
// /api/v1  — versión canónica
// /api     — retrocompatibilidad (deprecado, se eliminará en v2)
app.use("/api/v1", router);
app.use("/api", router);

// ── SSR Open Graph (solo crawlers) ──────────────────────────────────────────
// ogMiddleware intercepta /articulo/:slug cuando el User-Agent coincide con
// bots de Facebook, Twitter, WhatsApp, Telegram, LinkedIn, etc.
// Sirve HTML con meta tags OG directamente desde la DB sin JS.
// Usuarios reales pasan directo al SPA sin overhead.
app.use(ogMiddleware);
// ── Frontend estático (solo en producción) ───────────────────────────────────
// En producción Express sirve el build de Vite directamente.
if (process.env["NODE_ENV"] === "production") {
  const __dirnameApp = path.dirname(fileURLToPath(import.meta.url));
  const FRONTEND_DIST = path.resolve(
    __dirnameApp,
    "..",
    "..",
    "el-principe-mestizo",
    "dist",
    "public",
  );

  const indexHtml = path.join(FRONTEND_DIST, "index.html");
  const hasFrontend = fs.existsSync(indexHtml);

  logger.info({ frontendDist: FRONTEND_DIST, hasFrontend }, "Frontend check");

  if (hasFrontend) {
    // Servir archivos estáticos (JS, CSS, imágenes con hash → cache 1 año)
    app.use(
      express.static(FRONTEND_DIST, {
        maxAge: "1y",
        etag: true,
        index: false,
      }),
    );

    // SPA fallback: cualquier ruta no-API devuelve index.html (wouter maneja el routing)
    app.use((_req: Request, res: Response) => {
      res.sendFile(indexHtml);
    });
  }
}

// ── Manejador global de errores ───────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
