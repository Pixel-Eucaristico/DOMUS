import { describe, it, expect } from "vitest";
import {
  replayAllEvents,
  FUTURE_SCHEMA_VERSION_REASON,
  INVALID_SCHEMA_VERSION_REASON,
  UNKNOWN_TYPE_REASON,
  type ReplayOptions,
  type ReplayReducers,
} from "../replay";
import { PAYLOAD_SPECS, validateLocalEvent, type FieldSpec } from "../replayValidation";
import { appendDispatched, appendGenerated, mergeImported } from "../localEventLog";
import { parseSyncPayloadDetailed, selectEventsToImport } from "@/src/modules/syncPayload";
import { DEMO_SEED_EVENTS } from "@/src/constants/mockDemoEvents";
import { validateEnvelope } from "@packages/events/src/validateEnvelope";
import type { SchemaRegistry } from "@packages/events/src/schemaVersion";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { DomainEvent } from "@packages/events/src/types";
import { EVENT_TYPES } from "@packages/events/src/types";
import { domainReducer } from "@packages/domain/src/reducer";
import { createInitialState } from "@packages/domain/src/state";
import { GAMIFICATION_EVENTS, type GamificationEvent } from "@packages/gamification/src/types";
import { gamificationReducer, createInitialGamificationState } from "@packages/gamification/src/reducer";
import { ONBOARDING_EVENTS, type OnboardingEvent } from "@packages/onboarding/src/types";
import { onboardingReducer, createInitialOnboardingState } from "@packages/onboarding/src/reducer";
import { SEASON_EVENTS, type SeasonEvent } from "@packages/season/src/types";
import { seasonReducer, createInitialSeasonState } from "@packages/season/src/reducer";
import { WISHLIST_EVENTS, type WishlistEvent } from "@packages/wishlist/src/types";
import { wishlistReducer, createInitialWishlistState } from "@packages/wishlist/src/reducer";
import { sortEvents } from "@packages/storage/src/eventOrder";

/**
 * Story 3.8: versão do formato do payload. Registro só de teste: `ACCOUNT_CREATED`
 * atual = 2; a v2 exige `currency` (texto); a conversão v1→v2 preenche `"BRL"`.
 * Nada do formato publicado muda: o registro real continua com todos os tipos na v1.
 */

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

const snapshot = (log: readonly SyncEvent[]) => JSON.parse(JSON.stringify(log)) as SyncEvent[];

function stateOf(result: ReturnType<typeof replayAllEvents>) {
  const { quarantine: _q, ...state } = result;
  return state;
}

/** Só preenche o campo ausente (regra do registro). */
const upcastV1toV2 = (p: Readonly<Record<string, unknown>>) => ({ ...p, currency: p.currency ?? "BRL" });

const V2_REGISTRY: SchemaRegistry = { ACCOUNT_CREATED: { current: 2, upcasters: { 1: upcastV1toV2 } } };
const V2_SPECS = {
  ...PAYLOAD_SPECS,
  ACCOUNT_CREATED: { ...PAYLOAD_SPECS.ACCOUNT_CREATED, currency: { kind: "string" } as FieldSpec },
};
/** Versão do app que conhece a v2 de `ACCOUNT_CREATED`. */
const V2: ReplayOptions = { schemaRegistry: V2_REGISTRY, payloadSpecs: V2_SPECS };

/** Versão seguinte: v3 (`currency` continua; v2→v3 só repassa). */
const V3: ReplayOptions = {
  schemaRegistry: { ACCOUNT_CREATED: { current: 3, upcasters: { 1: upcastV1toV2, 2: (p) => ({ ...p }) } } },
  payloadSpecs: V2_SPECS,
};

const T0 = 1_792_627_200_000; // 2026-10-22, em ms
let seq = 0;
function ev(type: string, payload: unknown, id = `e-${++seq}`, extra: Record<string, unknown> = {}): SyncEvent {
  return {
    id,
    type,
    payload: payload as object,
    timestamp: T0 + ++seq * 1000,
    deviceId: "dev-a",
    signature: "",
    ...extra,
  } as SyncEvent;
}

