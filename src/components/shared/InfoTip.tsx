import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
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

const BUBBLE_MAX_WIDTH = 300;
const MARGIN = 12;
const ARROW = 8;
/** Altura estimada do balão para decidir se abre acima ou abaixo do ícone */
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

  const entry = term ? FINANCIAL_GLOSSARY[term] : null;
  const tipTitle = title ?? entry?.title ?? "";
  const tipContent = content ?? entry?.content ?? "";

  const open = useCallback(() => {
    soundManager.play("tap");
    iconRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  if (!tipContent) return null;

  const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, screenW - MARGIN * 2);
  let placement: { top?: number; bottom?: number; left: number; arrowLeft: number; above: boolean } | null = null;
  if (anchor) {
    const centerX = anchor.x + anchor.width / 2;
    const left = Math.min(Math.max(centerX - bubbleWidth / 2, MARGIN), screenW - bubbleWidth - MARGIN);
    const above = anchor.y + anchor.height + ARROW + ESTIMATED_HEIGHT > screenH - MARGIN;
    placement = {
      left,
      arrowLeft: Math.min(Math.max(centerX - left - ARROW, 12), bubbleWidth - 12 - ARROW * 2),
      above,
      ...(above
        ? { bottom: screenH - anchor.y + ARROW }
        : { top: anchor.y + anchor.height + ARROW }),
    };
  }

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

      <Modal transparent visible={!!anchor} animationType="fade" onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar dica">
          {placement && (
            <View
              style={[
                s.bubble,
                {
                  width: bubbleWidth,
                  left: placement.left,
                  top: placement.top,
                  bottom: placement.bottom,
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
              {!!tipTitle && <Text style={[s.title, { color: theme.textColor }]}>{tipTitle}</Text>}
              <Text style={[s.content, { color: theme.secondaryText }]}>{tipContent}</Text>
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
    width: ARROW * 2,
    height: ARROW * 2,
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
  arrowUp: { top: -ARROW - 1, transform: [{ rotate: "45deg" }] },
  arrowDown: { bottom: -ARROW - 1, transform: [{ rotate: "225deg" }] },
  title: { fontSize: 15, fontWeight: "700" },
  content: { fontSize: 13, lineHeight: 19 },
});
