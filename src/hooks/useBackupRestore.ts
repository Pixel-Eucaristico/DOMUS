import { useState, useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { confirmAsync } from "@/src/utils/confirmAsync";
import {
  executePlainExportFlow,
  PLAIN_EXPORT_WARNING,
} from "@/src/modules/backup/application/confirmedExport";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { BackupImportService } from "@/src/modules/backup/application/BackupImportService";
import { BackupValidationError } from "@/src/modules/backup/application/BackupValidationService";
import type { BackupPreview, BackupStatus } from "@/src/modules/backup/domain/BackupMetadata";
import { isEncryptedBackupContent } from "@/src/modules/backup/domain/BackupMetadata";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { buildExportEvents } from "@/src/context/localEventLog";
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
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Export state
  const [encryptExport, setEncryptExport] = useState(true);
  const exportBusy = useRef(false);
  const [confirmingPlainExport, setConfirmingPlainExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportConfirm, setExportConfirm] = useState("");
  const [exportStatus, setExportStatus] = useState<BackupStatus>({ type: "idle" });
  const [exportPasswordError, setExportPasswordError] = useState("");

  // Import state
  const importBusy = useRef(false);
  const pickSeqRef = useRef(0);
  const [importPassword, setImportPassword] = useState("");
  const [importIsEncrypted, setImportIsEncrypted] = useState<boolean | null>(null);
  const [importStatus, setImportStatus] = useState<BackupStatus>({ type: "idle" });
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<{ events: SyncEvent[]; preview: BackupPreview } | null>(null);
  const [pendingSource, setPendingSource] = useState<"file" | "auto" | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-backup
  const [autoKey, setAutoKey] = useState<string | null>(null);
  const [autoTs, setAutoTs] = useState<number | null>(null);
  const [autoRestoreStatus, setAutoRestoreStatus] = useState<BackupStatus>({ type: "idle" });

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    Promise.all([getDeviceBackupKey(), getLastAutoBackupTs()])
      .then(([key, ts]) => {
        if (!active) return;
        setAutoKey(key);
        setAutoTs(ts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Export
  const handleExport = useCallback(async () => {
    if (exportBusy.current) return;
    setExportPasswordError("");
    if (exportPassword.length < 8) {
      setExportPasswordError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (exportPassword !== exportConfirm) {
      setExportPasswordError("As senhas não coincidem.");
      return;
    }
    exportBusy.current = true;
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const events = buildExportEvents(getAllEvents(), deviceId);
      await BackupExportService.export(events, deviceId ?? "unknown", exportPassword, (s) => {
        if (mountedRef.current) setExportStatus(s);
      });
      if (!mountedRef.current) return;
      setExportStatus({ type: "success", message: `${events.length} eventos exportados com sucesso.` });
      setExportPassword("");
      setExportConfirm("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Erro desconhecido ao exportar.";
      setExportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      exportBusy.current = false;
    }
  }, [exportPassword, exportConfirm, getAllEvents, deviceId]);

  const handleExportPlain = useCallback(async () => {
    await executePlainExportFlow({
      busyRef: exportBusy,
      askConfirmation: () =>
        confirmAsync(
          PLAIN_EXPORT_WARNING.title,
          PLAIN_EXPORT_WARNING.message,
          PLAIN_EXPORT_WARNING.confirmLabel,
          { destructive: true },
        ),
      setStatus: (s) => {
        if (mountedRef.current) setExportStatus(s);
      },
      setConfirming: (v) => {
        if (mountedRef.current) setConfirmingPlainExport(v);
      },
      onBeforeExport: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      exportPlain: async () => {
        const events = buildExportEvents(getAllEvents(), deviceId);
        await BackupExportService.exportPlain(events, deviceId ?? "unknown", (s) => {
          if (mountedRef.current) setExportStatus(s);
        });
        return events.length;
      },
      onSuccess: () => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  }, [getAllEvents, deviceId]);

  const toggleEncrypt = useCallback((v: boolean) => {
    if (exportBusy.current || isLoading(exportStatus)) return;
    setEncryptExport(v);
    setExportPassword("");
    setExportConfirm("");
    setExportPasswordError("");
    setExportStatus({ type: "idle" });
  }, [exportStatus]);

  // Import
  const handlePickFile = useCallback(async () => {
    const seq = ++pickSeqRef.current;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!mountedRef.current || seq !== pickSeqRef.current) return;
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSelectedFileUri(asset.uri);
      setSelectedFileName(asset.name ?? "backup.domusbackup");
      setImportStatus({ type: "idle" });
      setImportPassword("");
      setImportIsEncrypted(null);
      setPendingPayload(null);
      setPendingSource(null);
      try {
        const { FileSystemService } = await import("@/src/modules/backup/infrastructure/FileSystemService");
        const content = await FileSystemService.read(asset.uri);
        const parsed = JSON.parse(content);
        if (!mountedRef.current || seq !== pickSeqRef.current) return;
        setImportIsEncrypted(isEncryptedBackupContent(parsed));
      } catch {
        if (!mountedRef.current || seq !== pickSeqRef.current) return;
        setImportIsEncrypted(null);
        setImportStatus({
          type: "error",
          message: "Arquivo inválido ou ilegível. Selecione um backup JSON válido.",
        });
      }
    } catch {
      if (!mountedRef.current || seq !== pickSeqRef.current) return;
      setImportStatus({ type: "error", message: "Não foi possível abrir o arquivo." });
    }
  }, []);

  const handleValidateImport = useCallback(async () => {
    if (importBusy.current || !selectedFileUri) return;
    const needsPassword = importIsEncrypted !== false;
    if (needsPassword && !importPassword) return;
    importBusy.current = true;
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { payload, preview } = await BackupImportService.readAndValidate(
        selectedFileUri,
        importPassword,
        (s) => {
          if (mountedRef.current) setImportStatus(s);
        },
      );
      if (!mountedRef.current) return;
      const events = BackupImportService.extractEvents(payload);
      setPendingPayload({ events, preview });
      setPendingSource("file");
      setImportStatus({ type: "idle" });
      setShowConfirmModal(true);
    } catch (err) {
      if (!mountedRef.current) return;
      let message = "Erro ao importar backup.";
      if (err instanceof BackupValidationError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setImportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      importBusy.current = false;
    }
  }, [selectedFileUri, importPassword, importIsEncrypted]);

  const handleConfirmRestore = useCallback(async () => {
    if (importBusy.current || !pendingPayload) return;
    importBusy.current = true;
    const isAuto = pendingSource === "auto";
    const updateStatus = isAuto ? setAutoRestoreStatus : setImportStatus;
    setShowConfirmModal(false);
    try {
      updateStatus({ type: "importing" });
      await restoreFromBackup(pendingPayload.events);
      if (!mountedRef.current) return;
      updateStatus({ type: "success", message: `${pendingPayload.events.length} eventos restaurados com sucesso.` });
      if (!isAuto) {
        setSelectedFileUri(null);
        setSelectedFileName(null);
        setImportPassword("");
        setImportIsEncrypted(null);
      }
      setPendingPayload(null);
      setPendingSource(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Erro ao restaurar backup.";
      updateStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      importBusy.current = false;
    }
  }, [pendingPayload, pendingSource, restoreFromBackup]);

  const clearSelectedFile = useCallback(() => {
    pickSeqRef.current += 1;
    setSelectedFileUri(null);
    setSelectedFileName(null);
    setImportPassword("");
    setImportIsEncrypted(null);
    setPendingPayload(null);
    setPendingSource(null);
    setImportStatus({ type: "idle" });
  }, []);

  // Auto-backup restore
  const handleRestoreAutoBackup = useCallback(async () => {
    if (importBusy.current || !autoKey) return;
    importBusy.current = true;
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const filePath = autoBackupFilePath();
      const { payload, preview } = await BackupImportService.readAndValidate(
        filePath,
        autoKey,
        (s) => {
          if (mountedRef.current) setAutoRestoreStatus(s);
        },
      );
      if (!mountedRef.current) return;
      const events = BackupImportService.extractEvents(payload);
      setPendingPayload({ events, preview });
      setPendingSource("auto");
      setAutoRestoreStatus({ type: "idle" });
      setShowConfirmModal(true);
    } catch (err) {
      if (!mountedRef.current) return;
      let message = "Nenhum auto-backup encontrado ou arquivo inválido.";
      if (err instanceof BackupValidationError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setAutoRestoreStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      importBusy.current = false;
    }
  }, [autoKey]);

  return {
    // Export
    encryptExport,
    confirmingPlainExport,
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
