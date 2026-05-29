import { Router } from "express";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import { sanitizeHtml } from "../lib/sanitize";
import { safeError } from "../lib/safeError";
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
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+=["'][^"']*["']/gi, "")
    .trim();
}

/** Normaliza una URL de imagen/video encontrada en cualquier formato */
function normalizeUrl(raw: string): string {
  if (!raw) return "";
  let url = raw.trim();
  // Protocolo relativo → https
  if (url.startsWith("//")) return `https:${url}`;
  // Quitar barras y espacios del final
  url = url.replace(/[\\'"]+$/g, "").trim();
  if (url.startsWith("http")) return url;
  return url;
}

/** Determina el tipo MIME por extensión */
function guessMime(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".mov")) return "video/quicktime";
  if (lower.includes(".webm")) return "video/webm";
  if (lower.includes(".mp4")) return "video/mp4";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

/**
 * Extrae TODAS las imágenes detectables en un string HTML.
 * Busca: <img src>, <img data-src>, background-image:url(...), srcset, y enlaces directos a imágenes.
 */
function extractAllImages(description: string): string[] {
  const found = new Set<string>();

  // 1) <img src="..."> y <img src='...'>
  for (const m of description.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const url = normalizeUrl(m[1]);
    if (url) found.add(url);
  }

  // 2) <img data-src="...">
  for (const m of description.matchAll(
    /<img[^>]+data-src=["']([^"']+)["']/gi,
  )) {
    const url = normalizeUrl(m[1]);
    if (url) found.add(url);
  }

  // 3) srcset — tomar todas las URLs
  const srcsetMatch = description.match(/<img[^>]+srcset=["']([^"']+)["']/i);
  if (srcsetMatch?.[1]) {
    for (const part of srcsetMatch[1].split(/,/)) {
      const url = normalizeUrl(part.trim().split(/\s+/)[0]);
      if (url) found.add(url);
    }
  }

  // 4) CSS background-image:url('...') o url("...") — t.me/s/ usa esto
  for (const m of description.matchAll(
    /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
  )) {
    const url = normalizeUrl(m[1]);
    if (url) found.add(url);
  }

  // 5) Enlaces directos a archivos de imagen (comunes en RSS de Telegram)
  for (const m of description.matchAll(
    /https?:\/\/[^\s"'<>]+\.(jpe?g|png|gif|webp)(\?[^\s"'<>]*)?/gi,
  )) {
    found.add(m[0]);
  }

  return Array.from(found);
}

/**
 * Extrae TODAS las URLs de video detectables.
 * Busca: <video src>, <source src>, enlaces a mp4/mov/webm, y CDN de Telegram.
 */
function extractAllVideos(description: string): string[] {
  const found = new Set<string>();

  // 1) <video src="...">
  for (const m of description.matchAll(/<video[^>]+src=["']([^"']+)["']/gi)) {
    const url = normalizeUrl(m[1]);
    if (url) found.add(url);
  }

  // 2) <source src="...">
  for (const m of description.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)) {
    const url = normalizeUrl(m[1]);
    if (url) found.add(url);
  }

  // 3) CDN de Telegram con extensiones de video
  for (const m of description.matchAll(
    /https?:\/\/[^\s"'<>]+?cdn[^\s"'<>]*?telegram[^\s"'<>]*?\.(mp4|mov|webm)(\?[^\s"'<>]*)?/gi,
  )) {
    found.add(m[0]);
  }

  // 4) Cualquier enlace directo a archivo de video (no t.me)
  for (const m of description.matchAll(
    /https?:\/\/(?!t\.me\/)[^\s"'<>]+\.(mp4|mov|webm)(\?[^\s"'<>]*)?/gi,
  )) {
    found.add(m[0]);
  }

  return Array.from(found);
}

/** Devuelve la primera imagen (para portada) */
function extractFirstImage(description: string): string | null {
  return extractAllImages(description)[0] ?? null;
}

/** Devuelve el primer video */
function extractFirstVideo(description: string): string | null {
  return extractAllVideos(description)[0] ?? null;
}

// ── Scraper de t.me/s/ ──────────────────────────────────────────────────────
/**
 * Parsea la vista web pública de Telegram (t.me/s/username).
 * Extrae texto, imágenes (background-image), videos, y fecha de cada mensaje.
 * Construye un HTML rico para el contenido del artículo.
 */
function parseTgWebView(html: string, channelUsername: string): RssItem[] {
  const items: RssItem[] = [];

  // Bloques de mensaje: <div class="tgme_widget_message_wrap ...">  ... footer
  const msgBlockRegex =
    /<div class="tgme_widget_message_wrap[^"]*"[\s\S]*?<div class="tgme_widget_message_footer/g;
  const blocks = html.match(msgBlockRegex);
  if (!blocks) return items;

  for (const block of blocks.slice(0, 30)) {
    // ── Texto ─────────────────────────────────────────────────────────
    const textMatch = block.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    );
    const rawText = textMatch?.[1] ?? "";
    // Limpiar HTML interno pero conservar enlaces y saltos de línea
    const cleanText = rawText
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    // ── Fecha ─────────────────────────────────────────────────────────
    const timeMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
    const pubDate = timeMatch?.[1] ?? undefined;

    // ── Link al mensaje ───────────────────────────────────────────────
    const linkMatch = block.match(
      /<a class="tgme_widget_message_date"[^>]+href="([^"]+)"/,
    );
    const link = linkMatch?.[1]
      ? `https://t.me${linkMatch[1]}`
      : `https://t.me/s/${channelUsername}`;

    // ── Imágenes (background-image en photo_wrap) ─────────────────────
    const imgUrls: string[] = [];
    for (const imgMatch of block.matchAll(
      /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
    )) {
      const url = normalizeUrl(imgMatch[1]);
      if (url) imgUrls.push(url);
    }

    // ── Videos (enlaces a t.me/*?video o tags <video>) ────────────────
    const videoUrls: string[] = [];
    // Buscar <video src="..."> en el bloque
    for (const vMatch of block.matchAll(/<video[^>]+src=["']([^"']+)["']/gi)) {
      const url = normalizeUrl(vMatch[1]);
      if (url) videoUrls.push(url);
    }
    // Buscar enlaces t.me/*?video (son páginas, los convertimos a enlaces)
    for (const vLink of block.matchAll(
      /https?:\/\/t\.me\/[^\s"'<>]+\?video/gi,
    )) {
      videoUrls.push(vLink[0]);
    }
    // Buscar CDN de Telegram con videos
    for (const cdnMatch of block.matchAll(
      /https?:\/\/[^\s"'<>]+?cdn[^\s"'<>]*telegram[^\s"'<>]*\.(mp4|mov|webm)(\?[^\s"'<>]*)?/gi,
    )) {
      videoUrls.push(cdnMatch[0]);
    }

    // ── Construir HTML rico ────────────────────────────────────────────
    const htmlParts: string[] = [];

    // Video primero (lo más destacado)
    for (const vUrl of videoUrls) {
      const mime = guessMime(vUrl);
      // Si es una página t.me/*?video, mostrar enlace (no es archivo directo)
      if (vUrl.includes("t.me/") && vUrl.includes("?video")) {
        htmlParts.push(
          `<p style="text-align:center;padding:12px;background:#f5f5f5;border-radius:4px;margin-bottom:1rem">` +
            `<a href="${vUrl}" target="_blank" rel="noopener" style="color:#7A1F1F;font-weight:600">▶ Ver video en Telegram →</a></p>`,
        );
      } else {
        htmlParts.push(
          `<div style="margin-bottom:1rem"><video controls style="width:100%;max-height:500px;background:#000;border-radius:4px" preload="metadata" playsinline>` +
            `<source src="${vUrl}" type="${mime}" /></video></div>`,
        );
      }
    }

    // Imágenes
    for (const imgUrl of imgUrls) {
      htmlParts.push(
        `<img src="${imgUrl}" alt="" loading="lazy" style="width:100%;max-width:600px;display:block;margin-bottom:1rem;border-radius:4px" />`,
      );
    }

    // Texto del mensaje (convertir saltos de línea a <p>)
    const paragraphs = cleanText.split(/\n+/).filter(Boolean);
    for (const p of paragraphs) {
      htmlParts.push(`<p>${p}</p>`);
    }

    // Saltar mensajes completamente vacíos (sin texto, sin imágenes, sin videos)
    if (htmlParts.length === 0) continue;

    const description = htmlParts.join("\n");

    // Título: texto del mensaje, o descripción del tipo de media
    let title = cleanText.slice(0, 80) + (cleanText.length > 80 ? "…" : "");
    if (!title.trim()) {
      if (videoUrls.length > 0) title = "🎬 Video";
      else if (imgUrls.length > 0) title = "📷 Imagen";
      else title = "Sin título";
    }

    items.push({
      title,
      description,
      link,
      pubDate,
    });
  }

  return items;
}

// ── Parseo de RSS/Atom ──────────────────────────────────────────────────────
function parseRssXml(xml: string): RssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  const parsed = parser.parse(xml);

  let items = parsed?.rss?.channel?.item;
  if (items) return Array.isArray(items) ? items : [items];

  items = parsed?.feed?.entry;
  if (items) return Array.isArray(items) ? items : [items];

  return [];
}

// ── Fetch multicanal con acumulación ────────────────────────────────────────
async function fetchRss(channelUsername: string): Promise<RssItem[]> {
  const allItems: RssItem[] = [];
  const seenLinks = new Set<string>();

  const sources = [
    // rsshub.app — instancia principal, hasta 50 posts
    {
      url: `https://rsshub.app/telegram/channel/${channelUsername}?limit=50`,
      label: "rsshub",
    },
    // rsshub.pseudoyu.com — mirror
    {
      url: `https://rsshub.pseudoyu.com/telegram/channel/${channelUsername}?limit=50`,
      label: "rsshub2",
    },
    // tg.i-c-a.su — mirror alternativo
    { url: `https://tg.i-c-a.su/rss/${channelUsername}`, label: "tg.i-c-a.su" },
    // Fallback: scraping directo de t.me/s/ (solo ~3 mensajes visibles sin JS)
    { url: `https://t.me/s/${channelUsername}`, label: "t.me/s" },
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
      const items =
        src.label === "t.me/s"
          ? parseTgWebView(body, channelUsername)
          : parseRssXml(body);

      for (const item of items) {
        const link = item.link ?? "";
        if (!link || seenLinks.has(link)) continue;
        seenLinks.add(link);
        allItems.push(item);
        if (allItems.length >= 30) break;
      }
    } catch {
      // siguiente fuente
    }
  }

  return allItems;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /admin/nacional/scrape
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  "/admin/nacional/scrape",
  requireAuth, requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    const { channelUsername } = req.body as { channelUsername?: string };

    if (
      !channelUsername ||
      typeof channelUsername !== "string" ||
      channelUsername.includes("@")
    ) {
      res
        .status(400)
        .json({ error: "Debes indicar un username de canal válido (sin @)" });
      return;
    }

    try {
      const items = await fetchRss(channelUsername);

      if (items.length === 0) {
        res
          .status(404)
          .json({
            error:
              "No se encontraron noticias en ese canal o el feed RSS no está disponible.",
          });
        return;
      }

      const scraped: ScrapedItem[] = items.slice(0, 30).map((item: RssItem) => {
        const rawDescription = item.description ?? "";
        const content = cleanContent(rawDescription);
        const plainText = stripHtml(rawDescription);

        const title =
          item.title?.trim() ||
          plainText.slice(0, 80) + (plainText.length > 80 ? "…" : "") ||
          "Sin título";

        const summary =
          plainText.slice(0, 250) + (plainText.length > 250 ? "…" : "");

        // Extraer imagen de portada: buscar en description, enclosure (RSS), y links (Atom)
        let coverImageUrl: string | null =
          extractFirstImage(rawDescription) ?? null;

        // RSS enclosure: <enclosure url="..." type="image/...">
        if (
          !coverImageUrl &&
          item.enclosure?.["@_type"]?.startsWith?.("image")
        ) {
          coverImageUrl = item.enclosure?.["@_url"] ?? null;
        }

        // Atom link enclosure: <link rel="enclosure" type="image/..." href="...">
        if (!coverImageUrl && Array.isArray((item as any).link)) {
          for (const link of (item as any).link) {
            if (
              link?.["@_rel"] === "enclosure" &&
              String(link?.["@_type"] ?? "").startsWith("image")
            ) {
              coverImageUrl = link?.["@_href"] ?? link?.["@_url"] ?? null;
              if (coverImageUrl) break;
            }
          }
        }

        // Extraer video: buscar en description, enclosure (RSS), y links (Atom)
        let coverVideoUrl: string | null =
          extractFirstVideo(rawDescription) ?? null;

        // RSS enclosure: <enclosure url="..." type="video/...">
        if (
          !coverVideoUrl &&
          item.enclosure?.["@_type"]?.startsWith?.("video")
        ) {
          coverVideoUrl = item.enclosure?.["@_url"] ?? null;
        }

        // Atom link enclosure: <link rel="enclosure" type="video/..." href="...">
        if (!coverVideoUrl && Array.isArray((item as any).link)) {
          for (const link of (item as any).link) {
            if (
              link?.["@_rel"] === "enclosure" &&
              String(link?.["@_type"] ?? "").startsWith("video")
            ) {
              coverVideoUrl = link?.["@_href"] ?? link?.["@_url"] ?? null;
              if (coverVideoUrl) break;
            }
          }
        }

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
      res.status(502).json({ error: safeError(err) });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// POST /admin/nacional/import
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  "/admin/nacional/import",
  requireAuth, requireRole("admin", "superadmin"),
  async (req, res): Promise<void> => {
    const { item, channelUsername } = req.body as {
      item?: ScrapedItem;
      channelUsername?: string;
    };

    if (!item || !item.title) {
      res
        .status(400)
        .json({ error: "Debes enviar un item con al menos un título." });
      return;
    }

    const user = (req as any).user;
    const slug = makeSlug(item.title);

    // ── Contenido final: video embebido + imágenes + texto ─────────────┐
    let finalContent = item.content || item.summary || "";

    // Si hay video Y no está ya en el contenido, embeberlo al inicio
    if (item.coverVideoUrl && !finalContent.includes(item.coverVideoUrl)) {
      const posterUrl = item.coverImageUrl ?? "";
      const posterAttr = posterUrl ? ` poster="${posterUrl}"` : "";
      const mime = guessMime(item.coverVideoUrl);
      const videoHtml = `<div style="margin-bottom:1.5rem"><video controls style="width:100%;max-height:500px;background:#000;border-radius:4px" preload="metadata" playsinline${posterAttr}><source src="${item.coverVideoUrl}" type="${mime}" /><p style="padding:16px;color:#999;text-align:center">Video no disponible directamente.<br/><a href="${item.coverVideoUrl}" target="_blank" rel="noopener" style="color:#7A1F1F">▶ Ver video →</a></p></video></div>`;
      finalContent = videoHtml + "\n" + finalContent;
    }

    // Si hay imagen de portada Y no está ya en el contenido, agregarla
    if (item.coverImageUrl && !finalContent.includes(item.coverImageUrl)) {
      const imgHtml = `<img src="${item.coverImageUrl}" alt="" loading="lazy" style="width:100%;max-width:600px;display:block;margin-bottom:1rem;border-radius:4px" />`;
      // Insertar después del video (si hay) o al inicio
      if (finalContent.includes("<video ") || finalContent.includes("<div")) {
        finalContent = finalContent.replace(
          /(<\/video>\s*<\/div>)/,
          `$1\n${imgHtml}`,
        );
      } else {
        finalContent = imgHtml + "\n" + finalContent;
      }
    }

    // Sanitizar HTML antes de guardar (XSS prevention)
    const safeContent = sanitizeHtml(finalContent);
    const safeSummary = sanitizeHtml(item.summary || "");
    const readingTime = calcReadingTime(safeContent);

    // ── Buscar categoría nacional ──────────────────────────────────────┐
    const [nacionalCat] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, "nacional"));

    if (!nacionalCat) {
      res
        .status(400)
        .json({
          error:
            "No existe la categoría 'nacional'. Créala primero desde Categorías.",
        });
      return;
    }

    const [article] = await db
      .insert(articlesTable)
      .values({
        title: item.title,
        slug,
        summary: safeSummary,
        content: safeContent,
        categoryId: nacionalCat.id,
        authorId: user.userId,
        coverImageUrl: item.coverImageUrl ?? undefined,
        status: "draft",
        featured: false,
        readingTime,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
      })
      .returning({ id: articlesTable.id, slug: articlesTable.slug });

    logger.info(
      { articleId: article.id, channelUsername },
      "Artículo importado desde scraper",
    );
    res.status(201).json({ article: { id: article.id, slug: article.slug } });
  },
);

export default router;
