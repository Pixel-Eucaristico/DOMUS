import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { FINANCIAL_GLOSSARY, type GlossaryTerm } from "@/src/constants/financialGlossary";
import { computeTipPlacement, TIP_ARROW } from "./infoTipPlacement";

interface InfoTipProps {
  /** Termo do glossário financeiro */
  term?: GlossaryTerm;
  /** Ou título/conteúdo livres */
  title?: string;
  content?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Estimativa usada só até o balão ser medido */
const ESTIMATED_HEIGHT = 140;

/**
 * Ícone "i" que abre um balão ancorado explicando um termo.
 * Posiciona-se abaixo do ícone, ou acima quando não há espaço na tela.
 */
export function InfoTip({ term, title, content, size = 14, style }: InfoTipProps) {
  const { theme } = useAppState();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const iconRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState<number | null>(null);

  const entry = term ? FINANCIAL_GLOSSARY[term] : null;
  const tipTitle = title ?? entry?.title ?? "";
  const tipContent = content ?? entry?.content ?? "";

  const open = useCallback(() => {
    soundManager.play("tap");
    iconRef.current?.measureInWindow((x, y, width, height) => {
      setBubbleHeight(null);
      setAnchor({ x, y, width, height });
    });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  if (!tipContent) return null;

  const placement = anchor
    ? computeTipPlacement(anchor, screenW, screenH, bubbleHeight ?? ESTIMATED_HEIGHT)
    : null;

  return (
    <>
      <Pressable
        ref={iconRef}
        onPress={open}
        hitSlop={10}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={`O que é ${tipTitle}?`}
      >
        <Feather name="info" size={size} color={theme.secondaryText} />
      </Pressable>

      {/* Translúcido sobre as barras do sistema: as coordenadas de measureInWindow valem no modal */}
      <Modal
        transparent
        visible={!!anchor}
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar dica">
          {placement && (
            <View
              // Tocar no balão não fecha; só o toque fora dele
              onStartShouldSetResponder={() => true}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (bubbleHeight === null) setBubbleHeight(h);
              }}
              accessible
              accessibilityViewIsModal
              accessibilityLiveRegion="polite"
              accessibilityLabel={tipTitle ? `${tipTitle}. ${tipContent}` : tipContent}
              style={[
                s.bubble,
                {
                  width: placement.width,
                  left: placement.left,
                  top: placement.top,
                  bottom: placement.bottom,
                  maxHeight: placement.maxHeight,
                  // Invisível até medir, para não piscar no lado errado
                  opacity: bubbleHeight === null ? 0 : 1,
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  s.arrow,
                  placement.above ? s.arrowDown : s.arrowUp,
                  { left: placement.arrowLeft, backgroundColor: theme.cardBackground, borderColor: theme.border },
                ]}
              />
              <ScrollView bounces={false}>
                {!!tipTitle && <Text style={[s.title, { color: theme.textColor }]}>{tipTitle}</Text>}
                <Text style={[s.content, { color: theme.secondaryText }]}>{tipContent}</Text>
              </ScrollView>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bubble: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  arrow: {
    position: "absolute",
    width: TIP_ARROW * 2,
    height: TIP_ARROW * 2,
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
  arrowUp: { top: -TIP_ARROW - 1, transform: [{ rotate: "45deg" }] },
  arrowDown: { bottom: -TIP_ARROW - 1, transform: [{ rotate: "225deg" }] },
  title: { fontSize: 15, fontWeight: "700" },
  content: { fontSize: 13, lineHeight: 19 },
});
