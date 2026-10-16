import { describe, it, expect } from "vitest";
import { detectGlossaryTerms, glossaryShortcuts, FINANCIAL_GLOSSARY } from "../financialGlossary";

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
    expect(new Set(all)).toEqual(new Set(Object.keys(FINANCIAL_GLOSSARY)));
  });

  it("aceita variações comuns", () => {
    expect(detectGlossaryTerms("carteira diversificada e reserva emergencial", 9)).toEqual(["reserva_emergencia", "diversificacao"]);
  });

  it("não confunde quase-acertos", () => {
    expect(detectGlossaryTerms("150/30/200; selico; fgtsx; salário mínimo; inssurance", 9)).toEqual([]);
  });

  it("texto vazio, limite padrão de 3 e termo repetido", () => {
    expect(detectGlossaryTerms("")).toEqual([]);
    expect(detectGlossaryTerms("selic selic selic")).toEqual(["taxa_selic"]);
    expect(detectGlossaryTerms("50/30/20, selic, reserva de emergência e juros compostos")).toHaveLength(3);
  });
});

describe("glossaryShortcuts", () => {
  const text = "Siga a regra 50/30/20, monte a reserva de emergência, olhe a Selic e os juros compostos.";

  it("mostra até 3 atalhos nas respostas da IA com a opção ligada", () => {
    expect(glossaryShortcuts(text, { isUser: false, enabled: true })).toEqual(["50/30/20", "taxa_selic", "reserva_emergencia"]);
  });

  it("nada com a opção desligada", () => {
    expect(glossaryShortcuts(text, { isUser: false, enabled: false })).toEqual([]);
  });

  it("nada nas mensagens do usuário", () => {
    expect(glossaryShortcuts(text, { isUser: true, enabled: true })).toEqual([]);
  });

  it("nada quando a resposta não cita termo do glossário", () => {
    expect(glossaryShortcuts("Olá! Como posso ajudar?", { isUser: false, enabled: true })).toEqual([]);
  });
});

