/**
 * Single source of truth for the Tunisian education system structure.
 * Keep in sync with artifacts/api-server/src/lib/educationConfig.ts
 *
 * Two categories:
 *   SIMPLE_LEVELS  — no section needed (collège + 1ère secondaire)
 *   SECTION_LEVELS — require a section key (2ème, 3ème, Bac)
 */

// ── Simple levels (no section) ───────────────────────────────────────────────

export const SIMPLE_LEVELS = {
  "7eme": {
    label: "7ème année de base",
    shortLabel: "7ème",
    cycle: "college" as const,
    subjects: [
      "Mathématiques", "Arabe", "Français", "Sciences Naturelles",
      "Histoire-Géographie", "Éducation Civique", "Anglais", "Sport",
      "Éducation Artistique", "Éducation Musicale",
    ],
  },
  "8eme": {
    label: "8ème année de base",
    shortLabel: "8ème",
    cycle: "college" as const,
    subjects: [
      "Mathématiques", "Arabe", "Français", "Sciences Naturelles",
      "Physique-Chimie", "Histoire-Géographie", "Éducation Civique",
      "Anglais", "Sport", "Éducation Artistique", "Éducation Musicale",
    ],
  },
  "9eme": {
    label: "9ème année de base",
    shortLabel: "9ème",
    cycle: "college" as const,
    subjects: [
      "Mathématiques", "Arabe", "Français", "Sciences Naturelles",
      "Physique-Chimie", "Histoire-Géographie", "Éducation Civique",
      "Anglais", "Allemand", "Sport", "Éducation Artistique", "Éducation Musicale",
    ],
  },
  "1ere_secondaire": {
    label: "1ère année secondaire",
    shortLabel: "1ère Sec",
    cycle: "lycee" as const,
    subjects: [
      "Mathématiques", "Arabe", "Français", "Anglais",
      "Sciences Naturelles", "Physique-Chimie",
      "Histoire", "Géographie",
      "Technique", "Éducation Islamique",
    ],
  },
} as const;

// ── Section levels (require a section key) ───────────────────────────────────

