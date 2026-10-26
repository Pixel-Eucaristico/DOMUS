import { describe, it, expect, vi } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { createSyncCoordinator, LIVE_MAX_ATTEMPTS, type CoordinatorPullResult } from "../syncCoordinator";
import { LEGACY_LAST_PULL_TS_KEY, RELAY_CURSOR_KEY, selectEventsToImport } from "../syncPayload";

const T = 1_792_627_200; // segundos (created_at)
const nowMs = T * 1000;

const ev = (id: string, timestamp = nowMs): SyncEvent =>
  ({ id, type: "TRANSACTION_CREATED", payload: { amount: 1 }, timestamp, deviceId: "dev-a", signature: "" }) as SyncEvent;

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function memStorage(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: vi.fn(async (k: string) => data.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      data.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      data.delete(k);
    }),
  };
}

/** Log em memória com o mesmo dedupe por id do `importEvents` real. */
function memLog() {
  const log: SyncEvent[] = [];
  const importEvents = vi.fn(async (events: SyncEvent[]) => {
    const { toAppend } = selectEventsToImport(events, new Set(log.map((e) => e.id)), () => {});
    log.push(...toAppend);
    return toAppend.length;
  });
  return { log, importEvents };
}

function setup(opts: {
  pull?: (req: string) => Promise<CoordinatorPullResult>;
  importEvents?: (events: SyncEvent[]) => Promise<number>;
  storage?: ReturnType<typeof memStorage>;
} = {}) {
  const storage = opts.storage ?? memStorage();
  const mem = memLog();
  const warn = vi.fn();
  const importEvents = opts.importEvents ?? mem.importEvents;
  const c = createSyncCoordinator<string>({
    storage,
    importEvents,
    pull: opts.pull ?? (async () => ({ events: [], maxCreatedAt: null })),
    now: () => nowMs,
    warn,
  });
  return { c, storage, log: mem.log, importEvents, warn };
}

describe("createSyncCoordinator: cursor", () => {
  it("avança pelo created_at mesmo sem nada novo para importar, e grava", async () => {
    const createdAts = [T, T + 30];
    const { c, storage } = setup({
      pull: async () => ({ events: [ev("a")], maxCreatedAt: createdAts.shift() ?? null }),
    });
    expect(await c.runPull("x")).toBe(1);
    expect(c.getCursor()).toBe(T);
    // O mesmo lote republicado (created_at maior): nada novo, mas o cursor anda.
    expect(await c.runPull("x")).toBe(0);
    expect(c.getCursor()).toBe(T + 30);
    expect(storage.data.get(RELAY_CURSOR_KEY)).toBe(String(T + 30));
  });

  it("evento novo no pull e depois um antigo ao vivo (publicado depois): os dois importados, cursor = T+10", async () => {
    const { c, log } = setup({ pull: async () => ({ events: [ev("E1", nowMs)], maxCreatedAt: T }) });
    await c.runPull("x");
    c.enqueueLive(ev("E0", nowMs - 24 * 3600 * 1000), T + 10);
    await c.idle();
    expect(log.map((e) => e.id)).toEqual(["E1", "E0"]);
    expect(c.getCursor()).toBe(T + 10);
  });

  it("evento com timestamp +25 h: cursor = created_at e a assinatura segue em agora − 60", async () => {
    const future = ev("F", nowMs + 25 * 3600 * 1000);
    const { c, log } = setup({ pull: async () => ({ events: [future], maxCreatedAt: T }) });
    await c.runPull("x");
    expect(log).toEqual([future]);
    expect(c.getCursor()).toBe(T);
    expect(c.liveSince()).toBe(T - 60);
    // Um evento publicado logo depois (created_at T+1) está dentro da janela e é importado.
    c.enqueueLive(ev("depois"), T + 1);
    await c.idle();
    expect(log.map((e) => e.id)).toEqual(["F", "depois"]);
    expect(c.getCursor()).toBe(T + 1);
  });

  it("releitura na sobreposição: o evento volta pela assinatura e é ignorado pelo id", async () => {
    const { c, log, importEvents } = setup({ pull: async () => ({ events: [ev("a"), ev("b")], maxCreatedAt: T }) });
    await c.runPull("x");
    // O since da assinatura relê os últimos 60 s: "b" (created_at T − 30) volta.
    expect(c.liveSince()).toBeLessThanOrEqual(T - 30);
    c.enqueueLive(ev("b"), T - 30);
    await c.idle();
    expect(log.map((e) => e.id)).toEqual(["a", "b"]);
    expect(await vi.mocked(importEvents).mock.results.at(-1)?.value).toBe(0);
    expect(c.getCursor()).toBe(T); // não anda para trás
  });

  it("sem cursor salvo: assinatura em agora − 60 s", async () => {
    const { c } = setup();
    expect(await c.load()).toBeNull();
    expect(c.liveSince()).toBe(T - 60);
  });

  it("cursor antigo salvo: ignorado e apagado; o novo é lido", async () => {
    const storage = memStorage({ [LEGACY_LAST_PULL_TS_KEY]: String(nowMs + 25 * 3600 * 1000) });
    const a = setup({ storage });
    expect(await a.c.load()).toBeNull();
    expect(storage.data.has(LEGACY_LAST_PULL_TS_KEY)).toBe(false);

    storage.data.set(RELAY_CURSOR_KEY, String(T));
    storage.data.set(LEGACY_LAST_PULL_TS_KEY, "123");
    const b = setup({ storage });
    expect(await b.c.load()).toBe(T);
    expect(b.c.liveSince()).toBe(T - 60);
    expect(storage.data.has(LEGACY_LAST_PULL_TS_KEY)).toBe(false);
  });
});

