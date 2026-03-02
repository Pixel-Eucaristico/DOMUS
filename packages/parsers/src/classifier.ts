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

  // ── Termos técnicos SISCOMEX (aparecem nas descrições NCM) ────────────
  // Higiene
  perfumaria: { categoryId: "higiene", group: "needs" },
  toucador: { categoryId: "higiene", group: "needs" },
  cosmetica: { categoryId: "higiene", group: "needs" },
  "oleo essencial": { categoryId: "higiene", group: "needs" },
  resinoides: { categoryId: "higiene", group: "needs" },
  antitranspirante: { categoryId: "higiene", group: "needs" },
  // Limpeza
  tensioativo: { categoryId: "limpeza", group: "needs" },
  inseticida: { categoryId: "limpeza", group: "needs" },
  fungicida: { categoryId: "limpeza", group: "needs" },
  rodenticida: { categoryId: "limpeza", group: "needs" },
  // Alimentação (SISCOMEX)
  bovino: { categoryId: "alimentacao", group: "needs" },
  suino: { categoryId: "alimentacao", group: "needs" },
  avicultura: { categoryId: "alimentacao", group: "needs" },
  pescado: { categoryId: "alimentacao", group: "needs" },
  laticinios: { categoryId: "alimentacao", group: "needs" },
  hortalica: { categoryId: "alimentacao", group: "needs" },
  confeitaria: { categoryId: "lazer", group: "wants" },
  // Saúde (SISCOMEX)
  farmaceutico: { categoryId: "saude", group: "needs" },
  vacina: { categoryId: "saude", group: "needs" },
  // Vestuário (SISCOMEX)
  calcado: { categoryId: "vestuario", group: "wants" },
  vestuario: { categoryId: "vestuario", group: "wants" },
  // Educação (SISCOMEX)
  livro: { categoryId: "educacao", group: "savings" },
  impressos: { categoryId: "educacao", group: "savings" },
};

// NCM classification map — keyed by prefix (2, 4, or 8 digits).
// Checked longest-first so more specific rules win.
const NCM_MAP: Array<{ prefix: string; categoryId: string; group: "needs" | "wants" | "savings" }> = [
  // ── Bebidas alcoólicas (2203-2208) → lazer ──────────────────────────
  { prefix: "2203", categoryId: "lazer", group: "wants" },
  { prefix: "2204", categoryId: "lazer", group: "wants" },
  { prefix: "2205", categoryId: "lazer", group: "wants" },
  { prefix: "2206", categoryId: "lazer", group: "wants" },
  { prefix: "2207", categoryId: "lazer", group: "wants" },
  { prefix: "2208", categoryId: "lazer", group: "wants" },
  // ── Refrigerantes / sucos industrializados (2202) → lazer ───────────
  { prefix: "2202", categoryId: "lazer", group: "wants" },
  // ── Sorvetes (2105) → lazer ─────────────────────────────────────────
  { prefix: "2105", categoryId: "lazer", group: "wants" },
  // ── Chocolate (1806) → lazer ─────────────────────────────────────────
  { prefix: "1806", categoryId: "lazer", group: "wants" },
  // ── Biscoitos, snacks (1905) → lazer ─────────────────────────────────
  { prefix: "1905", categoryId: "lazer", group: "wants" },
  // ── Brinquedos (9503) → lazer ────────────────────────────────────────
  { prefix: "9503", categoryId: "lazer", group: "wants" },
  // ── Higiene pessoal (3301-3307, 4818) ────────────────────────────────
  { prefix: "3301", categoryId: "higiene", group: "needs" },
  { prefix: "3302", categoryId: "higiene", group: "needs" },
  { prefix: "3303", categoryId: "higiene", group: "needs" },
  { prefix: "3304", categoryId: "higiene", group: "needs" },
  { prefix: "3305", categoryId: "higiene", group: "needs" },
  { prefix: "3306", categoryId: "higiene", group: "needs" },
  { prefix: "3307", categoryId: "higiene", group: "needs" },
  { prefix: "4818", categoryId: "higiene", group: "needs" }, // papel higiênico / lenços
  // ── Limpeza (3401-3405, 3808) ─────────────────────────────────────────
  { prefix: "3401", categoryId: "limpeza", group: "needs" }, // sabões
  { prefix: "3402", categoryId: "limpeza", group: "needs" }, // detergentes
  { prefix: "3403", categoryId: "limpeza", group: "needs" },
  { prefix: "3404", categoryId: "limpeza", group: "needs" },
  { prefix: "3405", categoryId: "limpeza", group: "needs" }, // ceras/polimentos
  { prefix: "3808", categoryId: "limpeza", group: "needs" }, // inseticidas/desinfetantes
  // ── Vestuário (61-67) ────────────────────────────────────────────────
  { prefix: "61", categoryId: "vestuario", group: "wants" },
  { prefix: "62", categoryId: "vestuario", group: "wants" },
  { prefix: "63", categoryId: "vestuario", group: "wants" },
  { prefix: "64", categoryId: "vestuario", group: "wants" }, // calçados
  { prefix: "65", categoryId: "vestuario", group: "wants" }, // chapéus
  { prefix: "66", categoryId: "vestuario", group: "wants" },
  { prefix: "67", categoryId: "vestuario", group: "wants" },
  // ── Livros / educação (49) ───────────────────────────────────────────
  { prefix: "49", categoryId: "educacao", group: "savings" },
  // ── Alimentos (captura ampla — deve vir depois das exceções acima) ───
  { prefix: "02", categoryId: "alimentacao", group: "needs" }, // carnes
  { prefix: "03", categoryId: "alimentacao", group: "needs" }, // peixes
  { prefix: "04", categoryId: "alimentacao", group: "needs" }, // laticínios, ovos
  { prefix: "07", categoryId: "alimentacao", group: "needs" }, // hortaliças
  { prefix: "08", categoryId: "alimentacao", group: "needs" }, // frutas
  { prefix: "09", categoryId: "alimentacao", group: "needs" }, // café, chá, especiarias
  { prefix: "10", categoryId: "alimentacao", group: "needs" }, // cereais
  { prefix: "11", categoryId: "alimentacao", group: "needs" }, // moagem cereais
  { prefix: "15", categoryId: "alimentacao", group: "needs" }, // gorduras, óleos
  { prefix: "16", categoryId: "alimentacao", group: "needs" }, // preparações carnes/peixes
  { prefix: "17", categoryId: "alimentacao", group: "needs" }, // açúcares (inclui 1804 cacau em pó)
  { prefix: "1901", categoryId: "alimentacao", group: "needs" },
  { prefix: "1902", categoryId: "alimentacao", group: "needs" }, // massas
  { prefix: "1903", categoryId: "alimentacao", group: "needs" },
  { prefix: "1904", categoryId: "alimentacao", group: "needs" },
  { prefix: "20", categoryId: "alimentacao", group: "needs" }, // preparações hortaliças
  { prefix: "21", categoryId: "alimentacao", group: "needs" }, // preparações alimentares (café, molhos, etc.)
  { prefix: "2201", categoryId: "alimentacao", group: "needs" }, // água mineral
  { prefix: "2209", categoryId: "alimentacao", group: "needs" }, // vinagre
  { prefix: "2301", categoryId: "alimentacao", group: "needs" }, // farinhas de carne
  { prefix: "2302", categoryId: "alimentacao", group: "needs" },
];

