// Componente único de rolagem de tela com campo (Epic 13, Story 13.2).
// Nativo: KeyboardAwareScrollView do keyboard-controller (KeyboardProvider na
// raiz). Web: ScrollView puro, sem as props de teclado.
import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { withKeyboardScrollDefaults } from "./keyboardScrollDefaults";

export { KEYBOARD_BOTTOM_OFFSET, SCROLL_BOTTOM_PADDING } from "./keyboardScrollDefaults";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({ children, ...props }: Props) {
  if (Platform.OS === "web") {
    return <ScrollView {...withKeyboardScrollDefaults(props, "web")}>{children}</ScrollView>;
  }
  return (
    <KeyboardAwareScrollView {...withKeyboardScrollDefaults(props, Platform.OS)}>
      {children}
    </KeyboardAwareScrollView>
  );
}
