import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  Modal,
  Share,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useAppState } from "@/src/context/AppStateProvider";
import { getTone } from "@packages/personality/src/toneEngine";
import { getArchetypeDescription } from "@packages/personality/src/archetypeEngine";
import { createSeasonId, startSeason, evaluateSeason } from "@packages/season/src/seasonEngine";
import { SEASON_EVENTS } from "@packages/season/src/types";
import { generateId } from "@packages/events/src/factory";
import {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_SERIES,
  MONTHLY_TROPHIES,
  getNextSeriesTarget,
  getConsecutiveMonthsCompliant,
} from "@packages/gamification/src/achievements";
import type { Achievement } from "@packages/gamification/src/achievements";
import {
  ALL_SEASONAL_TROPHIES,
  getSeasonalXp,
  getTierLabel,
  getTierColor,
} from "@packages/gamification/src/seasonalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import { SurpriseTrophyCard } from "@/src/components/gamification/SurpriseTrophyCard";
import { AnimatedTrophy } from "@/src/components/gamification/AnimatedTrophy";
import { soundManager } from "@/src/services/SoundManager";
import { ReligiousPreferenceModal } from "@/src/components/shared/ReligiousPreferenceModal";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SeasonScreen() {
  const insets = useSafeAreaInsets();
  const { gamification, season, archetype, theme, levelInfo, budget, dispatch, domain, isCatholic, setIsCatholic } =
    useAppState();
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "collection">("current");
  
  const levelCardRef = React.useRef<View>(null);
  const progressCardRef = React.useRef<View>(null);
  const challengesCardRef = React.useRef<View>(null);
  const collectionCardRef = React.useRef<View>(null);
  const trophyModalRef = React.useRef<View>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const archetypeInfo = getArchetypeDescription(archetype) || { name: "Explorador", description: "" };
  const tone = getTone(archetype);

  const hasSeason = season.currentSeason !== null && season.currentSeason.active;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  const handleStartSeason = () => {
    try {
      const payload = startSeason(currentYear, currentMonth);
      const event = {
        id: generateId(),
        type: SEASON_EVENTS.SEASON_STARTED,
        payload,
        timestamp: Date.now(),
        deviceId: "local",
        signature: "",
      };
      dispatch(event as any);
      soundManager.play("success");
    } catch (err) {
      console.error("Failed to start season:", err);
    }
  };

  const handleEvaluate = () => {
    try {
      if (!season.currentSeason) return;
      
      const currentScore = budget?.adherenceScore ?? 0;
      const currentXp = gamification?.totalXp ?? 0;
      const currentLevel = levelInfo?.level ?? 1;
      const currentStreak = gamification?.currentStreak ?? 0;

      const evalPayload = evaluateSeason(
        season.currentSeason.seasonId,
        currentXp,
        currentLevel,
        currentScore,
        currentStreak,
        archetype || "EXPLORER",
      );
      
      const evalEvent = {
        id: generateId(),
        type: SEASON_EVENTS.SEASON_EVALUATED,
        payload: evalPayload,
        timestamp: Date.now(),
        deviceId: "local",
        signature: "",
      };
      dispatch(evalEvent as any);

      const endEvent = {
        id: generateId(),
        type: SEASON_EVENTS.SEASON_ENDED,
        payload: { seasonId: season.currentSeason.seasonId, endDate: new Date().toISOString().split("T")[0]! },
        timestamp: Date.now(),
        deviceId: "local",
        signature: "",
      };
      dispatch(endEvent as any);
      soundManager.play("success");
    } catch (err) {
      console.error("Failed to evaluate season:", err);
    }
  };

  // ── Series progress for selected trophy ──────────────────────────────────
  const seriesProgress = useMemo(() => {
    if (!selectedAch?.seriesId) return null;
    const series = ACHIEVEMENT_SERIES.find((s) => s.id === selectedAch.seriesId);
    if (!series) return null;

    // Current metric value for this series
    let currentValue = 0;
    switch (series.id) {
      case "transactions":
        currentValue = Object.values(domain.transactions ?? {}).length;
        break;
      case "streak":
        currentValue = Math.max(gamification.currentStreak, gamification.longestStreak);
        break;
      case "level":
        currentValue = gamification.level;
        break;
      case "budget_months":
        currentValue = getConsecutiveMonthsCompliant(
          domain,
          (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
        );
        break;
      case "savings_months":
        currentValue = getConsecutiveMonthsCompliant(
          domain,
          (b) => b.savingsPercent >= 20 && b.totalIncome > 0,
        );
        break;
      case "wants_months":
        currentValue = getConsecutiveMonthsCompliant(
          domain,
          (b) => b.wantsPercent <= 30 && b.totalIncome > 0,
        );
        break;
      case "dizimo_months": {
        const months = new Set(
          Object.values(domain.transactions ?? {})
            .filter((tx) => tx.categoryId === "dizimo")
            .map((tx) => tx.date.slice(0, 7)),
        );
        currentValue = months.size;
        break;
      }
    }

    const nextTarget = getNextSeriesTarget(series, currentValue);
    const prevTarget =
      [...series.thresholds].reverse().find((t) => t <= currentValue) ?? 0;
    const range = nextTarget - prevTarget;
    const progress = range > 0 ? Math.min(1, (currentValue - prevTarget) / range) : 1;

    // XP earned & possible from this series
    const unlockedIds = new Set(
      (gamification.unlockedAchievements ?? []).map((a) => a.id),
    );
    const seriesAchs = ALL_ACHIEVEMENTS.filter((a) => a.seriesId === series.id);
    const xpEarned = seriesAchs
      .filter((a) => unlockedIds.has(a.id))
      .reduce((s, a) => s + a.xpReward, 0);
    const xpPossible = seriesAchs.reduce((s, a) => s + a.xpReward, 0);

    // Monthly metric (transactions or XP this month)
    const nowD = new Date();
    const monthStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`;
    let monthlyValue = 0;
    if (series.id === "transactions") {
      monthlyValue = Object.values(domain.transactions ?? {}).filter(
        (tx) => tx.date.startsWith(monthStr),
      ).length;
    } else if (series.id === "streak") {
      monthlyValue = gamification.currentStreak;
    } else if (series.id === "level") {
      monthlyValue = (gamification.xpHistory ?? [])
        .filter((h) => {
          const d = new Date(h.timestamp);
          return (
            d.getMonth() === nowD.getMonth() &&
            d.getFullYear() === nowD.getFullYear()
          );
        })
        .reduce((s, h) => s + Math.max(0, h.amount), 0);
    }

    return {
      series,
      currentValue,
      nextTarget,
      progress,
      xpEarned,
      xpPossible,
      monthlyValue,
    };
  }, [selectedAch, domain, gamification, budget]);

  const handleTabChange = (tab: "current" | "collection") => {
    setActiveTab(tab);
    soundManager.play("tabSwitch");
  };

  const handleShareTrophy = async () => {
    if (!trophyModalRef.current) return;
    try {
      soundManager.play("share");
      const uri = await captureRef(trophyModalRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, { dialogTitle: `Conquista: ${selectedAch?.name}` });
    } catch (_) {
      if (!selectedAch) return;
      await Share.share({
        message:
          `🏆 Conquistei "${selectedAch.name}" no DOMUS!\n` +
          `💰 Controle financeiro com propósito.\n\n` +
          `#DOMUS #FinançasPessoais #${selectedAch.rarity === "diamond" ? "Diamante" : selectedAch.rarity === "gold" ? "Ouro" : "Prata"}`,
      });
    }
  };

  const handleShareXpLevel = async () => {
    if (!levelCardRef.current) return;
    try {
      soundManager.play("share");
      const uri = await captureRef(levelCardRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, { dialogTitle: `Meu Nível no DOMUS` });
    } catch (_) {
      await Share.share({
        message:
          `✨ Alcancei o Nível ${gamification.level} no DOMUS!\n` +
          `💎 Total de ${gamification.totalXp.toLocaleString("pt-BR")} XP acumulados.\n\n` +
          `#DOMUS #FinançasPessoais #LevelUp`,
      });
    }
  };

  const handleShareMonthlyProgress = async () => {
    if (!progressCardRef.current) return;
    try {
      soundManager.play("share");
      const uri = await captureRef(progressCardRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, { dialogTitle: `Progresso de ${MONTHS[currentMonth - 1]}` });
    } catch (_) {
      await Share.share({
        message:
          `📅 Meu progresso em ${MONTHS[currentMonth - 1]} está em ${monthProgress}%!\n` +
          `🎯 Foco total no orçamento deste mês no DOMUS.\n\n` +
          `#DOMUS #Metas #FinançasPessoais`,
      });
    }
  };

  const handleShareMonthlyChallenges = async (count: number, total: number) => {
    if (!challengesCardRef.current) return;
    try {
      soundManager.play("share");
      const uri = await captureRef(challengesCardRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, { dialogTitle: `Desafios Mensais: ${count}/${total}` });
    } catch (_) {
      await Share.share({
        message:
          `🏅 Completei ${count} de ${total} desafios mensais no DOMUS!\n` +
          `🚀 Rumo ao troféu de ouro deste mês.\n\n` +
          `#DOMUS #Desafios #FocoFinanceiro`,
      });
    }
  };

  const handleShareCollection = async () => {
    if (!collectionCardRef.current) return;
    try {
      soundManager.play("share");
      const uri = await captureRef(collectionCardRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, { dialogTitle: `Minha Coleção de Troféus` });
    } catch (_) {
      await Share.share({
        message: `Minha coleção de troféus no DOMUS está crescendo! 🏆💎\n#DOMUS #Finanças`,
      });
    }
  };

  const MONTHS = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      <View
        style={[
          st.header,
          {
            paddingTop: insets.top + webTopInset + 16,
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={st.headerTop} ref={levelCardRef} collapsable={false}>
          <View style={{ flex: 1 }}>
            <Text style={[st.title, { color: theme.textColor }]}>Temporada</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>
                {MONTHS[currentMonth - 1]}
              </Text>
              <View style={[st.archetypeBadge, { backgroundColor: theme.primaryColor + "22" }]}>
                <MaterialCommunityIcons name="shield-star" size={12} color={theme.primaryColor} />
                <Text style={[st.archetypeBadgeText, { color: theme.primaryColor }]}>{archetypeInfo.name}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            onPress={handleShareXpLevel}
            style={[st.levelBadge, { backgroundColor: theme.primaryColor, flexDirection: 'row', gap: 6, alignItems: 'center' }]}
          >
            <Text style={st.levelText}>Nível {gamification.level}</Text>
            <Feather name="share-2" size={12} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={[st.tabContainer, { backgroundColor: theme.border + "44" }]}>
          <Pressable
            onPress={() => handleTabChange("current")}
            style={[
              st.tab,
              activeTab === "current" && { backgroundColor: theme.cardBackground },
            ]}
          >
            <Text
              style={[
                st.tabText,
                { color: activeTab === "current" ? theme.textColor : theme.secondaryText },
              ]}
            >
              Atual
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabChange("collection")}
            style={[
              st.tab,
              activeTab === "collection" && { backgroundColor: theme.cardBackground },
            ]}
          >
            <Text
              style={[
                st.tabText,
                { color: activeTab === "collection" ? theme.textColor : theme.secondaryText },
              ]}
            >
              Coleção
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          st.content,
          {
            paddingBottom: insets.bottom + webBottomInset + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "current" ? (
          <>
            {!hasSeason ? (
              <View style={[st.card, { backgroundColor: theme.cardBackground }]}>
                <Feather name="calendar" size={32} color={theme.secondaryText} />
                <Text style={[st.cardText, { color: theme.textColor }]}>
                  Nenhuma temporada ativa
                </Text>
                <Pressable
                  style={[st.actionBtn, { backgroundColor: theme.primaryColor }]}
                  onPress={handleStartSeason}
                >
                  <Feather name="play" size={18} color="#FFF" />
                  <Text style={st.actionBtnText}>Iniciar temporada</Text>
                </Pressable>
              </View>
            ) : (
              <View 
                ref={progressCardRef}
                collapsable={false}
                style={[st.card, { backgroundColor: theme.cardBackground, paddingVertical: 16 }]}
              >
                <View style={[st.progressHeader, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[st.progressTitle, { color: theme.textColor }]}>Progresso</Text>
                    <TouchableOpacity onPress={handleShareMonthlyProgress}>
                      <Feather name="share-2" size={12} color={theme.primaryColor} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[st.progressPercent, { color: theme.primaryColor }]}>{monthProgress}%</Text>
                </View>
                
                <View style={[st.progressBarBg, { backgroundColor: theme.border, height: 8, marginBottom: 16 }]}>
                  <View style={[st.progressBarFill, { width: `${monthProgress}%` as any, backgroundColor: theme.accentColor, height: 8 }]} />
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

                {dayOfMonth >= daysInMonth - 2 && (
                  <Pressable
                    style={[st.actionBtn, { backgroundColor: theme.accentColor, marginTop: 12, width: '100%' }]}
                    onPress={handleEvaluate}
                  >
                    <Feather name="check-circle" size={18} color="#FFF" />
                    <Text style={st.actionBtnText}>Encerrar temporada</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* ── Destaques de Conquistas ────────────────────────────────────── */}
            {(() => {
              const unlocked = (gamification.unlockedAchievements ?? []).slice(-2).reverse();
              if (unlocked.length === 0) return null;
              return (
                <View style={st.highlightsSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.highlightsScroll}>
                    {unlocked.map((ach: any) => {
                      const fullAch = ALL_ACHIEVEMENTS.find(a => a.id === ach.id);
                      return (
                        <TouchableOpacity 
                          key={ach.id} 
                          style={[st.highlightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                          onPress={() => {
                            soundManager.play("tap");
                            if (fullAch) setSelectedAch(fullAch);
                          }}
                        >
                          <AnimatedTrophy rarity={ach.rarity} size={24} spinning={false} />
                          <View style={{ flex: 1 }}>
                            <Text style={[st.highlightName, { color: theme.textColor }]} numberOfLines={1}>
                              {fullAch?.name || '---'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity 
                      style={[st.highlightCard, { backgroundColor: theme.primaryColor + '10', borderColor: theme.primaryColor + '30', width: 100, minWidth: 100 }]}
                      onPress={() => setActiveTab("collection")}
                    >
                      <Text style={{ color: theme.primaryColor, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>Ver Tudo</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              );
            })()}

            <SurpriseTrophyCard
              currentYear={currentYear}
              currentMonth={currentMonth}
              gamification={gamification}
              domain={domain}
              budget={budget}
              theme={theme}
              isCatholic={!!isCatholic}
              setIsCatholic={setIsCatholic}
            />

            {/* ── Desafios do Mês ──────────────────────────────────────────── */}
            {(() => {
              const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
              const completedThisMonth = new Set(
                (gamification.completedMonthlyTrophies ?? [])
                  .filter((c) => c.monthKey === monthKey)
                  .map((c) => c.id)
              );

              return (
                <View
                  ref={challengesCardRef}
                  collapsable={false}
                  style={[st.monthlyCard, { backgroundColor: theme.cardBackground, borderColor: theme.primaryColor + "33" }]}
                >
                  <View style={st.monthlyHeader}>
                    <View style={st.monthlyTitleRow}>
                      <Text style={st.monthlyEmoji}>🏅</Text>
                      <View>
                        <Text style={[st.monthlyTitle, { color: theme.textColor }]}>Desafios</Text>
                        <TouchableOpacity 
                          onPress={() => handleShareMonthlyChallenges(completedThisMonth.size, MONTHLY_TROPHIES.length)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                        >
                          <Feather name="share-2" size={12} color={theme.primaryColor} />
                          <Text style={{ fontSize: 11, color: theme.primaryColor, fontFamily: 'DMSans_700Bold' }}>Compartilhar Grupo</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={[st.monthlyBadge, { backgroundColor: theme.primaryColor + "22" }]}>
                      <Text style={[st.monthlyBadgeText, { color: theme.primaryColor }]}>
                        {completedThisMonth.size}/{MONTHLY_TROPHIES.length}
                      </Text>
                    </View>
                  </View>

                  <View style={st.monthlyList}>
                    {MONTHLY_TROPHIES.map((trophy) => {
                      const done = completedThisMonth.has(trophy.id);
                      const prog = trophy.progress(domain, budget, monthKey);
                      const pct = prog.target > 0 ? Math.min(1, prog.current / prog.target) : 0;

                      return (
                        <View
                          key={trophy.id}
                          style={[
                            st.monthlyItem,
                            {
                              backgroundColor: done ? theme.primaryColor + "12" : theme.background,
                              borderColor: done ? theme.primaryColor + "44" : theme.border,
                            },
                          ]}
                        >
                          <View style={st.monthlyItemHeader}>
                            <Text style={st.monthlyItemIcon}>{trophy.icon}</Text>
                            <View style={st.monthlyItemInfo}>
                              <Text style={[st.monthlyItemName, { color: theme.textColor }]}>{trophy.name}</Text>
                              <Text style={[st.monthlyItemDesc, { color: theme.secondaryText }]} numberOfLines={1}>
                                {trophy.description}
                              </Text>
                            </View>
                            {done ? (
                              <View style={[st.monthlyDoneBadge, { backgroundColor: theme.success + "22" }]}>
                                <Feather name="check" size={14} color={theme.success} />
                              </View>
                            ) : (
                              <View style={[st.monthlyXpBadge, { backgroundColor: theme.border + "44" }]}>
                                <Text style={[st.monthlyXpText, { color: theme.primaryColor }]}>+{trophy.xpReward} XP</Text>
                              </View>
                            )}
                          </View>

                          <View style={st.monthlyProgressRow}>
                            <View style={[st.monthlyProgressBg, { backgroundColor: theme.border }]}>
                              <View
                                style={[
                                  st.monthlyProgressFill,
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
            })()}
          </>
        ) : (
          <>
            {/* ── Conquistas ───────────────────────────────────────────────── */}
            {(() => {
              const unlockedIds = new Set(
                (gamification.unlockedAchievements ?? []).map((a) => a.id)
              );
              const totalXpFromAchs = ALL_ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).reduce(
                (s, a) => s + a.xpReward,
                0
              );

              return (
                <View
                  ref={collectionCardRef}
                  collapsable={false}
                  style={[
                    st.achievementsCard,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  ]}
                >
                  <View style={st.achievementsHeader}>
                    <Feather name="award" size={16} color={theme.primaryColor} />
                    <Text style={[st.achievementsTitle, { color: theme.textColor }]}>
                      Meus Troféus
                    </Text>
                    <TouchableOpacity onPress={handleShareCollection}>
                      <Feather name="share-2" size={16} color={theme.primaryColor} />
                    </TouchableOpacity>
                    <Text style={[st.achievementsCount, { color: theme.secondaryText }]}>
                      {unlockedIds.size}/{ALL_ACHIEVEMENTS.length}
                    </Text>
                  </View>

                  <View style={st.xpStatsRow}>
                    <View style={st.xpStatItem}>
                      <Text style={[st.xpStatValue, { color: "#A78BFA" }]}>
                        {totalXpFromAchs.toLocaleString("pt-BR")}
                      </Text>
                      <Text style={[st.xpStatLabel, { color: theme.secondaryText }]}>
                        XP Troféus
                      </Text>
                    </View>
                    <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                    <View style={st.xpStatItem}>
                      <Text style={[st.xpStatValue, { color: theme.textColor }]}>
                        {gamification.totalXp.toLocaleString("pt-BR")}
                      </Text>
                      <Text style={[st.xpStatLabel, { color: theme.secondaryText }]}>XP Total</Text>
                    </View>
                  </View>

                  <View style={st.trophyGrid}>
                    {ALL_ACHIEVEMENTS.map((ach) => {
                      const unlocked = unlockedIds.has(ach.id);
                      return (
                        <Pressable
                          key={ach.id}
                          style={({ pressed }) => [st.trophyCell, pressed && { opacity: 0.7 }]}
                          onPress={() => {
                            soundManager.play("tap");
                            setSelectedAch(ach);
                          }}
                        >
                          {unlocked ? (
                            <AnimatedTrophy rarity={ach.rarity} size={52} spinning={false} />
                          ) : (
                            <View style={[st.lockedTrophy, { backgroundColor: theme.border }]}>
                              <Feather name="lock" size={22} color={theme.secondaryText} />
                            </View>
                          )}
                          <Text
                            style={[
                              st.trophyName,
                              { color: unlocked ? theme.textColor : theme.secondaryText },
                            ]}
                            numberOfLines={1}
                          >
                            {ach.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {season.badges.length > 0 && (
              <View style={[st.card, { backgroundColor: theme.cardBackground, alignItems: "flex-start" }]}>
                <Text style={[st.sectionTitle, { color: theme.textColor }]}>Medalhas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }}>
                  <View style={st.badgeGridHorizontal}>
                    {season.badges.map((b, i) => (
                      <View
                        key={i}
                        style={[st.badgeItem, { backgroundColor: `${theme.primaryColor}10` }]}
                      >
                        <Feather name="award" size={24} color={theme.primaryColor} />
                        <Text style={[st.badgeName, { color: theme.textColor }]} numberOfLines={1}>
                          {b.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {season.history.length > 0 && (
              <View style={[st.card, { backgroundColor: theme.cardBackground, alignItems: "flex-start" }]}>
                <Text style={[st.sectionTitle, { color: theme.textColor }]}>Histórico</Text>
                {season.history.map((h, i) => (
                  <View key={i} style={[st.historyRow, { borderBottomColor: theme.border }]}>
                    <View style={st.historyInfo}>
                      <Text style={[st.historyId, { color: theme.textColor }]}>{h.seasonId}</Text>
                      <Text style={[st.historyArch, { color: theme.secondaryText }]}>
                        {capitalize(h.archetype)} / Lvl {h.level}
                      </Text>
                    </View>
                    <Text style={[st.historyXp, { color: theme.primaryColor }]}>{h.totalXp} XP</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Trophy detail modal ──────────────────────────────────────────── */}
      {selectedAch && (() => {
        const unlockedIds = new Set(
          (gamification.unlockedAchievements ?? []).map((a) => a.id),
        );
        const unlocked = unlockedIds.has(selectedAch.id);
        const rarityColor =
          selectedAch.rarity === "diamond"
            ? "#4FC3F7"
            : selectedAch.rarity === "gold"
            ? "#FFC107"
            : "#9E9E9E";
        const rarityLabel =
          selectedAch.rarity === "diamond" ? "Diamante"
          : selectedAch.rarity === "gold" ? "Ouro" : "Prata";

        return (
          <Modal
            visible={!!selectedAch}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedAch(null)}
          >
            <Pressable
              style={st.modalOverlay}
              onPress={() => setSelectedAch(null)}
            >
              <Pressable
                ref={trophyModalRef}
                collapsable={false}
                style={[st.trophyModal, { backgroundColor: theme.cardBackground }]}
                onPress={() => {}}
              >
                {/* Header */}
                <View style={st.trophyModalHeader}>
                  <View style={[st.rarityBadge, { backgroundColor: rarityColor + "22" }]}>
                    <Text style={[st.rarityBadgeText, { color: rarityColor }]}>
                      {rarityLabel}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[st.closeBtn, { backgroundColor: theme.border }]}
                    onPress={() => {
                      soundManager.play("tap");
                      setSelectedAch(null);
                    }}
                  >
                    <Feather name="x" size={16} color={theme.secondaryText} />
                  </TouchableOpacity>
                </View>

                {/* Trophy icon */}
                <View style={st.trophyModalIcon}>
                  {unlocked ? (
                    <AnimatedTrophy rarity={selectedAch.rarity} size={80} spinning={false} />
                  ) : (
                    <View style={[st.trophyModalLocked, { backgroundColor: theme.border }]}>
                      <Feather name="lock" size={36} color={theme.secondaryText} />
                    </View>
                  )}
                </View>

                {/* Name & description */}
                <Text style={[st.trophyModalName, { color: theme.textColor }]}>
                  {selectedAch.name}
                </Text>
                <Text style={[st.trophyModalDesc, { color: theme.secondaryText }]}>
                  {selectedAch.description}
                </Text>

                {/* XP reward */}
                <View style={[st.xpRewardRow, { backgroundColor: "#A78BFA18" }]}>
                  <Feather name="zap" size={14} color="#A78BFA" />
                  <Text style={st.xpRewardText}>+{selectedAch.xpReward} XP</Text>
                </View>

                {/* Progress to next level (series trophies) */}
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
                          {
                            backgroundColor: rarityColor,
                            width: `${Math.round(seriesProgress.progress * 100)}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[st.progressNextLabel, { color: theme.secondaryText }]}>
                      Próximo marco: {seriesProgress.nextTarget} {seriesProgress.series.unit}
                    </Text>

                    {/* Series XP stats */}
                    <View style={[st.seriesStatsRow, { borderTopColor: theme.border }]}>
                      <View style={st.seriesStatItem}>
                        <Text style={[st.seriesStatValue, { color: "#A78BFA" }]}>
                          {seriesProgress.xpEarned}
                        </Text>
                        <Text style={[st.seriesStatLabel, { color: theme.secondaryText }]}>
                          XP desta série
                        </Text>
                      </View>
                      <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                      <View style={st.seriesStatItem}>
                        <Text style={[st.seriesStatValue, { color: theme.textColor }]}>
                          {seriesProgress.xpPossible}
                        </Text>
                        <Text style={[st.seriesStatLabel, { color: theme.secondaryText }]}>
                          XP possível
                        </Text>
                      </View>
                      {seriesProgress.monthlyValue > 0 && (
                        <>
                          <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                          <View style={st.seriesStatItem}>
                            <Text style={[st.seriesStatValue, { color: theme.primaryColor }]}>
                              {seriesProgress.monthlyValue}
                            </Text>
                            <Text style={[st.seriesStatLabel, { color: theme.secondaryText }]}>
                              {seriesProgress.series.id === "level"
                                ? "XP este mês"
                                : `${seriesProgress.series.unit} este mês`}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* Share button (only if unlocked) */}
                {unlocked && (
                  <TouchableOpacity
                    style={[st.shareBtn, { borderColor: rarityColor }]}
                    onPress={handleShareTrophy}
                    activeOpacity={0.8}
                  >
                    <Feather name="share-2" size={15} color={rarityColor} />
                    <Text style={[st.shareBtnText, { color: rarityColor }]}>
                      Compartilhar conquista
                    </Text>
                  </TouchableOpacity>
                )}
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#FFF" },
  archetypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  archetypeBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  tabContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.1)",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  content: { gap: 12, paddingHorizontal: 12 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: -0.5 },
  subtitle: { fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 0, opacity: 0.6 },
  card: {
    borderRadius: 20,
    padding: 16,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  compactStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  compactStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  compactStatValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
  },
  compactStatLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    opacity: 0.4,
  },
  statDivider: {
    width: 1,
    height: 20,
    opacity: 0.1,
  },
  cardText: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#FFF" },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  progressTitle: { fontFamily: "DMSans_700Bold", fontSize: 13, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressPercent: { fontFamily: "DMSans_800ExtraBold", fontSize: 18 },
  progressBarBg: { height: 10, borderRadius: 5, width: "100%" },
  progressBarFill: { height: 10, borderRadius: 5, minWidth: 10 },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    marginBottom: 8,
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
  historyId: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  historyArch: { fontFamily: "DMSans_400Regular", fontSize: 12, opacity: 0.6 },
  historyXp: { fontFamily: "DMSans_700Bold", fontSize: 14 },
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
  // Trophy detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  trophyModal: {
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  trophyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rarityBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  trophyModalIcon: {
    alignItems: "center",
    paddingVertical: 8,
  },
  trophyModalLocked: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  trophyModalName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  trophyModalDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    opacity: 0.7,
  },
  xpRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  xpRewardText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#A78BFA",
  },
  // Progress section (series trophies)
  progressSection: { gap: 10 },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressSeriesLabel: { fontFamily: "DMSans_700Bold", fontSize: 13, opacity: 0.6 },
  progressValues: { fontFamily: "DMSans_800ExtraBold", fontSize: 14 },
  achProgressBg: { height: 8, borderRadius: 4, width: "100%" },
  achProgressFill: { height: 8, borderRadius: 4, minWidth: 8 },
  progressNextLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, opacity: 0.5 },
  seriesStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  seriesStatItem: { alignItems: "center", flex: 1, gap: 2 },
  seriesStatValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  seriesStatLabel: { fontFamily: "DMSans_700Bold", fontSize: 9, textTransform: "uppercase", opacity: 0.5 },
  // Share button
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  shareBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
  },
  trophyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
    marginTop: 2,
  },
  // ── Monthly trophies ─────────────────────────────────────────────────────
  monthlyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(30, 16, 64, 0.8)", // More transparent
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
  highlightsSection: { gap: 8 },
  highlightsScroll: { gap: 8, paddingRight: 20 },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 130,
  },
  highlightName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
  },
  highlightRarity: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    marginTop: 1,
    opacity: 0.7,
  },
});
