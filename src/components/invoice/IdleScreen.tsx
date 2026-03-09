// FIX-2026-03-09: ScrollView para conter TourCard overflow — ver docs/tour-crash-fixes.md #5
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";
import { useTourTarget } from "@/src/tour/useTourTarget";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=br.com.pixeleucaristico.domus";

interface Props {
  theme: ThemeColors;
  onQRPress: () => void;
  onOCRPress: () => void;
  onManualEntry: () => void;
}

export function IdleScreen({ theme, onQRPress, onOCRPress, onManualEntry }: Props) {
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { targetRef: qrRef, TourCard: QrTourCard, activeStyle: qrActive } = useTourTarget("import-qr");
  const { targetRef: manualRef, TourCard: ManualTourCard, activeStyle: manualActive } = useTourTarget("import-manual");

  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <Feather name="file-text" size={56} color={theme.primaryColor} style={{ marginBottom: 24 }} />
      <Text style={[s.title, { color: theme.textColor }]}>Importar Nota Fiscal</Text>
      <Text style={[s.subtitle, { color: theme.secondaryText }]}>Escolha como deseja importar</Text>

      <View style={[s.actions, Platform.OS === "web" ? { zIndex: qrActive || manualActive ? 9999 : 1, position: "relative" } : {}]}>
        <View style={qrActive ? { zIndex: 9998, position: "relative" } : {}}>
          <Pressable
            ref={qrRef as any}
            collapsable={false}
            style={[s.mainBtn, { backgroundColor: theme.primaryColor, opacity: isWeb ? 0.5 : 1 }, qrActive ? { backgroundColor: theme.primaryColor, zIndex: 9998, position: "relative" } : {}]}
            onPress={() => { if (isWeb) return; soundManager.play("tap"); onQRPress(); }}
            disabled={isWeb}
          >
            <Feather name="maximize" size={28} color="#FFF" />
            <View style={s.btnTextGroup}>
              <Text style={s.mainBtnLabel}>QR Code</Text>
              <Text style={s.mainBtnSub}>{isWeb ? "Disponível no app Android" : "Câmera, galeria ou digitar chave"}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <QrTourCard />
        </View>

        <Pressable
          style={[s.mainBtn, { backgroundColor: theme.accentColor, opacity: isWeb ? 0.5 : 1 }]}
          onPress={() => { if (isWeb) return; soundManager.play("tap"); onOCRPress(); }}
          disabled={isWeb}
        >
          <Feather name="type" size={28} color="#FFF" />
          <View style={s.btnTextGroup}>
            <Text style={s.mainBtnLabel}>OCR — Foto</Text>
            <Text style={s.mainBtnSub}>{isWeb ? "Disponível no app Android" : "Fotografar a nota fiscal"}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {Platform.OS === "web" && (
          <Pressable
            style={[s.webNotice, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => { window.open(PLAY_STORE_URL, "_blank"); }}
          >
            <Feather name="smartphone" size={24} color={theme.primaryColor} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.webNoticeTitle, { color: theme.textColor }]}>
                Use o app Android para QR Code e OCR
              </Text>
              <Text style={[s.webNoticeDesc, { color: theme.secondaryText }]}>
                Essas funções precisam de câmera e WebView nativo. Toque aqui para baixar o app no Google Play.
              </Text>
            </View>
            <Feather name="external-link" size={16} color={theme.secondaryText} />
          </Pressable>
        )}

        <View style={Platform.OS === "web" && manualActive ? { zIndex: 9998, position: "relative" } : {}}>
          <Pressable
            ref={manualRef as any}
            collapsable={false}
            style={[s.outlineBtn, { borderColor: theme.border }, manualActive ? { backgroundColor: theme.cardBackground, zIndex: 9998, position: "relative" } : {}]}
            onPress={() => { soundManager.play("tap"); onManualEntry(); }}
          >
            <Feather name="edit-3" size={20} color={theme.textColor} />
            <Text style={[s.outlineBtnText, { color: theme.textColor }]}>Lançar manualmente</Text>
          </Pressable>
          <ManualTourCard />
        </View>
      </View>

      {!isWeb && (
        <Pressable style={s.settingsLink} onPress={() => { soundManager.play("tap"); router.push("/ocr-settings"); }}>
          <Feather name="settings" size={14} color={theme.secondaryText} />
          <Text style={[s.settingsLinkText, { color: theme.secondaryText }]}>Configurar OCR</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1, alignItems: "center", justifyContent: "center",
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
  webNotice: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  webNoticeTitle: { fontSize: 14, fontWeight: "700" },
  webNoticeDesc: { fontSize: 12, lineHeight: 17 },
});
