import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardController, KeyboardEvents } from "react-native-keyboard-controller";
import { KeyboardSafeView } from "@/src/components/shared/KeyboardSafeView";
import {
  backdropPressAction,
  computeFocusScrollTarget,
  computeKeyboardSheetLayout,
  sheetKeyboardHeight,
  sheetLiftDiscount,
  SHEET_KEYBOARD_GAP,
  SHEET_TOP_GAP,
} from "@/src/components/shared/keyboardSheetLayout";

type ScrollWithInnerView = ScrollView & { getInnerViewRef?: () => View | null };

/** Espera o espaçador e o Yoga assentarem antes de medir o campo focado. */
const FOCUS_SCROLL_DELAY_MS = 60;

interface KeyboardSheetProps {
  /** Cabeçalho fixo (alça, título, fechar); se nem sem o rodapé sobrar espaço para o campo, entra na rolagem. */
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
  /**
   * Mostra o rodapé. `false` esconde o botão principal (ex.: "Adicionar à
   * lista" só aparece quando o formulário é válido). Padrão: `true`.
   */
  footerVisible?: boolean;
}

/**
 * Toque no fundo escuro de um modal com `KeyboardSheet` (Story 13.3, R1): com o
 * teclado aberto, o primeiro toque só fecha o teclado e mantém o que foi
 * digitado; com o teclado fechado (e na web, que não tem evento de teclado),
 * fecha o modal.
 */
export function useSheetBackdropPress(onClose: () => void): () => void {
  return useCallback(() => {
    if (backdropPressAction(KeyboardController.isVisible()) === "dismissKeyboard") Keyboard.dismiss();
    else onClose();
  }, [onClose]);
}

/**
 * Altura do teclado para a folha: 0 ao montar e, depois, a do último
 * `keyboardDidShow`/`keyboardDidHide`. Não lê o estado global do teclado na
 * montagem (pode ser de antes do modal abrir).
 */
function useSheetKeyboardHeight(): number {
  const [height, setHeight] = useState(() => sheetKeyboardHeight(null));
  useEffect(() => {
    const show = KeyboardEvents.addListener("keyboardDidShow", (e) =>
      setHeight(sheetKeyboardHeight({ type: "keyboardDidShow", height: e.height })),
    );
    const hide = KeyboardEvents.addListener("keyboardDidHide", (e) =>
      setHeight(sheetKeyboardHeight({ type: "keyboardDidHide", height: e.height })),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
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
  footerVisible = true,
}: KeyboardSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useSheetKeyboardHeight();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const sheetPaddingBottom = Math.max(insets.bottom, basePaddingBottom);
  const layout = computeKeyboardSheetLayout({
    windowHeight,
    keyboardHeight,
    insetTop: insets.top,
    sheetPaddingBottom,
    headerHeight,
    footerHeight: footerVisible ? footerHeight : 0,
    maxHeightRatio,
  });

  const scrollFocusedIntoView = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput?.();
    // getInnerViewRef existe no ScrollView do RN 0.81, mas falta nos tipos legados.
    const content = (scrollRef.current as ScrollWithInnerView | null)?.getInnerViewRef?.();
    const viewport = scrollRef.current?.getNativeScrollRef?.();
    if (!input || !content || !viewport) return;
    // Posição do campo no conteúdo desta rolagem. Falha (e não rola) quando o
    // campo não está dentro dela, como o de um modal aninhado.
    input.measureLayout(
      content,
      (_x, inputY, _w, inputHeight) => {
        content.measureInWindow((_cx, contentWindowY) => {
          viewport.measureInWindow((_vx, viewportWindowY, _vw, viewportHeight) => {
            const target = computeFocusScrollTarget({
              inputY,
              inputHeight,
              contentWindowY,
              viewportWindowY,
              viewportHeight,
              gap: SHEET_KEYBOARD_GAP,
            });
            if (target !== null) scrollRef.current?.scrollTo({ y: target, animated: true });
          });
        });
      },
      () => {},
    );
  }, []);

  // Fim da animação do teclado (keyboardDidShow) ou mudança de lugar do rodapé
  // ou do cabeçalho: leva o campo focado para a área visível, com folga. Trocar
  // de campo com o teclado aberto fica com o requestChildFocus nativo.
  useEffect(() => {
    if (keyboardHeight <= 0) return;
    const timer = setTimeout(scrollFocusedIntoView, FOCUS_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [keyboardHeight, layout.footerPinned, layout.headerPinned, scrollFocusedIntoView]);

  // Mede o cabeçalho só quando ele está fixo: dentro da rolagem a medida muda
  // (sem o paddingTop da folha) e faria o cabeçalho alternar de lugar.
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setHeaderHeight(y + height);
  };
  const onFooterLayout = (e: LayoutChangeEvent) => setFooterHeight(e.nativeEvent.layout.height);

  const footerNode = footerVisible ? (
    <View style={s.footer} onLayout={onFooterLayout}>
      {footer}
    </View>
  ) : null;

  return (
    <KeyboardSafeView
      style={[s.root, { paddingTop: insets.top + SHEET_TOP_GAP }]}
      liftDiscount={sheetLiftDiscount(sheetPaddingBottom)}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          sheetStyle,
          s.sheet,
          { maxHeight: maxHeightRatio * windowHeight, paddingBottom: sheetPaddingBottom },
        ]}
      >
        {layout.headerPinned && <View onLayout={onHeaderLayout}>{header}</View>}
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!layout.headerPinned && <View>{header}</View>}
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
