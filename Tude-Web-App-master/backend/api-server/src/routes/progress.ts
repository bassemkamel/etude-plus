/**
 * Progress routes — student revision tracking.
 * All routes require authentication and are student-scoped.
 *
 * GET  /progress/overview   — aggregate stats (averages, counts)
 * GET  /progress/history    — paginated list of past attempts
 * POST /progress/attempts   — save a completed revision session
 * GET  /progress/weak-topics — topics with the most mistakes
 */

import { Router } from "express";
import { db, revisionAttemptsTable, studentAnswersTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// All progress routes require authentication
router.use(requireAuth);

// ── GET /progress/overview ─────────────────────────────────────────────────────
// Returns aggregate stats for the authenticated student.
router.get("/overview", async (req, res) => {
  const user = (req as any).user;

  const attempts = await db
    .select()
    .from(revisionAttemptsTable)
    .where(eq(revisionAttemptsTable.studentId, user.id))
    .orderBy(desc(revisionAttemptsTable.completedAt));

  if (attempts.length === 0) {
    res.json({
      totalAttempts: 0,
      overallAverage: null,
      subjectAverages: [],
      recentAttempts: [],
    });
    return;
  }

  // Overall average out of 20
  const gradedAttempts = attempts.filter(a => a.gradeOutOf20 !== null && a.gradeOutOf20 !== undefined);
  const overallAverage = gradedAttempts.length > 0
    ? gradedAttempts.reduce((sum, a) => sum + (a.gradeOutOf20 ?? 0), 0) / gradedAttempts.length
    : null;

  // Per-subject averages
  const subjectMap: Record<string, { total: number; count: number }> = {};
  for (const a of gradedAttempts) {
    if (!subjectMap[a.subject]) subjectMap[a.subject] = { total: 0, count: 0 };
    subjectMap[a.subject].total += a.gradeOutOf20 ?? 0;
    subjectMap[a.subject].count += 1;
  }
  const subjectAverages = Object.entries(subjectMap).map(([subject, { total, count }]) => ({
    subject,
    average: Math.round((total / count) * 10) / 10,
    attempts: count,
  })).sort((a, b) => b.average - a.average);

  res.json({
    totalAttempts: attempts.length,
    overallAverage: overallAverage !== null ? Math.round(overallAverage * 10) / 10 : null,
    subjectAverages,
    recentAttempts: attempts.slice(0, 10),
  });
});

// ── GET /progress/history ─────────────────────────────────────────────────────
// Paginated list of the student's revision attempts.
router.get("/history", async (req, res) => {
  const user = (req as any).user;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;
  const subject = req.query.subject as string | undefined;

  const conditions = [eq(revisionAttemptsTable.studentId, user.id)];
  if (subject) conditions.push(eq(revisionAttemptsTable.subject, subject));

  const attempts = await db
    .select()
    .from(revisionAttemptsTable)
    .where(and(...conditions))
    .orderBy(desc(revisionAttemptsTable.completedAt))
    .limit(limit)
    .offset(offset);

  res.json(attempts);
});

// ── POST /progress/attempts ────────────────────────────────────────────────────
// Save a completed revision session (practice or past paper).
// Body: { type, subject, gradeLevel, sectionKey?, topic?, annaleId?, annaleYear?,
//         totalMarks, marksAwarded, questionsCount, correctCount, answers? }
router.post("/attempts", async (req, res) => {
  const user = (req as any).user;
  const {
    type, subject, gradeLevel, sectionKey, topic,
    annaleId, annaleYear,
    totalMarks, marksAwarded, questionsCount, correctCount,
    answers,
  } = req.body;

  if (!type || !subject || !gradeLevel || totalMarks === undefined || marksAwarded === undefined) {
    res.status(400).json({ error: "type, subject, gradeLevel, totalMarks, marksAwarded are required" });
    return;
  }

  const gradeOutOf20 = totalMarks > 0
    ? Math.round((marksAwarded / totalMarks) * 200) / 10  // round to 1 decimal
    : null;

  const [attempt] = await db
    .insert(revisionAttemptsTable)
    .values({
      studentId:      user.id,
      type:           String(type),
      subject:        String(subject),
      gradeLevel:     String(gradeLevel),
      sectionKey:     sectionKey ? String(sectionKey) : null,
      topic:          topic ? String(topic) : null,
      annaleId:       annaleId ? Number(annaleId) : null,
      annaleYear:     annaleYear ? Number(annaleYear) : null,
      totalMarks:     Number(totalMarks),
      marksAwarded:   Number(marksAwarded),
      gradeOutOf20,
      questionsCount: Number(questionsCount) || 0,
      correctCount:   Number(correctCount) || 0,
    })
    .returning();

  // Save individual answers if provided
  if (Array.isArray(answers) && answers.length > 0) {
    await db.insert(studentAnswersTable).values(
      answers.map((ans: any) => ({
        attemptId:      attempt.id,
        studentId:      user.id,
        questionId:     ans.questionId ? Number(ans.questionId) : null,
        partLabel:      ans.partLabel ? String(ans.partLabel) : null,
        subject:        String(subject),
        topic:          ans.topic ? String(ans.topic) : null,
        isCorrect:      Boolean(ans.isCorrect),
        marksAwarded:   ans.marksAwarded != null ? Number(ans.marksAwarded) : null,
        marksAvailable: ans.marksAvailable != null ? Number(ans.marksAvailable) : null,
      }))
    );
  }

  res.status(201).json({ id: attempt.id, gradeOutOf20 });
});

// ── GET /progress/weak-topics ─────────────────────────────────────────────────
// Returns topics with the highest mistake rate for the authenticated student.
router.get("/weak-topics", async (req, res) => {
  const user = (req as any).user;
  const subject = req.query.subject as string | undefined;

  const conditions = [eq(studentAnswersTable.studentId, user.id)];
  if (subject) conditions.push(eq(studentAnswersTable.subject, subject));

  const answers = await db
    .select()
    .from(studentAnswersTable)
    .where(and(...conditions));

  if (answers.length === 0) {
    res.json([]);
    return;
  }

  // Group by topic → count correct vs incorrect
  const topicMap: Record<string, { correct: number; total: number; subject: string }> = {};
  for (const ans of answers) {
    const key = `${ans.subject}||${ans.topic ?? "Sans topic"}`;
    if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0, subject: ans.subject };
    topicMap[key].total += 1;
    if (ans.isCorrect) topicMap[key].correct += 1;
  }

  const weakTopics = Object.entries(topicMap)
    .map(([key, { correct, total, subject }]) => ({
      topic: key.split("||")[1],
      subject,
      correctRate: Math.round((correct / total) * 100),
      total,
      mistakes: total - correct,
    }))
    .filter(t => t.total >= 2)                    // need at least 2 answers to identify a pattern
    .sort((a, b) => a.correctRate - b.correctRate) // weakest first
    .slice(0, 10);

  res.json(weakTopics);
});

export default router;
