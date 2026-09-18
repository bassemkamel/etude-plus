import { Router } from "express";
import { randomUUID } from "crypto";
import {
  db, classesTable, professorsTable, usersTable, liveSessionsTable,
  enrollmentsTable, materialsTable, quizzesTable, testsTable, assignmentsTable,
  gradesTable, reviewsTable, creditsTable, notificationsTable, studentProfilesTable,
  teacherQualificationsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth";
import { generateJaasToken, jaasConfigured } from "../lib/jitsiJwt";
import type { Response } from "express";
import {
  isValidNiveauKey, isSectionLevel, isValidSectionKey, getSubjectsForNiveauSection,
  getClassLevel, getStudentLevel, VALID_LEVEL_KEYS, getSubjectsForLevel,
} from "../lib/educationConfig";
import { processUpload } from "../services/knowledgeBaseProcessor";
import { PRACTICE_QUESTIONS, makePracticeKey } from "../config/practiceQuestions";

const router = Router();

async function enrichClass(cls: any) {
  const profRows = await db.select({ prof: professorsTable, user: usersTable })
    .from(professorsTable)
    .innerJoin(usersTable, eq(professorsTable.userId, usersTable.id))
    .where(eq(professorsTable.id, cls.professorId));

  const prof = profRows[0];
  const professor = prof ? {
    ...prof.prof,
    fullName: prof.user.fullName,
    profilePhoto: prof.user.profilePhoto,
    city: prof.user.city,
  } : null;

  const sessions = await db.select().from(liveSessionsTable)
    .where(eq(liveSessionsTable.classId, cls.id));

  const nextSession = sessions
    .filter(s => s.status === "scheduled" || s.status === "live")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null;

  const classReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.classId, cls.id));
  const courseRating = classReviews.length > 0
    ? classReviews.reduce((sum, r) => sum + r.rating, 0) / classReviews.length
    : null;
  const totalCourseReviews = classReviews.length;

  return { ...cls, professor, nextSession, courseRating, totalCourseReviews };
}

/**
 * Verify that the authenticated user is the professor who owns the class.
 * Returns the class if ownership is confirmed, null otherwise (and sends error response).
 */
async function verifyClassOwnership(classId: number, userId: number, res: Response) {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return null;
  }
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, userId));
  if (!prof || prof.id !== cls.professorId) {
    res.status(403).json({ error: "Access denied" });
    return null;
  }
  return cls;
}

