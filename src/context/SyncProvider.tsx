import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useAppState } from "@/src/context/AppStateProvider";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const DEVICE_ID_KEY = "domus_device_id";
const LAST_SYNC_KEY = "domus_last_sync_ts";

type SyncStatus = "idle" | "exporting" | "importing" | "success" | "error";

interface SyncContextValue {
  deviceId: string | null;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  errorMessage: string | null;
  eventCount: number;
  exportToFile: () => Promise<void>;
  importFromFile: () => Promise<void>;
  getQRData: (maxEvents?: number) => string | null;
  importFromQR: (data: string) => Promise<number>;
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

interface SyncBundle {
  v: number;
  deviceId: string;
  exportedAt: number;
  events: SyncEvent[];
}

function createBundle(deviceId: string, events: SyncEvent[]): SyncBundle {
  return {
    v: 1,
    deviceId,
    exportedAt: Date.now(),
    events,
  };
}

function parseBundle(data: string): SyncBundle | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && parsed.v === 1 && Array.isArray(parsed.events)) {
      return parsed as SyncBundle;
    }
    if (Array.isArray(parsed)) {
      return {
        v: 1,
        deviceId: "unknown",
        exportedAt: Date.now(),
        events: parsed as SyncEvent[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

function compressForQR(events: SyncEvent[]): string {
  const compact = events.map((e) => ({
    i: e.id,
    t: e.type,
    p: e.payload,
    ts: e.timestamp,
    d: e.deviceId,
    s: e.signature,
  }));
  return JSON.stringify({ v: 1, e: compact });
}

function decompressFromQR(data: string): SyncEvent[] | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && parsed.v === 1 && Array.isArray(parsed.e)) {
      return parsed.e.map((c: any) => ({
        id: c.i,
        type: c.t,
        payload: c.p,
        timestamp: c.ts,
        deviceId: c.d,
        signature: c.s,
      }));
    }
    return null;
  } catch {
    return null;
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getAllEvents, importEvents } = useAppState();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allEvents = getAllEvents();
  const eventCount = allEvents.length;

  useEffect(() => {
    loadOrCreateDeviceId().then(setDeviceId);
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncTime(parseInt(val, 10));
    });
  }, []);

  const saveLastSync = useCallback(async (ts: number) => {
    setLastSyncTime(ts);
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString());
    } catch {}
  }, []);

  const exportToFile = useCallback(async () => {
    if (!deviceId) return;

    try {
      setSyncStatus("exporting");
      setErrorMessage(null);

      const events = getAllEvents();
      const bundle = createBundle(deviceId, events);
      const json = JSON.stringify(bundle);

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `domus-sync-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSyncStatus("success");
        return;
      }

      const file = new ExpoFile(Paths.cache, `domus-sync-${Date.now()}.json`);
      file.write(json);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Exportar dados DOMUS",
          UTI: "public.json",
        });
      } else {
        Alert.alert(
          "Arquivo salvo",
          "O arquivo foi salvo no cache do app. O compartilhamento nao esta disponivel neste dispositivo.",
        );
      }

      setSyncStatus("success");
      await saveLastSync(Date.now());
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao exportar");
    }
  }, [deviceId, getAllEvents, saveLastSync]);

  const importFromFile = useCallback(async () => {
    try {
      setSyncStatus("importing");
      setErrorMessage(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setSyncStatus("idle");
        return;
      }

      const asset = result.assets[0];
      let content: string;

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        content = await response.text();
      } else {
        const importedFile = new ExpoFile(asset.uri);
        content = await importedFile.text();
      }

      const bundle = parseBundle(content);
      if (!bundle) {
        setSyncStatus("error");
        setErrorMessage("Arquivo invalido. Use um arquivo exportado pelo DOMUS.");
        return;
      }

      const imported = await importEvents(bundle.events);

      setSyncStatus("success");
      await saveLastSync(Date.now());

      Alert.alert(
        "Importacao concluida",
        imported > 0
          ? `${imported} evento(s) novo(s) importado(s) com sucesso.`
          : "Nenhum evento novo encontrado. Os dados ja estavam sincronizados.",
      );
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao importar");
    }
  }, [importEvents, saveLastSync]);

  const getQRData = useCallback(
    (maxEvents: number = 50): string | null => {
      const events = getAllEvents();
      if (events.length === 0) return null;

      const recent = events.slice(-maxEvents);
      const compressed = compressForQR(recent);

      if (compressed.length > 2500) {
        const fewer = events.slice(-Math.floor(maxEvents / 2));
        const smaller = compressForQR(fewer);
        if (smaller.length > 2500) {
          const minimal = events.slice(-5);
          return compressForQR(minimal);
        }
        return smaller;
      }

      return compressed;
    },
    [getAllEvents],
  );

  const importFromQR = useCallback(
    async (data: string): Promise<number> => {
      const events = decompressFromQR(data);
      if (!events || events.length === 0) {
        Alert.alert("QR invalido", "Nao foi possivel ler os dados do QR code.");
        return 0;
      }

      const imported = await importEvents(events);
      if (imported > 0) {
        await saveLastSync(Date.now());
      }
      return imported;
    },
    [importEvents, saveLastSync],
  );

  const resetStatus = useCallback(() => {
    setSyncStatus("idle");
    setErrorMessage(null);
  }, []);

  const value = useMemo<SyncContextValue>(
    () => ({
      deviceId,
      syncStatus,
      lastSyncTime,
      errorMessage,
      eventCount,
      exportToFile,
      importFromFile,
      getQRData,
      importFromQR,
      resetStatus,
    }),
    [
      deviceId,
      syncStatus,
      lastSyncTime,
      errorMessage,
      eventCount,
      exportToFile,
      importFromFile,
      getQRData,
      importFromQR,
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
