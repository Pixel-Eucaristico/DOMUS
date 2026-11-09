import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useSync } from "@/src/context/SyncProvider";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  LEGACY_CODE_DISCONTINUED_MESSAGE,
  LEGACY_CUTOFF_MESSAGE,
  LEGACY_VERSION_TOO_OLD_MESSAGE,
} from "@/src/context/strongGroupSync";
import { soundManager } from "@/src/services/SoundManager";
import { appAlert, appConfirm } from "@/src/services/appAlert";
import { QRScannerModal } from "@/src/components/sync/QRScannerModal";
import { TButton, TCard, TInput, TText } from "@/src/components/tamagui";
import { ScreenIntroModal } from "@/src/components/tour/ScreenIntroModal";
import { useScreenIntro } from "@/src/hooks/useScreenIntro";
import { SCREEN_INTROS } from "@/src/tour/screenIntroContent";
import { PrivacyFlagNote } from "@/src/components/privacy/PrivacyFlagNote";
import { AppAlertScreenHost } from "@/src/components/shared/AppAlertHost";
import {
  KeyboardAwareScrollViewCompat,
  SCROLL_BOTTOM_PADDING,
} from "@/components/KeyboardAwareScrollViewCompat";

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
    case "offline": return "Sem conexão";
    case "error": return "Erro";
    default: return "Desconectado";
  }
}

