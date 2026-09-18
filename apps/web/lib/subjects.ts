export const SUBJECT_COLORS: Record<string, string> = {
  Mathématiques: "bg-blue-500/10 border-blue-200",
  "Physique-Chimie": "bg-purple-500/10 border-purple-200",
  "Sciences Naturelles": "bg-green-500/10 border-green-200",
  SVT: "bg-lime-500/10 border-lime-200",
  Arabe: "bg-amber-500/10 border-amber-200",
  Français: "bg-rose-500/10 border-rose-200",
  Anglais: "bg-sky-500/10 border-sky-200",
  "Histoire-Géographie": "bg-orange-500/10 border-orange-200",
  Histoire: "bg-orange-500/10 border-orange-200",
  Géographie: "bg-yellow-500/10 border-yellow-200",
  Informatique: "bg-teal-500/10 border-teal-200",
  Philosophie: "bg-indigo-500/10 border-indigo-200",
};

export const SUBJECT_EMOJIS: Record<string, string> = {
  Mathématiques: "📐",
  "Physique-Chimie": "⚗️",
  "Sciences Naturelles": "🌿",
  SVT: "🔬",
  Arabe: "📖",
  Français: "🇫🇷",
  Anglais: "🇬🇧",
  "Histoire-Géographie": "🌍",
  Histoire: "📜",
  Géographie: "🗺️",
  Informatique: "💻",
  Philosophie: "🧠",
  Économie: "📊",
  Sport: "🏃",
};

export function subjectColor(s: string) {
  return SUBJECT_COLORS[s] ?? "bg-muted border-border";
}
export function subjectEmoji(s: string) {
  return SUBJECT_EMOJIS[s] ?? "📘";
}

export function slugifySubject(s: string) {
  return encodeURIComponent(s);
}
export function unslugSubject(s: string) {
  return decodeURIComponent(s);
}
