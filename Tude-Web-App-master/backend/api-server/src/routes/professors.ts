import { Router } from "express";
import { db, professorsTable, usersTable, professorSubjectRequestsTable, teacherQualificationsTable } from "@workspace/db";
import type { ReviewFeedback } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin, optionalAuth } from "../lib/auth";
import { logAdminAction } from "../lib/auditLog";
import { sendKycSubmittedEmail, sendKycApprovedEmail, sendKycRejectedEmail } from "../services/emailService";

const router = Router();

router.get("/", optionalAuth, async (req, res) => {
  const { status, subject, city, page = "1", limit = "20" } = req.query as any;

  // Detect if the caller is an admin so we can include sensitive fields
  const callerUser = (req as any).user as { role?: string } | undefined;
  const isAdmin = callerUser?.role === "admin" || callerUser?.role === "super_admin";

  const allProfs = await db.select({
    prof: professorsTable,
    user: usersTable,
  }).from(professorsTable).innerJoin(usersTable, eq(professorsTable.userId, usersTable.id));

  let filtered = allProfs;
  if (status) filtered = filtered.filter(p => p.prof.status === status);
  if (subject) filtered = filtered.filter(p => p.prof.subjects.some((s: string) => s.toLowerCase().includes(subject.toLowerCase())));
  if (city) filtered = filtered.filter(p => p.user.city?.toLowerCase().includes(city.toLowerCase()));

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(offset, offset + limitNum);

  res.json({
    professors: paginated.map(p => ({
      ...p.prof,
      fullName: p.user.fullName,
      profilePhoto: p.user.profilePhoto,
      city: p.user.city,
      user: {
        id: p.user.id,
        fullName: p.user.fullName,
        city: p.user.city,
        profilePhoto: p.user.profilePhoto,
        // Include email only for admin callers
        ...(isAdmin ? { email: p.user.email } : {}),
      },
    })),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid professor ID" });
    return;
  }

  const [result] = await db.select({
    prof: professorsTable,
    user: usersTable,
  }).from(professorsTable).innerJoin(usersTable, eq(professorsTable.userId, usersTable.id)).where(eq(professorsTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Professor not found" });
    return;
  }

  res.json({
    ...result.prof,
    fullName: result.user.fullName,
    profilePhoto: result.user.profilePhoto,
    city: result.user.city,
    // email omitted from public profile
  });
});

// Professor submits their own KYC documents
router.post("/:id/submit-documents", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid professor ID" });
    return;
  }

  const { idDocumentUrl, teachingCertUrl, additionalDocUrl } = req.body;

  if (!idDocumentUrl || !teachingCertUrl) {
    res.status(400).json({ error: "ID document and teaching certificate are required." });
    return;
  }

  if (typeof idDocumentUrl !== "string" || typeof teachingCertUrl !== "string") {
    res.status(400).json({ error: "Invalid document URLs" });
    return;
  }

  // Verify the authenticated user owns this professor profile
  const requestingUser = (req as any).user;
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, id));
  if (!prof) {
    res.status(404).json({ error: "Professor not found" });
    return;
  }
  if (prof.userId !== requestingUser.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [updated] = await db.update(professorsTable)
    .set({
      idDocumentUrl,
      teachingCertUrl,
      additionalDocUrl: additionalDocUrl || null,
      status: "kyc_submitted",
      documentNotes: null,
    })
    .where(eq(professorsTable.id, id))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json({ ...updated, fullName: user?.fullName, profilePhoto: user?.profilePhoto, city: user?.city });
});

