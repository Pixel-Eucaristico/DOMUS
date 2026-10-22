/**
 * Parser de holerite (contracheque / demonstrativo de pagamento) — Story 11.3.
 *
 * Puro (AD-3): só TypeScript, sem react / expo / react-native.
 *
 * - `parsePayslipText` recebe o texto bruto do OCR on-device (ML Kit / Tesseract).
 * - `normalizeVisionPayslip` recebe o JSON do Vision OCR (`PayslipOCRSchema` em
 *   `packages/ai`) e devolve o mesmo formato.
 *
 * Regras: nome e CPF do funcionário nunca são devolvidos; bases de cálculo nunca
 * viram desconto; FGTS é informativo; data de pagamento nunca vira competência.
 *
 * Todas as expressões regulares são limitadas (sem retrocesso quadrático) e
 * todas as remoções trocam o texto por espaços do mesmo tamanho, para que as
 * posições das colunas continuem valendo.
 */

export interface PayslipLine {
  name: string;
  value: number;
}

export interface PayslipParseResult {
  company: string;
  /** Sempre no formato 00.000.000/0000-00 e com dígitos verificadores válidos */
  cnpj?: string;
  /** Competência no formato YYYY-MM (null se não identificada) */
  period: string | null;
  grossSalary: number;
  netSalary: number;
  /** Proventos (rubricas de vencimento) */
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  /** FGTS depositado no mês (informativo — não é desconto) */
  fgts?: number;
  /** 0..1 — quanto do holerite foi identificado e se os totais fecham */
  confidence: number;
  warnings: string[];
}

/**
 * Entrada do Vision OCR. Estruturalmente compatível com `PayslipOCRResult`
 * (`packages/ai/src/vision/ocrSchema.ts`) — definida aqui para não criar
 * dependência de `packages/parsers` em `packages/ai`.
 */
export interface VisionPayslipInput {
  company: string;
  cnpj?: string;
  period: string;
  grossSalary: number;
  deductions: PayslipLine[];
  netSalary: number;
}

export const PAYSLIP_WARNINGS = {
  periodNotFound: "Competência não identificada",
  thirteenth: "Competência 13 (13º salário) — registrada como dezembro",
  grossFromNet: "Salário bruto não encontrado — calculado como líquido + descontos",
  grossFromEarnings: "Salário bruto não encontrado — calculado pela soma dos proventos",
  grossNotFound: "Salário bruto não identificado — revise os valores",
  netFromGross: "Salário líquido não encontrado — calculado como bruto − descontos",
  negativeNet: "Líquido negativo — revise os valores",
  deductionsMismatch: "Soma dos descontos não confere com o total do holerite",
  totalsMismatch: "Bruto − descontos não fecha com o líquido — revise os valores",
  netAboveGross: "Líquido maior que o bruto — leitura provavelmente incorreta",
  unrecognizedItems: "Rubricas não reconhecidas — revise os proventos e descontos",
  headerPartial: "Valores do quadro de totais incompletos — revise",
  multiplePayslips: "Mais de um holerite na imagem — só o primeiro foi lido",
  invalidCnpj: "CNPJ inválido — ignorado",
} as const;

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Minúsculas sem acentos. Preserva o comprimento para texto em NFC. */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function blank(s: string): string {
  return " ".repeat(s.length);
}

/** Troca o trecho [start, end) por espaços. */
function wipe(s: string, start: number, end: number): string {
  return s.slice(0, start) + blank(s.slice(start, end)) + s.slice(end);
}

/** Remove pontuação e espaços do fim sem regex (evita retrocesso quadrático). */
function trimEndPunct(s: string): string {
  let end = s.length;
  while (end > 0 && /[\s:–\-|,;]/.test(s[end - 1]!)) end--;
  return s.slice(0, end);
}

/** Siglas com ou sem pontos ("F.G.T.S.", "I.R.R.F."). */
const FG = "f\\.?g\\.?t\\.?s\\.?";
const IR = "i\\.?r\\.?r\\.?f\\.?";
const INSS = "i\\.?n\\.?s\\.?s\\.?";

function wordRe(alternatives: string[], flags = ""): RegExp {
  return new RegExp(`(?<![a-z])(?:${alternatives.join("|")})(?![a-z])`, flags);
}

// ─── Valores ─────────────────────────────────────────────────────────────────

const AMOUNT = "\\d{1,3}(?:\\.\\d{3})+,\\d{2}|\\d{1,3}(?:,\\d{3})+\\.\\d{2}|\\d+,\\d{2}|\\d+\\.\\d{2}";
/**
 * Valor monetário brasileiro ("5.340,91") ou com ponto decimal ("5340.91",
 * "5,340.91"), com sinal de menos opcional à esquerda ("-557,36") ou à direita
 * ("50,00-"). Exige 2 casas e não casa pedaços de datas/CNPJ.
 */
const MONEY_SRC = `(?:(?<=^|\\s)(-)|(?<![\\d.,/-]))(${AMOUNT})(?!\\d|[.,/]\\d)(?:(-)(?!\\d))?`;

interface Money {
  start: number;
  end: number;
  value: number;
  negative: boolean;
}

/** "5.340,91" → 5340.91 · "5340.91" → 5340.91 · "5,340.91" → 5340.91 · "-557,36" → -557.36 */
export function parseBRL(raw: string): number {
  let s = raw.trim().replace(/^r\$\s*/i, "");
  let sign = 1;
  if (s.startsWith("-") || s.endsWith("-")) {
    sign = -1;
    s = s.replace(/^-|-$/g, "").trim();
  }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let n: number;
  if (lastComma >= 0 && lastDot >= 0) {
    n = lastComma > lastDot ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s.replace(/,/g, ""));
  } else if (lastComma >= 0) {
    n = Number(s.replace(",", "."));
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    n = Number(s.replace(/\./g, ""));
  } else {
    n = Number(s);
  }
  return sign * n;
}

function findMoney(s: string): Money[] {
  const re = new RegExp(MONEY_SRC, "g");
  const out: Money[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const value = parseBRL(m[2]!);
    if (!Number.isFinite(value)) continue;
    const negative = Boolean(m[1] || m[3]);
    out.push({ start: m.index, end: m.index + m[0].length, value: negative ? -value : value, negative });
  }
  return out;
}

