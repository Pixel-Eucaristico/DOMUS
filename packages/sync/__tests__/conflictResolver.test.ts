import { describe, it, expect } from "vitest";
import {
  lastWriteWins,
  deduplicateEvents,
  resolveConflicts,
  mergeEventStreams,
} from "../src/conflictResolver";
import type { SyncEvent } from "../src/types";

function makeEvent(id: string, timestamp: number, deviceId: string): SyncEvent {
  return { id, type: "TEST", payload: {}, timestamp, deviceId, signature: "s" };
}

describe("lastWriteWins", () => {
  it("sorts events by timestamp ascending", () => {
    const events = [
      makeEvent("e3", 300, "d1"),
      makeEvent("e1", 100, "d1"),
      makeEvent("e2", 200, "d1"),
    ];
    const sorted = lastWriteWins(events);
    expect(sorted.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("breaks ties by deviceId", () => {
    const events = [
      makeEvent("e2", 100, "deviceB"),
      makeEvent("e1", 100, "deviceA"),
    ];
    const sorted = lastWriteWins(events);
    expect(sorted[0]?.deviceId).toBe("deviceA");
    expect(sorted[1]?.deviceId).toBe("deviceB");
  });
});

describe("deduplicateEvents", () => {
  it("removes duplicate events by id", () => {
    const events = [
      makeEvent("e1", 100, "d1"),
      makeEvent("e2", 200, "d1"),
      makeEvent("e1", 100, "d1"),
    ];
    const result = deduplicateEvents(events);
    expect(result).toHaveLength(2);
  });
});

describe("resolveConflicts", () => {
  it("deduplicates and sorts", () => {
    const events = [
      makeEvent("e2", 200, "d1"),
      makeEvent("e1", 100, "d1"),
      makeEvent("e2", 200, "d1"),
    ];
    const result = resolveConflicts(events);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("e1");
  });
});

describe("mergeEventStreams", () => {
  it("merges local and remote events", () => {
    const local = [makeEvent("e1", 100, "d1"), makeEvent("e3", 300, "d1")];
    const remote = [makeEvent("e2", 200, "d2"), makeEvent("e3", 300, "d1")];
    const merged = mergeEventStreams(local, remote);
    expect(merged).toHaveLength(3);
    expect(merged.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });
});
