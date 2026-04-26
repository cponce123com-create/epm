import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
const corsOptions: cors.CorsOptions = {
  origin: true,
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

// Preflight OPTIONS
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }
  next();
});

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Rutas de API ──────────────────────────────────────────────────────────────
app.use("/api", router);

// ── SSR Open Graph ────────────────────────────────────────────────────────────
// Los bots de Facebook/WhatsApp/Twitter no ejecutan JS.
// Este endpoint devuelve HTML con meta tags OG ya inyectados + meta-refresh
// al frontend real para navegadores normales.
//
// PASO EXTRA en render.yaml: añadir esta regla ANTES del rewrite /* → /index.html:
//   - type: rewrite
//     source: /articulo/*
//     destination: https://epm-api.onrender.com/articulo/*

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
    ogImage:         map["og_image"]        ?? "",
    siteName:        map["site_name"]       ?? "El Príncipe Mestizo",
    siteDescription: map["site_description"] ?? "Periodismo ciudadano desde San Ramón, Chanchamayo (Perú)",
    siteUrl:         map["site_url"]        ?? "",
  };
}

function escHtml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

app.get("/articulo/:slug", async (req: Request, res: Response): Promise<void> => {
  const slug = req.params["slug"] ?? "";
  const FALLBACK_URL = process.env["FRONTEND_URL"] ?? "https://elprincipemestizo.eu.cc";

  try {
    const [article] = await db
      .select({
        title:         articlesTable.title,
        slug:          articlesTable.slug,
        summary:       articlesTable.summary,
        coverImageUrl: articlesTable.coverImageUrl,
        status:        articlesTable.status,
      })
      .from(articlesTable)
      .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "published")));

    const settings    = await getOgSettings();
    const frontendUrl = settings.siteUrl || FALLBACK_URL;
    const canonicalUrl = `${frontendUrl}/articulo/${slug}`;

    if (!article) {
      res.redirect(302, canonicalUrl);
      return;
    }

    const title       = escHtml(article.title ?? settings.siteName);
    const description = escHtml(article.summary ?? settings.siteDescription);
    // Garantizar URL absoluta para og:image — requerido por WhatsApp/Facebook
    const rawImage    = article.coverImageUrl ?? settings.ogImage ?? "";
    const image       = escHtml(
      rawImage.startsWith("http")
        ? rawImage
        : rawImage
          ? `${frontendUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
          : `${frontendUrl}/opengraph.jpg`
    );
    const siteName    = escHtml(settings.siteName);

    const imageMetaTags = image
      ? `<meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${title}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${image}" />`
      : `<meta name="twitter:card" content="summary" />`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title} — ${siteName}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="${siteName}" />
  ${imageMetaTags}
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
</head>
<body>
  <p>Redirigiendo a <a href="${canonicalUrl}">${title}</a>...</p>
</body>
</html>`);
  } catch (err) {
    logger.error({ err, slug }, "SSR OG middleware error");
    res.redirect(302, `${FALLBACK_URL}/articulo/${slug}`);
  }
});

// ── 404 para rutas no encontradas ─────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ── Manejador global de errores ───────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
