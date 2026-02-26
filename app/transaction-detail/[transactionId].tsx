import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme } = useAppState();

  const transaction = domain.transactions[transactionId];

  if (!transaction) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.title, { color: theme.textColor }]}>Detalhes</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.center}>
          <Text style={[s.errorText, { color: theme.textColor }]}>
            Transação não encontrada
          </Text>
        </View>
      </View>
    );
  }

  const hasItems = transaction.items && transaction.items.length > 0;

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]}>Detalhes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[s.summaryCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[s.description, { color: theme.textColor }]}>
          {transaction.description || "Transação"}
        </Text>
        <Text style={[s.date, { color: theme.secondaryText }]}>
          {new Date(transaction.date).toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={[s.totalAmount, { color: theme.primaryColor }]}>
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(transaction.amount)}
        </Text>
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {hasItems ? (
          <>
            <Text style={[s.sectionTitle, { color: theme.textColor }]}>
              Itens ({transaction.items!.length})
            </Text>
            {transaction.items!.map((item, index) => {
              const category = domain.categories[item.categoryId];
              return (
                <View
                  key={index}
                  style={[s.itemCard, { backgroundColor: theme.cardBackground }]}
                >
                  <View style={s.itemLeft}>
                    <View style={[s.itemIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                      <Feather name="shopping-bag" size={18} color={theme.primaryColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.itemDescription, { color: theme.textColor }]}>
                        {item.description}
                      </Text>
                      <Text style={[s.itemCategory, { color: theme.secondaryText }]}>
                        {category?.name || "Sem categoria"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.itemAmount, { color: theme.textColor }]}>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(item.amount)}
                  </Text>
                </View>
              );
            })}
          </>
        ) : (
          <View style={s.emptyState}>
            <Feather name="inbox" size={32} color={theme.secondaryText} />
            <Text style={[s.emptyText, { color: theme.secondaryText }]}>
              Esta transação não possui itens individualizados
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: { fontSize: 20, fontFamily: "DMSans_600SemiBold" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  description: { fontSize: 18, fontFamily: "DMSans_600SemiBold", marginBottom: 4 },
  date: { fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 12 },
  totalAmount: { fontSize: 32, fontFamily: "DMSans_700Bold" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 12 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  itemDescription: { fontSize: 14, fontFamily: "DMSans_500Medium", marginBottom: 2 },
  itemCategory: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  itemAmount: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    maxWidth: 200,
  },
});
