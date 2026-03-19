import React from "react";
import { View, ScrollView, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ALL_ACHIEVEMENTS } from "@packages/gamification/src/achievements";
import type { Achievement } from "@packages/gamification/src/achievements";
import { AnimatedTrophy } from "@/src/components/gamification/AnimatedTrophy";
import { soundManager } from "@/src/services/SoundManager";
import { capitalize } from "@/src/hooks/useSeasonData";
import { TCard, TText } from "@/src/components/tamagui";

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
      <TCard
        ref={collectionCardRef}
        collapsable={false}
        backgroundColor={theme.cardBackground}
        borderColor={theme.border}
        gap={16}
      >
        <View style={s.achievementsHeader}>
          <Feather name="award" size={16} color={theme.primaryColor} />
          <TText variant="subtitle" color={theme.textColor} flex={1}>
            Meus Troféus
          </TText>
          <TouchableOpacity onPress={onShareCollection}>
            <Feather name="share-2" size={16} color={theme.primaryColor} />
          </TouchableOpacity>
          <TText variant="caption" bold color={theme.secondaryText} opacity={0.6}>
            {unlockedIds.size}/{ALL_ACHIEVEMENTS.length}
          </TText>
        </View>

        <View style={s.xpStatsRow}>
          <View style={s.xpStatItem}>
            <TText variant="subtitle" bold color="#A78BFA">
              {totalXpFromAchs.toLocaleString("pt-BR")}
            </TText>
            <TText
              fontSize={9}
              bold
              color={theme.secondaryText}
              textTransform="uppercase"
              opacity={0.5}
            >
              XP Troféus
            </TText>
          </View>
          <View style={[s.xpStatDivider, { backgroundColor: theme.border }]} />
          <View style={s.xpStatItem}>
            <TText variant="subtitle" bold color={theme.textColor}>
              {gamification.totalXp.toLocaleString("pt-BR")}
            </TText>
            <TText
              fontSize={9}
              bold
              color={theme.secondaryText}
              textTransform="uppercase"
              opacity={0.5}
            >
              XP Total
            </TText>
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
                <TText
                  bold
                  fontSize={11}
                  textAlign="center"
                  lineHeight={14}
                  marginTop={2}
                  color={unlocked ? theme.textColor : theme.secondaryText}
                  numberOfLines={1}
                >
                  {ach.name}
                </TText>
              </Pressable>
            );
          })}
        </View>
      </TCard>

      {/* Badges */}
      {season.badges.length > 0 && (
        <TCard backgroundColor={theme.cardBackground} alignItems="flex-start" gap={12}>
          <TText variant="subtitle" bold color={theme.textColor} marginBottom={8}>
            Medalhas
          </TText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }}>
            <View style={s.badgeGridHorizontal}>
              {season.badges.map((b: any, i: number) => (
                <View key={i} style={[s.badgeItem, { backgroundColor: `${theme.primaryColor}10` }]}>
                  <Feather name="award" size={24} color={theme.primaryColor} />
                  <TText bold fontSize={11} textAlign="center" color={theme.textColor} numberOfLines={1}>
                    {b.name}
                  </TText>
                </View>
              ))}
            </View>
          </ScrollView>
        </TCard>
      )}

      {/* History */}
      {season.history.length > 0 && (
        <TCard backgroundColor={theme.cardBackground} alignItems="flex-start" gap={12}>
          <TText variant="subtitle" bold color={theme.textColor} marginBottom={8}>
            Histórico
          </TText>
          {season.history.map((h: any, i: number) => (
            <View key={i} style={[s.historyRow, { borderBottomColor: theme.border }]}>
              <View style={s.historyInfo}>
                <TText bold color={theme.textColor}>{h.seasonId}</TText>
                <TText variant="caption" color={theme.secondaryText} opacity={0.6}>
                  {capitalize(h.archetype)} / Lvl {h.level}
                </TText>
              </View>
              <TText bold color={theme.primaryColor}>{h.totalXp} XP</TText>
            </View>
          ))}
        </TCard>
      )}
    </>
  );
}

const s = StyleSheet.create({
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyInfo: { gap: 2 },
});
