import type { ClassificationResult, ClassifierAdapter } from "./types";

const KEYWORD_MAP: Record<string, { categoryId: string; group: "needs" | "wants" | "savings" }> = {
  arroz: { categoryId: "alimentacao", group: "needs" },
  feijao: { categoryId: "alimentacao", group: "needs" },
  feijão: { categoryId: "alimentacao", group: "needs" },
  leite: { categoryId: "alimentacao", group: "needs" },
  pao: { categoryId: "alimentacao", group: "needs" },
  pão: { categoryId: "alimentacao", group: "needs" },
  carne: { categoryId: "alimentacao", group: "needs" },
  frango: { categoryId: "alimentacao", group: "needs" },
  ovo: { categoryId: "alimentacao", group: "needs" },
  ovos: { categoryId: "alimentacao", group: "needs" },
  acucar: { categoryId: "alimentacao", group: "needs" },
  açúcar: { categoryId: "alimentacao", group: "needs" },
  sal: { categoryId: "alimentacao", group: "needs" },
  oleo: { categoryId: "alimentacao", group: "needs" },
  óleo: { categoryId: "alimentacao", group: "needs" },
  farinha: { categoryId: "alimentacao", group: "needs" },
  macarrao: { categoryId: "alimentacao", group: "needs" },
  macarrão: { categoryId: "alimentacao", group: "needs" },
  cafe: { categoryId: "alimentacao", group: "needs" },
  café: { categoryId: "alimentacao", group: "needs" },
  manteiga: { categoryId: "alimentacao", group: "needs" },
  queijo: { categoryId: "alimentacao", group: "needs" },
  presunto: { categoryId: "alimentacao", group: "needs" },
  tomate: { categoryId: "alimentacao", group: "needs" },
  cebola: { categoryId: "alimentacao", group: "needs" },
  alho: { categoryId: "alimentacao", group: "needs" },
  batata: { categoryId: "alimentacao", group: "needs" },
  banana: { categoryId: "alimentacao", group: "needs" },
  maca: { categoryId: "alimentacao", group: "needs" },
  maçã: { categoryId: "alimentacao", group: "needs" },
  laranja: { categoryId: "alimentacao", group: "needs" },
  legume: { categoryId: "alimentacao", group: "needs" },
  verdura: { categoryId: "alimentacao", group: "needs" },
  fruta: { categoryId: "alimentacao", group: "needs" },
  iogurte: { categoryId: "alimentacao", group: "needs" },
  margarina: { categoryId: "alimentacao", group: "needs" },

  sabonete: { categoryId: "higiene", group: "needs" },
  shampoo: { categoryId: "higiene", group: "needs" },
  pasta: { categoryId: "higiene", group: "needs" },
  escova: { categoryId: "higiene", group: "needs" },
  absorvente: { categoryId: "higiene", group: "needs" },
  papel: { categoryId: "higiene", group: "needs" },
  desodorante: { categoryId: "higiene", group: "needs" },
  fralda: { categoryId: "higiene", group: "needs" },

  detergente: { categoryId: "limpeza", group: "needs" },
  desinfetante: { categoryId: "limpeza", group: "needs" },
  alvejante: { categoryId: "limpeza", group: "needs" },
  sabao: { categoryId: "limpeza", group: "needs" },
  sabão: { categoryId: "limpeza", group: "needs" },
  esponja: { categoryId: "limpeza", group: "needs" },
  "agua sanitaria": { categoryId: "limpeza", group: "needs" },
  "água sanitária": { categoryId: "limpeza", group: "needs" },

  remedio: { categoryId: "saude", group: "needs" },
  remédio: { categoryId: "saude", group: "needs" },
  medicamento: { categoryId: "saude", group: "needs" },
  dipirona: { categoryId: "saude", group: "needs" },
  paracetamol: { categoryId: "saude", group: "needs" },

  cerveja: { categoryId: "lazer", group: "wants" },
  vinho: { categoryId: "lazer", group: "wants" },
  vodka: { categoryId: "lazer", group: "wants" },
  whisky: { categoryId: "lazer", group: "wants" },
  refrigerante: { categoryId: "lazer", group: "wants" },
  coca: { categoryId: "lazer", group: "wants" },
  suco: { categoryId: "lazer", group: "wants" },
  chocolate: { categoryId: "lazer", group: "wants" },
  sorvete: { categoryId: "lazer", group: "wants" },
  biscoito: { categoryId: "lazer", group: "wants" },
  bolacha: { categoryId: "lazer", group: "wants" },
  salgadinho: { categoryId: "lazer", group: "wants" },
  doce: { categoryId: "lazer", group: "wants" },
  bala: { categoryId: "lazer", group: "wants" },
  chiclete: { categoryId: "lazer", group: "wants" },
  energetico: { categoryId: "lazer", group: "wants" },
  energético: { categoryId: "lazer", group: "wants" },
  pizza: { categoryId: "lazer", group: "wants" },
  hamburguer: { categoryId: "lazer", group: "wants" },
  hambúrguer: { categoryId: "lazer", group: "wants" },
  lanche: { categoryId: "lazer", group: "wants" },

  // Frete - será reclassificado para categoria predominante da compra
  frete: { categoryId: "outros", group: "wants" },
  "frete cobrado": { categoryId: "outros", group: "wants" },
  entrega: { categoryId: "outros", group: "wants" },

  // Descontos - será reclassificado para categoria predominante
  desconto: { categoryId: "outros", group: "wants" },
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function classifyByKeyword(itemName: string): ClassificationResult {
  const lower = itemName.toLowerCase().trim();
  const normalized = normalizeText(itemName);

  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    const normalizedKeyword = normalizeText(keyword);
    if (lower.includes(keyword) || normalized.includes(normalizedKeyword)) {
      return {
        categoryId: category.categoryId,
        categoryGroup: category.group,
        confidence: 0.7,
        method: "keyword",
      };
    }
  }

  return {
    categoryId: "outros",
    categoryGroup: "wants",
    confidence: 0.3,
    method: "keyword",
  };
}

