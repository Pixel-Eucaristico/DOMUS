/** Definições curtas de termos financeiros exibidas nos tooltips (InfoTip / FinancialTooltip) */
export interface GlossaryEntry {
  title: string;
  content: string;
}

export const FINANCIAL_GLOSSARY = {
  "50/30/20": {
    title: "Regra 50/30/20",
    content:
      "Divida sua renda em: 50% para necessidades (moradia, alimentação, transporte), 30% para desejos (lazer, compras) e 20% para poupança e investimentos.",
  },
  taxa_selic: {
    title: "Taxa Selic",
    content:
      "A taxa básica de juros da economia brasileira, definida pelo COPOM. Ela influencia todas as outras taxas de juros do mercado.",
  },
  reserva_emergencia: {
    title: "Reserva de Emergência",
    content:
      "Fundo equivalente a 3 a 6 meses de despesas mensais, mantido em investimentos de alta liquidez para imprevistos.",
  },
  juros_compostos: {
    title: "Juros Compostos",
    content:
      "Juros que incidem sobre o capital inicial mais os juros acumulados. É o principal mecanismo de crescimento patrimonial de longo prazo.",
  },
  diversificacao: {
    title: "Diversificação",
    content:
      "Estratégia de distribuir investimentos entre diferentes ativos para reduzir riscos. Não colocar todos os ovos na mesma cesta.",
  },
  salario_bruto: {
    title: "Salário Bruto",
    content:
      "Soma de tudo que você recebe no mês (salário base, horas extras, adicionais, comissões) antes de qualquer desconto.",
  },
  salario_liquido: {
    title: "Salário Líquido",
    content:
      "O que de fato cai na sua conta: salário bruto menos os descontos (INSS, IRRF, vale-transporte, plano de saúde etc.).",
  },
  descontos_holerite: {
    title: "Descontos do Holerite",
    content:
      "Valores retidos do salário bruto. Os principais são o INSS (previdência, com alíquotas progressivas de 7,5% a 14% até o teto de contribuição) e o IRRF (imposto de renda retido na fonte, conforme a tabela vigente).",
  },
  fgts: {
    title: "FGTS",
    content:
      "Depósito mensal feito pelo empregador, em geral de 8% do salário (2% para jovem aprendiz), em uma conta vinculada. Não é descontado do seu salário e pode ser sacado em situações específicas.",
  },
  limite_cdb: {
    title: "Crédito Adicional (CDB)",
    content:
      "Saldo aplicado em um CDB vinculado ao cartão que vira limite extra. Os rendimentos não aumentam esse crédito.",
  },
  xp_nivel: {
    title: "XP e Nível",
    content:
      "Você ganha XP ao registrar transações, cumprir metas e manter o orçamento em dia. Ao acumular XP você sobe de nível e desbloqueia troféus.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryTerm = keyof typeof FINANCIAL_GLOSSARY;

/** Padrões que identificam cada termo em um texto livre (ex.: resposta da IA) */
const TERM_PATTERNS: Record<GlossaryTerm, RegExp> = {
  "50/30/20": /(?<!\d)50\s*\/\s*30\s*\/\s*20(?!\d)/,
  taxa_selic: /\bselic\b/,
  reserva_emergencia: /reserva\s+(de\s+emergencia|emergencial)/,
  juros_compostos: /juros\s+compostos/,
  diversificacao: /\bdiversific\w*/,
  salario_bruto: /salario\s+bruto/,
  salario_liquido: /salario\s+liquido/,
  descontos_holerite: /\b(inss|irrf)\b/,
  fgts: /\bfgts\b/,
  limite_cdb: /\bcdb\b/,
  xp_nivel: /\bxp\b/,
};

/** Termos do glossário citados no texto, na ordem do glossário (máx. `limit`) */
export function detectGlossaryTerms(text: string, limit = 3): GlossaryTerm[] {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return (Object.keys(TERM_PATTERNS) as GlossaryTerm[])
    .filter((term) => TERM_PATTERNS[term].test(normalized))
    .slice(0, limit);
}
