/**
 * Knowledge Base Processor — background AI pipeline triggered after professor uploads.
 * All processing is silent: no professor notifications, no UI changes.
 * Errors are logged to processing_errors (admin-only) and never surfaced to professors.
 */

import {
  db,
  questionsTable,
  questionPartsTable,
  markSchemesTable,
  flashcardsTable,
  notionsTable,
  annalesTable,
  processingErrorsTable,
  curriculumChaptersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { extractText } from "./contentExtractor";

// ── Tunisian Curriculum Chapter Map ──────────────────────────────────────────

export const curriculumMap: Record<string, Record<string, string[]>> = {
  "7eme": {
    "Mathématiques": [
      "Nombres entiers et décimaux",
      "Fractions et nombres rationnels",
      "Proportionnalité",
      "Géométrie plane (triangles, symétrie)",
      "Statistiques et représentation graphique",
      "Périmètres et aires",
    ],
    "Sciences de la Vie et de la Terre": [
      "La cellule, unité du vivant",
      "La nutrition chez les êtres vivants",
      "La reproduction",
      "Les écosystèmes",
      "Le corps humain et santé",
    ],
    "Physique-Chimie": [
      "États et changements d'état de la matière",
      "Mélanges et corps purs",
      "L'électricité (circuits simples)",
      "Les mouvements et les forces",
    ],
  },
  "8eme": {
    "Mathématiques": [
      "Nombres relatifs",
      "Calcul littéral et équations du 1er degré",
      "Théorème de Pythagore",
      "Géométrie dans l'espace",
      "Fonctions linéaires",
      "Statistiques",
    ],
    "Sciences de la Vie et de la Terre": [
      "La photosynthèse",
      "La respiration et la fermentation",
      "Le système nerveux",
      "La reproduction sexuée",
      "L'immunologie",
    ],
    "Physique-Chimie": [
      "La lumière et l'optique",
      "Les atomes et les molécules",
      "Les réactions chimiques",
      "L'énergie électrique",
    ],
  },
  "9eme": {
    "Mathématiques": [
      "Les nombres réels",
      "Équations et inéquations du 2nd degré",
      "Vecteurs et translations",
      "Trigonométrie",
      "Fonctions et représentations graphiques",
      "Probabilités et statistiques",
    ],
    "Sciences de la Vie et de la Terre": [
      "La génétique et l'hérédité",
      "L'évolution des êtres vivants",
      "Le système hormonal",
      "L'environnement et développement durable",
    ],
    "Physique-Chimie": [
      "Mécanique — forces et mouvements",
      "Chimie des solutions",
      "L'électromagnétisme",
      "Transformations chimiques",
    ],
  },
  "1ere_secondaire": {
    "Mathématiques": [
      "Logique et raisonnement",
      "Ensembles de nombres (ℝ, ℤ, ℚ)",
      "Fonctions — généralités",
      "Fonctions affines et polynômes du 2nd degré",
      "Géométrie analytique",
      "Suites numériques",
    ],
    "Sciences de la Vie et de la Terre": [
      "La communication nerveuse et hormonale",
      "L'immunologie approfondie",
      "La génétique moléculaire",
      "L'écologie",
    ],
    "Physique-Chimie": [
      "Mécanique newtonienne",
      "Ondes mécaniques",
      "Chimie organique — introduction",
      "Thermodynamique — introduction",
    ],
  },
  "2eme": {
    "Mathématiques": [
      "Analyse — limites et continuité",
      "Dérivation et étude de fonctions",
      "Intégration",
      "Suites et récurrences",
      "Nombres complexes",
      "Probabilités",
    ],
    "Sciences de la Vie et de la Terre": [
      "Génétique et expression génétique",
      "Neurosciences",
      "Immunologie",
      "Géologie",
    ],
    "Physique-Chimie": [
      "Mécanique — cinématique et dynamique",
      "Électricité — régimes transitoires",
      "Ondes — optique",
      "Chimie organique",
    ],
  },
  "3eme": {
    "Mathématiques": [
      "Analyse avancée",
      "Algèbre linéaire",
      "Géométrie dans l'espace",
      "Statistiques et probabilités avancées",
      "Équations différentielles",
    ],
    "Sciences de la Vie et de la Terre": [
      "Bilan métabolique",
      "Géologie approfondie",
      "Génétique des populations",
    ],
    "Physique-Chimie": [
      "Mécanique avancée",
      "Électricité avancée",
      "Chimie des solutions avancée",
      "Physique nucléaire — introduction",
    ],
  },
  "bac": {
    "Mathématiques": [
      "Révision analyse complète",
      "Révision algèbre et géométrie",
      "Révision probabilités",
      "Annales bac — exercices types",
    ],
    "Sciences de la Vie et de la Terre": [
      "Révision génétique complète",
      "Révision immunologie",
      "Révision géologie",
      "Annales bac SVT",
    ],
    "Physique-Chimie": [
      "Révision mécanique complète",
      "Révision électricité complète",
      "Révision chimie organique",
      "Annales bac physique-chimie",
    ],
  },
};

// ── Chapter Matching ──────────────────────────────────────────────────────────

/**
 * Simple keyword match between extracted text and known curriculum chapters.
 * Returns the top 2-3 most relevant chapter names for the given grade+subject.
 */
function matchChapters(gradeLevel: string, subject: string, text: string): string[] {
  const chapters = curriculumMap[gradeLevel]?.[subject] ?? [];
  if (chapters.length === 0) return [];

  const lower = text.toLowerCase();

  const scored = chapters.map(chapter => {
    // Score: count keyword hits from chapter name words (>3 chars)
    const words = chapter.toLowerCase().split(/[\s—\-(),]+/).filter(w => w.length > 3);
    const hits  = words.filter(w => lower.includes(w)).length;
    return { chapter, score: hits };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.chapter);
}

// ── AI Generation ─────────────────────────────────────────────────────────────

interface GeneratedFlashcard { front: string; back: string; }
interface GeneratedNotion    { title: string; content: string; example: string | null; }
interface GeneratedPart      { label: string; text: string; marks: number; }
interface GeneratedMarkScheme { label: string; answer: string; marks_breakdown: string; }
interface GeneratedQuestion {
  text: string;
  type: string;
  difficulty: string;
  max_marks: number;
  requires_calculator: boolean;
  parts: GeneratedPart[];
  mark_scheme: GeneratedMarkScheme[];
}
interface GeneratedKnowledgeBase {
  questions:     GeneratedQuestion[];
  flashcards:    GeneratedFlashcard[];
  notions:       GeneratedNotion[];
  is_exam_paper: boolean;
  detected_topic: string;
}

interface GeneratedExamVariant {
  title:     string;
  questions: GeneratedQuestion[];
}

const GRADE_LABELS: Record<string, string> = {
  "7eme":             "7ème année de base",
  "8eme":             "8ème année de base",
  "9eme":             "9ème année de base",
  "1ere_secondaire":  "1ère année secondaire",
  "2eme":             "2ème secondaire",
  "3eme":             "3ème secondaire",
  "bac":              "Baccalauréat",
};

/**
 * AI text generation — uses Gemini if GEMINI_API_KEY is set, Anthropic otherwise.
 * Both providers receive the same system + user prompt and must return valid JSON.
 */
async function callAIText(systemPrompt: string, userPrompt: string, maxTokens = 16000): Promise<string> {
  if (process.env["GEMINI_API_KEY"]) {
    const apiKey = process.env["GEMINI_API_KEY"]!;
    console.log("[kb/ai] Using Gemini for generation");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error ${response.status}: ${(err as any).error?.message ?? JSON.stringify(err)}`);
    }
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  }

  if (process.env["ANTHROPIC_API_KEY"]) {
    const apiKey = process.env["ANTHROPIC_API_KEY"]!;
    console.log("[kb/ai] Using Anthropic for generation");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error ${response.status}: ${(err as any).error?.message ?? ""}`);
    }
    const data = await response.json() as { content: { text: string }[] };
    return (data.content?.[0]?.text ?? "").trim();
  }

  throw new Error("No AI API key set — add GEMINI_API_KEY or ANTHROPIC_API_KEY to use content generation");
}

