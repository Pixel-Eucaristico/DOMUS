import React from "react";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

interface KeyboardSafeViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Universal keyboard-safe wrapper using useKeyboardHandler.
 * Creates an animated spacer that grows/shrinks with the keyboard height.
 * Works on both Android and iOS regardless of softInputMode.
 */
export function KeyboardSafeView({ children, style }: KeyboardSafeViewProps) {
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
    height: keyboardHeight.value,
  }));

  return (
    <View style={[{ flex: 1 }, style]}>
      {children}
      <Reanimated.View style={spacerStyle} />
    </View>
  );
}
