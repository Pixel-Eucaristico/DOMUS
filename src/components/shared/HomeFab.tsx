import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TourGuideZone } from "rn-tourguide";

interface HomeFabProps {
  bottom: number;
  primaryColor: string;
  disabled?: boolean;
  onPress: () => void;
}

export function HomeFab({ bottom, primaryColor, disabled = false, onPress }: HomeFabProps) {
  return (
    <View style={[s.container, { bottom }]}>
      <TourGuideZone zone={3} text="4" isTourGuide borderRadius={40} maskOffset={0} tooltipBottomOffset={80}>
        <Pressable
          collapsable={false}
          style={({ pressed }) => [s.button, { backgroundColor: primaryColor }, pressed && s.pressed]}
          onPress={disabled ? undefined : onPress}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </Pressable>
      </TourGuideZone>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    right: 24,
    alignItems: "flex-end",
    zIndex: 1,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
