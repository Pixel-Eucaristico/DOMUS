import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
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
        <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
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
                <TouchableOpacity
                  key={p}
                  style={[styles.providerBtn, { borderColor: pt.color, backgroundColor: `${pt.color}10` }]}
                  onPress={() => { soundManager.play("pop"); onSwitch(p); }}
                >
                  <View style={[styles.dot, { backgroundColor: pt.color }]} />
                  <Text style={[styles.providerLabel, { color: pt.color }]}>
                    {PROVIDER_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
            <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Agora nao</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

/** Detect if a message indicates a provider limit/failure */
export function detectProviderIssue(text: string): string | null {
  if (text.includes("circuit breaker") || text.includes("temporariamente indisponivel") || text.includes("temporariamente indisponível")) {
    return "Muitas falhas consecutivas. O provedor foi bloqueado temporariamente.";
  }
  if (text.includes("Limite") && (text.includes("tokens") || text.includes("atingido"))) {
    return "Limite de tokens atingido para este provedor.";
  }
  if (text.includes("429") || text.includes("rate") || text.includes("excedido")) {
    return "Limite de requisicoes excedido pelo provedor.";
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
  modal: {
    borderRadius: 20,
    padding: 24,
    gap: 14,
    width: "100%",
    maxWidth: 360,
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
  dismiss: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
