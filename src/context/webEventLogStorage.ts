import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";
import type {
  SecretStorage,
  WebSecretStore,
} from "@/src/modules/security/infrastructure/webSecretStore";
import { appAlert } from "@/src/services/appAlert";

export const EVENTS_BACKUP_KEY = "domus_events_v1";
export const DEFAULT_WEB_LOG_SAVE_DEBOUNCE_MS = 250;

export const WEB_STORAGE_UNAVAILABLE_TITLE = "Armazenamento seguro indisponível";
export const WEB_STORAGE_UNAVAILABLE_MESSAGE =
  "Este navegador não suporta criptografia local (WebCrypto/IndexedDB). Por segurança, seus dados financeiros não serão guardados neste navegador e ficarão disponíveis apenas enquanto a aba estiver aberta.";

const CIPHERTEXT_PREFIX = "v1:";

export interface WebEventLogStorageDeps {
  secrets: WebSecretStore;
  storage: SecretStorage;
  showAppAlert: (title: string, message?: string) => void;
  debounceMs?: number;
}

export interface WebEventLogStorage {
  /**
   * Lê e decifra o log de eventos da web.
   * Se existir um log legado em texto puro em `storage`, migra-o automaticamente
   * para a forma cifrada (`v1:...`) via `secrets` sem perder eventos.
   */
  load(): Promise<unknown[]>;
  /**
   * Agenda uma gravação agrupada (debounced) do log de eventos.
   * Chamadas consecutivas dentro da janela de agrupamento são coalescidas em
   * uma única serialização e cifragem do estado mais recente.
   */
  scheduleSave(events: readonly SyncEvent[]): Promise<boolean>;
  /**
   * Cancela qualquer gravação agrupada pendente anterior e grava imediatamente
   * o snapshot fornecido de forma cifrada (usado em `restoreFromBackup` / `resetApp`).
   */
  saveImmediate(events: readonly SyncEvent[]): Promise<boolean>;
  /**
   * Força a execução imediata de qualquer gravação agrupada pendente e aguarda sua conclusão.
   */
  flush(): Promise<boolean>;
  /**
   * Limpa timers e estado em memória (para isolamento em testes unitários).
   */
  reset(): void;
}

