import React from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { TCard , TButton } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { PROVIDER_THEME } from "@/src/modules/ai/domain/AISettings";
import type { AIProvider } from "@packages/ai";

interface ProviderSwitchModalProps {
  visible: boolean;
  currentProvider: AIProvider;
  availableProviders: AIProvider[];
  reason: string;
  onSwitch: (provider: AIProvider) => void;
  onDismiss: () => void;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
  deepseek: "DeepSeek",
  qwen: "Qwen",
};

export function ProviderSwitchModal({
  visible,
  currentProvider,
  availableProviders,
  reason,
  onSwitch,
  onDismiss,
}: ProviderSwitchModalProps) {
  const { theme } = useAppState();

  const alternatives = availableProviders.filter((p) => p !== currentProvider);
  if (alternatives.length === 0) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <TCard borderRadius={20} padding={24} gap={14} width="100%" maxWidth={360} backgroundColor={theme.cardBackground} borderColor={theme.border}>
          <View style={styles.header}>
            <Feather name="alert-triangle" size={20} color={theme.warning} />
            <Text style={[styles.title, { color: theme.textColor }]}>
              Provedor indisponivel
            </Text>
          </View>

          <Text style={[styles.reason, { color: theme.secondaryText }]}>
            {reason}
          </Text>

          <Text style={[styles.subtitle, { color: theme.textColor }]}>
            Trocar para outro provedor com chave configurada:
          </Text>

          <View style={styles.providers}>
            {alternatives.map((p) => {
              const pt = PROVIDER_THEME[p];
              return (
                <Pressable
                  key={p}
                  style={[styles.providerBtn, { borderColor: pt.color, backgroundColor: `${pt.color}10` }]}
                  onPress={() => { soundManager.play("pop"); onSwitch(p); }}
                >
                  <View style={[styles.dot, { backgroundColor: pt.color }]} />
                  <Text style={[styles.providerLabel, { color: pt.color }]}>
                    {PROVIDER_LABELS[p]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TButton variant="ghost" color={theme.primaryColor} onPress={onDismiss}>
            Agora nao
          </TButton>
        </TCard>
      </Pressable>
    </Modal>
  );
}

/** Detect if a message indicates a provider limit/failure */
export function detectProviderIssue(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("circuit breaker") || lower.includes("temporariamente indisponivel") || lower.includes("temporariamente indisponível")) {
    return "Muitas falhas consecutivas. O provedor foi bloqueado temporariamente.";
  }
  if (lower.includes("limite") && (lower.includes("tokens") || lower.includes("atingido"))) {
    return "Limite de tokens atingido para este provedor.";
  }
  if (lower.includes("429") || lower.includes("rate") || lower.includes("excedido") || lower.includes("resource_exhausted")) {
    return "Limite de requisições excedido pelo provedor.";
  }
  if (lower.includes("invalida") && lower.includes("chave")) {
    return "Chave de API invalida ou expirada.";
  }
  return null;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  providers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
