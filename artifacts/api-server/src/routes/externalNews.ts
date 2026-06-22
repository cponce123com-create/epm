/**
 * GET /api/external-news — Devuelve los últimos titulares agregados vía RSS.
 * Backfillea imágenes faltantes de forma lazy (máx 3 por request) y las guarda en DB.
 */
import { Router, type Request, type Response } from "express";
import { db, externalHeadlinesTable } from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";
import * as cheerio from "cheerio";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Fetch the link URL and extract og:image, twitter:image, or first <img> inside <article>.
 */
async function fetchImageFromLink(link: string): Promise<string | null> {
  try {
    const resp = await fetch(link, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EPM-Bot/1.0; +https://elprincipemestizo.eu.cc)",
        Accept: "text/html",
      },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const $ = cheerio.load(html);

    const ogImg = $('meta[property="og:image"]').attr("content");
    if (ogImg) return ogImg;

    const twImg = $('meta[name="twitter:image"]').attr("content");
    if (twImg) return twImg;

    const articleImg = $("article img").first().attr("src");
    if (articleImg) {
      try {
        return new URL(articleImg, link).href;
      } catch {
        return articleImg;
      }
    }

    return null;
  } catch {
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

    // Build filters
    const filters: ReturnType<typeof eq>[] = [];
    if (source) {
      filters.push(eq(externalHeadlinesTable.source, source));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(externalHeadlinesTable)
      .where(where);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    // Get headlines
    const rows = await db
      .select()
      .from(externalHeadlinesTable)
      .where(where)
      .orderBy(desc(externalHeadlinesTable.pubDate))
      .limit(limit)
      .offset((page - 1) * limit);

    // Normalizar a snake_case para el frontend
    const headlines = rows.map((r) => ({
      id: r.id,
      title: r.title,
      link: r.link,
      source: r.source,
      source_bias: (r as any).source_bias ?? null,
      summary: r.summary,
      content: r.content,
      image_url: (r as any).image_url ?? r.imageUrl ?? null,
      slug: r.slug,
      pub_date: (r as any).pub_date ?? r.pubDate ?? null,
      created_at: (r as any).created_at ?? r.createdAt ?? null,
    }));

    // ── Lazy image backfill: headlines sin imagen ──────────────────────
    // Solo en página 1 y máx 3 headlines por request para no bloquear
    const backfillCandidates =
      page === 1
        ? headlines.filter((h: any) => !h.image_url && h.link).slice(0, 3)
        : [];

    if (backfillCandidates.length > 0) {
      // Disparar en background (no await) — no bloqueamos la respuesta
      Promise.all(
        backfillCandidates.map(async (hl: any) => {
          try {
            const img = await fetchImageFromLink(hl.link);
            if (img) {
              await db
                .update(externalHeadlinesTable)
                .set({ imageUrl: img.slice(0, 1024) })
                .where(eq(externalHeadlinesTable.id, hl.id));
              logger.info(
                { id: hl.id, title: hl.title },
                "[EPM] Backfilled image",
              );
            }
          } catch {
            // silencio
          }
        }),
      ).catch(() => {});
    }

    // Get distinct sources for filter dropdown
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
