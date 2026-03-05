import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { soundManager } from "@/src/services/SoundManager";
import type { AccountPayload, AccountType } from "@packages/events/src/types";

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string; color: string }[] = [
  { key: "checking", label: "Corrente", icon: "credit-card", color: "#3B82F6" },
  { key: "savings", label: "Poupanca", icon: "trending-up", color: "#10B981" },
  { key: "wallet", label: "Carteira", icon: "briefcase", color: "#F59E0B" },
  { key: "credit_card", label: "Cartao", icon: "zap", color: "#8B5CF6" },
];

export function accountTypeLabel(t: AccountType): string {
  return ACCOUNT_TYPES.find((a) => a.key === t)?.label ?? t;
}
export function accountTypeIcon(t: AccountType): string {
  return ACCOUNT_TYPES.find((a) => a.key === t)?.icon ?? "credit-card";
}
export function accountTypeColor(t: AccountType): string {
  return ACCOUNT_TYPES.find((a) => a.key === t)?.color ?? "#6B7280";
}
export { ACCOUNT_TYPES };

interface AccountCardProps {
  acc: AccountPayload;
  theme: any;
  linkedItems: any[];
  isExpanded: boolean;
  onPress: () => void;
  onEdit: () => void;
  onToggleExpand: () => void;
  onGoalPress: (item: any) => void;
}

export function AccountCard({
  acc,
  theme,
  linkedItems,
  isExpanded,
  onPress,
  onEdit,
  onToggleExpand,
  onGoalPress,
}: AccountCardProps) {
  const typeColor = accountTypeColor(acc.type);

  return (
    <Pressable
      style={({ pressed }) => [
        s.accountCard,
        { backgroundColor: theme.cardBackground, opacity: pressed ? 0.8 : 1, borderLeftColor: typeColor },
      ]}
      onPress={onPress}
    >
      <View style={s.accountCardTop}>
        <View style={[s.accountIcon, { backgroundColor: `${typeColor}15` }]}>
          <Feather name={accountTypeIcon(acc.type) as any} size={20} color={typeColor} />
        </View>
        <View style={s.accountInfo}>
          <View style={s.accountNameRow}>
            <Text style={[s.accountName, { color: theme.textColor }]}>{acc.name}</Text>
            {linkedItems.length > 0 && (
              <View style={s.goalBadge}>
                <Feather name="target" size={10} color="#10B981" />
                <Text style={s.goalBadgeText}>{linkedItems.length}</Text>
              </View>
            )}
          </View>
          <Text style={[s.accountType, { color: typeColor }]}>
            {accountTypeLabel(acc.type)}
            {acc.type === "credit_card" && acc.closingDay ? `  •  Fecha dia ${acc.closingDay}` : ""}
            {acc.type === "credit_card" && acc.dueDay ? `  •  Vence dia ${acc.dueDay}` : ""}
          </Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={(e) => {
            e.stopPropagation?.();
            soundManager.play("tap");
            onEdit();
          }}
        >
          <Feather name="edit-2" size={16} color={theme.secondaryText} />
        </Pressable>
      </View>

      <Text
        style={[
          s.accountBalance,
          {
            color:
              acc.type === "credit_card"
                ? typeColor
                : acc.balance >= 0
                  ? theme.success
                  : theme.danger,
          },
        ]}
      >
        {acc.type === "credit_card"
          ? `Limite: ${formatCurrency(acc.creditLimit ?? 0)}`
          : formatCurrency(acc.balance)}
      </Text>

      {linkedItems.length > 0 && (
        <>
          <Pressable
            style={[s.accordionToggle, { borderTopColor: theme.border }]}
            onPress={(e) => {
              e.stopPropagation?.();
              soundManager.play("tap");
              onToggleExpand();
            }}
            hitSlop={8}
          >
            <Feather name="target" size={12} color="#10B981" />
            <Text style={[s.accordionToggleText, { color: theme.secondaryText }]}>
              {linkedItems.length} {linkedItems.length === 1 ? "objetivo" : "objetivos"}
              {(() => {
                const n = linkedItems.filter(
                  (i) => (i.price ?? 0) > 0 && acc.balance >= (i.price ?? 0),
                ).length;
                return n > 0 ? `  •  ${n} atingido${n > 1 ? "s" : ""}` : "";
              })()}
            </Text>
            <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={theme.secondaryText} />
          </Pressable>

          {isExpanded && (
            <View style={s.cardGoalsSection}>
              {linkedItems.map((item) => {
                const price = item.price ?? 0;
                const progress = price > 0 ? Math.min(acc.balance / price, 1) : 0;
                const reached = price > 0 && acc.balance >= price;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [s.cardGoalRow, pressed && { opacity: 0.65 }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      soundManager.play("tap");
                      onGoalPress(item);
                    }}
                  >
                    <View style={s.cardGoalHeader}>
                      <Text style={[s.cardGoalName, { color: theme.textColor }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {reached ? (
                        <View style={s.cardReachedBadge}>
                          <Feather name="check-circle" size={12} color="#16A34A" />
                          <Text style={s.cardReachedText}>Atingido</Text>
                        </View>
                      ) : (
                        <Text style={[s.cardGoalPercent, { color: theme.secondaryText }]}>
                          {Math.round(progress * 100)}%
                        </Text>
                      )}
                      <Feather name="chevron-right" size={11} color={theme.secondaryText} />
                    </View>
                    <View style={[s.cardProgressTrack, { backgroundColor: theme.background }]}>
                      <View
                        style={[
                          s.cardProgressFill,
                          {
                            width: `${Math.round(progress * 100)}%` as any,
                            backgroundColor: reached ? "#16A34A" : "#10B981",
                          },
                        ]}
                      />
                    </View>
                    {price > 0 && (
                      <Text style={[s.cardGoalDetail, { color: theme.secondaryText }]}>
                        {reached
                          ? formatCurrency(acc.balance)
                          : `${formatCurrency(acc.balance)} de ${formatCurrency(price)}`}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  accountCard: {
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accountCardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  accountIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  accountInfo: { flex: 1 },
  accountNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#10B98120",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  goalBadgeText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#10B981" },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  accountBalance: { fontFamily: "DMSans_700Bold", fontSize: 20, textAlign: "right" as const },
  accordionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  accordionToggleText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 12 },
  cardGoalsSection: { marginTop: 8, gap: 10 },
  cardGoalRow: { gap: 4 },
  cardGoalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  cardGoalName: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 12 },
  cardGoalPercent: { fontFamily: "DMSans_700Bold", fontSize: 11 },
  cardReachedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardReachedText: { fontSize: 10, fontFamily: "DMSans_600SemiBold", color: "#16A34A" },
  cardProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  cardProgressFill: { height: "100%", borderRadius: 3 },
  cardGoalDetail: { fontFamily: "DMSans_400Regular", fontSize: 10 },
});
