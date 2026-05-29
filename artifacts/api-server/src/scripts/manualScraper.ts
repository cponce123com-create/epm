/* eslint-disable no-console */
/**
 * Manual RSS Scraper — Script para pruebas locales.
 * Uso: pnpm --filter @workspace/api-server run scraper:run
 */
import { parseAllSources } from "@workspace/external-news";
import { db, externalHeadlinesTable } from "@workspace/db";
import { config } from "dotenv";

// Load .env file
config();

async function main() {
  console.log("=== EPM RSS Scraper (manual) ===");
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("");

  // Parse all RSS sources
  console.log("Fetching RSS feeds...");
  const headlines = await parseAllSources();

  console.log(`
Found ${headlines.length} headlines total`);
  console.log("");

  // Show a sample
  for (const h of headlines.slice(0, 5)) {
    console.log(`- ${h.title}`);
    console.log(`  ${h.source} | ${h.link}`);
    console.log(`  ${h.pubDate.toISOString()}`);
    if (h.summary) {
      console.log(`  "${h.summary.slice(0, 100)}..."`);
    }
    console.log("");
  }

  // Attempt to save to DB
  if (process.env["DATABASE_URL"]) {
    console.log("Saving to database...");
    let saved = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < headlines.length; i += BATCH_SIZE) {
      const batch = headlines.slice(i, i + BATCH_SIZE);
      for (const h of batch) {
        try {
          await db
            .insert(externalHeadlinesTable)
            .values({
              title: h.title,
              link: h.link,
              source: h.source,
              sourceBias: h.sourceBias ?? null,
              summary: h.summary ?? null,
              pubDate: h.pubDate,
            })
            .onConflictDoNothing({
              target: [externalHeadlinesTable.source, externalHeadlinesTable.link],
            });
          saved++;
        } catch {
          // skip duplicates
        }
      }
    }

    console.log(`Saved ${saved} new headlines to database`);
  } else {
    console.log("No DATABASE_URL found in environment — skipping DB save");
    console.log("Set DATABASE_URL in .env to persist headlines");
  }

  console.log("
Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
