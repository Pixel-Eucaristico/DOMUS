import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";
import type { CategoryGroup } from "@packages/events/src/types";
import { TText } from "@/src/components/tamagui";

const GROUP_OPTIONS: { value: CategoryGroup; label: string; color: string }[] = [
  { value: "needs", label: "Necessidade", color: "#10B981" },
  { value: "wants", label: "Desejo", color: "#F59E0B" },
  { value: "savings", label: "Poupança", color: "#3B82F6" },
];

interface GroupOverrideChipProps {
  currentGroup: CategoryGroup;
  onChange: (group: CategoryGroup) => void;
  theme: ThemeColors;
  /** Apenas mostra needs/wants (sem savings) */
  hidesSavings?: boolean;
}

export function GroupOverrideChip({
  currentGroup,
  onChange,
  theme,
  hidesSavings = true,
}: GroupOverrideChipProps) {
  const options = hidesSavings
    ? GROUP_OPTIONS.filter((o) => o.value !== "savings")
    : GROUP_OPTIONS;

  const current = GROUP_OPTIONS.find((o) => o.value === currentGroup) ?? GROUP_OPTIONS[0];

  const handlePress = () => {
    const idx = options.findIndex((o) => o.value === currentGroup);
    const next = options[(idx + 1) % options.length];
    soundManager.play("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next.value);
  };

  return (
    <Pressable onPress={handlePress} style={[s.chip, { borderColor: current.color }]}>
      <Feather
        name="refresh-cw"
        size={11}
        color={current.color}
        style={s.icon}
      />
      <TText variant="caption" fontWeight="500" color={current.color} fontSize={11}>
        {current.label}
      </TText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  icon: { marginRight: 4 },
});
