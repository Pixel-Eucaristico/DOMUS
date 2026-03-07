import React, { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { SQLiteEventStore } from "@packages/storage/src/eventStore";

const DEVICE_ID_KEY = "domus_device_id";
const EVENTS_BACKUP_KEY = "domus_events_v1";

function generateDeviceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

let eventStoreInstance: SQLiteEventStore | null = null;

export async function getEventStore(): Promise<SQLiteEventStore | null> {
  if (Platform.OS === "web") return null;
  if (eventStoreInstance) return eventStoreInstance;

  try {
    const { createSQLiteAdapter } = await import("@packages/storage/src/sqliteAdapter");
    const adapter = await createSQLiteAdapter("domus.db");
    eventStoreInstance = new SQLiteEventStore(adapter);
    eventStoreInstance.initDatabase();
    return eventStoreInstance;
  } catch {
    return null;
  }
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

        let events: SyncEvent[] = [];
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
          const migratedEvents = events.map((e) => {
            if (e.deviceId === "local" || !e.deviceId) {
              return { ...e, deviceId: did || "local" };
            }
            return e;
          });
          setAllEvents(migratedEvents);
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

      getEventStore().then((store) => {
        store?.appendEvent(syncEvt);
      });

      setAllEvents((prev) => {
        const next = [...prev, syncEvt];
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
      setLocalEventCount((c) => c + 1);
    },
    [isDemoActive, dispatchDemoEvent],
  );

  const importEvents = useCallback(
    async (events: SyncEvent[]): Promise<number> => {
      if (isDemoActive) return 0;
      const store = await getEventStore();
      const existingIds = new Set(allEventsRef.current.map((e) => e.id));
      const newEvents: SyncEvent[] = [];

      for (const evt of events) {
        if (!existingIds.has(evt.id)) {
          store?.appendEvent(evt);
          newEvents.push(evt);
          existingIds.add(evt.id);
        }
      }

      if (newEvents.length > 0) {
        setAllEvents((prev) => {
          const merged = [...prev, ...newEvents];
          merged.sort((a, b) => a.timestamp - b.timestamp);
          return merged;
        });
      }
      return newEvents.length;
    },
    [isDemoActive],
  );

  const restoreFromBackup = useCallback(async (events: SyncEvent[]): Promise<void> => {
    if (isDemoActive) return;
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(EVENTS_BACKUP_KEY, JSON.stringify(sorted));
    } else {
      const store = await getEventStore();
      if (store) {
        store.clearAllEvents();
        for (const evt of sorted) store.appendEvent(evt);
      }
    }
    setAllEvents(sorted);
  }, [isDemoActive]);

  const resetApp = useCallback(async (): Promise<void> => {
    await restoreFromBackup([]);
    if (Platform.OS !== "web") {
      try {
        const { SecureStorageService } = await import(
          "@/src/modules/security/infrastructure/SecureStorageService"
        );
        await SecureStorageService.delete("domus_security_settings_v1");
      } catch (_) {}
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
