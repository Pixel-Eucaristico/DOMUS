import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { useSync } from "@/src/context/SyncProvider";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function BudgetBar({
  label,
  percent,
  ideal,
  idealAmount,
  color,
  amount,
}: {
  label: string;
  percent: number;
  ideal: number;
  idealAmount: number;
  color: string;
  amount: number;
}) {
  const barWidth = Math.min(percent, 100);
  return (
    <View style={s.budgetRow}>
      <View style={s.budgetLabelRow}>
        <View style={[s.budgetDot, { backgroundColor: color }]} />
        <Text style={s.budgetLabel}>{label}</Text>
        <Text style={s.budgetPercent}>
          {percent}% <Text style={s.budgetIdeal}>(meta {ideal}%)</Text>
        </Text>
      </View>
      <View style={s.budgetBarBg}>
        <View
          style={[
            s.budgetBarFill,
            { width: `${barWidth}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <View style={s.budgetFooter}>
        <Text style={s.budgetAmount}>{formatCurrency(amount)}</Text>
        <Text style={s.budgetIdealValue}>Meta: {formatCurrency(idealAmount)}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, gamification, levelInfo, budget, totalBalance, archetype, theme, onboarding, loading } =
    useAppState();
  const { syncStatus, isAutoSyncEnabled } = useSync();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const accountCount = Object.keys(domain.accounts).length;
  const txCount = Object.keys(domain.transactions).length;
  const recentTxs = Object.values(domain.transactions)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const incomeBase = budget.totalIncome > 0 ? budget.totalIncome : (budget.needs + budget.wants + budget.savings);

  const handleAddPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/add-transaction");
  };

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.loadingContainer}>
          <Text style={[s.loadingText, { color: theme.secondaryText }]}>
            Carregando...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: insets.bottom + webBottomInset + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: theme.textColor }]}>DOMUS</Text>
            <Text style={[s.subtitle, { color: theme.secondaryText }]}>
              {archetype.charAt(0).toUpperCase() + archetype.slice(1)} / Nivel{" "}
              {levelInfo.level}
            </Text>
          </View>
          <View style={s.headerActions}>
            <Pressable
              testID="sync-button"
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/sync")}
            >
              <MaterialCommunityIcons name="access-point" size={22} color={theme.primaryColor} />
              {isAutoSyncEnabled && (
                <View
                  style={[
                    s.syncDot,
                    {
                      backgroundColor:
                        syncStatus === "connected"
                          ? "#22C55E"
                          : syncStatus === "syncing"
                            ? "#F59E0B"
                            : syncStatus === "offline"
                              ? "#EF4444"
                              : "#9CA3AF",
                    },
                  ]}
                />
              )}
            </Pressable>
            <Pressable
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/import-invoice")}
            >
              <Feather name="maximize" size={22} color={theme.primaryColor} />
            </Pressable>
            <Pressable
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/season")}
            >
              <Feather name="award" size={22} color={theme.primaryColor} />
            </Pressable>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: theme.primaryColor }]}>
            <Feather name="zap" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={s.statValue}>{gamification.totalXp}</Text>
            <Text style={s.statLabel}>XP Total</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: theme.primaryColor }]}>
            <Feather name="bar-chart-2" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={s.statValue}>{levelInfo.level}</Text>
            <Text style={s.statLabel}>Nivel</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: theme.primaryColor }]}>
            <MaterialCommunityIcons name="fire" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={s.statValue}>{gamification.currentStreak}</Text>
            <Text style={s.statLabel}>Streak</Text>
          </View>
        </View>

        <View style={s.xpBarContainer}>
          <View style={s.xpBarHeader}>
            <Text style={[s.xpBarTitle, { color: theme.textColor }]}>
              Nível {levelInfo.level}
            </Text>
            <Text style={[s.xpBarInfo, { color: theme.secondaryText }]}>
              {Math.round(levelInfo.progress * 100)}% para o próximo nível
            </Text>
          </View>
          <View style={[s.xpBarBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                s.xpBarFill,
                {
                  width: `${Math.max(4, Math.round(levelInfo.progress * 100))}%` as any,
                  backgroundColor: theme.accentColor,
                },
              ]}
            />
          </View>
          <Text style={s.xpTotalMini}>{gamification.totalXp} XP acumulado</Text>
        </View>

        <View style={[s.balanceCard, { backgroundColor: theme.primaryColor }]}>
          <View style={s.balanceHeader}>
            <View style={s.balanceLabelRow}>
              <Feather name="dollar-sign" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={s.balanceLabel}>Saldo total</Text>
            </View>
            <Text style={s.balanceCount}>{accountCount} contas</Text>
          </View>
          <Text style={s.balanceValue}>{formatCurrency(totalBalance)}</Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[s.cardTitle, { color: theme.textColor }]}>
            Orcamento 50/30/20
          </Text>
          {txCount > 0 ? (
            <View style={s.budgetContent}>
              <BudgetBar
                label="Necessidades"
                percent={budget.needsPercent}
                ideal={50}
                idealAmount={incomeBase * 0.5}
                color={theme.primaryColor}
                amount={budget.needs}
              />
              <BudgetBar
                label="Desejos"
                percent={budget.wantsPercent}
                ideal={30}
                idealAmount={incomeBase * 0.3}
                color={theme.accentColor}
                amount={budget.wants}
              />
              <BudgetBar
                label="Poupanca"
                percent={budget.savingsPercent}
                ideal={20}
                idealAmount={incomeBase * 0.2}
                color={theme.success}
                amount={budget.savings}
              />
            </View>
          ) : (
            <View style={s.emptyState}>
              <Feather name="pie-chart" size={28} color={theme.secondaryText} />
              <Text style={[s.emptyText, { color: theme.secondaryText }]}>
                Registre transacoes para ver seu orcamento
              </Text>
            </View>
          )}
        </View>

        <Pressable 
          style={[s.card, { backgroundColor: theme.cardBackground }]}
          onPress={() => router.push("/transactions")}
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
              {recentTxs.map((tx) => {
                const cat = domain.categories[tx.categoryId];
                const isExpense = tx.type === "expense";
                return (
                  <Pressable 
                    key={tx.id} 
                    style={({ pressed }) => [
                      s.txRow, 
                      { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }
                    ]}
                    onPress={() => router.push({ pathname: "/add-transaction", params: { txId: tx.id } })}
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
                      <Text style={[s.txDesc, { color: theme.textColor }]}>
                        {tx.description || cat?.name || tx.type}
                      </Text>
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
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          s.fab,
          {
            bottom: insets.bottom + webBottomInset + 80,
            backgroundColor: theme.primaryColor,
          },
          pressed && s.fabPressed,
        ]}
        onPress={handleAddPress}
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { gap: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontFamily: "DMSans_500Medium", fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  greeting: { fontFamily: "DMSans_700Bold", fontSize: 28, letterSpacing: 2 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 14, marginTop: 2 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  syncDot: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
  },
  statLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  xpBarContainer: { paddingHorizontal: 16 },
  xpBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  xpBarTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  xpBarInfo: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  xpTotalMini: { fontFamily: "DMSans_400Regular", fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "right" },
  xpBarBg: { height: 8, borderRadius: 4 },
  xpBarFill: { height: 8, borderRadius: 4, minWidth: 4 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  balanceCount: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  balanceValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
  },
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
  budgetContent: { gap: 14 },
  budgetRow: { gap: 4 },
  budgetLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: "#374151", flex: 1 },
  budgetPercent: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: "#374151" },
  budgetIdeal: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#9CA3AF" },
  budgetBarBg: { height: 6, borderRadius: 3, backgroundColor: "#F3F4F6" },
  budgetBarFill: { height: 6, borderRadius: 3, minWidth: 2 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: "#374151" },
  budgetIdealValue: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#6B7280" },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" as const },
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
  txDesc: { fontFamily: "DMSans_500Medium", fontSize: 14 },
  txDate: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  txAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  fab: {
    position: "absolute",
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
});