async function callGenerationApi(
  extractedText:   string,
  subject:         string,
  gradeLevel:      string,
  sectionKey:      string | null,
  topic:           string,
  matchedChapters: string[],
): Promise<GeneratedKnowledgeBase> {
  const gradeLabel    = GRADE_LABELS[gradeLevel] ?? gradeLevel;
  const sectionNote   = sectionKey ? ` (section: ${sectionKey.replace(/_/g, " ")})` : "";
  const chaptersNote  = matchedChapters.length > 0
    ? matchedChapters.join(", ")
    : "non détectés — utiliser le contenu fourni";
  const snippet       = extractedText.slice(0, 6000);

  const systemPrompt = `You are an expert in the Tunisian national curriculum (programmes officiels du Ministère de l'Éducation tunisien). You generate exam questions in the exact style of Tunisian school assessments — contrôles de synthèse, devoirs de contrôle, and examens du baccalauréat.

Your questions must:
- Follow the official Tunisian programme for the exact grade and subject
- Use the same structure as real Tunisian exams (Exercice 1, Exercice 2... with sub-parts (a)(b)(c) and mark allocations that add up correctly to the total)
- For Maths: use standard Tunisian notation (ensemble ℝ, f: x↦..., tableau de variations, tableau de signes, droite numérique)
- For Sciences/Physics: use SI units, reference Tunisian textbook terminology exactly as students learn it
- For Arabic/French: follow the exact Tunisian programme literary texts and grammar points for the specific grade
- Mark schemes must show every step a student needs for full marks, with partial mark breakdowns
- Difficulty must genuinely match:
    Facile = direct application of a single rule or formula
    Moyen = requires 2-3 steps or combining concepts
    Difficile = multi-step, unfamiliar context, or synthesis across topics
- Questions must feel like they came from a real Tunisian exam paper, not a generic international textbook

Always output valid JSON only. No markdown, no preamble, no explanation.`;

  const userPrompt = `A professor uploaded the following educational content:
- Subject: ${subject}
- Grade level: ${gradeLabel}${sectionNote}
- Topic/Chapter: ${topic || "non précisé"}
- Detected chapters from curriculum mapping: ${chaptersNote}

Content:
${snippet}

IMPORTANT GENERATION RULES:
- If the source content is a SINGLE question or a short exercise: treat it as a template and generate 15 NEW variations inspired by the same topic, skill, and style — with different numbers, contexts, or sub-questions each time.
- If the source is a FULL EXAM PAPER: extract all its questions AND generate additional new questions in the same style to reach 15 total.
- If the source is a LESSON or NOTES: generate 15 practice questions covering the key concepts.
- ALWAYS generate exactly 15 questions, no matter the source length or type.
- Every question must have a complete mark scheme with step-by-step model answers.

Generate the following in one JSON response:
{
  "questions": [
    {
      "text": "Question stem in French (or Arabic if subject is Arabe)",
      "type": "Exercice",
      "difficulty": "Moyen",
      "max_marks": 4,
      "requires_calculator": false,
      "parts": [
        { "label": "a", "text": "sub-question", "marks": 2 },
        { "label": "b", "text": "sub-question", "marks": 2 }
      ],
      "mark_scheme": [
        {
          "label": "a",
          "answer": "complete model answer showing all steps",
          "marks_breakdown": "1 mark for setup, 1 mark for correct result"
        }
      ]
    }
  ],
  "flashcards": [
    { "front": "Term, formula, or question", "back": "Definition or full answer" }
  ],
  "notions": [
    {
      "title": "Concept name",
      "content": "Clear 2-3 sentence explanation in student-friendly French",
      "example": "Concrete example from Tunisian context, or null"
    }
  ],
  "is_exam_paper": true,
  "detected_topic": "Best matching chapter name from the curriculum"
}

Generate: 15 questions (4 Facile, 7 Moyen, 4 Difficile), 15 flashcards, 8 notions.
Set is_exam_paper=true if the source looks like an exam paper or annale.`;

  const rawText = await callAIText(systemPrompt, userPrompt, 16000);

  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  return JSON.parse(jsonText) as GeneratedKnowledgeBase;
}

