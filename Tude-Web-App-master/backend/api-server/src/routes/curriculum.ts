/**
 * Curriculum routes — serve the chapter/topic structure that drives student revision pages.
 *
 * GET /api/curriculum/chapters
 *   Returns all chapters for a level+section+subject, with live question and
 *   flashcard counts LEFT-JOINed in. Chapters with zero content still appear.
 *
 * GET /api/curriculum/subjects
 *   Returns subjects available for a given level+section.
 */

import { Router } from "express";
import { db, curriculumChaptersTable, curriculumSubjectsTable, questionsTable, flashcardsTable } from "@workspace/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/**
 * GET /api/curriculum/chapters
 * Query params: levelCode, sectionKey (optional), subject
 *
 * Returns chapters ordered by order_index. Each chapter includes:
 *   questionCount  — published questions matching this chapter
 *   flashcardCount — live flashcards matching this chapter
 *
 * sectionKey matching rules:
 *   - Chapters with section_key = NULL are returned for ALL tracks of the level
 *   - Chapters with section_key = <value> are returned only when that track matches
 */
router.get("/chapters", requireAuth, async (req, res) => {
  const { levelCode, sectionKey, subject } = req.query as Record<string, string | undefined>;

  if (!levelCode || !subject) {
    res.status(400).json({ error: "levelCode and subject are required" });
    return;
  }

  // sectionKey matching: NULL chapters apply to all tracks; specific chapters only for their track
  const sectionFilter = sectionKey
    ? or(isNull(curriculumChaptersTable.sectionKey), eq(curriculumChaptersTable.sectionKey, sectionKey))
    : isNull(curriculumChaptersTable.sectionKey);

  // Fetch curriculum chapters — wrapped in try/catch so a missing table (migration not run)
  // falls through to the questions-based fallback gracefully.
  let chapters: any[] = [];
  try {
    chapters = await db
      .select()
      .from(curriculumChaptersTable)
      .where(
        and(
          eq(curriculumChaptersTable.levelCode, levelCode),
          eq(curriculumChaptersTable.subject, subject),
          eq(curriculumChaptersTable.isActive, true),
          sectionFilter!,
        )
      )
      .orderBy(curriculumChaptersTable.orderIndex);
  } catch {
    // Table may not exist yet — fall through to questions-based synthetic chapters
    chapters = [];
  }

  // Always fetch question counts (needed for both curriculum and fallback paths).
  // Section matching: if student has a section, include NULL + matching section questions.
  // If no section, include ALL questions for this level (NULL sectionKey or any).
  const qSectionFilter = sectionKey
    ? or(isNull(questionsTable.sectionKey), eq(questionsTable.sectionKey, sectionKey))
    : undefined; // no filter — show all questions regardless of sectionKey

  const qCountsFilter = and(
    eq(questionsTable.gradeLevel, levelCode),
    eq(questionsTable.subject, subject),
    eq(questionsTable.status, "published"),
    ...(qSectionFilter ? [qSectionFilter] : []),
  );

  const qCounts = await db
    .select({
      topic:         questionsTable.topic,
      questionCount: sql<number>`cast(count(*) as int)`,
    })
    .from(questionsTable)
    .where(qCountsFilter)
    .groupBy(questionsTable.topic);

  // If no curriculum chapters exist yet, synthesise them from the questions table
  // so students always see their content immediately.
  if (chapters.length === 0) {
    if (qCounts.length === 0) {
      res.json([]);
      return;
    }
    const synthetic = qCounts.map((r, i) => ({
      id:             -(i + 1),   // negative id flags synthetic rows to the frontend
      levelCode,
      sectionKey:     sectionKey ?? null,
      subject,
      name:           r.topic,
      shortName:      null,
      slug:           r.topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      orderIndex:     i,
      isActive:       true,
      createdAt:      new Date().toISOString(),
      questionCount:  r.questionCount,
      flashcardCount: 0,
    }));
    res.json(synthetic);
    return;
  }

  // Count flashcards per chapter
  const fcCounts = await db
    .select({
      topic:          flashcardsTable.topic,
      flashcardCount: sql<number>`cast(count(*) as int)`,
    })
    .from(flashcardsTable)
    .where(
      and(
        eq(flashcardsTable.gradeLevel, levelCode),
        eq(flashcardsTable.subject, subject),
        eq(flashcardsTable.status, "live"),
        sectionKey
          ? or(isNull(flashcardsTable.sectionKey), eq(flashcardsTable.sectionKey, sectionKey))
          : isNull(flashcardsTable.sectionKey),
      )
    )
    .groupBy(flashcardsTable.topic);

  // Build lookup maps: topic name → count
  const qMap  = new Map(qCounts.map(r => [r.topic, r.questionCount]));
  const fcMap = new Map(fcCounts.map(r => [r.topic, r.flashcardCount]));

  const enriched = chapters.map(ch => ({
    ...ch,
    questionCount:  qMap.get(ch.name)  ?? 0,
    flashcardCount: fcMap.get(ch.name) ?? 0,
  }));

  res.json(enriched);
});

/**
 * GET /api/curriculum/subjects
 * Query params: levelCode, sectionKey (optional)
 *
 * Returns subject metadata (icon, color, name) for subjects that have at least
 * one chapter in the curriculum for this level/section.
 * Used by RevisionHub to show the correct subject grid per level.
 */
router.get("/subjects", requireAuth, async (req, res) => {
  const { levelCode, sectionKey } = req.query as Record<string, string | undefined>;

  if (!levelCode) {
    res.status(400).json({ error: "levelCode is required" });
    return;
  }

  // Find distinct subjects that have chapters for this level+section
  const sectionFilter = sectionKey
    ? or(isNull(curriculumChaptersTable.sectionKey), eq(curriculumChaptersTable.sectionKey, sectionKey))
    : isNull(curriculumChaptersTable.sectionKey);

  const rows = await db
    .selectDistinct({ subject: curriculumChaptersTable.subject })
    .from(curriculumChaptersTable)
    .where(and(
      eq(curriculumChaptersTable.levelCode, levelCode),
      eq(curriculumChaptersTable.isActive, true),
      sectionFilter!,
    ));

  const subjectNames = rows.map(r => r.subject);

  // Fetch metadata from curriculum_subjects
  const meta = await db
    .select()
    .from(curriculumSubjectsTable)
    .orderBy(curriculumSubjectsTable.orderIndex);

  const result = meta.filter(s => subjectNames.includes(s.name));
  res.json(result);
});

export default router;
