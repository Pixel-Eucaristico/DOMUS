import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import type { AIProvider, AIModelTier } from "@packages/ai";
import { AI_MODELS } from "@packages/ai";

interface ProviderSelectorProps {
  selectedProvider: AIProvider;
  selectedTier: AIModelTier;
  apiKeyStatus?: Partial<Record<AIProvider, boolean>>;
  onProviderChange: (provider: AIProvider) => void;
  onTierChange: (tier: AIModelTier) => void;
}

const PROVIDERS: Array<{ id: AIProvider; label: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude" },
  { id: "openrouter", label: "OpenRouter" },
];

const TIERS: Array<{ id: AIModelTier; label: string }> = [
  { id: "fast", label: "Rapido" },
  { id: "smart", label: "Avancado" },
];

export function ProviderSelector({
  selectedProvider,
  selectedTier,
  apiKeyStatus,
  onProviderChange,
  onTierChange,
}: ProviderSelectorProps) {
  const { theme } = useAppState();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>
        Provedor
      </Text>

      <View style={styles.chipRow}>
        {PROVIDERS.map((p) => {
          const active = p.id === selectedProvider;
          const hasKey = apiKeyStatus?.[p.id] === true;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => { soundManager.play("tap"); onProviderChange(p.id); }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primaryColor : theme.cardBackground,
                  borderColor: active ? theme.primaryColor : theme.border,
                },
              ]}
            >
              <View style={styles.chipContent}>
                <Text
                  style={{
                    color: active ? "#fff" : theme.textColor,
                    fontSize: 13,
                    fontWeight: active ? "600" : "400",
                  }}
                >
                  {p.label}
                </Text>
                {hasKey && (
                  <View
                    style={[
                      styles.keyDot,
                      { backgroundColor: active ? "#fff" : theme.success },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.secondaryText, marginTop: 12 }]}>
        Modelo
      </Text>

      <View style={styles.chipRow}>
        {TIERS.map((t) => {
          const active = t.id === selectedTier;
          const modelName = AI_MODELS[selectedProvider][t.id];
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => { soundManager.play("tap"); onTierChange(t.id); }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.accentColor : theme.cardBackground,
                  borderColor: active ? theme.accentColor : theme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? "#fff" : theme.textColor,
                  fontSize: 13,
                  fontWeight: active ? "600" : "400",
                }}
              >
                {t.label}
              </Text>
              <Text
                style={{
                  color: active ? "rgba(255,255,255,0.8)" : theme.secondaryText,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {modelName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
