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
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { createTransactionEvent } from "@packages/domain/src/transactions";
import { createEvent, generateId } from "@packages/events/src/factory";
import { EVENT_TYPES, CATEGORY_GROUPS } from "@packages/events/src/types";
import type { CategoryCreatedEvent, TransactionType, CategoryGroup } from "@packages/events/src/types";

const TX_TYPES: { key: TransactionType; label: string; icon: string }[] = [
  { key: "expense", label: "Despesa", icon: "arrow-down-left" },
  { key: "income", label: "Receita", icon: "arrow-up-right" },
  { key: "transfer", label: "Transferencia", icon: "repeat" },
];

const CATEGORY_OPTIONS: { name: string; group: CategoryGroup; icon: string }[] = [
  { name: "Alimentacao", group: "needs", icon: "shopping-cart" },
  { name: "Moradia", group: "needs", icon: "home" },
  { name: "Transporte", group: "needs", icon: "truck" },
  { name: "Saude", group: "needs", icon: "heart" },
  { name: "Educacao", group: "needs", icon: "book" },
  { name: "Lazer", group: "wants", icon: "music" },
  { name: "Compras", group: "wants", icon: "shopping-bag" },
  { name: "Restaurantes", group: "wants", icon: "coffee" },
  { name: "Investimentos", group: "savings", icon: "trending-up" },
  { name: "Reserva", group: "savings", icon: "shield" },
  { name: "Salario", group: "needs", icon: "briefcase" },
  { name: "Outros", group: "wants", icon: "more-horizontal" },
];

function groupLabel(g: CategoryGroup): string {
  switch (g) {
    case "needs": return "Necessidades (50%)";
    case "wants": return "Desejos (30%)";
    case "savings": return "Poupanca (20%)";
  }
}

