import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown, 
  Layout 
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { useTransactionForm } from "@/src/hooks/useTransactionForm";
import { useTitheCalculator } from "@/src/hooks/useTitheCalculator";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { CategorySelectorGrid } from "@/src/components/shared/CategorySelectorGrid";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { ItemsSection } from "@/src/components/transaction/ItemsSection";
import { InstallmentSelector } from "@/src/components/transaction/InstallmentSelector";
import { TX_TYPES, getCategoriesForType } from "@/src/constants/transactionCategories";
import type { TransactionStatus, RecurrenceType, CategoryGroup } from "@packages/events/src/types";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import * as Haptics from "expo-haptics";

interface TransactionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
  initialType?: "income" | "expense" | "transfer";
}

const STATUS_OPTIONS: { key: TransactionStatus; label: string; icon: string }[] = [
  { key: "confirmed", label: "Confirmado", icon: "check-circle" },
  { key: "pending",   label: "Pendente",   icon: "clock"        },
];

const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string }[] = [
  { key: "once",    label: "Unico"         },
  { key: "weekly",  label: "Semanal"       },
  { key: "monthly", label: "Mensal"        },
  { key: "yearly",  label: "Anual"         },
  { key: "custom",  label: "Personalizado" },
];

const SHEET_TRANSLATE = 700;

