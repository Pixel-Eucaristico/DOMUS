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
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import {
  URGENCY_ORDER,
  wishlistScraperService,
  AFFILIATE_CONFIG,
} from "@packages/wishlist";
import type { UrgencyLevel, WishlistItem, SavingsGoalConfig } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { WishlistSearchWebView } from "./WishlistSearchWebView";
import { SelectionModal } from "../shared/SelectionModal";

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
  accounts?: AccountPayload[];
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
  imageUrl: string;
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
  imageUrl: "",
};

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
  }
  return url;
}

export function AddItemModal({ visible, listId, theme, accounts = [], editItem, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [savingsGoal, setSavingsGoalState] = useState<SavingsGoalConfig>({ enabled: false });
  const [scraping, setScraping] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [webView, setWebView] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: "",
  });

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateClose = useCallback((callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(600);
      fadeAnim.setValue(0);
    });
  }, [fadeAnim, slideAnim]);

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
        imageUrl: editItem.imageUrl ?? "",
      });
      if (editItem.savingsGoal) {
        setSavingsGoalState(editItem.savingsGoal);
      }
    }
  }, [visible, editItem]);

  const isValid = form.name.trim().length >= 2;
  const hasUrl = form.url.trim().length > 0;

  const handleUrlBlur = useCallback(() => {
    const affiliated = applyAmazonAffiliate(form.url);
    if (affiliated !== form.url) {
      setForm((p) => ({ ...p, url: affiliated }));
    }
  }, [form.url]);

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
        imageUrl: data.imageUrl ?? prev.imageUrl,
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

  const handleSearchOrImport = useCallback(() => {
    if (hasUrl) {
      handleScrapeUrl();
      return;
    }
    setSearchModalVisible(true);
  }, [hasUrl, handleScrapeUrl]);

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
      imageUrl: form.imageUrl.trim() || undefined,
      canBuyThisMonth: false,
      savingsGoal: savingsGoal.enabled ? savingsGoal : undefined,
    };
    animateClose(() => {
      onConfirm(item);
      setForm(INITIAL_FORM);
      setSavingsGoalState({ enabled: false });
      setShowAdvanced(false);
    });
  };

  const handleCancel = useCallback(() => {
    animateClose(() => {
      setForm(INITIAL_FORM);
      setSavingsGoalState({ enabled: false });
      setShowAdvanced(false);
      onCancel();
    });
  }, [animateClose, onCancel]);

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
        imageUrl: data.imageUrl ?? prev.imageUrl,
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
      <View style={styles.kav}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={styles.flex} onPress={handleCancel} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <View style={styles.flex} pointerEvents="none" />
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 20),
              },
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

              <View style={styles.affiliateNote}>
                <Feather name="heart" size={10} color={theme.secondaryText} />
                <Text style={[styles.affiliateNoteText, { color: theme.secondaryText }]}>
                  Links da Amazon são convertidos para afiliados — isso ajuda a manter o app gratuito
                </Text>
              </View>

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

              {accounts.filter((a) => a.type === "savings").length > 0 && (
                <>
                  <Text style={[styles.label, { color: theme.secondaryText }]}>
                    Vincular à poupança
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savingsScroll}>
                    <TouchableOpacity
                      style={[
                        styles.savingsChip,
                        {
                          backgroundColor: !savingsGoal.enabled
                            ? theme.primaryColor + "20"
                            : theme.cardBackground,
                          borderColor: !savingsGoal.enabled
                            ? theme.primaryColor
                            : theme.cardBackground,
                        },
                      ]}
                      onPress={() => setSavingsGoalState({ enabled: false })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.savingsChipText,
                          { color: !savingsGoal.enabled ? theme.primaryColor : theme.secondaryText },
                        ]}
                      >
                        Nenhuma
                      </Text>
                    </TouchableOpacity>
                    {accounts
                      .filter((a) => a.type === "savings")
                      .map((acc) => {
                        const selected =
                          savingsGoal.enabled && savingsGoal.linkedAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.savingsChip,
                              {
                                backgroundColor: selected ? "#10B98120" : theme.cardBackground,
                                borderColor: selected ? "#10B981" : theme.cardBackground,
                              },
                            ]}
                            onPress={() =>
                              setSavingsGoalState({ enabled: true, linkedAccountId: acc.id })
                            }
                            activeOpacity={0.7}
                          >
                            <Feather
                              name="trending-up"
                              size={11}
                              color={selected ? "#10B981" : theme.secondaryText}
                            />
                            <Text
                              style={[
                                styles.savingsChipText,
                                { color: selected ? "#10B981" : theme.textColor },
                              ]}
                            >
                              {acc.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                </>
              )}

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

        <WishlistSearchWebView
          visible={webView.visible}
          initialUrl={webView.url}
          theme={theme}
          onProductSelected={handleProductSelected}
          onAbort={() => setWebView({ visible: false, url: "" })}
        />

        <SelectionModal
          visible={searchModalVisible}
          title="Pesquisar produto"
          subtitle={form.name.trim() ? `Pesquisar "${form.name.trim()}" em:` : "Escolha onde pesquisar:"}
          theme={theme}
          onCancel={() => setSearchModalVisible(false)}
          options={[
            {
              label: "Amazon",
              icon: "shopping-cart",
              onPress: () => openSearchWebView("amazon"),
            },
            {
              label: "Mercado Livre",
              icon: "shopping-bag",
              onPress: () => openSearchWebView("ml"),
            },
          ]}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: "flex-end",
  },
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "92%",
    width: "100%",
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
  savingsScroll: {
    marginBottom: 4,
  },
  savingsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  savingsChipText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
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
