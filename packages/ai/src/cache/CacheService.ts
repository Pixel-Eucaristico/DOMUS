import type { CacheEntry } from "../types";

// ─── CacheService ─────────────────────────────────────────────────────────────

export class CacheService {
  private static readonly DEFAULT_TTL_MS = 30 * 60 * 1_000; // 30 minutes
  private static readonly store = new Map<string, CacheEntry<unknown>>();

  static get<T>(key: string): T | null {
    const entry = CacheService.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      CacheService.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  static set<T>(key: string, value: T, ttlMs?: number): void {
    CacheService.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? CacheService.DEFAULT_TTL_MS),
    });
  }

  static delete(key: string): void {
    CacheService.store.delete(key);
  }

  static clear(): void {
    CacheService.store.clear();
  }

  static has(key: string): boolean {
    return CacheService.get<unknown>(key) !== null;
  }

  /** Remove all expired entries. Call periodically to prevent memory leaks. */
  static evict(): void {
    const now = Date.now();
    for (const [key, entry] of CacheService.store.entries()) {
      if (now > entry.expiresAt) {
        CacheService.store.delete(key);
      }
    }
  }
}
