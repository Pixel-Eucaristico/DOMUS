import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LottieTrophy } from "@/src/components/gamification/LottieTrophy";
import { AnimatedCard } from "@/src/components/shared/AnimatedCard";
import type { AchievementRarity } from "@packages/gamification/src/achievements";
import { soundManager } from "@/src/services/SoundManager";
import Animated, { FadeIn } from "react-native-reanimated";
import { useResponsive } from "@/src/ui/layout/useResponsive";

interface GamificationWidgetProps {
  theme: any;
  currentTrophy: { id: string; icon: string; tier: number } | null;
  levelInfo: { level: number };
  recentAchievements: Array<{ id: string; rarity: AchievementRarity; name?: string }>;
  achievementPool: Array<{ id: string; name: string }>;
  monthProgress: number;
}

export function GamificationWidget({
  theme,
  currentTrophy,
  levelInfo,
  recentAchievements,
  achievementPool,
  monthProgress,
}: GamificationWidgetProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();

  return (
    <AnimatedCard index={1}>
      <View style={[s.gamificationWidget, { marginHorizontal: 0, width: "100%", backgroundColor: theme.primaryColor + '08', borderColor: theme.primaryColor + '18' }]}>
        <View style={s.widgetHeader}>
          <View style={s.widgetTitleRow}>
            <MaterialCommunityIcons name="shield-star" size={18} color={theme.primaryColor} />
            <Text style={[s.widgetTitle, { color: theme.textColor }]}>Minha Jornada</Text>
          </View>
          <Pressable onPress={() => { soundManager.play("tap"); router.push("/(tabs)/season"); }}>
            <Text style={[s.widgetSeeAll, { color: theme.primaryColor }]}>Ver tudo</Text>
          </Pressable>
        </View>

        <View style={s.widgetContent}>
          <Pressable
            style={[s.trophyPreview, { backgroundColor: theme.primaryColor + '08', borderColor: theme.primaryColor + '18' }]}
            onPress={() => { soundManager.play("tap"); router.push("/(tabs)/season"); }}
          >
            {currentTrophy ? (
              <>
                <LottieTrophy
                  trophyId={currentTrophy.id}
                  type="seasonal"
                  icon={currentTrophy.icon}
                  size={60}
                  color={theme.primaryColor}
                  isStatic
                />
                <Text style={[s.trophyLabel, { color: theme.secondaryText }]}>Troféu do Mês</Text>
              </>
            ) : (
              <>
                <View style={[s.levelCircle, { borderColor: theme.primaryColor }]}>
                  <Text style={[s.levelCircleText, { color: theme.primaryColor }]}>{levelInfo.level}</Text>
                </View>
                <Text style={[s.trophyLabel, { color: theme.secondaryText }]}>Meu Nível</Text>
              </>
            )}
          </Pressable>

          <View style={s.recentAchsColumn}>
            <Text style={[s.miniLabel, { color: theme.secondaryText }]}>CONQUISTAS RECENTES</Text>
            <View style={s.achsRow}>
              {recentAchievements.length > 0 ? (
                recentAchievements.map((ach, idx) => {
                  const fullAch = achievementPool.find(a => a.id === ach.id);
                  return (
                    <View key={ach.id} style={{ alignItems: 'center', gap: 2 }}>
                      <Animated.View
                        entering={FadeIn.delay(idx * 150)}
                        style={[s.miniTrophy, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                      >
                        <LottieTrophy trophyId={ach.id} type="achievement" rarity={ach.rarity} size={22} isStatic />
                      </Animated.View>
                      <Text style={{ fontSize: 8, color: theme.secondaryText, width: 42, textAlign: 'center' }} numberOfLines={1}>
                        {fullAch?.name || '---'}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={[s.noAchsText, { color: theme.secondaryText }]}>Nenhum troféu ainda</Text>
              )}
            </View>

            <View style={s.widgetProgressSection}>
              <View style={s.widgetProgressHeader}>
                <Text style={[s.miniLabel, { color: theme.secondaryText }]}>PROGRESSO MENSAL</Text>
                <Text style={[s.progressText, { color: theme.primaryColor }]}>{monthProgress}%</Text>
              </View>
              <View style={[s.widgetProgressBarBg, { backgroundColor: theme.border }]}>
                <View style={[s.widgetProgressBarFill, { width: `${monthProgress}%` as any, backgroundColor: theme.primaryColor }]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

const s = StyleSheet.create({
  gamificationWidget: {
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  widgetTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15 },
  widgetSeeAll: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  widgetContent: { flexDirection: 'row', gap: 16 },
  trophyPreview: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  trophyLabel: { fontFamily: 'DMSans_700Bold', fontSize: 10, marginTop: -4 },
  levelCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelCircleText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 20 },
  recentAchsColumn: { flex: 1, justifyContent: 'space-between' },
  miniLabel: { fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.5, opacity: 0.6 },
  achsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  miniTrophy: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAchsText: { fontFamily: 'DMSans_400Regular', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  widgetProgressSection: { marginTop: 8 },
  widgetProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  progressText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  widgetProgressBarBg: { height: 6, borderRadius: 3 },
  widgetProgressBarFill: { height: 6, borderRadius: 3 },
});
