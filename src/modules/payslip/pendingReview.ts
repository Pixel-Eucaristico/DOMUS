import type { PayslipParseResult } from "@packages/parsers/src/payslipParser";
import type { PayslipSource } from "@packages/events/src/types";

/**
 * Story 11.5: passagem em memória do chat da IA para a revisão de `/payslips`.
 * Lida uma vez (`take` limpa). Nunca vai para armazenamento do aparelho nem para o log:
 * o holerite só é gravado quando o usuário salva a revisão.
 */

export interface PendingPayslipReview {
  data: PayslipParseResult;
  source: PayslipSource;
}

let pending: PendingPayslipReview | null = null;

export function setPendingPayslipReview(review: PendingPayslipReview): void {
  pending = review;
}

export function takePendingPayslipReview(): PendingPayslipReview | null {
  const review = pending;
  pending = null;
  return review;
}
