import { Router } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { db, usersTable, classesTable, professorsTable, transactionsTable, enrollmentsTable, auditLogsTable, studentProfilesTable, gradesTable, reviewsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireAdmin, requireSuperAdmin, hashPassword, generateToken } from "../lib/auth";
import { logAdminAction } from "../lib/auditLog";

// ─── Platform Settings (file-backed) ─────────────────────────────────────────

const SETTINGS_FILE = join(process.cwd(), "platform-settings.json");

function loadPlatformSettings(): Record<string, unknown> {
  try {
    if (existsSync(SETTINGS_FILE)) {
      return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {}
  return { commissionRate: 15, maxCoursePrice: 30, maintenanceMode: false };
}

function savePlatformSettings(settings: Record<string, unknown>): void {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save platform settings:", err);
  }
}

const router = Router();

const SESSION_COOKIE = "etude_session";
const IS_PROD = process.env["NODE_ENV"] === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (IS_PROD ? "none" : "lax") as "none" | "lax",
  secure: IS_PROD,
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// ─── Users ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_ALLOWED_ROLES = ["student", "professor", "admin", "super_admin"] as const;
type AdminAllowedRole = (typeof ADMIN_ALLOWED_ROLES)[number];

/** Create a user of any role. super_admin only. */
router.post("/create-user", requireAuth, requireSuperAdmin, async (req, res) => {
  const { fullName, email, password, role } = req.body;

  if (!fullName || !email || !password || !role) {
    res.status(400).json({ error: "fullName, email, password, and role are required" });
    return;
  }

  if (typeof fullName !== "string" || typeof email !== "string" ||
      typeof password !== "string" || typeof role !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!ADMIN_EMAIL_RE.test(normalizedEmail)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < 8 || password.length > 128) {
    res.status(400).json({ error: "Password must be between 8 and 128 characters" });
    return;
  }

  if (fullName.trim().length === 0 || fullName.length > 200) {
    res.status(400).json({ error: "Invalid full name" });
    return;
  }

  if (!ADMIN_ALLOWED_ROLES.includes(role as AdminAllowedRole)) {
    res.status(400).json({ error: `Role must be one of: ${ADMIN_ALLOWED_ROLES.join(", ")}` });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [newUser] = await db.insert(usersTable).values({
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: role as AdminAllowedRole,
    fullName: fullName.trim(),
    emailVerified: true,
  }).returning();

  if (role === "professor") {
    await db.insert(professorsTable).values({
      userId: newUser.id,
      subjects: [],
      gradeLevels: [],
      bio: null,
      qualifications: null,
      yearsOfExperience: null,
      status: "approved",
      isVerified: true,
      totalReviews: 0,
      totalStudents: 0,
    });
  } else if (role === "student") {
    await db.insert(studentProfilesTable).values({
      userId: newUser.id,
      preferredSubjects: [],
      gradeLevel: null,
      schoolName: null,
    });
  }

  await logAdminAction(req, "create_user", "user", newUser.id, {
    email: newUser.email,
    role: newUser.role,
  });

  res.json({ ...newUser, passwordHash: undefined });
});

/** Suspend a user. Admin or super_admin only. */
router.post("/users/:id/suspend", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const admin = (req as any).user;
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  // Admins cannot suspend super_admins or other admins
  if (target.role === "super_admin" || (target.role === "admin" && admin.role !== "super_admin")) {
    res.status(403).json({ error: "Insufficient privileges to suspend this account" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ isSuspended: true })
    .where(eq(usersTable.id, id))
    .returning();

  await logAdminAction(req, "suspend_user", "user", id, {
    targetEmail: target.email,
    targetRole: target.role,
    reason: req.body.reason ?? null,
  });

  res.json({ ...updated, passwordHash: undefined });
});

/** Unsuspend a user. Admin or super_admin only. */
router.post("/users/:id/unsuspend", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ isSuspended: false })
    .where(eq(usersTable.id, id))
    .returning();

  await logAdminAction(req, "unsuspend_user", "user", id, {
    targetEmail: target.email,
    targetRole: target.role,
  });

  res.json({ ...updated, passwordHash: undefined });
});

