import * as ExpoCrypto from "expo-crypto";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { BackupCryptoService } from "./BackupCryptoService";
import { FileSystemService } from "../infrastructure/FileSystemService";
import { ShareService } from "../infrastructure/ShareService";
import {
  APP_VERSION,
  BACKUP_FILE_EXTENSION,
  BACKUP_SCHEMA_VERSION,
} from "../domain/BackupMetadata";
import type { BackupPayload, BackupStatus } from "../domain/BackupMetadata";

export const BackupExportService = {
  /**
   * Fluxo completo de exportação:
   * 1. Calcula checksum dos eventos
   * 2. Monta BackupPayload
   * 3. Criptografa com AES-256-GCM / PBKDF2
   * 4. Grava em arquivo temporário
   * 5. Compartilha via share nativo
   * 6. Remove arquivo temporário
   */
  async export(
    events: SyncEvent[],
    deviceId: string,
    password: string,
    onStatus: (status: BackupStatus) => void,
  ): Promise<void> {
    onStatus({ type: "exporting" });

    const checksum = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(events),
    );

    const payload: BackupPayload = {
      version: APP_VERSION,
      createdAt: new Date().toISOString(),
      deviceId,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      events,
      checksum,
    };

    onStatus({ type: "encrypting" });
    const encrypted = await BackupCryptoService.encrypt(
      JSON.stringify(payload),
      password,
    );

    const filename = `domus-backup-${Date.now()}${BACKUP_FILE_EXTENSION}`;
    const filePath = await FileSystemService.writeTemp(
      filename,
      JSON.stringify(encrypted),
    );

    try {
      onStatus({ type: "sharing" });
      await ShareService.share(filePath, filename);
    } finally {
      await FileSystemService.deleteFile(filePath);
    }
  },

  /**
   * Salva backup criptografado diretamente em `destPath` (sem share sheet).
   * Usado pelo auto-backup: sobrescreve o arquivo de destino a cada execução.
   */
  async saveLocal(
    events: SyncEvent[],
    deviceId: string,
    password: string,
    destPath: string,
  ): Promise<void> {
    const checksum = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(events),
    );
    const payload: BackupPayload = {
      version: APP_VERSION,
      createdAt: new Date().toISOString(),
      deviceId,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      events,
      checksum,
    };
    const encrypted = await BackupCryptoService.encrypt(
      JSON.stringify(payload),
      password,
    );
    await FileSystemService.writeAbsolute(destPath, JSON.stringify(encrypted));
  },
};
