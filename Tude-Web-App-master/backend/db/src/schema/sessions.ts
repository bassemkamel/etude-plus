import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const sessionStatusEnum = pgEnum("session_status", ["scheduled", "live", "ended"]);

export const liveSessionsTable = pgTable("live_sessions", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  durationHours: real("duration_hours").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  sessionLink: text("session_link"),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLiveSessionSchema = createInsertSchema(liveSessionsTable).omit({ id: true, createdAt: true, enrolledCount: true });

export type LiveSession = typeof liveSessionsTable.$inferSelect;
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
