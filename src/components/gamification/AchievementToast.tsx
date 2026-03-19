import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
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
import { TText } from "@/src/components/tamagui";
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

    soundManager.play("success");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(3200, withTiming(0, { duration: 400 })),
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 300 }),
      withDelay(3200, withTiming(-20, { duration: 400 })),
    );

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
    <Animated.View style={[s.container, { top: offsetTop }, animStyle]} pointerEvents="none">
      <View style={[s.card, { borderColor: rarityColor }]}>
        <AnimatedTrophy rarity={toast.rarity} size={48} spinning />
        <View style={s.textArea}>
          <View style={s.row}>
            <TText
              bold
              fontSize={10}
              paddingHorizontal={7}
              paddingVertical={2}
              borderRadius={5}
              overflow="hidden"
              backgroundColor={rarityColor + "22"}
              color={rarityColor}
            >
              {RARITY_LABEL[toast.rarity]}
            </TText>
            <TText bold fontSize={11} color="#A78BFA">+{toast.xpReward} XP</TText>
          </View>
          <TText bold fontSize={14} color="#FFFFFF">{toast.name}</TText>
          <TText variant="caption" color="#AAAAAA" lineHeight={16} numberOfLines={2}>
            {toast.description}
          </TText>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
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
});
