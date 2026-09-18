import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userEventsTable = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  page: text("page"),
  deviceType: text("device_type"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserEvent = typeof userEventsTable.$inferSelect;
