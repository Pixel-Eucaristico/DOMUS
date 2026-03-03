import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { AFFILIATE_CONFIG } from "@packages/wishlist";

/** Detecta se a URL é uma página de produto (Amazon ou Mercado Livre). */
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
    // URL inválida
  }
  return url;
}

interface Props {
  visible: boolean;
  initialUrl: string;
  theme: ThemeColors;
  /** Chamado quando o usuário toca "Adicionar à lista" em uma página de produto. */
  onProductSelected: (url: string) => void;
  /** Chamado quando o usuário aborta sem selecionar nada. */
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

  const handleNavigationStateChange = useCallback((state: WebViewNavigation) => {
    const url = state.url ?? "";
    setCurrentUrl(url);
    setIsProduct(isProductUrl(url));
    setLoading(state.loading);
  }, []);

  const handleAddProduct = useCallback(() => {
    const affiliateUrl = withAmazonAffiliate(currentUrl);
    onProductSelected(affiliateUrl);
  }, [currentUrl, onProductSelected]);

  // Reseta estado quando modal abre
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border ?? "#E5E7EB" }]}>
          <TouchableOpacity onPress={onAbort} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={theme.textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.secondaryText }]} numberOfLines={1}>
            {isProduct ? "Produto encontrado — toque abaixo para adicionar" : "Pesquisar produto"}
          </Text>
          <TouchableOpacity onPress={onAbort} style={styles.abortBtn} activeOpacity={0.7}>
            <Text style={[styles.abortText, { color: theme.primaryColor }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={styles.webviewContainer}>
          <WebView
            source={{ uri: initialUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={({ url }) => {
              // Bloqueia schemes que abrem apps nativos (Amazon, ML, Play Store, etc.)
              // originWhitelist=["*"] força todas as URLs a passarem por este callback;
              // sem isso, no Android URLs com scheme não-http bypassam o callback e abrem o app nativo.
              if (!url.startsWith("http://") && !url.startsWith("https://")) {
                return false;
              }
              return true;
            }}
            originWhitelist={["*"]}
            setSupportMultipleWindows={false}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
          />

          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.background + "99" }]}>
              <ActivityIndicator size="large" color={theme.primaryColor} />
            </View>
          )}
        </View>

        {/* Barra flutuante — aparece apenas quando está em página de produto */}
        {isProduct && (
          <View style={[styles.floatingBar, { paddingBottom: insets.bottom + 8, backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.addProductBtn, { backgroundColor: theme.primaryColor }]}
              onPress={handleAddProduct}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={18} color="#fff" />
              <Text style={styles.addProductBtnText}>Adicionar à lista de desejos</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
  },
  abortBtn: {
    padding: 4,
  },
  abortText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  addProductBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
