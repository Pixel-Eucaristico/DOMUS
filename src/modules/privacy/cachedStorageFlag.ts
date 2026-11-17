export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
}

export interface CachedReadResult<T> {
  value: T;
  cacheable: boolean;
}

export interface CachedStorageFlag<T> {
  publish: (next: T) => void;
  subscribe: (listener: (value: T) => void) => () => void;
  getCached: () => T | null;
  reset: () => void;
  load: (
    storage: KeyValueStorage,
    readFn: (storage: KeyValueStorage) => Promise<CachedReadResult<T>>,
  ) => Promise<T>;
  enqueueWrite: <R>(storage: KeyValueStorage, fn: () => Promise<R>) => Promise<R>;
}

/**
 * Store reativo em memória com deduplicação de leitura por época (`cacheEpoch`),
 * isolamento de assinantes e fila de escrita serializada para flags em AsyncStorage.
 */
export function createCachedStorageFlag<T>(
  defaultStorage: KeyValueStorage,
): CachedStorageFlag<T> {
  let cached: T | null = null;
  let pending: Promise<T> | null = null;
  let cacheEpoch = 0;
  let writeTail: Promise<unknown> = Promise.resolve();
  let activeWrites = 0;
  const listeners = new Set<(value: T) => void>();

  function publish(next: T): void {
    cached = next;
    listeners.forEach((listener) => {
      try {
        listener(next);
      } catch {
        // Isola erro de assinante individual para não quebrar os demais
      }
    });
  }

  function subscribe(listener: (value: T) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getCached(): T | null {
    return cached;
  }

  function reset(): void {
    cacheEpoch += 1;
    cached = null;
    pending = null;
    writeTail = Promise.resolve();
    activeWrites = 0;
    listeners.clear();
  }

  async function load(
    storage: KeyValueStorage,
    readFn: (storage: KeyValueStorage) => Promise<CachedReadResult<T>>,
  ): Promise<T> {
    if (storage !== defaultStorage) {
      return (await readFn(storage)).value;
    }
    if (cached !== null) return cached;
    if (!pending) {
      const startEpoch = cacheEpoch;
      const run = readFn(storage)
        .then(({ value, cacheable }) => {
          if (cacheEpoch !== startEpoch) return value;
          // Uma gravação feita durante a leitura vence
          if (cached === null && cacheable) publish(value);
          return cached ?? value;
        })
        .finally(() => {
          if (pending === run) pending = null;
        });
      pending = run;
    }
    return pending;
  }

  function enqueueWrite<R>(storage: KeyValueStorage, fn: () => Promise<R>): Promise<R> {
    if (storage !== defaultStorage) return fn();
    if (activeWrites === 0) {
      activeWrites += 1;
      const run = fn().finally(() => {
        activeWrites = Math.max(0, activeWrites - 1);
      });
      writeTail = run.catch(() => {});
      return run;
    }
    activeWrites += 1;
    const chained = writeTail.then(fn, fn).finally(() => {
      activeWrites = Math.max(0, activeWrites - 1);
    });
    writeTail = chained.catch(() => {});
    return chained;
  }

  return {
    publish,
    subscribe,
    getCached,
    reset,
    load,
    enqueueWrite,
  };
}
