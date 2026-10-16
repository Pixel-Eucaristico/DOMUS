/**
 * Parser de holerite (contracheque / demonstrativo de pagamento).
 *
 * Recebe o texto bruto extraído por OCR on-device (ML Kit / Tesseract) e
 * devolve os campos estruturados. Também normaliza resultados vindos do
 * Vision OCR (IA), para que as duas origens produzam o mesmo formato.
 */

export interface PayslipLine {
  name: string;
  value: number;
}

export interface PayslipParseResult {
  company: string;
  cnpj?: string;
  employee?: string;
  /** Competência no formato YYYY-MM (null se não identificada) */
  period: string | null;
  grossSalary: number;
  netSalary: number;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  /** FGTS depositado no mês (informativo — não é desconto) */
  fgts?: number;
  /** 0..1 — quanto do holerite foi identificado e se os totais fecham */
  confidence: number;
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

const DEDUCTION_KEYWORDS = [
  "inss", "irrf", "imposto de renda", "i.r.r.f", "vale transporte", "vale-transporte",
  "vale refeicao", "vale alimentacao", "plano de saude", "assistencia medica",
  "assist medica", "assist. medica", "convenio medico", "odonto", "pensao",
  "contribuicao sindical", "contrib sindical", "mensalidade sindical", "contribuicao assistencial",
  "faltas", "falta", "atrasos", "adiantamento", "consignado", "emprestimo",
  "desconto", "seguro de vida", "previdencia privada", "coparticipacao",
];

const EARNING_KEYWORDS = [
  "salario", "horas extras", "hora extra", "h.extra", "adicional", "comissao",
  "comissoes", "gratificacao", "ferias", "13o salario", "13 salario", "decimo terceiro", "dsr", "premio",
  "bonus", "insalubridade", "periculosidade", "noturno", "abono", "ajuda de custo",
];

/** Linhas informativas (bases de cálculo) que não são proventos nem descontos */
const INFO_KEYWORDS = [
  "base inss", "base irrf", "base fgts", "base calc", "base de calculo", "base i.r",
  "fgts", "sal. contr", "salario contribuicao", "salario de contribuicao",
  "faixa", "dependentes", "total", "liquido",
];

const MONEY_RE = /\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2}(?!\d)/g;
const CNPJ_RE = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function norm(s: string): string {
  return stripAccents(s).toLowerCase();
}

/** "5.340,91" → 5340.91 · "5340.91" → 5340.91 · "557,36" → 557.36 */
export function parseBRL(raw: string): number {
  const s = raw.trim();
  if (s.includes(",")) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  return Number(s);
}

