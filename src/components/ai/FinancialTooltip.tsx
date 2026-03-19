import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from "react-native";
import { TCard } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";

interface FinancialTooltipProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

/** Educational financial term definitions */
export const FINANCIAL_TOOLTIPS: Record<string, { title: string; content: string }> = {
  "50/30/20": {
    title: "Regra 50/30/20",
    content:
      "Divida sua renda em: 50% para necessidades (moradia, alimentacao, transporte), 30% para desejos (lazer, compras) e 20% para poupanca e investimentos.",
  },
  "taxa_selic": {
    title: "Taxa Selic",
    content:
      "A taxa basica de juros da economia brasileira, definida pelo COPOM. Ela influencia todas as outras taxas de juros do mercado.",
  },
  "reserva_emergencia": {
    title: "Reserva de Emergencia",
    content:
      "Fundo equivalente a 3-6 meses de despesas mensais, mantido em investimentos de alta liquidez para imprevistos.",
  },
  "juros_compostos": {
    title: "Juros Compostos",
    content:
      "Juros que incidem sobre o capital inicial mais os juros acumulados. E o principal mecanismo de crescimento patrimonial de longo prazo.",
  },
  "diversificacao": {
    title: "Diversificacao",
    content:
      "Estrategia de distribuir investimentos entre diferentes ativos para reduzir riscos. Nao colocar todos os ovos na mesma cesta.",
  },
};

export function FinancialTooltip({ visible, title, content, onClose }: FinancialTooltipProps) {
  const { theme } = useAppState();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <TCard padding={20} gap={10} maxWidth={340} width="100%" backgroundColor={theme.cardBackground} borderColor={theme.border}>
          <View style={styles.header}>
            <Feather name="info" size={16} color={theme.primaryColor} />
            <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
