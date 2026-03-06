import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { MONTHLY_TROPHIES } from "@packages/gamification/src/achievements";
import { soundManager } from "@/src/services/SoundManager";

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
    <View
      ref={challengesCardRef}
      collapsable={false}
      style={[s.monthlyCard, { backgroundColor: theme.cardBackground, borderColor: theme.primaryColor + "33" }]}
    >
      <View style={s.monthlyHeader}>
        <View style={s.monthlyTitleRow}>
          <Text style={s.monthlyEmoji}>🏅</Text>
          <View>
            <Text style={[s.monthlyTitle, { color: theme.textColor }]}>Desafios</Text>
            <TouchableOpacity
              onPress={() => { soundManager.play("share"); onShareChallenges(completedThisMonth.size, MONTHLY_TROPHIES.length); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
            >
              <Feather name="share-2" size={12} color={theme.primaryColor} />
              <Text style={{ fontSize: 11, color: theme.primaryColor, fontFamily: "DMSans_700Bold" }}>
                Compartilhar Grupo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[s.monthlyBadge, { backgroundColor: theme.primaryColor + "22" }]}>
          <Text style={[s.monthlyBadgeText, { color: theme.primaryColor }]}>
            {completedThisMonth.size}/{MONTHLY_TROPHIES.length}
          </Text>
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
                <Text style={s.monthlyItemIcon}>{trophy.icon}</Text>
                <View style={s.monthlyItemInfo}>
                  <Text style={[s.monthlyItemName, { color: theme.textColor }]}>{trophy.name}</Text>
                  <Text style={[s.monthlyItemDesc, { color: theme.secondaryText }]} numberOfLines={1}>
                    {trophy.description}
                  </Text>
                </View>
                {done ? (
                  <View style={[s.monthlyDoneBadge, { backgroundColor: theme.success + "22" }]}>
                    <Feather name="check" size={14} color={theme.success} />
                  </View>
                ) : (
                  <View style={[s.monthlyXpBadge, { backgroundColor: theme.border + "44" }]}>
                    <Text style={[s.monthlyXpText, { color: theme.primaryColor }]}>+{trophy.xpReward} XP</Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  monthlyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(30, 16, 64, 0.8)",
  },
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
  monthlyEmoji: { fontSize: 22 },
  monthlyTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#E9D5FF",
  },
  monthlyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  monthlyBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
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
  monthlyItemIcon: { fontSize: 22 },
  monthlyItemInfo: { flex: 1, gap: 1 },
  monthlyItemName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#E9D5FF",
  },
  monthlyItemDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "rgba(233, 213, 255, 0.7)",
    lineHeight: 14,
  },
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
  monthlyXpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#A78BFA",
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
