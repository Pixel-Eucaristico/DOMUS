import React, { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { SQLiteEventStore } from "@packages/storage/src/eventStore";
import { selectEventsToImport } from "@/src/modules/syncPayload";
import { isBlankDeviceId, prepareBackupForStorage, prepareLocalLog } from "@/src/context/localEventLog";

const DEVICE_ID_KEY = "domus_device_id";
const EVENTS_BACKUP_KEY = "domus_events_v1";

function generateDeviceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

let eventStoreInstance: SQLiteEventStore | null = null;
let initializationInProgress = false;

export async function getEventStore(): Promise<SQLiteEventStore | null> {
  if (Platform.OS === "web") return null;
  if (eventStoreInstance) return eventStoreInstance;
  if (initializationInProgress) {
    // Wait up to 3s for concurrent init to finish
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (eventStoreInstance) return eventStoreInstance;
    }
    return null;
  }

  initializationInProgress = true;
  // Retry up to 3 times with 200ms delay (SQLite NativeDatabase race on Android startup)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 200 * attempt));
      const { createSQLiteAdapter } = await import("@packages/storage/src/sqliteAdapter");
      const adapter = await createSQLiteAdapter("domus.db");
      const store = new SQLiteEventStore(adapter);
      store.initDatabase();
      eventStoreInstance = store;
      initializationInProgress = false;
      return eventStoreInstance;
    } catch (err) {
      console.warn(`[EventStore] Init attempt ${attempt + 1} failed:`, err);
    }
  }
  initializationInProgress = false;
  return null;
}

export interface EventStoreState {
  allEvents: SyncEvent[];
  setAllEvents: React.Dispatch<React.SetStateAction<SyncEvent[]>>;
  allEventsRef: React.MutableRefObject<SyncEvent[]>;
  deviceId: string | null;
  loading: boolean;
  localEventCount: number;
  setLocalEventCount: React.Dispatch<React.SetStateAction<number>>;
  dispatch: (event: SyncEvent) => void;
  importEvents: (events: SyncEvent[]) => Promise<number>;
  restoreFromBackup: (events: SyncEvent[]) => Promise<void>;
  resetApp: () => Promise<void>;
  getAllEvents: () => SyncEvent[];
}

interface EventStoreOptions {
  isDemoActive: boolean;
  dispatchDemoEvent: (event: any) => void;
}

