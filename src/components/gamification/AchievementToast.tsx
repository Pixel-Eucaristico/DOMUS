import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { soundManager } from "@/src/services/SoundManager";
import { AnimatedTrophy } from "./AnimatedTrophy";
import type { AchievementUnlockedPayload } from "@packages/gamification/src/types";

const RARITY_COLORS = {
  silver: "#9E9E9E",
  gold: "#FFC107",
  diamond: "#4FC3F7",
};

const RARITY_LABEL = {
  silver: "Prata",
  gold: "Ouro",
  diamond: "Diamante",
};

interface Props {
  toast: AchievementUnlockedPayload | null;
  onDismiss: () => void;
  offsetTop?: number;
}

export function AchievementToast({ toast, onDismiss, offsetTop = 56 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (!toast) {
      opacity.value = 0;
      translateY.value = -20;
      return;
    }

    // Som e haptic ao aparecer
    soundManager.play("success");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    // Animação: entra → espera → sai
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(3200, withTiming(0, { duration: 400 })),
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 300 }),
      withDelay(3200, withTiming(-20, { duration: 400 })),
    );

    // Dismiss após 4s total
    const timer = setTimeout(() => {
      runOnJS(onDismiss)();
    }, 3900);

    return () => clearTimeout(timer);
  }, [toast]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const rarityColor = RARITY_COLORS[toast.rarity];

  return (
    <Animated.View style={[styles.container, { top: offsetTop }, animStyle]} pointerEvents="none">
      <View style={[styles.card, { borderColor: rarityColor }]}>
        <AnimatedTrophy rarity={toast.rarity} size={48} spinning />
        <View style={styles.textArea}>
          <View style={styles.row}>
            <Text style={[styles.rarityBadge, { backgroundColor: rarityColor + "22", color: rarityColor }]}>
              {RARITY_LABEL[toast.rarity]}
            </Text>
            <Text style={styles.xp}>+{toast.xpReward} XP</Text>
          </View>
          <Text style={styles.name}>{toast.name}</Text>
          <Text style={styles.desc} numberOfLines={2}>{toast.description}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A1A2E",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  textArea: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rarityBadge: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: "hidden",
  },
  xp: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#A78BFA",
  },
  name: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  desc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
    lineHeight: 16,
  },
});
