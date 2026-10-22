import { describe, it, expect } from "vitest";
import { replayAllEvents, KNOWN_EVENT_TYPES, UNKNOWN_TYPE_REASON, type ReplayOptions } from "../replay";
import { parseSyncPayloadDetailed, selectEventsToImport } from "@/src/modules/syncPayload";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { DomainEvent } from "@packages/events/src/types";
import { domainReducer } from "@packages/domain/src/reducer";
import { createInitialState } from "@packages/domain/src/state";
import { createInitialGamificationState } from "@packages/gamification/src/reducer";
import { createInitialOnboardingState } from "@packages/onboarding/src/reducer";
import { createInitialSeasonState } from "@packages/season/src/reducer";
import { WISHLIST_EVENTS, type WishlistEvent } from "@packages/wishlist/src/types";
import { wishlistReducer, createInitialWishlistState } from "@packages/wishlist/src/reducer";

/**
 * Story 3.3: um evento de tipo que a versão antiga não conhece fica na
 * Quarentena como "tipo desconhecido", continua no log e passa a valer na
 * versão que conhece o tipo — sem migração, só pelo replay do log inteiro.
 *
 * X = `WISHLIST_PRICE_UPDATED` (tipo real), tirado dos tipos conhecidos da
 * "versão antiga" para poder conferir o estado concreto na "versão nova".
 */

const X = WISHLIST_EVENTS.WISHLIST_PRICE_UPDATED;

const OLD_KNOWN_TYPES: ReadonlySet<string> = new Set([...KNOWN_EVENT_TYPES].filter((t) => t !== X));

/** Versão antiga: não conhece X; o reducer dela também não sabe tratá-lo. */
const OLD_VERSION: ReplayOptions = {
  knownTypes: OLD_KNOWN_TYPES,
  reducers: {
    wishlist: (state, event) => {
      if ((event.type as string) === X) throw new Error("versão antiga não deveria chegar ao reducer de X");
      return wishlistReducer(state, event);
    },
  },
};

const replayOld = (log: readonly SyncEvent[]) => replayAllEvents(log, OLD_VERSION);
/** Versão nova = o app de hoje (sem injeção). */
const replayNew = (log: readonly SyncEvent[]) => replayAllEvents(log);

function stateOf(result: ReturnType<typeof replayAllEvents>) {
  const { quarantine: _q, ...state } = result;
  return state;
}

const T0 = 1_792_627_200_000; // 2026-10-22, em ms
let seq = 0;
function ev(type: string, payload: unknown, id = `e-${++seq}`): SyncEvent {
  return { id, type, payload: payload as object, timestamp: T0 + ++seq * 1000, deviceId: "dev-a", signature: "" };
}

const account = ev("ACCOUNT_CREATED", { id: "acc-1", name: "Carteira", type: "wallet", balance: 1000 }, "acc");
const list = ev("WISHLIST_LIST_CREATED", { id: "list-1", name: "Desejos", createdAt: T0 }, "list");
const itemAdded = ev("WISHLIST_ITEM_ADDED", {
  item: { id: "item-1", listId: "list-1", name: "Fone", urgencyLevel: "PLANNED", orderIndex: 0, price: 100 },
}, "item");
const priceX = ev(X, { itemId: "item-1", newPrice: 250 }, "x");
const priceXBad = ev(X, { itemId: "item-1" }, "x-bad");
const updateB = ev("WISHLIST_ITEM_UPDATED", { itemId: "item-1", changes: { price: 300 } }, "b");
const badEnvelope = ev("TRANSACTION_CREATED", null, "env-ruim");

/** Cópia profunda para conferir que o replay não altera o log. */
const snapshot = (log: readonly SyncEvent[]) => JSON.parse(JSON.stringify(log)) as SyncEvent[];