export function useEventStore({ isDemoActive, dispatchDemoEvent }: EventStoreOptions): EventStoreState {
  const [allEvents, setAllEvents] = useState<SyncEvent[]>([]);
  const allEventsRef = React.useRef(allEvents);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [localEventCount, setLocalEventCount] = useState(0);

  // Keep ref in sync + web backup
  useEffect(() => {
    allEventsRef.current = allEvents;
    if (Platform.OS === "web" && allEvents.length > 0) {
      AsyncStorage.setItem(EVENTS_BACKUP_KEY, JSON.stringify(allEvents));
    }
  }, [allEvents]);

  // Hydrate from SQLite/AsyncStorage
  useEffect(() => {
    let mounted = true;
    
    // Safety timeout: force loading to false after 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[EventStore] Safety timeout reached, forcing loading to false");
        setLoading(false);
      }
    }, 5000);

    (async () => {
      try {
        let did = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!did) {
          did = generateDeviceId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, did);
        }
        if (mounted) setDeviceId(did);

        let events: unknown = [];
        if (Platform.OS === "web") {
          const backup = await AsyncStorage.getItem(EVENTS_BACKUP_KEY);
          if (backup) {
            try { events = JSON.parse(backup); } catch {}
          }
        } else {
          const store = await getEventStore();
          if (store) events = store.getAllEvents();
        }

        if (mounted) {
          // Story 3.2: item que não é objeto é pulado (não derruba o log inteiro).
          // Story 3.4: normaliza, deduplica e reordena ("local" → id do aparelho muda o
          // desempate); eventos despachados antes do fim da hidratação são mantidos.
          const prepared = prepareLocalLog(events, did);
          if (prepared.skippedIndexes.length > 0) {
            console.warn(`[EventStore] Itens ignorados na hidratação (não são objeto), índices: ${prepared.skippedIndexes.join(", ")}`);
          }
          setAllEvents((prev) =>
            prev.length === 0 ? prepared.events : prepareLocalLog([...prepared.events, ...prev], did).events,
          );
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      } catch (err) {
        console.error("[EventStore] Hydration error:", err);
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    })();
    return () => { 
      mounted = false;
      clearTimeout(safetyTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hidratação roda uma única vez na montagem; 'loading' no safety timeout é só guarda do estado inicial
  }, []);

  const dispatch = useCallback(
    (syncEvt: SyncEvent) => {
      if (isDemoActive) {
        dispatchDemoEvent({
          id: syncEvt.id,
          type: syncEvt.type,
          payload: syncEvt.payload,
          timestamp: syncEvt.timestamp,
        });
        return;
      }

      // Story 3.4: carimba o id do aparelho já na criação (quando conhecido), para que
      // o evento não mude de posição ao reabrir o app nem saia como "local".
      const evt = deviceId && isBlankDeviceId(syncEvt.deviceId) ? { ...syncEvt, deviceId } : syncEvt;

      getEventStore().then((store) => {
        store?.appendEvent(evt);
      });

      setAllEvents((prev) => prepareLocalLog([...prev, evt], deviceId).events);
      setLocalEventCount((c) => c + 1);
    },
    [isDemoActive, dispatchDemoEvent, deviceId],
  );

  const importEvents = useCallback(
    async (events: SyncEvent[]): Promise<number> => {
      if (isDemoActive) return 0;
      const store = await getEventStore();
      const existingIds = new Set(allEventsRef.current.map((e) => e.id));
      // Story 3.1: revalida o envelope antes de gravar; malformados são descartados.
      const { toAppend: newEvents } = selectEventsToImport(events, existingIds);
      for (const evt of newEvents) {
        store?.appendEvent(evt);
      }

      if (newEvents.length > 0) {
        // Story 3.4: mesma normalização, deduplicação e ordem da hidratação.
        setAllEvents((prev) => prepareLocalLog([...prev, ...newEvents], deviceId).events);
      }
      return newEvents.length;
    },
    [isDemoActive, deviceId],
  );

  const restoreFromBackup = useCallback(async (events: SyncEvent[]): Promise<void> => {
    if (isDemoActive) return;
    // Story 3.2: item que não é objeto é pulado; o resto é gravado como veio do backup
    // e, em memória, recebe a mesma normalização da hidratação (deviceId, payload em texto).
    // Story 3.4: sem ids repetidos (fica o primeiro, como o INSERT OR IGNORE), timestamp
    // em texto numérico como número, na ordem total.
    const { events: sorted, skippedIndexes: skipped, duplicateIds } = prepareBackupForStorage(events);
    if (skipped.length > 0) {
      console.warn(`[EventStore] Itens ignorados na restauração (não são objeto), índices: ${skipped.join(", ")}`);
    }
    if (duplicateIds.length > 0) {
      console.warn(`[EventStore] Ids repetidos ignorados na restauração: ${duplicateIds.length}`);
    }
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(EVENTS_BACKUP_KEY, JSON.stringify(sorted));
    } else {
      const store = await getEventStore();
      if (store) {
        store.clearAllEvents();
        for (const evt of sorted) store.appendEvent(evt);
      }
    }
    // Story 3.4: reordena depois de normalizar ("local" → id do aparelho muda o desempate).
    setAllEvents(prepareLocalLog(sorted, deviceId).events);
  }, [isDemoActive, deviceId]);

  const resetApp = useCallback(async (): Promise<void> => {
    await restoreFromBackup([]);
    if (Platform.OS !== "web") {
      try {
        const { SecureStorageService } = await import(
          "@/src/modules/security/infrastructure/SecureStorageService"
        );
        await SecureStorageService.delete("domus_security_settings_v1");
      } catch {}
    }
  }, [restoreFromBackup]);

  const getAllEvents = useCallback(() => allEvents, [allEvents]);

  return {
    allEvents,
    setAllEvents,
    allEventsRef,
    deviceId,
    loading,
    localEventCount,
    setLocalEventCount,
    dispatch,
    importEvents,
    restoreFromBackup,
    resetApp,
    getAllEvents,
  };
}
