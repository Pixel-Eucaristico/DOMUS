import { useState, useCallback, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeForArchetype, type ThemeColors, type ThemeMode } from "@packages/theme";
import { detectArchetype, calculateScores } from "@packages/personality/src/profileDetector";
import type { ArchetypeType } from "@packages/personality/src/types";
import { soundManager } from "@/src/services/SoundManager";

const THEME_MODE_KEY = "domus_theme_mode_v1";
const SOUND_ENABLED_KEY = "domus_sound_enabled_v1";
const IS_CATHOLIC_KEY = "domus_is_catholic_v1";

export interface ThemePreferencesInput {
  debugArchetype: ArchetypeType | null;
  transactionCount: number;
  currentStreak: number;
  budgetAdherenceScore: number;
  wishlistItemCount: number;
  monthsPlanned: number;
}

export interface ThemePreferencesState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isCatholic: boolean | null;
  setIsCatholic: (value: boolean) => void;
  archetype: ArchetypeType;
  theme: ThemeColors;
  isDarkState: boolean;
}

export function useThemePreferences(input: ThemePreferencesInput): ThemePreferencesState {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [isCatholic, setIsCatholicState] = useState<boolean | null>(null);

  const initialIsDark = systemColorScheme === "dark";
  const [isDarkState, setIsDarkState] = useState(initialIsDark);

  useEffect(() => {
    const isDark =
      themeMode === "dark" ||
      (themeMode === "system" && systemColorScheme === "dark");
    setIsDarkState(isDark);
  }, [themeMode, systemColorScheme]);

  // Hydrate preferences from storage
  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedTheme = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (savedTheme && mounted) setThemeModeState(savedTheme as ThemeMode);

      const savedSound = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      if (savedSound !== null && mounted) {
        const enabled = savedSound === "true";
        setSoundEnabledState(enabled);
        soundManager.setEnabled(enabled);
      }

      soundManager.init().catch(() => {});

      const savedCatholic = await AsyncStorage.getItem(IS_CATHOLIC_KEY);
      if (savedCatholic !== null && mounted) {
        setIsCatholicState(savedCatholic === "true");
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  }, []);

  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundManager.setEnabled(enabled);
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false");
  }, []);

  const setIsCatholic = useCallback(async (value: boolean) => {
    setIsCatholicState(value);
    await AsyncStorage.setItem(IS_CATHOLIC_KEY, value ? "true" : "false");
  }, []);

  const archetype = useMemo<ArchetypeType>(() => {
    if (input.debugArchetype) return input.debugArchetype;
    const scores = calculateScores({
      transactionCount: input.transactionCount,
      daysActive: input.currentStreak || 1,
      budgetAdherencePercent: input.budgetAdherenceScore,
      wishlistItemsTracked: input.wishlistItemCount,
      desiresSaved: input.wishlistItemCount,
      monthsPlanned: input.monthsPlanned,
    });
    return detectArchetype(scores);
  }, [input.debugArchetype, input.transactionCount, input.currentStreak, input.budgetAdherenceScore, input.wishlistItemCount, input.monthsPlanned]);

  const theme = useMemo(() => {
    return getThemeForArchetype(archetype, isDarkState, isCatholic === true);
  }, [archetype, isDarkState, isCatholic]);

  return {
    themeMode,
    setThemeMode,
    soundEnabled,
    setSoundEnabled,
    isCatholic,
    setIsCatholic,
    archetype,
    theme,
    isDarkState,
  };
}
