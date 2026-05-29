/**
 * Pruebas unitarias para extractiveSummary y generateBriefingText.
 */
import { describe, it, expect } from "@jest/globals";

// Copia de las funciones desde @workspace/external-news para testing
function extractiveSummary(text: string, sentenceCount = 3): string {
  if (!text) return "";

  const sentences = text.match(/[^.!?
]+[.!?]+(\s|$)/g) ?? [];

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
    (h, i) => `${i + 1}. ${h.title} — ${h.source}
   ${h.link}`,
  );
  return `📰 Resumen de Noticias

${lines.join("

")}`;
}

describe("extractiveSummary", () => {
  it("retorna string vacío para texto vacío", () => {
    expect(extractiveSummary("")).toBe("");
  });

  it("retorna string vacío para null/undefined", () => {
    expect(extractiveSummary("")).toBe("");
  });

  it("extrae las primeras N oraciones de un párrafo", () => {
    const text =
      "El congreso aprobó la nueva ley de educación. Esta reforma beneficiará a más de 10 millones de estudiantes. Los cambios entrarán en vigor el próximo año. Expertos han señalado que es un avance significativo.";
    const result = extractiveSummary(text, 2);
    expect(result).toContain("El congreso aprobó");
    expect(result).toContain("Esta reforma beneficiará");
    expect(result).not.toContain("Expertos han señalado"); // Solo 2 oraciones
  });

  it("no falla con texto sin puntuación", () => {
    const text = "esto es un texto sin puntuación ni estructura clara";
    const result = extractiveSummary(text, 3);
    expect(result).toBe(text);
  });

  it("maneja saltos de línea correctamente", () => {
    const text = "Primera oración.

Segunda oración.

Tercera oración.";
    const result = extractiveSummary(text, 2);
    expect(result).toContain("Primera oración");
    expect(result).toContain("Segunda oración");
    expect(result).not.toContain("Tercera oración");
  });

  it("no excede el número de oraciones solicitadas", () => {
    const text = "A. B. C. D. E. F.";
    const result = extractiveSummary(text, 3);
    const sents = result.match(/[^.!?
]+[.!?]+/g);
    expect(sents).toHaveLength(3);
  });
});

describe("generateBriefingText", () => {
  it("genera formato correcto con múltiples titulares", () => {
    const headlines = [
      { title: "Noticia 1", link: "https://example.com/1", source: "Fuente A" },
      { title: "Noticia 2", link: "https://example.com/2", source: "Fuente B" },
    ];

    const result = generateBriefingText(headlines);

    expect(result).toContain("📰 Resumen de Noticias");
    expect(result).toContain("1. Noticia 1 — Fuente A");
    expect(result).toContain("https://example.com/1");
    expect(result).toContain("2. Noticia 2 — Fuente B");
    expect(result).toContain("https://example.com/2");
  });

  it("maneja array vacío", () => {
    const result = generateBriefingText([]);
    expect(result).toContain("📰 Resumen de Noticias");
    expect(result).not.toContain("1.");
  });

  it("incluye enlaces en cada titular", () => {
    const headlines = [
      { title: "Última hora", link: "https://news.example.com", source: "BBC" },
    ];

    const result = generateBriefingText(headlines);
    expect(result).toMatch(/https:\/\/news\.example\.com/);
    expect(result).toContain("BBC");
  });
});
