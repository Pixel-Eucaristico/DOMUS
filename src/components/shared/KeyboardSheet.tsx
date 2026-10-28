import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardState } from "react-native-keyboard-controller";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
import {
  computeFocusScrollDelta,
  computeKeyboardSheetLayout,
  SHEET_KEYBOARD_GAP,
  SHEET_TOP_GAP,
} from "@/src/components/shared/keyboardSheetLayout";

/** Espera o espaçador e o Yoga assentarem antes de medir o campo focado. */
const FOCUS_SCROLL_DELAY_MS = 60;

interface KeyboardSheetProps {
  /** Cabeçalho fixo (alça, título, fechar). */
  header: ReactNode;
  /** Campos do formulário, dentro da rolagem. */
  children: ReactNode;
  /** Botão principal: fixo logo acima do teclado ou, em janela baixa, no fim da rolagem (D-3). */
  footer: ReactNode;
  /** Estilo da folha (cor, cantos, padding, `translateY` do Animated do RN). Sem `paddingBottom`. */
  sheetStyle?: React.ComponentProps<typeof Animated.View>["style"];
  /** Altura máxima da folha como fração da janela (0,85, 0,90, 0,92). */
  maxHeightRatio?: number;
  /** paddingBottom mínimo da folha; vale `max(insets.bottom, base)`. */
  basePaddingBottom: number;
  /** Estilo do conteúdo da rolagem. */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Folha com formulário dentro de `Modal` (Story 13.3). O modal continua dono
 * do `<Modal>`, do fundo escuro e da animação; aqui ficam o cabeçalho fixo, a
 * rolagem que encolhe, o rodapé logo acima do teclado e o ajuste da rolagem
 * até o campo focado. A folha sobe pelo espaçador do KeyboardSafeView (único
 * sistema de teclado: o KeyboardProvider da raiz). Nada de
 * KeyboardAwareScrollView aqui dentro, para não compensar o teclado duas vezes.
 * As contas ficam em keyboardSheetLayout.ts.
 */
export function KeyboardSheet({
  header,
  children,
  footer,
  sheetStyle,
  maxHeightRatio = 0.9,
  basePaddingBottom,
  contentContainerStyle,
}: KeyboardSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardState((state) => state.height);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);

  const sheetPaddingBottom = Math.max(insets.bottom, basePaddingBottom);
  const layout = computeKeyboardSheetLayout({
    windowHeight,
    keyboardHeight,
    insetTop: insets.top,
    sheetPaddingBottom,
    headerHeight,
    footerHeight,
    maxHeightRatio,
  });

  const scrollFocusedIntoView = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput?.();
    const scroll = scrollRef.current?.getNativeScrollRef?.();
    if (!input || !scroll) return;
    scroll.measureInWindow((sx, sy, sw, sh) => {
      input.measureInWindow((ix, iy, _iw, ih) => {
        // Só campos desta rolagem (um campo de modal aninhado fica de fora).
        const contentTop = sy - scrollY.current;
        const insideX = ix >= sx - 1 && ix <= sx + sw;
        const insideY = iy >= contentTop - 1 && iy + ih <= contentTop + contentHeight.current + 1;
        if (!insideX || !insideY) return;
        const delta = computeFocusScrollDelta({
          inputTop: iy,
          inputBottom: iy + ih,
          viewportTop: sy,
          viewportBottom: sy + sh,
          gap: SHEET_KEYBOARD_GAP,
        });
        if (delta !== 0) {
          scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
        }
      });
    });
  }, []);

  // Fim da animação do teclado (keyboardDidShow) ou mudança de lugar do rodapé:
  // leva o campo focado para a área visível, com folga. Trocar de campo com o
  // teclado aberto fica com o requestChildFocus nativo do ScrollView.
  useEffect(() => {
    if (keyboardHeight <= 0) return;
    const timer = setTimeout(scrollFocusedIntoView, FOCUS_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [keyboardHeight, layout.footerPinned, scrollFocusedIntoView]);

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setHeaderHeight(y + height);
  };
  const onFooterLayout = (e: LayoutChangeEvent) => setFooterHeight(e.nativeEvent.layout.height);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  };

  const footerNode = (
    <View style={s.footer} onLayout={onFooterLayout}>
      {footer}
    </View>
  );

  return (
    <KeyboardSafeView
      style={[s.root, { paddingTop: insets.top + SHEET_TOP_GAP }]}
      liftDiscount={sheetPaddingBottom - SHEET_KEYBOARD_GAP}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          sheetStyle,
          s.sheet,
          { maxHeight: maxHeightRatio * windowHeight, paddingBottom: sheetPaddingBottom },
        ]}
      >
        <View onLayout={onHeaderLayout}>{header}</View>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onContentSizeChange={(_w, h) => {
            contentHeight.current = h;
          }}
        >
          {children}
          {!layout.footerPinned && footerNode}
        </ScrollView>
        {layout.footerPinned && footerNode}
      </Animated.View>
    </KeyboardSafeView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: { flexShrink: 1, minHeight: 0 },
  scroll: { flexShrink: 1 },
  footer: { paddingTop: 12 },
});
