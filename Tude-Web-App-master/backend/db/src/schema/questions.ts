import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { materialsTable } from "./materials";

export const questionsTable = pgTable("questions", {
  id:                     serial("id").primaryKey(),
  createdBy:              integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  sourceFileId:           integer("source_file_id").references(() => materialsTable.id, { onDelete: "set null" }),
  kbFileId:               integer("kb_file_id"),   // soft ref to knowledge_base_files.id
  status:                 text("status").notNull().default("draft"),   // 'draft' | 'published'
  gradeLevel:             text("grade_level").notNull(),                // e.g. "7eme", "bac"
  sectionKey:             text("section_key"),                          // e.g. "sciences_maths" or null
  subject:                text("subject").notNull(),                    // e.g. "Mathématiques"
  topic:                  text("topic").notNull(),                      // e.g. "Équations du premier degré"
  type:                   text("type").notNull(),                       // 'Exercice' | 'QCM' | 'Problème' | 'Rédaction'
  difficulty:             text("difficulty").notNull(),                  // 'facile' | 'moyen' | 'difficile'
  language:               text("language").notNull().default("Français"),
  questionText:           text("question_text").notNull(),
  context:                text("context"),                              // optional HTML table/scenario or null
  requiresCalculator:     boolean("requires_calculator").notNull().default(false),
  totalMarks:             integer("total_marks"),
  estimatedTimeMinutes:   integer("estimated_time_minutes"),
  createdAt:              timestamp("created_at").defaultNow().notNull(),
  updatedAt:              timestamp("updated_at").defaultNow().notNull(),
});

export const questionPartsTable = pgTable("question_parts", {
  id:         serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questionsTable.id, { onDelete: "cascade" }).notNull(),
  label:      text("label").notNull(),   // 'a', 'b', 'c'…
  text:       text("text").notNull(),
  marks:      integer("marks").notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const markSchemesTable = pgTable("mark_schemes", {
  id:              serial("id").primaryKey(),
  questionId:      integer("question_id").references(() => questionsTable.id, { onDelete: "cascade" }).notNull(),
  partLabel:       text("part_label").notNull(),   // matches question_parts.label
  answer:          text("answer").notNull(),
  marksBreakdown:  text("marks_breakdown"),
  orderIndex:      integer("order_index").notNull(),
});

export type Question       = typeof questionsTable.$inferSelect;
export type QuestionPart   = typeof questionPartsTable.$inferSelect;
export type MarkScheme     = typeof markSchemesTable.$inferSelect;
