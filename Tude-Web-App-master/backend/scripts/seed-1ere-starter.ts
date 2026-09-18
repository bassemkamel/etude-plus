/**
 * Seed 1ère année secondaire starter questions into Neon.
 *
 * Reads the shared question fallback file in the frontend workspace so the same
 * 148 questions that appear locally land verbatim in the database.
 *
 * Idempotent: relies on the questions_natural_key_idx unique index
 * (grade_level, COALESCE(section_key, ''), subject, topic, md5(question_text)).
 * Re-running the script inserts only rows that don't already exist.
 *
 * Run:
 *   cd backend && DATABASE_URL=<prod_url> npx tsx scripts/seed-1ere-starter.ts
 */

import pg from "pg";
import {
  QUESTIONS_FALLBACK,
  type FallbackQuestion,
} from "../../frontend/etude-plus/src/lib/questionsFallback";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseKey(key: string): {
  gradeLevel: string;
  sectionKey: string | null;
  subject: string;
  topic: string;
} | null {
  const parts = key.split("/");
  if (parts.length === 3) {
    return { gradeLevel: parts[0], sectionKey: null, subject: parts[1], topic: parts[2] };
  }
  if (parts.length === 4) {
    return { gradeLevel: parts[0], sectionKey: parts[1], subject: parts[2], topic: parts[3] };
  }
  return null;
}

async function seed() {
  let attempted = 0;
  let inserted = 0;
  let skipped = 0;

  for (const [key, questions] of Object.entries(QUESTIONS_FALLBACK)) {
    const parsed = parseKey(key);
    if (!parsed) {
      console.warn(`  ⚠️ skipping malformed key: ${key}`);
      continue;
    }
    if (parsed.gradeLevel !== "1ere_secondaire") {
      continue;
    }
    if (process.env.SUBJECT_FILTER && parsed.subject !== process.env.SUBJECT_FILTER) {
      continue;
    }

    for (const q of questions as FallbackQuestion[]) {
      attempted++;
      const isArabic = q.direction === "rtl";
      const language = isArabic ? "Arabe" : "Français";

      const result = await pool.query(
        `
        INSERT INTO questions (
          status, grade_level, section_key, subject, topic,
          type, difficulty, language,
          question_text, instruction,
          options, correct_answer, explanation, direction, source,
          requires_calculator, total_marks, estimated_time_minutes
        ) VALUES (
          'published', $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9,
          $10::jsonb, $11, $12, $13, $14,
          $15, $16, $17
        )
        ON CONFLICT (grade_level, (COALESCE(section_key, '')), subject, topic, (md5(question_text)))
        DO NOTHING
        RETURNING id
        `,
        [
          parsed.gradeLevel,
          parsed.sectionKey,
          parsed.subject,
          parsed.topic,
          q.type,
          q.difficulty,
          language,
          q.question,
          q.instruction,
          q.options ? JSON.stringify(q.options) : null,
          q.correctAnswer,
          q.explanation,
          q.direction,
          q.source,
          q.requiresCalculator,
          q.totalMarks,
          q.estimatedTimeMinutes,
        ],
      );

      if (result.rowCount && result.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`\nSeed complete.`);
  console.log(`  attempted: ${attempted}`);
  console.log(`  inserted:  ${inserted}`);
  console.log(`  skipped:   ${skipped} (already present)`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
