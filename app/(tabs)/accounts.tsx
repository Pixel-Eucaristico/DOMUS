import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Platform,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { createAccountEvent, updateAccountEvent } from "@packages/domain/src/accounts";
import type { AccountPayload, AccountType } from "@packages/events/src/types";
import { URGENCY_ORDER } from "@packages/wishlist";
import { KeyboardAvoidingView } from "react-native";

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string; color: string }[] = [
  { key: "checking",    label: "Corrente",  icon: "credit-card",  color: "#3B82F6" },
  { key: "savings",     label: "Poupanca",  icon: "trending-up",  color: "#10B981" },
  { key: "wallet",      label: "Carteira",  icon: "briefcase",    color: "#F59E0B" },
  { key: "credit_card", label: "Cartao",    icon: "zap",          color: "#8B5CF6" },
];

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function accountTypeLabel(t: AccountType): string {
  return ACCOUNT_TYPES.find((a) => a.key === t)?.label ?? t;
}

function accountTypeIcon(t: AccountType): string {
  return ACCOUNT_TYPES.find((a) => a.key === t)?.icon ?? "credit-card";
}

function accountTypeColor(t: AccountType): string {
  return ACCOUNT_TYPES.find((a) => a.key === t)?.color ?? "#6B7280";
}

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, theme, wishlist, dispatchDomainEvent } = useAppState();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accType, setAccType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [savingsGoalEnabled, setSavingsGoalEnabled] = useState(false);
  const [savingsContribution, setSavingsContribution] = useState("");
  const [savingsRecurrence, setSavingsRecurrence] = useState<"monthly" | "biweekly" | "weekly">("monthly");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 280,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible]);

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

  const clearForm = useCallback(() => {
    setName("");
    setBalance("");
    setCreditLimit("");
    setClosingDay("");
    setDueDay("");
    setAccType("checking");
    setSavingsGoalEnabled(false);
    setSavingsContribution("");
    setSavingsRecurrence("monthly");
    setEditingAccountId(null);
  }, []);

  const closeModal = useCallback(() => {
    animateClose(() => {
      clearForm();
      setModalVisible(false);
    });
  }, [animateClose, clearForm]);

  const toggleAccountExpand = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const accounts = Object.values(domain.accounts);

  const linkedItemsByAccount = useMemo(() => {
    const allItems = Object.values(wishlist?.items ?? {});
    const map = new Map<string, typeof allItems>();
    for (const item of allItems) {
      if (!item.savingsGoal?.enabled || !item.savingsGoal.linkedAccountId) continue;
      const id = item.savingsGoal.linkedAccountId;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(item);
    }
    map.forEach((items) =>
      items.sort(
        (a, b) =>
          URGENCY_ORDER.indexOf(a.urgencyLevel) -
          URGENCY_ORDER.indexOf(b.urgencyLevel),
      ),
    );
    return map;
  }, [wishlist]);

  const linkedWishlistItems = useMemo(() => {
    if (!editingAccountId || !savingsGoalEnabled) return [];
    return linkedItemsByAccount.get(editingAccountId) ?? [];
  }, [editingAccountId, savingsGoalEnabled, linkedItemsByAccount]);

  const editingAccount = editingAccountId
    ? domain.accounts[editingAccountId]
    : null;

  const openCreateModal = () => {
    clearForm();
    setModalVisible(true);
  };

  const openEditModal = (acc: AccountPayload) => {
    setName(acc.name);
    setAccType(acc.type);
    setBalance(acc.type !== "credit_card" ? acc.balance.toString() : "");
    setCreditLimit(acc.creditLimit?.toString() ?? "");
    setClosingDay(acc.closingDay?.toString() ?? "");
    setDueDay(acc.dueDay?.toString() ?? "");
    setSavingsGoalEnabled(acc.savingsGoalEnabled ?? false);
    setSavingsContribution(acc.savingsContributionAmount?.toString() ?? "");
    setSavingsRecurrence(acc.contributionRecurrence ?? "monthly");
    setEditingAccountId(acc.id);
    setModalVisible(true);
  };

  const handleSaveAccount = () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome da conta.");
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

    if (editingAccountId) {
      const event = updateAccountEvent(editingAccountId, {
        name: name.trim(),
        type: accType,
        balance: accType === "credit_card" ? undefined : balanceNum,
        creditLimit: accType === "credit_card" ? limitNum : undefined,
        closingDay: accType === "credit_card" ? closingDayNum : undefined,
        dueDay: accType === "credit_card" ? dueDayNum : undefined,
        savingsGoalEnabled: accType === "savings" ? savingsGoalEnabled : undefined,
        savingsContributionAmount: contributionNum,
        contributionRecurrence: accType === "savings" && savingsGoalEnabled ? savingsRecurrence : undefined,
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
      });
      dispatchDomainEvent(event);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    closeModal();
  };

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: insets.bottom + webBottomInset + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={[s.title, { color: theme.textColor }]}>Contas</Text>
          <Pressable
            style={[s.addBtn, { backgroundColor: theme.primaryColor }]}
            onPress={openCreateModal}
          >
            <Feather name="plus" size={20} color="#FFF" />
          </Pressable>
        </View>

        {accounts.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.cardBackground }]}>
            <Feather name="layers" size={40} color={theme.secondaryText} />
            <Text style={[s.emptyTitle, { color: theme.textColor }]}>
              Nenhuma conta ainda
            </Text>
            <Text style={[s.emptySubtext, { color: theme.secondaryText }]}>
              Toque no + para criar sua primeira conta
            </Text>
          </View>
        ) : (
          <View style={s.accountList}>
            {accounts.map((acc) => {
              const typeColor = accountTypeColor(acc.type);
              const cardLinkedItems =
                acc.type === "savings"
                  ? (linkedItemsByAccount.get(acc.id) ?? [])
                  : [];
              const isExpanded = expandedAccounts.has(acc.id);
              return (
                <Pressable
                  key={acc.id}
                  style={({ pressed }) => [
                    s.accountCard,
                    { backgroundColor: theme.cardBackground, opacity: pressed ? 0.8 : 1, borderLeftColor: typeColor },
                  ]}
                  onPress={() => router.push({ pathname: "/transactions", params: { accountId: acc.id } })}
                >
                  <View style={s.accountCardTop}>
                    <View style={[s.accountIcon, { backgroundColor: `${typeColor}15` }]}>
                      <Feather name={accountTypeIcon(acc.type) as any} size={20} color={typeColor} />
                    </View>
                    <View style={s.accountInfo}>
                      <View style={s.accountNameRow}>
                        <Text style={[s.accountName, { color: theme.textColor }]}>{acc.name}</Text>
                        {cardLinkedItems.length > 0 && (
                          <View style={s.goalBadge}>
                            <Feather name="target" size={10} color="#10B981" />
                            <Text style={s.goalBadgeText}>{cardLinkedItems.length}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.accountType, { color: typeColor }]}>
                        {accountTypeLabel(acc.type)}
                        {acc.type === "credit_card" && acc.closingDay
                          ? `  •  Fecha dia ${acc.closingDay}`
                          : ""}
                        {acc.type === "credit_card" && acc.dueDay
                          ? `  •  Vence dia ${acc.dueDay}`
                          : ""}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={12}
                      onPress={(e) => { e.stopPropagation?.(); openEditModal(acc); }}
                    >
                      <Feather name="edit-2" size={16} color={theme.secondaryText} />
                    </Pressable>
                  </View>

                  <Text
                    style={[
                      s.accountBalance,
                      {
                        color:
                          acc.type === "credit_card"
                            ? typeColor
                            : acc.balance >= 0
                              ? theme.success
                              : theme.danger,
                      },
                    ]}
                  >
                    {acc.type === "credit_card"
                      ? `Limite: ${formatCurrency(acc.creditLimit ?? 0)}`
                      : formatCurrency(acc.balance)}
                  </Text>

                  {cardLinkedItems.length > 0 && (
                    <>
                      <Pressable
                        style={[s.accordionToggle, { borderTopColor: theme.border }]}
                        onPress={(e) => { e.stopPropagation?.(); toggleAccountExpand(acc.id); }}
                        hitSlop={8}
                      >
                        <Feather name="target" size={12} color="#10B981" />
                        <Text style={[s.accordionToggleText, { color: theme.secondaryText }]}>
                          {cardLinkedItems.length}{" "}
                          {cardLinkedItems.length === 1 ? "objetivo" : "objetivos"}
                          {(() => {
                            const n = cardLinkedItems.filter(
                              (i) => (i.price ?? 0) > 0 && acc.balance >= (i.price ?? 0),
                            ).length;
                            return n > 0 ? `  •  ${n} atingido${n > 1 ? "s" : ""}` : "";
                          })()}
                        </Text>
                        <Feather
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color={theme.secondaryText}
                        />
                      </Pressable>

                      {isExpanded && (
                        <View style={s.cardGoalsSection}>
                          {cardLinkedItems.map((item) => {
                            const price = item.price ?? 0;
                            const progress = price > 0 ? Math.min(acc.balance / price, 1) : 0;
                            const reached = price > 0 && acc.balance >= price;
                            return (
                              <Pressable
                                key={item.id}
                                style={({ pressed }) => [s.cardGoalRow, pressed && { opacity: 0.65 }]}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  router.push(`/wishlist/${item.listId}` as any);
                                }}
                              >
                                <View style={s.cardGoalHeader}>
                                  <Text
                                    style={[s.cardGoalName, { color: theme.textColor }]}
                                    numberOfLines={1}
                                  >
                                    {item.name}
                                  </Text>
                                  {reached ? (
                                    <View style={s.cardReachedBadge}>
                                      <Feather name="check-circle" size={12} color="#16A34A" />
                                      <Text style={s.cardReachedText}>Atingido</Text>
                                    </View>
                                  ) : (
                                    <Text style={[s.cardGoalPercent, { color: theme.secondaryText }]}>
                                      {Math.round(progress * 100)}%
                                    </Text>
                                  )}
                                  <Feather name="chevron-right" size={11} color={theme.secondaryText} />
                                </View>
                                <View style={[s.cardProgressTrack, { backgroundColor: theme.background }]}>
                                  <View
                                    style={[
                                      s.cardProgressFill,
                                      {
                                        width: `${Math.round(progress * 100)}%` as any,
                                        backgroundColor: reached ? "#16A34A" : "#10B981",
                                      },
                                    ]}
                                  />
                                </View>
                                {price > 0 && (
                                  <Text style={[s.cardGoalDetail, { color: theme.secondaryText }]}>
                                    {reached
                                      ? formatCurrency(acc.balance)
                                      : `${formatCurrency(acc.balance)} de ${formatCurrency(price)}`}
                                  </Text>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={s.modalRoot}>
          <Animated.View style={[s.modalOverlay, { opacity: fadeAnim }]}>
            <Pressable style={s.flex} onPress={closeModal} />
          </Animated.View>

          <KeyboardAvoidingView
            style={s.modalRoot}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
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
                  {editingAccountId ? "Editar conta" : "Nova conta"}
                </Text>
                <Pressable onPress={closeModal} hitSlop={12}>
                  <Feather name="x" size={22} color={theme.secondaryText} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                  Nome
                </Text>
                <TextInput
                  style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Nubank"
                  placeholderTextColor={theme.secondaryText}
                />

                <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                  Tipo
                </Text>
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
                        onPress={() => setAccType(t.key)}
                      >
                        <Feather
                          name={t.icon as any}
                          size={13}
                          color={selected ? "#FFF" : t.color}
                        />
                        <Text
                          style={[
                            s.typeChipText,
                            { color: selected ? "#FFF" : t.color },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {accType !== "credit_card" ? (
                  <>
                    <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                      Saldo inicial (R$)
                    </Text>
                    <TextInput
                      style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                      value={balance}
                      onChangeText={setBalance}
                      placeholder="0,00"
                      placeholderTextColor={theme.secondaryText}
                      keyboardType="decimal-pad"
                    />
                  </>
                ) : (
                  <>
                    <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                      Limite do cartao (R$)
                    </Text>
                    <TextInput
                      style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                      value={creditLimit}
                      onChangeText={setCreditLimit}
                      placeholder="5000,00"
                      placeholderTextColor={theme.secondaryText}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                      Dia de fechamento (ex: 10)
                    </Text>
                    <TextInput
                      style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                      value={closingDay}
                      onChangeText={setClosingDay}
                      placeholder="10"
                      placeholderTextColor={theme.secondaryText}
                      keyboardType="number-pad"
                    />
                    <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                      Dia de vencimento (ex: 15)
                    </Text>
                    <TextInput
                      style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                      value={dueDay}
                      onChangeText={setDueDay}
                      placeholder="15"
                      placeholderTextColor={theme.secondaryText}
                      keyboardType="number-pad"
                    />
                  </>
                )}

                {accType === "savings" && (
                  <View style={[s.goalSection, { borderColor: theme.border }]}>
                    <View style={s.goalToggleRow}>
                      <View style={s.goalToggleLeft}>
                        <Feather name="target" size={15} color="#10B981" />
                        <Text style={[s.goalToggleLabel, { color: theme.textColor }]}>
                          Objetivo de poupança
                        </Text>
                      </View>
                      <Switch
                        value={savingsGoalEnabled}
                        onValueChange={setSavingsGoalEnabled}
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
                              onPress={() => setSavingsRecurrence(key)}
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
                        <TextInput
                          style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                          value={savingsContribution}
                          onChangeText={setSavingsContribution}
                          placeholder="0,00"
                          placeholderTextColor={theme.secondaryText}
                          keyboardType="decimal-pad"
                        />
                        <Text style={[s.goalNote, { color: theme.secondaryText }]}>
                          {savingsRecurrence === "weekly"
                            ? "Um aporte pendente será gerado toda semana e efetivado quando você transferir o valor."
                            : savingsRecurrence === "biweekly"
                              ? "Um aporte pendente será gerado a cada quinzena e efetivado quando você transferir o valor."
                              : "Um aporte pendente será gerado todo mês e efetivado quando você transferir o valor."}
                        </Text>

                        {editingAccountId && linkedWishlistItems.length > 0 && (
                          <View style={s.linkedSection}>
                            <Text style={[s.linkedTitle, { color: theme.secondaryText }]}>
                              Produtos vinculados
                            </Text>
                            {linkedWishlistItems.map((item) => {
                              const bal = editingAccount?.balance ?? 0;
                              const price = item.price ?? 0;
                              const progress =
                                price > 0 ? Math.min(bal / price, 1) : 0;
                              const reached = price > 0 && bal >= price;
                              return (
                                <View
                                  key={item.id}
                                  style={[s.linkedItem, { backgroundColor: theme.background }]}
                                >
                                  <View style={s.linkedItemHeader}>
                                    <Text
                                      style={[s.linkedItemName, { color: theme.textColor }]}
                                      numberOfLines={1}
                                    >
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
                                  <View
                                    style={[s.progressTrack, { backgroundColor: theme.cardBackground }]}
                                  >
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
                )}

                <Pressable
                  style={[s.createBtn, { backgroundColor: theme.primaryColor }]}
                  onPress={handleSaveAccount}
                >
                  <Feather name="check" size={18} color="#FFF" />
                  <Text style={s.createBtnText}>
                    {editingAccountId ? "Salvar" : "Criar conta"}
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16, marginTop: 8 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  accountList: { gap: 10 },
  accountCard: {
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accountCardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: { flex: 1 },
  accountNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#10B98120",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  goalBadgeText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: "#10B981",
  },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  accountBalance: { fontFamily: "DMSans_700Bold", fontSize: 20, textAlign: "right" as const },
  // Sanfona toggle
  accordionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  accordionToggleText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  // Savings goal progress on card (shown when expanded)
  cardGoalsSection: {
    marginTop: 8,
    gap: 10,
  },
  cardGoalRow: { gap: 4 },
  cardGoalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardGoalName: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  cardGoalPercent: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
  },
  cardReachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardReachedText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: "#16A34A",
  },
  cardProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  cardProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardGoalDetail: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  flex: { flex: 1 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "90%",
    width: "100%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20 },
  fieldLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 8, marginBottom: 2 },
  input: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: 4,
  },
  typePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, marginTop: 4 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeChipText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  // Savings goal section
  goalSection: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 14,
  },
  goalToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  goalToggleLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  goalNote: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  recurrenceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  recurrenceChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkedSection: {
    marginTop: 12,
    gap: 8,
  },
  linkedTitle: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  linkedItem: {
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  linkedItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  linkedItemName: {
    flex: 1,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  linkedPercent: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  reachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reachedText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: "#16A34A",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  linkedDetail: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  createBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#FFF" },
});
