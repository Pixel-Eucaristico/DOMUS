import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { BackupImportService } from "@/src/modules/backup/application/BackupImportService";
import { BackupValidationError } from "@/src/modules/backup/application/BackupValidationService";
import { PasswordInputComponent } from "@/src/components/backup/PasswordInputComponent";
import { ConfirmRestoreModal } from "@/src/components/backup/ConfirmRestoreModal";
import type { BackupPreview, BackupStatus } from "@/src/modules/backup/domain/BackupMetadata";
import { isEncryptedBackupContent } from "@/src/modules/backup/domain/BackupMetadata";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  getDeviceBackupKey,
  getLastAutoBackupTs,
  autoBackupFilePath,
} from "@/src/hooks/useAutoBackup";

// ─── status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<BackupStatus["type"], string> = {
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

function isLoading(s: BackupStatus): boolean {
  return ["exporting", "encrypting", "sharing", "importing", "decrypting", "validating"].includes(
    s.type,
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function BackupScreen() {
  const router = useRouter();
  const { theme, getAllEvents, restoreFromBackup, deviceId } = useAppState();

  // Export state
  const [encryptExport, setEncryptExport] = useState(true);
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

  // Auto-backup state
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

  // ─── export ────────────────────────────────────────────────────────────────

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
      await BackupExportService.export(
        events,
        deviceId ?? "unknown",
        exportPassword,
        setExportStatus,
      );
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
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const events = getAllEvents();
      await BackupExportService.exportPlain(events, deviceId ?? "unknown", setExportStatus);
      setExportStatus({ type: "success", message: `${events.length} eventos exportados sem criptografia.` });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao exportar.";
      setExportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [getAllEvents, deviceId]);

  // ─── import — pick file ────────────────────────────────────────────────────

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSelectedFileUri(asset.uri);
      setSelectedFileName(asset.name ?? "backup.domusbackup");
      setImportStatus({ type: "idle" });
      setImportPassword("");
      setPendingPayload(null);

      // Auto-detecta se o arquivo é criptografado
      try {
        const { FileSystemService } = await import(
          "@/src/modules/backup/infrastructure/FileSystemService"
        );
        const content = await FileSystemService.read(asset.uri);
        const parsed = JSON.parse(content);
        setImportIsEncrypted(isEncryptedBackupContent(parsed));
      } catch {
        setImportIsEncrypted(null); // não foi possível detectar, deixa tentar
      }
    } catch {
      setImportStatus({ type: "error", message: "Não foi possível abrir o arquivo." });
    }
  }, []);

  // ─── import — validate ─────────────────────────────────────────────────────

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
      if (err instanceof BackupValidationError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setImportStatus({ type: "error", message });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedFileUri, importPassword, importIsEncrypted]);

  // ─── import — confirm restore ──────────────────────────────────────────────

  const handleConfirmRestore = useCallback(async () => {
    if (!pendingPayload) return;
    setShowConfirmModal(false);

    try {
      setImportStatus({ type: "importing" });
      await restoreFromBackup(pendingPayload.events);
      setImportStatus({
        type: "success",
        message: `${pendingPayload.events.length} eventos restaurados com sucesso.`,
      });
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

  // ─── auto-backup restore ───────────────────────────────────────────────────

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

  // ─── render ────────────────────────────────────────────────────────────────

  const eventCount = getAllEvents().length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>Backup & Restauração</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Feather name="shield" size={16} color={theme.primaryColor} />
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            Você pode exportar com criptografia AES-256-GCM (recomendado) ou sem senha, para salvar no Google Drive pessoal ou outro local seguro.
          </Text>
        </View>

        {/* ── EXPORT ──────────────────────────────────────────────────────── */}
        <SectionCard
          theme={theme}
          icon="upload-cloud"
          title="Exportar backup"
          subtitle={`${eventCount} evento${eventCount !== 1 ? "s" : ""} no dispositivo`}
          accentColor={theme.primaryColor}
        >
          {/* Toggle criptografia */}
          <View style={[styles.encryptToggleRow, { borderColor: theme.border }]}>
            <View style={styles.encryptToggleLeft}>
              <Feather name={encryptExport ? "lock" : "unlock"} size={15} color={encryptExport ? "#10B981" : "#F59E0B"} />
              <Text style={[styles.encryptToggleLabel, { color: theme.textColor }]}>
                Criptografar backup
              </Text>
            </View>
            <Switch
              value={encryptExport}
              onValueChange={(v) => {
                setEncryptExport(v);
                setExportPassword("");
                setExportConfirm("");
                setExportPasswordError("");
                setExportStatus({ type: "idle" });
              }}
              trackColor={{ false: "#F59E0B80", true: "#10B981" }}
              thumbColor="#fff"
            />
          </View>

          {encryptExport ? (
            <>
              <PasswordInputComponent
                label="Senha de criptografia"
                value={exportPassword}
                onChange={setExportPassword}
                theme={theme}
                placeholder="Mínimo 8 caracteres"
                editable={!isLoading(exportStatus)}
              />
              <PasswordInputComponent
                label="Confirmar senha"
                value={exportConfirm}
                onChange={(v) => { setExportConfirm(v); setExportPasswordError(""); }}
                theme={theme}
                placeholder="Repita a senha"
                error={exportPasswordError}
                editable={!isLoading(exportStatus)}
              />
            </>
          ) : (
            <View style={[styles.plainWarning, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B12" }]}>
              <Feather name="alert-triangle" size={14} color="#F59E0B" />
              <Text style={[styles.plainWarningText, { color: theme.secondaryText }]}>
                O arquivo exportado não terá proteção por senha. Recomendado apenas se for salvar em local seguro (ex: Google Drive pessoal).
              </Text>
            </View>
          )}

          <View style={styles.exportHintRow}>
            <Feather name="info" size={13} color={theme.secondaryText} />
            <Text style={[styles.exportHint, { color: theme.secondaryText }]}>
              Abre o menu de compartilhamento do sistema. Escolha Google Drive, e-mail, WhatsApp ou salve localmente.
            </Text>
          </View>

          <StatusRow status={exportStatus} theme={theme} />

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: encryptExport ? theme.primaryColor : "#F59E0B" },
              isLoading(exportStatus) && styles.actionBtnDisabled,
              encryptExport && (!exportPassword || !exportConfirm) && styles.actionBtnDisabled,
            ]}
            onPress={encryptExport ? handleExport : handleExportPlain}
            disabled={isLoading(exportStatus) || (encryptExport && (!exportPassword || !exportConfirm))}
            activeOpacity={0.8}
          >
            {isLoading(exportStatus) ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="upload-cloud" size={18} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>
              {isLoading(exportStatus)
                ? STATUS_LABELS[exportStatus.type]
                : encryptExport
                  ? "Exportar e compartilhar"
                  : "Exportar sem criptografia"}
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── IMPORT ──────────────────────────────────────────────────────── */}
        <SectionCard
          theme={theme}
          icon="download-cloud"
          title="Restaurar backup"
          subtitle="Selecione um arquivo .domusbackup"
          accentColor="#F59E0B"
        >
          {/* File picker */}
          <TouchableOpacity
            style={[
              styles.filePicker,
              {
                borderColor: selectedFileUri ? "#10B981" : theme.border,
                backgroundColor: theme.cardBackground,
              },
            ]}
            onPress={handlePickFile}
            activeOpacity={0.7}
          >
            <Feather
              name={selectedFileUri ? "check-circle" : "file-text"}
              size={18}
              color={selectedFileUri ? "#10B981" : theme.secondaryText}
            />
            <Text
              style={[
                styles.filePickerText,
                { color: selectedFileUri ? "#10B981" : theme.secondaryText },
              ]}
              numberOfLines={1}
            >
              {selectedFileName ?? "Selecionar arquivo…"}
            </Text>
            {selectedFileUri && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedFileUri(null);
                  setSelectedFileName(null);
                  setImportStatus({ type: "idle" });
                }}
                hitSlop={12}
              >
                <Feather name="x" size={16} color={theme.secondaryText} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {selectedFileUri && (
            <>
              {importIsEncrypted === false && (
                <View style={[styles.plainWarning, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B12" }]}>
                  <Feather name="unlock" size={14} color="#F59E0B" />
                  <Text style={[styles.plainWarningText, { color: theme.secondaryText }]}>
                    Este backup não está criptografado.
                  </Text>
                </View>
              )}

              {importIsEncrypted !== false && (
                <PasswordInputComponent
                  label="Senha do backup"
                  value={importPassword}
                  onChange={setImportPassword}
                  theme={theme}
                  editable={!isLoading(importStatus)}
                />
              )}

              <StatusRow status={importStatus} theme={theme} />

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#F59E0B" },
                  (isLoading(importStatus) || (importIsEncrypted !== false && !importPassword)) && styles.actionBtnDisabled,
                ]}
                onPress={handleValidateImport}
                disabled={isLoading(importStatus) || (importIsEncrypted !== false && !importPassword)}
                activeOpacity={0.8}
              >
                {isLoading(importStatus) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="download-cloud" size={18} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>
                  {isLoading(importStatus) ? STATUS_LABELS[importStatus.type] : "Verificar e restaurar"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!selectedFileUri && (
            <StatusRow status={importStatus} theme={theme} />
          )}
        </SectionCard>

        {/* ── AUTO-BACKUP ─────────────────────────────────────────────────── */}
        {Platform.OS !== "web" && (
          <SectionCard
            theme={theme}
            icon="refresh-cw"
            title="Auto-backup local"
            subtitle={
              autoTs
                ? `Último: ${new Date(autoTs).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Nunca executado"
            }
            accentColor="#8B5CF6"
          >
            <Text style={[styles.autoHint, { color: theme.secondaryText }]}>
              Backup automático gerado a cada 24 h. Criptografado com a chave do dispositivo abaixo.
            </Text>

            {/* Key display */}
            <View style={[styles.keyRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Feather name="key" size={14} color="#8B5CF6" />
              <Text
                style={[styles.keyText, { color: autoKey ? theme.textColor : theme.secondaryText }]}
                selectable
              >
                {autoKey ?? "Aguardando…"}
              </Text>
              {autoKey && (
                <TouchableOpacity
                  onPress={() => Share.share({ message: autoKey, title: "Chave de auto-backup Domus" })}
                  hitSlop={12}
                >
                  <Feather name="share-2" size={15} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.keyHint, { color: theme.secondaryText }]}>
              Guarde esta chave. Sem ela não é possível restaurar o auto-backup em outro dispositivo.
            </Text>

            <StatusRow status={autoRestoreStatus} theme={theme} />

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: "#8B5CF6" },
                (!autoKey || isLoading(autoRestoreStatus)) && styles.actionBtnDisabled,
              ]}
              onPress={handleRestoreAutoBackup}
              disabled={!autoKey || isLoading(autoRestoreStatus)}
              activeOpacity={0.8}
            >
              {isLoading(autoRestoreStatus) ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="rotate-ccw" size={18} color="#fff" />
              )}
              <Text style={styles.actionBtnText}>
                {isLoading(autoRestoreStatus)
                  ? STATUS_LABELS[autoRestoreStatus.type]
                  : "Restaurar auto-backup"}
              </Text>
            </TouchableOpacity>
          </SectionCard>
        )}

        {/* Security note */}
        <View style={styles.securityNote}>
          <Feather name="lock" size={12} color={theme.secondaryText} />
          <Text style={[styles.securityNoteText, { color: theme.secondaryText }]}>
            PBKDF2-SHA256 · 100 000 iterações · AES-256-GCM · salt e IV aleatórios por backup
          </Text>
        </View>
      </ScrollView>

      <ConfirmRestoreModal
        visible={showConfirmModal}
        preview={pendingPayload?.preview ?? null}
        theme={theme}
        onConfirm={handleConfirmRestore}
        onCancel={() => { setShowConfirmModal(false); setPendingPayload(null); }}
      />
    </SafeAreaView>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  theme,
  icon,
  title,
  subtitle,
  accentColor,
  children,
}: {
  theme: { cardBackground: string; textColor: string; secondaryText: string; border: string };
  icon: string;
  title: string;
  subtitle: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: accentColor + "18" }]}>
          <Feather name={icon as any} size={20} color={accentColor} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function StatusRow({ status, theme }: { status: BackupStatus; theme: { secondaryText: string } }) {
  if (status.type === "idle") return null;

  const isErr = status.type === "error";
  const isOk = status.type === "success";
  const color = isErr ? "#DC2626" : isOk ? "#16A34A" : theme.secondaryText;
  const icon = isErr ? "alert-circle" : isOk ? "check-circle" : "loader";
  const label =
    isErr || isOk
      ? (status as { message: string }).message
      : STATUS_LABELS[status.type];

  return (
    <View style={styles.statusRow}>
      {isLoading(status) ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Feather name={icon as any} size={14} color={color} />
      )}
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 16,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  cardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  cardSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 4,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  filePickerText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 24,
  },
  statusText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    flex: 1,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 4,
  },
  securityNoteText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    textAlign: "center",
  },
  encryptToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  encryptToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  encryptToggleLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  plainWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  plainWarningText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  exportHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  exportHint: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  autoHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keyText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    letterSpacing: 1,
  },
  keyHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
});
