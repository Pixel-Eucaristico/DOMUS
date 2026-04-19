import React, { useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { InstallmentBadge } from "@/src/components/transaction/InstallmentBadge";
import { updateTransactionEvent } from "@packages/domain/src/transactions";
import { TCard, TText } from "@/src/components/tamagui";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accountId, filter } = useLocalSearchParams<{ accountId?: string; filter?: string }>();
  const { domain, theme, dispatchDomainEvent } = useAppState();
  const webTopInset = 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  // When arriving with filter=pending, show all-time pendentes (no month restriction)
  const pendingOnly = filter === "pending";

  const [vMonth, setVMonth] = useState(new Date().getMonth());
  const [vYear, setVYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending">(
    pendingOnly ? "pending" : "all",
  );

  const targetAccount = accountId ? domain.accounts[accountId] : null;

  const MONTHS = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const prevMonth = () => {
    if (vMonth === 0) {
      setVMonth(11);
      setVYear(vYear - 1);
    } else {
      setVMonth(vMonth - 1);
    }
  };

  const nextMonth = () => {
    if (vMonth === 11) {
      setVMonth(0);
      setVYear(vYear + 1);
    } else {
      setVMonth(vMonth + 1);
    }
  };

  const allMonthTransactions = Object.values(domain.transactions)
    .filter((tx) => {
      if (accountId && tx.accountId !== accountId && tx.targetAccountId !== accountId) {
        return false;
      }
      // In pendingOnly mode skip month restriction — show all-time pendentes
      if (pendingOnly) return tx.status === "pending";
      const parts = tx.date.split("-");
      if (parts.length < 2) return false;
      const y = parseInt(parts[0]!, 10);
      const m = parseInt(parts[1]!, 10) - 1;
      return y === vYear && m === vMonth;
    })
    .sort((a, b) => {
      // Pending mode: ascending (soonest first, overdue first)
      if (pendingOnly) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const filteredTransactions = pendingOnly
    ? allMonthTransactions // already filtered to pending only above
    : allMonthTransactions.filter((tx) => {
        if (statusFilter === "confirmed") return !tx.status || tx.status === "confirmed";
        if (statusFilter === "pending") return tx.status === "pending";
        return true;
      });

  // Summary only counts confirmed transactions
  const confirmedTxs = allMonthTransactions.filter((t) => !t.status || t.status === "confirmed");
  const monthIncome = confirmedTxs
    .filter((t) => t.type === "income" || (t.type === "transfer" && t.targetAccountId === accountId))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = confirmedTxs
    .filter((t) => t.type === "expense" || (t.type === "transfer" && t.accountId === accountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const handlePrevMonth = () => {
    soundManager.play("tap");
    prevMonth();
  };

  const handleNextMonth = () => {
    soundManager.play("tap");
    nextMonth();
  };

  const handleSetStatusFilter = (f: "all" | "confirmed" | "pending") => {
    soundManager.play("tap");
    setStatusFilter(f);
  };

  const handleBack = () => {
    soundManager.play("tap");
    router.back();
  };

  const handleEfetivar = (txId: string) => {
    const today = new Date().toISOString().split("T")[0]!;
    const event = updateTransactionEvent(txId, { status: "confirmed", date: today });
    dispatchDomainEvent(event);
    soundManager.play("success");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + webTopInset + 16 }]}>
        <View style={s.headerTop}>
          <Pressable style={s.backBtn} onPress={handleBack}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <View style={s.headerTitleContainer}>
            <TText variant="title" color={theme.textColor} fontSize={24}>
              {pendingOnly
                ? "Cobranças pendentes"
                : targetAccount
                  ? targetAccount.name
                  : "Historico Total"}
            </TText>
            {pendingOnly ? (
              <TText variant="caption" secondary marginTop={2}>
                {allMonthTransactions.length} pendente{allMonthTransactions.length !== 1 ? "s" : ""} · mais próxima primeiro
              </TText>
            ) : targetAccount ? (
              <TText variant="caption" secondary marginTop={2}>
                {targetAccount.type === "credit_card" ? "Cartão de Crédito" : "Conta Bancária"}
              </TText>
            ) : null}
          </View>
        </View>

        {!pendingOnly && (
          <View style={s.monthSwitcher}>
            <Pressable style={[s.monthBtn, { backgroundColor: theme.cardBackground }]} onPress={handlePrevMonth}>
              <Feather name="chevron-left" size={20} color={theme.primaryColor} />
            </Pressable>
            <View style={s.monthLabelContainer}>
              <TText variant="subtitle" bold color={theme.textColor}>
                {MONTHS[vMonth]} {vYear}
              </TText>
            </View>
            <Pressable style={[s.monthBtn, { backgroundColor: theme.cardBackground }]} onPress={handleNextMonth}>
              <Feather name="chevron-right" size={20} color={theme.primaryColor} />
            </Pressable>
          </View>
        )}

        {!pendingOnly && (
          <>
            <View style={s.summaryRow}>
              <TCard elevated compact backgroundColor={theme.cardBackground} borderColor={theme.border} flexDirection="row" alignItems="center" flex={1} gap={10} borderWidth={0} padding={12} borderRadius={18}>
                <View style={[s.summaryCircle, { backgroundColor: `${theme.success}15` }]}>
                  <Feather name="arrow-up" size={18} color={theme.success} />
                </View>
                <View style={s.summaryTextContainer}>
                  <TText variant="caption" secondary fontSize={11}>Entradas</TText>
                  <TText variant="body" bold color={theme.textColor} fontSize={15} marginTop={1}>
                    {formatCurrency(monthIncome)}
                  </TText>
                </View>
              </TCard>
              <TCard elevated compact backgroundColor={theme.cardBackground} borderColor={theme.border} flexDirection="row" alignItems="center" flex={1} gap={10} borderWidth={0} padding={12} borderRadius={18}>
                <View style={[s.summaryCircle, { backgroundColor: `${theme.danger}15` }]}>
                  <Feather name="arrow-down" size={18} color={theme.danger} />
                </View>
                <View style={s.summaryTextContainer}>
                  <TText variant="caption" secondary fontSize={11}>Saídas</TText>
                  <TText variant="body" bold color={theme.textColor} fontSize={15} marginTop={1}>
                    {formatCurrency(monthExpense)}
                  </TText>
                </View>
              </TCard>
            </View>

            {/* Status filter tabs */}
            <View style={s.filterRow}>
              {(["all", "confirmed", "pending"] as const).map((f) => {
                const labels = { all: "Todas", confirmed: "Confirmadas", pending: "Pendentes" };
                const active = statusFilter === f;
                return (
                  <Pressable
                    key={f}
                    style={[
                      s.filterChip,
                      {
                        backgroundColor: active ? theme.primaryColor : theme.cardBackground,
                        borderColor: active ? theme.primaryColor : theme.border,
                        },
                        ]}
                        onPress={() => handleSetStatusFilter(f)}
                        >
                    <TText variant="caption" color={active ? "#FFF" : theme.secondaryText} fontWeight="500">
                      {labels[f]}
                    </TText>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingBottom: insets.bottom + webBottomInset + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={s.emptyHistory}>
            <Feather name="check-circle" size={48} color={theme.success} style={{ marginBottom: 16 }} />
            <TText variant="body" secondary textAlign="center" maxWidth={250} lineHeight={22}>
              {pendingOnly
                ? "Nenhuma cobrança pendente. Tudo em dia!"
                : "Nenhuma transação encontrada para este período."}
            </TText>
          </View>
        ) : (
          <View style={s.txList}>
            {filteredTransactions.map((tx) => {
              const cat = domain.categories[tx.categoryId];
              const isExpense = tx.type === "expense" || (tx.type === "transfer" && tx.accountId === accountId);
              const isIncome = tx.type === "income" || (tx.type === "transfer" && tx.targetAccountId === accountId);
              const acc = domain.accounts[tx.accountId];
              const targetAcc = tx.targetAccountId ? domain.accounts[tx.targetAccountId] : null;

              let typeIcon = isExpense ? "arrow-down-left" : "arrow-up-right";
              let typeColor = isExpense ? theme.danger : theme.success;
              if (tx.type === "transfer") {
                typeIcon = "repeat";
                typeColor = theme.primaryColor;
              }

              return (
                <Pressable
                  key={tx.id}
                  style={({ pressed }) => [
                    s.txRow,
                    { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => {
                    soundManager.play("tap");
                    router.push({ pathname: "/add-transaction", params: { txId: tx.id } });
                  }}
                >
                  <View style={[s.txIcon, { backgroundColor: `${typeColor}12` }]}>
                    <Feather name={typeIcon as "arrow-down-left" | "arrow-up-right" | "repeat"} size={18} color={typeColor} />
                  </View>
                  <View style={s.txMain}>
                    <View style={s.txDescRow}>
                      <TText variant="body" bold color={theme.textColor} fontSize={15} numberOfLines={1}>
                        {tx.description || cat?.name || tx.type}
                      </TText>
                      {tx.installmentInfo ? (
                        <InstallmentBadge
                          current={tx.installmentInfo.current}
                          total={tx.installmentInfo.total}
                          theme={theme}
                        />
                      ) : null}
                      {tx.status === "pending" ? (
                        <View style={s.pendingBadge}>
                          <Text style={s.pendingBadgeText}>Pendente</Text>
                        </View>
                      ) : null}
                      {tx.type === "transfer" && tx.returnDate && !tx.isReturnTransfer && tx.returnDate > new Date().toISOString().split("T")[0]! ? (
                        <View style={[s.returnBadge, { borderColor: theme.warning, backgroundColor: `${theme.warning}12` }]}>
                          <Feather name="corner-up-left" size={9} color={theme.warning} />
                          <Text style={[s.returnBadgeText, { color: theme.warning }]}>
                            {tx.returnDate.split("-").reverse().slice(0, 2).join("/")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={s.txSub}>
                      {!accountId && (
                        <TText variant="caption" secondary>{acc?.name || "Conta"} • </TText>
                      )}
                      {tx.type === "transfer" && (
                        <TText variant="caption" secondary>
                          {acc?.name} → {targetAcc?.name} •
                        </TText>
                      )}
                      <TText variant="caption" secondary>
                        {tx.date.split("-").reverse().join("/")}
                      </TText>
                    </View>
                  </View>
                  <View style={s.txRight}>
                    <TText variant="body" bold color={typeColor} fontSize={16}>
                      {isExpense ? "-" : isIncome ? "+" : ""} {formatCurrency(tx.amount)}
                    </TText>
                    {tx.status === "pending" && (
                      <Pressable
                        style={[s.efetivarBtn, { borderColor: theme.success }]}
                        onPress={(e) => { e.stopPropagation?.(); handleEfetivar(tx.id); }}
                        hitSlop={6}
                      >
                        <Feather name="check" size={11} color={theme.success} />
                        <TText variant="caption" color={theme.success} fontWeight="600" fontSize={11}>
                          Efetivar
                        </TText>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: "transparent",
    gap: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { flex: 1 },
  content: { padding: 20 },
  monthSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 16,
    padding: 6,
  },
  monthBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  monthLabelContainer: { flex: 1, alignItems: "center" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryTextContainer: { flex: 1 },
  emptyHistory: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  txList: { gap: 4 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center"
  },
  txMain: { flex: 1 },
  txDescRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  txSub: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  txRight: { alignItems: "flex-end", gap: 4 },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: { fontFamily: "DMSans_500Medium", fontSize: 10, color: "#D97706" },
  returnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  returnBadgeText: { fontFamily: "DMSans_500Medium", fontSize: 10 },
  efetivarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
});
