import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { soundManager } from "@/src/services/SoundManager";
import { TText } from "@/src/components/tamagui";

interface Props {
  theme: ThemeColors;
  insets: EdgeInsets;
  onBarcodeScanned: (event: { data: string }) => void;
  onClose: () => void;
}

export function ScanningScreen({ theme, insets, onBarcodeScanned, onClose }: Props) {
  return (
    <View style={s.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      <View style={s.overlay}>
        <View style={s.fade} />
        <View style={s.middle}>
          <View style={s.fade} />
          <View style={[s.focused, { borderColor: theme.primaryColor }]} />
          <View style={s.fade} />
        </View>
        <View style={s.fade} />
      </View>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => { soundManager.play("tap"); onClose(); }} hitSlop={12} style={s.closeBtn}>
          <Feather name="x" size={26} color="#FFF" />
        </Pressable>
        <TText variant="body" fontWeight="600" color="#FFF" fontSize={15} flex={1}>
          Aponte para o QR Code da NF-e
        </TText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1 },
  fade: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  middle: { flexDirection: "row", height: 260 },
  focused: { flex: 6, borderWidth: 2, borderRadius: 16 },
  header: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 16,
  },
  closeBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20,
  },
});
