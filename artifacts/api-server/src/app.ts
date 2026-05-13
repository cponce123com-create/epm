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
import { db, articlesTable, siteSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

// ── SSR Open Graph ────────────────────────────────────────────────────────────
// Los bots de Facebook/WhatsApp/Twitter no ejecutan JS.
// Este endpoint devuelve HTML con meta tags OG ya inyectados para cada artículo.

async function getOgSettings(): Promise<{
  ogImage: string;
  siteName: string;
  siteDescription: string;
  siteUrl: string;
}> {
  const rows = await db.select().from(siteSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    ogImage: map["og_image"] ?? "",
    siteName: map["site_name"] ?? "El Príncipe Mestizo",
    siteDescription:
      map["site_description"] ??
      "Periodismo ciudadano desde San Ramón, Chanchamayo (Perú)",
    siteUrl: map["site_url"] ?? "",
  };
}

function escHtml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

app.get(
  "/articulo/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params["slug"] ?? "");
    const FALLBACK_URL =
      process.env["FRONTEND_URL"] ?? "https://elprincipemestizo.eu.cc";

    try {
      const [article] = await db
        .select({
          title: articlesTable.title,
          slug: articlesTable.slug,
          summary: articlesTable.summary,
          coverImageUrl: articlesTable.coverImageUrl,
          status: articlesTable.status,
          publishedAt: articlesTable.publishedAt,
        })
        .from(articlesTable)
        .where(
          and(
            eq(articlesTable.slug, slug),
            eq(articlesTable.status, "published"),
          ),
        );

      const settings = await getOgSettings();
      const frontendUrl = (settings.siteUrl || FALLBACK_URL).replace(
        /\/+$/,
        "",
      );
      const canonicalUrl = `${frontendUrl}/articulo/${slug}`;

      if (!article) {
        res.redirect(302, canonicalUrl);
        return;
      }

      const title = escHtml(article.title ?? settings.siteName);
      const description = escHtml(article.summary ?? settings.siteDescription);
      const siteName = escHtml(settings.siteName);

      // Para Open Graph usamos la URL directa, NO el proxy.
      // Los crawlers de Facebook/Twitter/Telegram tienen sus propios UA
      // y pueden descargar imágenes de Medium CDN sin problema.
      // El proxy solo es necesario para <img> embebidos en el contenido.
      const rawImage = article.coverImageUrl || settings.ogImage || "";
      let directImage = rawImage;
      // Si está usando nuestro proxy (/api/proxy-image), extraer la URL original
      const proxyMatch = directImage.match(/^\/api\/proxy-image\?url=(.+)$/i);
      if (proxyMatch) {
        try {
          directImage = decodeURIComponent(proxyMatch[1]);
        } catch {
          /* mantener como está */
        }
      }
      const image = escHtml(
        directImage.startsWith("http")
          ? directImage
          : directImage
            ? `${frontendUrl}${directImage.startsWith("/") ? "" : "/"}${directImage}`
            : `${frontendUrl}/opengraph.jpg`,
      );

      const publishedAt = article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : "";

      const imageMetaTags = image
        ? `
  <meta property="og:image"            content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width"      content="1200" />
  <meta property="og:image:height"     content="630" />
  <meta property="og:image:alt"        content="${title}" />
  <meta name="twitter:card"            content="summary_large_image" />
  <meta name="twitter:image"           content="${image}" />`
        : `<meta name="twitter:card" content="summary" />`;

      const articleTimeTags = publishedAt
        ? `\n  <meta property="article:published_time" content="${publishedAt}" />`
        : "";

      const safeUrl = escHtml(canonicalUrl);
      const jsUrl = JSON.stringify(canonicalUrl);
      const nonce = (res as any).locals.cspNonce ?? "";

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ${siteName}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type"        content="article" />
  <meta property="og:title"       content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url"         content="${safeUrl}" />
  <meta property="og:site_name"   content="${siteName}" />
  <meta property="og:locale"      content="es_PE" />${imageMetaTags}${articleTimeTags}
  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <link rel="canonical" href="${safeUrl}" />
  <style${nonce ? ` nonce="${nonce}"` : ""}>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;background:#111;color:#ddd;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{max-width:500px;width:100%;background:#1e1e1e;border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.55)}
    .cover{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
    .body{padding:20px 24px 26px}
    .site{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#666;font-family:sans-serif;margin-bottom:10px}
    h1{font-size:20px;font-weight:700;line-height:1.32;color:#f0f0f0;margin-bottom:10px}
    p{font-size:14px;line-height:1.7;color:#999;margin-bottom:18px}
    a{display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:5px;font-size:13px;font-family:sans-serif;font-weight:600;letter-spacing:.02em}
    a:hover{background:#a93226}
  </style>
</head>
<body>
  <div class="card">
    ${image ? `<img class="cover" src="${image}" alt="${title}" />` : ""}
    <div class="body">
      <div class="site">${siteName}</div>
      <h1>${title}</h1>
      ${description ? `<p>${description}</p>` : ""}
      <a href="${safeUrl}">Leer artículo completo →</a>
    </div>
  </div>
  <script${nonce ? ` nonce="${nonce}"` : ""}>
    (function(){window.location.replace(${jsUrl});})();
  </script>
</body>
</html>`);
    } catch (err) {
      logger.error({ err, slug }, "SSR OG middleware error");
      res.redirect(302, `${FALLBACK_URL}/articulo/${slug}`);
    }
  },
);

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