// ── Exam Variant Generation ───────────────────────────────────────────────────

/**
 * Given the original questions from a detected exam paper, generate 3 new full
 * exam variants in the same style. Each variant has 5 questions with full mark schemes.
 * These are saved both as annales AND their questions go into the question bank.
 */
async function callExamVariantsApi(
  sourceQuestions: GeneratedQuestion[],
  subject:    string,
  gradeLevel: string,
  sectionKey: string | null,
  topic:      string,
): Promise<GeneratedExamVariant[]> {
  const gradeLabel  = GRADE_LABELS[gradeLevel] ?? gradeLevel;
  const sectionNote = sectionKey ? ` (section: ${sectionKey.replace(/_/g, " ")})` : "";

  const sourcePreview = sourceQuestions.slice(0, 5).map((q, i) =>
    `Q${i + 1} [${q.difficulty}, ${q.max_marks}pts]: ${q.text.slice(0, 120)}`
  ).join("\n");

  const systemPrompt = `You are an expert in the Tunisian national curriculum. You generate complete exam papers that closely follow the style, difficulty distribution, and mark allocation of real Tunisian school exams.

Always output valid JSON only. No markdown, no preamble.`;

  const userPrompt = `Generate 3 DIFFERENT complete exam variants for:
- Subject: ${subject}
- Grade: ${gradeLabel}${sectionNote}
- Topic/Chapter: ${topic}

Source exam style reference (do NOT copy these — generate NEW questions in the same style):
${sourcePreview}

Each variant must:
- Have exactly 5 questions (1 Facile, 2 Moyen, 2 Difficile)
- Use different numbers, contexts, and scenarios than the source and each other
- Have realistic Tunisian exam mark allocations (questions worth 2–6 points each, total ≈ 20 pts)
- Include full mark schemes for every part

Output format:
{
  "variants": [
    {
      "title": "Devoir de Contrôle N°1 — ${subject}",
      "questions": [
        {
          "text": "...",
          "type": "Exercice",
          "difficulty": "Moyen",
          "max_marks": 4,
          "requires_calculator": false,
          "parts": [{ "label": "a", "text": "...", "marks": 2 }],
          "mark_scheme": [{ "label": "a", "answer": "...", "marks_breakdown": "..." }]
        }
      ]
    }
  ]
}`;

  const rawText  = await callAIText(systemPrompt, userPrompt, 16000);
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const parsed = JSON.parse(jsonText) as { variants: GeneratedExamVariant[] };
  return parsed.variants ?? [];
}

