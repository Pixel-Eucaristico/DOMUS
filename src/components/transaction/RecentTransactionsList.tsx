import React from "react";
import { View, Pressable, StyleSheet , Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { soundManager } from "@/src/services/SoundManager";
import { InstallmentBadge } from "@/src/components/transaction/InstallmentBadge";
import { formatCurrency } from "@/src/utils/formatCurrency";
import Animated, { SlideInRight, Layout } from "react-native-reanimated";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { TText , TCard } from "@/src/components/tamagui";

interface RecentTransactionsListProps {
  recentTxs: any[];
  txCount: number;
  categories: Record<string, any>;
  theme: any;
}

export function RecentTransactionsList({ recentTxs, txCount, categories, theme }: RecentTransactionsListProps) {
  const router = useRouter();
  const { isDemoActive } = useDemoMode();

  return (
    <Pressable
      onPress={() => {
        soundManager.play("tap");
        router.push("/transactions");
      }}
    >
      <TCard
        elevated
        backgroundColor={theme.cardBackground}
        marginHorizontal={0}
        width="100%"
        borderRadius={20}
        padding={20}
      >
        <View style={s.cardHeader}>
          <TText variant="subtitle" color={theme.textColor} marginBottom={12}>
            Últimas transações
          </TText>
          <TText variant="caption" color={theme.secondaryText}>
            {txCount} total
          </TText>
        </View>
        {recentTxs.length > 0 ? (
          <View style={s.txList}>
            {recentTxs.map((tx, idx) => {
              const cat = categories[tx.categoryId];
              const isExpense = tx.type === "expense";

              const Wrapper = Platform.OS === "web" && isDemoActive ? View : Animated.View;
              const animatedProps = Platform.OS === "web" && isDemoActive
                ? {}
                : {
                    entering: SlideInRight.delay(idx * 50).springify().damping(20),
                    layout: Layout.springify()
                  };

              return (
                <Wrapper
                  key={tx.id}
                  {...animatedProps}
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
                        <TText variant="body" fontWeight="500" color={theme.textColor}>
                          {tx.description || cat?.name || tx.type}
                        </TText>
                        {tx.installmentInfo && (
                          <InstallmentBadge
                            current={tx.installmentInfo.current}
                            total={tx.installmentInfo.total}
                            theme={theme}
                          />
                        )}
                        {tx.status === "pending" && (
                          <View style={s.pendingBadge}>
                            <TText variant="caption" fontWeight="500" color="#D97706" fontSize={10}>
                              Pendente
                            </TText>
                          </View>
                        )}
                      </View>
                      <TText variant="caption" color={theme.secondaryText} marginTop={2}>
                        {tx.date}
                      </TText>
                    </View>
                    <TText variant="body" fontWeight="600" color={isExpense ? theme.danger : theme.success}>
                      {isExpense ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </TText>
                  </Pressable>
                </Wrapper>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Feather name="inbox" size={28} color={theme.secondaryText} />
            <TText variant="body" color={theme.secondaryText} textAlign="center">
              Nenhuma transação ainda
            </TText>
          </View>
        )}
      </TCard>
    </Pressable>
  );
}

const s = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
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
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
});
