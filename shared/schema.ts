import { sql } from "drizzle-orm";
import { pgTable, text, varchar, bigint, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const syncGroups = pgTable("sync_groups", {
  id: varchar("id").primaryKey(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const syncDevices = pgTable("sync_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => syncGroups.id),
  deviceId: varchar("device_id").notNull(),
  joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
}, (t) => [
  uniqueIndex("uq_group_device").on(t.groupId, t.deviceId),
]);

export const syncEvents = pgTable("sync_events", {
  id: varchar("id").primaryKey(),
  groupId: varchar("group_id").notNull().references(() => syncGroups.id),
  deviceId: varchar("device_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  eventTimestamp: bigint("event_timestamp", { mode: "number" }).notNull(),
  signature: text("signature").default(""),
  serverTimestamp: bigint("server_timestamp", { mode: "number" }).notNull(),
}, (t) => [
  index("idx_sync_events_group_server").on(t.groupId, t.serverTimestamp),
]);

export type SyncGroup = typeof syncGroups.$inferSelect;
export type SyncDevice = typeof syncDevices.$inferSelect;
export type SyncEventRow = typeof syncEvents.$inferSelect;
