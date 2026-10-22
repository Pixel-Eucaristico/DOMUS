import { describe, it, expect } from "vitest";
import { normalizeStoredEvents, eventSortKey } from "../localEventLog";

const T0 = 1_792_627_200_000;
const base = { id: "e1", type: "ACCOUNT_CREATED", payload: { id: "a" }, timestamp: T0, deviceId: "dev-x", signature: "" };

describe("normalizeStoredEvents (hidratação e restauração de backup)", () => {
  it("item que não é objeto é pulado e o resto carrega", () => {
    const { events, skippedIndexes } = normalizeStoredEvents([base, null, 42, "x", [1], { ...base, id: "e2" }], "dev-1");
    expect(events.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(skippedIndexes).toEqual([1, 2, 3, 4]);
  });

  it("deviceId 'local', vazio, só espaços ou ausente vira o id do aparelho", () => {
    const items = [
      { ...base, deviceId: "local" },
      { ...base, deviceId: "" },
      { ...base, deviceId: "   " },
      { ...base, deviceId: undefined },
      { ...base, deviceId: "outro" },
    ];
    expect(normalizeStoredEvents(items, "dev-1").events.map((e) => e.deviceId)).toEqual([
      "dev-1", "dev-1", "dev-1", "dev-1", "outro",
    ]);
    expect(normalizeStoredEvents([{ ...base, deviceId: "" }], null).events[0].deviceId).toBe("local");
  });

  it("payload em texto JSON vira objeto; texto inválido fica como está", () => {
    const { events } = normalizeStoredEvents(
      [{ ...base, payload: '{"id":"a"}' }, { ...base, id: "e2", payload: "{quebrado" }],
      "dev-1",
    );
    expect(events[0].payload).toEqual({ id: "a" });
    expect(events[1].payload).toBe("{quebrado");
  });

  it("não altera os itens recebidos", () => {
    const item = { ...base, deviceId: "local", payload: '{"id":"a"}' };
    const copy = JSON.parse(JSON.stringify(item));
    normalizeStoredEvents([item], "dev-1");
    expect(item).toEqual(copy);
  });

  it("entrada que não é array resulta em log vazio", () => {
    expect(normalizeStoredEvents({ a: 1 }, "dev-1")).toEqual({ events: [], skippedIndexes: [] });
  });

  it("eventSortKey: texto vira número; não finito vale 0", () => {
    expect(eventSortKey({ timestamp: T0 })).toBe(T0);
    expect(eventSortKey({ timestamp: String(T0) })).toBe(T0);
    expect(eventSortKey({ timestamp: Number.NaN })).toBe(0);
    expect(eventSortKey({ timestamp: "abc" })).toBe(0);
    expect(eventSortKey({ timestamp: undefined })).toBe(0);
  });
});
