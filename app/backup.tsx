import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Switch,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { PasswordInputComponent } from "@/src/components/backup/PasswordInputComponent";
import { ConfirmRestoreModal } from "@/src/components/backup/ConfirmRestoreModal";
import { useGoogleDriveBackup } from "@/src/hooks/useGoogleDriveBackup";
import { useBackupRestore, STATUS_LABELS, isLoading } from "@/src/hooks/useBackupRestore";
import { autoBackupFilePath } from "@/src/hooks/useAutoBackup";
import { TourPageHost } from "@/src/components/tour/TourPageHost";

type TabId = "export" | "restore" | "drive";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "export", label: "Exportar", icon: "upload-cloud" },
  { id: "restore", label: "Restaurar", icon: "download-cloud" },
  { id: "drive", label: "Drive", icon: "cloud" },
];

export default function BackupScreen() {
  const router = useRouter();
  const { theme, getAllEvents, restoreFromBackup, deviceId } = useAppState();
  const [activeTab, setActiveTab] = useState<TabId>("export");

  const bk = useBackupRestore({ getAllEvents, restoreFromBackup, deviceId });
  const drive = useGoogleDriveBackup();
  const eventCount = getAllEvents().length;

  return (
    <TourPageHost groupId={8}>
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { soundManager.play("tap"); router.back(); }} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textColor }]}>Backup & Restauração</Text>
      </View>

      <View style={[s.tabBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tabItem, active && [s.tabItemActive, { backgroundColor: theme.background }]]}
              onPress={() => { soundManager.play("tap"); setActiveTab(tab.id); }}
              activeOpacity={0.7}
            >
              <Feather name={tab.icon as any} size={15} color={active ? theme.primaryColor : theme.secondaryText} />
              <Text style={[s.tabLabel, { color: active ? theme.primaryColor : theme.secondaryText }, active && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAwareScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={50}>
        {/* EXPORT TAB */}
        {activeTab === "export" && (
          <>
            <View style={[s.infoBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="shield" size={15} color={theme.primaryColor} />
              <Text style={[s.infoText, { color: theme.secondaryText }]}>
                Exporte com AES-256-GCM (recomendado) ou sem criptografia para local seguro.
              </Text>
            </View>

            <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={[s.cardBody, { gap: 12 }]}>
                <View style={[s.statRow, { borderColor: theme.border }]}>
                  <Feather name="database" size={15} color={theme.primaryColor} />
                  <Text style={[s.statText, { color: theme.textColor }]}>
                    {eventCount} evento{eventCount !== 1 ? "s" : ""} no dispositivo
                  </Text>
                </View>

                <View style={[s.encryptToggleRow, { borderColor: theme.border }]}>
                  <View style={s.encryptToggleLeft}>
                    <Feather name={bk.encryptExport ? "lock" : "unlock"} size={15} color={bk.encryptExport ? "#10B981" : "#F59E0B"} />
                    <Text style={[s.encryptToggleLabel, { color: theme.textColor }]}>Criptografar backup</Text>
                  </View>
                  <Switch
                    value={bk.encryptExport}
                    onValueChange={(v) => { soundManager.play("tap"); bk.toggleEncrypt(v); }}
                    trackColor={{ false: "#F59E0B80", true: "#10B981" }}
                    thumbColor="#fff"
                  />
                </View>

                {bk.encryptExport ? (
                  <>
                    <PasswordInputComponent
                      label="Senha de criptografia"
                      value={bk.exportPassword}
                      onChange={bk.setExportPassword}
                      theme={theme}
                      placeholder="Mínimo 8 caracteres"
                      editable={!isLoading(bk.exportStatus)}
                    />
                    <PasswordInputComponent
                      label="Confirmar senha"
                      value={bk.exportConfirm}
                      onChange={(v) => { bk.setExportConfirm(v); bk.setExportPasswordError(""); }}
                      theme={theme}
                      placeholder="Repita a senha"
                      error={bk.exportPasswordError}
                      editable={!isLoading(bk.exportStatus)}
                    />
                  </>
                ) : (
                  <View style={[s.warnBanner, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B12" }]}>
                    <Feather name="alert-triangle" size={14} color="#F59E0B" />
                    <Text style={[s.warnText, { color: theme.secondaryText }]}>
                      Sem proteção por senha. Use apenas em local seguro.
                    </Text>
                  </View>
                )}

                <View style={s.hintRow}>
                  <Feather name="info" size={12} color={theme.secondaryText} />
                  <Text style={[s.hintText, { color: theme.secondaryText }]}>
                    Abre o menu de compartilhamento — Drive, e-mail, WhatsApp ou local.
                  </Text>
                </View>

                <StatusRow status={bk.exportStatus} theme={theme} />

                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    { backgroundColor: bk.encryptExport ? theme.primaryColor : "#F59E0B" },
                    (isLoading(bk.exportStatus) || (bk.encryptExport && (!bk.exportPassword || !bk.exportConfirm))) && s.actionBtnDisabled,
                  ]}
                  onPress={() => { soundManager.play("pop"); (bk.encryptExport ? bk.handleExport : bk.handleExportPlain)(); }}
                  disabled={isLoading(bk.exportStatus) || (bk.encryptExport && (!bk.exportPassword || !bk.exportConfirm))}
                  activeOpacity={0.8}
                >
                  {isLoading(bk.exportStatus)
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Feather name="upload-cloud" size={17} color="#fff" />}
                  <Text style={s.actionBtnText}>
                    {isLoading(bk.exportStatus)
                      ? STATUS_LABELS[bk.exportStatus.type]
                      : bk.encryptExport ? "Exportar e compartilhar" : "Exportar sem criptografia"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* RESTORE TAB */}
        {activeTab === "restore" && (
          <>
            <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconBg, { backgroundColor: "#F59E0B18" }]}>
                  <Feather name="file-text" size={16} color="#F59E0B" />
                </View>
                <Text style={[s.sectionTitle, { color: theme.textColor }]}>De arquivo</Text>
              </View>
              <View style={[s.divider, { backgroundColor: theme.border }]} />
              <View style={[s.cardBody, { gap: 12 }]}>
                <TouchableOpacity
                  style={[s.filePicker, { borderColor: bk.selectedFileUri ? "#10B981" : theme.border, backgroundColor: theme.background }]}
                  onPress={() => { soundManager.play("tap"); bk.handlePickFile(); }}
                  activeOpacity={0.7}
                >
                  <Feather name={bk.selectedFileUri ? "check-circle" : "folder"} size={17} color={bk.selectedFileUri ? "#10B981" : theme.secondaryText} />
                  <Text style={[s.filePickerText, { color: bk.selectedFileUri ? "#10B981" : theme.secondaryText }]} numberOfLines={1}>
                    {bk.selectedFileName ?? "Selecionar arquivo…"}
                  </Text>
                  {bk.selectedFileUri && (
                    <TouchableOpacity onPress={() => { soundManager.play("tap"); bk.clearSelectedFile(); }} hitSlop={12}>
                      <Feather name="x" size={16} color={theme.secondaryText} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {bk.selectedFileUri && (
                  <>
                    {bk.importIsEncrypted === false ? (
                      <View style={[s.warnBanner, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B12" }]}>
                        <Feather name="unlock" size={13} color="#F59E0B" />
                        <Text style={[s.warnText, { color: theme.secondaryText }]}>Este backup não está criptografado.</Text>
                      </View>
                    ) : (
                      <PasswordInputComponent
                        label="Senha do backup"
                        value={bk.importPassword}
                        onChange={bk.setImportPassword}
                        theme={theme}
                        editable={!isLoading(bk.importStatus)}
                      />
                    )}
                    <StatusRow status={bk.importStatus} theme={theme} />
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: "#F59E0B" }, (isLoading(bk.importStatus) || (bk.importIsEncrypted !== false && !bk.importPassword)) && s.actionBtnDisabled]}
                      onPress={() => { soundManager.play("pop"); bk.handleValidateImport(); }}
                      disabled={isLoading(bk.importStatus) || (bk.importIsEncrypted !== false && !bk.importPassword)}
                      activeOpacity={0.8}
                    >
                      {isLoading(bk.importStatus) ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="download-cloud" size={17} color="#fff" />}
                      <Text style={s.actionBtnText}>
                        {isLoading(bk.importStatus) ? STATUS_LABELS[bk.importStatus.type] : "Verificar e restaurar"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {!bk.selectedFileUri && <StatusRow status={bk.importStatus} theme={theme} />}
              </View>
            </View>

            {/* Auto-backup local */}
            {Platform.OS !== "web" && (
              <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={s.sectionHeader}>
                  <View style={[s.sectionIconBg, { backgroundColor: "#8B5CF618" }]}>
                    <Feather name="refresh-cw" size={16} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sectionTitle, { color: theme.textColor }]}>Auto-backup local</Text>
                    <Text style={[s.sectionSubtitle, { color: theme.secondaryText }]}>
                      {bk.autoTs
                        ? `Último: ${new Date(bk.autoTs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "Nunca executado"}
                    </Text>
                  </View>
                </View>
                <View style={[s.divider, { backgroundColor: theme.border }]} />
                <View style={[s.cardBody, { gap: 12 }]}>
                  <Text style={[s.hintText, { color: theme.secondaryText }]}>
                    Gerado a cada 24 h automaticamente. Criptografado com a chave do dispositivo.
                  </Text>
                  <View style={[s.keyRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Feather name="key" size={13} color="#8B5CF6" />
                    <Text style={[s.keyText, { color: bk.autoKey ? theme.textColor : theme.secondaryText }]} selectable>
                      {bk.autoKey ?? "Aguardando…"}
                    </Text>
                    {bk.autoKey && (
                      <TouchableOpacity onPress={() => { soundManager.play("tap"); Share.share({ message: bk.autoKey!, title: "Chave de auto-backup Domus" }); }} hitSlop={12}>
                        <Feather name="share-2" size={14} color={theme.secondaryText} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[s.hintText, { color: theme.secondaryText, fontSize: 11 }]}>
                    Guarde esta chave. Sem ela não é possível restaurar em outro dispositivo.
                  </Text>
                  <StatusRow status={bk.autoRestoreStatus} theme={theme} />
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: "#8B5CF6" }, (!bk.autoKey || isLoading(bk.autoRestoreStatus)) && s.actionBtnDisabled]}
                    onPress={() => { soundManager.play("pop"); bk.handleRestoreAutoBackup(); }}
                    disabled={!bk.autoKey || isLoading(bk.autoRestoreStatus)}
                    activeOpacity={0.8}
                  >
                    {isLoading(bk.autoRestoreStatus) ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="rotate-ccw" size={17} color="#fff" />}
                    <Text style={s.actionBtnText}>
                      {isLoading(bk.autoRestoreStatus) ? STATUS_LABELS[bk.autoRestoreStatus.type] : "Restaurar auto-backup"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* DRIVE TAB */}
        {activeTab === "drive" && (
          <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIconBg, { backgroundColor: "#4285F418" }]}>
                <Feather name="cloud" size={16} color="#4285F4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionTitle, { color: theme.textColor }]}>Google Drive</Text>
                <Text style={[s.sectionSubtitle, { color: theme.secondaryText }]}>
                  {drive.isConnected
                    ? drive.lastSyncAt
                      ? `Último sync: ${new Date(drive.lastSyncAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                      : "Conectado — nunca sincronizado"
                    : "Backup automático na nuvem"}
                </Text>
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <View style={[s.cardBody, { gap: 12 }]}>
              {!drive.isConfigured ? (
                <View style={[s.warnBanner, { borderColor: "#4285F440", backgroundColor: "#4285F412" }]}>
                  <Feather name="info" size={14} color="#4285F4" />
                  <Text style={[s.warnText, { color: theme.secondaryText }]}>
                    Adicione{" "}
                    <Text style={{ fontFamily: "DMSans_600SemiBold" }}>EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID</Text>
                    {" "}no .env e configure o Google Cloud Console.
                  </Text>
                </View>
              ) : drive.isConnected ? (
                <>
                  <View style={[s.driveAccountRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={s.driveAccountLeft}>
                      <Feather name="check-circle" size={15} color="#4285F4" />
                      <Text style={[s.driveAccountEmail, { color: theme.textColor }]} numberOfLines={1}>
                        {drive.email ?? "Conta Google conectada"}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => { soundManager.play("tap"); drive.disconnect(); }} hitSlop={10}>
                      <Text style={[s.driveDisconnect, { color: theme.danger }]}>Desconectar</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[s.hintText, { color: theme.secondaryText }]}>
                    O auto-backup diário é enviado ao seu Google Drive automaticamente.
                    Arquivo: <Text style={{ fontFamily: "DMSans_500Medium" }}>domus-backup.domusbackup</Text>
                  </Text>
                  {drive.syncError && <StatusRow status={{ type: "error", message: drive.syncError }} theme={theme} />}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: "#4285F4" }, drive.isSyncing && s.actionBtnDisabled]}
                    onPress={async () => {
                      soundManager.play("pop");
                      const filePath = autoBackupFilePath();
                      const { FileSystemService } = await import("@/src/modules/backup/infrastructure/FileSystemService");
                      try {
                        const content = await FileSystemService.read(filePath);
                        await drive.uploadContent(content);
                      } catch {}
                    }}
                    disabled={drive.isSyncing}
                    activeOpacity={0.8}
                  >
                    {drive.isSyncing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload-cloud" size={17} color="#fff" />}
                    <Text style={s.actionBtnText}>{drive.isSyncing ? "Enviando…" : "Sincronizar agora"}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[s.hintText, { color: theme.secondaryText }]}>
                    Conecte sua conta Google para enviar o auto-backup diário automaticamente. O arquivo ficará visível em "Meu Drive".
                  </Text>
                  {drive.syncError && <StatusRow status={{ type: "error", message: drive.syncError }} theme={theme} />}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: "#4285F4" }, (drive.isConnecting || !drive.canConnect) && s.actionBtnDisabled]}
                    onPress={() => { soundManager.play("pop"); drive.connect(); }}
                    disabled={drive.isConnecting || !drive.canConnect}
                    activeOpacity={0.8}
                  >
                    {drive.isConnecting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="log-in" size={17} color="#fff" />}
                    <Text style={s.actionBtnText}>{drive.isConnecting ? "Aguardando…" : "Conectar Google Drive"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}


        <View style={s.footer}>
          <Feather name="lock" size={11} color={theme.secondaryText} />
          <Text style={[s.footerText, { color: theme.secondaryText }]}>
            PBKDF2-SHA256 · 100 000 iter · AES-256-GCM · salt e IV aleatórios
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <ConfirmRestoreModal
        visible={bk.showConfirmModal}
        preview={bk.pendingPayload?.preview ?? null}
        theme={theme}
        onConfirm={() => { soundManager.play("pop"); bk.handleConfirmRestore(); }}
        onCancel={() => { soundManager.play("tap"); bk.setShowConfirmModal(false); bk.setPendingPayload(null); }}
      />
    </SafeAreaView>
    </TourPageHost>
  );
}

// ── StatusRow sub-component ──────────────────────────────────────────────────

function StatusRow({ status, theme }: { status: any; theme: { secondaryText: string } }) {
  if (status.type === "idle") return null;
  const isErr = status.type === "error";
  const isOk = status.type === "success";
  const color = isErr ? "#DC2626" : isOk ? "#16A34A" : theme.secondaryText;
  const icon = isErr ? "alert-circle" : isOk ? "check-circle" : "loader";
  const label = isErr || isOk ? status.message : STATUS_LABELS[status.type as keyof typeof STATUS_LABELS];
  return (
    <View style={s.statusRow}>
      {isLoading(status) ? <ActivityIndicator size="small" color={color} /> : <Feather name={icon as any} size={14} color={color} />}
      <Text style={[s.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 19, flex: 1 },
  tabBar: { flexDirection: "row", marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 4, gap: 2 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 9 },
  tabItemActive: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabLabel: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  tabLabelActive: { fontFamily: "DMSans_700Bold" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  sectionIconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  sectionSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  statText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  encryptToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  encryptToggleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  encryptToggleLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  warnBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  warnText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  hintText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, marginTop: 2 },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#fff" },
  filePicker: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed", paddingHorizontal: 14, paddingVertical: 13 },
  filePickerText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 14 },
  keyRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  keyText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 13, letterSpacing: 1 },
  driveAccountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  driveAccountLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  driveAccountEmail: { fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 },
  driveDisconnect: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 22 },
  statusText: { fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingVertical: 4 },
  footerText: { fontFamily: "DMSans_400Regular", fontSize: 10, textAlign: "center" },
});