/** Corrige O→0 e l/I→1 dentro de números ("5.34O,91"). Mantém o comprimento. */
function fixOcrDigits(line: string): string {
  return line.replace(
    /(?<![A-Za-z\d])[\dOoIl](?:[\dOoIl]|[.,](?=[\dOoIl])){0,14}[.,][\dOoIl]{2}(?![A-Za-z\d])/g,
    (tok) =>
      /[OoIl]/.test(tok) && (tok.match(/\d/g)?.length ?? 0) >= 2
        ? tok.replace(/[Oo]/g, "0").replace(/[Il]/g, "1")
        : tok,
  );
}

/** "SALARIO 5 340,91" → "SALARIO 5.340,91" quando é o único valor da linha. Mantém o comprimento. */
function fixSpaceThousands(line: string): string {
  const re = /(?<=[A-Za-zÀ-ÿ$:]\s{1,3})(\d{1,3}) (\d{3}),(\d{2})(?![\d.,])/;
  const m = line.match(re);
  if (!m) return line;
  const fixed = line.replace(re, "$1.$2,$3");
  return findMoney(fixed).length === 1 ? fixed : line;
}

// ─── CNPJ e CPF ──────────────────────────────────────────────────────────────

const CNPJ_LABEL = "c\\.?\\s?n\\.?\\s?p\\.?\\s?j\\.?(?:\\s*\\/\\s*mf)?\\s*(?:n[º°o]\\.?\\s*)?[:.\\-]?";
const CNPJ_LABEL_RE = new RegExp(`(?<![a-z])${CNPJ_LABEL}`, "i");
const CNPJ_NUMBER_SRC =
  "(?<![\\d])(\\d{2})\\s?\\.?\\s?(\\d{3})\\s?\\.?\\s?(\\d{3})\\s?\\/?\\s?(\\d{4})\\s?-?\\s?(\\d{2})(?!\\d)";

function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * weights[i]!;
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

function formatCnpj(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CNPJ validado e formatado, ou null. */
export function normalizeCnpj(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return isValidCnpj(digits) ? formatCnpj(digits) : null;
}

/** Procura o CNPJ: com rótulo, com barra ("/0001") ou 14 dígitos seguidos. */
function findCnpj(lines: string[]): { cnpj?: string; invalid: boolean } {
  let invalid = false;
  for (const line of lines) {
    const labeled = CNPJ_LABEL_RE.test(line);
    const re = new RegExp(CNPJ_NUMBER_SRC, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const digits = m.slice(1, 6).join("");
      const plausible = labeled || m[0].includes("/") || /^\d{14}$/.test(m[0]);
      if (!plausible) continue;
      if (isValidCnpj(digits)) return { cnpj: formatCnpj(digits), invalid: false };
      invalid = true;
    }
  }
  return { invalid };
}

const CPF_RE =
  /(?<![A-Za-z])(?:c\.?\s?p\.?\s?f\.?(?:\s*\/\s*mf)?\s*(?:n[º°o]\.?\s*)?[:.\-]?\s*)?(?<![\d./])\d{3}\.?\s?\d{3}\.?\s?\d{3}\s?-?\s?\d{2}(?![\d/])|(?<![A-Za-z])c\.?p\.?f(?![A-Za-z])\.?\s*(?:n[º°o]\.?)?\s*:?/gi;

/** Apaga CPF (número e rótulo) da linha. */
function wipeCpf(line: string): string {
  return line.replace(CPF_RE, blank);
}

// ─── Competência ─────────────────────────────────────────────────────────────

const FULL_MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const SHORT_MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
const FULL_MONTH_NAMES = Object.keys(FULL_MONTHS).join("|");
const SHORT_MONTH_NAMES = Object.keys(SHORT_MONTHS).join("|");

const PAYMENT_LABEL_RE =
  /pago\s*em|(?<![a-z])(?:data|dt)\.?\s*(?:de\s*|do\s*)?(?:pagamento|pagto|pgto|credito|deposito)|credito\s*em|pagamento\s*em|depositado\s*em/;
/** Rótulos de outras datas que nunca são competência */
const OTHER_DATE_LABEL_RE =
  /admiss|(?<![a-z])adm(?![a-z])|demiss|desligamento|afastamento|nascimento|aquisitivo|concessivo|(?<![a-z])gozo(?![a-z])|retorno|vencimento\s*das\s*ferias/;
const ADDRESS_RE = /(?<![a-z])(?:rua|r\.|av\.?|avenida|alameda|travessa|praca|rodovia|estrada|endereco|cep|bairro)(?![a-z])/;
const PERIOD_LABEL_SRC =
  /(?<![a-z])(?:competencia|mes\s*\/\s*ano|mes\s*\/\s*competencia|mes\s*(?:de\s*)?referencia|referencia|ref\.?(?=\s*:)|periodo(?!\s*(?:aquisitivo|concessivo|de\s*gozo|gozo|de\s*ferias|de\s*afastamento)))(?![a-z])/.source;
const PERIOD_LABEL_RE = new RegExp(PERIOD_LABEL_SRC);
const TABLE_HEADER_RE = wordRe(["descricao", "descr\\.?", "discriminacao", "vencimentos", "proventos", "descontos", "cod(?:igo)?\\.?"]);

interface PeriodRead {
  period: string | null;
  thirteenth: boolean;
}

function ym(year: string, month: number): string | null {
  const y = year.length === 2 ? `20${year}` : year;
  if (month < 1 || month > 12) return null;
  return `${y}-${String(month).padStart(2, "0")}`;
}

const DAY_IN_WORDS_RE =
  /(?<![a-z])(?:\d{1,2}|[ivxlc]{1,5}|um|dois|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|primeiro)\s*(?:de\s*)?$/;

/** Mês por extenso/abreviado. `strict`: só com ano de 4 dígitos ou "/" (sem rótulo). */
function monthNameMatches(s: string, strict: boolean): { index: number; period: string }[] {
  const out: { index: number; period: string }[] = [];
  const res = [
    new RegExp(`(?<![a-z])(${FULL_MONTH_NAMES})\\s*(?:(?:de\\s*|\\s)(20\\d{2}|\\d{2})|[/.-]\\s*(20\\d{2}|\\d{2}))(?!\\d)`, "g"),
    new RegExp(`(?<![a-z])(${SHORT_MONTH_NAMES})\\.?\\s*(?:[/.-]\\s*(20\\d{2}|\\d{2})|\\s+(?:de\\s+)?(20\\d{2}))(?!\\d)`, "g"),
  ];
  for (const re of res) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const before = s.slice(Math.max(0, m.index - 12), m.index);
      if (DAY_IN_WORDS_RE.test(before)) continue; // "5 de outubro de 2026", "XV de Novembro"
      const year = (m[2] ?? m[3])!;
      const hasSlash = /[/.-]/.test(m[0].slice(m[1]!.length));
      if (strict && year.length === 2 && !hasSlash) continue;
      const month = FULL_MONTHS[m[1]!] ?? SHORT_MONTHS[m[1]!];
      const period = month ? ym(year, month) : null;
      if (period) out.push({ index: m.index, period });
    }
  }
  return out;
}

