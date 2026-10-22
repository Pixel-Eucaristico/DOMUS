import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { compareEvents, eventTimestampKey, sortEvents } from "../src/eventOrder";
import { SELECT_ALL_SQL, SELECT_SINCE_SQL, SQLiteEventStore, type SyncEvent } from "../src/eventStore";
import { createMemoryAdapter } from "../src/memoryAdapter";
import type { DatabaseAdapter } from "../src/types";

const T = 1_792_627_200_000;

function e(id: string, deviceId: string, timestamp: unknown = T): SyncEvent {
  return { id, type: "X", payload: {}, timestamp: timestamp as number, deviceId, signature: "" };
}

const ids = (list: { id: unknown }[]) => list.map((x) => x.id);

describe("compareEvents (Story 3.4)", () => {
  it("mesmo horário, aparelhos diferentes: deviceId desempata em qualquer ordem de chegada", () => {
    const a = e("1", "dev-b");
    const b = e("2", "dev-a");
    expect(ids(sortEvents([a, b]))).toEqual(["2", "1"]);
    expect(ids(sortEvents([b, a]))).toEqual(["2", "1"]);
  });

  it("mesmo horário e aparelho: id desempata", () => {
    expect(ids(sortEvents([e("b", "dev"), e("a", "dev")]))).toEqual(["a", "b"]);
  });

  it("timestamp manda antes de deviceId e id", () => {
    expect(ids(sortEvents([e("a", "a", T + 1), e("z", "z", T)]))).toEqual(["z", "a"]);
  });

  it("compara texto por unidade de código, não por idioma", () => {
    // localeCompare colocaria "a" antes de "B"; por código "B" (66) vem antes de "a" (97).
    expect(ids(sortEvents([e("a", "d"), e("B", "d")]))).toEqual(["B", "a"]);
    expect(ids(sortEvents([e("é", "d"), e("f", "d")]))).toEqual(["f", "é"]);
  });

  it("timestamp em texto é comparado como número; não finito vale 0", () => {
    // Como texto, "9" > "10"; como número, 9 < 10.
    expect(ids(sortEvents([e("x", "d", "10"), e("y", "d", 9)]))).toEqual(["y", "x"]);
    expect(ids(sortEvents([e("x", "d", String(T)), e("y", "d", T - 1)]))).toEqual(["y", "x"]);
    expect(ids(sortEvents([e("x", "d", 1), e("y", "d", Number.NaN)]))).toEqual(["y", "x"]);
    expect(eventTimestampKey({ timestamp: "abc" })).toBe(0);
    expect(eventTimestampKey({ timestamp: Infinity })).toBe(0);
    // NaN e 0 empatam no timestamp e caem no desempate por deviceId/id.
    expect(compareEvents(e("a", "d", Number.NaN), e("a", "d", 0))).toBe(0);
  });

  it("deviceId/id fora de texto viram texto sem lançar", () => {
    const weird = { id: 2, deviceId: Object.create(null), timestamp: T } as unknown as SyncEvent;
    const normal = { id: "1", deviceId: undefined, timestamp: T } as unknown as SyncEvent;
    expect(() => sortEvents([weird, normal, null as unknown as SyncEvent])).not.toThrow();
    expect(compareEvents({ id: 10, timestamp: T }, { id: "9", timestamp: T })).toBe(-1); // "10" < "9"
  });

  it("empate total devolve 0 e o sort mantém a ordem (estável)", () => {
    const first = { ...e("same", "dev"), type: "PRIMEIRO" };
    const second = { ...e("same", "dev"), type: "SEGUNDO" };
    expect(compareEvents(first, second)).toBe(0);
    expect(sortEvents([first, second]).map((x) => x.type)).toEqual(["PRIMEIRO", "SEGUNDO"]);
  });

  it("sortEvents não altera o array recebido", () => {
    const input = [e("b", "d"), e("a", "d")];
    const snapshot = [...input];
    sortEvents(input);
    expect(input).toEqual(snapshot);
  });
});

// ─── SQLite × memória ─────────────────────────────────────────────────────────

const LOG: SyncEvent[] = [
  e("c", "dev-b"),
  e("b", "dev-b"),
  e("z", "dev-a"),
  e("a", "dev-c", T - 5),
  e("m", "dev-a", T + 5),
  e("A", "dev-b"),
  e("x", "Dev-a"), // maiúscula: por código vem antes de "dev-…"
];

describe("ordem do SQL do eventStore (Story 3.4)", () => {
  it("SELECT_ALL_SQL e SELECT_SINCE_SQL ordenam exatamente por (timestamp, deviceId, id)", () => {
    for (const sql of [SELECT_ALL_SQL, SELECT_SINCE_SQL]) {
      const orderBy = sql.replace(/\s+/g, " ").match(/ORDER BY (.*)$/i)?.[1]?.trim();
      expect(orderBy).toBe("timestamp ASC, deviceId ASC, id ASC");
      expect(sql).not.toMatch(/COLLATE/i); // colação padrão BINARY
    }
  });

  it("memoryAdapter (dublê do SQLite) devolve a ordem do compareEvents", () => {
    const store = new SQLiteEventStore(createMemoryAdapter());
    store.initDatabase();
    for (const evt of [...LOG].reverse()) store.appendEvent(evt);
    expect(ids(store.getAllEvents())).toEqual(ids(sortEvents(LOG)));
    expect(ids(store.getEventsSince(T - 1))).toEqual(ids(sortEvents(LOG.filter((x) => x.timestamp > T - 1))));
  });

  // SQLite real quando o Node tem `node:sqlite` (Node ≥ 22.5); a CI em Node 20 pula.
  let DatabaseSync: (new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): { run(...p: unknown[]): unknown; all(...p: unknown[]): unknown[] };
    close(): void;
  }) | null = null;
  try {
    DatabaseSync = createRequire(import.meta.url)("node:sqlite").DatabaseSync;
  } catch {
    DatabaseSync = null;
  }

  it.skipIf(!DatabaseSync)("SQLite real: o SELECT do eventStore devolve a ordem do compareEvents", () => {
    const db = new DatabaseSync!(":memory:");
    const store = new SQLiteEventStore({
      execute: (sql, params) => {
        if (params && params.length > 0) db.prepare(sql).run(...params);
        else db.exec(sql);
      },
      query: <R>(sql: string, params?: unknown[]) => db.prepare(sql).all(...(params ?? [])) as R[],
      queryOne: <R>(sql: string, params?: unknown[]) => (db.prepare(sql).all(...(params ?? []))[0] as R) ?? null,
    } as DatabaseAdapter);
    store.initDatabase();
    for (const evt of [...LOG].reverse()) store.appendEvent(evt);
    expect(ids(store.getAllEvents())).toEqual(ids(sortEvents(LOG)));
    expect(ids(store.getEventsSince(T - 1))).toEqual(ids(sortEvents(LOG.filter((x) => x.timestamp > T - 1))));
    db.close();
  });
});
