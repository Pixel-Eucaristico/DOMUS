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
export type OCRProvider = "mlkit" | "textrecognition" | "tesseract" | "cloudvision";

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
      fallbackProviders: config.fallbackProviders || ["cloudvision"],
      cloudVisionConfig: config.cloudVisionConfig,
    };
  }

  async recognizeText(imageUri: string): Promise<OCRResult> {
    const providers = [
      this.config.preferredProvider!,
      ...(this.config.fallbackProviders || []),
    ];

    // Deduplicar mantendo ordem e filtrar provedores indisponíveis
    const seen = new Set<OCRProvider>();
    const ordered = providers.filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      // Pular cloudvision se não tem API key configurada
      if (p === "cloudvision" && !this.config.cloudVisionConfig?.apiKey) {
        console.log("[HybridOCR] Pulando cloudvision (sem API key configurada)");
        return false;
      }
      return true;
    });

    let lastError: Error | null = null;

    for (const provider of ordered) {
      try {
        console.log(`[HybridOCR] Tentando provedor: ${provider}`);
        const result = await this.recognizeWithProvider(imageUri, provider);

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
      case "textrecognition":
        return await this.recognizeWithMlkit(imageUri);
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
   * rn-mlkit-ocr — gratuito, on-device
   * iOS: Vision Framework (Apple)
   * Android: ML Kit (Google)
   * Requer: development build (não funciona no Expo Go)
   */
  private async recognizeWithMlkit(imageUri: string): Promise<OCRResult> {
    try {
      const MlkitOcr = await import("rn-mlkit-ocr");

      // Verificar se o módulo nativo está disponível antes de chamar
      if (!MlkitOcr.default?.recognizeText) {
        console.warn("[HybridOCR] rn-mlkit-ocr importado mas módulo nativo não disponível (Expo Go?)");
        throw new Error(
          "OCR_UNAVAILABLE: ML Kit OCR requer um development build. " +
          "No Expo Go, módulos nativos não estão disponíveis. " +
          "Use 'npx expo run:android' ou EAS Build para criar um dev build."
        );
      }

      const result = await MlkitOcr.default.recognizeText(imageUri);

      if (!result || !result.text) {
        return { text: "", confidence: 0 };
      }

      return {
        text: result.text,
        confidence: 0.85,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("[HybridOCR] Erro real do mlkit:", msg);

      // Qualquer erro de módulo nativo não disponível
      if (
        msg.includes("OCR_UNAVAILABLE") ||
        msg.includes("doesn't seem to be linked") ||
        msg.includes("not linked") ||
        msg.includes("Cannot find") ||
        msg.includes("null is not an object") ||
        msg.includes("undefined is not an object") ||
        msg.includes("Cannot read prop")
      ) {
        throw new Error(
          "OCR_UNAVAILABLE: ML Kit OCR requer um development build. " +
          "No Expo Go, módulos nativos não estão disponíveis. " +
          "Use 'npx expo run:android' ou EAS Build para criar um dev build."
        );
      }
      throw error;
    }
  }

  /**
   * Tesseract — funciona apenas no navegador web (Web Workers + WASM)
   * Em React Native (JavaScriptCore) lança OCR_UNAVAILABLE
   */
  private async recognizeWithTesseract(imageUri: string): Promise<OCRResult> {
    if (typeof document === "undefined") {
      throw new Error(
        "OCR_UNAVAILABLE: Tesseract.js requer ambiente web (Web Workers + WASM). " +
        "Use o OCR On-device (Text Recognition) ou configure a Cloud Vision API."
      );
    }

    console.log("[Tesseract] Processando imagem com Tesseract.js...");

    try {
      const Tesseract = await import("tesseract.js");

      const worker = await Tesseract.createWorker("por", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            console.log(`[Tesseract] Progresso: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const { data } = await worker.recognize(imageUri);
      await worker.terminate();

      console.log("[Tesseract] Texto extraído. Confidence:", data.confidence / 100);

      return {
        text: data.text,
        confidence: data.confidence / 100,
      };
    } catch (error) {
      console.error("[Tesseract] Erro ao processar imagem:", error);
      throw new Error(`Tesseract falhou: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Google Cloud Vision API — pago, melhor precisão, requer internet
   */
  private async recognizeWithCloudVision(imageUri: string): Promise<OCRResult> {
    const { apiKey, endpoint } = this.config.cloudVisionConfig!;
    const url = endpoint || "https://vision.googleapis.com/v1/images:annotate";

    console.log("[CloudVision] Enviando imagem para API...");

    try {
      const base64Image = await this.imageToBase64(imageUri);

      const response = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
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

      const fullText = textAnnotations[0].description;

      return {
        text: fullText,
        confidence: 0.95,
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

    try {
      const FileSystem = await import("expo-file-system");
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });
      return base64;
    } catch (error) {
      console.error("Erro ao converter imagem para base64:", error);
      throw new Error("Não foi possível converter a imagem");
    }
  }

  updateCloudVisionConfig(config: CloudVisionConfig) {
    this.config.cloudVisionConfig = config;
  }

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
