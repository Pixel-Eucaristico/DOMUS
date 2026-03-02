import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import {
  URGENCY_ORDER,
  wishlistScraperService,
  AFFILIATE_CONFIG,
} from "@packages/wishlist";
import type { UrgencyLevel, WishlistItem } from "@packages/wishlist";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { WishlistSearchWebView } from "./WishlistSearchWebView";

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  PRIORITY: "Prioridade",
  ESSENTIAL: "Essencial",
  PLANNED: "Planejado",
  FUTURE: "Futuro",
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  PRIORITY: "#DC2626",
  ESSENTIAL: "#D97706",
  PLANNED: "#2563EB",
  FUTURE: "#6B7280",
};

interface Props {
  visible: boolean;
  listId: string;
  theme: ThemeColors;
  editItem?: WishlistItem;
  onConfirm: (item: Omit<WishlistItem, "id">) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  urgencyLevel: UrgencyLevel;
  price: string;
  url: string;
  category: string;
  ean: string;
  ncm: string;
  affiliateUrl: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  urgencyLevel: "PLANNED",
  price: "",
  url: "",
  category: "",
  ean: "",
  ncm: "",
  affiliateUrl: "",
};

/** Substitui o tag de afiliado da Amazon pelo nosso, ou adiciona caso não exista. */
function applyAmazonAffiliate(url: string): string {
  if (!url.trim()) return url;
  try {
    const parsed = new URL(url.trim());
    if (
      parsed.hostname.includes("amazon.com.br") ||
      parsed.hostname.includes("amazon.com") ||
      parsed.hostname.includes("amzn.to")
    ) {
      parsed.searchParams.set("tag", AFFILIATE_CONFIG.amazon.tag);
      parsed.searchParams.set("linkCode", AFFILIATE_CONFIG.amazon.linkCode);
      return parsed.toString();
    }
  } catch {
    // URL inválida, retorna como está
  }
  return url;
}

