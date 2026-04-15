import React, { useState, useMemo, useRef } from "react";
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
import { calculate503020 } from "@packages/domain/src/transactions";
import { TransactionBottomSheet } from "@/src/components/transaction/TransactionBottomSheet";
import { DomusLogo } from "@/src/components/shared/DomusLogo";
import { AnimatedCard } from "@/src/components/shared/AnimatedCard";
import { AnimatedIconButton } from "@/src/components/shared/AnimatedIconButton";
import { soundManager } from "@/src/services/SoundManager";
import { useAISettings } from "@/src/hooks/useAISettings";
import { useWishlist } from "@/src/hooks/useWishlist";
import { SelectionModal } from "@/src/components/shared/SelectionModal";
import { formatCurrency } from "@/src/utils/formatCurrency";
import {
  ALL_SEASONAL_TROPHIES,
  ALL_LITURGICAL_TROPHIES,
  ALL_ACHIEVEMENTS
} from "@packages/gamification";

// Extracted sub-components
import { BudgetBar } from "@/src/components/shared/BudgetBar";
import { GamificationWidget } from "@/src/components/gamification/GamificationWidget";
import { AccountsStrip } from "@/src/components/shared/AccountsStrip";
import { PendingTransactionsList } from "@/src/components/transaction/PendingTransactionsList";
import { SavingsGoalCard } from "@/src/components/shared/SavingsGoalCard";
import { RecentTransactionsList } from "@/src/components/transaction/RecentTransactionsList";
import { ResponsiveContainer } from "@/src/ui/components/ResponsiveContainer";
import { ResponsiveRow } from "@/src/ui/components/ResponsiveRow";
import { ResponsiveColumn } from "@/src/ui/components/ResponsiveColumn";
import { useResponsive } from "@/src/ui/layout/useResponsive";
import { TourGuideZone } from "rn-tourguide";
import { TourPageHost } from "@/src/components/tour/TourPageHost";
import { useTourPage } from "@/src/tour/useTourPage";
import { HomeFab } from "@/src/components/shared/HomeFab";
import { CatholicHeaderIcon } from "@/src/components/shared/CatholicHeaderIcon";
import { PixelText } from "@/src/components/pixel";
import { TCard } from "@/src/components/tamagui";
import { TText } from "@/src/components/tamagui";



