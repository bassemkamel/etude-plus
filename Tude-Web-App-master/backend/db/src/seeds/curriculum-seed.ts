/**
 * Curriculum seed — Tunisian secondary education structure.
 *
 * Run with:  DATABASE_URL=... npx tsx src/seeds/curriculum-seed.ts
 *
 * Idempotency strategy:
 *   - Subjects: INSERT ... ON CONFLICT DO NOTHING (keyed on code + name)
 *   - 1ère secondaire chapters: DELETE then re-insert (official curriculum, replace placeholders)
 *   - All other levels: INSERT ... ON CONFLICT DO NOTHING (safe to re-run)
 *
 * Chapter "name" values MUST exactly match the "topic" field written by
 * knowledgeBaseProcessor.ts — so that the LEFT JOIN count queries work.
 */

import { db } from "../index.js";
import { curriculumSubjectsTable, curriculumChaptersTable } from "../schema/curriculum.js";
import { eq } from "drizzle-orm";

// ── helpers ────────────────────────────────────────────────────────────────────

function slug(name: string): string {
  // Strip Latin accents
  const stripped = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Keep Latin alphanum + Arabic Unicode block
  const safe = stripped
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "chapter";
}

type ChapterDef = {
  levelCode:  string;
  sectionKey: string | null;
  subject:    string;
  name:       string;
  shortName?: string;
  order:      number;
};

// ── SUBJECTS ──────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { code: "mathematiques",         name: "Mathématiques",                          icon: "📐", colorClass: "bg-blue-500/10 border-blue-200",     order: 1  },
  { code: "physique-chimie",       name: "Physique-Chimie",                        icon: "⚗️", colorClass: "bg-purple-500/10 border-purple-200",  order: 2  },
  { code: "sciences-naturelles",   name: "Sciences Naturelles",                    icon: "🌿", colorClass: "bg-green-500/10 border-green-200",    order: 3  },
  { code: "arabe",                 name: "Arabe",                                  icon: "📖", colorClass: "bg-amber-500/10 border-amber-200",    order: 4  },
  { code: "francais",              name: "Français",                               icon: "🇫🇷", colorClass: "bg-rose-500/10 border-rose-200",      order: 5  },
  { code: "anglais",               name: "Anglais",                                icon: "🇬🇧", colorClass: "bg-sky-500/10 border-sky-200",        order: 6  },
  { code: "philosophie",           name: "Philosophie",                            icon: "🧠", colorClass: "bg-indigo-500/10 border-indigo-200",  order: 7  },
  { code: "histoire-geographie",   name: "Histoire-Géographie",                    icon: "🌍", colorClass: "bg-orange-500/10 border-orange-200",  order: 8  },
  { code: "informatique",          name: "Informatique",                           icon: "💻", colorClass: "bg-teal-500/10 border-teal-200",      order: 9  },
  { code: "sport",                 name: "Sport",                                  icon: "🏃", colorClass: "bg-yellow-500/10 border-yellow-200",  order: 10 },
  { code: "economie",              name: "Économie",                               icon: "📊", colorClass: "bg-emerald-500/10 border-emerald-200",order: 11 },
  { code: "gestion",               name: "Gestion",                                icon: "📋", colorClass: "bg-cyan-500/10 border-cyan-200",      order: 12 },
  { code: "comptabilite",          name: "Comptabilité",                           icon: "🧾", colorClass: "bg-slate-500/10 border-slate-200",    order: 13 },
  { code: "technologie",           name: "Technologie",                            icon: "⚙️", colorClass: "bg-zinc-500/10 border-zinc-200",      order: 14 },
  // ── Subjects specific to 1ère secondaire ──────────────────────────────────
  { code: "svt",                   name: "Sciences de la Vie et de la Terre",      icon: "🔬", colorClass: "bg-lime-500/10 border-lime-200",      order: 15 },
  { code: "sciences-physiques",    name: "Sciences Physiques",                     icon: "⚡", colorClass: "bg-violet-500/10 border-violet-200",  order: 16 },
  { code: "geographie-ar",         name: "الجغرافيا",                              icon: "🗺️", colorClass: "bg-amber-600/10 border-amber-300",    order: 17 },
  { code: "histoire-ar",           name: "التاريخ",                                icon: "📜", colorClass: "bg-orange-600/10 border-orange-300",  order: 18 },
  { code: "arabe-islamique",       name: "اللغة العربية / التربية الإسلامية",      icon: "☪️", colorClass: "bg-teal-600/10 border-teal-300",      order: 19 },
];

// ── CHAPTERS ──────────────────────────────────────────────────────────────────
// sectionKey = null means chapter applies to ALL tracks of that level.

