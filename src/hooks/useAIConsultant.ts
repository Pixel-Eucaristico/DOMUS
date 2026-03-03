import { useState, useCallback, useRef } from "react";
import { ConsultantChatUseCase } from "@/src/modules/ai/application/ConsultantChatUseCase";
import { useAppState } from "@/src/context/AppStateProvider";
import type { ChatMessage } from "@packages/ai";
import type { AISettings } from "@/src/modules/ai/domain/AISettings";
import { generateId } from "@packages/events/src/factory";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAIConsultantResult {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (
    text: string,
    wishlistItemPrice?: number | null,
  ) => Promise<void>;
  clearHistory: () => void;
}

export function useAIConsultant(settings: AISettings): UseAIConsultantResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { domain } = useAppState();
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
        const transactions = Object.values(domain.transactions ?? {});
        const accounts = Object.values(domain.accounts ?? {});
        const categories = domain.categories ?? {};

        const reply = await ConsultantChatUseCase.execute(
          text,
          historyRef.current,
          transactions,
          accounts,
          categories,
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
    [isLoading, domain, settings],
  );

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearHistory };
}
