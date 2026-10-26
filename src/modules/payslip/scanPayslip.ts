import {
  normalizeVisionPayslip,
  parsePayslipText,
  type PayslipParseResult,
  type VisionPayslipInput,
} from "@packages/parsers/src/payslipParser";
import type { AIProvider } from "@packages/ai";
import { DEFAULT_AI_SETTINGS, type AISettings } from "@/src/modules/ai/domain/AISettings";

/**
 * Story 11.5: escolha entre Vision OCR (IA) e OCR do aparelho na captura do
 * holerite, com a queda de um para o outro. Puro, com dependências injetadas
 * (sem `react-native`): o hook `usePayslipScanner` liga as peças reais.
 */

export const PAYSLIP_SCAN_WARNINGS = {
  visionFellBack: "A leitura pela IA falhou; lido no aparelho.",
  noValues: "Não encontramos valores na imagem. Confira ou preencha à mão.",
} as const;

export type PayslipScanOrigin = "vision" | "ocr";

export interface PayslipScanResult {
  data: PayslipParseResult;
  source: PayslipScanOrigin;
  /** O Vision foi tentado e falhou; lido no aparelho. */
  fellBack: boolean;
}

export interface VisionEligibility {
  /** IA ligada (`settings.isEnabled`). */
  aiEnabled: boolean;
  /** Flag `visionOCREnabled`. */
  visionFlag: boolean;
  /** `VisionOCRService.supportsVision(provider)`. */
  providerSupportsVision: boolean;
  hasApiKey: boolean;
  /** `TokenTracker.isOverBudget(...)`. */
  overBudget: boolean;
}

/** O Vision só é usado quando todas as condições valem. */
export function isVisionEligible(e: VisionEligibility): boolean {
  return e.aiEnabled && e.visionFlag && e.providerSupportsVision && e.hasApiKey && !e.overBudget;
}

/** Campos das configurações da IA que decidem o Vision. */
export type VisionSettings = Pick<
  AISettings,
  "provider" | "isEnabled" | "visionOCREnabled" | "customBudgets" | "budgetMode" | "monthlyBudgets" | "billingDay"
>;

/**
 * Lê o JSON das configurações da IA guardado no aparelho (o mesmo que o
 * `useAISettings` grava). Ausente ou ilegível = padrão (IA desligada).
 */
export function parseStoredAISettings(raw: string | null | undefined): VisionSettings {
  const base: VisionSettings = { provider: DEFAULT_AI_SETTINGS.provider, isEnabled: false };
  if (!raw) return base;
  try {
    const stored = JSON.parse(raw) as Partial<AISettings> | null;
    if (!stored || typeof stored !== "object") return base;
    return {
      provider: stored.provider ?? base.provider,
      isEnabled: stored.isEnabled === true,
      visionOCREnabled: stored.visionOCREnabled === true,
      customBudgets: stored.customBudgets,
      budgetMode: stored.budgetMode,
      monthlyBudgets: stored.monthlyBudgets,
      billingDay: stored.billingDay,
    };
  } catch {
    return base;
  }
}

export interface VisionEligibilityDeps {
  /** `VisionOCRService.supportsVision`. */
  supportsVision: (provider: AIProvider) => boolean;
  /** `SecureKeyService.retrieveKey`. */
  retrieveKey: (provider: AIProvider) => Promise<string | null>;
  /** `TokenTracker.isOverBudget` com o orçamento das configurações. */
  isOverBudget: (settings: VisionSettings) => Promise<boolean>;
}

export interface ResolvedVision {
  eligible: boolean;
  provider: AIProvider;
  /** Só presente quando o Vision é elegível. */
  apiKey: string | null;
  billingDay?: number;
}

/**
 * Decide o Vision com as configurações do momento (R1 da revisão): a chave e o
 * orçamento são do provedor dessas configurações. Só consulta a chave e o
 * orçamento quando IA, flag e provedor com visão valem; erro = não elegível.
 */
