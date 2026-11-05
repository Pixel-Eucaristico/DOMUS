import { describe, it, expect } from "vitest";
import {
  getLevelRewards,
  isFeatureUnlocked,
  calculateQuickAnalysis,
  calculateAnnualReport,
} from "../src/rewardsEngine";
import type { BudgetBreakdown, TransactionPayload } from "../../domain/src/transactions";

describe("Rewards Engine", () => {
  describe("getLevelRewards & isFeatureUnlocked", () => {
    it("locks all rewards for level 1 user", () => {
      const rewards = getLevelRewards(1);
      expect(rewards).toHaveLength(3);
      expect(rewards.every((r) => !r.isUnlocked)).toBe(true);

      expect(isFeatureUnlocked("quick_analysis", 1)).toBe(false);
      expect(isFeatureUnlocked("liturgical_expansion", 1)).toBe(false);
      expect(isFeatureUnlocked("annual_report_and_custom_budget", 1)).toBe(false);
    });

    it("unlocks Level 2 quick_analysis reward when user reaches level 2", () => {
      const rewards = getLevelRewards(2);
      const quickAnalysis = rewards.find((r) => r.featureKey === "quick_analysis");
      const liturgical = rewards.find((r) => r.featureKey === "liturgical_expansion");
      const annualReport = rewards.find((r) => r.featureKey === "annual_report_and_custom_budget");

      expect(quickAnalysis?.isUnlocked).toBe(true);
      expect(liturgical?.isUnlocked).toBe(false);
      expect(annualReport?.isUnlocked).toBe(false);

      expect(isFeatureUnlocked("quick_analysis", 2)).toBe(true);
      expect(isFeatureUnlocked("liturgical_expansion", 2)).toBe(false);
    });

    it("unlocks Level 5 liturgical_expansion reward when user reaches level 5", () => {
      const rewards = getLevelRewards(5);
      const quickAnalysis = rewards.find((r) => r.featureKey === "quick_analysis");
      const liturgical = rewards.find((r) => r.featureKey === "liturgical_expansion");
      const annualReport = rewards.find((r) => r.featureKey === "annual_report_and_custom_budget");

      expect(quickAnalysis?.isUnlocked).toBe(true);
      expect(liturgical?.isUnlocked).toBe(true);
      expect(annualReport?.isUnlocked).toBe(false);

      expect(isFeatureUnlocked("liturgical_expansion", 5)).toBe(true);
      expect(isFeatureUnlocked("annual_report_and_custom_budget", 5)).toBe(false);
    });

    it("unlocks all rewards when user reaches level 10", () => {
      const rewards = getLevelRewards(10);
      expect(rewards.every((r) => r.isUnlocked)).toBe(true);

      expect(isFeatureUnlocked("quick_analysis", 10)).toBe(true);
      expect(isFeatureUnlocked("liturgical_expansion", 10)).toBe(true);
      expect(isFeatureUnlocked("annual_report_and_custom_budget", 10)).toBe(true);
    });
  });

  describe("calculateQuickAnalysis", () => {
    it("returns empty diagnosis when there are no expenses", () => {
      const budget: BudgetBreakdown = {
        needs: 0,
        wants: 0,
        savings: 0,
        needsPercent: 0,
        wantsPercent: 0,
        savingsPercent: 0,
        totalIncome: 0,
        adherenceScore: 0,
      };
      const result = calculateQuickAnalysis(budget);
      expect(result.status).toBe("empty");
    });

    it("classifies as frugal when wants <= 30% of needs", () => {
      const budget: BudgetBreakdown = {
        needs: 1000,
        wants: 200,
        savings: 500,
        needsPercent: 50,
        wantsPercent: 10,
        savingsPercent: 25,
        totalIncome: 2000,
        adherenceScore: 100,
      };
      const result = calculateQuickAnalysis(budget);
      expect(result.status).toBe("frugal");
      expect(result.diagnosis).toContain("Frugal");
      expect(result.ratio).toBe(0.2);
    });

    it("classifies as balanced when wants <= 60% of needs", () => {
      const budget: BudgetBreakdown = {
        needs: 1000,
        wants: 500,
        savings: 400,
        needsPercent: 50,
        wantsPercent: 25,
        savingsPercent: 20,
        totalIncome: 2000,
        adherenceScore: 100,
      };
      const result = calculateQuickAnalysis(budget);
      expect(result.status).toBe("balanced");
      expect(result.diagnosis).toContain("Equilíbrio");
      expect(result.ratio).toBe(0.5);
    });

    it("classifies as lifestyle_heavy when wants are between 60% and 100% of needs", () => {
      const budget: BudgetBreakdown = {
        needs: 1000,
        wants: 850,
        savings: 100,
        needsPercent: 50,
        wantsPercent: 42,
        savingsPercent: 5,
        totalIncome: 2000,
        adherenceScore: 70,
      };
      const result = calculateQuickAnalysis(budget);
      expect(result.status).toBe("lifestyle_heavy");
      expect(result.diagnosis).toContain("Estilo de Vida");
      expect(result.ratio).toBe(0.85);
    });

    it("classifies as critical when wants exceed needs", () => {
      const budget: BudgetBreakdown = {
        needs: 500,
        wants: 900,
        savings: 0,
        needsPercent: 35,
        wantsPercent: 65,
        savingsPercent: 0,
        totalIncome: 1400,
        adherenceScore: 30,
      };
      const result = calculateQuickAnalysis(budget);
      expect(result.status).toBe("critical");
      expect(result.diagnosis).toContain("Atenção");
      expect(result.ratio).toBe(1.8);
    });
  });

  describe("calculateAnnualReport", () => {
    it("aggregates yearly data correctly across months", () => {
      const categories = {
        cat_housing: { group: "needs" as const },
        cat_leisure: { group: "wants" as const },
        cat_invest: { group: "savings" as const },
      };

      const transactions: TransactionPayload[] = [
        {
          id: "tx-1",
          accountId: "acc-1",
          amount: 5000,
          date: "2026-01-15",
          type: "income",
          status: "confirmed",
          description: "Salário Janeiro",
        },
        {
          id: "tx-2",
          accountId: "acc-1",
          amount: 2000,
          categoryId: "cat_housing",
          date: "2026-01-20",
          type: "expense",
          status: "confirmed",
          description: "Aluguel",
        },
        {
          id: "tx-3",
          accountId: "acc-1",
          amount: 1000,
          categoryId: "cat_invest",
          date: "2026-01-25",
          type: "expense",
          status: "confirmed",
          description: "Aporte",
        },
        {
          id: "tx-4",
          accountId: "acc-1",
          amount: 5000,
          date: "2026-02-15",
          type: "income",
          status: "confirmed",
          description: "Salário Fevereiro",
        },
        {
          id: "tx-5",
          accountId: "acc-1",
          amount: 1500,
          categoryId: "cat_invest",
          date: "2026-02-25",
          type: "expense",
          status: "confirmed",
          description: "Aporte",
        },
      ];

      const report = calculateAnnualReport(transactions, categories, 2026);
      expect(report.year).toBe(2026);
      expect(report.totalIncome).toBe(10000);
      expect(report.totalSavings).toBe(2500);
      expect(report.months).toHaveLength(12);
      expect(report.bestSavingMonth).toBe("Fevereiro"); // 1500 in Feb > 1000 in Jan
    });
  });
});
