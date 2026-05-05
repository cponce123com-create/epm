import { Router } from "express";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import { logger } from "../lib/logger";
import { XMLParser } from "fast-xml-parser";

const router = Router();

// ── Tipos ───────────────────────────────────────────────────────────────────
interface ScrapedItem {
  title: string;
  summary: string;
  content: string;
  coverImageUrl: string | null;
  coverVideoUrl: string | null;
  sourceUrl: string;
  publishedAt: string;
}

interface RssItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  enclosure?: { "@_url"?: string; "@_type"?: string };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+=["'][^"']*["']/gi, "")
    .trim();
}

/**
 * Extrae la primera imagen del HTML. Soporta:
 * - src con comillas dobles o simples
 * - URLs protocol-relative (//cdn...)
 * - atributos data-src (lazy loading común en Telegram)
 * - srcset (toma la primera entrada)
 */
function extractFirstImage(description: string): string | null {
  // Intentar <img src="..."> o <img src='...'>
  let match = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) {
    const src = match[1];
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http")) return src;
    return src;
  }

  // Intentar data-src (lazy loading)
  match = description.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (match?.[1]) {
    const src = match[1];
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http")) return src;
    return src;
  }

  // Intentar srcset (tomar la primera URL)
  match = description.match(/<img[^>]+srcset=["']([^"']+)["']/i);
  if (match?.[1]) {
    const first = match[1].split(/[\s,]+/)[0];
    if (first) {
      if (first.startsWith("//")) return `https:${first}`;
      if (first.startsWith("http")) return first;
    }
  }

  return null;
}

/**
 * Extrae la URL del primer video del HTML. Soporta:
 * - <video><source src="..."></video>
 * - <video src="...">
 * - Enlaces de Telegram a videos
 */
function extractFirstVideo(description: string): string | null {
  // <video src="...">
  let match = description.match(/<video[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) {
    const src = match[1];
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http")) return src;
  }

  // <video><source src="...">
  match = description.match(/<source[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) {
    const src = match[1];
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http")) return src;
  }

  // Enlaces de Telegram a videos (t.me/*?video)
  match = description.match(/https?:\/\/t\.me\/[^\s"']+\?video/i);
  if (match?.[0]) return match[0];

  // Enlaces directos a mp4/mov/webm
  match = description.match(/https?:\/\/[^\s"']+\.(mp4|mov|webm)(\?[^\s"']*)?/i);
  if (match?.[0]) return match[0];

  return null;
}

async function fetchRss(channelUsername: string): Promise<RssItem[]> {
  const urls = [
    `https://rsshub.app/telegram/channel/${channelUsername}`,
    `https://tg.i-c-a.su/rss/${channelUsername}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EPM-Bot/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const xml = await res.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
      });
      const parsed = parser.parse(xml);

      const items =
        parsed?.rss?.channel?.item ??
        parsed?.feed?.entry ??
        [];

      const arr = Array.isArray(items) ? items : [items];
      if (arr.length > 0) return arr;
    } catch {
      // Intentar siguiente URL
    }
  }

  return [];
}

// ── POST /admin/nacional/scrape ─────────────────────────────────────────────
router.post("/admin/nacional/scrape", requireAuth, async (req, res): Promise<void> => {
  const { channelUsername } = req.body as { channelUsername?: string };

  if (!channelUsername || typeof channelUsername !== "string" || channelUsername.includes("@")) {
    res.status(400).json({ error: "Debes indicar un username de canal válido (sin @)" });
    return;
  }

  try {
    const items = await fetchRss(channelUsername);

    if (items.length === 0) {
      res.status(404).json({ error: "No se encontraron noticias en ese canal o el feed RSS no está disponible." });
      return;
    }

    // ── Extraer hasta 30 posts ──────────────────────────────────────────
    const scraped: ScrapedItem[] = items.slice(0, 30).map((item: RssItem) => {
      const rawDescription = item.description ?? "";
      const content = cleanContent(rawDescription);
      const plainText = stripHtml(rawDescription);

      const title =
        item.title?.trim() ||
        plainText.slice(0, 80) + (plainText.length > 80 ? "…" : "") ||
        "Sin título";

      const summary = plainText.slice(0, 250) + (plainText.length > 250 ? "…" : "");

      const coverImageUrl =
        extractFirstImage(rawDescription) ??
        (item.enclosure?.["@_type"]?.startsWith("image") ? item.enclosure?.["@_url"] ?? null : null) ??
        null;

      const coverVideoUrl =
        extractFirstVideo(rawDescription) ??
        (item.enclosure?.["@_type"]?.startsWith("video") ? item.enclosure?.["@_url"] ?? null : null) ??
        null;

      let publishedAt = "";
      if (item.pubDate) {
        const d = new Date(item.pubDate);
        if (!isNaN(d.getTime())) publishedAt = d.toISOString();
      }
      if (!publishedAt) publishedAt = new Date().toISOString();

      return {
        title,
        summary,
        content,
        coverImageUrl,
        coverVideoUrl,
        sourceUrl: item.link ?? `https://t.me/s/${channelUsername}`,
        publishedAt,
      };
    });

    res.json({ items: scraped });
  } catch (err) {
    logger.error({ err, channelUsername }, "Scrape RSS failed");
    res.status(502).json({ error: "Error al obtener el feed RSS del canal." });
  }
});

// ── POST /admin/nacional/import ─────────────────────────────────────────────
router.post("/admin/nacional/import", requireAuth, async (req, res): Promise<void> => {
  const { item, channelUsername } = req.body as {
    item?: ScrapedItem;
    channelUsername?: string;
  };

  if (!item || !item.title) {
    res.status(400).json({ error: "Debes enviar un item con al menos un título." });
    return;
  }

  const user = (req as any).user;
  const slug = makeSlug(item.title);

  // ── Si hay video, embeberlo al inicio del contenido ───────────────────
  let finalContent = item.content || item.summary || "";
  if (item.coverVideoUrl) {
    const videoHtml = `<video controls style="width:100%;max-height:500px;margin-bottom:1.5rem" preload="metadata">
  <source src="${item.coverVideoUrl}" type="video/mp4" />
  Tu navegador no soporta video HTML5.
</video>`;
    finalContent = videoHtml + "\n" + finalContent;
  }

  const readingTime = calcReadingTime(finalContent);

  const [nacionalCat] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, "nacional"));

  if (!nacionalCat) {
    res.status(400).json({ error: "No existe la categoría 'nacional'. Créala primero desde Categorías." });
    return;
  }

  const [article] = await db
    .insert(articlesTable)
    .values({
      title: item.title,
      slug,
      summary: item.summary || "",
      content: finalContent,
      categoryId: nacionalCat.id,
      authorId: user.userId,
      coverImageUrl: item.coverImageUrl ?? undefined,
      status: "draft",
      featured: false,
      readingTime,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
    })
    .returning({ id: articlesTable.id, slug: articlesTable.slug });

  logger.info({ articleId: article.id, channelUsername }, "Artículo importado desde scraper");

  res.status(201).json({ article: { id: article.id, slug: article.slug } });
});

export default router;
