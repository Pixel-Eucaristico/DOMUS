import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";

interface QuickSuggestionsProps {
  onSelect: (text: string) => void;
  hasMessages: boolean;
}

interface Suggestion {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  prompt: string;
  color: string;
}

const INITIAL_SUGGESTIONS: Suggestion[] = [
  {
    icon: "pie-chart",
    label: "Resumo do mes",
    prompt: "Faca um resumo financeiro do meu mes atual com as principais categorias de gastos",
    color: "#4CAF50",
  },
  {
    icon: "trending-up",
    label: "Dica de economia",
    prompt: "Me de uma dica pratica para economizar este mes baseado nos meus gastos",
    color: "#2196F3",
  },
  {
    icon: "shield",
    label: "Reserva de emergencia",
    prompt: "Como esta minha reserva de emergencia? Estou no caminho certo?",
    color: "#FF9800",
  },
  {
    icon: "target",
    label: "Metas financeiras",
    prompt: "Analise meus habitos e sugira metas financeiras realistas para os proximos 3 meses",
    color: "#9C27B0",
  },
];

const QUICK_ACTIONS: Suggestion[] = [
  {
    icon: "shopping-cart",
    label: "Comprar ou esperar?",
    prompt: "Estou pensando em comprar algo. Me ajude a decidir se vale a pena agora ou se devo esperar.",
    color: "#E91E63",
  },
  {
    icon: "credit-card",
    label: "Classificar gastos",
    prompt: "Classifique minhas transacoes recentes nas categorias corretas",
    color: "#00BCD4",
  },
  {
    icon: "bar-chart-2",
    label: "Regra 50/30/20",
    prompt: "Analise meus gastos e me diga como estou em relacao a regra 50/30/20",
    color: "#FF5722",
  },
  {
    icon: "alert-triangle",
    label: "Gastos excessivos",
    prompt: "Identifique onde estou gastando mais do que deveria e sugira cortes",
    color: "#F44336",
  },
];

export function QuickSuggestions({ onSelect, hasMessages }: QuickSuggestionsProps) {
  const { theme } = useAppState();

  const suggestions = hasMessages ? QUICK_ACTIONS : INITIAL_SUGGESTIONS;

  return (
    <View style={styles.container}>
      {!hasMessages && (
        <Text style={[styles.title, { color: theme.secondaryText }]}>
          Como posso ajudar?
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.chip, { backgroundColor: `${s.color}15`, borderColor: `${s.color}40` }]}
            onPress={() => { soundManager.play("pop"); onSelect(s.prompt); }}
            activeOpacity={0.7}
          >
            <Feather name={s.icon} size={14} color={s.color} />
            <Text style={[styles.chipText, { color: s.color }]} numberOfLines={1}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
