import { pgTable, serial, varchar, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

export const articleStatusEnum = pgEnum("article_status", ["draft", "published"]);

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  summary: text("summary").notNull(),
  coverImageUrl: varchar("cover_image_url", { length: 1024 }),
  coverImageAlt: varchar("cover_image_alt", { length: 500 }),
  content: text("content").notNull().default(""),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  secondaryCategoryId: integer("secondary_category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  status: articleStatusEnum("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  views: integer("views").notNull().default(0),
  readingTime: integer("reading_time").notNull().default(1),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
