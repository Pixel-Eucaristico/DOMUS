import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  theme: ThemeColors;
  insets: EdgeInsets;
  permissionGranted: boolean;
  onRequestPermission: () => void;
  onProcessPhotos: (uris: string[]) => void;
  onClose: () => void;
}

export function OcrScanScreen({
  theme,
  insets,
  permissionGranted,
  onRequestPermission,
  onProcessPhotos,
  onClose,
}: Props) {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedUris, setCapturedUris] = useState<string[]>([]);

  const handleShutter = async () => {
    soundManager.play("share");
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setCapturedUris((prev) => [...prev, photo.uri]);
      }
    } catch {
      // silently ignore — camera may not be ready
    } finally {
      setCapturing(false);
    }
  };

  const handleGallery = async () => {
    soundManager.play("tap");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: true,
    });
    if (result.canceled || !result.assets.length) return;
    const uris = result.assets.map((a) => a.uri);
    setCapturedUris((prev) => [...prev, ...uris]);
  };

  const handleProcess = () => {
    soundManager.play("success");
    const uris = capturedUris;
    setCapturedUris([]);
    onProcessPhotos(uris);
  };

  const photoCount = capturedUris.length;

  return (
    <View style={s.container}>
      {permissionGranted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.noCamera]}>
          <Feather name="camera-off" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={s.noPermText}>Câmera sem permissão</Text>
          <Pressable style={s.permBtn} onPress={onRequestPermission}>
            <Text style={s.permBtnText}>Permitir Câmera</Text>
          </Pressable>
        </View>
      )}

      {/* TOP BAR */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => { soundManager.play("tap"); onClose(); }} hitSlop={12} style={s.closeBtn}>
          <Feather name="x" size={22} color="#FFF" />
        </Pressable>
        <Text style={s.topTitle}>OCR — Foto da Nota</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hint */}
      <View style={s.hintWrap} pointerEvents="none">
        <View style={s.hintBubble}>
          <Text style={s.hintText}>
            {photoCount === 0
              ? "Enquadre a nota fiscal na câmera"
              : `${photoCount} foto${photoCount > 1 ? "s" : ""} capturada${photoCount > 1 ? "s" : ""} — adicione mais ou processe`}
          </Text>
        </View>
      </View>

      {/* BANNER: fotos coletadas + botão processar */}
      {photoCount > 0 && (
        <View style={[s.banner, { bottom: insets.bottom + 20 + 132 }]}>
          <View style={s.bannerLeft}>
            <Feather name="layers" size={18} color="#FFF" />
            <Text style={s.bannerText}>
              {photoCount} foto{photoCount > 1 ? "s" : ""} pronta{photoCount > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={s.bannerActions}>
            <Pressable style={s.bannerClear} onPress={() => { soundManager.play("trash"); setCapturedUris([]); }}>
              <Feather name="trash-2" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Pressable
              style={[s.processBtn, { backgroundColor: theme.primaryColor }]}
              onPress={handleProcess}
            >
              <Feather name="cpu" size={16} color="#FFF" />
              <Text style={s.processBtnText}>Processar ({photoCount})</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* BOTTOM BAR: shutter + gallery + config API */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.bottomRow}>
          {/* Gallery */}
          <Pressable style={s.sideBtn} onPress={() => { soundManager.play("tap"); handleGallery(); }}>
            <View style={s.sideBtnIcon}>
              <Feather name="image" size={22} color="#FFF" />
            </View>
            <Text style={s.sideBtnLabel}>Galeria</Text>
          </Pressable>

          {/* Shutter */}
          <Pressable
            style={s.shutter}
            onPress={handleShutter}
            disabled={capturing || !permissionGranted}
          >
            {capturing ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <View style={s.shutterInner} />
            )}
          </Pressable>

          {/* Config API */}
          <Pressable style={s.sideBtn} onPress={() => { soundManager.play("tap"); router.push("/ocr-settings"); }}>
            <View style={s.sideBtnIcon}>
              <Feather name="settings" size={22} color="#FFF" />
            </View>
            <Text style={s.sideBtnLabel}>Config. API</Text>
          </Pressable>
        </View>
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
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  closeBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20,
  },
  topTitle: { flex: 1, color: "#FFF", fontSize: 16, fontWeight: "700", textAlign: "center" },
  hintWrap: {
    position: "absolute", left: 0, right: 0, top: "50%", marginTop: -60,
    alignItems: "center",
  },
  hintBubble: {
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    maxWidth: "80%",
  },
  hintText: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "500", textAlign: "center" },
  banner: {
    position: "absolute", left: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  bannerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  bannerClear: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  processBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  processBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 32, paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shutter: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#FFF",
    alignItems: "center", justifyContent: "center",
    borderWidth: 4, borderColor: "rgba(255,255,255,0.4)",
  },
  shutterInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF",
    borderWidth: 2, borderColor: "rgba(0,0,0,0.15)",
  },
  sideBtn: { alignItems: "center", gap: 6, width: 64 },
  sideBtnIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  sideBtnLabel: { color: "#FFF", fontSize: 11, fontWeight: "500" },
});
