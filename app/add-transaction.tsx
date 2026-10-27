import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
} from "react-native";
import {
  KeyboardAwareScrollViewCompat,
  SCROLL_BOTTOM_PADDING,
} from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAppState } from "@/src/context/AppStateProvider";
import { useTransactionForm } from "@/src/hooks/useTransactionForm";
import { soundManager } from "@/src/services/SoundManager";
import { useTitheCalculator } from "@/src/hooks/useTitheCalculator";
import { ItemsSection } from "@/src/components/transaction/ItemsSection";
import { TitheCalculatorSection } from "@/src/components/transaction/TitheCalculatorSection";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { InstallmentSelector } from "@/src/components/transaction/InstallmentSelector";
import { SelectionModal } from "@/src/components/shared/SelectionModal";
import { ResponsiveContainer } from "@/src/ui/components/ResponsiveContainer";
import { ResponsiveRow } from "@/src/ui/components/ResponsiveRow";
import { ResponsiveColumn } from "@/src/ui/components/ResponsiveColumn";
import {
  TX_TYPES,
  getCategoriesForType,
  groupLabel,
} from "@/src/constants/transactionCategories";
import { GROUP_COLORS } from "@/src/constants/invoiceCategories";
import type { TransactionStatus, RecurrenceType } from "@packages/events/src/types";
import { createTransactionEvent } from "@packages/domain/src/transactions";
import { TButton, TInput } from "@/src/components/tamagui";
import { AppAlertScreenHost } from "@/src/components/shared/AppAlertHost";

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

