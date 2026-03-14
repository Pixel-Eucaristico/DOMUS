import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { TOUR_TOTAL } from "@/src/tour/tourStepConfig";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";
import { TOTAL_PAGE_GROUPS } from "@/src/tour/tourPageGroups";

interface Props {
  theme: ThemeColors;
  onRestore: () => void;
}

export function TourMiniBadge({ theme, onRestore }: Props) {
  const insets = useSafeAreaInsets();
  const { currentPageGroup } = useDemoMode();

  const handleRestore = () => {
    soundManager.play("pop");
    onRestore();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[s.badge, { top: insets.top + 8, backgroundColor: theme.primaryColor }]}
    >
      <Pressable style={s.inner} onPress={handleRestore} hitSlop={8}>
        <Feather name="map" size={14} color="#FFF" />
        <Text style={s.text}>Tour {currentPageGroup + 1}/{TOTAL_PAGE_GROUPS}</Text>
        <Feather name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: "absolute",
    right: 16,
    zIndex: 9999,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#FFF",
  },
});
