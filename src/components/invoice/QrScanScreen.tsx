import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { KeyboardController, KeyboardStickyView } from "react-native-keyboard-controller";
import { useIsFocused } from "@react-navigation/native";
import { soundManager } from "@/src/services/SoundManager";
import { TButton } from "@/src/components/tamagui";
import { useKeyboardTargetHeight } from "@/src/components/shared/useKeyboardTargetHeight";
import {
  computeQrKeyBarLayout,
  keyBarFullHeight,
  nextKeyContentHeight,
  normalizeChaveInput,
  KEY_BAR_COMPACT_PADDING_TOP,
  KEY_BAR_PADDING_BOTTOM,
  KEY_BAR_PADDING_TOP,
} from "./qrKeyBarLayout";

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

  // Barra da chave sobre o teclado (Story 13.6): medidas de layout locais.
  // Altura-alvo do teclado desde o começo da animação (R2/R4) e a área real da
  // tela pelo onLayout do contêiner (R5).
  const keyboardHeight = useKeyboardTargetHeight();
  const [containerHeight, setContainerHeight] = useState(0);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [keyContentHeight, setKeyContentHeight] = useState(0);
  const keyBarLayout = computeQrKeyBarLayout({
    containerHeight,
    keyboardHeight,
    insetBottom: insets.bottom,
    topBarHeight,
    fullBarHeight: showKeyInput ? keyBarFullHeight(keyContentHeight, insets.bottom) : 0,
  });
  const compact = showKeyInput && keyBarLayout.compact;
  // Nem a compacta cabe (fonte grande em paisagem): campo e botões numa linha (R3).
  const oneRow = compact && !keyBarLayout.fits;

  // D-3 b: a leitura pausa com a barra da chave aberta. O handler passado à
  // câmera é sempre o mesmo (R1): no expo-camera 17, `onBarcodeScanned`
  // ausente desliga `barcodeScannerEnabled` e o Android recria a câmera.
  const showKeyInputRef = useRef(false);
  const onBarcodeScannedRef = useRef(onBarcodeScanned);
  useEffect(() => {
    onBarcodeScannedRef.current = onBarcodeScanned;
  }, [onBarcodeScanned]);
  const handleBarcodeScanned = useCallback((event: { data: string }) => {
    if (showKeyInputRef.current) return;
    onBarcodeScannedRef.current(event);
  }, []);

  const openKeyInput = () => {
    showKeyInputRef.current = true;
    setShowKeyInput(true);
  };
  const closeKeyInput = () => {
    showKeyInputRef.current = false;
    KeyboardController.dismiss();
    setShowKeyInput(false);
  };
  const submitChave = () => {
    soundManager.play("tap");
    onManualChaveSubmit();
  };

  return (
    <View style={s.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {permissionGranted && isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: scanMode === "qr" ? ["qr"] : ["code128", "code39", "pdf417"],
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.noCamera]}>
          <Feather name="camera-off" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={s.noPermText}>Câmera sem permissão</Text>
          <TButton variant="outline" borderColor={theme.border} color={theme.textColor} onPress={onRequestPermission}>
            Permitir Câmera
          </TButton>
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

      {/* TOP BAR: close + mode tabs (somem no modo compacto da barra da chave) */}
      {!compact && (
        <View
          style={[s.topBar, { paddingTop: insets.top + 8 }]}
          onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}
        >
          <Pressable onPress={() => { soundManager.play("tap"); onClose(); }} hitSlop={12} style={s.closeBtn}>
            <Feather name="x" size={22} color="#FFF" />
          </Pressable>
          <View style={s.tabs}>
            <Pressable
              style={[s.tab, scanMode === "qr" && s.tabActive]}
              onPress={() => { soundManager.play("tabSwitch"); setScanMode("qr"); closeKeyInput(); }}
            >
              <Text style={[s.tabText, scanMode === "qr" && s.tabTextActive]}>QR Code</Text>
            </Pressable>
            <Pressable
              style={[s.tab, scanMode === "barcode" && s.tabActive]}
              onPress={() => { soundManager.play("tabSwitch"); setScanMode("barcode"); closeKeyInput(); }}
            >
              <Text style={[s.tabText, scanMode === "barcode" && s.tabTextActive]}>Cód. Barras</Text>
            </Pressable>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Hint below focus area */}
      {!compact && (
        <View style={s.hintWrap} pointerEvents="none">
          <Text style={s.hintText}>
            {scanMode === "qr"
              ? "Aponte para o QR Code da NF-e"
              : "Aponte para o código de barras da nota"}
          </Text>
        </View>
      )}

      {/* BOTTOM BAR: gallery + type key, or key input.
          KeyboardStickyView sobe a barra junto com o teclado (edge-to-edge não
          redimensiona a janela). O `opened` vem de qrKeyBarLayout.ts: desconta
          o insets.bottom do paddingBottom, nunca mais que o teclado (R3), e a
          barra nunca é desligada (o campo mora nela). */}
      <KeyboardStickyView
        style={[
          s.bottomBar,
          {
            paddingTop: compact ? KEY_BAR_COMPACT_PADDING_TOP : KEY_BAR_PADDING_TOP,
            paddingBottom: insets.bottom + KEY_BAR_PADDING_BOTTOM,
          },
        ]}
        offset={{ closed: 0, opened: keyBarLayout.openedOffset }}
      >
        {showKeyInput ? (
          <View
            style={[s.keyInputArea, oneRow && s.keyInputRow]}
            onLayout={(e) => {
              const measured = e.nativeEvent.layout.height;
              setKeyContentHeight((prev) => nextKeyContentHeight(prev, measured, oneRow));
            }}
          >
            {/* Mesma árvore nos dois layouts: o campo não remonta (nem perde o foco). */}
            <TextInput
              style={[s.keyInput, oneRow && s.keyInputFlex]}
              value={manualChave}
              onChangeText={(text) => onManualChaveChange(normalizeChaveInput(text, manualChave))}
              placeholder="44 dígitos da chave de acesso"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              returnKeyType="search"
              submitBehavior="submit"
              onSubmitEditing={submitChave}
              autoFocus
            />
            {!oneRow && <Text style={s.keyCounter}>{digitCount}/44 dígitos</Text>}
            <View style={[s.keyActions, oneRow && s.keyActionsRow]}>
              <TButton
                variant="outline"
                flex={oneRow ? undefined : 1}
                borderColor={theme.border}
                color={theme.textColor}
                onPress={() => { soundManager.play("tap"); closeKeyInput(); }}
              >
                Cancelar
              </TButton>
              <TButton
                variant="primary"
                flex={oneRow ? undefined : 1}
                backgroundColor={theme.primaryColor}
                onPress={submitChave}
                icon={<Feather name="search" size={16} color="#FFF" />}
              >
                Consultar SEFAZ
              </TButton>
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
            <Pressable style={s.bottomBtn} onPress={() => { soundManager.play("tap"); openKeyInput(); }}>
              <View style={s.bottomBtnIcon}>
                <Feather name="hash" size={24} color="#FFF" />
              </View>
              <Text style={s.bottomBtnLabel}>Digitar Chave</Text>
            </Pressable>
          </View>
        )}
      </KeyboardStickyView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  noCamera: { alignItems: "center", justifyContent: "center", gap: 16 },
  noPermText: { color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 8 },
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
    paddingHorizontal: 24,
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
  keyInputRow: { flexDirection: "row", alignItems: "center" },
  keyInputFlex: { flex: 1 },
  keyActionsRow: { marginTop: 0, flexShrink: 0 },
});
