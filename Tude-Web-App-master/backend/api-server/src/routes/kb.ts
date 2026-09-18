/**
 * /api/kb — Admin knowledge base upload & management.
 * All routes require admin or super_admin role.
 * No link to this anywhere in the UI — accessed by typing /kb directly.
 */

import multer from "multer";
import { Router } from "express";
import {
  db,
  knowledgeBaseFilesTable,
  flashcardsTable,
  notionsTable,
  annalesTable,
  questionsTable,
  questionPartsTable,
  markSchemesTable,
  processingErrorsTable,
} from "@workspace/db";
// Note: curriculumChaptersTable seeding is handled inside knowledgeBaseProcessor
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { saveBufferToStorage, writeFileDataToDb } from "../lib/objectStorage";
import { processUpload } from "../services/knowledgeBaseProcessor";
import { reprocessAllErrorFiles } from "../lib/aiReprocessor";

// ── Multer setup (memory storage, 25MB limit) ─────────────────────────────────

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed =
      ALLOWED_MIMES.has(file.mimetype) ||
      /\.(pdf|txt|pptx|jpe?g|png)$/i.test(file.originalname);
    cb(null, allowed);
  },
});

const router = Router();

// ── GET /api/kb/ping ──────────────────────────────────────────────────────────
// Public health check — no auth required.
// Confirms the /api/kb router is mounted and reachable from the frontend.
// Use this to rule out routing / CORS / base-URL issues before debugging auth.
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "/api/kb" });
});

// ── Auth debug middleware ─────────────────────────────────────────────────────
// Logs exactly what every KB request carries so Railway logs show the root
// cause of any 401.  Safe to keep in production — never logs token values,
// only their presence/absence and the first 20 chars of the Authorization
// header (enough to confirm "Bearer " prefix without leaking the secret).
router.use((req, _res, next) => {
  const authHeader  = req.headers.authorization ?? null;
  const cookieName  = "etude_session";
  const cookieRaw   = (req as any).cookies?.[cookieName];
  console.log(
    `[kb] ${req.method} ${req.path}`,
    `| auth-header: ${authHeader ? authHeader.slice(0, 20) + "…" : "none"}`,
    `| cookie(${cookieName}): ${cookieRaw ? "present" : "absent"}`,
  );
  next();
});

// All KB routes require admin
router.use(requireAuth, requireAdmin);

