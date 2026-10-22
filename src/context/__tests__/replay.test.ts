import { describe, it, expect } from "vitest";
import { replayAllEvents, UNKNOWN_TYPE_REASON, KNOWN_EVENT_TYPES } from "../replay";
import { DEMO_SEED_EVENTS } from "@/src/constants/mockDemoEvents";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { EVENT_TYPES, type DomainEvent } from "@packages/events/src/types";
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
import { calculate503020 } from "@packages/domain/src/transactions";
import { getLevelInfo } from "@packages/gamification/src/levelEngine";
import { createAccountEvent } from "@packages/domain/src/accounts";
import { createTransactionEvent } from "@packages/domain/src/transactions";
import { createDefaultCategories } from "@packages/domain/src/categories";
import { diagnosticString } from "@packages/events/src/validateEnvelope";
import { PAYLOAD_SPECS, validatePayload } from "../replayValidation";
import { sortEvents } from "@packages/storage/src/eventOrder";

// ─── Implementação anterior (AppStateProvider antes da Story 3.2), para comparação ──
function legacyReplay(events: SyncEvent[]) {
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

function stateOf(result: ReturnType<typeof replayAllEvents>) {
  const { quarantine: _q, ...state } = result;
  return state;
}

// Timestamps realistas em ms (2026-10-22).
const T0 = 1_792_627_200_000;
let seq = 0;
function ev(type: string, payload: unknown, id = `e-${++seq}`): SyncEvent {
  return { id, type, payload: payload as object, timestamp: T0 + seq * 1000, deviceId: "dev-a", signature: "" };
}

const account = ev("ACCOUNT_CREATED", { id: "acc-1", name: "Carteira", type: "wallet", balance: 1000, color: "#000" }, "acc");
const category = ev("CATEGORY_CREATED", { id: "alimentacao", name: "Alimentação", group: "needs" }, "cat");
const income = ev("TRANSACTION_CREATED", {
  id: "tx-1", accountId: "acc-1", type: "income", amount: 500, description: "Salário", categoryId: "alimentacao", date: "2026-10-01",
}, "tx1");
const expense = ev("TRANSACTION_CREATED", {
  id: "tx-2", accountId: "acc-1", type: "expense", amount: 120, description: "Mercado", categoryId: "alimentacao", date: "2026-10-02",
}, "tx2");
const xp = ev("XP_GAINED", { amount: 15, source: "transaction", description: "Transação" }, "xp1");
const listCreated = ev("WISHLIST_LIST_CREATED", { id: "list-1", name: "Desejos", createdAt: T0 }, "wl1");
const archetype = ev("ARCHETYPE_UPDATED", {
  previousArchetype: "EXPLORER", newArchetype: "PLANNER", scores: {}, reason: "teste",
}, "arch");

const healthy = [account, category, income, xp, listCreated, archetype, expense];

describe("replayAllEvents — Quarentena (Story 3.2)", () => {
  it("log saudável: mesmo estado da implementação anterior e Quarentena vazia", () => {
    const result = replayAllEvents(healthy);
    expect(result.quarantine).toEqual([]);
    expect(stateOf(result)).toEqual(legacyReplay(healthy));
    expect(result.domain.accounts["acc-1"].balance).toBe(1380);
    expect(result.gamification.totalXp).toBe(legacyReplay(healthy).gamification.totalXp);
  });

  it("tipo conhecido sem reducer neste replay (ARCHETYPE_UPDATED) é ignorado, sem Quarentena", () => {
    expect(KNOWN_EVENT_TYPES.has("ARCHETYPE_UPDATED")).toBe(true);
    const result = replayAllEvents([archetype]);
    expect(result.quarantine).toEqual([]);
  });

  it("payload nulo entre válidos: app abre, evento na Quarentena e estado igual ao do log sem ele", () => {
    const bad = ev("TRANSACTION_CREATED", null, "tx-null");
    const log = [account, category, bad, income, expense];
    const result = replayAllEvents(log);
    expect(stateOf(result)).toEqual(stateOf(replayAllEvents([account, category, income, expense])));
    expect(result.quarantine).toEqual([
      { id: "tx-null", type: "TRANSACTION_CREATED", kind: "invalid_envelope", reason: expect.stringContaining("payload") },
    ]);
    // A implementação anterior derrubava o app com esse log.
    expect(() => legacyReplay(log)).toThrow();
  });

  it("payload sem campo que o reducer lê: Quarentena 'invalid_payload' nomeando o campo, nunca o valor", () => {
    const secret = "segredo-do-payload";
    const bad = ev("WISHLIST_ITEM_ADDED", { nota: secret }, "wl-bad");
    const log = [account, listCreated, bad, income];
    const result = replayAllEvents(log);
    expect(stateOf(result)).toEqual(stateOf(replayAllEvents([account, listCreated, income])));
    expect(result.quarantine).toEqual([
      {
        id: "wl-bad",
        type: "WISHLIST_ITEM_ADDED",
        kind: "invalid_payload",
        reason: 'payload inválido: campo "item" ausente ou com tipo errado',
      },
    ]);
    expect(result.quarantine[0].reason).not.toContain(secret);
  });

  it("tipo desconhecido: Quarentena 'tipo desconhecido' e o log não é alterado", () => {
    const future = ev("FUTURE_EVENT_X", { a: 1 }, "future-1");
    const log = [account, future, income];
    const snapshot = JSON.parse(JSON.stringify(log));
    const result = replayAllEvents(log);
    expect(result.quarantine).toEqual([
      { id: "future-1", type: "FUTURE_EVENT_X", kind: "unknown_type", reason: UNKNOWN_TYPE_REASON },
    ]);
    expect(log).toEqual(snapshot);
    expect(log).toContain(future);
    expect(stateOf(result)).toEqual(stateOf(replayAllEvents([account, income])));
  });

  it("vários defeituosos espalhados: os 3 na Quarentena, na ordem do log", () => {
    const b1 = ev("TRANSACTION_CREATED", null, "bad-1");
    const b2 = ev("UNKNOWN_Y", {}, "bad-2");
    const b3 = ev("WISHLIST_ITEM_ADDED", {}, "bad-3");
    const log = [account, b1, category, income, b2, listCreated, xp, b3, expense];
    const result = replayAllEvents(log);
    expect(result.quarantine.map((q) => [q.id, q.kind])).toEqual([
      ["bad-1", "invalid_envelope"],
      ["bad-2", "unknown_type"],
      ["bad-3", "invalid_payload"],
    ]);
    expect(stateOf(result)).toEqual(legacyReplay([account, category, income, listCreated, xp, expense]));
  });

  it("envelope inválido sem id/tipo legíveis usa '?'", () => {
    const result = replayAllEvents([null as unknown as SyncEvent, account]);
    expect(result.quarantine).toEqual([
      { id: "?", type: "?", kind: "invalid_envelope", reason: expect.stringContaining("não é um objeto") },
    ]);
    expect(result.domain.accounts["acc-1"]).toBeDefined();
  });

  it("modo demo: mesmo replay que a implementação anterior, Quarentena vazia", () => {
    const result = replayAllEvents(DEMO_SEED_EVENTS);
    expect(result.quarantine).toEqual([]);
    expect(stateOf(result)).toEqual(legacyReplay(DEMO_SEED_EVENTS));
    expect(Object.keys(result.domain.transactions).length).toBeGreaterThan(0);
  });

  it("modo demo com evento defeituoso: mesmo isolamento", () => {
    const bad = ev("TRANSACTION_CREATED", null, "demo-bad");
    const log = [...DEMO_SEED_EVENTS.slice(0, 5), bad, ...DEMO_SEED_EVENTS.slice(5)];
    const result = replayAllEvents(log);
    expect(result.quarantine.map((q) => q.id)).toEqual(["demo-bad"]);
    expect(stateOf(result)).toEqual(legacyReplay(DEMO_SEED_EVENTS));
  });
});

// ─── Revisão da Story 3.2 ────────────────────────────────────────────────────

/** O que o AppStateProvider deriva do estado (budget, nível, saldo total). */
function derive(result: ReturnType<typeof replayAllEvents>) {
  const budget = calculate503020(
    Object.values(result.domain.transactions),
    result.domain.categories,
    9, // outubro
    2026,
  );
  const level = getLevelInfo(result.gamification.totalXp);
  const totalBalance = Object.values(result.domain.accounts).reduce(
    (sum: number, a) => sum + (a.type !== "credit_card" ? a.balance : 0),
    0,
  );
  return { budget, level, totalBalance };
}

function expectAllFinite(value: unknown, path = "$"): void {
  if (typeof value === "number") {
    expect(Number.isFinite(value), `${path} não é finito`).toBe(true);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => expectAllFinite(v, `${path}[${i}]`));
  } else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) expectAllFinite(v, `${path}.${k}`);
  }
}

