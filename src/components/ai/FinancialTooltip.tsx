import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from "react-native";
import { TCard } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { FINANCIAL_GLOSSARY } from "@/src/constants/financialGlossary";

interface FinancialTooltipProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

/** Educational financial term definitions */
export const FINANCIAL_TOOLTIPS = FINANCIAL_GLOSSARY;

export function FinancialTooltip({ visible, title, content, onClose }: FinancialTooltipProps) {
  const { theme } = useAppState();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <TCard padding={20} gap={10} maxWidth={340} width="100%" backgroundColor={theme.cardBackground} borderColor={theme.border}>
          <View style={styles.header}>
            <Feather name="info" size={16} color={theme.primaryColor} />
            <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fechar">
              <Feather name="x" size={16} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.content, { color: theme.secondaryText }]}>{content}</Text>
        </TCard>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
});
