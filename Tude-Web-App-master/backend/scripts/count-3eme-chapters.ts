import { CURRICULUM_FALLBACK } from "../../frontend/etude-plus/src/lib/curriculumFallback";

const rows: Array<{ key: string; n: number }> = [];
let total = 0;
for (const [key, chs] of Object.entries(CURRICULUM_FALLBACK)) {
  if (!key.startsWith("3eme/")) continue;
  rows.push({ key, n: chs.length });
  total += chs.length;
}
rows.sort((a, b) => a.key.localeCompare(b.key));
for (const r of rows) console.log(`${r.n.toString().padStart(4)}  ${r.key}`);
console.log(`\nTotal 3eme chapter entries: ${total} across ${rows.length} curriculum keys`);
