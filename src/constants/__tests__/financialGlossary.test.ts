import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { detectGlossaryTerms, glossaryShortcuts, FINANCIAL_GLOSSARY } from "../financialGlossary";

const ROOT_DIR = path.resolve(__dirname, "../../..");

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
    expect(detectGlossaryTerms("carteira diversificada, diversifique os aportes, reserva emergencial e holerite", 9)).toEqual([
      "reserva_emergencia",
      "diversificacao",
      "descontos_holerite",
    ]);
  });

  it("não confunde quase-acertos", () => {
    expect(detectGlossaryTerms("150/30/200; selico; fgtsx; salário mínimo; inssurance; preserva de emergência", 9)).toEqual([]);
  });

  it("texto vazio, limite <= 0, limite padrão de 3 e termo repetido", () => {
    expect(detectGlossaryTerms("")).toEqual([]);
    expect(detectGlossaryTerms("selic fgts", 0)).toEqual([]);
    expect(detectGlossaryTerms("selic fgts", -1)).toEqual([]);
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

describe("Story 11.2 UI & tooltip contracts", () => {
  it("index.tsx exibe InfoTip 50/30/20 e TransactionBottomSheet exibe InfoTip de dividendo", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT_DIR, "app/(tabs)/index.tsx"), "utf8");
    const sheetSrc = fs.readFileSync(path.join(ROOT_DIR, "src/components/transaction/TransactionBottomSheet.tsx"), "utf8");

    expect(indexSrc).toContain('<InfoTip term="50/30/20" />');
    expect(sheetSrc).toContain("É dividendo/rendimento");
    expect(sheetSrc).toContain("<InfoTip");
    expect(sheetSrc).toContain("flexShrink: 1");
  });

  it("ai-chat.tsx e FinancialTooltip.tsx mantêm fiação de tooltips, responder e scroll", () => {
    const chatSrc = fs.readFileSync(path.join(ROOT_DIR, "app/ai-chat.tsx"), "utf8");
    const tooltipSrc = fs.readFileSync(path.join(ROOT_DIR, "src/components/ai/FinancialTooltip.tsx"), "utf8");

    expect(chatSrc).toContain("glossaryShortcuts(msg.text, { isUser, enabled: tooltipsEnabled })");
    expect(chatSrc).toContain("!settingsLoading && (settings.tooltipsEnabled ?? true)");
    expect(chatSrc).toContain("<FinancialTooltip");

    expect(tooltipSrc).toContain("statusBarTranslucent");
    expect(tooltipSrc).toContain("navigationBarTranslucent");
    expect(tooltipSrc).toContain("onStartShouldSetResponder");
    expect(tooltipSrc).toContain("accessibilityViewIsModal");
    expect(tooltipSrc).toContain("ScrollView");
  });
});

