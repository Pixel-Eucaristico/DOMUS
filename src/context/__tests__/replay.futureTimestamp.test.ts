import { describe, it, expect } from "vitest";
import {
  replayAllEvents,
  isFutureForeignEvent,
  futureReferenceResolver,
  nextFutureReleaseAt,
  futureReleaseDelayMs,
  replayOptionsFor,
  MAX_TIMER_DELAY_MS,
  FUTURE_TIMESTAMP_REASON,
  KNOWN_EVENT_TYPES,
} from "../replay";
import {
  normalizeStoredEvents,
  stampDeviceId,
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

  it("now padrão é Date.now(): +48 h vai para a Quarentena e +23 h é aplicado", () => {
    // O `account` (deste aparelho, NOW − 10 h) fica abaixo de Date.now(): a referência é o relógio.
    const log = [account, tx("d", Date.now() + 48 * H, OTHER)];
    expect(replayAllEvents(log, { currentDeviceId: ME }).quarantine.map((q) => q.kind)).toEqual([
      "future_timestamp",
    ]);
    const near = replayAllEvents([account, tx("n", Date.now() + 23 * H, OTHER)], { currentDeviceId: ME });
    expect(near.quarantine).toEqual([]);
    expect(Object.keys(near.domain.transactions)).toEqual(["tx-n"]);
  });

  it("envelope inválido com horário no futuro: invalid_envelope (o envelope é conferido antes)", () => {
    const broken = { ...tx("x", NOW + 72 * H, OTHER), payload: "não é objeto" as unknown as object };
    const noType = { ...tx("y", NOW + 72 * H, OTHER), type: "" };
    const r = replayAllEvents([account, broken, noType], { now: NOW, currentDeviceId: ME });
    expect(r.quarantine.map((q) => [q.id, q.kind])).toEqual([
      ["x", "invalid_envelope"],
      ["y", "invalid_envelope"],
    ]);
  });
});

