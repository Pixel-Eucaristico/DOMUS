import React from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ALL_ACHIEVEMENTS } from "@packages/gamification/src/achievements";
import type { Achievement } from "@packages/gamification/src/achievements";
import { AnimatedTrophy } from "@/src/components/gamification/AnimatedTrophy";
import { soundManager } from "@/src/services/SoundManager";
import { capitalize } from "@/src/hooks/useSeasonData";

interface AchievementGridProps {
  theme: any;
  gamification: any;
  season: any;
  collectionCardRef: React.RefObject<View | null>;
  onSelectAchievement: (ach: Achievement) => void;
  onShareCollection: () => void;
}

export function AchievementGrid({
  theme,
  gamification,
  season,
  collectionCardRef,
  onSelectAchievement,
  onShareCollection,
}: AchievementGridProps) {
  const unlockedIds = new Set(
    (gamification.unlockedAchievements ?? []).map((a: any) => a.id),
  );
  const totalXpFromAchs = ALL_ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).reduce(
    (s, a) => s + a.xpReward,
    0,
  );

  return (
    <>
      <View
        ref={collectionCardRef}
        collapsable={false}
        style={[s.achievementsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      >
        <View style={s.achievementsHeader}>
          <Feather name="award" size={16} color={theme.primaryColor} />
          <Text style={[s.achievementsTitle, { color: theme.textColor }]}>Meus Troféus</Text>
          <TouchableOpacity onPress={onShareCollection}>
            <Feather name="share-2" size={16} color={theme.primaryColor} />
          </TouchableOpacity>
          <Text style={[s.achievementsCount, { color: theme.secondaryText }]}>
            {unlockedIds.size}/{ALL_ACHIEVEMENTS.length}
          </Text>
        </View>

        <View style={s.xpStatsRow}>
          <View style={s.xpStatItem}>
            <Text style={[s.xpStatValue, { color: "#A78BFA" }]}>
              {totalXpFromAchs.toLocaleString("pt-BR")}
            </Text>
            <Text style={[s.xpStatLabel, { color: theme.secondaryText }]}>XP Troféus</Text>
          </View>
          <View style={[s.xpStatDivider, { backgroundColor: theme.border }]} />
          <View style={s.xpStatItem}>
            <Text style={[s.xpStatValue, { color: theme.textColor }]}>
              {gamification.totalXp.toLocaleString("pt-BR")}
            </Text>
            <Text style={[s.xpStatLabel, { color: theme.secondaryText }]}>XP Total</Text>
          </View>
        </View>

        <View style={s.trophyGrid}>
          {ALL_ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedIds.has(ach.id);
            return (
              <Pressable
                key={ach.id}
                style={({ pressed }) => [s.trophyCell, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  soundManager.play("tap");
                  onSelectAchievement(ach);
                }}
              >
                {unlocked ? (
                  <AnimatedTrophy rarity={ach.rarity} size={52} spinning={false} />
                ) : (
                  <View style={[s.lockedTrophy, { backgroundColor: theme.border }]}>
                    <Feather name="lock" size={22} color={theme.secondaryText} />
                  </View>
                )}
                <Text
                  style={[s.trophyName, { color: unlocked ? theme.textColor : theme.secondaryText }]}
                  numberOfLines={1}
                >
                  {ach.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Badges */}
      {season.badges.length > 0 && (
        <View style={[s.card, { backgroundColor: theme.cardBackground, alignItems: "flex-start" }]}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>Medalhas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }}>
            <View style={s.badgeGridHorizontal}>
              {season.badges.map((b: any, i: number) => (
                <View key={i} style={[s.badgeItem, { backgroundColor: `${theme.primaryColor}10` }]}>
                  <Feather name="award" size={24} color={theme.primaryColor} />
                  <Text style={[s.badgeName, { color: theme.textColor }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* History */}
      {season.history.length > 0 && (
        <View style={[s.card, { backgroundColor: theme.cardBackground, alignItems: "flex-start" }]}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>Histórico</Text>
          {season.history.map((h: any, i: number) => (
            <View key={i} style={[s.historyRow, { borderBottomColor: theme.border }]}>
              <View style={s.historyInfo}>
                <Text style={[s.historyId, { color: theme.textColor }]}>{h.seasonId}</Text>
                <Text style={[s.historyArch, { color: theme.secondaryText }]}>
                  {capitalize(h.archetype)} / Lvl {h.level}
                </Text>
              </View>
              <Text style={[s.historyXp, { color: theme.primaryColor }]}>{h.totalXp} XP</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  achievementsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  achievementsTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    flex: 1,
  },
  achievementsCount: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    opacity: 0.6,
  },
  xpStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(124, 58, 237, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.08)",
  },
  xpStatItem: { alignItems: "center", flex: 1, gap: 2 },
  xpStatValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  xpStatLabel: { fontFamily: "DMSans_700Bold", fontSize: 9, textTransform: "uppercase", opacity: 0.5 },
  xpStatDivider: { width: 1, height: 20, opacity: 0.1 },
  trophyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  trophyCell: {
    width: "31%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  lockedTrophy: {
    width: 48,
    height: 58,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  trophyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    marginBottom: 8,
  },
  badgeGridHorizontal: { flexDirection: "row", gap: 12, paddingRight: 20 },
  badgeItem: {
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    width: 100,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  badgeName: { fontFamily: "DMSans_700Bold", fontSize: 11, textAlign: "center" as const },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyInfo: { gap: 2 },
  historyId: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  historyArch: { fontFamily: "DMSans_400Regular", fontSize: 12, opacity: 0.6 },
  historyXp: { fontFamily: "DMSans_700Bold", fontSize: 14 },
});
