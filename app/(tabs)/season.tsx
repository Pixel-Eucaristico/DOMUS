import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { getTone } from "@packages/personality/src/toneEngine";
import { getArchetypeDescription } from "@packages/personality/src/archetypeEngine";
import { createSeasonId, startSeason, evaluateSeason } from "@packages/season/src/seasonEngine";
import { SEASON_EVENTS } from "@packages/season/src/types";
import { generateId } from "@packages/events/src/factory";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SeasonScreen() {
  const insets = useSafeAreaInsets();
  const { gamification, season, archetype, theme, levelInfo, budget, dispatch } =
    useAppState();
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
  };

  const handleEvaluate = () => {
    if (!season.currentSeason) return;
    const evalPayload = evaluateSeason(
      season.currentSeason.seasonId,
      gamification.totalXp,
      levelInfo.level,
      100 - Math.abs(budget.needsPercent - 50) - Math.abs(budget.wantsPercent - 30) - Math.abs(budget.savingsPercent - 20),
      gamification.currentStreak,
      archetype,
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
                  {Math.max(0, 100 - Math.abs(budget.needsPercent - 50) - Math.abs(budget.wantsPercent - 30) - Math.abs(budget.savingsPercent - 20))}
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
      </ScrollView>
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
});
