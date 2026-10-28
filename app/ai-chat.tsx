import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  type LayoutChangeEvent,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardState } from "react-native-keyboard-controller";
import { router, useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import type { IMessage, BubbleProps } from "react-native-gifted-chat";
import { useAppState } from "@/src/context/AppStateProvider";
import * as ImagePicker from "expo-image-picker";
import { soundManager } from "@/src/services/SoundManager";
import { VisionOCRService } from "@packages/ai/src/vision/VisionOCRService";
import type { OCRDocumentType , InvoiceOCRResult } from "@packages/ai/src/vision/ocrSchema";
import { SelectionModal } from "@/src/components/shared/SelectionModal";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { useAIConsultant } from "@/src/hooks/useAIConsultant";
import { useAISettings } from "@/src/hooks/useAISettings";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { voiceOutputService } from "@/src/services/VoiceOutputService";
import { AIUsageBar } from "@/src/components/ai/AIUsageBar";
import {
  CHAT_COMPOSER_FALLBACK_HEIGHT,
  chatCompactFrame,
  chatKeyboardCompact,
  chatKeyboardVerticalOffset,
} from "@/src/components/ai/chatKeyboardLayout";
import { DataPermissionModal } from "@/src/components/ai/DataPermissionModal";
import { detectMissingPermission } from "@/src/modules/ai/application/PermissionDetector";
import { PROVIDER_THEME } from "@/src/modules/ai/domain/AISettings";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { OpenAIAdapter } from "@packages/../packages/ai/src/adapters/OpenAIAdapter";
import { ElevenLabsAdapter } from "@packages/../packages/ai/src/audio/ElevenLabsAdapter";
import { createAudioPlayer as createPlayer, setAudioModeAsync as setAudioMode } from "expo-audio";
import { TText } from "@/src/components/tamagui";
import { MarkdownText } from "@/src/components/ai/ChatBubble";
import { FinancialCard } from "@/src/components/ai/FinancialCard";
import { FinancialTooltip } from "@/src/components/ai/FinancialTooltip";
import { FINANCIAL_GLOSSARY, glossaryShortcuts, type GlossaryEntry } from "@/src/constants/financialGlossary";
import { QuickSuggestions } from "@/src/components/ai/QuickSuggestions";
import { ChatInputBar } from "@/src/components/ai/ChatInputBar";
import type { ChatAction } from "@/src/components/ai/ChatActionMenu";
import { ProviderSwitchModal, detectProviderIssue } from "@/src/components/ai/ProviderSwitchModal";
import type { ConsultationResult } from "@packages/ai";
import type { AIDataPermissions } from "@/src/modules/ai/domain/AISettings";
import { appAlert } from "@/src/services/appAlert";
import { usePayslipScanner } from "@/src/hooks/usePayslipScanner";
import { setPendingPayslipReview } from "@/src/modules/payslip/pendingReview";
import { EMPTY_PAYSLIP_PARSE } from "@/src/modules/payslip/scanPayslip";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip markdown formatting from text before sending to TTS */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")       // headings
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/__(.*?)__/g, "$1")     // __bold__
    .replace(/\*(.*?)\*/g, "$1")     // *italic*
    .replace(/_(.*?)_/g, "$1")       // _italic_
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1") // `code`
    .replace(/^\s*[-*+]\s/gm, "")   // bullet points
    .replace(/^\s*\d+\.\s/gm, "")   // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url) → link
    .replace(/---+/g, "")           // horizontal rules
    .replace(/\n{3,}/g, "\n\n")     // excess newlines
    .trim();
}
const HUMAN_USER = { _id: 1, name: "Você" };

const AI_USER = { _id: 2, name: "DOMUS IA" };

