import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { soundManager } from "@/src/services/SoundManager";

type ScanMode = "qr" | "barcode";

interface Props {
  theme: ThemeColors;
  insets: EdgeInsets;
  permissionGranted: boolean;
  manualChave: string;
  onManualChaveChange: (v: string) => void;
  onBarcodeScanned: (event: { data: string }) => void;
  onRequestPermission: () => void;
  onQRFromGallery: () => void;
  onManualChaveSubmit: () => void;
  onClose: () => void;
}

export function QrScanScreen({
  theme,
  insets,
  permissionGranted,
  manualChave,
  onManualChaveChange,
  onBarcodeScanned,
  onRequestPermission,
  onQRFromGallery,
  onManualChaveSubmit,
  onClose,
}: Props) {
  const [scanMode, setScanMode] = useState<ScanMode>("qr");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const isFocused = useIsFocused();
  const digitCount = manualChave.replace(/\D/g, "").length;

  return (
    <View style={s.container}>
      {permissionGranted && isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={onBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: scanMode === "qr" ? ["qr"] : ["code128", "code39", "pdf417"],
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.noCamera]}>
          <Feather name="camera-off" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={s.noPermText}>Câmera sem permissão</Text>
          <Pressable style={s.permBtn} onPress={onRequestPermission}>
            <Text style={s.permBtnText}>Permitir Câmera</Text>
          </Pressable>
        </View>
      )}

      {/* Dark overlay with focus square */}
      {permissionGranted && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={s.fade} />
          <View style={s.middle}>
            <View style={s.fade} />
            <View style={[s.focused, { borderColor: theme.primaryColor }]} />
            <View style={s.fade} />
          </View>
          <View style={s.fade} />
        </View>
      )}

      {/* TOP BAR: close + mode tabs */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => { soundManager.play("tap"); onClose(); }} hitSlop={12} style={s.closeBtn}>
          <Feather name="x" size={22} color="#FFF" />
        </Pressable>
        <View style={s.tabs}>
          <Pressable
            style={[s.tab, scanMode === "qr" && s.tabActive]}
            onPress={() => { soundManager.play("tabSwitch"); setScanMode("qr"); setShowKeyInput(false); }}
          >
            <Text style={[s.tabText, scanMode === "qr" && s.tabTextActive]}>QR Code</Text>
          </Pressable>
          <Pressable
            style={[s.tab, scanMode === "barcode" && s.tabActive]}
            onPress={() => { soundManager.play("tabSwitch"); setScanMode("barcode"); setShowKeyInput(false); }}
          >
            <Text style={[s.tabText, scanMode === "barcode" && s.tabTextActive]}>Cód. Barras</Text>
          </Pressable>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Hint below focus area */}
      <View style={s.hintWrap} pointerEvents="none">
        <Text style={s.hintText}>
          {scanMode === "qr"
            ? "Aponte para o QR Code da NF-e"
            : "Aponte para o código de barras da nota"}
        </Text>
      </View>

      {/* BOTTOM BAR: gallery + type key, or key input */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {showKeyInput ? (
          <View style={s.keyInputArea}>
            <TextInput
              style={s.keyInput}
              value={manualChave}
              onChangeText={onManualChaveChange}
              placeholder="44 dígitos da chave de acesso"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              maxLength={44}
              autoFocus
            />
            <Text style={s.keyCounter}>{digitCount}/44 dígitos</Text>
            <View style={s.keyActions}>
              <Pressable
                style={[s.keyActionBtn, s.keyActionBtnOutline]}
                onPress={() => { soundManager.play("tap"); setShowKeyInput(false); }}
              >
                <Text style={s.keyActionBtnOutlineText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[s.keyActionBtn, s.keyActionBtnFill]}
                onPress={() => { soundManager.play("tap"); onManualChaveSubmit(); }}
              >
                <Feather name="search" size={16} color="#FFF" />
                <Text style={s.keyActionBtnFillText}>Consultar SEFAZ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={s.bottomActions}>
            <Pressable style={s.bottomBtn} onPress={() => { soundManager.play("tap"); onQRFromGallery(); }}>
              <View style={s.bottomBtnIcon}>
                <Feather name="image" size={24} color="#FFF" />
              </View>
              <Text style={s.bottomBtnLabel}>Galeria</Text>
            </Pressable>
            <Pressable style={s.bottomBtn} onPress={() => { soundManager.play("tap"); setShowKeyInput(true); }}>
              <View style={s.bottomBtnIcon}>
                <Feather name="hash" size={24} color="#FFF" />
              </View>
              <Text style={s.bottomBtnLabel}>Digitar Chave</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  noCamera: { alignItems: "center", justifyContent: "center", gap: 16 },
  noPermText: { color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 8 },
  permBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  permBtnText: { color: "#FFF", fontWeight: "600" },
  fade: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  middle: { flexDirection: "row", height: 260 },
  focused: { flex: 6, borderWidth: 2, borderRadius: 16 },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
  },
  closeBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20,
  },
  tabs: {
    flex: 1, flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12, padding: 3, gap: 3,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9 },
  tabActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  tabText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#FFF" },
  hintWrap: {
    position: "absolute", left: 0, right: 0,
    top: "50%", marginTop: 60,
    alignItems: "center",
  },
  hintText: {
    color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "500",
    textAlign: "center", paddingHorizontal: 32,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  bottomActions: { flexDirection: "row", justifyContent: "center", gap: 56 },
  bottomBtn: { alignItems: "center", gap: 8 },
  bottomBtnIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  bottomBtnLabel: { color: "#FFF", fontSize: 13, fontWeight: "500" },
  keyInputArea: { gap: 10 },
  keyInput: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    padding: 12, color: "#FFF", fontSize: 14, fontFamily: "monospace", letterSpacing: 1,
  },
  keyCounter: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "right", marginTop: -4 },
  keyActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  keyActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  keyActionBtnOutline: { borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  keyActionBtnOutlineText: { color: "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 14 },
  keyActionBtnFill: { backgroundColor: "rgba(255,255,255,0.2)" },
  keyActionBtnFillText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
