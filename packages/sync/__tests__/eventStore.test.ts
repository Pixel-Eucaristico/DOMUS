import { describe, it, expect } from "vitest";
import { EventStore } from "../src/eventStore";
import { createSimpleCrypto } from "../src/crypto";
import type { SyncEvent } from "../src/types";

const crypto = createSimpleCrypto();

function makeStore() {
  return new EventStore("device-1", "private-key-1", crypto);
}

describe("EventStore", () => {
  describe("appendEvent", () => {
    it("creates and stores an event", async () => {
      const store = makeStore();
      const event = await store.appendEvent("ACCOUNT_CREATED", {
        name: "Nubank",
      });
      expect(event.id).toBeTruthy();
      expect(event.type).toBe("ACCOUNT_CREATED");
      expect(event.deviceId).toBe("device-1");
      expect(event.signature).toBeTruthy();
      expect(event.timestamp).toBeGreaterThan(0);
      expect(store.getEventCount()).toBe(1);
    });
  });

  describe("addRemoteEvent", () => {
    it("adds a remote event", () => {
      const store = makeStore();
      const remote: SyncEvent = {
        id: "remote-1",
        type: "TX_CREATED",
        payload: { amount: 100 },
        timestamp: Date.now(),
        deviceId: "device-2",
        signature: "sig",
      };
      const added = store.addRemoteEvent(remote);
      expect(added).toBe(true);
      expect(store.getEventCount()).toBe(1);
    });

    it("rejects duplicate events", () => {
      const store = makeStore();
      const remote: SyncEvent = {
        id: "remote-1",
        type: "TX_CREATED",
        payload: {},
        timestamp: Date.now(),
        deviceId: "device-2",
        signature: "sig",
      };
      store.addRemoteEvent(remote);
      const added = store.addRemoteEvent(remote);
      expect(added).toBe(false);
      expect(store.getEventCount()).toBe(1);
    });
  });

  describe("addRemoteEvents", () => {
    it("adds multiple events and skips duplicates", () => {
      const store = makeStore();
      const events: SyncEvent[] = [
        { id: "r1", type: "A", payload: {}, timestamp: 1, deviceId: "d2", signature: "s" },
        { id: "r2", type: "B", payload: {}, timestamp: 2, deviceId: "d2", signature: "s" },
        { id: "r1", type: "A", payload: {}, timestamp: 1, deviceId: "d2", signature: "s" },
      ];
      const added = store.addRemoteEvents(events);
      expect(added).toBe(2);
      expect(store.getEventCount()).toBe(2);
    });
  });

  describe("getEventsSince", () => {
    it("returns events after a given timestamp", async () => {
      const store = makeStore();
      await store.appendEvent("A", {});
      const ts = Date.now();
      await new Promise((r) => setTimeout(r, 10));
      await store.appendEvent("B", {});
      const events = store.getEventsSince(ts);
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("B");
    });
  });

  describe("getEventsNotIn", () => {
    it("returns events not in the known set", async () => {
      const store = makeStore();
      const e1 = await store.appendEvent("A", {});
      await store.appendEvent("B", {});
      const known = new Set([e1.id]);
      const missing = store.getEventsNotIn(known);
      expect(missing).toHaveLength(1);
      expect(missing[0]?.type).toBe("B");
    });
  });

  describe("hasEvent", () => {
    it("returns true for existing events", async () => {
      const store = makeStore();
      const event = await store.appendEvent("A", {});
      expect(store.hasEvent(event.id)).toBe(true);
      expect(store.hasEvent("nonexistent")).toBe(false);
    });
  });

  describe("replayEvents", () => {
    it("replays events through a reducer in timestamp order", async () => {
      const store = makeStore();
      store.addRemoteEvent({
        id: "e2",
        type: "ADD",
        payload: { value: 20 },
        timestamp: 200,
        deviceId: "d1",
        signature: "s",
      });
      store.addRemoteEvent({
        id: "e1",
        type: "ADD",
        payload: { value: 10 },
        timestamp: 100,
        deviceId: "d1",
        signature: "s",
      });

      const total = store.replayEvents(0, (state, event) => {
        const p = event.payload as { value: number };
        return state + p.value;
      });
      expect(total).toBe(30);
    });
  });
});