/**
 * Lê uma competência explícita (texto depois de um rótulo, ou campo do Vision).
 * Aceita "09/2026", "9/26", "2026-09", "2026-09-01", "Setembro/2026",
 * "setembro de 2026", "SET/26", "13/2026" (13º → dezembro) e um período
 * "01/09/2026 a 30/09/2026" dentro do mesmo mês. Pega o primeiro que aparece.
 */
function readPeriod(raw: string): PeriodRead | null {
  const s = norm(raw);
  const candidates: { index: number; read: PeriodRead | null }[] = [];
  const add = (index: number | undefined, read: PeriodRead | null) => {
    if (index !== undefined) candidates.push({ index, read });
  };

  const range = s.match(
    /(?<!\d)\d{1,2}[/.-](\d{1,2})[/.-](20\d{2})\s*(?:a|ate|-|–)\s*\d{1,2}[/.-](\d{1,2})[/.-](20\d{2})(?!\d)/,
  );
  if (range) {
    const same = Number(range[1]) === Number(range[3]) && range[2] === range[4];
    add(range.index, same ? { period: ym(range[2]!, Number(range[1])), thirteenth: false } : null);
  }
  const thirteenthText = s.match(/(?<!\d)13[º°o]?\s*sal\w{0,8}\.?\s*(?:de\s*|[/-]\s*)?(20\d{2})(?!\d)/);
  if (thirteenthText) add(thirteenthText.index, { period: ym(thirteenthText[1]!, 12), thirteenth: true });

  const iso = s.match(/(?<![\d/.,-])(20\d{2})[-/](0?[1-9]|1[0-2])(?:[-/](?:0?[1-9]|[12]\d|3[01]))?(?!\d|[/.,-]\d)/);
  if (iso) add(iso.index, { period: ym(iso[1]!, Number(iso[2])), thirteenth: false });

  const num = s.match(/(?<![\d/.,-])(0?[1-9]|1[0-3])\s?[/-]\s?(20\d{2}|\d{2})(?!\d|[/.,-]\d)/);
  if (num) {
    const month = Number(num[1]);
    add(num.index, { period: ym(num[2]!, month === 13 ? 12 : month), thirteenth: month === 13 });
  }
  const numDot = s.match(/(?<![\d/.,-])(0?[1-9]|1[0-3])\.(20\d{2})(?!\d|[.,]\d)/);
  if (numDot) {
    const month = Number(numDot[1]);
    add(numDot.index, { period: ym(numDot[2]!, month === 13 ? 12 : month), thirteenth: month === 13 });
  }
  for (const m of monthNameMatches(s, false)) add(m.index, { period: m.period, thirteenth: false });

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0]!.read;
}

/**
 * Normaliza uma competência explícita para YYYY-MM (veja `readPeriod`).
 * Datas completas soltas (DD/MM/AAAA) e intervalos que cruzam meses devolvem null.
 */
export function normalizePayslipPeriod(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return readPeriod(raw)?.period ?? null;
}

/** Competência rotulada na linha `i` (ou na seguinte, quando o rótulo está sozinho). */
function labeledPeriodAt(lines: Line[], i: number): PeriodRead | null {
  const n = lines[i]!.n;
  const re = new RegExp(PERIOD_LABEL_SRC, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(n))) {
    const isTableHeader = /^referencia$/.test(m[0]) && !/^\s*:/.test(n.slice(re.lastIndex)) && TABLE_HEADER_RE.test(n);
    if (isTableHeader) continue;
    let after = n.slice(re.lastIndex);
    for (const stop of [PAYMENT_LABEL_RE, OTHER_DATE_LABEL_RE, /\s{2,}(?=[a-z][a-z. ]{0,20}:)/]) {
      const s = after.match(stop);
      if (s) after = after.slice(0, s.index);
    }
    const value = after.replace(/^[\s:.\-–=]*/, "");
    if (!value.trim()) {
      // Rótulo sozinho: valor na linha de baixo ("Mês/Ano" ⏎ "09/2026")
      const next = lines[i + 1]?.n;
      if (next && !findMoney(next).length && !PAYMENT_LABEL_RE.test(next) && !OTHER_DATE_LABEL_RE.test(next)) {
        const read = readPeriod(next);
        if (read?.period) return read;
      }
      continue;
    }
    const read = readPeriod(value);
    if (read?.period) return read;
  }
  return null;
}

function findPeriod(lines: Line[]): PeriodRead | null {
  for (let i = 0; i < lines.length; i++) {
    const read = labeledPeriodAt(lines, i);
    if (read) return read;
  }
  // Sem rótulo: só mês por extenso/abreviado, fora de linhas de pagamento, outras datas e endereços
  for (const { n } of lines) {
    if (PAYMENT_LABEL_RE.test(n) || OTHER_DATE_LABEL_RE.test(n) || ADDRESS_RE.test(n)) continue;
    const found = monthNameMatches(n, true).sort((a, b) => a.index - b.index)[0];
    if (found) return { period: found.period, thirteenth: false };
  }
  return null;
}

// ─── Nome do funcionário (nunca devolvido) ───────────────────────────────────

interface Line {
  raw: string;
  n: string;
}

