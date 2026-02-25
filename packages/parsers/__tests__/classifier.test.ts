import { describe, it, expect } from "vitest";
import {
  classifyByKeyword,
  createKeywordClassifier,
  createHybridClassifier,
} from "../src/classifier";

describe("classifyByKeyword", () => {
  it("classifies food items as alimentacao/needs", () => {
    const result = classifyByKeyword("ARROZ TIPO 1 5KG");
    expect(result.categoryId).toBe("alimentacao");
    expect(result.categoryGroup).toBe("needs");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.method).toBe("keyword");
  });

  it("classifies hygiene items as higiene/needs", () => {
    const result = classifyByKeyword("SABONETE DOVE 90G");
    expect(result.categoryId).toBe("higiene");
    expect(result.categoryGroup).toBe("needs");
  });

  it("classifies cleaning items as limpeza/needs", () => {
    const result = classifyByKeyword("DETERGENTE LIMPOL 500ML");
    expect(result.categoryId).toBe("limpeza");
    expect(result.categoryGroup).toBe("needs");
  });

  it("classifies medicine items as saude/needs", () => {
    const result = classifyByKeyword("DIPIRONA SODICA 500MG");
    expect(result.categoryId).toBe("saude");
    expect(result.categoryGroup).toBe("needs");
  });

  it("classifies snacks/drinks as lazer/wants", () => {
    const result = classifyByKeyword("CERVEJA BRAHMA LATA 350ML");
    expect(result.categoryId).toBe("lazer");
    expect(result.categoryGroup).toBe("wants");
  });

  it("classifies chocolate as lazer/wants", () => {
    const result = classifyByKeyword("CHOCOLATE LACTA 90G");
    expect(result.categoryId).toBe("lazer");
    expect(result.categoryGroup).toBe("wants");
  });

  it("returns outros for unknown items", () => {
    const result = classifyByKeyword("ITEM DESCONHECIDO XYZ");
    expect(result.categoryId).toBe("outros");
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("handles accented characters", () => {
    const result = classifyByKeyword("CAFÉ PILÃO 500G");
    expect(result.categoryId).toBe("alimentacao");
  });

  it("handles case insensitivity", () => {
    const r1 = classifyByKeyword("Arroz");
    const r2 = classifyByKeyword("ARROZ");
    const r3 = classifyByKeyword("arroz");
    expect(r1.categoryId).toBe("alimentacao");
    expect(r2.categoryId).toBe("alimentacao");
    expect(r3.categoryId).toBe("alimentacao");
  });

  it("classifies refrigerante as lazer/wants", () => {
    const result = classifyByKeyword("REFRIGERANTE COCA-COLA 2L");
    expect(result.categoryId).toBe("lazer");
    expect(result.categoryGroup).toBe("wants");
  });
});

describe("createKeywordClassifier", () => {
  it("returns a ClassifierAdapter", async () => {
    const classifier = createKeywordClassifier();
    const result = await classifier.classify("FEIJAO PRETO 1KG");
    expect(result.categoryId).toBe("alimentacao");
    expect(result.method).toBe("keyword");
  });
});

describe("createHybridClassifier", () => {
  it("uses keyword classifier when confidence is high", async () => {
    const classifier = createHybridClassifier();
    const result = await classifier.classify("ARROZ BRANCO 5KG");
    expect(result.categoryId).toBe("alimentacao");
    expect(result.method).toBe("keyword");
  });

  it("falls back to keyword when no Gemini key provided and item unknown", async () => {
    const classifier = createHybridClassifier();
    const result = await classifier.classify("GADGET ELETRONICO XZ99");
    expect(result.categoryId).toBe("outros");
    expect(result.method).toBe("keyword");
  });
});
