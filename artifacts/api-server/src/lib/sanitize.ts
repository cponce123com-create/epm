import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const window = new JSDOM("").window;
const purify = DOMPurify(window as any);

// Configuración de tags y atributos permitidos en el contenido de artículos.
// Se permite HTML semántico + multimedia; se elimina todo lo demás.
const ALLOWED_TAGS = [
  // Texto
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
  // Multimedia
  "img",
  "figure",
  "figcaption",
  "video",
  "source",
  // Tablas (para contenido importado)
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  // Iframes (solo YouTube/Vimeo — se filtra por dominio en el hook)
  "iframe",
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

/**
 * Sanitiza contenido HTML de artículo, eliminando scripts,
 * event handlers, y tags peligrosos.
 */
export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_TAGS: [
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
    ],
    FORBID_ATTR: [
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
    ],
  });
}
