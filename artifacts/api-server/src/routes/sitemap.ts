import { Router, type IRouter } from "express";
import { db, articlesTable, categoriesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

const SITE_URL = "https://elprincipemestizo.eu.cc";

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /sitemap.xml
 * Genera un sitemap dinámico con todas las URLs públicas del sitio:
 * - Página principal
 * - Categorías con artículos publicados
 * - Artículos publicados
 */
router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const publishedArticles = await db
      .select({
        slug: articlesTable.slug,
        updatedAt: articlesTable.updatedAt,
      })
      .from(articlesTable)
      .where(eq(articlesTable.status, "published"))
      .orderBy(desc(articlesTable.publishedAt));

    const categories = await db
      .select({
        slug: categoriesTable.slug,
        articleCount: sql<number>`cast(count(${articlesTable.id}) as int)`,
      })
      .from(categoriesTable)
      .leftJoin(
        articlesTable,
        sql`${categoriesTable.id} = ${articlesTable.categoryId} AND ${articlesTable.status} = 'published'`,
      )
      .groupBy(categoriesTable.slug);

    const urls: string[] = [];

    // Home
    urls.push(`
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>`);

    // About
    urls.push(`
  <url>
    <loc>${SITE_URL}/acerca-de</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);

    // Categories with articles
    for (const cat of categories) {
      if (Number(cat.articleCount) > 0) {
        urls.push(`
  <url>
    <loc>${SITE_URL}/categoria/${escXml(cat.slug)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
      }
    }

    // Articles
    for (const article of publishedArticles) {
      const lastmod = article.updatedAt
        ? new Date(article.updatedAt).toISOString()
        : "";
      urls.push(`
  <url>
    <loc>${SITE_URL}/articulo/${escXml(article.slug)}</loc>
    ${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600",
    );
    res.send(xml);
  } catch (err) {
    // Si falla la generación, no bloquear el sitio
    res.status(500).send("Error generating sitemap");
  }
});

export default router;
