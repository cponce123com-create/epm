import { Router, type Request, type Response } from "express";
import { db, externalHeadlinesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Fetch the link URL and try to extract an og:image, twitter:image,
 * or first <img> inside <article>.
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

    // 1. <meta property="og:image" content="...">
    const ogImg = $('meta[property="og:image"]').attr("content");
    if (ogImg) return ogImg;

    // 2. <meta name="twitter:image" content="...">
    const twImg = $('meta[name="twitter:image"]').attr("content");
    if (twImg) return twImg;

    // 3. First <img> inside <article>
    const articleImg = $("article img").first().attr("src");
    if (articleImg) {
      try {
        return new URL(articleImg, link).href;
      } catch {
        return articleImg;
      }
    }

    return null;
  } catch (err) {
    logger.warn({ err, link }, "[EPM Import] Failed to fetch image from link");
    return null;
  }
}

router.post(
  "/external-headlines/import",
  async (req: Request, res: Response) => {
    try {
      // ── Autenticación ──
      const apiKey = req.headers["x-api-key"] as string;
      const expected = process.env.BOTNOTICIAS_API_KEY;
      if (!expected || !apiKey || apiKey.length !== expected.length) {
        return res.status(401).json({ error: "API key inválida" });
      }
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(apiKey))) {
        return res.status(401).json({ error: "API key inválida" });
      }

      const { headlines } = req.body as { headlines: any[] };
      if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
        return res
          .status(400)
          .json({ error: "Se requiere un array 'headlines'" });
      }

      let sent = 0;
      let skipped = 0;
      let errors = 0;

      for (const hl of headlines) {
        if (!hl.title || !hl.link || !hl.source) {
          skipped++;
          continue;
        }

        // ── Req 3: Debug log ──────────────────────────────────────────
        logger.info(
          {
            title: hl.title,
            image_url: hl.image_url ?? "",
            content_len: (hl.content ?? "").length,
          },
          `[EPM Import] title=${hl.title} image_url=${hl.image_url ?? ""} content_len=${(hl.content ?? "").length}`,
        );

        // ── Req 1: Image fallback ──────────────────────────────────────
        let resolvedImageUrl = (hl.image_url ?? "").trim();
        if (!resolvedImageUrl) {
          const fetched = await fetchImageFromLink(hl.link);
          if (fetched) resolvedImageUrl = fetched;
        }

        // ── Req 2: Content fallback ────────────────────────────────────
        let resolvedContent = (hl.content ?? "").trim();
        if (resolvedContent.length < 100) {
          resolvedContent = (hl.summary ?? "").trim() || resolvedContent;
        }

        // Dedup por source + link
        const existing = await db
          .select({ id: externalHeadlinesTable.id })
          .from(externalHeadlinesTable)
          .where(
            and(
              eq(externalHeadlinesTable.source, hl.source),
              eq(externalHeadlinesTable.link, hl.link),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        try {
          await db.insert(externalHeadlinesTable).values({
            title: hl.title.slice(0, 1000),
            link: hl.link,
            source: hl.source.slice(0, 255),
            summary: hl.summary?.slice(0, 2000) ?? null,
            content: resolvedContent.slice(0, 50000) || null,
            imageUrl: resolvedImageUrl.slice(0, 1024) || null,
            slug: hl.slug?.slice(0, 200) ?? null,
            pubDate: new Date(hl.pub_date),
          });
          sent++;
        } catch (err) {
          errors++;
          logger.error("EPM import error: %s", (err as Error).message);
        }
      }

      logger.info(
        "EPM import: %d sent, %d skipped, %d errors",
        sent,
        skipped,
        errors,
      );
      res.json({ sent, skipped, errors });
    } catch (err) {
      logger.error("EPM import batch error: %s", (err as Error).message);
      res.status(500).json({ error: "Error interno al importar" });
    }
  },
);

router.get("/external-headlines/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const [headline] = await db
      .select()
      .from(externalHeadlinesTable)
      .where(eq(externalHeadlinesTable.slug, slug))
      .limit(1);

    if (!headline) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }
    res.json(headline);
  } catch (err) {
    logger.error(
      "Error fetching external headline: %s",
      (err as Error).message,
    );
    res.status(500).json({ error: "Error interno al obtener noticia" });
  }
});

export default router;