const acc = (id: string, payload: Record<string, unknown>, evId = id) =>
  ev("ACCOUNT_CREATED", { id, name: id, type: "wallet", ...payload }, evId);
const tx = (id: string, accountId: string, amount: number) =>
  ev("TRANSACTION_CREATED", { id, accountId, type: "expense", amount, date: "2026-10-22", status: "confirmed" }, id);

describe("Story 3.8 — matriz com registro de teste (ACCOUNT_CREATED v2)", () => {
  it("publicado (v1, sem schemaVersion): convertido, currency BRL, sem schemaVersion no estado", () => {
    const log = deepFreeze([acc("a1", { balance: 100 })]);
    const r = replayAllEvents(log, V2);
    expect(r.quarantine).toEqual([]);
    expect(r.domain.accounts["a1"]).toEqual({ id: "a1", name: "a1", type: "wallet", balance: 100, currency: "BRL" });
    expect(r.domain.accounts["a1"]).not.toHaveProperty("schemaVersion");
  });

  it("v1 e v2 do mesmo tipo: os dois com o campo novo e saldos corretos", () => {
    const log = deepFreeze([
      acc("a1", { balance: 100 }),
      acc("a2", { balance: 50, currency: "USD", schemaVersion: 2 }),
      tx("t1", "a1", 30),
      tx("t2", "a2", 20),
    ]);
    const before = snapshot(log);
    const r = replayAllEvents(log, V2);
    expect(r.quarantine).toEqual([]);
    expect(r.domain.accounts["a1"]).toMatchObject({ currency: "BRL", balance: 70 });
    expect(r.domain.accounts["a2"]).toMatchObject({ currency: "USD", balance: 30 });
    expect(r.domain.accounts["a2"]).not.toHaveProperty("schemaVersion");
    expect(log).toEqual(before);
  });

  it("v1 explícito (schemaVersion: 1) = ausente", () => {
    const a = replayAllEvents([acc("a1", { balance: 100, schemaVersion: 1 })], V2);
    const b = replayAllEvents([acc("a1", { balance: 100 })], V2);
    expect(stateOf(a)).toEqual(stateOf(b));
  });

  it("v2 sem o campo novo → Quarentena invalid_payload (currency)", () => {
    const r = replayAllEvents([acc("a1", { balance: 50, schemaVersion: 2 }, "v2-sem")], V2);
    expect(r.quarantine).toEqual([
      {
        id: "v2-sem",
        type: "ACCOUNT_CREATED",
        kind: "invalid_payload",
        reason: 'payload inválido: campo "currency" ausente ou com tipo errado',
      },
    ]);
    expect(r.domain.accounts).toEqual({});
  });

  it("versão futura → Quarentena future_schema_version; com registro atual = 3, aplicada na mesma posição", () => {
    const log = deepFreeze([
      acc("a1", { balance: 100 }),
      acc("a2", { balance: 10, currency: "EUR", schemaVersion: 3 }, "v3"),
      tx("t1", "a2", 4),
      tx("t2", "a1", 1),
    ]);
    const before = snapshot(log);

    const old = replayAllEvents(log, V2);
    expect(old.quarantine).toEqual([
      { id: "v3", type: "ACCOUNT_CREATED", kind: "future_schema_version", reason: FUTURE_SCHEMA_VERSION_REASON },
    ]);
    expect(FUTURE_SCHEMA_VERSION_REASON).toBe("versão do formato mais nova");
    expect(old.domain.accounts["a2"]).toBeUndefined();
    expect(log).toEqual(before);

    const updated = replayAllEvents(log, V3);
    expect(updated.quarantine).toEqual([]);
    expect(updated.domain.accounts["a2"]).toMatchObject({ currency: "EUR", balance: 6 });
    expect(updated.domain.accounts["a1"]).toMatchObject({ currency: "BRL", balance: 99 });
    // Mesma posição: igual a aplicar o log como se a v3 estivesse lá desde o começo.
    const asIfKnown = replayAllEvents(
      log.map((e) => (e.id === "v3" ? { ...e, payload: { ...(e.payload as object), schemaVersion: 2 } } : e)),
      V2,
    );
    expect(stateOf(updated)).toEqual(stateOf(asIfKnown));
  });

  it('versão inválida ("2", 0, 1.5, -1, null) → Quarentena invalid_payload (schemaVersion)', () => {
    for (const v of ["2", 0, 1.5, -1, null]) {
      const r = replayAllEvents([acc("a1", { balance: 1, currency: "USD", schemaVersion: v }, "bad")], V2);
      expect(r.quarantine).toEqual([
        {
          id: "bad",
          type: "ACCOUNT_CREATED",
          kind: "invalid_payload",
          reason: INVALID_SCHEMA_VERSION_REASON,
        },
      ]);
      expect(INVALID_SCHEMA_VERSION_REASON).toBe('payload inválido: campo "schemaVersion" inválido');
      // Registro real também recusa: não é versão.
      expect(replayAllEvents([acc("a1", { balance: 1, schemaVersion: v }, "bad")]).quarantine[0]?.kind).toBe(
        "invalid_payload",
      );
    }
  });

  it("conversão ausente ou que lança erro → Quarentena, sem efeito parcial", () => {
    const missing: ReplayOptions = { schemaRegistry: { ACCOUNT_CREATED: { current: 2 } }, payloadSpecs: V2_SPECS };
    const r1 = replayAllEvents([acc("a1", { balance: 1 }, "m")], missing);
    expect(r1.quarantine).toEqual([
      { id: "m", type: "ACCOUNT_CREATED", kind: "reducer_error", reason: "conversão do formato v1→v2 ausente" },
    ]);
    expect(r1.domain.accounts).toEqual({});

    const throwing: ReplayOptions = {
      schemaRegistry: { ACCOUNT_CREATED: { current: 2, upcasters: { 1: () => { throw new Error("quebrou"); } } } },
      payloadSpecs: V2_SPECS,
    };
    const r2 = replayAllEvents([acc("a1", { balance: 1 }, "x"), acc("a2", { balance: 2, currency: "USD", schemaVersion: 2 })], throwing);
    expect(r2.quarantine).toEqual([
      { id: "x", type: "ACCOUNT_CREATED", kind: "reducer_error", reason: "erro na conversão do formato v1→v2: Error: quebrou" },
    ]);
    expect(Object.keys(r2.domain.accounts)).toEqual(["a2"]);
  });

  it("o reducer recebe o payload sem schemaVersion nem profileId", () => {
    const seen: unknown[] = [];
    const reducers: Partial<ReplayReducers> = {
      domain: (s, e) => {
        seen.push(e.payload);
        return domainReducer(s, e);
      },
    };
    replayAllEvents([acc("a1", { balance: 1, currency: "USD", schemaVersion: 2, profileId: "p1" })], { ...V2, reducers });
    expect(seen).toEqual([{ id: "a1", name: "a1", type: "wallet", balance: 1, currency: "USD" }]);
  });
});