const CHAPTERS: ChapterDef[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // 1ÈRE ANNÉE SECONDAIRE — TRONC COMMUN (section_key: null)
  // Official Tunisian Ministry of Education curriculum (2024/2025)
  // ════════════════════════════════════════════════════════════════════════════

  // ── Mathématiques 1ère ───────────────────────────────────────────────────
  // Source: programme officiel Mathématiques 1ère secondaire (MEN Tunisie)
  // Travaux géométriques
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Angles",                                                                              shortName: "Travaux géométriques", order: 1  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Théorème de Thalès et sa réciproque",                                                 shortName: "Travaux géométriques", order: 2  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Rapports trigonométriques d'un angle aigu; Relations métriques dans un triangle rectangle", shortName: "Travaux géométriques", order: 3  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Vecteurs et translations",                                                            shortName: "Travaux géométriques", order: 4  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Somme de deux vecteurs - Vecteurs colinéaires",                                       shortName: "Travaux géométriques", order: 5  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Activités dans un repère",                                                            shortName: "Travaux géométriques", order: 6  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Quart de tour",                                                                       shortName: "Travaux géométriques", order: 7  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Sections planes d'un solide",                                                        shortName: "Travaux géométriques", order: 8  },
  // Travaux numériques
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Activités numériques I",                                                             shortName: "Travaux numériques",   order: 9  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Activités numériques II",                                                            shortName: "Travaux numériques",   order: 10 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Activités algébriques",                                                              shortName: "Travaux numériques",   order: 11 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Fonctions linéaires",                                                                shortName: "Travaux numériques",   order: 12 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Équations et inéquations du premier degré à une inconnue",                           shortName: "Travaux numériques",   order: 13 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Fonctions affines",                                                                  shortName: "Travaux numériques",   order: 14 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Systèmes de deux équations à deux inconnues",                                        shortName: "Travaux numériques",   order: 15 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Mathématiques", name: "Exploitation de l'information",                                                      shortName: "Travaux numériques",   order: 16 },

  // ── Technologie 1ère ──────────────────────────────────────────────────────
  // Analyse fonctionnelle
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Analyse fonctionnelle d'un système technique",                                          shortName: "Analyse fonctionnelle",                    order: 1  },
  // Analyse structurelle et conception
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Lecture d'un dessin d'ensemble",                                                       shortName: "Analyse structurelle et conception",       order: 2  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Graphe de montage et graphe de démontage",                                             shortName: "Analyse structurelle et conception",       order: 3  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Dessin de définition",                                                                 shortName: "Analyse structurelle et conception",       order: 4  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Dessin assisté par ordinateur (DAO)",                                                  shortName: "Analyse structurelle et conception",       order: 5  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Liaisons mécaniques",                                                                  shortName: "Analyse structurelle et conception",       order: 6  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Systèmes combinatoires",                                                               shortName: "Analyse structurelle et conception",       order: 7  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Transmission de puissance",                                                            shortName: "Analyse structurelle et conception",       order: 8  },
  // Les matériaux utilisés
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Matériaux utilisés",                                                                   shortName: "Les matériaux utilisés",                   order: 9  },
  // Les énergies mises en œuvre
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Énergies renouvelables",                                                               shortName: "Les énergies mises en œuvre",              order: 10 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Convertisseurs statiques d'énergie électrique",                                        shortName: "Les énergies mises en œuvre",              order: 11 },
  // Réalisation et production
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Projet 1: Robot suiveur de ligne et éviteur d'obstacles",                              shortName: "Réalisation et production",                order: 12 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Programmation d'une carte de commande d'un système embarqué",                          shortName: "Réalisation et production",                order: 13 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Procédés de mise en forme des matériaux",                                              shortName: "Réalisation et production",                order: 14 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Procédés et typologie des assemblages",                                                shortName: "Réalisation et production",                order: 15 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Contrôle des composants",                                                              shortName: "Réalisation et production",                order: 16 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Projet 2: Lampe connectée",                                                            shortName: "Réalisation et production",                order: 17 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Technologie", name: "Fonction interfaçage",                                                                 shortName: "Réalisation et production",                order: 18 },

  // ── Sciences de la Vie et de la Terre 1ère ───────────────────────────────
  // Partie 1: Amélioration de la production végétale
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "La nutrition minérale",              shortName: "Amélioration de la production végétale", order: 1 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "La nutrition carbonée",             shortName: "Amélioration de la production végétale", order: 2 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "La multiplication végétative",      shortName: "Amélioration de la production végétale", order: 3 },
  // Partie 2: Microbes et santé
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "La diversité du monde microbien",                     shortName: "Microbes et santé", order: 4 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "Les agents pathogènes et les maladies infectieuses",   shortName: "Microbes et santé", order: 5 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "La défense de l'organisme",                           shortName: "Microbes et santé", order: 6 },
  // Partie 3: Découverte et gestion des ressources géologiques
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "Étude d'un site géologique",                                                                    shortName: "Découverte et gestion des ressources géologiques", order: 7 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences de la Vie et de la Terre", name: "Exploitation et gestion d'une roche à intérêt économique: le phosphate",                        shortName: "Découverte et gestion des ressources géologiques", order: 8 },

  // ── Français 1ère — modules officiels ────────────────────────────────────
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 1: Rencontres",                       shortName: "Module 1", order: 1 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 2: Scènes de la vie en France",       shortName: "Module 2", order: 2 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 3: Jeunesse sans frontières",         shortName: "Module 3", order: 3 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 4: La société de consommation",       shortName: "Module 4", order: 4 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 5: Sauvons la planète Terre",         shortName: "Module 5", order: 5 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 6: Passions",                         shortName: "Module 6", order: 6 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Français", name: "Module 7: Progrès et bonheur",               shortName: "Module 7", order: 7 },

  // ── الجغرافيا 1ère ────────────────────────────────────────────────────────
  // الوحدة 1: الإنسان يعمر الأرض
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "التوزع الجغرافي للسكان",                             shortName: "الوحدة 1: الإنسان يعمر الأرض",                     order: 1  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الحركة الديمغرافية للسكان",                          shortName: "الوحدة 1: الإنسان يعمر الأرض",                     order: 2  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الحركية المجالية للسكان",                            shortName: "الوحدة 1: الإنسان يعمر الأرض",                     order: 3  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الانفجار الحضري",                                   shortName: "الوحدة 1: الإنسان يعمر الأرض",                     order: 4  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "تركيبة المدينة: دراسة حالة: القاهرة",               shortName: "الوحدة 1: الإنسان يعمر الأرض",                     order: 5  },
  // الوحدة 2: الإنسان يستثمر الموارد الطبيعية
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الموارد المائية",                                   shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 6  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الموارد المائية وتوزعها الجغرافي",                   shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 7  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "تعبئة المياه",                                      shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 8  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "رهانات الماء",                                      shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 9  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الموارد النفطية",                                   shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 10 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الموارد النفطية: الإنتاج والاستهلاك والمبادلات",    shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 11 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "رهانات النفط",                                      shortName: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية",        order: 12 },
  // الوحدة 3: الإنسان والأوساط الطبيعية
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الإنسان والوسط الطبيعي",                            shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",              order: 13 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "من المخاطر إلى الكوارث: الزلازل والبراكين",         shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",              order: 14 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "من المخاطر إلى الكوارث: الفيضانات",                 shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",              order: 15 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "تدهور الأوساط الطبيعية: مثال التصحر",               shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",              order: 16 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "تدهور الأوساط الطبيعية: مثال تدهور الغابة المتوسطية", shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",            order: 17 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "تدهور الأوساط الطبيعية: تعرية السواحل",             shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",              order: 18 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "الجغرافيا", name: "الخضرسة",                                           shortName: "الوحدة 3: الإنسان والأوساط الطبيعية",              order: 19 },

  // ── التاريخ 1ère ──────────────────────────────────────────────────────────
  // الوحدة الأولى: قرطاج
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الخصوصيات الحضارية",                              shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 1  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "المؤسسات السياسية",                               shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 2  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الديانة",                                        shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 3  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "إشعاع قرطاج",                                    shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 4  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الميناء والتوسع التجاري",                         shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 5  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "موسوعة ماغون",                                   shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 6  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "عبقرية حنبعل",                                   shortName: "قرطاج البونية وإشعاعها في المتوسط",              order: 7  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الازدهار العمراني",                               shortName: "قرطاج وإسهاماتها في الحضارة الرومانية",          order: 8  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الازدهار الاقتصادي: الفلاحة",                    shortName: "قرطاج وإسهاماتها في الحضارة الرومانية",          order: 9  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "أبوليوس",                                        shortName: "قرطاج وإسهاماتها في الحضارة الرومانية",          order: 10 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "القديس أوغسطينوس",                               shortName: "قرطاج وإسهاماتها في الحضارة الرومانية",          order: 11 },
  // الوحدة الثانية: القيروان وتونس
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "القيروان قاعدة الانتشار العربي الإسلامي",          shortName: "القيروان ودورها في نشر الحضارة العربية الإسلامية", order: 12 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الدور الاقتصادي للقيروان: أهمية النشاط التجاري", shortName: "القيروان ودورها في نشر الحضارة العربية الإسلامية", order: 13 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "خصائص العمارة",                                  shortName: "القيروان ودورها في نشر الحضارة العربية الإسلامية", order: 14 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الإشعاع الفكري",                                 shortName: "القيروان ودورها في نشر الحضارة العربية الإسلامية", order: 15 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "عمارة مدينة تونس",                               shortName: "تونس في العهد الحفصي مركز إشعاع ثقافي",          order: 16 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "عبد الرحمان بن خلدون",                           shortName: "تونس في العهد الحفصي مركز إشعاع ثقافي",          order: 17 },
  // الوحدة الثالثة: الإصلاح والتحديث
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "إضاءات حول تاريخ تونس في العصر الحديث",          shortName: "البلاد التونسية من الإصلاح إلى التحديث",          order: 18 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "الفكر الإصلاحي",                                 shortName: "البلاد التونسية من الإصلاح إلى التحديث",          order: 19 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "التجربة التونسية في مقاومة الاستعمار",            shortName: "البلاد التونسية من الإصلاح إلى التحديث",          order: 20 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "التاريخ", name: "تعصير الدولة وتحديث المجتمع",                    shortName: "البلاد التونسية من الإصلاح إلى التحديث",          order: 21 },

  // ── اللغة العربية / التربية الإسلامية 1ère ───────────────────────────────
  // فهمي لعقيدتي أعمق
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "تلازم أركان العقيدة",                                                  shortName: "فهمي لعقيدتي أعمق",                              order: 1  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "الإيمان عقيدة وممارسة",                                               shortName: "فهمي لعقيدتي أعمق",                              order: 2  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "الإيمان حسن المعاملة: هدي قرآني",                                     shortName: "فهمي لعقيدتي أعمق",                              order: 3  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "تكامل العقل والنقل في إثبات حقيقة الغيب",                             shortName: "فهمي لعقيدتي أعمق",                              order: 4  },
  // أتواصل إيجابيا وأحاور الآخرين
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "طبيعة العلاقات الأسرية في الإسلام",                                   shortName: "أتواصل إيجابيا وأحاور الآخرين",                  order: 5  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "دور الأسرة في الارتقاء بالعلاقات الاجتماعية",                         shortName: "أتواصل إيجابيا وأحاور الآخرين",                  order: 6  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "المجادلة بالحسنى: هدي قرآني",                                         shortName: "أتواصل إيجابيا وأحاور الآخرين",                  order: 7  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "آداب الحوار",                                                          shortName: "أتواصل إيجابيا وأحاور الآخرين",                  order: 8  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "أثر الحوار في تحقيق التواصل بين الأجيال",                             shortName: "أتواصل إيجابيا وأحاور الآخرين",                  order: 9  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "أثر الإيمان في العلاقات الاجتماعية: هدي نبوي",                        shortName: "أتواصل إيجابيا وأحاور الآخرين",                  order: 10 },
  // أتمثل قيم النبوة وأرصد حضورها في التاريخ
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "حقيقة النبوّة ومقتضياتها",                                            shortName: "أتمثل قيم النبوة وأرصد حضورها في التاريخ",       order: 11 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "دور الأنبياء في الارتقاء بالوعي البشري",                              shortName: "أتمثل قيم النبوة وأرصد حضورها في التاريخ",       order: 12 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "النبوّة هداية وإصلاح: هدي قرآني",                                     shortName: "أتمثل قيم النبوة وأرصد حضورها في التاريخ",       order: 13 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "الأنبياء بناة الحضارة: هدي نبوي",                                     shortName: "أتمثل قيم النبوة وأرصد حضورها في التاريخ",       order: 14 },
  // أدرك تفاعل الإسلام مع قضايا الواقع
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "الاجتهاد ضرورة شرعية: هدي نبوي",                                      shortName: "أدرك تفاعل الإسلام مع قضايا الواقع",             order: 15 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "التشريع بالنص",                                                        shortName: "أدرك تفاعل الإسلام مع قضايا الواقع",             order: 16 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "التشريع بالاجتهاد المستند إلى أصل سابق",                              shortName: "أدرك تفاعل الإسلام مع قضايا الواقع",             order: 17 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "التشريع بالاستحسان والرأي المستند إلى المصلحة",                       shortName: "أدرك تفاعل الإسلام مع قضايا الواقع",             order: 18 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "خصائص الشريعة الإسلامية",                                             shortName: "أدرك تفاعل الإسلام مع قضايا الواقع",             order: 19 },
  // أتواصل مع الكون والطبيعة
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "دلالات التوحيد",                                                       shortName: "أتواصل مع الكون والطبيعة",                        order: 20 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "أبعاد التوحيد",                                                        shortName: "أتواصل مع الكون والطبيعة",                        order: 21 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "الإنسان والطبيعة: هدي قرآني",                                         shortName: "أتواصل مع الكون والطبيعة",                        order: 22 },
  // بالعمل نرقى
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "قيمة العمل في الإسلام",                                               shortName: "بالعمل نرقى",                                     order: 23 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "دور العمل في تحقيق الذات",                                            shortName: "بالعمل نرقى",                                     order: 24 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "العمل قيمة حضارية",                                                   shortName: "بالعمل نرقى",                                     order: 25 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "اللغة العربية / التربية الإسلامية", name: "مقتضيات الإيمان: هدي قرآني",                                          shortName: "بالعمل نرقى",                                     order: 26 },

  // ── Sciences Physiques 1ère ───────────────────────────────────────────────
  // L'Électricité
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Le phénomène d'électrisation",                              shortName: "L'Électricité", order: 1  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Le circuit électrique",                                     shortName: "L'Électricité", order: 2  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "L'intensité du courant électrique",                         shortName: "L'Électricité", order: 3  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "La tension électrique",                                     shortName: "L'Électricité", order: 4  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Le dipôle résistor",                                        shortName: "L'Électricité", order: 5  },
  // La Matière
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Les états physiques de la matière",                         shortName: "La Matière", order: 6  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Quelques propriétés de la matière",                         shortName: "La Matière", order: 7  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "La masse",                                                  shortName: "La Matière", order: 8  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Les changements d'état physique d'un corps pur",             shortName: "La Matière", order: 9  },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Constitution de la matière",                                shortName: "La Matière", order: 10 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Structure de la matière à l'échelle microscopique",         shortName: "La Matière", order: 11 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Discontinuité de la matière",                               shortName: "La Matière", order: 12 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Atomes et ions simples",                                    shortName: "La Matière", order: 13 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Molécules et ions polyatomiques",                           shortName: "La Matière", order: 14 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Utilisation des modèles moléculaires",                      shortName: "La Matière", order: 15 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Structure de la matière à l'échelle macroscopique",         shortName: "La Matière", order: 16 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Détermination expérimentale du volume molaire d'un liquide ou d'un solide", shortName: "La Matière", order: 17 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "La dissolution",                                            shortName: "La Matière", order: 18 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Les effets thermiques de la dissolution",                   shortName: "La Matière", order: 19 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Concentration d'une solution",                              shortName: "La Matière", order: 20 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Solubilité",                                                shortName: "La Matière", order: 21 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Préparation d'une solution titrée",                         shortName: "La Matière", order: 22 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Notion de réaction chimique",                               shortName: "La Matière", order: 23 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Étude qualitative d'une réaction chimique",                 shortName: "La Matière", order: 24 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Étude quantitative d'une réaction chimique",                shortName: "La Matière", order: 25 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Détermination expérimentale du volume molaire d'un gaz",    shortName: "La Matière", order: 26 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Les hydrocarbures",                                         shortName: "La Matière", order: 27 },
  // La Mécanique
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Le mouvement",                                             shortName: "La Mécanique", order: 28 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Les actions mécaniques",                                   shortName: "La Mécanique", order: 29 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Forces et équilibre",                                      shortName: "La Mécanique", order: 30 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Forces et pression",                                       shortName: "La Mécanique", order: 31 },
  // L'Énergie
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Énergie et contrôle",                                      shortName: "L'Énergie",    order: 32 },
  // L'Astronomie
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "La Terre et l'univers",                                    shortName: "L'Astronomie", order: 33 },
  // L'Optique
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "La lumière et sa propagation",                             shortName: "L'Optique",    order: 34 },
  { levelCode: "1ere_secondaire", sectionKey: null, subject: "Sciences Physiques", name: "Spectre de lumière et vision",                             shortName: "L'Optique",    order: 35 },

  // ════════════════════════════════════════════════════════════════════════════
  // 2ÈME ANNÉE SECONDAIRE
  // ════════════════════════════════════════════════════════════════════════════

  // Languages and Humanities are mostly section_key = null (same across tracks)

  // ── Français 2ème (toutes sections) ─────────────────────────────────────
  { levelCode: "2eme", sectionKey: null, subject: "Français", name: "Le roman et le récit",                                                   order: 1 },
  { levelCode: "2eme", sectionKey: null, subject: "Français", name: "La nouvelle",                                                            order: 2 },
  { levelCode: "2eme", sectionKey: null, subject: "Français", name: "L'argumentation et l'essai",                                             order: 3 },
  { levelCode: "2eme", sectionKey: null, subject: "Français", name: "La poésie — courants et mouvements",                                     order: 4 },
  { levelCode: "2eme", sectionKey: null, subject: "Français", name: "Grammaire : Les propositions subordonnées",                              order: 5 },
  { levelCode: "2eme", sectionKey: null, subject: "Français", name: "Expression écrite — dissertation et commentaire",                        order: 6 },

  // ── Anglais 2ème (toutes sections) ──────────────────────────────────────
  { levelCode: "2eme", sectionKey: null, subject: "Anglais", name: "Unit 1: Identity and Society",                                            order: 1 },
  { levelCode: "2eme", sectionKey: null, subject: "Anglais", name: "Unit 2: Work and Career",                                                 order: 2 },
  { levelCode: "2eme", sectionKey: null, subject: "Anglais", name: "Unit 3: Media and Communication",                                         order: 3 },
  { levelCode: "2eme", sectionKey: null, subject: "Anglais", name: "Unit 4: Globalisation",                                                   order: 4 },
  { levelCode: "2eme", sectionKey: null, subject: "Anglais", name: "Unit 5: Progress and Development",                                        order: 5 },
  { levelCode: "2eme", sectionKey: null, subject: "Anglais", name: "Unit 6: Human Rights",                                                    order: 6 },

  // ── Arabe 2ème (toutes sections) ────────────────────────────────────────
  { levelCode: "2eme", sectionKey: null, subject: "Arabe", name: "الأدب العربي الحديث — النثر",                                              order: 1 },
  { levelCode: "2eme", sectionKey: null, subject: "Arabe", name: "الأدب العربي الحديث — الشعر",                                              order: 2 },
  { levelCode: "2eme", sectionKey: null, subject: "Arabe", name: "قواعد اللغة — النحو المتقدم",                                              order: 3 },
  { levelCode: "2eme", sectionKey: null, subject: "Arabe", name: "البلاغة والأسلوب",                                                          order: 4 },
  { levelCode: "2eme", sectionKey: null, subject: "Arabe", name: "التعبير الكتابي — المقال والتقرير",                                         order: 5 },

  // ── Histoire-Géographie 2ème (toutes sections) ──────────────────────────
  { levelCode: "2eme", sectionKey: null, subject: "Histoire-Géographie", name: "Géographie : Les espaces productifs dans le monde",          order: 1 },
  { levelCode: "2eme", sectionKey: null, subject: "Histoire-Géographie", name: "Géographie : La mondialisation",                             order: 2 },
  { levelCode: "2eme", sectionKey: null, subject: "Histoire-Géographie", name: "Histoire : Le monde entre les deux guerres (1919-1939)",     order: 3 },
  { levelCode: "2eme", sectionKey: null, subject: "Histoire-Géographie", name: "Histoire : La Seconde Guerre mondiale",                      order: 4 },
  { levelCode: "2eme", sectionKey: null, subject: "Histoire-Géographie", name: "Histoire : La Tunisie et l'indépendance",                    order: 5 },
  { levelCode: "2eme", sectionKey: null, subject: "Histoire-Géographie", name: "Histoire : Le monde bipolaire (Guerre froide)",              order: 6 },

  // ── Mathématiques 2ème — Sciences ───────────────────────────────────────
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Les suites numériques",                                       order: 1  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Limite d'une suite",                                          order: 2  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Limite d'une fonction",                                       order: 3  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Continuité d'une fonction",                                   order: 4  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Dérivation — définition et règles de calcul",                 order: 5  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Applications de la dérivation — étude de fonctions",         order: 6  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Fonctions trigonométriques",                                  order: 7  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Dénombrement et probabilités",                               order: 8  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Vecteurs du plan et calcul vectoriel",                        order: 9  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Géométrie analytique dans le plan",                          order: 10 },

  // ── Physique-Chimie 2ème Sciences ────────────────────────────────────────
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Cinématique du point",                                      order: 1  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Dynamique newtonienne — les lois de Newton",                order: 2  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Travail et énergie mécanique",                              order: 3  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Oscillations mécaniques — le pendule simple",              order: 4  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Oscillations mécaniques — système ressort-masse",          order: 5  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Ondes mécaniques progressives",                            order: 6  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Électricité : Le condensateur",                            order: 7  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Électricité : La bobine",                                  order: 8  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Chimie : Les transformations acido-basiques",              order: 9  },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Physique-Chimie", name: "Chimie : L'oxydoréduction",                               order: 10 },

  // ── Sciences Naturelles 2ème Sciences ────────────────────────────────────
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "Génétique moléculaire — l'ADN et l'ARN",              order: 1 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "Génétique moléculaire — transcription et traduction", order: 2 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "Génétique mendélienne — première loi de Mendel",      order: 3 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "Génétique mendélienne — deuxième loi de Mendel",      order: 4 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "La variabilité génétique et les mutations",           order: 5 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "L'immunologie approfondie — la réponse immunitaire",  order: 6 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "Neurosciences — la synapse et l'influx nerveux",      order: 7 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Sciences Naturelles", name: "Tectonique des plaques — données et mécanismes",      order: 8 },

  // ── Informatique 2ème Sciences ───────────────────────────────────────────
  { levelCode: "2eme", sectionKey: "sciences", subject: "Informatique", name: "Structures de données — listes et piles",                    order: 1 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Informatique", name: "Récursivité",                                                order: 2 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Informatique", name: "Algorithmes de tri",                                         order: 3 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Informatique", name: "Bases de données — introduction",                           order: 4 },
  { levelCode: "2eme", sectionKey: "sciences", subject: "Informatique", name: "Le langage SQL",                                            order: 5 },

  // ── Mathématiques 2ème — Lettres ─────────────────────────────────────────
  { levelCode: "2eme", sectionKey: "lettres", subject: "Mathématiques", name: "Statistiques et représentation graphique",                    order: 1 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Mathématiques", name: "Probabilités — introduction",                                order: 2 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Mathématiques", name: "Fonctions — généralités et fonctions affines",               order: 3 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Mathématiques", name: "Équations et inéquations",                                   order: 4 },

  // ── Philosophie 2ème Lettres ─────────────────────────────────────────────
  { levelCode: "2eme", sectionKey: "lettres", subject: "Philosophie", name: "La philosophie et les autres savoirs",                         order: 1 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Philosophie", name: "La connaissance et ses fondements",                            order: 2 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Philosophie", name: "Le sujet et la conscience",                                    order: 3 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Philosophie", name: "Le désir et la liberté",                                       order: 4 },
  { levelCode: "2eme", sectionKey: "lettres", subject: "Philosophie", name: "La société et le politique",                                   order: 5 },

  // ── Économie 2ème Économie ───────────────────────────────────────────────
  { levelCode: "2eme", sectionKey: "economie_services", subject: "Économie", name: "Les agents économiques",                                order: 1 },
  { levelCode: "2eme", sectionKey: "economie_services", subject: "Économie", name: "La production et la consommation",                      order: 2 },
  { levelCode: "2eme", sectionKey: "economie_services", subject: "Économie", name: "Le marché et les prix",                                 order: 3 },
  { levelCode: "2eme", sectionKey: "economie_services", subject: "Économie", name: "Le revenu et sa répartition",                           order: 4 },
  { levelCode: "2eme", sectionKey: "economie_services", subject: "Économie", name: "La monnaie et le financement",                          order: 5 },

  // ════════════════════════════════════════════════════════════════════════════
  // 3ÈME ANNÉE SECONDAIRE
  // ════════════════════════════════════════════════════════════════════════════

  { levelCode: "3eme", sectionKey: null, subject: "Français", name: "Le texte littéraire — analyse et commentaire",                         order: 1 },
  { levelCode: "3eme", sectionKey: null, subject: "Français", name: "L'argumentation — dissertation",                                      order: 2 },
  { levelCode: "3eme", sectionKey: null, subject: "Français", name: "Le roman au XXe siècle",                                              order: 3 },
  { levelCode: "3eme", sectionKey: null, subject: "Français", name: "La poésie moderne et contemporaine",                                   order: 4 },
  { levelCode: "3eme", sectionKey: null, subject: "Français", name: "Grammaire : Révision et approfondissement",                            order: 5 },
  { levelCode: "3eme", sectionKey: null, subject: "Français", name: "Expression écrite — types de textes et production",                    order: 6 },

  { levelCode: "3eme", sectionKey: null, subject: "Anglais", name: "Unit 1: Civilisation and Heritage",                                    order: 1 },
  { levelCode: "3eme", sectionKey: null, subject: "Anglais", name: "Unit 2: Immigration and Multiculturalism",                              order: 2 },
  { levelCode: "3eme", sectionKey: null, subject: "Anglais", name: "Unit 3: Economy and Entrepreneurship",                                 order: 3 },
  { levelCode: "3eme", sectionKey: null, subject: "Anglais", name: "Unit 4: Ethics and Values",                                            order: 4 },
  { levelCode: "3eme", sectionKey: null, subject: "Anglais", name: "Unit 5: Globalisation and Challenges",                                 order: 5 },
  { levelCode: "3eme", sectionKey: null, subject: "Anglais", name: "Unit 6: Literature and Writing",                                       order: 6 },

  { levelCode: "3eme", sectionKey: null, subject: "Arabe", name: "الأدب العربي القديم والحديث",                                            order: 1 },
  { levelCode: "3eme", sectionKey: null, subject: "Arabe", name: "قواعد اللغة — النحو والصرف المتقدم",                                     order: 2 },
  { levelCode: "3eme", sectionKey: null, subject: "Arabe", name: "البلاغة — علم البيان والبديع",                                          order: 3 },
  { levelCode: "3eme", sectionKey: null, subject: "Arabe", name: "التعبير والإنشاء — المقال الأدبي",                                       order: 4 },

  // ── Mathématiques 3ème Mathématiques ─────────────────────────────────────
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Limites et continuité",                               order: 1 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Dérivabilité et étude de fonctions",                  order: 2 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Calcul intégral — primitives et intégrales",          order: 3 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Équations différentielles",                          order: 4 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Suites numériques — propriétés et convergence",       order: 5 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Nombres complexes",                                   order: 6 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Algèbre linéaire — matrices et systèmes",             order: 7 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Géométrie dans l'espace",                             order: 8 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Mathématiques", name: "Probabilités et statistiques avancées",               order: 9 },

  // ── Physique-Chimie 3ème Mathématiques ───────────────────────────────────
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Mécanique avancée — cinétique et dynamique",        order: 1 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Oscillations forcées et résonance",                 order: 2 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Ondes — propagation et interférences",              order: 3 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Électricité : Régimes transitoires (LC, RC, RL)",  order: 4 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Chimie organique — fonctions et réactions",         order: 5 },
  { levelCode: "3eme", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Chimie : Cinétique et équilibre chimique",          order: 6 },

  // ── Sciences Expérimentales 3ème ─────────────────────────────────────────
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Limites et continuité",                     order: 1 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Dérivabilité et étude de fonctions",        order: 2 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Calcul intégral",                          order: 3 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Suites numériques",                        order: 4 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Probabilités et statistiques",              order: 5 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Dénombrement",                             order: 6 },

  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Mécanique avancée — cinétique et dynamique", order: 1 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Oscillations mécaniques et ondes",           order: 2 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Électricité : Régimes transitoires",         order: 3 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Chimie organique",                           order: 4 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Chimie : Cinétique et équilibre chimique",   order: 5 },

  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Bilan énergétique — ATP et métabolisme", order: 1 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Génétique des populations et évolution", order: 2 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Géologie — géodynamique externe",        order: 3 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Géologie — géodynamique interne",        order: 4 },

  // ── Philosophie 3ème ─────────────────────────────────────────────────────
  { levelCode: "3eme", sectionKey: "mathematiques",          subject: "Philosophie", name: "Raison et réalité",                             order: 1 },
  { levelCode: "3eme", sectionKey: "mathematiques",          subject: "Philosophie", name: "La liberté et la responsabilité",               order: 2 },
  { levelCode: "3eme", sectionKey: "mathematiques",          subject: "Philosophie", name: "La justice et le droit",                        order: 3 },
  { levelCode: "3eme", sectionKey: "mathematiques",          subject: "Philosophie", name: "La technique et la culture",                    order: 4 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "Raison et réalité",                             order: 1 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "La liberté et la responsabilité",               order: 2 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "La justice et le droit",                        order: 3 },
  { levelCode: "3eme", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "La technique et la culture",                    order: 4 },

  // ════════════════════════════════════════════════════════════════════════════
  // BAC (4ÈME ANNÉE SECONDAIRE)
  // ════════════════════════════════════════════════════════════════════════════

  { levelCode: "bac", sectionKey: null, subject: "Français", name: "Révision — Le roman et l'analyse narrative",                            order: 1 },
  { levelCode: "bac", sectionKey: null, subject: "Français", name: "Révision — L'argumentation et la dissertation",                         order: 2 },
  { levelCode: "bac", sectionKey: null, subject: "Français", name: "Révision — La poésie",                                                  order: 3 },
  { levelCode: "bac", sectionKey: null, subject: "Français", name: "Révision — Le texte théâtral",                                          order: 4 },
  { levelCode: "bac", sectionKey: null, subject: "Français", name: "Grammaire — révision complète",                                         order: 5 },
  { levelCode: "bac", sectionKey: null, subject: "Français", name: "Annales bac — sujets corrigés",                                         order: 6 },

  { levelCode: "bac", sectionKey: null, subject: "Anglais", name: "Civilisation and Cultural Identity",                                     order: 1 },
  { levelCode: "bac", sectionKey: null, subject: "Anglais", name: "Contemporary World Issues",                                              order: 2 },
  { levelCode: "bac", sectionKey: null, subject: "Anglais", name: "Science, Technology and Ethics",                                         order: 3 },
  { levelCode: "bac", sectionKey: null, subject: "Anglais", name: "Literature and Humanities",                                              order: 4 },
  { levelCode: "bac", sectionKey: null, subject: "Anglais", name: "Bac Exam Preparation — Past Papers",                                     order: 5 },

  { levelCode: "bac", sectionKey: null, subject: "Arabe", name: "الأدب العربي — الشعر القديم والحديث",                                      order: 1 },
  { levelCode: "bac", sectionKey: null, subject: "Arabe", name: "الأدب العربي — النثر والمقالة",                                            order: 2 },
  { levelCode: "bac", sectionKey: null, subject: "Arabe", name: "قواعد اللغة — مراجعة شاملة",                                              order: 3 },
  { levelCode: "bac", sectionKey: null, subject: "Arabe", name: "التعبير الكتابي — أنواع المقالات",                                         order: 4 },
  { levelCode: "bac", sectionKey: null, subject: "Arabe", name: "مراجعة الباكالوريا — نماذج وتصحيحات",                                    order: 5 },

  // ── Mathématiques Bac Mathématiques ──────────────────────────────────────
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Analyse : Limites, continuité et dérivation",            order: 1 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Analyse : Calcul intégral et équations différentielles",  order: 2 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Suites numériques — convergence et récurrences",         order: 3 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Nombres complexes — révision complète",                  order: 4 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Algèbre linéaire et matrices",                           order: 5 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Géométrie dans l'espace",                                order: 6 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Probabilités et statistiques",                           order: 7 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Annales bac — exercices types et corrigés",              order: 8 },

  // ── Physique-Chimie Bac Mathématiques ────────────────────────────────────
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Mécanique avancée — révisions et annales",             order: 1 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Oscillations mécaniques et ondes",                     order: 2 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Électricité — régimes transitoires et permanents",     order: 3 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Ondes lumineuses et optique",                          order: 4 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Chimie organique — révisions",                         order: 5 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Thermodynamique",                                      order: 6 },
  { levelCode: "bac", sectionKey: "mathematiques", subject: "Physique-Chimie", name: "Annales bac — sujets de physique corrigés",            order: 7 },

  // ── Sciences Expérimentales Bac ───────────────────────────────────────────
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Analyse : Limites, continuité et dérivation",  order: 1 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Analyse : Calcul intégral",                   order: 2 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Suites numériques",                           order: 3 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Probabilités et dénombrement",                order: 4 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Mathématiques", name: "Annales bac — exercices types",               order: 5 },

  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Mécanique avancée — révisions et annales",  order: 1 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Oscillations mécaniques et ondes",          order: 2 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Électricité — régimes transitoires",        order: 3 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Chimie organique",                         order: 4 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Physique-Chimie", name: "Annales bac — sujets corrigés",             order: 5 },

  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Génétique complète — révisions bac",    order: 1 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Immunologie — révisions bac",           order: 2 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Neurosciences — révisions bac",         order: 3 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Bilan métabolique et énergétique",      order: 4 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Géologie — révisions bac",              order: 5 },
  { levelCode: "bac", sectionKey: "sciences_experimentales", subject: "Sciences Naturelles", name: "Annales bac — SVT corrigés",            order: 6 },

  // ── Philosophie Bac ───────────────────────────────────────────────────────
  { levelCode: "bac", sectionKey: "mathematiques",          subject: "Philosophie", name: "La raison et la réalité",                        order: 1 },
  { levelCode: "bac", sectionKey: "mathematiques",          subject: "Philosophie", name: "Autrui et la société",                           order: 2 },
  { levelCode: "bac", sectionKey: "mathematiques",          subject: "Philosophie", name: "La liberté, le droit et l'État",                 order: 3 },
  { levelCode: "bac", sectionKey: "mathematiques",          subject: "Philosophie", name: "La technique et la culture",                     order: 4 },
  { levelCode: "bac", sectionKey: "mathematiques",          subject: "Philosophie", name: "Annales bac — sujets de philo corrigés",         order: 5 },
  { levelCode: "bac", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "La raison et la réalité",                        order: 1 },
  { levelCode: "bac", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "Autrui et la société",                           order: 2 },
  { levelCode: "bac", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "La liberté, le droit et l'État",                 order: 3 },
  { levelCode: "bac", sectionKey: "sciences_experimentales",subject: "Philosophie", name: "La technique et la culture",                     order: 4 },
  { levelCode: "bac", sectionKey: "lettres",                subject: "Philosophie", name: "La raison et la réalité",                        order: 1 },
  { levelCode: "bac", sectionKey: "lettres",                subject: "Philosophie", name: "Autrui et la société",                           order: 2 },
  { levelCode: "bac", sectionKey: "lettres",                subject: "Philosophie", name: "La liberté, le droit et l'État",                 order: 3 },
  { levelCode: "bac", sectionKey: "lettres",                subject: "Philosophie", name: "La technique et la culture",                     order: 4 },
  { levelCode: "bac", sectionKey: "lettres",                subject: "Philosophie", name: "Annales bac — sujets de philo corrigés",         order: 5 },
  { levelCode: "bac", sectionKey: "economie_gestion",       subject: "Philosophie", name: "La raison et la réalité",                        order: 1 },
  { levelCode: "bac", sectionKey: "economie_gestion",       subject: "Philosophie", name: "Autrui et la société",                           order: 2 },
  { levelCode: "bac", sectionKey: "economie_gestion",       subject: "Philosophie", name: "La liberté, le droit et l'État",                 order: 3 },
  { levelCode: "bac", sectionKey: "economie_gestion",       subject: "Philosophie", name: "La technique et la culture",                     order: 4 },

  // ── Économie Bac Économie-Gestion ────────────────────────────────────────
  { levelCode: "bac", sectionKey: "economie_gestion", subject: "Économie", name: "La croissance économique",                                order: 1 },
  { levelCode: "bac", sectionKey: "economie_gestion", subject: "Économie", name: "Les politiques économiques",                              order: 2 },
  { levelCode: "bac", sectionKey: "economie_gestion", subject: "Économie", name: "Le commerce international et la mondialisation",          order: 3 },
  { levelCode: "bac", sectionKey: "economie_gestion", subject: "Économie", name: "Le développement et sous-développement",                  order: 4 },
  { levelCode: "bac", sectionKey: "economie_gestion", subject: "Économie", name: "Annales bac — Économie corrigés",                         order: 5 },

  // ── Informatique Bac Sciences Informatique ────────────────────────────────
  { levelCode: "bac", sectionKey: "sciences_informatique", subject: "Informatique", name: "Structures de données avancées",                 order: 1 },
  { levelCode: "bac", sectionKey: "sciences_informatique", subject: "Informatique", name: "Programmation orientée objet",                   order: 2 },
  { levelCode: "bac", sectionKey: "sciences_informatique", subject: "Informatique", name: "Bases de données — SQL avancé",                  order: 3 },
  { levelCode: "bac", sectionKey: "sciences_informatique", subject: "Informatique", name: "Réseaux et communication",                       order: 4 },
  { levelCode: "bac", sectionKey: "sciences_informatique", subject: "Informatique", name: "Annales bac — Informatique corrigés",            order: 5 },

  // ── Histoire-Géographie Bac ───────────────────────────────────────────────
  { levelCode: "bac", sectionKey: null, subject: "Histoire-Géographie", name: "Histoire : Le monde depuis 1945",                            order: 1 },
  { levelCode: "bac", sectionKey: null, subject: "Histoire-Géographie", name: "Histoire : La Tunisie indépendante",                         order: 2 },
  { levelCode: "bac", sectionKey: null, subject: "Histoire-Géographie", name: "Géographie : Les grandes puissances mondiales",              order: 3 },
  { levelCode: "bac", sectionKey: null, subject: "Histoire-Géographie", name: "Géographie : Les défis du développement",                    order: 4 },
  { levelCode: "bac", sectionKey: null, subject: "Histoire-Géographie", name: "Annales bac — Histoire-Géo corrigés",                        order: 5 },

  // ── Mathématiques Bac Lettres ────────────────────────────────────────────
  { levelCode: "bac", sectionKey: "lettres", subject: "Mathématiques", name: "Statistiques et analyse de données",                          order: 1 },
  { levelCode: "bac", sectionKey: "lettres", subject: "Mathématiques", name: "Probabilités",                                                order: 2 },
  { levelCode: "bac", sectionKey: "lettres", subject: "Mathématiques", name: "Fonctions et représentation graphique",                       order: 3 },

];

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function seed() {
  // ── 1. Subjects ─────────────────────────────────────────────────────────────
  console.log("🌱 Seeding curriculum subjects…");
  for (const s of SUBJECTS) {
    await db
      .insert(curriculumSubjectsTable)
      .values({ code: s.code, name: s.name, icon: s.icon, colorClass: s.colorClass, orderIndex: s.order })
      .onConflictDoNothing();
  }
  console.log(`   ✓ ${SUBJECTS.length} subjects (upserted)`);

  // ── 2. 1ère secondaire: delete then re-insert ────────────────────────────
  // The official curriculum replaces all placeholder chapters for this level.
  console.log("🗑️  Clearing existing 1ère secondaire chapters…");
  const deleted = await db
    .delete(curriculumChaptersTable)
    .where(eq(curriculumChaptersTable.levelCode, "1ere_secondaire"));
  console.log(`   ✓ Removed stale rows`);

  // ── 3. All chapters ──────────────────────────────────────────────────────
  console.log("🌱 Seeding curriculum chapters…");
  let inserted = 0;
  let skipped  = 0;

  for (const ch of CHAPTERS) {
    try {
      const result = await db
        .insert(curriculumChaptersTable)
        .values({
          levelCode:  ch.levelCode,
          sectionKey: ch.sectionKey ?? null,
          subject:    ch.subject,
          name:       ch.name,
          shortName:  ch.shortName ?? null,
          slug:       slug(ch.name),
          orderIndex: ch.order,
          isActive:   true,
        })
        .onConflictDoNothing();
      inserted++;
    } catch {
      skipped++;
    }
  }

  const onereCount = CHAPTERS.filter(c => c.levelCode === "1ere_secondaire").length;
  console.log(`   ✓ ${inserted} chapters inserted (${skipped} skipped / already exist)`);
  console.log(`   ✓ 1ère secondaire: ${onereCount} official chapters across 8 subjects`);
  console.log("✅ Curriculum seed complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