/** Change a user's role. super_admin only. Role takes effect immediately (token re-reads DB). */
router.post("/users/:id/change-role", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { role } = req.body;
  const VALID_ROLES = ["student", "professor", "admin", "super_admin"] as const;
  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` }); return;
  }

  const admin = (req as any).user;
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.id === admin.id) { res.status(400).json({ error: "Cannot change your own role" }); return; }

  const previousRole = target.role;
  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();

  // If promoting to professor and no professor profile exists, create one
  if (role === "professor" && previousRole !== "professor") {
    const [existingProf] = await db.select().from(professorsTable).where(eq(professorsTable.userId, id));
    if (!existingProf) {
      await db.insert(professorsTable).values({
        userId: id, subjects: [], gradeLevels: [], bio: null, qualifications: null,
        yearsOfExperience: null, status: "pending", isVerified: false, totalReviews: 0, totalStudents: 0,
      });
    }
  }
  // If promoting to student and no student profile exists, create one
  if (role === "student" && previousRole !== "student") {
    const [existingStu] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, id));
    if (!existingStu) {
      await db.insert(studentProfilesTable).values({ userId: id, preferredSubjects: [], gradeLevel: null, schoolName: null });
    }
  }

  await logAdminAction(req, "change_role", "user", id, { targetEmail: target.email, previousRole, newRole: role });
  res.json({ ...updated, passwordHash: undefined });
});

/** Hard-delete a user. super_admin only. */
router.delete("/users/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const admin = (req as any).user;
  if (id === admin.id) { res.status(400).json({ error: "Cannot delete your own account" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot delete a super admin" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAdminAction(req, "delete_user", "user", id, { targetEmail: target.email, targetRole: target.role });
  res.json({ success: true });
});

/** Full user details: everything about a user. Admin or super_admin. */
router.get("/users/:id/details", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Grades (student assessments)
  const grades = await db.select().from(gradesTable).where(eq(gradesTable.studentId, id))
    .orderBy(desc(gradesTable.gradedAt));

  // Student profile
  const [studentProfile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, id));

  // Enrollments enriched with class title + professor name
  const rawEnrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.studentId, id));
  const enrollments = await Promise.all(rawEnrollments.map(async e => {
    const [cls] = await db.select({
      id: classesTable.id, title: classesTable.title, subject: classesTable.subject,
      price: classesTable.price, isPublished: classesTable.isPublished,
    }).from(classesTable).where(eq(classesTable.id, e.classId));
    return { ...e, class: cls ?? null };
  }));

  // Transactions enriched with class title
  const rawTx = await db.select().from(transactionsTable).where(eq(transactionsTable.studentId, id))
    .orderBy(desc(transactionsTable.createdAt));
  const transactions = await Promise.all(rawTx.map(async t => {
    const [cls] = await db.select({ id: classesTable.id, title: classesTable.title })
      .from(classesTable).where(eq(classesTable.id, t.classId));
    return { ...t, class: cls ?? null };
  }));

  // Professor profile + their classes + reviews received
  let reviews: any[] = [];
  let professorProfile: any = null;
  let professorClasses: any[] = [];
  if (user.role === "professor") {
    const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, id));
    professorProfile = prof ?? null;
    if (prof) {
      // Reviews received
      const rawReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.professorId, prof.id))
        .orderBy(desc(reviewsTable.createdAt));
      reviews = await Promise.all(rawReviews.map(async r => {
        const [student] = await db.select({ fullName: usersTable.fullName, email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, r.studentId));
        return { ...r, student: student ?? null };
      }));

      // Classes created by this professor
      professorClasses = await db.select({
        id: classesTable.id, title: classesTable.title, subject: classesTable.subject,
        price: classesTable.price, isPublished: classesTable.isPublished,
        isArchived: classesTable.isArchived, enrolledCount: classesTable.enrolledCount,
        createdAt: classesTable.createdAt,
      }).from(classesTable).where(eq(classesTable.professorId, prof.id))
        .orderBy(desc(classesTable.createdAt));
    }
  }

  res.json({
    user: { ...user, passwordHash: undefined },
    studentProfile: studentProfile ?? null,
    grades,
    reviews,
    professorProfile,
    professorClasses,
    enrollments,
    transactions,
  });
});

/** Reset any user's password. super_admin only. */
router.post("/users/:id/reset-password", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
    res.status(400).json({ error: "newPassword must be 8–128 characters" }); return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));

  await logAdminAction(req, "reset_password", "user", id, { targetEmail: target.email });
  res.json({ success: true });
});

/** Impersonate a user. super_admin only. Returns a token that acts as that user. */
router.post("/users/:id/impersonate", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const admin = (req as any).user;
  if (id === admin.id) { res.status(400).json({ error: "Cannot impersonate yourself" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot impersonate another super_admin" }); return; }
  if (target.isSuspended) { res.status(403).json({ error: "Cannot impersonate a suspended account" }); return; }

  const token = generateToken(target.id);

  await logAdminAction(req, "impersonate_user", "user", id, {
    targetEmail: target.email,
    targetRole: target.role,
    adminEmail: admin.email,
  });

  // Overwrite the session cookie so the cookie-based auth also resolves to the target user
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);

  res.json({
    token,
    user: { ...target, passwordHash: undefined },
  });
});

// ─── Classes ─────────────────────────────────────────────────────────────────

/** Archive a class. Admin or super_admin only. */
router.post("/classes/:id/archive", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

  const [updated] = await db.update(classesTable)
    .set({ isArchived: true, isPublished: false })
    .where(eq(classesTable.id, id))
    .returning();

  await logAdminAction(req, "archive_class", "class", id, { classTitle: cls.title });
  res.json(updated);
});

/** Unarchive a class. Admin or super_admin only. */
router.post("/classes/:id/unarchive", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

  const [updated] = await db.update(classesTable)
    .set({ isArchived: false })
    .where(eq(classesTable.id, id))
    .returning();

  await logAdminAction(req, "unarchive_class", "class", id, { classTitle: cls.title });
  res.json(updated);
});

/** Admin hard-delete a class. super_admin only. */
router.delete("/classes/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid class ID" }); return; }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

  await db.delete(classesTable).where(eq(classesTable.id, id));
  await logAdminAction(req, "delete_class", "class", id, { classTitle: cls.title });
  res.json({ success: true });
});

/** Admin list all classes (including archived). Admin or super_admin. */
router.get("/classes", requireAuth, requireAdmin, async (req, res) => {
  const rows = await db
    .select({
      id: classesTable.id,
      professorId: classesTable.professorId,
      title: classesTable.title,
      subject: classesTable.subject,
      gradeLevel: classesTable.gradeLevel,
      city: classesTable.city,
      description: classesTable.description,
      coverImage: classesTable.coverImage,
      price: classesTable.price,
      durationHours: classesTable.durationHours,
      isRecurring: classesTable.isRecurring,
      isPublished: classesTable.isPublished,
      isArchived: classesTable.isArchived,
      enrolledCount: classesTable.enrolledCount,
      createdAt: classesTable.createdAt,
      professorFullName: usersTable.fullName,
    })
    .from(classesTable)
    .leftJoin(professorsTable, eq(classesTable.professorId, professorsTable.id))
    .leftJoin(usersTable, eq(professorsTable.userId, usersTable.id));

  const classes = rows.map(r => ({
    ...r,
    professor: r.professorFullName ? { fullName: r.professorFullName } : null,
    professorFullName: undefined,
  }));

  res.json({ classes, total: classes.length });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

const ALLOWED_STATUSES = ["pending", "completed", "failed", "refunded"] as const;
type TxStatus = (typeof ALLOWED_STATUSES)[number];

/** Override transaction status. super_admin only. */
router.patch("/transactions/:id/status", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid transaction ID" }); return; }

  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status as TxStatus)) {
    res.status(400).json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
    return;
  }

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }

  const previousStatus = txn.status;
  const [updated] = await db.update(transactionsTable)
    .set({ status: status as TxStatus })
    .where(eq(transactionsTable.id, id))
    .returning();

  // If overriding to completed and no enrollment yet, create it
  if (status === "completed" && previousStatus !== "completed") {
    const existing = await db.select().from(enrollmentsTable)
      .where(eq(enrollmentsTable.classId, txn.classId));
    const alreadyEnrolled = existing.some(e => e.studentId === txn.studentId);
    if (!alreadyEnrolled) {
      await db.insert(enrollmentsTable).values({
        studentId: txn.studentId,
        classId: txn.classId,
        sessionId: txn.sessionId ?? null,
        status: "paid",
        paidAt: new Date(),
      });
    }
  }

  await logAdminAction(req, "override_transaction_status", "transaction", id, {
    previousStatus,
    newStatus: status,
    amount: txn.amount,
  });

  res.json(updated);
});

/** GET platform settings. super_admin only. */
router.get("/settings", requireAuth, requireSuperAdmin, (_req, res) => {
  res.json(loadPlatformSettings());
});

/** PUT platform settings. super_admin only. */
router.put("/settings", requireAuth, requireSuperAdmin, async (req, res) => {
  const { commissionRate, maxCoursePrice, maintenanceMode } = req.body;
  const current = loadPlatformSettings();

  if (commissionRate !== undefined) {
    const c = parseFloat(commissionRate);
    if (isNaN(c) || c < 1 || c > 50) {
      res.status(400).json({ error: "commissionRate must be between 1 and 50" });
      return;
    }
    current.commissionRate = c;
  }
  if (maxCoursePrice !== undefined) {
    const p = parseFloat(maxCoursePrice);
    if (isNaN(p) || p < 1) {
      res.status(400).json({ error: "maxCoursePrice must be greater than 0" });
      return;
    }
    current.maxCoursePrice = p;
  }
  if (typeof maintenanceMode === "boolean") {
    current.maintenanceMode = maintenanceMode;
  }

  savePlatformSettings(current);
  await logAdminAction(req, "update_platform_settings", "settings", 0, {
    commissionRate: current.commissionRate,
    maxCoursePrice: current.maxCoursePrice,
    maintenanceMode: current.maintenanceMode,
  });
  res.json(current);
});

/** Verify all unverified accounts. super_admin only. One-time fix for accounts created before emailVerified was set. */
router.post("/verify-all-users", requireAuth, requireSuperAdmin, async (req, res) => {
  const { ne } = await import("drizzle-orm");
  const updated = await db.update(usersTable)
    .set({ emailVerified: true })
    .where(ne(usersTable.emailVerified, true))
    .returning({ id: usersTable.id, email: usersTable.email });
  res.json({ updated: updated.length, users: updated });
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/** List audit logs. Admin or super_admin. */
router.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const { page = "1", limit = "50" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const [{ total }] = await db.select({ total: count() }).from(auditLogsTable);

  const paginated = await db.select({
    log: auditLogsTable,
    admin: {
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
    },
  })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.adminId, usersTable.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  res.json({
    logs: paginated.map(r => ({ ...r.log, admin: r.admin })),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

export default router;
