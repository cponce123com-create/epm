import sanitizeHtmlLib from "sanitize-html";

export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, {
    allowedTags: [
      "h1","h2","h3","h4","h5","h6",
      "p","br","hr","strong","b","em","i","u","s","del",
      "a","span","div","blockquote","pre","code",
      "ul","ol","li",
      "table","thead","tbody","tr","th","td","colgroup","col",
      "figure","figcaption","img","video","source","iframe",
      "sup","sub",
    ],
    allowedAttributes: {
      "*": ["class", "style", "id"],
      "a": ["href", "target", "rel"],
      "img": ["src", "alt", "width", "height", "loading"],
      "iframe": ["src", "width", "height", "frameborder", "allowfullscreen", "allow"],
      "video": ["src", "controls", "width", "height", "autoplay", "loop", "muted"],
      "source": ["src", "type"],
      "td": ["colspan", "rowspan"],
      "th": ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
  });
}
