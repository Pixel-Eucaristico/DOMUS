import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { BackupExportService } from "./BackupExportService";
import { BackupImportService } from "./BackupImportService";
import type { BackupPreview } from "../domain/BackupMetadata";

const isWeb = Platform.OS === "web";

// ─── constants ───────────────────────────────────────────────────────────────

const SECURE_PASSWORD_KEY = "domus_auto_backup_password";
const LAST_AUTO_BACKUP_TS_KEY = "domus_auto_backup_ts";
const AUTO_BACKUP_ENABLED_KEY = "domus_auto_backup_enabled";
const AUTO_BACKUP_INTERVAL_KEY = "domus_auto_backup_interval_h";

export const AUTO_BACKUP_FILENAME = "domus-autobackup.domusbackup";
export const AUTO_BACKUP_INTERVALS_H = [6, 12, 24, 48, 72] as const;
export type AutoBackupIntervalH = (typeof AUTO_BACKUP_INTERVALS_H)[number];

export interface AutoBackupConfig {
  enabled: boolean;
  intervalHours: AutoBackupIntervalH;
  hasPassword: boolean;
}

export interface AutoBackupInfo {
  exists: boolean;
  lastBackupAt: string | null; // ISO string stored in AsyncStorage
  filePath: string;
}

// ─── service ─────────────────────────────────────────────────────────────────

export const AutoBackupService = {
  filePath(): string {
    return `${FileSystem.documentDirectory ?? ""}${AUTO_BACKUP_FILENAME}`;
  },

  // ── config ────────────────────────────────────────────────────────────────

  async getConfig(): Promise<AutoBackupConfig> {
    const [enabled, interval, pw] = await Promise.all([
      AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY),
      AsyncStorage.getItem(AUTO_BACKUP_INTERVAL_KEY),
      SecureStore.getItemAsync(SECURE_PASSWORD_KEY),
    ]);
    return {
      enabled: enabled === "true",
      intervalHours: (parseInt(interval ?? "24") as AutoBackupIntervalH) || 24,
      hasPassword: !!pw,
    };
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled ? "true" : "false");
  },

  async setInterval(hours: AutoBackupIntervalH): Promise<void> {
    await AsyncStorage.setItem(AUTO_BACKUP_INTERVAL_KEY, hours.toString());
  },

  /** Grava a senha no keychain seguro. Passa null para remover. */
  async setPassword(password: string | null): Promise<void> {
    if (password === null) {
      await SecureStore.deleteItemAsync(SECURE_PASSWORD_KEY);
    } else {
      await SecureStore.setItemAsync(SECURE_PASSWORD_KEY, password);
    }
  },

  async getPassword(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_PASSWORD_KEY);
  },

  // ── info ──────────────────────────────────────────────────────────────────

  async getInfo(): Promise<AutoBackupInfo> {
    const filePath = this.filePath();
    if (isWeb) {
      const lastTs = await AsyncStorage.getItem(LAST_AUTO_BACKUP_TS_KEY);
      return { exists: false, lastBackupAt: lastTs, filePath };
    }
    const [info, lastTs] = await Promise.all([
      FileSystem.getInfoAsync(filePath),
      AsyncStorage.getItem(LAST_AUTO_BACKUP_TS_KEY),
    ]);
    return {
      exists: info.exists,
      lastBackupAt: lastTs,
      filePath,
    };
  },

  // ── run ───────────────────────────────────────────────────────────────────

  /**
   * Verifica se é hora de fazer auto-backup e executa se necessário.
   * Retorna `true` se o backup foi realizado, `false` caso contrário.
   */
  async runIfNeeded(
    events: SyncEvent[],
    deviceId: string,
  ): Promise<boolean> {
    if (isWeb) return false;
    const config = await this.getConfig();
    if (!config.enabled || !config.hasPassword) return false;
    if (events.length === 0) return false;

    const lastTs = await AsyncStorage.getItem(LAST_AUTO_BACKUP_TS_KEY);
    const now = Date.now();
    const intervalMs = config.intervalHours * 60 * 60 * 1000;

    if (lastTs && now - parseInt(lastTs) < intervalMs) return false;

    const password = await this.getPassword();
    if (!password) return false;

    await BackupExportService.saveLocal(events, deviceId, password, this.filePath());
    await AsyncStorage.setItem(LAST_AUTO_BACKUP_TS_KEY, now.toString());
    return true;
  },

  // ── restore ───────────────────────────────────────────────────────────────

  /**
   * Lê o arquivo de auto-backup local, decripta e retorna preview + events.
   * Usa a senha salva no keychain.
   */
  async readLocalBackup(): Promise<{ preview: BackupPreview; events: SyncEvent[] } | null> {
    if (isWeb) return null;
    const password = await this.getPassword();
    if (!password) return null;

    const filePath = this.filePath();
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return null;

    let lastStatus = "";
    const { payload, preview } = await BackupImportService.readAndValidate(
      filePath,
      password,
      (s) => { lastStatus = s.type; },
    );
    void lastStatus;
    const events = BackupImportService.extractEvents(payload);
    return { preview, events };
  },
};
