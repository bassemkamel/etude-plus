import { Router } from "express";
import { db, usersTable, studentProfilesTable, professorsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// Admin-only: list all users
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const { role, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const VALID_ROLES = ["student", "professor", "admin", "super_admin"] as const;
  type ValidRole = typeof VALID_ROLES[number];
  const roleFilter = role && VALID_ROLES.includes(role as ValidRole) ? role as ValidRole : undefined;

  const whereClause = roleFilter ? eq(usersTable.role, roleFilter) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(usersTable).where(whereClause);

  const users = await db
    .select()
    .from(usersTable)
    .where(whereClause)
    .offset(offset)
    .limit(limitNum);

  res.json({
    users: users.map(u => ({ ...u, passwordHash: undefined })),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

// Self or admin: get a user by ID
router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const requestingUser = (req as any).user;
  if (requestingUser.id !== id && requestingUser.role !== "admin" && requestingUser.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let studentProfile = null;
  let professorProfile = null;

  if (user.role === "student") {
    const [sp] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id));
    studentProfile = sp || null;
  } else if (user.role === "professor") {
    const [pp] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
    professorProfile = pp ? { ...pp, fullName: user.fullName, profilePhoto: user.profilePhoto, city: user.city } : null;
  }

  res.json({ ...user, passwordHash: undefined, studentProfile, professorProfile });
});

// Self only (or admin): update a user profile
router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const requestingUser = (req as any).user;
  if (requestingUser.id !== id && requestingUser.role !== "admin" && requestingUser.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { fullName, city, profilePhoto, gradeLevel, educationSection, schoolName, preferredSubjects, subjects, gradeLevels, yearsOfExperience, bio, qualifications } = req.body;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (fullName !== undefined && (typeof fullName !== "string" || fullName.trim().length === 0 || fullName.length > 200)) {
    res.status(400).json({ error: "Invalid full name" });
    return;
  }

  await db.update(usersTable).set({
    fullName: fullName ? fullName.trim() : user.fullName,
    city: city !== undefined ? city : user.city,
    profilePhoto: profilePhoto !== undefined ? profilePhoto : user.profilePhoto,
  }).where(eq(usersTable.id, id));

  if (user.role === "student" && (gradeLevel !== undefined || educationSection !== undefined || schoolName !== undefined || preferredSubjects !== undefined)) {
    const [sp] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, id));
    if (sp) {
      await db.update(studentProfilesTable).set({
        gradeLevel: gradeLevel !== undefined ? (gradeLevel || null) : sp.gradeLevel,
        educationSection: educationSection !== undefined ? (educationSection || null) : sp.educationSection,
        schoolName: schoolName !== undefined ? (schoolName || null) : sp.schoolName,
        preferredSubjects: preferredSubjects !== undefined ? preferredSubjects : sp.preferredSubjects,
      }).where(eq(studentProfilesTable.userId, id));
    }
  }

  if (user.role === "professor" && (subjects || gradeLevels || bio || qualifications || yearsOfExperience !== undefined)) {
    const [pp] = await db.select().from(professorsTable).where(eq(professorsTable.userId, id));
    if (pp) {
      await db.update(professorsTable).set({
        subjects: subjects || pp.subjects,
        gradeLevels: gradeLevels || pp.gradeLevels,
        bio: bio !== undefined ? bio : pp.bio,
        qualifications: qualifications !== undefined ? qualifications : pp.qualifications,
        yearsOfExperience: yearsOfExperience !== undefined ? yearsOfExperience : pp.yearsOfExperience,
      }).where(eq(professorsTable.userId, id));
    }
  }

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  res.json({ ...updated, passwordHash: undefined });
});

export default router;
