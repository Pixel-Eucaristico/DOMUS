import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useAppState } from "@/src/context/AppStateProvider";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { BACKUP_FILE_EXTENSION } from "@/src/modules/backup/domain/BackupMetadata";

// ─── constantes ──────────────────────────────────────────────────────────────

const DEVICE_KEY_STORAGE = "domus_auto_backup_device_key";
const LAST_AUTO_BACKUP_TS = "domus_auto_backup_last_ts";

/** Intervalo entre auto-backups: 24 horas */
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Caminho fixo no documentDirectory (sobrescrito a cada backup) */
export function autoBackupFilePath(): string {
  return `${FileSystem.documentDirectory ?? ""}domus-autobackup${BACKUP_FILE_EXTENSION}`;
}

// ─── helpers públicos ─────────────────────────────────────────────────────────

/** Retorna a chave de dispositivo já gerada, ou null se ainda não existir. */
export async function getDeviceBackupKey(): Promise<string | null> {
  return AsyncStorage.getItem(DEVICE_KEY_STORAGE);
}

/** Gera (ou retorna existente) a chave de dispositivo usada no auto-backup. */
export async function getOrCreateDeviceBackupKey(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing) return existing;

  // 24 chars alfanuméricos, sem ambiguidade (sem 0/O/1/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 24; i++) {
    if (i > 0 && i % 6 === 0) key += "-";
    key += chars[bytes[i] % chars.length];
  }

  await AsyncStorage.setItem(DEVICE_KEY_STORAGE, key);
  return key;
}

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
    if (loading || hasRunRef.current || Platform.OS === "web") return;
    hasRunRef.current = true;

    (async () => {
      try {
        const lastTs = await getLastAutoBackupTs();
        const now = Date.now();
        const due = !lastTs || now - lastTs >= AUTO_BACKUP_INTERVAL_MS;
        if (!due) return;

        const events = getAllEvents();
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
