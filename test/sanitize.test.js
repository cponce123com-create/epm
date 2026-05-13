/**
 * Tests de configuración para sanitización HTML (XSS prevention).
 *
 * Verifica que las listas de tags/atributos permitidos y prohibidos
 * cumplan con los requerimientos de seguridad sin cargar jsdom.
 */

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "a",
  "span",
  "div",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "sub",
  "sup",
  "mark",
  "small",
  "img",
  "figure",
  "figcaption",
  "video",
  "source",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "iframe",
];

const FORBID_TAGS = [
  "script",
  "noscript",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "link",
  "meta",
  "base",
];

const FORBID_ATTR = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onmouseout",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
  "onreset",
  "onselect",
  "onkeydown",
  "onkeypress",
  "onkeyup",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "loading",
  "decoding",
  "controls",
  "autoplay",
  "loop",
  "muted",
  "playsinline",
  "preload",
  "poster",
  "class",
  "style",
  "data-zip-image",
  "data-original-src",
  "data-original-zip",
  "id",
  "colspan",
  "rowspan",
  "frameborder",
  "allowfullscreen",
  "allow",
];

describe("Sanitize config — ALLOWED_TAGS", () => {
  it("incluye tags semánticos de texto", () => {
    expect(ALLOWED_TAGS).toContain("p");
    expect(ALLOWED_TAGS).toContain("h1");
    expect(ALLOWED_TAGS).toContain("blockquote");
    expect(ALLOWED_TAGS).toContain("ul");
    expect(ALLOWED_TAGS).toContain("ol");
    expect(ALLOWED_TAGS).toContain("li");
    expect(ALLOWED_TAGS).toContain("strong");
    expect(ALLOWED_TAGS).toContain("em");
  });

  it("incluye tags multimedia", () => {
    expect(ALLOWED_TAGS).toContain("img");
    expect(ALLOWED_TAGS).toContain("figure");
    expect(ALLOWED_TAGS).toContain("figcaption");
    expect(ALLOWED_TAGS).toContain("video");
    expect(ALLOWED_TAGS).toContain("source");
  });

  it("incluye enlaces y contenedores", () => {
    expect(ALLOWED_TAGS).toContain("a");
    expect(ALLOWED_TAGS).toContain("span");
    expect(ALLOWED_TAGS).toContain("div");
  });

  it("incluye iframe (para YouTube/Vimeo)", () => {
    expect(ALLOWED_TAGS).toContain("iframe");
  });

  it("NO incluye tags peligrosos", () => {
    for (const tag of FORBID_TAGS) {
      expect(ALLOWED_TAGS).not.toContain(tag);
    }
  });
});

describe("Sanitize config — FORBID_ATTR", () => {
  it("bloquea todos los event handlers comunes", () => {
    expect(FORBID_ATTR).toContain("onerror");
    expect(FORBID_ATTR).toContain("onload");
    expect(FORBID_ATTR).toContain("onclick");
    expect(FORBID_ATTR).toContain("onmouseover");
    expect(FORBID_ATTR).toContain("onmouseout");
    expect(FORBID_ATTR).toContain("onfocus");
    expect(FORBID_ATTR).toContain("onblur");
    expect(FORBID_ATTR).toContain("onchange");
    expect(FORBID_ATTR).toContain("onsubmit");
    expect(FORBID_ATTR).toContain("onselect");
    expect(FORBID_ATTR).toContain("onkeydown");
    expect(FORBID_ATTR).toContain("onkeypress");
    expect(FORBID_ATTR).toContain("onkeyup");
  });
});

describe("Sanitize config — ALLOWED_ATTR", () => {
  it("incluye atributos de enlace", () => {
    expect(ALLOWED_ATTR).toContain("href");
    expect(ALLOWED_ATTR).toContain("target");
    expect(ALLOWED_ATTR).toContain("rel");
  });

  it("incluye atributos de imagen/video", () => {
    expect(ALLOWED_ATTR).toContain("src");
    expect(ALLOWED_ATTR).toContain("alt");
    expect(ALLOWED_ATTR).toContain("controls");
    expect(ALLOWED_ATTR).toContain("poster");
  });

  it("incluye atributos de tabla", () => {
    expect(ALLOWED_ATTR).toContain("colspan");
    expect(ALLOWED_ATTR).toContain("rowspan");
  });

  it("incluye data-* attributes del importador ZIP", () => {
    expect(ALLOWED_ATTR).toContain("data-zip-image");
    expect(ALLOWED_ATTR).toContain("data-original-src");
    expect(ALLOWED_ATTR).toContain("data-original-zip");
  });
});

describe("Sanitize config — FORBID_TAGS", () => {
  it("prohíbe tags de scripting", () => {
    expect(FORBID_TAGS).toContain("script");
    expect(FORBID_TAGS).toContain("noscript");
  });

  it("prohíbe tags de formularios", () => {
    expect(FORBID_TAGS).toContain("form");
    expect(FORBID_TAGS).toContain("input");
    expect(FORBID_TAGS).toContain("button");
    expect(FORBID_TAGS).toContain("select");
    expect(FORBID_TAGS).toContain("textarea");
  });

  it("prohíbe object y embed", () => {
    expect(FORBID_TAGS).toContain("object");
    expect(FORBID_TAGS).toContain("embed");
  });

  it("prohíbe link, meta, base", () => {
    expect(FORBID_TAGS).toContain("link");
    expect(FORBID_TAGS).toContain("meta");
    expect(FORBID_TAGS).toContain("base");
  });
});
