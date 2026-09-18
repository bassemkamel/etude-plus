import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { professorsTable } from "./professors";

/**
 * Explicit (niveau, section, subject) triples approved for a teacher.
 * - niveauKey: "7eme" | "8eme" | "9eme" | "1ere_secondaire" | "2eme" | "3eme" | "bac"
 * - sectionKey: null for simple levels, "sciences_maths" etc. for section levels
 * - subject:    "Mathématiques", "Physique-Chimie", etc.
 */
export const teacherQualificationsTable = pgTable("teacher_qualifications", {
  id: serial("id").primaryKey(),
  professorId: integer("professor_id")
    .references(() => professorsTable.id, { onDelete: "cascade" })
    .notNull(),
  niveauKey: text("niveau_key").notNull(),
  sectionKey: text("section_key"), // null for simple levels
  subject: text("subject").notNull(),
});

export type TeacherQualification = typeof teacherQualificationsTable.$inferSelect;
