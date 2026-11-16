import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  applySyncedSupportModes,
  dailyAdDay,
  getCachedSupportModes,
  loadSupportModes,
  resetLocalSupportModes,
  resetSupportModesCache,
  saveSupportModes,
  shouldShowDailyAd,
  subscribeSupportModes,
  type SupportMode,
} from "../MonetizationSettingsStore";

// O AsyncStorage real puxa react-native: stub em memória
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

beforeEach(() => {
  asyncStore.map.clear();
  asyncStore.failReads.value = false;
  asyncStore.failWrites.value = false;
  resetSupportModesCache();
});

describe("modos de apoio: fonte única", () => {
  it("padrão é só links", async () => {
    expect(await loadSupportModes()).toEqual(["links"]);
    expect(getCachedSupportModes()).toEqual(["links"]);
  });

  it("lê os modos gravados e ignora valores inválidos", async () => {
    asyncStore.map.set("domus_support_modes_v2", JSON.stringify(["banners", "xyz", "daily_ad"]));
    expect(await loadSupportModes()).toEqual(["banners", "daily_ad"]);
  });

  it("migra o modo legado", async () => {
    asyncStore.map.set("domus_support_mode_v1", "native_ad");
    expect(await loadSupportModes()).toEqual(["native_ad"]);
  });

  it("falha de leitura cai em só links", async () => {
    asyncStore.failReads.value = true;
    expect(await loadSupportModes()).toEqual(["links"]);
  });

  it("assinantes recebem a mudança na hora ao gravar", async () => {
    const seen: SupportMode[][] = [];
    subscribeSupportModes((m) => seen.push(m));
    await saveSupportModes(["banners"]);
    await saveSupportModes(["links"]);
    expect(seen).toEqual([["banners"], ["links"]]);
    expect(await loadSupportModes()).toEqual(["links"]);
  });

  it("desligar vale na sessão mesmo se a gravação falhar", async () => {
    const listener = vi.fn();
    subscribeSupportModes(listener);
    asyncStore.failWrites.value = true;
    await saveSupportModes(["links"]);
    expect(listener).toHaveBeenCalledWith(["links"]);
    expect(getCachedSupportModes()).toEqual(["links"]);
  });

  it("cancelar a assinatura para de receber", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSupportModes(listener);
    unsubscribe();
    await saveSupportModes(["app_open"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("gravação durante a leitura vence", async () => {
    asyncStore.map.set("domus_support_modes_v2", JSON.stringify(["daily_ad"]));
    const loading = loadSupportModes();
    await saveSupportModes(["banners"]);
    expect(await loading).toEqual(["banners"]);
    expect(getCachedSupportModes()).toEqual(["banners"]);
  });

  it("o valor gravado não é a mesma referência do chamador", async () => {
    const modes: SupportMode[] = ["banners"];
    await saveSupportModes(modes);
    modes.push("daily_ad");
    expect(getCachedSupportModes()).toEqual(["banners"]);
  });

  it("applySyncedSupportModes filtra, deduplica, faz fallback para ['links'], notifica assinantes e evita no-op", async () => {
    const seen: SupportMode[][] = [];
    const unsub = subscribeSupportModes((m) => seen.push(m));

    await applySyncedSupportModes(["banners", "invalido" as SupportMode, "banners", "daily_ad"]);
    expect(getCachedSupportModes()).toEqual(["banners", "daily_ad"]);
    expect(asyncStore.map.get("domus_support_modes_v2")).toBe(JSON.stringify(["banners", "daily_ad"]));
    expect(seen).toEqual([["banners", "daily_ad"]]);

    // Chamada repetida com mesmo conteúdo não notifica nem reescreve
    await applySyncedSupportModes(["banners", "daily_ad"]);
    expect(seen).toHaveLength(1);

    // Lista inválida/vazia volta para ["links"]
    await applySyncedSupportModes([]);
    expect(getCachedSupportModes()).toEqual(["links"]);
    expect(seen).toEqual([["banners", "daily_ad"], ["links"]]);

    // persist = false (modo demo) atualiza cache em memória sem gravar AsyncStorage
    await applySyncedSupportModes(["app_open"], false);
    expect(getCachedSupportModes()).toEqual(["app_open"]);
    expect(asyncStore.map.get("domus_support_modes_v2")).toBe(JSON.stringify(["links"]));

    unsub();
  });

  it("resetLocalSupportModes restaura ['links'] e remove chaves locais", async () => {
    asyncStore.map.set("domus_support_modes_v2", JSON.stringify(["banners"]));
    asyncStore.map.set("domus_support_mode_v1", "native_ad");
    await resetLocalSupportModes();

    expect(getCachedSupportModes()).toEqual(["links"]);
    expect(asyncStore.map.has("domus_support_modes_v2")).toBe(false);
    expect(asyncStore.map.has("domus_support_mode_v1")).toBe(false);
  });
});

describe("shouldShowDailyAd", () => {
  it("mostra quando nunca foi visto", () => {
    expect(shouldShowDailyAd(null, "2026-10-21")).toBe(true);
  });

  it("mostra quando a última vez foi outro dia", () => {
    expect(shouldShowDailyAd("2026-10-20", "2026-10-21")).toBe(true);
  });

  it("não mostra quando já foi visto hoje", () => {
    expect(shouldShowDailyAd("2026-10-21", "2026-10-21")).toBe(false);
  });

  it("dailyAdDay devolve o dia local AAAA-MM-DD", () => {
    // Construtor local: 21/10 às 22:30 no fuso do aparelho (em UTC já seria 22/10 no Brasil)
    expect(dailyAdDay(new Date(2026, 9, 21, 22, 30))).toBe("2026-10-21");
    expect(dailyAdDay(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });
});
