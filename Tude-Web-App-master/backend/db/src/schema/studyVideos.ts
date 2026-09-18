import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const studyVideosTable = pgTable("study_videos", {
  id: serial("id").primaryKey(),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  videoPath: text("video_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  gradeLevel: varchar("grade_level", { length: 100 }),
  subject: varchar("subject", { length: 100 }),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