// POST /:id/submit-kyc — Professor submits the full 4-step KYC
router.post("/:id/submit-kyc", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid ID" }); return; }

  const requestingUser = (req as any).user;
  const [prof] = await db.select().from(professorsTable)
    .where(and(eq(professorsTable.id, id), eq(professorsTable.userId, requestingUser.id)));
  if (!prof) { res.status(403).json({ error: "Access denied" }); return; }

  if (prof.kycStatus === "pending") {
    res.status(400).json({ error: "Une demande est déjà en cours d'examen." }); return;
  }

  const {
    cinFrontUrl, cinBackUrl, universityDiplomaUrl, teachingCertUrl,
    additionalDocUrl, legalName, dateOfBirth, phone,
  } = req.body;

  if (!cinFrontUrl || !cinBackUrl) {
    res.status(400).json({ error: "Les deux côtés du CIN sont requis." }); return;
  }
  if (!universityDiplomaUrl) {
    res.status(400).json({ error: "Le diplôme universitaire est requis." }); return;
  }
  if (!legalName || !dateOfBirth || !phone) {
    res.status(400).json({ error: "Nom légal, date de naissance et téléphone sont requis." }); return;
  }

  // Update phone on user record
  if (phone) {
    await db.update(usersTable).set({ phone }).where(eq(usersTable.id, requestingUser.id));
  }

  const [updated] = await db.update(professorsTable).set({
    cinFrontUrl,
    cinBackUrl,
    universityDiplomaUrl,
    teachingCertUrl: teachingCertUrl ?? null,
    legalName,
    dateOfBirth,
    kycStatus: "pending",
    kycSubmittedAt: new Date(),
    status: "kyc_submitted",
    idDocumentUrl: cinFrontUrl, // backward compat
  }).where(eq(professorsTable.id, id)).returning();

  await logAdminAction(req, "kyc_submitted", "professor", id, { legalName, dateOfBirth });

  // Fire-and-forget: notify teacher their KYC was received
  const [teacherUser] = await db.select().from(usersTable).where(eq(usersTable.id, requestingUser.id));
  if (teacherUser) {
    sendKycSubmittedEmail(
      { email: teacherUser.email, fullName: teacherUser.fullName, merchantId: teacherUser.merchantId },
      []
    );
  }

  res.json(updated);
});

// POST /:id/review-kyc — Admin reviews the KYC submission
router.post("/:id/review-kyc", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid ID" }); return; }

  const admin = (req as any).user;
  const { decision, approvedSubjects, rejectionReasons, message } = req.body;

  if (!["approved", "rejected", "request_info"].includes(decision)) {
    res.status(400).json({ error: "Invalid decision" }); return;
  }

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, id));
  if (!prof) { res.status(404).json({ error: "Professor not found" }); return; }

  if (decision === "approved") {
    // Insert approved qualifications
    if (Array.isArray(approvedSubjects) && approvedSubjects.length > 0) {
      // Delete old qualifications for this professor
      await db.delete(teacherQualificationsTable).where(eq(teacherQualificationsTable.professorId, id));
      // Insert new ones
      await db.insert(teacherQualificationsTable).values(
        approvedSubjects.map((s: { niveauKey: string; sectionKey: string | null; subject: string }) => ({
          professorId: id,
          niveauKey: s.niveauKey,
          sectionKey: s.sectionKey,
          subject: s.subject,
        }))
      );
    }

    const [updated] = await db.update(professorsTable).set({
      kycStatus: "approved",
      kycReviewedAt: new Date(),
      kycReviewedBy: admin.id,
      status: "approved",
      isVerified: true,
    }).where(eq(professorsTable.id, id)).returning();

    await logAdminAction(req, "kyc_approved", "professor", id, { approvedSubjects });

    // Fire-and-forget: notify teacher their KYC was approved
    const [approvedUser] = await db.select().from(usersTable).where(eq(usersTable.id, prof.userId));
    if (approvedUser) {
      sendKycApprovedEmail(
        { email: approvedUser.email, fullName: approvedUser.fullName, merchantId: approvedUser.merchantId },
        approvedSubjects ?? []
      );
    }

    res.json(updated);
  } else if (decision === "rejected") {
    const [updated] = await db.update(professorsTable).set({
      kycStatus: "rejected",
      kycReviewedAt: new Date(),
      kycReviewedBy: admin.id,
      kycRejectionReasons: rejectionReasons || [],
      status: "rejected",
      isVerified: false,
    }).where(eq(professorsTable.id, id)).returning();

    await logAdminAction(req, "kyc_rejected", "professor", id, { rejectionReasons });

    // Fire-and-forget: notify teacher their KYC was rejected
    const [rejectedUser] = await db.select().from(usersTable).where(eq(usersTable.id, prof.userId));
    if (rejectedUser) {
      sendKycRejectedEmail(
        { email: rejectedUser.email, fullName: rejectedUser.fullName },
        rejectionReasons ?? [],
      );
    }

    res.json(updated);
  } else {
    // request_info — keep status as pending but log the request
    await logAdminAction(req, "kyc_info_requested", "professor", id, { message });
    res.json({ success: true, message: "Information request logged" });
  }
});

