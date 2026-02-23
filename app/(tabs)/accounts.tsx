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
import { createAccountEvent } from "@packages/domain/src/accounts";
import type { AccountType } from "@packages/events/src/types";

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string }[] = [
  { key: "checking", label: "Corrente", icon: "credit-card" },
  { key: "savings", label: "Poupanca", icon: "database" },
  { key: "wallet", label: "Carteira", icon: "briefcase" },
  { key: "credit_card", label: "Cartao", icon: "zap" },
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

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, theme, dispatchDomainEvent } = useAppState();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [accType, setAccType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  const accounts = Object.values(domain.accounts);

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome da conta.");
      return;
    }

    const balanceNum = parseFloat(balance.replace(",", ".")) || 0;
    const limitNum = parseFloat(creditLimit.replace(",", ".")) || undefined;

    const event = createAccountEvent({
      name: name.trim(),
      type: accType,
      balance: accType === "credit_card" ? 0 : balanceNum,
      creditLimit: accType === "credit_card" ? limitNum : undefined,
    });

    dispatchDomainEvent(event);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setName("");
    setBalance("");
    setCreditLimit("");
    setAccType("checking");
    setModalVisible(false);
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
            onPress={() => setModalVisible(true)}
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
            {accounts.map((acc) => (
              <Pressable
                key={acc.id}
                style={({ pressed }) => [
                  s.accountCard, 
                  { backgroundColor: theme.cardBackground, opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => router.push({ pathname: "/transactions", params: { accountId: acc.id } })}
              >
                <View style={s.accountCardTop}>
                  <View
                    style={[
                      s.accountIcon,
                      { backgroundColor: `${theme.primaryColor}12` },
                    ]}
                  >
                    <Feather
                      name={accountTypeIcon(acc.type) as any}
                      size={20}
                      color={theme.primaryColor}
                    />
                  </View>
                  <View style={s.accountInfo}>
                    <Text style={[s.accountName, { color: theme.textColor }]}>
                      {acc.name}
                    </Text>
                    <Text
                      style={[s.accountType, { color: theme.secondaryText }]}
                    >
                      {accountTypeLabel(acc.type)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    s.accountBalance,
                    {
                      color:
                        acc.type === "credit_card"
                          ? theme.secondaryText
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
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View
            style={[s.modalContent, { backgroundColor: theme.cardBackground }]}
          >
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.textColor }]}>
                Nova conta
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
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
              </>
            )}

            <Pressable
              style={[s.createBtn, { backgroundColor: theme.primaryColor }]}
              onPress={handleCreate}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={s.createBtnText}>Criar conta</Text>
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