export function AddItemModal({ visible, listId, theme, editItem, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [scraping, setScraping] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [webView, setWebView] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: "",
  });

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateClose = useCallback((callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(400);
      fadeAnim.setValue(0);
      callback();
    });
  }, [fadeAnim, slideAnim]);

  // Pré-preenche o formulário quando abre em modo edição
  useEffect(() => {
    if (visible && editItem) {
      setForm({
        name: editItem.name,
        urgencyLevel: editItem.urgencyLevel,
        price: editItem.price !== undefined ? editItem.price.toFixed(2).replace(".", ",") : "",
        url: editItem.originalUrl ?? "",
        category: editItem.category ?? "",
        ean: editItem.ean ?? "",
        ncm: editItem.ncm ?? "",
        affiliateUrl: editItem.affiliateUrl ?? "",
      });
    }
  }, [visible, editItem]);

  const isValid = form.name.trim().length >= 2;
  const hasUrl = form.url.trim().length > 0;

  // Aplica afiliado Amazon ao sair do campo URL
  const handleUrlBlur = useCallback(() => {
    const affiliated = applyAmazonAffiliate(form.url);
    if (affiliated !== form.url) {
      setForm((p) => ({ ...p, url: affiliated }));
    }
  }, [form.url]);

  // Importa dados do produto via scraping do link
  const handleScrapeUrl = useCallback(async () => {
    if (!form.url.trim()) return;
    setScraping(true);
    try {
      const data = await wishlistScraperService.scrape(form.url.trim());
      setForm((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        price: data.price !== undefined ? data.price.toFixed(2).replace(".", ",") : prev.price,
        ean: data.ean ?? prev.ean,
        ncm: data.ncm ?? prev.ncm,
        category: data.category ?? prev.category,
        affiliateUrl: data.affiliateUrl ?? prev.affiliateUrl,
      }));
    } finally {
      setScraping(false);
    }
  }, [form.url]);

  const openSearchWebView = useCallback((platform: "amazon" | "ml") => {
    const url =
      platform === "amazon"
        ? `https://www.amazon.com.br`
        : `https://www.mercadolivre.com.br`;
    setWebView({ visible: true, url });
  }, []);

  // Lupa: quando não tem URL abre pesquisa interna; quando tem URL importa os dados
  const handleSearchOrImport = useCallback(() => {
    if (hasUrl) {
      handleScrapeUrl();
      return;
    }
    const term = form.name.trim();
    Alert.alert(
      "Pesquisar produto",
      term ? `Pesquisar "${term}" em:` : "Escolha onde pesquisar:",
      [
        { text: "Amazon", onPress: () => openSearchWebView("amazon") },
        { text: "Mercado Livre", onPress: () => openSearchWebView("ml") },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }, [hasUrl, form.name, handleScrapeUrl, openSearchWebView]);

  const handleConfirm = () => {
    if (!isValid) return;
    const priceVal = parseFloat(form.price.replace(",", "."));
    const item = {
      listId,
      name: form.name.trim(),
      urgencyLevel: form.urgencyLevel,
      orderIndex: -1,
      price: isNaN(priceVal) ? undefined : priceVal,
      originalUrl: form.url.trim() || undefined,
      affiliateUrl: form.affiliateUrl.trim() || undefined,
      category: form.category.trim() || undefined,
      ean: form.ean.trim() || undefined,
      ncm: form.ncm.trim() || undefined,
      canBuyThisMonth: false,
    };
    animateClose(() => {
      onConfirm(item);
      setForm(INITIAL_FORM);
      setShowAdvanced(false);
    });
  };

  const handleCancel = () => {
    animateClose(() => {
      setForm(INITIAL_FORM);
      setShowAdvanced(false);
      onCancel();
    });
  };

  // Usuário selecionou um produto no WebView — fecha WebView, preenche URL e scrapa
  const handleProductSelected = useCallback(async (url: string) => {
    setWebView({ visible: false, url: "" });
    setForm((p) => ({ ...p, url }));
    setScraping(true);
    try {
      const data = await wishlistScraperService.scrape(url);
      setForm((prev) => ({
        ...prev,
        url,
        name: data.name ?? prev.name,
        price: data.price !== undefined ? data.price.toFixed(2).replace(".", ",") : prev.price,
        ean: data.ean ?? prev.ean,
        ncm: data.ncm ?? prev.ncm,
        category: data.category ?? prev.category,
        affiliateUrl: data.affiliateUrl ?? prev.affiliateUrl,
      }));
    } finally {
      setScraping(false);
    }
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={[styles.kav, { paddingTop: insets.top + 8 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.background, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.textColor }]}>
              {editItem ? "Editar Item" : "Adicionar Item"}
            </Text>
            <TouchableOpacity onPress={handleCancel}>
              <Feather name="x" size={22} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* URL + botão pesquisa/importar */}
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Link do produto (opcional)
            </Text>
            <View style={styles.urlRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputFlex,
                  {
                    color: theme.textColor,
                    borderColor: theme.cardBackground,
                    backgroundColor: theme.cardBackground,
                  },
                ]}
                placeholder="Cole o link ou use a lupa para pesquisar"
                placeholderTextColor={theme.secondaryText}
                value={form.url}
                onChangeText={(v) => setForm((p) => ({ ...p, url: v }))}
                onBlur={handleUrlBlur}
                autoCapitalize="none"
                keyboardType="url"
              />
              {hasUrl && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setForm((p) => ({ ...p, url: "" }))}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={16} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.scrapeBtn,
                  { backgroundColor: hasUrl ? theme.primaryColor : (theme.primaryColor + "CC") },
                ]}
                onPress={handleSearchOrImport}
                disabled={scraping}
                activeOpacity={0.7}
              >
                {scraping ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : hasUrl ? (
                  <Feather name="download" size={16} color="#fff" />
                ) : (
                  <Feather name="search" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Nota de transparência sobre links afiliados */}
            <View style={styles.affiliateNote}>
              <Feather name="heart" size={10} color={theme.secondaryText} />
              <Text style={[styles.affiliateNoteText, { color: theme.secondaryText }]}>
                Links da Amazon são convertidos para afiliados — isso ajuda a manter o app gratuito
              </Text>
            </View>

            {/* Nome */}
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Nome *
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.textColor, borderColor: theme.primaryColor, backgroundColor: theme.cardBackground },
              ]}
              placeholder="Nome do produto..."
              placeholderTextColor={theme.secondaryText}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              maxLength={100}
            />

            {/* Urgência */}
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Urgência
            </Text>
            <View style={styles.urgencyRow}>
              {URGENCY_ORDER.map((level) => {
                const selected = form.urgencyLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.urgencyChip,
                      {
                        backgroundColor: selected
                          ? URGENCY_COLORS[level]
                          : URGENCY_COLORS[level] + "20",
                        borderColor: URGENCY_COLORS[level],
                      },
                    ]}
                    onPress={() => setForm((p) => ({ ...p, urgencyLevel: level }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.urgencyText,
                        { color: selected ? "#fff" : URGENCY_COLORS[level] },
                      ]}
                    >
                      {URGENCY_LABELS[level]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preço */}
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Preço (R$)
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.secondaryText}
              value={form.price}
              onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
              keyboardType="decimal-pad"
            />

            {/* Categoria */}
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Categoria
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((cat) => {
                const selected = form.category === cat.id;
                const color = GROUP_COLORS[cat.group];
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected ? color : color + "18",
                        borderColor: color,
                      },
                    ]}
                    onPress={() => setForm((p) => ({ ...p, category: selected ? "" : cat.id }))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryChipText, { color: selected ? "#fff" : color }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dados avançados */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.advancedText, { color: theme.secondaryText }]}>
                Dados avançados (EAN, NCM)
              </Text>
              <Feather
                name={showAdvanced ? "chevron-up" : "chevron-down"}
                size={14}
                color={theme.secondaryText}
              />
            </TouchableOpacity>

            {showAdvanced && (
              <View>
                <Text style={[styles.label, { color: theme.secondaryText }]}>EAN</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground },
                  ]}
                  placeholder="Código de barras"
                  placeholderTextColor={theme.secondaryText}
                  value={form.ean}
                  onChangeText={(v) => setForm((p) => ({ ...p, ean: v }))}
                  keyboardType="numeric"
                />
                <Text style={[styles.label, { color: theme.secondaryText }]}>NCM</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground },
                  ]}
                  placeholder="Ex: 8517.12.31"
                  placeholderTextColor={theme.secondaryText}
                  value={form.ncm}
                  onChangeText={(v) => setForm((p) => ({ ...p, ncm: v }))}
                />
              </View>
            )}

            {/* Ações — Adicionar só aparece quando nome está preenchido */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { borderColor: theme.border ?? "#E5E7EB" }]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              {isValid && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.primaryColor }]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Feather name={editItem ? "check" : "plus"} size={16} color="#fff" />
                  <Text style={styles.btnTextPrimary}>{editItem ? "Salvar alterações" : "Adicionar à lista"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* WebView de busca interna — abre em cima do modal */}
      <WishlistSearchWebView
        visible={webView.visible}
        initialUrl={webView.url}
        theme={theme}
        onProductSelected={handleProductSelected}
        onAbort={() => setWebView({ visible: false, url: "" })}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
  },
  label: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    marginBottom: 2,
  },
  inputFlex: { flex: 1 },
  urlRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  scrapeBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  affiliateNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    marginBottom: 2,
  },
  affiliateNoteText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    flex: 1,
  },
  urgencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  urgencyChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  urgencyText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 4,
  },
  advancedText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimary: { borderWidth: 0 },
  btnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  btnTextPrimary: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
