import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";
import { BACKUP_FILE_EXTENSION } from "../domain/BackupMetadata";
import { isWeb } from "./deviceBackupKey";
import { getNativeAccessToken } from "./GoogleNativeAuth";
import {
  isDriveConnected,
  refreshExpiredAccessToken,
  resolveAccessToken,
} from "./driveTokens";
import type { DriveTokens } from "./driveTokens";

export type { DriveTokens } from "./driveTokens";

// SecureStore não existe na web; lá os tokens ficam cifrados por webSecrets (AES-GCM).
const secureGet = async (key: string): Promise<string | null> => {
  if (isWeb()) return webSecrets.get(key);
  return SecureStore.getItemAsync(key);
};
const secureSet = async (key: string, value: string): Promise<void> => {
  if (isWeb()) { await webSecrets.set(key, value); return; }
  await SecureStore.setItemAsync(key, value);
};
const secureDelete = async (key: string): Promise<void> => {
  if (isWeb()) { await webSecrets.remove(key); return; }
  await SecureStore.deleteItemAsync(key);
};

// ─── constants ───────────────────────────────────────────────────────────────

const TOKENS_KEY = "domus_gdrive_tokens_v1";
const LAST_SYNC_KEY = "domus_gdrive_last_sync";
const FILE_ID_KEY = "domus_gdrive_file_id";

export const DRIVE_BACKUP_FILENAME = `domus-backup${BACKUP_FILE_EXTENSION}`;

/** Incrementado em clearTokens() para impedir que renovações em voo ressuscitem tokens desconectados. */
let tokenSessionEpoch = 0;

// ─── service ─────────────────────────────────────────────────────────────────

async function uploadBackupInternal(
  content: string,
  options: { retried401: boolean; retried404: boolean; tokenOverride?: string },
): Promise<void> {
  const accessToken =
    options.tokenOverride ?? (await GoogleDriveService.getValidAccessToken());
  if (!accessToken) throw new Error("Não autenticado no Google Drive.");

  const existingId = await GoogleDriveService.findBackupFileId(accessToken);
  const boundary = "------domus_boundary_7x2k9";
  const metadata = JSON.stringify({
    name: DRIVE_BACKUP_FILENAME,
    mimeType: "application/octet-stream",
    ...(existingId ? {} : { parents: ["appDataFolder"] }),
  });

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/octet-stream",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary="${boundary}"`,
    },
    body,
  });

  if (!res.ok) {
    // Se 401 com token em cache, limpa cache e tenta renovar silenciosamente 1x antes de falhar
    if (res.status === 401 && !options.retried401) {
      const freshToken = await GoogleDriveService.refreshAccessTokenOnUnauthorized();
      if (freshToken) {
        return uploadBackupInternal(content, {
          retried401: true,
          retried404: options.retried404,
          tokenOverride: freshToken,
        });
      }
    }

    // Se 404 (arquivo deletado pelo usuário), limpa cache e tenta criar novo 1x
    if (res.status === 404 && !options.retried404) {
      await AsyncStorage.removeItem(FILE_ID_KEY);
      return uploadBackupInternal(content, {
        retried401: options.retried401,
        retried404: true,
        tokenOverride: accessToken,
      });
    }

    const err = await res.text();
    throw new Error(`Google Drive: ${res.status} ${err}`);
  }

  const data = await res.json();
  if (data.id) await AsyncStorage.setItem(FILE_ID_KEY, data.id);
  await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

export const GoogleDriveService = {
  // ── Token persistence ─────────────────────────────────────────────────────

  async saveTokens(tokens: DriveTokens): Promise<void> {
    await secureSet(TOKENS_KEY, JSON.stringify(tokens));
  },

  async loadTokens(): Promise<DriveTokens | null> {
    try {
      const raw = await secureGet(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as DriveTokens) : null;
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    tokenSessionEpoch += 1;
    await Promise.all([
      secureDelete(TOKENS_KEY),
      AsyncStorage.removeItem(LAST_SYNC_KEY),
      AsyncStorage.removeItem(FILE_ID_KEY),
    ]);
  },

  async isConnected(): Promise<boolean> {
    return isDriveConnected(await this.loadTokens());
  },

  async getConnectedEmail(): Promise<string | null> {
    const t = await this.loadTokens();
    return t?.email ?? null;
  },

  // ── Access token ──────────────────────────────────────────────────────────

  /** Retorna um access token válido; no nativo renova via AuthorizationClient (sem client secret). */
  async getValidAccessToken(): Promise<string | null> {
    const epoch = tokenSessionEpoch;
    const tokens = await this.loadTokens();
    if (epoch !== tokenSessionEpoch) return null;

    const provider = isWeb() ? null : getNativeAccessToken;
    const resolved = await resolveAccessToken(tokens, provider);
    if (!resolved || epoch !== tokenSessionEpoch) return null;

    if (resolved !== tokens) {
      await this.saveTokens(resolved);
    }
    return resolved.accessToken;
  },

  /** Limpa o token em cache e tenta 1x renovação silenciosa após HTTP 401. */
  async refreshAccessTokenOnUnauthorized(): Promise<string | null> {
    if (isWeb()) return null;
    const epoch = tokenSessionEpoch;
    const tokens = await this.loadTokens();
    if (epoch !== tokenSessionEpoch) return null;

    const refreshed = await refreshExpiredAccessToken(tokens, getNativeAccessToken);
    if (!refreshed || epoch !== tokenSessionEpoch) return null;

    await this.saveTokens(refreshed);
    return refreshed.accessToken;
  },

  // ── User info ─────────────────────────────────────────────────────────────

  async fetchUserEmail(accessToken: string): Promise<string> {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data.email ?? "";
    } catch {
      return "";
    }
  },

  // ── Drive file operations ─────────────────────────────────────────────────

  /** Busca o ID do arquivo de backup no Drive (cache local + API se necessário). */
  async findBackupFileId(accessToken: string): Promise<string | null> {
    const cached = await AsyncStorage.getItem(FILE_ID_KEY);
    if (cached) return cached;

    try {
      const query = encodeURIComponent(`name='${DRIVE_BACKUP_FILENAME}' and trashed=false`);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=appDataFolder`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const fileId = data.files?.[0]?.id ?? null;
      if (fileId) await AsyncStorage.setItem(FILE_ID_KEY, fileId);
      return fileId;
    } catch {
      return null;
    }
  },

  /**
   * Faz upload (create ou update) do arquivo de backup no Google Drive.
   * Usa upload multipart para enviar metadata + conteúdo em uma única requisição.
   */
  async uploadBackup(content: string): Promise<void> {
    return uploadBackupInternal(content, { retried401: false, retried404: false });
  },

  async getLastSyncAt(): Promise<number | null> {
    const v = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return v ? parseInt(v, 10) : null;
  },
};