const EMPLOYEE_LABEL_RE = new RegExp(
  "(?<![a-z])(?:" +
    [
      "nome\\s*(?:do|da)\\s*(?:funcionari[oa]|empregad[oa]|colaborador[a]?|servidor[a]?|trabalhador[a]?|segurad[oa]|beneficiari[oa])",
      "nome(?!\\s*(?:empresarial|fantasia|(?:da|do)\\s*(?:empresa|empregador)))",
      "funcionari[oa]",
      "colaborador[a]?",
      "empregad[oa](?!r)",
      "servidor[a]?",
      "trabalhador[a]?",
    ].join("|") +
    ")(?![a-z])",
);
/** O que pode vir antes do rótulo para ele ainda contar como "início de linha" */
const EMPLOYEE_PREFIX_RE = /^(?:\s|\d|[.:\-–|/]|cod(?:igo)?|matr(?:icula)?|chapa|registro|cadastro|n[º°o])*$/;
const HEADER_WORD_RE = wordRe([
  "cbo", "cargo", "funcao", "depto", "departamento", "setor", "secao", "admissao", "adm", "centro", "custo",
  "local", "lotacao", "empresa", "filial", "salario", "matricula", "matr", "cpf", "data", "codigo", "cod", "nome",
  "cc", "identidade", "rg", "pis", "ctps", "horario", "unidade",
]);
/** Rótulos que encerram o trecho do nome numa linha com várias colunas */
const NEXT_LABEL_RE =
  /\s(?:cargo|cbo|funcao|admiss\w{0,4}|adm\.?|empresa|empregador|cnpj|competencia|referencia|mes\s*\/\s*ano|periodo|depto|departamento|secao|setor|matr\w{0,6}|filial|lotacao|banco|agencia|conta|data|dt\.?)(?![a-z])|\s{2,}[a-z.]{2,20}(?:\s[a-z.]{2,20})?\s?:/;

/**
 * Apaga o nome do funcionário. Rótulo só conta no início da linha (assim
 * "INSS EMPREGADO" ou "Contribuição Servidor" continuam sendo rubricas).
 * - "Funcionário: 123 - Maria Silva   Cargo: X" → apaga até o próximo rótulo;
 * - "Funcionário:" sozinho, ou cabeçalho "Código  Nome do Funcionário  CBO" →
 *   apaga a linha e SEMPRE a linha seguinte (os dados).
 */
function redactEmployee(lines: Line[]): Line[] {
  const out: Line[] = [];
  let dropNext = false;
  for (const line of lines) {
    if (dropNext) {
      dropNext = false;
      continue;
    }
    const m = line.n.match(EMPLOYEE_LABEL_RE);
    const start = m?.index ?? -1;
    if (!m || !EMPLOYEE_PREFIX_RE.test(line.n.slice(0, start))) {
      out.push(line);
      continue;
    }
    const labelEnd = start + m[0].length;
    const rest = line.n.slice(labelEnd);
    const separated = /^\s*[:\-–]/.test(rest);
    const content = rest.replace(/^[\s:\-–]*(?:n[º°o]\.?\s*)?(?:\d+\s*[-–]?\s*)?/, "");
    const isHeader = !separated && HEADER_WORD_RE.test(rest);
    if (!/[a-z]/.test(content) || isHeader) {
      dropNext = true;
      continue; // a linha inteira é rótulo/cabeçalho
    }
    const stop = rest.slice(1).search(NEXT_LABEL_RE);
    const end = stop >= 0 ? labelEnd + 1 + stop : line.n.length;
    const keep = line.raw.length === line.n.length;
    out.push({ raw: keep ? wipe(line.raw, start, end) : "", n: wipe(line.n, start, end) });
  }
  return out.filter((l) => l.n.trim());
}

// ─── Totais, bases e rubricas ────────────────────────────────────────────────

type Slot = "gross" | "deductions" | "net" | "fgts" | "info" | "totals" | "baseSalary";

const SLOT_PATTERNS: [Slot, string][] = [
  ["info", `base\\s*(?:de\\s*)?(?:calc(?:ulo)?\\.?\\s*)?(?:do\\s*|de\\s*)?(?:${INSS}|${IR}|i\\.?r\\.?|${FG})`],
  ["info", `sal(?:ario)?\\.?\\s*(?:de\\s*)?contr(?:ibuicao)?\\.?(?:\\s*${INSS})?`],
  ["info", `faixa\\s*(?:do\\s*)?${IR}`],
  ["info", `dep(?:endentes|\\.)?\\s*(?:de\\s*|p\\/\\s*)?${IR}|dependentes`],
  ["gross", "total\\s*(?:geral\\s*)?(?:de\\s*|dos\\s*)?(?:vencimentos|proventos|ganhos|creditos)|(?:salario|total|valor)\\s*bruto"],
  ["deductions", "total\\s*(?:geral\\s*)?(?:de\\s*|dos\\s*)?(?:descontos|debitos|deducoes)"],
  [
    "net",
    "valor\\s*liquido(?:\\s*a\\s*(?:receber|pagar|creditar))?|liquido\\s*a\\s*(?:receber|pagar|creditar)|total\\s*liquido|salario\\s*liquido|liquido\\s*do\\s*mes|^\\s*liquido(?=\\s*(?:[:=>\\-]+\\s*)?(?:r\\$\\s*)?-?\\d|\\s*$)",
  ],
  ["fgts", `(?:valor\\s*(?:do\\s*)?|deposito\\s*(?:do\\s*)?)?${FG}(?:\\s*(?:do\\s*)?mes|\\s*depositado|\\s*a\\s*recolher|\\s*8\\s*%)?`],
  ["totals", "totais|^\\s*total(?=\\s*[:=]?\\s*(?:r\\$\\s*)?-?\\d)"],
  ["baseSalary", "salario\\s*base"],
];
const SLOT_RE_SRC = SLOT_PATTERNS.map(([, p]) => `(?<![a-z])(${p})(?![a-z])`).join("|");

interface SlotMatch {
  slot: Slot;
  start: number;
  end: number;
}

/** "Salário Base" só é coluna informativa quando a linha tem outros rótulos (rodapé/cabeçalho de bases). */
function findSlots(n: string): SlotMatch[] {
  const re = new RegExp(SLOT_RE_SRC, "g");
  const out: SlotMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(n))) {
    const idx = m.slice(1).findIndex((g) => g !== undefined);
    out.push({ slot: SLOT_PATTERNS[idx]![0], start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) re.lastIndex++;
  }
  if (out.length === 1 && out[0]!.slot === "baseSalary") return [];
  return out.map((s) => (s.slot === "baseSalary" ? { ...s, slot: "info" as const } : s));
}

