import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { GiftedChat, Bubble, InputToolbar, Composer, Send } from "react-native-gifted-chat";
import type { IMessage, BubbleProps, InputToolbarProps, ComposerProps, SendProps } from "react-native-gifted-chat";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { useAIConsultant } from "@/src/hooks/useAIConsultant";
import { useAISettings } from "@/src/hooks/useAISettings";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { voiceOutputService } from "@/src/services/VoiceOutputService";
import { AIUsageBar } from "@/src/components/ai/AIUsageBar";
import { DataPermissionModal } from "@/src/components/ai/DataPermissionModal";
import { detectMissingPermission } from "@/src/modules/ai/application/PermissionDetector";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { OpenAIAdapter } from "@packages/../packages/ai/src/adapters/OpenAIAdapter";
import { TourPageHost } from "@/src/components/tour/TourPageHost";
import { MarkdownText } from "@/src/components/ai/ChatBubble";
import { FinancialCard } from "@/src/components/ai/FinancialCard";
import { QuickSuggestions } from "@/src/components/ai/QuickSuggestions";
import { ChatActionMenu } from "@/src/components/ai/ChatActionMenu";
import type { ChatAction } from "@/src/components/ai/ChatActionMenu";
import type { ChatMessage, ConsultationResult } from "@packages/ai";
import type { AIDataPermissions } from "@/src/modules/ai/domain/AISettings";

// ─── Helpers ────────────────────────────────────────────────────────────────

const AI_USER = { _id: 2, name: "DOMUS IA" };
const HUMAN_USER = { _id: 1, name: "Você" };

/** Convert our ChatMessage to GiftedChat's IMessage format */
function toGiftedMessage(msg: ChatMessage): IMessage {
  return {
    _id: msg.id,
    text: msg.content,
    createdAt: new Date(msg.timestamp),
    user: msg.role === "user" ? HUMAN_USER : AI_USER,
    // Preserve extra metadata for custom rendering
    ...(msg.tokensUsed != null && { tokensUsed: msg.tokensUsed }),
    ...(msg.isLocalFallback && { isLocalFallback: true }),
  } as IMessage;
}

