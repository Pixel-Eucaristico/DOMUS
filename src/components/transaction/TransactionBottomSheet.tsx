import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
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
import type { TransactionStatus, RecurrenceType } from "@packages/events/src/types";
import { useAppState } from "@/src/context/AppStateProvider";
import { InfoTip } from "@/src/components/shared/InfoTip";
import { soundManager } from "@/src/services/SoundManager";
import * as Haptics from "expo-haptics";
import { TButton, TInput } from "@/src/components/tamagui";
import { AppAlertHost } from "@/src/components/shared/AppAlertHost";

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
  { key: "once",    label: "Único"         },
  { key: "weekly",  label: "Semanal"       },
  { key: "monthly", label: "Mensal"        },
  { key: "yearly",  label: "Anual"         },
  { key: "custom",  label: "Personalizado" },
];

const { height } = Dimensions.get("window");

export function TransactionBottomSheet({ visible, onClose, theme, initialType }: TransactionBottomSheetProps) {
  const { domain } = useAppState();
  const insets = useSafeAreaInsets();
  const form = useTransactionForm(undefined, onClose);
  const tithe = useTitheCalculator();
  const accounts = Object.values(domain.accounts);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      soundManager.play("pop");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (initialType) form.setTxType(initialType);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deve rodar só na abertura do sheet; 'form' é recriado a cada render e reexecutar repetiria som/háptica/animação
  }, [visible, initialType]);

  const handleClose = () => {
    soundManager.play("tap");
    onClose();
  };

  // Subcategoria e override de grupo vivem no form para serem persistidos no save
  const selectedSubcategoryId = form.subcategoryId;
  const setSelectedSubcategoryId = form.setSubcategoryId;
  const groupOverride = form.groupOverride;
  const setGroupOverride = form.setGroupOverride;

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
          style={[s.overlay, { opacity: fadeAnim }]}
        >
          <Pressable style={s.flex} onPress={handleClose} />
        </Animated.View>
        <KeyboardSafeView
          style={s.flex}
        >
          <View style={s.spacer} pointerEvents="none" />
          <Animated.View
            style={[
              s.sheet,
              {
                backgroundColor: theme.cardBackground,
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: theme.textColor }]}>Nova Transação</Text>
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
              <TInput
                value={form.amount}
                onChangeText={form.setAmount}
                placeholder="0,00"
                keyboardType="decimal-pad"
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
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
            <Text style={[s.label, { color: theme.secondaryText }]}>Descrição (opcional)</Text>
            <TInput
              value={form.description}
              onChangeText={form.setDescription}
              placeholder="Ex: Mercado, Salário..."
              color={theme.textColor}
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
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
                    Calculadora de Dízimo
                  </Text>
                </View>

                <Text style={[s.label, { color: theme.secondaryText, marginTop: 8, fontSize: 12 }]}>
                  Percentual (%)
                </Text>
                <TInput
                  defaultValue={tithe.percentage}
                  onChangeText={tithe.setPercentage}
                  onEndEditing={(e: any) => tithe.setPercentage(e.nativeEvent.text)}
                  placeholder="10"
                  keyboardType="decimal-pad"
                  color={theme.textColor}
                  backgroundColor={theme.cardBackground}
                  borderColor={theme.border}
                />

                <Text style={[s.label, { color: theme.secondaryText, marginTop: 8, fontSize: 12 }]}>
                  Base
                </Text>
                <View style={s.titheChipRow}>
                  {(
                    [
                      { key: "gross" as const, label: "Bruta" },
                      { key: "net" as const,   label: "Líquida" },
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
                  Período
                </Text>
                <View style={s.titheChipRow}>
                  {(
                    [
                      { key: "previous_month" as const, label: "Mês ant." },
                      { key: "current_month" as const,  label: "Mês atual" },
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
                      Últimos quantos dias?
                    </Text>
                    <TInput
                      defaultValue={tithe.customDays}
                      onChangeText={tithe.setCustomDays}
                      onEndEditing={(e: any) => tithe.setCustomDays(e.nativeEvent.text)}
                      placeholder="30"
                      keyboardType="number-pad"
                      color={theme.textColor}
                      backgroundColor={theme.cardBackground}
                      borderColor={theme.border}
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
              selectedId={form.selectedAccountId}
              theme={theme}
              label="Conta de origem"
              onSelect={form.setSelectedAccountId}
              compact={form.txType === "transfer"}
            />

            {/* Transfer target */}
            {form.txType === "transfer" && (
              <>
                <AccountPicker
                  accounts={accounts.filter((a) => a.id !== form.selectedAccountId)}
                  selectedId={form.targetAccountId}
                  theme={theme}
                  label="Conta de destino"
                  onSelect={form.setTargetAccountId}
                  compact
                />
                {/* Return date toggle */}
                <View style={s.row}>
                  <Pressable
                    style={[
                      s.chip,
                      {
                        backgroundColor: form.returnDate ? `${theme.warning}18` : theme.background,
                        borderColor: form.returnDate ? theme.warning : theme.border,
                      },
                    ]}
                    onPress={() => {
                      soundManager.play("tap");
                      if (form.returnDate) {
                        form.setReturnDate("");
                      } else {
                        // default to 30 days from now
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        form.setReturnDate(d.toISOString().split("T")[0]!);
                      }
                    }}
                  >
                    <Feather name="corner-up-left" size={13} color={form.returnDate ? theme.warning : theme.secondaryText} />
                    <Text style={[s.chipText, { color: form.returnDate ? theme.warning : theme.secondaryText }]}>
                      Com devolução
                    </Text>
                  </Pressable>
                </View>
                {!!form.returnDate && (
                  <DatePickerField
                    value={form.returnDate}
                    onChange={form.setReturnDate}
                    theme={theme}
                    label="Data de devolução"
                  />
                )}
              </>
            )}

            {/* CDB Dividend toggle — only for income on savings account */}
            {form.txType === "income" &&
              domain.accounts[form.selectedAccountId]?.type === "savings" &&
              domain.accounts[form.selectedAccountId]?.linkedCreditCardId && (
                <View style={[s.row, { alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }]}>
                  <View style={s.labelWithTip}>
                    <Text style={[s.label, { color: theme.secondaryText, marginBottom: 0 }]}>É dividendo/rendimento</Text>
                    <InfoTip
                      size={13}
                      title="Dividendo ou rendimento"
                      content="Marque quando esta receita for rendimento do CDB vinculado ao cartão. Ela entra no saldo da conta, mas não aumenta o crédito adicional do cartão, que vem só do valor que você depositou."
                    />
                  </View>
                  <Switch
                    value={form.isCdbDividend}
                    onValueChange={(v) => {
                      soundManager.play("tap");
                      form.setIsCdbDividend(v);
                    }}
                    trackColor={{ false: theme.border, true: `${theme.primaryColor}80` }}
                    thumbColor={form.isCdbDividend ? theme.primaryColor : theme.secondaryText}
                  />
                </View>
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
            <Text style={[s.label, { color: theme.secondaryText }]}>Recorrência</Text>
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
                <TInput
                  value={form.recurrenceDays}
                  onChangeText={form.setRecurrenceDays}
                  placeholder="Ex: 15"
                  keyboardType="number-pad"
                  color={theme.textColor}
                  backgroundColor={theme.cardBackground}
                  borderColor={theme.border}
                />
              </>
            )}

            {/* Save button */}
            <TButton
              variant="primary"
              backgroundColor={theme.primaryColor}
              icon={<Feather name="check" size={18} color="#FFF" />}
              onPress={form.handleSave}
              marginTop={12}
            >
              Salvar
            </TButton>
          </ScrollView>
        </Animated.View>
      </KeyboardSafeView>
    </View>
    {/* Alerta customizado por cima deste Modal (ver src/services/appAlert.ts) */}
    <AppAlertHost />
    </Modal>
  );
}

const s = StyleSheet.create({
  labelWithTip: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
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