function groupColor(g: CategoryGroup, theme: any): string {
  switch (g) {
    case "needs": return theme.primaryColor;
    case "wants": return theme.accentColor;
    case "savings": return theme.warning;
  }
}

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, theme, dispatchDomainEvent, dispatch } = useAppState();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [txType, setTxType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [installments, setInstallments] = useState("1");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [targetAccountId, setTargetAccountId] = useState<string>("");

  const accounts = Object.values(domain.accounts);
  const defaultAccountId = selectedAccountId || accounts[0]?.id || "";

  const handleSave = () => {
    const amountNum = parseFloat(amount.replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Valor invalido", "Informe um valor maior que zero.");
      return;
    }
    if (!defaultAccountId) {
      Alert.alert("Sem conta", "Crie uma conta primeiro na aba Contas.");
      return;
    }

    const cat = CATEGORY_OPTIONS[selectedCategory]!;
    const existingCat = Object.values(domain.categories).find(
      (c) => c.name === cat.name,
    );

    let catId: string;
    if (existingCat) {
      catId = existingCat.id;
    } else {
      catId = generateId();
      const catEvent = createEvent<CategoryCreatedEvent>(
        EVENT_TYPES.CATEGORY_CREATED,
        { id: catId, name: cat.name, group: cat.group },
      );
      dispatch(catEvent);
    }

    const installmentNum = parseInt(installments, 10) || 1;
    const today = new Date().toISOString().split("T")[0]!;

    const events = createTransactionEvent({
      accountId: defaultAccountId,
      type: txType,
      amount: amountNum,
      categoryId: catId,
      date: today,
      description: description || cat.name,
      installments: installmentNum,
      targetAccountId: txType === "transfer" ? targetAccountId || undefined : undefined,
    });

    for (const evt of events) {
      dispatchDomainEvent(evt);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.pageTitle, { color: theme.textColor }]}>
            Nova transacao
          </Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Feather name="check" size={24} color={theme.primaryColor} />
          </Pressable>
        </View>

        <View style={s.typeRow}>
          {TX_TYPES.map((t) => (
            <Pressable
              key={t.key}
              style={[
                s.typeBtn,
                {
                  backgroundColor:
                    txType === t.key ? theme.primaryColor : theme.cardBackground,
                  borderColor: txType === t.key ? theme.primaryColor : theme.border,
                },
              ]}
              onPress={() => setTxType(t.key)}
            >
              <Feather
                name={t.icon as any}
                size={16}
                color={txType === t.key ? "#FFF" : theme.secondaryText}
              />
              <Text
                style={[
                  s.typeBtnText,
                  { color: txType === t.key ? "#FFF" : theme.textColor },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.amountCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[s.amountLabel, { color: theme.secondaryText }]}>
            Valor (R$)
          </Text>
          <TextInput
            style={[s.amountInput, { color: theme.textColor }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={theme.secondaryText}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        <View style={[s.inputCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[s.inputLabel, { color: theme.secondaryText }]}>
            Descricao
          </Text>
          <TextInput
            style={[s.textInput, { color: theme.textColor, borderColor: theme.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Supermercado"
            placeholderTextColor={theme.secondaryText}
          />
        </View>

        {accounts.length > 0 && (
          <View style={[s.inputCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[s.inputLabel, { color: theme.secondaryText }]}>
              Conta
            </Text>
            <View style={s.accountPicker}>
              {accounts.map((a) => (
                <Pressable
                  key={a.id}
                  style={[
                    s.accountChip,
                    {
                      backgroundColor:
                        (selectedAccountId || accounts[0]?.id) === a.id
                          ? `${theme.primaryColor}15`
                          : theme.background,
                      borderColor:
                        (selectedAccountId || accounts[0]?.id) === a.id
                          ? theme.primaryColor
                          : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedAccountId(a.id)}
                >
                  <Text
                    style={[
                      s.accountChipText,
                      {
                        color:
                          (selectedAccountId || accounts[0]?.id) === a.id
                            ? theme.primaryColor
                            : theme.textColor,
                      },
                    ]}
                  >
                    {a.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={[s.inputCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[s.inputLabel, { color: theme.secondaryText }]}>
            Categoria ({groupLabel(CATEGORY_OPTIONS[selectedCategory]!.group)})
          </Text>
          <View style={s.categoryGrid}>
            {CATEGORY_OPTIONS.map((cat, i) => (
              <Pressable
                key={cat.name}
                style={[
                  s.categoryChip,
                  {
                    backgroundColor:
                      selectedCategory === i
                        ? `${groupColor(cat.group, theme)}15`
                        : theme.background,
                    borderColor:
                      selectedCategory === i
                        ? groupColor(cat.group, theme)
                        : theme.border,
                  },
                ]}
                onPress={() => setSelectedCategory(i)}
              >
                <Feather
                  name={cat.icon as any}
                  size={14}
                  color={
                    selectedCategory === i
                      ? groupColor(cat.group, theme)
                      : theme.secondaryText
                  }
                />
                <Text
                  style={[
                    s.categoryChipText,
                    {
                      color:
                        selectedCategory === i
                          ? groupColor(cat.group, theme)
                          : theme.textColor,
                    },
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {txType === "expense" && (
          <View style={[s.inputCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[s.inputLabel, { color: theme.secondaryText }]}>
              Parcelas
            </Text>
            <View style={s.installmentRow}>
              {["1", "2", "3", "6", "12"].map((n) => (
                <Pressable
                  key={n}
                  style={[
                    s.installmentChip,
                    {
                      backgroundColor:
                        installments === n ? theme.primaryColor : theme.background,
                      borderColor:
                        installments === n ? theme.primaryColor : theme.border,
                    },
                  ]}
                  onPress={() => setInstallments(n)}
                >
                  <Text
                    style={[
                      s.installmentText,
                      { color: installments === n ? "#FFF" : theme.textColor },
                    ]}
                  >
                    {n}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Pressable
          style={[s.saveBtn, { backgroundColor: theme.primaryColor }]}
          onPress={handleSave}
        >
          <Feather name="check" size={20} color="#FFF" />
          <Text style={s.saveBtnText}>Salvar transacao</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  amountInput: {
    fontFamily: "DMSans_700Bold",
    fontSize: 40,
    textAlign: "center" as const,
    width: "100%",
  },
  inputCard: { borderRadius: 20, padding: 20 },
  inputLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  textInput: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  accountPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  accountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountChipText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  installmentRow: { flexDirection: "row", gap: 8 },
  installmentChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  installmentText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#FFF" },
});
