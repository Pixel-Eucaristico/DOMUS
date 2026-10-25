import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { TInput, TText } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import type { AIProvider } from "@packages/ai";

interface APIKeyManagerProps {
  provider: AIProvider;
  hasKey: boolean;
  onSave: (provider: AIProvider, key: string) => Promise<boolean>;
  onDelete: (provider: AIProvider) => Promise<void>;
}

export function APIKeyManager({
  provider,
  hasKey,
  onSave,
  onDelete,
}: APIKeyManagerProps) {
  const { theme } = useAppState();
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Insira a chave de API antes de salvar.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const ok = await onSave(provider, trimmed);
      if (ok) {
        setInput("");
        setSuccess(true);
        soundManager.play("success");
        setTimeout(() => setSuccess(false), 2500);
      } else {
        setError("Falha ao salvar.");
        soundManager.play("error");
      }
    } catch {
      setError("Erro ao salvar a chave de API.");
      soundManager.play("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    soundManager.play("trash");
    setIsDeleting(true);
    try {
      await onDelete(provider);
    } finally {
      setIsDeleting(false);
    }
  };

  const providerLabels: Record<AIProvider, string> = {
    openai: "OpenAI API Key",
    gemini: "Google AI API Key",
    claude: "Anthropic API Key",
    deepseek: "DeepSeek API Key",
    qwen: "Alibaba DashScope API Key",
  };

  return (
    <View style={s.container}>
      <TText
        bold
        variant="caption"
        color={theme.secondaryText}
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        {providerLabels[provider]}
      </TText>

      {hasKey ? (
        <View
          style={[
            s.hasKeyRow,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Feather name="lock" size={16} color={theme.success} />
          <TText flex={1} color={theme.textColor}>
            Chave armazenada com segurança
          </TText>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={s.deleteBtn}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.danger} />
            ) : (
              <Feather name="trash-2" size={16} color={theme.danger} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.inputRow}>
          <TInput
            value={input}
            onChangeText={setInput}
            placeholder="sk-... ou AIza... ou ant..."
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            borderColor={error ? theme.danger : theme.border}
            paddingRight={44}
            color={theme.textColor}
            backgroundColor={theme.cardBackground}
          />
          <TouchableOpacity
            onPress={() => setShowKey((v) => !v)}
            style={s.eyeBtn}
          >
            <Feather
              name={showKey ? "eye-off" : "eye"}
              size={18}
              color={theme.secondaryText}
            />
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <TText variant="label" color={theme.danger}>{error}</TText>
      )}

      {success && (
        <TText variant="label" bold color={theme.success}>
          Chave salva com sucesso!
        </TText>
      )}

      {!hasKey && (
        <View style={s.actionsColumn}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !input.trim()}
            style={[
              s.saveBtn,
              {
                backgroundColor: isSaving || !input.trim()
                  ? theme.border
                  : theme.primaryColor,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <TText bold fontSize={15} color="#fff">Salvar chave</TText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  inputRow: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  hasKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  actionsColumn: {
    gap: 10,
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
});
