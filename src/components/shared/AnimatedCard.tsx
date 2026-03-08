import React from "react";
import { View, ViewStyle, StyleProp, Platform } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useDemoMode } from "@/src/context/DemoModeProvider";

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
  const { isDemoActive } = useDemoMode();

  // Stagger effect if index is provided
  const finalDelay = delay || (index * 100);

  // No Web, a propriedade 'transform' do reanimated cria um Stacking Context em volta 
  // do Cartão. O zIndex 9999 da página Início (Tour) não consegue transcender.
  // Pra driblar, o Reanimated deve virar View comum no modo Web se houver Tour.
  if (Platform.OS === "web" && isDemoActive) {
    return (
      <View style={style}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View 
      entering={FadeInUp.delay(finalDelay).springify().damping(25).stiffness(120)}
      exiting={FadeOutDown}
      style={style}
    >
      {children}
    </Animated.View>
  );
};
