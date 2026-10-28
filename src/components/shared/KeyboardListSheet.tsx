import React, { useEffect, useState } from "react";
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
  listSheetHeaderHeight,
  listSheetSlots,
  sheetLiftDiscount,
  sheetPaddingBottomFor,
  sheetRootPadding,
} from "@/src/components/shared/keyboardSheetLayout";

type ReanimatedViewProps = React.ComponentProps<typeof Reanimated.View>;

interface KeyboardListSheetProps {
  /**
   * Parte de cima sem campo (alça, título, fechar, abas). Recolhe em janela
   * baixa com o teclado aberto, quando a lista ficaria com menos de uma linha
   * (R-1). Nunca põe campo aqui: ele sumiria ao recolher.
   */
  title: ReactNode;
  /**
   * A busca (e o que a acompanha, como a contagem). Sempre renderizada, na
   * mesma posição da árvore: o campo é a mesma instância com o título à mostra
   * ou recolhido, então o teclado não fecha (R1 da revisão da 13.4).
   */
  search: ReactNode;
  /**
   * A lista do chamador: um único elemento rolável vertical (`FlashList`,
   * `FlatList` ou `ScrollView`) com `keyboardShouldPersistTaps="handled"`. É a
   * parte que encolhe.
   */
  list: ReactNode;
  /** Estilo da folha (cor, cantos, padding). Sem `paddingBottom`. */
  sheetStyle?: ReanimatedViewProps["style"];
  /**
   * Altura máxima da folha como fração da janela (0,75, 0,80). Abaixo dela, a
   * folha tem a altura do conteúdo (filtrar encolhe a folha, R-5).
   */
  maxHeightRatio?: number;
  /** Altura fixa da folha como fração da janela (0,85 no DebugTools); encolhe com o teclado. */
  heightRatio?: number;
  /** paddingBottom mínimo da folha; vale `max(insets.bottom, base)`. */
  basePaddingBottom: number;
  /**
   * Muda quando o título muda de altura sem estar à mostra (ex.: a aba do
   * DebugTools): descarta a medida antiga do título para medir de novo (R5).
   */
  measureKey?: string | number;
  /** Animação de entrada da folha (Reanimated), ex.: `SlideInDown`. */
  entering?: ReanimatedViewProps["entering"];
  /** Animação de saída da folha (Reanimated), ex.: `SlideOutDown`. */
  exiting?: ReanimatedViewProps["exiting"];
}

/**
 * Folha de busca em lista dentro de `Modal` (Story 13.4, D-1 a). O modal
 * continua dono do `<Modal>`, do fundo escuro, do `onRequestClose` e da
 * animação do modal; aqui ficam o título, a busca fixa e a lista que encolhe
 * acima do teclado. A folha sobe pelo espaçador do KeyboardSafeView (único
 * sistema de teclado: o KeyboardProvider da raiz), como o KeyboardSheet. Sem
 * rolagem própria nem ajuste até o campo: o campo está na busca, que nunca
 * rola. As contas ficam em keyboardSheetLayout.ts.
 */
export function KeyboardListSheet({
  title,
  search,
  list,
  sheetStyle,
  maxHeightRatio = 0.8,
  heightRatio,
  basePaddingBottom,
  measureKey,
  entering,
  exiting,
}: KeyboardListSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useSheetKeyboardHeight();
  const [titleHeight, setTitleHeight] = useState(0);
  const [searchBottom, setSearchBottom] = useState(0);
  const [titleCollapsed, setTitleCollapsed] = useState(false);

  // Título de outra altura (outra aba): mede de novo a partir do zero (R5).
  useEffect(() => {
    setTitleHeight(0);
  }, [measureKey]);

  const ratio = heightRatio ?? maxHeightRatio;
  const sheetPaddingBottom = sheetPaddingBottomFor(insets.bottom, basePaddingBottom);
  const rootPadding = sheetRootPadding(insets.top);
  const layout = computeKeyboardListSheetLayout({
    windowHeight,
    keyboardHeight,
    insetTop: insets.top,
    sheetPaddingBottom,
    headerHeight: listSheetHeaderHeight(searchBottom, titleHeight, titleCollapsed),
    maxHeightRatio: ratio,
  });
  // As medidas abaixo dependem de o título estar à mostra; guarda o estado em
  // que foram feitas.
  if (layout.titleCollapsed !== titleCollapsed) setTitleCollapsed(layout.titleCollapsed);

  const onTitleLayout = (e: LayoutChangeEvent) => setTitleHeight(e.nativeEvent.layout.height);
  const onSearchLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setSearchBottom(y + height);
  };

  const slots = {
    title: (
      <View key="title" onLayout={onTitleLayout}>
        {title}
      </View>
    ),
    search: (
      <View key="search" onLayout={onSearchLayout}>
        {search}
      </View>
    ),
    list: (
      <View key="list" style={[s.list, heightRatio !== undefined && s.listFill]}>
        {list}
      </View>
    ),
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
        {listSheetSlots(titleCollapsed).map((slot) => (slot ? slots[slot] : null))}
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
