import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  onQRPress: () => void;
  onOCRPress: () => void;
  onManualEntry: () => void;
}

export function IdleScreen({ theme, onQRPress, onOCRPress, onManualEntry }: Props) {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Feather name="file-text" size={56} color={theme.primaryColor} style={{ marginBottom: 24 }} />
      <Text style={[s.title, { color: theme.textColor }]}>Importar Nota Fiscal</Text>
      <Text style={[s.subtitle, { color: theme.secondaryText }]}>Escolha como deseja importar</Text>

      <View style={s.actions}>
        <Pressable style={[s.mainBtn, { backgroundColor: theme.primaryColor }]} onPress={onQRPress}>
          <Feather name="maximize" size={28} color="#FFF" />
          <View style={s.btnTextGroup}>
            <Text style={s.mainBtnLabel}>QR Code</Text>
            <Text style={s.mainBtnSub}>Câmera, galeria ou digitar chave</Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        <Pressable style={[s.mainBtn, { backgroundColor: theme.accentColor }]} onPress={onOCRPress}>
          <Feather name="type" size={28} color="#FFF" />
          <View style={s.btnTextGroup}>
            <Text style={s.mainBtnLabel}>OCR — Foto</Text>
            <Text style={s.mainBtnSub}>Fotografar a nota fiscal</Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        <Pressable style={[s.outlineBtn, { borderColor: theme.border }]} onPress={onManualEntry}>
          <Feather name="edit-3" size={20} color={theme.textColor} />
          <Text style={[s.outlineBtnText, { color: theme.textColor }]}>Lançar manualmente</Text>
        </Pressable>
      </View>

      <Pressable style={s.settingsLink} onPress={() => router.push("/ocr-settings")}>
        <Feather name="settings" size={14} color={theme.secondaryText} />
        <Text style={[s.settingsLinkText, { color: theme.secondaryText }]}>Configurar OCR</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 28, paddingBottom: 40,
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 15, marginBottom: 40, textAlign: "center" },
  actions: { width: "100%", gap: 14 },
  mainBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 18, borderRadius: 16, gap: 16,
  },
  btnTextGroup: { flex: 1 },
  mainBtnLabel: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  mainBtnSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  outlineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, borderWidth: 1, gap: 10,
  },
  outlineBtnText: { fontSize: 15, fontWeight: "600" },
  settingsLink: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 40, paddingVertical: 10,
  },
  settingsLinkText: { fontSize: 13 },
});