export function TransactionBottomSheet({ visible, onClose, theme, initialType }: TransactionBottomSheetProps) {
  const { domain } = useAppState();
  const insets = useSafeAreaInsets();
  const form = useTransactionForm(undefined, onClose);
  const tithe = useTitheCalculator();
  const accounts = Object.values(domain.accounts);

  useEffect(() => {
    if (visible) {
      soundManager.play("pop");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (initialType) form.setTxType(initialType);
    }
  }, [visible, initialType]);

  const handleClose = () => {
    soundManager.play("tap");
    onClose();
  };

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | undefined>();
  const [groupOverride, setGroupOverride] = useState<CategoryGroup | undefined>();

  const typeCats = getCategoriesForType(form.txType);
  const selectedCatId = typeCats[form.selectedCategory]?.id ?? typeCats[0]?.id ?? "";
  const isTithe = form.txType === "expense" && selectedCatId === "dizimo";

  // Auto-preenche o valor quando a calculadora de dízimo está ativa
  useEffect(() => {
    if (!isTithe) return;
    const amt = tithe.result?.amount;
    if (amt != null) form.setAmount(amt.toFixed(2).replace(".", ","));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTithe, tithe.result?.amount]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={s.flex}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)}
          style={s.overlay}
        >
          <Pressable style={s.flex} onPress={handleClose} />
        </Animated.View>
        <KeyboardSafeView
          style={s.flex}
        >
          <View style={s.spacer} pointerEvents="none" />
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(200)}
            exiting={SlideOutDown}
            style={[
              s.sheet,
              {
                backgroundColor: theme.cardBackground,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: theme.textColor }]}>Nova transacao</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Feather name="x" size={22} color={theme.secondaryText} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
            {/* Type */}
            <Text style={[s.label, { color: theme.secondaryText }]}>Tipo</Text>
            <View style={s.row}>
              {TX_TYPES.map((t) => {
                const active = form.txType === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? theme.primaryColor : theme.background,
                        borderColor: active ? theme.primaryColor : theme.border,
                      },
                    ]}
                    onPress={() => {
                      soundManager.play("tap");
                      form.setTxType(t.key);
                    }}
                  >
                    <Text style={[s.chipText, { color: active ? "#FFF" : theme.textColor }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Amount */}
            <Text style={[s.label, { color: theme.secondaryText }]}>
              {form.txType === "expense" && form.manualItems.length > 0
                ? "Total dos Itens (R$)"
                : "Valor (R$)"}
            </Text>
            {form.txType === "expense" && form.manualItems.length > 0 ? (
              <Text style={[s.computedAmount, { color: theme.primaryColor }]}>
                {form.itemsTotal.toFixed(2).replace(".", ",")}
              </Text>
            ) : (
              <TextInput
                style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                value={form.amount}
                onChangeText={form.setAmount}
                placeholder="0,00"
                placeholderTextColor={theme.secondaryText}
                keyboardType="decimal-pad"
              />
            )}

            {/* Items (expense only) */}
            {(form.txType === "expense" || form.manualItems.length > 0) && (
              <ItemsSection
                items={form.manualItems}
                theme={theme}
                onAddItem={form.handleAddItem}
                onRemoveItem={form.handleRemoveItem}
                onEditItemField={form.handleEditItemField}
              />
            )}

            {/* Description */}
            <Text style={[s.label, { color: theme.secondaryText }]}>Descricao (opcional)</Text>
            <TextInput
              style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
              value={form.description}
              onChangeText={form.setDescription}
              placeholder="Ex: Mercado, Salario..."
              placeholderTextColor={theme.secondaryText}
            />

            {/* Date */}
            <DatePickerField
              value={form.date}
              onChange={form.setDate}
              theme={theme}
              label="Data do lançamento"
            />

            {/* Category — filtered by type */}
            <Text style={[s.label, { color: theme.secondaryText }]}>Categoria</Text>
            <CategorySelectorGrid
              categories={typeCats}
              selectedId={selectedCatId}
              selectedSubcategoryId={selectedSubcategoryId}
              theme={theme}
              type={form.txType}
              onSelect={(id, subId) => {
                const idx = typeCats.findIndex((c) => c.id === id);
                if (idx !== -1) form.setSelectedCategory(idx);
                setSelectedSubcategoryId(subId);
                if (!subId) setGroupOverride(undefined);
              }}
              onGroupOverride={setGroupOverride}
              groupOverride={groupOverride}
            />

            {/* Tithe calculator — shown when "Dízimo / Oferta" is selected */}
            {isTithe && (
              <View style={[s.titheCard, { backgroundColor: theme.background, borderColor: "#A78BFA40" }]}>
                <View style={s.titheHeader}>
                  <Feather name="gift" size={14} color="#A78BFA" />
                  <Text style={[s.label, { color: "#A78BFA", marginBottom: 0, fontSize: 13 }]}>
                    Calculadora de Dizimo
                  </Text>
                </View>

                <Text style={[s.label, { color: theme.secondaryText, marginTop: 8, fontSize: 12 }]}>
                  Percentual (%)
                </Text>
                <TextInput
                  style={[s.titheInput, { color: theme.textColor, borderColor: theme.border }]}
                  defaultValue={tithe.percentage}
                  onChangeText={tithe.setPercentage}
                  onEndEditing={(e) => tithe.setPercentage(e.nativeEvent.text)}
                  placeholder="10"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="decimal-pad"
                />

                <Text style={[s.label, { color: theme.secondaryText, marginTop: 8, fontSize: 12 }]}>
                  Base
                </Text>
                <View style={s.titheChipRow}>
                  {(
                    [
                      { key: "gross" as const, label: "Bruta" },
                      { key: "net" as const,   label: "Liquida" },
                    ]
                  ).map(({ key, label }) => (
                    <Pressable
                      key={key}
                      style={[
                        s.titheChip,
                        tithe.baseType === key
                          ? { backgroundColor: "#A78BFA", borderColor: "#A78BFA" }
                          : { backgroundColor: "#A78BFA18", borderColor: "#A78BFA60" },
                      ]}
                      onPress={() => {
                          soundManager.play("tap");
                          tithe.setBaseType(key);
                        }}
                    >
                      <Text style={{ color: tithe.baseType === key ? "#FFF" : "#A78BFA", fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[s.label, { color: theme.secondaryText, marginTop: 8, fontSize: 12 }]}>
                  Periodo
                </Text>
                <View style={s.titheChipRow}>
                  {(
                    [
                      { key: "previous_month" as const, label: "Mes ant." },
                      { key: "current_month" as const,  label: "Mes atual" },
                      { key: "custom" as const,         label: "Custom" },
                    ]
                  ).map(({ key, label }) => (
                    <Pressable
                      key={key}
                      style={[
                        s.titheChip,
                        tithe.periodType === key
                          ? { backgroundColor: "#A78BFA", borderColor: "#A78BFA" }
                          : { backgroundColor: "#A78BFA18", borderColor: "#A78BFA60" },
                      ]}
                      onPress={() => {
                          soundManager.play("tap");
                          tithe.setPeriodType(key);
                        }}
                    >
                      <Text style={{ color: tithe.periodType === key ? "#FFF" : "#A78BFA", fontFamily: "DMSans_500Medium", fontSize: 11 }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {tithe.periodType === "custom" && (
                  <>
                    <Text style={[s.label, { color: theme.secondaryText, marginTop: 8, fontSize: 12 }]}>
                      Ultimos quantos dias?
                    </Text>
                    <TextInput
                      style={[s.titheInput, { color: theme.textColor, borderColor: theme.border }]}
                      defaultValue={tithe.customDays}
                      onChangeText={tithe.setCustomDays}
                      onEndEditing={(e) => tithe.setCustomDays(e.nativeEvent.text)}
                      placeholder="30"
                      placeholderTextColor={theme.secondaryText}
                      keyboardType="number-pad"
                    />
                  </>
                )}

                <View style={s.titheResult}>
                  <Feather name="zap" size={13} color="#A78BFA" />
                  <Text style={s.titheResultText}>
                    {tithe.result
                      ? tithe.result.base > 0
                        ? `R$ ${tithe.result.amount.toFixed(2).replace(".", ",")}  (base: R$ ${tithe.result.base.toFixed(2).replace(".", ",")})`
                        : "Base R$ 0,00 — sem receitas confirmadas no período"
                      : "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* Installments (expense only) */}
            {form.txType === "expense" && (
              <InstallmentSelector
                theme={theme}
                count={form.installmentCount}
                onChangeCount={form.setInstallmentCount}
                amountMode={form.installmentAmountMode}
                onChangeAmountMode={form.setInstallmentAmountMode}
                startFrom={form.installmentStartFrom}
                onChangeStartFrom={form.setInstallmentStartFrom}
                totalAmount={parseFloat(form.amount.replace(",", ".")) || 0}
              />
            )}

            {/* Account */}
            <AccountPicker
              accounts={accounts}
              selectedId={form.selectedAccountId || accounts[0]?.id || ""}
              theme={theme}
              onSelect={form.setSelectedAccountId}
            />

            {/* Transfer target */}
            {form.txType === "transfer" && (
              <>
                <Text style={[s.label, { color: theme.secondaryText }]}>Conta destino</Text>
                <AccountPicker
                  accounts={accounts.filter(
                    (a) => a.id !== (form.selectedAccountId || accounts[0]?.id),
                  )}
                  selectedId={form.targetAccountId}
                  theme={theme}
                  label="Destino"
                  onSelect={form.setTargetAccountId}
                />
              </>
            )}

            {/* Status */}
            <Text style={[s.label, { color: theme.secondaryText }]}>Status</Text>
            <View style={s.row}>
              {STATUS_OPTIONS.map((opt) => {
                const active = form.status === opt.key;
                const color = opt.key === "confirmed" ? theme.success : "#F59E0B";
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? `${color}18` : theme.background,
                        borderColor: active ? color : theme.border,
                      },
                    ]}
                    onPress={() => {
                      soundManager.play("tap");
                      form.setStatus(opt.key);
                    }}
                  >
                    <Feather name={opt.icon as any} size={13} color={active ? color : theme.secondaryText} />
                    <Text style={[s.chipText, { color: active ? color : theme.secondaryText }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Recurrence */}
            <Text style={[s.label, { color: theme.secondaryText }]}>Recorrencia</Text>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              {RECURRENCE_OPTIONS.map((opt) => {
                const active = form.recurrence === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? `${theme.primaryColor}18` : theme.background,
                        borderColor: active ? theme.primaryColor : theme.border,
                      },
                    ]}
                    onPress={() => {
                      soundManager.play("tap");
                      form.setRecurrence(opt.key);
                    }}
                  >
                    <Text
                      style={[
                        s.chipText,
                        { color: active ? theme.primaryColor : theme.secondaryText },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom recurrence days */}
            {form.recurrence === "custom" && (
              <>
                <Text style={[s.label, { color: theme.secondaryText }]}>Repetir a cada (dias)</Text>
                <TextInput
                  style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                  value={form.recurrenceDays}
                  onChangeText={form.setRecurrenceDays}
                  placeholder="Ex: 15"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="number-pad"
                />
              </>
            )}

            {/* Save button */}
            <Pressable
              style={[s.saveBtn, { backgroundColor: theme.primaryColor }]}
              onPress={form.handleSave}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={s.saveBtnText}>Salvar</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardSafeView>
    </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  spacer: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "85%",
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontFamily: "DMSans_700Bold", fontSize: 20 },
  body: { gap: 8, paddingBottom: 32 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 4 },
  input: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  computedAmount: { fontFamily: "DMSans_700Bold", fontSize: 32, textAlign: "center" as const, paddingVertical: 8 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  saveBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#FFF" },
  // Tithe calculator
  titheCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  titheHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  titheInput: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 6,
    marginBottom: 2,
  },
  titheChipRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  titheChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  titheResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#A78BFA18",
  },
  titheResultText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#A78BFA",
  },
});
