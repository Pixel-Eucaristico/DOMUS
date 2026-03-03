import * as ExpoCrypto from "expo-crypto";
import { BACKUP_SCHEMA_VERSION } from "../domain/BackupMetadata";
import type { BackupPayload, EncryptedBackup } from "../domain/BackupMetadata";

// ─── error ───────────────────────────────────────────────────────────────────

export type BackupValidationErrorCode =
  | "INVALID_JSON"
  | "INVALID_STRUCTURE"
  | "CHECKSUM_MISMATCH"
  | "SCHEMA_INCOMPATIBLE"
  | "WRONG_PASSWORD";

export class BackupValidationError extends Error {
  constructor(
    message: string,
    public readonly code: BackupValidationErrorCode,
  ) {
    super(message);
    this.name = "BackupValidationError";
  }
}

// ─── service ─────────────────────────────────────────────────────────────────

export const BackupValidationService = {
  /** Faz parse do arquivo .domusbackup como envelope criptografado. */
  parseEncryptedFile(content: string): EncryptedBackup {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BackupValidationError(
        "Arquivo inválido ou corrompido.",
        "INVALID_JSON",
      );
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).salt !== "string" ||
      typeof (parsed as Record<string, unknown>).iv !== "string" ||
      typeof (parsed as Record<string, unknown>).ciphertext !== "string" ||
      typeof (parsed as Record<string, unknown>).authTag !== "string"
    ) {
      throw new BackupValidationError(
        "Estrutura do arquivo de backup inválida.",
        "INVALID_STRUCTURE",
      );
    }
    return parsed as EncryptedBackup;
  },

  /** Faz parse do JSON interno (payload decriptado). */
  parseBackupPayload(json: string): BackupPayload {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new BackupValidationError(
        "Conteúdo interno do backup inválido.",
        "INVALID_JSON",
      );
    }
    const p = parsed as Record<string, unknown>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof p.version !== "string" ||
      typeof p.createdAt !== "string" ||
      typeof p.deviceId !== "string" ||
      typeof p.schemaVersion !== "number" ||
      !Array.isArray(p.events) ||
      typeof p.checksum !== "string"
    ) {
      throw new BackupValidationError(
        "Estrutura interna do backup inválida.",
        "INVALID_STRUCTURE",
      );
    }
    return parsed as BackupPayload;
  },

  /** Verifica SHA-256 dos eventos contra o checksum gravado no backup. */
  async validateChecksum(payload: BackupPayload): Promise<void> {
    const computed = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(payload.events),
    );
    if (computed !== payload.checksum) {
      throw new BackupValidationError(
        "Checksum inválido — backup pode estar corrompido ou adulterado.",
        "CHECKSUM_MISMATCH",
      );
    }
  },

  /** Garante compatibilidade de schema (não aceita versão futura). */
  validateSchemaVersion(payload: BackupPayload): void {
    if (payload.schemaVersion > BACKUP_SCHEMA_VERSION) {
      throw new BackupValidationError(
        `Backup criado com versão mais recente do app (schema ${payload.schemaVersion}). Atualize o app.`,
        "SCHEMA_INCOMPATIBLE",
      );
    }
  },
};
