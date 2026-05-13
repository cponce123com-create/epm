/**
 * Tests unitarios para generación de slugs y cálculo de tiempo de lectura.
 *
 * makeSlug: usa el paquete "slugify" con opciones { lower: true, strict: true, locale: "es" }
 * calcReadingTime: strip HTML → contar palabras → dividir por 200, mínimo 1
 */

const slugify = require("slugify");

function makeSlug(title) {
  return slugify(title, { lower: true, strict: true, locale: "es" });
}

function calcReadingTime(html) {
  // Strip HTML tags
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

describe("makeSlug", () => {
  it("convierte texto simple a slug", () => {
    expect(makeSlug("Las obras inconclusas")).toBe("las-obras-inconclusas");
  });

  it("remueve acentos (locale: es)", () => {
    expect(makeSlug("Canción de hielo y fuego")).toBe(
      "cancion-de-hielo-y-fuego",
    );
  });

  it("remueve caracteres especiales", () => {
    expect(makeSlug("¿Qué pasa? ¡Hola!")).toBe("que-pasa-hola");
  });

  it("maneja strings vacíos", () => {
    expect(makeSlug("")).toBe("");
  });

  it("maneja solo caracteres especiales", () => {
    expect(makeSlug("!!!")).toBe("");
  });

  it("convierte mayúsculas a minúsculas", () => {
    expect(makeSlug("EL PRÍNCIPE MESTIZO")).toBe("el-principe-mestizo");
  });

  it("colapsa múltiples espacios y guiones", () => {
    expect(makeSlug("muchos   espacios   aqui")).toBe("muchos-espacios-aqui");
  });

  it("elimina guiones al inicio y final", () => {
    expect(makeSlug("--titulo--")).toBe("titulo");
  });
});

describe("calcReadingTime", () => {
  it("calcula tiempo para texto corto", () => {
    const html = "<p>Hola mundo. Esto es un artículo corto.</p>";
    // 8 palabras / 200 = 0.04 → round = 0 → max(1, 0) = 1
    expect(calcReadingTime(html)).toBe(1);
  });

  it("calcula tiempo para 200 palabras (1 minuto)", () => {
    const words = Array(200).fill("palabra").join(" ");
    const html = `<p>${words}</p>`;
    expect(calcReadingTime(html)).toBe(1);
  });

  it("calcula tiempo para 400 palabras (2 minutos)", () => {
    const words = Array(400).fill("palabra").join(" ");
    const html = `<p>${words}</p>`;
    expect(calcReadingTime(html)).toBe(2);
  });

  it("calcula tiempo para 500 palabras (3 minutos, redondeo)", () => {
    const words = Array(500).fill("palabra").join(" ");
    const html = `<p>${words}</p>`;
    // 500 / 200 = 2.5 → round = 3
    expect(calcReadingTime(html)).toBe(3);
  });

  it("ignora contenido dentro de tags HTML", () => {
    const html =
      '<div class="muchas palabras aqui dentro"><p>texto real</p></div>';
    // Solo "texto real" = 2 palabras → 0.01 → round = 0 → max = 1
    expect(calcReadingTime(html)).toBe(1);
  });

  it("retorna mínimo 1 incluso sin palabras", () => {
    expect(calcReadingTime("<div></div>")).toBe(1);
  });
});
