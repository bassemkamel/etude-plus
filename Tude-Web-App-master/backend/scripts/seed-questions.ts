/**
 * Seed script: populate questions, question_parts, and mark_schemes
 * for multiple subjects across the Tunisian curriculum.
 *
 * Run:
 *   cd backend && DATABASE_URL=<your_url> npx tsx scripts/seed-questions.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import pg from "pg";
import {
  questionsTable,
  questionPartsTable,
  markSchemesTable,
} from "../db/src/schema/questions";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// ── Question definitions ─────────────────────────────────────────────────────

type QuestionSeed = {
  gradeLevel: string;
  sectionKey?: string | null;
  subject: string;
  topic: string;
  type: string;
  difficulty: string;
  questionText: string;
  context?: string;
  requiresCalculator?: boolean;
  totalMarks: number;
  estimatedTimeMinutes: number;
  parts: { label: string; text: string; marks: number }[];
  markSchemes: { partLabel: string; answer: string; marksBreakdown?: string }[];
};

const questions: QuestionSeed[] = [
  // ── Mathématiques — 9ème ──────────────────────────────────────────────────
  {
    gradeLevel: "9eme",
    subject: "Mathématiques",
    topic: "Équations du premier degré",
    type: "Exercice",
    difficulty: "facile",
    questionText: "Résoudre les équations suivantes :",
    totalMarks: 6,
    estimatedTimeMinutes: 10,
    parts: [
      { label: "a", text: "3x + 7 = 22", marks: 2 },
      { label: "b", text: "2(x – 4) = 3x + 1", marks: 2 },
      { label: "c", text: "\\frac{x+1}{3} = \\frac{2x-1}{4}", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "3x = 15  →  x = 5", marksBreakdown: "1 pt passage, 1 pt solution" },
      { partLabel: "b", answer: "2x – 8 = 3x + 1  →  –x = 9  →  x = –9", marksBreakdown: "1 pt développement, 1 pt solution" },
      { partLabel: "c", answer: "4(x+1) = 3(2x–1)  →  4x+4 = 6x–3  →  –2x = –7  →  x = 3,5", marksBreakdown: "1 pt mise au même dénominateur, 1 pt solution" },
    ],
  },
  {
    gradeLevel: "9eme",
    subject: "Mathématiques",
    topic: "Théorème de Pythagore",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "Dans un triangle ABC rectangle en B, on a AB = 6 cm et BC = 8 cm.",
    totalMarks: 4,
    estimatedTimeMinutes: 8,
    parts: [
      { label: "a", text: "Calculer AC.", marks: 2 },
      { label: "b", text: "Calculer cos(ACB) et en déduire la mesure de l'angle ACB (arrondir au degré le plus proche).", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "AC² = AB² + BC² = 36 + 64 = 100  →  AC = 10 cm", marksBreakdown: "1 pt application théorème, 1 pt résultat" },
      { partLabel: "b", answer: "cos(ACB) = BC/AC = 8/10 = 0,8  →  ACB ≈ 37°", marksBreakdown: "1 pt formule, 1 pt angle" },
    ],
  },
  {
    gradeLevel: "9eme",
    subject: "Mathématiques",
    topic: "Calcul littéral et factorisation",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "Développer puis réduire, ou factoriser selon le cas :",
    totalMarks: 6,
    estimatedTimeMinutes: 12,
    parts: [
      { label: "a", text: "Développer et réduire : A = (2x + 3)(x – 5) + x²", marks: 2 },
      { label: "b", text: "Factoriser : B = 9x² – 4", marks: 2 },
      { label: "c", text: "Factoriser : C = 3x² – 12x", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "A = 2x²–10x+3x–15+x² = 3x²–7x–15", marksBreakdown: "1 pt développement, 1 pt réduction" },
      { partLabel: "b", answer: "B = (3x–2)(3x+2)  [identité remarquable a²–b²]", marksBreakdown: "1 pt reconnaissance, 1 pt factorisation" },
      { partLabel: "c", answer: "C = 3x(x–4)", marksBreakdown: "1 pt facteur commun, 1 pt résultat" },
    ],
  },

  // ── Physique-Chimie — 9ème ────────────────────────────────────────────────
  {
    gradeLevel: "9eme",
    subject: "Physique-Chimie",
    topic: "Électricité — Loi d'Ohm",
    type: "Exercice",
    difficulty: "facile",
    questionText: "Un résistor de résistance R = 220 Ω est alimenté sous une tension U = 12 V.",
    totalMarks: 4,
    estimatedTimeMinutes: 8,
    parts: [
      { label: "a", text: "Calculer l'intensité du courant I qui le traverse.", marks: 2 },
      { label: "b", text: "Calculer la puissance électrique dissipée par ce résistor.", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "I = U/R = 12/220 ≈ 0,055 A ≈ 55 mA", marksBreakdown: "1 pt formule, 1 pt calcul" },
      { partLabel: "b", answer: "P = U × I = 12 × 0,055 ≈ 0,66 W", marksBreakdown: "1 pt formule, 1 pt résultat" },
    ],
  },
  {
    gradeLevel: "9eme",
    subject: "Physique-Chimie",
    topic: "Chimie — Réactions acide-base",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "On mélange une solution d'acide chlorhydrique HCl et une solution d'hydroxyde de sodium NaOH.",
    totalMarks: 4,
    estimatedTimeMinutes: 10,
    parts: [
      { label: "a", text: "Écrire l'équation de la réaction de neutralisation.", marks: 2 },
      { label: "b", text: "Nommer les produits de cette réaction.", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "HCl + NaOH → NaCl + H₂O", marksBreakdown: "1 pt réactifs, 1 pt produits équilibrés" },
      { partLabel: "b", answer: "Le chlorure de sodium (sel de table) et l'eau.", marksBreakdown: "1 pt par produit nommé correctement" },
    ],
  },

  // ── Français — 9ème ───────────────────────────────────────────────────────
  {
    gradeLevel: "9eme",
    subject: "Français",
    topic: "Compréhension écrite et grammaire",
    type: "Exercice",
    difficulty: "moyen",
    questionText: `Lisez le texte suivant, puis répondez aux questions.`,
    context: `<p><em>« Le soleil se couchait derrière les collines, teintant le ciel de nuances orangées. Ali s'arrêta un instant pour contempler ce spectacle magnifique. Depuis qu'il avait quitté son village natal, il n'avait jamais trouvé un endroit aussi paisible. Il prit une grande inspiration et continua son chemin, le cœur léger. »</em></p>`,
    totalMarks: 6,
    estimatedTimeMinutes: 15,
    parts: [
      { label: "a", text: "Relevez deux indicateurs de temps ou de lieu dans le texte.", marks: 2 },
      { label: "b", text: "Identifiez le temps verbal dominant et justifiez son emploi.", marks: 2 },
      { label: "c", text: "Transformez la dernière phrase au passé composé.", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "Exemples : « derrière les collines » (lieu), « un instant » (temps), « Depuis qu'il avait quitté » (temps).", marksBreakdown: "1 pt par indicateur correct" },
      { partLabel: "b", answer: "L'imparfait (se couchait, teintant, avait quitté) — utilisé pour décrire une scène, exprimer une action en cours dans le passé.", marksBreakdown: "1 pt identification, 1 pt justification" },
      { partLabel: "c", answer: "Il a pris une grande inspiration et a continué son chemin, le cœur léger.", marksBreakdown: "1 pt par verbe correctement conjugué" },
    ],
  },

  // ── Histoire-Géographie — 9ème ────────────────────────────────────────────
  {
    gradeLevel: "9eme",
    subject: "Histoire-Géographie",
    topic: "La Première Guerre mondiale",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "Répondez aux questions suivantes concernant la Première Guerre mondiale.",
    totalMarks: 6,
    estimatedTimeMinutes: 15,
    parts: [
      { label: "a", text: "Citez les deux grands blocs qui s'affrontent lors de la Première Guerre mondiale.", marks: 2 },
      { label: "b", text: "Quelle est l'événement déclencheur de ce conflit ? Donnez la date précise.", marks: 2 },
      { label: "c", text: "Expliquez brièvement ce qu'est la « guerre de tranchées ».", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "La Triple Entente (France, Royaume-Uni, Russie) et la Triple Alliance / Triplice (Allemagne, Autriche-Hongrie, Italie).", marksBreakdown: "1 pt par bloc correctement nommé" },
      { partLabel: "b", answer: "L'assassinat de l'archiduc François-Ferdinand à Sarajevo, le 28 juin 1914.", marksBreakdown: "1 pt événement, 1 pt date" },
      { partLabel: "c", answer: "Type de guerre où les soldats combattent depuis des tranchées creusées dans le sol, caractérisée par une ligne de front quasi immobile et des conditions de vie très difficiles.", marksBreakdown: "1 pt définition, 1 pt caractéristique" },
    ],
  },

  // ── Mathématiques — 1ère Secondaire ──────────────────────────────────────
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 1: Angles",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Deux angles mesurent 35° et 55°. Que peut-on dire de ces deux angles ?",
    context: "<p><strong>A.</strong> Ils sont supplémentaires</p><p><strong>B.</strong> Ils sont complémentaires</p><p><strong>C.</strong> Ils sont opposés par le sommet</p><p><strong>D.</strong> Ils sont alternes-internes</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse B — 35° + 55° = 90°, donc les deux angles sont complémentaires.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 1: Angles",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "Deux angles supplémentaires sont tels que l'un mesure 70°. Calcule la mesure de l'autre angle.",
    totalMarks: 2,
    estimatedTimeMinutes: 4,
    parts: [{ label: "a", text: "Calculer la mesure de l'angle manquant.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "110°", marksBreakdown: "Deux angles supplémentaires ont une somme de 180°. Donc l'autre angle mesure 180° − 70° = 110°." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 2: Théorème de Thalès et sa réciproque",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "Dans un triangle ABC, les points M et N appartiennent respectivement aux côtés [AB] et [AC], et MN est parallèle à BC. On donne AM = 3 cm, AB = 9 cm et AC = 12 cm. Calcule AN.",
    totalMarks: 3,
    estimatedTimeMinutes: 6,
    parts: [{ label: "a", text: "Appliquer le théorème de Thalès pour calculer AN.", marks: 3 }],
    markSchemes: [{ partLabel: "a", answer: "AN = 4 cm", marksBreakdown: "D'après le théorème de Thalès, AM / AB = AN / AC. Donc 3 / 9 = AN / 12. Alors AN = 12 × 3 / 9 = 4 cm." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 3: Rapports trigonométriques d'un angle aigu; Relations métriques dans un triangle rectangle",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Dans un triangle rectangle, pour un angle aigu A, quelle formule donne cos(A) ?",
    context: "<p><strong>A.</strong> côté opposé / hypoténuse</p><p><strong>B.</strong> côté adjacent / hypoténuse</p><p><strong>C.</strong> côté opposé / côté adjacent</p><p><strong>D.</strong> hypoténuse / côté adjacent</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse B — Dans un triangle rectangle, cos(A) = côté adjacent à A / hypoténuse.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 3: Rapports trigonométriques d'un angle aigu; Relations métriques dans un triangle rectangle",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "Dans un triangle rectangle, l'hypoténuse mesure 10 cm et le côté adjacent à l'angle A mesure 8 cm. Calcule cos(A).",
    totalMarks: 2,
    estimatedTimeMinutes: 4,
    parts: [{ label: "a", text: "Calculer cos(A).", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "cos(A) = 0,8", marksBreakdown: "cos(A) = côté adjacent / hypoténuse = 8 / 10 = 0,8." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 5: Somme de deux vecteurs - Vecteurs colinéaires",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Deux vecteurs sont colinéaires lorsqu'ils :",
    context: "<p><strong>A.</strong> ont toujours la même longueur</p><p><strong>B.</strong> ont des directions parallèles</p><p><strong>C.</strong> sont toujours perpendiculaires</p><p><strong>D.</strong> ont toujours le même sens</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse B — Deux vecteurs sont colinéaires s'ils ont la même direction ou des directions parallèles.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 6: Activités dans un repère",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "Dans un repère, on donne A(2 ; 3) et B(6 ; 3). Calcule la distance AB.",
    totalMarks: 2,
    estimatedTimeMinutes: 4,
    parts: [{ label: "a", text: "Calculer la distance AB.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "AB = 4", marksBreakdown: "Les deux points ont la même ordonnée. La distance horizontale est donc |6 − 2| = 4." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 12: Fonctions linéaires",
    type: "problem-solving",
    difficulty: "facile",
    questionText: "Soit la fonction linéaire f(x) = 3x. Calcule f(5).",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Calculer f(5).", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "f(5) = 15", marksBreakdown: "On remplace x par 5 : f(5) = 3 × 5 = 15." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 13: Équations et inéquations du premier degré à une inconnue",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "Résous l'équation 4x − 5 = 19.",
    totalMarks: 2,
    estimatedTimeMinutes: 4,
    parts: [{ label: "a", text: "Résoudre l'équation.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "x = 6", marksBreakdown: "4x − 5 = 19 donc 4x = 24, donc x = 24 / 4 = 6." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Mathématiques",
    topic: "Chapitre 14: Fonctions affines",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Laquelle des fonctions suivantes est une fonction affine ?",
    context: "<p><strong>A.</strong> f(x) = 5x</p><p><strong>B.</strong> f(x) = 2x + 3</p><p><strong>C.</strong> f(x) = x²</p><p><strong>D.</strong> f(x) = 1 / x</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse B — Une fonction affine est de la forme f(x) = ax + b avec b ≠ 0. Ici, f(x) = 2x + 3.", marksBreakdown: "2 pts réponse correcte" }],
  },

  // ── Physique-Chimie — 1ère Secondaire ────────────────────────────────────
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Le circuit électrique",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Une lampe ne s'allume pas dans un circuit simple. Quelle situation explique le mieux cela ?",
    context: "<p><strong>A.</strong> Le circuit est fermé</p><p><strong>B.</strong> Le circuit est ouvert</p><p><strong>C.</strong> La lampe reçoit du courant</p><p><strong>D.</strong> Le générateur fonctionne toujours même sans circuit fermé</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse B — Pour qu'un courant circule et que la lampe s'allume, le circuit doit être fermé.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "L'intensité du courant électrique",
    type: "problem-solving",
    difficulty: "facile",
    questionText: "Un ampèremètre indique 0,25 A dans un circuit. Exprime cette intensité en milliampères.",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Convertir 0,25 A en mA.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "250 mA", marksBreakdown: "1 A = 1000 mA, donc 0,25 A = 0,25 × 1000 = 250 mA." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "La tension électrique",
    type: "problem-solving",
    difficulty: "facile",
    questionText: "Un voltmètre mesure une tension de 6 V aux bornes d'une lampe. Deux piles identiques de 3 V sont associées en série. Quelle tension totale fournissent-elles ?",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Calculer la tension totale de deux piles de 3 V en série.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "6 V", marksBreakdown: "En série, les tensions des piles s'additionnent : 3 V + 3 V = 6 V." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Le dipôle résistor",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Dans un circuit, un résistor sert principalement à :",
    context: "<p><strong>A.</strong> produire de la lumière</p><p><strong>B.</strong> limiter l'intensité du courant</p><p><strong>C.</strong> mesurer la tension</p><p><strong>D.</strong> ouvrir automatiquement le circuit</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse B — Un résistor s'oppose au passage du courant et permet de limiter l'intensité.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Le dipôle résistor",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "On applique une tension de 12 V aux bornes d'un résistor de résistance 6 Ω. Calcule l'intensité du courant.",
    totalMarks: 3,
    estimatedTimeMinutes: 5,
    parts: [{ label: "a", text: "Appliquer la loi d'Ohm pour calculer I.", marks: 3 }],
    markSchemes: [{ partLabel: "a", answer: "I = 2 A", marksBreakdown: "D'après la loi d'Ohm, U = R × I, donc I = U / R = 12 / 6 = 2 A." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Les états physiques de la matière",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Lorsqu'un glaçon fond, quel changement d'état a lieu ?",
    context: "<p><strong>A.</strong> solide vers liquide</p><p><strong>B.</strong> liquide vers gaz</p><p><strong>C.</strong> gaz vers liquide</p><p><strong>D.</strong> liquide vers solide</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse A — La fusion est le passage de l'état solide à l'état liquide.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "La masse",
    type: "problem-solving",
    difficulty: "facile",
    questionText: "Une boîte vide a une masse de 120 g. Remplie de sable, elle a une masse de 470 g. Quelle est la masse du sable ?",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Calculer la masse du sable.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "350 g", marksBreakdown: "Masse du sable = masse totale − masse de la boîte vide = 470 g − 120 g = 350 g." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Les changements d'état physique d'un corps pur",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Le passage de l'état liquide à l'état gazeux s'appelle :",
    context: "<p><strong>A.</strong> fusion</p><p><strong>B.</strong> solidification</p><p><strong>C.</strong> vaporisation</p><p><strong>D.</strong> condensation</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse C — La vaporisation est le passage de l'état liquide à l'état gazeux.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Concentration d'une solution",
    type: "problem-solving",
    difficulty: "moyen",
    questionText: "On dissout 10 g de sel dans 500 mL d'eau. Calcule la concentration massique en g/L.",
    totalMarks: 3,
    estimatedTimeMinutes: 5,
    requiresCalculator: true,
    parts: [{ label: "a", text: "Calculer la concentration massique C (en g/L).", marks: 3 }],
    markSchemes: [{ partLabel: "a", answer: "20 g/L", marksBreakdown: "500 mL = 0,5 L. La concentration massique est C = m / V = 10 / 0,5 = 20 g/L." }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Physique-Chimie",
    topic: "Notion de réaction chimique",
    type: "multiple-choice",
    difficulty: "facile",
    questionText: "Lors d'une réaction chimique, que deviennent les réactifs ?",
    context: "<p><strong>A.</strong> Ils disparaissent pour former de nouveaux produits</p><p><strong>B.</strong> Ils restent toujours inchangés</p><p><strong>C.</strong> Ils deviennent uniquement plus chauds</p><p><strong>D.</strong> Ils changent seulement d'état physique</p>",
    totalMarks: 2,
    estimatedTimeMinutes: 3,
    parts: [{ label: "a", text: "Choisissez la bonne réponse.", marks: 2 }],
    markSchemes: [{ partLabel: "a", answer: "Réponse A — Une réaction chimique transforme les réactifs en nouveaux produits.", marksBreakdown: "2 pts réponse correcte" }],
  },
  {
    gradeLevel: "1ere_secondaire",
    subject: "Informatique",
    topic: "Algorithmique — Structures conditionnelles",
    type: "Exercice",
    difficulty: "facile",
    questionText: "Écrire un algorithme qui lit un nombre entier et affiche s'il est positif, négatif ou nul.",
    totalMarks: 4,
    estimatedTimeMinutes: 10,
    parts: [
      { label: "a", text: "Écrire l'algorithme en langage algorithmique (pseudocode).", marks: 3 },
      { label: "b", text: "Donner l'organigramme correspondant.", marks: 1 },
    ],
    markSchemes: [
      {
        partLabel: "a",
        answer: `Variables : n : Entier
Début
  Écrire « Entrer un nombre : »
  Lire n
  Si n > 0 Alors
    Écrire « Positif »
  Sinon Si n < 0 Alors
    Écrire « Négatif »
  Sinon
    Écrire « Nul »
  FinSi
Fin`,
        marksBreakdown: "1 pt déclaration, 1 pt structure Si/SinonSi/Sinon, 1 pt affichages corrects",
      },
      { partLabel: "b", answer: "Organigramme avec losange de décision n>0, branche Oui → Positif, branche Non vers second losange n<0 → Négatif / Nul.", marksBreakdown: "1 pt organigramme cohérent avec l'algorithme" },
    ],
  },

  // ── Mathématiques — Bac Sciences Maths ───────────────────────────────────
  {
    gradeLevel: "bac",
    sectionKey: "sciences_maths",
    subject: "Mathématiques",
    topic: "Dérivation — Étude de fonctions",
    type: "Problème",
    difficulty: "difficile",
    questionText: "Soit la fonction f définie sur ℝ par f(x) = x³ – 3x² + 4.",
    totalMarks: 10,
    estimatedTimeMinutes: 25,
    parts: [
      { label: "a", text: "Calculer f'(x) la dérivée de f.", marks: 2 },
      { label: "b", text: "Étudier le signe de f'(x) et en déduire les variations de f.", marks: 3 },
      { label: "c", text: "Dresser le tableau de variations de f.", marks: 2 },
      { label: "d", text: "Déterminer les extrema locaux de f.", marks: 3 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "f'(x) = 3x² – 6x = 3x(x – 2)", marksBreakdown: "1 pt calcul, 1 pt factorisation" },
      { partLabel: "b", answer: "f'(x) = 0 pour x = 0 et x = 2. f'(x) > 0 sur ]–∞, 0[ et ]2, +∞[ ; f'(x) < 0 sur ]0, 2[. Donc f croissante sur ]–∞, 0[, décroissante sur ]0, 2[, croissante sur ]2, +∞[.", marksBreakdown: "1 pt racines, 1 pt signe, 1 pt variations" },
      { partLabel: "c", answer: "Tableau : –∞ → 0 (croissant, f(0)=4 max local), 0 → 2 (décroissant, f(2)=0 min local), 2 → +∞ (croissant).", marksBreakdown: "1 pt structure, 1 pt valeurs" },
      { partLabel: "d", answer: "Maximum local en x=0 : f(0) = 4. Minimum local en x=2 : f(2) = 8 – 12 + 4 = 0.", marksBreakdown: "1 pt identification, 1 pt calcul f(0), 1 pt calcul f(2)" },
    ],
  },
  {
    gradeLevel: "bac",
    sectionKey: "sciences_maths",
    subject: "Mathématiques",
    topic: "Suites numériques",
    type: "Exercice",
    difficulty: "difficile",
    questionText: "Soit la suite (uₙ) définie par u₀ = 1 et uₙ₊₁ = 2uₙ + 3 pour tout n ∈ ℕ.",
    totalMarks: 8,
    estimatedTimeMinutes: 20,
    parts: [
      { label: "a", text: "Calculer u₁, u₂ et u₃.", marks: 2 },
      { label: "b", text: "Poser vₙ = uₙ + 3. Montrer que (vₙ) est une suite géométrique et préciser sa raison.", marks: 3 },
      { label: "c", text: "Exprimer vₙ puis uₙ en fonction de n.", marks: 3 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "u₁ = 2(1)+3 = 5 ; u₂ = 2(5)+3 = 13 ; u₃ = 2(13)+3 = 29", marksBreakdown: "1 pt pour u₁, 0.5 pt chacun pour u₂ et u₃" },
      { partLabel: "b", answer: "vₙ₊₁ = uₙ₊₁ + 3 = 2uₙ + 3 + 3 = 2(uₙ + 3) = 2vₙ. Donc (vₙ) géométrique de raison q = 2.", marksBreakdown: "1 pt substitution, 1 pt factorisation, 1 pt conclusion" },
      { partLabel: "c", answer: "v₀ = u₀ + 3 = 4. vₙ = 4 × 2ⁿ. uₙ = vₙ – 3 = 4 × 2ⁿ – 3 = 2ⁿ⁺² – 3.", marksBreakdown: "1 pt v₀, 1 pt vₙ, 1 pt uₙ" },
    ],
  },

  // ── Physique-Chimie — Bac Sciences Exp ───────────────────────────────────
  {
    gradeLevel: "bac",
    sectionKey: "sciences_exp",
    subject: "Physique-Chimie",
    topic: "Cinétique chimique — Vitesse de réaction",
    type: "Problème",
    difficulty: "difficile",
    questionText: "On réalise la réaction entre le thiosulfate de sodium (Na₂S₂O₃) et l'acide chlorhydrique (HCl) à différentes températures. On mesure le temps t nécessaire pour que la solution devienne trouble.",
    context: `<table class="border-collapse border w-full text-sm"><thead><tr class="bg-muted"><th class="border px-2 py-1">T (°C)</th><th class="border px-2 py-1">10</th><th class="border px-2 py-1">20</th><th class="border px-2 py-1">30</th><th class="border px-2 py-1">40</th></tr></thead><tbody><tr><td class="border px-2 py-1">t (s)</td><td class="border px-2 py-1">120</td><td class="border px-2 py-1">60</td><td class="border px-2 py-1">30</td><td class="border px-2 py-1">15</td></tr></tbody></table>`,
    totalMarks: 8,
    estimatedTimeMinutes: 20,
    requiresCalculator: true,
    parts: [
      { label: "a", text: "Écrire l'équation de la réaction. Le précipité formé est le soufre S.", marks: 2 },
      { label: "b", text: "Calculer la vitesse relative v = 1/t pour chaque température.", marks: 2 },
      { label: "c", text: "Que peut-on conclure sur l'effet de la température sur la vitesse de réaction ?", marks: 2 },
      { label: "d", text: "Expliquer ce phénomène à l'échelle microscopique.", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "Na₂S₂O₃ + 2HCl → 2NaCl + H₂O + SO₂ + S", marksBreakdown: "1 pt réactifs, 1 pt produits équilibrés" },
      { partLabel: "b", answer: "10°C : 1/120 ≈ 8,3×10⁻³ s⁻¹ ; 20°C : 1/60 ≈ 0,017 s⁻¹ ; 30°C : 1/30 ≈ 0,033 s⁻¹ ; 40°C : 1/15 ≈ 0,067 s⁻¹", marksBreakdown: "0.5 pt par valeur correcte" },
      { partLabel: "c", answer: "Quand la température augmente, le temps de réaction diminue et la vitesse augmente. La réaction est deux fois plus rapide pour chaque augmentation de 10°C.", marksBreakdown: "1 pt observation, 1 pt relation quantitative" },
      { partLabel: "d", answer: "À température plus élevée, les molécules se déplacent plus rapidement, les chocs entre réactifs sont plus fréquents et plus énergétiques, donc le nombre de chocs efficaces par unité de temps est plus grand.", marksBreakdown: "1 pt agitation, 1 pt chocs efficaces" },
    ],
  },

  // ── Sciences Naturelles — Bac Sciences Exp ───────────────────────────────
  {
    gradeLevel: "bac",
    sectionKey: "sciences_exp",
    subject: "Sciences Naturelles",
    topic: "Génétique — Lois de Mendel",
    type: "Problème",
    difficulty: "difficile",
    questionText: "Chez le pois, la couleur jaune (J) est dominante sur la couleur verte (j), et la forme lisse (L) est dominante sur la forme ridée (l). On croise deux plantes à graines jaunes lisses, toutes deux hétérozygotes pour les deux caractères.",
    totalMarks: 8,
    estimatedTimeMinutes: 20,
    parts: [
      { label: "a", text: "Écrire les génotypes des parents.", marks: 2 },
      { label: "b", text: "Dresser l'échiquier de croisement (grille de Punnett) et donner les proportions des phénotypes obtenus.", marks: 4 },
      { label: "c", text: "Quelle est la probabilité d'obtenir une plante à graines vertes ridées ?", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "Les deux parents ont le génotype JjLl.", marksBreakdown: "1 pt par parent" },
      { partLabel: "b", answer: "Gamètes : JL, Jl, jL, jl (×2). Grille 4×4 donne : 9/16 J_L_ (jaune lisse), 3/16 J_ll (jaune ridée), 3/16 jjL_ (verte lisse), 1/16 jjll (verte ridée).", marksBreakdown: "2 pts gamètes, 2 pts proportions" },
      { partLabel: "c", answer: "Probabilité d'obtenir des graines vertes ridées (jjll) = 1/16 ≈ 6,25 %.", marksBreakdown: "1 pt génotype, 1 pt proportion" },
    ],
  },

  // ── Philosophie — Bac Lettres ─────────────────────────────────────────────
  {
    gradeLevel: "bac",
    sectionKey: "lettres",
    subject: "Philosophie",
    topic: "La liberté et la responsabilité",
    type: "Rédaction",
    difficulty: "difficile",
    questionText: "« Être libre, est-ce faire ce qu'on veut ? » — Rédigez une dissertation philosophique organisée en introduction, développement (thèse, antithèse, synthèse) et conclusion.",
    totalMarks: 20,
    estimatedTimeMinutes: 120,
    parts: [
      { label: "a", text: "Introduction : problématiser la question et annoncer le plan.", marks: 4 },
      { label: "b", text: "Thèse : la liberté comme capacité à réaliser ses désirs (liberté naturelle / libéralisme).", marks: 4 },
      { label: "c", text: "Antithèse : les limites de cette conception — liberté et contraintes (sociales, morales, physiques).", marks: 4 },
      { label: "d", text: "Synthèse : la liberté comme autonomie — liberté véritable selon Kant (agir selon la raison morale).", marks: 4 },
      { label: "e", text: "Conclusion : réponse nuancée à la question et ouverture.", marks: 4 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "Définition des termes clés (liberté, vouloir, désir). Mise en tension : liberté = absence de contrainte vs liberté = maîtrise de soi. Annonce du plan en trois parties.", marksBreakdown: "2 pts problématisation, 2 pts annonce plan" },
      { partLabel: "b", answer: "Référence à Hobbes (état de nature), Mill (harm principle), Sartre (« l'existence précède l'essence »). La liberté comme pouvoir d'agir selon ses désirs sans contrainte extérieure.", marksBreakdown: "2 pts auteurs/références, 2 pts argumentation" },
      { partLabel: "c", answer: "Rousseau : l'homme social est enchaîné. Spinoza : le désir est une passion, donc une forme de servitude. Les contraintes physiques (maladie), sociales (lois), morales (culpabilité) limitent la liberté absolue.", marksBreakdown: "2 pts auteurs, 2 pts développement" },
      { partLabel: "d", answer: "Kant : la liberté véritable est l'autonomie — agir selon la loi morale que l'on se donne à soi-même. Obéir à ses passions c'est être esclave. La raison libère.", marksBreakdown: "2 pts Kant autonomie, 2 pts distinction désir/raison" },
      { partLabel: "e", answer: "Faire ce qu'on veut peut être une forme d'esclavage si le vouloir est guidé par des passions incontrôlées. La vraie liberté est la maîtrise de soi par la raison. Ouverture : liberté et responsabilité sont-elles indissociables ?", marksBreakdown: "2 pts réponse nuancée, 2 pts ouverture" },
    ],
  },

  // ── Informatique — Bac Informatique ──────────────────────────────────────
  {
    gradeLevel: "bac",
    sectionKey: "informatique",
    subject: "Informatique",
    topic: "Algorithmique — Tri et recherche",
    type: "Exercice",
    difficulty: "difficile",
    questionText: "On dispose d'un tableau T = [5, 2, 8, 1, 9, 3] de 6 entiers.",
    totalMarks: 8,
    estimatedTimeMinutes: 20,
    parts: [
      { label: "a", text: "Appliquer l'algorithme du tri à bulles sur ce tableau. Donner l'état du tableau après chaque passage.", marks: 4 },
      { label: "b", text: "Écrire en pseudocode l'algorithme du tri à bulles pour un tableau de n éléments.", marks: 4 },
    ],
    markSchemes: [
      {
        partLabel: "a",
        answer: `Passage 1 : [2, 5, 1, 8, 3, 9]
Passage 2 : [2, 1, 5, 3, 8, 9]
Passage 3 : [1, 2, 3, 5, 8, 9]
Passage 4 : [1, 2, 3, 5, 8, 9] (aucun échange → arrêt possible)`,
        marksBreakdown: "1 pt par passage correct",
      },
      {
        partLabel: "b",
        answer: `Algorithme TriBulles(T, n)
Début
  Pour i de 1 à n-1 Faire
    Pour j de 0 à n-i-1 Faire
      Si T[j] > T[j+1] Alors
        temp ← T[j]
        T[j] ← T[j+1]
        T[j+1] ← temp
      FinSi
    FinPour
  FinPour
Fin`,
        marksBreakdown: "1 pt double boucle, 1 pt comparaison, 1 pt échange, 1 pt borne correcte",
      },
    ],
  },

  // ── Économie — 2ème Secondaire Économie ───────────────────────────────────
  {
    gradeLevel: "2eme",
    sectionKey: "economie",
    subject: "Économie",
    topic: "Offre, demande et prix d'équilibre",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "Sur le marché d'un bien X, la demande est Qd = 100 – 2P et l'offre est Qo = 3P – 25.",
    totalMarks: 6,
    estimatedTimeMinutes: 15,
    requiresCalculator: true,
    parts: [
      { label: "a", text: "Calculer le prix d'équilibre P* et la quantité d'équilibre Q*.", marks: 3 },
      { label: "b", text: "Si le gouvernement fixe un prix plancher de 30, que se passe-t-il sur le marché ?", marks: 3 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "Équilibre : Qd = Qo → 100 – 2P = 3P – 25 → 125 = 5P → P* = 25. Q* = 100 – 2(25) = 50.", marksBreakdown: "1 pt égalité, 1 pt P*, 1 pt Q*" },
      { partLabel: "b", answer: "À P=30 : Qd = 100–60 = 40 ; Qo = 90–25 = 65. Excès d'offre (surplus) de 65–40 = 25 unités. Le marché est déséquilibré, le prix plancher crée un excédent de production.", marksBreakdown: "1 pt calcul Qd, 1 pt calcul Qo, 1 pt analyse surplus" },
    ],
  },

  // ── Mathématiques — Bac Économie ─────────────────────────────────────────
  {
    gradeLevel: "bac",
    sectionKey: "economie",
    subject: "Mathématiques",
    topic: "Statistiques — Moyenne et écart-type",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "Les notes (sur 20) de 10 élèves sont : 8, 12, 14, 10, 16, 9, 11, 13, 15, 12.",
    totalMarks: 6,
    estimatedTimeMinutes: 15,
    requiresCalculator: true,
    parts: [
      { label: "a", text: "Calculer la moyenne x̄ de cette série.", marks: 2 },
      { label: "b", text: "Calculer la variance V et l'écart-type σ.", marks: 3 },
      { label: "c", text: "Interpréter l'écart-type obtenu.", marks: 1 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "Somme = 8+12+14+10+16+9+11+13+15+12 = 120. x̄ = 120/10 = 12.", marksBreakdown: "1 pt somme, 1 pt division" },
      { partLabel: "b", answer: "V = [(8-12)²+(12-12)²+(14-12)²+(10-12)²+(16-12)²+(9-12)²+(11-12)²+(13-12)²+(15-12)²+(12-12)²] / 10 = [16+0+4+4+16+9+1+1+9+0]/10 = 60/10 = 6. σ = √6 ≈ 2,45.", marksBreakdown: "1 pt carré des écarts, 1 pt variance, 1 pt écart-type" },
      { partLabel: "c", answer: "L'écart-type d'environ 2,45 points montre que les notes sont relativement regroupées autour de la moyenne (dispersion modérée).", marksBreakdown: "1 pt interprétation correcte" },
    ],
  },

  // ── Anglais — 1ère Secondaire ─────────────────────────────────────────────
  {
    gradeLevel: "1ere_secondaire",
    subject: "Anglais",
    topic: "Grammar — Present Perfect vs Simple Past",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "Fill in the blanks with the correct form: Present Perfect or Simple Past.",
    totalMarks: 6,
    estimatedTimeMinutes: 10,
    parts: [
      { label: "a", text: "I ______ (never / visit) Paris before. I ______ (go) to London last year.", marks: 2 },
      { label: "b", text: "She ______ (already / finish) her homework. She ______ (finish) it an hour ago.", marks: 2 },
      { label: "c", text: "They ______ (live) in Tunis since 2010. Before that, they ______ (live) in Sfax for five years.", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "have never visited / went", marksBreakdown: "1 pt each" },
      { partLabel: "b", answer: "has already finished / finished", marksBreakdown: "1 pt each" },
      { partLabel: "c", answer: "have lived / lived", marksBreakdown: "1 pt each" },
    ],
  },

  // ── Sciences Naturelles — 9ème ────────────────────────────────────────────
  {
    gradeLevel: "9eme",
    subject: "Sciences Naturelles",
    topic: "La cellule et les êtres vivants",
    type: "Exercice",
    difficulty: "facile",
    questionText: "Répondez aux questions suivantes sur la cellule.",
    totalMarks: 6,
    estimatedTimeMinutes: 12,
    parts: [
      { label: "a", text: "Citez les trois éléments communs à toute cellule (animale ou végétale).", marks: 2 },
      { label: "b", text: "Donnez deux différences entre une cellule animale et une cellule végétale.", marks: 2 },
      { label: "c", text: "Quelle est la fonction du noyau cellulaire ?", marks: 2 },
    ],
    markSchemes: [
      { partLabel: "a", answer: "La membrane cellulaire, le cytoplasme et le noyau.", marksBreakdown: "1 pt pour 2 éléments corrects, 1 pt pour le 3ème" },
      { partLabel: "b", answer: "Exemples : la cellule végétale possède une paroi cellulaire et des chloroplastes, absents chez la cellule animale. La cellule végétale a une grande vacuole centrale.", marksBreakdown: "1 pt par différence valide" },
      { partLabel: "c", answer: "Le noyau est le centre de contrôle de la cellule : il contient l'ADN (information génétique) et dirige toutes les activités cellulaires.", marksBreakdown: "1 pt ADN/info génétique, 1 pt rôle directeur" },
    ],
  },
];

// ── Seed logic ────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${questions.length} questions...`);

  for (const q of questions) {
    // Skip if an identical question already exists (idempotent re-runs)
    const existing = await db
      .select({ id: questionsTable.id })
      .from(questionsTable)
      .where(
        and(
          eq(questionsTable.gradeLevel, q.gradeLevel),
          eq(questionsTable.subject, q.subject),
          eq(questionsTable.questionText, q.questionText),
        )
      )
      .limit(1);
    if (existing.length > 0) {
      console.log(`  ⊘ skip (exists): [${q.gradeLevel}] ${q.subject} — ${q.topic}`);
      continue;
    }

    // Insert question
    const [inserted] = await db.insert(questionsTable).values({
      status: "published",
      gradeLevel: q.gradeLevel,
      sectionKey: q.sectionKey ?? null,
      subject: q.subject,
      topic: q.topic,
      type: q.type,
      difficulty: q.difficulty,
      language: "Français",
      questionText: q.questionText,
      context: q.context ?? null,
      requiresCalculator: q.requiresCalculator ?? false,
      totalMarks: q.totalMarks,
      estimatedTimeMinutes: q.estimatedTimeMinutes,
    }).returning({ id: questionsTable.id });

    const qId = inserted.id;

    // Insert parts
    for (let i = 0; i < q.parts.length; i++) {
      const p = q.parts[i];
      await db.insert(questionPartsTable).values({
        questionId: qId,
        label: p.label,
        text: p.text,
        marks: p.marks,
        orderIndex: i,
      });
    }

    // Insert mark schemes
    for (let i = 0; i < q.markSchemes.length; i++) {
      const ms = q.markSchemes[i];
      await db.insert(markSchemesTable).values({
        questionId: qId,
        partLabel: ms.partLabel,
        answer: ms.answer,
        marksBreakdown: ms.marksBreakdown ?? null,
        orderIndex: i,
      });
    }

    console.log(`  ✓ [${q.gradeLevel}${q.sectionKey ? "/" + q.sectionKey : ""}] ${q.subject} — ${q.topic}`);
  }

  console.log("\nDone. All questions seeded successfully.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
