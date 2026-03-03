import type {
  ConsultationResult,
  TransactionClassification,
  MonthlySummary,
  ConsultationDecision,
  ConsultationRisk,
} from "../types";

// ─── Error ────────────────────────────────────────────────────────────────────

export class TOONParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "TOONParseError";
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export class TOONParser {
  /**
   * Parses a `consultation_response` TOON block.
   * Expected columns: decision | risk | recommendation | behavior_insight | confidence
   */
  static parseConsultationResponse(raw: string): ConsultationResult {
    const block = TOONParser.extractBlock(raw, "consultation_response");
    const rows = TOONParser.parseTable(block, 5);
    if (rows.length === 0) {
      throw new TOONParseError("consultation_response table is empty", raw);
    }
    const row = rows[0]!;

    const decision = TOONParser.validateDecision(row["decision"] ?? "");
    const risk = TOONParser.validateRisk(row["risk"] ?? "");
    const recommendation = (row["recommendation"] ?? "").trim();
    const behaviorInsight = (row["behavior_insight"] ?? "").trim();
    const confidence = TOONParser.validateConfidence(row["confidence"] ?? "");

    if (!recommendation) {
      throw new TOONParseError("recommendation is empty", raw);
    }

    return {
      decision,
      risk,
      recommendation,
      behaviorInsight,
      confidence,
      isLocalFallback: false,
      tokensUsed: 0,
    };
  }

  /**
   * Parses a `classification_response` TOON block.
   * Expected columns: transaction_id | category_id | confidence
   */
  static parseClassificationResponse(
    raw: string,
    originalIds: readonly string[],
  ): TransactionClassification[] {
    const block = TOONParser.extractBlock(raw, "classification_response");
    const rows = TOONParser.parseTable(block, 3);
    const results: TransactionClassification[] = [];

    for (const row of rows) {
      const transactionId = (row["transaction_id"] ?? "").trim();
      const suggestedCategoryId = (row["category_id"] ?? "").trim();
      const confidence = TOONParser.validateConfidence(row["confidence"] ?? "0");

      if (!originalIds.includes(transactionId)) continue;
      if (!suggestedCategoryId) continue;

      results.push({
        transactionId,
        suggestedCategoryId,
        confidence,
        isLocalFallback: false,
      });
    }

    return results;
  }

  /**
   * Parses a `summary_response` TOON block.
   * Expected columns: savings_rate | budget_adherence | insight
   */
  static parseSummaryResponse(raw: string, month: string): MonthlySummary {
    const block = TOONParser.extractBlock(raw, "summary_response");
    const rows = TOONParser.parseTable(block, 3);
    if (rows.length === 0) {
      throw new TOONParseError("summary_response table is empty", raw);
    }

    const insights: string[] = [];
    let savingsRate = 0;
    let budgetAdherence = 0;

    for (const row of rows) {
      const sr = parseFloat(row["savings_rate"] ?? "0");
      const ba = parseFloat(row["budget_adherence"] ?? "0");
      const insight = (row["insight"] ?? "").trim();

      if (!isNaN(sr)) savingsRate = sr;
      if (!isNaN(ba)) budgetAdherence = ba;
      if (insight) insights.push(insight);
    }

    return {
      month,
      totalIncome: 0,
      totalExpenses: 0,
      savingsRate,
      topExpenseCategories: [],
      budgetAdherence,
      insights,
      isLocalFallback: false,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Finds a `{header}:` line and collects all non-blank lines following it
   * until the next blank line or EOF.
   * Throws if the header is not found.
   */
  private static extractBlock(raw: string, header: string): string {
    const lines = raw.split("\n");
    const headerLine = `${header}:`;
    const startIdx = lines.findIndex(
      (l) => l.trim().toLowerCase() === headerLine.toLowerCase(),
    );

    if (startIdx === -1) {
      throw new TOONParseError(
        `Header "${headerLine}" not found in response`,
        raw,
      );
    }

    const blockLines: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trim() === "") {
        if (blockLines.length > 0) break; // end of block
        continue;
      }
      blockLines.push(line.trim());
    }

    return blockLines.join("\n");
  }

  /**
   * Parses a TOON table block.
   * Line 1 = column names separated by ` | `
   * Lines 2+ = value rows separated by ` | `
   * Throws if any row has a different column count than the header.
   */
  private static parseTable(
    block: string,
    expectedColumns: number,
  ): Array<Record<string, string>> {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new TOONParseError(
        `TOON table requires at least 2 lines (header + 1 row), got ${lines.length}`,
        block,
      );
    }

    const headerLine = lines[0]!;
    const columns = headerLine.split("|").map((c) => c.trim().toLowerCase().replace(/\s+/g, "_"));

    if (columns.length !== expectedColumns) {
      throw new TOONParseError(
        `Expected ${expectedColumns} columns, got ${columns.length} in header: "${headerLine}"`,
        block,
      );
    }

    const results: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const valueLine = lines[i]!;
      const values = valueLine.split("|").map((v) => v.trim());

      if (values.length !== expectedColumns) {
        throw new TOONParseError(
          `Row ${i} has ${values.length} values, expected ${expectedColumns}: "${valueLine}"`,
          block,
        );
      }

      const row: Record<string, string> = {};
      for (let j = 0; j < columns.length; j++) {
        row[columns[j]!] = values[j]!;
      }
      results.push(row);
    }

    return results;
  }

  private static validateConfidence(value: string): number {
    const n = parseFloat(value.trim());
    if (isNaN(n) || n < 0 || n > 1) {
      throw new TOONParseError(
        `confidence must be a number between 0 and 1, got "${value}"`,
        value,
      );
    }
    return n;
  }

  private static validateDecision(value: string): ConsultationDecision {
    const normalized = value.trim();
    const valid: ConsultationDecision[] = ["Buy", "Delay", "Avoid"];
    const match = valid.find(
      (v) => v.toLowerCase() === normalized.toLowerCase(),
    );
    if (!match) {
      throw new TOONParseError(
        `decision must be one of Buy|Delay|Avoid, got "${value}"`,
        value,
      );
    }
    return match;
  }

  private static validateRisk(value: string): ConsultationRisk {
    const normalized = value.trim();
    const valid: ConsultationRisk[] = ["Low", "Medium", "High"];
    const match = valid.find(
      (v) => v.toLowerCase() === normalized.toLowerCase(),
    );
    if (!match) {
      throw new TOONParseError(
        `risk must be one of Low|Medium|High, got "${value}"`,
        value,
      );
    }
    return match;
  }
}
