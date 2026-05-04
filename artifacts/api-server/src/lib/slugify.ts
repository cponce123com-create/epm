import slugifyLib from "slugify";

export function makeSlug(title: string): string {
  return slugifyLib(title, { lower: true, strict: true, locale: "es" });
}

export function calcReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
