import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  PERSONALIZED_ADS_KEY,
  adRequestOptions,
  getAdRequestOptions,
  getCachedPersonalizedAdsConsent,
  loadPersonalizedAdsConsent,
  resetPersonalizedAdsConsentCache,
  setPersonalizedAdsConsent,
  subscribePersonalizedAdsConsent,
  type KeyValueStorage,
} from "../adConsent";

// O AsyncStorage real puxa react-native: o stub em memória substitui o
// armazenamento padrão; os demais testes injetam o próprio armazenamento.
const asyncStore = vi.hoisted(() => ({
  map: new Map<string, string>(),
  failReads: { value: false },
  failWrites: { value: false },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => {
      if (asyncStore.failReads.value) throw new Error("falha de leitura");
      return asyncStore.map.get(k) ?? null;
    }),
    setItem: vi.fn(async (k: string, v: string) => {
      if (asyncStore.failWrites.value) throw new Error("disco cheio");
      asyncStore.map.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      asyncStore.map.delete(k);
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

beforeEach(() => {
  resetPersonalizedAdsConsentCache();
  asyncStore.map.clear();
  asyncStore.failReads.value = false;
  asyncStore.failWrites.value = false;
});

describe("adRequestOptions — fonte única das opções de pedido", () => {
  it("sem consentimento, pede só anúncio não personalizado", () => {
    expect(adRequestOptions(false)).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it("com consentimento, libera o personalizado", () => {
    expect(adRequestOptions(true)).toEqual({ requestNonPersonalizedAdsOnly: false });
  });
});

describe("adConsent — armazenamento injetado", () => {
  it("padrão é sem consentimento (chave ausente)", async () => {
    const storage = memoryStorage();
    expect(await loadPersonalizedAdsConsent(storage)).toBe(false);
    expect(await getAdRequestOptions(storage)).toEqual({ requestNonPersonalizedAdsOnly: true });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("quem já usa o app também começa sem consentimento", async () => {
    const storage = memoryStorage({
      domus_welcome_done_v1: "1",
      domus_support_modes_v2: JSON.stringify(["app_open", "daily_ad"]),
    });
    expect(await loadPersonalizedAdsConsent(storage)).toBe(false);
  });

  it("valor inválido conta como sem consentimento", async () => {
    const storage = memoryStorage({ [PERSONALIZED_ADS_KEY]: "sim" });
    expect(await loadPersonalizedAdsConsent(storage)).toBe(false);
  });

  it("ligar grava e libera o personalizado", async () => {
    const storage = memoryStorage();
    await setPersonalizedAdsConsent(true, storage);
    expect(storage.map.get(PERSONALIZED_ADS_KEY)).toBe("true");
    expect(await getAdRequestOptions(storage)).toEqual({ requestNonPersonalizedAdsOnly: false });
  });

  it("revogar volta o próximo pedido a não personalizado", async () => {
    const storage = memoryStorage({ [PERSONALIZED_ADS_KEY]: "true" });
    expect(await getAdRequestOptions(storage)).toEqual({ requestNonPersonalizedAdsOnly: false });
    await setPersonalizedAdsConsent(false, storage);
    expect(storage.map.get(PERSONALIZED_ADS_KEY)).toBe("false");
    expect(await getAdRequestOptions(storage)).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it("revogar com falha de gravação apaga a chave: próxima leitura é sem consentimento", async () => {
    const map = new Map([[PERSONALIZED_ADS_KEY, "true"]]);
    const storage: KeyValueStorage = {
      getItem: vi.fn(async (k: string) => map.get(k) ?? null),
      setItem: vi.fn(async () => {
        throw new Error("disco cheio");
      }),
      removeItem: vi.fn(async (k: string) => {
        map.delete(k);
      }),
    };
    await expect(setPersonalizedAdsConsent(false, storage)).rejects.toThrow();
    expect(storage.removeItem).toHaveBeenCalledWith(PERSONALIZED_ADS_KEY);
    expect(await loadPersonalizedAdsConsent(storage)).toBe(false);
  });

  it("falha de leitura trata como sem consentimento", async () => {
    const storage: KeyValueStorage = {
      getItem: vi.fn(async () => {
        throw new Error("falha");
      }),
      setItem: vi.fn(async () => {}),
    };
    expect(await loadPersonalizedAdsConsent(storage)).toBe(false);
    expect(await getAdRequestOptions(storage)).toEqual({ requestNonPersonalizedAdsOnly: true });
  });
});

describe("adConsent — armazenamento padrão com cache", () => {
  it("falha do AsyncStorage na leitura: não personalizado", async () => {
    asyncStore.failReads.value = true;
    expect(await getAdRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it("ligar e desligar avisa os assinantes e muda o próximo pedido", async () => {
    const seen: boolean[] = [];
    subscribePersonalizedAdsConsent((c) => seen.push(c));

    expect(await loadPersonalizedAdsConsent()).toBe(false);
    await setPersonalizedAdsConsent(true);
    expect(getCachedPersonalizedAdsConsent()).toBe(true);
    expect(await getAdRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: false });

    await setPersonalizedAdsConsent(false);
    expect(await getAdRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
    expect(seen).toEqual([false, true, false]);
    expect(asyncStore.map.get(PERSONALIZED_ADS_KEY)).toBe("false");
  });

  it("revogar vale na sessão mesmo se a gravação falhar", async () => {
    asyncStore.map.set(PERSONALIZED_ADS_KEY, "true");
    expect(await loadPersonalizedAdsConsent()).toBe(true);
    asyncStore.failWrites.value = true;
    await expect(setPersonalizedAdsConsent(false)).rejects.toThrow();
    expect(await getAdRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
    // Próxima abertura também sem consentimento: a chave foi apagada
    resetPersonalizedAdsConsentCache();
    asyncStore.failWrites.value = false;
    expect(await loadPersonalizedAdsConsent()).toBe(false);
  });

  it("conceder com falha de gravação não libera o personalizado", async () => {
    expect(await loadPersonalizedAdsConsent()).toBe(false);
    asyncStore.failWrites.value = true;
    await expect(setPersonalizedAdsConsent(true)).rejects.toThrow();
    expect(await getAdRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it("gravação durante a leitura vence", async () => {
    asyncStore.map.set(PERSONALIZED_ADS_KEY, "true");
    const reading = loadPersonalizedAdsConsent();
    await setPersonalizedAdsConsent(false);
    expect(await reading).toBe(false);
  });
});
