import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { professorsTable } from "./professors";
import { classesTable } from "./classes";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  professorId: integer("professor_id").references(() => professorsTable.id, { onDelete: "cascade" }).notNull(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "set null" }),
  rating: real("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
