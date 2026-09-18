/**
 * aiReprocessor — shared logic for queuing KB files for AI reprocessing.
 * Used by both the startup auto-retry and the /api/kb/reprocess-all endpoint.
 */

import {
  db,
  knowledgeBaseFilesTable,
  questionsTable,
  questionPartsTable,
  markSchemesTable,
  flashcardsTable,
  notionsTable,
  annalesTable,
  processingErrorsTable,
} from "@workspace/db";
import { eq, sql, desc, inArray } from "drizzle-orm";
import { processUpload } from "../services/knowledgeBaseProcessor";

/**
 * Find all files with status 'error' or 'pending_ai', clear their old content,
 * and reprocess them through the full AI pipeline (staggered to respect rate limits).
 */
export async function reprocessAllErrorFiles(): Promise<{ queued: number; ids: number[] }> {
  const waiting = await db
    .select()
    .from(knowledgeBaseFilesTable)
    .where(sql`${knowledgeBaseFilesTable.status} IN ('error', 'pending_ai')`);

  if (waiting.length === 0) return { queued: 0, ids: [] };

  const ids = waiting.map(f => f.id);

  // Reset status
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
    .where(sql`${knowledgeBaseFilesTable.id} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`);

  // Clear old generated content
  for (const file of waiting) {
    const qs = await db.select({ id: questionsTable.id }).from(questionsTable).where(eq(questionsTable.kbFileId, file.id));
    if (qs.length > 0) {
      const qIds = qs.map(q => q.id);
      await db.delete(questionPartsTable).where(inArray(questionPartsTable.questionId, qIds));
      await db.delete(markSchemesTable).where(inArray(markSchemesTable.questionId, qIds));
      await db.delete(questionsTable).where(eq(questionsTable.kbFileId, file.id));
    }
    await db.delete(flashcardsTable).where(eq(flashcardsTable.kbFileId, file.id));
    await db.delete(notionsTable).where(eq(notionsTable.kbFileId, file.id));
    await db.delete(annalesTable).where(eq(annalesTable.kbFileId, file.id));
  }

  // Fire each file staggered by 8 s to stay within Gemini's rate limits
  for (let i = 0; i < waiting.length; i++) {
    const file = waiting[i];
    setTimeout(() => {
      const forceIsExamPaper = ["examen", "annale"].includes(file.contentType);
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
            .where(eq(knowledgeBaseFilesTable.id, file.id));
          console.log(`[aiReprocessor] ✓ id=${file.id} ${file.subject} — questions:${counts.questions} annales:${counts.annales}`);
        } else {
          const [latestErr] = await db
            .select({ errorMessage: processingErrorsTable.errorMessage, errorStage: processingErrorsTable.errorStage })
            .from(processingErrorsTable)
            .where(eq(processingErrorsTable.kbFileId, file.id))
            .orderBy(desc(processingErrorsTable.attemptedAt))
            .limit(1);
          const msg = latestErr
            ? `[${latestErr.errorStage ?? "?"}] ${latestErr.errorMessage}`
            : "Traitement IA échoué";
          await db.update(knowledgeBaseFilesTable)
            .set({ status: "error", errorMessage: msg.slice(0, 500) })
            .where(eq(knowledgeBaseFilesTable.id, file.id));
          console.error(`[aiReprocessor] ✗ id=${file.id} ${file.subject}: ${msg}`);
        }
      }).catch(async err => {
        await db.update(knowledgeBaseFilesTable)
          .set({ status: "error", errorMessage: String(err?.message ?? err).slice(0, 500) })
          .where(eq(knowledgeBaseFilesTable.id, file.id));
        console.error(`[aiReprocessor] ✗ id=${file.id}:`, err);
      });
    }, i * 8_000);
  }

  return { queued: waiting.length, ids };
}
