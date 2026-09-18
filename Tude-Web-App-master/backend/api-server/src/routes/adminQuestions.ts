import { Router } from "express";
import { db, questionsTable, questionPartsTable, markSchemesTable } from "@workspace/db";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedPart {
  label: string;
  text: string;
  marks: number;
}
interface GeneratedMarkScheme {
  label: string;
  answer: string;
  marks_breakdown: string;
}
interface GeneratedQuestion {
  question_text: string;
  context: string | null;
  requires_calculator: boolean;
  parts: GeneratedPart[];
  mark_scheme: GeneratedMarkScheme[];
  difficulty: string;
  type: string;
  estimated_time_minutes: number;
}

// ── POST /api/admin/questions/generate ────────────────────────────────────────
// Calls Anthropic API and returns generated JSON — does NOT save to DB
router.post("/generate", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Service IA non configuré. Définissez ANTHROPIC_API_KEY." });
    return;
  }

  const {
    gradeLevel, sectionKey, subject, topic, type, difficulty,
    numParts, totalMarks, language, instructions,
  } = req.body as {
    gradeLevel: string;
    sectionKey?: string;
    subject: string;
    topic: string;
    type: string;
    difficulty: string;
    numParts: number;
    totalMarks: number;
    language: string;
    instructions?: string;
  };

  if (!gradeLevel || !subject || !topic || !type || !difficulty || !numParts || !totalMarks || !language) {
    res.status(400).json({ error: "Champs obligatoires manquants." });
    return;
  }

  const gradeLabelMap: Record<string, string> = {
    "7eme": "7ème année de base",
    "8eme": "8ème année de base",
    "9eme": "9ème année de base",
    "1ere_secondaire": "1ère année secondaire",
    "2eme": "2ème secondaire",
    "3eme": "3ème secondaire",
    "bac": "Baccalauréat",
  };
  const gradeLabel = gradeLabelMap[gradeLevel] ?? gradeLevel;
  const sectionNote = sectionKey ? ` (section: ${sectionKey.replace(/_/g, " ")})` : "";
  const instrNote = instructions?.trim() ? `\nInstructions supplémentaires: ${instructions.trim()}` : "";
  const langMap: Record<string, string> = { Français: "French", Arabe: "Arabic", Anglais: "English" };
  const langCode = langMap[language] ?? "French";

  const systemPrompt = `You are an expert educator specializing in the Tunisian national curriculum (programmes officiels tunisiens). You create high-quality exam questions in the style of Tunisian school assessments (contrôles, compositions, bac).
Your questions must:
- Match the exact level and difficulty requested
- Be written in the requested language (French, Arabic, or English)
- Follow Tunisian curriculum scope and notation conventions
- Include realistic context where appropriate
- Always output valid JSON only, no markdown, no explanation`;

  const userPrompt = `Generate a ${type} question for a ${gradeLabel}${sectionNote} student in Tunisia.
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Number of sub-parts: ${numParts}
Total marks: ${totalMarks}${instrNote}

Return a JSON object with this exact structure:
{
  "question_text": "Full question stem in ${langCode}",
  "context": "Optional table or scenario as HTML string, or null",
  "requires_calculator": true or false,
  "parts": [
    {
      "label": "a",
      "text": "Sub-question text",
      "marks": 2
    }
  ],
  "mark_scheme": [
    {
      "label": "a",
      "answer": "Model answer",
      "marks_breakdown": "Explanation of how marks are awarded"
    }
  ],
  "difficulty": "${difficulty}",
  "type": "${type}",
  "estimated_time_minutes": 10
}

IMPORTANT: Output ONLY the JSON object. No markdown, no code fences, no explanation text.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error?.message ?? `Anthropic error ${response.status}`);
    }

    const data = await response.json() as any;
    const rawText: string = data.content?.[0]?.text ?? "";

    // Strip markdown code fences if the model adds them despite the instruction
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let generated: GeneratedQuestion;
    try {
      generated = JSON.parse(jsonText);
    } catch {
      console.error("[adminQuestions/generate] Invalid JSON from AI:", rawText.slice(0, 500));
      res.status(500).json({ error: "La réponse IA n'est pas du JSON valide. Réessayez.", raw: rawText.slice(0, 500) });
      return;
    }

    res.json({ generated });
  } catch (err: any) {
    console.error("[adminQuestions/generate] error:", err.message);
    res.status(500).json({ error: "Erreur lors de la génération. Réessayez.", detail: err.message });
  }
});

// ── POST /api/admin/questions ─────────────────────────────────────────────────
// Save a question (with parts + mark scheme)
router.post("/", async (req, res) => {
  const user = (req as any).user;
  const {
    gradeLevel, sectionKey, subject, topic, type, difficulty, language,
    questionText, context, requiresCalculator, totalMarks, estimatedTimeMinutes,
    status = "draft",
    parts = [],
    markScheme = [],
  } = req.body;

  if (!gradeLevel || !subject || !topic || !type || !difficulty || !questionText) {
    res.status(400).json({ error: "Champs obligatoires manquants." });
    return;
  }

  const [question] = await db.insert(questionsTable).values({
    createdBy: user.id,
    status,
    gradeLevel,
    sectionKey: sectionKey ?? null,
    subject,
    topic,
    type,
    difficulty,
    language: language ?? "Français",
    questionText,
    context: context ?? null,
    requiresCalculator: requiresCalculator ?? false,
    totalMarks: totalMarks ?? null,
    estimatedTimeMinutes: estimatedTimeMinutes ?? null,
  }).returning();

  if (parts.length > 0) {
    await db.insert(questionPartsTable).values(
      parts.map((p: any, i: number) => ({
        questionId: question.id,
        label: p.label,
        text: p.text,
        marks: p.marks,
        orderIndex: i,
      }))
    );
  }

  if (markScheme.length > 0) {
    await db.insert(markSchemesTable).values(
      markScheme.map((m: any, i: number) => ({
        questionId: question.id,
        partLabel: m.label,
        answer: m.answer,
        marksBreakdown: m.marks_breakdown ?? m.marksBreakdown ?? null,
        orderIndex: i,
      }))
    );
  }

  res.status(201).json({ question });
});

// ── GET /api/admin/questions ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { gradeLevel, subject, status: filterStatus, limit = "50", page = "1" } = req.query as Record<string, string>;
  const limitN = Math.min(parseInt(limit) || 50, 100);
  const offset = (parseInt(page) - 1) * limitN;

  const conditions: ReturnType<typeof eq>[] = [];
  if (gradeLevel) conditions.push(eq(questionsTable.gradeLevel, gradeLevel));
  if (subject) conditions.push(eq(questionsTable.subject, subject));
  if (filterStatus) conditions.push(eq(questionsTable.status, filterStatus));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(questionsTable).where(whereClause);

  const rows = await db
    .select({
      id: questionsTable.id,
      status: questionsTable.status,
      gradeLevel: questionsTable.gradeLevel,
      sectionKey: questionsTable.sectionKey,
      subject: questionsTable.subject,
      topic: questionsTable.topic,
      type: questionsTable.type,
      difficulty: questionsTable.difficulty,
      language: questionsTable.language,
      totalMarks: questionsTable.totalMarks,
      createdAt: questionsTable.createdAt,
    })
    .from(questionsTable)
    .where(whereClause)
    .orderBy(desc(questionsTable.createdAt))
    .limit(limitN)
    .offset(offset);

  res.json({ questions: rows, total, page: parseInt(page), limit: limitN });
});

// ── GET /api/admin/questions/:id ──────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide" }); return; }

  const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, id));
  if (!question) { res.status(404).json({ error: "Question introuvable" }); return; }

  const parts = await db.select().from(questionPartsTable).where(eq(questionPartsTable.questionId, id)).orderBy(questionPartsTable.orderIndex);
  const scheme = await db.select().from(markSchemesTable).where(eq(markSchemesTable.questionId, id)).orderBy(markSchemesTable.orderIndex);

  res.json({ question, parts, markScheme: scheme });
});

// ── PUT /api/admin/questions/:id ──────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide" }); return; }

  const {
    gradeLevel, sectionKey, subject, topic, type, difficulty, language,
    questionText, context, requiresCalculator, totalMarks, estimatedTimeMinutes, status,
    parts = [], markScheme = [],
  } = req.body;

  const [updated] = await db.update(questionsTable).set({
    gradeLevel, sectionKey, subject, topic, type, difficulty, language,
    questionText, context, requiresCalculator, totalMarks, estimatedTimeMinutes, status,
    updatedAt: new Date(),
  }).where(eq(questionsTable.id, id)).returning();

  if (!updated) { res.status(404).json({ error: "Question introuvable" }); return; }

  // Replace parts and mark scheme
  await db.delete(questionPartsTable).where(eq(questionPartsTable.questionId, id));
  await db.delete(markSchemesTable).where(eq(markSchemesTable.questionId, id));

  if (parts.length > 0) {
    await db.insert(questionPartsTable).values(
      parts.map((p: any, i: number) => ({ questionId: id, label: p.label, text: p.text, marks: p.marks, orderIndex: i }))
    );
  }
  if (markScheme.length > 0) {
    await db.insert(markSchemesTable).values(
      markScheme.map((m: any, i: number) => ({
        questionId: id, partLabel: m.label, answer: m.answer,
        marksBreakdown: m.marks_breakdown ?? m.marksBreakdown ?? null, orderIndex: i,
      }))
    );
  }

  res.json({ question: updated });
});

// ── POST /api/admin/questions/:id/publish ─────────────────────────────────────
router.post("/:id/publish", async (req, res) => {
  const id = parseInt(req.params.id);
  const [q] = await db.select({ status: questionsTable.status }).from(questionsTable).where(eq(questionsTable.id, id));
  if (!q) { res.status(404).json({ error: "Question introuvable" }); return; }

  const newStatus = q.status === "published" ? "draft" : "published";
  await db.update(questionsTable).set({ status: newStatus, updatedAt: new Date() }).where(eq(questionsTable.id, id));
  res.json({ status: newStatus });
});

// ── DELETE /api/admin/questions/:id ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide" }); return; }
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.json({ success: true });
});

export default router;
