/**
 * Knowledge Base schema — populated by AI processing of professor-uploaded materials.
 * Professor has zero visibility of this process. See terms and conditions for disclosure.
 */
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { materialsTable } from "./materials";

// ── Flashcards ────────────────────────────────────────────────────────────────
// Auto-generated from professor uploads; surfaced to students in /revision/:subject/flashcards
export const flashcardsTable = pgTable("flashcards", {
  id:           serial("id").primaryKey(),
  sourceFileId: integer("source_file_id").references(() => materialsTable.id, { onDelete: "set null" }),
  kbFileId:     integer("kb_file_id"),  // soft ref to knowledge_base_files.id (admin uploads)
  gradeLevel:   text("grade_level").notNull(),
  sectionKey:   text("section_key"),
  subject:      text("subject").notNull(),
  topic:        text("topic").notNull(),
  front:        text("front").notNull(),
  back:         text("back").notNull(),
  status:       text("status").notNull().default("live"),  // 'live' | 'archived'
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── Notions Clés ──────────────────────────────────────────────────────────────
// Key-concept summaries surfaced in /revision/:subject/notions-cles
export const notionsTable = pgTable("notions", {
  id:           serial("id").primaryKey(),
  sourceFileId: integer("source_file_id").references(() => materialsTable.id, { onDelete: "set null" }),
  kbFileId:     integer("kb_file_id"),
  gradeLevel:   text("grade_level").notNull(),
  sectionKey:   text("section_key"),
  subject:      text("subject").notNull(),
  topic:        text("topic").notNull(),
  title:        text("title").notNull(),
  content:      text("content").notNull(),
  example:      text("example"),
  status:       text("status").notNull().default("live"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── Annales ───────────────────────────────────────────────────────────────────
// Detected past exam papers; surfaced in /revision/:subject/annales
export const annalesTable = pgTable("annales", {
  id:           serial("id").primaryKey(),
  sourceFileId: integer("source_file_id").references(() => materialsTable.id, { onDelete: "set null" }),
  kbFileId:     integer("kb_file_id"),
  gradeLevel:   text("grade_level").notNull(),
  sectionKey:   text("section_key"),
  subject:      text("subject").notNull(),
  topic:        text("topic").notNull(),
  year:         integer("year"),
  content:      text("content").notNull(),  // JSON-serialised question array
  solution:     text("solution"),           // JSON-serialised mark scheme
  status:       text("status").notNull().default("live"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── Processing Errors ─────────────────────────────────────────────────────────
// Silent failure log — visible to admins ONLY at /admin/knowledge-base/errors
// Professor is never notified. No FK so entries survive material deletion.
export const processingErrorsTable = pgTable("processing_errors", {
  id:           serial("id").primaryKey(),
  fileId:       integer("file_id"),                // soft ref to materialsTable.id (professor uploads)
  kbFileId:     integer("kb_file_id"),             // soft ref to knowledge_base_files.id (admin KB uploads)
  fileUrl:      text("file_url"),
  subject:      text("subject"),
  gradeLevel:   text("grade_level"),
  errorMessage: text("error_message").notNull(),
  errorStage:   text("error_stage"),               // 'extraction' | 'generation' | 'save'
  retryCount:   integer("retry_count").notNull().default(0),
  attemptedAt:  timestamp("attempted_at").defaultNow().notNull(),
});

export type Flashcard       = typeof flashcardsTable.$inferSelect;
export type Notion          = typeof notionsTable.$inferSelect;
export type Annale          = typeof annalesTable.$inferSelect;
export type ProcessingError = typeof processingErrorsTable.$inferSelect;