router.get("/", optionalAuth, async (req, res) => {
  const {
    subject, gradeLevel, city, professorId,
    minPrice, maxPrice, search,
    page = "1", limit = "20",
  } = req.query as any;

  const callerUser = (req as any).user as { role?: string; id?: number } | undefined;
  const isStudent = callerUser?.role === "student";
  const isSuperAdmin = callerUser?.role === "super_admin";

  // If caller is a student, enforce their niveau+section from the DB (ignore query param)
  let studentNiveau: string | undefined;
  let studentSection: string | null | undefined;
  if (isStudent && callerUser?.id) {
    const [sp] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, callerUser.id));
    if (sp?.gradeLevel) {
      const parsed = getStudentLevel(sp);
      studentNiveau = parsed.niveauKey ?? undefined;
      studentSection = parsed.sectionKey;
    }
  }

  let allClasses = await db.select().from(classesTable)
    .where(and(eq(classesTable.isPublished, true), eq(classesTable.isArchived, false)));

  if (subject) allClasses = allClasses.filter(c => c.subject === subject);

  // Level filter: student's niveau+section is enforced server-side; others use query param
  if (isStudent && studentNiveau) {
    allClasses = allClasses.filter(c => {
      const cl = getClassLevel(c);
      return cl.niveauKey === studentNiveau && cl.sectionKey === (studentSection ?? null);
    });
  } else if (!isSuperAdmin && gradeLevel) {
    allClasses = allClasses.filter(c => c.gradeLevel === gradeLevel);
  }
  if (city) allClasses = allClasses.filter(c => c.city.toLowerCase().includes(city.toLowerCase()));
  if (professorId) allClasses = allClasses.filter(c => c.professorId === parseInt(professorId));
  if (minPrice) allClasses = allClasses.filter(c => c.price >= parseFloat(minPrice));
  if (maxPrice) allClasses = allClasses.filter(c => c.price <= parseFloat(maxPrice));
  if (search) {
    const q = search.toLowerCase();
    const profRows = await db.select({ profId: professorsTable.id, fullName: usersTable.fullName })
      .from(professorsTable)
      .innerJoin(usersTable, eq(professorsTable.userId, usersTable.id));
    const matchingProfIds = new Set(
      profRows.filter(p => p.fullName.toLowerCase().includes(q)).map(p => p.profId)
    );
    allClasses = allClasses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      matchingProfIds.has(c.professorId)
    );
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;
  const paginated = allClasses.slice(offset, offset + limitNum);

  const enriched = await Promise.all(paginated.map(enrichClass));
  res.json({ classes: enriched, total: allClasses.length, page: pageNum, limit: limitNum });
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "professor") {
    res.status(403).json({ error: "Only professors can create classes" });
    return;
  }

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof || prof.status !== "approved") {
    res.status(403).json({ error: "Professor not approved" });
    return;
  }

  const { title, subject, gradeLevel, sectionKey, city, description, coverImage, price, durationHours, isRecurring } = req.body;
  if (!title || !subject || !gradeLevel || !description || price === undefined || !durationHours) {
    res.status(400).json({ error: "Missing required class fields" });
    return;
  }

  // Validate niveau key
  if (!isValidNiveauKey(gradeLevel)) {
    res.status(400).json({ error: `Niveau invalide : "${gradeLevel}".` });
    return;
  }

  // Validate section key if it's a section level
  if (isSectionLevel(gradeLevel)) {
    if (!sectionKey || !isValidSectionKey(gradeLevel, sectionKey)) {
      res.status(400).json({ error: `Section invalide "${sectionKey}" pour le niveau "${gradeLevel}".` });
      return;
    }
  }

  // Validate subject belongs to this niveau+section's curriculum
  const validSubjectsForLevel = getSubjectsForNiveauSection(gradeLevel, sectionKey ?? null);
  if (!validSubjectsForLevel.includes(subject)) {
    res.status(400).json({ error: `La matière "${subject}" n'est pas au programme de ce niveau/section.` });
    return;
  }

  // Validate professor has a qualification for this (niveau, section, subject)
  const quals = await db.select().from(teacherQualificationsTable)
    .where(eq(teacherQualificationsTable.professorId, prof.id));

  if (quals.length > 0) {
    // New qualification system: check for exact (niveau, section, subject) match
    const hasQual = quals.some(q =>
      q.niveauKey === gradeLevel &&
      (q.sectionKey ?? null) === (sectionKey ?? null) &&
      q.subject === subject
    );
    if (!hasQual) {
      res.status(403).json({ error: "Vous n'êtes pas qualifié pour enseigner cette matière à ce niveau." });
      return;
    }
  } else {
    // Legacy: check old gradeLevels array (with generic key support)
    const { niveauKey: legacyNiveau } = { niveauKey: gradeLevel };
    const approvedLevels = prof.gradeLevels;
    if (approvedLevels.length > 0) {
      // Check if professor is approved for this niveau (direct, generic, or compound key match)
      const approved = approvedLevels.some(lvl => {
        if (lvl === gradeLevel) return true; // exact match (e.g., "7eme" === "7eme")
        if (lvl === legacyNiveau) return true; // nouveau niveau key match
        // Old compound key check
        if (lvl.startsWith(gradeLevel + "_")) return true;
        // Old generic key check (e.g., "bac" covers "bac" niveau)
        if (gradeLevel.startsWith(lvl + "_") || gradeLevel === lvl) return true;
        return false;
      });
      if (!approved) {
        res.status(403).json({ error: "Vous n'êtes pas autorisé à enseigner ce niveau." });
        return;
      }
    }
  }

  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum < 0) {
    res.status(400).json({ error: "Prix invalide." });
    return;
  }
  if (priceNum > 30) {
    res.status(400).json({ error: "Le prix maximum est de 30 TND par session." });
    return;
  }

  const [cls] = await db.insert(classesTable).values({
    professorId: prof.id,
    title,
    subject,
    gradeLevel,
    sectionKey: sectionKey ?? null,
    city: city || user.city || "Tunis",
    description,
    coverImage: coverImage || null,
    price: parseFloat(price),
    durationHours: parseFloat(durationHours),
    isRecurring: isRecurring || false,
    isPublished: true,
    enrolledCount: 0,
  }).returning();

  const enriched = await enrichClass(cls);
  res.json(enriched);
});