function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const { txId } = useLocalSearchParams<{ txId?: string }>();
  const { domain, theme, dispatchDomainEvent } = useAppState();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const form = useTransactionForm(txId);
  const tithe = useTitheCalculator();
  const accounts = Object.values(domain.accounts);
  const defaultAccountId = form.selectedAccountId;
  const typeCats = getCategoriesForType(form.txType);
  const selectedCatId = typeCats[form.selectedCategory]?.id;
  const isTithe = form.txType === "expense" && selectedCatId === "dizimo";

  useEffect(() => {
    if (!isTithe) return;
    const amt = tithe.result?.amount;
    if (amt != null) form.setAmount(amt.toFixed(2).replace(".", ","));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTithe, tithe.result?.amount]);

  const handleCreateNext = () => {
    if (!form.editingTx) return;
    const base = form.editingTx;
    let nextDate = base.date;
    if (base.recurrence === "weekly") {
      const d = new Date(base.date);
      d.setDate(d.getDate() + 7);
      nextDate = d.toISOString().split("T")[0]!;
    } else if (base.recurrence === "monthly") {
      const d = new Date(base.date);
      d.setMonth(d.getMonth() + 1);
      nextDate = d.toISOString().split("T")[0]!;
    } else if (base.recurrence === "yearly") {
      const d = new Date(base.date);
      d.setFullYear(d.getFullYear() + 1);
      nextDate = d.toISOString().split("T")[0]!;
    }
    const events = createTransactionEvent({
      accountId: base.accountId,
      type: base.type,
      amount: base.amount,
      categoryId: base.categoryId,
      date: nextDate,
      description: base.description,
      targetAccountId: base.targetAccountId,
      status: "pending",
      recurrence: base.recurrence,
    });
    for (const evt of events) {
      dispatchDomainEvent(evt);
    }
    soundManager.play("success");
  };

  return (
    <>
    <KeyboardAwareScrollViewCompat
      style={[s.root, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + SCROLL_BOTTOM_PADDING },
      ]}
      showsVerticalScrollIndicator={false}
    >
        <ResponsiveContainer>
        {/* Header */}
        <View style={s.topRow}>
          <Pressable onPress={form.handleDelete} hitSlop={12} style={{ opacity: txId ? 1 : 0 }}>
            <Feather name="trash-2" size={22} color={theme.danger} />
          </Pressable>
          <Text style={[s.pageTitle, { color: theme.textColor }]}>
            {txId ? "Editar transação" : "Nova Transação"}
          </Text>
          <Pressable onPress={form.handleSave} hitSlop={12}>
            <Feather name="check" size={24} color={theme.primaryColor} />
          </Pressable>
        </View>

        {/* Type selector */}
        <View style={s.typeRow}>
          {TX_TYPES.map((t) => (
            <Pressable
              key={t.key}
              style={[
                s.typeBtn,
                {
                  backgroundColor: form.txType === t.key ? theme.primaryColor : theme.cardBackground,
                  borderColor: form.txType === t.key ? theme.primaryColor : theme.border,
                },
              ]}
              onPress={() => {
                soundManager.play("tap");
                form.setTxType(t.key);
              }}
            >
              <Feather
                name={t.icon as any}
                size={16}
                color={form.txType === t.key ? "#FFF" : theme.secondaryText}
              />
              <Text
                style={[s.typeBtnText, { color: form.txType === t.key ? "#FFF" : theme.textColor }]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Amount */}
        <View style={[s.amountCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[s.amountLabel, { color: theme.secondaryText }]}>
            {form.txType === "expense" && form.manualItems.length > 0
              ? "Total dos Itens (R$)"
              : "Valor (R$)"}
          </Text>
          {form.txType === "expense" && form.manualItems.length > 0 ? (
            <Text style={[s.amountValue, { color: theme.primaryColor }]}>
              {form.itemsTotal.toFixed(2).replace(".", ",")}
            </Text>
          ) : (
            <TInput
              value={form.amount}
              onChangeText={form.setAmount}
              placeholder="0,00"
              keyboardType="decimal-pad"
              autoFocus
              fontFamily="$body"
              fontWeight="700"
              fontSize={40}
              textAlign="center"
              width="100%"
              height="auto"
              borderWidth={0}
              background="transparent"
              paddingHorizontal={0}
              color={theme.textColor}
            />
          )}
        </View>

        {/* Items section */}
        {(form.txType === "expense" || form.manualItems.length > 0) && (
          <ItemsSection
            items={form.manualItems}
            theme={theme}
            onAddItem={form.handleAddItem}
            onRemoveItem={form.handleRemoveItem}
            onEditItemField={form.handleEditItemField}
          />
        )}

        <ResponsiveRow>
          <ResponsiveColumn>
            {/* Description */}
            <View style={[s.card, { backgroundColor: theme.cardBackground, marginBottom: 16 }]}>
              <Text style={[s.label, { color: theme.secondaryText }]}>Descrição</Text>
              <TInput
                value={form.description}
                onChangeText={form.setDescription}
                placeholder="Ex: Supermercado"
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
              />
            </View>

            {/* Date picker */}
            <View style={{ marginBottom: 16 }}>
              <DatePickerField
                value={form.date}
                onChange={form.setDate}
                theme={theme}
                label="Data do lançamento"
              />
            </View>
          </ResponsiveColumn>

          <ResponsiveColumn>
            {/* Account picker */}
            <View style={{ marginBottom: 16 }}>
              <AccountPicker
                accounts={accounts}
                selectedId={defaultAccountId}
                theme={theme}
                label="Conta de origem"
                onSelect={form.setSelectedAccountId}
                compact={form.txType === "transfer"}
              />
            </View>

            {/* Transfer target account */}
            {form.txType === "transfer" && accounts.length > 1 && (
              <View style={{ marginBottom: 16 }}>
                <AccountPicker
                  accounts={accounts.filter((a) => a.id !== defaultAccountId)}
                  selectedId={form.targetAccountId}
                  theme={theme}
                  label="Conta de destino"
                  onSelect={form.setTargetAccountId}
                  compact
                />
              </View>
            )}

            {/* Return date toggle (transfer only) */}
            {form.txType === "transfer" && (
              <View style={{ marginBottom: 16, gap: 10 }}>
                <Pressable
                  style={[s.chip, {
                    backgroundColor: form.returnDate ? `${theme.warning}18` : theme.cardBackground,
                    borderColor: form.returnDate ? theme.warning : theme.border,
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                  }]}
                  onPress={() => {
                    soundManager.play("tap");
                    if (form.returnDate) {
                      form.setReturnDate("");
                    } else {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      form.setReturnDate(d.toISOString().split("T")[0]!);
                    }
                  }}
                >
                  <Feather name="corner-up-left" size={15} color={form.returnDate ? theme.warning : theme.secondaryText} />
                  <Text style={{ color: form.returnDate ? theme.warning : theme.secondaryText, fontFamily: "DMSans_500Medium", fontSize: 14 }}>
                    {form.returnDate ? "Com devolução" : "Sem devolução"}
                  </Text>
                </Pressable>
                {!!form.returnDate && (
                  <DatePickerField
                    value={form.returnDate}
                    onChange={form.setReturnDate}
                    theme={theme}
                    label="Data de devolução"
                  />
                )}
              </View>
            )}
          </ResponsiveColumn>
        </ResponsiveRow>

        <ResponsiveRow>
          <ResponsiveColumn>
            {/* Category grid */}
            <View style={[s.card, { backgroundColor: theme.cardBackground, marginBottom: 16 }]}>
              <Text style={[s.label, { color: theme.secondaryText }]}>
                Categoria ({groupLabel((typeCats[form.selectedCategory] ?? typeCats[0]!).group)})
              </Text>
              <View style={s.categoryGrid}>
                {typeCats.map((cat, i) => {
                  const color = GROUP_COLORS[cat.group] ?? theme.primaryColor;
                  const active = form.selectedCategory === i;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        s.catChip,
                        {
                          backgroundColor: active ? `${color}18` : theme.background,
                          borderColor: active ? color : theme.border,
                        },
                      ]}
                      onPress={() => {
                        soundManager.play("tap");
                        form.setSelectedCategory(i);
                      }}
                    >
                      <Feather
                        name={cat.icon as any}
                        size={14}
                        color={active ? color : theme.secondaryText}
                      />
                      <Text style={[s.catChipText, { color: active ? color : theme.textColor }]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Tithe calculator */}
            {isTithe && (
              <View style={{ marginBottom: 16 }}>
                <TitheCalculatorSection
                  theme={theme}
                  percentage={tithe.percentage}
                  setPercentage={tithe.setPercentage}
                  baseType={tithe.baseType}
                  setBaseType={tithe.setBaseType}
                  periodType={tithe.periodType}
                  setPeriodType={tithe.setPeriodType}
                  customDays={tithe.customDays}
                  setCustomDays={tithe.setCustomDays}
                  result={tithe.result}
                />
              </View>
            )}

            {/* Installments (expense only, new transactions) */}
            {form.txType === "expense" && !txId && (
              <View style={{ marginBottom: 16 }}>
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
              </View>
            )}
          </ResponsiveColumn>

          <ResponsiveColumn>
            {/* Status */}
            <View style={[s.card, { backgroundColor: theme.cardBackground, marginBottom: 16 }]}>
              <Text style={[s.label, { color: theme.secondaryText }]}>Status</Text>
              <View style={s.chipRow}>
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
                      <Feather name={opt.icon as any} size={14} color={active ? color : theme.secondaryText} />
                      <Text style={[s.chipText, { color: active ? color : theme.textColor }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Recurrence */}
            <View style={[s.card, { backgroundColor: theme.cardBackground, marginBottom: 16 }]}>
              <Text style={[s.label, { color: theme.secondaryText }]}>Recorrência</Text>
              <View style={s.chipRow}>
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
                      <Text style={[s.chipText, { color: active ? theme.primaryColor : theme.textColor }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Custom recurrence days */}
            {form.recurrence === "custom" && (
              <View style={[s.card, { backgroundColor: theme.cardBackground, marginBottom: 16 }]}>
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
              </View>
            )}
          </ResponsiveColumn>
        </ResponsiveRow>

        {/* Criar proxima */}
        {txId && form.editingTx?.recurrence && form.editingTx.recurrence !== "once" && (
          <TButton variant="outline" borderColor={theme.border} color={theme.textColor} icon={<Feather name="repeat" size={16} color={theme.primaryColor} />} onPress={handleCreateNext}>
            Criar próxima
          </TButton>
        )}

        {/* Save button */}
        <View style={{ marginTop: 8 }}>
          <TButton variant="primary" backgroundColor={theme.primaryColor} icon={<Feather name="check" size={20} color="#FFF" />} onPress={form.handleSave}>
            {txId ? "Atualizar transação" : "Salvar transação"}
          </TButton>
        </View>

        {/* Delete button */}
        {txId && (
          <View style={{ marginTop: 8 }}>
            <TButton variant="danger" backgroundColor={theme.danger ?? "#DC2626"} icon={<Feather name="trash-2" size={18} color="#FFF" />} onPress={form.handleDelete}>
              Excluir transação
            </TButton>
          </View>
        )}
        </ResponsiveContainer>
      </KeyboardAwareScrollViewCompat>

      {/* Installment group save modal */}
      <SelectionModal
        visible={form.installmentModal === "save"}
        title="Aplicar alterações"
        subtitle="Esta transação faz parte de um parcelamento"
        options={[
          { label: "Somente esta parcela", icon: "edit-2", onPress: form.handleInstallmentSaveOne },
          { label: "Esta e futuras", icon: "fast-forward", onPress: form.handleInstallmentSaveFuture },
          { label: "Todas as parcelas", icon: "layers", onPress: form.handleInstallmentSaveAll },
        ]}
        onCancel={() => form.setInstallmentModal(null)}
        theme={theme}
      />

      {/* Installment group delete modal */}
      <SelectionModal
        visible={form.installmentModal === "delete"}
        title="Excluir parcela"
        subtitle="Esta transação faz parte de um parcelamento"
        options={[
          { label: "Somente esta parcela", icon: "trash-2", color: theme.danger, onPress: form.handleInstallmentDeleteOne },
          { label: "Esta e futuras", icon: "fast-forward", color: theme.danger, onPress: form.handleInstallmentDeleteFuture },
          { label: "Todas as parcelas", icon: "layers", color: theme.danger, onPress: form.handleInstallmentDeleteAll },
        ]}
        onCancel={() => form.setInstallmentModal(null)}
        theme={theme}
      />
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  pageTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 18 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  amountCard: { borderRadius: 20, padding: 20, alignItems: "center" },
  amountLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, marginBottom: 8 },
  amountValue: { fontFamily: "DMSans_700Bold", fontSize: 40, textAlign: "center" },
  card: { borderRadius: 20, padding: 20 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  chipText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catChipText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
});

/** Tela com `presentation: "modal"`: tem o próprio host do alerta customizado (ver src/services/appAlert.ts). */
export default function AddTransactionScreenRoute() {
  return (
    <>
      <AddTransactionScreen />
      <AppAlertScreenHost />
    </>
  );
}
