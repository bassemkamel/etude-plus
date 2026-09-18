import { Router } from "express";
import { db, transactionsTable, classesTable, usersTable, professorsTable, enrollmentsTable, discountCodesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { logEvent } from "../lib/auditLog";

const router = Router();

router.get("/my-earnings", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
  if (!prof) { res.status(403).json({ error: "Not a professor" }); return; }

  const classes = await db.select().from(classesTable).where(eq(classesTable.professorId, prof.id));
  const classIds = classes.map(c => c.id);
  const all = await db.select().from(transactionsTable);
  const profTxns = all.filter(t => classIds.includes(t.classId));

  const enriched = await Promise.all(profTxns.map(async (t) => {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, t.classId));
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, t.studentId));
    return { ...t, class: cls || null, student: student ? { id: student.id, fullName: student.fullName } : null };
  }));

  res.json(enriched);
});

router.get("/my", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.studentId, user.id));

  const enriched = await Promise.all(transactions.map(async (t) => {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, t.classId));
    return { ...t, class: cls || null };
  }));

  res.json(enriched);
});

// Admin-only: list all transactions
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const { page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const all = await db.select().from(transactionsTable);
  const paginated = all.slice(offset, offset + limitNum);

  const enriched = await Promise.all(paginated.map(async (t) => {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, t.classId));
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, t.studentId));
    return { ...t, class: cls || null, student: student ? { ...student, passwordHash: undefined } : null };
  }));

  res.json({ transactions: enriched, total: all.length, page: pageNum, limit: limitNum });
});

// Checkout endpoint
router.post("/checkout", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { classId, sessionId, discountCode } = req.body;

  if (!classId || typeof classId !== "number") {
    res.status(400).json({ error: "classId is required" });
    return;
  }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  let appliedCode: string | null = null;
  let discountAmount: number | null = null;
  let amount = cls.price;

  // Validate and apply discount code if provided
  if (discountCode && typeof discountCode === "string") {
    const normalized = discountCode.trim().toUpperCase();
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, normalized));
    if (
      dc &&
      dc.isActive &&
      (!dc.expiresAt || new Date() <= dc.expiresAt) &&
      (dc.maxUses === null || dc.timesUsed < dc.maxUses)
    ) {
      discountAmount = Math.round(cls.price * (dc.discountPercentage / 100) * 100) / 100;
      amount = Math.round((cls.price - discountAmount) * 100) / 100;
      appliedCode = normalized;
    } else {
      res.status(400).json({ error: "Code promo invalide, expiré ou épuisé" });
      return;
    }
  }

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
    discountCode: appliedCode,
    discountAmount,
  }).returning();

  res.json({
    transactionId: transaction.id,
    amount,
    platformFee,
    professorAmount,
    discountCode: appliedCode,
    discountAmount,
    originalPrice: cls.price,
    classTitle: cls.title,
    professorName: "Professor",
  });
});

// Confirm payment endpoint — only the transaction owner can confirm
router.post("/confirm", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { transactionId } = req.body;

  if (!transactionId || typeof transactionId !== "number") {
    res.status(400).json({ error: "transactionId is required" });
    return;
  }

  const [transaction] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId));
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Verify the transaction belongs to this user
  if (transaction.studentId !== user.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (transaction.status !== "pending") {
    res.status(400).json({ error: "Transaction is not in a confirmable state" });
    return;
  }

  // Re-validate discount code if one was applied (guard against mid-checkout deactivation)
  if (transaction.discountCode) {
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, transaction.discountCode));
    if (
      !dc ||
      !dc.isActive ||
      (dc.expiresAt && new Date() > dc.expiresAt) ||
      (dc.maxUses !== null && dc.timesUsed >= dc.maxUses)
    ) {
      res.status(400).json({ error: "Le code promo n'est plus valide. Veuillez recommencer sans le code." });
      return;
    }
    // Increment usage counter
    await db.update(discountCodesTable)
      .set({ timesUsed: dc.timesUsed + 1 })
      .where(eq(discountCodesTable.id, dc.id));
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

  // Audit log for discount usage
  if (transaction.discountCode) {
    await logEvent(req, "discount_code_used", "transaction", transaction.id, user.id, {
      code: transaction.discountCode,
      classId: transaction.classId,
      originalPrice: (transaction.amount + (transaction.discountAmount ?? 0)),
      discountAmount: transaction.discountAmount,
      finalAmount: transaction.amount,
    });
  }

  res.json(updated);
});

export default router;