describe("referência do agora: maior entre o relógio e os outros aparelhos (decisão do dono)", () => {
  const A = "dev-A";
  const B = "dev-B";
  const C = "dev-C";
  const D = "dev-D";
  const acc = (id: string, t: number, d: string) =>
    ev(`c-${id}`, "ACCOUNT_CREATED", { id, name: "X", type: "wallet", balance: 1000 }, t, d);
  const txOn = (id: string, t: number, d: string, accountId = "a1") =>
    ev(id, "TRANSACTION_CREATED", { id: `tx-${id}`, accountId, type: "expense", amount: 300, date: "2026-10-22" }, t, d);

  it("aparelho com o relógio 3 dias atrás (ou de volta a 2020) aplica os eventos do grupo", () => {
    const log = [acc("a1", NOW - 10 * H, A), txOn("ta", NOW - H, A), txOn("tc", NOW - 2 * H, C)];
    for (const now of [NOW - 72 * H, 1_577_836_800_000]) {
      const r = replayAllEvents(log, { now, currentDeviceId: D });
      expect(r.quarantine).toEqual([]);
      expect(r.domain.accounts["a1"].balance).toBe(400);
      expect(Object.keys(r.domain.transactions).sort()).toEqual(["tx-ta", "tx-tc"]);
    }
  });

  it("um aparelho +25 h à frente de todo o grupo continua em Quarentena, mesmo com muitos eventos", () => {
    const many = Array.from({ length: 50 }, (_, i) => txOn(`b${i}`, NOW + 25 * H + i, B));
    const log = [acc("a1", NOW - 10 * H, A), txOn("tc", NOW - H, C), ...many];
    const r = replayAllEvents(log, { now: NOW, currentDeviceId: A });
    expect(r.quarantine).toHaveLength(50);
    expect(r.quarantine.every((q) => q.kind === "future_timestamp")).toBe(true);
    expect(Object.keys(r.domain.transactions)).toEqual(["tx-tc"]);
    // Visto de C também.
    expect(replayAllEvents(log, { now: NOW, currentDeviceId: C }).quarantine).toHaveLength(50);
  });

  it("dois aparelhos que concordam entre si, ambos à frente do relógio de um terceiro: aplicados no terceiro", () => {
    const log = [acc("a1", NOW + 30 * H, B), txOn("tc", NOW + 31 * H, C), txOn("tb", NOW + 32 * H, B)];
    const r = replayAllEvents(log, { now: NOW, currentDeviceId: D });
    expect(r.quarantine).toEqual([]);
    expect(Object.keys(r.domain.transactions).sort()).toEqual(["tx-tb", "tx-tc"]);
  });

  it("o aparelho atual conta como outro para os eventos de fora (inclusive deviceId \"local\")", () => {
    for (const mine of [ME, "local", ""]) {
      const log = [acc("a1", NOW + 30 * H, mine), txOn("tb", NOW + 50 * H, B)];
      const r = replayAllEvents(log, { now: NOW, currentDeviceId: ME });
      expect(r.quarantine).toEqual([]);
      expect(Object.keys(r.domain.transactions)).toEqual(["tx-tb"]);
    }
  });

  it("limite: referência + 24 h é aplicado; 1 ms acima vai para a Quarentena", () => {
    const ref = NOW + 5 * H;
    const base = [acc("a1", ref, C)];
    expect(replayAllEvents([...base, txOn("e", ref + MAX_FUTURE_SKEW_MS, B)], { now: NOW, currentDeviceId: A }).quarantine).toEqual([]);
    expect(
      replayAllEvents([...base, txOn("e", ref + MAX_FUTURE_SKEW_MS + 1, B)], { now: NOW, currentDeviceId: A }).quarantine.map(
        (q) => q.kind,
      ),
    ).toEqual(["future_timestamp"]);
  });

  it("envelope inválido não serve de prova", () => {
    const fake = { ...acc("z", NOW + 40 * H, C), id: "" };
    const r = replayAllEvents([fake, txOn("tb", NOW + 40 * H, B)], { now: NOW, currentDeviceId: A });
    // Ordem (timestamp, deviceId, id): dev-B antes de dev-C.
    expect(r.quarantine.map((q) => q.kind)).toEqual(["future_timestamp", "invalid_envelope"]);
  });

  it("futureReferenceResolver: maior dos outros por aparelho, nunca abaixo de now", () => {
    const log = [acc("a1", NOW + 10 * H, A), txOn("b", NOW + 20 * H, B), txOn("b2", NOW + 2 * H, B), txOn("c", NOW - H, C)];
    const ref = futureReferenceResolver(log, NOW, ME);
    expect(ref(A)).toBe(NOW + 20 * H);
    expect(ref(B)).toBe(NOW + 10 * H);
    expect(ref(C)).toBe(NOW + 20 * H);
    expect(ref("dev-new")).toBe(NOW + 20 * H);
    expect(futureReferenceResolver([txOn("b", NOW + 20 * H, B)], NOW, ME)(B)).toBe(NOW);
    expect(futureReferenceResolver([], NOW, ME)(B)).toBe(NOW);
  });

  // Cenários das sondas da revisão (rev35all/probe.ts e probe2.ts).
  it("sonda 1: o mesmo log visto de A (Quarentena) e de B (próprio aparelho, aplicado)", () => {
    const log = [acc("a1", NOW - 10 * H, A), txOn("tb", NOW + 25 * H, B)];
    expect(replayAllEvents(log, { now: NOW, currentDeviceId: A }).quarantine.map((q) => q.id)).toEqual(["tb"]);
    expect(replayAllEvents(log, { now: NOW + 25 * H, currentDeviceId: B }).quarantine).toEqual([]);
  });

  it("sonda 3: atualização de outro aparelho mais recente adianta a referência; a exclusão +26 h espera", () => {
    const log = [
      acc("a1", NOW - 10 * H, A),
      txOn("tb", NOW + 25 * H, B),
      ev("upd", "TRANSACTION_UPDATED", { id: "tx-tb", amount: 50 }, NOW + H, C),
      ev("dl", "TRANSACTION_DELETED", { id: "tx-tb" }, NOW + 26 * H, B),
    ];
    // B: referência = C (NOW + 1 h); tb (+25 h) entra, dl (+26 h) espera.
    expect(replayAllEvents(log, { now: NOW, currentDeviceId: A }).quarantine.map((q) => q.id)).toEqual(["dl"]);
    expect(replayAllEvents(log, { now: NOW + 1.5 * H, currentDeviceId: A }).quarantine.map((q) => q.id)).toEqual(["dl"]);
    const later = replayAllEvents(log, { now: NOW + 2 * H, currentDeviceId: A });
    expect(later.quarantine).toEqual([]);
    expect(later.domain.transactions).toEqual({});
  });

  it("sondas 6–9: id diferente (reinstalação, outra caixa) é outro aparelho; deviceId não texto e aparelho atual \"local\" não aplicam a regra", () => {
    const base = acc("a1", NOW - 10 * H, A);
    expect(replayAllEvents([base, txOn("own", NOW + 72 * H, "old-me")], { now: NOW, currentDeviceId: "new-me" }).quarantine.map((q) => q.kind)).toEqual(["future_timestamp"]);
    expect(replayAllEvents([base, txOn("v", NOW + 72 * H, "DEV-A")], { now: NOW, currentDeviceId: A }).quarantine.map((q) => q.kind)).toEqual(["future_timestamp"]);
    const numeric = { ...txOn("n", NOW + 72 * H, B), deviceId: 42 as unknown as string };
    expect(replayAllEvents([base, numeric], { now: NOW, currentDeviceId: A }).quarantine).toEqual([]);
    expect(replayAllEvents([base, txOn("n", NOW + 72 * H, B)], { now: NOW, currentDeviceId: "local" }).quarantine).toEqual([]);
  });

  it("sonda 2 (limite conhecido): num grupo de dois, o atrasado não serve de prova — os eventos do outro esperam", () => {
    // D está 3 dias atrás e é o único outro aparelho de A: a referência de A é o relógio de D.
    const log = [
      acc("a1", NOW - 10 * H, A),
      txOn("dtx", NOW - 72 * H, D),
      ev("cat", "CATEGORY_CREATED", { id: "c1", name: "Food", type: "needs" }, NOW - 20 * H, A),
    ];
    const r = replayAllEvents(log, { now: NOW - 72 * H, currentDeviceId: D });
    expect(r.quarantine.map((q) => [q.id, q.kind])).toEqual([
      ["cat", "future_timestamp"],
      ["c-a1", "future_timestamp"],
    ]);
    // Com um terceiro aparelho em dia no log, tudo vale.
    const withC = replayAllEvents([...log, txOn("tc", NOW - 2 * H, C)], { now: NOW - 72 * H, currentDeviceId: D });
    expect(withC.quarantine).toEqual([]);
  });
});

