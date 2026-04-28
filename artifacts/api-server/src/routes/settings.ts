import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";

const router: IRouter = Router();

// Todos los campos de configuración permitidos
const SETTING_KEYS = [
  // General
  "site_name",
  "site_tagline",
  "site_description",
  "site_url",
  "contact_email",
  // Identidad visual
  "logo_url",
  "favicon_url",
  // Header
  "header_top_text",
  // SEO / Open Graph
  "og_image",
  "meta_keywords",
  // Redes sociales
  "twitter_url",
  "facebook_url",
  "youtube_url",
  "instagram_url",
  "tiktok_url",
  // Pie de página
  "footer_text",
  "footer_copyright",
  "footer_location",
  "footer_contact_email",
  "footer_show_sections",
  // Acerca de
  "about_title",
  "about_text",
  "about_photo_url",
  "about_role",
  // Publicidad banners manuales
  "ad_banner_1_url",
  "ad_banner_1_link",
  "ad_banner_1_alt",
  "ad_banner_2_url",
  "ad_banner_2_link",
  "ad_banner_2_alt",
  "ad_banner_3_url",
  "ad_banner_3_link",
  "ad_banner_3_alt",
  // Publicidad AdSense
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
    siteName:           map["site_name"]           ?? "El Príncipe Mestizo",
    siteTagline:        map["site_tagline"]         ?? "",
    siteDescription:    map["site_description"]    ?? "Comunicador ciudadano desde San Ramón, Chanchamayo (Perú)",
    siteUrl:            map["site_url"]             ?? "",
    contactEmail:       map["contact_email"]        ?? "",
    // Identidad visual
    logoUrl:            map["logo_url"]             ?? "",
    faviconUrl:         map["favicon_url"]          ?? "",
    // Header
    headerTopText:      map["header_top_text"]      ?? "",
    // SEO / Open Graph
    ogImage:            map["og_image"]             ?? "",
    metaKeywords:       map["meta_keywords"]        ?? "",
    // Redes sociales
    twitterUrl:         map["twitter_url"]          ?? "",
    facebookUrl:        map["facebook_url"]         ?? "",
    youtubeUrl:         map["youtube_url"]          ?? "",
    instagramUrl:       map["instagram_url"]        ?? "",
    tiktokUrl:          map["tiktok_url"]           ?? "",
    // Pie de página
    footerText:         map["footer_text"]          ?? "Opinión y denuncia ciudadana desde la selva central peruana.",
    footerCopyright:    map["footer_copyright"]     ?? "",
    footerLocation:     map["footer_location"]      ?? "San Ramón, Chanchamayo — Junín, Perú",
    footerContactEmail: map["footer_contact_email"] ?? "",
    footerShowSections: map["footer_show_sections"] ?? "true",
    // Acerca de
    aboutTitle:         map["about_title"]          ?? "",
    aboutText:          map["about_text"]           ?? "",
    aboutPhotoUrl:      map["about_photo_url"]      ?? "",
    aboutRole:          map["about_role"]           ?? "",
    // Publicidad banners
    adBanner1Url:       map["ad_banner_1_url"]      ?? "",
    adBanner1Link:      map["ad_banner_1_link"]     ?? "",
    adBanner1Alt:       map["ad_banner_1_alt"]      ?? "",
    adBanner2Url:       map["ad_banner_2_url"]      ?? "",
    adBanner2Link:      map["ad_banner_2_link"]     ?? "",
    adBanner2Alt:       map["ad_banner_2_alt"]      ?? "",
    adBanner3Url:       map["ad_banner_3_url"]      ?? "",
    adBanner3Link:      map["ad_banner_3_link"]     ?? "",
    adBanner3Alt:       map["ad_banner_3_alt"]      ?? "",
    // AdSense
    adsenseClient:      map["adsense_client"]       ?? "",
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