const BASE_RE = new RegExp(
  SLOT_PATTERNS.filter(([s]) => s === "info")
    .map(([, p]) => `(?<![a-z])(?:${p})(?![a-z])`)
    .join("|"),
);
const FGTS_RE = new RegExp(`(?<![a-z])${FG}(?![a-z])`);
const TOTAL_WORD_RE = wordRe(["total", "totais", "subtotal"]);
const NET_LABEL_RE = new RegExp(SLOT_PATTERNS.find(([s]) => s === "net")![1].replace("^\\s*liquido", "^\\s*liquido(?![a-z])"));

const REFUND_RE = wordRe(["reembolso", "devolucao", "estorno", "restituicao"]);
const DEDUCTION_RE = wordRe([
  INSS, IR, "i\\.?r\\.?", "imposto\\s*de\\s*renda", "vale[\\s-]*transporte", "v\\.?\\s*transporte",
  "vale[\\s-]*refeicao", "vale[\\s-]*alimentacao", "plano\\s*(?:de\\s*)?saude", "assist(?:encia)?\\.?\\s*medica",
  "convenio", "unimed", "odonto\\w{0,10}", "pensao", "contrib\\w{0,12}", "sindic\\w{0,8}", "faltas?", "atrasos?",
  "adiantamento", "adiant\\.?", "consignado", "emprestimo", "desc(?:onto)?s?\\.?", "seguro", "previdencia",
  "coparticipacao", "mensalidade", "associacao", "farmacia", "multa", "liquido\\s*(?:de\\s*)?ferias",
]);
const EARNING_RE = wordRe([
  "salario", "sal\\.?", "vencimentos?(?:\\s*basico)?", "horas?\\s*extras?", "h\\.?\\s*extras?", "h\\.?e\\.?",
  "adicional", "adic\\.?", "comiss(?:ao|oes)", "gratif\\w{0,10}", "ferias", "13o?\\s*salario", "decimo\\s*terceiro",
  "dsr", "descanso\\s*semanal(?:\\s*remunerado)?", "premio", "premiacao", "bonus", "insalubridade", "periculosidade",
  "noturno", "abono", "ajuda\\s*de\\s*custo", "auxilio\\w{0,3}", "quebra\\s*de\\s*caixa", "quinquenio", "anuenio",
  "trienio", "plr", "participacao", "dif\\w{0,6}\\.?\\s*salari\\w{0,3}", "aviso\\s*previo", "gorjetas?",
  "sobreaviso", "plantao", "produtividade", "diarias", "saldo\\s*de\\s*salario",
]);
const ADVANCE_RE = wordRe(["adiantamento", "adiant\\.?"]);
const SECTION_HEADER_RE = /^\s*(?:(?:proventos|vencimentos|descontos|creditos|debitos)\s*)+$/;

function cleanItemName(segment: string): string {
  const withoutMoney = segment.replace(new RegExp(MONEY_SRC, "g"), " ");
  let s = withoutMoney
    .replace(/r\$/gi, " ")
    .replace(/^\s*\d{1,5}\s+/, "") // código da rubrica
    .replace(/[|]/g, " ")
    .replace(/\s{2,}/g, " ");
  s = trimEndPunct(s.trim());
  return s.replace(/\s+\d{1,3}(?:[.,]\d+)?\s*(?:h|d|dias?)?$/i, "").trim(); // referência (30 dias, 220 h)
}

/** Divide uma linha com colunas lado a lado em trechos "descrição … valor". */
function splitSegments(n: string, money: Money[]): { start: number; end: number; money: Money[] }[] {
  const out: { start: number; end: number; money: Money[] }[] = [];
  let cur: { start: number; end: number; money: Money[] } | null = null;
  for (const m of money) {
    if (cur && /[a-z]{2,}/.test(n.slice(cur.end, m.start))) {
      out.push(cur);
      cur = { start: cur.end, end: m.end, money: [m] };
    } else if (cur) {
      cur.end = m.end;
      cur.money.push(m);
    } else {
      cur = { start: 0, end: m.end, money: [m] };
    }
  }
  if (cur) out.push(cur);
  return out;
}

function isValuesOnly(n: string): boolean {
  return /\d/.test(n) && !/[a-z]{2,}/.test(n.replace(/r\$/g, ""));
}

// ─── Empresa ─────────────────────────────────────────────────────────────────

const COMPANY_LABEL_RE =
  /(?<![a-z])(?:nome\s*empresarial|razao\s*social|nome\s*(?:da|do)\s*(?:empresa|empregador)|empresa|empregador[a]?)\s*[:\-–]\s*/;
const COMPANY_SUFFIX_RE = wordRe([
  "ltda", "s\\s?[./]\\s?a\\.?", "eireli", "me", "epp", "cia", "companhia", "sociedade", "cooperativa",
]);
const PUBLIC_ENTITY_RE =
  /^\s*(?:prefeitura|governo|secretaria|municipio|estado|tribunal|universidade|instituto|fundacao|camara|assembleia|ministerio|hospital|associacao|condominio|igreja)(?![a-z])/;
const BANK_RE = /^\s*banco(?![a-z])|(?<![a-z])(?:ag(?:encia)?|c\/?c|conta(?:\s*corrente)?)\.?\s*:?\s*\d/;
const TITLE_RE =
  /^\s*(?:recibo|demonstrativo|holerite|contracheque|contra-cheque|folha|comprovante|termo|extrato|espelho|aviso)(?![a-z])/;

function cleanCompany(raw: string): string {
  let s = raw.replace(new RegExp(CNPJ_NUMBER_SRC, "g"), " ").replace(new RegExp(`(?<![a-z])${CNPJ_LABEL}`, "gi"), " ");
  // corta outra coluna ("ACME LTDA      Recibo de Pagamento")
  const cut = s.trim().search(/\s{3,}/);
  if (cut > 0) s = s.trim().slice(0, cut);
  return trimEndPunct(s.replace(/\s{2,}/g, " ").trim()).trim();
}

