import type { AIProvider } from "@packages/ai";
import type { OCRProvider } from "@packages/parsers";
import {
  SETTINGS_EVENTS,
  createSettingChangedEvent,
  type SettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import type { SyncEvent } from "@packages/storage/src/eventStore";

export const OCR_CONFIG_SETTING_KEY = "@domus:ocr_config" as const;

/**
 * Subconjunto estritamente seguro de `OCRConfig` permitido no log de eventos.
 *
 * Nunca inclui `cloudVisionApiKey` nem qualquer outro campo de chave ou segredo.
 */
export interface SyncedOCRConfig {
  preferredProvider?: OCRProvider | "vision_ai";
  cloudVisionEndpoint?: string;
  visionAIProvider?: AIProvider;
}

const VALID_OCR_PROVIDERS: readonly (OCRProvider | "vision_ai")[] = [
  "mlkit",
  "textrecognition",
  "tesseract",
  "cloudvision",
  "vision_ai",
];

const VALID_AI_PROVIDERS: readonly AIProvider[] = [
  "openai",
  "gemini",
  "claude",
  "deepseek",
  "qwen",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidOCRProvider(value: unknown): value is OCRProvider | "vision_ai" {
  return (
    typeof value === "string" &&
    (VALID_OCR_PROVIDERS as readonly string[]).includes(value)
  );
}

function isValidAIProvider(value: unknown): value is AIProvider {
  return (
    typeof value === "string" &&
    (VALID_AI_PROVIDERS as readonly string[]).includes(value)
  );
}

/**
 * Extrai e valida apenas os campos permitidos de `OCRConfig` pela allowlist
 * (`preferredProvider`, `cloudVisionEndpoint`, `visionAIProvider`).
 * Qualquer campo de chave (`cloudVisionApiKey`, `apiKey`, etc.) ou desconhecido é descartado.
 */
export function pickSyncedOCRConfig(input: unknown): SyncedOCRConfig {
  const result: SyncedOCRConfig = {};
  if (!isPlainObject(input)) return result;

  if (isValidOCRProvider(input.preferredProvider)) {
    result.preferredProvider = input.preferredProvider;
  }
  if (typeof input.cloudVisionEndpoint === "string") {
    const trimmed = input.cloudVisionEndpoint.trim();
    if (trimmed.length > 0) {
      result.cloudVisionEndpoint = trimmed;
    }
  }
  if (isValidAIProvider(input.visionAIProvider)) {
    result.visionAIProvider = input.visionAIProvider;
  }

  return result;
}

/**
 * Retorna `true` apenas se `changes` contiver ao menos um campo sincronizável válido.
 * Alterações exclusivas em `cloudVisionApiKey` retornam `false`.
 */
export function hasSyncedOCRConfigChanged(changes: unknown): boolean {
  return Object.keys(pickSyncedOCRConfig(changes)).length > 0;
}

/**
 * Resolve e sanitiza a configuração de OCR sincronizada a partir de `SettingsState`.
 */
export function resolveOCRConfigFromSettings(
  settings: SettingsState,
): SyncedOCRConfig | undefined {
  const raw = settings.values[OCR_CONFIG_SETTING_KEY];
  if (!isPlainObject(raw)) return undefined;
  const sanitized = pickSyncedOCRConfig(raw);
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function hasSettingChangedEvent(
  allEvents: readonly SyncEvent[],
  key: string,
): boolean {
  return allEvents.some(
    (evt) =>
      evt?.type === SETTINGS_EVENTS.SETTING_CHANGED &&
      isPlainObject(evt.payload) &&
      evt.payload.key === key,
  );
}

export interface BuildOCRConfigSeedInput {
  allEvents: readonly SyncEvent[];
  deviceId: string;
  ocrConfig?: Record<string, unknown> | Partial<SyncedOCRConfig> | null;
}

/**
 * Gera evento `SETTING_CHANGED` inicial para `@domus:ocr_config` quando o log ainda
 * não possui nenhum evento para essa chave, sempre aplicando sanitização estrita
 * por allowlist para nunca incluir `cloudVisionApiKey`.
 */
export function buildOCRConfigSeedEvents(
  input: BuildOCRConfigSeedInput,
): SettingChangedEvent[] {
  if (
    hasSettingChangedEvent(input.allEvents, OCR_CONFIG_SETTING_KEY) ||
    !input.ocrConfig
  ) {
    return [];
  }

  const sanitized = pickSyncedOCRConfig(input.ocrConfig);
  if (Object.keys(sanitized).length === 0) {
    return [];
  }

  return [
    createSettingChangedEvent(
      OCR_CONFIG_SETTING_KEY,
      sanitized,
      input.deviceId,
    ),
  ];
}
