import type { ClassificationResult, ClassifierAdapter } from "../types";
import { KEYWORD_MAP, NCM_MAP, normalizeText } from "./keywordMap";

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