describe("replayAllEvents — conferência local tolerante", () => {
  const at = (timestamp: unknown, deviceId: unknown = "dev-a"): SyncEvent =>
    ({
      id: `acc-ts-${String(timestamp)}`,
      type: "ACCOUNT_CREATED",
      payload: { id: `acc-${String(timestamp)}`, name: "Conta", type: "wallet", balance: 10 },
      timestamp,
      deviceId,
      signature: "",
    }) as unknown as SyncEvent;

  it("relógio antes de 2020 e timestamp em segundos não vão para a Quarentena", () => {
    const result = replayAllEvents([at(1_546_300_800_000), at(5e6)]);
    expect(result.quarantine).toEqual([]);
    // Story 3.4: o replay aplica na ordem total — 5e6 vem antes de 1.546.300.800.000.
    expect(Object.keys(result.domain.accounts)).toEqual(["acc-5000000", "acc-1546300800000"]);
  });

  it("timestamp em texto é aplicado e normalizado para número", () => {
    const xpEvt = { ...xp, id: "xp-str", timestamp: String(T0) } as unknown as SyncEvent;
    const result = replayAllEvents([at(String(T0)), xpEvt]);
    expect(result.quarantine).toEqual([]);
    expect(result.gamification.xpHistory[0].timestamp).toBe(T0);
  });

  it("timestamp não finito e deviceId vazio não recusam o evento", () => {
    const result = replayAllEvents([at(Number.NaN, ""), at("abc", "   "), at(undefined, undefined)]);
    expect(result.quarantine).toEqual([]);
    expect(Object.keys(result.domain.accounts)).toHaveLength(3);
  });

  it("payload em texto JSON é aplicado; texto que não é JSON vai para a Quarentena", () => {
    const asText = { ...account, id: "acc-text", payload: JSON.stringify(account.payload) } as unknown as SyncEvent;
    const broken = { ...account, id: "acc-broken", payload: "{não é json" } as unknown as SyncEvent;
    const result = replayAllEvents([asText, broken]);
    expect(result.domain.accounts["acc-1"]).toBeDefined();
    expect(result.quarantine.map((q) => [q.id, q.kind])).toEqual([["acc-broken", "invalid_envelope"]]);
  });

  it("eventos criados com createEvent (deviceId 'local'): Quarentena vazia e mesmo estado do replay anterior", () => {
    const acc = createAccountEvent({ name: "Carteira", type: "wallet", balance: 100 });
    const card = createAccountEvent({ name: "Cartão", type: "credit_card", creditLimit: 2000 });
    const cats = createDefaultCategories();
    const txs = [
      ...createTransactionEvent({ accountId: acc.payload.id, type: "income", amount: 3000, categoryId: "outros", date: "2026-10-01" }),
      ...createTransactionEvent({ accountId: acc.payload.id, type: "expense", amount: 250, categoryId: "alimentacao", date: "2026-10-02" }),
      ...createTransactionEvent({ accountId: card.payload.id, type: "expense", amount: 900, categoryId: "lazer", date: "2026-10-03", installments: 3 }),
    ];
    const log = [acc, card, ...cats, ...txs].map((e) => ({ ...e, signature: e.signature ?? "" })) as unknown as SyncEvent[];
    expect(log.every((e) => e.deviceId === "local" || e.deviceId === "system")).toBe(true);
    expect(log.filter((e) => e.deviceId === "local").length).toBeGreaterThan(0);
    const result = replayAllEvents(log);
    expect(result.quarantine).toEqual([]);
    // Story 3.4: o replay ordena pela ordem total; o anterior aplicava o array como veio.
    expect(stateOf(result)).toEqual(legacyReplay(sortEvents(log)));
  });
});

