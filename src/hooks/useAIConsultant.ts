import { useState, useCallback, useRef } from "react";
import { ConsultantChatUseCase } from "@/src/modules/ai/application/ConsultantChatUseCase";
import { useAppState } from "@/src/context/AppStateProvider";
import { useSync } from "@/src/context/SyncProvider";
import type { ChatMessage } from "@packages/ai";
import type { AISettings } from "@/src/modules/ai/domain/AISettings";
import type { ContextData } from "@/src/modules/ai/application/AIContextBuilder";
import { generateId } from "@packages/events/src/factory";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAIConsultantResult {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (
    text: string,
    wishlistItemPrice?: number | null,
  ) => Promise<void>;
  generateWelcome: () => Promise<ChatMessage | null>;
  clearHistory: () => void;
}

export function useAIConsultant(settings: AISettings): UseAIConsultantResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { domain, gamification, wishlist } = useAppState();
  const syncCtx = useSync();
  const historyRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(
    async (text: string, wishlistItemPrice?: number | null): Promise<void> => {
      if (isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const nextMessages = [...historyRef.current, userMessage];
      historyRef.current = nextMessages;
      setMessages([...nextMessages]);
      setIsLoading(true);

      try {
        const contextData: ContextData = {
          transactions: Object.values(domain.transactions ?? {}),
          accounts: Object.values(domain.accounts ?? {}),
          categories: domain.categories ?? {},
          invoices: domain.invoices ?? {},
          wishlist: wishlist,
          gamification: gamification,
          sync: {
            groupId: syncCtx.groupId,
            eventCount: syncCtx.eventCount,
            relayCount: syncCtx.relayCount,
            isAutoSyncEnabled: syncCtx.isAutoSyncEnabled,
            lastSyncTime: syncCtx.lastSyncTime,
          },
        };

        const reply = await ConsultantChatUseCase.execute(
          text,
          historyRef.current,
          contextData,
          wishlistItemPrice ?? null,
          settings,
        );

        const withReply = [...historyRef.current, reply];
        historyRef.current = withReply;
        setMessages([...withReply]);
      } catch {
        // ConsultantChatUseCase never throws, but guard anyway
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "Erro inesperado. Por favor, tente novamente.",
          timestamp: Date.now(),
          isLocalFallback: true,
        };
        const withError = [...historyRef.current, errorMsg];
        historyRef.current = withError;
        setMessages([...withError]);
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
      sync: {
        groupId: syncCtx.groupId,
        eventCount: syncCtx.eventCount,
        relayCount: syncCtx.relayCount,
        isAutoSyncEnabled: syncCtx.isAutoSyncEnabled,
        lastSyncTime: syncCtx.lastSyncTime,
      },
    };

    try {
      return await ConsultantChatUseCase.generateWelcome(contextData, settings);
    } catch {
      return null;
    }
  }, [domain, gamification, wishlist, syncCtx, settings]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, generateWelcome, clearHistory };
}