function companyCandidate(line: Line | undefined): string {
  if (!line || !line.raw) return "";
  const { n } = line;
  if (findMoney(n).length || TITLE_RE.test(n) || BANK_RE.test(n) || TABLE_HEADER_RE.test(n)) return "";
  if (PERIOD_LABEL_RE.test(n) || PAYMENT_LABEL_RE.test(n) || OTHER_DATE_LABEL_RE.test(n)) return "";
  const name = cleanCompany(line.raw);
  if (/:/.test(name) || !/[a-zà-ÿ]{3}/i.test(name) || TITLE_RE.test(norm(name))) return "";
  return name;
}

function findCompany(lines: Line[], cnpj: string | undefined): string {
  // 1. Rótulo
  for (const { raw, n } of lines) {
    const m = n.match(COMPANY_LABEL_RE);
    if (!m || !raw) continue;
    let after = raw.slice((m.index ?? 0) + m[0].length);
    const nextLabel = after.search(/\s{2,}\S{1,20}\s?:/);
    if (nextLabel > 0) after = after.slice(0, nextLabel);
    const name = cleanCompany(after);
    if (/[a-zà-ÿ]{3}/i.test(name)) return name;
  }
  // 2. Perto do CNPJ (mesma linha, anterior ou seguinte)
  const cnpjDigits = cnpj?.replace(/\D/g, "");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const hasCnpj = CNPJ_LABEL_RE.test(line.n) || (cnpjDigits && line.n.replace(/\D/g, "").includes(cnpjDigits));
    if (!hasCnpj) continue;
    const same = companyCandidate(line);
    if (same) return same;
    const near = companyCandidate(lines[i - 1]) || companyCandidate(lines[i + 1]);
    if (near) return near;
  }
  // 3. Sufixo societário ou órgão público
  for (const line of lines) {
    if (COMPANY_SUFFIX_RE.test(line.n) || PUBLIC_ENTITY_RE.test(line.n)) {
      const name = companyCandidate(line);
      if (name) return name;
    }
  }
  // 4. Primeira linha em maiúsculas no topo
  for (const line of lines.slice(0, 3)) {
    const letters = line.raw.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length >= 5 && letters === letters.toUpperCase()) {
      const name = companyCandidate(line);
      if (name) return name;
    }
  }
  return "";
}

// ─── Fechamento comum (texto e Vision) ───────────────────────────────────────

interface Extracted {
  company: string;
  cnpj?: string;
  period: PeriodRead | null;
  gross?: number;
  net?: number;
  totalDeductions?: number;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  fgts?: number;
  unrecognized: number;
  notes: string[];
  cap: number;
}

function finalize(x: Extracted): PayslipParseResult {
  const warnings: string[] = [...x.notes];
  const sumDeductions = round2(x.deductions.reduce((s, d) => s + d.value, 0));
  const sumEarnings = round2(x.earnings.reduce((s, e) => s + e.value, 0));
  const deductionTotal = x.totalDeductions ?? sumDeductions;
  const hasDeductions = x.totalDeductions !== undefined || sumDeductions > 0;
  const period = x.period?.period ?? null;
  let cap = x.cap;

  let gross = x.gross;
  let net = x.net;
  let grossDerived = false;
  let netDerived = false;

  if (gross === undefined && net !== undefined && net >= 0 && hasDeductions) {
    gross = round2(net + deductionTotal);
    grossDerived = true;
    warnings.push(PAYSLIP_WARNINGS.grossFromNet);
  } else if (gross === undefined && sumEarnings > 0) {
    gross = sumEarnings;
    grossDerived = true;
    warnings.push(PAYSLIP_WARNINGS.grossFromEarnings);
  } else if (gross === undefined && (net !== undefined || hasDeductions)) {
    warnings.push(PAYSLIP_WARNINGS.grossNotFound);
    cap = Math.min(cap, 0.5);
  }
  if (net === undefined && gross !== undefined) {
    net = round2(gross - deductionTotal);
    netDerived = true;
    warnings.push(PAYSLIP_WARNINGS.netFromGross);
  }

  const grossSalary = round2(gross ?? 0);
  const netSalary = round2(net ?? 0);

  let score = 0;
  if (x.company) score += 0.1;
  if (period) score += 0.2;
  if (grossSalary > 0) score += grossDerived ? 0.125 : 0.25;
  if (netSalary > 0) score += netDerived ? 0.125 : 0.25;
  if (x.deductions.length || x.totalDeductions !== undefined) score += 0.1;

  if (x.totalDeductions !== undefined && sumDeductions > 0 && Math.abs(x.totalDeductions - sumDeductions) > 0.05) {
    warnings.push(PAYSLIP_WARNINGS.deductionsMismatch);
    score -= 0.1;
  }

  if (netSalary < 0) {
    warnings.push(PAYSLIP_WARNINGS.negativeNet);
    cap = Math.min(cap, 0.3);
  } else if (grossSalary > 0 && netSalary > grossSalary) {
    warnings.push(PAYSLIP_WARNINGS.netAboveGross);
    cap = Math.min(cap, 0.3);
  } else if (!grossDerived && !netDerived && grossSalary > 0 && netSalary >= 0 && net !== undefined) {
    if (Math.abs(grossSalary - deductionTotal - netSalary) <= 0.05) {
      score += 0.1;
    } else {
      warnings.push(PAYSLIP_WARNINGS.totalsMismatch);
      cap = Math.min(cap, 0.6);
    }
  }

  if (x.unrecognized > 0) {
    warnings.push(PAYSLIP_WARNINGS.unrecognizedItems);
    score -= 0.1;
    cap = Math.min(cap, 0.85);
  }
  if (x.period?.thirteenth) warnings.push(PAYSLIP_WARNINGS.thirteenth);
  if (!period) warnings.push(PAYSLIP_WARNINGS.periodNotFound);

  return {
    company: x.company,
    ...(x.cnpj ? { cnpj: x.cnpj } : {}),
    period,
    grossSalary,
    netSalary,
    earnings: x.earnings,
    deductions: x.deductions,
    ...(x.fgts !== undefined ? { fgts: round2(x.fgts) } : {}),
    confidence: round2(Math.max(0, Math.min(score, cap, 1))),
    warnings,
  };
}

/** Holerite de adiantamento: o adiantamento é o provento, não um desconto. */
function applyAdvance(earnings: PayslipLine[], deductions: PayslipLine[], isAdvanceDoc: boolean): void {
  const advances = deductions.filter((d) => ADVANCE_RE.test(norm(d.name)));
  const onlyAdvances = earnings.length === 0 && advances.length > 0 && advances.length === deductions.length;
  if (!isAdvanceDoc && !onlyAdvances) return;
  for (const a of advances) {
    deductions.splice(deductions.indexOf(a), 1);
    earnings.push(a);
  }
}

