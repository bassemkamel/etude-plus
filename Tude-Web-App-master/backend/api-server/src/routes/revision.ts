/**
 * Revision routes
 *
 * revisionRouter    → mounted at /api/revision
 *   POST /process-upload  — internal fire-and-forget trigger (admin-only HTTP interface)
 *
 * adminKBRouter     → mounted at /api/admin/knowledge-base
 *   GET  /errors  — admin-only processing error log
 *   GET  /stats   — admin-only generation counts
 *
 * Professors have ZERO visibility of these endpoints.
 */

import { Router } from "express";
import { db, processingErrorsTable, flashcardsTable, notionsTable, annalesTable, questionsTable, questionPartsTable, markSchemesTable } from "@workspace/db";
import { desc, count, eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { processUpload, type ProcessUploadParams } from "../services/knowledgeBaseProcessor";

// ── /api/revision/* ───────────────────────────────────────────────────────────

export const revisionRouter = Router();

/**
 * GET /api/revision/ping
 * Unauthenticated health check — confirms the revision router is mounted and reachable.
 * Visit this URL directly in a browser to verify backend connectivity.
 */
revisionRouter.get("/ping", (_req, res) => {
  res.json({
    ok: true,
    routes: [
      "GET /api/revision/content/questions",
      "GET /api/revision/content/topics",
      "GET /api/revision/content/annales",
      "GET /api/revision/content/flashcards",
    ],
  });
});

/**
 * POST /api/revision/process-upload
 * Internal trigger — fires background processing for a specific uploaded file.
 * Admin-only so it can also be called manually for re-processing.
 * Responds immediately; AI work runs in the background.
 */
revisionRouter.post("/process-upload", requireAuth, requireAdmin, async (req, res) => {
  const { file_id, file_url, file_type, subject, grade_level, section_key, topic } = req.body;

  if (!file_id || !file_url || !subject || !grade_level) {
    res.status(400).json({ error: "file_id, file_url, subject, grade_level are required" });
    return;
  }

  const params: ProcessUploadParams = {
    fileId:     Number(file_id),
    fileUrl:    String(file_url),
    fileType:   file_type ? String(file_type) : null,
    subject:    String(subject),
    gradeLevel: String(grade_level),
    sectionKey: section_key ? String(section_key) : null,
    topic:      topic ? String(topic) : "",
  };

  // Acknowledge immediately
  res.json({ queued: true, fileId: params.fileId });

  // Background processing — errors handled internally, never surfaced
  setImmediate(() => {
    processUpload(params).catch(err =>
      console.error("[revision/process-upload] Unhandled error:", err)
    );
  });
});

// ── Student-facing content endpoints ─────────────────────────────────────────

/**
 * GET /api/revision/content/questions
 * Returns published questions for a given subject/gradeLevel.
 * Includes parts and markschemes so the frontend can render full correction.
 * Query params: subject, gradeLevel, sectionKey?, topic?, limit?, difficulty?
 */
revisionRouter.get("/content/questions", requireAuth, async (req, res) => {
  const { subject, gradeLevel, sectionKey, topic, difficulty, type } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  if (!subject || !gradeLevel) {
    res.status(400).json({ error: "subject and gradeLevel are required" });
    return;
  }

  const conditions = [
    eq(questionsTable.status, "published"),
    eq(questionsTable.subject, String(subject)),
    eq(questionsTable.gradeLevel, String(gradeLevel)),
  ];
  if (sectionKey) conditions.push(eq(questionsTable.sectionKey, String(sectionKey)));
  if (topic) conditions.push(eq(questionsTable.topic, String(topic)));
  if (difficulty) conditions.push(eq(questionsTable.difficulty, String(difficulty)));
  if (type) conditions.push(eq(questionsTable.type, String(type)));

  const questions = await db
    .select()
    .from(questionsTable)
    .where(and(...conditions))
    .limit(limit);

  const questionIds = questions.map(q => q.id);

  if (questionIds.length === 0) {
    res.json([]);
    return;
  }

  // Fetch parts and markschemes for all questions
  const [parts, schemes] = await Promise.all([
    db.select().from(questionPartsTable).where(inArray(questionPartsTable.questionId, questionIds)),
    db.select().from(markSchemesTable).where(inArray(markSchemesTable.questionId, questionIds)),
  ]);

  const enriched = questions.map(q => ({
    ...q,
    parts: parts.filter(p => p.questionId === q.id).sort((a, b) => a.orderIndex - b.orderIndex),
    markScheme: schemes.filter(s => s.questionId === q.id).sort((a, b) => a.orderIndex - b.orderIndex),
  }));

  res.json(enriched);
});

/**
 * GET /api/revision/content/topics
 * Returns distinct topics for a subject/gradeLevel (for topic picker).
 */
revisionRouter.get("/content/topics", requireAuth, async (req, res) => {
  const { subject, gradeLevel, sectionKey } = req.query;
  if (!subject || !gradeLevel) {
    res.status(400).json({ error: "subject and gradeLevel are required" });
    return;
  }

  const conditions = [
    eq(questionsTable.status, "published"),
    eq(questionsTable.subject, String(subject)),
    eq(questionsTable.gradeLevel, String(gradeLevel)),
  ];
  if (sectionKey) conditions.push(eq(questionsTable.sectionKey, String(sectionKey)));

  const rows = await db
    .selectDistinct({ topic: questionsTable.topic })
    .from(questionsTable)
    .where(and(...conditions));

  res.json(rows.map(r => r.topic));
});

/**
 * GET /api/revision/content/annales
 * Returns published annales for a given subject/gradeLevel.
 */
revisionRouter.get("/content/annales", requireAuth, async (req, res) => {
  const { subject, gradeLevel, sectionKey } = req.query;
  if (!subject || !gradeLevel) {
    res.status(400).json({ error: "subject and gradeLevel are required" });
    return;
  }

  const conditions = [
    eq(annalesTable.status, "live"),
    eq(annalesTable.subject, String(subject)),
    eq(annalesTable.gradeLevel, String(gradeLevel)),
  ];
  if (sectionKey) conditions.push(eq(annalesTable.sectionKey, String(sectionKey)));

  const annales = await db
    .select()
    .from(annalesTable)
    .where(and(...conditions))
    .orderBy(desc(annalesTable.year));

  res.json(annales);
});

/**
 * GET /api/revision/content/flashcards
 * Returns published flashcards for a given subject/gradeLevel.
 */
revisionRouter.get("/content/flashcards", requireAuth, async (req, res) => {
  const { subject, gradeLevel, sectionKey, topic } = req.query;
  if (!subject || !gradeLevel) {
    res.status(400).json({ error: "subject and gradeLevel are required" });
    return;
  }

  const conditions = [
    eq(flashcardsTable.status, "live"),
    eq(flashcardsTable.subject, String(subject)),
    eq(flashcardsTable.gradeLevel, String(gradeLevel)),
  ];
  if (sectionKey) conditions.push(eq(flashcardsTable.sectionKey, String(sectionKey)));
  if (topic)      conditions.push(eq(flashcardsTable.topic,      String(topic)));

  const cards = await db
    .select()
    .from(flashcardsTable)
    .where(and(...conditions));

  res.json(cards);
});

/**
 * GET /api/revision/content/notions
 * Returns published notions/key concepts for a given subject/gradeLevel.
 */
revisionRouter.get("/content/notions", requireAuth, async (req, res) => {
  const { subject, gradeLevel, sectionKey } = req.query;
  if (!subject || !gradeLevel) {
    res.status(400).json({ error: "subject and gradeLevel are required" });
    return;
  }

  const conditions = [
    eq(notionsTable.status, "live"),
    eq(notionsTable.subject, String(subject)),
    eq(notionsTable.gradeLevel, String(gradeLevel)),
  ];
  if (sectionKey) conditions.push(eq(notionsTable.sectionKey, String(sectionKey)));

  const notions = await db
    .select()
    .from(notionsTable)
    .where(and(...conditions));

  res.json(notions);
});

// ── /api/admin/knowledge-base/* ───────────────────────────────────────────────

export const adminKBRouter = Router();

// All admin KB routes require admin
adminKBRouter.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/knowledge-base/errors
 * View silent processing failures. NEVER exposed to professors.
 */
adminKBRouter.get("/errors", async (_req, res) => {
  const errors = await db
    .select()
    .from(processingErrorsTable)
    .orderBy(desc(processingErrorsTable.attemptedAt))
    .limit(200);
  res.json(errors);
});

/**
 * GET /api/admin/knowledge-base/stats
 * Quick counts of AI-generated content.
 */
adminKBRouter.get("/stats", async (_req, res) => {
  const [[fc], [nt], [an], [er]] = await Promise.all([
    db.select({ value: count() }).from(flashcardsTable),
    db.select({ value: count() }).from(notionsTable),
    db.select({ value: count() }).from(annalesTable),
    db.select({ value: count() }).from(processingErrorsTable),
  ]);
  res.json({
    flashcards: Number(fc?.value ?? 0),
    notions:    Number(nt?.value ?? 0),
    annales:    Number(an?.value ?? 0),
    errors:     Number(er?.value ?? 0),
  });
});
