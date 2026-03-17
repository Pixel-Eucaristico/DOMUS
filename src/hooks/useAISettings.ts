import { useState, useCallback, useEffect, useRef } from "react";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { OpenAIOAuthService } from "@/src/modules/ai/infrastructure/OpenAIOAuthService";
import { AIClientService } from "@/src/modules/ai/application/AIClientService";
import type { AISettings, AIDataPermissions } from "@/src/modules/ai/domain/AISettings";
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_AI_DATA_PERMISSIONS,
  AI_SETTINGS_STORE_KEY,
  hasActiveKey,
} from "@/src/modules/ai/domain/AISettings";
import type { AIProvider } from "@packages/ai";

const ALL_PROVIDERS: AIProvider[] = ["openai", "gemini", "claude", "deepseek", "qwen"];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAISettingsResult {
  settings: AISettings;
  isLoading: boolean;
  /** Encrypts and stores an API key. Returns false if biometric auth fails. */
  saveApiKey: (provider: AIProvider, key: string) => Promise<boolean>;
  deleteApiKey: (provider: AIProvider) => Promise<void>;
  /** Start OpenAI Device Code login (ChatGPT subscription). Calls onCode with the code to display. */
  loginWithChatGPT: (onCode: (code: string, verifyUrl: string) => void) => Promise<boolean>;
  /** Logout from ChatGPT OAuth session. */
  logoutChatGPT: () => Promise<void>;
  updateSettings: (changes: Partial<Omit<AISettings, "apiKeyStatus">>) => Promise<void>;
  /** Force reload settings from SecureStore (useful when returning from settings screen) */
  reload: () => void;
}

export function useAISettings(): UseAISettingsResult {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await SecureStorageService.get(AI_SETTINGS_STORE_KEY);
        if (raw && mounted) {
          const stored = JSON.parse(raw) as AISettings & { hasApiKey?: boolean };

          // Migration: convert old hasApiKey boolean to per-provider apiKeyStatus
          if (!stored.apiKeyStatus && "hasApiKey" in stored) {
            const apiKeyStatus: Partial<Record<AIProvider, boolean>> = {};
            if (stored.hasApiKey) {
              apiKeyStatus[stored.provider] = true;
            }
            stored.apiKeyStatus = apiKeyStatus;
          }

          // Re-check apiKeyStatus from SecureStore for all providers
          const apiKeyStatus: Partial<Record<AIProvider, boolean>> = {};
          for (const p of ALL_PROVIDERS) {
            const has = await SecureKeyService.hasKey(p);
            if (has) apiKeyStatus[p] = true;
          }

          // Check OAuth session
          const hasOAuth = await OpenAIOAuthService.hasSession();

          // Check if ElevenLabs key exists
          const hasElevenLabs = await SecureKeyService.hasKey("elevenlabs" as any);

          if (mounted) {
            setSettings({
              provider: stored.provider ?? DEFAULT_AI_SETTINGS.provider,
              modelTier: stored.modelTier ?? DEFAULT_AI_SETTINGS.modelTier,
              apiKeyStatus,
              openaiAuthMethod: stored.openaiAuthMethod ?? "apikey",
              hasOAuthSession: hasOAuth,
              isEnabled: stored.isEnabled ?? false,
              dataPermissions: stored.dataPermissions ?? { ...DEFAULT_AI_DATA_PERMISSIONS },
              customBudgets: stored.customBudgets,
              budgetMode: stored.budgetMode,
              monthlyBudgets: stored.monthlyBudgets,
              billingDay: stored.billingDay,
              systemPromptSent: stored.systemPromptSent ?? false,
              voiceEnabled: stored.voiceEnabled ?? false,
              openaiVoice: stored.openaiVoice,
              // Audio provider settings (new fields)
              audioProvider: stored.audioProvider,
              audioVoice: stored.audioVoice,
              elevenLabsKeyStatus: hasElevenLabs || undefined,
              // Feature toggles
              visionOCREnabled: stored.visionOCREnabled,
              tooltipsEnabled: stored.tooltipsEnabled,
              autoPlayTTS: stored.autoPlayTTS,
            });
          }
        } else if (mounted) {
          // No stored settings — still check OAuth
          const hasOAuth = await OpenAIOAuthService.hasSession();
          if (hasOAuth) {
            setSettings((prev) => ({ ...prev, hasOAuthSession: true }));
          }
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
  }, [reloadKey]);

  // Use ref to avoid stale closure in callbacks
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const persist = useCallback(async (next: AISettings) => {
    setSettings(next);
    settingsRef.current = next;
    await SecureStorageService.set(AI_SETTINGS_STORE_KEY, JSON.stringify(next));
  }, []);

  const saveApiKey = useCallback(
    async (provider: AIProvider, key: string): Promise<boolean> => {
      try {
        await SecureKeyService.storeKey(provider, key);
        AIClientService.resetBreaker(provider);
        const next: AISettings = {
          ...settingsRef.current,
          apiKeyStatus: { ...settingsRef.current.apiKeyStatus, [provider]: true },
          // If saving OpenAI key, switch to apikey method
          ...(provider === "openai" ? { openaiAuthMethod: "apikey" as const } : {}),
          isEnabled: true,
          systemPromptSent: false,
        };
        await persist(next);
        return true;
      } catch {
        return false;
      }
    },
    [persist],
  );

  const deleteApiKey = useCallback(
    async (provider: AIProvider): Promise<void> => {
      await SecureKeyService.deleteKey(provider);
      const nextStatus = { ...settingsRef.current.apiKeyStatus, [provider]: false };
      const isActiveProvider = settingsRef.current.provider === provider;
      const next: AISettings = {
        ...settingsRef.current,
        apiKeyStatus: nextStatus,
        isEnabled: isActiveProvider ? false : settingsRef.current.isEnabled,
      };
      await persist(next);
    },
    [persist],
  );

  const loginWithChatGPT = useCallback(
    async (onCode: (code: string, verifyUrl: string) => void): Promise<boolean> => {
      const tokens = await OpenAIOAuthService.loginWithDeviceCode(onCode);
      if (!tokens) return false;

      AIClientService.resetBreaker("openai");
      const next: AISettings = {
        ...settingsRef.current,
        provider: "openai",
        openaiAuthMethod: "chatgpt_oauth",
        hasOAuthSession: true,
        isEnabled: true,
        systemPromptSent: false,
      };
      await persist(next);
      return true;
    },
    [persist],
  );

  const logoutChatGPT = useCallback(async (): Promise<void> => {
    await OpenAIOAuthService.logout();
    const wasUsingOAuth =
      settingsRef.current.provider === "openai" && settingsRef.current.openaiAuthMethod === "chatgpt_oauth";
    const next: AISettings = {
      ...settings,
      openaiAuthMethod: "apikey",
      hasOAuthSession: false,
      isEnabled: wasUsingOAuth ? false : settingsRef.current.isEnabled,
    };
    await persist(next);
  }, [settings, persist]);

  const updateSettings = useCallback(
    async (changes: Partial<Omit<AISettings, "apiKeyStatus">>): Promise<void> => {
      const next = { ...settingsRef.current, ...changes };
      await persist(next);
    },
    [persist],
  );

  const reload = useCallback(() => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return {
    settings,
    isLoading,
    saveApiKey,
    deleteApiKey,
    loginWithChatGPT,
    logoutChatGPT,
    updateSettings,
    reload,
  };
}
