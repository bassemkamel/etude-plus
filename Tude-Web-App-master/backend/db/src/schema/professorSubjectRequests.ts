import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { professorsTable } from "./professors";
import { usersTable } from "./users";

export const subjectRequestStatusEnum = pgEnum("subject_request_status", [
  "pending", "approved", "rejected",
]);

export const professorSubjectRequestsTable = pgTable("professor_subject_requests", {
  id: serial("id").primaryKey(),
  professorId: integer("professor_id")
    .references(() => professorsTable.id, { onDelete: "cascade" })
    .notNull(),
  subjects: text("subjects").array().notNull().default([]),
  gradeLevels: text("grade_levels").array().notNull().default([]),
  documentUrl: text("document_url").notNull(),
  status: subjectRequestStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProfessorSubjectRequest = typeof professorSubjectRequestsTable.$inferSelect;
