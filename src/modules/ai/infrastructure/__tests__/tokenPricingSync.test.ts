import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenPricingService } from "../TokenPricingService";

const secureStore = vi.hoisted(() => ({
  map: new Map<string, string>(),
}));

vi.mock("@/src/modules/security/infrastructure/SecureStorageService", () => ({
  SecureStorageService: {
    get: vi.fn(async (key: string) => secureStore.map.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      secureStore.map.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      secureStore.map.delete(key);
    }),
  },
}));

beforeEach(async () => {
  secureStore.map.clear();
  await TokenPricingService.resetLocalCustomPrices();
});

describe("TokenPricingService — sync de preços personalizados", () => {
  it("setCustomPrice notifica ouvintes e remove provedor ao zerar último tier", async () => {
    const emitted: unknown[] = [];
    const unsub = TokenPricingService.registerCustomPricesSyncListener((prices) => {
      emitted.push(prices);
    });

    await TokenPricingService.setCustomPrice("openai", "fast", 18.5);
    expect(emitted).toEqual([{ openai: { fast: 18.5 } }]);
    expect(await TokenPricingService.getCustomPricesSnapshot()).toEqual({
      openai: { fast: 18.5 },
    });

    await TokenPricingService.setCustomPrice("openai", "fast", 0);
    expect(emitted).toEqual([{ openai: { fast: 18.5 } }, {}]);
    expect(await TokenPricingService.getCustomPricesSnapshot()).toEqual({});

    unsub();
  });

  it("applySyncedCustomPrices não dispara ouvinte de emissão e respeita persistência em modo demo", async () => {
    const emitted: unknown[] = [];
    const unsub = TokenPricingService.registerCustomPricesSyncListener((prices) => {
      emitted.push(prices);
    });

    await TokenPricingService.applySyncedCustomPrices({ claude: { smart: 42 } }, false);
    expect(emitted).toEqual([]);
    expect(await TokenPricingService.getCustomPricesSnapshot()).toEqual({ claude: { smart: 42 } });
    expect(secureStore.map.has("domus_ai_custom_prices")).toBe(false);

    // Ao sair do modo demo com os mesmos preços, persist = true grava no SecureStorage
    await TokenPricingService.applySyncedCustomPrices({ claude: { smart: 42 } }, true);
    expect(secureStore.map.get("domus_ai_custom_prices")).toBe(
      JSON.stringify({ claude: { smart: 42 } }),
    );

    // Ao invalidar cache em memória, releitura vem do SecureStorage
    await TokenPricingService.applySyncedCustomPrices({ gemini: { fast: 9 } }, false);
    TokenPricingService.invalidateCustomPricesCache();
    expect(await TokenPricingService.getCustomPricesSnapshot()).toEqual({ claude: { smart: 42 } });

    unsub();
  });
});
