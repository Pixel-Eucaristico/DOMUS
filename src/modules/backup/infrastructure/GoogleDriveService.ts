import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKUP_FILE_EXTENSION } from "../domain/BackupMetadata";

// ─── constants ───────────────────────────────────────────────────────────────

const TOKENS_KEY = "domus_gdrive_tokens_v1";
const LAST_SYNC_KEY = "domus_gdrive_last_sync";
const FILE_ID_KEY = "domus_gdrive_file_id";

export const DRIVE_BACKUP_FILENAME = `domus-backup${BACKUP_FILE_EXTENSION}`;

// ─── types ───────────────────────────────────────────────────────────────────

export interface DriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  email: string;
  clientId: string; // usado para refresh
}

// ─── service ─────────────────────────────────────────────────────────────────

export const GoogleDriveService = {
  // ── Token persistence ─────────────────────────────────────────────────────

  async saveTokens(tokens: DriveTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  },

  async loadTokens(): Promise<DriveTokens | null> {
    try {
      const raw = await SecureStore.getItemAsync(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as DriveTokens) : null;
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKENS_KEY),
      AsyncStorage.removeItem(LAST_SYNC_KEY),
      AsyncStorage.removeItem(FILE_ID_KEY),
    ]);
  },

  async isConnected(): Promise<boolean> {
    const t = await this.loadTokens();
    return !!t?.refreshToken;
  },

  async getConnectedEmail(): Promise<string | null> {
    const t = await this.loadTokens();
    return t?.email ?? null;
  },

  // ── Token refresh ─────────────────────────────────────────────────────────

  async refreshAccessToken(refreshToken: string, clientId: string): Promise<{ accessToken: string; expiresIn: number } | null> {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 };
    } catch {
      return null;
    }
  },

  /** Retorna um access token válido, renovando via refresh token se necessário. */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.loadTokens();
    if (!tokens) return null;

    // Válido por mais de 5 minutos
    if (tokens.expiresAt - Date.now() > 5 * 60 * 1000) {
      return tokens.accessToken;
    }

    if (!tokens.refreshToken) return null;

    const refreshed = await this.refreshAccessToken(tokens.refreshToken, tokens.clientId);
    if (!refreshed) return null;

    const updated: DriveTokens = {
      ...tokens,
      accessToken: refreshed.accessToken,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
    };
    await this.saveTokens(updated);
    return updated.accessToken;
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
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
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
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error("Não autenticado no Google Drive.");

    const existingId = await this.findBackupFileId(accessToken);
    const boundary = "------domus_boundary_7x2k9";
    const metadata = JSON.stringify({
      name: DRIVE_BACKUP_FILENAME,
      mimeType: "application/octet-stream",
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
      const err = await res.text();
      // Se 404 (arquivo deletado pelo usuário), limpa cache e tenta criar novo
      if (res.status === 404) {
        await AsyncStorage.removeItem(FILE_ID_KEY);
        return this.uploadBackup(content);
      }
      throw new Error(`Google Drive: ${res.status} ${err}`);
    }

    const data = await res.json();
    if (data.id) await AsyncStorage.setItem(FILE_ID_KEY, data.id);
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  },

  async getLastSyncAt(): Promise<number | null> {
    const v = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return v ? parseInt(v, 10) : null;
  },
};