export const SECTION_LEVELS = {
  // 2ème: 4 official orientations (meslak)
  "2eme": {
    label: "2ème secondaire",
    shortLabel: "2ème",
    cycle: "lycee" as const,
    sections: {
      "lettres": {
        label: "Lettres",
        subjects: [
          "Arabe", "Français", "Anglais", "Histoire", "Géographie",
          "Éducation Islamique", "Éducation Civique", "Mathématiques", "SVT",
        ],
      },
      "sciences": {
        label: "Sciences",
        subjects: [
          "Mathématiques", "Physique-Chimie", "SVT",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Éducation Islamique", "Éducation Civique",
        ],
      },
      "economie_services": {
        label: "Économie et Services",
        subjects: [
          "Mathématiques", "Économie / Gestion",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Éducation Islamique", "Éducation Civique",
        ],
      },
      "technologie_informatique": {
        label: "Technologie de l'Informatique",
        subjects: [
          "Mathématiques", "Physique-Chimie", "Informatique",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Éducation Islamique", "Éducation Civique",
        ],
      },
    },
  },
  // 3ème: 6 official sections (shu'ba)
  // Éducation Islamique and Éducation Civique omitted — no valid lycée 3ème curriculum yet.
  // Physique-Chimie omitted from Sciences techniques and Sciences de l'informatique.
  // Informatique omitted from Sciences de l'informatique — track has Algorithmique, SER, TIC.
  "3eme": {
    label: "3ème année",
    shortLabel: "3ème",
    cycle: "lycee" as const,
    sections: {
      "lettres": {
        label: "Lettres",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Informatique", "SVT", "Philosophie",
        ],
      },
      "mathematiques": {
        label: "Mathématiques",
        subjects: [
          "Mathématiques", "Physique-Chimie", "SVT",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Informatique", "Philosophie",
        ],
      },
      "sciences_experimentales": {
        label: "Sciences expérimentales",
        subjects: [
          "Mathématiques", "Physique-Chimie", "SVT",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Informatique", "Philosophie",
        ],
      },
      "sciences_techniques": {
        label: "Sciences techniques",
        subjects: [
          "Mathématiques", "Génie Électrique", "Génie Mécanique",
          "Informatique",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
      "economie_gestion": {
        label: "Économie et Gestion",
        subjects: [
          "Mathématiques", "Économie", "Gestion",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "Informatique", "Philosophie",
        ],
      },
      "sciences_informatique": {
        label: "Sciences de l'informatique",
        subjects: [
          "Mathématiques",
          "Algorithmique et Programmation",
          "Systèmes d'exploitation et Réseaux",
          "TIC",
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
    },
  },
  // Bac: 6 official sections (shu'ba) — same keys as 3ème
  "bac": {
    label: "Baccalauréat",
    shortLabel: "Bac",
    cycle: "lycee" as const,
    sections: {
      "lettres": {
        label: "Lettres",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Histoire", "Géographie",
          "SVT", "Informatique", "Philosophie",
        ],
      },
      "mathematiques": {
        label: "Mathématiques",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Mathématiques", "Physique-Chimie", "SVT", "Informatique",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
      "sciences_experimentales": {
        label: "Sciences Expérimentales",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Mathématiques", "Physique-Chimie", "SVT", "Informatique",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
      "sciences_techniques": {
        label: "Sciences Techniques",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Mathématiques", "Physique-Chimie", "Informatique",
          "Génie Électrique", "Génie Mécanique",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
      "economie_gestion": {
        label: "Économie et Gestion",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Mathématiques", "Économie", "Gestion", "Informatique",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
      "sciences_informatique": {
        label: "Sciences de l'Informatique",
        subjects: [
          "Arabe", "Français", "Anglais",
          "Mathématiques", "Physique-Chimie",
          "Algorithmique et Programmation", "Bases de Données", "TIC",
          "Histoire", "Géographie", "Philosophie",
        ],
      },
    },
  },
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type SimpleNiveauKey = keyof typeof SIMPLE_LEVELS;
export type SectionNiveauKey = keyof typeof SECTION_LEVELS;
export type NiveauKey = SimpleNiveauKey | SectionNiveauKey;

// ── Helper functions ──────────────────────────────────────────────────────────

export function isSimpleLevel(key: string): key is SimpleNiveauKey {
  return key in SIMPLE_LEVELS;
}

export function isSectionLevel(key: string): key is SectionNiveauKey {
  return key in SECTION_LEVELS;
}

export function isValidNiveauKey(key: string): boolean {
  return isSimpleLevel(key) || isSectionLevel(key);
}

export function getNiveauLabel(niveauKey: string): string {
  return (SIMPLE_LEVELS as any)[niveauKey]?.label
      ?? (SECTION_LEVELS as any)[niveauKey]?.label
      ?? niveauKey;
}

// Display labels for section keys that existed in old data but are no longer valid.
// Used as a fallback so existing content doesn't show a raw key string.
const LEGACY_SECTION_DISPLAY: Record<string, Record<string, string>> = {
  "2eme": {
    "economie":     "Économie (ancien)",
    "technique":    "Technique (ancien)",
    "sport":        "Sport (ancien)",
    "informatique": "Informatique (ancien)",
  },
  "3eme": {
    "sciences_maths": "Sciences Mathématiques (ancien)",
    "sciences_exp":   "Sciences Expérimentales (ancien)",
    "technique":      "Sciences Techniques (ancien)",
    "economie":       "Économie et Gestion (ancien)",
    "sport":          "Sport (ancien)",
    "informatique":   "Sciences de l'Informatique (ancien)",
  },
  "bac": {
    "sciences_maths": "Sciences Mathématiques (ancien)",
    "sciences_exp":   "Sciences Expérimentales (ancien)",
    "technique":      "Sciences Techniques (ancien)",
    "economie":       "Économie et Gestion (ancien)",
    "sport":          "Sport (ancien)",
    "informatique":   "Sciences de l'Informatique (ancien)",
  },
};

export function getSectionLabel(niveauKey: string, sectionKey: string): string {
  return (SECTION_LEVELS as any)[niveauKey]?.sections?.[sectionKey]?.label
    ?? LEGACY_SECTION_DISPLAY[niveauKey]?.[sectionKey]
    ?? sectionKey;
}

export function getSectionsForNiveau(niveauKey: string): Record<string, { label: string; subjects: readonly string[] }> {
  return (SECTION_LEVELS as any)[niveauKey]?.sections ?? {};
}

export function getSubjectsForNiveauSection(niveauKey: string, sectionKey: string | null): readonly string[] {
  if (sectionKey) {
    return (SECTION_LEVELS as any)[niveauKey]?.sections?.[sectionKey]?.subjects ?? [];
  }
  return (SIMPLE_LEVELS as any)[niveauKey]?.subjects ?? [];
}

/** Parse old compound key "bac_sciences_maths" → { niveauKey: "bac", sectionKey: "sciences_maths" } */
export function parseCompoundKey(key: string): { niveauKey: string; sectionKey: string | null } {
  if (isSimpleLevel(key)) return { niveauKey: key, sectionKey: null };
  if (isSectionLevel(key)) return { niveauKey: key, sectionKey: null };

  for (const niveauKey of Object.keys(SECTION_LEVELS)) {
    if (key.startsWith(niveauKey + "_")) {
      return { niveauKey, sectionKey: key.slice(niveauKey.length + 1) };
    }
  }
  return { niveauKey: key, sectionKey: null };
}

// ── Backward-compat EDUCATION_LEVELS (derived) ────────────────────────────────

export const EDUCATION_LEVELS: Record<string, { label: string; shortLabel?: string; cycle?: string; subjects: readonly string[] }> = {
  ...Object.fromEntries(
    Object.entries(SIMPLE_LEVELS).map(([k, v]) => [k, { label: v.label, shortLabel: v.shortLabel, cycle: v.cycle, subjects: v.subjects }])
  ),
  ...Object.fromEntries(
    Object.entries(SECTION_LEVELS).flatMap(([nk, nv]) =>
      Object.entries(nv.sections).map(([sk, sv]) => [
        `${nk}_${sk}`,
        { label: sv.label, cycle: nv.cycle, subjects: sv.subjects },
      ])
    )
  ),
};

export type EducationLevelKey = keyof typeof EDUCATION_LEVELS;
export const VALID_LEVEL_KEYS = Object.keys(EDUCATION_LEVELS) as EducationLevelKey[];

export function getLevelLabel(key: string): string {
  return EDUCATION_LEVELS[key]?.label ?? getNiveauLabel(key);
}

export function getSubjectsForLevel(key: string): readonly string[] {
  return EDUCATION_LEVELS[key]?.subjects ?? [];
}

/** Get the display label for a class — handles both old compound keys and new niveau+section format */
export function getClassLevelLabel(gradeLevel: string, sectionKey?: string | null): string {
  if (sectionKey) {
    return `${getNiveauLabel(gradeLevel)} — ${getSectionLabel(gradeLevel, sectionKey)}`;
  }
  return getLevelLabel(gradeLevel); // handles old compound keys like "bac_sciences_maths"
}

export function isCollegeLevel(key: string): boolean {
  return (SIMPLE_LEVELS as any)[key]?.cycle === "college";
}

// ── Subject URL slugs ─────────────────────────────────────────────────────────

/** Convert a subject display name to a URL-safe slug.
 *  e.g. "Mathématiques" → "mathematiques", "Physique-Chimie" → "physique-chimie" */
export function subjectToSlug(subject: string): string {
  return subject
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/[''ʼ]/g, "-")           // apostrophes → hyphen
    .replace(/[^a-zA-Z0-9]+/g, "-")   // non-alphanumeric → hyphen
    .replace(/-+/g, "-")              // collapse consecutive hyphens
    .replace(/^-|-$/g, "")            // trim
    .toLowerCase();
}

/** Reverse a slug back to the canonical subject display name, or null if not found. */
export function subjectFromSlug(slug: string): string | null {
  return ALL_SUBJECTS.find(s => subjectToSlug(s) === slug) ?? null;
}

/** All unique subjects across all levels */
export const ALL_SUBJECTS: string[] = [
  ...new Set([
    ...Object.values(SIMPLE_LEVELS).flatMap(l => [...l.subjects]),
    ...Object.values(SECTION_LEVELS).flatMap(nv => Object.values(nv.sections).flatMap(s => [...s.subjects])),
  ]),
].sort((a, b) => a.localeCompare(b, "fr"));

// ── Cycle visibility flag ─────────────────────────────────────────────────────
/**
 * Controls which education cycles appear in student-facing level pickers.
 *
 * To re-enable Collège:  change to  ["college", "lycee"]
 * To add Primaire later: add        "primaire"
 */
export const ENABLED_CYCLES: readonly ("college" | "lycee")[] = ["lycee"] as const;

export function isCycleEnabled(cycle: "college" | "lycee"): boolean {
  return (ENABLED_CYCLES as readonly string[]).includes(cycle);
}

// ── ─────────────────────────────────────────────────────────────────────────────

/** Grouped tree — all groups use compound keys so professor registration stays backward-compat */
export const LEVEL_TREE = [
  {
    id: "college" as const,
    label: "Collège",
    sub: "7ème – 9ème de base",
    levels: [
      { key: "7eme", label: "7ème année" },
      { key: "8eme", label: "8ème année" },
      { key: "9eme", label: "9ème année" },
    ],
  },
  {
    id: "lycee_1" as const,
    label: "1ère Secondaire",
    sub: "Tronc commun",
    levels: [{ key: "1ere_secondaire", label: "1ère année secondaire" }],
  },
  {
    id: "lycee_2" as const,
    label: "2ème Secondaire",
    sub: "Choisir une orientation",
    levels: Object.entries(SECTION_LEVELS["2eme"].sections).map(([sk, sv]) => ({ key: `2eme_${sk}`, label: sv.label })),
  },
  {
    id: "3eme" as const,
    label: "3ème Année",
    sub: "Choisir une section",
    levels: Object.entries(SECTION_LEVELS["3eme"].sections).map(([sk, sv]) => ({ key: `3eme_${sk}`, label: sv.label })),
  },
  {
    id: "bac" as const,
    label: "Baccalauréat",
    sub: "Choisir une section",
    levels: Object.entries(SECTION_LEVELS["bac"].sections).map(([sk, sv]) => ({ key: `bac_${sk}`, label: sv.label })),
  },
];
