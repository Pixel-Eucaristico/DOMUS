import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";

export default function TransactionsByCategoryScreen() {
  const { categoryId, month, year } = useLocalSearchParams<{
    categoryId: string;
    month?: string;
    year?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme } = useAppState();

  const filterMonth = month ? parseInt(month) : undefined;
  const filterYear = year ? parseInt(year) : undefined;

  const category = domain.categories[categoryId];

  // Find transactions containing this category
  const transactionsWithCategory = useMemo(() => {
    const results: Array<{
      tx: typeof domain.transactions[string];
      categoryAmount: number;
    }> = [];

    Object.values(domain.transactions).forEach(tx => {
      // Apply month/year filter if provided
      if (filterMonth !== undefined && filterYear !== undefined) {
        const [y, m] = tx.date.split("-").map(Number);
        if (y !== filterYear || m !== filterMonth + 1) {
          return;
        }
      }

      if (tx.items && tx.items.length > 0) {
        const categoryAmount = tx.items
          .filter(item => item.categoryId === categoryId)
          .reduce((sum, item) => sum + item.amount, 0);

        if (categoryAmount > 0) {
          results.push({ tx, categoryAmount });
        }
      } else if (tx.categoryId === categoryId) {
        results.push({ tx, categoryAmount: tx.amount });
      }
    });

    return results.sort((a, b) =>
      new Date(b.tx.date).getTime() - new Date(a.tx.date).getTime()
    );
  }, [domain.transactions, categoryId, filterMonth, filterYear]);

  const totalCategory = transactionsWithCategory.reduce(
    (sum, t) => sum + t.categoryAmount, 0
  );

  if (!category) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <Text>Categoria não encontrada</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]}>{category.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[s.totalCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[s.totalLabel, { color: theme.secondaryText }]}>
          Total em {category.name}
        </Text>
        <Text style={[s.totalValue, { color: theme.primaryColor }]}>
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(totalCategory)}
        </Text>
        <Text style={[s.totalCount, { color: theme.secondaryText }]}>
          {transactionsWithCategory.length} transaç{transactionsWithCategory.length !== 1 ? "ões" : "ão"}
        </Text>
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {transactionsWithCategory.map(({ tx, categoryAmount }) => (
          <Pressable
            key={tx.id}
            style={({ pressed }) => [
              s.txCard,
              { backgroundColor: theme.cardBackground },
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => router.push(`/transaction-detail/${tx.id}`)}
          >
            <View style={s.txTop}>
              <Text style={[s.txDescription, { color: theme.textColor }]}>
                {tx.description || "Transação"}
              </Text>
              <Text style={[s.txDate, { color: theme.secondaryText }]}>
                {new Date(tx.date).toLocaleDateString("pt-BR")}
              </Text>
            </View>
            <View style={s.txBottom}>
              <Text style={[s.txAmount, { color: theme.primaryColor }]}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(categoryAmount)}
              </Text>
              {categoryAmount !== tx.amount && (
                <Text style={[s.txTotal, { color: theme.secondaryText }]}>
                  de {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(tx.amount)}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
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
  totalCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  totalLabel: { fontSize: 14, fontFamily: "DMSans_400Regular", marginBottom: 8 },
  totalValue: { fontSize: 32, fontFamily: "DMSans_700Bold" },
  totalCount: { fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 12 },
  txCard: { padding: 16, borderRadius: 12 },
  txTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  txDescription: { fontSize: 16, fontFamily: "DMSans_600SemiBold", flex: 1 },
  txDate: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  txBottom: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  txAmount: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  txTotal: { fontSize: 13, fontFamily: "DMSans_400Regular" },
});
