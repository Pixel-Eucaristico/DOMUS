import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSync } from "@/src/context/SyncProvider";
import { useAppState } from "@/src/context/AppStateProvider";
import type { BarcodeScanningResult } from "expo-camera";

type ScreenMode = "main" | "show_qr" | "scan_qr" | "show_answer";

const STATUS_LABELS: Record<string, string> = {
  idle: "Desconectado",
  creating_offer: "Criando convite...",
  waiting_answer: "Aguardando resposta...",
  processing_answer: "Processando...",
  connecting: "Conectando...",
  syncing: "Sincronizando...",
  connected: "Conectado",
  error: "Erro",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "#9CA3AF",
  creating_offer: "#F59E0B",
  waiting_answer: "#F59E0B",
  processing_answer: "#F59E0B",
  connecting: "#3B82F6",
  syncing: "#3B82F6",
  connected: "#10B981",
  error: "#EF4444",
};

function formatTime(ts: number | null): string {
  if (!ts) return "Nunca";
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 6) + "..." + id.slice(-4);
}

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppState();
  const {
    identity,
    peers,
    syncStatus,
    lastSyncTime,
    errorMessage,
    webrtcAvailable,
    offerQRData,
    answerQRData,
    createOffer,
    processScannedOffer,
    processScannedAnswer,
    syncManual,
    resetSync,
  } = useSync();

  const [mode, setMode] = useState<ScreenMode>("main");
  const [manualInput, setManualInput] = useState("");
  const [scanTarget, setScanTarget] = useState<"offer" | "answer">("offer");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const connectedPeers = peers.filter((p) => p.connected);

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCreateOffer = useCallback(async () => {
    haptic();
    await createOffer();
    setMode("show_qr");
  }, [createOffer]);

  const handleScanOffer = useCallback(async () => {
    haptic();
    setScanTarget("offer");
    scannedRef.current = false;

    if (Platform.OS !== "web") {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert("Permissao necessaria", "Permita o acesso a camera para escanear QR codes.");
          return;
        }
      }
    }
    setMode("scan_qr");
  }, [cameraPermission, requestCameraPermission]);

  const handleScanAnswer = useCallback(async () => {
    haptic();
    setScanTarget("answer");
    scannedRef.current = false;

    if (Platform.OS !== "web") {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert("Permissao necessaria", "Permita o acesso a camera para escanear QR codes.");
          return;
        }
      }
    }
    setMode("scan_qr");
  }, [cameraPermission, requestCameraPermission]);

  const handleBarcodeScan = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      haptic();

      const data = result.data;
      if (scanTarget === "offer") {
        await processScannedOffer(data);
        setMode("show_answer");
      } else {
        await processScannedAnswer(data);
        setMode("main");
      }
    },
    [scanTarget, processScannedOffer, processScannedAnswer],
  );

  const handleManualSubmit = useCallback(async () => {
    if (!manualInput.trim()) return;
    haptic();

    if (scanTarget === "offer") {
      await processScannedOffer(manualInput.trim());
      setMode("show_answer");
    } else {
      await processScannedAnswer(manualInput.trim());
      setMode("main");
    }
    setManualInput("");
  }, [manualInput, scanTarget, processScannedOffer, processScannedAnswer]);

  const handleBack = () => {
    haptic();
    if (mode === "main") {
      router.back();
    } else {
      resetSync();
      setMode("main");
    }
  };

  if (!webrtcAvailable) {
    return (
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.topBarTitle, { color: theme.textColor }]}>Sincronizar</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.unavailableContainer}>
          <MaterialCommunityIcons name="access-point-off" size={64} color={theme.secondaryText} />
          <Text style={[s.unavailableTitle, { color: theme.textColor }]}>
            WebRTC indisponivel
          </Text>
          <Text style={[s.unavailableDesc, { color: theme.secondaryText }]}>
            A sincronizacao P2P requer WebRTC, disponivel no navegador web. Abra o app pelo navegador para usar esta funcionalidade.
          </Text>
        </View>
      </View>
    );
  }

  if (mode === "show_qr" && offerQRData) {
    return (
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.topBarTitle, { color: theme.textColor }]}>Convite</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={s.qrContainer}>
          <View style={[s.qrCard, { backgroundColor: theme.cardBackground }]}>
            <View style={s.qrBadge}>
              <Feather name="wifi" size={16} color="#FFFFFF" />
              <Text style={s.qrBadgeText}>OFERTA</Text>
            </View>
            <View style={s.qrCodeWrapper}>
              <QRCode
                value={offerQRData}
                size={220}
                backgroundColor="transparent"
                color={theme.textColor}
              />
            </View>
            <Text style={[s.qrHint, { color: theme.secondaryText }]}>
              Escaneie este QR no outro dispositivo para parear
            </Text>
          </View>

          <Pressable
            style={[s.actionBtn, { backgroundColor: theme.primaryColor }]}
            onPress={handleScanAnswer}
          >
            <Feather name="camera" size={20} color="#FFFFFF" />
            <Text style={s.actionBtnText}>Escanear resposta</Text>
          </Pressable>

          <View style={s.manualSection}>
            <Text style={[s.manualLabel, { color: theme.secondaryText }]}>
              Ou cole a resposta manualmente:
            </Text>
            <TextInput
              style={[s.manualInput, { borderColor: theme.border, color: theme.textColor, backgroundColor: theme.cardBackground }]}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Cole os dados da resposta aqui..."
              placeholderTextColor={theme.secondaryText}
              multiline
            />
            {manualInput.trim().length > 0 && (
              <Pressable
                style={[s.submitBtn, { backgroundColor: theme.accentColor }]}
                onPress={() => {
                  setScanTarget("answer");
                  handleManualSubmit();
                }}
              >
                <Feather name="check" size={18} color="#FFFFFF" />
                <Text style={s.submitBtnText}>Processar resposta</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (mode === "show_answer" && answerQRData) {
    return (
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.topBarTitle, { color: theme.textColor }]}>Resposta</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={s.qrContainer}>
          <View style={[s.qrCard, { backgroundColor: theme.cardBackground }]}>
            <View style={[s.qrBadge, { backgroundColor: "#10B981" }]}>
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={s.qrBadgeText}>RESPOSTA</Text>
            </View>
            <View style={s.qrCodeWrapper}>
              <QRCode
                value={answerQRData}
                size={220}
                backgroundColor="transparent"
                color={theme.textColor}
              />
            </View>
            <Text style={[s.qrHint, { color: theme.secondaryText }]}>
              Mostre este QR para o dispositivo que criou o convite
            </Text>
          </View>

          {syncStatus === "connecting" && (
            <View style={s.connectingRow}>
              <ActivityIndicator size="small" color={theme.primaryColor} />
              <Text style={[s.connectingText, { color: theme.secondaryText }]}>
                Estabelecendo conexao...
              </Text>
            </View>
          )}

          {syncStatus === "connected" && (
            <Pressable
              style={[s.actionBtn, { backgroundColor: theme.primaryColor }]}
              onPress={() => setMode("main")}
            >
              <Feather name="check" size={20} color="#FFFFFF" />
              <Text style={s.actionBtnText}>Conectado! Ver peers</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  if (mode === "scan_qr") {
    return (
      <View style={[s.root, { backgroundColor: "#000" }]}>
        <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12, backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[s.topBarTitle, { color: "#FFFFFF" }]}>
            {scanTarget === "offer" ? "Escanear convite" : "Escanear resposta"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {Platform.OS !== "web" ? (
          <CameraView
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScan}
          >
            <View style={s.scanOverlay}>
              <View style={s.scanFrame} />
              <Text style={s.scanHint}>
                Aponte para o QR code do outro dispositivo
              </Text>
            </View>
          </CameraView>
        ) : (
          <View style={s.webScanFallback}>
            <MaterialCommunityIcons name="qrcode-scan" size={48} color="#9CA3AF" />
            <Text style={s.webScanTitle}>Camera indisponivel no web</Text>
            <Text style={s.webScanDesc}>Cole os dados do QR code abaixo:</Text>
            <TextInput
              style={s.webScanInput}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Cole os dados aqui..."
              placeholderTextColor="#6B7280"
              multiline
            />
            {manualInput.trim().length > 0 && (
              <Pressable
                style={[s.actionBtn, { backgroundColor: "#1B5E63" }]}
                onPress={handleManualSubmit}
              >
                <Feather name="check" size={20} color="#FFFFFF" />
                <Text style={s.actionBtnText}>Processar</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.topBarTitle, { color: theme.textColor }]}>Sincronizar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.statusCard, { backgroundColor: theme.cardBackground }]}>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[syncStatus] || "#9CA3AF" }]} />
            <Text style={[s.statusLabel, { color: theme.textColor }]}>
              {STATUS_LABELS[syncStatus] || syncStatus}
            </Text>
          </View>
          {identity && (
            <View style={s.deviceRow}>
              <Feather name="smartphone" size={14} color={theme.secondaryText} />
              <Text style={[s.deviceId, { color: theme.secondaryText }]}>
                {truncateId(identity.deviceId)}
              </Text>
            </View>
          )}
          {lastSyncTime && (
            <View style={s.deviceRow}>
              <Feather name="clock" size={14} color={theme.secondaryText} />
              <Text style={[s.deviceId, { color: theme.secondaryText }]}>
                Ultimo sync: {formatTime(lastSyncTime)}
              </Text>
            </View>
          )}
          {errorMessage && (
            <View style={[s.errorBanner, { backgroundColor: `${theme.danger}15` }]}>
              <Feather name="alert-circle" size={14} color={theme.danger} />
              <Text style={[s.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          )}
        </View>

        <View style={s.actionsSection}>
          <Pressable
            style={({ pressed }) => [
              s.pairBtn,
              { backgroundColor: theme.primaryColor },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleCreateOffer}
          >
            <View style={s.pairBtnIcon}>
              <MaterialCommunityIcons name="qrcode" size={28} color="#FFFFFF" />
            </View>
            <View style={s.pairBtnContent}>
              <Text style={s.pairBtnTitle}>Gerar convite</Text>
              <Text style={s.pairBtnDesc}>Crie um QR para outro dispositivo escanear</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.pairBtn,
              { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleScanOffer}
          >
            <View style={[s.pairBtnIcon, { backgroundColor: `${theme.primaryColor}20` }]}>
              <Feather name="camera" size={24} color={theme.primaryColor} />
            </View>
            <View style={s.pairBtnContent}>
              <Text style={[s.pairBtnTitle, { color: theme.textColor }]}>Escanear convite</Text>
              <Text style={[s.pairBtnDesc, { color: theme.secondaryText }]}>
                Leia o QR de outro dispositivo
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.secondaryText} />
          </Pressable>
        </View>

        <View style={[s.peersSection, { backgroundColor: theme.cardBackground }]}>
          <View style={s.peersHeader}>
            <Text style={[s.peersTitle, { color: theme.textColor }]}>
              Peers conectados
            </Text>
            <View style={[s.peersBadge, { backgroundColor: connectedPeers.length > 0 ? `${theme.success}20` : `${theme.secondaryText}15` }]}>
              <Text style={[s.peersBadgeText, { color: connectedPeers.length > 0 ? theme.success : theme.secondaryText }]}>
                {connectedPeers.length}
              </Text>
            </View>
          </View>

          {peers.length === 0 ? (
            <View style={s.emptyPeers}>
              <MaterialCommunityIcons name="access-point-network" size={36} color={theme.secondaryText} />
              <Text style={[s.emptyPeersText, { color: theme.secondaryText }]}>
                Nenhum peer pareado ainda
              </Text>
            </View>
          ) : (
            <View style={s.peerList}>
              {peers.map((peer) => (
                <View
                  key={peer.deviceId}
                  style={[s.peerRow, { borderBottomColor: theme.border }]}
                >
                  <View style={[s.peerIcon, { backgroundColor: peer.connected ? `${theme.success}15` : `${theme.secondaryText}10` }]}>
                    <Feather
                      name={peer.connected ? "wifi" : "wifi-off"}
                      size={16}
                      color={peer.connected ? theme.success : theme.secondaryText}
                    />
                  </View>
                  <View style={s.peerInfo}>
                    <Text style={[s.peerId, { color: theme.textColor }]}>
                      {truncateId(peer.deviceId)}
                    </Text>
                    <Text style={[s.peerStatus, { color: peer.connected ? theme.success : theme.secondaryText }]}>
                      {peer.connected ? "Online" : "Offline"}
                    </Text>
                  </View>
                  {peer.lastSeen > 0 && (
                    <Text style={[s.peerTime, { color: theme.secondaryText }]}>
                      {formatTime(peer.lastSeen)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {connectedPeers.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              s.syncBtn,
              { backgroundColor: theme.accentColor },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => {
              haptic();
              syncManual();
            }}
          >
            <Ionicons name="sync" size={22} color="#FFFFFF" />
            <Text style={s.syncBtnText}>Sincronizar agora</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
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
    gap: 16,
    paddingTop: 8,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  unavailableTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    textAlign: "center" as const,
  },
  unavailableDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  statusCard: {
    borderRadius: 16,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 20,
  },
  deviceId: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  errorText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
  },
  actionsSection: {
    gap: 10,
  },
  pairBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pairBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  pairBtnContent: {
    flex: 1,
    gap: 2,
  },
  pairBtnTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  pairBtnDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },
  peersSection: {
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  peersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  peersTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
  },
  peersBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  peersBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  emptyPeers: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptyPeersText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center" as const,
  },
  peerList: {
    gap: 0,
  },
  peerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  peerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  peerInfo: {
    flex: 1,
    gap: 2,
  },
  peerId: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  peerStatus: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  peerTime: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  syncBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  qrContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  qrCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: "100%",
  },
  qrBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qrBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  qrCodeWrapper: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  qrHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center" as const,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
  },
  actionBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  manualSection: {
    width: "100%",
    gap: 10,
    paddingBottom: 40,
  },
  manualLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  submitBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  connectingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  connectingText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  scanHint: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 24,
    textAlign: "center" as const,
  },
  webScanFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  webScanTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  webScanDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#9CA3AF",
  },
  webScanInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#FFFFFF",
    backgroundColor: "#1F2937",
    minHeight: 100,
    textAlignVertical: "top",
  },
});
