import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { MONTHLY_TROPHIES } from "@packages/gamification/src/achievements";
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";

interface MonthlyTrophiesListProps {
  theme: any;
  domain: any;
  budget: any;
  gamification: any;
  currentYear: number;
  currentMonth: number;
  challengesCardRef: React.RefObject<View | null>;
  onShareChallenges: (count: number, total: number) => void;
}

export function MonthlyTrophiesList({
  theme,
  domain,
  budget,
  gamification,
  currentYear,
  currentMonth,
  challengesCardRef,
  onShareChallenges,
}: MonthlyTrophiesListProps) {
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const completedThisMonth = new Set(
    (gamification.completedMonthlyTrophies ?? [])
      .filter((c: any) => c.monthKey === monthKey)
      .map((c: any) => c.id),
  );

  return (
    <TCard
      ref={challengesCardRef}
      collapsable={false}
      backgroundColor={theme.cardBackground}
      borderColor={theme.primaryColor + "33"}
      gap={12}
    >
      <View style={s.monthlyHeader}>
        <View style={s.monthlyTitleRow}>
          <TText fontSize={22}>🏅</TText>
          <View>
            <TText variant="subtitle" bold color={theme.textColor}>Desafios</TText>
            <TouchableOpacity
              onPress={() => { soundManager.play("share"); onShareChallenges(completedThisMonth.size, MONTHLY_TROPHIES.length); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
            >
              <Feather name="share-2" size={12} color={theme.primaryColor} />
              <TText bold fontSize={11} color={theme.primaryColor}>
                Compartilhar Grupo
              </TText>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[s.monthlyBadge, { backgroundColor: theme.primaryColor + "22" }]}>
          <TText variant="caption" bold color={theme.primaryColor}>
            {completedThisMonth.size}/{MONTHLY_TROPHIES.length}
          </TText>
        </View>
      </View>

      <View style={s.monthlyList}>
        {MONTHLY_TROPHIES.map((trophy) => {
          const done = completedThisMonth.has(trophy.id);
          const prog = trophy.progress(domain, budget, monthKey);
          const pct = prog.target > 0 ? Math.min(1, prog.current / prog.target) : 0;

          return (
            <View
              key={trophy.id}
              style={[
                s.monthlyItem,
                {
                  backgroundColor: done ? theme.primaryColor + "12" : theme.background,
                  borderColor: done ? theme.primaryColor + "44" : theme.border,
                },
              ]}
            >
              <View style={s.monthlyItemHeader}>
                <TText fontSize={22}>{trophy.icon}</TText>
                <View style={s.monthlyItemInfo}>
                  <TText variant="label" bold color={theme.textColor}>{trophy.name}</TText>
                  <TText variant="caption" color={theme.secondaryText} numberOfLines={1} lineHeight={14}>
                    {trophy.description}
                  </TText>
                </View>
                {done ? (
                  <View style={[s.monthlyDoneBadge, { backgroundColor: theme.success + "22" }]}>
                    <Feather name="check" size={14} color={theme.success} />
                  </View>
                ) : (
                  <View style={[s.monthlyXpBadge, { backgroundColor: theme.border + "44" }]}>
                    <TText bold fontSize={10} color={theme.primaryColor}>+{trophy.xpReward} XP</TText>
                  </View>
                )}
              </View>

              <View style={s.monthlyProgressRow}>
                <View style={[s.monthlyProgressBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      s.monthlyProgressFill,
                      {
                        backgroundColor: done ? theme.success : theme.primaryColor,
                        width: `${Math.round((done ? 1 : pct) * 100)}%` as any,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </TCard>
  );
}

const s = StyleSheet.create({
  monthlyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthlyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthlyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  monthlyList: { gap: 10 },
  monthlyItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  monthlyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  monthlyItemInfo: { flex: 1, gap: 1 },
  monthlyDoneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  monthlyXpBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    justifyContent: "center",
  },
  monthlyProgressRow: {
    height: 3,
  },
  monthlyProgressBg: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  monthlyProgressFill: {
    height: 3,
    borderRadius: 1.5,
    minWidth: 3,
  },
});