/** Try to extract a TOON-parsed ConsultationResult from message metadata */
function tryParseConsultation(msg: IMessage): ConsultationResult | null {
  const extra = msg as IMessage & { consultationResult?: ConsultationResult };
  if (extra.consultationResult) return extra.consultationResult;

  // Try to detect structured JSON in the message text (fallback)
  try {
    const text = msg.text ?? "";
    // Look for JSON that looks like a ConsultationResult
    const match = text.match(/\{[\s\S]*"decision"\s*:\s*"(Buy|Delay|Avoid)"[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as ConsultationResult;
      if (parsed.decision && parsed.risk && typeof parsed.confidence === "number") {
        return { ...parsed, isLocalFallback: false, tokensUsed: 0 };
      }
    }
  } catch {
    // not structured data
  }
  return null;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function AIChatScreen() {
  const { theme } = useAppState();
  const { settings, isLoading: settingsLoading, updateSettings } = useAISettings();
  const { messages, isLoading, sendMessage, generateWelcome, clearHistory } = useAIConsultant(settings);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const lastAssistantId = useRef<string | null>(null);

  // ─── Welcome message (AI-generated) ──────────────────────────────────────
  const [welcomeMsg, setWelcomeMsg] = useState<ChatMessage | null>(null);
  const welcomeGenerated = useRef(false);
  const [welcomeLoading, setWelcomeLoading] = useState(false);

  useEffect(() => {
    if (settingsLoading) return;
    if (welcomeGenerated.current || messages.length > 0) return;
    welcomeGenerated.current = true;
    setWelcomeLoading(true);

    generateWelcome()
      .then((msg) => {
        if (msg) setWelcomeMsg(msg);
      })
      .finally(() => setWelcomeLoading(false));
  }, [settingsLoading, generateWelcome, messages.length]);

  // ─── Convert messages to GiftedChat format (reversed for GiftedChat) ─────
  const giftedMessages = useMemo(() => {
    const source = messages.length > 0 ? messages : welcomeMsg ? [welcomeMsg] : [];
    // GiftedChat expects newest first
    return source.map(toGiftedMessage).reverse();
  }, [messages, welcomeMsg]);

  // ─── Permission modal ────────────────────────────────────────────────────
  const [permissionModal, setPermissionModal] = useState<{
    key: keyof AIDataPermissions;
    pendingText: string;
  } | null>(null);

  const handleSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const text = newMessages[0]?.text?.trim();
      if (!text || isLoading) return;

      // Check if the message needs a permission the user hasn't granted
      const missingPerm = detectMissingPermission(text, settings.dataPermissions);
      if (missingPerm) {
        setPermissionModal({ key: missingPerm, pendingText: text });
        return;
      }

      soundManager.play("pop");
      await sendMessage(text);
    },
    [isLoading, sendMessage, settings.dataPermissions],
  );

  // ─── Quick suggestion handler ───────────────────────────────────────────
  const handleQuickSuggestion = useCallback(
    (text: string) => {
      handleSend([{ _id: Date.now(), text, createdAt: new Date(), user: HUMAN_USER }]);
    },
    [handleSend],
  );

  // ─── Action menu handler ──────────────────────────────────────────────
  const handleAction = useCallback(
    (action: ChatAction) => {
      const prompts: Record<ChatAction, string> = {
        scan_invoice: "Quero escanear uma nota fiscal para extrair os dados automaticamente",
        scan_payslip: "Quero escanear meu holerite para registrar minha receita",
        monthly_summary: "Faca um resumo financeiro completo do meu mes atual",
        classify_transactions: "Classifique minhas transacoes recentes nas categorias corretas",
        budget_check: "Como estou em relacao ao meu orcamento este mes?",
        savings_tips: "Identifique onde estou gastando demais e sugira onde posso economizar",
      };
      handleQuickSuggestion(prompts[action]);
    },
    [handleQuickSuggestion],
  );

  const handlePermissionAllow = useCallback(async () => {
    if (!permissionModal) return;
    const { key, pendingText } = permissionModal;
    setPermissionModal(null);

    await updateSettings({
      dataPermissions: {
        ...settings.dataPermissions,
        [key]: true,
      },
    });

    await sendMessage(pendingText);
  }, [permissionModal, updateSettings, settings.dataPermissions, sendMessage]);

  const handlePermissionDeny = useCallback(() => {
    if (!permissionModal) return;
    const { pendingText } = permissionModal;
    setPermissionModal(null);
    sendMessage(pendingText);
  }, [permissionModal, sendMessage]);

  // ─── Pulse animation during recording ────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // ─── Resolve the audio API key (audio provider may differ from text provider)
  const getAudioApiKey = useCallback(async () => {
    const audioProv = settings.audioProvider ?? "openai";
    if (audioProv === "elevenlabs") {
      return SecureKeyService.retrieveKey("elevenlabs" as any);
    }
    // For openai, gemini, qwen audio: use the matching provider key
    const keyMap: Record<string, string> = { openai: "openai", gemini: "gemini", qwen: "qwen" };
    return SecureKeyService.retrieveKey((keyMap[audioProv] ?? "openai") as any);
  }, [settings.audioProvider]);

  const speakText = useCallback(async (text: string) => {
    const apiKey = await getAudioApiKey();
    if (!apiKey) return;
    const audioProv = settings.audioProvider ?? "openai";
    const voice = settings.audioVoice ?? settings.openaiVoice ?? "nova";
    await voiceOutputService.speak(text, apiKey, audioProv, voice);
  }, [getAudioApiKey, settings.audioProvider, settings.audioVoice, settings.openaiVoice]);

  // ─── Auto-play AI response when voiceEnabled ─────────────────────────────
  useEffect(() => {
    if (!settings.voiceEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastAssistantId.current) return;
    lastAssistantId.current = last.id;

    speakText(last.content);
  }, [messages, settings.voiceEnabled, speakText]);

  // ─── Voice recording handler ─────────────────────────────────────────────
  const handleVoicePress = useCallback(async () => {
    if (isRecording) {
      setIsTranscribing(true);
      const result = await stopRecording();

      if (result) {
        if (settings.provider === "gemini") {
          setIsTranscribing(false);
          const audioAttachment = { base64: result.base64, mimeType: "audio/mp4" };
          await sendMessage("🎤 [mensagem de voz]", null, audioAttachment);
        } else if (settings.provider === "openai") {
          let transcribed = "";
          try {
            const apiKey = await SecureKeyService.retrieveKey("openai");
            if (apiKey) {
              const adapter = new OpenAIAdapter();
              transcribed = await adapter.transcribeAudio(result.uri, apiKey);
            }
          } catch {
            // ignore transcription errors
          }
          setIsTranscribing(false);
          if (transcribed.trim()) {
            const missingPerm = detectMissingPermission(transcribed.trim(), settings.dataPermissions);
            if (missingPerm) {
              setPermissionModal({ key: missingPerm, pendingText: transcribed.trim() });
            } else {
              await sendMessage(transcribed.trim());
            }
          }
        } else {
          setIsTranscribing(false);
        }
      } else {
        setIsTranscribing(false);
      }
    } else {
      await voiceOutputService.stop();
      try {
        await startRecording();
      } catch {
        // ignore permission errors
      }
    }
  }, [isRecording, stopRecording, startRecording, settings.provider, settings.dataPermissions, sendMessage]);

  // ─── Custom GiftedChat Renderers ─────────────────────────────────────────

  const renderBubble = useCallback(
    (props: Readonly<BubbleProps<IMessage>>) => {
      const msg = props.currentMessage;
      const isUser = msg?.user?._id === HUMAN_USER._id;

      return (
        <Bubble
          {...props}
          wrapperStyle={{
            left: {
              backgroundColor: theme.cardBackground,
              borderWidth: 1,
              borderColor: theme.border,
            },
            right: {
              backgroundColor: theme.primaryColor,
            },
          }}
          renderMessageText={() => {
            if (!msg) return null;
            const textColor = isUser ? "#fff" : theme.textColor;
            const extra = msg as IMessage & { tokensUsed?: number; isLocalFallback?: boolean };

            return (
              <View style={styles.messageContent}>
                {isUser ? (
                  <Text style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>
                    {msg.text}
                  </Text>
                ) : (
                  <MarkdownText
                    content={msg.text}
                    baseColor={textColor}
                    isUser={false}
                  />
                )}

                {extra.isLocalFallback && !isUser && (
                  <Text style={{ color: theme.secondaryText, fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
                    analise local
                  </Text>
                )}

                {extra.tokensUsed != null && extra.tokensUsed > 0 && (
                  <Text style={{ color: theme.secondaryText, fontSize: 10, marginTop: 2, textAlign: "right" }}>
                    {extra.tokensUsed} tokens
                  </Text>
                )}

                {/* Listen button for AI messages — only when voice mode is enabled */}
                {!isUser && settings.voiceEnabled && settings.isEnabled && (
                  <TouchableOpacity
                    onPress={() => {
                      soundManager.play("tap");
                      if (voiceOutputService.isSpeaking) {
                        voiceOutputService.stop();
                      } else {
                        speakText(msg.text);
                      }
                    }}
                    style={[styles.listenBtn, { borderColor: theme.border }]}
                  >
                    <Feather
                      name={voiceOutputService.isSpeaking ? "volume-x" : "volume-2"}
                      size={13}
                      color={theme.primaryColor}
                    />
                    <Text style={{ color: theme.primaryColor, fontSize: 11, marginLeft: 4 }}>
                      {voiceOutputService.isSpeaking ? "Parar" : "Ouvir"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      );
    },
    [theme, speakText, settings.voiceEnabled, settings.isEnabled],
  );

  const renderCustomView = useCallback(
    (props: BubbleProps<IMessage>) => {
      const msg = props.currentMessage;
      if (!msg || msg.user?._id === HUMAN_USER._id) return null;

      const consultation = tryParseConsultation(msg);
      if (!consultation) return null;

      return (
        <View style={{ paddingHorizontal: 8, paddingBottom: 4 }}>
          <FinancialCard result={consultation} />
        </View>
      );
    },
    [],
  );


  const renderInputToolbar = useCallback(
    (props: InputToolbarProps<IMessage>) => (
      <InputToolbar
        {...props}
        containerStyle={[
          styles.inputToolbar,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      />
    ),
    [theme],
  );

  const renderComposer = useCallback(
    (props: ComposerProps) => (
      <View style={{ flexDirection: "row", alignItems: "flex-end", flex: 1, gap: 6 }}>
        {/* Action menu "+" button */}
        {settings.isEnabled && (
          <View style={{ marginBottom: 4 }}>
            <ChatActionMenu
              onAction={handleAction}
              visionOCREnabled={settings.visionOCREnabled}
            />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Composer
            {...props}
            textInputProps={{
              ...props.textInputProps,
              style: [
                styles.composer,
                {
                  color: theme.textColor,
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ],
              maxLength: 500,
              placeholder: "Pergunte algo... (*negrito* _italico_)",
              placeholderTextColor: theme.secondaryText,
              multiline: true,
            }}
          />
        </View>
      </View>
    ),
    [theme, settings.isEnabled, settings.visionOCREnabled, handleAction],
  );

  const renderSend = useCallback(
    (props: SendProps<IMessage>) => (
      <View style={styles.sendRow}>
        {settings.voiceEnabled && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={() => { soundManager.play("tap"); handleVoicePress(); }}
              disabled={isLoading || isTranscribing}
              style={[
                styles.micBtn,
                {
                  backgroundColor: isRecording
                    ? "#e53935"
                    : isTranscribing
                    ? theme.border
                    : theme.cardBackground,
                  borderColor: isRecording ? "#e53935" : theme.border,
                },
              ]}
            >
              <Feather
                name={isRecording ? "mic-off" : isTranscribing ? "loader" : "mic"}
                size={18}
                color={isRecording ? "#fff" : theme.secondaryText}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Send {...props} containerStyle={styles.sendContainer}>
          <View
            style={[
              styles.sendBtn,
              { backgroundColor: theme.primaryColor },
            ]}
          >
            <Feather name="send" size={18} color="#fff" />
          </View>
        </Send>
      </View>
    ),
    [settings.voiceEnabled, pulseAnim, isRecording, isTranscribing, isLoading, handleVoicePress, theme],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardProvider>
    <TourPageHost groupId={5}>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.background }]}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View>
          <View
            style={[
              styles.header,
              { borderBottomColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <TouchableOpacity onPress={() => { soundManager.play("tap"); router.back(); }} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={theme.textColor} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.textColor }]}>
                DOMUS IA
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
                Consultor financeiro
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => { soundManager.play("trash"); clearHistory(); }}
              style={styles.clearBtn}
              accessibilityLabel="Limpar conversa"
            >
              <Feather name="trash-2" size={18} color={theme.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { soundManager.play("tap"); router.push("/ai-settings"); }}
              style={styles.settingsBtn}
              accessibilityLabel="Configurações de IA"
            >
              <Feather name="settings" size={18} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline / no-key banner */}
        {!settings.isEnabled && (
          <View
            style={[
              styles.banner,
              { backgroundColor: `${theme.warning}20`, borderColor: theme.warning },
            ]}
          >
            <Feather name="info" size={14} color={theme.warning} />
            <Text style={[styles.bannerText, { color: theme.warning }]}>
              Configure sua chave de API em{" "}
              <Text
                style={{ fontWeight: "700" }}
                onPress={() => router.push("/ai-settings")}
              >
                Configurações
              </Text>{" "}
              para ativar a IA. Análise local disponível.
            </Text>
          </View>
        )}

        {/* Financial disclaimer */}
        <View
          style={[
            styles.disclaimer,
            { backgroundColor: `${theme.border}60`, borderColor: theme.border },
          ]}
          accessibilityRole="text"
        >
          <Feather name="alert-circle" size={12} color={theme.secondaryText} />
          <Text style={[styles.disclaimerText, { color: theme.secondaryText }]}>
            As análises são meramente informativas e não constituem
            aconselhamento financeiro profissional.
          </Text>
        </View>

        {/* Token usage bar */}
        <AIUsageBar
          provider={settings.provider}
          modelTier={settings.modelTier}
          customBudgets={settings.customBudgets}
          budgetMode={settings.budgetMode}
          monthlyBudgets={settings.monthlyBudgets}
          billingDay={settings.billingDay}
          refreshKey={messages.length}
        />

        {/* GiftedChat */}
        <GiftedChat
          messages={giftedMessages}
          onSend={handleSend}
          user={HUMAN_USER}
          isTyping={isLoading || welcomeLoading}
          renderBubble={renderBubble}
          renderCustomView={renderCustomView}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderSend={renderSend}
          renderChatFooter={settings.isEnabled ? () => (
            <QuickSuggestions
              onSelect={handleQuickSuggestion}
              hasMessages={messages.length > 0}
            />
          ) : undefined}
          /* ── Avatars ── */
          renderAvatar={() => null}
          /* ── Keyboard & UX ── */
          isSendButtonAlwaysVisible
          /* ── Styles ── */
          messagesContainerStyle={{ backgroundColor: theme.background }}
          timeTextStyle={{
            left: { color: theme.secondaryText, fontSize: 11 },
            right: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
          }}
          dateFormat="DD/MM/YYYY"
          timeFormat="HH:mm"
          locale="pt-br"
        />

        {/* Permission request modal */}
        <DataPermissionModal
          visible={permissionModal !== null}
          permissionKey={permissionModal?.key ?? null}
          onAllow={handlePermissionAllow}
          onDeny={handlePermissionDeny}
        />
      </SafeAreaView>
    </TourPageHost>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  clearBtn: {
    padding: 6,
  },
  settingsBtn: {
    padding: 6,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  messageContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  inputToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  composer: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    marginRight: 4,
  },
  sendContainer: {
    justifyContent: "center",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
