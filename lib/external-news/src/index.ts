/**
 * External News Module — Entry Point
 *
 * Agregador etico de titulares via RSS.
 * Nunca almacena cuerpos completos de articulos.
 * Implementa resumen extractivo (sin IA de pago).
 */
export { parseAllSources, parseSource, loadSources } from "./parser.js";
export type { RssSource, ExternalHeadline, DailyBriefing, ArticleSummary, TrendWord } from "./types.js";

const NL = String.fromCharCode(10);
const DNL = NL + NL;

/**
 * Genera un resumen extractivo: toma las primeras N oraciones de un texto.
 * Simple pero efectivo para briefing sin IA de pago.
 */
export function extractiveSummary(text: string, sentenceCount = 3): string {
  if (!text) return "";

  // Split by sentence boundaries (., !, ?) followed by space or end
  const sentences = text.match(/[^.!?
]+[.!?]+(\s|$)/g) ?? [];

  if (sentences.length === 0) {
    // Fallback: take first N words if no clear sentences
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    return words.slice(0, 30).join(" ") + (words.length > 30 ? "..." : "");
  }

  return sentences.slice(0, sentenceCount).join(" ").trim();
}

/**
 * Genera el contenido del Daily Briefing a partir de titulares.
 * Formato: lista de titulares con enlaces.
 */
export function generateBriefingText(headlines: Array<{ title: string; link: string; source: string }>): string {
  const lines = headlines.map(
    (h, i) => String(i + 1) + ". " + h.title + " \u2014 " + h.source + NL + "   " + h.link,
  );
  return "📰 Resumen de Noticias" + DNL + lines.join(DNL);
}
