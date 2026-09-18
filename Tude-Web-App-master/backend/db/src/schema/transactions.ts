import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { classesTable } from "./classes";
import { liveSessionsTable } from "./sessions";

export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "refunded"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  sessionId: integer("session_id").references(() => liveSessionsTable.id, { onDelete: "set null" }),
  amount: real("amount").notNull(),
  platformFee: real("platform_fee").notNull(),
  professorAmount: real("professor_amount").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  discountCode: text("discount_code"),
  discountAmount: real("discount_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
