import type { OCRAdapter, OCRResult } from "./types";

/**
 * Configuração para Cloud Vision API (opcional)
 */
export interface CloudVisionConfig {
  apiKey: string;
  endpoint?: string;
}

/**
 * Opções de OCR disponíveis
 */
export type OCRProvider = "mlkit" | "tesseract" | "cloudvision";

/**
 * Configuração do adaptador híbrido
 */
export interface HybridOCRConfig {
  preferredProvider?: OCRProvider;
  fallbackProviders?: OCRProvider[];
  cloudVisionConfig?: CloudVisionConfig;
}

/**
 * Adaptador OCR Híbrido que tenta múltiplos provedores
 */
export class HybridOCRAdapter implements OCRAdapter {
  private config: HybridOCRConfig;

  constructor(config: HybridOCRConfig = {}) {
    this.config = {
      preferredProvider: config.preferredProvider || "mlkit",
      fallbackProviders: config.fallbackProviders || ["tesseract"],
      cloudVisionConfig: config.cloudVisionConfig,
    };
  }

  async recognizeText(imageUri: string): Promise<OCRResult> {
    const providers = [
      this.config.preferredProvider!,
      ...(this.config.fallbackProviders || []),
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(`[HybridOCR] Tentando provedor: ${provider}`);
        const result = await this.recognizeWithProvider(imageUri, provider);

        // Se confidence >= 60%, aceitar resultado
        if (result.confidence >= 0.6) {
          console.log(`[HybridOCR] Sucesso com ${provider} (confidence: ${result.confidence})`);
          return result;
        }

        console.log(`[HybridOCR] Confidence baixa com ${provider} (${result.confidence}), tentando próximo...`);
      } catch (error) {
        console.warn(`[HybridOCR] Erro com ${provider}:`, error);
        lastError = error as Error;
      }
    }

    // Se nenhum provedor funcionou, lançar erro
    throw new Error(
      `Falha em todos os provedores OCR. Último erro: ${lastError?.message || "Desconhecido"}`
    );
  }

  private async recognizeWithProvider(
    imageUri: string,
    provider: OCRProvider
  ): Promise<OCRResult> {
    switch (provider) {
      case "mlkit":
        return await this.recognizeWithMLKit(imageUri);
      case "tesseract":
        return await this.recognizeWithTesseract(imageUri);
      case "cloudvision":
        if (!this.config.cloudVisionConfig?.apiKey) {
          throw new Error("Cloud Vision API key não configurada");
        }
        return await this.recognizeWithCloudVision(imageUri);
      default:
        throw new Error(`Provedor desconhecido: ${provider}`);
    }
  }

  /**
   * Google ML Kit - Offline, gratuito, alta precisão
   */
  private async recognizeWithMLKit(imageUri: string): Promise<OCRResult> {
    console.log("[MLKit] Processando imagem com ML Kit nativo...");

    try {
      // Importar ML Kit dinamicamente
      const TextRecognition = await import("@react-native-ml-kit/text-recognition");

      // Reconhecer texto da imagem
      const result = await TextRecognition.default.recognize(imageUri);

      // Extrair todo o texto
      const fullText = result.text;

      // Calcular confidence médio dos blocos
      let totalConfidence = 0;
      let blockCount = 0;

      for (const block of result.blocks) {
        if (block.confidence !== undefined) {
          totalConfidence += block.confidence;
          blockCount++;
        }
      }

      const averageConfidence = blockCount > 0 ? totalConfidence / blockCount : 0.8;

      console.log("[MLKit] Texto extraído com sucesso. Confidence:", averageConfidence);

      return {
        text: fullText,
        confidence: averageConfidence,
      };
    } catch (error) {
      console.error("[MLKit] Erro ao processar imagem:", error);
      throw new Error(`ML Kit falhou: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Tesseract - Open source, gratuito, funciona em qualquer plataforma
   */
  private async recognizeWithTesseract(imageUri: string): Promise<OCRResult> {
    console.log("[Tesseract] Processando imagem com Tesseract.js...");

    try {
      // Importar Tesseract dinamicamente
      const Tesseract = await import("tesseract.js");

      // Criar worker
      const worker = await Tesseract.createWorker("por", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            console.log(`[Tesseract] Progresso: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Reconhecer texto
      const { data } = await worker.recognize(imageUri);

      // Finalizar worker
      await worker.terminate();

      console.log("[Tesseract] Texto extraído. Confidence:", data.confidence / 100);

      return {
        text: data.text,
        confidence: data.confidence / 100, // Tesseract retorna 0-100, converter para 0-1
      };
    } catch (error) {
      console.error("[Tesseract] Erro ao processar imagem:", error);
      throw new Error(`Tesseract falhou: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Google Cloud Vision API - Pago, melhor precisão, requer internet
   */
  private async recognizeWithCloudVision(imageUri: string): Promise<OCRResult> {
    const { apiKey, endpoint } = this.config.cloudVisionConfig!;
    const url = endpoint || "https://vision.googleapis.com/v1/images:annotate";

    console.log("[CloudVision] Enviando imagem para API...");

    try {
      // Converter imagem para base64
      const base64Image = await this.imageToBase64(imageUri);

      const response = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloud Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const textAnnotations = data.responses[0]?.textAnnotations;

      if (!textAnnotations || textAnnotations.length === 0) {
        throw new Error("Nenhum texto detectado na imagem");
      }

      // Primeiro item contém todo o texto
      const fullText = textAnnotations[0].description;

      return {
        text: fullText,
        confidence: 0.95, // Cloud Vision geralmente tem alta confiança
      };
    } catch (error) {
      console.error("[CloudVision] Erro:", error);
      throw error;
    }
  }

  /**
   * Converte imagem para base64 (necessário para Cloud Vision API)
   */
  private async imageToBase64(imageUri: string): Promise<string> {
    // Se for web, usar fetch
    if (imageUri.startsWith("http")) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64 || "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Se for React Native, usar FileSystem
    try {
      const { default: * as FileSystem } = await import("expo-file-system");
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error("Erro ao converter imagem para base64:", error);
      throw new Error("Não foi possível converter a imagem");
    }
  }

  /**
   * Atualiza configuração do Cloud Vision
   */
  updateCloudVisionConfig(config: CloudVisionConfig) {
    this.config.cloudVisionConfig = config;
  }

  /**
   * Atualiza provedor preferido
   */
  setPreferredProvider(provider: OCRProvider) {
    this.config.preferredProvider = provider;
  }
}

/**
 * Factory para criar adaptador com configurações do usuário
 */
export function createHybridOCRAdapter(
  userConfig?: Partial<HybridOCRConfig>
): HybridOCRAdapter {
  return new HybridOCRAdapter(userConfig);
}
