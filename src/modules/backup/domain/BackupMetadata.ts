import type { SyncEvent } from "@packages/storage/src/eventStore";

export const BACKUP_SCHEMA_VERSION = 1;
export const APP_VERSION = "1.0.0";
export const BACKUP_FILE_EXTENSION = ".domusbackup";
export const PBKDF2_ITERATIONS = 100_000;

/** Payload interno (decriptado) do arquivo de backup. */
export interface BackupPayload {
  version: string;
  createdAt: string;
  deviceId: string;
  schemaVersion: number;
  events: SyncEvent[];
  /** SHA-256 hex de JSON.stringify(events) */
  checksum: string;
}

/** Envelope externo gravado no arquivo .domusbackup. */
export interface EncryptedBackup {
  /** PBKDF2 salt — base64 (32 bytes) */
  salt: string;
  /** AES-GCM IV — base64 (12 bytes) */
  iv: string;
  /** Corpo do ciphertext sem auth tag — base64 */
  ciphertext: string;
  /** AES-GCM auth tag — base64 (16 bytes) */
  authTag: string;
}

/** Preview mostrado antes de confirmar a restauração. */
export interface BackupPreview {
  eventCount: number;
  createdAt: string;
  deviceId: string;
  schemaVersion: number;
  version: string;
}

export type BackupStatus =
  | { type: "idle" }
  | { type: "exporting" }
  | { type: "encrypting" }
  | { type: "sharing" }
  | { type: "importing" }
  | { type: "decrypting" }
  | { type: "validating" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };
