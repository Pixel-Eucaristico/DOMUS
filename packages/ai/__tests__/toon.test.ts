import { describe, it, expect } from "vitest";
import { TOONSerializer } from "../src/toon/TOONSerializer";
import { TOONParser, TOONParseError } from "../src/toon/TOONParser";
import type {
  UserProfile,
  FinancialSnapshot,
  ConsultationResult,
} from "../src/types";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const mockProfile: UserProfile = {
  savingsRateAverage: 25,
  volatilityScore: 30,
  impulseScore: 40,
  consistencyScore: 80,
  riskTolerance: "Moderate",
};

const mockSnapshot: FinancialSnapshot = {
  totalBalance: 5000,
  monthlyIncome: 3000,
  monthlyExpenses: 2000,
  savingsRate: 33.3,
  topCategories: [
    { category: "Alimentação", amount: 800, percentage: 40 },
    { category: "Transporte", amount: 500, percentage: 25 },
    { category: "Lazer", amount: 300, percentage: 15 },
  ],
  spendingTrend: "+5%",
  riskProfile: "Moderate",
  volatilityScore: 30,
  impulseScore: 40,
};

// ─── TOONSerializer ───────────────────────────────────────────────────────────

describe("TOONSerializer", () => {
  describe("buildConsultationRequest", () => {
    it("produces correct section headers", () => {
      const result = TOONSerializer.buildConsultationRequest({
        profile: mockProfile,
        snapshot: mockSnapshot,
        goalDescription: "Comprar um celular de R$ 2000",
        question: "Vale a pena comprar agora?",
      });

      expect(result).toContain("consultation_request:");
      expect(result).toContain("profile:");
      expect(result).toContain("trend:");
      expect(result).toContain("goal:");
      expect(result).toContain("question:");
    });

    it("includes profile columns header", () => {
      const result = TOONSerializer.buildConsultationRequest({
        profile: mockProfile,
        snapshot: mockSnapshot,
        goalDescription: "Test",
        question: "Test?",
      });

      expect(result).toContain(
        "risk_tolerance | savings_rate | impulse_score | volatility_score",
      );
    });

    it("includes profile values", () => {
      const result = TOONSerializer.buildConsultationRequest({
        profile: mockProfile,
        snapshot: mockSnapshot,
        goalDescription: "Test",
        question: "Test?",
      });

      expect(result).toContain("Moderate | 25 | 40 | 30");
    });

    it("includes spending trend", () => {
      const result = TOONSerializer.buildConsultationRequest({
        profile: mockProfile,
        snapshot: mockSnapshot,
        goalDescription: "Test",
        question: "Test?",
      });

      expect(result).toContain("+5%");
    });

    it("includes goal description verbatim", () => {
      // goalDescription is passed as-is (not sanitized) in buildConsultationRequest
      const result = TOONSerializer.buildConsultationRequest({
        profile: mockProfile,
        snapshot: mockSnapshot,
        goalDescription: "Comprar notebook R$ 3000",
        question: "Vale?",
      });

      expect(result).toContain("goal:");
      expect(result).toContain("Comprar notebook R$ 3000");
    });
  });

  describe("buildClassificationRequest", () => {
    it("produces correct header and rows", () => {
      const result = TOONSerializer.buildClassificationRequest({
        transactions: [
          { id: "tx1", description: "MERCADO LIVRE", amount: 150 },
          { id: "tx2", description: "UBER", amount: 25 },
        ],
      });

      expect(result).toContain("classification_request:");
      expect(result).toContain("id | description | amount");
      expect(result).toContain("tx1 | MERCADO LIVRE | 150.00");
      expect(result).toContain("tx2 | UBER | 25.00");
    });

    it("sanitizes pipe characters in description", () => {
      const result = TOONSerializer.buildClassificationRequest({
        transactions: [{ id: "tx1", description: "A | B", amount: 10 }],
      });

      expect(result).toContain("tx1 | A - B | 10.00");
    });

    it("handles empty transactions list", () => {
      const result = TOONSerializer.buildClassificationRequest({
        transactions: [],
      });

      expect(result).toBe("classification_request:\nid | description | amount\n");
    });
  });

  describe("buildSummaryRequest", () => {
    it("produces correct section headers", () => {
      const result = TOONSerializer.buildSummaryRequest(mockSnapshot, "2026-03");

      expect(result).toContain("summary_request:");
      expect(result).toContain("month:");
      expect(result).toContain("2026-03");
      expect(result).toContain("snapshot:");
      expect(result).toContain("top_categories:");
    });

    it("includes snapshot values", () => {
      const result = TOONSerializer.buildSummaryRequest(mockSnapshot, "2026-03");

      expect(result).toContain(
        "balance | income | expenses | savings_rate | volatility",
      );
      expect(result).toContain("5000.00 | 3000.00 | 2000.00 | 33 | 30");
    });

    it("limits top categories to 3", () => {
      const snapshotWith5Cats: FinancialSnapshot = {
        ...mockSnapshot,
        topCategories: [
          { category: "A", amount: 500, percentage: 25 },
          { category: "B", amount: 400, percentage: 20 },
          { category: "C", amount: 300, percentage: 15 },
          { category: "D", amount: 200, percentage: 10 },
          { category: "E", amount: 100, percentage: 5 },
        ],
      };

      const result = TOONSerializer.buildSummaryRequest(snapshotWith5Cats, "2026-03");
      // Category data rows end with a percentage sign (e.g., "A | 500.00 | 25%")
      const catDataLines = result
        .split("\n")
        .filter((l) => l.trim().endsWith("%"));

      expect(catDataLines.length).toBe(3);
    });
  });
});

