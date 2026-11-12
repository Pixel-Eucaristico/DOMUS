import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import Constants from "expo-constants";
import { useAppState } from "@/src/context/AppStateProvider";
import { getRelays } from "@/src/modules/nostrSync";
import { useSyncEngine, type SyncStatus } from "./useSyncEngine";
import type { CoexistingGroups } from "./strongGroupSync";

interface SyncContextValue {
  deviceId: string | null;
  groupId: string | null;
  isStrongGroup: boolean;
  canMigrate: boolean;
  migrateToStrongGroup: () => Promise<string | null>;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  errorMessage: string | null;
  eventCount: number;
  relayCount: number;
  isAutoSyncEnabled: boolean;
  createGroup: (options?: { keepLegacy?: boolean }) => Promise<string | null>;
  joinGroup: (code: string, options?: { keepLegacy?: boolean }) => Promise<boolean>;
  leaveGroup: () => Promise<void>;
  pushNow: () => Promise<void>;
  pullNow: () => Promise<number>;
  resetStatus: () => void;
  coexistingGroups: CoexistingGroups;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getAllEvents, importEvents, localEventCount, deviceId, loading, resetApp, bootEffectsGate } = useAppState();

  const appVersion =
    Constants.expoConfig?.version ?? process.env.EXPO_PUBLIC_APP_VERSION ?? "1.8.0";

  const engine = useSyncEngine({
    getAllEvents,
    importEvents,
    localEventCount,
    deviceId,
    loading,
    version: appVersion,
    resetApp,
    bootEffectsGate,
  });

  const relayCount = getRelays().length;

  const value = useMemo<SyncContextValue>(
    () => ({
      deviceId,
      groupId: engine.groupCode,
      isStrongGroup: engine.isStrongGroup,
      canMigrate: engine.canMigrate,
      migrateToStrongGroup: engine.migrateToStrongGroup,
      syncStatus: engine.syncStatus,
      lastSyncTime: engine.lastSyncTime,
      errorMessage: engine.errorMessage,
      eventCount: engine.eventCount,
      relayCount,
      isAutoSyncEnabled: engine.isAutoSyncEnabled,
      createGroup: engine.createGroup,
      joinGroup: engine.joinGroup,
      leaveGroup: engine.leaveGroup,
      pushNow: engine.pushNow,
      pullNow: engine.pullNow,
      resetStatus: engine.resetStatus,
      coexistingGroups: engine.coexistingGroups,
    }),
    [
      deviceId,
      engine.groupCode,
      engine.isStrongGroup,
      engine.canMigrate,
      engine.migrateToStrongGroup,
      engine.syncStatus,
      engine.lastSyncTime,
      engine.errorMessage,
      engine.eventCount,
      relayCount,
      engine.isAutoSyncEnabled,
      engine.createGroup,
      engine.joinGroup,
      engine.leaveGroup,
      engine.pushNow,
      engine.pullNow,
      engine.resetStatus,
      engine.coexistingGroups,
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
