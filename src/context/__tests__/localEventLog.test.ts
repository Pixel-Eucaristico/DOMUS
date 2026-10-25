import { describe, it, expect, vi, afterEach } from "vitest";
import {
  appendDispatched,
  appendGenerated,
  buildExportEvents,
  compareEvents,
  createXpRecoveryEvent,
  isXpRecoveryEvent,
  mergeHydrated,
  mergeImported,
  numericTimestamp,
  XP_RECOVERY_MARKER,
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


describe("Revisão 23/10 (frente C) — helpers usados pelos hooks", () => {
  const ev = (id: string, over: Partial<Record<keyof SyncEvent, unknown>> = {}) =>
    ({ ...base, id, ...over }) as unknown as SyncEvent;
  const view = (list: SyncEvent[]) => list.map((e) => [e.id, e.deviceId]);

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("appendDispatched", () => {
    it("dispatch 'local' com deviceId dev-1 grava dev-1 e fica no mesmo índice depois de recarregar via prepareLocalLog", () => {
      const prev = prepareLocalLog([ev("p0", { deviceId: "dev-0" }), ev("p2", { deviceId: "dev-2" }), ev("p9", { timestamp: T0 + 1 })], "dev-1").events;
      const r = appendDispatched(prev, ev("novo", { deviceId: "local" }), "dev-1");
      expect(r.added).toBe(true);
      expect(r.event.deviceId).toBe("dev-1");
      const index = r.events.findIndex((e) => e.id === "novo");
      expect(index).toBe(1);
      expect(r.events[index]!.deviceId).toBe("dev-1");

      // O banco recebe `r.event`; ao reabrir, o log carregado tem a mesma ordem.
      const stored = [...prev, r.event];
      const reloaded = prepareLocalLog(stored, "dev-1").events;
      expect(reloaded.findIndex((e) => e.id === "novo")).toBe(index);
      expect(view(reloaded)).toEqual(view(r.events));
    });

    it("id repetido: added=false, log igual, nada é alterado (não conta nem sincroniza)", () => {
      const prev = prepareLocalLog([ev("a", { payload: { n: 1 } }), ev("b")], "dev-1").events;
      const snapshot = JSON.stringify(prev);
      const r = appendDispatched(prev, ev("a", { payload: { n: 2 } }), "dev-1");
      expect(r.added).toBe(false);
      expect(r.events).toEqual(prev);
      expect((r.events.find((e) => e.id === "a")!.payload as { n: number }).n).toBe(1);
      expect(JSON.stringify(prev)).toBe(snapshot);
    });

    it("sem id do aparelho fica 'local'; deviceId preenchido não muda", () => {
      expect(appendDispatched([], ev("a", { deviceId: "local" }), null).event.deviceId).toBe("local");
      expect(appendDispatched([], ev("a", { deviceId: "dev-x" }), "dev-1").event.deviceId).toBe("dev-x");
    });

    it("dois dispatch seguidos sobre o resultado anterior (como o ref do hook): o segundo repetido é descartado", () => {
      const first = appendDispatched([], ev("a", { deviceId: "local" }), "dev-1");
      const second = appendDispatched(first.events, ev("a", { deviceId: "local" }), "dev-1");
      expect(first.added).toBe(true);
      expect(second.added).toBe(false);
      expect(second.events).toHaveLength(1);
    });
  });

  describe("mergeHydrated", () => {
    it("hidratação mantém os eventos despachados antes de terminar", () => {
      const dispatchedEarly = appendDispatched([], ev("cedo", { deviceId: "local", timestamp: T0 + 5 }), null).events;
      expect(dispatchedEarly[0]!.deviceId).toBe("local");
      const loaded = prepareLocalLog([ev("l1", { deviceId: "local", timestamp: T0 }), ev("l2", { deviceId: "dev-z", timestamp: T0 + 10 })], "dev-1").events;
      const merged = mergeHydrated(loaded, dispatchedEarly, "dev-1");
      expect(view(merged)).toEqual([
        ["l1", "dev-1"],
        ["cedo", "dev-1"],
        ["l2", "dev-z"],
      ]);
    });

    it("sem despachados devolve o log carregado; id repetido fica o do log carregado", () => {
      const loaded = prepareLocalLog([ev("a", { payload: { n: 1 } })], "dev-1").events;
      expect(mergeHydrated(loaded, [], "dev-1")).toEqual(loaded);
      const merged = mergeHydrated(loaded, [ev("a", { payload: { n: 2 } })], "dev-1");
      expect(merged).toHaveLength(1);
      expect((merged[0]!.payload as { n: number }).n).toBe(1);
    });
  });

  describe("appendGenerated", () => {
    it("carimba, descarta ids repetidos (com o log e entre si) e ordena; added na ordem recebida", () => {
      const prev = prepareLocalLog([ev("x", { timestamp: T0 + 1 })], "dev-1").events;
      const r = appendGenerated(
        prev,
        [ev("c2", { deviceId: "local", timestamp: T0 + 2 }), ev("x"), ev("c1", { deviceId: "", timestamp: T0 }), ev("c2")],
        "dev-1",
      );
      expect(view(r.added)).toEqual([
        ["c2", "dev-1"],
        ["c1", "dev-1"],
      ]);
      expect(r.events.map((e) => e.id)).toEqual(["c1", "x", "c2"]);
      expect(prev).toHaveLength(1);
    });

    it("nada novo: added vazio e log igual", () => {
      const prev = prepareLocalLog([ev("x")], "dev-1").events;
      const r = appendGenerated(prev, [ev("x")], "dev-1");
      expect(r.added).toEqual([]);
      expect(r.events).toEqual(prev);
    });

    it("categorias padrão (createEvent com o mesmo instante) entram na ordem de criação", async () => {
      const { createDefaultCategories } = await import("@packages/domain/src/categories");
      const generated = createDefaultCategories().map((e) => ({ ...e, type: e.type as string, deviceId: "dev-1" }) as SyncEvent);
      const r = appendGenerated([], generated, "dev-1");
      expect(r.events.map((e) => e.id)).toEqual(generated.map((e) => e.id));
    });
  });

  it("mergeImported: mesma junção do importEvents (sem repetidos, ordem total)", () => {
    const prev = prepareLocalLog([ev("a", { timestamp: T0 + 5 })], "dev-1").events;
    const merged = mergeImported(prev, [ev("b", { deviceId: "dev-b", timestamp: T0 }), ev("a", { payload: { n: 9 } })], "dev-1");
    expect(merged.map((e) => e.id)).toEqual(["b", "a"]);
    expect(merged.find((e) => e.id === "a")!.payload).toEqual(base.payload);
    expect(mergeImported(prev, [], "dev-1")).toEqual(prev);
  });

  describe("buildExportEvents (backup manual criptografado, simples e automático)", () => {
    it("troca 'local'/vazio pelo id, deduplica, ordena e não altera a entrada", () => {
      const input = [
        ev("b", { deviceId: "local", timestamp: T0 + 1 }),
        ev("a", { deviceId: "", timestamp: T0 }),
        ev("b", { deviceId: "dev-x", timestamp: T0 + 9 }),
        ev("c", { deviceId: "dev-x", timestamp: T0 - 1 }),
      ];
      const out = buildExportEvents(input, "dev-1");
      expect(out.map((e) => [e.id, e.deviceId, e.timestamp])).toEqual([
        ["c", "dev-x", T0 - 1],
        ["a", "dev-1", T0],
        ["b", "dev-1", T0 + 1],
      ]);
      expect(input[0]!.deviceId).toBe("local");
      expect(input.map((e) => e.id)).toEqual(["b", "a", "b", "c"]);
    });

    it("sem id do aparelho exporta como está (sem carimbo) e pula o que não é objeto", () => {
      const out = buildExportEvents([ev("a", { deviceId: "local" }), null as unknown as SyncEvent], null);
      expect(view(out)).toEqual([["a", "local"]]);
    });
  });

  describe("prepareBackupForStorage com o id do aparelho (restauração)", () => {
    it("'local'/vazio recebe o id; preenchido fica como veio", () => {
      const r = prepareBackupForStorage(
        [ev("a", { deviceId: "local" }), ev("b", { deviceId: " LOCAL " }), ev("c", { deviceId: "" }), ev("d", { deviceId: "dev-x" })],
        "dev-1",
      );
      expect(r.events.map((e) => [e.id, e.deviceId])).toEqual([
        ["a", "dev-1"],
        ["b", "dev-1"],
        ["c", "dev-1"],
        ["d", "dev-x"],
      ]);
    });

    it("banco e memória têm o mesmo deviceId e a mesma ordem", () => {
      const items = [ev("z", { deviceId: "local" }), ev("y", { deviceId: "dev-9" }), ev("x", { deviceId: "dev-0" })];
      const stored = prepareBackupForStorage(items, "dev-5").events;
      const memory = prepareLocalLog(stored, "dev-5").events;
      expect(view(stored)).toEqual(view(memory));
      expect(view(stored)).toEqual([
        ["x", "dev-0"],
        ["z", "dev-5"],
        ["y", "dev-9"],
      ]);
    });
  });

  describe("numericTimestamp: só decimal simples", () => {
    it("decimal (com sinal, fração e espaços nas pontas) vira número", () => {
      expect(numericTimestamp(String(T0))).toBe(T0);
      expect(numericTimestamp(" 42 ")).toBe(42);
      expect(numericTimestamp("-5")).toBe(-5);
      expect(numericTimestamp("1.5")).toBe(1.5);
    });

    it("hexadecimal, binário, octal, expoente e afins ficam inválidos", () => {
      for (const v of ["0x1A", "0X1a", "0b11", "0o7", "1e3", "1E3", "Infinity", "-Infinity", "NaN", "+5", ".5", "5.", "1_000", "", "  ", "abc"]) {
        expect(numericTimestamp(v), v).toBeUndefined();
      }
      for (const v of [5, null, undefined, {}, true]) expect(numericTimestamp(v)).toBeUndefined();
    });

    it("hidratação e restauração mantêm o texto não decimal como veio", () => {
      const items = [ev("a", { timestamp: "0x1A" }), ev("b", { timestamp: "0b11" }), ev("c", { timestamp: "1e3" }), ev("d", { timestamp: "12" })];
      const memory = normalizeStoredEvents(items, "dev-1").events;
      expect(memory.map((e) => e.timestamp)).toEqual(["0x1A", "0b11", "1e3", 12]);
      const stored = prepareBackupForStorage(items).events;
      expect(Object.fromEntries(stored.map((e) => [e.id, e.timestamp]))).toEqual({ a: "0x1A", b: "0b11", c: "1e3", d: 12 });
    });
  });

  describe("recuperação de XP", () => {
    it("createEvent: id e timestamp do mesmo instante, marca no payload, sem prefixo", () => {
      vi.useFakeTimers();
      vi.setSystemTime(T0);
      const e = createXpRecoveryEvent(45, "dev-1");
      expect(e.timestamp).toBe(T0);
      expect(e.id.startsWith(T0.toString(36))).toBe(true);
      expect(e.id.startsWith("xp-recovery-")).toBe(false);
      expect(e.deviceId).toBe("dev-1");
      expect(e.type).toBe("XP_GAINED");
      expect(e.payload).toMatchObject({ amount: 45, source: "streak_bonus", recovery: XP_RECOVERY_MARKER });

      const later = createXpRecoveryEvent(45, null);
      expect(later.deviceId).toBe("local");
      expect(compareEvents(e, { ...later, deviceId: "dev-1" })).toBeLessThan(0);
    });

    it("detecção: ids antigos com prefixo e os novos com a marca; o resto não", () => {
      expect(isXpRecoveryEvent({ id: "xp-recovery-abc", payload: {} })).toBe(true);
      expect(isXpRecoveryEvent(createXpRecoveryEvent(30, "dev-1"))).toBe(true);
      expect(isXpRecoveryEvent({ id: "abc", payload: { recovery: "outra" } })).toBe(false);
      expect(isXpRecoveryEvent({ id: "abc", payload: null })).toBe(false);
      for (const v of [null, undefined, 3, "xp-recovery-1"]) expect(isXpRecoveryEvent(v)).toBe(false);
    });

    it("o replay aplica o XP do evento novo (a marca não atrapalha a validação)", () => {
      const e = createXpRecoveryEvent(45, "dev-1");
      const r = replayAllEvents([e]);
      expect(r.quarantine).toEqual([]);
      expect(r.gamification.totalXp).toBe(45);
    });
  });
});
