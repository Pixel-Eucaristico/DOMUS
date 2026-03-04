import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { useSync } from "@/src/context/SyncProvider";
import { calculate503020, updateTransactionEvent, createTransactionEvent } from "@packages/domain/src/transactions";
import { getCreditUsage } from "@packages/domain/src/accounts";
import { TransactionBottomSheet } from "@/src/components/transaction/TransactionBottomSheet";
import { DomusLogo } from "@/src/components/shared/DomusLogo";
import { AnimatedCard } from "@/src/components/shared/AnimatedCard";
import { AnimatedIconButton } from "@/src/components/shared/AnimatedIconButton";
import { soundManager } from "@/src/services/SoundManager";
import Animated, { 
  FadeInUp, 
  FadeOutDown, 
  Layout, 
  FadeIn,
  SlideInRight
} from "react-native-reanimated";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function pendingDateLabel(dateStr: string): { label: string; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const txDate = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((txDate.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0)
    return { label: `Venceu há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? "s" : ""}`, overdue: true };
  if (diffDays === 0) return { label: "Hoje", overdue: false };
  if (diffDays === 1) return { label: "Amanhã", overdue: false };
  if (diffDays <= 7) return { label: `Em ${diffDays} dias`, overdue: false };
  return {
    label: txDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    overdue: false,
  };
}

function BudgetBar({
  label,
  percent,
  ideal,
  idealAmount,
  color,
  amount,
  group,
  theme,
  onPress,
}: {
  label: string;
  percent: number;
  ideal: number;
  idealAmount: number;
  color: string;
  amount: number;
  group: "needs" | "wants" | "savings";
  theme: any;
  onPress?: (group: string) => void;
}) {
  const barWidth = Math.min(percent, 100);
  return (
    <Pressable
      onPress={() => onPress?.(group)}
      style={({ pressed }) => [
        s.budgetRow,
        pressed && { opacity: 0.7 }
      ]}
    >
      <View style={s.budgetLabelRow}>
        <View style={[s.budgetDot, { backgroundColor: color }]} />
        <Text style={[s.budgetLabel, { color: theme.textColor }]}>{label}</Text>
        <Text style={[s.budgetPercent, { color: theme.textColor }]}>
          {percent}% <Text style={[s.budgetIdeal, { color: theme.secondaryText }]}>(meta {ideal}%)</Text>
        </Text>
      </View>
      <View style={[s.budgetBarBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            s.budgetBarFill,
            { width: `${barWidth}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <View style={s.budgetFooter}>
        <Text style={[s.budgetAmount, { color: theme.textColor }]}>{formatCurrency(amount)}</Text>
        <Text style={[s.budgetIdealValue, { color: theme.secondaryText }]}>Meta: {formatCurrency(idealAmount)}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, gamification, levelInfo, totalBalance, archetype, theme, onboarding, loading, dispatchDomainEvent, deviceId, season, wishlist } =
    useAppState();
  const { syncStatus, isAutoSyncEnabled } = useSync();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [showAddSheet, setShowAddSheet] = useState(false);

  // Transfer source modal (for savings contributions)
  const [confirmingTx, setConfirmingTx] = useState<(typeof domain.transactions)[string] | null>(null);
  const [transferSourceId, setTransferSourceId] = useState<string>("");

  // Month/Year filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Calculate budget with selected month/year
  const budget = useMemo(() =>
    calculate503020(
      Object.values(domain.transactions),
      domain.categories,
      selectedMonth,
      selectedYear
    ),
    [domain.transactions, domain.categories, selectedMonth, selectedYear]
  );

  const accountCount = Object.keys(domain.accounts).length;
  const txCount = Object.values(domain.transactions).filter((tx) => tx.status !== "pending").length;
  const recentTxs = Object.values(domain.transactions)
    .filter((tx) => tx.status !== "pending")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Pending transactions sorted ascending (closest due date first)
  const pendingTxs = useMemo(
    () =>
      Object.values(domain.transactions)
        .filter((tx) => tx.status === "pending")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [domain.transactions],
  );

  const handleConfirmTx = useCallback(
    (txId: string) => {
      const tx = domain.transactions[txId];
      // Savings contributions need a source account picker
      if (tx?.type === "income" && tx.description?.startsWith("Aporte poupança:")) {
        const nonSavingsAccounts = Object.values(domain.accounts).filter(
          (a) => a.type !== "savings",
        );
        setTransferSourceId(nonSavingsAccounts[0]?.id ?? "");
        setConfirmingTx(tx);
        return;
      }
      const event = updateTransactionEvent(txId, { status: "confirmed" }, deviceId ?? undefined);
      dispatchDomainEvent(event);
      soundManager.play("success");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [dispatchDomainEvent, deviceId, domain.transactions, domain.accounts],
  );

  const handleConfirmTransfer = useCallback(() => {
    if (!confirmingTx) return;
    const did = deviceId ?? "local";

    // 1. Confirm the savings income
    dispatchDomainEvent(updateTransactionEvent(confirmingTx.id, { status: "confirmed" }, did));

    // 2. Create matching expense on source account (transfer out)
    if (transferSourceId) {
      const [expenseEvent] = createTransactionEvent(
        {
          accountId: transferSourceId,
          type: "expense",
          amount: confirmingTx.amount,
          categoryId: confirmingTx.categoryId ?? "outros",
          date: confirmingTx.date,
          description: `Transferência: ${confirmingTx.description}`,
          status: "confirmed",
        },
        did,
      );
      dispatchDomainEvent(expenseEvent);
    }

    soundManager.play("success");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConfirmingTx(null);
  }, [confirmingTx, transferSourceId, deviceId, dispatchDomainEvent]);

  const incomeBase = budget.totalIncome > 0 ? budget.totalIncome : (budget.needs + budget.wants + budget.savings);

  // ── widget data ──────────────────────────────────────────────────────────────

  const txArr = useMemo(() => Object.values(domain.transactions), [domain.transactions]);

  // Accounts sorted: savings first, then checking, wallet, credit_card
  const accountsSorted = useMemo(() => {
    const order: Record<string, number> = { savings: 0, checking: 1, wallet: 2, credit_card: 3 };
    return Object.values(domain.accounts).sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
  }, [domain.accounts]);

  // Unconfirmed invoices
  const unconfirmedInvoices = useMemo(
    () => Object.values(domain.invoices).filter((inv) => !inv.confirmed),
    [domain.invoices],
  );

  // Season progress
  const { monthProgress, daysLeft } = useMemo(() => {
    const now = new Date();
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      monthProgress: Math.round((now.getDate() / dim) * 100),
      daysLeft: dim - now.getDate(),
    };
  }, []);

  // Savings goal accounts + this-month contribution
  const savingsGoalAccounts = useMemo(
    () => Object.values(domain.accounts).filter((a) => a.type === "savings" && a.savingsGoalEnabled),
    [domain.accounts],
  );
  const savingsContributed = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const result: Record<string, number> = {};
    for (const acc of savingsGoalAccounts) {
      result[acc.id] = txArr
        .filter((tx) => tx.accountId === acc.id && tx.type === "income" && tx.status === "confirmed" && tx.date.startsWith(prefix))
        .reduce((s, tx) => s + tx.amount, 0);
    }
    return result;
  }, [txArr, savingsGoalAccounts]);

  const handleAddPress = () => {
    soundManager.play("pop");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowAddSheet(true);
  };

  const handleBudgetPress = (group: string) => {
    router.push(`/category-detail/${group}?month=${selectedMonth}&year=${selectedYear}`);
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <DomusLogo size={36} theme={theme} />
            <View>
              <Text style={[s.greeting, { color: theme.textColor }]}>DOMUS</Text>
              <Text style={[s.subtitle, { color: theme.secondaryText }]}>
                {archetype.charAt(0).toUpperCase() + archetype.slice(1)} / Nivel{" "}
                {levelInfo.level}
              </Text>
            </View>
          </View>
          <View style={s.headerActions}>
            <AnimatedIconButton
              name="refresh-cw"
              size={20}
              color={theme.primaryColor}
              isLoading={syncStatus === "syncing"}
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/sync")}
            />
            <AnimatedIconButton
              name="maximize"
              size={20}
              color={theme.primaryColor}
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/import-invoice")}
            />
            <AnimatedIconButton
              name="cpu"
              size={20}
              color={theme.primaryColor}
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/ai-chat")}
            />
            <AnimatedIconButton
              name="settings"
              size={20}
              color={theme.primaryColor}
              style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => router.push("/about")}
            />
          </View>
        </View>

        <AnimatedCard index={0}>
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
        </AnimatedCard>

        <AnimatedCard index={1}>
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
        </AnimatedCard>

        <AnimatedCard index={2}>
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
        </AnimatedCard>

        {/* ── CONTAS ───────────────────────────────────────────────────────── */}
        {accountsSorted.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.accountsScrollContent}
            style={s.accountsScroll}
          >
            {accountsSorted.map((acc) => {
              const isCC = acc.type === "credit_card";
              const usage = isCC ? getCreditUsage(acc, txArr) : 0;
              const usagePct = isCC && acc.creditLimit ? Math.min((usage / acc.creditLimit) * 100, 100) : 0;
              const barColor = usagePct > 80 ? theme.danger : usagePct > 50 ? "#F59E0B" : theme.success;
              const typeIcon =
                acc.type === "savings" ? "dollar-sign" :
                acc.type === "wallet" ? "pocket" :
                acc.type === "credit_card" ? "credit-card" : "briefcase";
              const chipColor = acc.color ?? theme.primaryColor;
              return (
                <Pressable
                  key={acc.id}
                  style={({ pressed }) => [
                    s.accountChip,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => router.push("/(tabs)/accounts")}
                >
                  <View style={[s.accountChipIcon, { backgroundColor: `${chipColor}20` }]}>
                    <Feather name={typeIcon as any} size={14} color={chipColor} />
                  </View>
                  <Text style={[s.accountChipName, { color: theme.textColor }]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text
                    style={[
                      s.accountChipBalance,
                      { color: isCC ? (usagePct > 80 ? theme.danger : theme.secondaryText) : theme.success },
                    ]}
                  >
                    {formatCurrency(acc.balance)}
                  </Text>
                  {isCC && acc.creditLimit ? (
                    <View style={[s.accountChipBar, { backgroundColor: theme.border }]}>
                      <View style={[s.accountChipBarFill, { width: `${usagePct}%` as any, backgroundColor: barColor }]} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── NOTAS FISCAIS PENDENTES ───────────────────────────────────────── */}
        {unconfirmedInvoices.length > 0 && (
          <Pressable
            style={[s.invoiceBanner, { backgroundColor: theme.cardBackground, borderColor: "#FDE68A" }]}
            onPress={() => router.push("/import-invoice")}
          >
            <View style={[s.invoiceBannerIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="file-text" size={15} color="#D97706" />
            </View>
            <Text style={[s.invoiceBannerText, { color: theme.textColor }]}>
              {unconfirmedInvoices.length} nota{unconfirmedInvoices.length !== 1 ? "s fiscais" : " fiscal"} aguardando confirmação
            </Text>
            <Feather name="chevron-right" size={16} color={theme.secondaryText} />
          </Pressable>
        )}

        {/* ── COBRANÇAS PENDENTES ────────────────────────────────────────────── */}
        {pendingTxs.length > 0 && (
          <View style={[s.pendingCard, { backgroundColor: theme.cardBackground }]}>
            <View style={s.pendingHeader}>
              <View style={s.pendingTitleRow}>
                <Feather name="clock" size={16} color="#D97706" />
                <Text style={[s.pendingTitle, { color: theme.textColor }]}>
                  Cobranças pendentes
                </Text>
              </View>
              <Pressable
                style={s.pendingSeeAll}
                onPress={() => router.push({ pathname: "/transactions", params: { filter: "pending" } })}
                hitSlop={8}
              >
                <Text style={[s.pendingSeeAllText, { color: theme.primaryColor }]}>Ver todas</Text>
                <Feather name="chevron-right" size={13} color={theme.primaryColor} />
              </Pressable>
            </View>
            {pendingTxs.map((tx) => {
              const cat = domain.categories[tx.categoryId];
              const account = domain.accounts[tx.accountId];
              const isExpense = tx.type === "expense";
              const isIncome = tx.type === "income";
              const iconColor = isExpense ? theme.danger : isIncome ? theme.success : theme.secondaryText;
              const iconName = isExpense ? "arrow-down-left" : isIncome ? "arrow-up-right" : "repeat";
              const { label: dateLabel, overdue } = pendingDateLabel(tx.date);
              return (
                <Pressable
                  key={tx.id}
                  style={({ pressed }) => [
                    s.pendingRow,
                    { borderTopColor: theme.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => router.push({ pathname: "/add-transaction", params: { txId: tx.id } })}
                >
                  <View style={[s.pendingIcon, { backgroundColor: `${iconColor}15` }]}>
                    <Feather name={iconName as any} size={15} color={iconColor} />
                  </View>
                  <View style={s.pendingInfo}>
                    <Text style={[s.pendingDesc, { color: theme.textColor }]} numberOfLines={1}>
                      {tx.description || cat?.name || tx.type}
                    </Text>
                    <View style={s.pendingMeta}>
                      <Text
                        style={[s.pendingDate, { color: overdue ? theme.danger : theme.secondaryText }]}
                      >
                        {dateLabel}
                      </Text>
                      {account && (
                        <>
                          <Text style={[s.pendingDot, { color: theme.secondaryText }]}>·</Text>
                          <Text style={[s.pendingAccount, { color: theme.secondaryText }]} numberOfLines={1}>
                            {account.name}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Text style={[s.pendingAmount, { color: isExpense ? theme.danger : theme.success }]}>
                    {isExpense ? "-" : "+"}{formatCurrency(tx.amount)}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [s.confirmBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => handleConfirmTx(tx.id)}
                    hitSlop={8}
                  >
                    <Feather name="check" size={16} color="#16A34A" />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}

        <AnimatedCard index={3}>
          <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
            <View style={s.monthFilterContainer}>
              <Text style={[s.cardTitle, { color: theme.textColor }]}>
                Orcamento 50/30/20
              </Text>
              <View style={s.monthFilter}>
                <Pressable onPress={handlePreviousMonth} style={s.monthArrow}>
                  <Feather name="chevron-left" size={20} color={theme.textColor} />
                </Pressable>
                <Text style={[s.monthLabel, { color: theme.textColor }]}>
                  {new Date(selectedYear, selectedMonth).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric"
                  })}
                </Text>
                <Pressable onPress={handleNextMonth} style={s.monthArrow}>
                  <Feather name="chevron-right" size={20} color={theme.textColor} />
                </Pressable>
              </View>
            </View>
            {txCount > 0 ? (
              <View style={s.budgetContent}>
                <BudgetBar
                  label="Necessidades"
                  percent={budget.needsPercent}
                  ideal={50}
                  idealAmount={incomeBase * 0.5}
                  color={theme.primaryColor}
                  amount={budget.needs}
                  group="needs"
                  theme={theme}
                  onPress={handleBudgetPress}
                />
                <BudgetBar
                  label="Desejos"
                  percent={budget.wantsPercent}
                  ideal={30}
                  idealAmount={incomeBase * 0.3}
                  color={theme.accentColor}
                  amount={budget.wants}
                  group="wants"
                  theme={theme}
                  onPress={handleBudgetPress}
                />
                <BudgetBar
                  label="Poupanca"
                  percent={budget.savingsPercent}
                  ideal={20}
                  idealAmount={incomeBase * 0.2}
                  color={theme.success}
                  amount={budget.savings}
                  group="savings"
                  theme={theme}
                  onPress={handleBudgetPress}
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
        </AnimatedCard>

        {/* ── TEMPORADA ────────────────────────────────────────────────────── */}
        {season.currentSeason?.active && (
          <Pressable
            style={[s.card, { backgroundColor: theme.cardBackground }]}
            onPress={() => router.push("/(tabs)/season")}
          >
            <View style={s.seasonHeader}>
              <View style={s.seasonTitleRow}>
                <MaterialCommunityIcons name="trophy-outline" size={16} color={theme.accentColor} />
                <Text style={[s.seasonTitle, { color: theme.textColor }]}>Temporada</Text>
              </View>
              <View style={[s.seasonArchetypeBadge, { backgroundColor: `${theme.accentColor}20` }]}>
                <Text style={[s.seasonArchetypeText, { color: theme.accentColor }]}>
                  {archetype.charAt(0).toUpperCase() + archetype.slice(1)}
                </Text>
              </View>
            </View>
            <View style={[s.xpBarBg, { backgroundColor: theme.border, marginBottom: 10 }]}>
              <View style={[s.xpBarFill, { width: `${monthProgress}%` as any, backgroundColor: theme.accentColor }]} />
            </View>
            <View style={s.seasonStatsRow}>
              <View style={s.seasonStat}>
                <Text style={[s.seasonStatValue, { color: theme.textColor }]}>{gamification.seasonXp}</Text>
                <Text style={[s.seasonStatLabel, { color: theme.secondaryText }]}>XP temporada</Text>
              </View>
              <View style={[s.seasonStatDivider, { backgroundColor: theme.border }]} />
              <View style={s.seasonStat}>
                <Text style={[s.seasonStatValue, { color: theme.textColor }]}>{gamification.currentStreak}</Text>
                <Text style={[s.seasonStatLabel, { color: theme.secondaryText }]}>dias seguidos</Text>
              </View>
              <View style={[s.seasonStatDivider, { backgroundColor: theme.border }]} />
              <View style={s.seasonStat}>
                <Text style={[s.seasonStatValue, { color: theme.textColor }]}>{daysLeft}</Text>
                <Text style={[s.seasonStatLabel, { color: theme.secondaryText }]}>dias restantes</Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* ── METAS DE POUPANÇA ─────────────────────────────────────────────── */}
        {savingsGoalAccounts.length > 0 && (
          <Pressable
            style={[s.card, { backgroundColor: theme.cardBackground }]}
            onPress={() => router.push("/(tabs)/accounts")}
          >
            <View style={s.cardHeader}>
              <View style={s.seasonTitleRow}>
                <Feather name="target" size={15} color={theme.success} />
                <Text style={[s.cardTitle, { color: theme.textColor, marginBottom: 0 }]}>Metas de poupança</Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.secondaryText} />
            </View>
            {savingsGoalAccounts.map((acc) => {
              const target = acc.savingsContributionAmount ?? 0;
              const contributed = savingsContributed[acc.id] ?? 0;
              const pct = target > 0 ? Math.min((contributed / target) * 100, 100) : 0;
              const pctLabel = target > 0 ? `${Math.round(pct)}%` : "—";
              const barColor = pct >= 100 ? theme.success : pct >= 50 ? "#F59E0B" : theme.danger;
              return (
                <View key={acc.id} style={[s.savingsGoalRow, { borderTopColor: theme.border }]}>
                  <View style={s.savingsGoalInfo}>
                    <Text style={[s.savingsGoalName, { color: theme.textColor }]} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <Text style={[s.savingsGoalAmt, { color: theme.secondaryText }]}>
                      {formatCurrency(contributed)}{target > 0 ? ` / ${formatCurrency(target)}` : ""}
                    </Text>
                  </View>
                  <Text style={[s.savingsGoalPct, { color: pct >= 100 ? theme.success : theme.textColor }]}>
                    {pctLabel}
                  </Text>
                  <View style={[s.savingsGoalBarWrap, { backgroundColor: theme.border }]}>
                    <View style={[s.savingsGoalBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </Pressable>
        )}

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
              {recentTxs.map((tx, idx) => {
                const cat = domain.categories[tx.categoryId];
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
                        <View style={s.txDescRow}>
                          <Text style={[s.txDesc, { color: theme.textColor }]}>
                            {tx.description || cat?.name || tx.type}
                          </Text>
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

      {/* ── TRANSFER SOURCE MODAL ─────────────────────────────────────────────── */}
      <Modal
        visible={!!confirmingTx}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingTx(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setConfirmingTx(null)}>
          <Pressable style={[s.transferModal, { backgroundColor: theme.cardBackground }]} onPress={() => {}}>
            <View style={s.transferModalHeader}>
              <Feather name="arrow-right-circle" size={20} color="#10B981" />
              <Text style={[s.transferModalTitle, { color: theme.textColor }]}>
                Efetivar aporte
              </Text>
            </View>
            <Text style={[s.transferModalSub, { color: theme.secondaryText }]}>
              {confirmingTx?.description}
              {" · "}
              <Text style={{ color: "#10B981", fontFamily: "DMSans_600SemiBold" }}>
                {formatCurrency(confirmingTx?.amount ?? 0)}
              </Text>
            </Text>

            <Text style={[s.transferModalLabel, { color: theme.secondaryText }]}>
              De qual conta sai o dinheiro?
            </Text>
            {Object.values(domain.accounts)
              .filter((a) => a.type !== "savings")
              .map((acc) => (
                <Pressable
                  key={acc.id}
                  style={[
                    s.transferAccountRow,
                    { borderColor: transferSourceId === acc.id ? "#10B981" : theme.border },
                    transferSourceId === acc.id && { backgroundColor: "#10B98112" },
                  ]}
                  onPress={() => setTransferSourceId(acc.id)}
                >
                  <View style={[s.transferAccountDot, { backgroundColor: transferSourceId === acc.id ? "#10B981" : theme.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.transferAccountName, { color: theme.textColor }]}>{acc.name}</Text>
                    <Text style={[s.transferAccountBal, { color: theme.secondaryText }]}>
                      {formatCurrency(acc.balance ?? 0)}
                    </Text>
                  </View>
                  {transferSourceId === acc.id && (
                    <Feather name="check-circle" size={18} color="#10B981" />
                  )}
                </Pressable>
              ))}

            {Object.values(domain.accounts).filter((a) => a.type !== "savings").length === 0 && (
              <Text style={[s.transferModalSub, { color: theme.secondaryText, marginBottom: 8 }]}>
                Nenhuma outra conta disponível. O aporte será efetivado diretamente.
              </Text>
            )}

            <View style={s.transferModalActions}>
              <Pressable
                style={[s.transferCancelBtn, { borderColor: theme.border }]}
                onPress={() => setConfirmingTx(null)}
              >
                <Text style={[s.transferCancelText, { color: theme.secondaryText }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.transferConfirmBtn} onPress={handleConfirmTransfer}>
                <Feather name="check" size={16} color="#FFF" />
                <Text style={s.transferConfirmText}>Efetivar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <TransactionBottomSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        theme={theme}
      />
    </View>
  );
}

const s = StyleSheet.create({
  // ── Transfer source modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  transferModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  transferModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  transferModalTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
  },
  transferModalSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  transferModalLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  transferAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  transferAccountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  transferAccountName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  transferAccountBal: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  transferModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  transferCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  transferCancelText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  transferConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  transferConfirmText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },
  // ── Root ──────────────────────────────────────────────────────────────────
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
  greeting: { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: 1 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 0 },
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
  monthFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthArrow: {
    padding: 4,
  },
  monthLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textTransform: "capitalize" as const,
    minWidth: 80,
    textAlign: "center" as const,
  },
  budgetContent: { gap: 14 },
  budgetRow: { gap: 4 },
  budgetLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 },
  budgetPercent: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  budgetIdeal: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  budgetBarBg: { height: 6, borderRadius: 3 },
  budgetBarFill: { height: 6, borderRadius: 3, minWidth: 2 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  budgetIdealValue: { fontFamily: "DMSans_400Regular", fontSize: 11 },
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
  // ── Pending section ────────────────────────────────────────────────────────
  pendingCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pendingTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  pendingBadgeCount: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeCountText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#D97706" },
  pendingSeeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pendingSeeAllText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingInfo: { flex: 1, minWidth: 0 },
  pendingDesc: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  pendingMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  pendingDate: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  pendingDot: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  pendingAccount: { fontFamily: "DMSans_400Regular", fontSize: 11, flex: 1 },
  pendingAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  confirmBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
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

  // ── Accounts row ───────────────────────────────────────────────────────────
  accountsScroll: { marginHorizontal: 0 },
  accountsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  accountChip: {
    width: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accountChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  accountChipName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  accountChipBalance: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  accountChipBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  accountChipBarFill: {
    height: 4,
    borderRadius: 2,
    minWidth: 2,
  },

  // ── Invoice banner ─────────────────────────────────────────────────────────
  invoiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
  },
  invoiceBannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  invoiceBannerText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },

  // ── Season card ────────────────────────────────────────────────────────────
  seasonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  seasonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  seasonTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  seasonArchetypeBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  seasonArchetypeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  seasonStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  seasonStat: {
    alignItems: "center",
    flex: 1,
  },
  seasonStatDivider: {
    width: 1,
    height: 28,
  },
  seasonStatValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
  },
  seasonStatLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },

  // ── Savings goals ──────────────────────────────────────────────────────────
  savingsGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  savingsGoalInfo: {
    flex: 1,
    minWidth: 0,
  },
  savingsGoalName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  savingsGoalAmt: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  savingsGoalPct: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    width: 36,
    textAlign: "right",
  },
  savingsGoalBarWrap: {
    height: 6,
    borderRadius: 3,
    width: 60,
    overflow: "hidden",
  },
  savingsGoalBarFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 2,
  },
});
