import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: text("action").notNull(),       // e.g. "approve_professor", "suspend_user"
  targetType: text("target_type"),         // e.g. "user", "professor", "class", "transaction"
  targetId: integer("target_id"),
  details: jsonb("details"),               // free-form context (before/after state, notes)
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
