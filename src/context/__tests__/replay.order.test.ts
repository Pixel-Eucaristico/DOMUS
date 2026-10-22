import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { replayAllEvents } from "../replay";
import { normalizeStoredEvents, compareEvents } from "../localEventLog";
import { SQLiteEventStore, type SyncEvent } from "@packages/storage/src/eventStore";
import { createMemoryAdapter } from "@packages/storage/src/memoryAdapter";
import type { DatabaseAdapter } from "@packages/storage/src/types";

/**
 * Story 3.4: o estado não depende da ordem de chegada. O log tem lotes com o
 * mesmo horário cuja ordem muda o saldo (ACCOUNT_UPDATED que fixa o saldo ×
 * TRANSACTION_CREATED; dois TRANSACTION_UPDATED na mesma transação).
 */

const T0 = 1_792_627_200_000;
const T1 = T0 + 60_000;
const T2 = T0 + 120_000;

function ev(id: string, type: string, payload: object, timestamp: number | string, deviceId = "dev-a"): SyncEvent {
  return { id, type, payload, timestamp: timestamp as number, deviceId, signature: "" };
}

const LOG: SyncEvent[] = [
  ev("acc", "ACCOUNT_CREATED", { id: "acc-1", name: "Carteira", type: "wallet", balance: 1000, color: "#000" }, T0),
  ev("cat", "CATEGORY_CREATED", { id: "alimentacao", name: "Alimentação", group: "needs" }, T0),
  // T1: o ajuste de saldo e a despesa empatam no horário, em aparelhos diferentes.
  ev("fix", "ACCOUNT_UPDATED", { id: "acc-1", balance: 5000 }, T1, "dev-b"),
  ev("tx", "TRANSACTION_CREATED", {
    id: "tx-1", accountId: "acc-1", type: "expense", amount: 100, description: "Mercado", categoryId: "alimentacao", date: "2026-10-22",
  }, T1, "dev-a"),
  // T2: duas edições da mesma transação no mesmo aparelho e horário; o id desempata.
  ev("upd-b", "TRANSACTION_UPDATED", { id: "tx-1", amount: 300 }, String(T2)),
  ev("upd-a", "TRANSACTION_UPDATED", { id: "tx-1", amount: 200 }, T2),
];

function stateOf(events: readonly SyncEvent[]) {
  const { quarantine, ...state } = replayAllEvents(events);
  return { state, quarantine };
}

describe("replayAllEvents — ordem total (Story 3.4)", () => {
  it("o log é sensível à ordem: o desempate decide o saldo", () => {
    // dev-a < dev-b: a despesa (dev-a) vem antes do ajuste (dev-b), que fixa 5000;
    // depois upd-a (200) e upd-b (300) revertem e reaplicam: 5000 + 100 - 300 = 4800.
    const r = replayAllEvents(LOG);
    expect(r.domain.accounts["acc-1"]?.balance).toBe(4800);
    expect(r.domain.transactions["tx-1"]?.amount).toBe(300);
    // Com os aparelhos trocados o ajuste vem antes da despesa e o saldo muda —
    // prova de que, sem ordem total, a ordem de chegada mudaria o estado.
    const swapped = LOG.map((e) =>
      e.id === "fix" ? { ...e, deviceId: "dev-a" } : e.id === "tx" ? { ...e, deviceId: "dev-b" } : e,
    );
    expect(replayAllEvents(swapped).domain.accounts["acc-1"]?.balance).not.toBe(4800);
  });

  it("três ordens de chegada dão o mesmo estado (deep-equal)", () => {
    const orders = [
      [...LOG],
      [...LOG].reverse(),
      [LOG[3]!, LOG[5]!, LOG[0]!, LOG[2]!, LOG[4]!, LOG[1]!],
    ];
    const [first, ...rest] = orders.map(stateOf);
    for (const other of rest) expect(other).toEqual(first);
    expect(first!.quarantine).toEqual([]);
  });

  it("não altera o array recebido", () => {
    const input = [...LOG].reverse();
    const snapshot = input.map((e) => e.id);
    replayAllEvents(input);
    expect(input.map((e) => e.id)).toEqual(snapshot);
  });

  it("continua aceitando as opções da Story 3.3", () => {
    const r = replayAllEvents([...LOG].reverse(), { knownTypes: new Set(["ACCOUNT_CREATED"]) });
    expect(r.domain.accounts["acc-1"]?.balance).toBe(1000);
    expect(r.quarantine.map((q) => q.kind)).toEqual(Array(5).fill("unknown_type"));
  });

  it("timestamp em texto ou não finito é ordenado como número / como 0", () => {
    const early = ev("nan", "ACCOUNT_UPDATED", { id: "acc-1", name: "Primeiro" }, Number.NaN);
    const r = replayAllEvents([...LOG, early]);
    // NaN vale 0: aplicado antes da criação da conta → sem efeito.
    expect(r.domain.accounts["acc-1"]?.name).toBe("Carteira");
  });
});

describe("SQLite × memória (Story 3.4)", () => {
  function memoryState(): unknown {
    // Memória: ordem de chegada qualquer, normalizada e reordenada como na hidratação.
    const arrival = [LOG[4]!, LOG[2]!, LOG[0]!, LOG[5]!, LOG[1]!, LOG[3]!];
    const normalized = normalizeStoredEvents(arrival, "dev-a").events.sort(compareEvents);
    return stateOf(normalized);
  }

  function reloadedState(db: DatabaseAdapter): unknown {
    const store = new SQLiteEventStore(db);
    store.initDatabase();
    for (const evt of [...LOG].reverse()) store.appendEvent(evt);
    const reloaded = normalizeStoredEvents(store.getAllEvents(), "dev-a").events.sort(compareEvents);
    return stateOf(reloaded);
  }

  it("log gravado e recarregado (dublê do SQLite) dá o mesmo estado da memória", () => {
    expect(reloadedState(createMemoryAdapter())).toEqual(memoryState());
  });

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

  it.skipIf(!DatabaseSync)("log gravado e recarregado do SQLite real dá o mesmo estado da memória", () => {
    const db = new DatabaseSync!(":memory:");
    const adapter: DatabaseAdapter = {
      execute: (sql, params) => {
        if (params && params.length > 0) db.prepare(sql).run(...params);
        else db.exec(sql);
      },
      query: <R>(sql: string, params?: unknown[]) => db.prepare(sql).all(...(params ?? [])) as R[],
      queryOne: <R>(sql: string, params?: unknown[]) => (db.prepare(sql).all(...(params ?? []))[0] as R) ?? null,
    };
    // Sem reordenar depois de recarregar: a ordem do SELECT já tem de ser a do compareEvents.
    const store = new SQLiteEventStore(adapter);
    store.initDatabase();
    for (const evt of [...LOG].reverse()) store.appendEvent(evt);
    const rows = store.getAllEvents();
    expect(rows.map((e) => e.id)).toEqual([...rows].sort(compareEvents).map((e) => e.id));
    expect(stateOf(rows)).toEqual(memoryState());
    db.close();
  });
});
