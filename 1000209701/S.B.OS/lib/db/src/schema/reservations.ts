import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reservationsTable = pgTable("reservations", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  partySize: integer("party_size").notNull(),
  tableOrRoom: text("table_or_room"),
  depositAmount: real("deposit_amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ createdAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
