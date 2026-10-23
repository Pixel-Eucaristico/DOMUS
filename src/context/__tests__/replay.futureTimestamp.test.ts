import { describe, it, expect } from "vitest";
import {
  replayAllEvents,
  isFutureForeignEvent,
  FUTURE_TIMESTAMP_REASON,
  KNOWN_EVENT_TYPES,
} from "../replay";
import {
  normalizeStoredEvents,
  prepareLocalLog,
  prepareBackupForStorage,
  eventsForExport,
} from "../localEventLog";
import { selectEventsToImport, parseSyncPayloadDetailed } from "@/src/modules/syncPayload";
import { MAX_FUTURE_SKEW_MS, MAX_ENVELOPE_TIMESTAMP_MS } from "@packages/events/src/validateEnvelope";
import { sortEvents } from "@packages/storage/src/eventOrder";
import type { SyncEvent } from "@packages/storage/src/eventStore";

// Story 3.5: evento de outro aparelho com horário acima de agora + 24 h vai para a
// Quarentena ("horário no futuro"), sem efeito no estado e sem mudança no log.

const NOW = 1_792_627_200_000; // 2026-10-22, em ms
const H = 60 * 60 * 1000;
const ME = "dev-me";
const OTHER = "dev-other";

function stateOf(result: ReturnType<typeof replayAllEvents>) {
  const { quarantine: _q, ...state } = result;
  return state;
}

const snapshot = (log: readonly SyncEvent[]) => JSON.parse(JSON.stringify(log)) as SyncEvent[];

function ev(id: string, type: string, payload: object, timestamp: number, deviceId: string): SyncEvent {
  return { id, type, payload, timestamp, deviceId, signature: "" };
}

const account = ev(
  "acc",
  "ACCOUNT_CREATED",
  { id: "acc-1", name: "Carteira", type: "wallet", balance: 1000 },
  NOW - 10 * H,
  ME,
);
const tx = (id: string, timestamp: number, deviceId: string, amount = 300) =>
  ev(
    id,
    "TRANSACTION_CREATED",
    { id: `tx-${id}`, accountId: "acc-1", type: "expense", amount, date: "2026-10-22" },
    timestamp,
    deviceId,
  );

describe("MAX_FUTURE_SKEW_MS", () => {
  it("é 24 h em ms", () => {
    expect(MAX_FUTURE_SKEW_MS).toBe(86_400_000);
  });
});