// Admin-only: granular review — per-document, per-subject, per-grade feedback
router.post("/:id/review", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid professor ID" }); return; }

  const { docFeedback, subjectFeedback, gradeFeedback, decision } = req.body;
  // decision: "approved" | "needs_revision" | "rejected"
  if (!["approved", "needs_revision", "rejected"].includes(decision)) {
    res.status(400).json({ error: "Invalid decision" }); return;
  }

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, id));
  if (!prof) { res.status(404).json({ error: "Professor not found" }); return; }

  const feedback: ReviewFeedback = {
    documents: docFeedback ?? {},
    subjects: subjectFeedback ?? [],
    gradeLevels: gradeFeedback ?? [],
    reviewedAt: new Date().toISOString(),
  };

  // Build a summary note for rejected items
  const rejectedDocs = Object.entries(feedback.documents)
    .filter(([, v]) => v?.status === "rejected")
    .map(([k, v]) => `${k}: ${v?.reason ?? "document invalide"}`);
  const rejectedSubjects = feedback.subjects.filter(s => s.status === "rejected").map(s => `${s.name}: ${s.reason ?? "non justifié"}`);
  const rejectedGrades = feedback.gradeLevels.filter(g => g.status === "rejected").map(g => `${g.name}: ${g.reason ?? "non justifié"}`);
  const summaryParts = [...rejectedDocs, ...rejectedSubjects, ...rejectedGrades];
  const documentNotes = summaryParts.length ? summaryParts.join(" | ") : null;

  const [updated] = await db.update(professorsTable)
    .set({
      status: decision as any,
      isVerified: decision === "approved",
      reviewFeedback: feedback,
      documentNotes,
    })
    .where(eq(professorsTable.id, id))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  await logAdminAction(req, `professor_review_${decision}`, "professor", id, { decision, rejectedCount: summaryParts.length });
  res.json({ ...updated, fullName: user?.fullName, profilePhoto: user?.profilePhoto, city: user?.city });
});

// Professor resubmits after addressing revision requests
router.post("/:id/resubmit", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid professor ID" }); return; }

  const requestingUser = (req as any).user;
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, id));
  if (!prof) { res.status(404).json({ error: "Professor not found" }); return; }
  if (prof.userId !== requestingUser.id) { res.status(403).json({ error: "Access denied" }); return; }
  if (prof.status !== "needs_revision" && prof.status !== "rejected") {
    res.status(400).json({ error: "Professor is not in a revisable state" }); return;
  }

  const { idDocumentUrl, teachingCertUrl, additionalDocUrl, subjects, gradeLevels } = req.body;

  const patch: Record<string, unknown> = {
    status: "kyc_submitted",
    reviewFeedback: null,
    documentNotes: null,
  };

  // Update documents if new ones provided
  if (idDocumentUrl) patch.idDocumentUrl = idDocumentUrl;
  if (teachingCertUrl) patch.teachingCertUrl = teachingCertUrl;
  if (additionalDocUrl !== undefined) patch.additionalDocUrl = additionalDocUrl || null;

  // Update subjects/grades if corrected list provided
  if (Array.isArray(subjects)) patch.subjects = subjects;
  if (Array.isArray(gradeLevels)) patch.gradeLevels = gradeLevels;

  const [updated] = await db.update(professorsTable).set(patch).where(eq(professorsTable.id, id)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json({ ...updated, fullName: user?.fullName, profilePhoto: user?.profilePhoto, city: user?.city });
});

