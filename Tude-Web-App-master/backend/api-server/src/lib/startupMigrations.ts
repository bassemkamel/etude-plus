/**
 * Startup migrations — additive-only ALTER TABLE statements that run on every
 * server boot using IF NOT EXISTS so they are safe to repeat.
 *
 * Use this for columns/indexes added after the initial schema was deployed.
 * Anything that changes or drops existing structure belongs in a proper migration.
 */

import { pool, db, knowledgeBaseFilesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Test whether the configured AI provider (Gemini or Anthropic) is reachable
 * and within quota. Returns true if a minimal generation call succeeds.
 */
async function isAiAvailable(): Promise<boolean> {
  try {
    if (process.env["GEMINI_API_KEY"]) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env["GEMINI_API_KEY"]}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Reply with one word: OK" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (res.status === 429) { console.log("[startup] Gemini quota exhausted — AI retry deferred"); return false; }
      return res.ok;
    }
    if (process.env["ANTHROPIC_API_KEY"]) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env["ANTHROPIC_API_KEY"]!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 5,
          messages: [{ role: "user", content: "Reply OK" }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok;
    }
  } catch {
    // network error or timeout
  }
  return false;
}

/**
 * If AI is available AND there are files waiting for AI processing,
 * trigger the reprocess-all pipeline automatically.
 * This runs on every server start — Railway restarts on each deploy so this
 * effectively checks quota once per deployment.
 */
async function scheduleAiRetryIfNeeded(): Promise<void> {
  try {
    const waiting = await db
      .select({ id: knowledgeBaseFilesTable.id })
      .from(knowledgeBaseFilesTable)
      .where(sql`${knowledgeBaseFilesTable.status} IN ('error', 'pending_ai')`);

    if (waiting.length === 0) {
      console.log("[startup] No files need AI reprocessing.");
      return;
    }

    console.log(`[startup] ${waiting.length} file(s) need AI — checking quota…`);
    const available = await isAiAvailable();
    if (!available) {
      console.log("[startup] AI not available yet — files will stay in error state until next deploy or manual trigger.");
      return;
    }

    console.log(`[startup] AI available! Queuing ${waiting.length} file(s) for reprocessing…`);
    // Dynamically import to avoid circular deps at module load time
    const { reprocessAllErrorFiles } = await import("./aiReprocessor");
    await reprocessAllErrorFiles();
  } catch (err: any) {
    console.error("[startup] AI retry check failed:", err.message);
  }
}

export async function runStartupMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── 0003: review workflow columns ────────────────────────────────────────
    await client.query(`
      ALTER TABLE knowledge_base_files
        ADD COLUMN IF NOT EXISTS annales_count integer NOT NULL DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE processing_errors
        ADD COLUMN IF NOT EXISTS kb_file_id integer;
    `);

    // Index for admin error dashboard: filter by kb_file_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS processing_errors_kb_file_id_idx
        ON processing_errors (kb_file_id)
        WHERE kb_file_id IS NOT NULL;
    `);

    // ── 0004: file_data bytea for Neon-backed file storage ───────────────────
    await client.query(`
      ALTER TABLE knowledge_base_files
        ADD COLUMN IF NOT EXISTS file_data bytea;
    `);

    console.log("[startup] Schema migrations applied successfully.");

    // ── Auto-retry AI processing if Gemini quota is available ────────────────
    // Runs non-blocking after migrations. If there are files waiting for AI
    // processing and Gemini responds, triggers reprocess-all automatically.
    setImmediate(() => scheduleAiRetryIfNeeded());
  } catch (err: any) {
    // Log but don't crash — the missing columns will cause individual query
    // failures rather than taking down the whole server.
    console.error("[startup] Migration error (non-fatal):", err.message);
  } finally {
    client.release();
  }
}