export function createWebEventLogStorage(deps: WebEventLogStorageDeps): WebEventLogStorage {
  const debounceMs = deps.debounceMs ?? DEFAULT_WEB_LOG_SAVE_DEBOUNCE_MS;

  let generation = 0;
  let hasWarnedUnavailable = false;
  let inMemoryFallback: string | null = null;

  // Estado aguardando expiração do debounceTimer
  let scheduledEvents: readonly SyncEvent[] | null = null;
  let scheduledWaiters: ((ok: boolean) => void)[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Estado promovido para execução imediata em drainQueue()
  let readyEvents: readonly SyncEvent[] | null = null;
  let readyWaiters: ((ok: boolean) => void)[] = [];
  let activeWaiters: ((ok: boolean) => void)[] = [];
  let inFlightPromise: Promise<boolean> | null = null;

  function warnUnavailableOnce(): void {
    if (!hasWarnedUnavailable) {
      hasWarnedUnavailable = true;
      deps.showAppAlert(WEB_STORAGE_UNAVAILABLE_TITLE, WEB_STORAGE_UNAVAILABLE_MESSAGE);
    }
  }

  async function ensureNoPlaintextInStorage(): Promise<void> {
    try {
      const raw = await deps.storage.getItem(EVENTS_BACKUP_KEY);
      if (raw !== null && !raw.startsWith(CIPHERTEXT_PREFIX)) {
        await deps.storage.removeItem(EVENTS_BACKUP_KEY);
      }
    } catch {
      // Ignora erro na limpeza defensiva
    }
  }

  async function persistSnapshot(
    events: readonly SyncEvent[],
    gen: number
  ): Promise<boolean> {
    const serialized = JSON.stringify(events);
    if (gen !== generation) return false;

    try {
      const persisted = await deps.secrets.set(EVENTS_BACKUP_KEY, serialized);
      if (gen !== generation) return false;

      if (!persisted) {
        await ensureNoPlaintextInStorage();
        if (gen !== generation) return false;
        inMemoryFallback = serialized;
        warnUnavailableOnce();
        return false;
      }

      inMemoryFallback = null;
      return true;
    } catch (err) {
      if (gen !== generation) return false;
      console.warn("[webEventLogStorage] Falha ao cifrar/gravar log de eventos na web:", err);
      await ensureNoPlaintextInStorage();
      if (gen !== generation) return false;
      inMemoryFallback = serialized;
      warnUnavailableOnce();
      return false;
    }
  }

  function promoteScheduledToReady(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (scheduledEvents !== null) {
      readyEvents = scheduledEvents;
      readyWaiters.push(...scheduledWaiters);
      scheduledEvents = null;
      scheduledWaiters = [];
    }
  }

  function drainQueue(): Promise<boolean> {
    if (inFlightPromise) {
      return inFlightPromise;
    }

    const gen = generation;
    inFlightPromise = (async () => {
      let lastResult = true;
      try {
        while (readyEvents !== null && gen === generation) {
          const snapshot = readyEvents;
          const waitersBatch = readyWaiters;
          readyEvents = null;
          readyWaiters = [];
          activeWaiters = waitersBatch;

          // Cede o turno do event loop antes de serializar/cifrar para manter a UI fluida
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (gen !== generation) {
            return false;
          }

          // Se outro snapshot pronto chegou durante o yield (ex.: via saveImmediate ou flush),
          // coalesce em uma única cifra
          const finalSnapshot = readyEvents !== null ? readyEvents : snapshot;
          if (readyEvents !== null) {
            waitersBatch.push(...readyWaiters);
            readyEvents = null;
            readyWaiters = [];
          }

          lastResult = await persistSnapshot(finalSnapshot, gen);
          if (gen !== generation) {
            return false;
          }

          activeWaiters = [];
          for (const resolve of waitersBatch) {
            resolve(lastResult);
          }
        }
        return lastResult;
      } finally {
        if (gen === generation) {
          activeWaiters = [];
          inFlightPromise = null;
        }
      }
    })();

    return inFlightPromise;
  }

  function scheduleSave(events: readonly SyncEvent[]): Promise<boolean> {
    scheduledEvents = events;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    return new Promise<boolean>((resolve) => {
      scheduledWaiters.push(resolve);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        promoteScheduledToReady();
        void drainQueue();
      }, debounceMs);
    });
  }

  function saveImmediate(events: readonly SyncEvent[]): Promise<boolean> {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // Descarta snapshot agendado mais antigo, mas preserva suas promises para resolverem junto
    if (scheduledWaiters.length > 0) {
      readyWaiters.push(...scheduledWaiters);
      scheduledWaiters = [];
    }
    scheduledEvents = null;
    readyEvents = events;

    return new Promise<boolean>((resolve) => {
      readyWaiters.push(resolve);
      void drainQueue();
    });
  }

  async function flush(): Promise<boolean> {
    promoteScheduledToReady();
    if (readyEvents !== null || inFlightPromise !== null) {
      return drainQueue();
    }
    return true;
  }

  async function load(): Promise<unknown[]> {
    if (debounceTimer !== null || scheduledEvents !== null || readyEvents !== null || inFlightPromise !== null) {
      await flush();
    }

    let rawInStorage: string | null = null;
    try {
      rawInStorage = await deps.storage.getItem(EVENTS_BACKUP_KEY);
    } catch {
      rawInStorage = null;
    }

    // Migração de log legado em texto puro (sem prefixo "v1:")
    if (rawInStorage !== null && !rawInStorage.startsWith(CIPHERTEXT_PREFIX)) {
      let parsedLegacy: unknown = null;
      let isValidArray = false;
      try {
        parsedLegacy = JSON.parse(rawInStorage);
        isValidArray = Array.isArray(parsedLegacy);
      } catch {
        isValidArray = false;
      }

      if (!isValidArray) {
        await ensureNoPlaintextInStorage();
        return [];
      }

      let migratedOk = false;
      try {
        migratedOk = await deps.secrets.set(EVENTS_BACKUP_KEY, rawInStorage);
      } catch (err) {
        console.warn("[webEventLogStorage] Falha ao migrar log legado para webSecrets:", err);
        migratedOk = false;
      }

      await ensureNoPlaintextInStorage();
      if (!migratedOk) {
        inMemoryFallback = rawInStorage;
        warnUnavailableOnce();
      } else {
        inMemoryFallback = null;
      }

      return parsedLegacy as unknown[];
    }

    // Se a última tentativa de gravação nesta sessão falhou e ficou retida em memória,
    // prioriza o estado mais recente da sessão em memória sobre qualquer ciphertext antigo
    if (inMemoryFallback !== null) {
      try {
        const parsed = JSON.parse(inMemoryFallback);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    let decrypted: string | null = null;
    try {
      decrypted = await deps.secrets.get(EVENTS_BACKUP_KEY);
    } catch (err) {
      console.warn("[webEventLogStorage] Falha ao ler log cifrado do webSecrets:", err);
      decrypted = null;
    }

    if (!decrypted) return [];

    try {
      const parsed = JSON.parse(decrypted);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function reset(): void {
    generation += 1;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const allWaiters = [...scheduledWaiters, ...readyWaiters, ...activeWaiters];
    scheduledWaiters = [];
    readyWaiters = [];
    activeWaiters = [];
    scheduledEvents = null;
    readyEvents = null;
    inFlightPromise = null;
    inMemoryFallback = null;
    hasWarnedUnavailable = false;
    for (const resolve of allWaiters) {
      resolve(false);
    }
  }

  return {
    load,
    scheduleSave,
    saveImmediate,
    flush,
    reset,
  };
}

const defaultInstance = createWebEventLogStorage({
  secrets: webSecrets,
  storage: AsyncStorage,
  showAppAlert: appAlert,
});

export function loadWebEventLog(): Promise<unknown[]> {
  return defaultInstance.load();
}

export function scheduleWebEventLogSave(events: readonly SyncEvent[]): Promise<boolean> {
  return defaultInstance.scheduleSave(events);
}

export function saveWebEventLogImmediate(events: readonly SyncEvent[]): Promise<boolean> {
  return defaultInstance.saveImmediate(events);
}

export function flushWebEventLogSave(): Promise<boolean> {
  return defaultInstance.flush();
}

export function _resetWebEventLogState(): void {
  defaultInstance.reset();
}
