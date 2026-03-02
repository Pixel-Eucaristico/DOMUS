import React from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { BROWSER_UA } from "@/src/hooks/useInvoiceWebView";

interface Props {
  theme: ThemeColors;
  insets: EdgeInsets;
  webviewRef: React.RefObject<WebView | null>;
  webviewUrl: string;
  webviewLoading: boolean;
  isEnrichingMode: boolean;
  isWaitingUserClick: boolean;
  autoFillScript: string;
  onMessage: (event: any) => void;
  onLoadStart: () => void;
  onLoadEnd: (event?: any) => void;
  onNavigationStateChange: (navState: any) => void;
  onError: () => void;
  onCapture: () => void;
  onClose: () => void;
}

export function WebViewScreen({
  theme,
  insets,
  webviewRef,
  webviewUrl,
  webviewLoading,
  isEnrichingMode,
  isWaitingUserClick,
  autoFillScript,
  onMessage,
  onLoadStart,
  onLoadEnd,
  onNavigationStateChange,
  onError,
  onCapture,
  onClose,
}: Props) {
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color={theme.textColor} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.textColor }]} numberOfLines={1}>
          Consulta SEFAZ
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Loading overlay */}
      {webviewLoading && (
        <View style={[s.loadingOverlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={[s.loadingText, { color: theme.textColor }]}>
            Carregando página SEFAZ...
          </Text>
        </View>
      )}

      <WebView
        ref={webviewRef}
        source={{ uri: webviewUrl }}
        style={s.flex1}
        javaScriptEnabled
        domStorageEnabled
        userAgent={BROWSER_UA}
        injectedJavaScript={autoFillScript}
        onMessage={onMessage}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onNavigationStateChange={onNavigationStateChange}
        onError={onError}
      />

      {/* Instruction strip */}
      <View style={[s.instructions, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
        <Text style={[s.instructionText, { color: theme.secondaryText }]}>
          {isEnrichingMode
            ? "Buscando EAN e NCM dos produtos... aguarde"
            : isWaitingUserClick
            ? "Toque no botão azul na tela para carregar os detalhes"
            : webviewUrl.includes("ConsultaPublica")
            ? "Resolva o CAPTCHA → clique em Consultar → veja os dados → capture"
            : "Aguarde a nota carregar na tela e então capture os dados"}
        </Text>
      </View>

      {/* Floating capture button — oculto enquanto aguarda clique do usuário no WebView */}
      {isEnrichingMode ? (
        <View style={[s.captureBtn, { backgroundColor: `${theme.primaryColor}99`, bottom: insets.bottom + 16 }]}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={s.captureBtnText}>Buscando EAN/NCM...</Text>
        </View>
      ) : !isWaitingUserClick ? (
        <Pressable
          style={[s.captureBtn, { backgroundColor: theme.primaryColor, bottom: insets.bottom + 16 }]}
          onPress={onCapture}
        >
          <Feather name="download-cloud" size={20} color="#FFF" />
          <Text style={s.captureBtnText}>Capturar Dados da Nota</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 10,
    justifyContent: "center", alignItems: "center", gap: 12,
  },
  loadingText: { marginTop: 16, fontSize: 15 },
  instructions: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  instructionText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  captureBtn: {
    position: "absolute", left: 20, right: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  captureBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