describe("replayAllEvents — horário no futuro (Story 3.5), matriz", () => {
  it("outro aparelho, horário normal (t ≤ agora + 24 h): aplicado", () => {
    const log = [account, tx("n", NOW + 23 * H, OTHER)];
    const r = replayAllEvents(log, { now: NOW, currentDeviceId: ME });
    expect(r.quarantine).toEqual([]);
    expect(Object.keys(r.domain.transactions)).toEqual(["tx-n"]);
  });

  it("outro aparelho, adiantado (t = agora + 25 h): Quarentena e estado igual ao sem ele", () => {
    const future = tx("f", NOW + 25 * H, OTHER);
    const log = [account, tx("ok", NOW - H, OTHER, 100), future];
    const before = snapshot(log);
    const r = replayAllEvents(log, { now: NOW, currentDeviceId: ME });

    expect(r.quarantine).toEqual([
      { id: "f", type: "TRANSACTION_CREATED", kind: "future_timestamp", reason: "horário no futuro" },
    ]);
    expect(FUTURE_TIMESTAMP_REASON).toBe("horário no futuro");

    const without = replayAllEvents(
      log.filter((e) => e !== future),
      { now: NOW, currentDeviceId: ME },
    );
    expect(stateOf(r)).toEqual(stateOf(without));
    expect(without.quarantine).toEqual([]);
    // O log não muda.
    expect(log).toEqual(before);
    expect(log[2]).toBe(future);
    expect(future.timestamp).toBe(NOW + 25 * H);
  });

  it("mesmo log mais tarde (agora ≥ t − 24 h): aplicado, sem mudança no log", () => {
    const t = NOW + 25 * H;
    const log = [account, tx("f", t, OTHER)];
    const before = snapshot(log);

    const early = replayAllEvents(log, { now: NOW, currentDeviceId: ME });
    expect(early.quarantine.map((q) => q.kind)).toEqual(["future_timestamp"]);
    expect(early.domain.transactions).toEqual({});

    const later = replayAllEvents(log, { now: t - MAX_FUTURE_SKEW_MS, currentDeviceId: ME });
    expect(later.quarantine).toEqual([]);
    expect(Object.keys(later.domain.transactions)).toEqual(["tx-f"]);

    const muchLater = replayAllEvents(log, { now: t + 10 * H, currentDeviceId: ME });
    expect(stateOf(muchLater)).toEqual(stateOf(later));

    expect(log).toEqual(before);
  });

  it("próprio aparelho adiantado (t = agora + 3 dias): aplicado (como hoje)", () => {
    const log = [account, tx("mine", NOW + 72 * H, ME)];
    const r = replayAllEvents(log, { now: NOW, currentDeviceId: ME });
    expect(r.quarantine).toEqual([]);
    expect(stateOf(r)).toEqual(stateOf(replayAllEvents(log)));
  });

  it("próprio aparelho com deviceId \"local\"/vazio (antes da normalização): aplicado", () => {
    for (const deviceId of ["local", "LOCAL", "", "  "]) {
      const r = replayAllEvents([account, tx("l", NOW + 72 * H, deviceId)], { now: NOW, currentDeviceId: ME });
      expect(r.quarantine).toEqual([]);
      expect(Object.keys(r.domain.transactions)).toHaveLength(1);
    }
  });

  it("limite exato (t = agora + 24 h): aplicado; 1 ms depois: Quarentena", () => {
    const exact = replayAllEvents([account, tx("e", NOW + MAX_FUTURE_SKEW_MS, OTHER)], {
      now: NOW,
      currentDeviceId: ME,
    });
    expect(exact.quarantine).toEqual([]);
    expect(Object.keys(exact.domain.transactions)).toHaveLength(1);

    const over = replayAllEvents([account, tx("e", NOW + MAX_FUTURE_SKEW_MS + 1, OTHER)], {
      now: NOW,
      currentDeviceId: ME,
    });
    expect(over.quarantine.map((q) => q.kind)).toEqual(["future_timestamp"]);
    expect(Object.keys(over.domain.transactions)).toHaveLength(0);
  });

  it("aparelho atual desconhecido (null/ausente): a regra não se aplica", () => {
    const log = [account, tx("f", NOW + 72 * H, OTHER)];
    for (const opts of [{ now: NOW }, { now: NOW, currentDeviceId: null }, { now: NOW, currentDeviceId: "" }]) {
      const r = replayAllEvents(log, opts);
      expect(r.quarantine).toEqual([]);
      expect(Object.keys(r.domain.transactions)).toHaveLength(1);
    }
  });

  it("timestamp em texto numérico conta como número; não finito vale 0 (como a ordem)", () => {
    const asText = { ...tx("s", 0, OTHER), timestamp: String(NOW + 25 * H) as unknown as number };
    const nonFinite = { ...tx("i", 0, OTHER), timestamp: Infinity };
    const r = replayAllEvents([account, asText, nonFinite], { now: NOW, currentDeviceId: ME });
    expect(r.quarantine.map((q) => [q.id, q.kind])).toEqual([["s", "future_timestamp"]]);
    expect(Object.keys(r.domain.transactions)).toEqual(["tx-i"]);
    expect(asText.timestamp).toBe(String(NOW + 25 * H));
  });

  it("evento futuro de tipo desconhecido também fica como horário no futuro; depois volta ao fluxo normal", () => {
    const unknown = ev("u", "FUTURE_EVENT_X", {}, NOW + 25 * H, OTHER);
    expect(KNOWN_EVENT_TYPES.has("FUTURE_EVENT_X")).toBe(false);
    const early = replayAllEvents([unknown], { now: NOW, currentDeviceId: ME });
    expect(early.quarantine.map((q) => q.kind)).toEqual(["future_timestamp"]);
    const later = replayAllEvents([unknown], { now: NOW + 2 * H, currentDeviceId: ME });
    expect(later.quarantine.map((q) => q.kind)).toEqual(["unknown_type"]);
  });

  it("isFutureForeignEvent é pura e não altera o evento", () => {
    const e = Object.freeze(tx("p", NOW + 25 * H, OTHER));
    expect(isFutureForeignEvent(e, NOW, ME)).toBe(true);
    expect(isFutureForeignEvent(e, NOW, OTHER)).toBe(false);
    expect(isFutureForeignEvent(e, NOW, null)).toBe(false);
    expect(isFutureForeignEvent(e, NOW + H, ME)).toBe(false);
  });

  it("now padrão é Date.now()", () => {
    const log = [account, tx("d", Date.now() + 48 * H, OTHER)];
    expect(replayAllEvents(log, { currentDeviceId: ME }).quarantine.map((q) => q.kind)).toEqual([
      "future_timestamp",
    ]);
  });
});

