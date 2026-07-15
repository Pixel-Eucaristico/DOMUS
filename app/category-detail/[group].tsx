import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { resolveEffectiveGroup } from "@packages/domain/src/transactions";
import { CATEGORY_OPTIONS } from "@/src/constants/invoiceCategories";

export default function CategoryDetailScreen() {
  const { group, month, year } = useLocalSearchParams<{
    group: string;
    month?: string;
    year?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme } = useAppState();

  const filterMonth = month ? parseInt(month) : new Date().getMonth();
  const filterYear = year ? parseInt(year) : new Date().getFullYear();

  const groupLabel = group === "needs" ? "Necessidades" :
                     group === "wants" ? "Desejos" : "Poupança";

  // Categorias do domínio + constantes da importação de notas (transações
  // antigas podem referenciar IDs constantes sem CATEGORY_CREATED)
  const allCategories = useMemo(() => {
    const map: Record<string, { id: string; name: string; group: string }> = {};
    for (const opt of CATEGORY_OPTIONS) map[opt.id] = { id: opt.id, name: opt.name, group: opt.group };
    for (const cat of Object.values(domain.categories)) map[cat.id] = cat;
    return map;
  }, [domain.categories]);

  // Calculate totals per category, honoring per-item/tx group overrides
  const categoryTotals = useMemo(() => {
    return Object.values(allCategories).map(cat => {
      const total = Object.values(domain.transactions)
        .filter(tx => {
          if (tx.type !== "expense" || tx.status === "pending") return false;
          const [y, m] = tx.date.split("-").map(Number);
          return y === filterYear && m === filterMonth + 1;
        })
        .reduce((sum, tx) => {
          if (tx.items && tx.items.length > 0) {
            // Soma itens desta categoria cujo grupo efetivo é o da tela
            return sum + tx.items
              .filter(item =>
                item.categoryId === cat.id &&
                resolveEffectiveGroup(item.categoryId, domain.categories, item.groupOverride) === group)
              .reduce((s, item) => s + item.amount, 0);
          }
          // Sem itens: usa categoria + override da própria transação
          return tx.categoryId === cat.id &&
            resolveEffectiveGroup(tx.categoryId, domain.categories, tx.groupOverride) === group
            ? sum + tx.amount
            : sum;
        }, 0);

      return { category: cat, total };
    }).filter(ct => ct.total > 0) // Only categories with spending
      .sort((a, b) => b.total - a.total); // Sort by value
  }, [allCategories, domain.categories, domain.transactions, filterMonth, filterYear, group]);

  const totalSpent = categoryTotals.reduce((sum, ct) => sum + ct.total, 0);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]}>{groupLabel}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[s.totalCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[s.totalLabel, { color: theme.secondaryText }]}>
          Total gasto em {groupLabel}
        </Text>
        <Text style={[s.totalValue, { color: theme.primaryColor }]}>
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(totalSpent)}
        </Text>
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {categoryTotals.map(({ category, total }) => (
          <Pressable
            key={category.id}
            style={({ pressed }) => [
              s.categoryCard,
              { backgroundColor: theme.cardBackground },
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => router.push(`/transactions-by-category/${category.id}?month=${filterMonth}&year=${filterYear}`)}
          >
            <View style={s.categoryLeft}>
              <View style={[s.categoryIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                <Feather name="tag" size={20} color={theme.primaryColor} />
              </View>
              <View>
                <Text style={[s.categoryName, { color: theme.textColor }]}>
                  {category.name}
                </Text>
                <Text style={[s.categoryPercentage, { color: theme.secondaryText }]}>
                  {((total / totalSpent) * 100).toFixed(1)}% do total
                </Text>
              </View>
            </View>
            <View style={s.categoryRight}>
              <Text style={[s.categoryAmount, { color: theme.textColor }]}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(total)}
              </Text>
              <Feather name="chevron-right" size={20} color={theme.secondaryText} />
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
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 12 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryName: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  categoryPercentage: { fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 2 },
  categoryRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryAmount: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
});