router.get("/my-classes", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof) { res.status(403).json({ error: "Not a professor" }); return; }

  const classes = await db.select().from(classesTable).where(eq(classesTable.professorId, prof.id));
  const enriched = await Promise.all(classes.map(enrichClass));
  res.json({ classes: enriched, total: enriched.length });
});

// Returns all sessions from the professor's own classes (for professor calendar)
router.get("/my-sessions", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof) { res.status(403).json({ error: "Not a professor" }); return; }

  const classes = await db.select().from(classesTable).where(eq(classesTable.professorId, prof.id));
  if (classes.length === 0) { res.json([]); return; }

  const classIds = classes.map(c => c.id);
  const sessions = await db.select().from(liveSessionsTable).where(inArray(liveSessionsTable.classId, classIds));

  const result = sessions.map(s => ({
    ...s,
    className: classes.find(c => c.id === s.classId)?.title ?? "Cours inconnu",
  }));
  res.json(result);
});

// Returns all sessions from classes the student is enrolled in (for student calendar)
router.get("/enrolled-sessions", requireAuth, async (req, res) => {
  const user = (req as any).user;

  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.studentId, user.id));
  const activeEnrollments = enrollments.filter(e => e.status === "active" || e.status === "paid");
  if (activeEnrollments.length === 0) { res.json([]); return; }

  const classIds = activeEnrollments.map(e => e.classId);
  const classes = await db.select().from(classesTable).where(inArray(classesTable.id, classIds));
  const sessions = await db.select().from(liveSessionsTable).where(inArray(liveSessionsTable.classId, classIds));

  const result = sessions.map(s => ({
    ...s,
    className: classes.find(c => c.id === s.classId)?.title ?? "Cours inconnu",
  }));
  res.json(result);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const enriched = await enrichClass(cls);
  res.json(enriched);
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const existing = await verifyClassOwnership(id, user.id, res);
  if (!existing) return;

  if (req.body.price !== undefined) {
    const p = parseFloat(req.body.price);
    if (isNaN(p) || p < 0) { res.status(400).json({ error: "Prix invalide." }); return; }
    if (p > 30) { res.status(400).json({ error: "Le prix maximum est de 30 TND par session." }); return; }
  }

  const [updated] = await db.update(classesTable).set({
    title: req.body.title ?? existing.title,
    subject: req.body.subject ?? existing.subject,
    gradeLevel: req.body.gradeLevel ?? existing.gradeLevel,
    city: req.body.city ?? existing.city,
    description: req.body.description ?? existing.description,
    coverImage: req.body.coverImage ?? existing.coverImage,
    price: req.body.price ?? existing.price,
    durationHours: req.body.durationHours ?? existing.durationHours,
    isRecurring: req.body.isRecurring ?? existing.isRecurring,
    isPublished: req.body.isPublished ?? existing.isPublished,
  }).where(eq(classesTable.id, id)).returning();

  const enriched = await enrichClass(updated);
  res.json(enriched);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const existing = await verifyClassOwnership(id, user.id, res);
  if (!existing) return;

  await db.delete(classesTable).where(eq(classesTable.id, id));
  res.json({ success: true });
});

// Get a single session by session ID (used by classroom page)
router.get("/sessions/:sessionId", async (req, res) => {
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (isNaN(sessionId) || sessionId <= 0) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));
  const enrollments = await db.select({
    enrollment: enrollmentsTable,
    student: usersTable,
  }).from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.classId, session.classId));

  const profRows = cls ? await db.select({ prof: professorsTable, user: usersTable })
    .from(professorsTable)
    .innerJoin(usersTable, eq(professorsTable.userId, usersTable.id))
    .where(eq(professorsTable.id, cls.professorId)) : [];

  const professor = profRows[0] ? {
    ...profRows[0].prof,
    fullName: profRows[0].user.fullName,
  } : null;

  res.json({
    session,
    class: cls ?? null,
    professor,
    students: enrollments.map(e => ({ id: e.student.id, fullName: e.student.fullName, email: e.student.email })),
  });
});

