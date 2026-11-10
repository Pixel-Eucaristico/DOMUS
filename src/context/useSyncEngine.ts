import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppState as RNAppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  publishSyncEvents,
  pullSyncEvents,
  subscribeToSyncEvents,
  closePool,
  testRelayConnection,
  type NostrSyncKeys,
} from "@/src/modules/nostrSync";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { SubCloser } from "nostr-tools/pool";
import { createSyncCoordinator, type SyncCoordinator } from "@/src/modules/syncCoordinator";
import { createSyncGroupTracker } from "@/src/modules/syncGroupTracking";
import {
  shouldPublishGroupEvents,
  processIncomingEvents,
  processPushResult,
  resolvePullSyncOptions,
} from "@/src/modules/syncDecisions";
import { selectOldGroupPushEvents, selectStrongGroupPushEvents } from "@/src/modules/syncPayload";
import { parseGroupSecret } from "@/src/modules/strongGroup/groupSecret";
import {
  createStrongSyncGroup,
  loadCoexistingGroups,
  clearAllSyncGroupSecrets,
  resolveJoinSyncGroup,
  canMigrateToStrongGroup,
  isLegacySyncDisabled,
  createLegacyCutoffWarningEvent,
  LEGACY_CUTOFF_MESSAGE,
  LEGACY_VERSION_TOO_OLD_MESSAGE,
  LEGACY_CUTOFF_WARNING_STORAGE_KEY_PREFIX,
  type ActiveSyncGroup,
  type CoexistingGroups,
} from "./strongGroupSync";
import {
  LAST_SYNC_KEY,
  LAST_PUSH_HASH_KEY,
  GROUP_PUSH_HASHES_KEY,
  SYNC_GROUP_TRACKING_KEY,
  PULL_INTERVAL_MS,
  computeEventHash,
} from "./syncStorage";

export type SyncStatus = "idle" | "syncing" | "connected" | "offline" | "error";

const EMPTY_SET = new Set<string>();

interface UseSyncEngineArgs {
  getAllEvents: () => SyncEvent[];
  importEvents: (events: SyncEvent[], options?: { isStrongGroup?: boolean }) => Promise<number>;
  localEventCount: number;
  deviceId: string | null;
  loading: boolean;
  now?: () => number;
  version?: string;
}

