import type { Request, Response, NextFunction } from "express";
import { db, articlesTable, siteSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// ── User-Agent detection for social media crawlers ───────────────────────────

const CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "WhatsApp",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Pinterest",
  "googlebot",
  "bingbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "ia_archiver",
];

function isCrawler(req: Request): boolean {
  const ua = (req.headers["user-agent"] ?? "").toLowerCase();
  return CRAWLER_PATTERNS.some((pattern) => {
    // case-insensitive check
    return ua.indexOf(pattern.toLowerCase()) !== -1;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getSiteSettings(): Promise<{
  ogImage: string;
  siteName: string;
  siteDescription: string;
  siteUrl: string;
}> {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return {
      ogImage: map["og_image"] ?? "",
      siteName: map["site_name"] ?? "El Príncipe Mestizo",
      siteDescription:
        map["site_description"] ??
        "Periodismo ciudadano desde San Ramón, Chanchamayo (Perú)",
      siteUrl: (map["site_url"] ?? "").replace(/\/+$/, ""),
    };
  } catch {
    return {
      ogImage: "",
      siteName: "El Príncipe Mestizo",
      siteDescription:
        "Periodismo ciudadano desde San Ramón, Chanchamayo (Perú)",
      siteUrl: "",
    };
  }
}

// ── SSR HTML render ──────────────────────────────────────────────────────────

async function renderOgHtml(
  slug: string,
  frontendUrl: string,
): Promise<string | null> {
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

    if (!article) return null;

    const settings = await getSiteSettings();
    const baseUrl = (settings.siteUrl || frontendUrl).replace(/\/+$/, "");
    const canonicalUrl = `${baseUrl}/articulo/${slug}`;

    const title = escHtml(article.title ?? settings.siteName);
    const description = escHtml(article.summary ?? settings.siteDescription);
    const siteName = escHtml(settings.siteName);

    // Resolver URL de imagen directa (no proxy para crawlers)
    let image = article.coverImageUrl || settings.ogImage || "";
    const proxyMatch = image.match(/^\/api\/proxy-image\?url=(.+)$/i);
    if (proxyMatch) {
      try {
        image = decodeURIComponent(proxyMatch[1]);
      } catch { /* keep as-is */ }
    }
    if (image && !image.startsWith("http")) {
      image = `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    const safeImage = escHtml(image);

    const imageMetaTags = safeImage
      ? `
  <meta property="og:image"            content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:width"      content="1200" />
  <meta property="og:image:height"     content="630" />
  <meta property="og:image:alt"        content="${title}" />
  <meta name="twitter:card"            content="summary_large_image" />
  <meta name="twitter:image"           content="${safeImage}" />`
      : '<meta name="twitter:card" content="summary" />';

    const articleTimeTags = article.publishedAt
      ? `
  <meta property="article:published_time" content="${new Date(article.publishedAt).toISOString()}" />`
      : "";

    const safeUrl = escHtml(canonicalUrl);

    const html =
    `<!DOCTYPE html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${title} \u2014 ${siteName}</title>\n  <meta name="description" content="${description}" />\n  <meta property="og:type"        content="article" />\n  <meta property="og:title"       content="${title}" />\n  <meta property="og:description" content="${description}" />\n  <meta property="og:url"         content="${safeUrl}" />\n  <meta property="og:site_name"   content="${siteName}" />\n  <meta property="og:locale"      content="es_PE" />` +
    imageMetaTags +
    articleTimeTags +
    `\n  <meta name="twitter:title"       content="${title}" />\n  <meta name="twitter:description" content="${description}" />\n  <link rel="canonical" href="${safeUrl}" />\n</head>\n<body></body>\n</html>`;

    return html;
  } catch (err) {
    logger.error({ err, slug }, "OG render error");
    return null;
  }
}

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Intercepts *only* crawler requests to /articulo/:slug and serves
 * server-rendered Open Graph meta tags.
 *
 * Real users and other routes pass through to the SPA without any overhead.
 */
export async function ogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Only intercept article paths
  const match = req.path.match(/^\/articulo\/([^/?]+)/);
  if (!match) {
    return next();
  }

  const slug = match[1];
  if (!slug) return next();

  // Only serve SSR for crawlers — real users get the SPA
  if (!isCrawler(req)) {
    return next();
  }

  const FALLBACK_URL =
    process.env["FRONTEND_URL"] ?? "https://elprincipemestizo.eu.cc";

  const html = await renderOgHtml(slug, FALLBACK_URL);

  if (!html) {
    // Article not found or error — let SPA handle the 404
    return next();
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache SSR page for 5 minutes — crawlers are infrequent
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  res.send(html);
}