export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, gamification, levelInfo, totalBalance, archetype, theme, loading, dispatchDomainEvent, deviceId, season, isCatholic } =
    useAppState();
  const { syncStatus } = useSync();
  const { isMobile, columns } = useResponsive();
  const webTopInset = 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addSheetType, setAddSheetType] = useState<"income" | "expense" | "transfer" | undefined>(undefined);
  const { settings: aiSettings } = useAISettings();
  const { lists: wishlistLists } = useWishlist();
  const [showListPicker, setShowListPicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef<number>(0);
  const { isGuideActive: tourActive } = useTourPage(0);


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
  const { monthProgress, daysLeft, currentTrophy } = useMemo(() => {
    const now = new Date();
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sel = (gamification.selectedSeasonalTrophies ?? []).find((s: any) => s.monthKey === mk);

    const seasonalPool = ALL_SEASONAL_TROPHIES || [];
    const liturgicalPool = ALL_LITURGICAL_TROPHIES || [];

    const t = sel ? (seasonalPool.find((tr: any) => tr.id === sel.trophyId) ??
                    liturgicalPool.find((tr: any) => tr.id === sel.trophyId)) : null;

    return {
      monthProgress: Math.round((now.getDate() / dim) * 100),
      daysLeft: dim - now.getDate(),
      currentTrophy: (t && sel) ? { ...t, tier: sel.tier } : null,
    };
  }, [gamification.selectedSeasonalTrophies]);

  // Latest achievements (deduplicated)
  const recentAchievements = useMemo(() => {
    const achievementIds = new Set((ALL_ACHIEVEMENTS || []).map((a) => a.id));
    const seen = new Set<string>();
    return (gamification.unlockedAchievements ?? [])
      .slice()
      .reverse()
      .filter((a) => {
        if (!achievementIds.has(a.id)) return false;
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .slice(0, 3);
  }, [gamification.unlockedAchievements]);

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
        .filter((tx) => tx.accountId === acc.id && tx.type === "income" && tx.status === "confirmed" && tx.date?.startsWith(prefix))
        .reduce((s, tx) => s + tx.amount, 0);
    }
    return result;
  }, [txArr, savingsGoalAccounts]);

  const playTap = () => {
    soundManager.play("tap");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const fabActions = useMemo(() => {
    const all = [
      // ── Página 1: principais ──
      {
        id: "manual",
        icon: "edit-3" as const,
        label: "Cadastro",
        color: theme.primaryColor,
        onPress: () => { soundManager.play("pop"); setAddSheetType(undefined); setShowAddSheet(true); },
      },
      ...(wishlistLists.length > 0 ? [{
        id: "wishlist",
        icon: "heart" as const,
        label: "Wishlist",
        color: "#EC4899",
        onPress: () => { soundManager.play("tap"); setShowListPicker(true); },
      }] : []),
      {
        id: "ocr",
        icon: "camera" as const,
        label: "NF",
        color: "#F59E0B",
        onPress: () => { soundManager.play("tap"); router.push("/import-invoice"); },
      },
      // ── Página 2: secundárias ──
      ...(aiSettings.isEnabled ? [
        {
          id: "ai",
          icon: "cpu" as const,
          label: "Chat IA",
          color: "#8B5CF6",
          onPress: () => { soundManager.play("tap"); router.push("/ai-chat"); },
        },
        {
          id: "voice",
          icon: "mic" as const,
          label: "Voz",
          color: "#EF4444",
          onPress: () => { soundManager.play("tap"); router.push({ pathname: "/ai-chat", params: { voice: "1" } }); },
        },
      ] : []),
      {
        id: "transfer",
        icon: "repeat" as const,
        label: "Transferir",
        color: "#06B6D4",
        onPress: () => { soundManager.play("pop"); setAddSheetType("transfer"); setShowAddSheet(true); },
      },
    ];
    return all;
  }, [theme.primaryColor, router, aiSettings.isEnabled, wishlistLists.length]);

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
          <TText variant="subtitle" color={theme.secondaryText}>
            Carregando...
          </TText>
        </View>
      </View>
    );
  }

  return (
    <TourPageHost groupId={0} scrollRef={scrollRef} scrollYRef={scrollYRef}>
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollRef}
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: insets.bottom + webBottomInset + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!tourActive}
        onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
       <ResponsiveContainer style={{ gap: 16 }}>
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={Platform.OS === "web" ? { zIndex: 1, position: "relative" } : {}}>
          <View style={[s.header]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <DomusLogo size={36} theme={theme} />
              {isCatholic && <CatholicHeaderIcon theme={theme} size={16} opacity={0.3} />}
              <View>
                <PixelText size={16} color={theme.textColor}>DOMUS</PixelText>
                <TText variant="caption" color={theme.secondaryText}>
                  {archetype.charAt(0).toUpperCase() + archetype.slice(1)} / Nível{" "}
                  {levelInfo.level}
                </TText>
              </View>
            </View>
            <View style={s.headerActions}>
              <TourGuideZone zone={6} text="16" isTourGuide borderRadius={20}>
                <AnimatedIconButton
                  name="refresh-cw"
                  size={20}
                  color={theme.primaryColor}
                  isLoading={syncStatus === "syncing"}
                  style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
                  onPress={() => router.push("/sync")}
                />
              </TourGuideZone>
              <AnimatedIconButton
                name="maximize"
                size={20}
                color={theme.primaryColor}
                style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push("/import-invoice")}
              />
              <TourGuideZone zone={4} text="12" isTourGuide borderRadius={20}>
                <AnimatedIconButton
                  name="robot-happy"
                  iconSet="MaterialCommunityIcons"
                  size={22}
                  color={theme.primaryColor}
                  style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
                  onPress={() => router.push("/ai-chat")}
                />
              </TourGuideZone>
              <TourGuideZone zone={5} text="13" isTourGuide borderRadius={20}>
                <AnimatedIconButton
                  name="settings"
                  size={20}
                  color={theme.primaryColor}
                  style={[s.settingsBtn, { backgroundColor: theme.cardBackground }]}
                  onPress={() => router.push("/about")}
                />
              </TourGuideZone>
            </View>
          </View>
        </View>

        {/* ── STATS ROW ──────────────────────────────────────────────────── */}
        <ResponsiveRow style={Platform.OS === "web" ? { zIndex: 1 } : {}}>
          <ResponsiveColumn span={columns}>
            <AnimatedCard index={0}>
              <View style={[s.statsRow, { paddingHorizontal: isMobile ? 16 : 0 }]}>
                <Pressable
                  style={[s.statCard, { backgroundColor: theme.primaryColor }]}
                  onPress={() => { soundManager.play("tap"); router.push("/(tabs)/season"); }}
                >
                  <Feather name="zap" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={s.statValue}>{gamification.totalXp}</Text>
                  <Text style={s.statLabel}>XP Total</Text>
                </Pressable>
                <Pressable
                  style={[s.statCard, { backgroundColor: theme.primaryColor }]}
                  onPress={() => { soundManager.play("tap"); router.push("/(tabs)/season"); }}
                >
                  <Feather name="bar-chart-2" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={s.statValue}>{levelInfo.level}</Text>
                  <Text style={s.statLabel}>Nível</Text>
                </Pressable>
                <Pressable
                  style={[s.statCard, { backgroundColor: theme.primaryColor }]}
                  onPress={() => { soundManager.play("tap"); router.push("/(tabs)/season"); }}
                >
                  <MaterialCommunityIcons name="fire" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={s.statValue}>{gamification.currentStreak}</Text>
                  <Text style={s.statLabel}>Streak</Text>
                </Pressable>
              </View>
            </AnimatedCard>
          </ResponsiveColumn>
        </ResponsiveRow>

        {/* ── GAMIFICATION WIDGET ────────────────────────────────────────── */}
        <ResponsiveRow style={Platform.OS === "web" ? { position: "relative" } : {}}>
          <ResponsiveColumn span={columns} style={{ paddingHorizontal: isMobile ? 16 : 0 }}>
            <AnimatedCard index={1} >
              <View collapsable={false} style={{ width: "100%" }}>
                <GamificationWidget
                  theme={theme}
                  currentTrophy={currentTrophy}
                  levelInfo={levelInfo}
                  recentAchievements={recentAchievements}
                  achievementPool={ALL_ACHIEVEMENTS || []}
                  monthProgress={monthProgress}
                />
              </View>
            </AnimatedCard>
          </ResponsiveColumn>
        </ResponsiveRow>

        {/* ── BALANCE + ACCOUNTS ─────────────────────────────────────────── */}
        {/* ── BALANCE + ACCOUNTS ─────────────────────────────────────────── */}
        <ResponsiveRow gap={16}>
          <ResponsiveColumn span={accountCount === 0 ? columns : 1} style={{ paddingHorizontal: isMobile ? 16 : 0 }}>
            <TourGuideZone zone={1} text="1" isTourGuide borderRadius={20}>
            <AnimatedCard index={2}>
              <View collapsable={false} style={[s.balanceCard, { backgroundColor: theme.primaryColor, marginHorizontal: 0, width: "100%" }]}>
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
            </TourGuideZone>
          </ResponsiveColumn>

          {accountCount > 0 && (
            <ResponsiveColumn span={columns > 1 ? columns - 1 : 1}>
              <AccountsStrip accounts={accountsSorted} transactions={txArr} theme={theme} />
            </ResponsiveColumn>
          )}
        </ResponsiveRow>

        {/* ── INVOICE BANNER ─────────────────────────────────────────────── */}
        {__DEV__ && unconfirmedInvoices.length > 0 && (
          <Pressable
            style={[s.invoiceBanner, { backgroundColor: theme.cardBackground, borderColor: "#FDE68A" }]}
            onPress={() => { soundManager.play("tap"); router.push("/import-invoice"); }}
          >
            <View style={[s.invoiceBannerIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="file-text" size={15} color="#D97706" />
            </View>
            <TText variant="label" color={theme.textColor} flex={1}>
              {unconfirmedInvoices.length} nota{unconfirmedInvoices.length !== 1 ? "s fiscais" : " fiscal"} aguardando confirmação
            </TText>
            <Feather name="chevron-right" size={16} color={theme.secondaryText} />
          </Pressable>
        )}

        {/* ── PENDING TRANSACTIONS ───────────────────────────────────────── */}
        <PendingTransactionsList
          pendingTxs={pendingTxs}
          transactions={domain.transactions}
          accounts={domain.accounts}
          categories={domain.categories}
          deviceId={deviceId}
          theme={theme}
          dispatchDomainEvent={dispatchDomainEvent}
        />

        {/* ── BUDGET 50/30/20 ────────────────────────────────────────────── */}
        <ResponsiveRow>
          <ResponsiveColumn span={columns} style={{ paddingHorizontal: isMobile ? 16 : 0 }}>
            <TourGuideZone zone={2} text="2" isTourGuide borderRadius={20}>
            <AnimatedCard index={3}>
              <TCard elevated backgroundColor={theme.cardBackground} borderColor={theme.border} marginHorizontal={0} width="100%">
                <View style={s.monthFilterContainer}>
                  <TText variant="subtitle" color={theme.textColor}>
                    Orçamento 50/30/20
                  </TText>
                  <View style={s.monthFilter}>
                    <Pressable onPress={() => { soundManager.play("tap"); handlePreviousMonth(); }} style={s.monthArrow}>
                      <Feather name="chevron-left" size={20} color={theme.textColor} />
                    </Pressable>
                    <TText variant="label" color={theme.textColor} textTransform="capitalize" minWidth={80} textAlign="center">
                      {new Date(selectedYear, selectedMonth).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "numeric"
                      })}
                    </TText>
                    <Pressable onPress={() => { soundManager.play("tap"); handleNextMonth(); }} style={s.monthArrow}>
                      <Feather name="chevron-right" size={20} color={theme.textColor} />
                    </Pressable>
                  </View>
                </View>
                {txCount > 0 ? (
                  <View style={s.budgetContent}>
                    <BudgetBar label="Necessidades" percent={budget.needsPercent} ideal={50} idealAmount={incomeBase * 0.5} color={theme.primaryColor} amount={budget.needs} group="needs" theme={theme} onPress={handleBudgetPress} />
                    <BudgetBar label="Desejos" percent={budget.wantsPercent} ideal={30} idealAmount={incomeBase * 0.3} color={theme.accentColor} amount={budget.wants} group="wants" theme={theme} onPress={handleBudgetPress} />
                    <BudgetBar label="Poupança" percent={budget.savingsPercent} ideal={20} idealAmount={incomeBase * 0.2} color={theme.success} amount={budget.savings} group="savings" theme={theme} onPress={handleBudgetPress} />
                  </View>
                ) : (
                  <View style={s.emptyState}>
                    <Feather name="pie-chart" size={28} color={theme.secondaryText} />
                    <TText variant="body" color={theme.secondaryText} textAlign="center">
                      Registre transações para ver seu orçamento
                    </TText>
                  </View>
                )}
              </TCard>
            </AnimatedCard>
            </TourGuideZone>
          </ResponsiveColumn>
        </ResponsiveRow>

        {/* ── SEASON CARD ────────────────────────────────────────────────── */}
        {season.currentSeason?.active && (
          <ResponsiveRow style={Platform.OS === "web" ? { position: "relative" } : {}}>
            <ResponsiveColumn span={columns} style={{ paddingHorizontal: isMobile ? 16 : 0 }}>
              <AnimatedCard index={4}>
                <View collapsable={false} style={{ width: "100%" }}>
                  <Pressable
                    onPress={() => { soundManager.play("tap"); router.push("/(tabs)/season"); }}
                  >
                    <TCard elevated backgroundColor={theme.cardBackground} borderColor={theme.border} marginHorizontal={0} width="100%">
                    <View style={s.seasonHeader}>
                      <View style={s.seasonTitleRow}>
                        <MaterialCommunityIcons name="trophy-outline" size={16} color={theme.accentColor} />
                        <TText variant="subtitle" color={theme.textColor}>Temporada</TText>
                      </View>
                      <View style={[s.seasonArchetypeBadge, { backgroundColor: `${theme.accentColor}20` }]}>
                        <TText variant="caption" fontWeight="600" color={theme.accentColor}>
                          {archetype.charAt(0).toUpperCase() + archetype.slice(1)}
                        </TText>
                      </View>
                    </View>
                    <View style={[s.xpBarBg, { backgroundColor: theme.border, marginBottom: 10 }]}>
                      <View style={[s.xpBarFill, { width: `${monthProgress}%` as any, backgroundColor: theme.accentColor }]} />
                    </View>
                    <View style={s.seasonStatsRow}>
                      <View style={s.seasonStat}>
                        <TText variant="body" bold color={theme.textColor} fontSize={18}>{gamification.seasonXp}</TText>
                        <TText variant="caption" color={theme.secondaryText} textAlign="center" marginTop={2}>XP temporada</TText>
                      </View>
                      <View style={[s.seasonStatDivider, { backgroundColor: theme.border }]} />
                      <View style={s.seasonStat}>
                        <TText variant="body" bold color={theme.textColor} fontSize={18}>{gamification.currentStreak}</TText>
                        <TText variant="caption" color={theme.secondaryText} textAlign="center" marginTop={2}>dias seguidos</TText>
                      </View>
                      <View style={[s.seasonStatDivider, { backgroundColor: theme.border }]} />
                      <View style={s.seasonStat}>
                        <TText variant="body" bold color={theme.textColor} fontSize={18}>{daysLeft}</TText>
                        <TText variant="caption" color={theme.secondaryText} textAlign="center" marginTop={2}>dias restantes</TText>
                      </View>
                    </View>
                    </TCard>
                  </Pressable>
                </View>
              </AnimatedCard>
            </ResponsiveColumn>
          </ResponsiveRow>
        )}

        {/* ── SAVINGS GOALS + RECENT TRANSACTIONS ─────────────────────── */}
        <ResponsiveRow gap={16} style={Platform.OS === "web" ? { zIndex: 1 } : {}}>
          {savingsGoalAccounts.length > 0 && (
            <ResponsiveColumn style={{ paddingHorizontal: isMobile ? 16 : 0 }}>
              <SavingsGoalCard
                savingsGoalAccounts={savingsGoalAccounts}
                savingsContributed={savingsContributed}
                theme={theme}
              />
            </ResponsiveColumn>
          )}

          <ResponsiveColumn span={savingsGoalAccounts.length === 0 ? columns : (columns > 1 ? columns - 1 : 1)} style={{ paddingHorizontal: isMobile ? 16 : 0 }}>
            <RecentTransactionsList
              recentTxs={recentTxs}
              txCount={txCount}
              categories={domain.categories}
              theme={theme}
            />
          </ResponsiveColumn>
        </ResponsiveRow>
       </ResponsiveContainer>
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <HomeFab
        bottom={insets.bottom + webBottomInset + 80}
        primaryColor={theme.primaryColor}
        disabled={tourActive}
        actions={fabActions}
      />

      <TransactionBottomSheet
        visible={showAddSheet}
        onClose={() => { setShowAddSheet(false); setAddSheetType(undefined); }}
        theme={theme}
        initialType={addSheetType}
      />

      {/* Wishlist list picker */}
      <SelectionModal
        visible={showListPicker}
        title="Adicionar a qual lista?"
        options={wishlistLists.map((list) => ({
          label: list.name,
          icon: "heart",
          onPress: () => {
            setShowListPicker(false);
            router.push({ pathname: "/wishlist/[listId]", params: { listId: list.id, addItem: "1" } });
          },
        }))}
        onCancel={() => setShowListPicker(false)}
        theme={theme}
      />
    </View>
    </TourPageHost>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { gap: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  greeting: { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: 1 },
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
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontFamily: "DMSans_700Bold", fontSize: 22, color: "#FFFFFF" },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
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
  balanceLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  balanceCount: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "rgba(255,255,255,0.5)" },
  balanceValue: { fontFamily: "DMSans_700Bold", fontSize: 32, color: "#FFFFFF" },
  monthFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthFilter: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthArrow: { padding: 4 },
  budgetContent: { gap: 14 },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
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
  seasonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  seasonTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  seasonArchetypeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  xpBarBg: { height: 8, borderRadius: 4 },
  xpBarFill: { height: 8, borderRadius: 4, minWidth: 4 },
  seasonStatsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  seasonStat: { alignItems: "center", flex: 1 },
  seasonStatDivider: { width: 1, height: 28 },
});