describe("createSyncCoordinator: fila e mutex", () => {
  it("evento ao vivo durante a importação do pull espera e é importado depois", async () => {
    const gate = deferred<number>();
    const calls: string[][] = [];
    const importEvents = vi.fn(async (events: SyncEvent[]) => {
      calls.push(events.map((e) => e.id));
      if (events[0].id === "p") return gate.promise;
      return events.length;
    });
    const { c } = setup({ importEvents, pull: async () => ({ events: [ev("p")], maxCreatedAt: T }) });
    const pulling = c.runPull("x");
    await flush();
    expect(c.isImporting()).toBe(true);
    c.enqueueLive(ev("L"), T + 1);
    await flush();
    expect(calls).toEqual([["p"]]); // L ainda não entrou
    gate.resolve(1);
    await pulling;
    await c.idle();
    expect(calls).toEqual([["p"], ["L"]]);
    expect(c.isImporting()).toBe(false);
    expect(c.getCursor()).toBe(T + 1);
  });

  it("a fila drena depois de um pull cuja importação lança", async () => {
    const gate = deferred<number>();
    const calls: string[] = [];
    const importEvents = vi.fn(async (events: SyncEvent[]) => {
      calls.push(events[0].id);
      if (events[0].id === "p") return gate.promise;
      return events.length;
    });
    const { c } = setup({ importEvents, pull: async () => ({ events: [ev("p")], maxCreatedAt: T }) });
    const pulling = c.runPull("x");
    await flush();
    c.enqueueLive(ev("L"), T + 1);
    gate.reject(new Error("sqlite"));
    await expect(pulling).rejects.toThrow("sqlite");
    await c.idle();
    expect(calls).toEqual(["p", "L"]);
    expect(c.queueSize()).toBe(0);
    expect(c.getCursor()).toBe(T + 1); // o pull que falhou não avançou o cursor
  });

  it("a fila drena depois de um pull cuja busca lança", async () => {
    const { c, log } = setup({ pull: async () => Promise.reject(new Error("offline")) });
    c.enqueueLive(ev("L"), T);
    await expect(c.runPull("x")).rejects.toThrow("offline");
    await c.idle();
    expect(log.map((e) => e.id)).toEqual(["L"]);
  });

  it("no máximo uma importação por vez (pulls e drenagens disputando)", async () => {
    let active = 0;
    let maxActive = 0;
    const seen: string[] = [];
    const importEvents = vi.fn(async (events: SyncEvent[]) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(...events.map((e) => e.id));
      active--;
      return events.length;
    });
    let n = 0;
    const { c } = setup({
      importEvents,
      pull: async () => {
        const k = ++n;
        await new Promise((r) => setTimeout(r, k));
        return { events: [ev(`p${k}`)], maxCreatedAt: T + k };
      },
    });
    c.enqueueLive(ev("L1"), T);
    const pulls = [c.runPull("a"), c.runPull("b"), c.runPull("c")];
    setTimeout(() => c.enqueueLive(ev("L2"), T + 100), 3);
    setTimeout(() => c.enqueueLive(ev("L3"), T + 50), 7);
    await Promise.all(pulls);
    await new Promise((r) => setTimeout(r, 20));
    await c.idle();
    expect(maxActive).toBe(1);
    expect(seen.sort()).toEqual(["L1", "L2", "L3", "p1", "p2", "p3"]);
    expect(c.getCursor()).toBe(T + 100);
  });

  it("lote ao vivo com erro volta para a fila e é tentado de novo", async () => {
    let fail = true;
    const mem = memLog();
    const importEvents = vi.fn(async (events: SyncEvent[]) => {
      if (fail) throw new Error("ocupado");
      return mem.importEvents(events);
    });
    const { c, warn } = setup({ importEvents });
    c.enqueueLive(ev("L"), T);
    await c.idle();
    expect(c.queueSize()).toBe(1);
    expect(c.getCursor()).toBeNull();
    fail = false;
    await c.runPull("x"); // o próximo pull dispara a nova tentativa
    await c.idle();
    expect(mem.log.map((e) => e.id)).toEqual(["L"]);
    expect(c.getCursor()).toBe(T);
    expect(warn.mock.calls.some((args) => String(args[0]).includes("descartado"))).toBe(false);
  });

  it(`lote que sempre falha é descartado com aviso após ${LIVE_MAX_ATTEMPTS} tentativas`, async () => {
    const importEvents = vi.fn(async () => {
      throw new Error("ruim");
    });
    const { c, warn } = setup({ importEvents });
    c.enqueueLive(ev("X"), T);
    await c.idle();
    for (let i = 0; i < LIVE_MAX_ATTEMPTS + 2; i++) {
      await c.runPull("x");
      await c.idle();
    }
    expect(importEvents).toHaveBeenCalledTimes(LIVE_MAX_ATTEMPTS);
    expect(c.queueSize()).toBe(0);
    expect(c.getCursor()).toBeNull();
    const drops = warn.mock.calls.map((a) => String(a[0])).filter((m) => m.includes("descartado"));
    expect(drops).toEqual([`[Sync] Evento ao vivo descartado após ${LIVE_MAX_ATTEMPTS} tentativas: id=X`]);
  });
});

