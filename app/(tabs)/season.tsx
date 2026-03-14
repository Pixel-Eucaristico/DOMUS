import React, { useState, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { getArchetypeDescription } from "@packages/personality/src/archetypeEngine";
import { ALL_ACHIEVEMENTS } from "@packages/gamification/src/achievements";
import type { Achievement } from "@packages/gamification/src/achievements";
import { SurpriseTrophyCard } from "@/src/components/gamification/SurpriseTrophyCard";
import { AnimatedTrophy } from "@/src/components/gamification/AnimatedTrophy";
import { MonthlyTrophiesList } from "@/src/components/gamification/MonthlyTrophiesList";
import { AchievementGrid } from "@/src/components/gamification/AchievementGrid";
import { soundManager } from "@/src/services/SoundManager";
import { useSeasonData, MONTHS } from "@/src/hooks/useSeasonData";
import { TourGuideZone } from "rn-tourguide";
import { TourPageHost } from "@/src/components/tour/TourPageHost";


export default function SeasonScreen() {
  const insets = useSafeAreaInsets();
  const { gamification, season, archetype, theme, levelInfo, budget, dispatch, domain, isCatholic, setIsCatholic } =
    useAppState();
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "collection">("current");
  const seasonScrollRef = useRef<ScrollView>(null);

  const webTopInset = 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const archetypeInfo = getArchetypeDescription(archetype) || { name: "Explorador", description: "" };

  const sd = useSeasonData({ gamification, season, domain, budget, levelInfo, archetype, dispatch });

  const seriesProgress = useMemo(
    () => sd.computeSeriesProgress(selectedAch),
    [selectedAch, domain, gamification, budget],
  );

  const handleTabChange = (tab: "current" | "collection") => {
    setActiveTab(tab);
    soundManager.play("tabSwitch");
  };

  return (
    <TourPageHost groupId={4}>
    <View style={[st.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + webTopInset + 16, backgroundColor: theme.background }]}>
        <View style={st.headerTop} ref={sd.levelCardRef} collapsable={false}>
          <View style={{ flex: 1 }}>
            <Text style={[st.title, { color: theme.textColor }]}>Temporada</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>{MONTHS[sd.currentMonth - 1]}</Text>
              <View style={[st.archetypeBadge, { backgroundColor: theme.primaryColor + "22" }]}>
                <MaterialCommunityIcons name="shield-star" size={12} color={theme.primaryColor} />
                <Text style={[st.archetypeBadgeText, { color: theme.primaryColor }]}>{archetypeInfo.name}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={sd.handleShareXpLevel}
            style={[st.levelBadge, { backgroundColor: theme.primaryColor, flexDirection: "row", gap: 6, alignItems: "center" }]}
          >
            <Text style={st.levelText}>Nível {levelInfo.level}</Text>
            <Feather name="share-2" size={12} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={[st.tabContainer, { backgroundColor: theme.border + "44" }]}>
          <Pressable
            onPress={() => handleTabChange("current")}
            style={[st.tab, activeTab === "current" && { backgroundColor: theme.cardBackground }]}
          >
            <Text style={[st.tabText, { color: activeTab === "current" ? theme.textColor : theme.secondaryText }]}>
              Atual
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabChange("collection")}
            style={[st.tab, activeTab === "collection" && { backgroundColor: theme.cardBackground }]}
          >
            <Text style={[st.tabText, { color: activeTab === "collection" ? theme.textColor : theme.secondaryText }]}>
              Coleção
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={seasonScrollRef}
        contentContainerStyle={[st.content, { paddingBottom: insets.bottom + webBottomInset + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "current" ? (
          <>
            {/* Season progress / start */}
            {!sd.hasSeason ? (
              <>
                <TourGuideZone zone={1} text="10" isTourGuide borderRadius={16}>
                <View collapsable={false} style={[st.card, { backgroundColor: theme.cardBackground }]}>
                  <Feather name="calendar" size={32} color={theme.secondaryText} />
                  <Text style={[st.cardText, { color: theme.textColor }]}>Nenhuma temporada ativa</Text>
                  <Pressable style={[st.actionBtn, { backgroundColor: theme.primaryColor }]} onPress={sd.handleStartSeason}>
                    <Feather name="play" size={18} color="#FFF" />
                    <Text style={st.actionBtnText}>Iniciar temporada</Text>
                  </Pressable>
                </View>
                </TourGuideZone>
              </>
            ) : (
              <>
              <TourGuideZone zone={1} text="10" isTourGuide borderRadius={16}>
              <View
                ref={(node) => { (sd.progressCardRef as React.MutableRefObject<any>).current = node; }}
                collapsable={false}
                style={[st.card, { backgroundColor: theme.cardBackground, paddingVertical: 16 }]}
              >
                <View style={[st.progressHeader, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[st.progressTitle, { color: theme.textColor }]}>Progresso</Text>
                    <TouchableOpacity onPress={sd.handleShareMonthlyProgress}>
                      <Feather name="share-2" size={12} color={theme.primaryColor} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[st.progressPercent, { color: theme.primaryColor }]}>{sd.monthProgress}%</Text>
                </View>

                <View style={[st.progressBarBg, { backgroundColor: theme.border, height: 8, marginBottom: 16 }]}>
                  <View style={[st.progressBarFill, { width: `${sd.monthProgress}%` as any, backgroundColor: theme.accentColor, height: 8 }]} />
                </View>

                <View style={st.compactStatsRow}>
                  <View style={st.compactStat}>
                    <Feather name="zap" size={14} color={theme.primaryColor} />
                    <Text style={[st.compactStatValue, { color: theme.textColor }]}>{gamification.totalXp}</Text>
                    <Text style={st.compactStatLabel}>XP</Text>
                  </View>
                  <View style={[st.statDivider, { backgroundColor: theme.border }]} />
                  <View style={st.compactStat}>
                    <MaterialCommunityIcons name="fire" size={14} color={theme.warning} />
                    <Text style={[st.compactStatValue, { color: theme.textColor }]}>{gamification.currentStreak}</Text>
                    <Text style={st.compactStatLabel}>Streak</Text>
                  </View>
                  <View style={[st.statDivider, { backgroundColor: theme.border }]} />
                  <View style={st.compactStat}>
                    <Feather name="target" size={14} color={theme.success} />
                    <Text style={[st.compactStatValue, { color: theme.textColor }]}>{budget.adherenceScore}</Text>
                    <Text style={st.compactStatLabel}>Score</Text>
                  </View>
                </View>

                {sd.dayOfMonth >= sd.daysInMonth - 2 && (
                  <Pressable
                    style={[st.actionBtn, { backgroundColor: theme.accentColor, marginTop: 12, width: "100%" }]}
                    onPress={sd.handleEvaluate}
                  >
                    <Feather name="check-circle" size={18} color="#FFF" />
                    <Text style={st.actionBtnText}>Encerrar temporada</Text>
                  </Pressable>
                )}
              </View>
              </TourGuideZone>
              </>
            )}

            {/* Recent achievement highlights */}
            <RecentHighlights
              gamification={gamification}
              theme={theme}
              onSelectAchievement={setSelectedAch}
              onViewAll={() => setActiveTab("collection")}
            />

            <TourGuideZone zone={2} text="11" isTourGuide borderRadius={16}>
            <View collapsable={false}>
              <SurpriseTrophyCard
                currentYear={sd.currentYear}
                currentMonth={sd.currentMonth}
                gamification={gamification}
                domain={domain}
                budget={budget}
                theme={theme}
                isCatholic={!!isCatholic}
                setIsCatholic={setIsCatholic}
              />
            </View>
            </TourGuideZone>

            <MonthlyTrophiesList
              theme={theme}
              domain={domain}
              budget={budget}
              gamification={gamification}
              currentYear={sd.currentYear}
              currentMonth={sd.currentMonth}
              challengesCardRef={sd.challengesCardRef}
              onShareChallenges={sd.handleShareMonthlyChallenges}
            />
          </>
        ) : (
          <AchievementGrid
            theme={theme}
            gamification={gamification}
            season={season}
            collectionCardRef={sd.collectionCardRef}
            onSelectAchievement={setSelectedAch}
            onShareCollection={sd.handleShareCollection}
          />
        )}
      </ScrollView>

      {/* Trophy detail modal */}
      <TrophyDetailModal
        selectedAch={selectedAch}
        onClose={() => setSelectedAch(null)}
        gamification={gamification}
        theme={theme}
        trophyModalRef={sd.trophyModalRef}
        seriesProgress={seriesProgress}
        onShare={() => sd.handleShareTrophy(selectedAch)}
      />
    </View>
    </TourPageHost>
  );
}

// ── Recent achievement highlights (small inline component) ───────────────────

function RecentHighlights({
  gamification,
  theme,
  onSelectAchievement,
  onViewAll,
}: {
  gamification: any;
  theme: any;
  onSelectAchievement: (ach: Achievement) => void;
  onViewAll: () => void;
}) {
  const achievementIds = new Set((ALL_ACHIEVEMENTS || []).map((a) => a.id));
  const seen = new Set<string>();
  const unlocked = (gamification.unlockedAchievements ?? [])
    .slice()
    .reverse()
    .filter((a: any) => {
      if (!achievementIds.has(a.id)) return false;
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .slice(0, 2);

  if (unlocked.length === 0) return null;

  return (
    <View style={st.highlightsSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.highlightsScroll}>
        {unlocked.map((ach: any) => {
          const fullAch = ALL_ACHIEVEMENTS.find((a) => a.id === ach.id);
          return (
            <TouchableOpacity
              key={ach.id}
              style={[st.highlightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => {
                soundManager.play("tap");
                if (fullAch) onSelectAchievement(fullAch);
              }}
            >
              <AnimatedTrophy rarity={ach.rarity} size={24} spinning={false} />
              <View style={{ flex: 1 }}>
                <Text style={[st.highlightName, { color: theme.textColor }]} numberOfLines={1}>
                  {fullAch?.name || "---"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[
            st.highlightCard,
            { backgroundColor: theme.primaryColor + "10", borderColor: theme.primaryColor + "30", width: 100, minWidth: 100 },
          ]}
          onPress={onViewAll}
        >
          <Text style={{ color: theme.primaryColor, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Ver Tudo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Trophy detail modal (inline, uses refs) ──────────────────────────────────

function TrophyDetailModal({
  selectedAch,
  onClose,
  gamification,
  theme,
  trophyModalRef,
  seriesProgress,
  onShare,
}: {
  selectedAch: Achievement | null;
  onClose: () => void;
  gamification: any;
  theme: any;
  trophyModalRef: React.RefObject<View | null>;
  seriesProgress: any;
  onShare: () => void;
}) {
  if (!selectedAch) return null;

  const unlockedIds = new Set((gamification.unlockedAchievements ?? []).map((a: any) => a.id));
  const unlocked = unlockedIds.has(selectedAch.id);
  const rarityColor =
    selectedAch.rarity === "diamond" ? "#4FC3F7" : selectedAch.rarity === "gold" ? "#FFC107" : "#9E9E9E";
  const rarityLabel = selectedAch.rarity === "diamond" ? "Diamante" : selectedAch.rarity === "gold" ? "Ouro" : "Prata";

  return (
    <Modal visible={!!selectedAch} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <Pressable
          ref={trophyModalRef}
          collapsable={false}
          style={[st.trophyModal, { backgroundColor: theme.cardBackground }]}
          onPress={() => {}}
        >
          <View style={st.trophyModalHeader}>
            <View style={[st.rarityBadge, { backgroundColor: rarityColor + "22" }]}>
              <Text style={[st.rarityBadgeText, { color: rarityColor }]}>{rarityLabel}</Text>
            </View>
            <TouchableOpacity
              style={[st.closeBtn, { backgroundColor: theme.border }]}
              onPress={() => {
                soundManager.play("tap");
                onClose();
              }}
            >
              <Feather name="x" size={16} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={st.trophyModalIcon}>
            {unlocked ? (
              <AnimatedTrophy rarity={selectedAch.rarity} size={80} spinning={false} />
            ) : (
              <View style={[st.trophyModalLocked, { backgroundColor: theme.border }]}>
                <Feather name="lock" size={36} color={theme.secondaryText} />
              </View>
            )}
          </View>

          <Text style={[st.trophyModalName, { color: theme.textColor }]}>{selectedAch.name}</Text>
          <Text style={[st.trophyModalDesc, { color: theme.secondaryText }]}>{selectedAch.description}</Text>

          <View style={[st.xpRewardRow, { backgroundColor: "#A78BFA18" }]}>
            <Feather name="zap" size={14} color="#A78BFA" />
            <Text style={st.xpRewardText}>+{selectedAch.xpReward} XP</Text>
          </View>

          {seriesProgress && (
            <View style={st.progressSection}>
              <View style={st.progressLabelRow}>
                <Text style={[st.progressSeriesLabel, { color: theme.secondaryText }]}>
                  {seriesProgress.series.label}
                </Text>
                <Text style={[st.progressValues, { color: theme.textColor }]}>
                  {seriesProgress.currentValue}/{seriesProgress.nextTarget} {seriesProgress.series.unit}
                </Text>
              </View>
              <View style={[st.achProgressBg, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    st.achProgressFill,
                    { backgroundColor: rarityColor, width: `${Math.round(seriesProgress.progress * 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={[st.progressNextLabel, { color: theme.secondaryText }]}>
                Próximo marco: {seriesProgress.nextTarget} {seriesProgress.series.unit}
              </Text>

              <View style={[st.seriesStatsRow, { borderTopColor: theme.border }]}>
                <View style={st.seriesStatItem}>
                  <Text style={[st.seriesStatValue, { color: "#A78BFA" }]}>{seriesProgress.xpEarned}</Text>
                  <Text style={[st.seriesStatLabel, { color: theme.secondaryText }]}>XP desta série</Text>
                </View>
                <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                <View style={st.seriesStatItem}>
                  <Text style={[st.seriesStatValue, { color: theme.textColor }]}>{seriesProgress.xpPossible}</Text>
                  <Text style={[st.seriesStatLabel, { color: theme.secondaryText }]}>XP possível</Text>
                </View>
                {seriesProgress.monthlyValue > 0 && (
                  <>
                    <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                    <View style={st.seriesStatItem}>
                      <Text style={[st.seriesStatValue, { color: theme.primaryColor }]}>
                        {seriesProgress.monthlyValue}
                      </Text>
                      <Text style={[st.seriesStatLabel, { color: theme.secondaryText }]}>
                        {seriesProgress.series.id === "level" ? "XP este mês" : `${seriesProgress.series.unit} este mês`}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {unlocked && (
            <TouchableOpacity style={[st.shareBtn, { borderColor: rarityColor }]} onPress={onShare} activeOpacity={0.8}>
              <Feather name="share-2" size={15} color={rarityColor} />
              <Text style={[st.shareBtnText, { color: rarityColor }]}>Compartilhar conquista</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#FFF" },
  archetypeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  archetypeBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 10, textTransform: "uppercase" },
  tabContainer: { flexDirection: "row", padding: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(124, 58, 237, 0.1)" },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabText: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  content: { gap: 12, paddingHorizontal: 12 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: -0.5 },
  subtitle: { fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 0, opacity: 0.6 },
  card: { borderRadius: 20, padding: 16, alignItems: "center" as const, gap: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  cardText: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#FFF" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  progressTitle: { fontFamily: "DMSans_700Bold", fontSize: 13, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 },
  progressPercent: { fontFamily: "DMSans_800ExtraBold", fontSize: 18 },
  progressBarBg: { height: 10, borderRadius: 5, width: "100%" },
  progressBarFill: { height: 10, borderRadius: 5, minWidth: 10 },
  compactStatsRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  compactStat: { flex: 1, alignItems: "center", gap: 2 },
  compactStatValue: { fontFamily: "DMSans_700Bold", fontSize: 15 },
  compactStatLabel: { fontFamily: "DMSans_700Bold", fontSize: 9, textTransform: "uppercase", opacity: 0.4 },
  statDivider: { width: 1, height: 20, opacity: 0.1 },
  highlightsSection: { gap: 8 },
  highlightsScroll: { gap: 8, paddingRight: 20 },
  highlightCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 12, borderWidth: 1, minWidth: 130 },
  highlightName: { fontFamily: "DMSans_700Bold", fontSize: 11 },
  // Trophy detail modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 24 },
  trophyModal: { borderRadius: 24, padding: 24, width: "100%", maxWidth: 400, gap: 16 },
  trophyModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  rarityBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 12, textTransform: "uppercase" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  trophyModalIcon: { alignItems: "center", paddingVertical: 8 },
  trophyModalLocked: { width: 100, height: 100, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  trophyModalName: { fontFamily: "DMSans_700Bold", fontSize: 22, textAlign: "center" },
  trophyModalDesc: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center", opacity: 0.7 },
  xpRewardRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  xpRewardText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#A78BFA" },
  progressSection: { gap: 10 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressSeriesLabel: { fontFamily: "DMSans_700Bold", fontSize: 13, opacity: 0.6 },
  progressValues: { fontFamily: "DMSans_800ExtraBold", fontSize: 14 },
  achProgressBg: { height: 8, borderRadius: 4, width: "100%" },
  achProgressFill: { height: 8, borderRadius: 4, minWidth: 8 },
  progressNextLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, opacity: 0.5 },
  seriesStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 14, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  seriesStatItem: { alignItems: "center", flex: 1, gap: 2 },
  seriesStatValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  seriesStatLabel: { fontFamily: "DMSans_700Bold", fontSize: 9, textTransform: "uppercase", opacity: 0.5 },
  xpStatDivider: { width: 1, height: 20, opacity: 0.1 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, marginTop: 8 },
  shareBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15 },
});
