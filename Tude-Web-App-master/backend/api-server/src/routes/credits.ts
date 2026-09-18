import { Router } from "express";
import { db, creditsTable, usersTable } from "@workspace/db";
import { eq, sum } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// GET /api/credits/balance — current user's Étude+ credit balance
router.get("/balance", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const rows = await db.select({ total: sum(creditsTable.amount) })
    .from(creditsTable)
    .where(eq(creditsTable.userId, user.id));
  const balance = parseFloat(String(rows[0]?.total ?? 0)) || 0;
  res.json({ balance });
});

// GET /api/credits/history — credit transaction history
router.get("/history", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const history = await db.select().from(creditsTable)
    .where(eq(creditsTable.userId, user.id))
    .orderBy(creditsTable.createdAt);
  res.json(history.reverse());
});

export default router;
