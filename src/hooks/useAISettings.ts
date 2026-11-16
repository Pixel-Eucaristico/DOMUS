import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { AIClientService } from "@/src/modules/ai/application/AIClientService";
import type { AISettings } from "@/src/modules/ai/domain/AISettings";
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_AI_DATA_PERMISSIONS,
  AI_SETTINGS_STORE_KEY,
} from "@/src/modules/ai/domain/AISettings";
import {
  hasSyncedAISettingsChanged,
  mergeSyncedAISettings,
  resolveAISettingsFromSettings,
} from "@/src/modules/ai/domain/syncedAISettings";
import { useAppStateOptional } from "@/src/context/AppStateProvider";
import { slotForAIProvider } from "@/src/modules/strongGroup/keySyncPublisher";
import type { AIProvider } from "@packages/ai";

const ALL_PROVIDERS: AIProvider[] = ["openai", "gemini", "claude", "deepseek", "qwen"];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAISettingsResult {
  settings: AISettings;
  isLoading: boolean;
  /** Encrypts and stores an API key. Returns false if biometric auth fails. */
  saveApiKey: (provider: AIProvider, key: string) => Promise<boolean>;
  deleteApiKey: (provider: AIProvider) => Promise<void>;
  updateSettings: (changes: Partial<Omit<AISettings, "apiKeyStatus">>) => Promise<void>;
  /** Force reload settings from SecureStore (useful when returning from settings screen) */
  reload: () => void;
}

export function useAISettings(): UseAISettingsResult {
  const appState = useAppStateOptional();
  const syncedSettingsState = appState?.settings;
  const setSyncedAISettings = appState?.setAISettings;
  const syncSavedKey = appState?.syncSavedKey;
  const isDemoActive = appState?.isDemoActive ?? false;

  const syncedAISettings = useMemo(
    () => (syncedSettingsState ? resolveAISettingsFromSettings(syncedSettingsState) : undefined),
    [syncedSettingsState],
  );
  const syncedAISettingsRef = useRef(syncedAISettings);
  syncedAISettingsRef.current = syncedAISettings;

  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await SecureStorageService.get(AI_SETTINGS_STORE_KEY);
        const stored = raw
          ? (JSON.parse(raw) as AISettings & { hasApiKey?: boolean })
          : ({ ...DEFAULT_AI_SETTINGS } as AISettings & { hasApiKey?: boolean });

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

        // Check if ElevenLabs key exists
        const hasElevenLabs = await SecureKeyService.hasKey("elevenlabs" as any);

        if (mounted) {
          const loaded: AISettings = {
            provider: stored.provider ?? DEFAULT_AI_SETTINGS.provider,
            modelTier: stored.modelTier ?? DEFAULT_AI_SETTINGS.modelTier,
            apiKeyStatus,
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
          };
          const initialSynced = syncedAISettingsRef.current;
          const merged = initialSynced ? mergeSyncedAISettings(loaded, initialSynced) : loaded;
          setSettings(merged);
          if (initialSynced && !isDemoActive) {
            void SecureStorageService.set(AI_SETTINGS_STORE_KEY, JSON.stringify(merged));
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

  // Aplica preferências de IA vindas do log sincronizado preservando consentimento e chaves locais
  useEffect(() => {
    if (isLoading || !syncedAISettings) return;
    const merged = mergeSyncedAISettings(settingsRef.current, syncedAISettings);
    if (JSON.stringify(merged) === JSON.stringify(settingsRef.current)) return;
    setSettings(merged);
    settingsRef.current = merged;
    if (!isDemoActive) {
      void SecureStorageService.set(AI_SETTINGS_STORE_KEY, JSON.stringify(merged));
    }
  }, [isLoading, syncedAISettings, isDemoActive]);

  const persist = useCallback(
    async (next: AISettings) => {
      setSettings(next);
      settingsRef.current = next;
      if (!isDemoActive) {
        await SecureStorageService.set(AI_SETTINGS_STORE_KEY, JSON.stringify(next));
      }
    },
    [isDemoActive],
  );

  const saveApiKey = useCallback(
    async (provider: AIProvider, key: string): Promise<boolean> => {
      try {
        await SecureKeyService.storeKey(provider, key);
        AIClientService.resetBreaker(provider);
        const next: AISettings = {
          ...settingsRef.current,
          apiKeyStatus: { ...settingsRef.current.apiKeyStatus, [provider]: true },
          isEnabled: true,
          systemPromptSent: false,
        };
        await persist(next);
        const slot = slotForAIProvider(provider as string);
        if (slot && syncSavedKey) {
          void syncSavedKey(slot, key);
        }
        return true;
      } catch {
        return false;
      }
    },
    [persist, syncSavedKey],
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

  const updateSettings = useCallback(
    async (changes: Partial<Omit<AISettings, "apiKeyStatus">>): Promise<void> => {
      const next = { ...settingsRef.current, ...changes };
      await persist(next);
      if (setSyncedAISettings && hasSyncedAISettingsChanged(changes)) {
        setSyncedAISettings(next);
      }
    },
    [persist, setSyncedAISettings],
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
    updateSettings,
    reload,
  };
}