// ── POST /api/kb/upload ───────────────────────────────────────────────────────
// Accepts multipart/form-data. Saves files, creates KB records, fires AI.
router.post("/upload", upload.array("files", 20), async (req, res) => {
  const user = (req as any).user;
  const files = (req as any).files as { buffer: Buffer; originalname: string; mimetype: string; }[] | undefined;

  if (!files || files.length === 0) {
    res.status(400).json({ error: "Aucun fichier reçu" });
    return;
  }

  const { subject, grade_level, section_key, topic, content_type, notes } = req.body;

  if (!subject || !grade_level || !topic || !content_type) {
    res.status(400).json({ error: "subject, grade_level, topic et content_type sont requis" });
    return;
  }

  const created: typeof knowledgeBaseFilesTable.$inferSelect[] = [];

  for (const file of files) {
    try {
      // Get the storage URL (for Neon mode this is a placeholder path until we have the row ID)
      const fileUrl = await saveBufferToStorage(file.buffer, file.originalname, file.mimetype);

      // Insert KB file record
      const [kbFile] = await db.insert(knowledgeBaseFilesTable).values({
        fileName:    file.originalname,
        fileUrl,
        fileType:    file.mimetype,
        subject,
        gradeLevel:  grade_level,
        sectionKey:  section_key || null,
        topic,
        contentType: content_type,
        notes:       notes || null,
        uploadedBy:  user.id,
        status:      "processing",
      }).returning();

      // For Neon-backed storage: write file bytes now that we have the row ID
      if (fileUrl.startsWith("/neon/")) {
        await writeFileDataToDb(kbFile.id, file.buffer, fileUrl);
      }

      created.push(kbFile);

      // Fire-and-forget background AI processing
      const forceIsExamPaper = ["examen", "annale"].includes(content_type);
      setImmediate(() => {
        processUpload({
          fileId:            0,
          fileUrl,
          fileType:          file.mimetype,
          subject,
          gradeLevel:        grade_level,
          sectionKey:        section_key || null,
          topic,
          kbFileId:          kbFile.id,
          forceIsExamPaper,
        }).then(async counts => {
          if (counts) {
            // Status 'ready' = processing done, content saved as draft — admin must review & publish
            await db.update(knowledgeBaseFilesTable)
              .set({
                status:          "ready",
                questionsCount:  counts.questions,
                flashcardsCount: counts.flashcards,
                notionsCount:    counts.notions,
                annalesCount:    counts.annales,
                processedAt:     new Date(),
              })
              .where(eq(knowledgeBaseFilesTable.id, kbFile.id));
          } else {
            // Fetch the real error from processing_errors so admin can diagnose it
            const [latestErr] = await db
              .select({ errorMessage: processingErrorsTable.errorMessage, errorStage: processingErrorsTable.errorStage })
              .from(processingErrorsTable)
              .where(eq(processingErrorsTable.kbFileId, kbFile.id))
              .orderBy(desc(processingErrorsTable.attemptedAt))
              .limit(1);
            const errorMsg = latestErr
              ? `[${latestErr.errorStage ?? "?"}] ${latestErr.errorMessage}`
              : "Traitement échoué — voir les logs";
            await db.update(knowledgeBaseFilesTable)
              .set({ status: "error", errorMessage: errorMsg.slice(0, 500) })
              .where(eq(knowledgeBaseFilesTable.id, kbFile.id));
          }
        }).catch(async err => {
          console.error("[kb/upload] processing error:", err);
          await db.update(knowledgeBaseFilesTable)
            .set({ status: "error", errorMessage: String(err.message ?? err).slice(0, 500) })
            .where(eq(knowledgeBaseFilesTable.id, kbFile.id));
        });
      });
    } catch (err: any) {
      console.error("[kb/upload] file error:", err);
      // Continue with remaining files
    }
  }

  res.json(created);
});

// ── GET /api/kb/files ─────────────────────────────────────────────────────────
// Optional query params: gradeLevel, sectionKey, subject
router.get("/files", async (req, res) => {
  const { gradeLevel, sectionKey, subject } = req.query as Record<string, string | undefined>;
  const conditions = [];
  if (gradeLevel) conditions.push(eq(knowledgeBaseFilesTable.gradeLevel, gradeLevel));
  if (sectionKey)  conditions.push(eq(knowledgeBaseFilesTable.sectionKey, sectionKey));
  if (subject)     conditions.push(eq(knowledgeBaseFilesTable.subject, subject));

  const files = await db
    .select()
    .from(knowledgeBaseFilesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(knowledgeBaseFilesTable.createdAt))
    .limit(200);
  res.json(files);
});

// ── GET /api/kb/folder-summary ────────────────────────────────────────────────
// Returns count of files per gradeLevel+sectionKey+subject — powers the folder UI
router.get("/folder-summary", async (_req, res) => {
  const rows = await db
    .select({
      gradeLevel: knowledgeBaseFilesTable.gradeLevel,
      sectionKey: knowledgeBaseFilesTable.sectionKey,
      subject:    knowledgeBaseFilesTable.subject,
      total:      sql<number>`count(*)::int`,
      processed:  sql<number>`count(*) filter (where ${knowledgeBaseFilesTable.status} = 'processed')::int`,
    })
    .from(knowledgeBaseFilesTable)
    .groupBy(
      knowledgeBaseFilesTable.gradeLevel,
      knowledgeBaseFilesTable.sectionKey,
      knowledgeBaseFilesTable.subject,
    );
  res.json(rows);
});

// ── GET /api/kb/files/status?ids=1,2,3 ───────────────────────────────────────
// Poll for status updates on specific file IDs
router.get("/files/status", async (req, res) => {
  const { ids } = req.query as { ids?: string };
  if (!ids) { res.json([]); return; }
  const idList = ids.split(",").map(Number).filter(n => n > 0);
  if (idList.length === 0) { res.json([]); return; }

  const files = await db
    .select()
    .from(knowledgeBaseFilesTable)
    .where(inArray(knowledgeBaseFilesTable.id, idList));
  res.json(files);
});

// ── GET /api/kb/files/:id ─────────────────────────────────────────────────────
// Get file details + all generated content
router.get("/files/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [file] = await db.select().from(knowledgeBaseFilesTable).where(eq(knowledgeBaseFilesTable.id, id));
  if (!file) { res.status(404).json({ error: "Fichier introuvable" }); return; }

  const [questions, flashcards, notions, annales] = await Promise.all([
    db.select().from(questionsTable).where(eq(questionsTable.kbFileId, id)),
    db.select().from(flashcardsTable).where(eq(flashcardsTable.kbFileId, id)),
    db.select().from(notionsTable).where(eq(notionsTable.kbFileId, id)),
    db.select().from(annalesTable).where(eq(annalesTable.kbFileId, id)),
  ]);

  res.json({ file, questions, flashcards, notions, annales });
});

// ── DELETE /api/kb/files/:id ──────────────────────────────────────────────────
// Delete file record + all generated content
router.delete("/files/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [file] = await db.select().from(knowledgeBaseFilesTable).where(eq(knowledgeBaseFilesTable.id, id));
  if (!file) { res.status(404).json({ error: "Fichier introuvable" }); return; }

  // Delete generated content first (cascade by kbFileId)
  // Questions require parts + mark schemes first
  const qs = await db.select({ id: questionsTable.id }).from(questionsTable).where(eq(questionsTable.kbFileId, id));
  if (qs.length > 0) {
    const qIds = qs.map(q => q.id);
    await db.delete(questionPartsTable).where(inArray(questionPartsTable.questionId, qIds));
    await db.delete(markSchemesTable).where(inArray(markSchemesTable.questionId, qIds));
    await db.delete(questionsTable).where(eq(questionsTable.kbFileId, id));
  }
  await db.delete(flashcardsTable).where(eq(flashcardsTable.kbFileId, id));
  await db.delete(notionsTable).where(eq(notionsTable.kbFileId, id));
  await db.delete(annalesTable).where(eq(annalesTable.kbFileId, id));
  await db.delete(knowledgeBaseFilesTable).where(eq(knowledgeBaseFilesTable.id, id));

  res.json({ success: true });
});

// ── GET /api/kb/check-duplicate ───────────────────────────────────────────────
router.get("/check-duplicate", async (req, res) => {
  const { file_name, subject, grade_level } = req.query as Record<string, string>;
  if (!file_name || !subject || !grade_level) { res.json({ duplicate: false }); return; }

  const [existing] = await db
    .select({ id: knowledgeBaseFilesTable.id, status: knowledgeBaseFilesTable.status })
    .from(knowledgeBaseFilesTable)
    .where(and(
      eq(knowledgeBaseFilesTable.fileName, file_name),
      eq(knowledgeBaseFilesTable.subject, subject),
      eq(knowledgeBaseFilesTable.gradeLevel, grade_level),
    ))
    .limit(1);

  res.json({ duplicate: !!existing, existing: existing ?? null });
});

