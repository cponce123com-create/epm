import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const userInvitationsTable = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("writer"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserInvitation = typeof userInvitationsTable.$inferSelect;
export type InsertUserInvitation = typeof userInvitationsTable.$inferInsert;
