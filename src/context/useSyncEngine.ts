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
import { createSyncCoordinator } from "@/src/modules/syncCoordinator";
import {
  LAST_SYNC_KEY,
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

  // Story 3.6: o coordenador (puro, testado no vitest) é dono do cursor dos relays,
  // da fila ao vivo, do mutex único de importação e da época do grupo.
  const importEventsRef = useRef(importEvents);
  useEffect(() => {
    importEventsRef.current = importEvents;
  }, [importEvents]);

  const [coordinator] = useState(() =>
    createSyncCoordinator<{ keys: NostrSyncKeys; deviceId: string; isRecovery: boolean }>({
      storage: AsyncStorage,
      pull: (req) => pullSyncEvents(req.keys, req.deviceId, req.isRecovery),
      importEvents: (events) => {
        if (pushDebounceRef.current) {
          clearTimeout(pushDebounceRef.current);
          pushDebounceRef.current = null;
        }
        return importEventsRef.current(events);
      },
      onLiveImported: () => {
        const ts = Date.now();
        setLastSyncTime(ts);
        AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString()).catch(() => {});
        setSyncStatus("connected");
      },
    }),
  );

  // --- Load persisted state on mount ---

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
    // O cursor carrega antes das chaves: a assinatura só nasce com as chaves e
    // já monta o `since` com o cursor salvo. A chave antiga (`lastPullTs`) é apagada.
    coordinator
      .load()
      .catch(() => null)
      .then(() => loadGroupCode())
      .then(async (val) => {
        if (val) {
          setGroupCode(val);
          const derived = await deriveKeysFromCode(val);
          setKeys(derived);
          keysRef.current = derived;
        }
      })
      .catch((err) => {
        console.warn("[Sync] Falha ao carregar o código do grupo:", err);
      });
    AsyncStorage.getItem(LAST_PUSH_HASH_KEY).then((val) => {
      if (val) lastPushHashRef.current = val;
    });

    return () => {
      closePool();
    };
  }, [coordinator]);

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
    async (k: NostrSyncKeys, did: string): Promise<number> => {
      const isRecovery = allEventsRef.current.length === 0;
      // Busca fora do mutex; importação e cursor sob o mutex; a fila ao vivo drena depois.
      const imported = await coordinator.runPull({ keys: k, deviceId: did, isRecovery });
      if (imported > 0) await saveLastSync(Date.now());
      return imported;
    },
    [coordinator, saveLastSync],
  );

  const doSync = useCallback(async () => {
    const currentGroupCode = groupCode;
    const currentDeviceId = deviceId;
    const currentKeys = keysRef.current;

    if (!currentGroupCode || !currentDeviceId || !currentKeys) return;
    if (coordinator.isImporting()) return;

    try {
      setSyncStatus("syncing");

      await pushMyEvents(currentKeys, currentDeviceId, false);
      await pullFromRelays(currentKeys, currentDeviceId);

      initialSyncDoneRef.current = true;

      setSyncStatus("connected");
      setErrorMessage(null);
    } catch (err) {
      console.warn("[Sync] periodic sync failed (offline):", err);
      setSyncStatus("offline");
    }
  }, [groupCode, deviceId, pushMyEvents, pullFromRelays, coordinator]);

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
        .then(() => pullFromRelays(keys, did))
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
        coordinator.liveSince(),
        (event, createdAt) => {
          // Story 3.6: o evento entra na fila e é importado quando o mutex permitir (sem descarte).
          coordinator.enqueueLive(event, createdAt);
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
    // O cursor não entra nas deps: ele muda a cada pull e recriaria a assinatura (lido do coordenador ao assinar).
  }, [groupCode, deviceId, keys, loading, doSync, pullFromRelays, pushMyEvents, coordinator]);

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
          `Nenhum relay acessível. Verifique sua conexão com a internet. Relays testados: ${relayTest.failed.length}`,
        );
        return null;
      }

      const code = generateGroupCode();
      const derivedKeys = await deriveKeysFromCode(code);

      // Grupo novo: cursor e fila do grupo anterior não valem mais.
      await coordinator.reset();
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
  }, [deviceId, pushMyEvents, saveLastSync, coordinator]);

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
            `Nenhum relay acessível. Verifique sua conexão com a internet. Relays testados: ${relayTest.failed.length}`,
          );
          return false;
        }

        const normalizedCode = code.trim().toUpperCase();
        const derivedKeys = await deriveKeysFromCode(normalizedCode);

        // Grupo novo: cursor e fila do grupo anterior não valem mais.
        await coordinator.reset();
        setKeys(derivedKeys);
        setGroupCode(normalizedCode);
        await saveGroupCode(normalizedCode);
        lastPushHashRef.current = "empty";
        initialSyncDoneRef.current = false;

        try {
          await pushMyEvents(derivedKeys, deviceId, true);
        } catch {}

        try {
          await pullFromRelays(derivedKeys, deviceId);
        } catch {}

        setSyncStatus("connected");
        await saveLastSync(Date.now());
        return true;
      } catch {
        setSyncStatus("error");
        setErrorMessage("Falha ao entrar no grupo. Verifique o código e tente novamente.");
        return false;
      }
    },
    [deviceId, pushMyEvents, pullFromRelays, saveLastSync, coordinator],
  );

  const leaveGroup = useCallback(async () => {
    if (subRef.current) {
      subRef.current.close();
      subRef.current = null;
    }
    closePool();
    // Nova época já (síncrono): pull e drenagem em curso do grupo antigo são ignorados.
    const resetting = coordinator.reset();

    setGroupCode(null);
    setKeys(null);
    setSyncStatus("idle");
    setErrorMessage(null);
    lastPushHashRef.current = "empty";
    initialSyncDoneRef.current = false;
    await clearGroupCode();
    await resetting;
    await AsyncStorage.removeItem(LAST_PUSH_HASH_KEY);
  }, [coordinator]);

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
      const count = await pullFromRelays(keys, deviceId);
      setSyncStatus("connected");
      return count;
    } catch {
      setSyncStatus("offline");
      return 0;
    }
  }, [groupCode, deviceId, pullFromRelays, keys]);

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