/**
 * Classify by NCM code (Nomenclatura Comum do Mercosul — 8 digits).
 * Returns null if the NCM is not recognised.
 */
export function classifyByNcm(ncm: string): ClassificationResult | null {
  const digits = ncm.replace(/\D/g, "");
  if (!digits) return null;

  // Check from most-specific (8 digits) down to 2 digits
  for (const entry of NCM_MAP) {
    if (digits.startsWith(entry.prefix)) {
      return {
        categoryId: entry.categoryId,
        categoryGroup: entry.group,
        confidence: 0.85,
        method: "keyword",
      };
    }
  }
  return null;
}

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

// ─── SISCOMEX NCM lookup ───────────────────────────────────────────────────────

interface SiscomexEntry {
  Codigo: string;
  Descricao: string;
}

let _siscomexCache: SiscomexEntry[] | null = null;
let _siscomexPending: Promise<SiscomexEntry[]> | null = null;

async function fetchSiscomex(): Promise<SiscomexEntry[]> {
  if (_siscomexCache !== null) return _siscomexCache;
  if (_siscomexPending) return _siscomexPending;

  _siscomexPending = fetch(
    "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json",
    { headers: { Accept: "application/json" } },
  )
    .then((r) => r.json() as Promise<SiscomexEntry[]>)
    .then((data) => {
      _siscomexCache = data;
      return data;
    })
    .catch(() => {
      _siscomexCache = []; // empty on error — avoids retrying every call
      return [] as SiscomexEntry[];
    });

  return _siscomexPending;
}

function getSiscomexDescription(ncm8: string, data: SiscomexEntry[]): string {
  const descs: string[] = [];
  for (const entry of data) {
    const code = entry.Codigo.replace(/\D/g, ""); // "33.07" → "3307"
    // Include chapter (2 digits), heading (4 digits), subheading (6 digits), item (8 digits)
    if (code.length <= 8 && ncm8.startsWith(code)) {
      const clean = entry.Descricao
        .replace(/<[^>]+>/g, "")   // strip HTML tags
        .replace(/^[-–\s]+/, "")   // strip leading dashes (SISCOMEX hierarchy markers)
        .trim();
      if (clean) descs.push(clean);
    }
  }
  return descs.join(" ").toLowerCase();
}

/**
 * Classify an invoice NCM code using:
 * 1. Static prefix map (instant, no network)
 * 2. SISCOMEX description + keyword map (network, cached per session)
 */
export async function classifyByNcmWithSiscomex(ncm: string): Promise<ClassificationResult> {
  const digits = ncm.replace(/\D/g, "").substring(0, 8);
  if (!digits) {
    return { categoryId: "outros", categoryGroup: "wants", confidence: 0.3, method: "keyword" };
  }

  // Fast path — static prefix map
  const staticResult = classifyByNcm(digits);
  if (staticResult) return staticResult;

  // Slow path — SISCOMEX description lookup (network, cached)
  try {
    const data = await fetchSiscomex();
    const description = getSiscomexDescription(digits, data);
    if (description) {
      const keyResult = classifyByKeyword(description);
      if (keyResult.confidence >= 0.7) return { ...keyResult, confidence: 0.8 };
    }
  } catch {
    // ignore — fall through to default
  }

  return { categoryId: "outros", categoryGroup: "wants", confidence: 0.3, method: "keyword" };
}

// ──────────────────────────────────────────────────────────────────────────────

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
