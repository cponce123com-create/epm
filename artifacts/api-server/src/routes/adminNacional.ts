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
  sourceUrl: string;
  publishedAt: string;
}

interface RssItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  enclosure?: { "@_url"?: string };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanContent(html: string): string {
  // Elimina scripts, estilos, iframes
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .trim();
}

function extractFirstImage(description: string): string | null {
  const match = description.match(/<img[^>]+src="([^"]+)"/i);
  return match?.[1] ?? null;
}

async function fetchRss(channelUsername: string): Promise<RssItem[]> {
  const urls = [
    `https://rsshub.app/telegram/channel/${channelUsername}`,
    `https://tg.i-c-a.su/rss/${channelUsername}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
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

      // RSS 2.0: rss.channel.item[]
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

    const scraped: ScrapedItem[] = items.slice(0, 10).map((item: RssItem) => {
      const rawDescription = item.description ?? "";
      const content = cleanContent(rawDescription);
      const plainText = stripHtml(rawDescription);

      const title =
        item.title?.trim() ||
        plainText.slice(0, 80) + (plainText.length > 80 ? "…" : "") ||
        "Sin título";

      const summary = plainText.slice(0, 200) + (plainText.length > 200 ? "…" : "");

      const coverImageUrl =
        extractFirstImage(rawDescription) ??
        item.enclosure?.["@_url"] ??
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
  const readingTime = calcReadingTime(item.content || item.summary);

  // Buscar categoría "nacional"
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
      content: item.content || item.summary || "",
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
