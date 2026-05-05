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
  // <video src="..."> — prioridad máxima, es el video directo
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

  // CDN de Telegram: cdn*.cdn-telegram.org o cdn4.telegram-cdn.org
  match = description.match(/https?:\/\/[^\s"']*cdn[^\s"']*telegram[^\s"']*\.(mp4|mov|webm)(\?[^\s"']*)?/i);
  if (match?.[0]) return match[0];

  // Enlaces directos a mp4/mov/webm (que NO sean de t.me — esos son páginas, no archivos)
  match = description.match(/https?:\/\/(?!t\.me\/)[^\s"']+\.(mp4|mov|webm)(\?[^\s"']*)?/i);
  if (match?.[0]) return match[0];

  return null;
}

/**
 * Parsea la vista web pública de Telegram (t.me/s/username).
 * Extrae mensajes del HTML usando regex sobre los bloques de mensaje.
 * Esto es un fallback porque Telegram no tiene API pública.
 */
function parseTgWebView(html: string, channelUsername: string): RssItem[] {
  const items: RssItem[] = [];

  // Cada mensaje en t.me/s/ está dentro de un div con clase "tgme_widget_message_wrap"
  // Buscamos bloques de mensaje como texto + posibles imágenes/videos
  const msgBlockRegex = /<div class="tgme_widget_message_wrap[^"]*"[\s\S]*?<div class="tgme_widget_message_footer/g;
  const blocks = html.match(msgBlockRegex);
  if (!blocks) return items;

  for (const block of blocks.slice(0, 30)) {
    // Extraer texto del mensaje
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const description = textMatch?.[1] ?? "";

    if (!description || description.length < 10) continue;

    // Extraer fecha
    const timeMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
    const pubDate = timeMatch?.[1] ?? undefined;

    // Extraer imágenes del mensaje
    const imgMatch = block.match(/<a class="tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)/);
    const imgSrc = imgMatch?.[1] ?? null;

    // Extraer link al mensaje individual
    const linkMatch = block.match(/<a class="tgme_widget_message_date"[^>]+href="([^"]+)"/);
    const link = linkMatch?.[1]
      ? `https://t.me${linkMatch[1]}`
      : `https://t.me/s/${channelUsername}`;

    // Título: primeras 80 chars del texto limpio
    const plainText = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const title = plainText.slice(0, 80) + (plainText.length > 80 ? "…" : "");

    items.push({
      title,
      description,
      link,
      pubDate,
    });
  }

  return items;
}

function parseRssXml(xml: string): RssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  const parsed = parser.parse(xml);

  // Intentar formato RSS 2.0
  let items = parsed?.rss?.channel?.item;
  if (items) {
    return Array.isArray(items) ? items : [items];
  }

  // Intentar formato Atom
  items = parsed?.feed?.entry;
  if (items) {
    return Array.isArray(items) ? items : [items];
  }

  return [];
}

async function fetchRss(channelUsername: string): Promise<RssItem[]> {
  const allItems: RssItem[] = [];
  const seenLinks = new Set<string>();

  const sources = [
    // rsshub.app — soporta ?limit=N
    {
      url: `https://rsshub.app/telegram/channel/${channelUsername}?limit=30`,
      label: "rsshub",
    },
    // tg.i-c-a.su — mirror alternativo
    {
      url: `https://tg.i-c-a.su/rss/${channelUsername}`,
      label: "tg.i-c-a.su",
    },
    // Fallback: scraping directo de t.me/s/
    {
      url: `https://t.me/s/${channelUsername}`,
      label: "t.me/s",
    },
  ];

  for (const src of sources) {
    if (allItems.length >= 30) break;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(src.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EPM-Bot/1.0)",
          Accept: "text/html,application/rss+xml,application/xml,text/xml,*/*",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const body = await res.text();
      let items: RssItem[] = [];

      if (src.label === "t.me/s") {
        // HTML scraping de t.me/s/
        items = parseTgWebView(body, channelUsername);
      } else {
        items = parseRssXml(body);
      }

      // Deducplicar por link
      for (const item of items) {
        const link = item.link ?? "";
        if (!link || seenLinks.has(link)) continue;
        seenLinks.add(link);
        allItems.push(item);
        if (allItems.length >= 30) break;
      }
    } catch {
      // Intentar siguiente fuente
    }
  }

  return allItems;
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
    const videoUrl = item.coverVideoUrl;
    const posterUrl = item.coverImageUrl ?? "";
    const posterAttr = posterUrl ? ` poster="${posterUrl}"` : "";

    // Detectar tipo MIME por extensión para el <source>
    const isMov = videoUrl.includes(".mov");
    const isWebm = videoUrl.includes(".webm");
    const isMp4 = videoUrl.includes(".mp4") || (!isMov && !isWebm);
    const mime = isMov ? "video/quicktime" : isWebm ? "video/webm" : "video/mp4";

    const videoHtml = `<div style="margin-bottom:1.5rem" class="article-video-wrapper">
  <video controls style="width:100%;max-height:500px;background:#000;border-radius:4px" preload="metadata" playsinline${posterAttr}>
    <source src="${videoUrl}" type="${mime}" />
    <p style="padding:16px;color:#999;font-family:sans-serif;font-size:14px;text-align:center">
      El video no se pudo cargar directamente.<br/>
      <a href="${videoUrl}" target="_blank" rel="noopener" style="color:#7A1F1F">▶ Ver video en Telegram →</a>
    </p>
  </video>
</div>`;
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
