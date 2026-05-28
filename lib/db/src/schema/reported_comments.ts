import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { commentsTable } from "./comments";

export const reportedCommentsTable = pgTable("reported_comments", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => commentsTable.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 255 }).notNull(),
  details: text("details"),
  reporterEmail: varchar("reporter_email", { length: 255 }),
  reviewed: boolean("reviewed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
