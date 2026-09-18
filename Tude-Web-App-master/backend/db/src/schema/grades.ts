import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { classesTable } from "./classes";

export const assessmentTypeEnum = pgEnum("assessment_type", ["quiz", "test", "assignment"]);

export const gradesTable = pgTable("grades", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  assessmentType: assessmentTypeEnum("assessment_type").notNull(),
  assessmentId: integer("assessment_id").notNull(),
  assessmentTitle: text("assessment_title").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  comment: text("comment"),
  gradedAt: timestamp("graded_at").defaultNow().notNull(),
});

export const insertGradeSchema = createInsertSchema(gradesTable).omit({ id: true });

export type Grade = typeof gradesTable.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
