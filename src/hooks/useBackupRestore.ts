import { useState, useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { confirmAsync } from "@/src/utils/confirmAsync";
import { runIfConfirmed, PLAIN_EXPORT_WARNING } from "@/src/modules/backup/application/confirmedExport";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { BackupImportService } from "@/src/modules/backup/application/BackupImportService";
import { BackupValidationError } from "@/src/modules/backup/application/BackupValidationService";
import type { BackupPreview, BackupStatus } from "@/src/modules/backup/domain/BackupMetadata";
import { isEncryptedBackupContent } from "@/src/modules/backup/domain/BackupMetadata";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  getDeviceBackupKey,
  getLastAutoBackupTs,
  autoBackupFilePath,
} from "@/src/hooks/useAutoBackup";

export const STATUS_LABELS: Record<BackupStatus["type"], string> = {
  idle: "",
  exporting: "Lendo eventos…",
  encrypting: "Criptografando com AES-256-GCM…",
  sharing: "Abrindo compartilhamento…",
  importing: "Lendo arquivo…",
  decrypting: "Decriptando…",
  validating: "Validando integridade…",
  error: "",
  success: "",
};

export function isLoading(s: BackupStatus): boolean {
  return ["exporting", "encrypting", "sharing", "importing", "decrypting", "validating"].includes(s.type);
}

interface UseBackupRestoreParams {
  getAllEvents: () => SyncEvent[];
  restoreFromBackup: (events: SyncEvent[]) => Promise<void>;
  deviceId: string | null;
}

