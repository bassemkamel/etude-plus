import { pgTable, serial, integer, date, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiUsageTable = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  responsesUsed: integer("responses_used").notNull().default(0),
  adsWatched: integer("ads_watched").notNull().default(0),
  bonusResponsesUnlocked: integer("bonus_responses_unlocked").notNull().default(0),
  lastAdWatchedAt: timestamp("last_ad_watched_at"),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.date),
}));

export type AiUsage = typeof aiUsageTable.$inferSelect;
