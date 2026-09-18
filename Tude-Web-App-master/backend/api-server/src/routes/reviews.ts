import { Router } from "express";
import { db, reviewsTable, professorsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const { professorId, classId } = req.query as any;
  let reviews = await db.select().from(reviewsTable);

  if (professorId) reviews = reviews.filter(r => r.professorId === parseInt(professorId));
  if (classId) reviews = reviews.filter(r => r.classId === parseInt(classId));

  const enriched = await Promise.all(reviews.map(async (r) => {
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, r.studentId));
    return { ...r, student: student ? { id: student.id, fullName: student.fullName, profilePhoto: student.profilePhoto } : null };
  }));

  res.json(enriched);
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { professorId, classId, rating, comment } = req.body;

  if (!professorId || rating === undefined) {
    res.status(400).json({ error: "professorId and rating are required" });
    return;
  }

  if (typeof professorId !== "number" || !Number.isInteger(professorId) || professorId <= 0) {
    res.status(400).json({ error: "Invalid professorId" });
    return;
  }

  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    return;
  }

  // Prevent duplicate reviews from the same student for the same professor
  const existing = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.studentId, user.id), eq(reviewsTable.professorId, professorId)));
  if (existing.length > 0) {
    res.status(400).json({ error: "You have already reviewed this professor" });
    return;
  }

  // Verify the professor exists
  const [prof] = await db.select().from(professorsTable).where(eq(professorsTable.id, professorId));
  if (!prof) {
    res.status(404).json({ error: "Professor not found" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    studentId: user.id,
    professorId,
    classId: classId || null,
    rating: ratingNum,
    comment: comment || null,
  }).returning();

  // Update professor rating
  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.professorId, professorId));
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await db.update(professorsTable).set({
    rating: avgRating,
    totalReviews: allReviews.length,
  }).where(eq(professorsTable.id, professorId));

  res.json({ ...review, student: { id: user.id, fullName: user.fullName, profilePhoto: user.profilePhoto } });
});

export default router;
