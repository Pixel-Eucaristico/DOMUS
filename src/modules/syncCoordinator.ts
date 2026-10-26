import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  LEGACY_LAST_PULL_TS_KEY,
  RELAY_CURSOR_KEY,
  advanceRelayCursor,
  loadRelayCursor,
  subscriptionSince,
} from "./syncPayload";

/**
 * Story 3.6: orquestração pura do sync (sem `react-native` nem `nostr-tools`).
 * Dona do cursor dos relays, da fila de eventos ao vivo, do mutex único de
 * importação e da época do grupo. O `useSyncEngine` só a embrulha.
 */

/** Tentativas de um evento ao vivo cuja importação falhou antes de ser descartado. */
export const LIVE_MAX_ATTEMPTS = 3;

export interface CoordinatorStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface CoordinatorPullResult {
  events: SyncEvent[];
  maxCreatedAt: number | null;
}

export interface SyncCoordinatorDeps<P> {
  importEvents: (events: SyncEvent[]) => Promise<number>;
  storage: CoordinatorStorage;
  /** Busca nos relays (fora do mutex: a rede não segura a importação ao vivo). */
  pull: (request: P) => Promise<CoordinatorPullResult>;
  /** Relógio em ms (padrão `Date.now`). */
  now?: () => number;
  warn?: (message: string) => void;
  onCursorChange?: (cursor: number | null) => void;
  /** Depois de um lote ao vivo importado com sucesso. */
  onLiveImported?: (imported: number) => void;
}

export interface SyncCoordinator<P> {
  /** Carrega o cursor salvo (apaga a chave antiga). */
  load(): Promise<number | null>;
  getCursor(): number | null;
  /** `since` da assinatura ao vivo a partir do cursor atual. */
  liveSince(): number;
  /** true enquanto houver importação em curso ou na fila do mutex. */
  isImporting(): boolean;
  /** Busca, importa sob o mutex e avança o cursor; devolve o nº de eventos novos. */
  runPull(request: P): Promise<number>;
  /** Evento ao vivo: entra na fila e é importado assim que o mutex permitir. */
  enqueueLive(event: SyncEvent, createdAt: number): void;
  /** Resolve quando a fila e o mutex estiverem ociosos (para testes). */
  idle(): Promise<void>;
  /** Sair/entrar num grupo: nova época, zera cursor e fila, apaga as chaves. */
  reset(): Promise<void>;
  queueSize(): number;
}

interface QueuedLive {
  event: SyncEvent;
  createdAt: number;
  attempts: number;
}

export function createSyncCoordinator<P>(deps: SyncCoordinatorDeps<P>): SyncCoordinator<P> {
  const now = deps.now ?? (() => Date.now());
  const warn = deps.warn ?? ((m: string) => console.warn(m));

  let epoch = 0;
  let cursor: number | null = null;
  let queue: QueuedLive[] = [];
  let drainScheduled = false;

  // Mutex: uma cadeia de promessas; cada importação espera a anterior terminar.
  let tail: Promise<void> = Promise.resolve();
  let held = 0;
  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    held++;
    const run = tail.then(fn);
    tail = run.then(
      () => {},
      () => {},
    );
    return run.finally(() => {
      held--;
    });
  }

  async function advance(createdAts: readonly unknown[], atEpoch: number): Promise<void> {
    if (atEpoch !== epoch) return;
    const next = advanceRelayCursor(cursor, createdAts);
    if (next === null || next === cursor) return;
    cursor = next;
    deps.onCursorChange?.(cursor);
    try {
      await deps.storage.setItem(RELAY_CURSOR_KEY, String(next));
    } catch {
      // fica em memória; grava de novo no próximo avanço
    }
  }

  function scheduleDrain(): void {
    if (drainScheduled || queue.length === 0) return;
    drainScheduled = true;
    void withLock(drainOnce).catch(() => {});
  }

  async function drainOnce(): Promise<void> {
    drainScheduled = false;
    while (queue.length > 0) {
      const atEpoch = epoch;
      const batch = queue;
      queue = [];
      let imported: number;
      try {
        imported = await deps.importEvents(batch.map((b) => b.event));
      } catch (err) {
        if (atEpoch !== epoch) return; // grupo trocado: o lote antigo não volta
        const retry: QueuedLive[] = [];
        for (const b of batch) {
          if (b.attempts + 1 < LIVE_MAX_ATTEMPTS) retry.push({ ...b, attempts: b.attempts + 1 });
          else warn(`[Sync] Evento ao vivo descartado após ${LIVE_MAX_ATTEMPTS} tentativas: id=${b.event.id}`);
        }
        queue = [...retry, ...queue];
        warn(`[Sync] Falha ao importar ${batch.length} evento(s) ao vivo: ${String(err)}`);
        // Sem laço quente: a próxima tentativa vem com o próximo evento ou pull.
        return;
      }
      await advance(
        batch.map((b) => b.createdAt),
        atEpoch,
      );
      if (atEpoch === epoch) deps.onLiveImported?.(imported);
    }
  }

  return {
    async load() {
      const atEpoch = epoch;
      const saved = await loadRelayCursor(deps.storage);
      if (atEpoch === epoch && saved !== null) {
        const next = advanceRelayCursor(cursor, [saved]);
        if (next !== cursor) {
          cursor = next;
          deps.onCursorChange?.(cursor);
        }
      }
      return cursor;
    },

    getCursor: () => cursor,

    liveSince: () => subscriptionSince(cursor, Math.floor(now() / 1000)),

    isImporting: () => held > 0,

    async runPull(request: P) {
      const atEpoch = epoch;
      try {
        const { events, maxCreatedAt } = await deps.pull(request);
        return await withLock(async () => {
          if (atEpoch !== epoch) return 0; // saiu do grupo durante a busca
          const imported = events.length > 0 ? await deps.importEvents(events) : 0;
          // O cursor anda pelo `created_at` do relay, mesmo sem nada novo.
          if (maxCreatedAt !== null) await advance([maxCreatedAt], atEpoch);
          return imported;
        });
      } finally {
        scheduleDrain();
      }
    },

    enqueueLive(event, createdAt) {
      queue.push({ event, createdAt, attempts: 0 });
      scheduleDrain();
    },

    async idle() {
      while (held > 0 || drainScheduled) {
        await tail;
        await Promise.resolve();
      }
    },

    async reset() {
      epoch++;
      cursor = null;
      queue = [];
      deps.onCursorChange?.(null);
      for (const key of [RELAY_CURSOR_KEY, LEGACY_LAST_PULL_TS_KEY]) {
        try {
          await deps.storage.removeItem(key);
        } catch {
          // a chave pode não existir
        }
      }
    },

    queueSize: () => queue.length,
  };
}
