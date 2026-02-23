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
import { AppState as RNAppState } from "react-native";
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

// Intervalo de pull periódico (8 segundos)
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
  const { getAllEvents, importEvents, localEventCount, deviceId, loading } = useAppState();
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPullTs, setLastPullTs] = useState(0);
  const lastPullTsRef = useRef(0);
  
  // Sincronizar os refs com o estado para uso em callbacks estáveis
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

  // Flag: está a importar eventos de outros dispositivos (pull ativo)
  const isImportingRef = useRef(false);
  // Flag: está a fazer push (evita pushes concorrentes)
  const isPushingRef = useRef(false);
  // Debounce para push automático quando há novos eventos locais
  const pushDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag: já fez a sincronização inicial (evita múltiplos syncs iniciais)
  const initialSyncDoneRef = useRef(false);

  const eventCount = allEvents.length;
  const relayCount = getRelays().length;

  const isAutoSyncEnabled = !!groupCode;

  // Carregamento inicial: groupCode, timestamps
  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
    AsyncStorage.getItem(GROUP_CODE_KEY).then(async (val) => {
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

  // Retorna apenas os eventos criados por este dispositivo (usa ref para estabilidade)
  const getMyEvents = useCallback(
    (did: string): SyncEvent[] => {
      return allEventsRef.current.filter((e) => e.deviceId === did);
    },
    [],
  );

  /**
   * Publica os eventos locais deste dispositivo no Nostr.
   * Usa hash para evitar publicações desnecessárias quando não há mudanças.
   * Com force=true, publica mesmo que o hash seja igual (para reconciliação inicial).
   */
  const pushMyEvents = useCallback(
    async (keys: NostrSyncKeys, did: string, force: boolean = false) => {
      const myEvents = getMyEvents(did);
      if (myEvents.length === 0) return;

      const hash = computeEventHash(myEvents);
      // Sem force: só publica se o hash mudou (há novos eventos locais)
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

  /**
   * Faz pull de eventos de outros dispositivos do Nostr.
   * Importa apenas eventos que ainda não existem localmente (por ID).
   * NÃO incrementa localEventCount (importEvents não chama dispatch).
   */
  const pullFromRelays = useCallback(
    async (keys: NostrSyncKeys, did: string, since: number): Promise<number> => {
      try {
        const syncEvents = await pullSyncEvents(keys, did, since);

        if (syncEvents.length > 0) {
          // Marcar como importando para bloquear push automático durante o import
          isImportingRef.current = true;

          // Cancelar qualquer push com debounce pendente
          if (pushDebounceRef.current) {
            clearTimeout(pushDebounceRef.current);
            pushDebounceRef.current = null;
          }

          const imported = await importEvents(syncEvents);
          isImportingRef.current = false;

          if (imported > 0) {
            // Atualizar o timestamp do último pull com o evento mais recente recebido
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

  /**
   * Sincronização periódica:
   * 1. Push dos eventos locais (apenas se o hash mudou ou passou muito tempo)
   * 2. Pull de eventos de outros dispositivos
   */
  const doSync = useCallback(async () => {
    const currentGroupCode = groupCode; // closure
    const currentDeviceId = deviceId; // closure
    const currentKeys = keysRef.current;

    if (!currentGroupCode || !currentDeviceId || !currentKeys) return;
    // Não sincronizar se já estiver a importar
    if (isImportingRef.current) return;

    try {
      setSyncStatus("syncing");

      // Se o sync inicial ainda não foi concluído com sucesso, tenta pull completo (since=0)
      const pullSince = initialSyncDoneRef.current ? lastPullTsRef.current : 0;

      // Push: publica se houver mudanças ou ocasionalmente para garantir persistência
      await pushMyEvents(currentKeys, currentDeviceId, false);
      
      // Pull: busca eventos de outros dispositivos
      const imported = await pullFromRelays(currentKeys, currentDeviceId, pullSince);
      
      if (!initialSyncDoneRef.current && (imported > 0 || pullSince === 0)) {
        console.log(`[Sync] Initial sync completed. Received ${imported} events.`);
        initialSyncDoneRef.current = true;
      }

      setSyncStatus("connected");
      setErrorMessage(null);
    } catch (err) {
      console.log("[Sync] periodic sync error:", err);
      setSyncStatus("offline");
    }
  }, [groupCode, deviceId, pushMyEvents, pullFromRelays]);

  /**
   * Efeito principal de sincronização.
   * Executado quando o groupCode ou deviceId muda (ex: ao entrar num grupo).
   * Faz uma sincronização inicial completa e configura o timer periódico.
   */
  useEffect(() => {
    if (!groupCode || !deviceId || !keys || loading) {
      // Limpar timer e subscription se não há grupo ou chaves ou ainda carregando
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

    // Sincronização inicial
    if (!initialSyncDoneRef.current) {
      const did = deviceId;

      setSyncStatus("syncing");

      pushMyEvents(keys, did, true)
        .then(() => pullFromRelays(keys, did, 0))
        .then((imported) => {
          console.log(`[Sync] Initial pull complete. Imported: ${imported}`);
          initialSyncDoneRef.current = true;
          setSyncStatus("connected");
          setErrorMessage(null);
        })
        .catch((err) => {
          console.log("[Sync] Initial sync failed, will retry in background:", err);
          setSyncStatus("offline");
        });
    }

    // Timer periódico: sync incremental
    pullTimerRef.current = setInterval(doSync, PULL_INTERVAL_MS);

    // Subscription em tempo real
    try {
      subRef.current = subscribeToSyncEvents(
        keys,
        deviceId,
        lastPullTs,
        async (event) => {
          // Não processar se já estiver a importar
          if (isImportingRef.current) return;

          try {
            isImportingRef.current = true;

            // Cancelar push pendente ao receber evento em tempo real
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

  /**
   * Efeito de push automático quando há novos eventos LOCAIS.
   * Observa localEventCount (que só incrementa via dispatch local, não via importEvents).
   * Usa debounce de 500ms para agrupar múltiplos eventos criados em sequência.
   * NÃO dispara durante importação de eventos de outros dispositivos.
   */
  useEffect(() => {
    if (!groupCode || !deviceId || !keys || loading) return;

    // Limpar debounce anterior
    if (pushDebounceRef.current) {
      clearTimeout(pushDebounceRef.current);
    }

    pushDebounceRef.current = setTimeout(() => {
      // Não fazer push se já estiver a fazer push
      if (isPushingRef.current) return;
      if (!keys || !deviceId) return;

      const myEvents = getMyEvents(deviceId);
      const hash = computeEventHash(myEvents);

      // Só pula o push se o hash for igual E o sincronismo inicial já tiver sido feito com sucesso.
      if (hash === lastPushHashRef.current && initialSyncDoneRef.current) return;

      console.log(`[Sync] Device ${deviceId} triggering push for ${myEvents.length} events (Hash: ${hash})`);
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
  }, [localEventCount, groupCode, deviceId, keys, loading, eventCount]); 

  // Sincronizar quando a app volta ao primeiro plano
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
      const derivedKeys = await deriveKeysFromCode(code);

      setKeys(derivedKeys);
      setGroupCode(code);
      await AsyncStorage.setItem(GROUP_CODE_KEY, code);
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
        await AsyncStorage.setItem(GROUP_CODE_KEY, normalizedCode);
        lastPushHashRef.current = "empty";
        initialSyncDoneRef.current = false;

        // Ao entrar no grupo: publicar eventos locais + buscar todos os eventos do grupo
        try {
          await pushMyEvents(derivedKeys, deviceId, true);
        } catch {}

        try {
          // Pull desde o início (since=0) para obter todos os eventos históricos
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
    await AsyncStorage.removeItem(GROUP_CODE_KEY);
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
