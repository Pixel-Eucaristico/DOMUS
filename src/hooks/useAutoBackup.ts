import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useAppState } from "@/src/context/AppStateProvider";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { BACKUP_FILE_EXTENSION } from "@/src/modules/backup/domain/BackupMetadata";
import { buildExportEvents } from "@/src/context/localEventLog";

import {
  DEVICE_KEY_STORAGE,
  getDeviceBackupKey,
  getOrCreateDeviceBackupKey,
  clearDeviceBackupKey,
  isWeb,
} from "@/src/modules/backup/infrastructure/deviceBackupKey";

export {
  DEVICE_KEY_STORAGE,
  getDeviceBackupKey,
  getOrCreateDeviceBackupKey,
  clearDeviceBackupKey,
};

// ─── constantes ──────────────────────────────────────────────────────────────

const LAST_AUTO_BACKUP_TS = "domus_auto_backup_last_ts";

/** Intervalo entre auto-backups: 24 horas */
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Caminho fixo no documentDirectory (sobrescrito a cada backup) */
export function autoBackupFilePath(): string {
  return `${FileSystem.documentDirectory ?? ""}domus-autobackup${BACKUP_FILE_EXTENSION}`;
}

// ─── helpers públicos ─────────────────────────────────────────────────────────

/** Timestamp do último auto-backup bem-sucedido (null = nunca). */
export async function getLastAutoBackupTs(): Promise<number | null> {
  const v = await AsyncStorage.getItem(LAST_AUTO_BACKUP_TS);
  return v ? parseInt(v, 10) : null;
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * Executa um auto-backup silencioso na inicialização do app,
 * caso tenham se passado ≥ 24 h desde o último.
 *
 * - Criptografa com a chave de dispositivo (gerada automaticamente na 1ª vez).
 * - Salva em `documentDirectory/domus-autobackup.domusbackup`.
 * - Nunca lança exceção — falhas são silenciosas para não afetar o app.
 * - Não roda na web (expo-file-system não tem documentDirectory).
 */
export function useAutoBackup() {
  const { getAllEvents, deviceId, loading } = useAppState();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (loading || hasRunRef.current || isWeb()) return;
    hasRunRef.current = true;

    (async () => {
      try {
        const lastTs = await getLastAutoBackupTs();
        const now = Date.now();
        const due = !lastTs || now - lastTs >= AUTO_BACKUP_INTERVAL_MS;
        if (!due) return;

        const events = buildExportEvents(getAllEvents(), deviceId);
        if (events.length === 0) return;

        const key = await getOrCreateDeviceBackupKey();
        const filePath = autoBackupFilePath();

        await BackupExportService.saveLocal(
          events,
          deviceId ?? "unknown",
          key,
          filePath,
        );

        await AsyncStorage.setItem(LAST_AUTO_BACKUP_TS, now.toString());

        // ── Upload silencioso para Google Drive (se conectado) ─────────────
        try {
          const driveConnected = await GoogleDriveService.isConnected();
          if (driveConnected) {
            // Lê o arquivo recém-salvo e envia ao Drive
            const { FileSystemService } = await import("@/src/modules/backup/infrastructure/FileSystemService");
            const content = await FileSystemService.read(filePath);
            await GoogleDriveService.uploadBackup(content);
          }
        } catch {
          // Drive upload é best-effort — não afeta o backup local
        }
      } catch {
        // auto-backup é best-effort — nunca crashar o app
      }
    })();
  }, [loading, deviceId, getAllEvents]);
}
