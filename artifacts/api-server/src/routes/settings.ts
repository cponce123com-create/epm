import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Todos los campos de configuración permitidos
const SETTING_KEYS = [
  // General
  "site_name",
  "site_description",
  "site_url",
  "contact_email",
  // Identidad visual
  "logo_url",
  "favicon_url",
  // SEO / Open Graph
  "og_image",
  "meta_keywords",
  // Redes sociales
  "twitter_url",
  "facebook_url",
  "youtube_url",
  "instagram_url",
  // Pie de página
  "footer_text",
  "footer_copyright",
  "footer_location",
  "footer_contact_email",
  "footer_show_sections",
  // Acerca de
  "about_text",
  // Publicidad
  "adsense_client",
] as const;

async function getAllSettings() {
  const rows = await db.select().from(siteSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return {
    // General
    siteName:          map["site_name"]          ?? "El Príncipe Mestizo",
    siteDescription:   map["site_description"]   ?? "Blog de periodismo ciudadano desde San Ramón, Chanchamayo (Perú)",
    siteUrl:           map["site_url"]            ?? "",
    contactEmail:      map["contact_email"]       ?? "",
    // Identidad visual
    logoUrl:           map["logo_url"]            ?? "",
    faviconUrl:        map["favicon_url"]         ?? "",
    // SEO / Open Graph
    ogImage:           map["og_image"]            ?? "",
    metaKeywords:      map["meta_keywords"]       ?? "",
    // Redes sociales
    twitterUrl:        map["twitter_url"]         ?? "",
    facebookUrl:       map["facebook_url"]        ?? "",
    youtubeUrl:        map["youtube_url"]         ?? "",
    instagramUrl:      map["instagram_url"]       ?? "",
    // Pie de página
    footerText:        map["footer_text"]         ?? "Periodismo ciudadano, opinión y denuncia desde la selva central peruana.",
    footerCopyright:   map["footer_copyright"]    ?? "",
    footerLocation:    map["footer_location"]     ?? "San Ramón, Chanchamayo — Junín, Perú",
    footerContactEmail:map["footer_contact_email"]?? "",
    footerShowSections:map["footer_show_sections"]?? "true",
    // Acerca de
    aboutText:         map["about_text"]          ?? "",
    // Publicidad
    adsenseClient:     map["adsense_client"]      ?? "",
  };
}

// ── GET público (para el frontend) ────────────────────────────────────────
router.get("/settings/public", async (_req, res): Promise<void> => {
  const settings = await getAllSettings();
  res.json(settings);
});

// ── GET admin ─────────────────────────────────────────────────────────────
router.get("/admin/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getAllSettings();
  res.json(settings);
});

// ── PUT admin — guarda un campo a la vez ──────────────────────────────────
router.put("/admin/settings", requireAuth, async (req, res): Promise<void> => {
  const { key, value } = req.body as { key: string; value: string };

  if (!key || typeof value !== "string") {
    res.status(400).json({ error: "key and value are required" });
    return;
  }

  await db
    .insert(siteSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: { value },
    });

  res.json({ ok: true });
});

export default router;