describe("timestamp nunca reescrito (Story 3.5)", () => {
  // Evento aceito (horário normal) e evento adiantado: o timestamp sai idêntico
  // (=== e mesmo tipo) de todos os helpers puros por onde passa.
  const accepted = tx("a", NOW - H, OTHER);
  const ahead = tx("b", NOW + 25 * H, OTHER);
  const own = { ...tx("c", NOW + 72 * H, "local") };
  const items = [accepted, ahead, own];

  function expectSameTimestamps(out: readonly SyncEvent[]) {
    for (const original of items) {
      const found = out.find((e) => e.id === original.id);
      expect(found, original.id).toBeDefined();
      expect(typeof found!.timestamp).toBe(typeof original.timestamp);
      expect(found!.timestamp === original.timestamp).toBe(true);
    }
  }

  it("hidratação: normalizeStoredEvents / prepareLocalLog (também no dispatch e no import)", () => {
    const before = snapshot(items);
    expectSameTimestamps(normalizeStoredEvents(items, ME).events);
    expectSameTimestamps(prepareLocalLog(items, ME).events);
    expectSameTimestamps(prepareLocalLog(items, null).events);
    expect(items).toEqual(before);
  });

  it("dispatch: carimbar o deviceId não toca no timestamp", () => {
    const stamped = { ...own, deviceId: ME };
    expect(stamped.timestamp).toBe(own.timestamp);
    expectSameTimestamps(prepareLocalLog([accepted, ahead, stamped], ME).events);
  });

  it("restauração: prepareBackupForStorage (o que é gravado) e a memória depois dela", () => {
    const stored = prepareBackupForStorage(items).events;
    expectSameTimestamps(stored);
    expectSameTimestamps(prepareLocalLog(stored, ME).events);
  });

  it("exportação: eventsForExport", () => {
    expectSameTimestamps(eventsForExport(items, ME));
    expectSameTimestamps(eventsForExport(items, null));
  });

  it("import do sync: o evento adiantado continua sendo gravado com o mesmo timestamp", () => {
    const foreign = [accepted, ahead];
    const sel = selectEventsToImport(foreign, new Set(), () => {});
    expect(sel.toAppend.map((e) => e.id)).toEqual(["a", "b"]);
    for (const e of sel.toAppend) {
      const original = foreign.find((o) => o.id === e.id)!;
      expect(e.timestamp === original.timestamp).toBe(true);
    }
    const parsed = parseSyncPayloadDetailed(JSON.stringify(foreign)).events;
    expect(parsed.map((e) => e.timestamp)).toEqual([accepted.timestamp, ahead.timestamp]);
    expect(ahead.timestamp).toBeLessThan(MAX_ENVELOPE_TIMESTAMP_MS);
  });

  it("replay e ordenação: não alteram o log nem o timestamp", () => {
    const log = [account, ...items];
    const before = snapshot(log);
    replayAllEvents(log, { now: NOW, currentDeviceId: ME });
    expectSameTimestamps(sortEvents(log));
    expect(log).toEqual(before);
  });
});