function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppState();
  const {
    groupId, isStrongGroup, canMigrate, migrateToStrongGroup, syncStatus, lastSyncTime, errorMessage,
    eventCount, relayCount, isAutoSyncEnabled,
    createGroup, joinGroup, leaveGroup, pushNow, pullNow, resetStatus,
    coexistingGroups,
  } = useSync();

  const isLegacyCutoff = Boolean(coexistingGroups.legacyCutoff && !isStrongGroup);

  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showIntro, dismissIntro } = useScreenIntro("sync");
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
    const raw = joinCode.trim();
    if (raw.length < 4) return;

    let normalized = raw;
    if (normalized.toLowerCase().startsWith("domus://")) {
      normalized = normalized.slice("domus://".length).trim();
    }
    const stripped = normalized.replace(/[\s\-\u00AD\u2010-\u2015\u2212\u200B-\u200D\u2060\uFEFF]+/g, "");
    if (!normalized.toUpperCase().startsWith("DOMUS") && stripped.length === 6) {
      appAlert("Código descontinuado", LEGACY_CODE_DISCONTINUED_MESSAGE);
      return;
    }

    setActionLoading(true);
    const ok = await joinGroup(raw, { keepLegacy: Boolean(coexistingGroups.legacy) });
    setActionLoading(false);
    if (ok) { setJoinCode(""); setShowJoinInput(false); }
  }, [joinGroup, joinCode, coexistingGroups.legacy]);

  const handleScanResult = useCallback(async (code: string) => {
    soundManager.play("pop");
    setShowScanner(false);
    setJoinCode(code);
    setShowJoinInput(true);

    let normalized = code.trim();
    if (normalized.toLowerCase().startsWith("domus://")) {
      normalized = normalized.slice("domus://".length).trim();
    }
    const stripped = normalized.replace(/[\s\-\u00AD\u2010-\u2015\u2212\u200B-\u200D\u2060\uFEFF]+/g, "");
    if (!normalized.toUpperCase().startsWith("DOMUS") && stripped.length === 6) {
      appAlert("Código descontinuado", LEGACY_CODE_DISCONTINUED_MESSAGE);
      return;
    }

    setActionLoading(true);
    const ok = await joinGroup(code, { keepLegacy: Boolean(coexistingGroups.legacy) });
    setActionLoading(false);
    if (ok) { setJoinCode(""); setShowJoinInput(false); }
  }, [joinGroup, coexistingGroups.legacy]);

  const handleLeaveGroup = useCallback(async () => { haptic(); soundManager.play("tap"); await leaveGroup(); }, [leaveGroup]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!groupId) return;
    haptic();
    soundManager.play("pop");
    try {
      const ok = await Clipboard.setStringAsync(groupId);
      if (!ok) throw new Error("Falha ao copiar para a área de transferência.");
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      appAlert("Aviso", "Não foi possível copiar para a área de transferência.");
    }
  }, [groupId]);

  const handlePush = useCallback(async () => { haptic(); soundManager.play("pop"); await pushNow(); }, [pushNow]);
  const handlePull = useCallback(async () => { haptic(); soundManager.play("pop"); await pullNow(); }, [pullNow]);

  const handleMigrate = useCallback(async () => {
    haptic();
    soundManager.play("tap");
    const confirmed = await appConfirm({
      title: "Migrar para o sync seguro?",
      message:
        "Seu aparelho passará a usar criptografia de ponta a ponta com chave forte (AES-256-GCM). Aparelhos antigos continuarão funcionando durante a transição e você poderá parear novos aparelhos pelo novo QR Code.",
      confirmLabel: "Migrar agora",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const newCode = await migrateToStrongGroup();
      if (newCode) {
        soundManager.play("pop");
        setShowQRModal(true);
      } else {
        appAlert(
          "Aviso",
          errorMessage ||
            "Não foi possível migrar no momento. Verifique sua conexão com a internet e tente novamente.",
        );
      }
    } finally {
      setActionLoading(false);
    }
  }, [migrateToStrongGroup, errorMessage]);

  const isBusy = syncStatus === "syncing" || actionLoading;
  const qrValue = groupId ? (isStrongGroup ? groupId : `domus://${groupId}`) : "";

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="sync-back-button" onPress={() => { haptic(); soundManager.play("tap"); if (router.canGoBack()) { router.back(); } else { router.replace("/"); } }} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <TText variant="subtitle" color={theme.textColor} fontSize={18}>Sincronizar</TText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={[s.content, { paddingBottom: insets.bottom + webBottomInset + SCROLL_BOTTOM_PADDING }]} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} elevated padding={18} gap={16}>
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
              {groupId ? (
                <Text
                  style={[s.groupIdText, { color: theme.secondaryText }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  Grupo: {groupId}
                </Text>
              ) : null}
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
              <Text style={[s.statLabel, { color: theme.secondaryText }]}>último sync</Text>
            </View>
          </View>
        </TCard>

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
              <TText variant="subtitle" color={theme.textColor} fontSize={15}>Conectar dispositivos</TText>
              <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
                Crie um grupo ou entre em um existente para sincronizar automaticamente
              </Text>
            </View>

            <View collapsable={false} style={s.actionsRow}>
              <Pressable
                style={({ pressed }) => [s.actionCard, { backgroundColor: theme.primaryColor }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                onPress={() => { handleCreateGroup(); }}
                disabled={isBusy}
              >
                {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <View style={s.actionCardIcon}><Feather name="plus" size={24} color="#FFFFFF" /></View>
                    <Text style={s.actionCardTitle}>Criar grupo</Text>
                    <Text style={s.actionCardDesc}>Segredo forte</Text>
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
                <Text style={[s.actionCardDesc, { color: theme.secondaryText }]}>Com segredo</Text>
              </Pressable>
            </View>

            {Platform.OS !== "web" && (
              <TButton
                variant="outline"
                borderColor={theme.border}
                color={theme.textColor}
                icon={<MaterialCommunityIcons name="qrcode-scan" size={22} color={theme.primaryColor} />}
                iconAfter={<Feather name="chevron-right" size={18} color={theme.secondaryText} />}
                onPress={() => { haptic(); soundManager.play("tap"); setShowScanner(true); }}
                disabled={isBusy}
              >
                Escanear QR Code
              </TButton>
            )}

            {showJoinInput && (
              <View style={[s.joinCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[s.joinLabel, { color: theme.textColor }]}>Segredo do grupo</Text>
                <View style={s.joinInputRow}>
                  <TInput
                    flex={1}
                    value={joinCode}
                    onChangeText={(text: string) => setJoinCode(text.toUpperCase())}
                    placeholder="DOMUS1-XXXX-XXXX-..."
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={100}
                    autoFocus
                    fontFamily={Platform.OS === "ios" ? "Menlo" : "monospace"}
                    fontWeight="500"
                    fontSize={12}
                    letterSpacing={0.5}
                    textAlign={joinCode.length > 20 ? "left" : "center"}
                    height={48}
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Entrar no grupo"
                    style={[s.joinBtn, { backgroundColor: joinCode.trim().length >= 4 ? theme.primaryColor : theme.border }]}
                    onPress={handleJoinGroup}
                    disabled={joinCode.trim().length < 4 || isBusy}
                  >
                    {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="check" size={20} color="#FFFFFF" />}
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar entrada no grupo"
                  onPress={() => { soundManager.play("tap"); setShowJoinInput(false); setJoinCode(""); }}
                >
                  <Text style={[s.cancelText, { color: theme.secondaryText }]}>Cancelar</Text>
                </Pressable>
              </View>
            )}

            <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="info" size={16} color={theme.secondaryText} />
              <View style={{ flex: 1 }}>
                <Text style={[s.infoText, { color: theme.secondaryText, flex: 0 }]}>
                  Crie um grupo no celular A, depois entre com o segredo ou escaneie o QR Code no celular B. Os dados são sincronizados por relays públicos Nostr com criptografia ponta a ponta (AES-256-GCM), sem servidor do DOMUS.
                </Text>
                <PrivacyFlagNote flag="sync" color={theme.secondaryText} />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={[s.connectedCard, { backgroundColor: theme.cardBackground }]}>
              {isStrongGroup ? (
                <>
                  <View style={s.connectedHeaderRow}>
                    <View style={[s.strongBadge, { backgroundColor: `${theme.primaryColor}15` }]}>
                      <Feather name="shield" size={14} color={theme.primaryColor} />
                      <Text style={[s.strongBadgeText, { color: theme.primaryColor }]}>Grupo seguro</Text>
                    </View>
                    <View style={s.connectedActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Exibir QR Code"
                        onPress={() => { haptic(); soundManager.play("tap"); setShowQRModal(true); }}
                        hitSlop={10}
                      >
                        <MaterialCommunityIcons name="qrcode" size={22} color={theme.secondaryText} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Copiar segredo"
                        onPress={handleCopyCode}
                        hitSlop={10}
                      >
                        {copied ? (
                          <Feather name="check" size={18} color="#10B981" />
                        ) : (
                          <Feather name="copy" size={18} color={theme.secondaryText} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                  <View style={[s.strongSecretBox, { borderColor: theme.border }]}>
                    <Text selectable style={[s.strongSecretText, { color: theme.textColor }]}>
                      {groupId}
                    </Text>
                  </View>
                  <Text style={[s.connectedHint, { color: theme.secondaryText }]}>
                    {copied
                      ? "Segredo copiado para a área de transferência!"
                      : "Compartilhe o segredo ou mostre o QR Code para parear outro aparelho com segurança."}
                  </Text>
                </>
              ) : (
                <>
                  <View style={s.connectedRow}>
                    <View
                      style={[
                        s.codeBadge,
                        {
                          backgroundColor:
                            isLegacyCutoff ? `${theme.danger}15` : `${theme.primaryColor}12`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.codeText,
                          { color: isLegacyCutoff ? theme.danger : theme.primaryColor },
                        ]}
                      >
                        {groupId}
                      </Text>
                    </View>
                    <View style={s.connectedActions}>
                      {!isLegacyCutoff && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Exibir QR Code"
                          onPress={() => { haptic(); soundManager.play("tap"); setShowQRModal(true); }}
                          hitSlop={10}
                        >
                          <MaterialCommunityIcons name="qrcode" size={22} color={theme.secondaryText} />
                        </Pressable>
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Copiar código"
                        onPress={handleCopyCode}
                        hitSlop={10}
                      >
                        {copied ? (
                          <Feather name="check" size={18} color="#10B981" />
                        ) : (
                          <Feather name="copy" size={18} color={theme.secondaryText} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                  <Text style={[s.connectedHint, { color: theme.secondaryText }]}>
                    {copied
                      ? "Código copiado para a área de transferência!"
                      : "Compartilhe o código ou mostre o QR para parear outro celular"}
                  </Text>
                </>
              )}
            </View>

            {isLegacyCutoff && (
              <View
                testID="legacy-cutoff-banner"
                style={[
                  s.cutoffCard,
                  {
                    backgroundColor: `${theme.danger}12`,
                    borderColor: `${theme.danger}40`,
                  },
                ]}
              >
                <View style={s.cutoffHeaderRow}>
                  <View style={[s.cutoffIconCircle, { backgroundColor: `${theme.danger}20` }]}>
                    <Feather name="alert-triangle" size={20} color={theme.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cutoffTitle, { color: theme.danger }]}>
                      Sincronização legada encerrada
                    </Text>
                    <Text style={[s.cutoffDesc, { color: theme.textColor }]}>
                      {coexistingGroups.legacyCutoffReason === "version_deprecated"
                        ? LEGACY_VERSION_TOO_OLD_MESSAGE
                        : LEGACY_CUTOFF_MESSAGE}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {canMigrate && (
              <View
                testID="migration-card"
                style={[
                  s.migrationCard,
                  {
                    backgroundColor: `${theme.primaryColor}10`,
                    borderColor: `${theme.primaryColor}30`,
                  },
                ]}
              >
                <View style={s.migrationHeaderRow}>
                  <View style={[s.migrationIconCircle, { backgroundColor: `${theme.primaryColor}20` }]}>
                    <Feather name="shield" size={20} color={theme.primaryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.migrationTitle, { color: theme.textColor }]}>
                      Migrar para o sync seguro
                    </Text>
                    <Text style={[s.migrationDesc, { color: theme.secondaryText }]}>
                      {isLegacyCutoff
                        ? "Atualize para a criptografia autenticada de 256 bits (AES-GCM) para restabelecer a sincronização segura."
                        : "Atualize para a criptografia autenticada de 256 bits (AES-GCM). Aparelhos antigos continuam funcionando durante a transição."}
                    </Text>
                  </View>
                </View>
                <TButton
                  testID="migrate-to-strong-group-button"
                  accessibilityLabel="Migrar para o sync seguro"
                  variant="primary"
                  backgroundColor={theme.primaryColor}
                  icon={
                    actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="shield" size={16} color="#FFFFFF" />
                    )
                  }
                  onPress={handleMigrate}
                  disabled={isBusy}
                >
                  {actionLoading ? "Migrando..." : "Migrar para o sync seguro"}
                </TButton>
              </View>
            )}

            {!isLegacyCutoff && (
              <>
                <View style={s.sectionHeader}>
                  <TText variant="subtitle" color={theme.textColor} fontSize={15}>Sync automático</TText>
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
              </>
            )}

            <View style={{ marginTop: 4 }}>
              <TButton variant="outline" borderColor={theme.border} color={theme.textColor} icon={<Feather name="log-out" size={16} color={theme.danger} />} onPress={handleLeaveGroup}>
                Sair do grupo
              </TButton>
            </View>

            <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="info" size={16} color={theme.secondaryText} />
              <View style={{ flex: 1 }}>
                <Text style={[s.infoText, { color: theme.secondaryText, flex: 0 }]}>
                  {isStrongGroup
                    ? "Sync descentralizado via Nostr com criptografia ponta a ponta (AES-256-GCM). Os eventos são publicados em relays públicos e buscados automaticamente, sem servidor do DOMUS. Seus dados continuam no aparelho e funcionam offline."
                    : "Canal legado descontinuado. Os dados anteriores permanecem no aparelho. Migre para o Grupo seguro para ativar a criptografia ponta a ponta (AES-256-GCM)."}
                </Text>
                <PrivacyFlagNote flag="sync" color={theme.secondaryText} />
              </View>
            </View>
          </>
        )}

        {/* Backup link */}
        <View style={s.sectionHeader}>
          <TText variant="subtitle" color={theme.textColor} fontSize={15}>Backup local</TText>
          <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
            Exporta todos os dados criptografados para um arquivo que você guarda onde quiser
          </Text>
        </View>
        <View collapsable={false}>
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
        </View>
      </KeyboardAwareScrollViewCompat>

      <QRScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScanned={handleScanResult} theme={theme} />

      {/* QR display modal */}
      <Modal visible={showQRModal} animationType="fade" transparent onRequestClose={() => setShowQRModal(false)}>
        <Pressable style={s.qrModalOverlay} onPress={() => setShowQRModal(false)}>
          <ScrollView contentContainerStyle={s.qrModalScrollContent} showsVerticalScrollIndicator={false}>
            <Pressable style={[s.qrModalContent, { backgroundColor: theme.cardBackground }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[s.qrModalTitle, { color: theme.textColor }]}>
                {isStrongGroup ? "QR Code do Grupo Seguro" : "QR Code do Grupo"}
              </Text>
              <View style={s.qrCodeWrap}>
                <QRCode value={qrValue || "domus://"} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
              </View>
              {isStrongGroup ? (
                <Pressable
                  accessibilityRole="button"
                  style={[s.qrStrongBox, { backgroundColor: `${theme.primaryColor}0C`, borderColor: theme.border }]}
                  onPress={handleCopyCode}
                  accessibilityLabel="Copiar segredo do grupo"
                >
                  <Text selectable style={[s.qrStrongText, { color: theme.textColor }]}>
                    {groupId}
                  </Text>
                  <View style={s.qrCopyRow}>
                    <Feather
                      name={copied ? "check" : "copy"}
                      size={14}
                      color={copied ? "#10B981" : theme.primaryColor}
                    />
                    <Text style={[s.qrCopyLabel, { color: copied ? "#10B981" : theme.primaryColor }]}>
                      {copied ? "Copiado!" : "Copiar segredo"}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View style={[s.qrCodeLabel, { backgroundColor: `${theme.primaryColor}12` }]}>
                  <Text style={[s.qrCodeLabelText, { color: theme.primaryColor }]}>{groupId}</Text>
                </View>
              )}
              <Text style={[s.qrModalHint, { color: theme.secondaryText }]}>Escaneie com o outro celular para parear</Text>
              <TButton variant="primary" backgroundColor={theme.primaryColor} onPress={() => { soundManager.play("tap"); setShowQRModal(false); }}>
                Fechar
              </TButton>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
      <ScreenIntroModal
        visible={showIntro}
        intro={SCREEN_INTROS.sync}
        onDismiss={dismissIntro}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  content: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
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
  sectionDesc: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, borderRadius: 16, padding: 18, alignItems: "center", justifyContent: "center", gap: 8, minHeight: 120, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  actionCardIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  actionCardTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: "#FFFFFF" },
  actionCardDesc: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  joinCard: { borderRadius: 16, padding: 18, gap: 12 },
  joinLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  joinInputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  joinBtn: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cancelText: { fontFamily: "DMSans_500Medium", fontSize: 13, textAlign: "center" as const },
  connectedCard: { borderRadius: 16, padding: 18, gap: 10 },
  connectedHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  strongBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  strongBadgeText: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  strongSecretBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  strongSecretText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  connectedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  connectedActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  codeBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  codeText: { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: 4 },
  connectedHint: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, marginTop: 4 },
  infoText: { fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
  qrModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  qrModalScrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  qrModalContent: { borderRadius: 24, padding: 24, alignItems: "center", gap: 14, width: "100%", maxWidth: 340 },
  qrModalTitle: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  qrCodeWrap: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 16 },
  qrCodeLabel: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  qrCodeLabelText: { fontFamily: "DMSans_700Bold", fontSize: 20, letterSpacing: 4 },
  qrStrongBox: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  qrStrongText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center" as const,
  },
  qrCopyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qrCopyLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  qrModalHint: { fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center" as const },
  backupBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  backupBtnIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  backupBtnText: { flex: 1 },
  backupBtnTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  backupBtnDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  migrationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  migrationHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  migrationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  migrationTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  migrationDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  cutoffCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cutoffHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cutoffIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  cutoffTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  cutoffDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});

/** Tela com `presentation: "modal"`: tem o próprio host do alerta customizado (ver src/services/appAlert.ts). */
export default function SyncScreenRoute() {
  return (
    <>
      <SyncScreen />
      <AppAlertScreenHost />
    </>
  );
}
