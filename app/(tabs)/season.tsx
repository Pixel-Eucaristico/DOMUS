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
import { AnimatedTrophy } from "@/src/components/gamification/AnimatedTrophy";
import { ReligiousPreferenceModal } from "@/src/components/shared/ReligiousPreferenceModal";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SeasonScreen() {
  const insets = useSafeAreaInsets();
  const { gamification, season, archetype, theme, levelInfo, budget, dispatch, domain, isCatholic, setIsCatholic } =
    useAppState();
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null);
  const [showCatholicModal, setShowCatholicModal] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const archetypeInfo = getArchetypeDescription(archetype);
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

  const handleShareTrophy = async () => {
    if (!selectedAch) return;
    try {
      await Share.share({
        message:
          `🏆 Conquistei "${selectedAch.name}" no DOMUS!\n` +
          `💰 Controle financeiro com propósito.\n\n` +
          `#DOMUS #FinançasPessoais #${selectedAch.rarity === "diamond" ? "Diamante" : selectedAch.rarity === "gold" ? "Ouro" : "Prata"}`,
      });
    } catch (_) {}
  };

  const MONTHS = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          st.content,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: insets.bottom + webBottomInset + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[st.title, { color: theme.textColor }]}>Temporada</Text>
        <Text style={[st.subtitle, { color: theme.secondaryText }]}>
          {MONTHS[currentMonth - 1]} {currentYear}
        </Text>

        <View style={[st.archetypeCard, { backgroundColor: theme.primaryColor }]}>
          <MaterialCommunityIcons
            name="shield-star"
            size={32}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={st.archetypeName}>{archetypeInfo.name}</Text>
          <Text style={st.archetypeDesc}>{archetypeInfo.description}</Text>
          <View style={st.toneRow}>
            <View style={st.toneBadge}>
              <Text style={st.toneText}>
                Tom: {capitalize(tone.style)}
              </Text>
            </View>
          </View>
        </View>

        {!hasSeason ? (
          <View style={[st.card, { backgroundColor: theme.cardBackground }]}>
            <Feather name="calendar" size={32} color={theme.secondaryText} />
            <Text style={[st.cardText, { color: theme.textColor }]}>
              Nenhuma temporada ativa
            </Text>
            <Text style={[st.cardSubtext, { color: theme.secondaryText }]}>
              Inicie uma temporada para acompanhar seu progresso mensal
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
          <View style={[st.card, { backgroundColor: theme.cardBackground }]}>
            <View style={st.progressHeader}>
              <Text style={[st.progressTitle, { color: theme.textColor }]}>
                Progresso do mes
              </Text>
              <Text style={[st.progressPercent, { color: theme.primaryColor }]}>
                {monthProgress}%
              </Text>
            </View>
            <View style={[st.progressBarBg, { backgroundColor: theme.border }]}>
              <View
                style={[
                  st.progressBarFill,
                  {
                    width: `${monthProgress}%` as any,
                    backgroundColor: theme.accentColor,
                  },
                ]}
              />
            </View>
            <Text style={[st.dayInfo, { color: theme.secondaryText }]}>
              Dia {dayOfMonth} de {daysInMonth}
            </Text>

            <View style={st.seasonStats}>
              <View style={st.seasonStatItem}>
                <Feather name="zap" size={18} color={theme.primaryColor} />
                <Text style={[st.seasonStatValue, { color: theme.textColor }]}>
                  {gamification.totalXp}
                </Text>
                <Text style={[st.seasonStatLabel, { color: theme.secondaryText }]}>
                  XP
                </Text>
              </View>
              <View style={st.seasonStatItem}>
                <MaterialCommunityIcons name="fire" size={20} color={theme.warning} />
                <Text style={[st.seasonStatValue, { color: theme.textColor }]}>
                  {gamification.currentStreak}
                </Text>
                <Text style={[st.seasonStatLabel, { color: theme.secondaryText }]}>
                  Streak
                </Text>
              </View>
              <View style={st.seasonStatItem}>
                <Feather name="target" size={18} color={theme.success} />
                <Text style={[st.seasonStatValue, { color: theme.textColor }]}>
                  {budget.adherenceScore}
                </Text>
                <Text style={[st.seasonStatLabel, { color: theme.secondaryText }]}>
                  Score
                </Text>
              </View>
            </View>

            {dayOfMonth >= daysInMonth - 2 && (
              <Pressable
                style={[st.actionBtn, { backgroundColor: theme.accentColor }]}
                onPress={handleEvaluate}
              >
                <Feather name="check-circle" size={18} color="#FFF" />
                <Text style={st.actionBtnText}>Encerrar temporada</Text>
              </Pressable>
            )}
          </View>
        )}

        {season.history.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[st.sectionTitle, { color: theme.textColor }]}>
              Historico
            </Text>
            {season.history.map((h, i) => (
              <View
                key={i}
                style={[st.historyRow, { borderBottomColor: theme.border }]}
              >
                <View style={st.historyInfo}>
                  <Text style={[st.historyId, { color: theme.textColor }]}>
                    {h.seasonId}
                  </Text>
                  <Text style={[st.historyArch, { color: theme.secondaryText }]}>
                    {capitalize(h.archetype)} / Nivel {h.level}
                  </Text>
                </View>
                <Text style={[st.historyXp, { color: theme.primaryColor }]}>
                  {h.totalXp} XP
                </Text>
              </View>
            ))}
          </View>
        )}

        {season.badges.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[st.sectionTitle, { color: theme.textColor }]}>
              Badges
            </Text>
            <View style={st.badgeGrid}>
              {season.badges.map((b, i) => (
                <View
                  key={i}
                  style={[st.badgeItem, { backgroundColor: `${theme.primaryColor}10` }]}
                >
                  <Feather name="award" size={24} color={theme.primaryColor} />
                  <Text style={[st.badgeName, { color: theme.textColor }]}>
                    {b.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[st.quoteCard, { backgroundColor: `${theme.primaryColor}08` }]}>
          <Feather name="message-circle" size={18} color={theme.primaryColor} />
          <Text style={[st.quoteText, { color: theme.textColor }]}>
            {tone.messageTemplate}
          </Text>
        </View>

        {/* ── Troféu Surpresa do Mês ───────────────────────────────────── */}
        {(() => {
          const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
          const selectedEntry = (gamification.selectedSeasonalTrophies ?? []).find(
            s => s.monthKey === monthKey,
          );
          const isCompleted = selectedEntry
            ? (gamification.completedSeasonalTrophies ?? []).some(
                c => c.trophyId === selectedEntry.trophyId && c.monthKey === monthKey,
              )
            : false;
          const trophy = selectedEntry
            ? (ALL_SEASONAL_TROPHIES.find(t => t.id === selectedEntry.trophyId) ??
               ALL_LITURGICAL_TROPHIES.find(t => t.id === selectedEntry.trophyId))
            : null;

          const tier = selectedEntry?.tier ?? 1;
          const tierColor = getTierColor(tier);
          const tierLabel = getTierLabel(tier);
          const xp = trophy ? getSeasonalXp(trophy.baseXp, tier) : 0;
          const prog = trophy && selectedEntry
            ? trophy.progress(domain, budget, monthKey)
            : null;
          const pct = prog && prog.target > 0 ? Math.min(1, prog.current / prog.target) : 0;

          return (
            <View style={[st.surpriseCard, { borderColor: tierColor + "55" }]}>
              {/* Header */}
              <View style={st.surpriseHeader}>
                <View style={st.surpriseTitleRow}>
                  <Text style={st.surpriseEmoji}>🎴</Text>
                  <View>
                    <Text style={[st.surpriseTitle, { color: theme.textColor }]}>
                      Troféu Surpresa do Mês
                    </Text>
                    <Text style={[st.surpriseSubtitle, { color: theme.secondaryText }]}>
                      Sorteado exclusivamente para você
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {selectedEntry && (
                    <View style={[st.tierBadge, { backgroundColor: tierColor + "22" }]}>
                      <Text style={[st.tierBadgeText, { color: tierColor }]}>
                        {tierLabel}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowCatholicModal(true)}
                    style={[st.catholicPrefBtn, { borderColor: theme.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[st.catholicPrefText, { color: theme.secondaryText }]}>
                      {isCatholic ? "✝️ Católico" : "⚙️ Preferência"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!selectedEntry ? (
                /* Not yet picked — mystery state */
                <View style={st.mysteryBox}>
                  <Text style={st.mysteryIcon}>❓</Text>
                  <Text style={[st.mysteryText, { color: theme.secondaryText }]}>
                    Seu troféu do mês ainda não foi revelado.{"\n"}Abra o app amanhã para descobrir!
                  </Text>
                </View>
              ) : (
                /* Trophy revealed */
                <View style={st.surpriseTrophyContent}>
                  {/* Event summary */}
                  <View style={[st.eventSummaryBox, { backgroundColor: tierColor + "0F" }]}>
                    <Text style={st.surpriseTrophyIcon}>{trophy?.icon ?? "🏅"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.surpriseTrophyName, { color: theme.textColor }]}>
                        {trophy?.name}
                      </Text>
                      <Text style={[st.eventSummaryText, { color: theme.secondaryText }]}>
                        {trophy?.eventSummary}
                      </Text>
                    </View>
                  </View>

                  {/* Goal */}
                  <View style={[st.goalBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Feather name="target" size={13} color={tierColor} />
                    <Text style={[st.goalText, { color: theme.textColor }]}>
                      {trophy?.description}
                    </Text>
                  </View>

                  {/* Progress */}
                  {prog && (
                    <View style={st.surpriseProgressSection}>
                      <View style={st.surpriseProgressRow}>
                        <View style={[st.surpriseProgressBg, { backgroundColor: theme.border }]}>
                          <View
                            style={[
                              st.surpriseProgressFill,
                              {
                                width: `${Math.round(pct * 100)}%` as any,
                                backgroundColor: isCompleted ? tierColor : theme.accentColor,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[st.surpriseProgressLabel, { color: theme.secondaryText }]}>
                          {prog.current}/{prog.target} {prog.unit}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* XP + completion row */}
                  <View style={st.surpriseFooter}>
                    <View style={[st.surpriseXpBadge, { backgroundColor: tierColor + "20" }]}>
                      <Feather name="zap" size={12} color={tierColor} />
                      <Text style={[st.surpriseXpText, { color: tierColor }]}>
                        +{xp} XP
                      </Text>
                    </View>
                    {tier > 1 && (
                      <Text style={[st.tierRepeatText, { color: theme.secondaryText }]}>
                        ✨ {tier === 2 ? "2ª vez" : "3ª vez"} — bônus ×{tier === 2 ? "1.5" : "2"}
                      </Text>
                    )}
                    {isCompleted && (
                      <View style={[st.completedBadge, { backgroundColor: tierColor + "22" }]}>
                        <Feather name="check-circle" size={13} color={tierColor} />
                        <Text style={[st.completedBadgeText, { color: tierColor }]}>
                          Conquistado!
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Info footer */}
              <Text style={[st.surpriseInfo, { color: theme.secondaryText }]}>
                🎴 A cada mês um troféu diferente é sorteado. Ao repetir no ano seguinte, o nível sobe e o XP aumenta.
              </Text>

              {/* 12-month album */}
              {(() => {
                const ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                return (
                  <View style={st.albumSection}>
                    <Text style={[st.albumTitle, { color: theme.secondaryText }]}>
                      Álbum {currentYear}
                    </Text>
                    <View style={st.albumGrid}>
                      {ABBR.map((abbr, i) => {
                        const m = i + 1;
                        const mk = `${currentYear}-${String(m).padStart(2, "0")}`;
                        const sel = (gamification.selectedSeasonalTrophies ?? []).find(s => s.monthKey === mk);
                        const comp = sel
                          ? (gamification.completedSeasonalTrophies ?? []).find(
                              c => c.trophyId === sel.trophyId && c.monthKey === mk,
                            )
                          : null;
                        const t = sel
                          ? (ALL_SEASONAL_TROPHIES.find(tr => tr.id === sel.trophyId) ??
                             ALL_LITURGICAL_TROPHIES.find(tr => tr.id === sel.trophyId))
                          : null;
                        const tc = sel ? getTierColor(sel.tier) : null;
                        const isComp = !!comp;
                        const isCurrent = m === currentMonth;
                        const isFuture = m > currentMonth;
                        return (
                          <View
                            key={mk}
                            style={[
                              st.albumCell,
                              {
                                backgroundColor: isComp
                                  ? ((tc ?? "#888") + "22")
                                  : isCurrent
                                  ? "#FFFFFF0A"
                                  : "#FFFFFF06",
                                borderColor: isComp
                                  ? ((tc ?? "#888") + "55")
                                  : isCurrent
                                  ? "#FFFFFF22"
                                  : "#FFFFFF0A",
                              },
                            ]}
                          >
                            <Text style={st.albumIcon}>
                              {isComp ? (t?.icon ?? "🏅") : sel ? (t?.icon ?? "🎴") : isFuture ? "❓" : "—"}
                            </Text>
                            <Text
                              style={[
                                st.albumMonthLabel,
                                { color: isComp ? (tc ?? "#888") : isCurrent ? "#FFFFFF66" : "#FFFFFF33" },
                              ]}
                            >
                              {abbr}
                            </Text>
                            {isComp && tc && (
                              <View style={[st.albumTierDot, { backgroundColor: tc }]} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}

              {/* Catholic preference modal — triggered from preference button */}
              <ReligiousPreferenceModal
                visible={showCatholicModal}
                onSelect={(val) => {
                  setIsCatholic(val);
                  setShowCatholicModal(false);
                }}
              />
            </View>
          );
        })()}

        {/* ── Desafios do Mês ──────────────────────────────────────────── */}
        {(() => {
          const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
          const completedThisMonth = new Set(
            (gamification.completedMonthlyTrophies ?? [])
              .filter(c => c.monthKey === monthKey)
              .map(c => c.id),
          );

          return (
            <View style={[st.monthlyCard, { backgroundColor: "#1E1040", borderColor: "#A78BFA44" }]}>
              {/* Header */}
              <View style={st.monthlyHeader}>
                <View style={st.monthlyTitleRow}>
                  <Text style={st.monthlyEmoji}>🏅</Text>
                  <Text style={st.monthlyTitle}>Desafios do Mês</Text>
                </View>
                <View style={[st.monthlyBadge, { backgroundColor: "#A78BFA22" }]}>
                  <Text style={[st.monthlyBadgeText, { color: "#A78BFA" }]}>
                    {completedThisMonth.size}/{MONTHLY_TROPHIES.length}
                  </Text>
                </View>
              </View>
              <Text style={st.monthlyInfo}>
                O progresso reinicia todo mês, mas o XP conquistado é permanente.
              </Text>

              {/* Trophy list */}
              <View style={st.monthlyList}>
                {MONTHLY_TROPHIES.map(trophy => {
                  const done = completedThisMonth.has(trophy.id);
                  const prog = trophy.progress(domain, budget, monthKey);
                  const pct = prog.target > 0 ? Math.min(1, prog.current / prog.target) : 0;

                  return (
                    <View
                      key={trophy.id}
                      style={[
                        st.monthlyItem,
                        { backgroundColor: done ? "#A78BFA18" : "#FFFFFF08", borderColor: done ? "#A78BFA55" : "#FFFFFF0F" },
                      ]}
                    >
                      <View style={st.monthlyItemHeader}>
                        <Text style={st.monthlyItemIcon}>{trophy.icon}</Text>
                        <View style={st.monthlyItemInfo}>
                          <Text style={st.monthlyItemName}>{trophy.name}</Text>
                          <Text style={st.monthlyItemDesc}>{trophy.description}</Text>
                        </View>
                        {done ? (
                          <View style={[st.monthlyDoneBadge, { backgroundColor: "#A78BFA22" }]}>
                            <Feather name="check" size={14} color="#A78BFA" />
                          </View>
                        ) : (
                          <View style={[st.monthlyXpBadge, { backgroundColor: "#FFFFFF0A" }]}>
                            <Text style={st.monthlyXpText}>+{trophy.xpReward} XP</Text>
                          </View>
                        )}
                      </View>

                      {/* Progress bar */}
                      <View style={st.monthlyProgressRow}>
                        <View style={st.monthlyProgressBg}>
                          <View
                            style={[
                              st.monthlyProgressFill,
                              {
                                backgroundColor: done ? "#A78BFA" : "#7C3AED",
                                width: `${Math.round(pct * 100)}%` as any,
                              },
                            ]}
                          />
                        </View>
                        <Text style={st.monthlyProgressLabel}>
                          {prog.current}/{prog.target} {prog.unit}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* ── Conquistas ───────────────────────────────────────────────── */}
        {(() => {
          const unlockedIds = new Set(
            (gamification.unlockedAchievements ?? []).map((a) => a.id),
          );
          const totalXpFromAchs = ALL_ACHIEVEMENTS
            .filter((a) => unlockedIds.has(a.id))
            .reduce((s, a) => s + a.xpReward, 0);
          const nowD = new Date();
          const monthStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`;
          const monthlyXp = (gamification.xpHistory ?? [])
            .filter((h) => {
              const d = new Date(h.timestamp);
              return (
                d.getMonth() === nowD.getMonth() &&
                d.getFullYear() === nowD.getFullYear() &&
                h.amount > 0
              );
            })
            .reduce((s, h) => s + h.amount, 0);

          return (
            <View style={[st.achievementsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={st.achievementsHeader}>
                <Feather name="award" size={16} color={theme.primaryColor} />
                <Text style={[st.achievementsTitle, { color: theme.textColor }]}>
                  Minhas Conquistas
                </Text>
                <Text style={[st.achievementsCount, { color: theme.secondaryText }]}>
                  {unlockedIds.size}/{ALL_ACHIEVEMENTS.length}
                </Text>
              </View>

              {/* XP stats row */}
              <View style={st.xpStatsRow}>
                <View style={st.xpStatItem}>
                  <Text style={[st.xpStatValue, { color: "#A78BFA" }]}>
                    {totalXpFromAchs.toLocaleString("pt-BR")}
                  </Text>
                  <Text style={[st.xpStatLabel, { color: theme.secondaryText }]}>
                    XP de troféus
                  </Text>
                </View>
                <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                <View style={st.xpStatItem}>
                  <Text style={[st.xpStatValue, { color: theme.primaryColor }]}>
                    +{monthlyXp.toLocaleString("pt-BR")}
                  </Text>
                  <Text style={[st.xpStatLabel, { color: theme.secondaryText }]}>
                    XP este mês
                  </Text>
                </View>
                <View style={[st.xpStatDivider, { backgroundColor: theme.border }]} />
                <View style={st.xpStatItem}>
                  <Text style={[st.xpStatValue, { color: theme.textColor }]}>
                    {gamification.totalXp.toLocaleString("pt-BR")}
                  </Text>
                  <Text style={[st.xpStatLabel, { color: theme.secondaryText }]}>
                    XP total
                  </Text>
                </View>
              </View>

              <View style={st.trophyGrid}>
                {ALL_ACHIEVEMENTS.map((ach) => {
                  const unlocked = unlockedIds.has(ach.id);
                  return (
                    <Pressable
                      key={ach.id}
                      style={({ pressed }) => [
                        st.trophyCell,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => setSelectedAch(ach)}
                    >
                      {unlocked ? (
                        <AnimatedTrophy rarity={ach.rarity} size={52} spinning />
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
                        numberOfLines={2}
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
                    onPress={() => setSelectedAch(null)}
                  >
                    <Feather name="x" size={16} color={theme.secondaryText} />
                  </TouchableOpacity>
                </View>

                {/* Trophy icon */}
                <View style={st.trophyModalIcon}>
                  {unlocked ? (
                    <AnimatedTrophy rarity={selectedAch.rarity} size={80} spinning />
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
  content: { gap: 16, paddingHorizontal: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, paddingHorizontal: 8 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 14, paddingHorizontal: 8, marginTop: -8 },
  archetypeCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  archetypeName: { fontFamily: "DMSans_700Bold", fontSize: 22, color: "#FFF", marginTop: 4 },
  archetypeDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center" as const,
    lineHeight: 18,
  },
  toneRow: { marginTop: 6 },
  toneBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  toneText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  card: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center" as const,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardText: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  cardSubtext: { fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" as const },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  actionBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#FFF" },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  progressTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  progressPercent: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  progressBarBg: { height: 8, borderRadius: 4, width: "100%" },
  progressBarFill: { height: 8, borderRadius: 4, minWidth: 4 },
  dayInfo: { fontFamily: "DMSans_400Regular", fontSize: 12, alignSelf: "flex-start" as const },
  seasonStats: { flexDirection: "row", width: "100%", justifyContent: "space-around" as const, marginTop: 8 },
  seasonStatItem: { alignItems: "center", gap: 4 },
  seasonStatValue: { fontFamily: "DMSans_700Bold", fontSize: 20 },
  seasonStatLabel: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  sectionTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16, alignSelf: "flex-start" as const },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyInfo: {},
  historyId: { fontFamily: "DMSans_500Medium", fontSize: 14 },
  historyArch: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  historyXp: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  badgeItem: {
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderRadius: 14,
    width: 90,
  },
  badgeName: { fontFamily: "DMSans_500Medium", fontSize: 11, textAlign: "center" as const },
  quoteCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  quoteText: { fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 20 },
  achievementsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  achievementsTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    flex: 1,
  },
  achievementsCount: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  trophyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trophyCell: {
    width: "30%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  lockedTrophy: {
    width: 52,
    height: 62,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  // XP stats row inside achievements card
  xpStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  xpStatItem: { alignItems: "center", flex: 1, gap: 2 },
  xpStatValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  xpStatLabel: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  xpStatDivider: { width: 1, height: 28, borderRadius: 1 },
  // Trophy detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  trophyModal: {
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    gap: 12,
  },
  trophyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },
  rarityBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  trophyModalIcon: {
    alignItems: "center",
    paddingVertical: 4,
  },
  trophyModalLocked: {
    width: 90,
    height: 90,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  trophyModalName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  trophyModalDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  xpRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  xpRewardText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#A78BFA",
  },
  // Progress section (series trophies)
  progressSection: { gap: 8 },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressSeriesLabel: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  progressValues: { fontFamily: "DMSans_700Bold", fontSize: 13 },
  achProgressBg: { height: 8, borderRadius: 4, width: "100%" },
  achProgressFill: { height: 8, borderRadius: 4, minWidth: 6 },
  progressNextLabel: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  seriesStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  seriesStatItem: { alignItems: "center", flex: 1, gap: 2 },
  seriesStatValue: { fontFamily: "DMSans_700Bold", fontSize: 15 },
  seriesStatLabel: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  // Share button
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
  shareBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  trophyName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  // ── Seasonal surprise trophy ─────────────────────────────────────────────
  surpriseCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    backgroundColor: "#0F0A1E",
  },
  surpriseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  surpriseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  surpriseEmoji: { fontSize: 26 },
  surpriseTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
  },
  surpriseSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  tierBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  mysteryBox: {
    alignItems: "center",
    paddingVertical: 18,
    gap: 10,
  },
  mysteryIcon: { fontSize: 48 },
  mysteryText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  surpriseTrophyContent: { gap: 10 },
  eventSummaryBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 10,
    padding: 12,
  },
  surpriseTrophyIcon: { fontSize: 28, lineHeight: 36 },
  surpriseTrophyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  eventSummaryText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  goalBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  goalText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  surpriseProgressSection: { gap: 4 },
  surpriseProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  surpriseProgressBg: {
    flex: 1,
    height: 7,
    borderRadius: 4,
  },
  surpriseProgressFill: {
    height: 7,
    borderRadius: 4,
    minWidth: 4,
  },
  surpriseProgressLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    minWidth: 80,
    textAlign: "right",
  },
  surpriseFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  surpriseXpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  surpriseXpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  tierRepeatText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
  },
  // ── Catholic preference button ────────────────────────────────────────────
  catholicPrefBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  catholicPrefText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  // ── 12-month album ────────────────────────────────────────────────────────
  albumSection: { gap: 8, marginTop: 4 },
  albumTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  albumCell: {
    width: "22%",
    aspectRatio: 0.85,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
    position: "relative",
  },
  albumIcon: { fontSize: 16, lineHeight: 20 },
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
  // ── Monthly trophies ─────────────────────────────────────────────────────
  monthlyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
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
  monthlyEmoji: { fontSize: 20 },
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
  monthlyInfo: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#A78BFA",
    lineHeight: 16,
  },
  monthlyList: { gap: 10 },
  monthlyItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  monthlyItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  monthlyItemIcon: { fontSize: 22, lineHeight: 28 },
  monthlyItemInfo: { flex: 1, gap: 2 },
  monthlyItemName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#E9D5FF",
  },
  monthlyItemDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 15,
  },
  monthlyDoneBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  monthlyXpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    justifyContent: "center",
  },
  monthlyXpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#A78BFA",
  },
  monthlyProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthlyProgressBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF15",
  },
  monthlyProgressFill: {
    height: 5,
    borderRadius: 3,
    minWidth: 4,
  },
  monthlyProgressLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#9CA3AF",
    minWidth: 70,
    textAlign: "right",
  },
});
