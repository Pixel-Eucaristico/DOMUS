import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConsultantChatUseCase } from "@/src/modules/ai/application/ConsultantChatUseCase";
import { AIClientService } from "@/src/modules/ai/application/AIClientService";
import { useAppState } from "@/src/context/AppStateProvider";
import { useSync } from "@/src/context/SyncProvider";
import type { ChatMessage } from "@packages/ai";
import type { AISettings } from "@/src/modules/ai/domain/AISettings";
import { toSyncInfo, type ContextData } from "@/src/modules/ai/application/AIContextBuilder";
import { generateId } from "@packages/events/src/factory";
import type { GeminiAudioAttachment } from "@packages/../packages/ai/src/adapters/GeminiAdapter";

// ─── Constants ───────────────────────────────────────────────────────────────

const HISTORY_STORAGE_KEY = "@domus:ai_chat_history";
const MAX_STORED_MESSAGES = 200;

// ─── Persistence helpers ─────────────────────────────────────────────────────

async function loadHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function saveHistory(messages: ChatMessage[]): Promise<void> {
  try {
    // Keep only last N messages to avoid storage bloat
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

async function clearStoredHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseAIConsultantResult {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (
    text: string,
    wishlistItemPrice?: number | null,
    audioAttachment?: GeminiAudioAttachment,
  ) => Promise<void>;
  generateWelcome: () => Promise<ChatMessage | null>;
  clearHistory: () => void;
  addSystemMessage: (msg: ChatMessage) => void;
}

export function useAIConsultant(settings: AISettings): UseAIConsultantResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { domain, gamification, wishlist } = useAppState();
  const syncCtx = useSync();

  // historyRef = all messages (for display)
  const historyRef = useRef<ChatMessage[]>([]);
  // sessionRef = only messages from current session (for AI context)
  const sessionRef = useRef<ChatMessage[]>([]);

  // Load persisted history on mount
  useEffect(() => {
    loadHistory().then((stored) => {
      if (stored.length > 0) {
        historyRef.current = stored;
        setMessages([...stored]);
      }
    });
  }, []);

  // Reset circuit breaker when chat opens
  useEffect(() => {
    AIClientService.resetBreaker(settings.provider);
  }, [settings.provider]);

  const sendMessage = useCallback(
    async (text: string, wishlistItemPrice?: number | null, audioAttachment?: GeminiAudioAttachment): Promise<void> => {
      if (isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
        provider: settings.provider,
      };

      // Add to both history (display) and session (AI context)
      historyRef.current = [...historyRef.current, userMessage];
      sessionRef.current = [...sessionRef.current, userMessage];
      setMessages([...historyRef.current]);
      setIsLoading(true);

      try {
        const contextData: ContextData = {
          transactions: Object.values(domain.transactions ?? {}),
          accounts: Object.values(domain.accounts ?? {}),
          categories: domain.categories ?? {},
          invoices: domain.invoices ?? {},
          wishlist: wishlist,
          gamification: gamification,
          sync: toSyncInfo(syncCtx),
        };

        // Send only SESSION messages to AI (not full history) → controls cost
        const reply = await ConsultantChatUseCase.execute(
          text,
          sessionRef.current,
          contextData,
          wishlistItemPrice ?? null,
          settings,
          audioAttachment,
        );

        // Tag reply with provider
        reply.provider = settings.provider;
        // Add reply to both
        historyRef.current = [...historyRef.current, reply];
        sessionRef.current = [...sessionRef.current, reply];
        setMessages([...historyRef.current]);

        // Persist full history locally
        await saveHistory(historyRef.current);
      } catch {
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "Erro inesperado. Por favor, tente novamente.",
          timestamp: Date.now(),
          isLocalFallback: true,
          provider: settings.provider,
        };
        historyRef.current = [...historyRef.current, errorMsg];
        sessionRef.current = [...sessionRef.current, errorMsg];
        setMessages([...historyRef.current]);
        await saveHistory(historyRef.current);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, domain, gamification, wishlist, syncCtx, settings],
  );

  const generateWelcome = useCallback(async (): Promise<ChatMessage | null> => {
    const contextData: ContextData = {
      transactions: Object.values(domain.transactions ?? {}),
      accounts: Object.values(domain.accounts ?? {}),
      categories: domain.categories ?? {},
      invoices: domain.invoices ?? {},
      wishlist: wishlist,
      gamification: gamification,
      sync: toSyncInfo(syncCtx),
    };

    try {
      return await ConsultantChatUseCase.generateWelcome(contextData, settings);
    } catch {
      return null;
    }
  }, [domain, gamification, wishlist, syncCtx, settings]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    sessionRef.current = [];
    setMessages([]);
    clearStoredHistory();
  }, []);

  const addSystemMessage = useCallback((msg: ChatMessage) => {
    historyRef.current = [...historyRef.current, msg];
    setMessages([...historyRef.current]);
    saveHistory(historyRef.current);
  }, []);

  return { messages, isLoading, sendMessage, generateWelcome, clearHistory, addSystemMessage };
}
