/**
 * Admin-only knowledge base upload tracking.
 * Stores metadata + processing status for files uploaded via /kb.
 * Never exposed to professors or students.
 */
import { pgTable, serial, integer, text, timestamp, customType } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// bytea for storing raw file bytes in Neon (used when no external object storage is configured)
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

export const knowledgeBaseFilesTable = pgTable("knowledge_base_files", {
  id:              serial("id").primaryKey(),
  fileName:        text("file_name").notNull(),
  fileUrl:         text("file_url").notNull(),
  fileType:        text("file_type"),
  subject:         text("subject").notNull(),
  gradeLevel:      text("grade_level").notNull(),
  sectionKey:      text("section_key"),
  topic:           text("topic").notNull(),
  contentType:     text("content_type").notNull(), // 'cours' | 'examen' | 'exercices' | 'annale' | 'resume' | 'manuel'
  notes:           text("notes"),
  uploadedBy:      integer("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  // Status lifecycle:
  //   'processing' → AI extraction running
  //   'ready'      → AI done, content saved as draft — awaiting admin review/publish
  //   'processed'  → admin published all generated content
  //   'error'      → processing failed (see error_message)
  status:          text("status").notNull().default("processing"),
  errorMessage:    text("error_message"),
  questionsCount:  integer("questions_count").notNull().default(0),
  flashcardsCount: integer("flashcards_count").notNull().default(0),
  notionsCount:    integer("notions_count").notNull().default(0),
  annalesCount:    integer("annales_count").notNull().default(0),
  fileData:        bytea("file_data"),   // raw bytes stored in Neon when no external storage is configured
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  processedAt:     timestamp("processed_at"),
});

export type KnowledgeBaseFile = typeof knowledgeBaseFilesTable.$inferSelect;
