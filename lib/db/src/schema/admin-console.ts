import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminRecordsTable = pgTable("admin_records", {
  id: text("id").primaryKey(),
  module: text("module").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  demoOnly: boolean("demo_only").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdminRecordSchema = createInsertSchema(adminRecordsTable).omit({
  createdAt: true,
  updatedAt: true,
  demoOnly: true,
});
export type InsertAdminRecord = z.infer<typeof insertAdminRecordSchema>;
export type AdminRecordRow = typeof adminRecordsTable.$inferSelect;

export const adminAuditLogsTable = pgTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  recordId: text("record_id").notNull(),
  summary: text("summary").notNull(),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogsTable).omit({
  createdAt: true,
});
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLogRow = typeof adminAuditLogsTable.$inferSelect;

export const staffRolesTable = pgTable("staff_roles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStaffRoleSchema = createInsertSchema(staffRolesTable).omit({
  createdAt: true,
});
export type InsertStaffRole = z.infer<typeof insertStaffRoleSchema>;
export type StaffRoleRow = typeof staffRolesTable.$inferSelect;
