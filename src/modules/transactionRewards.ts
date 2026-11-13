/**
 * Decide se um evento de transação concede XP e streak.
 * Módulo puro (sem `react-native`) para ser testável no Vitest.
 */

import { EVENT_TYPES } from "@packages/events/src/types";

export interface TransactionRewardEligibility {
  awardXp: boolean;
  updateStreak: boolean;
}

export interface TransactionRewardInput {
  eventType: string;
  payload?: { status?: string } | null;
  /** Transação existente (antes do evento), quando houver. */
  existing?: { status?: string } | null;
}

const NOT_ELIGIBLE: TransactionRewardEligibility = { awardXp: false, updateStreak: false };
const ELIGIBLE: TransactionRewardEligibility = { awardXp: true, updateStreak: true };

function isConfirmedOrUnset(status: string | undefined): boolean {
  return status === undefined || status === "confirmed";
}

export function transactionRewardEligibility(
  input: TransactionRewardInput,
): TransactionRewardEligibility {
  const { eventType, payload, existing } = input;

  if (eventType === EVENT_TYPES.TRANSACTION_CREATED) {
    return isConfirmedOrUnset(payload?.status) ? { ...ELIGIBLE } : { ...NOT_ELIGIBLE };
  }

  if (eventType === EVENT_TYPES.TRANSACTION_UPDATED) {
    if (existing && existing.status === "pending" && payload?.status === "confirmed") {
      return { ...ELIGIBLE };
    }
    return { ...NOT_ELIGIBLE };
  }

  return { ...NOT_ELIGIBLE };
}
