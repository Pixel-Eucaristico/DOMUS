import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  parsePayslipText,
  normalizePayslipPeriod,
  normalizeVisionPayslip,
  parseBRL,
  PAYSLIP_WARNINGS as W,
  type VisionPayslipInput,
} from "../src/payslipParser";
import { performance } from "perf_hooks";
import { PayslipOCRSchema, type PayslipOCRResult } from "../../ai/src/vision/ocrSchema";

// ─── Amostras de OCR (layouts reais simplificados) ───────────────────────────

/** Layout A — clássico (Domínio/Questor): cabeçalho com nome em tabela, totais em linha de cabeçalho. */
const LAYOUT_CLASSICO = `
ACME COMERCIO DE ALIMENTOS LTDA
CNPJ: 12.345.678/0001-95                     Recibo de Pagamento de Salário
Referente ao Mês / Ano: Setembro/2026
Código   Nome do Funcionário                 CBO      Departamento
42       MARIA APARECIDA SILVA               252210   ADM
Cód.  Descrição                 Referência   Vencimentos   Descontos
001   SALARIO BASE              30,00        5.000,00
015   HORAS EXTRAS 50%          10,00        340,91
901   INSS                      14,00                      557,36
902   IRRF                      27,50                      312,40
910   VALE TRANSPORTE           6,00                       300,00
      Total de Vencimentos   Total de Descontos
      5.340,91               1.169,76
                        Valor Líquido ->    4.171,15
Salário Base   Sal. Contr. INSS   Base Cálc. FGTS   F.G.T.S do Mês   Base Cálc. IRRF   Faixa IRRF
5.000,00       5.340,91           5.340,91          427,27           4.471,15          27,5
Pago em 05/10/2026
`;

/** Layout B — rótulos "campo: valor", proventos e descontos em colunas lado a lado, sem total de vencimentos. */
const LAYOUT_COLUNAS = `
DEMONSTRATIVO DE PAGAMENTO
Empresa: Padaria Bom Pão ME            CNPJ 98.765.432/0001-98
Funcionário: 123 - Maria Silva         Cargo: Atendente
Competência: SET/26                    Data de crédito: 30/09/2026
PROVENTOS                              DESCONTOS
Salário 2.000,00                       INSS 165,00
Adicional Noturno 200,00               Vale-Transporte 120,00
Total de Descontos 285,00
Líquido a Receber 1.915,00
Base INSS 2.200,00   Base IRRF 2.035,00   FGTS do Mês 176,00
`;

/** Layout C — exportação com ponto decimal, nome em linha "Colaborador", competência numérica rotulada. */
const LAYOUT_PONTO = `
Contracheque Mensal
Razão Social: TechSul Sistemas S.A.
CNPJ: 11.222.333/0001-81
Colaborador: Maria Silva Souza   Matrícula: 7781
Mês/Ano: 09/2026      Data de pagamento: 05/10/2026
Salario Base            8,000.00
Bonus                     500.00
INSS                      908.85
IRRF                    1,312.10
Plano de Saude            150.00
Total Proventos         8,500.00
Total Descontos         2,370.95
Salario Liquido         6,129.05
Salario Contribuicao INSS 8,500.00
FGTS 680.00
`;

describe("parseBRL", () => {
  it("interpreta formatos brasileiros e com ponto decimal", () => {
    expect(parseBRL("5.340,91")).toBe(5340.91);
    expect(parseBRL("557,36")).toBe(557.36);
    expect(parseBRL("1.234.567,89")).toBe(1234567.89);
    expect(parseBRL("4171.15")).toBe(4171.15);
    expect(parseBRL("5,340.91")).toBe(5340.91);
    expect(parseBRL("R$ 1.000,00")).toBe(1000);
  });
});

describe("normalizePayslipPeriod", () => {
  it.each([
    ["09/2026", "2026-09"],
    ["9/26", "2026-09"],
    ["2026-09", "2026-09"],
    ["Setembro/2026", "2026-09"],
    ["setembro de 2026", "2026-09"],
    ["SET/26", "2026-09"],
    ["SET/2026", "2026-09"],
    ["Março/2026", "2026-03"],
    ["Dezembro 2025", "2025-12"],
    ["01/09/2026 a 30/09/2026", "2026-09"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePayslipPeriod(input)).toBe(expected);
  });

  it("retorna null para entradas inválidas e datas completas", () => {
    expect(normalizePayslipPeriod("")).toBeNull();
    expect(normalizePayslipPeriod(undefined)).toBeNull();
    expect(normalizePayslipPeriod("sem data")).toBeNull();
    expect(normalizePayslipPeriod("14/2026")).toBeNull();
    expect(normalizePayslipPeriod("05/10/2026")).toBeNull();
    expect(normalizePayslipPeriod("5 de outubro de 2026")).toBeNull();
    expect(normalizePayslipPeriod("15/08/2026 a 14/09/2026")).toBeNull();
  });

  it("13/AAAA e 13º salário viram dezembro; data ISO completa (Vision) vira o mês", () => {
    expect(normalizePayslipPeriod("13/2026")).toBe("2026-12");
    expect(normalizePayslipPeriod("13º Salário 2026")).toBe("2026-12");
    expect(normalizePayslipPeriod("2026-09-01")).toBe("2026-09");
  });

  it("depois do rótulo vale o primeiro valor da linha", () => {
    expect(normalizePayslipPeriod(": 09/2026   Salario 2025.10")).toBe("2026-09");
  });
});

