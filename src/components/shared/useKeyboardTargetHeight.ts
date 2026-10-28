import { useState } from "react";
import { KeyboardController, useKeyboardHandler } from "react-native-keyboard-controller";
import { runOnJS } from "react-native-reanimated";
import { keyboardTargetHeight } from "@/src/components/shared/keyboardStickyOffset";

/**
 * Altura-alvo do teclado para as barras que sobem com ele (rodapé do
 * ParsedScreen e barra da chave da NF, Story 13.6 R2/R4). O `onStart` do
 * keyboard-controller já traz a altura final da animação, então o layout
 * (`offset.opened`, compacto, rodapé ligado) é decidido no começo da animação,
 * e não só no `keyboardDidShow` como o `useKeyboardState`. O `onEnd` confirma
 * (fechar pelo gesto, animação interrompida). A conta fica no
 * `keyboardTargetHeight`, do lado do JS: o worklet só repassa o número.
 */
export function useKeyboardTargetHeight(): number {
  const [height, setHeight] = useState(() => keyboardTargetHeight(KeyboardController.state()?.height ?? 0));
  const update = (eventHeight: number) => setHeight(keyboardTargetHeight(eventHeight));

  useKeyboardHandler(
    {
      onStart: (e) => {
        "worklet";
        runOnJS(update)(e.height);
      },
      onEnd: (e) => {
        "worklet";
        runOnJS(update)(e.height);
      },
    },
    [],
  );

  return height;
}
