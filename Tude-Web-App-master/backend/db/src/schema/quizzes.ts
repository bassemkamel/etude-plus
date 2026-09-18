import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  isPublished: boolean("is_published").notNull().default(false),
  questions: jsonb("questions").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, createdAt: true });

export type Quiz = typeof quizzesTable.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
