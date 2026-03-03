import React from "react";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { ViewStyle, StyleProp } from "react-native";

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  index?: number;
}

/**
 * A card component that automatically animates in with a slide and fade effect.
 * Perfect for lists or dashboard widgets.
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  style, 
  delay = 0,
  index = 0
}) => {
  // Stagger effect if index is provided
  const finalDelay = delay || (index * 100);

  return (
    <Animated.View 
      entering={FadeInUp.delay(finalDelay).springify().damping(15)}
      exiting={FadeOutDown}
      style={style}
    >
      {children}
    </Animated.View>
  );
};
