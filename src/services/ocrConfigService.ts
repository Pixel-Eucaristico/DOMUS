import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";
import type { CloudVisionConfig, OCRProvider } from "@packages/parsers";
import type { AIProvider } from "@packages/ai";
import {
  hasSyncedOCRConfigChanged,
  pickSyncedOCRConfig,
  type SyncedOCRConfig,
} from "./syncedOCRConfig";

export const OCR_CONFIG_KEY = "@domus:ocr_config";
export const OCR_API_KEY_SECURE_KEY = "domus_ocr_cloud_vision_api_key";

export interface OCRConfig {
  preferredProvider: OCRProvider | "vision_ai";
  cloudVisionApiKey?: string;
  cloudVisionEndpoint?: string;
  /** When using vision_ai, which AI provider to use for OCR */
  visionAIProvider?: AIProvider;
}

const DEFAULT_CONFIG: OCRConfig = {
  preferredProvider: "mlkit",
};

const ocrConfigSyncListeners = new Set<(config: SyncedOCRConfig) => void>();
let cachedSyncedOCRConfig: SyncedOCRConfig | null = null;
let cachedSyncedOCRConfigPersisted = false;

function areSyncedOCRConfigsEqual(
  a: SyncedOCRConfig | null,
  b: SyncedOCRConfig,
): boolean {
  if (!a) return false;
  return (
    a.preferredProvider === b.preferredProvider &&
    a.cloudVisionEndpoint === b.cloudVisionEndpoint &&
    a.visionAIProvider === b.visionAIProvider
  );
}

/**
 * process.env.EXPO_OS é definido pelo compilador do Expo (no build nativo é "android"/"ios", na web é "web")
 * e dispensa importar react-native (testável no vitest).
 */
export const isWeb = (): boolean => process.env.EXPO_OS === "web";

/**
 * Lê a chave do OCR do armazenamento seguro (SecureStore no nativo, webSecrets na web).
 */
export async function loadSecureApiKey(): Promise<string | null> {
  if (isWeb()) {
    try {
      return await webSecrets.get(OCR_API_KEY_SECURE_KEY);
    } catch (error) {
      console.error("[OCRConfigService] Erro ao carregar chave do webSecrets:", error);
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(OCR_API_KEY_SECURE_KEY);
  } catch (error) {
    console.error("[OCRConfigService] Erro ao carregar chave do SecureStore:", error);
    return null;
  }
}

/**
 * Salva a chave do OCR exclusivamente no armazenamento seguro (SecureStore no nativo, webSecrets na web).
 */
export async function saveSecureApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (isWeb()) {
    const ok = await webSecrets.set(OCR_API_KEY_SECURE_KEY, trimmed);
    if (!ok) {
      throw new Error("Falha ao salvar chave do OCR em webSecrets.");
    }
    return;
  }
  await SecureStore.setItemAsync(OCR_API_KEY_SECURE_KEY, trimmed);
}

/**
 * Remove a chave do OCR do armazenamento seguro de forma idempotente.
 */
