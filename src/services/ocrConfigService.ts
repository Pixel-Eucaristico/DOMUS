import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CloudVisionConfig, OCRProvider } from "@packages/parsers";
import type { AIProvider } from "@packages/ai";

const OCR_CONFIG_KEY = "@domus:ocr_config";

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

export class OCRConfigService {
  /**
   * Carrega configuração do OCR
   */
  static async loadConfig(): Promise<OCRConfig> {
    try {
      const json = await AsyncStorage.getItem(OCR_CONFIG_KEY);
      if (!json) return DEFAULT_CONFIG;

      const config = JSON.parse(json) as OCRConfig;
      return config;
    } catch (error) {
      console.error("[OCRConfigService] Erro ao carregar config:", error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Salva configuração do OCR
   */
  static async saveConfig(config: Partial<OCRConfig>): Promise<void> {
    try {
      const currentConfig = await this.loadConfig();
      const newConfig = { ...currentConfig, ...config };
      await AsyncStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(newConfig));
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
  static async setPreferredProvider(provider: OCRProvider): Promise<void> {
    await this.saveConfig({ preferredProvider: provider });
  }

  /**
   * Verifica se Cloud Vision está configurado
   */
  static async isCloudVisionConfigured(): Promise<boolean> {
    const config = await this.loadConfig();
    return !!config.cloudVisionApiKey;
  }

  /**
   * Obtém configuração para Cloud Vision API
   */
  static async getCloudVisionConfig(): Promise<CloudVisionConfig | undefined> {
    const config = await this.loadConfig();
    if (!config.cloudVisionApiKey) return undefined;

    return {
      apiKey: config.cloudVisionApiKey,
      endpoint: config.cloudVisionEndpoint,
    };
  }
}
