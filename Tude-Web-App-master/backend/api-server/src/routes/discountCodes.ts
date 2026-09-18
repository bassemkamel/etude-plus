import { Router } from "express";
import { db, discountCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

// ── Public: validate a code at checkout ──────────────────────────────────────

router.post("/validate", async (req, res) => {
  const { code, classPrice } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ valid: false, reason: "Code requis" });
    return;
  }

  const normalized = code.trim().toUpperCase();
  const [dc] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, normalized));

  if (!dc) {
    res.json({ valid: false, reason: "Code invalide" });
    return;
  }
  if (!dc.isActive) {
    res.json({ valid: false, reason: "Code invalide" });
    return;
  }
  if (dc.expiresAt && new Date() > dc.expiresAt) {
    res.json({ valid: false, reason: "Code expiré" });
    return;
  }
  if (dc.maxUses !== null && dc.timesUsed >= dc.maxUses) {
    res.json({ valid: false, reason: "Code épuisé" });
    return;
  }

  const price = typeof classPrice === "number" ? classPrice : 0;
  const discountAmount = Math.round(price * (dc.discountPercentage / 100) * 100) / 100;
  const discountedPrice = Math.round((price - discountAmount) * 100) / 100;

  res.json({
    valid: true,
    discountPercentage: dc.discountPercentage,
    discountAmount,
    discountedPrice,
    code: normalized,
  });
});

// ── Admin: list all codes ─────────────────────────────────────────────────────

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const codes = await db.select().from(discountCodesTable).orderBy(discountCodesTable.createdAt);
  res.json(codes);
});

// ── Admin: create code ────────────────────────────────────────────────────────

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const { code, discountPercentage, maxUses, expiresAt } = req.body;

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "Code requis" });
    return;
  }
  const pct = parseInt(discountPercentage);
  if (isNaN(pct) || pct < 1 || pct > 100) {
    res.status(400).json({ error: "Le pourcentage doit être entre 1 et 100" });
    return;
  }

  const normalized = code.trim().toUpperCase();

  // Check uniqueness
  const [existing] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, normalized));
  if (existing) {
    res.status(400).json({ error: "Ce code existe déjà" });
    return;
  }

  const [created] = await db.insert(discountCodesTable).values({
    code: normalized,
    discountPercentage: pct,
    createdBy: user.id,
    isActive: true,
    maxUses: maxUses ? parseInt(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  await logAdminAction(req, "discount_code_created", "discount_code", created.id, {
    code: normalized, discountPercentage: pct,
  });

  res.json(created);
});

// ── Admin: toggle active / update expiry or maxUses ───────────────────────────

router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { isActive, expiresAt, maxUses } = req.body;

  const patch: Record<string, unknown> = {};
  if (typeof isActive === "boolean") patch.isActive = isActive;
  if (expiresAt !== undefined) patch.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (maxUses !== undefined) patch.maxUses = maxUses !== null && maxUses !== "" ? parseInt(maxUses) : null;

  const [updated] = await db.update(discountCodesTable).set(patch).where(eq(discountCodesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Code introuvable" }); return; }

  await logAdminAction(req, "discount_code_updated", "discount_code", id, patch);

  res.json(updated);
});

// ── Admin: delete code ────────────────────────────────────────────────────────

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Code introuvable" }); return; }

  await logAdminAction(req, "discount_code_deleted", "discount_code", id, { code: deleted.code });

  res.json({ success: true });
});

export default router;
