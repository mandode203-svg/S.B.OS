import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessesTable = pgTable("businesses", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address"),
  logoUrl: text("logo_url"),
  plan: text("plan").notNull().default("starter"),
  passwordHash: text("password_hash").notNull(),
  tiktokUsername: text("tiktok_username"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ createdAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
