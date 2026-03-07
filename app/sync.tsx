import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useSync } from "@/src/context/SyncProvider";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { QRScannerModal } from "@/src/components/sync/QRScannerModal";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_W * 0.5, SCREEN_H * 0.3, 220);

function formatTime(ts: number | null): string {
  if (!ts) return "Nunca";
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${h}:${m}`;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "connected" ? "#22C55E"
    : status === "syncing" ? "#F59E0B"
    : status === "offline" ? "#EF4444"
    : "#9CA3AF";
  return <View style={[s.dot, { backgroundColor: color }]} />;
}

function statusLabel(status: string): string {
  switch (status) {
    case "connected": return "Sincronizado";
    case "syncing": return "Sincronizando...";
    case "offline": return "Sem conexao";
    case "error": return "Erro";
    default: return "Desconectado";
  }
}

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppState();
  const {
    deviceId, groupId, syncStatus, lastSyncTime, errorMessage,
    eventCount, relayCount, isAutoSyncEnabled,
    createGroup, joinGroup, leaveGroup, pushNow, pullNow, resetStatus,
  } = useSync();

  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const haptic = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateGroup = useCallback(async () => {
    haptic();
    soundManager.play("pop");
    setActionLoading(true);
    await createGroup();
    setActionLoading(false);
  }, [createGroup]);

  const handleJoinGroup = useCallback(async () => {
    haptic();
    soundManager.play("pop");
    if (joinCode.trim().length < 4) return;
    setActionLoading(true);
    const ok = await joinGroup(joinCode.trim().toUpperCase());
    setActionLoading(false);
    if (ok) { setJoinCode(""); setShowJoinInput(false); }
  }, [joinGroup, joinCode]);

  const handleScanResult = useCallback(async (code: string) => {
    soundManager.play("pop");
    setShowScanner(false);
    setJoinCode(code);
    setShowJoinInput(true);
    setActionLoading(true);
    const ok = await joinGroup(code);
    setActionLoading(false);
    if (ok) { setJoinCode(""); setShowJoinInput(false); }
  }, [joinGroup]);

  const handleLeaveGroup = useCallback(async () => { haptic(); soundManager.play("tap"); await leaveGroup(); }, [leaveGroup]);

  const handleCopyCode = useCallback(async () => {
    if (!groupId) return;
    haptic();
    soundManager.play("tap");
    try {
      if (Platform.OS === "web" && navigator?.clipboard) {
        await navigator.clipboard.writeText(groupId);
      } else if (Platform.OS !== "web") {
        await Share.share({ message: `domus://${groupId}` });
      }
    } catch {}
  }, [groupId]);

  const handlePush = useCallback(async () => { haptic(); soundManager.play("pop"); await pushNow(); }, [pushNow]);
  const handlePull = useCallback(async () => { haptic(); soundManager.play("pop"); await pullNow(); }, [pullNow]);

  const isBusy = syncStatus === "syncing" || actionLoading;
  const qrValue = groupId ? `domus://${groupId}` : "";

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="sync-back-button" onPress={() => { haptic(); soundManager.play("tap"); router.canGoBack() ? router.back() : router.replace("/"); }} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.topBarTitle, { color: theme.textColor }]}>Sincronizar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + webBottomInset + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <View style={[s.statusCard, { backgroundColor: theme.cardBackground }]}>
          <View style={s.statusRow}>
            <View style={[s.iconCircle, { backgroundColor: `${theme.primaryColor}15` }]}>
              {isAutoSyncEnabled
                ? <Ionicons name="sync" size={22} color={theme.primaryColor} />
                : <Feather name="wifi-off" size={22} color={theme.secondaryText} />}
            </View>
            <View style={s.statusInfo}>
              <View style={s.statusLabelRow}>
                <StatusDot status={syncStatus} />
                <Text style={[s.statusLabelText, { color: theme.textColor }]}>{statusLabel(syncStatus)}</Text>
              </View>
              {groupId && <Text style={[s.groupIdText, { color: theme.secondaryText }]}>Grupo: {groupId}</Text>}
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: theme.textColor }]}>{eventCount}</Text>
              <Text style={[s.statLabel, { color: theme.secondaryText }]}>eventos</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: theme.textColor }]}>{relayCount}</Text>
              <Text style={[s.statLabel, { color: theme.secondaryText }]}>relays</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: theme.textColor }]}>{lastSyncTime ? formatTime(lastSyncTime) : "--"}</Text>
              <Text style={[s.statLabel, { color: theme.secondaryText }]}>ultimo sync</Text>
            </View>
          </View>
        </View>

        {errorMessage && (
          <View style={[s.banner, { backgroundColor: `${theme.danger}12` }]}>
            <Feather name="alert-circle" size={16} color={theme.danger} />
            <Text style={[s.bannerText, { color: theme.danger }]}>{errorMessage}</Text>
            <Pressable onPress={resetStatus} hitSlop={8}>
              <Feather name="x" size={14} color={theme.secondaryText} />
            </Pressable>
          </View>
        )}

        {!isAutoSyncEnabled ? (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.textColor }]}>Conectar dispositivos</Text>
              <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
                Crie um grupo ou entre em um existente para sincronizar automaticamente
              </Text>
            </View>

            <View style={s.actionsRow}>
              <Pressable
                style={({ pressed }) => [s.actionCard, { backgroundColor: theme.primaryColor }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                onPress={handleCreateGroup}
                disabled={isBusy}
              >
                {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <View style={s.actionCardIcon}><Feather name="plus" size={24} color="#FFFFFF" /></View>
                    <Text style={s.actionCardTitle}>Criar grupo</Text>
                    <Text style={s.actionCardDesc}>Novo codigo</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.actionCard, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                onPress={() => { haptic(); soundManager.play("tap"); setShowJoinInput(true); }}
                disabled={isBusy}
              >
                <View style={[s.actionCardIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                  <Feather name="log-in" size={24} color={theme.primaryColor} />
                </View>
                <Text style={[s.actionCardTitle, { color: theme.textColor }]}>Entrar</Text>
                <Text style={[s.actionCardDesc, { color: theme.secondaryText }]}>Com codigo</Text>
              </Pressable>
            </View>

            {Platform.OS !== "web" && (
              <Pressable
                style={({ pressed }) => [s.qrScanBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }, pressed && { opacity: 0.85 }]}
                onPress={() => { haptic(); soundManager.play("tap"); setShowScanner(true); }}
                disabled={isBusy}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={22} color={theme.primaryColor} />
                <Text style={[s.qrScanBtnText, { color: theme.textColor }]}>Escanear QR Code</Text>
                <Feather name="chevron-right" size={18} color={theme.secondaryText} />
              </Pressable>
            )}

            {showJoinInput && (
              <View style={[s.joinCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[s.joinLabel, { color: theme.textColor }]}>Codigo do grupo</Text>
                <View style={s.joinInputRow}>
                  <TextInput
                    style={[s.joinInput, { color: theme.textColor, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={joinCode}
                    onChangeText={(text) => setJoinCode(text.toUpperCase())}
                    placeholder="EX: ABC123"
                    placeholderTextColor={theme.secondaryText}
                    autoCapitalize="characters"
                    maxLength={8}
                    autoFocus
                  />
                  <Pressable
                    style={[s.joinBtn, { backgroundColor: joinCode.trim().length >= 4 ? theme.primaryColor : theme.border }]}
                    onPress={handleJoinGroup}
                    disabled={joinCode.trim().length < 4 || isBusy}
                  >
                    {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="check" size={20} color="#FFFFFF" />}
                  </Pressable>
                </View>
                <Pressable onPress={() => { soundManager.play("tap"); setShowJoinInput(false); setJoinCode(""); }}>
                  <Text style={[s.cancelText, { color: theme.secondaryText }]}>Cancelar</Text>
                </Pressable>
              </View>
            )}

            <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="info" size={16} color={theme.secondaryText} />
              <Text style={[s.infoText, { color: theme.secondaryText }]}>
                Crie um grupo no celular A, depois entre com o codigo ou escaneie o QR Code no celular B. Os dados sao sincronizados via relays publicos Nostr com criptografia ponta-a-ponta. Sem servidor central.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={[s.connectedCard, { backgroundColor: theme.cardBackground }]}>
              <View style={s.connectedRow}>
                <View style={[s.codeBadge, { backgroundColor: `${theme.primaryColor}12` }]}>
                  <Text style={[s.codeText, { color: theme.primaryColor }]}>{groupId}</Text>
                </View>
                <View style={s.connectedActions}>
                  <Pressable onPress={() => { haptic(); soundManager.play("tap"); setShowQRModal(true); }} hitSlop={10}>
                    <MaterialCommunityIcons name="qrcode" size={22} color={theme.secondaryText} />
                  </Pressable>
                  <Pressable onPress={handleCopyCode} hitSlop={10}>
                    <Feather name="share-2" size={18} color={theme.secondaryText} />
                  </Pressable>
                </View>
              </View>
              <Text style={[s.connectedHint, { color: theme.secondaryText }]}>
                Compartilhe o codigo ou mostre o QR para parear outro celular
              </Text>
            </View>

            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.textColor }]}>Sync automatico</Text>
              <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
                Seus dados sincronizam via relays Nostr a cada 8 segundos e ao criar eventos
              </Text>
            </View>

            <View style={s.actionsRow}>
              <Pressable
                style={({ pressed }) => [s.actionCard, { backgroundColor: theme.primaryColor }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                onPress={handlePush} disabled={isBusy}
              >
                {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <View style={s.actionCardIcon}><Feather name="upload-cloud" size={24} color="#FFFFFF" /></View>
                    <Text style={s.actionCardTitle}>Enviar tudo</Text>
                    <Text style={s.actionCardDesc}>Push manual</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.actionCard, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                onPress={handlePull} disabled={isBusy}
              >
                <View style={[s.actionCardIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                  <Feather name="download-cloud" size={24} color={theme.primaryColor} />
                </View>
                <Text style={[s.actionCardTitle, { color: theme.textColor }]}>Buscar</Text>
                <Text style={[s.actionCardDesc, { color: theme.secondaryText }]}>Pull manual</Text>
              </Pressable>
            </View>

            <Pressable style={[s.leaveBtn, { borderColor: theme.danger }]} onPress={handleLeaveGroup}>
              <Feather name="log-out" size={16} color={theme.danger} />
              <Text style={[s.leaveBtnText, { color: theme.danger }]}>Sair do grupo</Text>
            </Pressable>

            <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="info" size={16} color={theme.secondaryText} />
              <Text style={[s.infoText, { color: theme.secondaryText }]}>
                Sync descentralizado via Nostr. Eventos encriptados sao publicados em relays publicos e buscados automaticamente. Nenhum servidor central. Seus dados ficam locais e funcionam offline.
              </Text>
            </View>
          </>
        )}

        {/* Backup link */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>Backup local</Text>
          <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
            Exporta todos os dados criptografados para um arquivo que você guarda onde quiser
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.backupBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }, pressed && { opacity: 0.8 }]}
          onPress={() => { haptic(); soundManager.play("tap"); router.push("/backup"); }}
        >
          <View style={[s.backupBtnIcon, { backgroundColor: "#6366F118" }]}>
            <Feather name="archive" size={20} color="#6366F1" />
          </View>
          <View style={s.backupBtnText}>
            <Text style={[s.backupBtnTitle, { color: theme.textColor }]}>Backup & Restauração</Text>
            <Text style={[s.backupBtnDesc, { color: theme.secondaryText }]}>AES-256-GCM · protegido por senha</Text>
          </View>
          <Feather name="chevron-right" size={18} color={theme.secondaryText} />
        </Pressable>
      </ScrollView>

      <QRScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScanned={handleScanResult} theme={theme} />

      {/* QR display modal */}
      <Modal visible={showQRModal} animationType="fade" transparent onRequestClose={() => setShowQRModal(false)}>
        <Pressable style={s.qrModalOverlay} onPress={() => setShowQRModal(false)}>
          <ScrollView contentContainerStyle={s.qrModalScrollContent} showsVerticalScrollIndicator={false}>
            <Pressable style={[s.qrModalContent, { backgroundColor: theme.cardBackground }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[s.qrModalTitle, { color: theme.textColor }]}>QR Code do Grupo</Text>
              <View style={s.qrCodeWrap}>
                <QRCode value={qrValue || "domus://"} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
              </View>
              <View style={[s.qrCodeLabel, { backgroundColor: `${theme.primaryColor}12` }]}>
                <Text style={[s.qrCodeLabelText, { color: theme.primaryColor }]}>{groupId}</Text>
              </View>
              <Text style={[s.qrModalHint, { color: theme.secondaryText }]}>Escaneie com o outro celular para parear</Text>
              <Pressable style={[s.qrModalCloseBtn, { backgroundColor: theme.primaryColor }]} onPress={() => { soundManager.play("tap"); setShowQRModal(false); }}>
                <Text style={s.qrModalCloseBtnText}>Fechar</Text>
              </Pressable>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  topBarTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 18 },
  content: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  statusCard: { borderRadius: 16, padding: 18, gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  statusInfo: { flex: 1, gap: 4 },
  statusLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabelText: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  groupIdText: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 28, marginHorizontal: 8 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12 },
  bannerText: { fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 },
  sectionHeader: { gap: 2, marginTop: 8 },
  sectionTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  sectionDesc: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, borderRadius: 16, padding: 18, alignItems: "center", justifyContent: "center", gap: 8, minHeight: 120, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  actionCardIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  actionCardTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: "#FFFFFF" },
  actionCardDesc: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  qrScanBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  qrScanBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, flex: 1 },
  joinCard: { borderRadius: 16, padding: 18, gap: 12 },
  joinLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  joinInputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  joinInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: "DMSans_600SemiBold", fontSize: 18, letterSpacing: 3, textAlign: "center" as const },
  joinBtn: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cancelText: { fontFamily: "DMSans_500Medium", fontSize: 13, textAlign: "center" as const },
  connectedCard: { borderRadius: 16, padding: 18, gap: 10 },
  connectedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  connectedActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  codeBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  codeText: { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: 4 },
  connectedHint: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  leaveBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, marginTop: 4 },
  infoText: { fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
  qrModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  qrModalScrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  qrModalContent: { borderRadius: 24, padding: 24, alignItems: "center", gap: 14, width: "100%", maxWidth: 340 },
  qrModalTitle: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  qrCodeWrap: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 16 },
  qrCodeLabel: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  qrCodeLabelText: { fontFamily: "DMSans_700Bold", fontSize: 20, letterSpacing: 4 },
  qrModalHint: { fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center" as const },
  qrModalCloseBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  qrModalCloseBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: "#FFFFFF" },
  backupBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  backupBtnIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  backupBtnText: { flex: 1 },
  backupBtnTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  backupBtnDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
});