describe("nextFutureReleaseAt / futureReleaseDelayMs (timer do replay)", () => {
  it("sem evento em Quarentena por horário: null (nenhum timer)", () => {
    expect(nextFutureReleaseAt([account, tx("n", NOW + H, OTHER)], { now: NOW, currentDeviceId: ME })).toBeNull();
    expect(nextFutureReleaseAt([account, tx("f", NOW + 72 * H, OTHER)], { now: NOW })).toBeNull();
    expect(nextFutureReleaseAt([account, tx("f", NOW + 72 * H, OTHER)], { now: NOW, currentDeviceId: null })).toBeNull();
    expect(nextFutureReleaseAt([], { now: NOW, currentDeviceId: ME })).toBeNull();
    expect(futureReleaseDelayMs(null, NOW)).toBeNull();
  });

  it("o mais próximo: t − 24 h; ao chegar nele, o replay aplica o evento", () => {
    const log = [account, tx("far", NOW + 72 * H, OTHER), tx("near", NOW + 30 * H, OTHER)];
    const at = nextFutureReleaseAt(log, { now: NOW, currentDeviceId: ME });
    expect(at).toBe(NOW + 30 * H - MAX_FUTURE_SKEW_MS);
    expect(replayAllEvents(log, { now: at! - 1, currentDeviceId: ME }).quarantine.map((q) => q.id)).toEqual(["near", "far"]);
    expect(replayAllEvents(log, { now: at!, currentDeviceId: ME }).quarantine.map((q) => q.id)).toEqual(["far"]);
    expect(nextFutureReleaseAt(log, { now: at!, currentDeviceId: ME })).toBe(NOW + 72 * H - MAX_FUTURE_SKEW_MS);
  });

  it("envelope inválido no futuro não marca timer; usa a mesma referência do replay", () => {
    const broken = { ...tx("x", NOW + 72 * H, OTHER), id: "" };
    expect(nextFutureReleaseAt([account, broken], { now: NOW, currentDeviceId: ME })).toBeNull();
    // Outro aparelho à frente adianta a referência: o evento já vale, sem timer.
    const log = [account, tx("c", NOW + 10 * H, "dev-c"), tx("f", NOW + 30 * H, OTHER)];
    expect(replayAllEvents(log, { now: NOW, currentDeviceId: ME }).quarantine).toEqual([]);
    expect(nextFutureReleaseAt(log, { now: NOW, currentDeviceId: ME })).toBeNull();
  });

  it("futureReleaseDelayMs: +1 ms, nunca negativo, no máximo o limite do setTimeout", () => {
    expect(futureReleaseDelayMs(NOW + 5000, NOW)).toBe(5001);
    expect(futureReleaseDelayMs(NOW - 5000, NOW)).toBe(0);
    expect(futureReleaseDelayMs(NOW + 60 * 24 * H, NOW)).toBe(MAX_TIMER_DELAY_MS);
    expect(MAX_TIMER_DELAY_MS).toBe(2 ** 31 - 1);
    expect(futureReleaseDelayMs(Number.NaN, NOW)).toBeNull();
  });
});