// ─── TOONParser ───────────────────────────────────────────────────────────────

describe("TOONParser", () => {
  describe("parseConsultationResponse", () => {
    const validResponse = `
consultation_response:
decision | risk | recommendation | behavior_insight | confidence
Buy | Low | Você tem reserva suficiente para esta compra. | Perfil moderado sem impulso recente. | 0.85
`;

    it("parses a valid consultation response", () => {
      const result = TOONParser.parseConsultationResponse(validResponse);

      expect(result.decision).toBe("Buy");
      expect(result.risk).toBe("Low");
      expect(result.recommendation).toBe(
        "Você tem reserva suficiente para esta compra.",
      );
      expect(result.confidence).toBe(0.85);
      expect(result.isLocalFallback).toBe(false);
    });

    it("parses Delay and Medium risk", () => {
      const raw = `
consultation_response:
decision | risk | recommendation | behavior_insight | confidence
Delay | Medium | Aguarde mais um mês. | Impulso alto recente. | 0.7
`;
      const result = TOONParser.parseConsultationResponse(raw);
      expect(result.decision).toBe("Delay");
      expect(result.risk).toBe("Medium");
    });

    it("parses Avoid and High risk", () => {
      const raw = `
consultation_response:
decision | risk | recommendation | behavior_insight | confidence
Avoid | High | Não recomendado no momento. | Volatilidade elevada. | 0.9
`;
      const result = TOONParser.parseConsultationResponse(raw);
      expect(result.decision).toBe("Avoid");
      expect(result.risk).toBe("High");
    });

    it("throws TOONParseError when header is missing", () => {
      expect(() =>
        TOONParser.parseConsultationResponse("some random text"),
      ).toThrow(TOONParseError);
    });

    it("throws TOONParseError on wrong column count", () => {
      const badResponse = `
consultation_response:
decision | risk | recommendation
Buy | Low | OK
`;
      expect(() =>
        TOONParser.parseConsultationResponse(badResponse),
      ).toThrow(TOONParseError);
    });

    it("throws TOONParseError on invalid decision value", () => {
      const badResponse = `
consultation_response:
decision | risk | recommendation | behavior_insight | confidence
Maybe | Low | OK. | None. | 0.5
`;
      expect(() =>
        TOONParser.parseConsultationResponse(badResponse),
      ).toThrow(TOONParseError);
    });

    it("throws TOONParseError on confidence outside 0-1", () => {
      const badResponse = `
consultation_response:
decision | risk | recommendation | behavior_insight | confidence
Buy | Low | OK. | None. | 1.5
`;
      expect(() =>
        TOONParser.parseConsultationResponse(badResponse),
      ).toThrow(TOONParseError);
    });
  });

  describe("parseClassificationResponse", () => {
    const originalIds = ["tx1", "tx2", "tx3"];

    it("parses valid classification rows", () => {
      const raw = `
classification_response:
transaction_id | category_id | confidence
tx1 | alimentacao | 0.9
tx2 | transporte | 0.8
`;
      const results = TOONParser.parseClassificationResponse(raw, originalIds);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        transactionId: "tx1",
        suggestedCategoryId: "alimentacao",
        confidence: 0.9,
      });
    });

    it("skips rows with unknown transaction IDs", () => {
      const raw = `
classification_response:
transaction_id | category_id | confidence
unknown_tx | alimentacao | 0.9
tx1 | lazer | 0.7
`;
      const results = TOONParser.parseClassificationResponse(raw, originalIds);
      expect(results).toHaveLength(1);
      expect(results[0]!.transactionId).toBe("tx1");
    });

    it("throws TOONParseError when header is missing", () => {
      expect(() =>
        TOONParser.parseClassificationResponse("random", originalIds),
      ).toThrow(TOONParseError);
    });
  });
});