export function createKeywordClassifier(): ClassifierAdapter {
  return {
    async classify(itemName: string): Promise<ClassificationResult> {
      return classifyByKeyword(itemName);
    },
  };
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export function createGeminiClassifier(config: GeminiConfig): ClassifierAdapter {
  const model = config.model ?? "gemini-2.0-flash";

  return {
    async classify(itemName: string): Promise<ClassificationResult> {
      try {
        const prompt = `Classifique este item de nota fiscal brasileira em uma das categorias:
- alimentacao (grupo: needs) - alimentos basicos e essenciais
- higiene (grupo: needs) - produtos de higiene pessoal
- limpeza (grupo: needs) - produtos de limpeza
- saude (grupo: needs) - remedios e saude
- lazer (grupo: wants) - bebidas, doces, snacks, entretenimento
- vestuario (grupo: wants) - roupas e acessorios
- educacao (grupo: savings) - livros, cursos
- outros (grupo: wants) - nao classificado

Item: "${itemName}"

Responda APENAS no formato JSON:
{"categoryId": "...", "categoryGroup": "needs|wants|savings"}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 100,
              },
            }),
          },
        );

        if (!response.ok) {
          return classifyByKeyword(itemName);
        }

        const data = await response.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        const jsonMatch = text.match(/\{[^}]+\}/);
        if (!jsonMatch) {
          return classifyByKeyword(itemName);
        }

        const parsed = JSON.parse(jsonMatch[0]) as {
          categoryId?: string;
          categoryGroup?: string;
        };

        const validGroups = ["needs", "wants", "savings"];
        const validCategories = [
          "alimentacao", "higiene", "limpeza", "saude",
          "lazer", "vestuario", "educacao", "outros",
        ];

        if (
          parsed.categoryId &&
          validCategories.includes(parsed.categoryId) &&
          parsed.categoryGroup &&
          validGroups.includes(parsed.categoryGroup)
        ) {
          return {
            categoryId: parsed.categoryId,
            categoryGroup: parsed.categoryGroup as "needs" | "wants" | "savings",
            confidence: 0.9,
            method: "ai",
          };
        }

        return classifyByKeyword(itemName);
      } catch {
        return classifyByKeyword(itemName);
      }
    },
  };
}

export function createHybridClassifier(geminiApiKey?: string): ClassifierAdapter {
  const keywordClassifier = createKeywordClassifier();
  const geminiClassifier = geminiApiKey
    ? createGeminiClassifier({ apiKey: geminiApiKey })
    : null;

  return {
    async classify(itemName: string): Promise<ClassificationResult> {
      const keywordResult = await keywordClassifier.classify(itemName);

      if (keywordResult.confidence >= 0.7) {
        return keywordResult;
      }

      if (geminiClassifier) {
        return geminiClassifier.classify(itemName);
      }

      return keywordResult;
    },
  };
}
