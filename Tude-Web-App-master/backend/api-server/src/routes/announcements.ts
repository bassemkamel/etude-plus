import { Router } from "express";
import { db, announcementsTable, usersTable, enrollmentsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// GET /api/announcements — returns announcements relevant to current user
router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;

  // Fetch all platform announcements
  const platformRows = await db.select({
    ann: announcementsTable,
    author: { fullName: usersTable.fullName, role: usersTable.role },
  })
    .from(announcementsTable)
    .innerJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(eq(announcementsTable.type, "platform"))
    .orderBy(announcementsTable.createdAt);

  // Filter platform announcements by target audience
  const visible = platformRows.filter(r => {
    const { targetAudience, targetUserIds } = r.ann as any;
    if (!targetAudience || targetAudience === "all") return true;
    if (targetAudience === "specific") {
      return Array.isArray(targetUserIds) && targetUserIds.includes(user.id);
    }
    // role-based
    const roleMap: Record<string, string[]> = {
      students: ["student"],
      professors: ["professor"],
      admins: ["admin", "super_admin"],
    };
    return (roleMap[targetAudience] ?? []).includes(user.role);
  });

  // Class-specific announcements
  let classAnnouncements: any[] = [];

  if (user.role === "student") {
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.studentId, user.id));
    const classIds = enrollments.map(e => e.classId);
    if (classIds.length > 0) {
      classAnnouncements = await db.select({
        ann: announcementsTable,
        author: { fullName: usersTable.fullName, role: usersTable.role },
      })
        .from(announcementsTable)
        .innerJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
        .where(inArray(announcementsTable.classId as any, classIds))
        .orderBy(announcementsTable.createdAt);
    }
  } else if (user.role === "professor") {
    classAnnouncements = await db.select({
      ann: announcementsTable,
      author: { fullName: usersTable.fullName, role: usersTable.role },
    })
      .from(announcementsTable)
      .innerJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
      .where(eq(announcementsTable.authorId, user.id))
      .orderBy(announcementsTable.createdAt);
  }

  const all = [...visible, ...classAnnouncements]
    .map(r => ({ ...r.ann, author: r.author }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(all);
});

// GET /api/announcements/all — admin only: list all platform announcements with full metadata
router.get("/all", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "super_admin" && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const rows = await db.select({
    ann: announcementsTable,
    author: { fullName: usersTable.fullName, role: usersTable.role },
  })
    .from(announcementsTable)
    .innerJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(eq(announcementsTable.type, "platform"))
    .orderBy(announcementsTable.createdAt);
  res.json(rows.map(r => ({ ...r.ann, author: r.author })).reverse());
});

// POST /api/announcements — super_admin posts platform announcement
router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "super_admin" && user.role !== "admin") {
    res.status(403).json({ error: "Only admins can post platform announcements" }); return;
  }
  const { title, body, targetAudience = "all", targetUserIds = [] } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "title and body are required" }); return;
  }
  const [ann] = await db.insert(announcementsTable).values({
    authorId: user.id,
    title: title.trim(),
    body: body.trim(),
    type: "platform",
    classId: null,
    targetAudience,
    targetUserIds: Array.isArray(targetUserIds) ? targetUserIds : [],
  } as any).returning();
  res.json({ ...ann, author: { fullName: user.fullName, role: user.role } });
});

// POST /api/announcements/class/:classId — professor posts class announcement
router.post("/class/:classId", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "professor") {
    res.status(403).json({ error: "Only professors can post class announcements" }); return;
  }
  const classId = parseInt(String(req.params.classId), 10);
  const { title, body } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "title and body are required" }); return;
  }
  const [ann] = await db.insert(announcementsTable).values({
    authorId: user.id,
    title: title.trim(),
    body: body.trim(),
    type: "class",
    classId,
  } as any).returning();
  res.json({ ...ann, author: { fullName: user.fullName, role: user.role } });
});

// DELETE /api/announcements/:id — author or super_admin can delete
router.delete("/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id), 10);
  const [ann] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!ann) { res.status(404).json({ error: "Not found" }); return; }
  if (ann.authorId !== user.id && user.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" }); return;
  }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true });
});

export default router;