describe("replayOptionsFor (ligação no AppStateProvider)", () => {
  it("fora do modo demo: id do aparelho; no modo demo: sem id (regra não se aplica)", () => {
    expect(replayOptionsFor(false, ME)).toEqual({ currentDeviceId: ME });
    expect(replayOptionsFor(false, null)).toEqual({ currentDeviceId: null });
    expect(replayOptionsFor(true, ME)).toEqual({});
  });

  it("aplicado ao replay: fora do demo o evento futuro de outro aparelho vai para a Quarentena; no demo, não", () => {
    const log = [account, tx("f", NOW + 72 * H, OTHER)];
    expect(replayAllEvents(log, { ...replayOptionsFor(false, ME), now: NOW }).quarantine.map((q) => q.kind)).toEqual([
      "future_timestamp",
    ]);
    expect(replayAllEvents(log, { ...replayOptionsFor(true, ME), now: NOW }).quarantine).toEqual([]);
    expect(replayAllEvents(log, { ...replayOptionsFor(false, null), now: NOW }).quarantine).toEqual([]);
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

  it("dispatch: stampDeviceId carimba só o deviceId vazio/\"local\"; o timestamp fica idêntico", () => {
    const before = snapshot(items);
    const stamped = items.map((e) => stampDeviceId(e, ME));
    expectSameTimestamps(stamped);
    expect(stamped.map((e) => e.deviceId)).toEqual([OTHER, OTHER, ME]);
    // Já preenchido, ou sem o id do aparelho: o próprio objeto.
    expect(stampDeviceId(accepted, ME)).toBe(accepted);
    expect(stampDeviceId(own, null)).toBe(own);
    // O resto do evento não muda.
    expect({ ...stamped[2], deviceId: own.deviceId }).toEqual(own);
    expect(items).toEqual(before);
    expectSameTimestamps(prepareLocalLog(stamped, ME).events);
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