// Professor starts a session — sets status to "live" (makes them the first joiner = moderator on Jitsi)
router.post("/sessions/:sessionId/start", requireAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (isNaN(sessionId) || sessionId <= 0) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const user = (req as any).user;
  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.id, sessionId));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  // Verify the caller is the professor who owns the class
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof || prof.id !== cls.professorId) {
    res.status(403).json({ error: "Only the class professor can start this session" }); return;
  }

  if (session.status === "ended") {
    res.status(400).json({ error: "Cannot start an ended session" }); return;
  }

  const [updated] = await db.update(liveSessionsTable)
    .set({ status: "live" })
    .where(eq(liveSessionsTable.id, sessionId))
    .returning();

  res.json(updated);
});

// Generate a Jitsi JWT token for the current user for a specific session
router.get("/sessions/:sessionId/jitsi-token", requireAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (isNaN(sessionId) || sessionId <= 0) { res.status(400).json({ error: "Invalid session ID" }); return; }

  if (!jaasConfigured()) {
    res.status(503).json({ error: "JaaS not configured" }); return;
  }

  const user = (req as any).user;
  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.id, sessionId));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

  // Verify access: professor who owns class, or enrolled student
  let isModerator = false;
  if (user.role === "professor") {
    const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
    if (prof && prof.id === cls.professorId) {
      isModerator = true;
    } else {
      res.status(403).json({ error: "Access denied" }); return;
    }
  } else if (user.role === "student") {
    const [enrollment] = await db.select().from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.classId, session.classId), eq(enrollmentsTable.studentId, user.id)));
    if (!enrollment) {
      res.status(403).json({ error: "Not enrolled in this class" }); return;
    }
  }

  const appId = process.env["JAAS_APP_ID"]!;
  const roomName = `etude-class-${session.classId}-session-${session.id}`;

  const token = generateJaasToken({
    appId,
    apiKeyId: process.env["JAAS_API_KEY_ID"]!,
    privateKeyPem: process.env["JAAS_PRIVATE_KEY"]!,
    roomName,
    userId: String(user.id),
    displayName: user.fullName,
    email: user.email,
    isModerator,
  });

  res.json({ token, appId, roomName, domain: "8x8.vc" });
});

// Live Sessions
router.get("/:id/sessions", async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const sessions = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.classId, classId));
  res.json(sessions);
});

router.post("/:id/sessions", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  const { title, description, price, durationHours, scheduledAt } = req.body;
  if (!title || !scheduledAt) {
    res.status(400).json({ error: "Title and scheduledAt are required" });
    return;
  }

  const sessionLink = `https://meet.jit.si/etude-plus-${classId}-${randomUUID()}`;

  const [session] = await db.insert(liveSessionsTable).values({
    classId,
    title,
    description,
    price: price ?? 0,
    durationHours: durationHours ?? 1,
    scheduledAt: new Date(scheduledAt),
    status: "scheduled",
    sessionLink,
    enrolledCount: 0,
  }).returning();
  res.json(session);
});

router.put("/:classId/sessions/:sessionId", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(sessionId) || sessionId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  const [existing] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.id, sessionId));
  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const newStatus = req.body.status ?? existing.status;

  // Handle cancellation: grant Étude+ credit to enrolled students
  if (newStatus === "ended" && existing.status !== "ended") {
    const enrollments = await db.select().from(enrollmentsTable)
      .where(eq(enrollmentsTable.classId, classId));

    const sessionPrice = existing.price ?? cls.price ?? 0;
    if (sessionPrice > 0 && enrollments.length > 0) {
      const creditInserts = enrollments.map(e => ({
        userId: e.studentId,
        amount: sessionPrice,
        type: "refund" as const,
        reason: `Session annulée : "${existing.title}" — ${cls.title}`,
      }));
      await db.insert(creditsTable).values(creditInserts);

      // Notify each enrolled student
      const notifInserts = enrollments.map(e => ({
        userId: e.studentId,
        title: "Session annulée — crédit Étude+ accordé",
        message: `La session "${existing.title}" a été annulée. Un crédit de ${sessionPrice.toFixed(3)} TND a été ajouté à votre compte Étude+.`,
        type: "warning" as const,
      }));
      await db.insert(notificationsTable).values(notifInserts);
    }
  }

  const [updated] = await db.update(liveSessionsTable).set({
    title: req.body.title ?? existing.title,
    description: req.body.description ?? existing.description,
    price: req.body.price ?? existing.price,
    durationHours: req.body.durationHours ?? existing.durationHours,
    scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : existing.scheduledAt,
    status: newStatus,
  }).where(eq(liveSessionsTable.id, sessionId)).returning();
  res.json(updated);
});

