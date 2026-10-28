import React from "react";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { keyboardLift } from "@/src/components/shared/keyboardSheetLayout";

interface KeyboardSafeViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Quanto descontar da altura do teclado no espaçador (Story 13.3). O
   * KeyboardSheet passa o `paddingBottom` da folha menos a folga, para não
   * sobrar a faixa de `insets.bottom` entre a folha e o teclado. Sem a prop, o
   * espaçador tem a altura do teclado.
   */
  liftDiscount?: number;
  pointerEvents?: ViewProps["pointerEvents"];
}

/**
 * Universal keyboard-safe wrapper using useKeyboardHandler.
 * Creates an animated spacer that grows/shrinks with the keyboard height.
 * Works on both Android and iOS regardless of softInputMode.
 */
export function KeyboardSafeView({ children, style, liftDiscount = 0, pointerEvents }: KeyboardSafeViewProps) {
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        keyboardHeight.value = Math.max(e.height, 0);
      },
      onEnd: (e) => {
        "worklet";
        keyboardHeight.value = Math.max(e.height, 0);
      },
    },
    [],
  );

  const spacerStyle = useAnimatedStyle(() => ({
    height: keyboardLift(keyboardHeight.value, liftDiscount),
  }));

  return (
    <View style={[{ flex: 1 }, style]} pointerEvents={pointerEvents}>
      {children}
      <Reanimated.View style={spacerStyle} pointerEvents="none" />
    </View>
  );
}
