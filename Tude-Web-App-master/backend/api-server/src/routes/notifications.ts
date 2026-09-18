import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/my", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id));
  res.json(notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post("/:id/read", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid notification ID" }); return; }

  const user = (req as any).user;

  // Verify the notification belongs to this user before marking it read
  const [notification] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  if (notification.userId !== user.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

export default router;