describe("parsePayslipText — matriz da Story 11.3", () => {
  it("holerite completo: todos os campos, competência 2026-09, confiança alta, sem aviso", () => {
    const r = parsePayslipText(`
      ACME COMERCIO DE ALIMENTOS LTDA      CNPJ: 12.345.678/0001-95
      DEMONSTRATIVO DE PAGAMENTO DE SALÁRIO
      Competência: 09/2026
      001  SALARIO BASE            30,00    5.000,00
      015  HORAS EXTRAS 50%        10,00    340,91
      901  INSS                    14,00                  557,36
      902  IRRF                    27,50                  312,40
      910  VALE TRANSPORTE          6,00                  300,00
      Total de Vencimentos 5.340,91
      Total de Descontos 1.169,76
      Valor Líquido 4.171,15
      Base INSS 5.340,91   Base FGTS 5.340,91   FGTS do Mês 427,27
    `);
    expect(r).toEqual({
      company: "ACME COMERCIO DE ALIMENTOS LTDA",
      cnpj: "12.345.678/0001-95",
      period: "2026-09",
      grossSalary: 5340.91,
      netSalary: 4171.15,
      earnings: [
        { name: "SALARIO BASE", value: 5000 },
        { name: "HORAS EXTRAS 50%", value: 340.91 },
      ],
      deductions: [
        { name: "INSS", value: 557.36 },
        { name: "IRRF", value: 312.4 },
        { name: "VALE TRANSPORTE", value: 300 },
      ],
      fgts: 427.27,
      confidence: 1,
      warnings: [],
    });
  });

  it("sem líquido: líquido = bruto − descontos, com aviso", () => {
    const r = parsePayslipText(`
      EMPRESA X S.A.
      Competência: Abril/2026
      SALARIO 3.000,00
      INSS 240,00
      Total de Vencimentos 3.000,00
    `);
    expect(r.period).toBe("2026-04");
    expect(r.grossSalary).toBe(3000);
    expect(r.netSalary).toBe(2760);
    expect(r.warnings).toEqual([W.netFromGross]);
    expect(r.confidence).toBeLessThan(1);
  });

  it("sem bruto: bruto = líquido + descontos, com aviso", () => {
    const r = parsePayslipText(`
      EMPRESA X S.A.
      Competência: 05/2026
      INSS 165,00
      Total de Descontos 165,00
      Líquido a Receber 2.035,00
    `);
    expect(r.grossSalary).toBe(2200);
    expect(r.netSalary).toBe(2035);
    expect(r.warnings).toEqual([W.grossFromNet]);
    expect(r.confidence).toBeLessThan(1);
  });

  it("totais não fecham: confiança menor e aviso", () => {
    const r = parsePayslipText(`
      EMPRESA Y LTDA
      Referência: 06/2026
      INSS 300,00
      Total de Vencimentos 4.000,00
      Valor Líquido 3.000,00
    `);
    expect(r.warnings).toContain(W.totalsMismatch);
    expect(r.confidence).toBeLessThanOrEqual(0.6);
  });

  it("líquido maior que o bruto: confiança baixa e aviso", () => {
    const r = parsePayslipText(`
      EMPRESA Y LTDA
      Competência: 06/2026
      INSS 300,00
      Total de Vencimentos 1.000,00
      Valor Líquido 9.000,00
    `);
    expect(r.warnings).toContain(W.netAboveGross);
    expect(r.confidence).toBeLessThanOrEqual(0.3);
  });

  it.each([
    "Pago em 05/10/2026",
    "Data de pagamento: 05/10/2026",
    "Data de crédito: 05/10/2026",
    "Crédito em 05/10/2026",
    "05/10/2026",
    "Pago em 5 de outubro de 2026",
  ])("só data de pagamento (%s): competência null + aviso", (dateLine) => {
    const r = parsePayslipText(`
      EMPRESA Z LTDA
      ${dateLine}
      Total de Vencimentos 1.700,00
      Total de Descontos 200,00
      Valor Líquido 1.500,00
    `);
    expect(r.period).toBeNull();
    expect(r.warnings).toContain("Competência não identificada");
  });

  it("competência rotulada vence a data de pagamento na mesma linha", () => {
    const r = parsePayslipText("Data de pagamento: 05/10/2026   Competência: 09/2026");
    expect(r.period).toBe("2026-09");
    const s = parsePayslipText("Competência: 09/2026   Pago em 05/10/2026");
    expect(s.period).toBe("2026-09");
  });

  it("numérico sem rótulo não vira competência; mês por extenso sim", () => {
    expect(parsePayslipText("EMPRESA LTDA\n09/2026\nValor Líquido 100,00").period).toBeNull();
    expect(parsePayslipText("Folha de Setembro/2026").period).toBe("2026-09");
    expect(parsePayslipText("Holerite SET/26").period).toBe("2026-09");
    expect(parsePayslipText("Mês/Ano\n09/2026").period).toBe("2026-09");
  });

  it("bases de cálculo não entram em descontos; FGTS em fgts", () => {
    const r = parsePayslipText(`
      EMPRESA W LTDA
      Competência: 08/2026
      SALARIO 5.000,00
      INSS 500,00
      Base INSS 5.000,00
      Base IRRF 4.500,00
      Sal. Contribuição INSS 5.000,00
      Base Cálc. FGTS 5.000,00
      FGTS do mês 400,00
      Total de Vencimentos 5.000,00
      Valor Líquido 4.500,00
    `);
    expect(r.deductions).toEqual([{ name: "INSS", value: 500 }]);
    expect(r.earnings).toEqual([{ name: "SALARIO", value: 5000 }]);
    expect(r.fgts).toBe(400);
    expect(r.warnings).toEqual([]);
  });

  it("linha com nome do funcionário sozinha: nada do nome no resultado", () => {
    const r = parsePayslipText(`
      EMPRESA V LTDA
      Funcionário: 123 - Maria Silva
      Competência: 09/2026
      SALARIO 2.000,00
      INSS 150,00
      Total de Vencimentos 2.000,00
      Valor Líquido 1.850,00
    `);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/maria|silva/i);
    expect(r.company).toBe("EMPRESA V LTDA");
    expect(r.netSalary).toBe(1850);
  });

  it("retorna resultado vazio para texto sem holerite", () => {
    const r = parsePayslipText("foto de um gato");
    expect(r.grossSalary).toBe(0);
    expect(r.netSalary).toBe(0);
    expect(r.company).toBe("");
    expect(r.confidence).toBeLessThan(0.3);
  });
});

