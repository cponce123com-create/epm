import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";

export const articleSummariesTable = pgTable(
  "article_summaries",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdx: uniqueIndex("idx_summary_article").on(table.articleId),
  }),
);

export type ArticleSummary = typeof articleSummariesTable.$inferSelect;
export type InsertArticleSummary = typeof articleSummariesTable.$inferInsert;
