/**
 * Dry-run companion to seed-1ere-starter.ts.
 * Prints counts per subject. No DB connection, no inserts.
 */

import { QUESTIONS_FALLBACK } from "../../frontend/etude-plus/src/lib/questionsFallback";

const bySubject = new Map<string, { total: number; rtl: number; mcq: number; problem: number; short: number }>();
let total = 0;

for (const [key, qs] of Object.entries(QUESTIONS_FALLBACK)) {
  const parts = key.split("/");
  if (parts.length < 3) continue;
  if (parts[0] !== "1ere_secondaire") continue;
  const subject = parts.length === 3 ? parts[1] : parts[2];
  if (!bySubject.has(subject)) {
    bySubject.set(subject, { total: 0, rtl: 0, mcq: 0, problem: 0, short: 0 });
  }
  const bucket = bySubject.get(subject)!;
  for (const q of qs) {
    bucket.total++;
    total++;
    if (q.direction === "rtl") bucket.rtl++;
    if (q.type === "multiple-choice") bucket.mcq++;
    else if (q.type === "problem-solving") bucket.problem++;
    else if (q.type === "short-answer") bucket.short++;
  }
}

console.log("\nWill insert into Neon (status=published, source=manual-starter):\n");
console.log("subject                 total  mcq  problem  short  rtl");
console.log("──────────────────────  ─────  ───  ───────  ─────  ───");
for (const [subject, b] of bySubject) {
  console.log(
    `${subject.padEnd(22)}  ${String(b.total).padStart(5)}  ${String(b.mcq).padStart(3)}  ${String(b.problem).padStart(7)}  ${String(b.short).padStart(5)}  ${String(b.rtl).padStart(3)}`,
  );
}
console.log(`\nTOTAL: ${total} 1ère questions across ${bySubject.size} subjects.`);
