import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { createAccountEvent, updateAccountEvent } from "@packages/domain/src/accounts";
import type { AccountPayload, AccountType } from "@packages/events/src/types";

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
  const { domain, theme, dispatchDomainEvent } = useAppState();
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

  const accounts = Object.values(domain.accounts);

  const resetForm = () => {
    setName("");
    setBalance("");
    setCreditLimit("");
    setClosingDay("");
    setDueDay("");
    setAccType("checking");
    setEditingAccountId(null);
    setModalVisible(false);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (acc: AccountPayload) => {
    setName(acc.name);
    setAccType(acc.type);
    setBalance(acc.type !== "credit_card" ? acc.balance.toString() : "");
    setCreditLimit(acc.creditLimit?.toString() ?? "");
    setClosingDay(acc.closingDay?.toString() ?? "");
    setDueDay(acc.dueDay?.toString() ?? "");
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

    if (editingAccountId) {
      const event = updateAccountEvent(editingAccountId, {
        name: name.trim(),
        type: accType,
        balance: accType === "credit_card" ? undefined : balanceNum,
        creditLimit: accType === "credit_card" ? limitNum : undefined,
        closingDay: accType === "credit_card" ? closingDayNum : undefined,
        dueDay: accType === "credit_card" ? dueDayNum : undefined,
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
      });
      dispatchDomainEvent(event);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    resetForm();
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
                      <Text style={[s.accountName, { color: theme.textColor }]}>{acc.name}</Text>
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
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetForm}
      >
        <View style={s.modalOverlay}>
          <View
            style={[s.modalContent, { backgroundColor: theme.cardBackground }]}
          >
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.textColor }]}>
                {editingAccountId ? "Editar conta" : "Nova conta"}
              </Text>
              <Pressable onPress={resetForm} hitSlop={12}>
                <Feather name="x" size={22} color={theme.secondaryText} />
              </Pressable>
            </View>

            <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
              Nome
            </Text>
            <TextInput
              style={[
                s.input,
                { color: theme.textColor, borderColor: theme.border },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank"
              placeholderTextColor={theme.secondaryText}
            />

            <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
              Tipo
            </Text>
            <View style={s.typePicker}>
              {ACCOUNT_TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  style={[
                    s.typeChip,
                    {
                      backgroundColor:
                        accType === t.key
                          ? theme.primaryColor
                          : theme.background,
                      borderColor:
                        accType === t.key ? theme.primaryColor : theme.border,
                    },
                  ]}
                  onPress={() => setAccType(t.key)}
                >
                  <Text
                    style={[
                      s.typeChipText,
                      { color: accType === t.key ? "#FFF" : theme.textColor },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {accType !== "credit_card" ? (
              <>
                <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>
                  Saldo inicial (R$)
                </Text>
                <TextInput
                  style={[
                    s.input,
                    { color: theme.textColor, borderColor: theme.border },
                  ]}
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
                  style={[
                    s.input,
                    { color: theme.textColor, borderColor: theme.border },
                  ]}
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
                  style={[
                    s.input,
                    { color: theme.textColor, borderColor: theme.border },
                  ]}
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
                  style={[
                    s.input,
                    { color: theme.textColor, borderColor: theme.border },
                  ]}
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="15"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="number-pad"
                />
              </>
            )}

            <Pressable
              style={[s.createBtn, { backgroundColor: theme.primaryColor }]}
              onPress={handleSaveAccount}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={s.createBtnText}>{editingAccountId ? "Salvar" : "Criar conta"}</Text>
            </Pressable>
          </View>
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
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  accountBalance: { fontFamily: "DMSans_700Bold", fontSize: 20, textAlign: "right" as const },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20 },
  fieldLabel: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  input: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: 4,
  },
  typePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeChipText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  createBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#FFF" },
});
