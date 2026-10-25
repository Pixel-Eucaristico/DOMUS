import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { TCard } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";

interface ChatActionMenuProps {
  onAction: (action: ChatAction) => void;
  visionOCREnabled?: boolean;
}

export type ChatAction =
  | "scan_invoice"
  | "scan_payslip"
  | "monthly_summary"
  | "classify_transactions"
  | "budget_check"
  | "savings_tips";

interface ActionItem {
  id: ChatAction;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle: string;
  color: string;
  requiresVision?: boolean;
}

const ACTIONS: ActionItem[] = [
  {
    id: "scan_invoice",
    icon: "camera",
    label: "Escanear Nota Fiscal",
    subtitle: "Leitura automática via IA Vision",
    color: "#4CAF50",
    requiresVision: true,
  },
  {
    id: "scan_payslip",
    icon: "file-text",
    label: "Escanear Holerite",
    subtitle: "Extrair dados do contracheque",
    color: "#2196F3",
    requiresVision: true,
  },
  {
    id: "monthly_summary",
    icon: "bar-chart-2",
    label: "Resumo Mensal",
    subtitle: "Análise completa do mês atual",
    color: "#FF9800",
  },
  {
    id: "classify_transactions",
    icon: "tag",
    label: "Classificar Transações",
    subtitle: "IA categoriza seus gastos recentes",
    color: "#9C27B0",
  },
  {
    id: "budget_check",
    icon: "dollar-sign",
    label: "Verificar Orçamento",
    subtitle: "Como estou em relação ao meu orçamento",
    color: "#00BCD4",
  },
  {
    id: "savings_tips",
    icon: "trending-down",
    label: "Onde Economizar",
    subtitle: "Identifique gastos para cortar",
    color: "#F44336",
  },
];

export function ChatActionMenu({ onAction, visionOCREnabled }: ChatActionMenuProps) {
  const { theme } = useAppState();
  const [visible, setVisible] = useState(false);

  const filteredActions = ACTIONS.filter(
    (a) => !a.requiresVision || visionOCREnabled,
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => { soundManager.play("tap"); setVisible(true); }}
        style={[styles.triggerBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={20} color={theme.primaryColor} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <TCard borderTopLeftRadius={20} borderTopRightRadius={20} borderBottomLeftRadius={0} borderBottomRightRadius={0} padding={20} paddingBottom={36} gap={16} backgroundColor={theme.cardBackground} borderColor={theme.border}>
            {/* Handle bar */}
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />

            <Text style={[styles.sheetTitle, { color: theme.textColor }]}>
              Acoes rapidas
            </Text>

            <View style={styles.actionsGrid}>
              {filteredActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionItem, { backgroundColor: `${action.color}10`, borderColor: `${action.color}30` }]}
                  onPress={() => {
                    soundManager.play("pop");
                    setVisible(false);
                    onAction(action.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                    <Feather name={action.icon} size={20} color={action.color} />
                  </View>
                  <Text style={[styles.actionLabel, { color: theme.textColor }]} numberOfLines={1}>
                    {action.label}
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: theme.secondaryText }]} numberOfLines={2}>
                    {action.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TCard>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionItem: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
});
