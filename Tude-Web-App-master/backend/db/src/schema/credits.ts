import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const creditTypeEnum = pgEnum("credit_type", ["earned", "used", "refund", "admin_grant"]);

export const creditsTable = pgTable("credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  amount: real("amount").notNull(), // positive = earned, negative = used
  type: creditTypeEnum("type").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCreditSchema = createInsertSchema(creditsTable).omit({ id: true, createdAt: true });
export type Credit = typeof creditsTable.$inferSelect;
export type InsertCredit = z.infer<typeof insertCreditSchema>;
