import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const testsTable = pgTable("tests", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  isPublished: boolean("is_published").notNull().default(false),
  questions: jsonb("questions").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestSchema = createInsertSchema(testsTable).omit({ id: true, createdAt: true });

export type Test = typeof testsTable.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
