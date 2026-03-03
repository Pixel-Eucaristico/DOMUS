import type { UserProfile, FinancialSnapshot } from "../types";

// ─── Input Shapes ─────────────────────────────────────────────────────────────

export interface ConsultationRequestInput {
  profile: UserProfile;
  snapshot: FinancialSnapshot;
  goalDescription: string;
  question: string;
}

export interface ClassificationRequestInput {
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
  }>;
}

// ─── Serializer ───────────────────────────────────────────────────────────────

export class TOONSerializer {
  /**
   * Builds a `consultation_request` TOON block.
   * Format:
   *   consultation_request:
   *   profile:
   *   risk_tolerance | savings_rate | impulse_score | volatility_score
   *   {values}
   *
   *   trend:
   *   spending_variation_last_3_months
   *   {trend}
   *
   *   goal:
   *   {goalDescription}
   *
   *   question:
   *   {question}
   */
  static buildConsultationRequest(input: ConsultationRequestInput): string {
    const { profile, snapshot, goalDescription, question } = input;
    const savingsRate = Math.round(profile.savingsRateAverage);
    const impulse = Math.round(profile.impulseScore);
    const volatility = Math.round(profile.volatilityScore);

    return [
      "consultation_request:",
      "profile:",
      "risk_tolerance | savings_rate | impulse_score | volatility_score",
      `${profile.riskTolerance} | ${savingsRate} | ${impulse} | ${volatility}`,
      "",
      "trend:",
      "spending_variation_last_3_months",
      snapshot.spendingTrend,
      "",
      "goal:",
      goalDescription,
      "",
      "question:",
      question,
    ].join("\n");
  }

  /**
   * Builds a `classification_request` TOON block for batch classification.
   * Format:
   *   classification_request:
   *   id | description | amount
   *   {id} | {description} | {amount}
   *   ...
   */
  static buildClassificationRequest(input: ClassificationRequestInput): string {
    const rows = input.transactions
      .map(
        (tx) =>
          `${tx.id} | ${TOONSerializer.sanitize(tx.description)} | ${tx.amount.toFixed(2)}`,
      )
      .join("\n");

    return [
      "classification_request:",
      "id | description | amount",
      rows,
    ].join("\n");
  }

  /**
   * Builds a `summary_request` TOON block.
   * Format:
   *   summary_request:
   *   month:
   *   {month}
   *
   *   snapshot:
   *   balance | income | expenses | savings_rate | volatility
   *   {values}
   *
   *   top_categories:
   *   category | amount | pct
   *   {rows...}
   */
  static buildSummaryRequest(snapshot: FinancialSnapshot, month: string): string {
    const balance = snapshot.totalBalance.toFixed(2);
    const income = snapshot.monthlyIncome.toFixed(2);
    const expenses = snapshot.monthlyExpenses.toFixed(2);
    const savings = Math.round(snapshot.savingsRate);
    const volatility = Math.round(snapshot.volatilityScore);

    const catRows = snapshot.topCategories
      .slice(0, 3)
      .map(
        (c) =>
          `${TOONSerializer.sanitize(c.category)} | ${c.amount.toFixed(2)} | ${Math.round(c.percentage)}%`,
      )
      .join("\n");

    return [
      "summary_request:",
      "month:",
      month,
      "",
      "snapshot:",
      "balance | income | expenses | savings_rate | volatility",
      `${balance} | ${income} | ${expenses} | ${savings} | ${volatility}`,
      "",
      "top_categories:",
      "category | amount | pct",
      catRows,
    ].join("\n");
  }

  /** Strip pipe characters and trim to avoid TOON parse errors */
  private static sanitize(text: string): string {
    return text.replace(/\|/g, "-").replace(/\n/g, " ").trim();
  }
}
