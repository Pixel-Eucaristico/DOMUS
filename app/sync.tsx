import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
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

type ScreenMode = "main" | "show_qr" | "scan_qr";

function formatTime(ts: number | null): string {
  if (!ts) return "Nunca";
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${h}:${m}`;
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
    deviceId,
    syncStatus,
    lastSyncTime,
    errorMessage,
    eventCount,
    exportToFile,
    importFromFile,
    getQRData,
    importFromQR,
    resetStatus,
  } = useSync();

  const [mode, setMode] = useState<ScreenMode>("main");
  const [qrData, setQrData] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleExport = useCallback(async () => {
    haptic();
    await exportToFile();
  }, [exportToFile]);

  const handleImport = useCallback(async () => {
    haptic();
    await importFromFile();
  }, [importFromFile]);

  const handleShowQR = useCallback(() => {
    haptic();
    const data = getQRData(50);
    if (!data) {
      Alert.alert("Sem dados", "Nao ha eventos para sincronizar via QR.");
      return;
    }
    setQrData(data);
    setMode("show_qr");
  }, [getQRData]);

  const handleScanQR = useCallback(async () => {
    haptic();
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

      const count = await importFromQR(result.data);
      setImportResult(
        count > 0
          ? `${count} evento(s) importado(s)`
          : "Nenhum evento novo"
      );
      setMode("main");
    },
    [importFromQR],
  );

  const handleBack = () => {
    haptic();
    if (mode === "main") {
      router.back();
    } else {
      setMode("main");
      setQrData(null);
    }
  };

  if (mode === "show_qr" && qrData) {
    return (
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <View style={[s.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.topBarTitle, { color: theme.textColor }]}>QR de Sync</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={s.qrContainer}>
          <View style={[s.qrCard, { backgroundColor: theme.cardBackground }]}>
            <View style={s.qrBadge}>
              <Ionicons name="sync" size={16} color="#FFFFFF" />
              <Text style={s.qrBadgeText}>EVENTOS RECENTES</Text>
            </View>
            <View style={s.qrCodeWrapper}>
              <QRCode
                value={qrData}
                size={240}
                backgroundColor="transparent"
                color={theme.textColor}
              />
            </View>
            <Text style={[s.qrHint, { color: theme.secondaryText }]}>
              Escaneie este QR no outro celular para importar os eventos recentes
            </Text>
          </View>

          <Pressable
            style={[s.actionBtn, { backgroundColor: theme.primaryColor }]}
            onPress={handleBack}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <Text style={s.actionBtnText}>Voltar</Text>
          </Pressable>
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
          <Text style={[s.topBarTitle, { color: "#FFFFFF" }]}>Escanear QR</Text>
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
                Aponte para o QR code do outro celular
              </Text>
            </View>
          </CameraView>
        ) : (
          <View style={s.webFallback}>
            <MaterialCommunityIcons name="qrcode-scan" size={48} color="#9CA3AF" />
            <Text style={s.webFallbackTitle}>Camera indisponivel no web</Text>
            <Text style={s.webFallbackDesc}>
              Use a opcao "Importar arquivo" no celular para sincronizar
            </Text>
            <Pressable
              style={[s.actionBtn, { backgroundColor: "#1B5E63", marginTop: 20 }]}
              onPress={handleBack}
            >
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
              <Text style={s.actionBtnText}>Voltar</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const isLoading = syncStatus === "exporting" || syncStatus === "importing";

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
            <View style={[s.iconCircle, { backgroundColor: `${theme.primaryColor}15` }]}>
              <Feather name="smartphone" size={20} color={theme.primaryColor} />
            </View>
            <View style={s.statusInfo}>
              <Text style={[s.statusLabel, { color: theme.textColor }]}>
                Este dispositivo
              </Text>
              {deviceId && (
                <Text style={[s.deviceIdText, { color: theme.secondaryText }]}>
                  ID: {truncateId(deviceId)}
                </Text>
              )}
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: theme.textColor }]}>{eventCount}</Text>
              <Text style={[s.statLabel, { color: theme.secondaryText }]}>eventos</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: theme.textColor }]}>
                {lastSyncTime ? formatTime(lastSyncTime) : "--"}
              </Text>
              <Text style={[s.statLabel, { color: theme.secondaryText }]}>ultimo sync</Text>
            </View>
          </View>
        </View>

        {(errorMessage || importResult) && (
          <View
            style={[
              s.banner,
              {
                backgroundColor: errorMessage
                  ? `${theme.danger}12`
                  : `${theme.success}12`,
              },
            ]}
          >
            <Feather
              name={errorMessage ? "alert-circle" : "check-circle"}
              size={16}
              color={errorMessage ? theme.danger : theme.success}
            />
            <Text
              style={[
                s.bannerText,
                { color: errorMessage ? theme.danger : theme.success },
              ]}
            >
              {errorMessage || importResult}
            </Text>
            <Pressable
              onPress={() => {
                resetStatus();
                setImportResult(null);
              }}
              hitSlop={8}
            >
              <Feather name="x" size={14} color={theme.secondaryText} />
            </Pressable>
          </View>
        )}

        {isLoading && (
          <View style={[s.loadingBanner, { backgroundColor: theme.cardBackground }]}>
            <ActivityIndicator size="small" color={theme.primaryColor} />
            <Text style={[s.loadingText, { color: theme.secondaryText }]}>
              {syncStatus === "exporting" ? "Exportando dados..." : "Importando dados..."}
            </Text>
          </View>
        )}

        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>Via arquivo</Text>
          <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
            Compartilhe por WhatsApp, Bluetooth ou qualquer app
          </Text>
        </View>

        <View style={s.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              s.actionCard,
              { backgroundColor: theme.primaryColor },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleExport}
            disabled={isLoading}
          >
            <View style={s.actionCardIcon}>
              <Feather name="upload" size={24} color="#FFFFFF" />
            </View>
            <Text style={s.actionCardTitle}>Exportar</Text>
            <Text style={s.actionCardDesc}>Enviar dados</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.actionCard,
              { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleImport}
            disabled={isLoading}
          >
            <View style={[s.actionCardIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
              <Feather name="download" size={24} color={theme.primaryColor} />
            </View>
            <Text style={[s.actionCardTitle, { color: theme.textColor }]}>Importar</Text>
            <Text style={[s.actionCardDesc, { color: theme.secondaryText }]}>Receber dados</Text>
          </Pressable>
        </View>

        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>Via QR Code</Text>
          <Text style={[s.sectionDesc, { color: theme.secondaryText }]}>
            Rapido para poucos eventos recentes
          </Text>
        </View>

        <View style={s.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              s.actionCard,
              { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleShowQR}
            disabled={isLoading}
          >
            <View style={[s.actionCardIcon, { backgroundColor: `${theme.accentColor}15` }]}>
              <MaterialCommunityIcons name="qrcode" size={24} color={theme.accentColor} />
            </View>
            <Text style={[s.actionCardTitle, { color: theme.textColor }]}>Mostrar QR</Text>
            <Text style={[s.actionCardDesc, { color: theme.secondaryText }]}>Gerar codigo</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.actionCard,
              { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleScanQR}
            disabled={isLoading}
          >
            <View style={[s.actionCardIcon, { backgroundColor: `${theme.accentColor}15` }]}>
              <Feather name="camera" size={24} color={theme.accentColor} />
            </View>
            <Text style={[s.actionCardTitle, { color: theme.textColor }]}>Escanear QR</Text>
            <Text style={[s.actionCardDesc, { color: theme.secondaryText }]}>Ler codigo</Text>
          </Pressable>
        </View>

        <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
          <Feather name="info" size={16} color={theme.secondaryText} />
          <Text style={[s.infoText, { color: theme.secondaryText }]}>
            A sincronizacao funciona por troca de eventos. Exporte no celular A, importe no celular B, e vice-versa. Eventos duplicados sao ignorados automaticamente.
          </Text>
        </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  statusInfo: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
  },
  deviceIdText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
  },
  statLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  bannerText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  loadingText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  sectionHeader: {
    gap: 2,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  sectionDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 8,
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
  qrContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
  },
  qrCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  qrBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1B5E63",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qrBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  qrCodeWrapper: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  qrHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: "100%",
  },
  actionBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 20,
  },
  scanHint: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 20,
    textAlign: "center" as const,
    paddingHorizontal: 40,
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  webFallbackTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  webFallbackDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center" as const,
  },
});
