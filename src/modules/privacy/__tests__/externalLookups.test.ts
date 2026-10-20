import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  EXTERNAL_LOOKUPS_KEY,
  WELCOME_KEY,
  loadExternalLookups,
  markExternalLookupsNoticeShown,
  setExternalLookupsEnabled,
  resetExternalLookupsCache,
  subscribeExternalLookups,
  getCachedExternalLookups,
  type KeyValueStorage,
} from "../externalLookups";

// O AsyncStorage real puxa react-native: o stub em memória substitui o
// armazenamento padrão; os demais testes injetam o próprio armazenamento.
const asyncStore = vi.hoisted(() => ({
  map: new Map<string, string>(),
  failWrites: { value: false },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => asyncStore.map.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      if (asyncStore.failWrites.value) throw new Error("disco cheio");
      asyncStore.map.set(k, v);
    }),
  },
}));

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage: KeyValueStorage & { map: Map<string, string> } = {
    map,
    getItem: vi.fn(async (k: string) => map.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      map.set(k, v);
    }),
  };
  return storage;
}

describe("externalLookups — migração da flag", () => {
  beforeEach(() => resetExternalLookupsCache());

  it("instalação nova (sem introdução e sem chave) começa desligada e sem aviso", async () => {
    const storage = memoryStorage();
    const s = await loadExternalLookups(storage);
    expect(s).toEqual({ enabled: false, noticeShown: true });
    expect(JSON.parse(storage.map.get(EXTERNAL_LOOKUPS_KEY)!)).toEqual({
      enabled: false,
      noticeShown: true,
    });
  });

  it("quem já usa (introdução vista, sem chave) começa ligado, com aviso pendente, e grava", async () => {
    const storage = memoryStorage({ [WELCOME_KEY]: "done" });
    const s = await loadExternalLookups(storage);
    expect(s).toEqual({ enabled: true, noticeShown: false });
    expect(JSON.parse(storage.map.get(EXTERNAL_LOOKUPS_KEY)!)).toEqual({
      enabled: true,
      noticeShown: false,
    });
  });

  it("chave gravada vence a introdução: instalação nova que termina a introdução continua desligada", async () => {
    const storage = memoryStorage();
    await loadExternalLookups(storage);
    storage.map.set(WELCOME_KEY, "done");
    const s = await loadExternalLookups(storage);
    expect(s).toEqual({ enabled: false, noticeShown: true });
  });

  it("aviso já visto: nada muda", async () => {
    const storage = memoryStorage({
      [WELCOME_KEY]: "done",
      [EXTERNAL_LOOKUPS_KEY]: JSON.stringify({ enabled: true, noticeShown: true }),
    });
    const s = await loadExternalLookups(storage);
    expect(s).toEqual({ enabled: true, noticeShown: true });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("falha de leitura trata como desligada", async () => {
    const storage = memoryStorage();
    storage.getItem = vi.fn(async () => {
      throw new Error("indisponível");
    });
    const s = await loadExternalLookups(storage);
    expect(s.enabled).toBe(false);
  });
});

describe("externalLookups — aviso único e interruptor", () => {
  beforeEach(() => resetExternalLookupsCache());

  it("marca o aviso uma única vez, mesmo chamado de novo", async () => {
    const storage = memoryStorage({ [WELCOME_KEY]: "done" });
    const first = await loadExternalLookups(storage);
    expect(first.noticeShown).toBe(false);

    await markExternalLookupsNoticeShown(storage);
    const writesAfterFirstMark = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.length;
    await markExternalLookupsNoticeShown(storage);
    expect((storage.setItem as ReturnType<typeof vi.fn>).mock.calls.length).toBe(writesAfterFirstMark);

    const again = await loadExternalLookups(storage);
    expect(again).toEqual({ enabled: true, noticeShown: true });
  });

  it("desligar mantém o aviso como visto", async () => {
    const storage = memoryStorage({ [WELCOME_KEY]: "done" });
    await loadExternalLookups(storage);
    await markExternalLookupsNoticeShown(storage);
    await setExternalLookupsEnabled(false, storage);
    expect(await loadExternalLookups(storage)).toEqual({ enabled: false, noticeShown: true });
  });

  it("ligar numa instalação nova não dispara aviso", async () => {
    const storage = memoryStorage();
    await setExternalLookupsEnabled(true, storage);
    expect(await loadExternalLookups(storage)).toEqual({ enabled: true, noticeShown: true });
  });
});

describe("externalLookups — armazenamento padrão (cache e assinantes)", () => {
  beforeEach(() => {
    resetExternalLookupsCache();
    asyncStore.map.clear();
    asyncStore.failWrites.value = false;
  });

  it("assinante recebe o valor novo e o cache acompanha", async () => {
    asyncStore.map.set(WELCOME_KEY, "done");
    expect(getCachedExternalLookups()).toBeNull();
    expect(await loadExternalLookups()).toEqual({ enabled: true, noticeShown: false });
    expect(getCachedExternalLookups()).toEqual({ enabled: true, noticeShown: false });

    const received: unknown[] = [];
    const unsubscribe = subscribeExternalLookups((s) => received.push(s));
    await setExternalLookupsEnabled(false);
    unsubscribe();

    expect(received).toEqual([{ enabled: false, noticeShown: false }]);
    expect(getCachedExternalLookups()).toEqual({ enabled: false, noticeShown: false });
    expect(JSON.parse(asyncStore.map.get(EXTERNAL_LOOKUPS_KEY)!)).toEqual({
      enabled: false,
      noticeShown: false,
    });
  });

  it("gravação que falha não muda o valor em cache nem avisa assinantes", async () => {
    asyncStore.map.set(WELCOME_KEY, "done");
    await loadExternalLookups();
    const listener = vi.fn();
    subscribeExternalLookups(listener);

    asyncStore.failWrites.value = true;
    await expect(setExternalLookupsEnabled(false)).rejects.toThrow();

    expect(listener).not.toHaveBeenCalled();
    expect(getCachedExternalLookups()).toEqual({ enabled: true, noticeShown: false });
  });
});
