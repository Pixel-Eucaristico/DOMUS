import { describe, it, expect, beforeEach } from "vitest";
import { SQLiteEventStore } from "../src/eventStore";
import type { SyncEvent } from "../src/eventStore";
import { createMemoryAdapter } from "../src/memoryAdapter";

function makeStore() {
  const db = createMemoryAdapter();
  const store = new SQLiteEventStore(db);
  store.initDatabase();
  return store;
}

function makeEvent(overrides: Partial<SyncEvent> = {}): SyncEvent {
  return {
    id: "evt-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    type: "TEST_EVENT",
    payload: { value: 42 },
    timestamp: Date.now(),
    deviceId: "device-1",
    signature: "sig-abc",
    ...overrides,
  };
}

describe("SQLiteEventStore", () => {
  let store: SQLiteEventStore;

  beforeEach(() => {
    store = makeStore();
  });

  describe("initDatabase", () => {
    it("initializes without errors", () => {
      const db = createMemoryAdapter();
      const s = new SQLiteEventStore(db);
      expect(() => s.initDatabase()).not.toThrow();
    });

    it("is idempotent", () => {
      const db = createMemoryAdapter();
      const s = new SQLiteEventStore(db);
      s.initDatabase();
      expect(() => s.initDatabase()).not.toThrow();
    });
  });

  describe("appendEvent", () => {
    it("stores an event and returns true", () => {
      const event = makeEvent({ id: "e1" });
      const result = store.appendEvent(event);
      expect(result).toBe(true);
      expect(store.getEventCount()).toBe(1);
    });

    it("serializes payload as JSON string", () => {
      const event = makeEvent({
        id: "e1",
        payload: { name: "Nubank", balance: 1500.5 },
      });
      store.appendEvent(event);
      const events = store.getAllEvents();
      const stored = events[0]!;
      expect(stored.payload).toEqual({ name: "Nubank", balance: 1500.5 });
    });

    it("ignores duplicate events (same id)", () => {
      const event = makeEvent({ id: "dup-1" });
      store.appendEvent(event);
      const result = store.appendEvent(event);
      expect(result).toBe(false);
      expect(store.getEventCount()).toBe(1);
    });

    it("stores multiple different events", () => {
      store.appendEvent(makeEvent({ id: "e1", timestamp: 100 }));
      store.appendEvent(makeEvent({ id: "e2", timestamp: 200 }));
      store.appendEvent(makeEvent({ id: "e3", timestamp: 300 }));
      expect(store.getEventCount()).toBe(3);
    });

    it("handles string payload", () => {
      const event = makeEvent({ id: "e1", payload: "simple string" });
      store.appendEvent(event);
      const events = store.getAllEvents();
      expect(events[0]!.payload).toBe("simple string");
    });

    it("handles nested object payload", () => {
      const event = makeEvent({
        id: "e1",
        payload: {
          items: [
            { name: "Arroz", price: 22.9 },
            { name: "Feijao", price: 8.5 },
          ],
          total: 31.4,
        },
      });
      store.appendEvent(event);
      const stored = store.getAllEvents()[0]!;
      const payload = stored.payload as { items: Array<{ name: string; price: number }>; total: number };
      expect(payload.items).toHaveLength(2);
      expect(payload.total).toBe(31.4);
    });

    it("auto-initializes if not called explicitly", () => {
      const db = createMemoryAdapter();
      const s = new SQLiteEventStore(db);
      const event = makeEvent({ id: "e1" });
      expect(() => s.appendEvent(event)).not.toThrow();
      expect(s.getEventCount()).toBe(1);
    });
  });

  describe("getAllEvents", () => {
    it("returns empty array when no events", () => {
      expect(store.getAllEvents()).toEqual([]);
    });

    it("returns all events ordered by timestamp", () => {
      store.appendEvent(makeEvent({ id: "e3", timestamp: 300 }));
      store.appendEvent(makeEvent({ id: "e1", timestamp: 100 }));
      store.appendEvent(makeEvent({ id: "e2", timestamp: 200 }));

      const events = store.getAllEvents();
      expect(events).toHaveLength(3);
      expect(events[0]!.id).toBe("e1");
      expect(events[1]!.id).toBe("e2");
      expect(events[2]!.id).toBe("e3");
    });

    it("preserves all event fields", () => {
      const original = makeEvent({
        id: "full-event",
        type: "ACCOUNT_CREATED",
        payload: { name: "Conta Corrente" },
        timestamp: 1707900000000,
        deviceId: "dev-xyz",
        signature: "sig-123",
      });
      store.appendEvent(original);

      const stored = store.getAllEvents()[0]!;
      expect(stored.id).toBe("full-event");
      expect(stored.type).toBe("ACCOUNT_CREATED");
      expect(stored.payload).toEqual({ name: "Conta Corrente" });
      expect(stored.timestamp).toBe(1707900000000);
      expect(stored.deviceId).toBe("dev-xyz");
      expect(stored.signature).toBe("sig-123");
    });
  });

  describe("getEventsSince", () => {
    it("returns events after a given timestamp", () => {
      store.appendEvent(makeEvent({ id: "e1", timestamp: 100 }));
      store.appendEvent(makeEvent({ id: "e2", timestamp: 200 }));
      store.appendEvent(makeEvent({ id: "e3", timestamp: 300 }));

      const events = store.getEventsSince(150);
      expect(events).toHaveLength(2);
      expect(events[0]!.id).toBe("e2");
      expect(events[1]!.id).toBe("e3");
    });

    it("returns empty when no events after timestamp", () => {
      store.appendEvent(makeEvent({ id: "e1", timestamp: 100 }));
      const events = store.getEventsSince(200);
      expect(events).toHaveLength(0);
    });

    it("returns all events when timestamp is 0", () => {
      store.appendEvent(makeEvent({ id: "e1", timestamp: 100 }));
      store.appendEvent(makeEvent({ id: "e2", timestamp: 200 }));
      const events = store.getEventsSince(0);
      expect(events).toHaveLength(2);
    });

    it("excludes events at exact timestamp (strictly greater)", () => {
      store.appendEvent(makeEvent({ id: "e1", timestamp: 100 }));
      store.appendEvent(makeEvent({ id: "e2", timestamp: 200 }));
      const events = store.getEventsSince(100);
      expect(events).toHaveLength(1);
      expect(events[0]!.id).toBe("e2");
    });
  });

  describe("eventExists", () => {
    it("returns true for existing event", () => {
      store.appendEvent(makeEvent({ id: "exists-1" }));
      expect(store.eventExists("exists-1")).toBe(true);
    });

    it("returns false for non-existing event", () => {
      expect(store.eventExists("nonexistent")).toBe(false);
    });
  });

  describe("replayEvents", () => {
    it("replays events through a reducer in timestamp order", () => {
      store.appendEvent(
        makeEvent({ id: "e2", timestamp: 200, type: "ADD", payload: { value: 20 } }),
      );
      store.appendEvent(
        makeEvent({ id: "e1", timestamp: 100, type: "ADD", payload: { value: 10 } }),
      );
      store.appendEvent(
        makeEvent({ id: "e3", timestamp: 300, type: "ADD", payload: { value: 30 } }),
      );

      const total = store.replayEvents(0, (state, event) => {
        const p = event.payload as { value: number };
        return state + p.value;
      });

      expect(total).toBe(60);
    });

    it("returns initial state when no events", () => {
      const result = store.replayEvents({ count: 0 }, (state) => state);
      expect(result).toEqual({ count: 0 });
    });

    it("processes events in correct order", () => {
      store.appendEvent(
        makeEvent({ id: "e1", timestamp: 100, type: "SET", payload: { name: "first" } }),
      );
      store.appendEvent(
        makeEvent({ id: "e2", timestamp: 200, type: "SET", payload: { name: "second" } }),
      );

      const result = store.replayEvents("", (_state, event) => {
        const p = event.payload as { name: string };
        return p.name;
      });

      expect(result).toBe("second");
    });

    it("never saves state to database (state only in memory)", () => {
      store.appendEvent(
        makeEvent({ id: "e1", timestamp: 100, payload: { v: 1 } }),
      );

      const state1 = store.replayEvents(0, (s, e) => s + (e.payload as { v: number }).v);
      const state2 = store.replayEvents(0, (s, e) => s + (e.payload as { v: number }).v);

      expect(state1).toBe(state2);
      expect(store.getEventCount()).toBe(1);
    });
  });

  describe("immutability", () => {
    it("events cannot be modified after insertion", () => {
      const event = makeEvent({ id: "immut-1", payload: { value: "original" } });
      store.appendEvent(event);

      const event2 = { ...event, payload: { value: "modified" } };
      store.appendEvent(event2);

      const stored = store.getAllEvents();
      expect(stored).toHaveLength(1);
      expect((stored[0]!.payload as { value: string }).value).toBe("original");
    });
  });
});
