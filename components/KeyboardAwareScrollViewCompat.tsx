// Componente único de rolagem de tela com campo (Epic 13, Story 13.2).
// Nativo: KeyboardAwareScrollView do keyboard-controller (KeyboardProvider na
// raiz). Web: ScrollView puro, sem as props de teclado.
import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

/** Folga entre o campo focado e o topo do teclado (bem acima dos 8 dp do FR-29). */
export const KEYBOARD_BOTTOM_OFFSET = 50;

/**
 * Folga no fim do conteúdo rolável. A tela soma `insets.bottom` quando não está
 * num `SafeAreaView` com a borda de baixo.
 */
export const SCROLL_BOTTOM_PADDING = 32;

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  bottomOffset = KEYBOARD_BOTTOM_OFFSET,
  ...props
}: Props) {
  if (Platform.OS === "web") {
    const {
      extraKeyboardSpace: _extraKeyboardSpace,
      disableScrollOnKeyboardHide: _disableScrollOnKeyboardHide,
      enabled: _enabled,
      ScrollViewComponent: _ScrollViewComponent,
      ...webProps
    } = props;
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...webProps}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      bottomOffset={bottomOffset}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
