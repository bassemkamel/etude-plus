import { pgTable, serial, integer, text, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { classesTable } from "./classes";

export const announcementTypeEnum = pgEnum("announcement_type", ["platform", "class"]);
export const announcementAudienceEnum = pgEnum("announcement_audience", ["all", "students", "professors", "admins", "specific"]);

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: announcementTypeEnum("type").notNull().default("platform"),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }),
  targetAudience: announcementAudienceEnum("target_audience").notNull().default("all"),
  targetUserIds: json("target_user_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({ id: true, createdAt: true });
export type Announcement = typeof announcementsTable.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
