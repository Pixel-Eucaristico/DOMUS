import type { Express, Request, Response } from "express";
import { db } from "./db";
import { syncGroups, syncDevices, syncEvents } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function registerSyncRoutes(app: Express) {
  app.post("/api/sync/groups", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId required" });
      }

      const groupId = generateGroupCode();
      const now = Date.now();

      await db.insert(syncGroups).values({ id: groupId, createdAt: now });
      await db.insert(syncDevices).values({
        groupId,
        deviceId,
        joinedAt: now,
      });

      return res.json({ groupId, joined: true });
    } catch (err) {
      console.error("Error creating sync group:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/sync/groups/:groupId/join", async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId as string;
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: "deviceId required" });
      }

      const gid = groupId.toUpperCase();
      const group = await db.select().from(syncGroups).where(eq(syncGroups.id, gid));
      if (group.length === 0) {
        return res.status(404).json({ error: "Grupo nao encontrado" });
      }

      const existing = await db.select().from(syncDevices).where(
        and(eq(syncDevices.groupId, gid), eq(syncDevices.deviceId, deviceId))
      );

      if (existing.length === 0) {
        await db.insert(syncDevices).values({
          groupId: gid,
          deviceId,
          joinedAt: Date.now(),
        });
      }

      return res.json({ groupId: gid, joined: true });
    } catch (err) {
      console.error("Error joining sync group:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/sync/push", async (req: Request, res: Response) => {
    try {
      const { groupId, deviceId, events } = req.body;

      if (!groupId || !deviceId || !Array.isArray(events)) {
        return res.status(400).json({ error: "groupId, deviceId, events[] required" });
      }

      const membership = await db.select().from(syncDevices).where(
        and(eq(syncDevices.groupId, groupId), eq(syncDevices.deviceId, deviceId))
      );

      if (membership.length === 0) {
        return res.status(403).json({ error: "Device not in group" });
      }

      const serverTs = Date.now();
      let pushed = 0;

      for (const evt of events) {
        try {
          await db.insert(syncEvents).values({
            id: evt.id,
            groupId,
            deviceId,
            eventType: evt.type,
            payload: evt.payload,
            eventTimestamp: evt.timestamp,
            signature: evt.signature || "",
            serverTimestamp: serverTs + pushed,
          }).onConflictDoNothing();
          pushed++;
        } catch {
          // skip duplicates
        }
      }

      return res.json({ pushed, serverTimestamp: serverTs });
    } catch (err) {
      console.error("Error pushing sync events:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/sync/pull", async (req: Request, res: Response) => {
    try {
      const { groupId, deviceId, since } = req.query;

      if (!groupId || !deviceId) {
        return res.status(400).json({ error: "groupId, deviceId required" });
      }

      const membership = await db.select().from(syncDevices).where(
        and(
          eq(syncDevices.groupId, groupId as string),
          eq(syncDevices.deviceId, deviceId as string)
        )
      );

      if (membership.length === 0) {
        return res.status(403).json({ error: "Device not in group" });
      }

      const sinceTs = since ? parseInt(since as string, 10) : 0;

      const rows = await db
        .select()
        .from(syncEvents)
        .where(
          and(
            eq(syncEvents.groupId, groupId as string),
            gt(syncEvents.serverTimestamp, sinceTs)
          )
        )
        .orderBy(syncEvents.serverTimestamp)
        .limit(500);

      const events = rows.map((r) => ({
        id: r.id,
        type: r.eventType,
        payload: r.payload,
        timestamp: r.eventTimestamp,
        deviceId: r.deviceId,
        signature: r.signature || "",
        serverTimestamp: r.serverTimestamp,
      }));

      return res.json({
        events,
        serverTimestamp: rows.length > 0 ? rows[rows.length - 1].serverTimestamp : sinceTs,
      });
    } catch (err) {
      console.error("Error pulling sync events:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/sync/groups/:groupId/devices", async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId as string;
      const devices = await db.select().from(syncDevices).where(eq(syncDevices.groupId, groupId.toUpperCase()));
      return res.json({ devices: devices.map((d) => ({ deviceId: d.deviceId, joinedAt: d.joinedAt })) });
    } catch (err) {
      console.error("Error fetching devices:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });
}
