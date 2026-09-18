/**
 * Dry-run preview for the 2eme starter seed. No DB connection, no inserts.
 *
 * Prints:
 *   - Count by track (shared vs each section_key)
 *   - Count by subject within each track
 *   - Per-chapter counts and lists any chapter with 0 questions
 *   - Special accounting for the Sciences-Math → TI-Math duplication
 *
 * Run:
 *   cd backend && npx tsx scripts/seed-2eme-starter-dryrun.ts
 */

import {
  QUESTIONS_FALLBACK_2EME,
  MATH_SCIENCES_DUPLICATE_TO_TI,
} from "../../frontend/etude-plus/src/lib/questionsFallback2eme";
import { CURRICULUM_FALLBACK } from "../../frontend/etude-plus/src/lib/curriculumFallback";

const KNOWN_2EME_SECTIONS = new Set([
  "lettres",
  "sciences",
  "economie_services",
  "technologie_informatique",
]);

// Multi-segment subjects (their official name contains a literal "/"). The
// parser must NOT split these by slash. Order: longest first.
const KNOWN_MULTI_SUBJECTS = ["Économie / Gestion"];

/** Chapter names may contain "/". Multi-segment subjects too. So we identify
 *  the first 2 or 3 segments conservatively and lump the rest as the topic. */
function parseKey(key: string): {
  gradeLevel: string;
  sectionKey: string | null;
  subject: string;
  topic: string;
} | null {
  const parts = key.split("/");
  if (parts.length < 3) return null;
  const gradeLevel = parts[0];
  let head: string;
  let sectionKey: string | null;
  let remainder: string;
  if (KNOWN_2EME_SECTIONS.has(parts[1])) {
    sectionKey = parts[1];
    head = `${gradeLevel}/${sectionKey}/`;
    remainder = key.slice(head.length);
  } else {
    sectionKey = null;
    head = `${gradeLevel}/`;
    remainder = key.slice(head.length);
  }
  for (const ms of KNOWN_MULTI_SUBJECTS) {
    if (remainder.startsWith(ms + "/")) {
      return { gradeLevel, sectionKey, subject: ms, topic: remainder.slice(ms.length + 1) };
    }
  }
  const firstSlash = remainder.indexOf("/");
  if (firstSlash < 0) return null;
  return {
    gradeLevel,
    sectionKey,
    subject: remainder.slice(0, firstSlash),
    topic: remainder.slice(firstSlash + 1),
  };
}

interface Row { track: string; subject: string; chapter: string; n: number }
const rows: Row[] = [];
const TRACK_LABEL: Record<string, string> = {
  "null": "shared",
  "lettres": "2eme Lettres",
  "sciences": "2eme Sciences",
  "economie_services": "2eme Économie et Services",
  "technologie_informatique": "2eme Technologies de l'informatique",
};

for (const [key, qs] of Object.entries(QUESTIONS_FALLBACK_2EME)) {
  const parsed = parseKey(key);
  if (!parsed) continue;
  if (parsed.gradeLevel !== "2eme") continue;

  const trackKey = parsed.sectionKey ?? "null";
  rows.push({
    track: TRACK_LABEL[trackKey] ?? trackKey,
    subject: parsed.subject,
    chapter: parsed.topic,
    n: qs.length,
  });

  // Sciences Math is also duplicated under technologie_informatique by the seed.
  if (MATH_SCIENCES_DUPLICATE_TO_TI && parsed.sectionKey === "sciences" && parsed.subject === "Mathématiques") {
    rows.push({
      track: TRACK_LABEL["technologie_informatique"],
      subject: "Mathématiques (dup. from Sciences)",
      chapter: parsed.topic,
      n: qs.length,
    });
  }
}

// ── Track + subject totals ───────────────────────────────────────────────────
const trackSubjectTotals = new Map<string, Map<string, number>>();
for (const r of rows) {
  if (!trackSubjectTotals.has(r.track)) trackSubjectTotals.set(r.track, new Map());
  const m = trackSubjectTotals.get(r.track)!;
  m.set(r.subject, (m.get(r.subject) ?? 0) + r.n);
}

