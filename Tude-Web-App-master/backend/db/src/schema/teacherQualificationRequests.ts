import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { professorsTable } from "./professors";
import { usersTable } from "./users";

/**
 * A professor's request to teach a specific (niveau, section) combo.
 * Must be approved by an admin before qualifications are granted.
 * On approval, rows are inserted into teacher_qualifications.
 */
export const teacherQualificationRequestsTable = pgTable("teacher_qualification_requests", {
  id: serial("id").primaryKey(),
  professorId: integer("professor_id")
    .references(() => professorsTable.id, { onDelete: "cascade" })
    .notNull(),
  niveauKey: text("niveau_key").notNull(),
  sectionKey: text("section_key"), // null for simple levels
  subjects: text("subjects").array().notNull().default([]),
  documentUrl: text("document_url").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TeacherQualificationRequest = typeof teacherQualificationRequestsTable.$inferSelect;
