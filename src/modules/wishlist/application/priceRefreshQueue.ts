import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WishlistItem } from "@packages/wishlist";
import { wishlistScraperService } from "@packages/wishlist";

const STORAGE_KEY = "@price_refresh_timestamps";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

function defaultRandomDelay(): number {
  return 1200 + Math.floor(Math.random() * 2800);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseTimestampsJson(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

export async function loadPriceRefreshTimestamps(): Promise<Record<string, number>> {
  try {
    return parseTimestampsJson(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

async function saveTimestamp(
  cache: Record<string, number>,
  itemId: string,
): Promise<void> {
  cache[itemId] = Date.now();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignora falhas de persistência silenciosamente
  }
}

function needsRefresh(timestamps: Record<string, number>, itemId: string): boolean {
  const last = timestamps[itemId];
  if (!last || !Number.isFinite(last)) return true;
  return Date.now() - last > REFRESH_INTERVAL_MS;
}

export interface PriceRefreshControllerDeps {
  onRefreshingIdChange: (id: string | null) => void;
  onUpdateItem: (id: string, listId: string, changes: Partial<WishlistItem>) => void;
  scrape?: (url: string) => Promise<{ price?: number }>;
  sleep?: (ms: number) => Promise<void>;
  randomDelay?: () => number;
  loadTimestamps?: () => Promise<Record<string, number>>;
  saveTimestamp?: (cache: Record<string, number>, itemId: string) => Promise<void>;
}

/**
 * Controlador puro da fila de atualização de preços (sem react-native),
 * garantindo aborto imediato ao desligar a flag e re-enfileiramento após
 * carregar os timestamps iniciais.
 */
export class PriceRefreshController {
  private queue: string[] = [];
  private seen = new Set<string>();
  private processing = false;
  private active = true;
  private enabled: boolean;
  private timestamps: Record<string, number> = {};
  private timestampsLoaded = false;
  private lastVisible: string[] = [];
  private itemsMap = new Map<string, WishlistItem>();

  private readonly onRefreshingIdChange: (id: string | null) => void;
  private readonly onUpdateItem: (id: string, listId: string, changes: Partial<WishlistItem>) => void;
  private readonly scrape: (url: string) => Promise<{ price?: number }>;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly randomDelayFn: () => number;
  private readonly loadTimestampsFn: () => Promise<Record<string, number>>;
  private readonly saveTimestampFn: (cache: Record<string, number>, itemId: string) => Promise<void>;

  constructor(deps: PriceRefreshControllerDeps, initialEnabled = false) {
    this.onRefreshingIdChange = deps.onRefreshingIdChange;
    this.onUpdateItem = deps.onUpdateItem;
    this.scrape = deps.scrape ?? ((url) => wishlistScraperService.scrape(url));
    this.sleepFn = deps.sleep ?? defaultSleep;
    this.randomDelayFn = deps.randomDelay ?? defaultRandomDelay;
    this.loadTimestampsFn = deps.loadTimestamps ?? loadPriceRefreshTimestamps;
    this.saveTimestampFn = deps.saveTimestamp ?? saveTimestamp;
    this.enabled = initialEnabled;
  }

  setItems(items: WishlistItem[]): void {
    const map = new Map<string, WishlistItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    this.itemsMap = map;
  }

  async init(): Promise<void> {
    this.active = true;
    const ts = await this.loadTimestampsFn();
    if (!this.active) return;
    this.timestamps = ts;
    this.timestampsLoaded = true;
    if (this.enabled && this.lastVisible.length > 0) {
      this.enqueueVisible(this.lastVisible);
    }
  }

  dispose(): void {
    this.active = false;
  }

  setEnabled(next: boolean): void {
    this.enabled = next;
    if (!next) {
      for (const id of this.queue) this.seen.delete(id);
      this.queue = [];
    } else {
      this.enqueueVisible(this.lastVisible);
    }
  }

  enqueueVisible(visibleIds: string[]): void {
    this.lastVisible = visibleIds;
    if (!this.enabled || !this.timestampsLoaded) return;

    let added = false;
    for (const id of visibleIds) {
      if (this.seen.has(id)) continue;
      const item = this.itemsMap.get(id);
      const hasUrl = !!item?.originalUrl;
      const hasBundle = (item?.bundleItems?.length ?? 0) > 0;
      if (!hasUrl && !hasBundle) continue;

      if (!needsRefresh(this.timestamps, id)) {
        this.seen.add(id);
        continue;
      }

      this.seen.add(id);
      this.queue.push(id);
      added = true;
    }

    if (added && !this.processing) {
      void this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (!this.active || !this.enabled || this.queue.length === 0) {
      this.processing = false;
      return;
    }
    this.processing = true;

    const itemId = this.queue.shift()!;
    const item = this.itemsMap.get(itemId);
    const isBundleItem = (item?.bundleItems?.length ?? 0) > 0;

    if (!item?.originalUrl && !isBundleItem) {
      await this.processNext();
      return;
    }

    this.onRefreshingIdChange(itemId);

    try {
      if (isBundleItem && item) {
        const updatedBundleItems = [...item.bundleItems!];
        let changed = false;
        let anySucceeded = false;

        for (let i = 0; i < updatedBundleItems.length; i++) {
          const bItem = updatedBundleItems[i];
          if (!bItem.originalUrl) continue;

          await this.sleepFn(this.randomDelayFn());
          if (!this.active) return;
          if (!this.enabled) {
            this.seen.delete(itemId);
            this.processing = false;
            return;
          }

          try {
            const data = await this.scrape(bItem.originalUrl);
            if (!this.active) return;
            if (!this.enabled) {
              this.seen.delete(itemId);
              this.processing = false;
              return;
            }
            anySucceeded = true;
            if (data.price !== undefined && data.price !== bItem.price) {
              updatedBundleItems[i] = { ...bItem, price: data.price };
              changed = true;
            }
          } catch {
            // Peça com erro: mantém preço anterior
          }
        }

        if (!this.active || !this.enabled) {
          if (this.active) this.seen.delete(itemId);
          return;
        }
        if (anySucceeded) {
          await this.saveTimestampFn(this.timestamps, itemId);
        }

        if (changed) {
          const newTotal = updatedBundleItems.reduce((acc, b) => acc + (b.price ?? 0), 0);
          this.onUpdateItem(itemId, item.listId, {
            bundleItems: updatedBundleItems,
            price: newTotal > 0 ? newTotal : item.price,
          });
        }
      } else if (item?.originalUrl) {
        await this.sleepFn(this.randomDelayFn());
        if (!this.active) return;
        if (!this.enabled) {
          this.seen.delete(itemId);
          this.processing = false;
          return;
        }

        const data = await this.scrape(item.originalUrl);
        if (!this.active) return;
        if (!this.enabled) {
          this.seen.delete(itemId);
          this.processing = false;
          return;
        }

        await this.saveTimestampFn(this.timestamps, itemId);

        if (data.price !== undefined) {
          const current = this.itemsMap.get(itemId);
          if (current && data.price !== current.price) {
            this.onUpdateItem(itemId, item.listId, { price: data.price });
          }
        }
      }
    } catch {
      // Em caso de erro não salva timestamp — permitirá nova tentativa amanhã
    } finally {
      if (this.active) this.onRefreshingIdChange(null);
      this.processing = false;
    }

    if (this.active && this.enabled) {
      await this.processNext();
    }
  }
}