// ── Save to DB ────────────────────────────────────────────────────────────────

interface SaveCounts { questions: number; flashcards: number; notions: number; annales: number; }

/**
 * Upsert a curriculum chapter row so chapter cards always appear in the student UI
 * even before any content is live.  Skips if a chapter with that name already exists.
 */
async function ensureCurriculumChapter(
  levelCode:  string,
  sectionKey: string | null,
  subject:    string,
  topicName:  string,
): Promise<void> {
  try {
    // Check whether a chapter with this name already exists for this level/subject
    const existing = await db
      .select({ id: curriculumChaptersTable.id })
      .from(curriculumChaptersTable)
      .where(
        and(
          eq(curriculumChaptersTable.levelCode,  levelCode),
          eq(curriculumChaptersTable.subject,    subject),
          eq(curriculumChaptersTable.name,       topicName),
        )
      )
      .limit(1);

    if (existing.length > 0) return;  // already exists — nothing to do

    // Get the next orderIndex for this level/subject
    const [maxRow] = await db
      .select({ maxIdx: sql<number>`coalesce(max(order_index), -1)` })
      .from(curriculumChaptersTable)
      .where(
        and(
          eq(curriculumChaptersTable.levelCode, levelCode),
          eq(curriculumChaptersTable.subject,   subject),
        )
      );
    const nextIdx = (maxRow?.maxIdx ?? -1) + 1;

    const slug = topicName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 80);

    await db.insert(curriculumChaptersTable).values({
      levelCode,
      sectionKey:  sectionKey ?? null,
      subject,
      name:        topicName,
      shortName:   null,
      slug:        slug || `chapter-${nextIdx}`,
      orderIndex:  nextIdx,
      isActive:    true,
    });
  } catch (err: any) {
    // Non-fatal — chapter seeding is best-effort
    console.error("[kb/ensureCurriculumChapter] failed:", err.message);
  }
}