// Admin-only: approve a professor
router.post("/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid professor ID" });
    return;
  }

  const [prof] = await db.update(professorsTable)
    .set({ status: "approved", isVerified: true, documentNotes: null })
    .where(eq(professorsTable.id, id))
    .returning();

  if (!prof) {
    res.status(404).json({ error: "Professor not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, prof.userId));
  await logAdminAction(req, "approve_professor", "professor", id, { professorUserId: prof.userId });
  res.json({ ...prof, fullName: user?.fullName, profilePhoto: user?.profilePhoto, city: user?.city });
});

// Admin-only: reject a professor
router.post("/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid professor ID" });
    return;
  }

  const { notes } = req.body;

  const [prof] = await db.update(professorsTable)
    .set({ status: "rejected", isVerified: false, documentNotes: notes || null })
    .where(eq(professorsTable.id, id))
    .returning();

  if (!prof) {
    res.status(404).json({ error: "Professor not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, prof.userId));
  await logAdminAction(req, "reject_professor", "professor", id, {
    professorUserId: prof.userId,
    notes: notes || null,
  });
  res.json({ ...prof, fullName: user?.fullName, profilePhoto: user?.profilePhoto, city: user?.city });
});

// ── Subject-addition requests ────────────────────────────────────────────────

// Admin: list all subject requests (registered BEFORE /:id routes to avoid param collision)
router.get("/subject-requests/all", requireAuth, requireAdmin, async (req, res) => {
  const rows = await db.select({
    request: professorSubjectRequestsTable,
    prof: professorsTable,
    user: usersTable,
  })
    .from(professorSubjectRequestsTable)
    .innerJoin(professorsTable, eq(professorSubjectRequestsTable.professorId, professorsTable.id))
    .innerJoin(usersTable, eq(professorsTable.userId, usersTable.id));

  res.json(rows.map(r => ({
    ...r.request,
    professor: { ...r.prof, fullName: r.user.fullName, email: r.user.email, profilePhoto: r.user.profilePhoto },
  })));
});

// Admin: approve a subject request — merges into professor's profile
router.post("/subject-requests/:reqId/approve", requireAuth, requireAdmin, async (req, res) => {
  const reqId = parseInt(String(req.params.reqId), 10);
  if (isNaN(reqId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const admin = (req as any).user;
  const [subReq] = await db.select().from(professorSubjectRequestsTable)
    .where(eq(professorSubjectRequestsTable.id, reqId));
  if (!subReq) { res.status(404).json({ error: "Request not found" }); return; }
  if (subReq.status !== "pending") { res.status(400).json({ error: "Request already reviewed" }); return; }

  // Merge new subjects/levels into professor's existing ones (no duplicates)
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, subReq.professorId));
  if (!prof) { res.status(404).json({ error: "Professor not found" }); return; }

  const mergedSubjects = [...new Set([...prof.subjects, ...subReq.subjects])];
  const mergedLevels   = [...new Set([...prof.gradeLevels, ...subReq.gradeLevels])];

  await db.update(professorsTable)
    .set({ subjects: mergedSubjects, gradeLevels: mergedLevels })
    .where(eq(professorsTable.id, prof.id));

  const [updated] = await db.update(professorSubjectRequestsTable)
    .set({ status: "approved", reviewedBy: admin.id })
    .where(eq(professorSubjectRequestsTable.id, reqId))
    .returning();

  await logAdminAction(req, "approve_subject_request", "professor", prof.id, {
    addedSubjects: subReq.subjects, addedLevels: subReq.gradeLevels,
  });
  res.json(updated);
});

// Admin: reject a subject request
router.post("/subject-requests/:reqId/reject", requireAuth, requireAdmin, async (req, res) => {
  const reqId = parseInt(String(req.params.reqId), 10);
  if (isNaN(reqId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const admin = (req as any).user;
  const { notes } = req.body;
  const [subReq] = await db.select().from(professorSubjectRequestsTable)
    .where(eq(professorSubjectRequestsTable.id, reqId));
  if (!subReq) { res.status(404).json({ error: "Request not found" }); return; }
  if (subReq.status !== "pending") { res.status(400).json({ error: "Request already reviewed" }); return; }

  const [updated] = await db.update(professorSubjectRequestsTable)
    .set({ status: "rejected", adminNotes: notes || null, reviewedBy: admin.id })
    .where(eq(professorSubjectRequestsTable.id, reqId))
    .returning();

  await logAdminAction(req, "reject_subject_request", "professor", subReq.professorId, { notes });
  res.json(updated);
});

// Professor submits a request to add new subjects/levels with a supporting doc
router.post("/:id/subject-requests", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid professor ID" }); return; }

  const requestingUser = (req as any).user;
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, id));
  if (!prof) { res.status(404).json({ error: "Professor not found" }); return; }
  if (prof.userId !== requestingUser.id) { res.status(403).json({ error: "Access denied" }); return; }

  const { subjects, gradeLevels, documentUrl } = req.body;
  if (!documentUrl || typeof documentUrl !== "string") {
    res.status(400).json({ error: "Un document justificatif est requis." }); return;
  }
  if (!Array.isArray(subjects) || subjects.length === 0) {
    res.status(400).json({ error: "Sélectionnez au moins une matière." }); return;
  }

  const [request] = await db.insert(professorSubjectRequestsTable).values({
    professorId: id,
    subjects,
    gradeLevels: gradeLevels || [],
    documentUrl,
    status: "pending",
  }).returning();

  res.json(request);
});

// Professor views their own subject requests
router.get("/:id/subject-requests", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid professor ID" }); return; }

  const requestingUser = (req as any).user;
  const isAdmin = requestingUser.role === "admin" || requestingUser.role === "super_admin";

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, id));
  if (!prof) { res.status(404).json({ error: "Professor not found" }); return; }
  if (!isAdmin && prof.userId !== requestingUser.id) { res.status(403).json({ error: "Access denied" }); return; }

  const requests = await db.select().from(professorSubjectRequestsTable)
    .where(eq(professorSubjectRequestsTable.professorId, id));

  res.json(requests);
});

export default router;
