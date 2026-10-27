// Padrões do componente único de rolagem de tela com campo (Epic 13, Story 13.2).
// Sem `react-native` aqui, para dar para testar no vitest.

/** Folga entre o campo focado e o topo do teclado (bem acima dos 8 dp do FR-29). */
export const KEYBOARD_BOTTOM_OFFSET = 50;

/**
 * Folga no fim do conteúdo rolável. A tela soma `insets.bottom` quando não está
 * num `SafeAreaView` com a borda de baixo.
 */
export const SCROLL_BOTTOM_PADDING = 32;

/** Props que só o KeyboardAwareScrollView entende; não chegam ao ScrollView da web. */
export const KEYBOARD_ONLY_PROPS = [
  "bottomOffset",
  "extraKeyboardSpace",
  "disableScrollOnKeyboardHide",
  "enabled",
  "ScrollViewComponent",
] as const;

type KeyboardOnlyProp = (typeof KEYBOARD_ONLY_PROPS)[number];

interface KeyboardDefaultsInput {
  bottomOffset?: number;
  keyboardShouldPersistTaps?: boolean | "always" | "never" | "handled";
}

/**
 * Props finais do componente. Nativo: aplica os padrões (`bottomOffset` também
 * quando vem `undefined` explícito). Web: tira as props do teclado.
 */
export function withKeyboardScrollDefaults<P extends KeyboardDefaultsInput>(
  props: P,
  platform: string,
): P | Omit<P, KeyboardOnlyProp> {
  const keyboardShouldPersistTaps = props.keyboardShouldPersistTaps ?? "handled";
  if (platform === "web") {
    const webProps: Record<string, unknown> = { ...(props as Record<string, unknown>), keyboardShouldPersistTaps };
    for (const key of KEYBOARD_ONLY_PROPS) delete webProps[key];
    return webProps as unknown as Omit<P, KeyboardOnlyProp>;
  }
  return {
    ...props,
    keyboardShouldPersistTaps,
    bottomOffset: props.bottomOffset ?? KEYBOARD_BOTTOM_OFFSET,
  };
}
