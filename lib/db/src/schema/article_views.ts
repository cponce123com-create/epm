import { pgTable, serial, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const articleViewsTable = pgTable(
  "article_views",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.articleId, table.ipHash, table.viewedAt)],
);

export const insertArticleViewSchema = createInsertSchema(articleViewsTable).omit({
  id: true,
  viewedAt: true,
});
export type InsertArticleView = z.infer<typeof insertArticleViewSchema>;
export type ArticleView = typeof articleViewsTable.$inferSelect;
