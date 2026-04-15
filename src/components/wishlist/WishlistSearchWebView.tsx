import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { AFFILIATE_CONFIG } from "@packages/wishlist";
import { TText } from "@/src/components/tamagui";

/** Detecta se a URL e uma pagina de produto (Amazon ou Mercado Livre). */
function isProductUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes("amazon.com.br") || url.includes("amazon.com")) {
    return /\/dp\/[A-Z0-9]{10}/.test(url) || url.includes("/gp/product/");
  }
  if (url.includes("mercadolivre.com.br") || url.includes("mercadolibre.com")) {
    return /MLB\d+/.test(url) || url.includes("/p/MLB") || url.includes("produto.mercadolivre");
  }
  return false;
}

/** Garante que URLs Amazon tenham o tag de afiliado. */
function withAmazonAffiliate(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("amazon")) {
      parsed.searchParams.set("tag", AFFILIATE_CONFIG.amazon.tag);
      parsed.searchParams.set("linkCode", AFFILIATE_CONFIG.amazon.linkCode);
      return parsed.toString();
    }
  } catch {
    // URL invalida
  }
  return url;
}

interface Props {
  visible: boolean;
  initialUrl: string;
  theme: ThemeColors;
  onProductSelected: (url: string) => void;
  onAbort: () => void;
}

export function WishlistSearchWebView({
  visible,
  initialUrl,
  theme,
  onProductSelected,
  onAbort,
}: Props) {
  const insets = useSafeAreaInsets();
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isProduct, setIsProduct] = useState(false);
  const [loading, setLoading] = useState(true);

  if (Platform.OS === "web") return null;

  const WebView = require("react-native-webview").default;

  const handleNavigationStateChange = useCallback((state: any) => {
    const url = state.url ?? "";
    setCurrentUrl(url);
    setIsProduct(isProductUrl(url));
    setLoading(state.loading);
  }, []);

  const handleAddProduct = useCallback(() => {
    const affiliateUrl = withAmazonAffiliate(currentUrl);
    onProductSelected(affiliateUrl);
  }, [currentUrl, onProductSelected]);

  const handleModalShow = useCallback(() => {
    setCurrentUrl(initialUrl);
    setIsProduct(false);
    setLoading(true);
  }, [initialUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onAbort}
      onShow={handleModalShow}
    >
      <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: theme.border ?? "#E5E7EB" }]}>
          <TouchableOpacity onPress={onAbort} style={s.closeBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={theme.textColor} />
          </TouchableOpacity>
          <TText variant="label" color={theme.secondaryText} textAlign="center" flex={1} numberOfLines={1}>
            {isProduct ? "Produto encontrado — toque abaixo para adicionar" : "Pesquisar produto"}
          </TText>
          <TouchableOpacity onPress={onAbort} style={s.abortBtn} activeOpacity={0.7}>
            <TText variant="body" fontWeight="600" color={theme.primaryColor}>Cancelar</TText>
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={s.webviewContainer}>
          <WebView
            source={{ uri: initialUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={({ url }: { url: string }) => {
              if (!url.startsWith("http://") && !url.startsWith("https://")) {
                return false;
              }
              return true;
            }}
            originWhitelist={["*"]}
            setSupportMultipleWindows={false}
            style={s.webview}
            javaScriptEnabled
            domStorageEnabled
          />

          {loading && (
            <View style={[s.loadingOverlay, { backgroundColor: theme.background + "99" }]}>
              <ActivityIndicator size="large" color={theme.primaryColor} />
            </View>
          )}
        </View>

        {/* Barra flutuante */}
        {isProduct && (
          <View style={[s.floatingBar, { paddingBottom: insets.bottom + 8, backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[s.addProductBtn, { backgroundColor: theme.primaryColor }]}
              onPress={handleAddProduct}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={18} color="#fff" />
              <TText variant="body" fontWeight="600" color="#fff" fontSize={15}>
                Adicionar a lista de desejos
              </TText>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8,
  },
  closeBtn: { padding: 4 },
  abortBtn: { padding: 4 },
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  floatingBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  addProductBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 52, borderRadius: 14,
  },
});