// ─── Registro real ──────────────────────────────────────────────────────────

function legacyReplay(events: readonly SyncEvent[]) {
  let domain = createInitialState();
  let gamification = createInitialGamificationState();
  let onboarding = createInitialOnboardingState();
  let season = createInitialSeasonState();
  let wishlist = createInitialWishlistState();
  for (const evt of events) {
    const t = evt.type;
    if ((Object.values(EVENT_TYPES) as string[]).includes(t)) domain = domainReducer(domain, evt as unknown as DomainEvent);
    if ((Object.values(GAMIFICATION_EVENTS) as string[]).includes(t)) gamification = gamificationReducer(gamification, evt as unknown as GamificationEvent);
    if ((Object.values(ONBOARDING_EVENTS) as string[]).includes(t)) onboarding = onboardingReducer(onboarding, evt as unknown as OnboardingEvent);
    if ((Object.values(SEASON_EVENTS) as string[]).includes(t)) season = seasonReducer(season, evt as unknown as SeasonEvent);
    if ((Object.values(WISHLIST_EVENTS) as string[]).includes(t)) wishlist = wishlistReducer(wishlist, evt as unknown as WishlistEvent);
  }
  return { domain, gamification, onboarding, season, wishlist };
}

describe("Story 3.8 — registro real (todos os tipos na v1)", () => {
  it("log de hoje: estado idêntico ao de antes da story e payload entregue sem cópia", () => {
    const log = deepFreeze(DEMO_SEED_EVENTS.map((e) => ({ ...e })) as SyncEvent[]);
    const before = snapshot(log);
    const delivered = new Map<string, unknown>();
    const spy = <S, E extends { id?: unknown; payload?: unknown }>(fn: (s: S, e: E) => S) => (s: S, e: E) => {
      delivered.set(e.id as string, e.payload);
      return fn(s, e);
    };
    const r = replayAllEvents(log, {
      reducers: {
        domain: spy(domainReducer),
        gamification: spy(gamificationReducer),
        onboarding: spy(onboardingReducer),
        season: spy(seasonReducer),
        wishlist: spy(wishlistReducer),
      },
    });
    expect(r.quarantine).toEqual([]);
    const expected = legacyReplay(sortEvents(log).map((e) => validateLocalEvent(e)).flatMap((c) => (c.ok ? [c.event] : [])));
    expect(stateOf(r)).toEqual(expected);
    expect(stateOf(replayAllEvents(log))).toEqual(expected);
    // Sem metadados, o payload chega ao reducer como está no log (sem conversão nem cópia).
    for (const e of log) {
      if (delivered.has(e.id) && typeof e.payload === "object") expect(delivered.get(e.id)).toBe(e.payload);
    }
    expect(log).toEqual(before);
  });

  it("dispatch e eventos gerados: tipo v1 sai sem schemaVersion (decisão 2)", () => {
    const e = acc("a1", { balance: 1 });
    const d = appendDispatched([], e, "dev-a");
    expect(d.event.payload).toEqual(e.payload);
    expect(d.event.payload).not.toHaveProperty("schemaVersion");
    const g = appendGenerated([], [e], "dev-a");
    expect(g.added[0]!.payload).not.toHaveProperty("schemaVersion");
  });
});