export function useBackupRestore({ getAllEvents, restoreFromBackup, deviceId }: UseBackupRestoreParams) {
  // Export state
  const [encryptExport, setEncryptExport] = useState(true);
  const plainExportBusy = useRef(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportConfirm, setExportConfirm] = useState("");
  const [exportStatus, setExportStatus] = useState<BackupStatus>({ type: "idle" });
  const [exportPasswordError, setExportPasswordError] = useState("");

  // Import state
  const [importPassword, setImportPassword] = useState("");
  const [importIsEncrypted, setImportIsEncrypted] = useState<boolean | null>(null);
  const [importStatus, setImportStatus] = useState<BackupStatus>({ type: "idle" });
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<{ events: SyncEvent[]; preview: BackupPreview } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-backup
  const [autoKey, setAutoKey] = useState<string | null>(null);
  const [autoTs, setAutoTs] = useState<number | null>(null);
  const [autoRestoreStatus, setAutoRestoreStatus] = useState<BackupStatus>({ type: "idle" });

  useEffect(() => {
    if (Platform.OS === "web") return;
    Promise.all([getDeviceBackupKey(), getLastAutoBackupTs()]).then(([key, ts]) => {
      setAutoKey(key);
      setAutoTs(ts);
    });
  }, []);

  // Export
  const handleExport = useCallback(async () => {
    setExportPasswordError("");
    if (exportPassword.length < 8) {
      setExportPasswordError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (exportPassword !== exportConfirm) {
      setExportPasswordError("As senhas não coincidem.");
      return;
    }
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const events = getAllEvents();
      await BackupExportService.export(events, deviceId ?? "unknown", exportPassword, setExportStatus);
      setExportStatus({ type: "success", message: `${events.length} eventos exportados com sucesso.` });
      setExportPassword("");
      setExportConfirm("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao exportar.";
      setExportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [exportPassword, exportConfirm, getAllEvents, deviceId]);

  const handleExportPlain = useCallback(async () => {
    // Evita dois diálogos/exportações com toque duplo enquanto o aviso está aberto
    if (plainExportBusy.current) return;
    plainExportBusy.current = true;
    try {
      const result = await runIfConfirmed(
        () => confirmAsync(PLAIN_EXPORT_WARNING.title, PLAIN_EXPORT_WARNING.message, PLAIN_EXPORT_WARNING.confirmLabel),
        async () => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const events = getAllEvents();
          await BackupExportService.exportPlain(events, deviceId ?? "unknown", setExportStatus);
          setExportStatus({ type: "success", message: `${events.length} eventos exportados sem criptografia.` });
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      );
      if (result === "cancelled") setExportStatus({ type: "idle" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao exportar.";
      setExportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      plainExportBusy.current = false;
    }
  }, [getAllEvents, deviceId]);

  const toggleEncrypt = useCallback((v: boolean) => {
    setEncryptExport(v);
    setExportPassword("");
    setExportConfirm("");
    setExportPasswordError("");
    setExportStatus({ type: "idle" });
  }, []);

  // Import
  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSelectedFileUri(asset.uri);
      setSelectedFileName(asset.name ?? "backup.domusbackup");
      setImportStatus({ type: "idle" });
      setImportPassword("");
      setPendingPayload(null);
      try {
        const { FileSystemService } = await import("@/src/modules/backup/infrastructure/FileSystemService");
        const content = await FileSystemService.read(asset.uri);
        const parsed = JSON.parse(content);
        setImportIsEncrypted(isEncryptedBackupContent(parsed));
      } catch {
        setImportIsEncrypted(null);
      }
    } catch {
      setImportStatus({ type: "error", message: "Não foi possível abrir o arquivo." });
    }
  }, []);

  const handleValidateImport = useCallback(async () => {
    if (!selectedFileUri) return;
    const needsPassword = importIsEncrypted !== false;
    if (needsPassword && !importPassword) return;
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { payload, preview } = await BackupImportService.readAndValidate(
        selectedFileUri,
        importPassword,
        setImportStatus,
      );
      const events = BackupImportService.extractEvents(payload);
      setPendingPayload({ events, preview });
      setImportStatus({ type: "idle" });
      setShowConfirmModal(true);
    } catch (err) {
      let message = "Erro ao importar backup.";
      if (err instanceof BackupValidationError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setImportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedFileUri, importPassword, importIsEncrypted]);

  const handleConfirmRestore = useCallback(async () => {
    if (!pendingPayload) return;
    setShowConfirmModal(false);
    try {
      setImportStatus({ type: "importing" });
      await restoreFromBackup(pendingPayload.events);
      setImportStatus({ type: "success", message: `${pendingPayload.events.length} eventos restaurados com sucesso.` });
      setSelectedFileUri(null);
      setSelectedFileName(null);
      setImportPassword("");
      setPendingPayload(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao restaurar backup.";
      setImportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [pendingPayload, restoreFromBackup]);

  const clearSelectedFile = useCallback(() => {
    setSelectedFileUri(null);
    setSelectedFileName(null);
    setImportStatus({ type: "idle" });
  }, []);

  // Auto-backup restore
  const handleRestoreAutoBackup = useCallback(async () => {
    if (!autoKey) return;
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const filePath = autoBackupFilePath();
      const { payload, preview } = await BackupImportService.readAndValidate(
        filePath,
        autoKey,
        setAutoRestoreStatus,
      );
      const events = BackupImportService.extractEvents(payload);
      setPendingPayload({ events, preview });
      setAutoRestoreStatus({ type: "idle" });
      setShowConfirmModal(true);
    } catch (err) {
      let message = "Nenhum auto-backup encontrado ou arquivo inválido.";
      if (err instanceof BackupValidationError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setAutoRestoreStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [autoKey]);

  return {
    // Export
    encryptExport,
    exportPassword,
    setExportPassword,
    exportConfirm,
    setExportConfirm,
    exportStatus,
    exportPasswordError,
    setExportPasswordError,
    handleExport,
    handleExportPlain,
    toggleEncrypt,
    // Import
    importPassword,
    setImportPassword,
    importIsEncrypted,
    importStatus,
    selectedFileUri,
    selectedFileName,
    handlePickFile,
    handleValidateImport,
    handleConfirmRestore,
    clearSelectedFile,
    // Auto-backup
    autoKey,
    autoTs,
    autoRestoreStatus,
    handleRestoreAutoBackup,
    // Confirm modal
    showConfirmModal,
    setShowConfirmModal,
    pendingPayload,
    setPendingPayload,
  };
}