export async function resolveVisionEligibility(
  settings: VisionSettings,
  deps: VisionEligibilityDeps,
): Promise<ResolvedVision> {
  const provider = settings.provider;
  const none: ResolvedVision = { eligible: false, provider, apiKey: null, billingDay: settings.billingDay };
  const aiEnabled = settings.isEnabled === true;
  const visionFlag = settings.visionOCREnabled === true;
  const providerSupportsVision = aiEnabled && visionFlag && deps.supportsVision(provider);
  if (!providerSupportsVision) return none;
  let apiKey: string | null = null;
  let overBudget = true;
  try {
    apiKey = await deps.retrieveKey(provider);
    overBudget = await deps.isOverBudget(settings);
  } catch {
    return none;
  }
  const eligible = isVisionEligible({ aiEnabled, visionFlag, providerSupportsVision, hasApiKey: !!apiKey, overBudget });
  return eligible ? { eligible, provider, apiKey, billingDay: settings.billingDay } : none;
}

/**
 * Lê as configurações guardadas no momento do scan e decide o Vision. Nunca usa
 * uma cópia carregada antes (trocar o provedor no chat vale na hora).
 */
export async function resolveVisionFromStore(
  loadRaw: () => Promise<string | null>,
  deps: VisionEligibilityDeps,
): Promise<ResolvedVision> {
  let raw: string | null = null;
  try {
    raw = await loadRaw();
  } catch {
    raw = null;
  }
  return resolveVisionEligibility(parseStoredAISettings(raw), deps);
}

export interface ScanPayslipDeps {
  visionEligible: boolean;
  /** Chama o provedor de IA e devolve o resultado cru do Vision. */
  runVision: () => Promise<VisionPayslipInput>;
  /** Registra os tokens; só é chamado quando o Vision respondeu. */
  recordVisionTokens?: () => Promise<void> | void;
  /** OCR do aparelho (híbrido); devolve o texto lido. Erro = os dois falharam. */
  runLocalOcr: () => Promise<string>;
  onVisionError?: (err: unknown) => void;
}

function withWarning(data: PayslipParseResult, warning: string): PayslipParseResult {
  return data.warnings.includes(warning) ? data : { ...data, warnings: [warning, ...data.warnings] };
}

/**
 * Vision quando elegível (resultado sempre por `normalizeVisionPayslip`); se
 * não se aplica ou falha (rede, schema, chave), OCR do aparelho +
 * `parsePayslipText`, com aviso de queda. Leitura sem bruto nem líquido ganha
 * o aviso de valores não encontrados. Falha do OCR do aparelho é propagada.
 */
export async function scanPayslip(deps: ScanPayslipDeps): Promise<PayslipScanResult> {
  let result: PayslipScanResult | null = null;
  let fellBack = false;

  if (deps.visionEligible) {
    try {
      const raw = await deps.runVision();
      try {
        await deps.recordVisionTokens?.();
      } catch {
        // Falha ao registrar tokens não invalida a leitura.
      }
      result = { data: normalizeVisionPayslip(raw), source: "vision", fellBack: false };
    } catch (err) {
      deps.onVisionError?.(err);
      fellBack = true;
    }
  }

  if (!result) {
    const text = await deps.runLocalOcr();
    let data = parsePayslipText(text);
    if (fellBack) data = withWarning(data, PAYSLIP_SCAN_WARNINGS.visionFellBack);
    result = { data, source: "ocr", fellBack };
  }

  if (!(result.data.grossSalary > 0) && !(result.data.netSalary > 0)) {
    result = { ...result, data: withWarning(result.data, PAYSLIP_SCAN_WARNINGS.noValues) };
  }
  return result;
}

/** Leitura vazia (preencher à mão). */
export const EMPTY_PAYSLIP_PARSE: PayslipParseResult = Object.freeze({
  company: "",
  period: null,
  grossSalary: 0,
  netSalary: 0,
  earnings: [],
  deductions: [],
  confidence: 0,
  warnings: [],
}) as PayslipParseResult;
