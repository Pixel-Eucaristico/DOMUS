import type { AIModelTier, AIProvider, AudioProvider } from "@packages/ai";
import {
  SETTINGS_EVENTS,
  createSettingChangedEvent,
  type SettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { AISettings, BudgetMode, OpenAIVoice } from "./AISettings";

export const AI_SETTINGS_SETTING_KEY = "domus_ai_settings_v1" as const;
export const AI_CUSTOM_PRICES_SETTING_KEY = "domus_ai_custom_prices" as const;

export type CustomPrices = Partial<Record<AIProvider, Partial<Record<AIModelTier, number>>>>;

/**
 * Subconjunto estritamente seguro de `AISettings` permitido no log de eventos.
 *
 * Nunca inclui `dataPermissions` (`AIDataPermissions`), `apiKeyStatus`,
 * `elevenLabsKeyStatus`, `systemPromptSent`, `isEnabled`, chaves de API,
 * tokens OAuth ou contadores de uso.
 */
export interface SyncedAISettings {
  provider?: AIProvider;
  modelTier?: AIModelTier;
  voiceEnabled?: boolean;
  openaiVoice?: OpenAIVoice;
  audioProvider?: AudioProvider;
  audioVoice?: string;
  autoPlayTTS?: boolean;
  tooltipsEnabled?: boolean;
  visionOCREnabled?: boolean;
  budgetMode?: BudgetMode;
  customBudgets?: Partial<Record<AIProvider, number>>;
  monthlyBudgets?: Partial<Record<AIProvider, number>>;
  billingDay?: number;
}

const VALID_AI_PROVIDERS: readonly AIProvider[] = ["openai", "gemini", "claude", "deepseek", "qwen"];
const VALID_MODEL_TIERS: readonly AIModelTier[] = ["fast", "smart"];
const VALID_AUDIO_PROVIDERS: readonly AudioProvider[] = ["openai", "elevenlabs", "gemini"];
const VALID_BUDGET_MODES: readonly BudgetMode[] = ["daily", "monthly"];
const VALID_OPENAI_VOICES: readonly OpenAIVoice[] = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidProvider(value: unknown): value is AIProvider {
  return typeof value === "string" && (VALID_AI_PROVIDERS as readonly string[]).includes(value);
}

function isValidModelTier(value: unknown): value is AIModelTier {
  return typeof value === "string" && (VALID_MODEL_TIERS as readonly string[]).includes(value);
}

function isValidAudioProvider(value: unknown): value is AudioProvider {
  return typeof value === "string" && (VALID_AUDIO_PROVIDERS as readonly string[]).includes(value);
}

function isValidBudgetMode(value: unknown): value is BudgetMode {
  return typeof value === "string" && (VALID_BUDGET_MODES as readonly string[]).includes(value);
}

function isValidOpenAIVoice(value: unknown): value is OpenAIVoice {
  return typeof value === "string" && (VALID_OPENAI_VOICES as readonly string[]).includes(value);
}

function sanitizeBudgetsMap(raw: unknown): Partial<Record<AIProvider, number>> | undefined {
  if (!isPlainObject(raw)) return undefined;
  const sanitized: Partial<Record<AIProvider, number>> = {};
  for (const provider of VALID_AI_PROVIDERS) {
    const val = raw[provider];
    if (typeof val === "number" && Number.isFinite(val) && val >= 0) {
      sanitized[provider] = val;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Extrai e valida apenas os campos permitidos de `AISettings` pela allowlist.
 * Qualquer campo sensível (`dataPermissions`, `apiKeyStatus`, `elevenLabsKeyStatus`,
 * `systemPromptSent`, `isEnabled`) ou desconhecido é descartado.
 */
export function pickSyncedAISettings(
  input: Partial<AISettings> | Record<string, unknown>,
): SyncedAISettings {
  const result: SyncedAISettings = {};
  if (!isPlainObject(input)) return result;

  if (isValidProvider(input.provider)) {
    result.provider = input.provider;
  }
  if (isValidModelTier(input.modelTier)) {
    result.modelTier = input.modelTier;
  }
  if (typeof input.voiceEnabled === "boolean") {
    result.voiceEnabled = input.voiceEnabled;
  }
  if (isValidOpenAIVoice(input.openaiVoice)) {
    result.openaiVoice = input.openaiVoice;
  }
  if (isValidAudioProvider(input.audioProvider)) {
    result.audioProvider = input.audioProvider;
  }
  if (typeof input.audioVoice === "string") {
    result.audioVoice = input.audioVoice;
  }
  if (typeof input.autoPlayTTS === "boolean") {
    result.autoPlayTTS = input.autoPlayTTS;
  }
  if (typeof input.tooltipsEnabled === "boolean") {
    result.tooltipsEnabled = input.tooltipsEnabled;
  }
  if (typeof input.visionOCREnabled === "boolean") {
    result.visionOCREnabled = input.visionOCREnabled;
  }
  if (isValidBudgetMode(input.budgetMode)) {
    result.budgetMode = input.budgetMode;
  }
  const customBudgets = sanitizeBudgetsMap(input.customBudgets);
  if (customBudgets !== undefined) {
    result.customBudgets = customBudgets;
  }
  const monthlyBudgets = sanitizeBudgetsMap(input.monthlyBudgets);
  if (monthlyBudgets !== undefined) {
    result.monthlyBudgets = monthlyBudgets;
  }
  if (
    typeof input.billingDay === "number" &&
    Number.isInteger(input.billingDay) &&
    input.billingDay >= 1 &&
    input.billingDay <= 31
  ) {
    result.billingDay = input.billingDay;
  }

  return result;
}

/**
 * Retorna `true` apenas se `changes` contiver ao menos um campo sincronizável válido.
 * Alterações exclusivas em `dataPermissions` ou `systemPromptSent` retornam `false`.
 */
export function hasSyncedAISettingsChanged(
  changes: Partial<AISettings> | Record<string, unknown>,
): boolean {
  return Object.keys(pickSyncedAISettings(changes)).length > 0;
}

export function resolveAISettingsFromSettings(
  settings: SettingsState,
): SyncedAISettings | undefined {
  const raw = settings.values[AI_SETTINGS_SETTING_KEY];
  if (!isPlainObject(raw)) return undefined;
  return pickSyncedAISettings(raw);
}

/**
 * Sanitiza um mapa de preços personalizados (`CustomPrices`), mantendo apenas
 * provedores válidos, tiers válidos (`fast` | `smart`) e valores finitos `> 0`.
 */
export function sanitizeCustomPrices(raw: unknown): CustomPrices | undefined {
  if (!isPlainObject(raw)) return undefined;
  const sanitized: CustomPrices = {};
  for (const provider of VALID_AI_PROVIDERS) {
    const tierMap = raw[provider];
    if (!isPlainObject(tierMap)) continue;
    const cleanTiers: Partial<Record<AIModelTier, number>> = {};
    for (const tier of VALID_MODEL_TIERS) {
      const price = tierMap[tier];
      if (typeof price === "number" && Number.isFinite(price) && price > 0) {
        cleanTiers[tier] = price;
      }
    }
    if (Object.keys(cleanTiers).length > 0) {
      sanitized[provider] = cleanTiers;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function resolveCustomPricesFromSettings(
  settings: SettingsState,
): CustomPrices | undefined {
  return sanitizeCustomPrices(settings.values[AI_CUSTOM_PRICES_SETTING_KEY]);
}

/**
 * Aplica preferências sincronizadas sobre `AISettings` local preservando
 * estritamente consentimento (`dataPermissions`), status de chaves (`apiKeyStatus`,
 * `elevenLabsKeyStatus`), `isEnabled` e `systemPromptSent` locais.
 */
export function mergeSyncedAISettings(
  local: AISettings,
  synced: SyncedAISettings,
): AISettings {
  const safeSynced = pickSyncedAISettings(synced);
  return {
    ...local,
    ...safeSynced,
    dataPermissions: local.dataPermissions,
    apiKeyStatus: local.apiKeyStatus,
    elevenLabsKeyStatus: local.elevenLabsKeyStatus,
    systemPromptSent: local.systemPromptSent,
    isEnabled: local.isEnabled,
  };
}

function hasSettingChangedEvent(allEvents: readonly SyncEvent[], key: string): boolean {
  return allEvents.some(
    (evt) =>
      evt?.type === SETTINGS_EVENTS.SETTING_CHANGED &&
      isPlainObject(evt.payload) &&
      evt.payload.key === key,
  );
}

export interface BuildAISettingsSeedInput {
  allEvents: readonly SyncEvent[];
  deviceId: string;
  aiSettings?: Partial<AISettings> | null;
  customPrices?: CustomPrices | null;
}

/**
 * Gera eventos `SETTING_CHANGED` iniciais para `domus_ai_settings_v1` e
 * `domus_ai_custom_prices` quando o log ainda não possui nenhum evento para
 * cada chave correspondente, sempre aplicando sanitização estrita por allowlist.
 */
export function buildAISettingsSeedEvents(
  input: BuildAISettingsSeedInput,
): SettingChangedEvent[] {
  const events: SettingChangedEvent[] = [];

  if (!hasSettingChangedEvent(input.allEvents, AI_SETTINGS_SETTING_KEY) && input.aiSettings) {
    const sanitizedSettings = pickSyncedAISettings(input.aiSettings);
    if (Object.keys(sanitizedSettings).length > 0) {
      events.push(
        createSettingChangedEvent(
          AI_SETTINGS_SETTING_KEY,
          sanitizedSettings,
          input.deviceId,
        ),
      );
    }
  }

  if (!hasSettingChangedEvent(input.allEvents, AI_CUSTOM_PRICES_SETTING_KEY) && input.customPrices) {
    const sanitizedPrices = sanitizeCustomPrices(input.customPrices);
    if (sanitizedPrices && Object.keys(sanitizedPrices).length > 0) {
      events.push(
        createSettingChangedEvent(
          AI_CUSTOM_PRICES_SETTING_KEY,
          sanitizedPrices,
          input.deviceId,
        ),
      );
    }
  }

  return events;
}
