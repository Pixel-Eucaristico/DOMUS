import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { useAIConsultant } from "@/src/hooks/useAIConsultant";
import { useAISettings } from "@/src/hooks/useAISettings";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { voiceOutputService } from "@/src/services/VoiceOutputService";
import { ChatBubble } from "@/src/components/ai/ChatBubble";
import { TypingIndicator } from "@/src/components/ai/TypingIndicator";
import { AIUsageBar } from "@/src/components/ai/AIUsageBar";
import { DataPermissionModal } from "@/src/components/ai/DataPermissionModal";
import { detectMissingPermission } from "@/src/modules/ai/application/PermissionDetector";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { OpenAIAdapter } from "@packages/../packages/ai/src/adapters/OpenAIAdapter";
import { useTourTarget } from "@/src/tour/useTourTarget";
import type { ChatMessage } from "@packages/ai";
import type { AIDataPermissions } from "@/src/modules/ai/domain/AISettings";

export default function AIChatScreen() {
  const { theme } = useAppState();
  const { settings, isLoading: settingsLoading, updateSettings } = useAISettings();
  const { messages, isLoading, sendMessage, generateWelcome, clearHistory } = useAIConsultant(settings);
  const { targetRef: configRef, TourCard: ConfigTourCard, activeStyle: configActive } = useTourTarget("ai-config-btn");
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const lastAssistantId = useRef<string | null>(null);

  // ─── Welcome message (AI-generated) ────────────────────────────────────────
  const [welcomeMsg, setWelcomeMsg] = useState<ChatMessage | null>(null);
  const welcomeGenerated = useRef(false);
  const [welcomeLoading, setWelcomeLoading] = useState(false);

  useEffect(() => {
    if (settingsLoading) return; // wait for settings to load from SecureStore
    if (welcomeGenerated.current || messages.length > 0) return;
    welcomeGenerated.current = true;
    setWelcomeLoading(true);

    generateWelcome()
      .then((msg) => {
        if (msg) setWelcomeMsg(msg);
      })
      .finally(() => setWelcomeLoading(false));
  }, [settingsLoading, generateWelcome, messages.length]);

  // Combined messages: welcome + real messages
  const displayMessages = useMemo(() => {
    if (messages.length > 0) return messages;
    if (welcomeMsg) return [welcomeMsg];
    return [];
  }, [messages, welcomeMsg]);

  // ─── Permission modal ──────────────────────────────────────────────────────
  const [permissionModal, setPermissionModal] = useState<{
    key: keyof AIDataPermissions;
    pendingText: string;
  } | null>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check if the message needs a permission the user hasn't granted
    const missingPerm = detectMissingPermission(text, settings.dataPermissions);
    if (missingPerm) {
      setPermissionModal({ key: missingPerm, pendingText: text });
      return;
    }

    setInput("");
    await sendMessage(text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, isLoading, sendMessage, settings.dataPermissions]);

  const handlePermissionAllow = useCallback(async () => {
    if (!permissionModal) return;
    const { key, pendingText } = permissionModal;
    setPermissionModal(null);

    // Grant permission
    await updateSettings({
      dataPermissions: {
        ...settings.dataPermissions,
        [key]: true,
      },
    });

    // Now send the message
    setInput("");
    await sendMessage(pendingText);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [permissionModal, updateSettings, settings.dataPermissions, sendMessage]);

  const handlePermissionDeny = useCallback(() => {
    if (!permissionModal) return;
    const { pendingText } = permissionModal;
    setPermissionModal(null);

    // Send anyway without the permission
    setInput("");
    sendMessage(pendingText);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [permissionModal, sendMessage]);

  // ─── Pulse animation during recording ──────────────────────────────────────
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

  // ─── Auto-play AI response when voiceEnabled ───────────────────────────────
  useEffect(() => {
    if (!settings.voiceEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastAssistantId.current) return;
    lastAssistantId.current = last.id;

    SecureKeyService.retrieveKey(settings.provider).then((apiKey) => {
      voiceOutputService.speak(
        last.content,
        settings.provider,
        apiKey ?? undefined,
        settings.openaiVoice ?? "nova",
      );
    });
  }, [messages, settings.voiceEnabled, settings.provider, settings.openaiVoice]);

  // ─── Voice recording handler ────────────────────────────────────────────────
  const handleVoicePress = useCallback(async () => {
    if (isRecording) {
      setIsTranscribing(true);
      const result = await stopRecording();

      if (result) {
        if (settings.provider === "gemini") {
          // Gemini: envia áudio diretamente como multimodal (sem transcrição)
          setIsTranscribing(false);
          const audioAttachment = { base64: result.base64, mimeType: "audio/mp4" };
          await sendMessage("🎤 [mensagem de voz]", null, audioAttachment);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        } else if (settings.provider === "openai") {
          // OpenAI: transcreve com Whisper e envia o texto
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
              setInput(transcribed.trim());
              setPermissionModal({ key: missingPerm, pendingText: transcribed.trim() });
            } else {
              await sendMessage(transcribed.trim());
              setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
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

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatBubble message={item} />,
    [],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={Platform.OS === "web" ? { zIndex: configActive ? 9999 : 1, position: "relative" } : {}}>
        <View
          style={[
            styles.header,
            configActive,
            Platform.OS === "web" && configActive ? { zIndex: 9998, position: "relative" } : {},
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

          <View ref={configRef as any} collapsable={false}>
            <TouchableOpacity
              onPress={() => { soundManager.play("tap"); router.push("/ai-settings"); }}
              style={styles.settingsBtn}
              accessibilityLabel="Configurações de IA"
            >
              <Feather name="settings" size={18} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>
        <ConfigTourCard />
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
        refreshKey={messages.length}
      />

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={isLoading || welcomeLoading ? <TypingIndicator /> : null}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte algo sobre suas finanças..."
            placeholderTextColor={theme.secondaryText}
            style={[
              styles.textInput,
              {
                color: theme.textColor,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
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

          <TouchableOpacity
            onPress={() => { soundManager.play("pop"); handleSend(); }}
            disabled={!input.trim() || isLoading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !isLoading
                    ? theme.primaryColor
                    : theme.border,
              },
            ]}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Permission request modal */}
      <DataPermissionModal
        visible={permissionModal !== null}
        permissionKey={permissionModal?.key ?? null}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
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
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
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
