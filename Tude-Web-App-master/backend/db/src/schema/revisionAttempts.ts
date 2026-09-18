import { pgTable, serial, integer, text, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * revision_attempts — one row per completed revision session.
 * type: 'practice' (question bank session), 'past_paper' (full annale attempt)
 * gradeOutOf20 is stored as a real number for easy averaging.
 */
export const revisionAttemptsTable = pgTable("revision_attempts", {
  id:              serial("id").primaryKey(),
  studentId:       integer("student_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  type:            text("type").notNull(),            // 'practice' | 'past_paper'
  subject:         text("subject").notNull(),
  gradeLevel:      text("grade_level").notNull(),
  sectionKey:      text("section_key"),
  topic:           text("topic"),                     // filled for practice sessions
  annaleId:        integer("annale_id"),              // soft ref to annales.id for past papers
  annaleYear:      integer("annale_year"),            // denormalized for display
  totalMarks:      integer("total_marks").notNull().default(0),
  marksAwarded:    integer("marks_awarded").notNull().default(0),
  gradeOutOf20:    real("grade_out_of_20"),           // computed: (marksAwarded / totalMarks) * 20
  questionsCount:  integer("questions_count").notNull().default(0),
  correctCount:    integer("correct_count").notNull().default(0),
  completedAt:     timestamp("completed_at").defaultNow().notNull(),
});

/**
 * student_answers — one row per question answered within an attempt.
 * Enables per-topic breakdown and mistake tracking.
 */
export const studentAnswersTable = pgTable("student_answers", {
  id:               serial("id").primaryKey(),
  attemptId:        integer("attempt_id").references(() => revisionAttemptsTable.id, { onDelete: "cascade" }).notNull(),
  studentId:        integer("student_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  questionId:       integer("question_id"),           // soft ref to questions.id
  partLabel:        text("part_label"),               // 'a', 'b', 'c' or null for whole question
  subject:          text("subject").notNull(),
  topic:            text("topic"),
  isCorrect:        boolean("is_correct"),
  marksAwarded:     integer("marks_awarded"),
  marksAvailable:   integer("marks_available"),
  answeredAt:       timestamp("answered_at").defaultNow().notNull(),
});

export type RevisionAttempt  = typeof revisionAttemptsTable.$inferSelect;
export type StudentAnswer    = typeof studentAnswersTable.$inferSelect;
