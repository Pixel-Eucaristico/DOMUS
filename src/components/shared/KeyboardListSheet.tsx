import React, { useState } from "react";
import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
import { useSheetKeyboardHeight } from "@/src/components/shared/KeyboardSheet";
import {
  computeKeyboardListSheetLayout,
  sheetLiftDiscount,
  sheetPaddingBottomFor,
  sheetRootPadding,
} from "@/src/components/shared/keyboardSheetLayout";

type ReanimatedViewProps = React.ComponentProps<typeof Reanimated.View>;

interface KeyboardListSheetProps {
  /** Cabeçalho completo (alça, título, fechar e a busca). Sempre fixo, nunca rola. */
  header: ReactNode;
  /**
   * Cabeçalho de janela baixa (só a busca e o indispensável): entra no lugar
   * do completo quando, com o teclado aberto, a lista ficaria com menos de uma
   * linha (R-1).
   */
  compactHeader: ReactNode;
  /**
   * A lista do chamador: um único elemento rolável vertical (`FlashList`,
   * `FlatList` ou `ScrollView`) com `keyboardShouldPersistTaps="handled"`. É a
   * parte que encolhe.
   */
  list: ReactNode;
  /** Estilo da folha (cor, cantos, padding). Sem `paddingBottom`. */
  sheetStyle?: ReanimatedViewProps["style"];
  /** Altura máxima da folha como fração da janela (0,75, 0,80). A folha segue o conteúdo. */
  maxHeightRatio?: number;
  /** Altura fixa da folha como fração da janela (0,85 no DebugTools); encolhe com o teclado. */
  heightRatio?: number;
  /** paddingBottom mínimo da folha; vale `max(insets.bottom, base)`. */
  basePaddingBottom: number;
  /** Animação de entrada da folha (Reanimated), ex.: `SlideInDown`. */
  entering?: ReanimatedViewProps["entering"];
  /** Animação de saída da folha (Reanimated), ex.: `SlideOutDown`. */
  exiting?: ReanimatedViewProps["exiting"];
}

/**
 * Folha de busca em lista dentro de `Modal` (Story 13.4, D-1 a). O modal
 * continua dono do `<Modal>`, do fundo escuro, do `onRequestClose` e da
 * animação do modal; aqui ficam o cabeçalho fixo com a busca e a lista que
 * encolhe acima do teclado. A folha sobe pelo espaçador do KeyboardSafeView
 * (único sistema de teclado: o KeyboardProvider da raiz), como o
 * KeyboardSheet. Sem rolagem própria nem ajuste até o campo: o campo está no
 * cabeçalho e nunca rola. As contas ficam em keyboardSheetLayout.ts.
 */
export function KeyboardListSheet({
  header,
  compactHeader,
  list,
  sheetStyle,
  maxHeightRatio = 0.8,
  heightRatio,
  basePaddingBottom,
  entering,
  exiting,
}: KeyboardListSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useSheetKeyboardHeight();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [compactHeaderHeight, setCompactHeaderHeight] = useState(0);

  const ratio = heightRatio ?? maxHeightRatio;
  const sheetPaddingBottom = sheetPaddingBottomFor(insets.bottom, basePaddingBottom);
  const rootPadding = sheetRootPadding(insets.top);
  const layout = computeKeyboardListSheetLayout({
    windowHeight,
    keyboardHeight,
    insetTop: insets.top,
    sheetPaddingBottom,
    headerHeight,
    compactHeaderHeight,
    maxHeightRatio: ratio,
  });

  // Mede cada cabeçalho só quando ele está na tela; a troca usa a medida do
  // completo (a última), então não alterna.
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setHeaderHeight(y + height);
  };
  const onCompactHeaderLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setCompactHeaderHeight(y + height);
  };

  const size = heightRatio !== undefined ? { height: heightRatio * windowHeight } : { maxHeight: ratio * windowHeight };

  return (
    <KeyboardSafeView
      style={[s.root, { paddingTop: rootPadding.top }]}
      liftDiscount={sheetLiftDiscount(sheetPaddingBottom)}
      pointerEvents="box-none"
    >
      <Reanimated.View
        entering={entering}
        exiting={exiting}
        style={[sheetStyle, s.sheet, size, { paddingBottom: sheetPaddingBottom }]}
      >
        {layout.headerCompact ? (
          <View onLayout={onCompactHeaderLayout}>{compactHeader}</View>
        ) : (
          <View onLayout={onHeaderLayout}>{header}</View>
        )}
        <View style={[s.list, heightRatio !== undefined && s.listFill]}>{list}</View>
      </Reanimated.View>
    </KeyboardSafeView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: { flexShrink: 1, minHeight: 0 },
  list: { flexShrink: 1, minHeight: 0 },
  // Folha de altura fixa: a lista ocupa o resto (como o `flex: 1` de antes).
  listFill: { flexGrow: 1 },
});