export function useSyncEngine({
  getAllEvents,
  importEvents,
  localEventCount,
  deviceId,
  loading,
  now = () => Date.now(),
  version,
}: UseSyncEngineArgs) {
  const [coexistingGroups, setCoexistingGroups] = useState<CoexistingGroups>({
    strong: null,
    legacy: null,
    legacyCutoff: false,
    legacyCode: null,
  });
  const coexistingRef = useRef<CoexistingGroups>(coexistingGroups);
  useEffect(() => {
    coexistingRef.current = coexistingGroups;
  }, [coexistingGroups]);

  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isStrongGroup = useMemo(
    () => Boolean(groupCode && parseGroupSecret(groupCode).ok),
    [groupCode],
  );
  const isStrongGroupRef = useRef(isStrongGroup);
  useEffect(() => {
    isStrongGroupRef.current = isStrongGroup;
  }, [isStrongGroup]);

  // Story 4.8: Elegível para migração se estiver conectado a um grupo legado e não possuir grupo forte
  const canMigrate = useMemo(
    () => canMigrateToStrongGroup(coexistingGroups, isStrongGroup, groupCode),
    [coexistingGroups, isStrongGroup, groupCode],
  );

  const allEvents = getAllEvents();
  const allEventsRef = useRef(allEvents);
  useEffect(() => {
    allEventsRef.current = allEvents;
  }, [allEvents]);

  const pullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRef = useRef<SubCloser | null>(null);
  const legacySubRef = useRef<SubCloser | null>(null);
  const [keys, setKeys] = useState<NostrSyncKeys | null>(null);
  const keysRef = useRef<NostrSyncKeys | null>(null);
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);

  const groupPushHashesRef = useRef<Record<string, string>>({});
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

  const [tracker] = useState(() =>
    createSyncGroupTracker({
      storage: AsyncStorage,
      key: SYNC_GROUP_TRACKING_KEY,
    }),
  );

  const legacyEventIdsRef = useRef<Set<string>>(new Set());
  const isPublishingWarningRef = useRef(false);

  // Story 4.9: Publica evento de aviso prévio no canal legado uma única vez antes da data de corte
  const publishLegacyCutoffWarningIfNeeded = useCallback(
    async (legacyGroup: ActiveSyncGroup, did: string) => {
      const currentNow = now();
      if (isLegacySyncDisabled({ now: currentNow, version })) return;
      if (isPublishingWarningRef.current) return;

      const legacyGroupId = legacyGroup.keys.publicKey;
      const warnKey = `${LEGACY_CUTOFF_WARNING_STORAGE_KEY_PREFIX}${legacyGroupId}`;
      try {
        isPublishingWarningRef.current = true;
        const alreadyWarned = await AsyncStorage.getItem(warnKey);
        if (alreadyWarned) return;

        // Namespace dedicado para evitar colisão NIP-33 com o lote 0 de transações do usuário
        const noticeDeviceId = `notice-${did}`;
        const warnEvent = createLegacyCutoffWarningEvent(noticeDeviceId);
        const result = await publishSyncEvents(legacyGroup.keys, noticeDeviceId, [warnEvent]);
        if (result.published > 0) {
          await tracker.markPublished(result.confirmedEventIds, legacyGroupId);
          await AsyncStorage.setItem(warnKey, "1");
        } else {
          console.warn("[Sync] Falha ao enviar aviso prévio no canal legado: nenhum relay aceitou o lote.");
        }
      } catch (err) {
        console.warn("[Sync] Falha ao enviar aviso prévio no canal legado:", err);
      } finally {
        isPublishingWarningRef.current = false;
      }
    },
    [now, version, tracker],
  );

  const [coordinator] = useState(() => {
    let self: SyncCoordinator<{ keys: NostrSyncKeys; deviceId: string; isRecovery: boolean }>;
    const instance = createSyncCoordinator<{ keys: NostrSyncKeys; deviceId: string; isRecovery: boolean }>({
      storage: AsyncStorage,
      pull: async (req) => {
        const pullOptions = resolvePullSyncOptions({
          isRecovery: req.isRecovery,
          isStrong: req.keys.isStrong,
          cursor: self.getCursor(),
        });
        const result = await pullSyncEvents(req.keys, req.deviceId, req.isRecovery, pullOptions);
        if (!req.keys.isStrong) {
          for (const e of result.events) {
            legacyEventIdsRef.current.add(e.id);
          }
        }
        const incoming = processIncomingEvents({
          incomingEvents: result.events,
          currentDeviceId: req.deviceId,
          existingIds: new Set(allEventsRef.current.map((e) => e.id)),
        });
        if (incoming.foreignEventIds.length > 0) {
          tracker
            .markReceived(
              incoming.foreignEventIds,
              req.keys.publicKey,
            )
            .catch(() => {});
        }
        return {
          events: result.events,
          maxCreatedAt: req.keys.isStrong ? result.maxCreatedAt : null,
        };
      },
      importEvents: async (events) => {
        if (pushDebounceRef.current) {
          clearTimeout(pushDebounceRef.current);
          pushDebounceRef.current = null;
        }
        const legacyEvents: SyncEvent[] = [];
        const strongEvents: SyncEvent[] = [];
        for (const e of events) {
          if (legacyEventIdsRef.current.has(e.id)) {
            legacyEvents.push(e);
            legacyEventIdsRef.current.delete(e.id);
          } else {
            strongEvents.push(e);
          }
        }
        let total = 0;
        if (legacyEvents.length > 0) {
          total += await importEventsRef.current(legacyEvents, { isStrongGroup: false });
        }
        if (strongEvents.length > 0) {
          total += await importEventsRef.current(strongEvents, { isStrongGroup: isStrongGroupRef.current });
        }
        return total;
      },
      onLiveImported: () => {
        const ts = Date.now();
        setLastSyncTime(ts);
        AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString()).catch(() => {});
        setSyncStatus("connected");
      },
    });
    self = instance;
    return instance;
  });

  // --- Load persisted state on mount ---

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
    AsyncStorage.getItem(GROUP_PUSH_HASHES_KEY).then((val) => {
      if (val) {
        try {
          groupPushHashesRef.current = JSON.parse(val);
        } catch {}
      }
    });
    // O cursor carrega antes das chaves: a assinatura só nasce com as chaves e
    // já monta o `since` com o cursor salvo. A chave antiga (`lastPullTs`) é apagada.
    Promise.all([
      coordinator.load().catch(() => null),
      tracker.load().catch((err) => {
        console.warn("[Sync] Falha ao carregar tracker de grupos:", err);
      }),
    ])
      .then(async () => {
        const coexisting = await loadCoexistingGroups({ now: now(), version });
        coexistingRef.current = coexisting;
        setCoexistingGroups(coexisting);
        const active = coexisting.strong ?? coexisting.legacy;
        if (active) {
          isStrongGroupRef.current = active.isStrong;
          setGroupCode(active.code);
          setKeys(active.keys);
          keysRef.current = active.keys;
          if (!active.isStrong && deviceId) {
            await publishLegacyCutoffWarningIfNeeded(active, deviceId);
          }
        } else if (coexisting.legacyCutoff && coexisting.legacyCode) {
          isStrongGroupRef.current = false;
          setGroupCode(coexisting.legacyCode);
          setKeys(null);
          keysRef.current = null;
          setSyncStatus("offline");
          setErrorMessage(
            coexisting.legacyCutoffReason === "version_deprecated"
              ? LEGACY_VERSION_TOO_OLD_MESSAGE
              : LEGACY_CUTOFF_MESSAGE,
          );
        }
      })
      .catch((err) => {
        console.warn("[Sync] Falha ao carregar grupos de sincronização:", err);
      });
    AsyncStorage.getItem(LAST_PUSH_HASH_KEY).then((val) => {
      if (val) lastPushHashRef.current = val;
    });

    return () => {
      closePool();
    };
  }, [coordinator, tracker, deviceId, now, version, publishLegacyCutoffWarningIfNeeded]);

  // --- Core sync operations ---

  // Story 11.4 e Story 4.5: só o que o grupo ativo publica entra no hash e no
  // push; no Grupo antigo, holerites (`PAYSLIP_*`) e dados confessionais/religiosos
  // são excluídos; no Grupo forte, todos os eventos deste aparelho são transmitidos.
  // Story 4.6: filtra eventos que já foram publicados ou recebidos no grupo atual.
  // Story 4.7: suporta parâmetro isStrong para publicação seletiva entre grupos coexistentes.
  const getMyEvents = useCallback(
    (did: string, isStrong?: boolean): SyncEvent[] => {
      const strongMode = typeof isStrong === "boolean" ? isStrong : isStrongGroupRef.current;
      return strongMode
        ? selectStrongGroupPushEvents(allEventsRef.current, did)
        : selectOldGroupPushEvents(allEventsRef.current, did);
    },
    [],
  );

  const pushToGroup = useCallback(
    async (group: ActiveSyncGroup, did: string, force: boolean = false) => {
      const groupId = group.keys.publicKey;
      const decision = shouldPublishGroupEvents({
        events: allEventsRef.current,
        groupId,
        isStrong: group.isStrong,
        tracker,
        lastHash: groupPushHashesRef.current[groupId],
        force,
        deviceId: did,
      });
      if (!decision.shouldPublish) return;

      const { myEvents, pendingEvents, hash } = decision;
      const eventsToPublish = group.isStrong ? pendingEvents : myEvents;
      const result = await publishSyncEvents(group.keys, did, eventsToPublish);
      const outcome = processPushResult({ result, myEvents: eventsToPublish, currentHash: hash });

      if (outcome.eventsToMark.length > 0) {
        await tracker.markPublished(outcome.eventsToMark, groupId);
      }

      if (outcome.shouldAdvanceHash) {
        groupPushHashesRef.current[groupId] = hash;
        lastPushHashRef.current = hash;
        try {
          await AsyncStorage.setItem(LAST_PUSH_HASH_KEY, hash);
          await AsyncStorage.setItem(GROUP_PUSH_HASHES_KEY, JSON.stringify(groupPushHashesRef.current));
        } catch {}
      }

      if (outcome.shouldThrow) {
        throw new Error(outcome.errorMessage ?? `Falha ao publicar eventos no grupo ${groupId}`);
      }
    },
    [tracker],
  );

  const pushMyEvents = useCallback(
    async (k: NostrSyncKeys, did: string, force: boolean = false) => {
      const groupId = k.publicKey;
      const isStrong = typeof k.isStrong === "boolean" ? k.isStrong : isStrongGroupRef.current;
      const myEvents = getMyEvents(did, isStrong);
      const hash = computeEventHash(myEvents);
      const decision = shouldPublishGroupEvents({
        events: allEventsRef.current,
        groupId,
        isStrong,
        tracker,
        lastHash: lastPushHashRef.current,
        force,
        deviceId: did,
      });
      if (!decision.shouldPublish) return;

      const { pendingEvents } = decision;
      const eventsToPublish = isStrong ? pendingEvents : myEvents;
      const result = await publishSyncEvents(k, did, eventsToPublish);
      const outcome = processPushResult({ result, myEvents: eventsToPublish, currentHash: hash });

      if (outcome.eventsToMark.length > 0) {
        await tracker.markPublished(outcome.eventsToMark, groupId);
      }

      if (outcome.shouldAdvanceHash) {
        groupPushHashesRef.current[groupId] = hash;
        lastPushHashRef.current = hash;
        try {
          await AsyncStorage.setItem(LAST_PUSH_HASH_KEY, hash);
          await AsyncStorage.setItem(GROUP_PUSH_HASHES_KEY, JSON.stringify(groupPushHashesRef.current));
        } catch {}
      }

      if (outcome.shouldThrow) {
        throw new Error(outcome.errorMessage ?? `Falha ao publicar eventos no grupo ${groupId}`);
      }
    },
    [getMyEvents, tracker],
  );

  const pushAllGroups = useCallback(
    async (force: boolean = false) => {
      const currentDeviceId = deviceId;
      if (!currentDeviceId) return;
      const { strong, legacy } = coexistingRef.current;
      if (!strong && !legacy) return;
      if (isPushingRef.current) return;

      isPushingRef.current = true;
      try {
        let anyAttempted = false;
        let anySuccess = false;
        let lastError: unknown = null;

        if (strong) {
          anyAttempted = true;
          try {
            await pushToGroup(strong, currentDeviceId, force);
            anySuccess = true;
          } catch (err) {
            lastError = err;
            console.warn("[Sync] Push no Grupo forte falhou:", err);
          }
        }

        if (legacy) {
          const legacyDisabled = isLegacySyncDisabled({ now: now(), version });
          if (!legacyDisabled) {
            anyAttempted = true;
            try {
              await pushToGroup(legacy, currentDeviceId, force);
              anySuccess = true;
            } catch (err) {
              lastError = err;
              console.warn("[Sync] Push no Grupo antigo falhou:", err);
            }
          }
        }

        if (anyAttempted && !anySuccess && lastError) {
          throw lastError;
        }
      } finally {
        isPushingRef.current = false;
      }
    },
    [deviceId, pushToGroup, now, version],
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

  const pullAllGroups = useCallback(async (): Promise<number> => {
    const currentDeviceId = deviceId;
    if (!currentDeviceId) return 0;
    const { strong, legacy } = coexistingRef.current;
    if (!strong && !legacy) return 0;

    let totalImported = 0;
    let anySuccess = false;
    let lastError: unknown = null;

    if (strong) {
      try {
        const isRecovery = allEventsRef.current.length === 0;
        const imported = await coordinator.runPull({
          keys: strong.keys,
          deviceId: currentDeviceId,
          isRecovery,
        });
        totalImported += imported;
        anySuccess = true;
      } catch (err) {
        lastError = err;
        console.warn("[Sync] Pull do Grupo forte falhou:", err);
      }
    }

    if (legacy) {
      const legacyDisabled = isLegacySyncDisabled({ now: now(), version });
      if (!legacyDisabled) {
        try {
          const isRecovery = allEventsRef.current.length === 0;
          const imported = await coordinator.runPull({
            keys: legacy.keys,
            deviceId: currentDeviceId,
            isRecovery,
          });
          totalImported += imported;
          anySuccess = true;
        } catch (err) {
          lastError = err;
          console.warn("[Sync] Pull do Grupo antigo falhou:", err);
        }
      }
    }

    if (anySuccess) {
      if (totalImported > 0) await saveLastSync(Date.now());
      return totalImported;
    }

    if (lastError) {
      throw lastError;
    }
    return 0;
  }, [deviceId, coordinator, saveLastSync, now, version]);

  const doSync = useCallback(async () => {
    const currentDeviceId = deviceId;
    const currentCoexisting = coexistingRef.current;
    if (
      !currentDeviceId ||
      (!currentCoexisting.strong && !currentCoexisting.legacy && !currentCoexisting.legacyCutoff)
    ) {
      return;
    }
    if (coordinator.isImporting()) return;

    // Story 4.9: Se o canal legado atingiu data de corte ou versão mínima enquanto o app rodava
    const legacyDisabled = isLegacySyncDisabled({ now: now(), version });
    if (currentCoexisting.legacy && legacyDisabled) {
      if (legacySubRef.current) {
        legacySubRef.current.close();
        legacySubRef.current = null;
      }
      const updated = await loadCoexistingGroups({ now: now(), version });
      coexistingRef.current = updated;
      setCoexistingGroups(updated);
      if (!updated.strong) {
        setSyncStatus("offline");
        setErrorMessage(
          updated.legacyCutoffReason === "version_deprecated"
            ? LEGACY_VERSION_TOO_OLD_MESSAGE
            : LEGACY_CUTOFF_MESSAGE,
        );
        return;
      }
    }

    if (currentCoexisting.legacy && !legacyDisabled) {
      await publishLegacyCutoffWarningIfNeeded(currentCoexisting.legacy, currentDeviceId);
    }

    if (!coexistingRef.current.strong && !coexistingRef.current.legacy) {
      return;
    }

    try {
      setSyncStatus("syncing");

      await pushAllGroups(false);
      await pullAllGroups();

      initialSyncDoneRef.current = true;

      setSyncStatus("connected");
      setErrorMessage(null);
    } catch (err) {
      console.warn("[Sync] periodic sync failed (offline):", err);
      setSyncStatus("offline");
    }
  }, [
    deviceId,
    pushAllGroups,
    pullAllGroups,
    coordinator,
    now,
    version,
    publishLegacyCutoffWarningIfNeeded,
  ]);

  // --- Main sync effect ---

  useEffect(() => {
    const { strong, legacy } = coexistingGroups;
    const hasAnyGroup = Boolean(strong || legacy);

    if (!hasAnyGroup || !deviceId || loading) {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
      if (legacySubRef.current) {
        legacySubRef.current.close();
        legacySubRef.current = null;
      }
      initialSyncDoneRef.current = false;
      return;
    }

    if (!initialSyncDoneRef.current) {
      setSyncStatus("syncing");

      pushAllGroups(true)
        .then(() => pullAllGroups())
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

    // Assinatura ao vivo para o Grupo forte
    if (strong) {
      try {
        const strongGroupId = strong.keys.publicKey;
        subRef.current = subscribeToSyncEvents(
          strong.keys,
          deviceId,
          coordinator.liveSince(),
          (event, createdAt) => {
            const incoming = processIncomingEvents({
              incomingEvents: [event],
              currentDeviceId: deviceId,
              existingIds: EMPTY_SET,
            });
            if (incoming.foreignEventIds.length > 0) {
              tracker.markReceived(incoming.foreignEventIds, strongGroupId).catch(() => {});
            }
            coordinator.enqueueLive(event, createdAt);
          },
          (events, createdAt) => {
            if (events.length === 0) return;
            const incoming = processIncomingEvents({
              incomingEvents: events,
              currentDeviceId: deviceId,
              existingIds: EMPTY_SET,
            });
            if (incoming.foreignEventIds.length > 0) {
              tracker.markReceived(incoming.foreignEventIds, strongGroupId).catch(() => {});
            }
            coordinator.enqueueLiveBatch(events, createdAt);
          },
        );
      } catch {}
    }

    // Assinatura ao vivo para o Grupo antigo (Story 4.7 Convivência)
    // Story 4.9: Bloqueada se o canal legado estiver descontinuado
    const legacyDisabled = isLegacySyncDisabled({ now: now(), version });
    if (legacy && !legacyDisabled) {
      try {
        const legacyGroupId = legacy.keys.publicKey;
        legacySubRef.current = subscribeToSyncEvents(
          legacy.keys,
          deviceId,
          coordinator.liveSince(),
          (event, createdAt) => {
            if (isLegacySyncDisabled({ now: now(), version })) {
              legacySubRef.current?.close();
              legacySubRef.current = null;
              return;
            }
            legacyEventIdsRef.current.add(event.id);
            const incoming = processIncomingEvents({
              incomingEvents: [event],
              currentDeviceId: deviceId,
              existingIds: EMPTY_SET,
            });
            if (incoming.foreignEventIds.length > 0) {
              tracker.markReceived(incoming.foreignEventIds, legacyGroupId).catch(() => {});
            }
            coordinator.enqueueLive(event, createdAt);
          },
          (events, createdAt) => {
            if (isLegacySyncDisabled({ now: now(), version })) {
              legacySubRef.current?.close();
              legacySubRef.current = null;
              return;
            }
            if (events.length === 0) return;
            for (const evt of events) {
              legacyEventIdsRef.current.add(evt.id);
            }
            const incoming = processIncomingEvents({
              incomingEvents: events,
              currentDeviceId: deviceId,
              existingIds: EMPTY_SET,
            });
            if (incoming.foreignEventIds.length > 0) {
              tracker.markReceived(incoming.foreignEventIds, legacyGroupId).catch(() => {});
            }
            coordinator.enqueueLiveBatch(events, createdAt);
          },
        );
      } catch {}
    }

    return () => {
      if (pullTimerRef.current) {
        clearInterval(pullTimerRef.current);
        pullTimerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
      if (legacySubRef.current) {
        legacySubRef.current.close();
        legacySubRef.current = null;
      }
    };
  }, [coexistingGroups, deviceId, loading, doSync, pullAllGroups, pushAllGroups, coordinator, tracker, now, version]);

  // --- Auto-push on local event changes ---

  useEffect(() => {
    const { strong, legacy } = coexistingGroups;
    if ((!strong && !legacy) || !deviceId || loading) return;

    if (pushDebounceRef.current) {
      clearTimeout(pushDebounceRef.current);
    }

    pushDebounceRef.current = setTimeout(() => {
      if (isPushingRef.current) return;
      if (!deviceId) return;
      const current = coexistingRef.current;
      if (!current.strong && !current.legacy) return;

      pushAllGroups(false)
        .then(() => {
          setSyncStatus("connected");
        })
        .catch(() => {
          setSyncStatus("offline");
        });
    }, 500);

    return () => {
      if (pushDebounceRef.current) {
        clearTimeout(pushDebounceRef.current);
      }
    };
  }, [localEventCount, coexistingGroups, deviceId, loading, allEvents.length, pushAllGroups]);

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

  const createGroup = useCallback(async (options?: { keepLegacy?: boolean }): Promise<string | null> => {
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

      // Grupo forte (Story 4.3): 256 bits criptográficos, DOMUS1-...
      const group = await createStrongSyncGroup(options);
      const coexisting = await loadCoexistingGroups({ now: now(), version });
      coexistingRef.current = coexisting;
      setCoexistingGroups(coexisting);

      if (!options?.keepLegacy) {
        if (legacySubRef.current) {
          legacySubRef.current.close();
          legacySubRef.current = null;
        }
        // Grupo novo sem legado: cursor e fila do grupo anterior não valem mais.
        await coordinator.reset();
      }

      isStrongGroupRef.current = true;
      setKeys(group.keys);
      setGroupCode(group.code);
      groupPushHashesRef.current = {};
      lastPushHashRef.current = "empty";
      initialSyncDoneRef.current = false;

      try {
        await pushAllGroups(true);
        setSyncStatus("connected");
      } catch (err) {
        console.warn("[Sync] Initial push after group creation failed:", err);
        setSyncStatus("offline");
      }

      await saveLastSync(Date.now());
      return group.code;
    } catch {
      setSyncStatus("error");
      setErrorMessage("Falha ao criar grupo. Tente novamente.");
      return null;
    }
  }, [deviceId, pushAllGroups, saveLastSync, coordinator, now, version]);

  // Story 4.8: Migra aparelho do Grupo antigo para o Grupo forte mantendo coexistência (keepLegacy: true)
  const migrateToStrongGroup = useCallback(async (): Promise<string | null> => {
    if (!canMigrateToStrongGroup(coexistingRef.current, isStrongGroupRef.current, groupCode)) {
      return null;
    }
    return createGroup({ keepLegacy: true });
  }, [groupCode, createGroup]);

  const joinGroup = useCallback(
    async (code: string, options?: { keepLegacy?: boolean }): Promise<boolean> => {
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

        const activeGroup = await resolveJoinSyncGroup(code, options);
        const coexisting = await loadCoexistingGroups({ now: now(), version });
        coexistingRef.current = coexisting;
        setCoexistingGroups(coexisting);

        const active = coexisting.strong ?? coexisting.legacy ?? activeGroup;

        if (!options?.keepLegacy) {
          if (legacySubRef.current) {
            legacySubRef.current.close();
            legacySubRef.current = null;
          }
          // Grupo novo sem legado: cursor e fila do grupo anterior não valem mais.
          await coordinator.reset();
        }

        isStrongGroupRef.current = active.isStrong;
        setKeys(active.keys);
        setGroupCode(active.code);
        groupPushHashesRef.current = {};
        lastPushHashRef.current = "empty";
        initialSyncDoneRef.current = false;

        try {
          await pushAllGroups(true);
        } catch {}

        try {
          await pullAllGroups();
        } catch {}

        setSyncStatus("connected");
        await saveLastSync(Date.now());
        return true;
      } catch (err: unknown) {
        setSyncStatus("error");
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Falha ao entrar no grupo. Verifique o código e tente novamente.";
        setErrorMessage(msg);
        return false;
      }
    },
    [deviceId, pushAllGroups, pullAllGroups, saveLastSync, coordinator, now, version],
  );

  const leaveGroup = useCallback(async () => {
    if (pullTimerRef.current) {
      clearInterval(pullTimerRef.current);
      pullTimerRef.current = null;
    }
    if (pushDebounceRef.current) {
      clearTimeout(pushDebounceRef.current);
      pushDebounceRef.current = null;
    }
    if (subRef.current) {
      subRef.current.close();
      subRef.current = null;
    }
    if (legacySubRef.current) {
      legacySubRef.current.close();
      legacySubRef.current = null;
    }
    closePool();
    legacyEventIdsRef.current.clear();
    // Nova época já (síncrono): pull e drenagem em curso do grupo antigo são ignorados.
    const resetting = coordinator.reset();

    const previousStrongGroupId = coexistingRef.current.strong?.keys.publicKey;
    const previousLegacyGroupId = coexistingRef.current.legacy?.keys.publicKey;
    if (previousStrongGroupId) {
      await tracker.clearGroup(previousStrongGroupId).catch(() => {});
    }
    if (previousLegacyGroupId) {
      await tracker.clearGroup(previousLegacyGroupId).catch(() => {});
    }

    isStrongGroupRef.current = false;
    setCoexistingGroups({ strong: null, legacy: null, legacyCutoff: false, legacyCode: null });
    coexistingRef.current = { strong: null, legacy: null, legacyCutoff: false, legacyCode: null };
    setGroupCode(null);
    setKeys(null);
    setSyncStatus("idle");
    setErrorMessage(null);
    groupPushHashesRef.current = {};
    lastPushHashRef.current = "empty";
    initialSyncDoneRef.current = false;
    await clearAllSyncGroupSecrets();
    await resetting;
    await AsyncStorage.removeItem(LAST_PUSH_HASH_KEY);
    await AsyncStorage.removeItem(GROUP_PUSH_HASHES_KEY);
  }, [coordinator, tracker]);

  const pushNow = useCallback(async () => {
    const { strong, legacy } = coexistingRef.current;
    if (!strong && !legacy) return;
    if (!deviceId) return;
    try {
      setSyncStatus("syncing");
      await pushAllGroups(true);
      setSyncStatus("connected");
      await saveLastSync(Date.now());
    } catch {
      setSyncStatus("offline");
    }
  }, [deviceId, pushAllGroups, saveLastSync]);

  const pullNow = useCallback(async (): Promise<number> => {
    const { strong, legacy } = coexistingRef.current;
    if (!strong && !legacy) return 0;
    if (!deviceId) return 0;
    try {
      setSyncStatus("syncing");
      const count = await pullAllGroups();
      setSyncStatus("connected");
      return count;
    } catch {
      setSyncStatus("offline");
      return 0;
    }
  }, [deviceId, pullAllGroups]);

  const resetStatus = useCallback(() => {
    setSyncStatus(groupCode ? "connected" : "idle");
    setErrorMessage(null);
  }, [groupCode]);

  return {
    groupCode,
    isStrongGroup,
    canMigrate,
    migrateToStrongGroup,
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
    pushMyEvents,
    pullFromRelays,
    resetStatus,
    tracker,
    coexistingGroups,
  };
}
