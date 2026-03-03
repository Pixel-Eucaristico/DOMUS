import { describe, it, expect } from "vitest";
import { IntentClassifier } from "../src/intent/IntentClassifier";

describe("IntentClassifier", () => {
  describe("classify_transaction intent", () => {
    it("detects 'categorizar'", () => {
      expect(IntentClassifier.classify("Pode categorizar esse gasto?")).toBe(
        "classify_transaction",
      );
    });

    it("detects 'classificar'", () => {
      expect(IntentClassifier.classify("Como classificar essa despesa?")).toBe(
        "classify_transaction",
      );
    });

    it("detects 'categoria' keyword", () => {
      expect(IntentClassifier.classify("Qual é a categoria desse item?")).toBe(
        "classify_transaction",
      );
    });

    it("detects 'qual categoria' with accents stripped", () => {
      expect(IntentClassifier.classify("Qual categoria para academia?")).toBe(
        "classify_transaction",
      );
    });

    it("detects English 'classify'", () => {
      expect(IntentClassifier.classify("Can you classify this transaction?")).toBe(
        "classify_transaction",
      );
    });
  });

  describe("monthly_summary intent", () => {
    it("detects 'resumo'", () => {
      expect(IntentClassifier.classify("Me dá um resumo do mês")).toBe(
        "monthly_summary",
      );
    });

    it("detects 'gastei'", () => {
      expect(IntentClassifier.classify("Quanto gastei esse mês?")).toBe(
        "monthly_summary",
      );
    });

    it("detects 'balanço' (with accent)", () => {
      expect(IntentClassifier.classify("Qual é o balanço mensal?")).toBe(
        "monthly_summary",
      );
    });

    it("detects 'análise' (with accent)", () => {
      expect(IntentClassifier.classify("Faz uma análise do mês")).toBe(
        "monthly_summary",
      );
    });

    it("detects English 'summary'", () => {
      expect(IntentClassifier.classify("Give me a monthly summary")).toBe(
        "monthly_summary",
      );
    });
  });

  describe("purchase_advice intent", () => {
    it("detects 'comprar'", () => {
      expect(IntentClassifier.classify("Devo comprar um celular novo?")).toBe(
        "purchase_advice",
      );
    });

    it("detects 'vale a pena'", () => {
      expect(IntentClassifier.classify("Vale a pena comprar agora?")).toBe(
        "purchase_advice",
      );
    });

    it("detects 'posso comprar'", () => {
      expect(IntentClassifier.classify("Posso comprar esse notebook?")).toBe(
        "purchase_advice",
      );
    });

    it("detects English 'should i buy'", () => {
      expect(IntentClassifier.classify("Should I buy this?")).toBe(
        "purchase_advice",
      );
    });

    it("detects 'me aconselha'", () => {
      // Avoid "essa compra" which matches classify_transaction first
      expect(IntentClassifier.classify("Me aconselha sobre isso")).toBe(
        "purchase_advice",
      );
    });
  });

  describe("unknown intent", () => {
    it("returns unknown for gibberish", () => {
      expect(IntentClassifier.classify("xkcd random text 12345")).toBe(
        "unknown",
      );
    });

    it("returns unknown for empty string", () => {
      expect(IntentClassifier.classify("")).toBe("unknown");
    });

    it("returns unknown for generic greeting", () => {
      expect(IntentClassifier.classify("Olá, tudo bem?")).toBe("unknown");
    });
  });

  describe("normalization", () => {
    it("handles uppercase input", () => {
      expect(IntentClassifier.classify("CATEGORIZAR ESSE GASTO")).toBe(
        "classify_transaction",
      );
    });

    it("handles accented characters in matching keyword", () => {
      // 'análise' with accent → normalized to 'analise', matches 'analise' keyword
      expect(IntentClassifier.classify("Preciso de uma análise")).toBe(
        "monthly_summary",
      );
    });
  });
});
