import { pgTable, serial, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const dailyBriefingsTable = pgTable(
  "daily_briefings",
  {
    id: serial("id").primaryKey(),
    briefingDate: date("briefing_date").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dateIdx: uniqueIndex("idx_briefing_date").on(table.briefingDate),
  }),
);

export type DailyBriefing = typeof dailyBriefingsTable.$inferSelect;
export type InsertDailyBriefing = typeof dailyBriefingsTable.$inferInsert;
