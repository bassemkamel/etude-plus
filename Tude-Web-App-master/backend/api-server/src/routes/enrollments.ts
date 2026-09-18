import { Router } from "express";
import { db, enrollmentsTable, classesTable, transactionsTable, liveSessionsTable, professorsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/my", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.studentId, user.id));

  const enriched = await Promise.all(enrollments.map(async (e) => {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, e.classId));
    if (!cls) return { ...e, class: null };

    const profRows = await db.select({ prof: professorsTable, user: usersTable })
      .from(professorsTable).innerJoin(usersTable, eq(professorsTable.userId, usersTable.id))
      .where(eq(professorsTable.id, cls.professorId));
    const prof = profRows[0];

    const sessions = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.classId, cls.id));
    const nextSession = sessions.filter(s => s.status === "scheduled" || s.status === "live")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null;

    return {
      ...e,
      class: {
        ...cls,
        professor: prof ? { id: prof.prof.id, fullName: prof.user.fullName, city: prof.user.city } : null,
        nextSession,
      },
    };
  }));

  res.json(enriched);
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { classId, sessionId } = req.body;

  const existing = await db.select().from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.studentId, user.id), eq(enrollmentsTable.classId, classId)));

  if (existing.length > 0) {
    res.status(400).json({ error: "Already enrolled" });
    return;
  }

  const [enrollment] = await db.insert(enrollmentsTable).values({
    studentId: user.id,
    classId,
    sessionId: sessionId || null,
    status: "pending",
  }).returning();

  res.json(enrollment);
});

// Checkout endpoint
router.post("/checkout", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { classId, sessionId } = req.body;

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const amount = cls.price;
  const platformFee = Math.round(amount * 0.15 * 100) / 100;
  const professorAmount = Math.round(amount * 0.85 * 100) / 100;

  const [transaction] = await db.insert(transactionsTable).values({
    studentId: user.id,
    classId,
    sessionId: sessionId || null,
    amount,
    platformFee,
    professorAmount,
    status: "pending",
  }).returning();

  res.json({
    transactionId: transaction.id,
    amount,
    platformFee,
    professorAmount,
    classTitle: cls.title,
    professorName: "Professor",
  });
});

// Confirm payment endpoint
router.post("/confirm", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { transactionId } = req.body;

  const [transaction] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId));
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const [updated] = await db.update(transactionsTable)
    .set({ status: "completed" })
    .where(eq(transactionsTable.id, transactionId))
    .returning();

  // Create enrollment
  const existing = await db.select().from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.studentId, user.id), eq(enrollmentsTable.classId, transaction.classId)));
  
  if (existing.length === 0) {
    await db.insert(enrollmentsTable).values({
      studentId: user.id,
      classId: transaction.classId,
      sessionId: transaction.sessionId || null,
      status: "paid",
      paidAt: new Date(),
    });

    // Update enrolled count
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, transaction.classId));
    if (cls) {
      await db.update(classesTable).set({ enrolledCount: cls.enrolledCount + 1 }).where(eq(classesTable.id, cls.id));
    }
  }

  res.json(updated);
});

export default router;
