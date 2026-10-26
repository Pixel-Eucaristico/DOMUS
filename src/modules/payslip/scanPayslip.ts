import {
  normalizeVisionPayslip,
  parsePayslipText,
  type PayslipParseResult,
  type VisionPayslipInput,
} from "@packages/parsers/src/payslipParser";

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
