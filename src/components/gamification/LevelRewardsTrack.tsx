import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TCard, TText } from "@/src/components/tamagui";
import { getLevelRewards } from "@packages/gamification";

interface LevelRewardsTrackProps {
  level: number;
  theme: any;
  onOpenAnnualReport?: () => void;
}

export function LevelRewardsTrack({
  level,
  theme,
  onOpenAnnualReport,
}: LevelRewardsTrackProps) {
  const rewards = getLevelRewards(level);

  return (
    <TCard
      elevated
      backgroundColor={theme.cardBackground}
      borderColor={theme.border}
      borderRadius={14}
      padding={16}
      gap={12}
      marginVertical={8}
    >
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="gift" size={18} color={theme.accentColor} />
          <TText variant="subtitle" color={theme.textColor}>
            Recompensas por Nível
          </TText>
        </View>
        <View style={[s.currentLevelBadge, { backgroundColor: `${theme.primaryColor}20` }]}>
          <TText variant="caption" fontWeight="700" color={theme.primaryColor}>
            Seu Nível: {level}
          </TText>
        </View>
      </View>

      <TText variant="caption" color={theme.secondaryText}>
        Cada faixa de nível conquistada desbloqueia novas ferramentas úteis para a sua rotina financeira:
      </TText>

      <View style={s.trackContainer}>
        {rewards.map((reward) => {
          const isUnlocked = reward.isUnlocked;
          return (
            <View
              key={reward.level}
              style={[
                s.rewardCard,
                {
                  backgroundColor: isUnlocked ? `${theme.primaryColor}08` : `${theme.border}15`,
                  borderColor: isUnlocked ? `${theme.primaryColor}35` : theme.border,
                },
              ]}
            >
              <View style={s.rewardHeader}>
                <View
                  style={[
                    s.iconCircle,
                    {
                      backgroundColor: isUnlocked
                        ? `${theme.primaryColor}20`
                        : `${theme.secondaryText}20`,
                    },
                  ]}
                >
                  <Feather
                    name={isUnlocked ? (reward.icon as any) : "lock"}
                    size={15}
                    color={isUnlocked ? theme.primaryColor : theme.secondaryText}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TText variant="label" fontWeight="700" color={theme.textColor} flex={1}>
                      {reward.title}
                    </TText>
                    <View
                      style={[
                        s.badge,
                        {
                          backgroundColor: isUnlocked
                            ? theme.success ?? "#10B981"
                            : theme.primaryColor,
                        },
                      ]}
                    >
                      <TText variant="caption" fontWeight="700" color="#FFF">
                        {isUnlocked ? "Desbloqueado" : `Nível ${reward.level}`}
                      </TText>
                    </View>
                  </View>
                  <TText variant="caption" color={theme.secondaryText} marginTop={2} lineHeight={16}>
                    {reward.description}
                  </TText>
                </View>
              </View>

              {isUnlocked && reward.featureKey === "annual_report_and_custom_budget" && onOpenAnnualReport && (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: `${theme.primaryColor}15` }]}
                  onPress={onOpenAnnualReport}
                >
                  <Feather name="bar-chart-2" size={13} color={theme.primaryColor} />
                  <TText variant="caption" fontWeight="700" color={theme.primaryColor}>
                    Abrir Relatório Anual & Metas
                  </TText>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </TCard>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trackContainer: {
    gap: 10,
  },
  rewardCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  rewardHeader: {
    flexDirection: "row",
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
});
