import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";
import { usersTable } from "./users";

export const articleRevisionsTable = pgTable("article_revisions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  savedBy: integer("saved_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArticleRevisionSchema = createInsertSchema(articleRevisionsTable).omit({
  id: true,
  savedAt: true,
});
export type InsertArticleRevision = z.infer<typeof insertArticleRevisionSchema>;
export type ArticleRevision = typeof articleRevisionsTable.$inferSelect;
