import type { ConsultationResult } from "@packages/ai";

// ─── ConfidenceValidator ──────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLD = 0.5;

export class ConfidenceValidator {
  /** Returns true if the AI result meets the minimum confidence threshold. */
  static isAcceptable(result: ConsultationResult): boolean {
    return result.confidence >= CONFIDENCE_THRESHOLD;
  }

  /**
   * Throws if confidence is below the threshold.
   * Use cases catch this and fall back to local logic.
   */
  static assertAcceptable(result: ConsultationResult): void {
    if (!ConfidenceValidator.isAcceptable(result)) {
      throw new Error(
        `AI confidence ${result.confidence.toFixed(2)} below threshold ${CONFIDENCE_THRESHOLD}`,
      );
    }
  }
}
