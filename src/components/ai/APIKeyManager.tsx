import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
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
        setError("Falha ao salvar — autenticação necessária.");
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
    openrouter: "OpenRouter API Key",
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>
        {providerLabels[provider]}
      </Text>

      {hasKey ? (
        <View
          style={[
            styles.hasKeyRow,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Feather name="lock" size={16} color={theme.success} />
          <Text style={[styles.hasKeyText, { color: theme.textColor }]}>
            Chave armazenada com segurança
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={styles.deleteBtn}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.danger} />
            ) : (
              <Feather name="trash-2" size={16} color={theme.danger} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="sk-... ou AIza... ou ant..."
            placeholderTextColor={theme.secondaryText}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                color: theme.textColor,
                backgroundColor: theme.cardBackground,
                borderColor: error ? theme.danger : theme.border,
              },
            ]}
          />
          <TouchableOpacity
            onPress={() => setShowKey((v) => !v)}
            style={styles.eyeBtn}
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
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}

      {success && (
        <Text style={[styles.success, { color: theme.success }]}>
          Chave salva com sucesso!
        </Text>
      )}

      {!hasKey && (
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || !input.trim()}
          style={[
            styles.saveBtn,
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
            <Text style={styles.saveBtnText}>Salvar chave</Text>
          )}
        </TouchableOpacity>
      )}
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
  inputRow: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 44,
    fontSize: 14,
    fontFamily: "monospace",
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
  hasKeyText: {
    flex: 1,
    fontSize: 14,
  },
  deleteBtn: {
    padding: 4,
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  error: {
    fontSize: 13,
  },
  success: {
    fontSize: 13,
    fontWeight: "600",
  },
});
