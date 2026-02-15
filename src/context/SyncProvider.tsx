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
import { Platform, AppState as RNAppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  deriveKeysFromCode,
  publishSyncEvents,
  pullSyncEvents,
  subscribeToSyncEvents,
  closePool,
  getRelays,
  testRelayConnection,
  type NostrSyncKeys,
} from "@/src/modules/nostrSync";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { SubCloser } from "nostr-tools/pool";

const DEVICE_ID_KEY = "domus_device_id";
const LAST_SYNC_KEY = "domus_last_sync_ts";
const GROUP_CODE_KEY = "domus_nostr_group_code";
const LAST_PULL_TS_KEY = "domus_nostr_last_pull_ts";
const LAST_PUSH_HASH_KEY = "domus_nostr_last_push_hash";

const PULL_INTERVAL_MS = 8_000;

type SyncStatus = "idle" | "syncing" | "connected" | "offline" | "error";

interface SyncContextValue {
  deviceId: string | null;
  groupId: string | null;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  errorMessage: string | null;
  eventCount: number;
  relayCount: number;
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

function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

function computeEventHash(events: SyncEvent[]): string {
  if (events.length === 0) return "empty";
  const ids = events.map((e) => e.id).sort().join(",");
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    const c = ids.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return `${events.length}-${hash.toString(36)}`;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getAllEvents, importEvents } = useAppState();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPullTs, setLastPullTs] = useState(0);

  const pullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRef = useRef<SubCloser | null>(null);
  const keysRef = useRef<NostrSyncKeys | null>(null);
  const lastPushHashRef = useRef<string>("empty");
  const isImportingRef = useRef(false);

  const allEvents = getAllEvents();
  const eventCount = allEvents.length;
  const relayCount = getRelays().length;

  const isAutoSyncEnabled = !!groupCode;

  useEffect(() => {
    loadOrCreateDeviceId().then(setDeviceId);
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
    AsyncStorage.getItem(GROUP_CODE_KEY).then(async (val) => {
      if (val) {
        setGroupCode(val);
        keysRef.current = await deriveKeysFromCode(val);
      }
    });
    AsyncStorage.getItem(LAST_PULL_TS_KEY).then((val) => {
      if (val) setLastPullTs(parseInt(val, 10));
    });
    AsyncStorage.getItem(LAST_PUSH_HASH_KEY).then((val) => {
      if (val) lastPushHashRef.current = val;
    });

    return () => {
      closePool();
    };
  }, []);

  const saveLastSync = useCallback(async (ts: number) => {
    setLastSyncTime(ts);
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString());
    } catch {}
  }, []);

  const saveLastPullTs = useCallback(async (ts: number) => {
    setLastPullTs(ts);
    try {
      await AsyncStorage.setItem(LAST_PULL_TS_KEY, ts.toString());
    } catch {}
  }, []);

  const getMyEvents = useCallback(
    (did: string): SyncEvent[] => {
      return getAllEvents().filter((e) => e.deviceId === did);
    },
    [getAllEvents],
  );

  const pushMyEvents = useCallback(
    async (keys: NostrSyncKeys, did: string, force: boolean = false) => {
      const myEvents = getMyEvents(did);
      if (myEvents.length === 0) return;

      const hash = computeEventHash(myEvents);
      if (!force && hash === lastPushHashRef.current) return;

      try {
        await publishSyncEvents(keys, did, myEvents);
        lastPushHashRef.current = hash;
        try {
          await AsyncStorage.setItem(LAST_PUSH_HASH_KEY, hash);
        } catch {}
      } catch (err) {
        console.log("Push to relays failed:", err);
        throw err;
      }
    },
    [getMyEvents],
  );

  const pullFromRelays = useCallback(
    async (keys: NostrSyncKeys, did: string, since: number): Promise<number> => {
      try {
        const syncEvents = await pullSyncEvents(keys, did, since);

        if (syncEvents.length > 0) {
          isImportingRef.current = true;
          const imported = await importEvents(syncEvents);
          isImportingRef.current = false;
          if (imported > 0) {
            const maxTs = Math.max(...syncEvents.map((e) => e.timestamp));
            await saveLastPullTs(maxTs);
            await saveLastSync(Date.now());
          }
          return imported;
        }

        return 0;
      } catch (err) {
        isImportingRef.current = false;
        console.log("Pull from relays failed:", err);
        throw err;
      }
    },
    [importEvents, saveLastSync, saveLastPullTs],
  );

  const doSync = useCallback(async () => {
    if (!groupCode || !deviceId || !keysRef.current) return;

    try {
      setSyncStatus("syncing");
      const keys = keysRef.current;

      await pushMyEvents(keys, deviceId);
      await pullFromRelays(keys, deviceId, lastPullTs);
      setSyncStatus("connected");
      setErrorMessage(null);
    } catch {
      setSyncStatus("offline");
    }
  }, [groupCode, deviceId, pushMyEvents, pullFromRelays, lastPullTs]);

  useEffect(() => {
    if (!groupCode || !deviceId || !keysRef.current) {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
      return;
    }

    doSync();

    pullTimerRef.current = setInterval(doSync, PULL_INTERVAL_MS);

    try {
      subRef.current = subscribeToSyncEvents(
        keysRef.current,
        deviceId,
        lastPullTs,
        async (event) => {
          try {
            isImportingRef.current = true;
            await importEvents([event]);
            isImportingRef.current = false;
            await saveLastSync(Date.now());
            setSyncStatus("connected");
          } catch {
            isImportingRef.current = false;
          }
        },
      );
    } catch {}

    return () => {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
    };
  }, [groupCode, deviceId]);

  useEffect(() => {
    if (!groupCode || !deviceId || !keysRef.current) return;
    if (isImportingRef.current) return;

    const myEvents = getMyEvents(deviceId);
    const hash = computeEventHash(myEvents);
    if (hash === lastPushHashRef.current) return;

    pushMyEvents(keysRef.current, deviceId)
      .then(() => {
        setSyncStatus("connected");
      })
      .catch(() => setSyncStatus("offline"));
  }, [eventCount, groupCode, deviceId, getMyEvents, pushMyEvents]);

  useEffect(() => {
    if (!groupCode || !deviceId) return;

    const sub = RNAppState.addEventListener("change", (state) => {
      if (state === "active") {
        doSync();
      }
    });

    return () => sub.remove();
  }, [groupCode, deviceId, doSync]);

  const createGroup = useCallback(async (): Promise<string | null> => {
    if (!deviceId) return null;

    try {
      setSyncStatus("syncing");
      setErrorMessage(null);

      const relayTest = await testRelayConnection();
      if (relayTest.connected.length === 0) {
        setSyncStatus("error");
        setErrorMessage(
          `Nenhum relay acessivel. Verifique sua conexao com a internet. Relays testados: ${relayTest.failed.length}`,
        );
        return null;
      }

      const code = generateGroupCode();
      const keys = await deriveKeysFromCode(code);

      keysRef.current = keys;
      setGroupCode(code);
      await AsyncStorage.setItem(GROUP_CODE_KEY, code);
      lastPushHashRef.current = "empty";

      try {
        await pushMyEvents(keys, deviceId, true);
      } catch {}

      setSyncStatus("connected");
      await saveLastSync(Date.now());
      return code;
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage("Falha ao criar grupo. Tente novamente.");
      return null;
    }
  }, [deviceId, pushMyEvents, saveLastSync]);

  const joinGroup = useCallback(
    async (code: string): Promise<boolean> => {
      if (!deviceId) return false;

      try {
        setSyncStatus("syncing");
        setErrorMessage(null);

        const relayTest = await testRelayConnection();
        if (relayTest.connected.length === 0) {
          setSyncStatus("error");
          setErrorMessage(
            `Nenhum relay acessivel. Verifique sua conexao com a internet. Relays testados: ${relayTest.failed.length}`,
          );
          return false;
        }

        const normalizedCode = code.trim().toUpperCase();
        const keys = await deriveKeysFromCode(normalizedCode);

        keysRef.current = keys;
        setGroupCode(normalizedCode);
        await AsyncStorage.setItem(GROUP_CODE_KEY, normalizedCode);
        lastPushHashRef.current = "empty";

        try {
          await pushMyEvents(keys, deviceId, true);
        } catch {}

        try {
          await pullFromRelays(keys, deviceId, 0);
        } catch {}

        setSyncStatus("connected");
        await saveLastSync(Date.now());
        return true;
      } catch (err) {
        setSyncStatus("error");
        setErrorMessage("Falha ao entrar no grupo. Verifique o codigo e tente novamente.");
        return false;
      }
    },
    [deviceId, pushMyEvents, pullFromRelays, saveLastSync],
  );

  const leaveGroup = useCallback(async () => {
    if (subRef.current) {
      subRef.current.close();
      subRef.current = null;
    }
    closePool();

    setGroupCode(null);
    keysRef.current = null;
    setSyncStatus("idle");
    setErrorMessage(null);
    setLastPullTs(0);
    lastPushHashRef.current = "empty";
    await AsyncStorage.removeItem(GROUP_CODE_KEY);
    await AsyncStorage.removeItem(LAST_PULL_TS_KEY);
    await AsyncStorage.removeItem(LAST_PUSH_HASH_KEY);
  }, []);

  const pushNow = useCallback(async () => {
    if (!groupCode || !deviceId || !keysRef.current) return;
    try {
      setSyncStatus("syncing");
      await pushMyEvents(keysRef.current, deviceId, true);
      setSyncStatus("connected");
      await saveLastSync(Date.now());
    } catch {
      setSyncStatus("offline");
    }
  }, [groupCode, deviceId, pushMyEvents, saveLastSync]);

  const pullNow = useCallback(async (): Promise<number> => {
    if (!groupCode || !deviceId || !keysRef.current) return 0;
    try {
      setSyncStatus("syncing");
      const count = await pullFromRelays(keysRef.current, deviceId, lastPullTs);
      setSyncStatus("connected");
      return count;
    } catch {
      setSyncStatus("offline");
      return 0;
    }
  }, [groupCode, deviceId, pullFromRelays, lastPullTs]);

  const resetStatus = useCallback(() => {
    setSyncStatus(groupCode ? "connected" : "idle");
    setErrorMessage(null);
  }, [groupCode]);

  const value = useMemo<SyncContextValue>(
    () => ({
      deviceId,
      groupId: groupCode,
      syncStatus,
      lastSyncTime,
      errorMessage,
      eventCount,
      relayCount,
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
      groupCode,
      syncStatus,
      lastSyncTime,
      errorMessage,
      eventCount,
      relayCount,
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
