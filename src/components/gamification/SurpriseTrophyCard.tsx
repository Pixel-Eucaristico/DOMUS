import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Share } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TCard } from "@/src/components/tamagui";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { soundManager } from "@/src/services/SoundManager";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import {
  ALL_SEASONAL_TROPHIES,
  getTierColor,
  getTierLabel,
  getSeasonalXp,
} from "@packages/gamification/src/seasonalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import { ReligiousPreferenceModal } from "@/src/components/shared/ReligiousPreferenceModal";
import { TrophyAlbumView } from "./TrophyAlbumView";
import { TrophyDetailModal } from "./TrophyDetailModal";
import type { AlbumTrophySelection } from "./TrophyAlbumView";

interface SurpriseTrophyCardProps {
  currentYear: number;
  currentMonth: number;
  gamification: any;
  domain: any;
  budget: any;
  theme: any;
  isCatholic: boolean;
  setIsCatholic: (val: boolean) => void;
}

const triggerHaptic = () => {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

export const SurpriseTrophyCard: React.FC<SurpriseTrophyCardProps> = ({
  currentYear,
  currentMonth,
  gamification,
  domain,
  budget,
  theme,
  isCatholic,
  setIsCatholic,
}) => {
  const [showCatholicModal, setShowCatholicModal] = useState(false);
  const [viewingYear, setViewingYear] = useState(currentYear);
  const [selectedAlbumTrophy, setSelectedAlbumTrophy] = useState<AlbumTrophySelection | null>(null);

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const cardRef = React.useRef<View>(null);
  const selectedEntry = (gamification.selectedSeasonalTrophies ?? []).find(
    (s: any) => s.monthKey === monthKey,
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    [
      ...(gamification.selectedSeasonalTrophies ?? []),
      ...(gamification.completedSeasonalTrophies ?? []),
    ].forEach((entry: any) => {
      const year = parseInt(entry.monthKey.split("-")[0]);
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [gamification.selectedSeasonalTrophies, gamification.completedSeasonalTrophies, currentYear]);

  const isCompleted = selectedEntry
    ? (gamification.completedSeasonalTrophies ?? []).some(
        (c: any) => c.trophyId === selectedEntry.trophyId && c.monthKey === monthKey,
      )
    : false;

  const trophy = selectedEntry
    ? (ALL_SEASONAL_TROPHIES.find((t: any) => t.id === selectedEntry.trophyId) ??
      ALL_LITURGICAL_TROPHIES.find((t: any) => t.id === selectedEntry.trophyId))
    : null;

  const tier = selectedEntry?.tier ?? 1;
  const tierColor = getTierColor(tier);
  const tierLabel = getTierLabel(tier);
  const xp = trophy ? getSeasonalXp(trophy.baseXp, tier) : 0;
  const prog = trophy && selectedEntry ? trophy.progress(domain, budget, monthKey) : null;
  const pct = prog && prog.target > 0 ? Math.min(1, prog.current / prog.target) : 0;

  const handleShareTrophy = async () => {
    if (!cardRef.current) return;
    try {
      triggerHaptic();
      soundManager.play("share");
      const uri = await captureRef(cardRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, {
        dialogTitle: `Conquistei o troféu ${trophy?.name}!`,
        mimeType: "image/png",
      });
    } catch {
      if (!trophy) return;
      await Share.share({
        message:
          `🏅 Sorteio do Mês: Conquistei "${trophy.name}" no nível ${tierLabel}!\n` +
          `✨ ${trophy.eventSummary}\n\n` +
          `#DOMUS #Finanças #TrofeuSurpresa`,
      });
    }
  };

  const isLiturgical = !!ALL_LITURGICAL_TROPHIES.find((lt: any) => lt.id === trophy?.id);

  return (
    <TCard
      ref={cardRef}
      collapsable={false}
      elevated
      backgroundColor={theme.cardBackground}
      borderColor={theme.border}
      style={{
        borderWidth: 1.5,
        borderColor: tierColor + "55",
        borderRadius: 20,
        padding: 20,
        gap: 16,
        overflow: "hidden",
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
      }}
    >
      <LinearGradient
        colors={[tierColor + "15", "transparent", theme.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={s.surpriseHeader}>
        <View style={s.surpriseTitleRow}>
          <Text style={s.surpriseEmoji}>🎴</Text>
          <View>
            <Text style={[s.surpriseTitle, { color: theme.textColor }]}>Troféu Surpresa do Mês</Text>
            <Text style={[s.surpriseSubtitle, { color: theme.secondaryText }]}>
              Sorteado exclusivamente para você
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {selectedEntry && (
            <View style={[s.tierBadge, { backgroundColor: tierColor + "22" }]}>
              <Text style={[s.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => { soundManager.play("pop"); setShowCatholicModal(true); }}
            style={[s.catholicPrefBtn, { borderColor: theme.border }]}
            activeOpacity={0.7}
          >
            <Text style={[s.catholicPrefText, { color: theme.secondaryText }]}>
              {isCatholic ? "✝️ Católico" : "⚙️ Preferência"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!selectedEntry ? (
        <View
          style={[
            s.mysteryBox,
            { backgroundColor: theme.primaryColor + "08", borderColor: theme.primaryColor + "15" },
          ]}
        >
          <Text style={s.mysteryIcon}>❓</Text>
          <Text style={[s.mysteryText, { color: theme.secondaryText }]}>
            Seu troféu do mês ainda não foi revelado.{"\n"}Abra o app amanhã para descobrir!
          </Text>
        </View>
      ) : (
        <View style={s.surpriseTrophyContent}>
          <View
            style={[
              s.eventSummaryBox,
              { backgroundColor: tierColor + "0F", borderColor: theme.primaryColor + "18" },
            ]}
          >
            <View style={[s.surpriseTrophyIconWrapper, { backgroundColor: tierColor + "0F" }]}>
              <AnimatedSeasonalTrophy
                icon={trophy?.icon}
                id={trophy?.id}
                size={80}
                color={tierColor}
                isLiturgical={isLiturgical}
              />
            </View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={[s.surpriseTrophyName, { color: theme.textColor, flex: 1 }]}>
                  {trophy?.name}
                </Text>
                <TouchableOpacity onPress={handleShareTrophy} style={{ padding: 4 }}>
                  <Feather name="share-2" size={16} color={tierColor} />
                </TouchableOpacity>
              </View>
              <Text style={[s.eventSummaryText, { color: theme.secondaryText }]}>
                {trophy?.eventSummary}
              </Text>
            </View>
          </View>

          <View style={[s.goalBox, { backgroundColor: theme.primaryColor + "08", borderColor: theme.border }]}>
            <Feather name="target" size={13} color={tierColor} />
            <Text style={[s.goalText, { color: theme.textColor }]}>{trophy?.description}</Text>
          </View>

          {prog && (
            <View style={s.surpriseProgressSection}>
              <View style={s.surpriseProgressRow}>
                <View style={[s.surpriseProgressBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      s.surpriseProgressFill,
                      {
                        width: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: isCompleted ? tierColor : theme.accentColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.surpriseProgressLabel, { color: theme.secondaryText }]}>
                  {prog.current}/{prog.target} {prog.unit}
                </Text>
              </View>
            </View>
          )}

          <View style={s.surpriseFooter}>
            <View style={[s.surpriseXpBadge, { backgroundColor: tierColor + "20" }]}>
              <Feather name="zap" size={12} color={tierColor} />
              <Text style={[s.surpriseXpText, { color: tierColor }]}>+{xp} XP</Text>
            </View>
            {tier > 1 && (
              <Text style={[s.tierRepeatText, { color: theme.secondaryText }]}>
                ✨ {tier === 2 ? "2ª vez" : "3ª vez"}
              </Text>
            )}
            {isCompleted && (
              <View style={[s.completedBadge, { backgroundColor: tierColor + "22" }]}>
                <Feather name="check-circle" size={13} color={tierColor} />
                <Text style={[s.completedBadgeText, { color: tierColor }]}>Conquistado!</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Text style={[s.surpriseInfo, { color: theme.secondaryText }]}>
        🎴 A cada mês um troféu diferente é sorteado. Ao repetir no ano seguinte, o nível sobe.
      </Text>

      <TrophyAlbumView
        viewingYear={viewingYear}
        currentYear={currentYear}
        currentMonth={currentMonth}
        gamification={gamification}
        availableYears={availableYears}
        onYearChange={setViewingYear}
        onSelectTrophy={setSelectedAlbumTrophy}
        theme={theme}
      />

      <ReligiousPreferenceModal
        visible={showCatholicModal}
        onSelect={(val) => {
          setIsCatholic(val);
          setShowCatholicModal(false);
        }}
      />

      <TrophyDetailModal
        selection={selectedAlbumTrophy}
        onClose={() => setSelectedAlbumTrophy(null)}
        theme={theme}
        completionCount={gamification.completionCounts?.[selectedAlbumTrophy?.trophy?.id ?? ""] ?? 0}
      />
    </TCard>
  );
};

const s = StyleSheet.create({
  surpriseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  surpriseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  surpriseEmoji: { fontSize: 24 },
  surpriseTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  surpriseSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 1,
    opacity: 0.7,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tierBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  catholicPrefBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  catholicPrefText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
  },
  mysteryBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  mysteryIcon: { fontSize: 48 },
  mysteryText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  surpriseTrophyContent: { gap: 14 },
  eventSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  surpriseTrophyIconWrapper: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
  },
  surpriseTrophyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  eventSummaryText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.7,
  },
  goalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  goalText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  surpriseProgressSection: { gap: 6 },
  surpriseProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  surpriseProgressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  surpriseProgressFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 8,
  },
  surpriseProgressLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    minWidth: 80,
    textAlign: "right",
  },
  surpriseFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  surpriseXpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  surpriseXpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  tierRepeatText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    opacity: 0.6,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  surpriseInfo: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    opacity: 0.5,
    paddingHorizontal: 8,
  },
});
