/**
 * Seed 3ème année secondaire starter questions into Neon.
 *
 * 3ème uses 6 tracks (section_keys):
 *   lettres | mathematiques | sciences_experimentales | sciences_techniques
 *   economie_gestion | sciences_informatique
 *
 * Some subjects share content across track groups (e.g., Histoire is the same
 * for {Lettres, Économie & Gestion} but a different book for the 4 sciences
 * tracks). To keep the row data per-track without duplicating question text in
 * the fallback file, the fallback uses "__special__" markers that this seed
 * expands to a list of concrete section_keys:
 *
 *   3eme/Anglais/...                          → [null]                          (truly shared)
 *   3eme/__non_lettres__/...                  → 5 non-Lettres tracks
 *   3eme/__autres__/...                       → 5 non-Lettres tracks (Philo)
 *   3eme/__lettres_eco__/...                  → [lettres, economie_gestion]
 *   3eme/__sciences__/...                     → 4 sciences/technical tracks
 *   3eme/__non_lettres_non_eco__/...          → [math, sci_exp, sci_tech] (Info)
 *
 * Regular track-specific keys ("3eme/<section>/<subject>/<topic>") are
 * inserted once with the section_key from the path.
 *
 * Idempotent via questions_natural_key_idx unique index. Re-runs insert nothing.
 *
 * Run:
 *   cd backend && npx tsx --env-file=api-server/.env scripts/seed-3eme-starter.ts
 *
 *   # Smoke filter:
 *   SECTION_FILTER=sciences_experimentales SUBJECT_FILTER=SVT \
 *     npx tsx --env-file=api-server/.env scripts/seed-3eme-starter.ts
 */

import pg from "pg";
import {
  QUESTIONS_FALLBACK_3EME,
  EXPANSION_RULES,
} from "../../frontend/etude-plus/src/lib/questionsFallback3eme";
import type { FallbackQuestion } from "../../frontend/etude-plus/src/lib/questionsFallback";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const KNOWN_3EME_SECTIONS = new Set([
  "lettres",
  "mathematiques",
  "sciences_experimentales",
  "sciences_techniques",
  "economie_gestion",
  "sciences_informatique",
]);

// Multi-segment subjects that contain "/" in the official name.
const KNOWN_MULTI_SUBJECTS = ["Algorithmique et Programmation", "Systèmes d'exploitation et Réseaux", "Économie / Gestion"];

interface Target {
  sectionKey: string | null;
  subject: string;
  topic: string;
}

/**
 * Resolve a fallback key to the list of (section, subject, topic) inserts.
 * Handles both __special__ prefix expansion and standard per-track keys.
 */
function resolveTargets(key: string): Target[] {
  for (const rule of EXPANSION_RULES) {
    if (!key.startsWith(rule.prefix)) continue;
    const remainder = key.slice(rule.prefix.length);
    for (const ms of KNOWN_MULTI_SUBJECTS) {
      if (remainder.startsWith(ms + "/")) {
        return rule.sections.map((sk) => ({
          sectionKey: sk, subject: ms, topic: remainder.slice(ms.length + 1),
        }));
      }
    }
    const slash = remainder.indexOf("/");
    if (slash < 0) return [];
    const subject = remainder.slice(0, slash);
    const topic = remainder.slice(slash + 1);
    return rule.sections.map((sk) => ({ sectionKey: sk, subject, topic }));
  }
  // Standard "3eme/<section>/<subject>/<topic>" — extract section_key
  if (!key.startsWith("3eme/")) return [];
  const parts = key.slice("3eme/".length);
  const firstSlash = parts.indexOf("/");
  if (firstSlash < 0) return [];
  const section = parts.slice(0, firstSlash);
  if (!KNOWN_3EME_SECTIONS.has(section)) return [];
  const remainder = parts.slice(firstSlash + 1);
  for (const ms of KNOWN_MULTI_SUBJECTS) {
    if (remainder.startsWith(ms + "/")) {
      return [{ sectionKey: section, subject: ms, topic: remainder.slice(ms.length + 1) }];
    }
  }
  const slash2 = remainder.indexOf("/");
  if (slash2 < 0) return [];
  return [{ sectionKey: section, subject: remainder.slice(0, slash2), topic: remainder.slice(slash2 + 1) }];
}

async function insertOne(sectionKey: string | null, subject: string, topic: string, q: FallbackQuestion): Promise<"inserted" | "skipped"> {
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
      'published', '3eme', $1, $2, $3,
      $4, $5, $6,
      $7, $8,
      $9::jsonb, $10, $11, $12, $13,
      $14, $15, $16
    )
    ON CONFLICT (grade_level, (COALESCE(section_key, '')), subject, topic, (md5(question_text)))
    DO NOTHING
    RETURNING id
    `,
    [
      sectionKey, subject, topic,
      q.type, q.difficulty, language,
      q.question, q.instruction,
      q.options ? JSON.stringify(q.options) : null,
      q.correctAnswer, q.explanation, q.direction, q.source,
      q.requiresCalculator, q.totalMarks, q.estimatedTimeMinutes,
    ],
  );
  return result.rowCount && result.rowCount > 0 ? "inserted" : "skipped";
}

async function seed() {
  const subjectFilter = process.env.SUBJECT_FILTER ?? null;
  const sectionFilter = process.env.SECTION_FILTER ?? null;

  let attempted = 0, inserted = 0, skipped = 0;

  for (const [key, qs] of Object.entries(QUESTIONS_FALLBACK_3EME)) {
    const targets = resolveTargets(key);
    if (targets.length === 0) {
      console.warn(`  ⚠️ unresolved key, skipping: ${key}`);
      continue;
    }
    for (const target of targets) {
      if (subjectFilter && target.subject !== subjectFilter) continue;
      if (sectionFilter) {
        if (sectionFilter === "null" ? target.sectionKey !== null : target.sectionKey !== sectionFilter) continue;
      }
      for (const q of qs) {
        attempted++;
        const r = await insertOne(target.sectionKey, target.subject, target.topic, q);
        if (r === "inserted") inserted++; else skipped++;
      }
    }
  }

  console.log(`\n3eme seed complete.`);
  console.log(`  attempted: ${attempted}`);
  console.log(`  inserted:  ${inserted}`);
  console.log(`  skipped:   ${skipped} (already present)`);
  await pool.end();
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
