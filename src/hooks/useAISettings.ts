import { useState, useCallback, useEffect } from "react";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { AIClientService } from "@/src/modules/ai/application/AIClientService";
import type { AISettings } from "@/src/modules/ai/domain/AISettings";
import {
  DEFAULT_AI_SETTINGS,
  AI_SETTINGS_STORE_KEY,
} from "@/src/modules/ai/domain/AISettings";
import type { AIProvider } from "@packages/ai";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAISettingsResult {
  settings: AISettings;
  isLoading: boolean;
  /** Encrypts and stores an API key. Returns false if biometric auth fails. */
  saveApiKey: (provider: AIProvider, key: string) => Promise<boolean>;
  deleteApiKey: (provider: AIProvider) => Promise<void>;
  updateSettings: (changes: Partial<Omit<AISettings, "hasApiKey">>) => Promise<void>;
}

export function useAISettings(): UseAISettingsResult {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await SecureStorageService.get(AI_SETTINGS_STORE_KEY);
        if (raw && mounted) {
          const stored = JSON.parse(raw) as AISettings;
          // Re-check hasApiKey from SecureStore (key may have been deleted externally)
          const hasKey = await SecureKeyService.hasKey(stored.provider);
          setSettings({ ...stored, hasApiKey: hasKey });
        }
      } catch {
        // Use defaults on error
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: AISettings) => {
    setSettings(next);
    await SecureStorageService.set(AI_SETTINGS_STORE_KEY, JSON.stringify(next));
  }, []);

  const saveApiKey = useCallback(
    async (provider: AIProvider, key: string): Promise<boolean> => {
      try {
        await SecureKeyService.storeKey(provider, key);
        // Reset circuit breaker so a fresh attempt is made
        AIClientService.resetBreaker(provider);
        const next: AISettings = {
          ...settings,
          provider,
          hasApiKey: true,
          isEnabled: true,
          systemPromptSent: false,
        };
        await persist(next);
        return true;
      } catch {
        return false;
      }
    },
    [settings, persist],
  );

  const deleteApiKey = useCallback(
    async (provider: AIProvider): Promise<void> => {
      await SecureKeyService.deleteKey(provider);
      const next: AISettings = {
        ...settings,
        hasApiKey: false,
        isEnabled: false,
      };
      await persist(next);
    },
    [settings, persist],
  );

  const updateSettings = useCallback(
    async (changes: Partial<Omit<AISettings, "hasApiKey">>): Promise<void> => {
      const next = { ...settings, ...changes };
      await persist(next);
    },
    [settings, persist],
  );

  return { settings, isLoading, saveApiKey, deleteApiKey, updateSettings };
}