async function saveToKnowledgeBase(
  generated:   GeneratedKnowledgeBase,
  fileId:      number,
  gradeLevel:  string,
  sectionKey:  string | null,
  subject:     string,
  topicHint:   string,
  kbFileId:    number | null = null,
  annaleTitle: string | null = null,
): Promise<SaveCounts> {
  const topic = generated.detected_topic || topicHint || subject;

  // --- Questions ---
  // Saved as 'draft' so admin can review before they go live.
  // The admin /api/kb/files/:id/publish endpoint flips them to 'published'.
  for (const q of generated.questions) {
    const [inserted] = await db.insert(questionsTable).values({
      sourceFileId:        fileId || null,
      kbFileId:            kbFileId ?? null,
      createdBy:           null,
      status:              "draft",          // ← review-first: admin must publish
      gradeLevel,
      sectionKey:          sectionKey ?? null,
      subject,
      topic,
      type:                q.type || "Exercice",
      difficulty:          q.difficulty || "moyen",
      language:            subject === "Arabe" ? "Arabe" : "Français",
      questionText:        q.text,
      context:             null,
      requiresCalculator:  q.requires_calculator ?? false,
      totalMarks:          q.max_marks ?? null,
      estimatedTimeMinutes: null,
    }).returning();

    for (let i = 0; i < q.parts.length; i++) {
      const p = q.parts[i];
      await db.insert(questionPartsTable).values({
        questionId: inserted.id,
        label:      p.label,
        text:       p.text,
        marks:      p.marks,
        orderIndex: i,
      });
    }

    for (let i = 0; i < q.mark_scheme.length; i++) {
      const ms = q.mark_scheme[i];
      await db.insert(markSchemesTable).values({
        questionId:     inserted.id,
        partLabel:      ms.label,
        answer:         ms.answer,
        marksBreakdown: ms.marks_breakdown ?? null,
        orderIndex:     i,
      });
    }
  }

  // --- Flashcards (live immediately — lower-risk content) ---
  for (const fc of generated.flashcards) {
    await db.insert(flashcardsTable).values({
      sourceFileId: fileId || null,
      kbFileId:     kbFileId ?? null,
      gradeLevel,
      sectionKey:  sectionKey ?? null,
      subject,
      topic,
      front:       fc.front,
      back:        fc.back,
      status:      "live",
    });
  }

  // --- Notions (live immediately) ---
  for (const n of generated.notions) {
    await db.insert(notionsTable).values({
      sourceFileId: fileId || null,
      kbFileId:     kbFileId ?? null,
      gradeLevel,
      sectionKey:  sectionKey ?? null,
      subject,
      topic,
      title:       n.title,
      content:     n.content,
      example:     n.example ?? null,
      status:      "live",
    });
  }

  // --- Annale (if detected as exam paper, or content_type forces it) ---
  let annalesCreated = 0;
  if (generated.is_exam_paper) {
    // Store questions in a structure the Annales.tsx page can parse.
    // The page expects: content = JSON array of { question, parts?, totalMarks? }
    const annaleContent = generated.questions.map(q => ({
      question:   q.text,
      parts:      q.parts.map(p => ({ label: p.label, text: p.text, marks: p.marks })),
      totalMarks: q.max_marks,
    }));
    // Solution: array of { label, answer, marks_breakdown }
    const annaleSolution = generated.questions.flatMap(q => q.mark_scheme);

    await db.insert(annalesTable).values({
      sourceFileId: fileId || null,
      kbFileId:     kbFileId ?? null,
      gradeLevel,
      sectionKey:  sectionKey ?? null,
      subject,
      topic:       annaleTitle ?? topic,
      year:        null,
      content:     JSON.stringify(annaleContent),
      solution:    JSON.stringify(annaleSolution),
      status:      "live",
    });
    annalesCreated = 1;
  }

  // --- Seed curriculum chapter for this topic so chapter cards always appear ---
  if (topic) {
    await ensureCurriculumChapter(gradeLevel, sectionKey, subject, topic);
  }

  return {
    questions:  generated.questions.length,
    flashcards: generated.flashcards.length,
    notions:    generated.notions.length,
    annales:    annalesCreated,
  };
}

// ── Deduplication ─────────────────────────────────────────────────────────────

async function alreadyProcessed(fileId: number): Promise<boolean> {
  const existing = await db
    .select({ id: flashcardsTable.id })
    .from(flashcardsTable)
    .where(eq(flashcardsTable.sourceFileId, fileId))
    .limit(1);
  return existing.length > 0;
}

// ── Error logging (silent — admin-only) ───────────────────────────────────────

async function logProcessingError(
  fileId:       number,
  fileUrl:      string,
  subject:      string,
  gradeLevel:   string,
  errorMessage: string,
  errorStage:   string,
  retryCount:   number,
  kbFileId?:    number | null,
): Promise<void> {
  try {
    await db.insert(processingErrorsTable).values({
      fileId:       fileId || null,
      kbFileId:     kbFileId ?? null,
      fileUrl,
      subject,
      gradeLevel,
      errorMessage: errorMessage.slice(0, 2000),
      errorStage,
      retryCount,
    });
  } catch (logErr) {
    // Last-resort console log only — never surfaces to professor
    console.error("[kb/error-log] Failed to write error to DB:", logErr);
  }
}

// ── Public Entry Point ────────────────────────────────────────────────────────