function tryParseConsultation(msg: IMessage): ConsultationResult | null {
  const extra = msg as IMessage & { consultationResult?: ConsultationResult };
  if (extra.consultationResult) return extra.consultationResult;
  try {
    const text = msg.text ?? "";
    const match = text.match(/\{[\s\S]*"decision"\s*:\s*"(Buy|Delay|Avoid)"[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as ConsultationResult;
      if (parsed.decision && parsed.risk && typeof parsed.confidence === "number") {
        return { ...parsed, isLocalFallback: false, tokensUsed: 0 };
      }
    }
  } catch { /* not structured */ }
  return null;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function AIChatScreen() {
  const { theme } = useAppState();
  const { settings, isLoading: settingsLoading, updateSettings, reload: reloadSettings } = useAISettings();
  const { messages, isLoading, sendMessage, generateWelcome, clearHistory, addSystemMessage } = useAIConsultant(settings);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  // Map message IDs to their recorded audio URIs for replay
  const audioUriMap = useRef<Record<string, string>>({});
  // Pending audio URI to associate with next user message
  const pendingAudioUri = useRef<string | null>(null);
  // Map message ID → provider (built from messages, cached in ref)
  const msgProviderMap = useRef<Record<string, string>>({});
  const lastAssistantId = useRef<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [ttsState, setTtsState] = useState({ isSpeaking: false, isLoading: false });
  const [switchModal, setSwitchModal] = useState<{ reason: string } | null>(null);

  // Reload settings when screen regains focus (e.g. returning from settings)
  useFocusEffect(useCallback(() => { reloadSettings(); }, [reloadSettings]));

  // Subscribe to TTS state changes for UI feedback
  useEffect(() => {
    const unsub = voiceOutputService.subscribe(setTtsState);
    return unsub;
  }, []);

  // Associate pending audio URI with the latest user message
  useEffect(() => {
    if (!pendingAudioUri.current || messages.length === 0) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (lastUser) {
      audioUriMap.current[lastUser.id] = pendingAudioUri.current;
      pendingAudioUri.current = null;
    }
  }, [messages]);

  // Detect provider issues from AI error responses and show switch modal
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.isLocalFallback) return;
    const issue = detectProviderIssue(last.content);
    if (issue) setSwitchModal({ reason: issue });
  }, [messages]);

  // ─── Welcome message (daily greeting) ─────────────────────────────────
  const welcomeGenerated = useRef(false);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const GREETING_DATE_KEY = "domus_ai_last_greeting_date_v1";

  useEffect(() => {
    if (settingsLoading) return;
    if (!settings.isEnabled) return;
    if (welcomeGenerated.current) return;
    welcomeGenerated.current = true;

    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    AsyncStorage.getItem(GREETING_DATE_KEY).then((lastDate) => {
      if (lastDate === today) return; // Already greeted today
      setWelcomeLoading(true);
      generateWelcome()
        .then((msg) => {
          if (msg) {
            addSystemMessage(msg); // persists in history — survives navigation
            AsyncStorage.setItem(GREETING_DATE_KEY, today).catch(() => {});
          }
        })
        .finally(() => setWelcomeLoading(false));
    });
  }, [settingsLoading, settings.isEnabled, generateWelcome, addSystemMessage]);

  const giftedMessages = useMemo(() => {
    const source = messages;
    // Build provider map for avatar rendering
    for (const msg of source) {
      if (msg.provider) msgProviderMap.current[msg.id] = msg.provider;
    }
    return source.map((msg) => ({
      _id: msg.id,
      text: msg.content,
      createdAt: new Date(msg.timestamp),
      user: msg.role === "user" ? HUMAN_USER : AI_USER,
      ...(msg.tokensUsed != null && { tokensUsed: msg.tokensUsed }),
      ...(msg.isLocalFallback && { isLocalFallback: true }),
    } as IMessage)).reverse();
  }, [messages]);

  // ─── Permission modal ──────────────────────────────────────────────────
  const [permissionModal, setPermissionModal] = useState<{
    key: keyof AIDataPermissions;
    pendingText: string;
  } | null>(null);

  const handleSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const text = newMessages[0]?.text?.trim();
      if (!text || isLoading) return;
      // Guard: block sending if IA is disabled
      if (!settings.isEnabled) return;
      const missingPerm = detectMissingPermission(text, settings.dataPermissions);
      if (missingPerm) {
        setPermissionModal({ key: missingPerm, pendingText: text });
        return;
      }
      soundManager.play("pop");
      setInputText("");
      await sendMessage(text);
    },
    [isLoading, sendMessage, settings.isEnabled, settings.dataPermissions],
  );

  const handleQuickSuggestion = useCallback(
    (text: string) => {
      if (!settings.isEnabled) return;
      handleSend([{ _id: Date.now(), text, createdAt: new Date(), user: HUMAN_USER }]);
    },
    [handleSend, settings.isEnabled],
  );

  const [visionLoading, setVisionLoading] = useState(false);
  const [visionModal, setVisionModal] = useState<{ visible: boolean; docType: OCRDocumentType }>({ visible: false, docType: "invoice" });

  // Story 11.5: o holerite passa pela mesma captura de /payslips (Vision ou OCR
  // do aparelho) e abre a revisão de lá; nada do holerite vai ao chat.
  const openPayslipManual = useCallback(() => {
    setPendingPayslipReview({ data: EMPTY_PAYSLIP_PARSE, source: "manual" });
    router.push("/payslips");
  }, []);
  const { scan: scanPayslip, scanning: payslipScanning } = usePayslipScanner({ onManual: openPayslipManual });

  const processPayslipImage = useCallback(async (source: "camera" | "gallery") => {
    setVisionModal((v) => ({ ...v, visible: false }));
    const result = await scanPayslip(source);
    if (!result) return;
    setPendingPayslipReview({ data: result.data, source: result.source });
    router.push("/payslips");
  }, [scanPayslip]);

  const openVisionModal = useCallback((docType: OCRDocumentType) => {
    if (docType === "payslip") {
      setVisionModal({ visible: true, docType });
      return;
    }
    if (!settings.isEnabled || !VisionOCRService.supportsVision(settings.provider as any)) {
      appAlert("Não suportado", `${settings.provider} não suporta Vision OCR. Use OpenAI, Gemini, Claude ou Qwen.`);
      return;
    }
    setVisionModal({ visible: true, docType });
  }, [settings.isEnabled, settings.provider]);

  const processVisionImage = useCallback(async (source: "camera" | "gallery", docType: OCRDocumentType) => {
    const provider = settings.provider as any;

    // 1. Verificar budget
    const overBudget = await TokenTracker.isOverBudget(
      provider, settings.customBudgets, settings.budgetMode, settings.monthlyBudgets, settings.billingDay,
    );
    if (overBudget) {
      appAlert("Limite de IA atingido", "Você atingiu o limite de uso de IA. Ajuste o orçamento nas configurações.");
      return;
    }

    // 2. Abrir camera/galeria
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permissão negada", "Permita acesso à câmera."); return; }
      result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
    }

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0]!;
    const imageBase64 = asset.base64!; // garantido pelo guard acima (result.assets?.[0]?.base64)
    const mimeType = asset.mimeType ?? (asset.uri.endsWith(".png") ? "image/png" : "image/jpeg");

    setVisionLoading(true);
    soundManager.play("pop");

    try {
      const apiKey = await SecureKeyService.retrieveKey(provider);
      if (!apiKey) { appAlert("Sem chave API", "Configure a chave API nas configurações de IA."); setVisionLoading(false); return; }

      // 3. Processar com VisionOCR
      const ocrResult = await VisionOCRService.process(imageBase64, mimeType, provider, apiKey, docType);

      // 4. Registrar tokens (~2000 por Vision request)
      await TokenTracker.record(provider, 2000, settings.billingDay);

      setVisionLoading(false);
      soundManager.play("success");

      // 5. Redirecionar para tela de edição com dados pré-preenchidos
      if (docType === "invoice") {
        const inv = ocrResult as InvoiceOCRResult;
        const [d, m, y] = (inv.date || "").split("/");
        const dateIso = y && m && d ? new Date(Number(y), Number(m) - 1, Number(d)).toISOString() : new Date().toISOString();
        const payload = {
          invoiceId: Date.now().toString(36),
          source: "OCR_FALLBACK" as const,
          emitter: { name: inv.store || "Desconhecido", cnpj: (inv.cnpj || "").replace(/\D/g, "") },
          date: dateIso,
          items: inv.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? item.total,
            totalPrice: item.total,
            ...(item.ean ? { ean: String(item.ean) } : {}),
            ...(item.ncm ? { ncm: String(item.ncm).replace(/\D/g, "").substring(0, 8) } : {}),
          })),
          totalAmount: inv.total,
        };
        // Salvar no AsyncStorage temporário para a tela de import ler
        await AsyncStorage.setItem("@domus/vision_ocr_result", JSON.stringify(payload));
        router.push("/import-invoice?fromVision=1");
      }
    } catch (err: any) {
      setVisionLoading(false);
      soundManager.play("error");
      await sendMessage(`Erro ao escanear nota fiscal: ${err.message}. O que posso fazer?`);
    }
  }, [settings, sendMessage]);

  const handleAction = useCallback(
    (action: ChatAction) => {
      // Vision actions — open selection modal
      if (action === "scan_invoice") { openVisionModal("invoice"); return; }
      if (action === "scan_payslip") { openVisionModal("payslip"); return; }

      // Text actions — send as message
      const prompts: Record<string, string> = {
        monthly_summary: "Faça um resumo financeiro completo do meu mês atual",
        classify_transactions: "Classifique minhas transações recentes nas categorias corretas",
        budget_check: "Como estou em relação ao meu orçamento este mês?",
        savings_tips: "Identifique onde estou gastando demais e sugira onde posso economizar",
      };
      if (prompts[action]) handleQuickSuggestion(prompts[action]);
    },
    [handleQuickSuggestion, openVisionModal],
  );

  const handlePermissionAllow = useCallback(async () => {
    if (!permissionModal) return;
    const { key, pendingText } = permissionModal;
    setPermissionModal(null);
    await updateSettings({
      dataPermissions: { ...settings.dataPermissions, [key]: true },
    });
    await sendMessage(pendingText);
  }, [permissionModal, updateSettings, settings.dataPermissions, sendMessage]);

  const handlePermissionDeny = useCallback(() => {
    if (!permissionModal) return;
    const { pendingText } = permissionModal;
    setPermissionModal(null);
    sendMessage(pendingText);
  }, [permissionModal, sendMessage]);

  // ─── Pulse animation ──────────────────────────────────────────────────
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

  // ─── Audio / TTS ──────────────────────────────────────────────────────
  const getAudioApiKey = useCallback(async () => {
    const audioProv = settings.audioProvider ?? "openai";
    if (audioProv === "elevenlabs") {
      return SecureKeyService.retrieveKey("elevenlabs" as any);
    }
    const keyMap: Record<string, string> = { openai: "openai", gemini: "gemini", qwen: "qwen" };
    return SecureKeyService.retrieveKey((keyMap[audioProv] ?? "openai") as any);
  }, [settings.audioProvider]);

  const speakText = useCallback(async (text: string) => {
    // Guard: only speak if IA enabled AND voice enabled
    if (!settings.isEnabled || !settings.voiceEnabled) return;
    const apiKey = await getAudioApiKey();
    if (!apiKey) {
      console.warn("[TTS] Sem chave de API para audio provider:", settings.audioProvider);
      return;
    }
    const audioProv = settings.audioProvider ?? "openai";
    // Default voice per audio provider
    const defaultVoice: Record<string, string> = {
      openai: "nova",
      elevenlabs: "sarah",
      gemini: "Kore",
      qwen: "Cherry",
    };
    const voice = settings.audioVoice ?? (audioProv === "openai" ? settings.openaiVoice : undefined) ?? defaultVoice[audioProv] ?? "nova";
    try {
      await voiceOutputService.speak(stripMarkdown(text), apiKey, audioProv, voice);
    } catch (err) {
      console.error("[TTS] Erro ao sintetizar audio:", err);
    }
  }, [getAudioApiKey, settings.isEnabled, settings.voiceEnabled, settings.audioProvider, settings.audioVoice, settings.openaiVoice]);

  // Auto-play AI response — only when isEnabled + voiceEnabled + autoPlayTTS
  useEffect(() => {
    if (!settings.isEnabled || !settings.voiceEnabled || !settings.autoPlayTTS) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastAssistantId.current) return;
    lastAssistantId.current = last.id;
    speakText(last.content);
  }, [messages, settings.isEnabled, settings.voiceEnabled, settings.autoPlayTTS, speakText]);

  // ─── Voice recording ──────────────────────────────────────────────────
  const handleVoicePress = useCallback(async () => {
    // Guard: only record if IA enabled AND voice enabled
    if (!settings.isEnabled || !settings.voiceEnabled) return;
    if (isRecording) {
      setIsTranscribing(true);
      const result = await stopRecording();
      if (result) {
        pendingAudioUri.current = result.uri;
        const prov = settings.provider;

        if (prov === "gemini") {
          // Gemini: send audio directly as multimodal attachment
          setIsTranscribing(false);
          await sendMessage("🎤 [mensagem de voz]", null, { base64: result.base64, mimeType: "audio/mp4" });
        } else {
          // Transcribe using the provider's own STT when available
          let transcribed = "";
          try {
            const provKey = await SecureKeyService.retrieveKey(prov);
            if (prov === "openai" && provKey) {
              // OpenAI: native Whisper STT
              transcribed = await new OpenAIAdapter().transcribeAudio(result.uri, provKey);
            } else if ((prov === "claude" || prov === "deepseek" || prov === "qwen") && settings.audioProvider) {
              // Claude/DeepSeek: no native STT — use audio provider's STT as fallback
              const audioProv = settings.audioProvider;
              const audioKey = await SecureKeyService.retrieveKey(audioProv as any);
              if (audioProv === "openai" && audioKey) {
                transcribed = await new OpenAIAdapter().transcribeAudio(result.uri, audioKey);
              } else if (audioProv === "elevenlabs" && audioKey) {
                transcribed = await new ElevenLabsAdapter().transcribeAudio(result.uri, audioKey);
              } else if (audioProv === "gemini" && audioKey) {
                // Gemini can process audio — send as multimodal
                setIsTranscribing(false);
                await sendMessage("🎤 [mensagem de voz]", null, { base64: result.base64, mimeType: "audio/mp4" });
                return; // already sent
              }
            }
          } catch (e) { console.warn("[STT] Erro:", e); }
          setIsTranscribing(false);
          if (transcribed.trim()) {
            const mp = detectMissingPermission(transcribed.trim(), settings.dataPermissions);
            if (mp) setPermissionModal({ key: mp, pendingText: transcribed.trim() });
            else await sendMessage(transcribed.trim());
          } else {
            // No transcription available
            soundManager.play("error");
          }
        }
      } else {
        setIsTranscribing(false);
      }
    } else {
      await voiceOutputService.stop();
      try { await startRecording(); } catch { /* ignore */ }
    }
  }, [isRecording, stopRecording, startRecording, settings.provider, settings.audioProvider, settings.isEnabled, settings.voiceEnabled, settings.dataPermissions, sendMessage]);

  // ─── GiftedChat: Bubble with Markdown + Listen + Copy ─────────────────
  const [glossaryTip, setGlossaryTip] = useState<GlossaryEntry | null>(null);
  const tooltipsEnabled = settings.tooltipsEnabled ?? true;

  const renderBubble = useCallback(
    (props: Readonly<BubbleProps<IMessage>>) => {
      const msg = props.currentMessage;
      const isUser = msg?.user?._id === HUMAN_USER._id;

      return (
        <Bubble
          {...props}
          wrapperStyle={{
            left: { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border },
            right: { backgroundColor: theme.primaryColor },
          }}
          renderMessageText={() => {
            if (!msg) return null;
            const textColor = isUser ? "#fff" : theme.textColor;
            const extra = msg as IMessage & { tokensUsed?: number; isLocalFallback?: boolean };

            return (
              <View style={styles.messageContent}>
                {/* Markdown rendering for ALL messages */}
                <MarkdownText content={msg.text} baseColor={textColor} isUser={isUser} />

                {extra.isLocalFallback && !isUser && (
                  <Text style={{ color: theme.secondaryText, fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
                    análise local
                  </Text>
                )}

                {extra.tokensUsed != null && extra.tokensUsed > 0 && (
                  <Text style={{ color: isUser ? "rgba(255,255,255,0.6)" : theme.secondaryText, fontSize: 10, marginTop: 2, textAlign: "right" }}>
                    {extra.tokensUsed} tokens
                  </Text>
                )}

                {/* User voice replay button */}
                {isUser && audioUriMap.current[String(msg._id)] && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={async () => {
                        const uri = audioUriMap.current[String(msg._id)];
                        if (!uri) return;
                        try {
                          await setAudioMode({ playsInSilentMode: true, allowsRecording: false });
                          const player = createPlayer({ uri });
                          player.play();
                        } catch (e) { console.warn("[VoiceReplay]", e); }
                      }}
                      style={[styles.actionBtn, { borderColor: "rgba(255,255,255,0.3)" }]}
                    >
                      <Feather name="play" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Tooltips educativos para termos citados pela IA */}
                {(() => {
                  const terms = glossaryShortcuts(msg.text, { isUser, enabled: tooltipsEnabled });
                  if (!terms.length) return null;
                  return (
                    <View style={styles.glossaryRow}>
                      {terms.map((term) => (
                        <TouchableOpacity
                          key={term}
                          onPress={() => { soundManager.play("tap"); setGlossaryTip(FINANCIAL_GLOSSARY[term]); }}
                          style={[styles.glossaryChip, { borderColor: theme.border }]}
                          hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
                          accessibilityRole="button"
                          accessibilityLabel={`O que é ${FINANCIAL_GLOSSARY[term].title}?`}
                        >
                          <Feather name="info" size={11} color={theme.primaryColor} />
                          <Text style={{ color: theme.primaryColor, fontSize: 11 }}>O que é {FINANCIAL_GLOSSARY[term].title}?</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}

                {/* Action row: Copy + Listen */}
                {!isUser && (
                  <View style={styles.actionRow}>
                    {/* Copy button */}
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setStringAsync(msg.text);
                        soundManager.play("pop");
                      }}
                      style={[styles.actionBtn, { borderColor: theme.border }]}
                    >
                      <Feather name="copy" size={12} color={theme.secondaryText} />
                    </TouchableOpacity>

                    {/* Listen button (only when voice enabled) */}
                    {settings.voiceEnabled && settings.isEnabled && (
                      <TouchableOpacity
                        onPress={() => {
                          soundManager.play("tap");
                          if (ttsState.isSpeaking || ttsState.isLoading) voiceOutputService.stop();
                          else speakText(msg.text);
                        }}
                        style={[styles.actionBtn, { borderColor: ttsState.isLoading ? theme.primaryColor : theme.border }]}
                        disabled={false}
                      >
                        {ttsState.isLoading ? (
                          <ActivityIndicator size={12} color={theme.primaryColor} />
                        ) : (
                          <Feather
                            name={ttsState.isSpeaking ? "volume-x" : "volume-2"}
                            size={12}
                            color={theme.primaryColor}
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      );
    },
    [theme, speakText, ttsState, settings.voiceEnabled, settings.isEnabled, tooltipsEnabled],
  );

  // ─── GiftedChat: Custom view for FinancialCard ────────────────────────
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

  // ─── GiftedChat: teclado (Story 13.5) ─────────────────────────────────
  // Um só deslocamento: o KeyboardAvoidingView interno do GiftedChat, sob o
  // KeyboardProvider único da raiz (o GiftedChat não monta o dele: patch
  // react-native-gifted-chat+3.3.2). O offset recebe a distância do topo da
  // janela até o chat (status bar, cabeçalho, banners e AIUsageBar), medida
  // pelo onLayout do invólucro.
  const [chatTop, setChatTop] = useState(0);
  const [chatHeight, setChatHeight] = useState(0);
  const onChatFrameLayout = useCallback((e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    const height = e.nativeEvent.layout.height;
    setChatTop((prev) => (prev === y ? prev : y));
    setChatHeight((prev) => (prev === height ? prev : height));
  }, []);
  const keyboardAvoidingViewProps = useMemo(
    () => ({ keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop) }),
    [chatTop],
  );

  // Espaço curto com o teclado aberto (paisagem, fonte grande): somem as
  // sugestões rápidas e a barra de uso para a caixa caber (R2 da revisão).
  // Só leitura do estado do teclado; nenhuma compensação além do KAV.
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const keyboardHeight = useKeyboardState((state) => state.height);
  const insets = useSafeAreaInsets();
  const [usageBarHeight, setUsageBarHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(CHAT_COMPOSER_FALLBACK_HEIGHT);
  const [footerHeight, setFooterHeight] = useState(0);
  const measure = useCallback(
    (set: React.Dispatch<React.SetStateAction<number>>) => (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      set((prev) => (prev === h ? prev : h));
    },
    [],
  );
  const onUsageBarLayout = useMemo(() => measure(setUsageBarHeight), [measure]);
  const onComposerLayout = useMemo(() => measure(setComposerHeight), [measure]);
  const onFooterLayout = useMemo(() => measure(setFooterHeight), [measure]);
  const [usageBarShown, setUsageBarShown] = useState(true);
  const { compact } = chatKeyboardCompact({
    keyboardVisible,
    keyboardHeight,
    ...chatCompactFrame(chatTop, chatHeight, insets.bottom, usageBarHeight, usageBarShown),
    usageBarHeight,
    composerHeight,
    footerHeight,
  });
  useEffect(() => {
    setUsageBarShown(!compact);
  }, [compact]);

  // ─── GiftedChat: Full input toolbar (ChatInputBar component) ─────────
  const renderInputToolbar = useCallback(
    () => (
      <View onLayout={onComposerLayout}>
        <ChatInputBar
          text={inputText}
          onChangeText={setInputText}
          onSend={(txt) => {
            if (!txt) return;
            handleSend([{ _id: Date.now(), text: txt, createdAt: new Date(), user: HUMAN_USER }]);
          }}
          isEnabled={settings.isEnabled}
          voiceEnabled={(settings.voiceEnabled ?? false) && (
            settings.provider === "openai" || settings.provider === "gemini" ||
            ((settings.provider === "claude" || settings.provider === "deepseek" || settings.provider === "qwen") && !!settings.audioProvider)
          )}
          visionOCREnabled={settings.visionOCREnabled && VisionOCRService.supportsVision(settings.provider as any)}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          isLoading={isLoading || visionLoading || payslipScanning}
          pulseAnim={pulseAnim}
          onVoicePress={handleVoicePress}
          onAction={handleAction}
        />
      </View>
    ),
    [inputText, settings.isEnabled, settings.voiceEnabled, settings.visionOCREnabled, settings.provider, settings.audioProvider, isRecording, isTranscribing, isLoading, visionLoading, payslipScanning, pulseAnim, handleVoicePress, handleAction, handleSend, onComposerLayout],
  );

  // ─── GiftedChat: Scroll to bottom ─────────────────────────────────────
  const scrollToBottomComponent = useCallback(() => (
    <Feather name="chevrons-down" size={20} color={theme.primaryColor} />
  ), [theme]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => { soundManager.play("tap"); router.back(); }} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <TText variant="subtitle" bold color={theme.textColor} fontSize={17}>DOMUS IA</TText>
          <TText variant="caption" color={theme.secondaryText}>Consultor financeiro</TText>
        </View>
        <TouchableOpacity onPress={() => { soundManager.play("trash"); clearHistory(); audioUriMap.current = {}; msgProviderMap.current = {}; }} style={styles.headerBtn}>
          <Feather name="trash-2" size={18} color={theme.secondaryText} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { soundManager.play("tap"); router.push("/ai-settings"); }} style={styles.headerBtn}>
          <Feather name="settings" size={18} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Banner: IA desabilitada */}
      {!settings.isEnabled && (
        <View style={[styles.banner, { backgroundColor: `${theme.warning}20`, borderColor: theme.warning }]}>
          <Feather name="info" size={14} color={theme.warning} />
          <TText variant="caption" color={theme.warning} lineHeight={18} flex={1}>
            Configure sua chave de API em{" "}
            <TText variant="caption" bold color={theme.warning} onPress={() => router.push("/ai-settings")}>Configurações</TText>
            {" "}para ativar a IA. Análise local disponível.
          </TText>
        </View>
      )}

      {/* Vision loading banner */}
      {(visionLoading || payslipScanning) && (
        <View style={s.visionBanner}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={s.visionBannerText}>{payslipScanning ? "Lendo o holerite…" : "Escaneando com IA Vision..."}</Text>
        </View>
      )}

      {/* Usage bar (some com o teclado aberto e espaço curto, R2) */}
      {usageBarShown && (
        <View onLayout={onUsageBarLayout}>
          <AIUsageBar
            provider={settings.provider}
            audioProvider={settings.audioProvider}
            voiceEnabled={settings.voiceEnabled}
            modelTier={settings.modelTier}
            customBudgets={settings.customBudgets}
            budgetMode={settings.budgetMode}
            monthlyBudgets={settings.monthlyBudgets}
            billingDay={settings.billingDay}
            refreshKey={messages.length}
          />
        </View>
      )}

      {/* ═══════════════════ GiftedChat (FULL FEATURES) ═══════════════════ */}
      {/* Invólucro: mede o chatTop (Story 13.5). Quem corta a translação é o GiftedChat; o overflow é reforço (R6). */}
      <View style={styles.chatFrame} onLayout={onChatFrameLayout}>
        <GiftedChat
          messages={giftedMessages}
          onSend={handleSend}
          user={HUMAN_USER}
          /* ── Typing indicator ── */
          isTyping={isLoading || welcomeLoading}
          /* ── Custom renderers ── */
          renderBubble={renderBubble}
          renderCustomView={renderCustomView}
          renderInputToolbar={renderInputToolbar}
          text={inputText}
          textInputProps={{ onChangeText: setInputText }}
          /* ── Avatars ── */
          isAvatarVisibleForEveryMessage={false}
          renderAvatar={(props) => {
            const user = props.currentMessage?.user;
            if (!user || user._id === HUMAN_USER._id) return null;
            const msgId = String(props.currentMessage?._id ?? "");
            const msgProv = msgProviderMap.current[msgId] ?? settings.provider;
            const pTheme = PROVIDER_THEME[msgProv as keyof typeof PROVIDER_THEME] ?? PROVIDER_THEME.openai;
            return (
              <View style={[styles.avatar, { backgroundColor: pTheme.color }]}>
                <MaterialCommunityIcons
                  name={pTheme.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={18}
                  color="#fff"
                />
              </View>
            );
          }}
          /* ── Long press to copy ── */
          onLongPressMessage={(_context: any, message: IMessage) => {
            if (message.text) {
              Clipboard.setStringAsync(message.text);
              soundManager.play("pop");
            }
          }}
          /* ── Link parsing (URLs, emails, phones) ── */
          messageTextProps={{
            url: true,
            email: true,
            phone: true,
            hashtag: false,
            mention: false,
            linkStyle: {
              left: { color: theme.primaryColor, textDecorationLine: "underline" as any },
              right: { color: "#E0E0FF", textDecorationLine: "underline" as any },
            },
          }}
          /* ── Scroll to bottom ── */
          isScrollToBottomEnabled
          scrollToBottomComponent={scrollToBottomComponent}
          scrollToBottomOffset={200}
          scrollToBottomStyle={{ backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, borderRadius: 20 }}
          /* ── Quick suggestions as chat footer ── */
          renderChatFooter={settings.isEnabled && !compact ? () => (
            <View onLayout={onFooterLayout}>
              <QuickSuggestions onSelect={handleQuickSuggestion} hasMessages={messages.length > 0} />
            </View>
          ) : undefined}
          /* ── Reply to messages (swipe) ── */
          reply={{
            swipe: {
              isEnabled: true,
              direction: "left" as const,
            },
          }}
          /* ── Keyboard & layout ── */
          keyboardAvoidingViewProps={keyboardAvoidingViewProps}
          /* ── Styles ── */
          messagesContainerStyle={{ backgroundColor: theme.background }}
          timeTextStyle={{
            left: { color: theme.secondaryText, fontSize: 11 },
            right: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
          }}
          /* ── Localization ── */
          dateFormat="DD/MM/YYYY"
          timeFormat="HH:mm"
          locale="pt-br"
        />
      </View>

      {/* Provider switch suggestion modal */}
      <ProviderSwitchModal
        visible={switchModal !== null}
        currentProvider={settings.provider}
        availableProviders={
          (Object.keys(settings.apiKeyStatus) as import("@packages/ai").AIProvider[])
            .filter((p) => settings.apiKeyStatus[p] === true)
        }
        reason={switchModal?.reason ?? ""}
        onSwitch={(provider) => {
          setSwitchModal(null);
          updateSettings({ provider, systemPromptSent: false });
        }}
        onDismiss={() => setSwitchModal(null)}
      />

      {/* Permission modal */}
      <DataPermissionModal
        visible={permissionModal !== null}
        permissionKey={permissionModal?.key ?? null}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />

      <FinancialTooltip
        visible={!!glossaryTip}
        title={glossaryTip?.title ?? ""}
        content={glossaryTip?.content ?? ""}
        onClose={() => setGlossaryTip(null)}
      />

      <SelectionModal
        visible={visionModal.visible}
        title={visionModal.docType === "invoice" ? "Escanear Nota Fiscal" : "Escanear Holerite"}
        subtitle="Como deseja capturar a imagem?"
        options={[
          { label: "Câmera", icon: "camera", color: "#4CAF50", onPress: () => (visionModal.docType === "payslip" ? processPayslipImage("camera") : processVisionImage("camera", visionModal.docType)) },
          { label: "Galeria de Fotos", icon: "image", color: "#2196F3", onPress: () => (visionModal.docType === "payslip" ? processPayslipImage("gallery") : processVisionImage("gallery", visionModal.docType)) },
        ]}
        onCancel={() => setVisionModal((v) => ({ ...v, visible: false }))}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = { visionBanner: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, paddingVertical: 10, backgroundColor: "#007AFF" }, visionBannerText: { color: "#FFF", fontSize: 13, fontWeight: "600" as const } };
const styles = StyleSheet.create({
  safe: { flex: 1 },
  chatFrame: { flex: 1, overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerBtn: { padding: 6 },
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
  messageContent: { paddingHorizontal: 12, paddingVertical: 8 },
  glossaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  glossaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
});