function moneyValues(line: string): number[] {
  return (line.match(MONEY_RE) ?? []).map(parseBRL).filter((n) => Number.isFinite(n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => new RegExp(`(^|[^a-z])${k.replace(/[.]/g, "\\.")}([^a-z]|$)`).test(text));
}

/**
 * Normaliza a competência para YYYY-MM.
 * Aceita "03/2026", "3/26", "2026-03", "Março/2026", "marco de 2026", "MAR/2026".
 */
export function normalizePayslipPeriod(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = norm(raw);

  const iso = s.match(/(20\d{2})[-/](0?[1-9]|1[0-2])(?!\d)/);
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, "0")}`;

  const num = s.match(/(?<!\d)(0?[1-9]|1[0-2])\s*[/.-]\s*(\d{4}|\d{2})(?!\d)/);
  if (num) {
    const year = num[2]!.length === 2 ? `20${num[2]}` : num[2]!;
    return `${year}-${num[1]!.padStart(2, "0")}`;
  }

  const named = s.match(/([a-z]{3,9})\.?\s*(?:de\s+|\/\s*|-\s*)?(\d{4})/);
  if (named) {
    const month = MONTHS[named[1]!];
    if (month) return `${named[2]}-${String(month).padStart(2, "0")}`;
  }

  return null;
}

function findPeriod(lines: string[]): string | null {
  const keyed = lines.find((l) => /(competencia|referencia|ref\.|periodo|mes\/ano|mes de)/.test(norm(l)));
  if (keyed) {
    const p = normalizePayslipPeriod(keyed.replace(/.*?(competencia|referencia|ref\.|periodo|mes\/ano|mes de)\s*:?/i, ""))
      ?? normalizePayslipPeriod(keyed);
    if (p) return p;
  }
  for (const l of lines) {
    // Evita confundir datas completas (dd/mm/aaaa) com competência
    if (/\d{2}\/\d{2}\/\d{4}/.test(l)) continue;
    const p = normalizePayslipPeriod(l);
    if (p && !CNPJ_RE.test(l)) return p;
  }
  return null;
}

function findTotal(lines: string[], pattern: RegExp): number | undefined {
  for (const line of lines) {
    const n = norm(line);
    const m = n.match(pattern);
    if (!m) continue;
    const after = line.slice((m.index ?? 0) + m[0].length);
    const values = moneyValues(after);
    if (values.length) return values[0];
  }
  return undefined;
}

function cleanItemName(line: string): string {
  return line
    .replace(MONEY_RE, " ")
    .replace(/^\s*\d{1,5}\s+/, "") // código da rubrica
    .replace(/\s+\d{1,3}(?:[.,]\d+)?\s*%?\s*$/, "") // referência (ex: 30,00 dias / 14%)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findCompany(lines: string[]): string {
  for (const line of lines) {
    const n = norm(line);
    if (/(empresa|empregador|razao social)\s*:/.test(n)) {
      return line.split(":").slice(1).join(":").replace(CNPJ_RE, "").replace(/cnpj\s*:?/i, "").trim();
    }
  }
  for (const line of lines) {
    const n = norm(line);
    if (n.length < 4) continue;
    if (/(demonstrativo|recibo|holerite|contracheque|folha|pagamento|mensal)/.test(n) && !/(ltda|s\.?a\.?|eireli|me\b|epp)/.test(n)) continue;
    const name = line.replace(CNPJ_RE, "").replace(/cnpj\s*:?/i, "").trim();
    if (/[a-z]{3}/i.test(name)) return name;
  }
  return "";
}

function findEmployee(lines: string[]): string | undefined {
  for (const line of lines) {
    const m = line.match(/(funcion[aá]rio|colaborador|empregado|nome)\s*:?\s*(?:\d+\s*-?\s*)?(.+)/i);
    if (m && /[a-z]{3}/i.test(m[2]!)) {
      return m[2]!.replace(/\s{2,}.*$/, "").replace(/\s*(cargo|cbo|admiss).*$/i, "").trim();
    }
  }
  return undefined;
}

export function parsePayslipText(text: string): PayslipParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const warnings: string[] = [];
  const cnpj = text.match(CNPJ_RE)?.[0];
  const company = findCompany(lines);
  const employee = findEmployee(lines);
  const period = findPeriod(lines);

  let gross = findTotal(lines, /total\s*(de\s*)?(vencimentos|proventos)/);
  const totalDeductions = findTotal(lines, /total\s*(de\s*)?descontos/);
  let net = findTotal(lines, /(valor\s*)?l[i]quido(\s*a\s*receber)?|liquido\s*a\s*receber/);
  const fgts = findTotal(lines, /(?<!base\s)fgts(\s*do\s*mes|\s*mes|\s*depositado)?/);

  const earnings: PayslipLine[] = [];
  const deductions: PayslipLine[] = [];

  for (const line of lines) {
    const n = norm(line);
    const values = moneyValues(line);
    if (!values.length) continue;
    if (includesAny(n, INFO_KEYWORDS)) continue;

    const value = values[values.length - 1]!;
    const name = cleanItemName(line);
    if (!name || value <= 0) continue;

    if (includesAny(n, DEDUCTION_KEYWORDS)) {
      deductions.push({ name, value });
    } else if (includesAny(n, EARNING_KEYWORDS)) {
      if (!earnings.some((e) => e.name === name && e.value === value)) earnings.push({ name, value });
    }
  }

  const sumDeductions = round2(deductions.reduce((s, d) => s + d.value, 0));
  const sumEarnings = round2(earnings.reduce((s, e) => s + e.value, 0));

  if (gross === undefined && sumEarnings > 0) {
    gross = sumEarnings;
    warnings.push("Total de vencimentos não encontrado — somado das rubricas");
  }
  const deductionTotal = totalDeductions ?? sumDeductions;
  if (gross === undefined && net !== undefined) {
    gross = round2(net + deductionTotal);
    warnings.push("Salário bruto calculado a partir do líquido + descontos");
  }
  if (net === undefined && gross !== undefined) {
    net = round2(gross - deductionTotal);
    warnings.push("Valor líquido calculado a partir do bruto − descontos");
  }

  if (totalDeductions !== undefined && sumDeductions > 0 && Math.abs(totalDeductions - sumDeductions) > 0.05) {
    warnings.push("Soma dos descontos não confere com o total do holerite");
  }

  const grossSalary = round2(gross ?? 0);
  const netSalary = round2(net ?? 0);

  // Confiança: campos encontrados + fechamento bruto − descontos = líquido
  let score = 0;
  if (company) score += 0.1;
  if (period) score += 0.2;
  if (grossSalary > 0) score += 0.25;
  if (netSalary > 0) score += 0.25;
  if (deductions.length) score += 0.1;
  if (grossSalary > 0 && netSalary > 0 && Math.abs(grossSalary - deductionTotal - netSalary) <= 0.05) {
    score += 0.1;
  } else if (grossSalary > 0 && netSalary > 0) {
    warnings.push("Bruto − descontos não fecha com o líquido — revise os valores");
  }
  if (netSalary > grossSalary && grossSalary > 0) {
    warnings.push("Líquido maior que o bruto — leitura provavelmente incorreta");
    score = Math.min(score, 0.4);
  }
  if (!period) warnings.push("Competência não identificada");

  return {
    company,
    ...(cnpj ? { cnpj } : {}),
    ...(employee ? { employee } : {}),
    period,
    grossSalary,
    netSalary,
    earnings,
    deductions,
    ...(fgts !== undefined ? { fgts } : {}),
    confidence: round2(Math.min(score, 1)),
    warnings,
  };
}

/** Formato devolvido pelo Vision OCR (PayslipOCRSchema em @packages/ai) */
export interface VisionPayslipInput {
  company: string;
  cnpj?: string;
  employee?: string;
  period: string;
  grossSalary: number;
  deductions: PayslipLine[];
  netSalary: number;
}

/** Converte o resultado do Vision OCR para o mesmo formato do parser local */
export function normalizeVisionPayslip(input: VisionPayslipInput): PayslipParseResult {
  const warnings: string[] = [];
  const period = normalizePayslipPeriod(input.period);
  if (!period) warnings.push("Competência não identificada");
  const deductions = input.deductions.filter((d) => d.value > 0).map((d) => ({ name: d.name.trim(), value: round2(d.value) }));
  const sum = deductions.reduce((s, d) => s + d.value, 0);
  const closes = Math.abs(input.grossSalary - sum - input.netSalary) <= 0.05;
  if (!closes) warnings.push("Bruto − descontos não fecha com o líquido — revise os valores");
  return {
    company: input.company.trim(),
    ...(input.cnpj ? { cnpj: input.cnpj } : {}),
    ...(input.employee ? { employee: input.employee } : {}),
    period,
    grossSalary: round2(input.grossSalary),
    netSalary: round2(input.netSalary),
    earnings: [],
    deductions,
    confidence: closes && period ? 0.95 : 0.7,
    warnings,
  };
}
