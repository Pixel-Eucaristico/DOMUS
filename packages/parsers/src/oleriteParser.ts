import type { OCRAdapter, OleriteParseOptions, OleriteReading } from "./types";

const MAX_METER_VALUE = 1_000_000;

/**
 * Normaliza a unidade capturada do texto OCR para um formato canônico.
 */
function normalizeUnit(rawUnit?: string, fallback: string = "L"): string {
  if (!rawUnit) return fallback;
  const cleaned = rawUnit.trim().toLowerCase();
  if (cleaned === "l" || cleaned === "lt" || cleaned === "litro" || cleaned === "litros") {
    return "L";
  }
  if (cleaned === "ml" || cleaned === "mililitro" || cleaned === "mililitros") {
    return "ml";
  }
  if (cleaned === "m3" || cleaned === "m³") {
    return "m³";
  }
  if (cleaned === "kwh" || cleaned === "kw/h") {
    return "kWh";
  }
  return rawUnit.trim() || fallback;
}

/**
 * Normaliza string numérica de medidor para número float:
 * - Se houver vírgula e ponto ("1.234,56"), pontos são milhar e vírgula é decimal.
 * - Se houver apenas vírgula ("1234,5"), vírgula é decimal.
 * - Se houver apenas ponto ("45.2" ou "123.456"), ponto é tratado como separador decimal do medidor.
 */
export function parseMeterNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Rejeitar valores explícitos negativos ou com múltiplas vírgulas
  if (trimmed.startsWith("-")) return null;
  if (trimmed.split(",").length > 2) return null;

  let normalized: string;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  if (hasComma && hasDot) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  } else {
    // Se houver múltiplos pontos (ex: "1.234.567"), manter apenas o último como decimal ou remover milhares
    const parts = trimmed.split(".");
    if (parts.length > 2) {
      normalized = parts.join("");
    } else {
      normalized = trimmed;
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (value <= 0 || value > MAX_METER_VALUE) return null;

  return value;
}

function clampConfidence(confidence?: number): number {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return 0.85;
  }
  return Math.max(0, Math.min(1, confidence));
}

interface CandidateMatch {
  value: number;
  unit?: string;
  priority: number;
}

// Padrão 1: Rótulo explícito ("Vol: 45.2 ml", "Medidor 1234,5 L", "Leitura: 00128,4 m3")
const LABELED_READING_REGEX =
  /(?:vol(?:ume)?|leitura|medidor|olerite|consumo|total|óleo|oleo)\s*(?:[:=]|-(?!\d))?\s*(-?\d+(?:[.,]\d+)*)\s*(l|lt|litros?|ml|m3|m³|kw\/?h)?(?=$|\s|[^\w³])/gi;

// Padrão 2: Número acompanhado de unidade de medida ("1234,5 L", "123.456 m3", "45.2 ml")
const NUMBER_WITH_UNIT_REGEX =
  /(?:^|[^\d-])(-?\d+(?:[.,]\d+)*)\s*(l|lt|litros?|ml|m3|m³|kw\/?h)(?=$|\s|[^\w³])/gi;

// Padrão 3: Número de medidor isolado (prioriza números com casas decimais como "123.456", "1234,5", depois inteiros)
const STANDALONE_NUMBER_REGEX = /(-?\d+(?:[.,]\d+)+|-?\d+)/g;

/**
 * Extrai a leitura de um olerite/medidor a partir do texto bruto retornado pelo OCR.
 */
export function parseOleriteFromOCR(
  ocrText: string,
  options?: OleriteParseOptions,
): OleriteReading | null {
  if (!ocrText || !ocrText.trim()) {
    return null;
  }

  const defaultUnit = options?.defaultUnit ?? "L";
  const candidates: CandidateMatch[] = [];

  // 1. Buscar leituras com rótulo explícito (maior prioridade)
  for (const match of ocrText.matchAll(LABELED_READING_REGEX)) {
    const rawNum = match[1];
    const rawUnit = match[2];
    if (!rawNum) continue;
    const parsed = parseMeterNumber(rawNum);
    if (parsed !== null) {
      candidates.push({
        value: parsed,
        unit: rawUnit,
        priority: rawUnit ? 100 : 90,
      });
    }
  }

  // 2. Buscar números seguidos de unidade explícita
  for (const match of ocrText.matchAll(NUMBER_WITH_UNIT_REGEX)) {
    const rawNum = match[1];
    const rawUnit = match[2];
    if (!rawNum) continue;
    const parsed = parseMeterNumber(rawNum);
    if (parsed !== null) {
      candidates.push({
        value: parsed,
        unit: rawUnit,
        priority: 80,
      });
    }
  }

  // 3. Buscar números isolados em cada linha (ignorando datas como 14/02/2026 ou horas 15:30)
  const sanitizedLines = ocrText
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
        .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " "),
    );

  for (const line of sanitizedLines) {
    for (const match of line.matchAll(STANDALONE_NUMBER_REGEX)) {
      const rawNum = match[1];
      if (!rawNum) continue;
      const parsed = parseMeterNumber(rawNum);
      if (parsed !== null) {
        const hasDecimalSeparator = rawNum.includes(",") || rawNum.includes(".");
        candidates.push({
          value: parsed,
          unit: undefined,
          priority: hasDecimalSeparator ? 50 : 30,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Ordenar por maior prioridade (mantendo a ordem de aparição em caso de empate)
  candidates.sort((a, b) => b.priority - a.priority);
  const best = candidates[0]!;

  return {
    value: best.value,
    unit: normalizeUnit(best.unit, defaultUnit),
    confidence: clampConfidence(options?.confidence),
    imageUri: options?.imageUri ?? "",
    timestamp: options?.timestamp ?? new Date(),
    ...(options?.location ? { location: options.location } : {}),
  };
}

/**
 * Executa o OCR sobre uma imagem e interpreta o resultado como leitura de olerite/medidor.
 */
export async function parseOleriteFromImage(
  imageUri: string,
  ocrAdapter: OCRAdapter,
  options?: OleriteParseOptions,
): Promise<OleriteReading | null> {
  const ocrResult = await ocrAdapter.recognizeText(imageUri);
  return parseOleriteFromOCR(ocrResult.text, {
    ...options,
    confidence: options?.confidence ?? ocrResult.confidence,
    imageUri: options?.imageUri ?? imageUri,
  });
}
