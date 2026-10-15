import { useState, useCallback, useEffect, useRef } from "react";
import { AppState as RNAppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deriveKeysFromCode,
  publishSyncEvents,
  pullSyncEvents,
  subscribeToSyncEvents,
  closePool,
  testRelayConnection,
  type NostrSyncKeys,
} from "@/src/modules/nostrSync";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { SubCloser } from "nostr-tools/pool";
import {
  LAST_SYNC_KEY,
  LAST_PULL_TS_KEY,
  LAST_PUSH_HASH_KEY,
  PULL_INTERVAL_MS,
  generateGroupCode,
  computeEventHash,
  loadGroupCode,
  saveGroupCode,
  clearGroupCode,
} from "./syncStorage";

export type SyncStatus = "idle" | "syncing" | "connected" | "offline" | "error";

interface UseSyncEngineArgs {
  getAllEvents: () => SyncEvent[];
  importEvents: (events: SyncEvent[]) => Promise<number>;
  localEventCount: number;
  deviceId: string | null;
  loading: boolean;
}

export function useSyncEngine({
  getAllEvents,
  importEvents,
  localEventCount,
  deviceId,
  loading,
}: UseSyncEngineArgs) {
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPullTs, setLastPullTs] = useState(0);
  const lastPullTsRef = useRef(0);

  useEffect(() => {
    lastPullTsRef.current = lastPullTs;
  }, [lastPullTs]);

  const allEvents = getAllEvents();
  const allEventsRef = useRef(allEvents);
  useEffect(() => {
    allEventsRef.current = allEvents;
  }, [allEvents]);

  const pullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRef = useRef<SubCloser | null>(null);
  const [keys, setKeys] = useState<NostrSyncKeys | null>(null);
  const keysRef = useRef<NostrSyncKeys | null>(null);
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);

  const lastPushHashRef = useRef<string>("empty");
  const isImportingRef = useRef(false);
  const isPushingRef = useRef(false);
  const pushDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSyncDoneRef = useRef(false);

  // --- Persistence helpers ---

  const saveLastSync = useCallback(async (ts: number) => {
    setLastSyncTime(ts);
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString());
    } catch {}
  }, []);

  const saveLastPullTs = useCallback(async (ts: number) => {
    setLastPullTs(ts);
    lastPullTsRef.current = ts;
    try {
      await AsyncStorage.setItem(LAST_PULL_TS_KEY, ts.toString());
    } catch {}
  }, []);

  // --- Load persisted state on mount ---

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
    loadGroupCode().then(async (val) => {
      if (val) {
        setGroupCode(val);
        const derived = await deriveKeysFromCode(val);
        setKeys(derived);
        keysRef.current = derived;
      }
    });
    AsyncStorage.getItem(LAST_PULL_TS_KEY).then((val) => {
      if (val) {
        const ts = parseInt(val, 10);
        setLastPullTs(ts);
        lastPullTsRef.current = ts;
      }
    });
    AsyncStorage.getItem(LAST_PUSH_HASH_KEY).then((val) => {
      if (val) lastPushHashRef.current = val;
    });

    return () => {
      closePool();
    };
  }, []);

  // --- Core sync operations ---

  const getMyEvents = useCallback(
    (did: string): SyncEvent[] => {
      return allEventsRef.current.filter((e) => e.deviceId === did);
    },
    [],
  );

  const pushMyEvents = useCallback(
    async (k: NostrSyncKeys, did: string, force: boolean = false) => {
      const myEvents = getMyEvents(did);
      if (myEvents.length === 0) return;

      const hash = computeEventHash(myEvents);
      if (!force && hash === lastPushHashRef.current) return;

      try {
        await publishSyncEvents(k, did, myEvents);
        lastPushHashRef.current = hash;
        try {
          await AsyncStorage.setItem(LAST_PUSH_HASH_KEY, hash);
        } catch {}
      } catch (err) {
        throw err;
      }
    },
    [getMyEvents],
  );

  const pullFromRelays = useCallback(
    async (k: NostrSyncKeys, did: string, since: number): Promise<number> => {
      try {
        const isRecovery = allEventsRef.current.length === 0;
        const syncEvents = await pullSyncEvents(k, did, since, isRecovery);

        if (syncEvents.length > 0) {
          isImportingRef.current = true;

          if (pushDebounceRef.current) {
            clearTimeout(pushDebounceRef.current);
            pushDebounceRef.current = null;
          }

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
        throw err;
      }
    },
    [importEvents, saveLastSync, saveLastPullTs],
  );

  const doSync = useCallback(async () => {
    const currentGroupCode = groupCode;
    const currentDeviceId = deviceId;
    const currentKeys = keysRef.current;

    if (!currentGroupCode || !currentDeviceId || !currentKeys) return;
    if (isImportingRef.current) return;

    try {
      setSyncStatus("syncing");

      const pullSince = (initialSyncDoneRef.current && allEventsRef.current.length > 0) ? lastPullTsRef.current : 0;

      await pushMyEvents(currentKeys, currentDeviceId, false);
      const imported = await pullFromRelays(currentKeys, currentDeviceId, pullSince);

      if (!initialSyncDoneRef.current && (imported > 0 || pullSince === 0)) {
        initialSyncDoneRef.current = true;
      }

      setSyncStatus("connected");
      setErrorMessage(null);
    } catch (err) {
      console.warn("[Sync] periodic sync failed (offline):", err);
      setSyncStatus("offline");
    }
  }, [groupCode, deviceId, pushMyEvents, pullFromRelays]);

  // --- Main sync effect ---

  useEffect(() => {
    if (!groupCode || !deviceId || !keys || loading) {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
      initialSyncDoneRef.current = false;
      return;
    }

    if (!initialSyncDoneRef.current) {
      const did = deviceId;

      setSyncStatus("syncing");

      pushMyEvents(keys, did, true)
        .then(() => pullFromRelays(keys, did, 0))
        .then(() => {
          initialSyncDoneRef.current = true;
          setSyncStatus("connected");
          setErrorMessage(null);
        })
        .catch((err) => {
          console.warn("[Sync] Initial sync failed:", err);
          setSyncStatus("offline");
        });
    }

    pullTimerRef.current = setInterval(doSync, PULL_INTERVAL_MS);

    try {
      subRef.current = subscribeToSyncEvents(
        keys,
        deviceId,
        lastPullTs,
        async (event) => {
          if (isImportingRef.current) return;

          try {
            isImportingRef.current = true;

            if (pushDebounceRef.current) {
              clearTimeout(pushDebounceRef.current);
              pushDebounceRef.current = null;
            }

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
  }, [groupCode, deviceId, keys, loading, doSync, pullFromRelays, pushMyEvents, importEvents, saveLastSync]);

  // --- Auto-push on local event changes ---

  useEffect(() => {
    if (!groupCode || !deviceId || !keys || loading) return;

    if (pushDebounceRef.current) {
      clearTimeout(pushDebounceRef.current);
    }

    pushDebounceRef.current = setTimeout(() => {
      if (isPushingRef.current) return;
      if (!keys || !deviceId) return;

      const myEvents = getMyEvents(deviceId);
      const hash = computeEventHash(myEvents);

      if (hash === lastPushHashRef.current && initialSyncDoneRef.current) return;

      isPushingRef.current = true;
      pushMyEvents(keys, deviceId, false)
        .then(() => {
          isPushingRef.current = false;
          setSyncStatus("connected");
        })
        .catch(() => {
          isPushingRef.current = false;
          setSyncStatus("offline");
        });
    }, 500);

    return () => {
      if (pushDebounceRef.current) {
        clearTimeout(pushDebounceRef.current);
      }
    };
  }, [localEventCount, groupCode, deviceId, keys, loading, allEvents.length, getMyEvents, pushMyEvents]);

  // --- Foreground sync ---

  useEffect(() => {
    if (!groupCode || !deviceId) return;

    const sub = RNAppState.addEventListener("change", (state) => {
      if (state === "active") {
        doSync();
      }
    });

    return () => sub.remove();
  }, [groupCode, deviceId, doSync]);

  // --- Public actions ---

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
      const derivedKeys = await deriveKeysFromCode(code);

      setKeys(derivedKeys);
      setGroupCode(code);
      await saveGroupCode(code);
      lastPushHashRef.current = "empty";
      initialSyncDoneRef.current = false;

      try {
        await pushMyEvents(derivedKeys, deviceId, true);
      } catch {}

      setSyncStatus("connected");
      await saveLastSync(Date.now());
      return code;
    } catch {
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
        const derivedKeys = await deriveKeysFromCode(normalizedCode);

        setKeys(derivedKeys);
        setGroupCode(normalizedCode);
        await saveGroupCode(normalizedCode);
        lastPushHashRef.current = "empty";
        initialSyncDoneRef.current = false;

        try {
          await pushMyEvents(derivedKeys, deviceId, true);
        } catch {}

        try {
          await pullFromRelays(derivedKeys, deviceId, 0);
        } catch {}

        setSyncStatus("connected");
        await saveLastSync(Date.now());
        return true;
      } catch {
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
    setKeys(null);
    setSyncStatus("idle");
    setErrorMessage(null);
    setLastPullTs(0);
    lastPushHashRef.current = "empty";
    initialSyncDoneRef.current = false;
    await clearGroupCode();
    await AsyncStorage.removeItem(LAST_PULL_TS_KEY);
    await AsyncStorage.removeItem(LAST_PUSH_HASH_KEY);
  }, []);

  const pushNow = useCallback(async () => {
    if (!groupCode || !deviceId || !keys) return;
    try {
      setSyncStatus("syncing");
      await pushMyEvents(keys, deviceId, true);
      setSyncStatus("connected");
      await saveLastSync(Date.now());
    } catch {
      setSyncStatus("offline");
    }
  }, [groupCode, deviceId, pushMyEvents, saveLastSync, keys]);

  const pullNow = useCallback(async (): Promise<number> => {
    if (!groupCode || !deviceId || !keys) return 0;
    try {
      setSyncStatus("syncing");
      const count = await pullFromRelays(keys, deviceId, lastPullTs);
      setSyncStatus("connected");
      return count;
    } catch {
      setSyncStatus("offline");
      return 0;
    }
  }, [groupCode, deviceId, pullFromRelays, lastPullTs, keys]);

  const resetStatus = useCallback(() => {
    setSyncStatus(groupCode ? "connected" : "idle");
    setErrorMessage(null);
  }, [groupCode]);

  return {
    groupCode,
    syncStatus,
    lastSyncTime,
    errorMessage,
    eventCount: allEvents.length,
    isAutoSyncEnabled: !!groupCode,
    createGroup,
    joinGroup,
    leaveGroup,
    pushNow,
    pullNow,
    resetStatus,
  };
}
