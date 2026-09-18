import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  instructions: text("instructions"),
  dueDate: timestamp("due_date"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true });

export type Assignment = typeof assignmentsTable.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
