import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const SETTING_KEYS = ["about_text", "site_description", "adsense_client", "twitter_url", "facebook_url"] as const;

async function getAllSettings() {
  const rows = await db.select().from(siteSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return {
    aboutText: map["about_text"] ?? "",
    siteDescription: map["site_description"] ?? "Blog de periodismo ciudadano desde San Ramón, Chanchamayo (Perú)",
    adsenseClient: map["adsense_client"] ?? "",
    twitterUrl: map["twitter_url"] ?? "",
    facebookUrl: map["facebook_url"] ?? "",
  };
}

router.get("/settings/public", async (_req, res): Promise<void> => {
  const settings = await getAllSettings();
  res.json(settings);
});

router.get("/admin/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getAllSettings();
  res.json(settings);
});

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
