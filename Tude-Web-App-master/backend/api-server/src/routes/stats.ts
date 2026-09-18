import { Router } from "express";
import { db, usersTable, professorsTable, classesTable, transactionsTable, enrollmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// Public: landing page stats (no auth required)
router.get("/public", async (_req, res) => {
  const [users, professors] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(professorsTable),
  ]);
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalProfessors = professors.filter(p => p.status === "approved").length;
  res.json({ totalStudents, totalProfessors });
});

// Admin-only: platform-wide overview
router.get("/overview", requireAuth, requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable);
  const professors = await db.select().from(professorsTable);
  const classes = await db.select().from(classesTable);
  const transactions = await db.select().from(transactionsTable);

  const totalRevenue = transactions.filter(t => t.status === "completed").reduce((sum, t) => sum + t.amount, 0);
  const pendingProfessors = professors.filter(p => p.status === "pending" || p.status === "kyc_submitted").length;
  const students = users.filter(u => u.role === "student");

  res.json({
    totalStudents: students.length,
    totalProfessors: professors.filter(p => p.status === "approved").length,
    totalClasses: classes.filter(c => c.isPublished).length,
    totalRevenue,
    pendingProfessors,
    activeSessionsToday: 2,
  });
});

// Professor stats — accessible by the professor themselves or an admin
router.get("/professor/:id", requireAuth, async (req, res) => {
  const profId = parseInt(String(req.params.id), 10);
  if (isNaN(profId) || profId <= 0) { res.status(400).json({ error: "Invalid professor ID" }); return; }

  const requestingUser = (req as any).user;

  // Verify access: must be the professor themselves or an admin
  if (requestingUser.role !== "admin") {
    const [ownProf] = await db.select().from(professorsTable).where(eq(professorsTable.userId, requestingUser.id));
    if (!ownProf || ownProf.id !== profId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const transactions = await db.select().from(transactionsTable);
  const profClasses = await db.select().from(classesTable).where(eq(classesTable.professorId, profId));
  const classIds = profClasses.map(c => c.id);

  const profTransactions = transactions.filter(t => classIds.includes(t.classId) && t.status === "completed");
  const totalEarnings = profTransactions.reduce((sum, t) => sum + t.professorAmount, 0);
  const platformFees = profTransactions.reduce((sum, t) => sum + t.platformFee, 0);

  const enrollments = await db.select().from(enrollmentsTable);
  const profEnrollments = enrollments.filter(e => classIds.includes(e.classId));
  const uniqueStudents = new Set(profEnrollments.map(e => e.studentId)).size;

  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, profId));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const earningsByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthLabel = `${months[d.getMonth()]} ${d.getFullYear()}`;
    const monthEarnings = profTransactions
      .filter(t => {
        const td = new Date(t.createdAt);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      })
      .reduce((sum, t) => sum + t.professorAmount, 0);
    return { month: monthLabel, amount: monthEarnings };
  });

  res.json({
    totalEarnings,
    platformFees,
    totalStudents: uniqueStudents,
    totalClasses: profClasses.length,
    pendingGrading: 3,
    averageRating: prof?.rating || null,
    earningsByMonth,
  });
});

export default router;