/** Estado esperado: aplicar os eventos com os reducers reais, um a um, na ordem dada. */
function applyInOrder(events: readonly SyncEvent[]) {
  let domain = createInitialState();
  let wishlist = createInitialWishlistState();
  for (const e of events) {
    if (e.type === "ACCOUNT_CREATED") domain = domainReducer(domain, e as unknown as DomainEvent);
    else wishlist = wishlistReducer(wishlist, e as unknown as WishlistEvent);
  }
  return {
    domain,
    gamification: createInitialGamificationState(),
    onboarding: createInitialOnboardingState(),
    season: createInitialSeasonState(),
    wishlist,
  };
}

describe("replayAllEvents — injeção de versão (Story 3.3)", () => {
  it("sem opções o resultado é o mesmo de passar os padrões explicitamente", () => {
    const log = [account, list, itemAdded, priceX, updateB, badEnvelope];
    expect(replayAllEvents(log)).toEqual(replayAllEvents(log, {}));
    expect(replayAllEvents(log)).toEqual(replayAllEvents(log, { knownTypes: KNOWN_EVENT_TYPES }));
  });

  it("a versão antiga de teste de fato não conhece X e conhece o resto", () => {
    expect(KNOWN_EVENT_TYPES.has(X)).toBe(true);
    expect(OLD_KNOWN_TYPES.has(X)).toBe(false);
    expect(OLD_KNOWN_TYPES.size).toBe(KNOWN_EVENT_TYPES.size - 1);
  });
});

describe("reprocessar eventos desconhecidos (Story 3.3) — matriz", () => {
  it("tipo novo válido: antiga → Quarentena 'tipo desconhecido' e evento no log; nova → aplicado, Quarentena vazia", () => {
    const log = [account, list, itemAdded, priceX];
    const before = snapshot(log);
    const refs = [...log];

    const old = replayOld(log);
    expect(old.quarantine).toEqual([{ id: "x", type: X, kind: "unknown_type", reason: UNKNOWN_TYPE_REASON }]);
    expect(old.wishlist.items["item-1"].price).toBe(100);
    // Estado da antiga = log sem X.
    expect(stateOf(old)).toEqual(stateOf(replayNew([account, list, itemAdded])));
    // O log não foi apagado, reescrito nem reordenado.
    expect(log).toEqual(before);
    expect(log).toHaveLength(4);
    log.forEach((e, i) => expect(e).toBe(refs[i]));

    // "Atualizou o app": mesmo log, versão que conhece X.
    const updated = replayNew(log);
    expect(updated.quarantine).toEqual([]);
    expect(updated.wishlist.items["item-1"].price).toBe(250);
    expect(stateOf(updated)).toEqual(applyInOrder(log));
    expect(log).toEqual(before);
  });

  it("tipo novo com payload ruim: antiga → 'tipo desconhecido'; nova → invalid_payload, sem efeito", () => {
    const log = [account, list, itemAdded, priceXBad];
    const before = snapshot(log);

    const old = replayOld(log);
    expect(old.quarantine).toEqual([{ id: "x-bad", type: X, kind: "unknown_type", reason: UNKNOWN_TYPE_REASON }]);

    const updated = replayNew(log);
    expect(updated.quarantine).toHaveLength(1);
    expect(updated.quarantine[0]).toMatchObject({ id: "x-bad", type: X, kind: "invalid_payload" });
    expect(updated.quarantine[0].reason).toContain('"newPrice"');
    expect(updated.wishlist.items["item-1"].price).toBe(100);
    expect(stateOf(updated)).toEqual(stateOf(replayNew([account, list, itemAdded])));
    expect(log).toEqual(before);
  });

  it("outro motivo (envelope inválido): fica na Quarentena nas duas versões", () => {
    const log = [account, badEnvelope, list, itemAdded, priceX];
    const before = snapshot(log);
    const envEntry = { id: "env-ruim", type: "TRANSACTION_CREATED", kind: "invalid_envelope" };

    const old = replayOld(log);
    // Story 3.4: a Quarentena segue a ordem total do log (priceX é anterior ao badEnvelope).
    expect(old.quarantine.map((q) => q.kind)).toEqual(["unknown_type", "invalid_envelope"]);
    expect(old.quarantine[1]).toMatchObject(envEntry);

    const updated = replayNew(log);
    expect(updated.quarantine).toHaveLength(1);
    expect(updated.quarantine[0]).toMatchObject(envEntry);
    expect(updated.quarantine[0].reason).toBe(old.quarantine[1].reason);
    expect(log).toEqual(before);
  });

  it("ordem A, X, B: X entra na sua posição do log, com o timestamp original", () => {
    const log = [account, list, itemAdded, priceX, updateB];
    const before = snapshot(log);

    const seen: Array<{ id: string; timestamp: number }> = [];
    const spy: ReplayOptions = {
      reducers: {
        wishlist: (state, event) => {
          const e = event as unknown as SyncEvent;
          seen.push({ id: e.id, timestamp: e.timestamp });
          return wishlistReducer(state, event);
        },
      },
    };
    const updated = replayAllEvents(log, spy);

    expect(updated.quarantine).toEqual([]);
    expect(seen).toEqual([list, itemAdded, priceX, updateB].map((e) => ({ id: e.id, timestamp: e.timestamp })));
    // B (300) vem depois de X (250): vale B. Aplicar X por último daria 250.
    expect(updated.wishlist.items["item-1"].price).toBe(300);
    expect(stateOf(updated)).toEqual(applyInOrder(log));
    expect(stateOf(updated)).not.toEqual(applyInOrder([account, list, itemAdded, updateB, priceX]));
    // Igual ao replay "novo" padrão.
    expect(stateOf(updated)).toEqual(stateOf(replayNew(log)));

    // Na versão antiga, A e B valem e X fica de fora.
    const old = replayOld(log);
    expect(old.quarantine.map((q) => q.id)).toEqual(["x"]);
    expect(stateOf(old)).toEqual(applyInOrder([account, list, itemAdded, updateB]));
    expect(log).toEqual(before);
  });
});

