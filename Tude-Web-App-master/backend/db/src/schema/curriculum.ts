/**
 * Curriculum schema — Tunisian secondary education structure.
 *
 * Purpose: drive the student UI so chapter/topic lists are always visible,
 * even before any AI-generated content exists. Content tables (questions,
 * flashcards, annales) LEFT JOIN onto these; zero rows = chapter still shows.
 *
 * Design notes:
 *   - level_code  → matches questionsTable.gradeLevel   ("1ere_secondaire", "2eme", "bac", …)
 *   - section_key → matches questionsTable.sectionKey   ("sciences_maths", null for common, …)
 *   - subject     → matches questionsTable.subject      ("Mathématiques", …)
 *   - chapter.name → matches questionsTable.topic       so counts join naturally
 */

import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// ── curriculum_subjects ───────────────────────────────────────────────────────
// One row per subject; stores display metadata (icon emoji, Tailwind color class).
// Canonical subject name is the "subject" column — must match questionsTable.subject.

export const curriculumSubjectsTable = pgTable("curriculum_subjects", {
  id:          serial("id").primaryKey(),
  code:        text("code").notNull().unique(),   // e.g. "mathematiques"
  name:        text("name").notNull().unique(),   // e.g. "Mathématiques"  ← matches questions.subject
  icon:        text("icon").notNull().default("📚"),
  colorClass:  text("color_class").notNull().default("bg-blue-500/10 border-blue-200"),
  orderIndex:  integer("order_index").notNull().default(0),
});

// ── curriculum_chapters ───────────────────────────────────────────────────────
// THE core table. One row per chapter/topic per level/section/subject.
// Chapters exist even when question_count = 0.
//
// section_key = NULL means the chapter is common to ALL tracks of that level
// (e.g. French, Arabic in 2ème — same chapters regardless of Science/Lettres/…).
// When section_key = NULL, it will appear in query results for every track.

export const curriculumChaptersTable = pgTable("curriculum_chapters", {
  id:           serial("id").primaryKey(),
  levelCode:    text("level_code").notNull(),     // "1ere_secondaire" | "2eme" | "3eme" | "bac"
  sectionKey:   text("section_key"),              // null = all tracks; "sciences_maths" = one track
  subject:      text("subject").notNull(),        // "Mathématiques" — must match questions.subject exactly
  name:         text("name").notNull(),           // "Dérivation" — must match questions.topic exactly
  shortName:    text("short_name"),               // optional abbreviated label
  slug:         text("slug").notNull(),           // URL-safe: "derivation"
  orderIndex:   integer("order_index").notNull().default(0),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export type CurriculumSubject = typeof curriculumSubjectsTable.$inferSelect;
export type CurriculumChapter = typeof curriculumChaptersTable.$inferSelect;
