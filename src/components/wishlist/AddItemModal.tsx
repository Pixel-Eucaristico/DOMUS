import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { URGENCY_ORDER } from "@packages/wishlist";
import type { UrgencyLevel, WishlistItem } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { WishlistSearchWebView } from "./WishlistSearchWebView";
import { SelectionModal } from "../shared/SelectionModal";
import { useAddWishlistItem } from "@/src/hooks/useAddWishlistItem";
import { soundManager } from "@/src/services/SoundManager";

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
  } = useAddWishlistItem({ visible, listId, editItem, onConfirm, onCancel });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
      <View style={s.kav}>
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={s.flex} onPress={handleCancel} />
        </Animated.View>

        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
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
              {/* URL */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Link do produto (opcional)</Text>
              <View style={s.urlRow}>
                <TextInput
                  style={[s.input, s.inputFlex, { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground }]}
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

              {/* Name */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Nome *</Text>
              <TextInput
                style={[s.input, { color: theme.textColor, borderColor: theme.primaryColor, backgroundColor: theme.cardBackground }]}
                placeholder="Nome do produto..."
                placeholderTextColor={theme.secondaryText}
                value={form.name}
                onChangeText={(v) => updateField("name", v)}
                maxLength={100}
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

              {/* Price */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Preço (R$)</Text>
              <TextInput
                style={[s.input, { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground }]}
                placeholder="0,00"
                placeholderTextColor={theme.secondaryText}
                value={form.price}
                onChangeText={(v) => updateField("price", v)}
                keyboardType="decimal-pad"
              />

              {/* Category */}
              <Text style={[s.label, { color: theme.secondaryText }]}>Categoria</Text>
              <View style={s.categoryGrid}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const selected = form.category === cat.id;
                  const color = GROUP_COLORS[cat.group];
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.categoryChip, { backgroundColor: selected ? color : color + "18", borderColor: color }]}
                      onPress={() => { soundManager.play("tap"); updateField("category", selected ? "" : cat.id); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.categoryChipText, { color: selected ? "#fff" : color }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
                  <TextInput
                    style={[s.input, { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground }]}
                    placeholder="Código de barras"
                    placeholderTextColor={theme.secondaryText}
                    value={form.ean}
                    onChangeText={(v) => updateField("ean", v)}
                    keyboardType="numeric"
                  />
                  <Text style={[s.label, { color: theme.secondaryText }]}>NCM</Text>
                  <TextInput
                    style={[s.input, { color: theme.textColor, borderColor: theme.cardBackground, backgroundColor: theme.cardBackground }]}
                    placeholder="Ex: 8517.12.31"
                    placeholderTextColor={theme.secondaryText}
                    value={form.ncm}
                    onChangeText={(v) => updateField("ncm", v)}
                  />
                </View>
              )}

              {/* Actions */}
              <View style={s.actions}>
                <TouchableOpacity style={[s.btn, { borderColor: theme.border ?? "#E5E7EB" }]} onPress={() => { soundManager.play("tap"); handleCancel(); }} activeOpacity={0.7}>
                  <Text style={[s.btnText, { color: theme.secondaryText }]}>Cancelar</Text>
                </TouchableOpacity>
                {isValid && (
                  <TouchableOpacity
                    style={[s.btn, s.btnPrimary, { backgroundColor: theme.primaryColor }]}
                    onPress={() => { soundManager.play("success"); handleConfirm(); }}
                    activeOpacity={0.7}
                  >
                    <Feather name={editItem ? "check" : "plus"} size={16} color="#fff" />
                    <Text style={s.btnTextPrimary}>{editItem ? "Salvar alterações" : "Adicionar à lista"}</Text>
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
          onCancel={() => { soundManager.play("tap"); setSearchModalVisible(false); }}
          options={[
            { label: "Amazon", icon: "shopping-cart", onPress: () => { soundManager.play("pop"); openSearchWebView("amazon"); } },
            { label: "Mercado Livre", icon: "shopping-bag", onPress: () => { soundManager.play("pop"); openSearchWebView("ml"); } },
          ]}
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
  input: { height: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, fontFamily: "DMSans_400Regular", marginBottom: 2 },
  inputFlex: { flex: 1 },
  urlRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  clearBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  scrapeBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  affiliateNote: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, marginBottom: 2 },
  affiliateNoteText: { fontSize: 11, fontFamily: "DMSans_400Regular", flex: 1 },
  urgencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  urgencyChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  urgencyText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  categoryChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  categoryChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  advancedToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginTop: 4 },
  advancedText: { fontSize: 12, fontFamily: "DMSans_500Medium" },
  savingsScroll: { marginBottom: 4 },
  savingsChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  savingsChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
  btn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  btnTextPrimary: { fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#fff" },
});
