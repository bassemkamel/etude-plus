import { Router } from "express";
import { db, enrollmentsTable, aiUsageTable, studentProfilesTable, usersTable, studyVideosTable } from "@workspace/db";
import { eq, and, count, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { PRACTICE_QUESTIONS, makePracticeKey, normalizeSubject } from "../config/practiceQuestions";
import { getSubjectsForNiveauSection, getStudentLevel, getNiveauLabel, getSectionLabel } from "../lib/educationConfig";

const router = Router();

// Tunisia is UTC+1
function getTunisiaDate(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

const TIER1_LIMIT = 5;
const TIER2_LIMIT = 20;
const AD_RATE_LIMIT_MS = 2 * 60 * 1000;

async function getTier(userId: number, role: string): Promise<{ tier: "gratuit" | "standard" | "premium"; enrolledClasses: number }> {
  if (role === "admin" || role === "super_admin") {
    return { tier: "premium", enrolledClasses: 999 };
  }
  const [result] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.studentId, userId));
  const n = Number(result?.cnt ?? 0);
  const tier = n === 0 ? "gratuit" : n <= 4 ? "standard" : "premium";
  return { tier, enrolledClasses: n };
}

async function getOrCreateUsage(userId: number, today: string) {
  const [existing] = await db
    .select()
    .from(aiUsageTable)
    .where(and(eq(aiUsageTable.userId, userId), eq(aiUsageTable.date, today)));
  if (existing) return existing;

  const [created] = await db.insert(aiUsageTable).values({
    userId,
    date: today,
    responsesUsed: 0,
    adsWatched: 0,
    bonusResponsesUnlocked: 0,
    lastAdWatchedAt: null,
  }).returning();
  return created;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── GET /api/mon-prof/usage ────────────────────────────────────────────────────
router.get("/usage", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const today = getTunisiaDate();
  const { tier, enrolledClasses } = await getTier(user.id, user.role);
  const usage = await getOrCreateUsage(user.id, today);

  const bonus = usage?.bonusResponsesUnlocked ?? 0;
  const baseLimit = tier === "premium" ? null : tier === "standard" ? TIER2_LIMIT : TIER1_LIMIT;
  const effectiveLimit = baseLimit !== null ? baseLimit + bonus : null;

  res.json({
    tier,
    responsesUsed: usage?.responsesUsed ?? 0,
    responsesLimit: effectiveLimit ?? "unlimited",
    bonusUnlocked: bonus,
    adsWatched: usage?.adsWatched ?? 0,
    enrolledClasses,
  });
});

/** Get all questions for a student's grade/section from educationConfig subjects */
function getQuestionsForStudent(
  niveauKey: string,
  sectionKey: string | null,
): { id: string; difficulty: "facile" | "moyen" | "difficile"; question: string; answer: string; explanation?: string; subject: string }[] {
  const subjects = getSubjectsForNiveauSection(niveauKey, sectionKey) as readonly string[];
  const results: ReturnType<typeof getQuestionsForStudent> = [];

  for (const subject of subjects) {
    const key = makePracticeKey(niveauKey, sectionKey, subject);
    const qs = PRACTICE_QUESTIONS[key];
    if (qs?.length) {
      results.push(...qs.map(q => ({ ...q, subject })));
    }
  }

  // If no questions found at all (e.g. unknown grade), fall back to prefix scan
  if (results.length === 0) {
    const prefix = sectionKey ? `${niveauKey}_${sectionKey}_` : `${niveauKey}_`;
    for (const [key, qs] of Object.entries(PRACTICE_QUESTIONS)) {
      if (key.startsWith(prefix)) {
        const subjectName = key.slice(prefix.length).replace(/_/g, " ");
        results.push(...qs.map(q => ({ ...q, subject: subjectName })));
      }
    }
  }

  return results;
}

