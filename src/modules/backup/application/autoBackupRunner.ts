import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { BACKUP_FILE_EXTENSION } from "@/src/modules/backup/domain/BackupMetadata";
import { buildExportEvents } from "@/src/context/localEventLog";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  getOrCreateDeviceBackupKey,
  isWeb,
} from "@/src/modules/backup/infrastructure/deviceBackupKey";

export const LAST_AUTO_BACKUP_TS = "domus_auto_backup_last_ts";
export const LAST_DRIVE_AUTO_BACKUP_TS = "domus_auto_backup_last_drive_ts";

/** Intervalo entre auto-backups: 24 horas */
export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Caminho fixo no documentDirectory (sobrescrito a cada backup). */
export function autoBackupFilePath(
  documentDirectory: string | null | undefined = FileSystem.documentDirectory,
): string {
  if (!documentDirectory) {
    throw new Error("Diretório de documentos indisponível para o backup automático.");
  }
  return `${documentDirectory}domus-autobackup${BACKUP_FILE_EXTENSION}`;
}

async function readStoredTimestamp(storageKey: string): Promise<number | null> {
  const v = await AsyncStorage.getItem(storageKey);
  if (!v) return null;
  const parsed = Number.parseInt(v, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Timestamp do último auto-backup local bem-sucedido (null = nunca ou inválido). */
export async function getLastAutoBackupTs(): Promise<number | null> {
  return readStoredTimestamp(LAST_AUTO_BACKUP_TS);
}

/** Timestamp do último envio automático ao Google Drive bem-sucedido (null = nunca). */
export async function getLastDriveAutoBackupTs(): Promise<number | null> {
  return readStoredTimestamp(LAST_DRIVE_AUTO_BACKUP_TS);
}

export interface AutoBackupRunResult {
  completed: boolean;
  localSaved: boolean;
  driveUploaded: boolean;
}

export interface RunAutoBackupInput {
  getAllEvents: () => SyncEvent[];
  deviceId: string | null | undefined;
  now?: number;
}

/**
 * Executa o ciclo de auto-backup diário (local cifrado + envio best-effort ao Drive).
 * Retorna `completed: true` quando não há pendência de eventos vazios (ou seja,
 * já estava em dia ou salvou com sucesso).
 */
export async function runAutoBackupIfDue({
  getAllEvents,
  deviceId,
  now = Date.now(),
}: RunAutoBackupInput): Promise<AutoBackupRunResult> {
  if (isWeb()) {
    return { completed: true, localSaved: false, driveUploaded: false };
  }

  const [lastLocalTs, lastDriveTs] = await Promise.all([
    getLastAutoBackupTs(),
    getLastDriveAutoBackupTs(),
  ]);

  const dueLocal = !lastLocalTs || now - lastLocalTs >= AUTO_BACKUP_INTERVAL_MS;
  const dueDrive = !lastDriveTs || now - lastDriveTs >= AUTO_BACKUP_INTERVAL_MS;

  if (!dueLocal && !dueDrive) {
    return { completed: true, localSaved: false, driveUploaded: false };
  }

  const filePath = autoBackupFilePath();
  let localSaved = false;

  if (dueLocal) {
    const events = buildExportEvents(getAllEvents(), deviceId ?? null);
    if (events.length === 0) {
      return { completed: false, localSaved: false, driveUploaded: false };
    }

    const key = await getOrCreateDeviceBackupKey();
    await BackupExportService.saveLocal(
      events,
      deviceId ?? "unknown",
      key,
      filePath,
    );
    await AsyncStorage.setItem(LAST_AUTO_BACKUP_TS, now.toString());
    localSaved = true;
  }

  let driveUploaded = false;
  if (dueDrive) {
    try {
      const driveConnected = await GoogleDriveService.isConnected();
      if (driveConnected) {
        const { FileSystemService } = await import(
          "@/src/modules/backup/infrastructure/FileSystemService"
        );
        const content = await FileSystemService.read(filePath);
        await GoogleDriveService.uploadBackup(content);
        await AsyncStorage.setItem(LAST_DRIVE_AUTO_BACKUP_TS, now.toString());
        driveUploaded = true;
      }
    } catch {
      // Drive upload é best-effort — falha não invalida o backup local e permite retry na próxima execução
    }
  }

  return { completed: true, localSaved, driveUploaded };
}
