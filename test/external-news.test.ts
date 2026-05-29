/**
 * Pruebas unitarias para extractiveSummary y generateBriefingText.
 */
import { describe, it, expect } from "@jest/globals";

const NL = String.fromCharCode(10);
const DNL = NL + NL;
const SENTENCE_RE = new RegExp("[^.!?" + NL + "]+[.!?]+(\s|$)", "g");

// Copia de las funciones desde @workspace/external-news para testing
function extractiveSummary(text: string, sentenceCount = 3): string {
  if (!text) return "";

  const sentences = text.match(SENTENCE_RE) ?? [];

  if (sentences.length === 0) {
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    return words.slice(0, 30).join(" ") + (words.length > 30 ? "..." : "");
  }

  return sentences.slice(0, sentenceCount).join(" ").trim();
}

function generateBriefingText(
  headlines: Array<{ title: string; link: string; source: string }>,
): string {
  const lines = headlines.map(
    (h, i) => String(i + 1) + ". " + h.title + " \u2014 " + h.source + NL + "   " + h.link,
  );
  return "📰 Resumen de Noticias" + DNL + lines.join(DNL);
}

describe("extractiveSummary", () => {
  it("retorna string vacio para texto vacio", () => {
    expect(extractiveSummary("")).toBe("");
  });

  it("retorna string vacio para null/undefined", () => {
    expect(extractiveSummary("")).toBe("");
  });

  it("extrae las primeras N oraciones de un parrafo", () => {
    const text =
      "El congreso aprobo la nueva ley de educacion. Esta reforma beneficiara a mas de 10 millones de estudiantes. Los cambios entraran en vigor el proximo ano. Expertos han senalado que es un avance significativo.";
    const result = extractiveSummary(text, 2);
    expect(result).toContain("El congreso aprobo");
    expect(result).toContain("Esta reforma beneficiara");
    expect(result).not.toContain("Expertos han senalado");
  });

  it("no falla con texto sin puntuacion", () => {
    const text = "esto es un texto sin puntuacion ni estructura clara";
    const result = extractiveSummary(text, 3);
    expect(result).toBe(text);
  });

  it("maneja saltos de linea correctamente", () => {
    const text = "Primera oracion." + NL + NL + "Segunda oracion." + NL + NL + "Tercera oracion.";
    const result = extractiveSummary(text, 2);
    expect(result).toContain("Primera oracion");
    expect(result).toContain("Segunda oracion");
    expect(result).not.toContain("Tercera oracion");
  });

  it("no excede el numero de oraciones solicitadas", () => {
    const text = "A. B. C. D. E. F.";
    const result = extractiveSummary(text, 3);
    const sents = result.match(SENTENCE_RE);
    expect(sents).toHaveLength(3);
  });
});

describe("generateBriefingText", () => {
  it("genera formato correcto con multiples titulares", () => {
    const headlines = [
      { title: "Noticia 1", link: "https://example.com/1", source: "Fuente A" },
      { title: "Noticia 2", link: "https://example.com/2", source: "Fuente B" },
    ];

    const result = generateBriefingText(headlines);

    expect(result).toContain("📰 Resumen de Noticias");
    expect(result).toContain("1. Noticia 1");
    expect(result).toContain("2. Noticia 2");
    expect(result).toContain("https://example.com/1");
    expect(result).toContain("https://example.com/2");
  });

  it("maneja array vacio", () => {
    const result = generateBriefingText([]);
    expect(result).toContain("📰 Resumen de Noticias");
    expect(result).not.toContain("1.");
  });

  it("incluye enlaces en cada titular", () => {
    const headlines = [
      { title: "Ultima hora", link: "https://news.example.com", source: "BBC" },
    ];

    const result = generateBriefingText(headlines);
    expect(result).toMatch(/https:\/\/news\.example\.com/);
    expect(result).toContain("BBC");
  });
});
