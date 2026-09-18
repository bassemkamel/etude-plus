import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { professorsTable } from "./professors";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  professorId: integer("professor_id").references(() => professorsTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level").notNull(), // niveau key: "7eme", "bac", "2eme", etc.
  sectionKey: text("section_key"),           // null for simple levels, "sciences_maths" etc.
  city: text("city").notNull(),
  description: text("description").notNull(),
  coverImage: text("cover_image"),
  price: real("price").notNull(),
  durationHours: real("duration_hours").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true, createdAt: true, enrolledCount: true });

export type Class = typeof classesTable.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
