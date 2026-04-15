import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Pressable,
} from "react-native";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { URGENCY_ORDER } from "@packages/wishlist";
import type { UrgencyLevel, WishlistItem } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { CategoryPickerModal } from "@/src/components/shared/CategoryPickerModal";
import { NCM_SUBCATEGORIES } from "@packages/parsers/src/classifier/ncmCategories";
import { WishlistSearchWebView } from "./WishlistSearchWebView";
import { StoreGridModal } from "./StoreGridModal";
import { SelectionModal } from "../shared/SelectionModal";
import { useAddWishlistItem } from "@/src/hooks/useAddWishlistItem";
import { soundManager } from "@/src/services/SoundManager";
import { TButton, TInput } from "@/src/components/tamagui";

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

export function AddItemModal({ visible, listId, theme, accounts = [], editItem, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [storeGridVisible, setStoreGridVisible] = React.useState(false);
  const [catPickerVisible, setCatPickerVisible] = React.useState(false);
  const {
    form,
    updateField,
    clearUrl,
    savingsGoal,
    setSavingsGoal,
    scraping,
    showAdvanced,
    setShowAdvanced,
    searchModalVisible,
    setSearchModalVisible,
    webView,
    setWebView,
    slideAnim,
    fadeAnim,
    isValid,
    hasUrl,
    handleUrlBlur,
    openSearchWebView,
    handleSearchOrImport,
    handleConfirm,
    handleCancel,
    handleProductSelected,
    isBundleMode,
    setIsBundleMode,
    bundleItems,
    addBundleItem,
    updateBundleItem,
    removeBundleItem,
  } = useAddWishlistItem({ visible, listId, editItem, onConfirm, onCancel });

  // Calcula preço total do bundle para exibir
  const bundleTotalPrice = React.useMemo(() => {
    if (!isBundleMode || bundleItems.length === 0) return 0;
    return bundleItems.reduce((acc, b) => acc + (b.price ?? 0), 0);
  }, [isBundleMode, bundleItems]);

  const productName = form.name.trim();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
      <View style={s.kav}>
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={s.flex} onPress={handleCancel} />
        </Animated.View>

        <KeyboardSafeView style={s.kav}>
          <View style={s.flex} pointerEvents="none" />
          <Animated.View
            style={[
              s.card,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={s.headerRow}>
              <Text style={[s.title, { color: theme.textColor }]}>
                {editItem ? "Editar Item" : "Adicionar Item"}
              </Text>
              <TouchableOpacity onPress={() => { soundManager.play("tap"); handleCancel(); }}>
                <Feather name="x" size={22} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* URL — oculto no modo kit */}
              {!isBundleMode && (
                <>
                  <Text style={[s.label, { color: theme.secondaryText }]}>Link do produto (opcional)</Text>
                  <View style={s.urlRow}>
                    <TextInput
                      style={[s.input, s.inputFlex, { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground } as any]}
                      placeholder="Cole o link ou use a lupa para pesquisar"
                      placeholderTextColor={theme.secondaryText}
                      value={form.url}
                      onChangeText={(v) => updateField("url", v)}
                      onBlur={handleUrlBlur}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    {hasUrl && (
                      <TouchableOpacity style={s.clearBtn} onPress={() => { soundManager.play("tap"); clearUrl(); }} activeOpacity={0.7}>
                        <Feather name="x" size={16} color={theme.secondaryText} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[s.scrapeBtn, { backgroundColor: hasUrl ? theme.primaryColor : theme.primaryColor + "CC" }]}
                      onPress={() => { soundManager.play("pop"); handleSearchOrImport(); }}
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
                  <View style={s.affiliateNote}>
                    <Feather name="heart" size={10} color={theme.secondaryText} />
                    <Text style={[s.affiliateNoteText, { color: theme.secondaryText }]}>
                      Links da Amazon são convertidos para afiliados — isso ajuda a manter o app gratuito
                    </Text>
                  </View>
                </>
              )}

              {/* Name */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Nome *</Text>
              <TInput
                placeholder="Nome do produto..."
                value={form.name}
                onChangeText={(v) => updateField("name", v)}
                maxLength={100}
                color={theme.textColor as any}
                backgroundColor={theme.cardBackground as any}
                borderColor={theme.border as any}
              />

              {/* Urgency */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Urgência</Text>
              <View style={s.urgencyRow}>
                {URGENCY_ORDER.map((level) => {
                  const selected = form.urgencyLevel === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[s.urgencyChip, { backgroundColor: selected ? URGENCY_COLORS[level] : URGENCY_COLORS[level] + "20", borderColor: URGENCY_COLORS[level] }]}
                      onPress={() => { soundManager.play("tap"); updateField("urgencyLevel", level); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.urgencyText, { color: selected ? "#fff" : URGENCY_COLORS[level] }]}>
                        {URGENCY_LABELS[level]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Preço — manual quando item simples, automático (soma das peças) no modo kit */}
              {isBundleMode ? (
                <View style={[s.bundlePriceDisplay, { backgroundColor: theme.cardBackground }]}>
                  <Feather name="layers" size={13} color={theme.secondaryText} />
                  <Text style={[s.bundlePriceLabel, { color: theme.secondaryText }]}>Preço total (automático)</Text>
                  <Text style={[s.bundlePriceValue, { color: bundleTotalPrice > 0 ? theme.primaryColor : theme.secondaryText }]}>
                    {bundleTotalPrice > 0
                      ? `R$ ${bundleTotalPrice.toFixed(2).replace(".", ",")}`
                      : "—"}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[s.label, { color: theme.secondaryText }]}>Preço (R$)</Text>
                  <TextInput
                    style={[s.input, { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground } as any]}
                    placeholder="0,00"
                    placeholderTextColor={theme.secondaryText}
                    value={form.price}
                    onChangeText={(v) => updateField("price", v)}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              {/* Category */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Categoria</Text>
              <TouchableOpacity
                onPress={() => setCatPickerVisible(true)}
                style={[s.catPickerBtn, {
                  borderColor: form.category ? (GROUP_COLORS[(CATEGORY_OPTIONS.find((c) => c.id === form.category)?.group ?? "wants")] ?? "#FF9800") : theme.border,
                  backgroundColor: form.category ? `${GROUP_COLORS[(CATEGORY_OPTIONS.find((c) => c.id === form.category)?.group ?? "wants")] ?? "#FF9800"}10` : theme.cardBackground,
                }]}
                activeOpacity={0.7}
              >
                <View style={[s.catDot, { backgroundColor: form.category ? (GROUP_COLORS[(CATEGORY_OPTIONS.find((c) => c.id === form.category)?.group ?? "wants")] ?? "#FF9800") : theme.secondaryText }]} />
                <Text style={[s.catPickerText, { color: theme.textColor }]}>
                  {form.category
                    ? (NCM_SUBCATEGORIES.find((s) => s.id === form.category)?.name
                      ?? CATEGORY_OPTIONS.find((c) => c.id === form.category)?.name
                      ?? "Selecionar")
                    : "Selecionar categoria..."}
                </Text>
                <Feather name="chevron-right" size={14} color={theme.secondaryText} />
              </TouchableOpacity>
              <CategoryPickerModal
                visible={catPickerVisible}
                onClose={() => setCatPickerVisible(false)}
                onSelect={(catId) => { updateField("category", catId); }}
                theme={theme}
                selectedId={form.category}
              />

              {/* Savings goal link */}
              {accounts.filter((a) => a.type === "savings").length > 0 && (
                <>
                  <Text style={[s.label, { color: theme.secondaryText }]}>Vincular à poupança</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.savingsScroll}>
                    <TouchableOpacity
                      style={[s.savingsChip, { backgroundColor: !savingsGoal.enabled ? theme.primaryColor + "20" : theme.cardBackground, borderColor: !savingsGoal.enabled ? theme.primaryColor : theme.cardBackground }]}
                      onPress={() => { soundManager.play("tap"); setSavingsGoal({ enabled: false }); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.savingsChipText, { color: !savingsGoal.enabled ? theme.primaryColor : theme.secondaryText }]}>
                        Nenhuma
                      </Text>
                    </TouchableOpacity>
                    {accounts
                      .filter((a) => a.type === "savings")
                      .map((acc) => {
                        const selected = savingsGoal.enabled && savingsGoal.linkedAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            style={[s.savingsChip, { backgroundColor: selected ? "#10B98120" : theme.cardBackground, borderColor: selected ? "#10B981" : theme.cardBackground }]}
                            onPress={() => { soundManager.play("tap"); setSavingsGoal({ enabled: true, linkedAccountId: acc.id }); }}
                            activeOpacity={0.7}
                          >
                            <Feather name="trending-up" size={11} color={selected ? "#10B981" : theme.secondaryText} />
                            <Text style={[s.savingsChipText, { color: selected ? "#10B981" : theme.textColor }]}>
                              {acc.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                </>
              )}

              {/* Advanced */}
              <TouchableOpacity style={s.advancedToggle} onPress={() => { soundManager.play("tap"); setShowAdvanced((v) => !v); }} activeOpacity={0.7}>
                <Text style={[s.advancedText, { color: theme.secondaryText }]}>Dados avançados (EAN, NCM)</Text>
                <Feather name={showAdvanced ? "chevron-up" : "chevron-down"} size={14} color={theme.secondaryText} />
              </TouchableOpacity>

              {showAdvanced && (
                <View>
                  <Text style={[s.label, { color: theme.secondaryText }]}>EAN</Text>
                  <TInput
                    placeholder="Código de barras"
                    value={form.ean}
                    onChangeText={(v) => updateField("ean", v)}
                    keyboardType="numeric"
                    color={theme.textColor as any}
                    backgroundColor={theme.cardBackground as any}
                    borderColor={theme.border as any}
                  />
                  <Text style={[s.label, { color: theme.secondaryText }]}>NCM</Text>
                  <TInput
                    placeholder="Ex: 8517.12.31"
                    value={form.ncm}
                    onChangeText={(v) => updateField("ncm", v)}
                    color={theme.textColor as any}
                    backgroundColor={theme.cardBackground as any}
                    borderColor={theme.border as any}
                  />
                </View>
              )}

              {/* Kit / Montagem */}
              <TouchableOpacity
                style={[s.bundleToggle, { borderColor: isBundleMode ? theme.primaryColor : theme.cardBackground, backgroundColor: isBundleMode ? theme.primaryColor + "15" : theme.cardBackground }]}
                onPress={() => { soundManager.play("tap"); setIsBundleMode((v) => !v); }}
                activeOpacity={0.7}
              >
                <Feather name="layers" size={15} color={isBundleMode ? theme.primaryColor : theme.secondaryText} />
                <Text style={[s.bundleToggleText, { color: isBundleMode ? theme.primaryColor : theme.secondaryText }]}>
                  {isBundleMode ? "Modo Kit ativado" : "Adicionar como kit / montagem"}
                </Text>
                {isBundleMode && bundleTotalPrice > 0 && (
                  <Text style={[s.bundleTotal, { color: theme.primaryColor }]}>
                    {`R$ ${bundleTotalPrice.toFixed(2).replace(".", ",")}`}
                  </Text>
                )}
              </TouchableOpacity>

              {isBundleMode && (
                <View style={s.bundleSection}>
                  {bundleItems.map((bItem, idx) => (
                    <View key={bItem.id} style={[s.bundleRow, { backgroundColor: theme.cardBackground, borderColor: theme.cardBackground }]}>
                      <TextInput
                        style={[s.bundleNameInput, { color: theme.textColor }]}
                        placeholder={`Peça ${idx + 1}...`}
                        placeholderTextColor={theme.secondaryText}
                        value={bItem.name}
                        onChangeText={(v) => updateBundleItem(idx, { name: v })}
                      />
                      {bItem.price !== undefined && (
                        <Text style={[s.bundlePrice, { color: theme.secondaryText }]}>
                          {`R$ ${bItem.price.toFixed(2).replace(".", ",")}`}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[s.bundleSearchBtn, { backgroundColor: theme.primaryColor + "20" }]}
                        onPress={() => {
                          soundManager.play("pop");
                          setSearchModalVisible(true);
                          // marca qual bundle item vai receber o produto
                          setWebView((prev) => ({ ...prev, bundleIndex: idx }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather name="search" size={14} color={theme.primaryColor} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { soundManager.play("tap"); removeBundleItem(idx); }} activeOpacity={0.7}>
                        <Feather name="x" size={16} color={theme.secondaryText} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={[s.bundleAddBtn, { borderColor: theme.primaryColor + "50" }]} onPress={() => { soundManager.play("tap"); addBundleItem(); }} activeOpacity={0.7}>
                    <Feather name="plus" size={14} color={theme.primaryColor} />
                    <Text style={[s.bundleAddText, { color: theme.primaryColor }]}>Adicionar peça</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Actions */}
              <View style={s.actions}>
                <TButton
                  variant="outline"
                  flex={1}
                  borderColor={theme.border as any}
                  color={theme.textColor as any}
                  onPress={() => { soundManager.play("tap"); handleCancel(); }}
                >
                  Cancelar
                </TButton>
                {isValid && (
                  <TButton
                    variant="primary"
                    flex={1}
                    icon={<Feather name={editItem ? "check" : "plus"} size={16} color="#fff" />}
                    onPress={() => { soundManager.play("success"); handleConfirm(); }}
                  >
                    {editItem ? "Salvar alterações" : "Adicionar à lista"}
                  </TButton>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardSafeView>

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
          subtitle={productName ? `Pesquisar "${productName}" em:` : "Escolha onde pesquisar:"}
          theme={theme}
          onCancel={() => { soundManager.play("tap"); setSearchModalVisible(false); }}
          options={[
            {
              label: "Amazon", icon: "shopping-cart",
              onPress: () => {
                soundManager.play("pop");
                openSearchWebView(
                  productName
                    ? `https://www.amazon.com.br/s?k=${encodeURIComponent(productName)}`
                    : "https://www.amazon.com.br",
                  webView.bundleIndex,
                );
              },
            },
            {
              label: "Mercado Livre", icon: "shopping-bag",
              onPress: () => {
                soundManager.play("pop");
                openSearchWebView(
                  productName
                    ? `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`
                    : "https://www.mercadolivre.com.br",
                  webView.bundleIndex,
                );
              },
            },
            {
              label: "Mais lojas...", icon: "grid", color: theme.secondaryText,
              onPress: () => { setStoreGridVisible(true); },
            },
          ]}
        />

        <StoreGridModal
          visible={storeGridVisible}
          theme={theme}
          searchQuery={productName}
          onSelectStore={(url) => { setStoreGridVisible(false); openSearchWebView(url, webView.bundleIndex); }}
          onCancel={() => setStoreGridVisible(false)}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  kav: { flex: 1, justifyContent: "flex-end" },
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  card: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: "92%", width: "100%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  label: { fontSize: 11, fontFamily: "DMSans_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  urlRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  clearBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  scrapeBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  affiliateNote: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, marginBottom: 2 },
  affiliateNoteText: { fontSize: 11, fontFamily: "DMSans_400Regular", flex: 1 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  stepperBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  stepperBtnSm: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  stepperInputSm: { width: 36, height: 28, borderRadius: 6, borderWidth: 1, textAlign: "center", fontSize: 13, fontFamily: "DMSans_700Bold" },
  stepperValue: { fontSize: 18, fontFamily: "DMSans_700Bold", minWidth: 28, textAlign: "center" },
  stepperInput: { width: 52, height: 40, borderRadius: 10, borderWidth: 1, textAlign: "center", fontSize: 16, fontFamily: "DMSans_700Bold" },
  stepperTotal: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  urgencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  urgencyChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  urgencyText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  categoryChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  catPickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 2 },
  catPickerText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 13 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, fontFamily: "DMSans_400Regular" },
  inputFlex: { flex: 1 },
  categoryChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  advancedToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginTop: 4 },
  advancedText: { fontSize: 12, fontFamily: "DMSans_500Medium" },
  savingsScroll: { marginBottom: 4 },
  savingsChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  savingsChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  bundlePriceDisplay: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 2, marginTop: 10 },
  bundlePriceLabel: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular" },
  bundlePriceValue: { fontSize: 15, fontFamily: "DMSans_700Bold" },
  bundleToggle: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  bundleToggleText: { flex: 1, fontSize: 13, fontFamily: "DMSans_500Medium" },
  bundleTotal: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  bundleSection: { marginTop: 8, gap: 6 },
  bundleRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  bundleNameInput: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular" },
  bundlePrice: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  bundleSearchBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  bundleAddBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderRadius: 10, borderStyle: "dashed", paddingVertical: 10 },
  bundleAddText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
});
