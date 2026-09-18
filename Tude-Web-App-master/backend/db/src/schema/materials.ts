import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

// type: "document" | "recorded_lecture" | "recorded_question"
export const materialsTable = pgTable("materials", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  type: text("type").notNull().default("document"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({ id: true, createdAt: true });

export type Material = typeof materialsTable.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
