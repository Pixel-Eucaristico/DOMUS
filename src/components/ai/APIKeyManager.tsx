import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as ExpoClipboard from "expo-clipboard";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import type { AIProvider } from "@packages/ai";
import type { OpenAIAuthMethod } from "@/src/modules/ai/domain/AISettings";

interface APIKeyManagerProps {
  provider: AIProvider;
  hasKey: boolean;
  /** OpenAI-specific: current auth method */
  openaiAuthMethod?: OpenAIAuthMethod;
  /** OpenAI-specific: has active OAuth session */
  hasOAuthSession?: boolean;
  onSave: (provider: AIProvider, key: string) => Promise<boolean>;
  onDelete: (provider: AIProvider) => Promise<void>;
  /** OpenAI-specific: start ChatGPT Device Code login */
  onLoginChatGPT?: (onCode: (code: string, verifyUrl: string) => void) => Promise<boolean>;
  /** OpenAI-specific: logout from ChatGPT OAuth */
  onLogoutChatGPT?: () => Promise<void>;
}

export function APIKeyManager({
  provider,
  hasKey,
  openaiAuthMethod,
  hasOAuthSession,
  onSave,
  onDelete,
  onLoginChatGPT,
  onLogoutChatGPT,
}: APIKeyManagerProps) {
  const { theme } = useAppState();
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [deviceUrl, setDeviceUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isOpenAI = provider === "openai";
  const usingOAuth = isOpenAI && openaiAuthMethod === "chatgpt_oauth" && hasOAuthSession;

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

  const handleLoginChatGPT = async () => {
    if (!onLoginChatGPT) return;
    setError(null);
    setDeviceCode(null);
    setDeviceUrl(null);
    setCopied(false);
    setIsLoggingIn(true);
    try {
      const ok = await onLoginChatGPT((code, url) => {
        setDeviceCode(code);
        setDeviceUrl(url);
      });
      setDeviceCode(null);
      setDeviceUrl(null);
      if (ok) {
        setSuccess(true);
        soundManager.play("success");
        setTimeout(() => setSuccess(false), 2500);
      } else {
        setError("Login cancelado ou expirou.");
      }
    } catch {
      setDeviceCode(null);
      setDeviceUrl(null);
      setError("Erro ao conectar com ChatGPT.");
      soundManager.play("error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyCode = async () => {
    if (deviceCode) {
      await ExpoClipboard.setStringAsync(deviceCode);
      setCopied(true);
      soundManager.play("tap");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenBrowser = () => {
    if (deviceUrl) {
      WebBrowser.openBrowserAsync(deviceUrl).catch(() => {});
    }
  };

  const handleLogoutChatGPT = async () => {
    if (!onLogoutChatGPT) return;
    soundManager.play("trash");
    setIsDeleting(true);
    try {
      await onLogoutChatGPT();
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
      {/* OAuth session active */}
      {usingOAuth ? (
        <>
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            ChatGPT (assinatura)
          </Text>
          <View
            style={[
              styles.hasKeyRow,
              { backgroundColor: `${PROVIDER_GREEN}15`, borderColor: PROVIDER_GREEN },
            ]}
          >
            <MaterialCommunityIcons name="creation" size={16} color={PROVIDER_GREEN} />
            <Text style={[styles.hasKeyText, { color: theme.textColor }]}>
              Conectado via ChatGPT
            </Text>
            <TouchableOpacity
              onPress={handleLogoutChatGPT}
              disabled={isDeleting}
              style={styles.deleteBtn}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={theme.danger} />
              ) : (
                <Feather name="log-out" size={16} color={theme.danger} />
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
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
                Chave armazenada com seguranca
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
        </>
      )}

      {error && (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}

      {success && (
        <Text style={[styles.success, { color: theme.success }]}>
          {usingOAuth ? "Conectado com sucesso!" : "Chave salva com sucesso!"}
        </Text>
      )}

      {!hasKey && !usingOAuth && (
        <View style={styles.actionsColumn}>
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

          {/* ChatGPT OAuth — temporarily disabled */}
        </View>
      )}
    </View>
  );
}

const PROVIDER_GREEN = "#10A37F";

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
  actionsColumn: {
    gap: 10,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  oauthBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  oauthHint: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  codeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  codeLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  codeValue: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 4,
    marginVertical: 4,
  },
  codeCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  codeCopyBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
  openBrowserBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
  },
  openBrowserBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  codeWaiting: {
    fontSize: 11,
    fontStyle: "italic",
  },
  error: {
    fontSize: 13,
  },
  success: {
    fontSize: 13,
    fontWeight: "600",
  },
});
