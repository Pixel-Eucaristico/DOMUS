import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { soundManager } from "@/src/services/SoundManager";
import { InstallmentBadge } from "@/src/components/transaction/InstallmentBadge";
import { formatCurrency } from "@/src/utils/formatCurrency";
import Animated, { SlideInRight, Layout } from "react-native-reanimated";

interface RecentTransactionsListProps {
  recentTxs: any[];
  txCount: number;
  categories: Record<string, any>;
  theme: any;
}

export function RecentTransactionsList({ recentTxs, txCount, categories, theme }: RecentTransactionsListProps) {
  const router = useRouter();

  return (
    <Pressable
      style={[s.card, { backgroundColor: theme.cardBackground }]}
      onPress={() => {
        soundManager.play("tap");
        router.push("/transactions");
      }}
    >
      <View style={s.cardHeader}>
        <Text style={[s.cardTitle, { color: theme.textColor }]}>
          Ultimas transacoes
        </Text>
        <Text style={[s.txCount, { color: theme.secondaryText }]}>
          {txCount} total
        </Text>
      </View>
      {recentTxs.length > 0 ? (
        <View style={s.txList}>
          {recentTxs.map((tx, idx) => {
            const cat = categories[tx.categoryId];
            const isExpense = tx.type === "expense";
            return (
              <Animated.View
                key={tx.id}
                entering={SlideInRight.delay(idx * 50).springify().damping(20)}
                layout={Layout.springify()}
              >
                <Pressable
                  style={({ pressed }) => [
                    s.txRow,
                    { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => {
                    soundManager.play("tap");
                    router.push({ pathname: "/add-transaction", params: { txId: tx.id } });
                  }}
                >
                  <View
                    style={[
                      s.txIcon,
                      {
                        backgroundColor: isExpense
                          ? `${theme.danger}15`
                          : `${theme.success}15`,
                      },
                    ]}
                  >
                    <Feather
                      name={isExpense ? "arrow-down-left" : "arrow-up-right"}
                      size={16}
                      color={isExpense ? theme.danger : theme.success}
                    />
                  </View>
                  <View style={s.txInfo}>
                    <View style={s.txDescRow}>
                      <Text style={[s.txDesc, { color: theme.textColor }]}>
                        {tx.description || cat?.name || tx.type}
                      </Text>
                      {tx.installmentInfo && (
                        <InstallmentBadge
                          current={tx.installmentInfo.current}
                          total={tx.installmentInfo.total}
                          theme={theme}
                        />
                      )}
                      {tx.status === "pending" && (
                        <View style={s.pendingBadge}>
                          <Text style={s.pendingBadgeText}>Pendente</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.txDate, { color: theme.secondaryText }]}>
                      {tx.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.txAmount,
                      { color: isExpense ? theme.danger : theme.success },
                    ]}
                  >
                    {isExpense ? "-" : "+"}
                    {formatCurrency(tx.amount)}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View style={s.emptyState}>
          <Feather name="inbox" size={28} color={theme.secondaryText} />
          <Text style={[s.emptyText, { color: theme.secondaryText }]}>
            Nenhuma transacao ainda
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16, marginBottom: 12 },
  txCount: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  txList: { gap: 0 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  txInfo: { flex: 1 },
  txDescRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txDesc: { fontFamily: "DMSans_500Medium", fontSize: 14 },
  txDate: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  txAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: { fontFamily: "DMSans_500Medium", fontSize: 10, color: "#D97706" },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" as const },
});
