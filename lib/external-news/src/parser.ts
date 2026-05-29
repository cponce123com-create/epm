 
/**
 * Servicio de parseo de feeds RSS.
 * Lee fuentes desde rss-sources.json y parsea usando rss-parser.
 * Nunca almacena el cuerpo completo del artículo.
 */
import Parser from "rss-parser";
import type { RssSource, ExternalHeadline } from "./types.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent": "EPM-NewsAggregator/1.0 (ethical news aggregator; https://epm.news)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: {
    item: [["description", "description"]],
  },
});

/**
 * Carga la lista de fuentes RSS desde el archivo JSON.
 */
export function loadSources(): RssSource[] {
  const sourcesPath = resolve(__dirname, "./rss-sources.json");
  const raw = readFileSync(sourcesPath, "utf-8");
  return JSON.parse(raw) as RssSource[];
}

/**
 * Parsea un feed RSS de una fuente y extrae solo metadatos.
 * Retorna un array de headlines sin el cuerpo completo del artículo.
 */
export async function parseSource(source: RssSource): Promise<ExternalHeadline[]> {
  try {
    const feed = await parser.parseURL(source.url);

    if (!feed.items || feed.items.length === 0) {
      console.warn(`[RSS Parser] No items found in feed: ${source.name}`);
      return [];
    }

    const headlines: ExternalHeadline[] = [];

    for (const item of feed.items) {
      const title = item.title?.trim();
      if (!title) continue;

      const link = item.link?.trim();
      if (!link) continue;

      // Extract summary safely — max 300 chars, never full content
      let summary: string | null = null;
      if (item.contentSnippet) {
        summary = item.contentSnippet
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300);
      } else if (item.description) {
        summary = item.description
          .replace(/<[^>]*>/g, "") // strip HTML tags
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300);
      }

      // Only keep summary if it's meaningful
      if (summary && summary.length < 20) {
        summary = null;
      }

      const pubDate = item.pubDate
        ? new Date(item.pubDate)
        : item.isoDate
          ? new Date(item.isoDate)
          : new Date();

      // Validate date
      if (Number.isNaN(pubDate.getTime())) {
        console.warn(`[RSS Parser] Invalid date for "${title}" from ${source.name}, using current date`);
        continue;
      }

      headlines.push({
        title,
        link,
        source: source.name,
        sourceBias: source.bias ?? null,
        summary: summary ?? null,
        pubDate,
      });
    }

    return headlines;
  } catch (err) {
    console.error(`[RSS Parser] Error parsing ${source.name} (${source.url}):`, (err as Error).message);
    return [];
  }
}

/**
 * Parsea todas las fuentes RSS configuradas.
 * Retorna un array plano de todos los headlines encontrados.
 */
export async function parseAllSources(): Promise<ExternalHeadline[]> {
  const sources = loadSources();
  console.log(`[RSS Parser] Fetching ${sources.length} RSS sources...`);

  const results = await Promise.allSettled(
    sources.map((source) => parseSource(source)),
  );

  const allHeadlines: ExternalHeadline[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allHeadlines.push(...result.value);
    }
  }

  // Deduplicate by (source, link)
  const seen = new Set<string>();
  const unique: ExternalHeadline[] = [];

  for (const h of allHeadlines) {
    const key = `${h.source}::${h.link}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(h);
    }
  }

  // Sort by pubDate descending
  unique.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  console.log(`[RSS Parser] Fetched ${allHeadlines.length} headlines (${unique.length} unique) from ${sources.length} sources`);
  return unique;
}
