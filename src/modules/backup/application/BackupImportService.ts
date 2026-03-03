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
   * Lê e valida um arquivo .domusbackup.
   * Auto-detecta se é criptografado ou simples.
   * - Criptografado: `password` obrigatória.
   * - Simples: `password` ignorada.
   * Lança BackupValidationError em qualquer falha de validação.
   */
  async readAndValidate(
    fileUri: string,
    password: string,
    onStatus: (status: BackupStatus) => void,
  ): Promise<{ payload: BackupPayload; preview: BackupPreview; wasEncrypted: boolean }> {
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

    const parsed = BackupValidationService.parseFile(content);

    let payload: BackupPayload;

    if (parsed.encrypted) {
      onStatus({ type: "decrypting" });
      let plaintext: string;
      try {
        plaintext = await BackupCryptoService.decrypt(parsed.data, password);
      } catch {
        throw new BackupValidationError(
          "Senha incorreta ou arquivo corrompido.",
          "WRONG_PASSWORD",
        );
      }
      onStatus({ type: "validating" });
      payload = BackupValidationService.parseBackupPayload(plaintext);
    } else {
      onStatus({ type: "validating" });
      payload = parsed.data;
    }

    BackupValidationService.validateSchemaVersion(payload);
    await BackupValidationService.validateChecksum(payload);

    const preview: BackupPreview = {
      eventCount: payload.events.length,
      createdAt: payload.createdAt,
      deviceId: payload.deviceId,
      schemaVersion: payload.schemaVersion,
      version: payload.version,
    };

    return { payload, preview, wasEncrypted: parsed.encrypted };
  },

  extractEvents(payload: BackupPayload): SyncEvent[] {
    return payload.events as SyncEvent[];
  },
};