describe("parsePayslipText — layouts de OCR com várias colunas", () => {
  it("layout clássico: totais em cabeçalho, bases em tabela, nome em tabela", () => {
    const r = parsePayslipText(LAYOUT_CLASSICO);
    expect(r.company).toBe("ACME COMERCIO DE ALIMENTOS LTDA");
    expect(r.cnpj).toBe("12.345.678/0001-95");
    expect(r.period).toBe("2026-09");
    expect(r.grossSalary).toBe(5340.91);
    expect(r.netSalary).toBe(4171.15);
    expect(r.fgts).toBe(427.27);
    expect(r.earnings).toEqual([
      { name: "SALARIO BASE", value: 5000 },
      { name: "HORAS EXTRAS 50%", value: 340.91 },
    ]);
    expect(r.deductions).toEqual([
      { name: "INSS", value: 557.36 },
      { name: "IRRF", value: 312.4 },
      { name: "VALE TRANSPORTE", value: 300 },
    ]);
    expect(r.warnings).toEqual([]);
    expect(r.confidence).toBe(1);
    expect(JSON.stringify(r)).not.toMatch(/maria|aparecida|silva/i);
  });

  it("layout em colunas lado a lado: separa proventos e descontos, deriva o bruto", () => {
    const r = parsePayslipText(LAYOUT_COLUNAS);
    expect(r.company).toBe("Padaria Bom Pão ME");
    expect(r.cnpj).toBe("98.765.432/0001-98");
    expect(r.period).toBe("2026-09");
    expect(r.earnings).toEqual([
      { name: "Salário", value: 2000 },
      { name: "Adicional Noturno", value: 200 },
    ]);
    expect(r.deductions).toEqual([
      { name: "INSS", value: 165 },
      { name: "Vale-Transporte", value: 120 },
    ]);
    expect(r.grossSalary).toBe(2200);
    expect(r.netSalary).toBe(1915);
    expect(r.fgts).toBe(176);
    expect(r.warnings).toEqual([W.grossFromNet]);
    expect(JSON.stringify(r)).not.toMatch(/maria|silva/i);
  });

  it("layout com ponto decimal e data de pagamento ao lado da competência", () => {
    const r = parsePayslipText(LAYOUT_PONTO);
    expect(r.company).toBe("TechSul Sistemas S.A.");
    expect(r.cnpj).toBe("11.222.333/0001-81");
    expect(r.period).toBe("2026-09");
    expect(r.grossSalary).toBe(8500);
    expect(r.netSalary).toBe(6129.05);
    expect(r.fgts).toBe(680);
    expect(r.earnings).toEqual([
      { name: "Salario Base", value: 8000 },
      { name: "Bonus", value: 500 },
    ]);
    expect(r.deductions).toEqual([
      { name: "INSS", value: 908.85 },
      { name: "IRRF", value: 1312.1 },
      { name: "Plano de Saude", value: 150 },
    ]);
    expect(r.warnings).toEqual([]);
    expect(r.confidence).toBe(1);
    expect(JSON.stringify(r)).not.toMatch(/maria|silva|souza/i);
  });
});

