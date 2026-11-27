import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";
import { BACKUP_FILE_EXTENSION } from "../domain/BackupMetadata";
import { isWeb } from "./deviceBackupKey";
import { getNativeAccessToken } from "./GoogleNativeAuth";
import {
  isDriveConnected,
  isLegacyDriveConnection,
  refreshExpiredAccessToken,
  resolveAccessToken,
} from "./driveTokens";
import type { DriveTokens } from "./driveTokens";

export type { DriveTokens } from "./driveTokens";

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string | null;
  size: number | null;
}

// SecureStore não existe na web; lá os tokens ficam cifrados por webSecrets (AES-GCM).
const secureGet = async (key: string): Promise<string | null> => {
  if (isWeb()) return webSecrets.get(key);
  return SecureStore.getItemAsync(key);
};
const secureSet = async (key: string, value: string): Promise<void> => {
  if (isWeb()) {
    const saved = await webSecrets.set(key, value);
    if (!saved) {
      throw new Error("Não foi possível salvar credenciais do Google Drive com segurança.");
    }
    return;
  }
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
const LIST_BACKUPS_TIMEOUT_MS = 15_000;

export const DRIVE_BACKUP_FILENAME = `domus-backup${BACKUP_FILE_EXTENSION}`;

/** Incrementado em clearTokens() para impedir que renovações em voo ressuscitem tokens desconectados. */
let tokenSessionEpoch = 0;

// ─── service ─────────────────────────────────────────────────────────────────

async function uploadBackupInternal(
  content: string,
  options: { retried401: boolean; retried404: boolean; tokenOverride?: string },
): Promise<void> {
  const epoch = tokenSessionEpoch;
  const accessToken =
    options.tokenOverride ?? (await GoogleDriveService.getValidAccessToken());
  if (epoch !== tokenSessionEpoch) {
    throw new Error("Sessão do Google Drive alterada.");
  }
  if (!accessToken) throw new Error("Não autenticado no Google Drive.");

  const existingId = await GoogleDriveService.findBackupFileId(accessToken);
  if (epoch !== tokenSessionEpoch) {
    throw new Error("Sessão do Google Drive alterada.");
  }
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

  if (epoch !== tokenSessionEpoch) {
    throw new Error("Sessão do Google Drive alterada.");
  }

  if (!res.ok) {
    // Se 401 com token em cache, limpa cache e tenta renovar silenciosamente 1x antes de falhar
    if (res.status === 401 && !options.retried401) {
      const freshToken = await GoogleDriveService.refreshAccessTokenOnUnauthorized();
      if (epoch !== tokenSessionEpoch) {
        throw new Error("Sessão do Google Drive alterada.");
      }
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
      if (epoch !== tokenSessionEpoch) {
        throw new Error("Sessão do Google Drive alterada.");
      }
      await AsyncStorage.removeItem(FILE_ID_KEY);
      if (epoch !== tokenSessionEpoch) {
        throw new Error("Sessão do Google Drive alterada.");
      }
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
  if (epoch !== tokenSessionEpoch) {
    throw new Error("Sessão do Google Drive alterada.");
  }
  if (data.id) await AsyncStorage.setItem(FILE_ID_KEY, data.id);
  if (epoch !== tokenSessionEpoch) {
    throw new Error("Sessão do Google Drive alterada.");
  }
  await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

function parseDriveFileSize(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

async function listBackupsInternal(options: {
  retried401: boolean;
  tokenOverride?: string;
}): Promise<DriveBackupFile[]> {
  const accessToken =
    options.tokenOverride ?? (await GoogleDriveService.getValidAccessToken());
  if (!accessToken) throw new Error("Não autenticado no Google Drive.");

  const epoch = tokenSessionEpoch;
  const query = encodeURIComponent("trashed=false");
  const orderBy = encodeURIComponent("modifiedTime desc");
  const fields = encodeURIComponent("files(id,name,modifiedTime,size)");
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&orderBy=${orderBy}&fields=${fields}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIST_BACKUPS_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    if (res.status === 401 && !options.retried401 && epoch === tokenSessionEpoch) {
      const freshToken = await GoogleDriveService.refreshAccessTokenOnUnauthorized();
      if (freshToken && epoch === tokenSessionEpoch) {
        return listBackupsInternal({
          retried401: true,
          tokenOverride: freshToken,
        });
      }
    }

    const err = await res.text();
    throw new Error(`Google Drive: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { files?: unknown; nextPageToken?: unknown };
  const rawFiles = Array.isArray(data?.files) ? data.files : [];
  const files: DriveBackupFile[] = [];

  for (const item of rawFiles) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    if (typeof f.id !== "string" || !f.id || typeof f.name !== "string" || !f.name) {
      continue;
    }
    files.push({
      id: f.id,
      name: f.name,
      modifiedTime:
        typeof f.modifiedTime === "string" && f.modifiedTime.trim() !== ""
          ? f.modifiedTime
          : null,
      size: parseDriveFileSize(f.size),
    });
  }

  if (epoch === tokenSessionEpoch) {
    const primaryFile = files.find((f) => f.name === DRIVE_BACKUP_FILENAME);
    if (primaryFile) {
      await AsyncStorage.setItem(FILE_ID_KEY, primaryFile.id);
    } else if (!data?.nextPageToken) {
      await AsyncStorage.removeItem(FILE_ID_KEY);
    }
  }

  return files;
}

export const GoogleDriveService = {
  // ── Token persistence ─────────────────────────────────────────────────────

  async saveTokens(tokens: DriveTokens): Promise<void> {
    const saveEpoch = tokenSessionEpoch;
    const prev = await this.loadTokens();
    if (saveEpoch !== tokenSessionEpoch) {
      return;
    }
    const prevEmail = prev?.email?.trim().toLowerCase() ?? "";
    const nextEmail = tokens.email?.trim().toLowerCase() ?? "";
    if (prev !== null && prevEmail !== nextEmail) {
      tokenSessionEpoch += 1;
      const switchEpoch = tokenSessionEpoch;
      await Promise.all([
        AsyncStorage.removeItem(LAST_SYNC_KEY),
        AsyncStorage.removeItem(FILE_ID_KEY),
      ]);
      if (switchEpoch !== tokenSessionEpoch) {
        return;
      }
    }
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
    const tokens = await this.loadTokens();
    if (isLegacyDriveConnection(tokens, isWeb())) {
      return false;
    }
    return isDriveConnected(tokens);
  },

  async getConnectedEmail(): Promise<string | null> {
    const t = await this.loadTokens();
    return t?.email || null;
  },

  // ── Access token ──────────────────────────────────────────────────────────

  /** Retorna um access token válido; no nativo renova via AuthorizationClient (sem client secret). */
  async getValidAccessToken(): Promise<string | null> {
    const epoch = tokenSessionEpoch;
    const tokens = await this.loadTokens();
    if (epoch !== tokenSessionEpoch) return null;
    if (isLegacyDriveConnection(tokens, isWeb())) return null;

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
    if (isLegacyDriveConnection(tokens, isWeb())) return null;

    const refreshed = await refreshExpiredAccessToken(tokens, getNativeAccessToken);
    if (!refreshed || epoch !== tokenSessionEpoch) return null;

    await this.saveTokens(refreshed);
    return refreshed.accessToken;
  },

  // ── Drive file operations ─────────────────────────────────────────────────

  /** Lista os arquivos de backup existentes em appDataFolder ordenados pelo mais recente. */
  async listBackups(): Promise<DriveBackupFile[]> {
    return listBackupsInternal({ retried401: false });
  },

  /** Busca o ID do arquivo de backup no Drive (cache local + API se necessário). */
  async findBackupFileId(accessToken: string): Promise<string | null> {
    const epoch = tokenSessionEpoch;
    const cached = await AsyncStorage.getItem(FILE_ID_KEY);
    if (epoch !== tokenSessionEpoch) return null;
    if (cached) return cached;

    const query = encodeURIComponent(`name='${DRIVE_BACKUP_FILENAME}' and trashed=false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=appDataFolder`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive: ${res.status} ${err}`);
    }
    const data = await res.json();
    const fileId = data.files?.[0]?.id ?? null;
    if (fileId && epoch === tokenSessionEpoch) {
      await AsyncStorage.setItem(FILE_ID_KEY, fileId);
    }
    return fileId;
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
    if (!v) return null;
    const trimmed = v.trim();
    const parsed = /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
};
