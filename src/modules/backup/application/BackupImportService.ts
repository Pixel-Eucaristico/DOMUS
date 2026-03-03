import type { SyncEvent } from "@packages/storage/src/eventStore";
import { BackupCryptoService } from "./BackupCryptoService";
import {
  BackupValidationService,
  BackupValidationError,
} from "./BackupValidationService";
import { FileSystemService } from "../infrastructure/FileSystemService";
import type { BackupPayload, BackupPreview, BackupStatus } from "../domain/BackupMetadata";

export const BackupImportService = {
  /**
   * Lê, decripta e valida um arquivo .domusbackup.
   * Retorna o payload e um preview para exibir antes de confirmar a restauração.
   * Lança BackupValidationError em qualquer falha de validação.
   */
  async readAndValidate(
    fileUri: string,
    password: string,
    onStatus: (status: BackupStatus) => void,
  ): Promise<{ payload: BackupPayload; preview: BackupPreview }> {
    onStatus({ type: "importing" });

    let content: string;
    try {
      content = await FileSystemService.read(fileUri);
    } catch {
      throw new BackupValidationError(
        "Arquivo de backup não encontrado ou inacessível.",
        "INVALID_JSON",
      );
    }
    const encrypted = BackupValidationService.parseEncryptedFile(content);

    onStatus({ type: "decrypting" });
    let plaintext: string;
    try {
      plaintext = await BackupCryptoService.decrypt(encrypted, password);
    } catch {
      throw new BackupValidationError(
        "Senha incorreta ou arquivo corrompido.",
        "WRONG_PASSWORD",
      );
    }

    onStatus({ type: "validating" });
    const payload = BackupValidationService.parseBackupPayload(plaintext);
    BackupValidationService.validateSchemaVersion(payload);
    await BackupValidationService.validateChecksum(payload);

    const preview: BackupPreview = {
      eventCount: payload.events.length,
      createdAt: payload.createdAt,
      deviceId: payload.deviceId,
      schemaVersion: payload.schemaVersion,
      version: payload.version,
    };

    return { payload, preview };
  },

  extractEvents(payload: BackupPayload): SyncEvent[] {
    return payload.events as SyncEvent[];
  },
};