describe("normalizeVisionPayslip", () => {
  const visionResult = {
    company: " ACME LTDA ",
    cnpj: "12.345.678/0001-95",
    employee: "Maria Silva",
    period: "09/2026",
    grossSalary: 5000,
    deductions: [
      { name: "INSS", value: 500 },
      { name: "Zerado", value: 0 },
      { name: "Base INSS", value: 5000 },
      { name: "FGTS", value: 400 },
    ],
    netSalary: 4500,
  };

  it("sai no mesmo formato do parser de texto, sem o nome do funcionário", () => {
    const r = normalizeVisionPayslip(visionResult);
    expect(r).toEqual({
      company: "ACME LTDA",
      cnpj: "12.345.678/0001-95",
      period: "2026-09",
      grossSalary: 5000,
      netSalary: 4500,
      earnings: [],
      deductions: [{ name: "INSS", value: 500 }],
      fgts: 400,
      confidence: 1,
      warnings: [],
    });
    expect(JSON.stringify(r)).not.toMatch(/maria|silva/i);
  });

  it("aceita a saída validada pelo PayslipOCRSchema (que descarta o nome)", () => {
    const parsed: PayslipOCRResult = PayslipOCRSchema.parse(visionResult);
    expect(parsed).not.toHaveProperty("employee");
    const input: VisionPayslipInput = parsed;
    const r = normalizeVisionPayslip(input);
    expect(Object.keys(r).sort()).toEqual(Object.keys(parsePayslipText(LAYOUT_CLASSICO)).sort());
    expect(JSON.stringify(r)).not.toMatch(/maria|silva/i);
  });

  it("data de pagamento no campo period vira null com aviso", () => {
    const r = normalizeVisionPayslip({ ...visionResult, period: "05/10/2026" });
    expect(r.period).toBeNull();
    expect(r.warnings).toEqual([W.periodNotFound]);
  });

  it("mês por extenso", () => {
    expect(normalizeVisionPayslip({ ...visionResult, period: "Setembro/2026" }).period).toBe("2026-09");
  });

  it("bruto ou líquido ausentes (0) são calculados com aviso", () => {
    const semLiquido = normalizeVisionPayslip({ ...visionResult, netSalary: 0 });
    expect(semLiquido.netSalary).toBe(4500);
    expect(semLiquido.warnings).toEqual([W.netFromGross]);
    const semBruto = normalizeVisionPayslip({ ...visionResult, grossSalary: 0 });
    expect(semBruto.grossSalary).toBe(5000);
    expect(semBruto.warnings).toEqual([W.grossFromNet]);
  });

  it("totais que não fecham e líquido maior que o bruto baixam a confiança", () => {
    const naoFecha = normalizeVisionPayslip({ ...visionResult, netSalary: 4000 });
    expect(naoFecha.warnings).toContain(W.totalsMismatch);
    expect(naoFecha.confidence).toBeLessThanOrEqual(0.6);
    const invertido = normalizeVisionPayslip({ ...visionResult, netSalary: 9000 });
    expect(invertido.warnings).toContain(W.netAboveGross);
    expect(invertido.confidence).toBeLessThanOrEqual(0.3);
  });
});

describe("regras gerais", () => {
  it("avisos em pt-BR com acentos", () => {
    const all = Object.values(W).join(" ");
    expect(all).toContain("Competência");
    expect(all).toContain("Salário");
    expect(all).toContain("Líquido");
    expect(all).not.toMatch(/Competencia|Salario|Liquido/);
  });

  it("parser puro: sem react, expo ou react-native", () => {
    const src = readFileSync(path.resolve(__dirname, "../src/payslipParser.ts"), "utf8");
    expect(src).not.toMatch(/from\s+["'](?:react|react-native|expo[^"']*)["']/);
    expect(src).not.toMatch(/import\s/);
  });
});

// ─── Rodada de revisão (Review Triage Log) ───────────────────────────────────

const noLeak = (r: unknown, ...parts: string[]) => {
  const json = JSON.stringify(r);
  for (const p of parts) expect(json.toLowerCase()).not.toContain(p.toLowerCase());
};

describe("CPF e CNPJ", () => {
  it("CPF é apagado antes da leitura: nunca aparece em rubrica nem em empresa", () => {
    const r = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nCPF: 123.456.789-09   Salário Base 3.000,00\nINSS 240,00\nValor Líquido 2.760,00",
    );
    expect(r.earnings).toEqual([{ name: "Salário Base", value: 3000 }]);
    noLeak(r, "123.456", "789-09", "cpf");
    const e = parsePayslipText("Empresa: JOSE DA SILVA CPF 123.456.789-09\nCompetência: 09/2026\nValor Líquido 100,00");
    expect(e.company).toBe("JOSE DA SILVA");
    noLeak(e, "123.456", "cpf");
  });

  it.each([
    "CNPJ/MF: 12345678000195",
    "C.N.P.J.: 12345678000195",
    "CNPJ nº 12345678000195",
    "12345678000195",
    "CNPJ: 12.345.678 / 0001-95",
    "CNPJ: 12.345.678/0001-95",
  ])("CNPJ %s → formatado", (line) => {
    expect(parsePayslipText(`ACME LTDA\n${line}\nSalário 1.000,00`).cnpj).toBe("12.345.678/0001-95");
  });

  it("CNPJ com dígito verificador inválido é ignorado com aviso", () => {
    const r = parsePayslipText("ACME LTDA\nCNPJ: 12.345.678/0001-90\nSalário 1.000,00");
    expect(r.cnpj).toBeUndefined();
    expect(r.warnings).toContain(W.invalidCnpj);
  });
});