console.log("\n=== Counts by track / subject ===");
for (const [track, m] of trackSubjectTotals) {
  let trackTotal = 0;
  console.log(`\n[${track}]`);
  const subjects = [...m.entries()].sort();
  for (const [subject, n] of subjects) {
    trackTotal += n;
    console.log(`  ${subject.padEnd(38)} ${String(n).padStart(4)}`);
  }
  console.log(`  ${"TOTAL".padEnd(38)} ${String(trackTotal).padStart(4)}`);
}

const grand = rows.reduce((s, r) => s + r.n, 0);
console.log(`\nGRAND TOTAL rows to insert: ${grand}`);

// ── Math-per-track breakdown (per user spec) ─────────────────────────────────
console.log("\n=== Math per track (must be track-separated) ===");
for (const track of ["lettres", "sciences", "economie_services", "technologie_informatique"]) {
  const label = TRACK_LABEL[track];
  let cnt = 0;
  for (const r of rows) {
    if (r.track === label && (r.subject === "Mathématiques" || r.subject.startsWith("Mathématiques "))) {
      cnt += r.n;
    }
  }
  console.log(`  ${label.padEnd(40)} ${cnt}`);
}

// ── Coverage check: any 2eme chapter with 0 questions after dup expansion? ──
const generated = new Set<string>();
for (const [key] of Object.entries(QUESTIONS_FALLBACK_2EME)) {
  if (key.startsWith("2eme/")) {
    generated.add(key);
    // Mirror sciences/Mathématiques → technologie_informatique/Mathématiques
    if (MATH_SCIENCES_DUPLICATE_TO_TI && key.startsWith("2eme/sciences/Mathématiques/")) {
      generated.add(key.replace("/sciences/", "/technologie_informatique/"));
    }
  }
}

const empty: string[] = [];
for (const [currKey, chapters] of Object.entries(CURRICULUM_FALLBACK)) {
  if (!currKey.startsWith("2eme/")) continue;
  for (const c of chapters) {
    const fullKey = `${currKey}/${c.name}`;
    if (!generated.has(fullKey)) empty.push(fullKey);
  }
}

// Classify empties so the user sees what's INTENTIONALLY left empty
// (curriculum book entries that aren't real teaching chapters).
function classify(k: string): "anglais-meta" | "arabe-meta" | "info-subentry" | "gestion-section" | "real-gap" {
  if (k.startsWith("2eme/Anglais/")) {
    const tail = k.slice("2eme/Anglais/".length);
    const META_PATTERNS = [
      "Preface", "Book Map", "Diagnostic Test", "Self-Reflection", "Review Module",
      "Grammar Summary", "New words per lesson", "Irregular verbs list", "Phonetic Symbols",
      "Progress Check",
    ];
    if (META_PATTERNS.some(p => tail.includes(p))) return "anglais-meta";
  }
  if (k.startsWith("2eme/Arabe/") && (k.includes("علي محمود طه حلقة") || k.includes("خاتمة الكتاب"))) return "arabe-meta";
  if (k.startsWith("2eme/technologie_informatique/Informatique/") && /^(Introduction|Présentation|Les principales fonctions|Apprentissage|Les différents types|Les logistiques|La production|Projet|Spécification|Écriture|Traduction|Exécutions|La structure)/.test(k.split("/").slice(-1)[0])) return "info-subentry";
  return "real-gap";
}

const buckets: Record<string, string[]> = { "anglais-meta": [], "arabe-meta": [], "info-subentry": [], "gestion-section": [], "real-gap": [] };
for (const k of empty) buckets[classify(k)].push(k);

console.log(`\n=== Chapters with 0 generated questions: ${empty.length} ===`);
console.log(`  anglais-meta (book headings, intentionally skipped):  ${buckets["anglais-meta"].length}`);
console.log(`  arabe-meta (bibliographic / supplementary):           ${buckets["arabe-meta"].length}`);
console.log(`  info-subentry (sub-section of Info chapter):          ${buckets["info-subentry"].length}`);
console.log(`  real-gap (would need a question):                     ${buckets["real-gap"].length}`);

if (buckets["real-gap"].length) {
  console.log("\n--- Real gaps (chapters that should probably have a question) ---");
  for (const k of buckets["real-gap"]) console.log(`  ${k}`);
}

console.log("\nNOTE: Math written once under sciences/Mathématiques; seed inserts it twice (sciences + technologie_informatique).");
