import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { classesTable } from "./classes";
import { liveSessionsTable } from "./sessions";

export const enrollmentStatusEnum = pgEnum("enrollment_status", ["pending", "paid", "active", "completed"]);

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  sessionId: integer("session_id").references(() => liveSessionsTable.id, { onDelete: "set null" }),
  status: enrollmentStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, createdAt: true });

export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