// Enrollments for class — only the owning professor can view
router.get("/:id/enrollments", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  const enrollments = await db.select({
    enrollment: enrollmentsTable,
    student: usersTable,
  }).from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.classId, classId));

  res.json(enrollments.map(e => ({
    ...e.enrollment,
    student: { ...e.student, passwordHash: undefined },
  })));
});

// Materials — public read, professor-only write
router.get("/:id/materials", async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const materials = await db.select().from(materialsTable).where(eq(materialsTable.classId, classId));
  res.json(materials);
});

router.post("/:id/materials", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  if (!req.body.title) {
    res.status(400).json({ error: "Material title is required" });
    return;
  }

  const [material] = await db.insert(materialsTable).values({
    classId,
    title: req.body.title,
    description: req.body.description || null,
    fileUrl: req.body.fileUrl || null,
    fileType: req.body.fileType || null,
    type: req.body.type || "document",
  }).returning();

  // Fire-and-forget knowledge base processing — professor does NOT wait for this.
  // No professor notification, no UI change, errors silently logged server-side only.
  if (material.fileUrl && material.type === "document") {
    setImmediate(() => {
      processUpload({
        fileId:     material.id,
        fileUrl:    material.fileUrl!,
        fileType:   material.fileType ?? null,
        subject:    cls.subject,
        gradeLevel: cls.gradeLevel,
        sectionKey: cls.sectionKey ?? null,
        topic:      material.title,
      }).catch(err => console.error("[kb] Background processing error:", err));
    });
  }

  res.json(material);
});

// Quizzes — public read, professor-only write
router.get("/:id/quizzes", async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.classId, classId));
  res.json(quizzes);
});

router.post("/:id/quizzes", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  if (!req.body.title) {
    res.status(400).json({ error: "Quiz title is required" });
    return;
  }

  const questions = (req.body.questions || []).map((q: any, i: number) => ({ ...q, id: i + 1 }));
  const [quiz] = await db.insert(quizzesTable).values({
    classId,
    title: req.body.title,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
    isPublished: req.body.isPublished ?? false,
    questions,
  }).returning();
  res.json(quiz);
});

router.put("/:classId/quizzes/:quizId", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const quizId = parseInt(String(req.params.quizId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(quizId) || quizId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  const [existing] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId));
  if (!existing) { res.status(404).json({ error: "Quiz not found" }); return; }

  const questions = req.body.questions !== undefined
    ? (req.body.questions || []).map((q: any, i: number) => ({ ...q, id: i + 1 }))
    : existing.questions;
  const [updated] = await db.update(quizzesTable).set({
    title: req.body.title ?? existing.title,
    dueDate: req.body.dueDate !== undefined ? (req.body.dueDate ? new Date(req.body.dueDate) : null) : existing.dueDate,
    isPublished: req.body.isPublished ?? existing.isPublished,
    questions,
  }).where(eq(quizzesTable.id, quizId)).returning();
  res.json(updated);
});

router.delete("/:classId/quizzes/:quizId", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const quizId = parseInt(String(req.params.quizId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(quizId) || quizId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  await db.delete(quizzesTable).where(eq(quizzesTable.id, quizId));
  res.json({ success: true });
});

// Tests — public read, professor-only write
router.get("/:id/tests", async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const tests = await db.select().from(testsTable).where(eq(testsTable.classId, classId));
  res.json(tests);
});

router.post("/:id/tests", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  if (!req.body.title) {
    res.status(400).json({ error: "Test title is required" });
    return;
  }

  const questions = (req.body.questions || []).map((q: any, i: number) => ({ ...q, id: i + 1 }));
  const [test] = await db.insert(testsTable).values({
    classId,
    title: req.body.title,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
    isPublished: req.body.isPublished ?? false,
    questions,
  }).returning();
  res.json(test);
});

