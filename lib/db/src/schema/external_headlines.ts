import { pgTable, serial, text, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const externalHeadlinesTable = pgTable(
  "external_headlines",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    link: text("link").notNull(),
    source: varchar("source", { length: 255 }).notNull(),
    sourceBias: varchar("source_bias", { length: 50 }),
    summary: text("summary"),
    content: text("content"),
    imageUrl: varchar("image_url", { length: 1024 }),
    slug: varchar("slug", { length: 200 }),
    pubDate: timestamp("pub_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint: same source + link = dedup
    sourceLinkIdx: uniqueIndex("idx_external_source_link").on(table.source, table.link),
    // Index for date-range queries (trends, recent headlines)
    pubDateIdx: index("idx_external_pubdate_desc").on(table.pubDate.desc()),
    // Index for source queries
    sourceIdx: index("idx_external_source").on(table.source),
    // Index for slug lookups
    slugIdx: index("idx_external_slug").on(table.slug),
  }),
);

export type ExternalHeadline = typeof externalHeadlinesTable.$inferSelect;
export type InsertExternalHeadline = typeof externalHeadlinesTable.$inferInsert;