describe("nome do funcionário (testes que vazariam sem a proteção)", () => {
  it("rótulo numa linha e nome na seguinte: o nome não vira empresa", () => {
    const r = parsePayslipText(
      "Nome do Funcionário:\nMARIA APARECIDA SILVA\nCNPJ: 12.345.678/0001-95\nCompetência: 09/2026\nValor Líquido 100,00",
    );
    noLeak(r, "maria", "aparecida", "silva");
    const s = parsePayslipText("Funcionário:\nMARIA APARECIDA SILVA\nCNPJ: 12.345.678/0001-95");
    noLeak(s, "maria", "aparecida", "silva");
  });

  it("cabeçalho de tabela: a linha de dados é sempre apagada (com ':' ou valor)", () => {
    for (const text of [
      "Código  Nome do Empregado  CBO\n42  MARIA SILVA  252210\nCNPJ: 12.345.678/0001-95",
      "Código  Nome do Funcionário  Centro de Custo  Cargo\n42  MARIA SILVA  ADM  ANALISTA\nCNPJ: 12.345.678/0001-95",
      "Código  Nome do Empregado  CBO\n42  MARIA SILVA  252210  Adm: 01/02/2020\nCNPJ: 12.345.678/0001-95",
      "Código  Nome do Funcionário  CBO\n42  MARIA SILVA  252210  Salário Base 3.000,00\nValor Líquido 3.000,00",
      "Matrícula  Nome  Função  Salário\n123  MARIA SILVA  CORRETORA  2.000,00\nCompetência: 09/2026",
    ]) {
      noLeak(parsePayslipText(text), "maria", "silva");
    }
  });

  it("rótulo e nome na mesma linha: apaga até o próximo rótulo", () => {
    for (const text of [
      "Funcionário: 123 - Maria Silva  INSS 300,00",
      "Nome: MARIA SILVA   SALARIO 3.000,00",
      "Empregado: 42 MARIA SILVA   Cargo: Analista   CNPJ: 12.345.678/0001-95",
      "Colaborador: Maria Silva Souza   Matrícula: 7781\nCNPJ: 12.345.678/0001-95",
      "Nome: MARIA SILVA CPF: 123.456.789-09\nSalário 3.000,00",
    ]) {
      const r = parsePayslipText(text);
      noLeak(r, "maria", "silva", "123.456");
    }
  });

  it("palavras de rótulo no meio da rubrica não apagam a linha", () => {
    const r = parsePayslipText(
      "ACME COMERCIO LTDA\nCompetência: 09/2026\nSALARIO 5.000,00\nINSS EMPREGADO 500,00\nPLANO SAUDE COLABORADOR 150,00\nContribuição Previdenciária Servidor 330,00\nSEGURO VIDA FUNCIONARIO 20,00\nTotal de Vencimentos 5.000,00\nValor Líquido 4.000,00",
    );
    expect(r.deductions.map((d) => d.value)).toEqual([500, 150, 330, 20]);
    expect(r.warnings).toEqual([]);
  });

  it("'Nome Empresarial' é a empresa", () => {
    expect(parsePayslipText("Nome Empresarial: ACME SERVICOS\nCompetência: 09/2026").company).toBe("ACME SERVICOS");
  });
});

