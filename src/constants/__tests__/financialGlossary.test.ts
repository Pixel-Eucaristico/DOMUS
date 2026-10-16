import { describe, it, expect } from "vitest";
import { detectGlossaryTerms, FINANCIAL_GLOSSARY } from "../financialGlossary";

describe("detectGlossaryTerms", () => {
  it("encontra termos com acentos e caixa variados", () => {
    expect(
      detectGlossaryTerms("Pela regra 50/30/20 você deveria montar uma Reserva de Emergência antes de olhar a SELIC."),
    ).toEqual(["50/30/20", "taxa_selic", "reserva_emergencia"]);
  });

  it("respeita o limite e a ordem do glossário", () => {
    const text = "salário líquido, salário bruto, INSS, FGTS e CDB";
    expect(detectGlossaryTerms(text, 2)).toEqual(["salario_bruto", "salario_liquido"]);
  });

  it("não confunde palavras parecidas", () => {
    expect(detectGlossaryTerms("exportar o arquivo; xpto; cdbx")).toEqual([]);
  });

  it("todo termo detectável tem entrada no glossário", () => {
    const all = detectGlossaryTerms("50/30/20 selic reserva de emergencia juros compostos diversificar salario bruto salario liquido inss fgts cdb xp", 99);
    expect(all).toHaveLength(Object.keys(FINANCIAL_GLOSSARY).length);
  });
});
