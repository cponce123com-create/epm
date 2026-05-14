import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userPermissionsTable = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 100 }).notNull(),
  // Permisos: 'publish_own', 'edit_others', 'delete_own',
  //           'manage_comments', 'import_articles', 'upload_images'
  grantedBy: integer("granted_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserPermissionSchema = createInsertSchema(userPermissionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UserPermission = typeof userPermissionsTable.$inferSelect;
