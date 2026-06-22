/**
 * GET /api/external-news — Devuelve los últimos titulares agregados vía RSS.
 * Backfillea imágenes faltantes de forma síncrona (hasta 2 por request)
 * y las sirve a través de nuestro proxy para evitar CSP y hotlinking.
 */
import { Router, type Request, type Response } from "express";
import { db, externalHeadlinesTable } from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";
import * as cheerio from "cheerio";
import { logger } from "../lib/logger";

const router = Router();

/** Envuelve una URL externa en nuestro proxy para evitar CSP y hotlinking. */
function proxyImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  // Si ya es un path relativo, devolverlo tal cual
  if (trimmed.startsWith("/")) return trimmed;
  // Si no es http, no se puede proxear
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))
    return null;
  return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Fetch the link URL and extract og:image, twitter:image, or first <img> inside <article>.
 * Retorna null si no encuentra o falla.
 */
async function fetchImageFromLink(link: string): Promise<string | null> {
  try {
    const resp = await fetch(link, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EPM-Bot/1.0; +https://elprincipemestizo.eu.cc)",
        Accept: "text/html",
      },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const $ = cheerio.load(html);

    // 1. Open Graph
    const ogImg = $('meta[property="og:image"]').attr("content");
    if (ogImg?.startsWith("http")) return ogImg;

    // 2. Twitter
    const twImg = $('meta[name="twitter:image"]').attr("content");
    if (twImg?.startsWith("http")) return twImg;

    // 3. Primer <img> dentro de <article>
    const articleImg = $("article img").first().attr("src");
    if (articleImg) {
      try {
        return new URL(articleImg, link).href;
      } catch {
        return articleImg;
      }
    }

    // 4. Primer <img> en toda la página (último recurso)
    const anyImg = $("img").first().attr("src");
    if (anyImg) {
      try {
        return new URL(anyImg, link).href;
      } catch {
        return anyImg;
      }
    }

    return null;
  } catch (err) {
    logger.warn({ err, link }, "[EPM] fetchImageFromLink failed");
    return null;
  }
}

router.get("/external-news", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query["limit"] as string) || 20),
    );
    const source = req.query["source"] as string | undefined;

    const filters: ReturnType<typeof eq>[] = [];
    if (source) {
      filters.push(eq(externalHeadlinesTable.source, source));
    }
    const where = filters.length > 0 ? and(...filters) : undefined;

    // ── Total count ─────────────────────────────────────────────────
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(externalHeadlinesTable)
      .where(where);
    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    // ── Fetch rows ──────────────────────────────────────────────────
    const rows = await db
      .select()
      .from(externalHeadlinesTable)
      .where(where)
      .orderBy(desc(externalHeadlinesTable.pubDate))
      .limit(limit)
      .offset((page - 1) * limit);

    // ── Mapear a snake_case + backfill síncrono ─────────────────────
    const headlines: Record<string, any>[] = [];
    let backfilled = 0;

    for (const r of rows) {
      const raw: Record<string, any> = r as any;

      // Intentar leer el image_url desde camelCase (Drizzle) o snake_case (raw DB)
      let imgUrl = raw.image_url ?? raw.imageUrl ?? null;

      // Si no tiene imagen y estamos en página 1 (máx 2 backfills por request)
      if (!imgUrl && r.link && page === 1 && backfilled < 2) {
        const fetched = await fetchImageFromLink(r.link);
        if (fetched) {
          imgUrl = fetched.slice(0, 1024);

          // Guardar en DB en background (no bloqueamos)
          db.update(externalHeadlinesTable)
            .set({ imageUrl: imgUrl })
            .where(eq(externalHeadlinesTable.id, r.id))
            .catch(() => {});

          backfilled++;
          logger.info(
            { id: r.id, title: r.title },
            "[EPM] Backfilled image sync",
          );
        }
      }

      headlines.push({
        id: r.id,
        title: r.title,
        link: r.link,
        source: r.source,
        source_bias: raw.source_bias ?? null,
        summary: r.summary,
        content: r.content,
        image_url: proxyImageUrl(imgUrl),
        slug: r.slug,
        pub_date: raw.pub_date ?? raw.pubDate ?? null,
        created_at: raw.created_at ?? raw.createdAt ?? null,
      });
    }

    // ── Sources ─────────────────────────────────────────────────────
    const sources = await db
      .select({ name: externalHeadlinesTable.source })
      .from(externalHeadlinesTable)
      .groupBy(externalHeadlinesTable.source)
      .orderBy(externalHeadlinesTable.source);

    res.json({
      headlines,
      sources: sources.map((s) => s.name),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    logger.error(
      "[External News] Error fetching headlines:",
      (err as Error).message,
    );
    res.status(500).json({ error: "Error al obtener noticias externas" });
  }
});

export default router;
