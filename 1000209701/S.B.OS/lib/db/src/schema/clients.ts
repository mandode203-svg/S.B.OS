import { pgTable, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
  favoriteProducts: jsonb("favorite_products"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