// ─── Carimbo na gravação local ──────────────────────────────────────────────

describe("Story 3.8 — carimbo no dispatch (registro de teste)", () => {
  it("tipo com versão atual 2 é gravado com schemaVersion: 2; tipo v1 sai sem o campo", () => {
    const account = deepFreeze(acc("a1", { balance: 5, currency: "USD" }));
    const t = deepFreeze(tx("t1", "a1", 1));
    const d1 = appendDispatched([], account, "dev-a", V2_REGISTRY);
    expect(d1.event.payload).toEqual({ id: "a1", name: "a1", type: "wallet", balance: 5, currency: "USD", schemaVersion: 2 });
    expect(d1.events[0]!.payload).toEqual(d1.event.payload);
    const d2 = appendDispatched(d1.events, t, "dev-a", V2_REGISTRY);
    expect(d2.event.payload).not.toHaveProperty("schemaVersion");

    const g = appendGenerated([], [account, t], "dev-a", V2_REGISTRY);
    expect(g.added.map((e) => (e.payload as Record<string, unknown>).schemaVersion)).toEqual([2, undefined]);

    // O gravado é lido de volta pelo replay da v2.
    const r = replayAllEvents(d2.events, V2);
    expect(r.quarantine).toEqual([]);
    expect(r.domain.accounts["a1"]).toMatchObject({ currency: "USD", balance: 4 });
  });

  it("escrita local grava sempre a versão atual, mesmo com versão menor no payload (R1)", () => {
    const e = deepFreeze(acc("a1", { balance: 5, currency: "USD", schemaVersion: 1 }));
    const d = appendDispatched([], e, "dev-a", V2_REGISTRY);
    expect((d.event.payload as Record<string, unknown>).schemaVersion).toBe(2);
    expect((appendGenerated([], [e], "dev-a", V2_REGISTRY).added[0]!.payload as Record<string, unknown>).schemaVersion).toBe(2);
    // O dado v2 (USD) não é reconvertido no replay.
    expect(replayAllEvents(d.events, V2).domain.accounts["a1"]).toMatchObject({ currency: "USD" });
  });

  it("versão maior ou inválida não é tocada pelo carimbo", () => {
    for (const v of [3, "2", 0]) {
      const e = acc("a1", { balance: 5, schemaVersion: v });
      expect(appendDispatched([], e, "dev-a", V2_REGISTRY).event).toBe(e);
    }
  });
});

