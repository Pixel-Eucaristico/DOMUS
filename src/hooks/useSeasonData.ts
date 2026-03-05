import { useMemo, useRef } from "react";
import type { View } from "react-native";
import { Share } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { startSeason, evaluateSeason } from "@packages/season/src/seasonEngine";
import { SEASON_EVENTS } from "@packages/season/src/types";
import { generateId } from "@packages/events/src/factory";
import {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_SERIES,
  getNextSeriesTarget,
  getConsecutiveMonthsCompliant,
} from "@packages/gamification/src/achievements";
import type { Achievement } from "@packages/gamification/src/achievements";
import { soundManager } from "@/src/services/SoundManager";

export const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface SeriesProgressData {
  series: (typeof ACHIEVEMENT_SERIES)[number];
  currentValue: number;
  nextTarget: number;
  progress: number;
  xpEarned: number;
  xpPossible: number;
  monthlyValue: number;
}

interface UseSeasonDataParams {
  gamification: any;
  season: any;
  domain: any;
  budget: any;
  levelInfo: any;
  archetype: any;
  dispatch: (event: any) => void;
}

export function useSeasonData(params: UseSeasonDataParams) {
  const { gamification, season, domain, budget, levelInfo, archetype, dispatch } = params;

  const levelCardRef = useRef<View>(null);
  const progressCardRef = useRef<View>(null);
  const challengesCardRef = useRef<View>(null);
  const collectionCardRef = useRef<View>(null);
  const trophyModalRef = useRef<View>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);
  const hasSeason = season.currentSeason !== null && season.currentSeason.active;

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

  const computeSeriesProgress = (selectedAch: Achievement | null): SeriesProgressData | null => {
    if (!selectedAch?.seriesId) return null;
    const series = ACHIEVEMENT_SERIES.find((s) => s.id === selectedAch.seriesId);
    if (!series) return null;

    let currentValue = 0;
    switch (series.id) {
      case "transactions":
        currentValue = Object.values(domain.transactions ?? {}).length;
        break;
      case "streak":
        currentValue = Math.max(gamification.currentStreak, gamification.longestStreak);
        break;
      case "level":
        currentValue = levelInfo.level;
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
            .filter((tx: any) => tx.categoryId === "dizimo")
            .map((tx: any) => tx.date.slice(0, 7)),
        );
        currentValue = months.size;
        break;
      }
    }

    const nextTarget = getNextSeriesTarget(series, currentValue);
    const prevTarget = [...series.thresholds].reverse().find((t) => t <= currentValue) ?? 0;
    const range = nextTarget - prevTarget;
    const progress = range > 0 ? Math.min(1, (currentValue - prevTarget) / range) : 1;

    const unlockedIds = new Set(
      (gamification.unlockedAchievements ?? []).map((a: any) => a.id),
    );
    const seriesAchs = ALL_ACHIEVEMENTS.filter((a) => a.seriesId === series.id);
    const xpEarned = seriesAchs
      .filter((a) => unlockedIds.has(a.id))
      .reduce((s, a) => s + a.xpReward, 0);
    const xpPossible = seriesAchs.reduce((s, a) => s + a.xpReward, 0);

    const nowD = new Date();
    const monthStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`;
    let monthlyValue = 0;
    if (series.id === "transactions") {
      monthlyValue = Object.values(domain.transactions ?? {}).filter(
        (tx: any) => tx.date.startsWith(monthStr),
      ).length;
    } else if (series.id === "streak") {
      monthlyValue = gamification.currentStreak;
    } else if (series.id === "level") {
      monthlyValue = (gamification.xpHistory ?? [])
        .filter((h: any) => {
          const d = new Date(h.timestamp);
          return d.getMonth() === nowD.getMonth() && d.getFullYear() === nowD.getFullYear();
        })
        .reduce((s: number, h: any) => s + Math.max(0, h.amount), 0);
    }

    return { series, currentValue, nextTarget, progress, xpEarned, xpPossible, monthlyValue };
  };

  // Share handlers
  const handleShareTrophy = async (selectedAch: Achievement | null) => {
    if (!trophyModalRef.current || !selectedAch) return;
    try {
      soundManager.play("share");
      const uri = await captureRef(trophyModalRef, { format: "png", quality: 0.9 });
      await Sharing.shareAsync(uri, { dialogTitle: `Conquista: ${selectedAch.name}` });
    } catch (_) {
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
          `✨ Alcancei o Nível ${levelInfo.level} no DOMUS!\n` +
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

  return {
    // Refs
    levelCardRef,
    progressCardRef,
    challengesCardRef,
    collectionCardRef,
    trophyModalRef,
    // Computed
    currentMonth,
    currentYear,
    daysInMonth,
    dayOfMonth,
    monthProgress,
    hasSeason,
    // Handlers
    handleStartSeason,
    handleEvaluate,
    computeSeriesProgress,
    handleShareTrophy,
    handleShareXpLevel,
    handleShareMonthlyProgress,
    handleShareMonthlyChallenges,
    handleShareCollection,
  };
}
