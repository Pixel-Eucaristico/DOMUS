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
import { useGoogleDriveBackup } from "@/src/hooks/useGoogleDriveBackup";

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

type TabId = "export" | "restore" | "drive";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "export", label: "Exportar", icon: "upload-cloud" },
  { id: "restore", label: "Restaurar", icon: "download-cloud" },
  { id: "drive", label: "Drive", icon: "cloud" },
];

// ─── screen ──────────────────────────────────────────────────────────────────

export default function BackupScreen() {
  const router = useRouter();
  const { theme, getAllEvents, restoreFromBackup, deviceId } = useAppState();

  const [activeTab, setActiveTab] = useState<TabId>("export");

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

  // Google Drive
  const drive = useGoogleDriveBackup();

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

  // ─── export ──────────────────────────────────────────────────────────────

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

  // ─── import ───────────────────────────────────────────────────────────────

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

  // ─── auto-backup restore ──────────────────────────────────────────────────

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

  // ─── render ───────────────────────────────────────────────────────────────

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

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                active && [styles.tabItemActive, { backgroundColor: theme.background }],
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Feather
                name={tab.icon as any}
                size={15}
                color={active ? theme.primaryColor : theme.secondaryText}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? theme.primaryColor : theme.secondaryText },
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── EXPORTAR ────────────────────────────────────────────────────── */}
        {activeTab === "export" && (
          <>
            <View style={[styles.infoBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="shield" size={15} color={theme.primaryColor} />
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                Exporte com AES-256-GCM (recomendado) ou sem criptografia para local seguro.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={[styles.cardBody, { gap: 12 }]}>
                {/* Contador */}
                <View style={[styles.statRow, { borderColor: theme.border }]}>
                  <Feather name="database" size={15} color={theme.primaryColor} />
                  <Text style={[styles.statText, { color: theme.textColor }]}>
                    {eventCount} evento{eventCount !== 1 ? "s" : ""} no dispositivo
                  </Text>
                </View>

                {/* Toggle criptografia */}
                <View style={[styles.encryptToggleRow, { borderColor: theme.border }]}>
                  <View style={styles.encryptToggleLeft}>
                    <Feather
                      name={encryptExport ? "lock" : "unlock"}
                      size={15}
                      color={encryptExport ? "#10B981" : "#F59E0B"}
                    />
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
                  <View style={[styles.warnBanner, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B12" }]}>
                    <Feather name="alert-triangle" size={14} color="#F59E0B" />
                    <Text style={[styles.warnText, { color: theme.secondaryText }]}>
                      Sem proteção por senha. Use apenas em local seguro.
                    </Text>
                  </View>
                )}

                <View style={styles.hintRow}>
                  <Feather name="info" size={12} color={theme.secondaryText} />
                  <Text style={[styles.hintText, { color: theme.secondaryText }]}>
                    Abre o menu de compartilhamento — Drive, e-mail, WhatsApp ou local.
                  </Text>
                </View>

                <StatusRow status={exportStatus} theme={theme} />

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: encryptExport ? theme.primaryColor : "#F59E0B" },
                    (isLoading(exportStatus) || (encryptExport && (!exportPassword || !exportConfirm))) && styles.actionBtnDisabled,
                  ]}
                  onPress={encryptExport ? handleExport : handleExportPlain}
                  disabled={isLoading(exportStatus) || (encryptExport && (!exportPassword || !exportConfirm))}
                  activeOpacity={0.8}
                >
                  {isLoading(exportStatus) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="upload-cloud" size={17} color="#fff" />
                  )}
                  <Text style={styles.actionBtnText}>
                    {isLoading(exportStatus)
                      ? STATUS_LABELS[exportStatus.type]
                      : encryptExport
                        ? "Exportar e compartilhar"
                        : "Exportar sem criptografia"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ── RESTAURAR ───────────────────────────────────────────────────── */}
        {activeTab === "restore" && (
          <>
            {/* Arquivo manual */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: "#F59E0B18" }]}>
                  <Feather name="file-text" size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>De arquivo</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={[styles.cardBody, { gap: 12 }]}>
                <TouchableOpacity
                  style={[
                    styles.filePicker,
                    { borderColor: selectedFileUri ? "#10B981" : theme.border, backgroundColor: theme.background },
                  ]}
                  onPress={handlePickFile}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={selectedFileUri ? "check-circle" : "folder"}
                    size={17}
                    color={selectedFileUri ? "#10B981" : theme.secondaryText}
                  />
                  <Text
                    style={[styles.filePickerText, { color: selectedFileUri ? "#10B981" : theme.secondaryText }]}
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
                    {importIsEncrypted === false ? (
                      <View style={[styles.warnBanner, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B12" }]}>
                        <Feather name="unlock" size={13} color="#F59E0B" />
                        <Text style={[styles.warnText, { color: theme.secondaryText }]}>
                          Este backup não está criptografado.
                        </Text>
                      </View>
                    ) : (
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
                        <Feather name="download-cloud" size={17} color="#fff" />
                      )}
                      <Text style={styles.actionBtnText}>
                        {isLoading(importStatus) ? STATUS_LABELS[importStatus.type] : "Verificar e restaurar"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {!selectedFileUri && <StatusRow status={importStatus} theme={theme} />}
              </View>
            </View>

            {/* Auto-backup local */}
            {Platform.OS !== "web" && (
              <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: "#8B5CF618" }]}>
                    <Feather name="refresh-cw" size={16} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Auto-backup local</Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                      {autoTs
                        ? `Último: ${new Date(autoTs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "Nunca executado"}
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={[styles.cardBody, { gap: 12 }]}>
                  <Text style={[styles.hintText, { color: theme.secondaryText }]}>
                    Gerado a cada 24 h automaticamente. Criptografado com a chave do dispositivo.
                  </Text>

                  <View style={[styles.keyRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Feather name="key" size={13} color="#8B5CF6" />
                    <Text style={[styles.keyText, { color: autoKey ? theme.textColor : theme.secondaryText }]} selectable>
                      {autoKey ?? "Aguardando…"}
                    </Text>
                    {autoKey && (
                      <TouchableOpacity onPress={() => Share.share({ message: autoKey, title: "Chave de auto-backup Domus" })} hitSlop={12}>
                        <Feather name="share-2" size={14} color={theme.secondaryText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={[styles.hintText, { color: theme.secondaryText, fontSize: 11 }]}>
                    Guarde esta chave. Sem ela não é possível restaurar em outro dispositivo.
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
                      <Feather name="rotate-ccw" size={17} color="#fff" />
                    )}
                    <Text style={styles.actionBtnText}>
                      {isLoading(autoRestoreStatus) ? STATUS_LABELS[autoRestoreStatus.type] : "Restaurar auto-backup"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── DRIVE ───────────────────────────────────────────────────────── */}
        {activeTab === "drive" && Platform.OS !== "web" && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: "#4285F418" }]}>
                <Feather name="cloud" size={16} color="#4285F4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Google Drive</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  {drive.isConnected
                    ? drive.lastSyncAt
                      ? `Último sync: ${new Date(drive.lastSyncAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                      : "Conectado — nunca sincronizado"
                    : "Backup automático na nuvem"}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.cardBody, { gap: 12 }]}>
              {!drive.isConfigured ? (
                <View style={[styles.warnBanner, { borderColor: "#4285F440", backgroundColor: "#4285F412" }]}>
                  <Feather name="info" size={14} color="#4285F4" />
                  <Text style={[styles.warnText, { color: theme.secondaryText }]}>
                    Adicione{" "}
                    <Text style={{ fontFamily: "DMSans_600SemiBold" }}>EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID</Text>
                    {" "}no .env e configure o Google Cloud Console.
                  </Text>
                </View>
              ) : drive.isConnected ? (
                <>
                  <View style={[styles.driveAccountRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={styles.driveAccountLeft}>
                      <Feather name="check-circle" size={15} color="#4285F4" />
                      <Text style={[styles.driveAccountEmail, { color: theme.textColor }]} numberOfLines={1}>
                        {drive.email ?? "Conta Google conectada"}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={drive.disconnect} hitSlop={10}>
                      <Text style={[styles.driveDisconnect, { color: theme.danger }]}>Desconectar</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.hintText, { color: theme.secondaryText }]}>
                    O auto-backup diário é enviado ao seu Google Drive automaticamente.
                    Arquivo:{" "}
                    <Text style={{ fontFamily: "DMSans_500Medium" }}>domus-backup.domusbackup</Text>
                  </Text>

                  {drive.syncError && (
                    <StatusRow status={{ type: "error", message: drive.syncError }} theme={theme} />
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#4285F4" }, drive.isSyncing && styles.actionBtnDisabled]}
                    onPress={async () => {
                      const filePath = autoBackupFilePath();
                      const { FileSystemService } = await import("@/src/modules/backup/infrastructure/FileSystemService");
                      try {
                        const content = await FileSystemService.read(filePath);
                        await drive.uploadContent(content);
                      } catch {
                        // arquivo local ainda não existe
                      }
                    }}
                    disabled={drive.isSyncing}
                    activeOpacity={0.8}
                  >
                    {drive.isSyncing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="upload-cloud" size={17} color="#fff" />
                    )}
                    <Text style={styles.actionBtnText}>
                      {drive.isSyncing ? "Enviando…" : "Sincronizar agora"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.hintText, { color: theme.secondaryText }]}>
                    Conecte sua conta Google para enviar o auto-backup diário automaticamente.
                    O arquivo ficará visível em "Meu Drive".
                  </Text>

                  {drive.syncError && (
                    <StatusRow status={{ type: "error", message: drive.syncError }} theme={theme} />
                  )}

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "#4285F4" },
                      (drive.isConnecting || !drive.canConnect) && styles.actionBtnDisabled,
                    ]}
                    onPress={drive.connect}
                    disabled={drive.isConnecting || !drive.canConnect}
                    activeOpacity={0.8}
                  >
                    {drive.isConnecting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="log-in" size={17} color="#fff" />
                    )}
                    <Text style={styles.actionBtnText}>
                      {drive.isConnecting ? "Aguardando…" : "Conectar Google Drive"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {activeTab === "drive" && Platform.OS === "web" && (
          <View style={[styles.warnBanner, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
            <Feather name="info" size={14} color={theme.secondaryText} />
            <Text style={[styles.warnText, { color: theme.secondaryText }]}>
              Google Drive disponível apenas no Android e iOS.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Feather name="lock" size={11} color={theme.secondaryText} />
          <Text style={[styles.footerText, { color: theme.secondaryText }]}>
            PBKDF2-SHA256 · 100 000 iter · AES-256-GCM · salt e IV aleatórios
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
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 19,
    flex: 1,
  },
  // Tab bar
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 4,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabItemActive: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  tabLabelActive: {
    fontFamily: "DMSans_700Bold",
  },
  // Content
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  sectionSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  encryptToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  warnBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  warnText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  hintText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 2,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
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
    paddingVertical: 13,
  },
  filePickerText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
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
  driveAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  driveAccountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  driveAccountEmail: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
  },
  driveDisconnect: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 22,
  },
  statusText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 4,
  },
  footerText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    textAlign: "center",
  },
});