// ─── Texto do OCR ────────────────────────────────────────────────────────────

/** Vários holerites na mesma imagem: corta depois dos totais do primeiro. */
function firstPayslipOnly(lines: Line[]): { lines: Line[]; multiple: boolean } {
  const labeled: number[] = [];
  for (let i = 0; i < lines.length && labeled.length < 2; i++) {
    if (labeledPeriodAt(lines, i)) labeled.push(i);
  }
  if (labeled.length < 2) return { lines, multiple: false };
  const [first, second] = labeled as [number, number];
  let lastTotal = -1;
  for (let i = first; i < second; i++) {
    if (findSlots(lines[i]!.n).some((s) => s.slot === "net" || s.slot === "gross" || s.slot === "totals")) lastTotal = i;
  }
  if (lastTotal < 0) return { lines, multiple: false };
  return { lines: lines.slice(0, lastTotal + 1), multiple: true };
}

export function parsePayslipText(text: string): PayslipParseResult {
  const prepared = text
    .normalize("NFC")
    .split(/\r?\n/)
    .map((l) => fixSpaceThousands(fixOcrDigits(l.replace(/\t/g, "    ").trimEnd())))
    .filter((l) => l.trim());

  const { cnpj, invalid: invalidCnpj } = findCnpj(prepared);
  const notes: string[] = [];
  let cap = 1;
  if (!cnpj && invalidCnpj) notes.push(PAYSLIP_WARNINGS.invalidCnpj);

  let lines: Line[] = prepared.map((l) => {
    const raw = wipeCpf(l);
    return { raw, n: norm(raw) };
  });
  lines = redactEmployee(lines);

  // "Valor" ⏎ "Líquido" quebrados pelo OCR
  for (let i = 0; i + 1 < lines.length; i++) {
    if (/^\s*(?:valor|total|salario)\s*$/.test(lines[i]!.n) && /^\s*(?:liquido|bruto|de\s|dos\s|descontos|vencimentos|proventos)/.test(lines[i + 1]!.n)) {
      const merged = { raw: `${lines[i]!.raw.trim()} ${lines[i + 1]!.raw.trim()}`, n: `${lines[i]!.n.trim()} ${lines[i + 1]!.n.trim()}` };
      lines.splice(i, 2, merged);
    }
  }

  const split = firstPayslipOnly(lines);
  lines = split.lines;
  if (split.multiple) {
    notes.push(PAYSLIP_WARNINGS.multiplePayslips);
    cap = Math.min(cap, 0.8);
  }

  const company = findCompany(lines, cnpj);
  const period = findPeriod(lines);

  const totals: Partial<Record<"gross" | "deductions" | "net" | "fgts", number>> = {};
  const setSlot = (slot: Slot, m: Money | undefined, values?: Money[]) => {
    if (slot === "totals") {
      const vals = values ?? (m ? [m] : []);
      const order = ["gross", "deductions", "net"] as const;
      vals.slice(0, 3).forEach((v, k) => totals[order[k]!] ??= v.value);
      return;
    }
    if (!m || slot === "info" || slot === "baseSalary") return;
    if (slot === "net") totals.net ??= m.value;
    else totals[slot] ??= Math.abs(m.value);
  };

  const earnings: PayslipLine[] = [];
  const deductions: PayslipLine[] = [];
  let unrecognized = 0;
  let columns: { earn: number; deduct: number } | null = null;
  let valueFirst = false;

  const classify = (name: string, segN: string, m: Money): void => {
    const item = { name, value: round2(Math.abs(m.value)) };
    if (item.value <= 0) return;
    if (REFUND_RE.test(segN)) (m.negative ? deductions : earnings).push(item);
    else if (DEDUCTION_RE.test(segN)) deductions.push(item);
    else if (EARNING_RE.test(segN)) (m.negative ? deductions : earnings).push(item);
    else if (m.negative) deductions.push(item);
    else if (columns) {
      const center = (m.start + m.end) / 2;
      (Math.abs(center - columns.deduct) < Math.abs(center - columns.earn) ? deductions : earnings).push(item);
    } else unrecognized++;
  };

  const isLabelLine = (n: string) =>
    !/\d/.test(n.replace(/^\s*\d{1,5}\s+(?=[a-z])/, "")) &&
    !SECTION_HEADER_RE.test(n) &&
    (findSlots(n).length === 1 || ((DEDUCTION_RE.test(n) || EARNING_RE.test(n)) && !TABLE_HEADER_RE.test(n)));
  const singleValue = (n: string) => isValuesOnly(n) && findMoney(n).length === 1 && (n.match(/\d[\d.,]*/g) ?? []).length === 1;

  for (let i = 0; i < lines.length; i++) {
    const { raw, n } = lines[i]!;
    const money = findMoney(n);

    if (!money.length) {
      const slots = findSlots(n);
      const next = lines[i + 1];

      // Quadro de totais/bases: rótulos numa linha, valores na de baixo
      if (slots.length >= 2) {
        if (next && isValuesOnly(next.n)) {
          const tokens: { start: number; text: string }[] = [];
          const re = /-?\d[\d.,]{0,20}/g;
          let t: RegExpExecArray | null;
          while ((t = re.exec(next.n))) tokens.push({ start: t.index, text: t[0].replace(/[.,]$/, "") });
          const assign = (s: SlotMatch, tok: { text: string }) => {
            const asMoney = findMoney(tok.text)[0];
            if (s.slot === "info" || s.slot === "baseSalary") return;
            if (asMoney && asMoney.end - asMoney.start === tok.text.length) setSlot(s.slot, asMoney);
          };
          if (tokens.length === slots.length) {
            slots.forEach((s, k) => assign(s, tokens[k]!));
          } else {
            // Colunas faltando: associa pela posição (vizinho mais próximo, em ordem)
            notes.push(PAYSLIP_WARNINGS.headerPartial);
            cap = Math.min(cap, 0.8);
            let last = -1;
            tokens.forEach((tok, k) => {
              const remaining = tokens.length - k - 1;
              let best = -1;
              for (let j = last + 1; j < slots.length - remaining; j++) {
                if (best < 0 || Math.abs(slots[j]!.start - tok.start) < Math.abs(slots[best]!.start - tok.start)) best = j;
              }
              if (best < 0) return;
              last = best;
              assign(slots[best]!, tok);
            });
          }
          i++;
        }
        continue;
      }

      // Cabeçalho da tabela de rubricas: posição das colunas e ordem valor/referência
      if (!slots.length && TABLE_HEADER_RE.test(n)) {
        const earn = n.search(/(?<![a-z])(?:vencimentos|proventos|creditos)(?![a-z])/);
        const deduct = n.search(/(?<![a-z])(?:descontos|debitos)(?![a-z])/);
        if (earn >= 0 && deduct >= 0) columns = { earn: earn + 5, deduct: deduct + 4 };
        const valuePos = n.search(/(?<![a-z])(?:valor|vencimentos|proventos)(?![a-z])/);
        const refPos = n.search(/(?<![a-z])(?:ref\.?|referencia|qtd\.?|quant\w{0,6})(?![a-z])/);
        if (valuePos >= 0 && refPos >= 0) valueFirst = valuePos < refPos;
        continue;
      }

      // Blocos do ML Kit: k rótulos seguidos de k valores, na mesma ordem
      if (isLabelLine(n)) {
        let k = 0;
        while (i + k < lines.length && isLabelLine(lines[i + k]!.n)) k++;
        let v = 0;
        while (i + k + v < lines.length && singleValue(lines[i + k + v]!.n)) v++;
        // Com menos valores que rótulos, os rótulos mais próximos dos valores ficam com eles
        const pairs = Math.min(k, v);
        for (let j = 0; j < pairs; j++) {
          const label = lines[i + k - pairs + j]!;
          const m = findMoney(lines[i + k + j]!.n)[0]!;
          const slot = findSlots(label.n)[0];
          if (slot) setSlot(slot.slot, m);
          else classify(cleanItemName(label.raw || label.n), label.n, m);
        }
        i += k + pairs - 1;
      }
      continue;
    }

    // Linha com valores: rótulos de totais/bases primeiro
    const slots = findSlots(n);
    const used = new Set<Money>();
    slots.forEach((s, k) => {
      const until = slots[k + 1]?.start ?? n.length;
      const after = money.filter((m) => m.start >= s.end && m.start < until && !used.has(m));
      if (after.length) {
        if (s.slot === "totals") {
          after.forEach((m) => used.add(m));
          setSlot("totals", undefined, after);
        } else {
          used.add(after[0]!);
          setSlot(s.slot, after[0]);
        }
        return;
      }
      // Valor antes do rótulo ("4.500,00 Valor Líquido")
      const from = slots[k - 1]?.end ?? 0;
      const before = money.filter((m) => m.end <= s.start && m.start >= from && !used.has(m));
      const last = before[before.length - 1];
      if (last && !/[a-z]{2,}/.test(n.slice(last.end, s.start))) {
        used.add(last);
        setSlot(s.slot, last);
      }
    });

    for (const seg of splitSegments(n, money)) {
      if (seg.money.every((m) => used.has(m))) continue;
      if (slots.some((s) => s.start < seg.end && s.end > seg.start)) continue;
      const sn = n.slice(seg.start, seg.end);
      if (BASE_RE.test(sn) || FGTS_RE.test(sn) || TOTAL_WORD_RE.test(sn) || PAYMENT_LABEL_RE.test(sn)) continue;
      const values = seg.money.filter((m) => !used.has(m) && m.value !== 0);
      const chosen = valueFirst ? values[0] : values[values.length - 1];
      if (!chosen) continue;
      const name = cleanItemName(raw ? raw.slice(seg.start, seg.end) : sn);
      if (!/[a-zà-ÿ]{2}/i.test(name)) continue;
      classify(name, sn, chosen);
    }
  }

  const isAdvanceDoc = lines.some(({ n }) => ADVANCE_RE.test(n) && !findMoney(n).length);
  applyAdvance(earnings, deductions, isAdvanceDoc);

  return finalize({
    company,
    ...(cnpj ? { cnpj } : {}),
    period,
    gross: totals.gross,
    net: totals.net,
    totalDeductions: totals.deductions,
    earnings,
    deductions,
    fgts: totals.fgts,
    unrecognized,
    notes,
    cap,
  });
}

