import type { PayslipParseResult } from "@packages/parsers/src/payslipParser";
import type { PayslipSource } from "@packages/events/src/types";

/**
 * Story 11.5: passagem em memória do chat da IA para a revisão de `/payslips`.
 * Lida uma vez (`take` limpa). Nunca vai para armazenamento do aparelho nem para o log:
 * o holerite só é gravado quando o usuário salva a revisão. Validade curta (R6 da
 * revisão): o que a tela não leu em `PENDING_PAYSLIP_TTL_MS` sai da memória.
 */

export interface PendingPayslipReview {
  data: PayslipParseResult;
  source: PayslipSource;
}

/** A tela abre logo depois do `set`; dois minutos sobram. */
export const PENDING_PAYSLIP_TTL_MS = 2 * 60 * 1000;

let pending: { review: PendingPayslipReview; expiresAt: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function clear(): void {
  pending = null;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

export function setPendingPayslipReview(review: PendingPayslipReview, now: number = Date.now()): void {
  clear();
  pending = { review, expiresAt: now + PENDING_PAYSLIP_TTL_MS };
  timer = setTimeout(clear, PENDING_PAYSLIP_TTL_MS);
  // Não segura o processo (Node/testes) só por causa da limpeza.
  (timer as { unref?: () => void }).unref?.();
}

export function takePendingPayslipReview(now: number = Date.now()): PendingPayslipReview | null {
  const entry = pending;
  clear();
  if (!entry || now > entry.expiresAt) return null;
  return entry.review;
}
