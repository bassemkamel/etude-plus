-- Migration: Review workflow additions
-- Run after 0002_curriculum.sql
--
-- Changes:
--   knowledge_base_files  → adds annales_count column
--   processing_errors     → adds kb_file_id column (soft ref to knowledge_base_files.id)
--
-- These are additive-only; no existing columns removed or renamed.
-- Safe to run multiple times (IF NOT EXISTS / idempotent).

--> statement-breakpoint
-- Track how many annale records were generated from a KB upload
ALTER TABLE "knowledge_base_files"
  ADD COLUMN IF NOT EXISTS "annales_count" integer NOT NULL DEFAULT 0;

--> statement-breakpoint
-- Link processing errors back to the KB file that caused them
-- (previously only linked to materials via file_id = 0 for KB uploads)
ALTER TABLE "processing_errors"
  ADD COLUMN IF NOT EXISTS "kb_file_id" integer;

--> statement-breakpoint
-- Index for admin error dashboard: filter by kb_file_id
CREATE INDEX IF NOT EXISTS "processing_errors_kb_file_id_idx"
  ON "processing_errors" ("kb_file_id")
  WHERE "kb_file_id" IS NOT NULL;