// ─── Vision OCR ──────────────────────────────────────────────────────────────

/** Converte o resultado do Vision OCR para o mesmo formato do parser local (sem nome do funcionário). */
export function normalizeVisionPayslip(input: VisionPayslipInput): PayslipParseResult {
  const notes: string[] = [];
  const deductions: PayslipLine[] = [];
  let fgts: number | undefined;
  for (const d of input.deductions ?? []) {
    const name = wipeCpf(String(d?.name ?? "")).replace(/\s{2,}/g, " ").trim();
    const value = round2(Math.abs(Number(d?.value)));
    if (!name || !Number.isFinite(value) || value <= 0) continue;
    const n = norm(name);
    if (BASE_RE.test(n) || TOTAL_WORD_RE.test(n) || NET_LABEL_RE.test(n) || /(?<![a-z])(?:liquido|bruto)(?![a-z])/.test(n)) continue;
    if (FGTS_RE.test(n)) {
      fgts ??= value;
      continue;
    }
    deductions.push({ name, value });
  }
  const amount = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? round2(n) : undefined;
  };
  const gross = amount(input.grossSalary);
  const earnings: PayslipLine[] = [];
  if (gross === undefined) applyAdvance(earnings, deductions, false);

  let cnpj: string | undefined;
  if (typeof input.cnpj === "string" && input.cnpj.trim()) {
    cnpj = normalizeCnpj(input.cnpj) ?? undefined;
    if (!cnpj) notes.push(PAYSLIP_WARNINGS.invalidCnpj);
  }
  const period = typeof input.period === "string" ? readPeriod(input.period) : null;

  return finalize({
    company: cleanCompany(wipeCpf(String(input.company ?? ""))),
    ...(cnpj ? { cnpj } : {}),
    period: period?.period ? period : null,
    gross,
    net: amount(input.netSalary),
    earnings,
    deductions,
    fgts,
    unrecognized: 0,
    notes,
    cap: 1,
  });
}
