import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform, Share } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import { 
  ALL_SEASONAL_TROPHIES, 
  getTierColor, 
  getTierLabel, 
  getSeasonalXp 
} from "@packages/gamification/src/seasonalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import { ReligiousPreferenceModal } from "@/src/components/shared/ReligiousPreferenceModal";

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

/**
 * SurpriseTrophyCard: SRP - Handles only the surprise trophy logic and UI.
 */
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
  const [selectedAlbumTrophy, setSelectedAlbumTrophy] = useState<any>(null);

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const cardRef = React.useRef<View>(null);
  const selectedEntry = (gamification.selectedSeasonalTrophies ?? []).find(
    (s: any) => s.monthKey === monthKey
  );

  // Extract all unique years from trophy history
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
        (c: any) => c.trophyId === selectedEntry.trophyId && c.monthKey === monthKey
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
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 0.9,
      });
      await Sharing.shareAsync(uri, {
        dialogTitle: `Conquistei o troféu ${trophy?.name}!`,
        mimeType: 'image/png',
      });
    } catch (e) {
      // Fallback to text sharing if image fails
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
    <View ref={cardRef} collapsable={false} style={[styles.surpriseCard, { borderColor: tierColor + "55", backgroundColor: theme.cardBackground }]}>
      <LinearGradient
        colors={[tierColor + "15", "transparent", theme.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Header */}
      <View style={styles.surpriseHeader}>
        <View style={styles.surpriseTitleRow}>
          <Text style={styles.surpriseEmoji}>🎴</Text>
          <View>
            <Text style={[styles.surpriseTitle, { color: theme.textColor }]}>
              Troféu Surpresa do Mês
            </Text>
            <Text style={[styles.surpriseSubtitle, { color: theme.secondaryText }]}>
              Sorteado exclusivamente para você
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {selectedEntry && (
            <View style={[styles.tierBadge, { backgroundColor: tierColor + "22" }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowCatholicModal(true)}
            style={[styles.catholicPrefBtn, { borderColor: theme.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.catholicPrefText, { color: theme.secondaryText }]}>
              {isCatholic ? "✝️ Católico" : "⚙️ Preferência"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!selectedEntry ? (
        <View style={[styles.mysteryBox, { backgroundColor: theme.primaryColor + "08", borderColor: theme.primaryColor + "15" }]}>
          <Text style={styles.mysteryIcon}>❓</Text>
          <Text style={[styles.mysteryText, { color: theme.secondaryText }]}>
            Seu troféu do mês ainda não foi revelado.{"\n"}Abra o app amanhã para descobrir!
          </Text>
        </View>
      ) : (
        <View style={styles.surpriseTrophyContent}>
          <View style={[styles.eventSummaryBox, { backgroundColor: tierColor + "0F", borderColor: theme.primaryColor + "18" }]}>
            <View style={[styles.surpriseTrophyIconWrapper, { backgroundColor: tierColor + "0F" }]}>
              <AnimatedSeasonalTrophy
                icon={trophy?.icon}
                id={trophy?.id}
                size={80}
                color={tierColor}
                isLiturgical={isLiturgical}
              />
            </View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={[styles.surpriseTrophyName, { color: theme.textColor, flex: 1 }]}>
                  {trophy?.name}
                </Text>
                <TouchableOpacity onPress={handleShareTrophy} style={{ padding: 4 }}>
                  <Feather name="share-2" size={16} color={tierColor} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.eventSummaryText, { color: theme.secondaryText }]}>
                {trophy?.eventSummary}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.goalBox,
              { backgroundColor: theme.primaryColor + "08", borderColor: theme.border },
            ]}
          >
            <Feather name="target" size={13} color={tierColor} />
            <Text style={[styles.goalText, { color: theme.textColor }]}>{trophy?.description}</Text>
          </View>

          {prog && (
            <View style={styles.surpriseProgressSection}>
              <View style={styles.surpriseProgressRow}>
                <View style={[styles.surpriseProgressBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.surpriseProgressFill,
                      {
                        width: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: isCompleted ? tierColor : theme.accentColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.surpriseProgressLabel, { color: theme.secondaryText }]}>
                  {prog.current}/{prog.target} {prog.unit}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.surpriseFooter}>
            <View style={[styles.surpriseXpBadge, { backgroundColor: tierColor + "20" }]}>
              <Feather name="zap" size={12} color={tierColor} />
              <Text style={[styles.surpriseXpText, { color: tierColor }]}>+{xp} XP</Text>
            </View>
            {tier > 1 && (
              <Text style={[styles.tierRepeatText, { color: theme.secondaryText }]}>
                ✨ {tier === 2 ? "2ª vez" : "3ª vez"}
              </Text>
            )}
            {isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: tierColor + "22" }]}>
                <Feather name="check-circle" size={13} color={tierColor} />
                <Text style={[styles.completedBadgeText, { color: tierColor }]}>Conquistado!</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Text style={[styles.surpriseInfo, { color: theme.secondaryText }]}>
        🎴 A cada mês um troféu diferente é sorteado. Ao repetir no ano seguinte, o nível sobe.
      </Text>

      {/* Album section with year selector */}
      <AlbumView
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

      {/* Album Trophy Detail Modal */}
      <Modal
        visible={!!selectedAlbumTrophy}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAlbumTrophy(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedAlbumTrophy(null)}
        >
          <Pressable
            style={[styles.trophyDetailModal, { backgroundColor: theme.cardBackground }]}
            onPress={() => {}}
          >
            <LinearGradient
              colors={[selectedAlbumTrophy?.tierColor + "20", "transparent"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <View style={styles.modalHeader}>
              <View style={[styles.tierBadge, { backgroundColor: selectedAlbumTrophy?.tierColor + "22" }]}>
                <Text style={[styles.tierBadgeText, { color: selectedAlbumTrophy?.tierColor }]}>
                  {selectedAlbumTrophy?.tierLabel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAlbumTrophy(null)}
                style={[styles.closeModalBtn, { backgroundColor: theme.border + "44" }]}
              >
                <Feather name="x" size={18} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAnimatedWrapper}>
              <AnimatedSeasonalTrophy
                icon={selectedAlbumTrophy?.trophy?.icon}
                id={selectedAlbumTrophy?.trophy?.id}
                size={140}
                color={selectedAlbumTrophy?.tierColor}
                isLiturgical={selectedAlbumTrophy?.isLiturgical}
              />
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.modalTrophyName, { color: theme.textColor }]}>
                {selectedAlbumTrophy?.trophy?.name}
              </Text>
              <Text style={[styles.modalEventSummary, { color: theme.secondaryText }]}>
                {selectedAlbumTrophy?.trophy?.eventSummary}
              </Text>
              
              <View style={[styles.modalGoalBox, { borderColor: theme.border, backgroundColor: theme.primaryColor + "08" }]}>
                <Feather name="target" size={14} color={selectedAlbumTrophy?.tierColor} />
                <Text style={[styles.modalGoalText, { color: theme.textColor }]}>
                  {selectedAlbumTrophy?.trophy?.description}
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <View style={[styles.xpBadge, { backgroundColor: selectedAlbumTrophy?.tierColor + "15" }]}>
                  <Feather name="zap" size={14} color={selectedAlbumTrophy?.tierColor} />
                  <Text style={[styles.xpText, { color: selectedAlbumTrophy?.tierColor }]}>
                    +{getSeasonalXp(selectedAlbumTrophy?.trophy?.baseXp ?? 0, selectedAlbumTrophy?.tier ?? 1)} XP
                  </Text>
                </View>
                {selectedAlbumTrophy?.isCompleted && (
                  <View style={[styles.completedBadgeModal, { backgroundColor: theme.success + "15" }]}>
                    <Feather name="check-circle" size={14} color={theme.success} />
                    <Text style={[styles.completedText, { color: theme.success }]}>Conquistado</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

interface AlbumProps {
  viewingYear: number;
  currentYear: number;
  currentMonth: number;
  gamification: any;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onSelectTrophy: (trophy: any) => void;
  theme: any;
}

const AlbumView = ({
  viewingYear,
  currentYear,
  currentMonth,
  gamification,
  availableYears,
  onYearChange,
  onSelectTrophy,
  theme,
}: AlbumProps) => {
  const ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <View style={styles.albumSection}>
      <View style={styles.albumHeader}>
        <Text style={[styles.albumTitle, { color: theme.secondaryText }]}>Álbum {viewingYear}</Text>
        
        {availableYears.length > 1 && (
          <View style={[styles.yearSelector, { backgroundColor: theme.primaryColor + "12" }]}>
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => {
                  triggerHaptic();
                  onYearChange(year);
                }}
                style={[
                  styles.yearButton,
                  viewingYear === year && { backgroundColor: theme.primaryColor + "22" },
                ]}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    { color: viewingYear === year ? theme.primaryColor : theme.secondaryText },
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.albumGrid}>
        {ABBR.map((abbr, i) => {
          const m = i + 1;
          const mk = `${viewingYear}-${String(m).padStart(2, "0")}`;
          const sel = (gamification.selectedSeasonalTrophies ?? []).find(
            (s: any) => s.monthKey === mk
          );
          const comp = sel
            ? (gamification.completedSeasonalTrophies ?? []).find(
                (c: any) => c.trophyId === sel.trophyId && c.monthKey === mk
              )
            : null;
          const t = sel
            ? ALL_SEASONAL_TROPHIES.find((tr: any) => tr.id === sel.trophyId) ??
              ALL_LITURGICAL_TROPHIES.find((tr: any) => tr.id === sel.trophyId)
            : null;
          const tier = sel?.tier ?? 1;
          const tc = sel ? getTierColor(tier) : null;
          const tl = sel ? getTierLabel(tier) : null;
          const isComp = !!comp;
          const isCurrent = viewingYear === currentYear && m === currentMonth;
          const isFuture = viewingYear > currentYear || (viewingYear === currentYear && m > currentMonth);
          const isLit = !!ALL_LITURGICAL_TROPHIES.find((lt: any) => lt.id === t?.id);
          
          return (
            <TouchableOpacity
              key={mk}
              onPress={() => {
                if (sel && t) {
                  triggerHaptic();
                  onSelectTrophy({ trophy: t, tier, tierColor: tc, tierLabel: tl, isCompleted: isComp, isLiturgical: isLit });
                }
              }}
              disabled={!sel}
              style={[
                styles.albumCell,
                {
                  backgroundColor: isComp
                    ? (tc ?? theme.secondaryText) + "22"
                    : isCurrent
                    ? theme.primaryColor + "0A"
                    : theme.border + "22",
                  borderColor: isComp
                    ? (tc ?? theme.secondaryText) + "55"
                    : isCurrent
                    ? theme.primaryColor + "33"
                    : theme.border + "44",
                },
              ]}
            >
              <View style={[styles.albumTrophyWrapper, !isComp && { opacity: 0.35 } as any]}>
                {sel && t ? (
                  <AnimatedSeasonalTrophy
                    icon={t.icon}
                    id={t.id}
                    size={36}
                    color={isComp ? (tc ?? theme.secondaryText) : theme.secondaryText}
                    isLiturgical={isLit}
                    isStatic={true}
                  />
                ) : (
                  <Text style={[styles.albumIcon, { opacity: isFuture ? 0.3 : 0.1 }]}>
                    {isFuture ? "❓" : "—"}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.albumMonthLabel,
                  { color: isComp ? tc ?? theme.secondaryText : isCurrent ? theme.textColor : theme.secondaryText },
                ]}
              >
                {abbr}
              </Text>
              {isComp && tc && <View style={[styles.albumTierDot, { backgroundColor: tc }]} />}
              {!isComp && sel && (
                <View style={styles.lockedBadge}>
                  <Feather name="lock" size={8} color={theme.secondaryText} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surpriseCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
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
  albumSection: { gap: 12, marginTop: 4 },
  albumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  albumTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  yearSelector: {
    flexDirection: "row",
    gap: 4,
    padding: 2,
    borderRadius: 8,
  },
  yearButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  yearButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  albumCell: {
    width: "23%",
    aspectRatio: 0.85,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    position: "relative",
  },
  albumIcon: { fontSize: 16, lineHeight: 20 },
  albumTrophyWrapper: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  albumMonthLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
  },
  albumTierDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  lockedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  trophyDetailModal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAnimatedWrapper: {
    alignItems: "center",
    paddingVertical: 10,
  },
  modalContent: {
    gap: 12,
  },
  modalTrophyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalEventSummary: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  modalGoalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalGoalText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  completedBadgeModal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  completedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
});
