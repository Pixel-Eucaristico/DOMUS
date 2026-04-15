import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourGroupNavigation } from "@/src/tour/useTourGroupNavigation";
import { TourMiniBadge } from "@/src/components/tour/TourMiniBadge";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  children?: React.ReactNode;
}

/**
 * Simplified tour overlay.
 *
 * Responsibilities:
 *  1. Runs useTourGroupNavigation() to navigate between page groups.
 *  2. Shows TourMiniBadge when the tour is minimized.
 *
 * Per-page spotlight and modal steps are handled by TourPageHost inside each page.
 */
export function TourOverlay({ theme, children }: Props) {
  const { isDemoActive, isTourMinimized, setTourMinimized } = useDemoMode();

  useTourGroupNavigation();

  const handleRestore = useCallback(() => {
    soundManager.play("pop");
    setTimeout(() => setTourMinimized(false), 200);
  }, [setTourMinimized]);

  return (
    <View style={styles.root}>
      {children}
      {isDemoActive && isTourMinimized ? (
        <TourMiniBadge theme={theme} onRestore={handleRestore} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
