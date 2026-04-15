import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Platform,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { createAccountEvent, updateAccountEvent, deleteAccountEvent } from "@packages/domain/src/accounts";
import { createEvent } from "@packages/events/src/factory";
import { EVENT_TYPES } from "@packages/events/src/types";
import type { TransactionUpdatedEvent } from "@packages/events/src/types";
import { soundManager } from "@/src/services/SoundManager";
import { TButton, TInput } from "@/src/components/tamagui";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { AccountPayload, AccountType } from "@packages/events/src/types";
import { ACCOUNT_TYPES } from "@/src/components/shared/AccountCard";
import { URGENCY_ORDER } from "@packages/wishlist";

interface AccountFormModalProps {
  visible: boolean;
  editingAccount: AccountPayload | null;
  theme: any;
  domain: any;
  wishlist: any;
  dispatchDomainEvent: (event: any) => void;
  onClose: () => void;
}

export function AccountFormModal({
  visible,
  editingAccount,
  theme,
  domain,
  wishlist,
  dispatchDomainEvent,
  onClose,
}: AccountFormModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [accType, setAccType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [savingsGoalEnabled, setSavingsGoalEnabled] = useState(false);
  const [savingsContribution, setSavingsContribution] = useState("");
  const [savingsRecurrence, setSavingsRecurrence] = useState<"monthly" | "biweekly" | "weekly">("monthly");
  const [contributionDay, setContributionDay] = useState("1");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transferAccountId, setTransferAccountId] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (editingAccount) {
        setName(editingAccount.name);
        setAccType(editingAccount.type);
        setBalance(editingAccount.type !== "credit_card" ? editingAccount.balance.toString() : "");
        setCreditLimit(editingAccount.creditLimit?.toString() ?? "");
        setClosingDay(editingAccount.closingDay?.toString() ?? "");
        setDueDay(editingAccount.dueDay?.toString() ?? "");
        setSavingsGoalEnabled(editingAccount.savingsGoalEnabled ?? false);
        setSavingsContribution(editingAccount.savingsContributionAmount?.toString() ?? "");
        setSavingsRecurrence(editingAccount.contributionRecurrence ?? "monthly");
        setContributionDay(editingAccount.contributionDay?.toString() ?? "1");
      } else {
        setName("");
        setBalance("");
        setCreditLimit("");
        setClosingDay("");
        setDueDay("");
        setAccType("checking");
        setSavingsGoalEnabled(false);
        setSavingsContribution("");
        setSavingsRecurrence("monthly");
        setContributionDay("1");
      }
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 280, mass: 0.8, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, editingAccount]);

  const animateClose = useCallback(
    (callback: () => void) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        callback();
        slideAnim.setValue(600);
        fadeAnim.setValue(0);
      });
    },
    [fadeAnim, slideAnim],
  );

  const closeModal = useCallback(() => {
    animateClose(onClose);
  }, [animateClose, onClose]);

  const linkedWishlistItems = useMemo(() => {
    if (!editingAccount?.id || !savingsGoalEnabled) return [];
    const allItems = Object.values(wishlist?.items ?? {}) as any[];
    return allItems
      .filter((i) => i.savingsGoal?.enabled && i.savingsGoal.linkedAccountId === editingAccount.id)
      .sort(
        (a, b) => URGENCY_ORDER.indexOf(a.urgencyLevel) - URGENCY_ORDER.indexOf(b.urgencyLevel),
      );
  }, [editingAccount, savingsGoalEnabled, wishlist]);

  const handleSaveAccount = () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome da conta.");
      return;
    }

    const balanceNum = parseFloat(balance.replace(",", ".")) || 0;
    const limitNum = parseFloat(creditLimit.replace(",", ".")) || undefined;
    const closingDayNum = parseInt(closingDay, 10) || undefined;
    const dueDayNum = parseInt(dueDay, 10) || undefined;
    const contributionNum =
      accType === "savings" && savingsGoalEnabled
        ? parseFloat(savingsContribution.replace(",", ".")) || undefined
        : undefined;
    const contributionDayNum =
      accType === "savings" && savingsGoalEnabled && savingsRecurrence === "monthly"
        ? Math.min(Math.max(parseInt(contributionDay, 10) || 1, 1), 28)
        : undefined;

    if (editingAccount) {
      const event = updateAccountEvent(editingAccount.id, {
        name: name.trim(),
        type: accType,
        balance: accType === "credit_card" ? undefined : balanceNum,
        creditLimit: accType === "credit_card" ? limitNum : undefined,
        closingDay: accType === "credit_card" ? closingDayNum : undefined,
        dueDay: accType === "credit_card" ? dueDayNum : undefined,
        savingsGoalEnabled: accType === "savings" ? savingsGoalEnabled : undefined,
        savingsContributionAmount: contributionNum,
        contributionRecurrence: accType === "savings" && savingsGoalEnabled ? savingsRecurrence : undefined,
        contributionDay: contributionDayNum,
      });
      dispatchDomainEvent(event);
    } else {
      const event = createAccountEvent({
        name: name.trim(),
        type: accType,
        balance: accType === "credit_card" ? 0 : balanceNum,
        creditLimit: accType === "credit_card" ? limitNum : undefined,
        closingDay: accType === "credit_card" ? closingDayNum : undefined,
        dueDay: accType === "credit_card" ? dueDayNum : undefined,
        savingsGoalEnabled: accType === "savings" ? savingsGoalEnabled : undefined,
        savingsContributionAmount: contributionNum,
        contributionRecurrence: accType === "savings" && savingsGoalEnabled ? savingsRecurrence : undefined,
        contributionDay: contributionDayNum,
      });
      dispatchDomainEvent(event);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    soundManager.play("success");
    closeModal();
  };

  const otherAccounts = useMemo(() => {
    if (!editingAccount) return [] as AccountPayload[];
    return (Object.values(domain.accounts) as AccountPayload[]).filter(
      (a) => a.id !== editingAccount.id && a.type !== "credit_card",
    );
  }, [domain.accounts, editingAccount]);

  const accountTransactions = useMemo(() => {
    if (!editingAccount) return [];
    return Object.values(domain.transactions).filter(
      (t: any) => t.accountId === editingAccount.id,
    );
  }, [domain.transactions, editingAccount]);

  const handleDeleteAccount = useCallback(() => {
    if (!editingAccount) return;

    // Transfer transactions if a target account was selected
    if (transferAccountId) {
      for (const tx of accountTransactions) {
        const updateEvent = createEvent<TransactionUpdatedEvent>(
          EVENT_TYPES.TRANSACTION_UPDATED,
          { id: (tx as any).id, accountId: transferAccountId },
          "local",
        );
        dispatchDomainEvent(updateEvent);
      }
    }

    // Delete the account
    const deleteEvent = deleteAccountEvent(editingAccount.id);
    dispatchDomainEvent(deleteEvent);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    soundManager.play("trash");
    setShowDeleteConfirm(false);
    setTransferAccountId(null);
    closeModal();
  }, [editingAccount, transferAccountId, accountTransactions, dispatchDomainEvent, closeModal]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeModal}>
      <View style={s.modalRoot}>
        <Animated.View style={[s.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable
            style={s.flex}
            onPress={() => {
              soundManager.play("tap");
              closeModal();
            }}
          />
        </Animated.View>

        <KeyboardSafeView
          style={s.modalRoot}
        >
          <View style={s.flex} pointerEvents="none" />
          <Animated.View
            style={[
              s.modalContent,
              {
                backgroundColor: theme.cardBackground,
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            <View style={[s.handle, { backgroundColor: theme.border }]} />

            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.textColor }]}>
                {editingAccount ? "Editar conta" : "Nova conta"}
              </Text>
              <Pressable
                onPress={() => {
                  soundManager.play("tap");
                  closeModal();
                }}
                hitSlop={12}
              >
                <Feather name="x" size={22} color={theme.secondaryText} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>Nome</Text>
              <TInput
                value={name}
                onChangeText={setName}
                placeholder="Ex: Nubank"
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
              />

              <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>Tipo</Text>
              <View style={s.typePicker}>
                {ACCOUNT_TYPES.map((t) => {
                  const selected = accType === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      style={[
                        s.typeChip,
                        selected
                          ? { backgroundColor: t.color, borderColor: t.color }
                          : { backgroundColor: t.color + "18", borderColor: t.color + "60" },
                      ]}
                      onPress={() => {
                        soundManager.play("tap");
                        setAccType(t.key);
                      }}
                    >
                      <Feather name={t.icon as any} size={13} color={selected ? "#FFF" : t.color} />
                      <Text style={[s.typeChipText, { color: selected ? "#FFF" : t.color }]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {accType !== "credit_card" ? (
                <>
                  <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>Saldo inicial (R$)</Text>
                  <TInput
                    value={balance}
                    onChangeText={setBalance}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                </>
              ) : (
                <>
                  <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>Limite do cartão (R$)</Text>
                  <TInput
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                    placeholder="5000,00"
                    keyboardType="decimal-pad"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                  <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>Dia de fechamento (ex: 10)</Text>
                  <TInput
                    value={closingDay}
                    onChangeText={setClosingDay}
                    placeholder="10"
                    keyboardType="number-pad"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                  <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>Dia de vencimento (ex: 15)</Text>
                  <TInput
                    value={dueDay}
                    onChangeText={setDueDay}
                    placeholder="15"
                    keyboardType="number-pad"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                </>
              )}

              {accType === "savings" && (
                <SavingsGoalSection
                  theme={theme}
                  savingsGoalEnabled={savingsGoalEnabled}
                  onToggle={setSavingsGoalEnabled}
                  savingsRecurrence={savingsRecurrence}
                  onRecurrenceChange={setSavingsRecurrence}
                  savingsContribution={savingsContribution}
                  onContributionChange={setSavingsContribution}
                  contributionDay={contributionDay}
                  onContributionDayChange={setContributionDay}
                  editingAccountId={editingAccount?.id ?? null}
                  linkedWishlistItems={linkedWishlistItems}
                  editingAccountBalance={editingAccount?.balance ?? 0}
                />
              )}

              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <TButton
                  variant="primary"
                  backgroundColor={theme.primaryColor}
                  icon={<Feather name="check" size={18} color="#FFF" />}
                  onPress={handleSaveAccount}
                >
                  {editingAccount ? "Salvar" : "Criar conta"}
                </TButton>
              </View>

              {editingAccount && (
                <View style={{ marginBottom: 8 }}>
                  <TButton
                    variant="danger"
                    backgroundColor={theme.danger ?? "#DC2626"}
                    icon={<Feather name="trash-2" size={15} color="#FFF" />}
                    onPress={() => {
                      soundManager.play("tap");
                      setTransferAccountId(null);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    Excluir conta
                  </TButton>
                </View>
              )}
            </ScrollView>

            {/* Delete confirmation modal */}
            <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
              <View style={s.deleteOverlay}>
                <View style={[s.deleteCard, { backgroundColor: theme.cardBackground }]}>
                  <Feather name="alert-triangle" size={36} color="#DC2626" style={{ alignSelf: "center" }} />
                  <Text style={[s.deleteTitle, { color: theme.textColor }]}>
                    Excluir "{editingAccount?.name}"?
                  </Text>

                  {accountTransactions.length > 0 ? (
                    <>
                      <Text style={[s.deleteDesc, { color: theme.secondaryText }]}>
                        Esta conta possui {accountTransactions.length} transaç{accountTransactions.length === 1 ? "ão" : "ões"}.
                        Você pode transferi-las para outra conta ou perder todos os dados.
                      </Text>

                      <Text style={[s.deleteFieldLabel, { color: theme.secondaryText }]}>
                        Transferir transações para:
                      </Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.deleteAccountScroll}>
                        <Pressable
                          style={[
                            s.deleteAccountChip,
                            {
                              backgroundColor: transferAccountId === null ? "#DC262620" : theme.background,
                              borderColor: transferAccountId === null ? "#DC2626" : theme.border,
                            },
                          ]}
                          onPress={() => { soundManager.play("tap"); setTransferAccountId(null); }}
                        >
                          <Feather name="x" size={12} color={transferAccountId === null ? "#DC2626" : theme.secondaryText} />
                          <Text style={{ color: transferAccountId === null ? "#DC2626" : theme.secondaryText, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
                            Não transferir (perder dados)
                          </Text>
                        </Pressable>
                        {otherAccounts.map((acc) => {
                          const selected = transferAccountId === acc.id;
                          return (
                            <Pressable
                              key={acc.id}
                              style={[
                                s.deleteAccountChip,
                                {
                                  backgroundColor: selected ? (acc.color ?? theme.primaryColor) + "20" : theme.background,
                                  borderColor: selected ? (acc.color ?? theme.primaryColor) : theme.border,
                                },
                              ]}
                              onPress={() => { soundManager.play("tap"); setTransferAccountId(acc.id); }}
                            >
                              <Feather name="credit-card" size={12} color={selected ? (acc.color ?? theme.primaryColor) : theme.secondaryText} />
                              <Text style={{ color: selected ? (acc.color ?? theme.primaryColor) : theme.textColor, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
                                {acc.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </>
                  ) : (
                    <Text style={[s.deleteDesc, { color: theme.secondaryText }]}>
                      Esta conta não possui transações. Ela será excluída permanentemente.
                    </Text>
                  )}

                  <View style={s.deleteActions}>
                    <TButton
                      variant="outline"
                      flex={1}
                      borderColor={theme.border}
                      color={theme.textColor}
                      onPress={() => { soundManager.play("tap"); setShowDeleteConfirm(false); }}
                    >
                      Cancelar
                    </TButton>
                    <TButton
                      variant="danger"
                      flex={1}
                      backgroundColor={theme.danger ?? "#DC2626"}
                      icon={<Feather name="trash-2" size={14} color="#FFF" />}
                      onPress={handleDeleteAccount}
                    >
                      {transferAccountId ? "Transferir e excluir" : "Excluir"}
                    </TButton>
                  </View>
                </View>
              </View>
            </Modal>
          </Animated.View>
        </KeyboardSafeView>
      </View>
    </Modal>
  );
}

// ── Savings goal section (inline, only used here) ────────────────────────────

function SavingsGoalSection({
  theme,
  savingsGoalEnabled,
  onToggle,
  savingsRecurrence,
  onRecurrenceChange,
  savingsContribution,
  onContributionChange,
  contributionDay,
  onContributionDayChange,
  editingAccountId,
  linkedWishlistItems,
  editingAccountBalance,
}: {
  theme: any;
  savingsGoalEnabled: boolean;
  onToggle: (v: boolean) => void;
  savingsRecurrence: "monthly" | "biweekly" | "weekly";
  onRecurrenceChange: (r: "monthly" | "biweekly" | "weekly") => void;
  savingsContribution: string;
  onContributionChange: (v: string) => void;
  contributionDay: string;
  onContributionDayChange: (v: string) => void;
  editingAccountId: string | null;
  linkedWishlistItems: any[];
  editingAccountBalance: number;
}) {
  return (
    <View style={[s.goalSection, { borderColor: theme.border }]}>
      <View style={s.goalToggleRow}>
        <View style={s.goalToggleLeft}>
          <Feather name="target" size={15} color="#10B981" />
          <Text style={[s.goalToggleLabel, { color: theme.textColor }]}>Objetivo de poupança</Text>
        </View>
        <Switch
          value={savingsGoalEnabled}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: "#10B981" }}
          thumbColor="#fff"
        />
      </View>

      {savingsGoalEnabled && (
        <>
          <Text style={[s.fieldLabel, { color: theme.secondaryText, marginTop: 10 }]}>
            Periodicidade do aporte
          </Text>
          <View style={s.recurrenceRow}>
            {(
              [
                { key: "weekly", label: "Semanal" },
                { key: "biweekly", label: "Quinzenal" },
                { key: "monthly", label: "Mensal" },
              ] as const
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                style={[
                  s.recurrenceChip,
                  savingsRecurrence === key
                    ? { backgroundColor: "#10B981", borderColor: "#10B981" }
                    : { backgroundColor: "#10B98118", borderColor: "#10B98160" },
                ]}
                onPress={() => {
                  soundManager.play("tap");
                  onRecurrenceChange(key);
                }}
              >
                <Text
                  style={{
                    color: savingsRecurrence === key ? "#FFF" : "#10B981",
                    fontFamily: "DMSans_500Medium",
                    fontSize: 13,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.fieldLabel, { color: theme.secondaryText, marginTop: 10 }]}>
            {savingsRecurrence === "weekly"
              ? "Aporte semanal (R$)"
              : savingsRecurrence === "biweekly"
                ? "Aporte quinzenal (R$)"
                : "Aporte mensal (R$)"}
          </Text>
          <TInput
            value={savingsContribution}
            onChangeText={onContributionChange}
            placeholder="0,00"
            keyboardType="decimal-pad"
            color={theme.textColor}
            backgroundColor={theme.cardBackground}
            borderColor={theme.border}
          />
          {savingsRecurrence === "monthly" && (
            <>
              <Text style={[s.fieldLabel, { color: theme.secondaryText, marginTop: 10 }]}>
                Dia do aporte (1-28)
              </Text>
              <TInput
                width={80}
                value={contributionDay}
                onChangeText={(v) => {
                  const num = v.replace(/[^0-9]/g, "");
                  onContributionDayChange(num);
                }}
                placeholder="1"
                keyboardType="number-pad"
                maxLength={2}
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
              />
            </>
          )}
          <Text style={[s.goalNote, { color: theme.secondaryText }]}>
            {savingsRecurrence === "weekly"
              ? "Um aporte pendente será gerado toda semana e efetivado quando você transferir o valor."
              : savingsRecurrence === "biweekly"
                ? "Um aporte pendente será gerado a cada quinzena e efetivado quando você transferir o valor."
                : `Um aporte pendente será gerado no dia ${contributionDay || "1"} de cada mês e efetivado quando você transferir o valor.`}
          </Text>

          {editingAccountId && linkedWishlistItems.length > 0 && (
            <View style={s.linkedSection}>
              <Text style={[s.linkedTitle, { color: theme.secondaryText }]}>Produtos vinculados</Text>
              {linkedWishlistItems.map((item) => {
                const bal = editingAccountBalance;
                const price = item.price ?? 0;
                const progress = price > 0 ? Math.min(bal / price, 1) : 0;
                const reached = price > 0 && bal >= price;
                return (
                  <View key={item.id} style={[s.linkedItem, { backgroundColor: theme.background }]}>
                    <View style={s.linkedItemHeader}>
                      <Text style={[s.linkedItemName, { color: theme.textColor }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {reached ? (
                        <View style={s.reachedBadge}>
                          <Feather name="check-circle" size={13} color="#16A34A" />
                          <Text style={s.reachedText}>Atingido</Text>
                        </View>
                      ) : (
                        <Text style={[s.linkedPercent, { color: theme.secondaryText }]}>
                          {Math.round(progress * 100)}%
                        </Text>
                      )}
                    </View>
                    <View style={[s.progressTrack, { backgroundColor: theme.cardBackground }]}>
                      <View
                        style={[
                          s.progressFill,
                          {
                            width: `${Math.round(progress * 100)}%` as any,
                            backgroundColor: reached ? "#16A34A" : "#10B981",
                          },
                        ]}
                      />
                    </View>
                    {item.price !== undefined && (
                      <Text style={[s.linkedDetail, { color: theme.secondaryText }]}>
                        {reached
                          ? `R$ ${bal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : `R$ ${bal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {editingAccountId && linkedWishlistItems.length === 0 && (
            <Text style={[s.goalNote, { color: theme.secondaryText, marginTop: 6 }]}>
              Nenhum produto vinculado ainda. Vincule produtos na lista de desejos.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  flex: { flex: 1 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: "90%", width: "100%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20 },
  fieldLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 8, marginBottom: 2 },
  typePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, marginTop: 4 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  typeChipText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  goalSection: { marginTop: 14, borderTopWidth: 1, paddingTop: 14 },
  goalToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalToggleLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  goalToggleLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  goalNote: { fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16, marginTop: 4 },
  recurrenceRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  recurrenceChip: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  linkedSection: { marginTop: 12, gap: 8 },
  linkedTitle: { fontFamily: "DMSans_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  linkedItem: { borderRadius: 10, padding: 10, gap: 6 },
  linkedItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  linkedItemName: { flex: 1, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  linkedPercent: { fontFamily: "DMSans_700Bold", fontSize: 12 },
  reachedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  reachedText: { fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#16A34A" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  linkedDetail: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  deleteOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  deleteCard: { borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, gap: 12 },
  deleteTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, textAlign: "center" },
  deleteDesc: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  deleteFieldLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  deleteAccountScroll: { marginBottom: 4 },
  deleteAccountChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 7, marginRight: 6 },
  deleteActions: { flexDirection: "row", gap: 10, marginTop: 4 },
});
