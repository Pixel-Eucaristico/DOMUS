import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Clipboard,
} from "react-native";
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
    setIsLoggingIn(true);
    try {
      const ok = await onLoginChatGPT((code, _url) => {
        setDeviceCode(code);
      });
      setDeviceCode(null);
      if (ok) {
        setSuccess(true);
        soundManager.play("success");
        setTimeout(() => setSuccess(false), 2500);
      } else {
        setError("Login cancelado ou expirou.");
      }
    } catch {
      setDeviceCode(null);
      setError("Erro ao conectar com ChatGPT.");
      soundManager.play("error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyCode = () => {
    if (deviceCode) {
      Clipboard.setString(deviceCode);
      soundManager.play("tap");
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

          {/* ChatGPT OAuth option for OpenAI */}
          {isOpenAI && onLoginChatGPT && (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.secondaryText }]}>ou</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <TouchableOpacity
                onPress={handleLoginChatGPT}
                disabled={isLoggingIn}
                style={[
                  styles.oauthBtn,
                  { backgroundColor: PROVIDER_GREEN, opacity: isLoggingIn ? 0.7 : 1 },
                ]}
              >
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="creation" size={18} color="#fff" />
                    <Text style={styles.oauthBtnText}>Entrar com ChatGPT</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Device code display */}
              {deviceCode ? (
                <TouchableOpacity
                  onPress={handleCopyCode}
                  style={[styles.codeCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                >
                  <Text style={[styles.codeLabel, { color: theme.secondaryText }]}>
                    Digite este codigo no navegador:
                  </Text>
                  <Text style={[styles.codeValue, { color: PROVIDER_GREEN }]}>
                    {deviceCode}
                  </Text>
                  <View style={styles.codeCopyRow}>
                    <Feather name="copy" size={12} color={theme.secondaryText} />
                    <Text style={[styles.codeCopyText, { color: theme.secondaryText }]}>
                      Toque para copiar
                    </Text>
                  </View>
                  <Text style={[styles.codeWaiting, { color: theme.secondaryText }]}>
                    Aguardando login... (expira em 15 min)
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.oauthHint, { color: theme.secondaryText }]}>
                  Use sua assinatura ChatGPT Plus/Team sem API key
                </Text>
              )}
            </>
          )}
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
  },
  codeValue: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 4,
  },
  codeCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  codeCopyText: {
    fontSize: 11,
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