// ─── profileId ──────────────────────────────────────────────────────────────

describe("Story 3.8 — profileId no envelope e no payload", () => {
  const plain = ev("ACCOUNT_CREATED", { id: "a1", name: "Carteira", type: "wallet", balance: 100 }, "p-acc");
  const withProfile = {
    ...plain,
    profileId: "perfil-1",
    payload: { ...(plain.payload as object), profileId: "perfil-1" },
  } as SyncEvent;

  it("validateEnvelope aceita e reconstrói só as 6 chaves (profileId do envelope é ignorado)", () => {
    const r = validateEnvelope(withProfile);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.event).sort()).toEqual(["deviceId", "id", "payload", "signature", "timestamp", "type"]);
    expect((r.event.payload as Record<string, unknown>).profileId).toBe("perfil-1");
  });

  it("validateLocalEvent aceita", () => {
    expect(validateLocalEvent(withProfile).ok).toBe(true);
  });

  it("replay: mesmo estado que sem profileId (registro real e de teste)", () => {
    for (const opts of [{}, V2]) {
      const a = replayAllEvents([withProfile, tx("p-t", "a1", 10)], opts);
      const b = replayAllEvents([plain, tx("p-t", "a1", 10)], opts);
      expect(a.quarantine).toEqual([]);
      expect(stateOf(a)).toEqual(stateOf(b));
      expect(a.domain.accounts["a1"]).not.toHaveProperty("profileId");
    }
  });
});

// ─── Sync ───────────────────────────────────────────────────────────────────

describe("Story 3.8 — sync com versão futura", () => {
  it("relay entrega schemaVersion: 99 → gravado e na Quarentena no replay; o resto é aplicado", () => {
    const local = [acc("a1", { balance: 100 }, "local-a1")];
    const relayEvt = {
      ...acc("a9", { balance: 9, schemaVersion: 99, profileId: "perfil-1" }, "relay-99"),
      deviceId: "dev-b",
      profileId: "perfil-1",
    };
    const parsed = parseSyncPayloadDetailed(JSON.stringify([relayEvt]));
    expect(parsed.rejected).toEqual([]);
    const { toAppend, discarded } = selectEventsToImport(parsed.events, new Set(local.map((e) => e.id)), () => {});
    expect(discarded).toBe(0);
    expect(toAppend.map((e) => e.id)).toEqual(["relay-99"]);

    const merged = mergeImported(local, toAppend, "dev-a");
    expect(merged.map((e) => e.id)).toContain("relay-99");
    expect((merged.find((e) => e.id === "relay-99")!.payload as Record<string, unknown>).schemaVersion).toBe(99);

    const r = replayAllEvents(merged);
    expect(r.quarantine).toEqual([
      { id: "relay-99", type: "ACCOUNT_CREATED", kind: "future_schema_version", reason: FUTURE_SCHEMA_VERSION_REASON },
    ]);
    expect(Object.keys(r.domain.accounts)).toEqual(["a1"]);
  });
});

// ─── Ordem das checagens (R8) ───────────────────────────────────────────────

describe("Story 3.8 — ordem das checagens no replay", () => {
  it("tipo desconhecido com schemaVersion 99 → unknown_type (filtro de tipo vem antes)", () => {
    const r = replayAllEvents([ev("TIPO_DO_FUTURO", { schemaVersion: 99 }, "u")]);
    expect(r.quarantine).toEqual([{ id: "u", type: "TIPO_DO_FUTURO", kind: "unknown_type", reason: UNKNOWN_TYPE_REASON }]);
  });

  it("horário no futuro com schemaVersion 0 → future_timestamp (horário vem antes)", () => {
    const NOW = T0;
    const future = { ...acc("a1", { balance: 1, schemaVersion: 0 }, "f"), timestamp: NOW + 30 * 24 * 3600_000, deviceId: "dev-b" };
    const r = replayAllEvents([future], { now: NOW, currentDeviceId: "dev-a" });
    expect(r.quarantine.map((q) => [q.id, q.kind])).toEqual([["f", "future_timestamp"]]);
  });
});