// ── POST /api/kb/files/:id/publish ────────────────────────────────────────────
// Publishes all draft content (questions) generated from this KB file.
// Flashcards and notions are already live; annales are already live.
// Questions go from 'draft' → 'published' so students can access them.
router.post("/files/:id/publish", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [file] = await db
    .select()
    .from(knowledgeBaseFilesTable)
    .where(eq(knowledgeBaseFilesTable.id, id));

  if (!file) { res.status(404).json({ error: "Fichier introuvable" }); return; }
  if (file.status === "processing") {
    res.status(409).json({ error: "Le traitement est encore en cours" });
    return;
  }

  // Publish all draft questions linked to this KB file
  const result = await db
    .update(questionsTable)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(
      eq(questionsTable.kbFileId, id),
      eq(questionsTable.status, "draft"),
    ))
    .returning({ id: questionsTable.id });

  // Mark the KB file as fully processed / published
  await db
    .update(knowledgeBaseFilesTable)
    .set({ status: "processed" })
    .where(eq(knowledgeBaseFilesTable.id, id));

  res.json({ published: result.length });
});

// ── POST /api/kb/files/:id/reprocess ─────────────────────────────────────────
// Re-triggers AI processing for a file that previously failed or needs a refresh.
// Deletes all previously generated content first, then re-runs the pipeline.
router.post("/files/:id/reprocess", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [file] = await db
    .select()
    .from(knowledgeBaseFilesTable)
    .where(eq(knowledgeBaseFilesTable.id, id));

  if (!file) { res.status(404).json({ error: "Fichier introuvable" }); return; }
  if (file.status === "processing") {
    res.status(409).json({ error: "Le traitement est déjà en cours" });
    return;
  }

  // Delete previously generated content
  const qs = await db
    .select({ id: questionsTable.id })
    .from(questionsTable)
    .where(eq(questionsTable.kbFileId, id));
  if (qs.length > 0) {
    const qIds = qs.map(q => q.id);
    await db.delete(questionPartsTable).where(inArray(questionPartsTable.questionId, qIds));
    await db.delete(markSchemesTable).where(inArray(markSchemesTable.questionId, qIds));
    await db.delete(questionsTable).where(eq(questionsTable.kbFileId, id));
  }
  await db.delete(flashcardsTable).where(eq(flashcardsTable.kbFileId, id));
  await db.delete(notionsTable).where(eq(notionsTable.kbFileId, id));
  await db.delete(annalesTable).where(eq(annalesTable.kbFileId, id));

  // Reset status to processing
  await db.update(knowledgeBaseFilesTable)
    .set({
      status:          "processing",
      errorMessage:    null,
      questionsCount:  0,
      flashcardsCount: 0,
      notionsCount:    0,
      annalesCount:    0,
      processedAt:     null,
    })
    .where(eq(knowledgeBaseFilesTable.id, id));

  // Acknowledge immediately — processing runs in background
  res.json({ queued: true });

  const forceIsExamPaper = ["examen", "annale"].includes(file.contentType);
  setImmediate(() => {
    processUpload({
      fileId:           0,
      fileUrl:          file.fileUrl,
      fileType:         file.fileType,
      subject:          file.subject,
      gradeLevel:       file.gradeLevel,
      sectionKey:       file.sectionKey,
      topic:            file.topic,
      kbFileId:         file.id,
      forceIsExamPaper,
    }).then(async counts => {
      if (counts) {
        await db.update(knowledgeBaseFilesTable)
          .set({
            status:          "ready",
            questionsCount:  counts.questions,
            flashcardsCount: counts.flashcards,
            notionsCount:    counts.notions,
            annalesCount:    counts.annales,
            processedAt:     new Date(),
          })
          .where(eq(knowledgeBaseFilesTable.id, id));
      } else {
        // Fetch the real error from processing_errors so admin can diagnose it
        const [latestErr] = await db
          .select({ errorMessage: processingErrorsTable.errorMessage, errorStage: processingErrorsTable.errorStage })
          .from(processingErrorsTable)
          .where(eq(processingErrorsTable.kbFileId, id))
          .orderBy(desc(processingErrorsTable.attemptedAt))
          .limit(1);
        const errorMsg = latestErr
          ? `[${latestErr.errorStage ?? "?"}] ${latestErr.errorMessage}`
          : "Retraitement échoué — voir les logs";
        await db.update(knowledgeBaseFilesTable)
          .set({ status: "error", errorMessage: errorMsg.slice(0, 500) })
          .where(eq(knowledgeBaseFilesTable.id, id));
      }
    }).catch(async err => {
      await db.update(knowledgeBaseFilesTable)
        .set({ status: "error", errorMessage: String(err.message ?? err).slice(0, 500) })
        .where(eq(knowledgeBaseFilesTable.id, id));
    });
  });
});

