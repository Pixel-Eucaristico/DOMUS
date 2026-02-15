import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { Platform, Alert, AppState as RNAppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppState } from "@/src/context/AppStateProvider";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const DEVICE_ID_KEY = "domus_device_id";
const LAST_SYNC_KEY = "domus_last_sync_ts";
const GROUP_ID_KEY = "domus_sync_group_id";
const SERVER_TS_KEY = "domus_sync_server_ts";

const PULL_INTERVAL_MS = 10_000;

type SyncStatus = "idle" | "syncing" | "connected" | "offline" | "error";

interface SyncContextValue {
  deviceId: string | null;
  groupId: string | null;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  errorMessage: string | null;
  eventCount: number;
  peerCount: number;
  isAutoSyncEnabled: boolean;
  createGroup: () => Promise<string | null>;
  joinGroup: (code: string) => Promise<boolean>;
  leaveGroup: () => Promise<void>;
  pushNow: () => Promise<void>;
  pullNow: () => Promise<number>;
  resetStatus: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

function generateDeviceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

async function loadOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
  } catch {}
  const id = generateDeviceId();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {}
  return id;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getAllEvents, importEvents } = useAppState();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [serverTs, setServerTs] = useState(0);

  const pullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPushCountRef = useRef(0);

  const allEvents = getAllEvents();
  const eventCount = allEvents.length;

  const isAutoSyncEnabled = !!groupId;

  useEffect(() => {
    loadOrCreateDeviceId().then(setDeviceId);
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
    AsyncStorage.getItem(GROUP_ID_KEY).then((val) => {
      if (val) setGroupId(val);
    });
    AsyncStorage.getItem(SERVER_TS_KEY).then((val) => {
      if (val) setServerTs(parseInt(val, 10));
    });
  }, []);

  const saveLastSync = useCallback(async (ts: number) => {
    setLastSyncTime(ts);
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString());
    } catch {}
  }, []);

  const saveServerTs = useCallback(async (ts: number) => {
    setServerTs(ts);
    try {
      await AsyncStorage.setItem(SERVER_TS_KEY, ts.toString());
    } catch {}
  }, []);

  const pushEvents = useCallback(
    async (gid: string, did: string, events: SyncEvent[]) => {
      if (events.length === 0) return;
      try {
        const res = await apiRequest("POST", "/api/sync/push", {
          groupId: gid,
          deviceId: did,
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            payload: e.payload,
            timestamp: e.timestamp,
            deviceId: e.deviceId,
            signature: e.signature || "",
          })),
        });
        const data = await res.json();
        if (data.serverTimestamp) {
          await saveServerTs(data.serverTimestamp);
        }
      } catch (err) {
        console.log("Push failed:", err);
        throw err;
      }
    },
    [saveServerTs],
  );

  const pullEvents = useCallback(
    async (gid: string, did: string, since: number): Promise<number> => {
      try {
        const url = `/api/sync/pull?groupId=${encodeURIComponent(gid)}&deviceId=${encodeURIComponent(did)}&since=${since}`;
        const res = await apiRequest("GET", url);
        const data = await res.json();

        if (data.serverTimestamp) {
          await saveServerTs(data.serverTimestamp);
        }

        if (data.events && data.events.length > 0) {
          const syncEvents: SyncEvent[] = data.events.map((e: any) => ({
            id: e.id,
            type: e.type,
            payload: e.payload,
            timestamp: e.timestamp,
            deviceId: e.deviceId,
            signature: e.signature || "",
          }));

          const imported = await importEvents(syncEvents);
          if (imported > 0) {
            await saveLastSync(Date.now());
          }
          return imported;
        }

        return 0;
      } catch (err) {
        console.log("Pull failed:", err);
        throw err;
      }
    },
    [importEvents, saveLastSync, saveServerTs],
  );

  const doSync = useCallback(async () => {
    if (!groupId || !deviceId) return;

    try {
      const currentEvents = getAllEvents();
      const newEvents = currentEvents.slice(lastPushCountRef.current);

      if (newEvents.length > 0) {
        await pushEvents(groupId, deviceId, newEvents);
        lastPushCountRef.current = currentEvents.length;
      }

      await pullEvents(groupId, deviceId, serverTs);
      setSyncStatus("connected");
      setErrorMessage(null);
    } catch {
      setSyncStatus("offline");
    }
  }, [groupId, deviceId, getAllEvents, pushEvents, pullEvents, serverTs]);

  useEffect(() => {
    if (!groupId || !deviceId) {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
      return;
    }

    doSync();

    pullTimerRef.current = setInterval(doSync, PULL_INTERVAL_MS);

    return () => {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
    };
  }, [groupId, deviceId, doSync]);

  useEffect(() => {
    if (!groupId || !deviceId) return;

    if (eventCount > lastPushCountRef.current) {
      pushEvents(groupId, deviceId, allEvents.slice(lastPushCountRef.current))
        .then(() => {
          lastPushCountRef.current = eventCount;
          setSyncStatus("connected");
        })
        .catch(() => setSyncStatus("offline"));
    }
  }, [eventCount, groupId, deviceId, allEvents, pushEvents]);

  useEffect(() => {
    if (!groupId || !deviceId) return;

    const sub = RNAppState.addEventListener("change", (state) => {
      if (state === "active") {
        doSync();
      }
    });

    return () => sub.remove();
  }, [groupId, deviceId, doSync]);

  useEffect(() => {
    if (!groupId) {
      setPeerCount(0);
      return;
    }

    const fetchPeers = async () => {
      try {
        const res = await apiRequest("GET", `/api/sync/groups/${groupId}/devices`);
        const data = await res.json();
        setPeerCount(data.devices?.length || 0);
      } catch {}
    };

    fetchPeers();
    const timer = setInterval(fetchPeers, 30_000);
    return () => clearInterval(timer);
  }, [groupId]);

  const createGroup = useCallback(async (): Promise<string | null> => {
    if (!deviceId) return null;

    try {
      setSyncStatus("syncing");
      const res = await apiRequest("POST", "/api/sync/groups", { deviceId });
      const data = await res.json();

      if (data.groupId) {
        setGroupId(data.groupId);
        await AsyncStorage.setItem(GROUP_ID_KEY, data.groupId);
        lastPushCountRef.current = 0;

        const currentEvents = getAllEvents();
        if (currentEvents.length > 0) {
          await pushEvents(data.groupId, deviceId, currentEvents);
          lastPushCountRef.current = currentEvents.length;
        }

        setSyncStatus("connected");
        await saveLastSync(Date.now());
        return data.groupId;
      }

      setSyncStatus("error");
      setErrorMessage("Falha ao criar grupo");
      return null;
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage("Sem conexao com o servidor");
      return null;
    }
  }, [deviceId, getAllEvents, pushEvents, saveLastSync]);

  const joinGroup = useCallback(
    async (code: string): Promise<boolean> => {
      if (!deviceId) return false;

      try {
        setSyncStatus("syncing");
        const res = await apiRequest("POST", `/api/sync/groups/${code}/join`, { deviceId });
        const data = await res.json();

        if (data.joined) {
          setGroupId(data.groupId);
          await AsyncStorage.setItem(GROUP_ID_KEY, data.groupId);
          lastPushCountRef.current = 0;

          const currentEvents = getAllEvents();
          if (currentEvents.length > 0) {
            await pushEvents(data.groupId, deviceId, currentEvents);
            lastPushCountRef.current = currentEvents.length;
          }

          await pullEvents(data.groupId, deviceId, 0);
          setSyncStatus("connected");
          await saveLastSync(Date.now());
          return true;
        }

        setSyncStatus("error");
        setErrorMessage("Codigo de grupo invalido");
        return false;
      } catch (err) {
        setSyncStatus("error");
        setErrorMessage("Grupo nao encontrado ou sem conexao");
        return false;
      }
    },
    [deviceId, getAllEvents, pushEvents, pullEvents, saveLastSync],
  );

  const leaveGroup = useCallback(async () => {
    setGroupId(null);
    setSyncStatus("idle");
    setErrorMessage(null);
    setPeerCount(0);
    setServerTs(0);
    lastPushCountRef.current = 0;
    await AsyncStorage.removeItem(GROUP_ID_KEY);
    await AsyncStorage.removeItem(SERVER_TS_KEY);
  }, []);

  const pushNow = useCallback(async () => {
    if (!groupId || !deviceId) return;
    try {
      setSyncStatus("syncing");
      const events = getAllEvents();
      await pushEvents(groupId, deviceId, events);
      lastPushCountRef.current = events.length;
      setSyncStatus("connected");
      await saveLastSync(Date.now());
    } catch {
      setSyncStatus("offline");
    }
  }, [groupId, deviceId, getAllEvents, pushEvents, saveLastSync]);

  const pullNow = useCallback(async (): Promise<number> => {
    if (!groupId || !deviceId) return 0;
    try {
      setSyncStatus("syncing");
      const count = await pullEvents(groupId, deviceId, serverTs);
      setSyncStatus("connected");
      return count;
    } catch {
      setSyncStatus("offline");
      return 0;
    }
  }, [groupId, deviceId, pullEvents, serverTs]);

  const resetStatus = useCallback(() => {
    setSyncStatus(groupId ? "connected" : "idle");
    setErrorMessage(null);
  }, [groupId]);

  const value = useMemo<SyncContextValue>(
    () => ({
      deviceId,
      groupId,
      syncStatus,
      lastSyncTime,
      errorMessage,
      eventCount,
      peerCount,
      isAutoSyncEnabled,
      createGroup,
      joinGroup,
      leaveGroup,
      pushNow,
      pullNow,
      resetStatus,
    }),
    [
      deviceId,
      groupId,
      syncStatus,
      lastSyncTime,
      errorMessage,
      eventCount,
      peerCount,
      isAutoSyncEnabled,
      createGroup,
      joinGroup,
      leaveGroup,
      pushNow,
      pullNow,
      resetStatus,
    ],
  );

  return (
    <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return ctx;
}
