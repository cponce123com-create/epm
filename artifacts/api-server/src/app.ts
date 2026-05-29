import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import sitemapRouter from "./routes/sitemap";
import { logger } from "./lib/logger";
import { ogMiddleware } from "./lib/ogMiddleware";
import crypto from "node:crypto";
import cookieParser from "cookie-parser";

const app: Express = express();

// ── Compresión gzip/Brotli ───────────────────────────────────────────────────
app.use(compression({ threshold: 1024 }));

// ── robots.txt — PRIMERO, antes de cualquier middleware ─────────────────────
// Facebookexternalhit y otros crawlers necesitan acceder sin restricciones.
const ROBOTS_CONTENT = `User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: *
Allow: /

Sitemap: https://elprincipemestizo.eu.cc/sitemap.xml
`;

app.get("/robots.txt", (_req: Request, res: Response): void => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.send(ROBOTS_CONTENT);
});

// ── NOTA sobre CORS y crawlers ──────────────────────────────────────────────
// Anteriormente existía un bloque que eliminaba req.headers["origin"] para
// crawlers (facebookexternalhit, twitterbot, etc.) permitiendo que cualquier
// cliente falsificara su User-Agent para saltarse CORS.
//
// La solución correcta es listar los orígenes necesarios en CORS_ORIGINS.
// Para crawlers que no envían Origin, la función callback de CORS ya permite
// el acceso (origin == null → callback(null, true)).

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

// ── Cookie parser ───────────────────────────────────────────────────────────
app.use(cookieParser());

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

// Aplicar limiters — solo /api (cubre /api/* y /api/v1/* por ser subpath)
app.use("/api/auth/login", loginLimiter);
app.use("/api", apiLimiter);

// ── Middleware de nonce CSP (debe ir ANTES de Helmet) ─────────────────────
// Genera un nonce por request para scripts inline seguros.
app.use((req: Request, res: Response, next: NextFunction): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).locals.cspNonce = crypto.randomBytes(16).toString("hex");
  next();
});

// ── Cabeceras de seguridad (Helmet) ──────────────────────────────────────────
// CSP con nonces para scripts inline (SSR). En producción se permite
// 'unsafe-inline' para Sentry (error tracking/replay) que inyecta scripts
// inline dinámicamente sin nonce. Sin 'unsafe-inline' Sentry no funciona.
const isProduction = process.env["NODE_ENV"] === "production";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? [
              "'self'",
              "'unsafe-inline'",
              "https://pagead2.googlesyndication.com",
              (_req: Request, res: Response) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                `'nonce-${(res as any).locals.cspNonce}'`,
            ]
          : ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://*.cloudinary.com",
          "https://img.youtube.com",
          "https://*.ytimg.com",
          "https://www.google.com",
          "https://pagead2.googlesyndication.com",
          "https://*.doubleclick.net",
          "https://www.gstatic.com",
          "https:",
        ],
        connectSrc: [
          "'self'",
          "https://api.open-meteo.com",
          "https://www.sunat.gob.pe",
          "https://api.exchangerate-api.com",
          "https://www.googleapis.com",
          "https://*.cloudinary.com",
          "https://res.cloudinary.com",
          "https://o4511469778960384.ingest.us.sentry.io",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "data:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // COEP require-corp rompe Cloudinary, YouTube, Google Ads, etc.
    // Se mantiene deshabilitado para un sitio de noticias con recursos third-party.
    // crossOriginEmbedderPolicy: { policy: "require-corp" },
    permissionsPolicy: {
      directives: {
        geolocation: [],
        microphone: [],
        camera: [],
        usb: [],
        magnetometer: [],
        accelerometer: [],
        vr: [],
        speaker: [],
        documentDomain: [],
        fullscreen: ["'self'"],
        payment: [],
        syncXhr: [],
      },
    },
  }),
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Rutas de API ──────────────────────────────────────────────────────────────
// /api/v1  — versión canónica
// /api     — retrocompatibilidad (deprecado, se eliminará en v2)

// Sitemap también en raíz (para robots.txt)
app.use("/sitemap.xml", sitemapRouter);

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