// ── POST /api/kb/reprocess-all ───────────────────────────────────────────────
// Queue all files in 'error' or 'pending_ai' state for AI reprocessing.
// Safe to call multiple times — only targets non-processing files.
router.post("/reprocess-all", async (_req, res) => {
  const result = await reprocessAllErrorFiles();
  res.json({ queued: result.queued, ids: result.ids, message: result.queued === 0 ? "Aucun fichier en attente" : `${result.queued} fichier(s) mis en file d'attente` });
});

// ── POST /api/kb/publish-all-ready ───────────────────────────────────────────
// Publishes ALL draft questions from files with status 'ready'.
// Flips status → 'processed', questions → 'published'.
router.post("/publish-all-ready", async (_req, res) => {
  // Find all ready files
  const readyFiles = await db
    .select({ id: knowledgeBaseFilesTable.id })
    .from(knowledgeBaseFilesTable)
    .where(eq(knowledgeBaseFilesTable.status, "ready"));

  if (readyFiles.length === 0) {
    res.json({ published: 0, files: 0, message: "Aucun fichier prêt à publier" });
    return;
  }

  const fileIds = readyFiles.map(f => f.id);

  // Publish all draft questions for those files
  const published = await db
    .update(questionsTable)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(
      inArray(questionsTable.kbFileId, fileIds),
      eq(questionsTable.status, "draft"),
    ))
    .returning({ id: questionsTable.id });

  // Mark files as processed
  await db
    .update(knowledgeBaseFilesTable)
    .set({ status: "processed" })
    .where(inArray(knowledgeBaseFilesTable.id, fileIds));

  res.json({ published: published.length, files: fileIds.length, message: `${published.length} question(s) publiées depuis ${fileIds.length} fichier(s)` });
});

// ── GET /api/kb/files/:id/errors ─────────────────────────────────────────────
// Returns processing errors for a specific file (admin debugging).
router.get("/files/:id/errors", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const errors = await db
    .select()
    .from(processingErrorsTable)
    .where(eq(processingErrorsTable.kbFileId, id))
    .orderBy(desc(processingErrorsTable.attemptedAt))
    .limit(10);
  res.json(errors);
});

// ── POST /api/kb/questions/manual ────────────────────────────────────────────
// Admin manually creates a question — saved directly as 'published' so students
// can see it immediately without going through the AI pipeline.
router.post("/questions/manual", async (req, res) => {
  const {
    subject, gradeLevel, sectionKey, topic,
    type, difficulty, questionText, context,
    totalMarks, estimatedTimeMinutes, requiresCalculator,
    parts, markScheme,
  } = req.body;

  if (!subject || !gradeLevel || !topic || !type || !difficulty || !questionText) {
    res.status(400).json({ error: "subject, gradeLevel, topic, type, difficulty et questionText sont requis" });
    return;
  }

  // Insert question as 'published' immediately — no AI pipeline needed
  const [question] = await db.insert(questionsTable).values({
    subject,
    gradeLevel,
    sectionKey:            sectionKey || null,
    topic,
    type,
    difficulty,
    questionText,
    context:               context || null,
    totalMarks:            totalMarks ? Number(totalMarks) : null,
    estimatedTimeMinutes:  estimatedTimeMinutes ? Number(estimatedTimeMinutes) : null,
    requiresCalculator:    requiresCalculator === true || requiresCalculator === "true",
    status:                "published",
    language:              "Français",
  }).returning();

  // Insert parts if provided
  if (Array.isArray(parts) && parts.length > 0) {
    await db.insert(questionPartsTable).values(
      parts.map((p: any, i: number) => ({
        questionId: question.id,
        label:      String(p.label ?? String.fromCharCode(97 + i)),
        text:       String(p.text ?? ""),
        marks:      Number(p.marks ?? 0),
        orderIndex: i,
      }))
    );
  }

  // Insert mark scheme entries if provided
  if (Array.isArray(markScheme) && markScheme.length > 0) {
    await db.insert(markSchemesTable).values(
      markScheme.map((m: any, i: number) => ({
        questionId:      question.id,
        partLabel:       String(m.partLabel ?? m.label ?? String.fromCharCode(97 + i)),
        answer:          String(m.answer ?? ""),
        marksBreakdown:  m.marksBreakdown ? String(m.marksBreakdown) : null,
        orderIndex:      i,
      }))
    );
  }

  res.status(201).json({ id: question.id, status: "published" });
});