describe("reprocessar eventos desconhecidos (Story 3.3) — ponta a ponta com o sync", () => {
  it("X chega pelo relay, é aceito por selectEventsToImport, fica em Quarentena na antiga e é aplicado na nova", () => {
    const localLog: SyncEvent[] = [account, list, itemAdded];

    // Lote bruto do relay (já decriptado): X, um repetido e um envelope malformado.
    const relayX = { id: "relay-x", type: X, payload: { itemId: "item-1", newPrice: 199 }, timestamp: T0 + 60_000, deviceId: "dev-b", signature: "sig" };
    const relayBatch = JSON.stringify([
      relayX,
      { ...itemAdded, deviceId: "dev-a" },
      { id: "relay-ruim", type: X, payload: null, timestamp: T0 + 61_000, deviceId: "dev-b" },
    ]);

    const parsed = parseSyncPayloadDetailed(relayBatch);
    expect(parsed.malformedJson).toBe(false);
    const { toAppend, discarded, duplicates } = selectEventsToImport(
      parsed.events,
      new Set(localLog.map((e) => e.id)),
      () => {},
    );
    expect(toAppend.map((e) => e.id)).toEqual(["relay-x"]);
    expect(toAppend[0].type).toBe(X);
    expect(duplicates).toBe(1);
    expect(parsed.rejected.length + discarded).toBe(1);

    // Mesmo caminho do importEvents: anexa e ordena por timestamp.
    const merged = [...localLog, ...toAppend].sort((a, b) => a.timestamp - b.timestamp);
    const before = snapshot(merged);

    const old = replayOld(merged);
    expect(old.quarantine).toEqual([{ id: "relay-x", type: X, kind: "unknown_type", reason: UNKNOWN_TYPE_REASON }]);
    expect(old.wishlist.items["item-1"].price).toBe(100);
    expect(merged.map((e) => e.id)).toContain("relay-x");

    const updated = replayNew(merged);
    expect(updated.quarantine).toEqual([]);
    expect(updated.wishlist.items["item-1"].price).toBe(199);
    expect(stateOf(updated)).toEqual(applyInOrder(merged));
    expect(merged).toEqual(before);
  });
});