// ── GET /api/mon-prof/questions ───────────────────────────────────────────────
// Returns shuffled questions for ALL subjects of the student's grade, with usage info
router.get("/questions", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const today = getTunisiaDate();

    const [profile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id));

    if (!profile?.gradeLevel) {
      res.json({ noProfile: true, questions: [], tier: "gratuit", enrolledClasses: 0, responsesUsed: 0, responsesLimit: 5, bonusUnlocked: 0, adsWatched: 0 });
      return;
    }

    const { niveauKey, sectionKey } = getStudentLevel(profile);
    if (!niveauKey) {
      res.json({ noProfile: true, questions: [], tier: "gratuit", enrolledClasses: 0, responsesUsed: 0, responsesLimit: 5, bonusUnlocked: 0, adsWatched: 0 });
      return;
    }

    const { tier, enrolledClasses } = await getTier(user.id, user.role);
    const usage = await getOrCreateUsage(user.id, today);

    const bonusUnlocked = usage?.bonusResponsesUnlocked ?? 0;
    const baseLimit = tier === "premium" ? null : tier === "standard" ? TIER2_LIMIT : TIER1_LIMIT;
    const effectiveLimit = baseLimit !== null ? baseLimit + bonusUnlocked : null;

    const allQuestions = getQuestionsForStudent(niveauKey, sectionKey);

    res.json({
      noProfile: false,
      questions: shuffle(allQuestions),
      tier,
      enrolledClasses,
      responsesUsed: usage?.responsesUsed ?? 0,
      responsesLimit: effectiveLimit ?? "unlimited",
      bonusUnlocked,
      adsWatched: usage?.adsWatched ?? 0,
      gradeLevel: profile.gradeLevel,
      educationSection: profile.educationSection,
    });
  } catch (err: any) {
    console.error("[mon-prof/questions] error:", err?.message ?? err);
    res.status(500).json({ error: "server_error", message: err?.message ?? "unknown" });
  }
});

// ── GET /api/mon-prof/question-bank ──────────────────────────────────────────
// Returns ALL questions for the student's grade, grouped by subject — no quota
router.get("/question-bank", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { difficulty } = req.query as { difficulty?: string };

  const [[profile]] = await Promise.all([
    db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id)),
  ]);

  if (!profile?.gradeLevel) {
    res.json({ noProfile: true, subjects: [] });
    return;
  }

  const { niveauKey, sectionKey } = getStudentLevel(profile);
  if (!niveauKey) {
    res.json({ noProfile: true, subjects: [] });
    return;
  }

  const subjects = getSubjectsForNiveauSection(niveauKey, sectionKey) as readonly string[];
  const gradeLabel = sectionKey
    ? `${getNiveauLabel(niveauKey)} — ${getSectionLabel(niveauKey, sectionKey)}`
    : getNiveauLabel(niveauKey);

  const result: { name: string; questions: (typeof PRACTICE_QUESTIONS)[string] }[] = [];

  for (const subject of subjects) {
    const key = makePracticeKey(niveauKey, sectionKey, subject);
    let qs = PRACTICE_QUESTIONS[key] ?? [];
    if (difficulty && difficulty !== "all") {
      qs = qs.filter(q => q.difficulty === difficulty) as typeof qs;
    }
    if (qs.length > 0) {
      result.push({ name: subject, questions: qs });
    }
  }

  res.json({ noProfile: false, gradeLabel, subjects: result });
});

// ── POST /api/mon-prof/use-question ──────────────────────────────────────────
// Consume one question from the daily quota
router.post("/use-question", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const today = getTunisiaDate();
  const { tier } = await getTier(user.id, user.role);
  const usage = await getOrCreateUsage(user.id, today);

  if (tier !== "premium") {
    const baseLimit = tier === "standard" ? TIER2_LIMIT : TIER1_LIMIT;
    const effectiveLimit = baseLimit + usage.bonusResponsesUnlocked;
    if (usage.responsesUsed >= effectiveLimit) {
      res.status(429).json({ error: "limit_reached", showAd: true, tier });
      return;
    }
  }

  const [updated] = await db.update(aiUsageTable)
    .set({ responsesUsed: sql`${aiUsageTable.responsesUsed} + 1` })
    .where(and(eq(aiUsageTable.userId, user.id), eq(aiUsageTable.date, today)))
    .returning();

  const baseLimit = tier === "premium" ? null : tier === "standard" ? TIER2_LIMIT : TIER1_LIMIT;
  const effectiveLimit = baseLimit !== null ? baseLimit + updated.bonusResponsesUnlocked : null;

  res.json({
    success: true,
    responsesUsed: updated.responsesUsed,
    responsesLimit: effectiveLimit ?? "unlimited",
  });
});