describe("createSyncCoordinator: época do grupo", () => {
  it("sair do grupo durante um pull em curso: não importa os eventos antigos nem regrava o cursor", async () => {
    const fetch = deferred<CoordinatorPullResult>();
    const { c, storage, log } = setup({ pull: () => fetch.promise });
    const pulling = c.runPull("x");
    const resetting = c.reset();
    fetch.resolve({ events: [ev("antigo")], maxCreatedAt: T });
    expect(await pulling).toBe(0);
    await resetting;
    await c.idle();
    expect(log).toEqual([]);
    expect(c.getCursor()).toBeNull();
    expect(storage.data.has(RELAY_CURSOR_KEY)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("sair do grupo durante a importação ao vivo: o cursor do grupo antigo não volta", async () => {
    const gate = deferred<number>();
    const importEvents = vi.fn(() => gate.promise);
    const { c, storage } = setup({ importEvents });
    c.enqueueLive(ev("L"), T);
    await flush();
    expect(importEvents).toHaveBeenCalledTimes(1);
    await c.reset();
    gate.resolve(1);
    await c.idle();
    expect(c.getCursor()).toBeNull();
    expect(storage.data.has(RELAY_CURSOR_KEY)).toBe(false);
  });

  it("falha de um lote do grupo antigo não volta para a fila do grupo novo", async () => {
    const gate = deferred<number>();
    const { c } = setup({ importEvents: () => gate.promise });
    c.enqueueLive(ev("L"), T);
    await flush();
    await c.reset();
    gate.reject(new Error("x"));
    await c.idle();
    expect(c.queueSize()).toBe(0);
  });

  it("entrar em outro grupo zera cursor e fila e apaga as chaves", async () => {
    const storage = memStorage({ [RELAY_CURSOR_KEY]: String(T), [LEGACY_LAST_PULL_TS_KEY]: "1" });
    const gate = deferred<number>();
    let first = true;
    const importEvents = vi.fn(async (events: SyncEvent[]) => {
      if (first) {
        first = false;
        return gate.promise;
      }
      return events.length;
    });
    const { c } = setup({ storage, importEvents });
    await c.load();
    c.enqueueLive(ev("ocupa"), T + 1);
    await flush();
    c.enqueueLive(ev("pendente"), T + 2); // espera na fila
    expect(c.queueSize()).toBe(1);
    await c.reset();
    expect(c.getCursor()).toBeNull();
    expect(c.queueSize()).toBe(0);
    expect(storage.data.has(RELAY_CURSOR_KEY)).toBe(false);
    expect(storage.data.has(LEGACY_LAST_PULL_TS_KEY)).toBe(false);
    expect(c.liveSince()).toBe(T - 60);
    gate.resolve(1);
    await c.idle();
    expect(importEvents).toHaveBeenCalledTimes(1); // "pendente" foi descartado com a época antiga
  });

  it("reset durante o load ignora o cursor carregado do grupo antigo", async () => {
    const storage = memStorage({ [RELAY_CURSOR_KEY]: String(T) });
    const { c } = setup({ storage });
    const loading = c.load();
    await c.reset();
    await loading;
    expect(c.getCursor()).toBeNull();
  });
});