describe("totais e rubricas", () => {
  it("holerite de adiantamento: o adiantamento é provento e o bruto não dobra", () => {
    const r = parsePayslipText(
      "ACME LTDA\nRecibo de Adiantamento Quinzenal\nCompetência: 09/2026\nAdiantamento Salarial 40% 1.200,00\nLíquido a Receber 1.200,00",
    );
    expect(r.earnings).toEqual([{ name: "Adiantamento Salarial 40%", value: 1200 }]);
    expect(r.deductions).toEqual([]);
    expect(r.grossSalary).toBe(1200);
    expect(r.netSalary).toBe(1200);
  });

  it("'Líquido de Férias', 'Pensão s/ líquido' e 'Adiantamento líquido' não são o líquido", () => {
    const f = parsePayslipText(
      "ACME LTDA\nCompetência: 10/2026\nSalário 5.000,00\nFérias 3.000,00\n1/3 Férias 1.000,00\nLíquido de Férias 3.500,00\nINSS 500,00\nTotal de Vencimentos 9.000,00\nTotal de Descontos 4.000,00\nValor Líquido 5.000,00",
    );
    expect(f.netSalary).toBe(5000);
    expect(f.deductions).toContainEqual({ name: "Líquido de Férias", value: 3500 });
    expect(f.warnings).toEqual([]);
    const p = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nSALARIO 5.000,00\nPENSAO ALIM. S/ LIQUIDO 1.000,00\nINSS 500,00\nTotal de Vencimentos 5.000,00\nTotal de Descontos 1.500,00\nValor Líquido 3.500,00",
    );
    expect(p.netSalary).toBe(3500);
    expect(p.deductions).toContainEqual({ name: "PENSAO ALIM. S/ LIQUIDO", value: 1000 });
    const a = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nSALARIO 5.000,00\nADIANTAMENTO LIQUIDO 2.000,00\nTotal de Vencimentos 5.000,00\nValor Líquido 3.000,00",
    );
    expect(a.netSalary).toBe(3000);
    expect(a.deductions).toEqual([{ name: "ADIANTAMENTO LIQUIDO", value: 2000 }]);
  });

  it("'Líquido' sozinho no início da linha é o líquido", () => {
    const r = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSalário 3.000,00\nINSS 240,00\nLíquido 2.760,00 Total de Vencimentos 3.000,00");
    expect(r.grossSalary).toBe(3000);
    expect(r.netSalary).toBe(2760);
  });

  it("rótulos em linhas e valores depois (ordem do ML Kit)", () => {
    const t = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nTotal de Vencimentos\nTotal de Descontos\nValor Líquido\n3.500,00\n500,00\n3.000,00");
    expect([t.grossSalary, t.netSalary]).toEqual([3500, 3000]);
    expect(t.warnings).toEqual([]);
    const i = parsePayslipText("ACME COMERCIO LTDA\nCompetência: 09/2026\nSALARIO BASE\nINSS\n5.000,00\n500,00\nValor Líquido\n4.500,00");
    expect(i.earnings).toEqual([{ name: "SALARIO BASE", value: 5000 }]);
    expect(i.deductions).toEqual([{ name: "INSS", value: 500 }]);
    expect(i.netSalary).toBe(4500);
  });

  it("'Total de Deduções' é o total de descontos", () => {
    const r = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nTotal Bruto 6.000,00\nTotal de Deduções 500,00");
    expect(r.netSalary).toBe(5500);
  });

  it("quadro de totais em colunas (3 rótulos, 3 valores, com R$)", () => {
    const r = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nTotal de Vencimentos   Total de Descontos   Líquido a Receber\nR$ 3.500,00   R$ 500,00   R$ 3.000,00",
    );
    expect([r.grossSalary, r.netSalary, r.confidence]).toEqual([3500, 3000, 1]);
  });

  it("quadro com valor faltando: associa pela posição e avisa", () => {
    const fgts = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nSalário Base   Base Cálc. FGTS   F.G.T.S do Mês   Faixa IRRF\n5.000,00   5.000,00   400,00",
    );
    expect(fgts.fgts).toBe(400);
    expect(fgts.warnings).toContain(W.headerPartial);
    const dep = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nBase Cálc. IRRF   Dep. IRRF   FGTS do Mês\n4.471,15   2");
    expect(dep.fgts).toBeUndefined();
    const totals = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nTotal de Vencimentos   Total de Descontos   Valor Líquido\n3.500,00   3.000,00",
    );
    expect(totals.grossSalary).toBe(3500);
    expect(totals.warnings).toContain(W.headerPartial);
    expect(totals.confidence).toBeLessThan(1);
  });

  it("bruto pela soma dos proventos (sem total e sem líquido)", () => {
    const r = parsePayslipText("EMPRESA X LTDA\nCompetência: 04/2026\nSALARIO 3.000,00\nINSS 240,00");
    expect([r.grossSalary, r.netSalary]).toEqual([3000, 2760]);
    expect(r.warnings).toEqual([W.grossFromEarnings, W.netFromGross]);
  });

  it("soma dos descontos diferente do total: aviso", () => {
    const r = parsePayslipText(
      "EMPRESA X LTDA\nCompetência: 04/2026\nSALARIO 3.000,00\nINSS 240,00\nTotal de Vencimentos 3.000,00\nTotal de Descontos 300,00\nValor Líquido 2.700,00",
    );
    expect(r.warnings).toEqual([W.deductionsMismatch]);
    expect(r.confidence).toBeLessThan(1);
  });

  it("só o líquido: bruto desconhecido com aviso e confiança menor", () => {
    const r = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nValor Líquido 2.670,00");
    expect(r.grossSalary).toBe(0);
    expect(r.warnings).toContain(W.grossNotFound);
    expect(r.confidence).toBeLessThanOrEqual(0.5);
  });

  it("dois holerites na mesma página: lê só o primeiro e avisa", () => {
    const block = (m: string, s: string, i: string, n: string) =>
      `ACME LTDA\nCompetência: ${m}/2026\nSalário ${s}\nINSS ${i}\nTotal de Vencimentos ${s}\nTotal de Descontos ${i}\nValor Líquido ${n}`;
    const r = parsePayslipText(`${block("08", "3.000,00", "240,00", "2.760,00")}\n${block("09", "3.100,00", "250,00", "2.850,00")}`);
    expect(r.period).toBe("2026-08");
    expect(r.earnings).toEqual([{ name: "Salário", value: 3000 }]);
    expect(r.deductions).toEqual([{ name: "INSS", value: 240 }]);
    expect(r.warnings).toEqual([W.multiplePayslips]);
    expect(r.confidence).toBeLessThan(1);
  });

  it("rubricas desconhecidas: classificadas por palavra, coluna ou sinal; senão aviso", () => {
    const known = parsePayslipText(
      "ACME COMERCIO LTDA\nCompetência: 09/2026\nSALARIO 2.000,00\nQUEBRA DE CAIXA 200,00\nAUXILIO CRECHE 300,00\nDESCANSO SEMANAL REMUNERADO 150,00\nREEMBOLSO PLANO DE SAUDE 150,00\nINSS 200,00\nValor Líquido 2.600,00",
    );
    expect(known.earnings.map((e) => e.value)).toEqual([2000, 200, 300, 150, 150]);
    expect(known.deductions).toEqual([{ name: "INSS", value: 200 }]);
    const column = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nCód  Descrição          Vencimentos   Descontos\n001  XPTO ABC              1.000,00\n002  ZYX QWE                             100,00\nValor Líquido 900,00",
    );
    expect(column.earnings).toEqual([{ name: "XPTO ABC", value: 1000 }]);
    expect(column.deductions).toEqual([{ name: "ZYX QWE", value: 100 }]);
    const sign = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 1.000,00\nDIF SALARIO 50,00-\nXPTO -10,00");
    expect(sign.deductions).toEqual([
      { name: "DIF SALARIO", value: 50 },
      { name: "XPTO", value: 10 },
    ]);
    const unknown = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\nSALARIO 1.000,00\nXPTO ABC 123,45\nTotal de Vencimentos 1.123,45\nValor Líquido 1.123,45",
    );
    expect(unknown.warnings).toContain(W.unrecognizedItems);
    expect(unknown.confidence).toBeLessThan(1);
  });

  it("rodapé 'Salário Base … Base INSS' é informativo; rubricas iguais contam duas vezes", () => {
    const r = parsePayslipText(
      "ACME LTDA\nCompetência: 09/2026\n001 SALARIO 5.000,00\n901 INSS 500,00\nSalário Base 5.000,00   Base INSS 5.000,00   FGTS do Mês 400,00",
    );
    expect(r.earnings).toEqual([{ name: "SALARIO", value: 5000 }]);
    expect(r.fgts).toBe(400);
    const d = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nHORAS EXTRAS 50% 100,00\nHORAS EXTRAS 50% 100,00\nSALARIO 1.000,00");
    expect(d.earnings.map((e) => e.value)).toEqual([100, 100, 1000]);
  });

  it("valor antes da referência quando o cabeçalho diz 'Valor  Ref'", () => {
    const r = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nDescricao Valor Ref\nINSS 557,36 14,00");
    expect(r.deductions).toEqual([{ name: "INSS", value: 557.36 }]);
  });
});

