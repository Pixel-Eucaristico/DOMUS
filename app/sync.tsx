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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSync } from "@/src/context/SyncProvider";
import { useAppState } from "@/src/context/AppStateProvider";

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
    status === "connected"
      ? "#22C55E"
      : status === "syncing"
        ? "#F59E0B"
        : status === "offline"
          ? "#EF4444"
          : "#9CA3AF";

  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function statusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Sincronizado";
    case "syncing":
      return "Sincronizando...";
    case "offline":
      return "Sem conexao";
    case "error":
      return "Erro";
    default:
      return "Desconectado";
  }
}

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppState();
  const {
    deviceId,
    groupId,
    syncStatus,
    lastSyncTime,
    errorMessage,
    eventCount,
    peerCount,
    isAutoSyncEnabled,
    createGroup,
    joinGroup,
    leaveGroup,
    pushNow,
    pullNow,
    resetStatus,
  } = useSync();

  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCreateGroup = useCallback(async () => {
    haptic();
    setActionLoading(true);
    await createGroup();
    setActionLoading(false);
  }, [createGroup]);

  const handleJoinGroup = useCallback(async () => {
    haptic();
    if (joinCode.trim().length < 4) return;
    setActionLoading(true);
    const ok = await joinGroup(joinCode.trim().toUpperCase());
    setActionLoading(false);
    if (ok) {
      setJoinCode("");
      setShowJoinInput(false);
    }
  }, [joinGroup, joinCode]);

  const handleLeaveGroup = useCallback(async () => {
    haptic();
    await leaveGroup();
  }, [leaveGroup]);

  const handleCopyCode = useCallback(async () => {
    if (!groupId) return;
    haptic();
    try {
      if (Platform.OS === "web" && navigator?.clipboard) {
        await navigator.clipboard.writeText(groupId);
      }
    } catch {}
  }, [groupId]);

  const handlePush = useCallback(async () => {
    haptic();
    await pushNow();
  }, [pushNow]);

  const handlePull = useCallback(async () => {
    haptic();
    await pullNow();
  }, [pullNow]);

  const isBusy = syncStatus === "syncing" || actionLoading;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="sync-back-button" onPress={() => { haptic(); router.canGoBack() ? router.back() : router.replace("/"); }} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: theme.textColor }]}>Sincronizar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statusRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.primaryColor}15` }]}>
              {isAutoSyncEnabled ? (
                <Ionicons name="sync" size={22} color={theme.primaryColor} />
              ) : (
                <Feather name="wifi-off" size={22} color={theme.secondaryText} />
              )}
            </View>
            <View style={styles.statusInfo}>
              <View style={styles.statusLabelRow}>
                <StatusDot status={syncStatus} />
                <Text style={[styles.statusLabelText, { color: theme.textColor }]}>
                  {statusLabel(syncStatus)}
                </Text>
              </View>
              {groupId && (
                <Text style={[styles.groupIdText, { color: theme.secondaryText }]}>
                  Grupo: {groupId}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textColor }]}>{eventCount}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>eventos</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textColor }]}>{peerCount}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>dispositivos</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textColor }]}>
                {lastSyncTime ? formatTime(lastSyncTime) : "--"}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>ultimo sync</Text>
            </View>
          </View>
        </View>

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: `${theme.danger}12` }]}>
            <Feather name="alert-circle" size={16} color={theme.danger} />
            <Text style={[styles.bannerText, { color: theme.danger }]}>{errorMessage}</Text>
            <Pressable onPress={resetStatus} hitSlop={8}>
              <Feather name="x" size={14} color={theme.secondaryText} />
            </Pressable>
          </View>
        )}

        {!isAutoSyncEnabled ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Conectar dispositivos
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.secondaryText }]}>
                Crie um grupo ou entre em um existente para sincronizar automaticamente
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: theme.primaryColor },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handleCreateGroup}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.actionCardIcon}>
                      <Feather name="plus" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.actionCardTitle}>Criar grupo</Text>
                    <Text style={styles.actionCardDesc}>Novo codigo</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => { haptic(); setShowJoinInput(true); }}
                disabled={isBusy}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                  <Feather name="log-in" size={24} color={theme.primaryColor} />
                </View>
                <Text style={[styles.actionCardTitle, { color: theme.textColor }]}>Entrar</Text>
                <Text style={[styles.actionCardDesc, { color: theme.secondaryText }]}>Com codigo</Text>
              </Pressable>
            </View>

            {showJoinInput && (
              <View style={[styles.joinCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.joinLabel, { color: theme.textColor }]}>
                  Codigo do grupo
                </Text>
                <View style={styles.joinInputRow}>
                  <TextInput
                    style={[
                      styles.joinInput,
                      {
                        color: theme.textColor,
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}
                    value={joinCode}
                    onChangeText={(text) => setJoinCode(text.toUpperCase())}
                    placeholder="EX: ABC123"
                    placeholderTextColor={theme.secondaryText}
                    autoCapitalize="characters"
                    maxLength={8}
                    autoFocus
                  />
                  <Pressable
                    style={[
                      styles.joinBtn,
                      {
                        backgroundColor: joinCode.trim().length >= 4 ? theme.primaryColor : theme.border,
                      },
                    ]}
                    onPress={handleJoinGroup}
                    disabled={joinCode.trim().length < 4 || isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="check" size={20} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
                <Pressable onPress={() => { setShowJoinInput(false); setJoinCode(""); }}>
                  <Text style={[styles.cancelText, { color: theme.secondaryText }]}>Cancelar</Text>
                </Pressable>
              </View>
            )}

            <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="info" size={16} color={theme.secondaryText} />
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                Crie um grupo no celular A, depois entre com o codigo no celular B. A partir dai, todos os dados sincronizam automaticamente em tempo real.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.connectedCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.connectedRow}>
                <View style={[styles.codeBadge, { backgroundColor: `${theme.primaryColor}12` }]}>
                  <Text style={[styles.codeText, { color: theme.primaryColor }]}>{groupId}</Text>
                </View>
                <Pressable onPress={handleCopyCode} hitSlop={10}>
                  <Feather name="copy" size={18} color={theme.secondaryText} />
                </Pressable>
              </View>
              <Text style={[styles.connectedHint, { color: theme.secondaryText }]}>
                Compartilhe este codigo com outro celular para parear
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Sync automatico</Text>
              <Text style={[styles.sectionDesc, { color: theme.secondaryText }]}>
                Seus dados sincronizam a cada 10 segundos e ao criar eventos
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: theme.primaryColor },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handlePush}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.actionCardIcon}>
                      <Feather name="upload-cloud" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.actionCardTitle}>Enviar tudo</Text>
                    <Text style={styles.actionCardDesc}>Push manual</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handlePull}
                disabled={isBusy}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                  <Feather name="download-cloud" size={24} color={theme.primaryColor} />
                </View>
                <Text style={[styles.actionCardTitle, { color: theme.textColor }]}>Buscar</Text>
                <Text style={[styles.actionCardDesc, { color: theme.secondaryText }]}>Pull manual</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.leaveBtn, { borderColor: theme.danger }]}
              onPress={handleLeaveGroup}
            >
              <Feather name="log-out" size={16} color={theme.danger} />
              <Text style={[styles.leaveBtnText, { color: theme.danger }]}>Sair do grupo</Text>
            </Pressable>

            <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="info" size={16} color={theme.secondaryText} />
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                A sincronizacao acontece automaticamente. Novos eventos sao enviados ao servidor quando criados e buscados a cada 10 segundos. Os dados ficam armazenados localmente no celular e funcionam offline.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  topBarTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  statusCard: {
    borderRadius: 16,
    padding: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statusInfo: { flex: 1, gap: 4 },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabelText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
  },
  groupIdText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 28, marginHorizontal: 8 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  bannerText: { fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 },
  sectionHeader: { gap: 2, marginTop: 8 },
  sectionTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  sectionDesc: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionCardTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  actionCardDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  joinCard: {
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  joinLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  joinInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  joinInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 18,
    letterSpacing: 3,
    textAlign: "center" as const,
  },
  joinBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center" as const,
  },
  connectedCard: {
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  connectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  codeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    letterSpacing: 4,
  },
  connectedHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  leaveBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  infoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
