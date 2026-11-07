/**
 * Story 4.6: Rastreamento operacional de eventos por grupo de sincronização.
 * Módulo puro, sem dependências de React ou React Native, testável no Vitest.
 * Persistido estritamente em armazenamento de infraestrutura (AsyncStorage).
 */

export const SYNC_GROUP_TRACKING_KEY = "domus_sync_group_tracking_v1";

export type EventGroupStatus = "published" | "received";

export interface GroupTrackingData {
  /** IDs de eventos publicados neste grupo */
  p: string[];
  /** IDs de eventos recebidos deste grupo */
  r: string[];
}

export interface SyncGroupTrackingRecord {
  version: 1;
  groups: Record<string, GroupTrackingData>;
}

export interface SyncGroupTrackingStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SyncGroupTrackerOptions {
  storage?: SyncGroupTrackingStorage;
  key?: string;
  warn?: (message: string) => void;
}

interface GroupSets {
  published: Set<string>;
  received: Set<string>;
}

export interface SyncGroupTracker {
  /** Carrega o estado salvo no storage configurado */
  load(): Promise<void>;
  /** Força a persistência imediata do estado atual em storage */
  save(): Promise<void>;
  /** Retorna true se o evento deve ser publicado no grupo (ainda não publicado nem recebido dele) */
  shouldPublish(eventId: string, groupId: string): boolean;
  /** Retorna true se o evento já foi publicado neste grupo */
  hasPublished(eventId: string, groupId: string): boolean;
  /** Retorna true se o evento já foi recebido deste grupo */
  hasReceived(eventId: string, groupId: string): boolean;
  /** Retorna o status operacional do evento para o grupo informado ("published", "received" ou null) */
  getStatus(eventId: string, groupId: string): EventGroupStatus | null;
  /** Filtra lista de eventos mantendo apenas os que devem ser publicados no grupo */
  filterEventsToPublish<T extends { id: string }>(events: readonly T[], groupId: string): T[];
  /** Registra eventos como publicados no grupo com persistência assíncrona */
  markPublished(eventIds: readonly string[] | string, groupId: string): Promise<void>;
  /** Registra eventos como recebidos do grupo com persistência assíncrona */
  markReceived(eventIds: readonly string[] | string, groupId: string): Promise<void>;
  /** Limpa o registro de um grupo específico */
  clearGroup(groupId: string): Promise<void>;
  /** Limpa todo o registro de todos os grupos */
  clearAll(): Promise<void>;
  /** Lista os grupos com rastreamento registrado */
  getTrackedGroups(): string[];
  /** Lista os IDs de eventos publicados no grupo */
  getPublishedEvents(groupId: string): string[];
  /** Lista os IDs de eventos recebidos do grupo */
  getReceivedEvents(groupId: string): string[];
  /** Retorna uma cópia serializável do estado atual */
  dump(): SyncGroupTrackingRecord;
}

