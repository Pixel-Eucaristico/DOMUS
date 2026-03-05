import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import {
  ALL_SEASONAL_TROPHIES,
  getTierColor,
  getTierLabel,
} from "@packages/gamification/src/seasonalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";

const ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const triggerHaptic = () => {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

export interface AlbumTrophySelection {
  trophy: any;
  tier: number;
  tierColor: string;
  tierLabel: string;
  isCompleted: boolean;
  isLiturgical: boolean;
}

interface TrophyAlbumViewProps {
  viewingYear: number;
  currentYear: number;
  currentMonth: number;
  gamification: any;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onSelectTrophy: (trophy: AlbumTrophySelection) => void;
  theme: any;
}

export function TrophyAlbumView({
  viewingYear,
  currentYear,
  currentMonth,
  gamification,
  availableYears,
  onYearChange,
  onSelectTrophy,
  theme,
}: TrophyAlbumViewProps) {
  return (
    <View style={s.albumSection}>
      <View style={s.albumHeader}>
        <Text style={[s.albumTitle, { color: theme.secondaryText }]}>Álbum {viewingYear}</Text>

        {availableYears.length > 1 && (
          <View style={[s.yearSelector, { backgroundColor: theme.primaryColor + "12" }]}>
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => {
                  triggerHaptic();
                  onYearChange(year);
                }}
                style={[
                  s.yearButton,
                  viewingYear === year && { backgroundColor: theme.primaryColor + "22" },
                ]}
              >
                <Text
                  style={[
                    s.yearButtonText,
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

      <View style={s.albumGrid}>
        {ABBR.map((abbr, i) => {
          const m = i + 1;
          const mk = `${viewingYear}-${String(m).padStart(2, "0")}`;
          const sel = (gamification.selectedSeasonalTrophies ?? []).find(
            (e: any) => e.monthKey === mk,
          );
          const comp = sel
            ? (gamification.completedSeasonalTrophies ?? []).find(
                (c: any) => c.trophyId === sel.trophyId && c.monthKey === mk,
              )
            : null;
          const t = sel
            ? (ALL_SEASONAL_TROPHIES.find((tr: any) => tr.id === sel.trophyId) ??
              ALL_LITURGICAL_TROPHIES.find((tr: any) => tr.id === sel.trophyId))
            : null;
          const tier = sel?.tier ?? 1;
          const tc = sel ? getTierColor(tier) : null;
          const tl = sel ? getTierLabel(tier) : null;
          const isComp = !!comp;
          const isCurrent = viewingYear === currentYear && m === currentMonth;
          const isFuture =
            viewingYear > currentYear || (viewingYear === currentYear && m > currentMonth);
          const isLit = !!ALL_LITURGICAL_TROPHIES.find((lt: any) => lt.id === t?.id);

          return (
            <TouchableOpacity
              key={mk}
              onPress={() => {
                if (sel && t) {
                  triggerHaptic();
                  onSelectTrophy({
                    trophy: t,
                    tier,
                    tierColor: tc!,
                    tierLabel: tl!,
                    isCompleted: isComp,
                    isLiturgical: isLit,
                  });
                }
              }}
              disabled={!sel}
              style={[
                s.albumCell,
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
              <View style={[s.albumTrophyWrapper, !isComp && ({ opacity: 0.35 } as any)]}>
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
                  <Text style={[s.albumIcon, { opacity: isFuture ? 0.3 : 0.1 }]}>
                    {isFuture ? "❓" : "—"}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  s.albumMonthLabel,
                  {
                    color: isComp
                      ? (tc ?? theme.secondaryText)
                      : isCurrent
                        ? theme.textColor
                        : theme.secondaryText,
                  },
                ]}
              >
                {abbr}
              </Text>
              {isComp && tc && <View style={[s.albumTierDot, { backgroundColor: tc }]} />}
              {!isComp && sel && (
                <View style={s.lockedBadge}>
                  <Feather name="lock" size={8} color={theme.secondaryText} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
});
