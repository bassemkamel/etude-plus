-- Knowledge Base schema migration
-- Run after 0000_cold_weapon_omega.sql
-- Adds: flashcards, notions, annales, processing_errors tables
--       source_file_id column to questions table

--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "source_file_id" integer REFERENCES "materials"("id") ON DELETE SET NULL;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flashcards" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_file_id" integer REFERENCES "materials"("id") ON DELETE SET NULL,
	"grade_level" text NOT NULL,
	"section_key" text,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_file_id" integer REFERENCES "materials"("id") ON DELETE SET NULL,
	"grade_level" text NOT NULL,
	"section_key" text,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"example" text,
	"status" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "annales" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_file_id" integer REFERENCES "materials"("id") ON DELETE SET NULL,
	"grade_level" text NOT NULL,
	"section_key" text,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"year" integer,
	"content" text NOT NULL,
	"solution" text,
	"status" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer,
	"file_url" text,
	"subject" text,
	"grade_level" text,
	"error_message" text NOT NULL,
	"error_stage" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_base_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"subject" text NOT NULL,
	"grade_level" text NOT NULL,
	"section_key" text,
	"topic" text NOT NULL,
	"content_type" text NOT NULL,
	"notes" text,
	"uploaded_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"questions_count" integer DEFAULT 0 NOT NULL,
	"flashcards_count" integer DEFAULT 0 NOT NULL,
	"notions_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);

--> statement-breakpoint
-- Add kb_file_id to content tables (soft ref, no FK)
ALTER TABLE "questions"   ADD COLUMN IF NOT EXISTS "kb_file_id" integer;
ALTER TABLE "flashcards"  ADD COLUMN IF NOT EXISTS "kb_file_id" integer;
ALTER TABLE "notions"     ADD COLUMN IF NOT EXISTS "kb_file_id" integer;
ALTER TABLE "annales"     ADD COLUMN IF NOT EXISTS "kb_file_id" integer;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flashcards_grade_subject_idx" ON "flashcards" ("grade_level", "subject");
CREATE INDEX IF NOT EXISTS "flashcards_kb_file_id_idx" ON "flashcards" ("kb_file_id");
CREATE INDEX IF NOT EXISTS "notions_grade_subject_idx" ON "notions" ("grade_level", "subject");
CREATE INDEX IF NOT EXISTS "notions_kb_file_id_idx" ON "notions" ("kb_file_id");
CREATE INDEX IF NOT EXISTS "annales_grade_subject_idx" ON "annales" ("grade_level", "subject");
CREATE INDEX IF NOT EXISTS "annales_kb_file_id_idx" ON "annales" ("kb_file_id");
CREATE INDEX IF NOT EXISTS "questions_kb_file_id_idx" ON "questions" ("kb_file_id");
CREATE INDEX IF NOT EXISTS "processing_errors_file_id_idx" ON "processing_errors" ("file_id");
CREATE INDEX IF NOT EXISTS "kb_files_grade_subject_idx" ON "knowledge_base_files" ("grade_level", "subject");
CREATE INDEX IF NOT EXISTS "kb_files_status_idx" ON "knowledge_base_files" ("status");
