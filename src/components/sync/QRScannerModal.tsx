import React, { useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  theme: any;
}

export function QRScannerModal({ visible, onClose, onScanned, theme }: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const scannedRef = useRef(false);

  const handleBarCodeScanned = useCallback(
    (result: any) => {
      if (scannedRef.current) return;
      const data = result?.data;
      if (!data) return;

      const code = data.startsWith("domus://") ? data.replace("domus://", "") : data;
      const cleaned = code.trim().toUpperCase();
      if (cleaned.length >= 4 && cleaned.length <= 8) {
        scannedRef.current = true;
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onScanned(cleaned);
      }
    },
    [onScanned],
  );

  const handleClose = useCallback(() => {
    scannedRef.current = false;
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[s.scannerRoot, { backgroundColor: "#000" }]}>
        <View style={[s.scannerHeader, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={s.scannerTitle}>Escanear QR Code</Text>
          <View style={{ width: 28 }} />
        </View>

        {!permission ? (
          <View style={s.scannerCenter}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : !permission.granted ? (
          <View style={s.scannerCenter}>
            <Feather name="camera-off" size={48} color="#9CA3AF" />
            <Text style={s.scannerPermText}>Permita o acesso a camera para escanear o QR Code do grupo</Text>
            {permission.canAskAgain ? (
              <Pressable style={[s.scannerPermBtn, { backgroundColor: theme.primaryColor }]} onPress={requestPermission}>
                <Text style={s.scannerPermBtnText}>Permitir Camera</Text>
              </Pressable>
            ) : (
              <Text style={[s.scannerPermText, { fontSize: 12, marginTop: 8 }]}>
                Va em Configuracoes do dispositivo para permitir a camera
              </Text>
            )}
          </View>
        ) : (
          <View style={s.scannerCameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <View style={s.scannerOverlay}>
              <View style={s.scannerFrameOuter}>
                <View style={s.scannerFrame}>
                  <View style={[s.scannerCorner, s.cornerTL]} />
                  <View style={[s.scannerCorner, s.cornerTR]} />
                  <View style={[s.scannerCorner, s.cornerBL]} />
                  <View style={[s.scannerCorner, s.cornerBR]} />
                </View>
              </View>
              <Text style={s.scannerHint}>Aponte para o QR Code exibido no outro dispositivo</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scannerRoot: { flex: 1 },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  scannerTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 18, color: "#FFFFFF" },
  scannerCenter: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 20 },
  scannerPermText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "#9CA3AF", textAlign: "center" as const, lineHeight: 22 },
  scannerPermBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  scannerPermBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#FFFFFF" },
  scannerCameraWrap: { flex: 1, position: "relative" as const },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", gap: 32 },
  scannerFrameOuter: { width: 260, height: 260, justifyContent: "center", alignItems: "center" },
  scannerFrame: { width: 220, height: 220, position: "relative" as const },
  scannerCorner: { position: "absolute" as const, width: 30, height: 30, borderColor: "#FFFFFF" },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scannerHint: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center" as const, paddingHorizontal: 40 },
});
