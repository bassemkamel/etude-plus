/**
 * Seed 2ème année secondaire starter questions into Neon.
 *
 * Pulls data verbatim from the shared frontend fallback file so a single
 * source of truth describes both local and prod question content.
 *
 * Track logic:
 *   - Shared subjects (Arabe, Français, Anglais, Histoire, Géographie,
 *     Éducation Islamique) → section_key = NULL.
 *   - Track-specific subjects → section_key = lettres | sciences |
 *     economie_services | technologie_informatique.
 *   - 2ème Sciences and 2ème Technologie de l'Informatique share the SAME
 *     Mathématiques curriculum. The fallback declares Sciences Math once;
 *     this script inserts each Sciences Math row twice — once for
 *     section_key=sciences, once for section_key=technologie_informatique.
 *
 * Idempotency:
 *   ON CONFLICT against questions_natural_key_idx (grade_level, COALESCE(section_key, ''),
 *   subject, topic, md5(question_text)) → DO NOTHING.
 *
 * Run:
 *   cd backend && npx tsx --env-file=api-server/.env scripts/seed-2eme-starter.ts
 *
 *   # Filter by section (smoke test):
 *   SECTION_FILTER=sciences SUBJECT_FILTER=Physique-Chimie npx tsx --env-file=api-server/.env scripts/seed-2eme-starter.ts
 */

import pg from "pg";
import {
  QUESTIONS_FALLBACK_2EME,
  MATH_SCIENCES_DUPLICATE_TO_TI,
} from "../../frontend/etude-plus/src/lib/questionsFallback2eme";
import type { FallbackQuestion } from "../../frontend/etude-plus/src/lib/questionsFallback";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const KNOWN_2EME_SECTIONS = new Set([
  "lettres",
  "sciences",
  "economie_services",
  "technologie_informatique",
]);
const KNOWN_MULTI_SUBJECTS = ["Économie / Gestion"];

function parseKey(key: string): {
  gradeLevel: string;
  sectionKey: string | null;
  subject: string;
  topic: string;
} | null {
  const parts = key.split("/");
  if (parts.length < 3) return null;
  const gradeLevel = parts[0];
  let sectionKey: string | null;
  let remainder: string;
  if (KNOWN_2EME_SECTIONS.has(parts[1])) {
    sectionKey = parts[1];
    remainder = key.slice(`${gradeLevel}/${sectionKey}/`.length);
  } else {
    sectionKey = null;
    remainder = key.slice(`${gradeLevel}/`.length);
  }
  for (const ms of KNOWN_MULTI_SUBJECTS) {
    if (remainder.startsWith(ms + "/")) {
      return { gradeLevel, sectionKey, subject: ms, topic: remainder.slice(ms.length + 1) };
    }
  }
  const slash = remainder.indexOf("/");
  if (slash < 0) return null;
  return { gradeLevel, sectionKey, subject: remainder.slice(0, slash), topic: remainder.slice(slash + 1) };
}

async function insertOne(
  gradeLevel: string,
  sectionKey: string | null,
  subject: string,
  topic: string,
  q: FallbackQuestion,
): Promise<"inserted" | "skipped"> {
  const isArabic = q.direction === "rtl";
  const language = isArabic ? "Arabe" : (subject === "Anglais" ? "English" : "Français");

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
      gradeLevel,
      sectionKey,
      subject,
      topic,
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
  return result.rowCount && result.rowCount > 0 ? "inserted" : "skipped";
}

async function seed() {
  const subjectFilter = process.env.SUBJECT_FILTER ?? null;
  const sectionFilter = process.env.SECTION_FILTER ?? null;

  let attempted = 0;
  let inserted = 0;
  let skipped = 0;

  for (const [key, qs] of Object.entries(QUESTIONS_FALLBACK_2EME)) {
    const parsed = parseKey(key);
    if (!parsed) {
      console.warn(`  ⚠️ malformed key, skipping: ${key}`);
      continue;
    }
    if (parsed.gradeLevel !== "2eme") continue;
    if (subjectFilter && parsed.subject !== subjectFilter) continue;

    for (const q of qs) {
      // ── 1) Primary insert in the declared track ─────────────────────────
      const sectionForPrimary = parsed.sectionKey;
      if (!sectionFilter || sectionForPrimary === sectionFilter
          || (sectionFilter === "null" && sectionForPrimary === null)) {
        attempted++;
        const r = await insertOne(parsed.gradeLevel, sectionForPrimary, parsed.subject, parsed.topic, q);
        if (r === "inserted") inserted++; else skipped++;
      }

      // ── 2) Duplicate Sciences Math into Technologies de l'Informatique ─
      if (
        MATH_SCIENCES_DUPLICATE_TO_TI
        && parsed.sectionKey === "sciences"
        && parsed.subject === "Mathématiques"
      ) {
        if (!sectionFilter || sectionFilter === "technologie_informatique") {
          attempted++;
          const r = await insertOne(parsed.gradeLevel, "technologie_informatique", parsed.subject, parsed.topic, q);
          if (r === "inserted") inserted++; else skipped++;
        }
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
