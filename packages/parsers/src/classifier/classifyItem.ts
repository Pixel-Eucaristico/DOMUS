import type { ClassificationResult, ClassifierAdapter } from "../types";
import { KEYWORD_MAP, NCM_MAP, normalizeText } from "./keywordMap";
import { findSubcategoryByNcm } from "./ncmCategories";
import { lookupByEAN } from "./eanLookup";

// ─── Extended result with subcategory ────────────────────────────────────────

export interface ExtendedClassificationResult extends ClassificationResult {
  subcategoryId?: string;
  allowGroupOverride?: boolean;
}

// ─── Classify by NCM code ────────────────────────────────────────────────────

/**
 * Classify by NCM code (Nomenclatura Comum do Mercosul — 8 digits).
 * Now also returns subcategoryId when a match is found in ncmCategories.
 */
export function classifyByNcm(ncm: string): ExtendedClassificationResult | null {
  const digits = ncm.replace(/\D/g, "");
  if (!digits) return null;

  // Try subcategory lookup first (more granular)
  const sub = findSubcategoryByNcm(digits);
  if (sub) {
    return {
      categoryId: sub.parentId,
      categoryGroup: sub.group,
      subcategoryId: sub.id,
      allowGroupOverride: sub.allowGroupOverride,
      confidence: 0.9,
      method: "keyword",
    };
  }

  // Fallback to legacy NCM_MAP
  for (const entry of NCM_MAP) {
    if (digits.startsWith(entry.prefix)) {
      return {
        categoryId: entry.categoryId,
        categoryGroup: entry.group,
        subcategoryId: entry.subcategoryId,
        confidence: 0.85,
        method: "keyword",
      };
    }
  }
  return null;
}

// ─── Classify by keyword ─────────────────────────────────────────────────────

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
    if (code.length <= 8 && ncm8.startsWith(code)) {
      const clean = entry.Descricao
        .replace(/<[^>]+>/g, "")   // strip HTML tags
        .replace(/^[-–\s]+/, "")   // strip leading dashes
        .trim();
      if (clean) descs.push(clean);
    }
  }
  return descs.join(" ").toLowerCase();
}

/**
 * Classify an invoice NCM code using:
 * 1. Subcategory map + static prefix map (instant, no network)
 * 2. SISCOMEX description + keyword map (network, cached per session)
 */
export async function classifyByNcmWithSiscomex(ncm: string): Promise<ExtendedClassificationResult> {
  const digits = ncm.replace(/\D/g, "").substring(0, 8);
  if (!digits) {
    return { categoryId: "outros", categoryGroup: "wants", confidence: 0.3, method: "keyword" };
  }

  // Fast path — subcategory + static prefix map
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

// ─── EAN-based classification ────────────────────────────────────────────────

/**
 * Classify by EAN/GTIN barcode:
 * 1. Lookup product info via external APIs (Open Food Facts, Cosmos)
 * 2. If NCM is returned, classify by NCM
 * 3. Otherwise classify by product name via keyword
 */
async function classifyByEan(ean: string): Promise<ExtendedClassificationResult | null> {
  const result = await lookupByEAN(ean);
  if (!result) return null;

  // If the API returned an NCM, use NCM classification
  if (result.ncm) {
    const ncmResult = await classifyByNcmWithSiscomex(result.ncm);
    if (ncmResult.confidence >= 0.7) return ncmResult;
  }

  // Otherwise try classifying by product name
  if (result.name) {
    const keyResult = classifyByKeyword(result.name);
    if (keyResult.confidence >= 0.7) {
      return { ...keyResult, confidence: 0.75 };
    }
  }

  return null;
}

// ─── Gemini AI classifier ────────────────────────────────────────────────────

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
- moradia (grupo: needs) - material de construcao, moveis
- transporte (grupo: needs) - combustiveis, pecas automotivas
- vestuario (grupo: wants) - roupas, calcados, acessorios
- lazer (grupo: wants) - bebidas, doces, snacks, entretenimento
- compras (grupo: wants) - eletronicos, informatica, produtos gerais
- restaurantes (grupo: wants) - refeicoes fora de casa
- educacao (grupo: savings) - livros, cursos
- outros (grupo: wants) - nao classificado

Se o item for um alimento que pode ser considerado tanto necessidade quanto desejo
(ex: chocolate, refrigerante, sorvete), classifique como "lazer" (wants).
Alimentos basicos (arroz, feijao, carne) classifique como "alimentacao" (needs).

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
          "alimentacao", "higiene", "limpeza", "saude", "moradia", "transporte",
          "vestuario", "lazer", "compras", "restaurantes", "educacao", "outros",
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

// ─── Hybrid classifier (keyword + AI) ───────────────────────────────────────

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

// ─── Full classification pipeline ────────────────────────────────────────────

export interface ClassifyItemInput {
  name?: string;
  ncm?: string;
  ean?: string;
}

export interface ClassifyItemOptions {
  aiEnabled?: boolean;
  aiApiKey?: string;
}

/**
 * Full classification pipeline with priority:
 * 1. NCM (if available) — subcategory + static map + SISCOMEX
 * 2. EAN (if available) — external API lookup → NCM or name
 * 3. AI (if enabled) — Gemini classification
 * 4. Keyword/name — keyword map fallback
 * 5. Fallback — "outros" (wants)
 */
export async function classifyItemFull(
  item: ClassifyItemInput,
  options: ClassifyItemOptions = {},
): Promise<ExtendedClassificationResult> {
  // 1. NCM-based classification
  if (item.ncm) {
    const ncmResult = await classifyByNcmWithSiscomex(item.ncm);
    if (ncmResult.confidence >= 0.7) return ncmResult;
  }

  // 2. EAN-based classification
  if (item.ean) {
    const eanResult = await classifyByEan(item.ean);
    if (eanResult && eanResult.confidence >= 0.7) return eanResult;
  }

  // 3. AI classification (if enabled and name available)
  if (options.aiEnabled && options.aiApiKey && item.name) {
    const aiClassifier = createGeminiClassifier({ apiKey: options.aiApiKey });
    const aiResult = await aiClassifier.classify(item.name);
    if (aiResult.confidence >= 0.7) return aiResult;
  }

  // 4. Keyword classification by name
  if (item.name) {
    const keyResult = classifyByKeyword(item.name);
    return keyResult;
  }

  // 5. Fallback
  return {
    categoryId: "outros",
    categoryGroup: "wants",
    confidence: 0.1,
    method: "keyword",
  };
}

// ─── SISCOMEX cache management (for external persistence) ────────────────────

/** Get the current in-memory SISCOMEX cache (for persisting to AsyncStorage) */
export function getSiscomexCache(): SiscomexEntry[] | null {
  return _siscomexCache;
}

/** Restore SISCOMEX cache from persisted storage */
export function restoreSiscomexCache(data: SiscomexEntry[]): void {
  _siscomexCache = data;
  _siscomexPending = null;
}