// ── POST /api/kb/flashcards/manual ───────────────────────────────────────────
// Admin manually creates a flashcard — saved as 'live' immediately.
router.post("/flashcards/manual", async (req, res) => {
  const { subject, gradeLevel, sectionKey, topic, front, back } = req.body;
  if (!subject || !gradeLevel || !topic || !front || !back) {
    res.status(400).json({ error: "subject, gradeLevel, topic, front et back sont requis" });
    return;
  }
  const [card] = await db.insert(flashcardsTable).values({
    subject,
    gradeLevel,
    sectionKey: sectionKey || null,
    topic,
    front,
    back,
    status: "live",
  }).returning();
  res.status(201).json({ id: card.id, status: "live" });
});

// ── POST /api/kb/annales/manual ───────────────────────────────────────────────
// Admin manually creates a practice exam (annale) — saved as 'live' immediately.
// `questions` is an array of { question, parts?, totalMarks? }
// `solutions` is an array of { answer, explanation? } (parallel to questions)
router.post("/annales/manual", async (req, res) => {
  const { subject, gradeLevel, sectionKey, topic, year, questions, solutions } = req.body;
  if (!subject || !gradeLevel || !topic || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "subject, gradeLevel, topic et questions[] sont requis" });
    return;
  }
  const content = JSON.stringify(questions);
  const solution = (Array.isArray(solutions) && solutions.length > 0) ? JSON.stringify(solutions) : null;
  const [annale] = await db.insert(annalesTable).values({
    subject,
    gradeLevel,
    sectionKey: sectionKey || null,
    topic,
    year: year ? Number(year) : null,
    content,
    solution,
    status: "live",
  }).returning();
  res.status(201).json({ id: annale.id, status: "live" });
});

// ── GET /api/kb/questions ─────────────────────────────────────────────────────
// List published questions with optional filters (admin view).
router.get("/questions", async (req, res) => {
  const { subject, gradeLevel, sectionKey, topic } = req.query as Record<string, string | undefined>;
  const conditions = [];
  if (subject)    conditions.push(eq(questionsTable.subject, subject));
  if (gradeLevel) conditions.push(eq(questionsTable.gradeLevel, gradeLevel));
  if (sectionKey) conditions.push(eq(questionsTable.sectionKey, sectionKey));
  if (topic)      conditions.push(eq(questionsTable.topic, topic));

  const questions = await db
    .select()
    .from(questionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(questionsTable.createdAt))
    .limit(200);

  res.json(questions);
});

// ── DELETE /api/kb/questions/:id ──────────────────────────────────────────────
// Delete a manually created question (and its parts + mark schemes).
router.delete("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(questionPartsTable).where(eq(questionPartsTable.questionId, id));
  await db.delete(markSchemesTable).where(eq(markSchemesTable.questionId, id));
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.json({ success: true });
});

export default router;
