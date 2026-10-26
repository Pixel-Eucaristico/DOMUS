import { describe, it, expect, vi } from "vitest";
import {
  parseSyncPayloadDetailed,
  filterImportableEvents,
  selectEventsToImport,
  createWarnOnce,
  describePullDiscards,
  advanceRelayCursor,
  subscriptionSince,
  parseRelayCursor,
  loadRelayCursor,
  RELAY_CURSOR_KEY,
  LEGACY_LAST_PULL_TS_KEY,
  RELAY_CURSOR_OVERLAP_SEC,
} from "../syncPayload";

const valid = (over: Record<string, unknown> = {}) => ({
  id: "evt-1",
  type: "TRANSACTION_CREATED",
  payload: { amount: 1000, description: "segredo" },
  timestamp: 1_700_000_000_000,
  deviceId: "dev-a",
  signature: "sig",
  ...over,
});

describe("parseSyncPayloadDetailed", () => {
  it("evento único válido", () => {
    const r = parseSyncPayloadDetailed(JSON.stringify(valid()));
    expect(r.events).toEqual([valid()]);
    expect(r.rejected).toEqual([]);
    expect(r.malformedJson).toBe(false);
  });

  it("lote misto: 3 válidos + 2 ruins → 3 seguem", () => {
    const batch = [
      valid({ id: "a" }),
      valid({ id: "b", payload: null }),
      valid({ id: "c" }),
      valid({ id: "d", timestamp: "ontem" }),
      valid({ id: "e" }),
    ];
    const r = parseSyncPayloadDetailed(JSON.stringify(batch));
    expect(r.events.map((e) => e.id)).toEqual(["a", "c", "e"]);
    expect(r.rejected).toHaveLength(2);
  });

  it("type desconhecido bem formado é aceito", () => {
    const r = parseSyncPayloadDetailed(JSON.stringify([valid({ type: "FUTURE_EVENT_X" })]));
    expect(r.events[0]?.type).toBe("FUTURE_EVENT_X");
  });

  it("signature ausente vira string vazia", () => {
    const { signature: _s, ...noSig } = valid();
    const r = parseSyncPayloadDetailed(JSON.stringify(noSig));
    expect(r.events[0]?.signature).toBe("");
  });

  it("JSON malformado não lança e é ignorado; os demais eventos do relay seguem", () => {
    const relayContents = [
      JSON.stringify([valid({ id: "a" })]),
      "{isto não é json",
      JSON.stringify(valid({ id: "b" })),
    ];
    const results = relayContents.map((c) => parseSyncPayloadDetailed(c));
    expect(results[1]).toEqual({ events: [], rejected: [], malformedJson: true });
    expect(results.flatMap((r) => r.events).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("JSON válido que não é objeto é descartado sem lançar", () => {
    for (const c of ["null", "42", '"x"', "[null, 1]"]) {
      const r = parseSyncPayloadDetailed(c);
      expect(r.events).toEqual([]);
      expect(r.malformedJson).toBe(false);
    }
  });
});

describe("filterImportableEvents", () => {
  it("revalida antes de gravar, conta descartes e loga sem payload", () => {
    const warn = vi.fn();
    const events = [
      valid({ id: "a" }),
      valid({ id: "b", payload: null }),
      valid({ id: "c", type: "FUTURE_EVENT_X" }),
      { ...valid({ id: "d" }), deviceId: undefined },
      valid({ id: "e" }),
    ];
    const { valid: ok, discarded } = filterImportableEvents(events, warn);
    expect(ok.map((e) => e.id)).toEqual(["a", "c", "e"]);
    expect(discarded).toBe(2);
    const logged = warn.mock.calls.map((c) => c[0] as string).join("\n");
    expect(logged).toContain("id=b type=TRANSACTION_CREATED reason=invalid_payload");
    expect(logged).toContain("id=d type=TRANSACTION_CREATED reason=invalid_device_id");
    expect(logged).not.toContain("segredo");
    expect(logged).not.toContain("1000");
  });

  it("não loga nada quando todos são válidos", () => {
    const warn = vi.fn();
    const { discarded } = filterImportableEvents([valid()], warn);
    expect(discarded).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("selectEventsToImport (laço do importEvents)", () => {
  it("lote misto + repetidos → exatamente os eventos gravados, na ordem, e a contagem", () => {
    const warn = vi.fn();
    const events = [
      valid({ id: "a" }),
      valid({ id: "old" }), // já existe no log local
      valid({ id: "b", payload: null }), // malformado
      valid({ id: "c", type: "FUTURE_EVENT_X" }),
      valid({ id: "a", timestamp: 1_800_000_000_000 }), // repetido no lote
      valid({ id: "d", timestamp: 1e300 }), // malformado
      valid({ id: "e" }),
    ];
    const existing = new Set(["old"]);
    const r = selectEventsToImport(events, existing, warn);
    expect(r.toAppend.map((e) => e.id)).toEqual(["a", "c", "e"]);
    expect(r.toAppend[0]?.timestamp).toBe(1_700_000_000_000); // primeiro "a" vence
    expect(r.toAppend).toHaveLength(3);
    expect(r.discarded).toBe(2);
    expect(r.duplicates).toBe(2);
    expect(existing).toEqual(new Set(["old"])); // não muta
  });

  it("lote vazio", () => {
    expect(selectEventsToImport([], new Set(), vi.fn())).toEqual({ toAppend: [], discarded: 0, duplicates: 0 });
  });
});

describe("createWarnOnce", () => {
  it("avisa uma vez por chave e esquece as mais antigas além do limite", () => {
    const once = createWarnOnce(2);
    expect(once("x")).toBe(true);
    expect(once("x")).toBe(false);
    expect(once("y")).toBe(true);
    expect(once("z")).toBe(true); // "x" sai
    expect(once("y")).toBe(false);
    expect(once("x")).toBe(true);
  });
});

describe("describePullDiscards", () => {
  it("resume em uma linha ou devolve null", () => {
    expect(describePullDiscards({ discarded: 0, total: 5, malformedRelayEvents: 0 })).toBeNull();
    expect(describePullDiscards({ discarded: 2, total: 5, malformedRelayEvents: 0 })).toBe(
      "[NostrSync] Pull: 2 descartados de 5.",
    );
    expect(describePullDiscards({ discarded: 0, total: 3, malformedRelayEvents: 1 })).toBe(
      "[NostrSync] Pull: 0 descartados de 3; 1 evento(s) do relay com JSON malformado.",
    );
  });
});

describe("Story 3.6: cursor dos relays", () => {
  const T = 1_792_627_200; // segundos (created_at)
  const nowMs = T * 1000;

  it("a folga é uma constante única de 60 s", () => {
    expect(RELAY_CURSOR_OVERLAP_SEC).toBe(60);
  });

  it("evento novo e depois um antigo (publicado depois): cursor = T+10", () => {
    // E1: timestamp hoje, created_at T; E0: timestamp de ontem, created_at T+10.
    let c = advanceRelayCursor(null, [T]);
    c = advanceRelayCursor(c, [T + 10]);
    expect(c).toBe(T + 10);
  });

  it("nunca anda para trás", () => {
    expect(advanceRelayCursor(T, [T - 1000])).toBe(T);
    expect(advanceRelayCursor(T, [])).toBe(T);
    expect(advanceRelayCursor(T, [T - 5, T + 3, T + 1])).toBe(T + 3);
  });

  it("ignora não finitos, não numéricos e ≤ 0; arredonda para baixo", () => {
    expect(advanceRelayCursor(null, [Number.NaN, Infinity, -Infinity, "123", null, undefined, -5, 0])).toBeNull();
    expect(advanceRelayCursor(T, [Infinity, Number.NaN])).toBe(T);
    expect(advanceRelayCursor(null, [T + 0.9])).toBe(T);
    expect(advanceRelayCursor(Number.NaN, [T])).toBe(T);
  });

  it("sem cursor: assinatura em agora − 60 s", () => {
    expect(subscriptionSince(null, T)).toBe(T - 60);
    expect(subscriptionSince(0, T)).toBe(T - 60);
    expect(subscriptionSince(Number.NaN, T)).toBe(T - 60);
  });

  it("com cursor: cursor − folga", () => {
    expect(subscriptionSince(T - 3600, T)).toBe(T - 3600 - RELAY_CURSOR_OVERLAP_SEC);
  });

  it("cursor à frente do relógio local não leva o since para o futuro", () => {
    expect(subscriptionSince(T + 25 * 3600, T)).toBe(T - 60);
  });

  it("parseRelayCursor aceita só inteiro positivo", () => {
    expect(parseRelayCursor(String(T))).toBe(T);
    expect(parseRelayCursor(null)).toBeNull();
    expect(parseRelayCursor("")).toBeNull();
    expect(parseRelayCursor("0")).toBeNull();
    expect(parseRelayCursor("-1")).toBeNull();
    expect(parseRelayCursor("12.5")).toBeNull();
    expect(parseRelayCursor("abc")).toBeNull();
    expect(parseRelayCursor("1e3")).toBeNull();
    expect(parseRelayCursor("99999999999999999999")).toBeNull();
  });

  const memStorage = (init: Record<string, string>) => {
    const data = new Map(Object.entries(init));
    return {
      data,
      getItem: vi.fn(async (k: string) => data.get(k) ?? null),
      removeItem: vi.fn(async (k: string) => {
        data.delete(k);
      }),
    };
  };

  it("cursor antigo salvo: ignorado e apagado; sem chave nova → sem cursor", async () => {
    const st = memStorage({ [LEGACY_LAST_PULL_TS_KEY]: String(nowMs + 25 * 3600 * 1000) });
    expect(LEGACY_LAST_PULL_TS_KEY).toBe("domus_nostr_last_pull_ts");
    expect(await loadRelayCursor(st)).toBeNull();
    expect(st.data.has(LEGACY_LAST_PULL_TS_KEY)).toBe(false);
  });

  it("chave nova é lida; a antiga apagada mesmo assim", async () => {
    const st = memStorage({ [RELAY_CURSOR_KEY]: String(T), [LEGACY_LAST_PULL_TS_KEY]: "123" });
    expect(await loadRelayCursor(st)).toBe(T);
    expect(st.data.has(LEGACY_LAST_PULL_TS_KEY)).toBe(false);
    expect(st.data.get(RELAY_CURSOR_KEY)).toBe(String(T));
  });

  it("falha do storage vira sem cursor, sem lançar", async () => {
    const st = {
      getItem: async () => {
        throw new Error("x");
      },
      removeItem: async () => {
        throw new Error("y");
      },
    };
    expect(await loadRelayCursor(st)).toBeNull();
  });
});
