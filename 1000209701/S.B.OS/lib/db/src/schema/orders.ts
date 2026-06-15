import { pgTable, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientEmail: text("client_email"),
  items: jsonb("items").notNull().$type<Array<{ productId: string; name: string; price: number; quantity: number }>>(),
  total: real("total").notNull(),
  depositAmount: real("deposit_amount").notNull().default(0),
  status: text("status").notNull().default("reçue"),
  orderType: text("order_type").notNull().default("dine-in"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  notes: text("notes"),
  assignedStaffId: text("assigned_staff_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
