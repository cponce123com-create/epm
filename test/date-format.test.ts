/**
 * Pruebas unitarias para funciones de formateo de fechas.
 */
import { describe, it, expect } from "@jest/globals";

// Utility functions without external dependencies
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "justo ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} d`;
  return formatDate(iso);
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

describe("formatDate", () => {
  it("formatea una fecha ISO correctamente en español", () => {
    const result = formatDate("2026-05-29T12:00:00Z");
    expect(result).toContain("29");
    expect(result).toContain("mayo");
    expect(result).toContain("2026");
  });

  it("maneja fechas con diferentes meses", () => {
    const jan = formatDate("2026-01-15T00:00:00Z");
    expect(jan).toContain("enero");

    const dec = formatDate("2026-12-25T00:00:00Z");
    expect(dec).toContain("diciembre");
  });
});

describe("formatTimeAgo", () => {
  it("retorna 'justo ahora' para fecha muy reciente", () => {
    const result = formatTimeAgo(new Date().toISOString());
    expect(result).toBe("justo ahora");
  });

  it("retorna minutos para fechas recientes", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const result = formatTimeAgo(fiveMinAgo);
    expect(result).toMatch(/hace \d+ min/);
  });

  it("retorna horas para fechas de hace horas", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    const result = formatTimeAgo(threeHoursAgo);
    expect(result).toMatch(/hace \d+ h/);
  });

  it("retorna días para fechas antiguas", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const result = formatTimeAgo(twoDaysAgo);
    expect(result).toMatch(/hace \d+ d/);
  });

  it("usa formato largo para más de 7 días", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    const result = formatTimeAgo(tenDaysAgo);
    expect(result).not.toMatch(/hace \d+ d/);
    expect(result).toContain("mayo");
  });
});

describe("toISODate", () => {
  it("convierte Date a formato YYYY-MM-DD", () => {
    const date = new Date("2026-05-29T15:30:00Z");
    expect(toISODate(date)).toBe("2026-05-29");
  });

  it("maneja años bisiestos", () => {
    const date = new Date("2024-02-29T00:00:00Z");
    expect(toISODate(date)).toBe("2024-02-29");
  });
});
