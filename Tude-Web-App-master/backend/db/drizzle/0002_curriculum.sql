-- Migration: Curriculum structure tables
-- Run after 0001_knowledge_base.sql
-- Adds: curriculum_subjects, curriculum_chapters

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "curriculum_subjects" (
  "id"          serial PRIMARY KEY NOT NULL,
  "code"        text NOT NULL,
  "name"        text NOT NULL,
  "icon"        text NOT NULL DEFAULT '📚',
  "color_class" text NOT NULL DEFAULT 'bg-blue-500/10 border-blue-200',
  "order_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "curriculum_subjects_code_unique" UNIQUE("code"),
  CONSTRAINT "curriculum_subjects_name_unique" UNIQUE("name")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "curriculum_chapters" (
  "id"           serial PRIMARY KEY NOT NULL,
  "level_code"   text NOT NULL,
  "section_key"  text,
  "subject"      text NOT NULL,
  "name"         text NOT NULL,
  "short_name"   text,
  "slug"         text NOT NULL,
  "order_index"  integer NOT NULL DEFAULT 0,
  "is_active"    boolean NOT NULL DEFAULT true,
  "created_at"   timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Unique chapter per (level, section, subject, name) so seed can be re-run safely
CREATE UNIQUE INDEX IF NOT EXISTS "curriculum_chapters_uniq_idx"
  ON "curriculum_chapters" ("level_code", COALESCE("section_key", ''), "subject", "name");

--> statement-breakpoint
-- Fast lookup: given a level + section + subject, return ordered chapters
CREATE INDEX IF NOT EXISTS "curriculum_chapters_lookup_idx"
  ON "curriculum_chapters" ("level_code", "section_key", "subject", "order_index");
