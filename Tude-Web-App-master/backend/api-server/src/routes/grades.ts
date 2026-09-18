import { Router } from "express";
import { db, gradesTable, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/my", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const grades = await db.select().from(gradesTable).where(eq(gradesTable.studentId, user.id));

  const enriched = await Promise.all(grades.map(async (g) => {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, g.classId));
    return { ...g, class: cls || null };
  }));

  res.json(enriched);
});

export default router;