// ── POST /api/mon-prof/watch-ad ────────────────────────────────────────────────
// 3 ads watched = 1 bonus question unlocked
router.post("/watch-ad", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const today = getTunisiaDate();

  const usage = await getOrCreateUsage(user.id, today);

  // Rate limit: 1 ad per 2 minutes
  if (usage.lastAdWatchedAt) {
    const msSince = Date.now() - new Date(usage.lastAdWatchedAt).getTime();
    if (msSince < AD_RATE_LIMIT_MS) {
      const waitSeconds = Math.ceil((AD_RATE_LIMIT_MS - msSince) / 1000);
      res.status(429).json({ error: "too_soon", waitSeconds });
      return;
    }
  }

  const newAdsWatched = usage.adsWatched + 1;
  const newBonus = Math.floor(newAdsWatched / 3);
  const unlockedThisAd = newBonus > Math.floor(usage.adsWatched / 3);

  const [updated] = await db.update(aiUsageTable)
    .set({
      adsWatched: sql`${aiUsageTable.adsWatched} + 1`,
      bonusResponsesUnlocked: newBonus,
      lastAdWatchedAt: new Date(),
    })
    .where(and(eq(aiUsageTable.userId, user.id), eq(aiUsageTable.date, today)))
    .returning();

  const { tier } = await getTier(user.id, user.role);
  const baseLimit = tier === "premium" ? null : tier === "standard" ? TIER2_LIMIT : TIER1_LIMIT;
  const effectiveLimit = baseLimit !== null ? baseLimit + updated.bonusResponsesUnlocked : null;
  const adsUntilNextBonus = newAdsWatched % 3 === 0 ? 3 : 3 - (newAdsWatched % 3);

  res.json({
    success: true,
    bonusUnlocked: updated.bonusResponsesUnlocked,
    adsWatched: updated.adsWatched,
    responsesLimit: effectiveLimit ?? "unlimited",
    unlockedThisAd,
    adsUntilNextBonus,
  });
});

// ── Shorts/video routes disabled ──────────────────────────────────────────────
// All four endpoints return 404. To re-enable, delete these stubs and uncomment
// the original handlers in the block below.

router.get("/videos",         (_req, res) => { res.status(404).json({ error: "Feature disabled" }); });
router.post("/videos",        (_req, res) => { res.status(404).json({ error: "Feature disabled" }); });
router.delete("/videos/:id",  (_req, res) => { res.status(404).json({ error: "Feature disabled" }); });
router.post("/videos/:id/view", (_req, res) => { res.status(404).json({ error: "Feature disabled" }); });

// Original handlers preserved below (commented out):
//
// router.get("/videos", requireAuth, async (req, res) => {
//   const { gradeLevel, subject } = req.query as { gradeLevel?: string; subject?: string };
//   const videos = await db.select({ id: studyVideosTable.id, title: studyVideosTable.title,
//     description: studyVideosTable.description, videoPath: studyVideosTable.videoPath,
//     thumbnailPath: studyVideosTable.thumbnailPath, gradeLevel: studyVideosTable.gradeLevel,
//     subject: studyVideosTable.subject, views: studyVideosTable.views,
//     createdAt: studyVideosTable.createdAt, uploaderName: usersTable.fullName,
//   }).from(studyVideosTable).leftJoin(usersTable, eq(studyVideosTable.uploadedBy, usersTable.id))
//     .orderBy(desc(studyVideosTable.createdAt));
//   let filtered = videos;
//   if (gradeLevel) filtered = filtered.filter(v => v.gradeLevel === gradeLevel);
//   if (subject) filtered = filtered.filter(v => v.subject === subject);
//   res.json(filtered);
// });
//
// router.post("/videos", requireAuth, async (req, res) => {
//   const user = (req as any).user;
//   if (user.role !== "admin" && user.role !== "super_admin") { res.status(403).json({ error: "Admin only" }); return; }
//   const { title, description, videoPath, thumbnailPath, gradeLevel, subject } = req.body;
//   if (!title?.trim() || !videoPath?.trim()) { res.status(400).json({ error: "title and videoPath are required" }); return; }
//   const [video] = await db.insert(studyVideosTable).values({ uploadedBy: user.id, title: title.trim(),
//     description: description?.trim() ?? null, videoPath: videoPath.trim(),
//     thumbnailPath: thumbnailPath?.trim() ?? null, gradeLevel: gradeLevel?.trim() ?? null,
//     subject: subject?.trim() ?? null }).returning();
//   res.status(201).json(video);
// });
//
// router.delete("/videos/:id", requireAuth, async (req, res) => {
//   const user = (req as any).user;
//   if (user.role !== "admin" && user.role !== "super_admin") { res.status(403).json({ error: "Admin only" }); return; }
//   await db.delete(studyVideosTable).where(eq(studyVideosTable.id, Number(req.params.id)));
//   res.json({ success: true });
// });

// router.post("/videos/:id/view", requireAuth, async (req, res) => {
//   await db.update(studyVideosTable).set({ views: sql`${studyVideosTable.views} + 1` })
//     .where(eq(studyVideosTable.id, Number(req.params.id)));
//   res.json({ success: true });
// });

export default router;