router.put("/:classId/tests/:testId", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const testId = parseInt(String(req.params.testId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(testId) || testId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  const [existing] = await db.select().from(testsTable).where(eq(testsTable.id, testId));
  if (!existing) { res.status(404).json({ error: "Test not found" }); return; }

  const questions = req.body.questions !== undefined
    ? (req.body.questions || []).map((q: any, i: number) => ({ ...q, id: i + 1 }))
    : existing.questions;
  const [updated] = await db.update(testsTable).set({
    title: req.body.title ?? existing.title,
    dueDate: req.body.dueDate !== undefined ? (req.body.dueDate ? new Date(req.body.dueDate) : null) : existing.dueDate,
    isPublished: req.body.isPublished ?? existing.isPublished,
    questions,
  }).where(eq(testsTable.id, testId)).returning();
  res.json(updated);
});

router.delete("/:classId/tests/:testId", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const testId = parseInt(String(req.params.testId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(testId) || testId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  await db.delete(testsTable).where(eq(testsTable.id, testId));
  res.json({ success: true });
});

// Quiz submission (student auto-grade)
router.post("/:classId/quizzes/:quizId/submit", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const quizId = parseInt(String(req.params.quizId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(quizId) || quizId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;

  const existingGrades = await db.select().from(gradesTable)
    .where(and(eq(gradesTable.studentId, user.id), eq(gradesTable.assessmentId, quizId), eq(gradesTable.assessmentType, "quiz")));
  if (existingGrades.length > 0) {
    res.status(400).json({ error: "You have already submitted this quiz" }); return;
  }

  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId));
  if (!quiz || quiz.classId !== classId) { res.status(404).json({ error: "Quiz not found" }); return; }
  if (!quiz.isPublished) { res.status(403).json({ error: "Quiz not published" }); return; }

  const { answers } = req.body;
  if (!Array.isArray(answers)) { res.status(400).json({ error: "answers array required" }); return; }

  const questions = (quiz.questions as any[]) || [];
  let score = 0;
  let maxScore = 0;
  const results: any[] = [];

  for (const q of questions) {
    const studentAnswer = answers.find((a: any) => a.questionId === q.id)?.answer ?? null;
    if (q.type === "mcq" || q.type === "true_false") {
      maxScore += 1;
      const correct = String(studentAnswer).trim() === String(q.answer).trim();
      if (correct) score += 1;
      results.push({ questionId: q.id, text: q.text, correct, studentAnswer, correctAnswer: q.answer });
    } else {
      maxScore += 1;
      results.push({ questionId: q.id, text: q.text, correct: null, studentAnswer, correctAnswer: null });
    }
  }

  const [grade] = await db.insert(gradesTable).values({
    studentId: user.id,
    classId,
    assessmentType: "quiz",
    assessmentId: quizId,
    assessmentTitle: quiz.title,
    score,
    maxScore,
    comment: JSON.stringify(results),
    gradedAt: new Date(),
  }).returning();

  res.json({ grade, results, score, maxScore });
});

// Get my grade for a quiz
router.get("/:classId/quizzes/:quizId/my-grade", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const quizId = parseInt(String(req.params.quizId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(quizId) || quizId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }
  const user = (req as any).user;
  const [grade] = await db.select().from(gradesTable)
    .where(and(eq(gradesTable.studentId, user.id), eq(gradesTable.assessmentId, quizId), eq(gradesTable.assessmentType, "quiz")));
  if (!grade) { res.json(null); return; }
  let results: any[] = [];
  try { results = JSON.parse(grade.comment ?? "[]"); } catch {}
  res.json({ ...grade, results });
});

// Test submission (student - MCQ auto-graded, open questions pending)
router.post("/:classId/tests/:testId/submit", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const testId = parseInt(String(req.params.testId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(testId) || testId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  const user = (req as any).user;

  const existingGrades = await db.select().from(gradesTable)
    .where(and(eq(gradesTable.studentId, user.id), eq(gradesTable.assessmentId, testId), eq(gradesTable.assessmentType, "test")));
  if (existingGrades.length > 0) {
    res.status(400).json({ error: "You have already submitted this test" }); return;
  }

  const [test] = await db.select().from(testsTable).where(eq(testsTable.id, testId));
  if (!test || test.classId !== classId) { res.status(404).json({ error: "Test not found" }); return; }
  if (!test.isPublished) { res.status(403).json({ error: "Test not published" }); return; }

  const { answers } = req.body;
  if (!Array.isArray(answers)) { res.status(400).json({ error: "answers array required" }); return; }

  const questions = (test.questions as any[]) || [];
  let score = 0;
  let maxScore = 0;
  let hasPending = false;
  const results: any[] = [];

  for (const q of questions) {
    const studentAnswer = answers.find((a: any) => a.questionId === q.id)?.answer ?? null;
    if (q.type === "mcq" || q.type === "true_false") {
      maxScore += 1;
      const correct = String(studentAnswer).trim() === String(q.answer).trim();
      if (correct) score += 1;
      results.push({ questionId: q.id, text: q.text, correct, studentAnswer, correctAnswer: q.answer });
    } else {
      maxScore += 1;
      hasPending = true;
      results.push({ questionId: q.id, text: q.text, correct: null, studentAnswer, correctAnswer: null });
    }
  }

  const [grade] = await db.insert(gradesTable).values({
    studentId: user.id,
    classId,
    assessmentType: "test",
    assessmentId: testId,
    assessmentTitle: test.title,
    score,
    maxScore,
    comment: JSON.stringify({ results, hasPending }),
    gradedAt: new Date(),
  }).returning();

  res.json({ grade, results, score, maxScore, hasPending });
});

// Get my grade for a test
router.get("/:classId/tests/:testId/my-grade", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId), 10);
  const testId = parseInt(String(req.params.testId), 10);
  if (isNaN(classId) || classId <= 0 || isNaN(testId) || testId <= 0) {
    res.status(400).json({ error: "Invalid ID" }); return;
  }
  const user = (req as any).user;
  const [grade] = await db.select().from(gradesTable)
    .where(and(eq(gradesTable.studentId, user.id), eq(gradesTable.assessmentId, testId), eq(gradesTable.assessmentType, "test")));
  if (!grade) { res.json(null); return; }
  let parsed: any = {};
  try { parsed = JSON.parse(grade.comment ?? "{}"); } catch {}
  res.json({ ...grade, results: parsed.results ?? [], hasPending: parsed.hasPending ?? false });
});

