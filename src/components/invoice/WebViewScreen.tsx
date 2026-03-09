// FIX-2026-03-09: WebView com props de estabilidade Android e error boundary.
// Ver docs/tour-crash-fixes.md #2
import React from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { BROWSER_UA } from "@/src/hooks/useInvoiceWebView";
import { soundManager } from "@/src/services/SoundManager";

// Require WebView fora do render para evitar crash durante mount em Samsung
const NativeWebView = Platform.OS !== "web"
  ? (() => { try { return require("react-native-webview").default; } catch { return null; } })()
  : null;

interface Props {
  theme: ThemeColors;
  insets: EdgeInsets;
  webviewRef: React.RefObject<any>;
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
  // No web, sites como SEFAZ bloqueiam iframe — abrir em nova aba
  if (Platform.OS === "web") {
    return (
      <WebViewScreenWeb
        theme={theme}
        insets={insets}
        webviewUrl={webviewUrl}
        onClose={onClose}
      />
    );
  }

  // FIX: NativeWebView carregado fora do render — ver docs/tour-crash-fixes.md #2
  if (!NativeWebView) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-triangle" size={40} color={theme.primaryColor} />
        <Text style={[s.loadingText, { color: theme.textColor }]}>WebView indisponivel</Text>
        <Pressable onPress={onClose} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.primaryColor, fontSize: 16 }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => { soundManager.play("tap"); onClose(); }} hitSlop={12}>
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

      <NativeWebView
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
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        onRenderProcessGone={() => onError()}
        onContentProcessDidTerminate={() => onError()}
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

      {/* Floating capture button */}
      {isEnrichingMode ? (
        <View style={[s.captureBtn, { backgroundColor: `${theme.primaryColor}99`, bottom: insets.bottom + 16 }]}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={s.captureBtnText}>Buscando EAN/NCM...</Text>
        </View>
      ) : !isWaitingUserClick ? (
        <Pressable
          style={[s.captureBtn, { backgroundColor: theme.primaryColor, bottom: insets.bottom + 16 }]}
          onPress={() => { soundManager.play("tap"); onCapture(); }}
        >
          <Feather name="download-cloud" size={20} color="#FFF" />
          <Text style={s.captureBtnText}>Capturar Dados da Nota</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ─── Versão Web: abre SEFAZ em nova aba ─── */

function WebViewScreenWeb({
  theme,
  insets,
  webviewUrl,
  onClose,
}: {
  theme: ThemeColors;
  insets: EdgeInsets;
  webviewUrl: string;
  onClose: () => void;
}) {
  const handleOpen = () => {
    window.open(webviewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => { soundManager.play("tap"); onClose(); }} hitSlop={12}>
          <Feather name="x" size={22} color={theme.textColor} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.textColor }]} numberOfLines={1}>
          Consulta SEFAZ
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={s.webFallback}>
        <Feather name="external-link" size={40} color={theme.primaryColor} />
        <Text style={[s.webFallbackTitle, { color: theme.textColor }]}>
          Consulta SEFAZ
        </Text>
        <Text style={[s.webFallbackDesc, { color: theme.secondaryText }]}>
          A consulta SEFAZ não pode ser exibida dentro do app na versão web.
          Clique no botão abaixo para abrir em uma nova aba.
        </Text>
        <Pressable
          style={[s.webFallbackBtn, { backgroundColor: theme.primaryColor }]}
          onPress={handleOpen}
        >
          <Feather name="external-link" size={18} color="#FFF" />
          <Text style={s.webFallbackBtnText}>Abrir SEFAZ em nova aba</Text>
        </Pressable>
      </View>
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
  // Web fallback
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  webFallbackTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  webFallbackDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 400,
  },
  webFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  webFallbackBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
