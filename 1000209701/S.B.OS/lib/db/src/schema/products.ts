import { pgTable, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  category: text("category").notNull(),
  photoUrl: text("photo_url"),
  available: boolean("available").notNull().default(true),
  stockQty: integer("stock_qty").notNull().default(0),
  tiktokCode: text("tiktok_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
