import React from "react";
import { Pressable, StyleProp, ViewStyle, Platform } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence,
  withTiming 
} from "react-native-reanimated";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { soundManager, SoundEffect } from "@/src/services/SoundManager";
import * as Haptics from "expo-haptics";

interface AnimatedIconButtonProps {
  name: string;
  iconSet?: "Feather" | "MaterialCommunityIcons";
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  sound?: SoundEffect;
  haptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({
  name,
  iconSet = "Feather",
  size = 24,
  color,
  onPress,
  style,
  sound = "tap",
  haptic = true,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Animation
    scale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    // Haptics
    if (haptic && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Sound
    if (sound) {
      soundManager.play(sound).catch(() => {});
    }

    // Callback
    onPress?.();
  };

  const IconComponent = iconSet === "MaterialCommunityIcons" ? MaterialCommunityIcons : Feather;

  return (
    <AnimatedPressable 
      onPress={handlePress} 
      style={[style, animatedStyle]}
    >
      <IconComponent name={name as any} size={size} color={color} />
    </AnimatedPressable>
  );
};
