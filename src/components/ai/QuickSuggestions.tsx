import React from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TText } from "@/src/components/tamagui";

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
    label: "Resumo do mês",
    prompt: "Faça um resumo financeiro do meu mês atual com as principais categorias de gastos",
    color: "#4CAF50",
  },
  {
    icon: "trending-up",
    label: "Dica de economia",
    prompt: "Me dê uma dica prática para economizar este mês baseado nos meus gastos",
    color: "#2196F3",
  },
  {
    icon: "shield",
    label: "Reserva de emergência",
    prompt: "Como está minha reserva de emergência? Estou no caminho certo?",
    color: "#FF9800",
  },
  {
    icon: "target",
    label: "Metas financeiras",
    prompt: "Analise meus hábitos e sugira metas financeiras realistas para os próximos 3 meses",
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
    prompt: "Classifique minhas transações recentes nas categorias corretas",
    color: "#00BCD4",
  },
  {
    icon: "bar-chart-2",
    label: "Regra 50/30/20",
    prompt: "Analise meus gastos e me diga como estou em relação à regra 50/30/20",
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
    <View style={s.container}>
      {!hasMessages && (
        <TText bold variant="label" color={theme.secondaryText} paddingHorizontal={16}>
          Como posso ajudar?
        </TText>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {suggestions.map((sg, idx) => (
          <TouchableOpacity
            key={idx}
            style={[s.chip, { backgroundColor: `${sg.color}15`, borderColor: `${sg.color}40` }]}
            onPress={() => { soundManager.play("pop"); onSelect(sg.prompt); }}
            activeOpacity={0.7}
          >
            <Feather name={sg.icon} size={14} color={sg.color} />
            <TText variant="label" color={sg.color} numberOfLines={1}>
              {sg.label}
            </TText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 6,
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
});