describe("replayAllEvents — payload por tipo", () => {
  /** Tipos que não leem nada do payload: `{}` é um evento válido. */
  const NO_FIELD_TYPES = new Set(["ONBOARDING_FINISHED", "SEASON_ENDED", "ARCHETYPE_UPDATED"]);

  it("cobre os 37 tipos conhecidos", () => {
    expect(KNOWN_EVENT_TYPES.size).toBe(37);
    for (const t of KNOWN_EVENT_TYPES) {
      expect(NO_FIELD_TYPES.has(t) || PAYLOAD_SPECS[t] !== undefined, t).toBe(true);
    }
  });

  for (const t of [...KNOWN_EVENT_TYPES].sort()) {
    it(`${t} com payload {}: Quarentena ou inofensivo, sem NaN e com derivações funcionando`, () => {
      const empty = ev(t, {}, `empty-${t}`);
      const result = replayAllEvents([...healthy, empty]);
      if (NO_FIELD_TYPES.has(t)) {
        expect(result.quarantine).toEqual([]);
      } else {
        expect(result.quarantine).toEqual([
          { id: `empty-${t}`, type: t, kind: "invalid_payload", reason: expect.stringMatching(/^payload inválido: campo "/) },
        ]);
        expect(stateOf(result)).toEqual(stateOf(replayAllEvents(healthy)));
      }
      expectAllFinite(result.domain);
      expectAllFinite(result.gamification);
      const derived = derive(result);
      expectAllFinite(derived);
    });
  }

  it("tipo primitivo errado vai para a Quarentena nomeando o campo, nunca o valor", () => {
    const badAmount = ev("TRANSACTION_CREATED", {
      id: "tx-x", accountId: "acc-1", type: "income", amount: "abc-segredo", date: "2026-10-05",
    }, "tx-bad");
    const badXp = ev("XP_GAINED", { amount: "5" }, "xp-bad");
    const nanXp = ev("XP_GAINED", { amount: Number.NaN }, "xp-nan");
    const result = replayAllEvents([account, badAmount, badXp, nanXp]);
    expect(result.quarantine.map((q) => [q.id, q.reason])).toEqual([
      ["tx-bad", 'payload inválido: campo "amount" ausente ou com tipo errado'],
      ["xp-bad", 'payload inválido: campo "amount" ausente ou com tipo errado'],
      ["xp-nan", 'payload inválido: campo "amount" ausente ou com tipo errado'],
    ]);
    expect(result.domain.accounts["acc-1"].balance).toBe(1000);
    expect(result.gamification.totalXp).toBe(0);
    expect(JSON.stringify(result.quarantine)).not.toContain("segredo");
  });

  it("campos aninhados: caminho do campo no motivo", () => {
    const itemNoList = ev("WISHLIST_ITEM_ADDED", { item: { id: "i1", urgencyLevel: "alta", orderIndex: -1 } }, "wi");
    const badItems = ev("TRANSACTION_CREATED", {
      id: "tx-i", accountId: "acc-1", type: "expense", amount: 10, date: "2026-10-05", items: [{ amount: "x" }],
    }, "ti");
    const result = replayAllEvents([itemNoList, badItems]);
    // Story 3.4: mesmo horário e aparelho — o id desempata ("ti" antes de "wi").
    expect(result.quarantine.map((q) => q.reason)).toEqual([
      'payload inválido: campo "items[0].amount" ausente ou com tipo errado',
      'payload inválido: campo "item.listId" ausente ou com tipo errado',
    ]);
  });

  it("validatePayload aceita os payloads do demo e do log saudável", () => {
    for (const e of [...DEMO_SEED_EVENTS, ...healthy]) {
      expect(validatePayload(e.type, e.payload as Record<string, unknown>), e.id).toBeNull();
    }
  });
});

describe("replayAllEvents — texto do motivo", () => {
  it("tipo desconhecido de 200 caracteres com \\n: cortado em 64 code points com '…' e escapado", () => {
    const longType = "\n" + "😀".repeat(199);
    const result = replayAllEvents([ev(longType, {}, "long-type")]);
    const [entry] = result.quarantine;
    expect(entry.kind).toBe("unknown_type");
    expect(entry.reason).toBe(UNKNOWN_TYPE_REASON);
    expect(entry.type).toBe("\\n" + "😀".repeat(63) + "…");
    expect(entry.type).not.toContain("\n");
    // mesmo escape do diagnóstico da Story 3.1
    expect(entry.type).toBe(diagnosticString(longType));
  });

  it("id com quebra de linha em envelope inválido sai escapado", () => {
    const result = replayAllEvents([{ id: "a\nb", type: "X", payload: null } as unknown as SyncEvent]);
    expect(result.quarantine[0]).toMatchObject({ id: "a\\nb", type: "X", kind: "invalid_envelope" });
  });
});
