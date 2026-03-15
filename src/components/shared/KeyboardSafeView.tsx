import React from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

interface KeyboardSafeViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra offset to add above the keyboard (default: 0) */
  keyboardVerticalOffset?: number;
}

/**
 * Keyboard-safe wrapper for screens WITHOUT ScrollView (e.g. Modals with fixed layout).
 * For screens WITH ScrollView, use KeyboardAwareScrollView from react-native-keyboard-controller directly.
 */
export function KeyboardSafeView({
  children,
  style,
  keyboardVerticalOffset = 0,
}: KeyboardSafeViewProps) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