export interface ProcessUploadParams {
  fileId:     number;   // materialsTable.id for professor uploads, 0 for KB admin uploads
  fileUrl:    string;
  fileType:   string | null;
  subject:    string;
  gradeLevel: string;
  sectionKey: string | null;
  topic:      string;
  kbFileId?:  number;  // knowledgeBaseFilesTable.id — set for admin KB uploads
  forceIsExamPaper?: boolean; // override for 'examen' / 'annale' content types
}

export interface ProcessUploadResult {
  questions:  number;
  flashcards: number;
  notions:    number;
  annales:    number;
}

/**
 * Main background processor. Fire-and-forget — caller does NOT await.
 * Never throws; all errors are silently logged to processing_errors.
 * Returns counts on success, null on failure.
 */
export async function processUpload(params: ProcessUploadParams): Promise<ProcessUploadResult | null> {
  const { fileId, fileUrl, fileType, subject, gradeLevel, sectionKey, topic, kbFileId = null, forceIsExamPaper = false } = params;
  const label = kbFileId ? `KB file ${kbFileId}` : `material ${fileId}`;

  console.log(`[kb] Starting processing for ${label} (${subject} / ${gradeLevel})`);

  // Deduplication — skip professor materials already processed; always run for KB files
  if (!kbFileId && fileId && await alreadyProcessed(fileId)) {
    console.log(`[kb] ${label} already processed — skipping`);
    return null;
  }

  // Stage: text extraction
  let extractedText: string;
  try {
    extractedText = await extractText(fileUrl, fileType);
    if (!extractedText || extractedText.length < 20) {
      throw new Error("Extracted text too short or empty");
    }
    console.log(`[kb] Extracted ${extractedText.length} chars from ${label}`);
  } catch (err: any) {
    console.error(`[kb] Extraction failed for ${label}:`, err.message);
    await logProcessingError(fileId, fileUrl, subject, gradeLevel, err.message, "extraction", 0, kbFileId);
    return null;
  }

  // Curriculum chapter matching
  const matchedChapters = matchChapters(gradeLevel, subject, extractedText);
  console.log(`[kb] Matched chapters for ${label}:`, matchedChapters);

  // Stage: AI generation (one retry allowed)
  let generated: GeneratedKnowledgeBase;
  let attempt = 0;
  while (true) {
    try {
      generated = await callGenerationApi(
        extractedText, subject, gradeLevel, sectionKey, topic, matchedChapters,
      );
      // Force is_exam_paper for exam/annale content types
      if (forceIsExamPaper) generated.is_exam_paper = true;
      break;
    } catch (err: any) {
      attempt++;
      console.error(`[kb] Generation attempt ${attempt} failed for ${label}:`, err.message);
      if (attempt >= 2) {
        await logProcessingError(fileId, fileUrl, subject, gradeLevel, err.message, "generation", attempt, kbFileId);
        return null;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Stage: save base content to DB
  let counts: SaveCounts;
  try {
    counts = await saveToKnowledgeBase(generated!, fileId, gradeLevel, sectionKey, subject, topic, kbFileId);
    console.log(`[kb] Saved for ${label}:`, counts);
  } catch (err: any) {
    console.error(`[kb] Save failed for ${label}:`, err.message);
    await logProcessingError(fileId, fileUrl, subject, gradeLevel, err.message, "save", attempt, kbFileId);
    return null;
  }

  // Stage: exam variants — if source is an exam paper, generate 3 additional full exam variants.
  // Each variant's questions are saved to the question bank AND as a separate annale entry.
  if (generated!.is_exam_paper && generated!.questions.length > 0) {
    console.log(`[kb] Generating exam variants for ${label}…`);
    try {
      const variants = await callExamVariantsApi(
        generated!.questions, subject, gradeLevel, sectionKey, topic,
      );
      for (const variant of variants) {
        // Wrap variant as a GeneratedKnowledgeBase so we can reuse saveToKnowledgeBase
        const variantAsKB: GeneratedKnowledgeBase = {
          questions:      variant.questions,
          flashcards:     [],
          notions:        [],
          is_exam_paper:  true,
          detected_topic: generated!.detected_topic,
        };
        const variantCounts = await saveToKnowledgeBase(
          variantAsKB, fileId, gradeLevel, sectionKey, subject, topic, kbFileId,
          variant.title,
        );
        counts.questions += variantCounts.questions;
        counts.annales   += variantCounts.annales;
      }
      console.log(`[kb] Saved ${variants.length} exam variants for ${label}`);
    } catch (err: any) {
      // Variant generation failure is non-fatal — base content is already saved
      console.error(`[kb] Exam variant generation failed for ${label}:`, err.message);
    }
  }

  return counts;
}
