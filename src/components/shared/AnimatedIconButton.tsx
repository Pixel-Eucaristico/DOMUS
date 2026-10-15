import React, { useEffect } from "react";
import { Pressable, StyleProp, ViewStyle, Platform } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence,
  withRepeat,
  withTiming,
  Easing,
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
  isLoading?: boolean;
  active?: boolean;
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
  isLoading = false,
  active = false,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1
      );
      opacity.value = withRepeat(
        withTiming(0.6, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      rotation.value = withTiming(0);
      opacity.value = withTiming(1);
    }
  }, [isLoading, opacity, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    if (isLoading) return;

    scale.value = withSequence(
      withSpring(0.85, { damping: 25, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 150 })
    );

    if (haptic && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (sound) {
      soundManager.play(sound).catch(() => {});
    }

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
