import type { AIProvider, AdapterMessage, AdapterOptions } from "../types";
import type { OCRDocumentType } from "./ocrSchema";
import { getOCRSchema } from "./ocrSchema";
import { OpenAIAdapter } from "../adapters/OpenAIAdapter";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter";
import { GeminiAdapter } from "../adapters/GeminiAdapter";
import { QwenAdapter } from "../adapters/QwenAdapter";
import type { AIProviderAdapter } from "../adapters/AIProviderAdapter";

const INVOICE_SYSTEM_PROMPT = `Voce e um sistema de OCR especializado em documentos financeiros brasileiros.
Analise a imagem fornecida e extraia os dados.
Retorne ESTRITAMENTE em formato JSON sem blocos de markdown, sem conversas, sem saudacoes.
Nao inclua \`\`\`json ou \`\`\` no retorno.`;

const INVOICE_USER_PROMPT = `Extraia os dados desta nota fiscal/cupom fiscal no formato JSON.
Para cada item, inclua o codigo EAN/GTIN (codigo de barras) e NCM (8 digitos) se estiverem visiveis na nota.
{"store":"nome da loja","cnpj":"XX.XXX.XXX/XXXX-XX","date":"DD/MM/YYYY","items":[{"description":"nome","quantity":1,"unitPrice":0.00,"total":0.00,"ean":"0000000000000","ncm":"00000000"}],"subtotal":0.00,"discounts":0.00,"total":0.00}
Se EAN ou NCM nao estiverem visiveis, omita esses campos do item.`;

const PAYSLIP_USER_PROMPT = `Extraia os dados deste holerite/contracheque no formato JSON:
{"company":"nome empresa","cnpj":"XX.XXX.XXX/XXXX-XX","employee":"nome","period":"MM/YYYY","grossSalary":0.00,"deductions":[{"name":"INSS","value":0.00}],"netSalary":0.00}`;

/** Vision-capable providers */
const VISION_PROVIDERS: AIProvider[] = ["openai", "gemini", "claude", "qwen"];

/** Vision model IDs per provider (validados em 2026-07-15) */
const VISION_MODELS: Partial<Record<AIProvider, string>> = {
  openai: "gpt-5.6-terra",
  claude: "claude-sonnet-5",
  gemini: "gemini-3.5-flash",
  qwen: "qwen-vl-plus-latest",
};

export class VisionOCRService {
  /**
   * Process an image using AI Vision and return structured OCR data.
   * @throws Error if validation fails or provider doesn't support vision
   */
  static async process(
    imageBase64: string,
    imageMimeType: string,
    provider: AIProvider,
    apiKey: string,
    documentType: OCRDocumentType = "invoice",
  ): Promise<unknown> {
    if (!VISION_PROVIDERS.includes(provider)) {
      throw new Error(
        `${provider} nao suporta Vision OCR. Use OpenAI, Claude, Gemini ou Qwen.`,
      );
    }

    const userPrompt =
      documentType === "invoice" ? INVOICE_USER_PROMPT : PAYSLIP_USER_PROMPT;

    const model = VISION_MODELS[provider]!;
    const adapter = VisionOCRService.getAdapter(provider);

    // Gemini uses its own inlineData format
    if (provider === "gemini") {
      const messages: AdapterMessage[] = [
        { role: "system", content: INVOICE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ];
      const options: AdapterOptions = { model, temperature: 0.1, maxTokens: 2048 };
      const result = await (adapter as GeminiAdapter).complete(
        messages,
        apiKey,
        options,
        { base64: imageBase64, mimeType: imageMimeType },
      );
      return VisionOCRService.parseAndValidate(result.content, documentType);
    }

    // OpenAI, Claude, Qwen: use imageBase64 field on AdapterMessage
    const messages: AdapterMessage[] = [
      { role: "system", content: INVOICE_SYSTEM_PROMPT },
      {
        role: "user",
        content: userPrompt,
        imageBase64,
        imageMimeType,
      },
    ];

    const options: AdapterOptions = { model, temperature: 0.1, maxTokens: 2048 };
    const result = await adapter.complete(messages, apiKey, options);

    return VisionOCRService.parseAndValidate(result.content, documentType);
  }

  /** Check if a provider supports vision OCR */
  static supportsVision(provider: AIProvider): boolean {
    return VISION_PROVIDERS.includes(provider);
  }

  private static getAdapter(provider: AIProvider): AIProviderAdapter {
    switch (provider) {
      case "openai": return new OpenAIAdapter();
      case "claude": return new ClaudeAdapter();
      case "gemini": return new GeminiAdapter();
      case "qwen": return new QwenAdapter();
      default:
        throw new Error(`No vision adapter for ${provider}`);
    }
  }

  private static parseAndValidate(
    rawContent: string,
    documentType: OCRDocumentType,
  ): unknown {
    // Try to extract JSON from the response
    let jsonStr = rawContent.trim();

    // Strip markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1]!.trim();
    }

    // Try to find JSON object in the response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0]!;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        `Nao foi possivel extrair JSON da resposta da IA. Tente novamente com uma imagem mais nitida.`,
      );
    }

    const schema = getOCRSchema(documentType);
    const result = schema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Dados OCR invalidos: ${issues}`);
    }

    return result.data;
  }
}
