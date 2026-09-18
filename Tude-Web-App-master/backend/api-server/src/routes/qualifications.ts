import { Router } from "express";
import {
  db, teacherQualificationsTable, teacherQualificationRequestsTable,
  professorsTable, usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { logAdminAction } from "../lib/auditLog";
import {
  isValidNiveauKey, isSectionLevel, isValidSectionKey, getSubjectsForNiveauSection,
} from "../lib/educationConfig";

const router = Router();

// ── Professor: view own approved qualifications ───────────────────────────────

router.get("/mine", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "professor") { res.status(403).json({ error: "Professors only" }); return; }

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof) { res.status(404).json({ error: "Professor profile not found" }); return; }

  const quals = await db.select().from(teacherQualificationsTable)
    .where(eq(teacherQualificationsTable.professorId, prof.id));

  res.json(quals);
});

// ── Professor: view own requests ──────────────────────────────────────────────

router.get("/requests/mine", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "professor") { res.status(403).json({ error: "Professors only" }); return; }

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof) { res.status(404).json({ error: "Professor profile not found" }); return; }

  const requests = await db.select().from(teacherQualificationRequestsTable)
    .where(eq(teacherQualificationRequestsTable.professorId, prof.id));

  res.json(requests);
});

// ── Professor: submit a new qualification request (with document) ─────────────

router.post("/requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "professor") { res.status(403).json({ error: "Professors only" }); return; }

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof) { res.status(404).json({ error: "Professor profile not found" }); return; }

  const { niveauKey, sectionKey, subjects, documentUrl } = req.body;

  if (!niveauKey || !isValidNiveauKey(niveauKey)) {
    res.status(400).json({ error: `Niveau invalide : "${niveauKey}"` }); return;
  }

  if (isSectionLevel(niveauKey)) {
    if (!sectionKey || !isValidSectionKey(niveauKey, sectionKey)) {
      res.status(400).json({ error: `Section invalide "${sectionKey}" pour le niveau "${niveauKey}"` }); return;
    }
  }

  if (!Array.isArray(subjects) || subjects.length === 0) {
    res.status(400).json({ error: "Sélectionnez au moins une matière." }); return;
  }

  if (!documentUrl || typeof documentUrl !== "string") {
    res.status(400).json({ error: "Un document justificatif est requis." }); return;
  }

  const validSubjects = getSubjectsForNiveauSection(niveauKey, sectionKey ?? null);
  const invalid = subjects.filter((s: string) => !validSubjects.includes(s));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Matières non valides : ${invalid.join(", ")}` }); return;
  }

  // Check no pending/approved request already exists for this (niveau, section)
  const existing = await db.select().from(teacherQualificationRequestsTable)
    .where(eq(teacherQualificationRequestsTable.professorId, prof.id));

  const alreadyPendingOrApproved = existing.find(r =>
    r.niveauKey === niveauKey &&
    (r.sectionKey ?? null) === (sectionKey ?? null) &&
    (r.status === "pending" || r.status === "approved")
  );
  if (alreadyPendingOrApproved) {
    res.status(400).json({ error: "Une demande en attente ou approuvée existe déjà pour ce niveau/section." }); return;
  }

  const [request] = await db.insert(teacherQualificationRequestsTable).values({
    professorId: prof.id,
    niveauKey,
    sectionKey: sectionKey ?? null,
    subjects,
    documentUrl,
    status: "pending",
  }).returning();

  res.json(request);
});

// ── Admin: list all pending qualification requests ────────────────────────────

router.get("/requests/all", requireAuth, requireAdmin, async (req, res) => {
  const rows = await db.select({
    request: teacherQualificationRequestsTable,
    prof: professorsTable,
    user: usersTable,
  })
    .from(teacherQualificationRequestsTable)
    .innerJoin(professorsTable, eq(teacherQualificationRequestsTable.professorId, professorsTable.id))
    .innerJoin(usersTable, eq(professorsTable.userId, usersTable.id));

  res.json(rows.map(r => ({
    ...r.request,
    professor: {
      id: r.prof.id,
      fullName: r.user.fullName,
      email: r.user.email,
      profilePhoto: r.user.profilePhoto,
      city: r.user.city,
    },
  })));
});

// ── Admin: approve a request — creates teacher_qualifications rows ─────────────

router.post("/requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid ID" }); return; }

  const admin = (req as any).user;

  const [request] = await db.select().from(teacherQualificationRequestsTable)
    .where(eq(teacherQualificationRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (request.status !== "pending") { res.status(400).json({ error: "Request already reviewed" }); return; }

  // Remove any old qualifications for this (professor, niveau, section) combo before inserting
  await db.delete(teacherQualificationsTable)
    .where(and(
      eq(teacherQualificationsTable.professorId, request.professorId),
      eq(teacherQualificationsTable.niveauKey, request.niveauKey),
      request.sectionKey
        ? eq(teacherQualificationsTable.sectionKey, request.sectionKey)
        : eq(teacherQualificationsTable.sectionKey, null as any),
    ));

  // Insert approved qualification rows
  if (request.subjects.length > 0) {
    await db.insert(teacherQualificationsTable).values(
      request.subjects.map(subject => ({
        professorId: request.professorId,
        niveauKey: request.niveauKey,
        sectionKey: request.sectionKey,
        subject,
      }))
    );
  }

  const [updated] = await db.update(teacherQualificationRequestsTable)
    .set({ status: "approved", reviewedBy: admin.id })
    .where(eq(teacherQualificationRequestsTable.id, id))
    .returning();

  await logAdminAction(req, "approve_qualification_request", "professor", request.professorId, {
    niveauKey: request.niveauKey, sectionKey: request.sectionKey, subjects: request.subjects,
  });

  res.json(updated);
});

// ── Admin: reject a request ───────────────────────────────────────────────────

router.post("/requests/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid ID" }); return; }

  const admin = (req as any).user;
  const { notes } = req.body;

  const [request] = await db.select().from(teacherQualificationRequestsTable)
    .where(eq(teacherQualificationRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (request.status !== "pending") { res.status(400).json({ error: "Request already reviewed" }); return; }

  const [updated] = await db.update(teacherQualificationRequestsTable)
    .set({ status: "rejected", adminNotes: notes || null, reviewedBy: admin.id })
    .where(eq(teacherQualificationRequestsTable.id, id))
    .returning();

  await logAdminAction(req, "reject_qualification_request", "professor", request.professorId, {
    niveauKey: request.niveauKey, sectionKey: request.sectionKey, notes,
  });

  res.json(updated);
});

// ── Admin: delete an approved qualification ───────────────────────────────────

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [qual] = await db.select().from(teacherQualificationsTable)
    .where(eq(teacherQualificationsTable.id, id));
  if (!qual) { res.status(404).json({ error: "Qualification not found" }); return; }

  await db.delete(teacherQualificationsTable).where(eq(teacherQualificationsTable.id, id));
  await logAdminAction(req, "revoke_qualification", "professor", qual.professorId, {
    niveauKey: qual.niveauKey, sectionKey: qual.sectionKey, subject: qual.subject,
  });
  res.json({ success: true });
});

export default router;