export function createSyncGroupTracker(
  optionsOrStorage?: SyncGroupTrackerOptions | SyncGroupTrackingStorage,
): SyncGroupTracker {
  let storage: SyncGroupTrackingStorage | undefined;
  let key = SYNC_GROUP_TRACKING_KEY;
  let warn: (message: string) => void = (m) => console.warn(m);

  if (optionsOrStorage) {
    if ("getItem" in optionsOrStorage && typeof optionsOrStorage.getItem === "function") {
      storage = optionsOrStorage;
    } else {
      const opts = optionsOrStorage as SyncGroupTrackerOptions;
      storage = opts.storage;
      if (opts.key) key = opts.key;
      if (opts.warn) warn = opts.warn;
    }
  }

  const groups = new Map<string, GroupSets>();

  function getOrCreateGroup(groupId: string): GroupSets {
    let group = groups.get(groupId);
    if (!group) {
      group = { published: new Set<string>(), received: new Set<string>() };
      groups.set(groupId, group);
    }
    return group;
  }

  function dump(): SyncGroupTrackingRecord {
    const exported: Record<string, GroupTrackingData> = {};
    for (const [gid, g] of groups.entries()) {
      exported[gid] = {
        p: Array.from(g.published),
        r: Array.from(g.received),
      };
    }
    return {
      version: 1,
      groups: exported,
    };
  }

  let savePromise: Promise<void> | null = null;
  let dirty = false;

  async function triggerSave(): Promise<void> {
    if (!storage) return;
    dirty = true;
    if (savePromise) {
      return savePromise;
    }

    savePromise = (async () => {
      while (dirty) {
        dirty = false;
        const snapshot = dump();
        try {
          await storage.setItem(key, JSON.stringify(snapshot));
        } catch (err) {
          warn(`[SyncGroupTracker] Falha ao persistir rastreamento: ${String(err)}`);
        }
      }
    })().finally(() => {
      savePromise = null;
    });

    return savePromise;
  }

  return {
    async load(): Promise<void> {
      if (!storage) return;
      try {
        const raw = await storage.getItem(key);
        if (!raw) {
          groups.clear();
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          warn("[SyncGroupTracker] JSON corrompido no storage; reinicializando registro.");
          groups.clear();
          return;
        }

        if (
          !parsed ||
          typeof parsed !== "object" ||
          (parsed as { version?: unknown }).version !== 1 ||
          typeof (parsed as { groups?: unknown }).groups !== "object" ||
          (parsed as { groups?: unknown }).groups === null
        ) {
          warn("[SyncGroupTracker] Estrutura inválida no storage; reinicializando registro.");
          groups.clear();
          return;
        }

        groups.clear();
        const record = parsed as SyncGroupTrackingRecord;
        for (const [gid, data] of Object.entries(record.groups)) {
          if (!data || typeof data !== "object") continue;
          const pList = Array.isArray(data.p)
            ? data.p.filter((x): x is string => typeof x === "string")
            : [];
          const rList = Array.isArray(data.r)
            ? data.r.filter((x): x is string => typeof x === "string")
            : [];
          groups.set(gid, {
            published: new Set<string>(pList),
            received: new Set<string>(rList),
          });
        }
      } catch (err) {
        warn(`[SyncGroupTracker] Erro ao carregar do storage: ${String(err)}; mantendo estado em memória.`);
      }
    },

    save(): Promise<void> {
      dirty = true;
      return triggerSave();
    },

    shouldPublish(eventId: string, groupId: string): boolean {
      if (!eventId || !groupId) return false;
      const group = groups.get(groupId);
      if (!group) return true;
      return !group.published.has(eventId) && !group.received.has(eventId);
    },

    hasPublished(eventId: string, groupId: string): boolean {
      if (!eventId || !groupId) return false;
      const group = groups.get(groupId);
      return group ? group.published.has(eventId) : false;
    },

    hasReceived(eventId: string, groupId: string): boolean {
      if (!eventId || !groupId) return false;
      const group = groups.get(groupId);
      return group ? group.received.has(eventId) : false;
    },

    getStatus(eventId: string, groupId: string): EventGroupStatus | null {
      if (!eventId || !groupId) return null;
      const group = groups.get(groupId);
      if (!group) return null;
      if (group.published.has(eventId)) return "published";
      if (group.received.has(eventId)) return "received";
      return null;
    },

    filterEventsToPublish<T extends { id: string }>(events: readonly T[], groupId: string): T[] {
      if (!groupId) return [...events];
      const group = groups.get(groupId);
      return events.filter(
        (e) =>
          Boolean(e) &&
          typeof e.id === "string" &&
          e.id.length > 0 &&
          (!group || (!group.published.has(e.id) && !group.received.has(e.id))),
      );
    },

    async markPublished(eventIds: readonly string[] | string, groupId: string): Promise<void> {
      if (!groupId) return;
      const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
      if (ids.length === 0) return;

      const group = getOrCreateGroup(groupId);
      let added = false;
      for (const id of ids) {
        if (typeof id === "string" && id.length > 0 && !group.published.has(id)) {
          group.published.add(id);
          added = true;
        }
      }

      if (added) {
        await triggerSave();
      }
    },

    async markReceived(eventIds: readonly string[] | string, groupId: string): Promise<void> {
      if (!groupId) return;
      const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
      if (ids.length === 0) return;

      const group = getOrCreateGroup(groupId);
      let added = false;
      for (const id of ids) {
        if (
          typeof id === "string" &&
          id.length > 0 &&
          !group.published.has(id) &&
          !group.received.has(id)
        ) {
          group.received.add(id);
          added = true;
        }
      }

      if (added) {
        await triggerSave();
      }
    },

    async clearGroup(groupId: string): Promise<void> {
      if (!groupId) return;
      if (groups.has(groupId)) {
        groups.delete(groupId);
        await triggerSave();
      }
    },

    async clearAll(): Promise<void> {
      groups.clear();
      dirty = false;
      if (savePromise) {
        try {
          await savePromise;
        } catch {}
      }
      if (storage) {
        try {
          await storage.removeItem(key);
        } catch (err) {
          warn(`[SyncGroupTracker] Falha ao remover dados do storage: ${String(err)}`);
        }
      }
    },

    getTrackedGroups(): string[] {
      return Array.from(groups.keys());
    },

    getPublishedEvents(groupId: string): string[] {
      const g = groups.get(groupId);
      return g ? Array.from(g.published) : [];
    },

    getReceivedEvents(groupId: string): string[] {
      const g = groups.get(groupId);
      return g ? Array.from(g.received) : [];
    },

    dump,
  };
}
