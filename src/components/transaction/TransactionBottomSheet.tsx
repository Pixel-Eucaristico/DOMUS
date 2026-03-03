import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { useTransactionForm } from "@/src/hooks/useTransactionForm";
import { useTitheCalculator } from "@/src/hooks/useTitheCalculator";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { CategoryChipScroll } from "@/src/components/shared/CategoryChipScroll";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { ItemsSection } from "@/src/components/transaction/ItemsSection";
import { TX_TYPES, getCategoriesForType } from "@/src/constants/transactionCategories";
import type { TransactionStatus, RecurrenceType } from "@packages/events/src/types";
import { useAppState } from "@/src/context/AppStateProvider";

interface TransactionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
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

export function TransactionBottomSheet({ visible, onClose, theme }: TransactionBottomSheetProps) {
  const { domain } = useAppState();
  const insets = useSafeAreaInsets();
  const form = useTransactionForm(undefined, onClose);
  const tithe = useTitheCalculator();
  const accounts = Object.values(domain.accounts);

  // Sheet slides up; overlay is static (no sliding dark bg)
  const slideAnim = useRef(new Animated.Value(SHEET_TRANSLATE)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 280,
          mass: 0.85,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_TRANSLATE);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const typeCats = getCategoriesForType(form.txType);
  const selectedCatId = typeCats[form.selectedCategory]?.id ?? typeCats[0]?.id ?? "";
  const isTithe = form.txType === "expense" && selectedCatId === "dizimo";

  // Auto-preenche o valor quando a calculadora de dízimo está ativa
  useEffect(() => {
    if (!isTithe || !tithe.result) return;
    form.setAmount(tithe.result.amount.toFixed(2).replace(".", ","));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTithe, tithe.result]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={s.flex}>
        <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
          <Pressable style={s.flex} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
        >
          <View style={s.spacer} pointerEvents="none" />
          <Animated.View
            style={[
              s.sheet,
              {
                backgroundColor: theme.cardBackground,
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: theme.textColor }]}>Nova transacao</Text>
            <Pressable onPress={onClose} hitSlop={12}>
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
                    onPress={() => form.setTxType(t.key)}
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
            <CategoryChipScroll
              categories={typeCats}
              selectedId={selectedCatId}
              theme={theme}
              onSelect={(id) => {
                const idx = typeCats.findIndex((c) => c.id === id);
                if (idx !== -1) form.setSelectedCategory(idx);
              }}
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
                  value={tithe.percentage}
                  onChangeText={tithe.setPercentage}
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
                      onPress={() => tithe.setBaseType(key)}
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
                      onPress={() => tithe.setPeriodType(key)}
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
                      value={tithe.customDays}
                      onChangeText={tithe.setCustomDays}
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
                      ? `R$ ${tithe.result.amount.toFixed(2).replace(".", ",")}  (base: R$ ${tithe.result.base.toFixed(2).replace(".", ",")})`
                      : "—"}
                  </Text>
                </View>
              </View>
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
                    onPress={() => form.setStatus(opt.key)}
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
                    onPress={() => form.setRecurrence(opt.key)}
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
      </KeyboardAvoidingView>
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
