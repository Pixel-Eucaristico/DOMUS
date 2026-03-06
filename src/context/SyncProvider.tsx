import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import { getRelays } from "@/src/modules/nostrSync";
import { useSyncEngine, type SyncStatus } from "./useSyncEngine";

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

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getAllEvents, importEvents, localEventCount, deviceId, loading } = useAppState();

  const engine = useSyncEngine({
    getAllEvents,
    importEvents,
    localEventCount,
    deviceId,
    loading,
  });

  const relayCount = getRelays().length;

  const value = useMemo<SyncContextValue>(
    () => ({
      deviceId,
      groupId: engine.groupCode,
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
    }),
    [
      deviceId,
      engine.groupCode,
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
