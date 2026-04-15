import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import type { AIProvider, AIModelTier } from "@packages/ai";
import { AI_MODELS, CHATGPT_OAUTH_MODELS } from "@packages/ai";
import type { OpenAIAuthMethod } from "@/src/modules/ai/domain/AISettings";
import { TText } from "@/src/components/tamagui";

interface ProviderSelectorProps {
  selectedProvider: AIProvider;
  selectedTier: AIModelTier;
  apiKeyStatus?: Partial<Record<AIProvider, boolean>>;
  usingChatGPTOAuth?: boolean;
  onProviderChange: (provider: AIProvider) => void;
  onTierChange: (tier: AIModelTier) => void;
}

const PROVIDERS: Array<{ id: AIProvider; label: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "qwen", label: "Qwen" },
];

const TIERS: Array<{ id: AIModelTier; label: string }> = [
  { id: "fast", label: "Rapido" },
  { id: "smart", label: "Avancado" },
];

export function ProviderSelector({
  selectedProvider,
  selectedTier,
  apiKeyStatus,
  usingChatGPTOAuth,
  onProviderChange,
  onTierChange,
}: ProviderSelectorProps) {
  const { theme } = useAppState();

  return (
    <View style={s.container}>
      <TText
        bold
        variant="caption"
        color={theme.secondaryText}
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        Provedor
      </TText>

      <View style={s.chipRow}>
        {PROVIDERS.map((p) => {
          const active = p.id === selectedProvider;
          const hasKey = apiKeyStatus?.[p.id] === true;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => { soundManager.play("tap"); onProviderChange(p.id); }}
              style={[
                s.chip,
                {
                  backgroundColor: active ? theme.primaryColor : theme.cardBackground,
                  borderColor: active ? theme.primaryColor : theme.border,
                },
              ]}
            >
              <View style={s.chipContent}>
                <TText
                  variant="label"
                  fontWeight={active ? "600" : "400"}
                  color={active ? "#fff" : theme.textColor}
                >
                  {p.label}
                </TText>
                {hasKey && (
                  <View
                    style={[
                      s.keyDot,
                      { backgroundColor: active ? "#fff" : theme.success },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TText
        bold
        variant="caption"
        color={theme.secondaryText}
        textTransform="uppercase"
        letterSpacing={0.5}
        marginTop={12}
      >
        Modelo
      </TText>

      <View style={s.chipRow}>
        {TIERS.map((t) => {
          const active = t.id === selectedTier;
          const modelName =
            usingChatGPTOAuth && selectedProvider === "openai"
              ? CHATGPT_OAUTH_MODELS[t.id]
              : AI_MODELS[selectedProvider][t.id];
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => { soundManager.play("tap"); onTierChange(t.id); }}
              style={[
                s.chip,
                {
                  backgroundColor: active ? theme.accentColor : theme.cardBackground,
                  borderColor: active ? theme.accentColor : theme.border,
                },
              ]}
            >
              <TText
                variant="label"
                fontWeight={active ? "600" : "400"}
                color={active ? "#fff" : theme.textColor}
              >
                {t.label}
              </TText>
              <TText
                fontSize={11}
                marginTop={2}
                color={active ? "rgba(255,255,255,0.8)" : theme.secondaryText}
              >
                {modelName}
              </TText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
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
