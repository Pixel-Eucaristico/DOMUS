import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WishlistItem } from "@packages/wishlist";
import {
  PriceRefreshController,
  parseTimestampsJson,
} from "../application/priceRefreshQueue";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
  },
}));

vi.mock("@packages/wishlist", () => ({
  wishlistScraperService: {
    scrape: vi.fn(),
  },
}));

function makeItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: "item-1",
    listId: "list-1",
    name: "Teclado",
    urgencyLevel: "PLANNED",
    orderIndex: 0,
    originalUrl: "https://example.com/p/1",
    price: 100,
    ...overrides,
  };
}

describe("PriceRefreshController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parseTimestampsJson retorna {} para null, array ou JSON inválido", () => {
    expect(parseTimestampsJson("null")).toEqual({});
    expect(parseTimestampsJson("[]")).toEqual({});
    expect(parseTimestampsJson("{broken")).toEqual({});
    expect(parseTimestampsJson('{"a":123}')).toEqual({ a: 123 });
  });

  it("não raspa com enabled: false e re-enfileira quando enabled muda para true", async () => {
    const scrape = vi.fn(async () => ({ price: 150 }));
    const saveTimestamp = vi.fn(async () => {});
    const onUpdateItem = vi.fn();

    const ctrl = new PriceRefreshController(
      {
        onRefreshingIdChange: () => {},
        onUpdateItem,
        scrape,
        sleep: async () => {},
        randomDelay: () => 0,
        loadTimestamps: async () => ({}),
        saveTimestamp,
      },
      false,
    );
    ctrl.setItems([makeItem()]);
    await ctrl.init();

    ctrl.enqueueVisible(["item-1"]);
    expect(scrape).not.toHaveBeenCalled();

    ctrl.setEnabled(true);
    await new Promise((r) => setTimeout(r, 10));

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(saveTimestamp).toHaveBeenCalledTimes(1);
    expect(onUpdateItem).toHaveBeenCalledWith("item-1", "list-1", { price: 150 });
  });

  it("enfileira itens visíveis iniciais quando loadTimestamps termina após enqueueVisible", async () => {
    let resolveTs!: (v: Record<string, number>) => void;
    const scrape = vi.fn(async () => ({ price: 120 }));
    const ctrl = new PriceRefreshController(
      {
        onRefreshingIdChange: () => {},
        onUpdateItem: vi.fn(),
        scrape,
        sleep: async () => {},
        randomDelay: () => 0,
        loadTimestamps: () =>
          new Promise((resolve) => {
            resolveTs = resolve;
          }),
        saveTimestamp: async () => {},
      },
      true,
    );
    ctrl.setItems([makeItem()]);

    const initPromise = ctrl.init();
    ctrl.enqueueVisible(["item-1"]);
    expect(scrape).not.toHaveBeenCalled();

    resolveTs({});
    await initPromise;
    await new Promise((r) => setTimeout(r, 10));

    expect(scrape).toHaveBeenCalledTimes(1);
  });

  it("aborta e não salva timestamp nem preço se enabled desligar durante o scrape", async () => {
    let resolveScrape!: (v: { price?: number }) => void;
    const saveTimestamp = vi.fn(async () => {});
    const onUpdateItem = vi.fn();
    const scrape = vi.fn(
      () =>
        new Promise<{ price?: number }>((resolve) => {
          resolveScrape = resolve;
        }),
    );

    const ctrl = new PriceRefreshController(
      {
        onRefreshingIdChange: () => {},
        onUpdateItem,
        scrape,
        sleep: async () => {},
        randomDelay: () => 0,
        loadTimestamps: async () => ({}),
        saveTimestamp,
      },
      true,
    );
    ctrl.setItems([makeItem()]);
    await ctrl.init();
    ctrl.enqueueVisible(["item-1"]);
    await new Promise((r) => setTimeout(r, 10));

    ctrl.setEnabled(false);
    resolveScrape({ price: 200 });
    await new Promise((r) => setTimeout(r, 10));

    expect(saveTimestamp).not.toHaveBeenCalled();
    expect(onUpdateItem).not.toHaveBeenCalled();
  });

  it("não grava timestamp de bundle quando todas as peças falham", async () => {
    const saveTimestamp = vi.fn(async () => {});
    const scrape = vi.fn(async () => {
      throw new Error("offline");
    });

    const ctrl = new PriceRefreshController(
      {
        onRefreshingIdChange: () => {},
        onUpdateItem: vi.fn(),
        scrape,
        sleep: async () => {},
        randomDelay: () => 0,
        loadTimestamps: async () => ({}),
        saveTimestamp,
      },
      true,
    );
    ctrl.setItems([
      makeItem({
        originalUrl: undefined,
        bundleItems: [{ id: "b1", name: "Peça 1", originalUrl: "https://example.com/b1", price: 50 }],
      }),
    ]);
    await ctrl.init();
    ctrl.enqueueVisible(["item-1"]);
    await new Promise((r) => setTimeout(r, 10));

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(saveTimestamp).not.toHaveBeenCalled();
  });
});