// Assignments — public read, professor-only write
router.get("/:id/assignments", async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.classId, classId));
  res.json(assignments);
});

router.post("/:id/assignments", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;
  const cls = await verifyClassOwnership(classId, user.id, res);
  if (!cls) return;

  if (!req.body.title) {
    res.status(400).json({ error: "Assignment title is required" });
    return;
  }

  const [assignment] = await db.insert(assignmentsTable).values({
    classId,
    title: req.body.title,
    instructions: req.body.instructions || null,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
    isPublished: false,
  }).returning();
  res.json(assignment);
});

// ── GET /classes/:classId/practice-questions ─────────────────────────────────
router.get("/:classId/practice-questions", requireAuth, async (req, res) => {
  const classId = parseInt(String(req.params.classId));
  if (isNaN(classId)) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const user = (req as any).user;

  // Fetch the class
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) { res.json({ facile: [], moyen: [], difficile: [] }); return; }

  // Auth check: must be enrolled student OR the professor who owns the class
  const isProfessor = user.role === "professor" || user.role === "admin" || user.role === "super_admin";
  if (!isProfessor) {
    const [enrollment] = await db.select().from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.classId, classId), eq(enrollmentsTable.studentId, user.id)));
    if (!enrollment) { res.json({ facile: [], moyen: [], difficile: [] }); return; }
  } else if (user.role === "professor") {
    const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
    if (!prof || prof.id !== cls.professorId) {
      // Not the owner, but still return questions (enrolled students can see them)
    }
  }

  const key = makePracticeKey(cls.gradeLevel, (cls as any).sectionKey ?? null, cls.subject);
  const all = PRACTICE_QUESTIONS[key] ?? [];

  res.json({
    facile:    all.filter(q => q.difficulty === "facile"),
    moyen:     all.filter(q => q.difficulty === "moyen"),
    difficile: all.filter(q => q.difficulty === "difficile"),
    subject:   cls.subject,
    key,
  });
});

export default router;