describe("valores", () => {
  it("sinal de menos à esquerda usa a coluna de valor, não a referência", () => {
    const r = parsePayslipText(
      "ACME COMERCIO LTDA\nCompetência: 09/2026\nINSS  14,00  -557,36\nTotal de Vencimentos 5.000,00\nValor Líquido 4.442,64",
    );
    expect(r.deductions).toEqual([{ name: "INSS", value: 557.36 }]);
    expect(r.warnings).toEqual([]);
    expect(parseBRL("-240,00")).toBe(-240);
    expect(parseBRL("50,00-")).toBe(-50);
  });

  it("OCR: O→0, l/I→1 e milhar com espaço", () => {
    expect(parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 5.34O,91").earnings).toEqual([{ name: "SALARIO", value: 5340.91 }]);
    expect(parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 1.l00,00").earnings).toEqual([{ name: "SALARIO", value: 1100 }]);
    expect(parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 5 340,91").earnings).toEqual([{ name: "SALARIO", value: 5340.91 }]);
  });

  it("líquido negativo gera aviso e não é recalculado", () => {
    const r = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 1.000,00\nINSS 80,00\nTotal de Vencimentos 1.000,00\nValor Líquido -50,00");
    expect(r.netSalary).toBe(-50);
    expect(r.warnings).toContain(W.negativeNet);
    expect(r.confidence).toBeLessThanOrEqual(0.3);
  });

  it("valor antes do rótulo e 'TOTAIS' com duas colunas", () => {
    const v = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 5.000,00\nINSS 500,00\nTotal de Vencimentos 5.000,00\n4.500,00 Valor Líquido");
    expect(v.netSalary).toBe(4500);
    expect(v.warnings).toEqual([]);
    const t = parsePayslipText("ACME LTDA\nCompetência: 09/2026\nSALARIO 5.000,00\nINSS 500,00\nIRRF 100,00\nTOTAIS 5.000,00 600,00\nValor Líquido 4.400,00");
    expect([t.grossSalary, t.netSalary]).toEqual([5000, 4400]);
    expect(t.warnings).toEqual([]);
  });
});

describe("competência (testes que vazariam sem a proteção)", () => {
  it.each([
    "Crédito em Outubro/2026",
    "Data Pagto: Outubro/2026",
    "Dt. Pagamento: Outubro/2026",
    "Dt Pgto Outubro/2026",
    "Pagamento em Outubro/2026",
    "Mês/Ano\nData de crédito: Outubro/2026",
    "Competência: Pago em Outubro/2026",
  ])("pagamento com mês por extenso (%s) nunca vira competência", (line) => {
    expect(parsePayslipText(`ACME LTDA\n${line}\nValor Líquido 100,00`).period).toBeNull();
  });

  it.each([
    ["Período Aquisitivo: 01/2025 a 12/2025\nCompetência: 09/2026", "2026-09"],
    ["Período de Gozo: 05/01/2026 a 24/01/2026\nCompetência: 12/2025", "2025-12"],
    ["Período Concessivo: 01/2026\nMês/Ano: 03/2026", "2026-03"],
    ["Admissão: 15/MAR/2020", null],
    ["Data de admissão: Março/2020", null],
    ["Av. Nove de Julho 25 - São Paulo", null],
    ["Rua XV de Novembro 50", null],
    ["Rua Sete de Setembro 2026", null],
    ["Rua Maio 2020, 45 - Centro", null],
    ["Mês/Ano: 09/2026   Bonus 2025.10", "2026-09"],
    ["Cod Descricao Referencia Vencimentos Descontos\n015 HORAS EXTRAS 12.50 340.91", null],
    ["Cod Descricao Referencia Vencimentos Descontos\n015 HORAS EXTRAS 10.00 340.91\nCompetência: 09/2026", "2026-09"],
    ["Período: 15/08/2026 a 14/09/2026", null],
  ])("%s → %s", (lines, expected) => {
    expect(parsePayslipText(`ACME LTDA\n${lines}`).period).toBe(expected);
  });

  it("Competência 13/2026 = 13º salário: dezembro com aviso, sem cair na linha seguinte", () => {
    const r = parsePayslipText("ACME LTDA\nCompetência: 13/2026\nOutro: 05/2026\nValor Líquido 100,00");
    expect(r.period).toBe("2026-12");
    expect(r.warnings).toContain(W.thirteenth);
  });

  it("rótulo com valor ilegível não usa a linha seguinte", () => {
    expect(parsePayslipText("ACME LTDA\nCompetência: ??/????\n09/2026").period).toBeNull();
  });
});

describe("empresa", () => {
  it("linha perto do CNPJ vence o banco", () => {
    expect(
      parsePayslipText("PADARIA BOM PAO\nCNPJ: 12.345.678/0001-95\nCompetência: 09/2026\nBanco Bradesco S/A Ag 1234").company,
    ).toBe("PADARIA BOM PAO");
    expect(parsePayslipText("PREFEITURA MUNICIPAL DE ITU\nCompetência: 09/2026\nBanco do Brasil S.A.  Ag 1234  CC 5678-9").company).toBe(
      "PREFEITURA MUNICIPAL DE ITU",
    );
  });

  it("sobrenome 'Sá' não é S/A; 'pagamento' no nome da empresa é aceito", () => {
    expect(parsePayslipText("Recibo de pagamento\nJOSÉ CARLOS DE SÁ\nACME COMERCIO LTDA\nCompetência: 09/2026").company).toBe(
      "ACME COMERCIO LTDA",
    );
    expect(parsePayslipText("RECIBO DE PAGAMENTO\nNome do Funcionário:\nJOSE CARLOS DE SA\nCompetência: 09/2026").company).toBe("");
    expect(parsePayslipText("PAGSEGURO MEIOS DE PAGAMENTO LTDA\nCompetência: 09/2026").company).toBe("PAGSEGURO MEIOS DE PAGAMENTO LTDA");
  });
});

describe("Vision OCR — revisão", () => {
  const base = { company: "ACME", period: "09/2026", grossSalary: 5000, netSalary: 4500 };

  it("ignora linhas de total/líquido dentro dos descontos e usa valor absoluto", () => {
    const r = normalizeVisionPayslip({
      ...base,
      deductions: [
        { name: "INSS", value: -500 },
        { name: "Total de Descontos", value: 500 },
        { name: "Líquido a Receber", value: 4500 },
      ],
    });
    expect(r.deductions).toEqual([{ name: "INSS", value: 500 }]);
    expect(r.warnings).toEqual([]);
  });

  it("CNPJ validado e formatado; inválido omitido com aviso", () => {
    expect(normalizeVisionPayslip({ ...base, cnpj: "12345678000195", deductions: [] }).cnpj).toBe("12.345.678/0001-95");
    const bad = normalizeVisionPayslip({ ...base, cnpj: "123.456.789-09", deductions: [] });
    expect(bad.cnpj).toBeUndefined();
    expect(bad.warnings).toContain(W.invalidCnpj);
  });

  it("adiantamento sem bruto vira provento; 13/2026 vira dezembro com aviso", () => {
    const a = normalizeVisionPayslip({ ...base, grossSalary: 0, netSalary: 1000, deductions: [{ name: "Adiantamento quinzenal", value: 1000 }] });
    expect(a.earnings).toEqual([{ name: "Adiantamento quinzenal", value: 1000 }]);
    expect(a.grossSalary).toBe(1000);
    const t = normalizeVisionPayslip({ ...base, period: "13/2026", netSalary: 5000, deductions: [] });
    expect(t.period).toBe("2026-12");
    expect(t.warnings).toContain(W.thirteenth);
  });
});

describe("desempenho", () => {
  it.each([
    ["Empresa: X" + " -".repeat(50000) + "x"],
    ["1.".repeat(50000) + "1"],
    ["a" + " :".repeat(50000) + "b"],
    ["Nome do Funcionário " + "do ".repeat(33000)],
    ["salario 1 ".repeat(10000)],
    ["SALARIO " + "1O".repeat(50000) + ",00"],
  ])("linha de 100 mil caracteres em menos de 200 ms (#%#)", (line) => {
    const t = performance.now();
    parsePayslipText(line);
    expect(performance.now() - t).toBeLessThan(200);
  });
});

describe("revisão 11.4 — R1: flag thirteenth para o kind do holerite", () => {
  it("texto e Vision com competência 13 marcam thirteenth: true; mês comum não tem a chave", () => {
    expect(parsePayslipText("ACME LTDA\nCompetência: 13/2026\nValor Líquido 100,00").thirteenth).toBe(true);
    expect(parsePayslipText("ACME LTDA\nCompetência: 13º Salário 2026\nValor Líquido 100,00").thirteenth).toBe(true);
    expect(parsePayslipText("ACME LTDA\nCompetência: 12/2026\nValor Líquido 100,00")).not.toHaveProperty("thirteenth");
    const base = { company: "ACME", grossSalary: 5000, netSalary: 4500, deductions: [] };
    expect(normalizeVisionPayslip({ ...base, period: "13/2026" }).thirteenth).toBe(true);
    expect(normalizeVisionPayslip({ ...base, period: "09/2026" })).not.toHaveProperty("thirteenth");
  });
});
