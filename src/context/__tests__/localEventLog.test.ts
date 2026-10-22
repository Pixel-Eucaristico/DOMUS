import { describe, it, expect } from "vitest";
import {
  normalizeStoredEvents,
  eventSortKey,
  dedupeById,
  prepareLocalLog,
  prepareBackupForStorage,
  eventsForExport,
  isBlankDeviceId,
} from "../localEventLog";
import { replayAllEvents } from "../replay";
import type { SyncEvent } from "@packages/storage/src/eventStore";

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

describe("Story 3.4 — log local pronto para a memória", () => {
  const ev = (id: string, over: Partial<Record<keyof SyncEvent, unknown>> = {}) =>
    ({ ...base, id, ...over }) as unknown as SyncEvent;

  it("isBlankDeviceId: 'local' sem diferenciar maiúsculas e com espaços", () => {
    for (const v of ["local", "LOCAL", " Local ", "", "  ", undefined, null, 3]) expect(isBlankDeviceId(v)).toBe(true);
    for (const v of ["dev-1", "local-dev", "localhost"]) expect(isBlankDeviceId(v)).toBe(false);
    expect(normalizeStoredEvents([ev("a", { deviceId: " LOCAL " })], "dev-1").events[0]!.deviceId).toBe("dev-1");
  });

  it("timestamp em texto numérico vira número; texto não numérico fica como está", () => {
    const { events } = normalizeStoredEvents(
      [ev("a", { timestamp: String(T0) }), ev("b", { timestamp: "abc" }), ev("c", { timestamp: "" })],
      "dev-1",
    );
    expect(events.map((e) => e.timestamp)).toEqual([T0, "abc", ""]);
  });

  it("dedupeById fica com o primeiro (como o INSERT OR IGNORE) e não altera a entrada", () => {
    const input = [ev("x", { payload: { n: 1 } }), ev("y"), ev("x", { payload: { n: 2 } })];
    const { events, duplicateIds } = dedupeById(input);
    expect(events.map((e) => (e.payload as { n?: number }).n ?? e.id)).toEqual([1, "y"]);
    expect(duplicateIds).toEqual(["x"]);
    expect(input).toHaveLength(3);
  });

  it("prepareLocalLog normaliza, deduplica e ordena pela ordem total", () => {
    const items = [
      ev("b", { deviceId: "local", timestamp: T0 }),
      ev("a", { deviceId: "dev-z", timestamp: String(T0) }),
      null,
      ev("b", { deviceId: "dev-0", timestamp: T0 - 1 }), // repetido: descartado
      ev("c", { deviceId: "dev-a", timestamp: T0 - 5 }),
    ];
    const r = prepareLocalLog(items, "dev-m");
    expect(r.events.map((e) => [e.id, e.deviceId, e.timestamp])).toEqual([
      ["c", "dev-a", T0 - 5],
      ["b", "dev-m", T0],
      ["a", "dev-z", T0],
    ]);
    expect(r.skippedIndexes).toEqual([2]);
    expect(r.duplicateIds).toEqual(["b"]);
  });

  it("prepareLocalLog dá a mesma ordem para qualquer ordem de chegada", () => {
    const items = [ev("1", { deviceId: "dev-b" }), ev("2", { deviceId: "local" }), ev("3", { deviceId: "dev-a" })];
    const ids = (list: unknown[]) => prepareLocalLog(list, "dev-c").events.map((e) => e.id);
    expect(ids([...items].reverse())).toEqual(ids(items));
    expect(ids([items[1], items[2], items[0]])).toEqual(ids(items));
  });

  it("prepareBackupForStorage: só objetos, sem repetidos, timestamp numérico, deviceId como veio", () => {
    const r = prepareBackupForStorage([ev("x", { deviceId: "local", timestamp: String(T0) }), 7, ev("x"), ev("y", { timestamp: T0 - 1 })]);
    expect(r.events.map((e) => [e.id, e.deviceId, e.timestamp])).toEqual([
      ["y", "dev-x", T0 - 1],
      ["x", "local", T0],
    ]);
    expect(r.skippedIndexes).toEqual([1]);
    expect(r.duplicateIds).toEqual(["x"]);
  });

  it("backup com id repetido: memória e banco ficam com o mesmo evento", () => {
    const acc = ev("acc", { type: "ACCOUNT_CREATED", payload: { id: "a1", name: "C", type: "wallet", balance: 1000 }, timestamp: T0 - 1 });
    const first = ev("dup", { type: "ACCOUNT_UPDATED", payload: { id: "a1", balance: 9000 } });
    const second = ev("dup", { type: "ACCOUNT_UPDATED", payload: { id: "a1", balance: 7000 } });
    const stored = prepareBackupForStorage([acc, first, second]).events;
    const memory = prepareLocalLog(stored, "dev-1").events;
    expect(memory).toHaveLength(2);
    expect(replayAllEvents(memory).domain.accounts["a1"]?.balance).toBe(9000);
  });

  it("eventsForExport troca 'local'/vazio pelo id real e não altera a entrada", () => {
    const input = [ev("a", { deviceId: "local" }), ev("b", { deviceId: "" }), ev("c", { deviceId: "dev-x" })];
    expect(eventsForExport(input, "dev-1").map((e) => e.deviceId)).toEqual(["dev-1", "dev-1", "dev-x"]);
    expect(input[0]!.deviceId).toBe("local");
    expect(eventsForExport(input, null).map((e) => e.deviceId)).toEqual(["local", "", "dev-x"]);
  });
});