export async function deleteSecureApiKey(): Promise<void> {
  if (isWeb()) {
    try {
      await webSecrets.remove(OCR_API_KEY_SECURE_KEY);
    } catch {
      // chave pode não existir ou erro de storage na web
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(OCR_API_KEY_SECURE_KEY);
  } catch {
    // chave pode não existir no SecureStore
  }
}

export class OCRConfigService {
  static readonly OCR_CONFIG_KEY = OCR_CONFIG_KEY;
  static readonly OCR_API_KEY_SECURE_KEY = OCR_API_KEY_SECURE_KEY;

  static loadSecureApiKey = loadSecureApiKey;
  static saveSecureApiKey = saveSecureApiKey;
  static deleteSecureApiKey = deleteSecureApiKey;

  /**
   * Registra ouvinte para emitir `SETTING_CHANGED` quando o usuário altera
   * preferências sincronizáveis do OCR localmente.
   */
  static registerOCRConfigSyncListener(
    listener: (config: SyncedOCRConfig) => void,
  ): () => void {
    ocrConfigSyncListeners.add(listener);
    return () => {
      ocrConfigSyncListeners.delete(listener);
    };
  }

  /**
   * Retorna um snapshot sanitizado da configuração sincronizável de OCR atual
   * (sem `cloudVisionApiKey`), ou `null` se nenhuma configuração local foi salva ainda.
   */
  static async getSyncedOCRConfigSnapshot(): Promise<SyncedOCRConfig | null> {
    if (cachedSyncedOCRConfig !== null) {
      return pickSyncedOCRConfig(cachedSyncedOCRConfig);
    }
    try {
      const raw = await AsyncStorage.getItem(OCR_CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      const sanitized = pickSyncedOCRConfig(parsed);
      return Object.keys(sanitized).length > 0 ? sanitized : null;
    } catch {
      return null;
    }
  }

  /**
   * Aplica configuração de OCR vinda do log de eventos sincronizado.
   * Nunca sobrescreve nem apaga `cloudVisionApiKey` do armazenamento seguro e não
   * dispara o ouvinte de emissão de eventos (evita loops).
   */
  static async applySyncedOCRConfig(
    config: SyncedOCRConfig,
    persist: boolean = true,
  ): Promise<void> {
    const sanitized = pickSyncedOCRConfig(config);
    if (
      areSyncedOCRConfigsEqual(cachedSyncedOCRConfig, sanitized) &&
      (!persist || cachedSyncedOCRConfigPersisted)
    ) {
      return;
    }

    if (!persist) {
      cachedSyncedOCRConfig = { ...sanitized };
      cachedSyncedOCRConfigPersisted = false;
      return;
    }

    // Garante migração de chave legada em AsyncStorage antes de sobrescrever OCR_CONFIG_KEY
    if (cachedSyncedOCRConfig === null) {
      await this.loadConfig();
    }

    const nextStored: OCRConfig = {
      ...DEFAULT_CONFIG,
      ...sanitized,
    };
    try {
      await AsyncStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(nextStored));
      cachedSyncedOCRConfig = { ...sanitized };
      cachedSyncedOCRConfigPersisted = true;
    } catch (error) {
      cachedSyncedOCRConfig = { ...sanitized };
      cachedSyncedOCRConfigPersisted = false;
      console.error("[OCRConfigService] Erro ao persistir config sincronizada:", error);
    }
  }

  /**
   * Invalida o cache em memória para forçar releitura do armazenamento local
   * (ex.: ao sair do modo demo).
   */
  static invalidateSyncedOCRConfigCache(): void {
    cachedSyncedOCRConfig = null;
    cachedSyncedOCRConfigPersisted = false;
  }

  /**
   * Limpa a configuração local do OCR no reset do app sem emitir evento.
   */
  static async resetLocalOCRConfig(): Promise<void> {
    cachedSyncedOCRConfig = null;
    cachedSyncedOCRConfigPersisted = false;
    try {
      await AsyncStorage.removeItem(OCR_CONFIG_KEY);
    } catch (error) {
      console.error("[OCRConfigService] Erro ao limpar config local:", error);
    }
  }

  /**
   * Carrega configuração do OCR.
   * Migra automaticamente chaves legadas gravadas em AsyncStorage para o armazenamento seguro.
   */
  static async loadConfig(): Promise<OCRConfig> {
    try {
      if (cachedSyncedOCRConfig !== null) {
        const secureKey = await loadSecureApiKey();
        return {
          ...DEFAULT_CONFIG,
          ...cachedSyncedOCRConfig,
          cloudVisionApiKey: secureKey || undefined,
        };
      }

      const json = await AsyncStorage.getItem(OCR_CONFIG_KEY);
      let config: OCRConfig = json ? JSON.parse(json) : { ...DEFAULT_CONFIG };

      // Se houver chave legada no AsyncStorage, migra para armazenamento seguro
      if (config.cloudVisionApiKey) {
        const legacyKey = config.cloudVisionApiKey;
        try {
          await saveSecureApiKey(legacyKey);
          delete config.cloudVisionApiKey;
          await AsyncStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(config));
        } catch (migrationError) {
          console.error(
            "[OCRConfigService] Falha ao migrar chave legada para armazenamento seguro:",
            migrationError
          );
          // Em caso de falha, mantém a chave no AsyncStorage para não perder os dados do usuário
        }
      }

      const secureKey = await loadSecureApiKey();
      return {
        ...config,
        cloudVisionApiKey: secureKey || config.cloudVisionApiKey || undefined,
      };
    } catch (error) {
      console.error("[OCRConfigService] Erro ao carregar config:", error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Salva configuração do OCR.
   * Chave de API é salva estritamente no armazenamento seguro e sanitizada fora do AsyncStorage.
   */
  static async saveConfig(config: Partial<OCRConfig>): Promise<void> {
    try {
      const currentConfig = await this.loadConfig();

      if ("cloudVisionApiKey" in config) {
        const trimmedKey = config.cloudVisionApiKey?.trim();
        if (trimmedKey) {
          await saveSecureApiKey(trimmedKey);
        } else {
          await deleteSecureApiKey();
        }
      }

      const { cloudVisionApiKey: _currentKey, ...baseConfig } = currentConfig;
      const { cloudVisionApiKey: _newKey, ...safeUpdate } = config;
      const newConfig: Record<string, unknown> = { ...baseConfig, ...safeUpdate };
      delete newConfig.cloudVisionApiKey;

      // Se a chave não foi alterada nesta chamada, mas a migração anterior havia falhado
      // e o secure store ainda está sem ela, tenta migrar agora ou preserva temporariamente
      if (!("cloudVisionApiKey" in config) && currentConfig.cloudVisionApiKey) {
        const secureKey = await loadSecureApiKey();
        if (!secureKey) {
          try {
            await saveSecureApiKey(currentConfig.cloudVisionApiKey);
          } catch {
            // Preserva no AsyncStorage se o secure store ainda falhar
            newConfig.cloudVisionApiKey = currentConfig.cloudVisionApiKey;
          }
        }
      }

      await AsyncStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(newConfig));

      const sanitizedNewConfig = pickSyncedOCRConfig(newConfig);
      if (cachedSyncedOCRConfig !== null) {
        cachedSyncedOCRConfig = { ...sanitizedNewConfig };
        cachedSyncedOCRConfigPersisted = true;
      }

      if (
        hasSyncedOCRConfigChanged(config) ||
        "cloudVisionEndpoint" in config ||
        "visionAIProvider" in config
      ) {
        ocrConfigSyncListeners.forEach((listener) =>
          listener({ ...sanitizedNewConfig }),
        );
      }
    } catch (error) {
      console.error("[OCRConfigService] Erro ao salvar config:", error);
      throw error;
    }
  }

  /**
   * Atualiza API key do Cloud Vision
   */
  static async setCloudVisionApiKey(apiKey: string): Promise<void> {
    await this.saveConfig({ cloudVisionApiKey: apiKey });
  }

  /**
   * Remove API key do Cloud Vision
   */
  static async clearCloudVisionApiKey(): Promise<void> {
    await this.saveConfig({ cloudVisionApiKey: undefined });
  }

  /**
   * Atualiza provedor preferido
   */
  static async setPreferredProvider(provider: OCRProvider | "vision_ai"): Promise<void> {
    await this.saveConfig({ preferredProvider: provider });
  }

  /**
   * Verifica se Cloud Vision está configurado
   */
  static async isCloudVisionConfigured(): Promise<boolean> {
    const config = await this.loadConfig();
    return Boolean(config.cloudVisionApiKey && config.cloudVisionApiKey.trim().length > 0);
  }

  /**
   * Obtém configuração para Cloud Vision API
   */
  static async getCloudVisionConfig(): Promise<CloudVisionConfig | undefined> {
    const config = await this.loadConfig();
    const apiKey = config.cloudVisionApiKey?.trim();
    if (!apiKey) return undefined;

    return {
      apiKey,
      endpoint: config.cloudVisionEndpoint,
    };
  }
}
