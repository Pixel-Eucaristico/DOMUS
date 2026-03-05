import type { SeasonalTrophy } from "./trophyEngine";
import {
  txsInMonth,
  hasIncomeBeforeDay,
  wishlistItemCount,
  categoriesUsedInMonth,
  hasDizimoInMonth,
} from "./trophyEngine";

// ─── All 48 Seasonal Trophies (4 per month) ───────────────────────────────────

export const ALL_SEASONAL_TROPHIES: SeasonalTrophy[] = [

  // ────────────────────────────────────────────────────────────────
  // JANEIRO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_ano_novo",
    month: 1,
    name: "Recomeço de Ouro",
    icon: "🎆",
    eventSummary: "O Ano Novo representa o maior recomeço do calendário. Brasileiros fazem votos e resoluções para o ano que começa.",
    description: "Registre pelo menos 7 transações nos primeiros 7 dias de janeiro.",
    baseXp: 35,
    difficulty: "fácil",
    check: (domain, _b, monthKey) => {
      const early = txsInMonth(domain, monthKey).filter(tx => {
        const day = parseInt(tx.date.slice(8, 10), 10);
        return day <= 7;
      });
      return early.length >= 7;
    },
    progress: (domain, _b, monthKey) => {
      const count = txsInMonth(domain, monthKey).filter(tx => {
        const day = parseInt(tx.date.slice(8, 10), 10);
        return day <= 7;
      }).length;
      return { current: Math.min(count, 7), target: 7, unit: "transações" };
    },
  },
  {
    id: "seasonal_planejamento_anual",
    month: 1,
    name: "Arquiteto do Ano",
    icon: "📋",
    eventSummary: "Janeiro é o mês do planejamento anual. IPTU, IPVA e matrículas escolares chegam juntos.",
    description: "Registre sua renda em janeiro antes do dia 10 e adicione ao menos 1 meta na sua lista de desejos.",
    baseXp: 50,
    difficulty: "médio",
    check: (domain, _b, monthKey) => {
      const hasEarlyIncome = hasIncomeBeforeDay(domain, monthKey, 10);
      const hasWishlist = wishlistItemCount(domain) >= 1;
      return hasEarlyIncome && hasWishlist;
    },
    progress: (domain, _b, monthKey) => {
      const done = [
        hasIncomeBeforeDay(domain, monthKey, 10),
        wishlistItemCount(domain) >= 1,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },
  {
    id: "seasonal_dia_de_reis",
    month: 1,
    name: "Encerramento Sábio",
    icon: "👑",
    eventSummary: "Dia de Reis (6/jan) encerra o ciclo natalino. Momento de fechar o balanço das despesas de dezembro.",
    description: "Feche janeiro com saldo positivo — renda maior que despesas.",
    baseXp: 45,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent > 0,
    progress: (_d, budget) => ({
      current: budget.savingsPercent > 0 ? 1 : 0,
      target: 1,
      unit: "meta",
    }),
  },
  {
    id: "seasonal_queima_velhos",
    month: 1,
    name: "Renovação Financeira",
    icon: "🔥",
    eventSummary: "A tradição de usar branco na virada e 'queimar o velho' simboliza renovação e eliminação do que não serve.",
    description: "Mantenha seus gastos necessários abaixo de 55% da renda em janeiro.",
    baseXp: 30,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.needsPercent <= 55,
    progress: (_d, budget) => ({
      current: Math.max(0, 55 - Math.round(budget.needsPercent)),
      target: 55,
      unit: "% margem",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // FEVEREIRO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_carnaval",
    month: 2,
    name: "Folião Consciente",
    icon: "🎭",
    eventSummary: "O Carnaval movimenta R$ 18,6 bilhões. Alto risco de endividamento com fantasias, ingressos e viagens.",
    description: "Curta o Carnaval com controle: mantenha desejos ≤ 40% em fevereiro.",
    baseXp: 55,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 40,
    progress: (_d, budget) => ({
      current: Math.max(0, 40 - Math.round(budget.wantsPercent)),
      target: 40,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_valentine",
    month: 2,
    name: "Amor com Planejamento",
    icon: "❤️",
    eventSummary: "Valentine's Day (14/fev) incentiva gastos por pressão emocional. Presente médio: R$ 240.",
    description: "Registre 10+ transações em fevereiro mantendo poupança positiva.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, budget, monthKey) =>
      txsInMonth(domain, monthKey).length >= 10 && budget.savingsPercent > 0,
    progress: (domain, _budget, monthKey) => {
      const count = txsInMonth(domain, monthKey).length;
      return { current: Math.min(count, 10), target: 10, unit: "transações" };
    },
  },
  {
    id: "seasonal_quaresma",
    month: 2,
    name: "Jejum de Gastos",
    icon: "✝️",
    eventSummary: "A Quaresma (40 dias até a Páscoa) convida à reflexão e abstinência — inclusive nos gastos.",
    description: "Mantenha desejos ≤ 35% da renda em fevereiro.",
    baseXp: 50,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 35,
    progress: (_d, budget) => ({
      current: Math.max(0, 35 - Math.round(budget.wantsPercent)),
      target: 35,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_mes_coracao",
    month: 2,
    name: "Coração no Azul",
    icon: "💙",
    eventSummary: "Fevereiro Vermelho: campanha de saúde cardiovascular. Cuidar do coração financeiro é igual.",
    description: "Termine fevereiro com saldo positivo e ao menos 8 transações registradas.",
    baseXp: 35,
    difficulty: "fácil",
    check: (domain, budget, monthKey) =>
      budget.savingsPercent > 0 && txsInMonth(domain, monthKey).length >= 8,
    progress: (domain, budget, monthKey) => {
      const done = [
        budget.savingsPercent > 0,
        txsInMonth(domain, monthKey).length >= 8,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },

  // ────────────────────────────────────────────────────────────────
  // MARÇO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_dia_mulher",
    month: 3,
    name: "Diversidade Financeira",
    icon: "💜",
    eventSummary: "Dia Internacional da Mulher (8/mar): data de homenagens e consumo emocional. Alta de vendas de flores e presentes.",
    description: "Use 4+ categorias diferentes em março — vida financeira diversificada.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, _b, monthKey) => categoriesUsedInMonth(domain, monthKey) >= 4,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(categoriesUsedInMonth(domain, monthKey), 4),
      target: 4,
      unit: "categorias",
    }),
  },
  {
    id: "seasonal_dia_consumidor",
    month: 3,
    name: "Consumidor Inteligente",
    icon: "🛒",
    eventSummary: "Dia do Consumidor (15/mar): 'Black Friday de março'. Risco de compras impulsivas com ofertas relâmpago.",
    description: "Tenha ao menos 1 item salvo na lista de desejos e feche março com poupança positiva.",
    baseXp: 45,
    difficulty: "médio",
    check: (domain, budget) => wishlistItemCount(domain) >= 1 && budget.savingsPercent > 0,
    progress: (domain, budget) => {
      const done = [wishlistItemCount(domain) >= 1, budget.savingsPercent > 0].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },
  {
    id: "seasonal_inicio_outono",
    month: 3,
    name: "Guarda-Roupa Consciente",
    icon: "🍂",
    eventSummary: "Início do outono (20/mar): temperaturas caem, gastos com roupas e agasalhos aumentam.",
    description: "Mantenha gastos totais (needs + wants) abaixo de 80% da renda em março.",
    baseXp: 40,
    difficulty: "médio",
    check: (_d, budget) =>
      budget.totalIncome > 0 &&
      (budget.needsPercent + budget.wantsPercent) <= 80,
    progress: (_d, budget) => ({
      current: Math.max(0, 80 - Math.round(budget.needsPercent + budget.wantsPercent)),
      target: 80,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_prep_pascoa",
    month: 3,
    name: "Páscoa Planejada",
    icon: "🐣",
    eventSummary: "Os ovos de Páscoa artesanais e premium custam entre R$ 80 e R$ 400. Planejar em março economiza.",
    description: "Registre renda em março antes do dia 10 e mantenha poupança ≥ 5%.",
    baseXp: 35,
    difficulty: "fácil",
    check: (domain, budget, monthKey) =>
      hasIncomeBeforeDay(domain, monthKey, 10) && budget.savingsPercent >= 5,
    progress: (domain, budget, monthKey) => {
      const done = [
        hasIncomeBeforeDay(domain, monthKey, 10),
        budget.savingsPercent >= 5,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },

  // ────────────────────────────────────────────────────────────────
  // ABRIL
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_pascoa",
    month: 4,
    name: "Páscoa sem Dívidas",
    icon: "🐰",
    eventSummary: "A Páscoa é a segunda maior data de consumo de chocolate no mundo. Alta de preços de 20-40%.",
    description: "Celebre a Páscoa mantendo desejos ≤ 35% — presentes planejados, não parcelados.",
    baseXp: 35,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 35,
    progress: (_d, budget) => ({
      current: Math.max(0, 35 - Math.round(budget.wantsPercent)),
      target: 35,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_tiradentes",
    month: 4,
    name: "Resistência Financeira",
    icon: "⚔️",
    eventSummary: "Tiradentes (21/abr): herói da Inconfidência Mineira, símbolo de coragem e resistência às injustiças.",
    description: "Registre 12+ transações em abril com poupança positiva.",
    baseXp: 50,
    difficulty: "médio",
    check: (domain, budget, monthKey) =>
      txsInMonth(domain, monthKey).length >= 12 && budget.savingsPercent > 0,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(txsInMonth(domain, monthKey).length, 12),
      target: 12,
      unit: "transações",
    }),
  },
  {
    id: "seasonal_descobrimento",
    month: 4,
    name: "Descobridor do Orçamento",
    icon: "🗺️",
    eventSummary: "Descobrimento do Brasil (22/abr): Pedro Álvares Cabral chegou ao Brasil em 1500, abrindo novos horizontes.",
    description: "Descubra suas finanças: use 5+ categorias distintas em abril.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, _b, monthKey) => categoriesUsedInMonth(domain, monthKey) >= 5,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(categoriesUsedInMonth(domain, monthKey), 5),
      target: 5,
      unit: "categorias",
    }),
  },
  {
    id: "seasonal_mes_boleto",
    month: 4,
    name: "Mestre dos Boletos",
    icon: "📄",
    eventSummary: "Abril concentra IPTU, IPVA e matrículas. Segundo Serasa, é um dos meses de maior inadimplência do ano.",
    description: "Termine abril com saldo positivo mesmo com os boletos sazonais.",
    baseXp: 50,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent > 0,
    progress: (_d, budget) => ({
      current: budget.savingsPercent > 0 ? 1 : 0,
      target: 1,
      unit: "meta",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // MAIO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_dia_trabalho",
    month: 5,
    name: "Valorize seu Trabalho",
    icon: "⚒️",
    eventSummary: "Dia do Trabalho (1/mai): feriado nacional em homenagem aos trabalhadores. Reflexão sobre renda e valorização.",
    description: "Registre sua renda de maio antes do dia 5.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, _b, monthKey) => hasIncomeBeforeDay(domain, monthKey, 5),
    progress: (domain, _b, monthKey) => ({
      current: hasIncomeBeforeDay(domain, monthKey, 5) ? 1 : 0,
      target: 1,
      unit: "registro de renda",
    }),
  },
  {
    id: "seasonal_dia_maes",
    month: 5,
    name: "Presente com Carinho",
    icon: "🌸",
    eventSummary: "Dia das Mães (2º domingo de maio): segunda maior data do varejo. Gasto médio de R$ 298.",
    description: "Celebre o Dia das Mães mantendo desejos ≤ 35% no mês.",
    baseXp: 35,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 35,
    progress: (_d, budget) => ({
      current: Math.max(0, 35 - Math.round(budget.wantsPercent)),
      target: 35,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_combate_fumo",
    month: 5,
    name: "Hábito Saudável",
    icon: "🚭",
    eventSummary: "Dia Nacional de Combate ao Fumo (29/mai). Um fumante de 1 maço/dia gasta R$ 300-450/mês.",
    description: "Identifique hábitos a reduzir: mantenha necessidades ≤ 50% e registre 10+ transações.",
    baseXp: 45,
    difficulty: "médio",
    check: (domain, budget, monthKey) =>
      budget.needsPercent <= 50 && txsInMonth(domain, monthKey).length >= 10,
    progress: (domain, budget, monthKey) => {
      const done = [
        budget.needsPercent <= 50,
        txsInMonth(domain, monthKey).length >= 10,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },
  {
    id: "seasonal_abolicao",
    month: 5,
    name: "Liberdade Financeira",
    icon: "🕊️",
    eventSummary: "Abolição da Escravatura (13/mai): Lei Áurea de 1888. Liberdade como valor máximo — inclusive financeira.",
    description: "Conquiste liberdade: feche maio com poupança ≥ 10% da renda.",
    baseXp: 70,
    difficulty: "difícil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent >= 10,
    progress: (_d, budget) => ({
      current: Math.min(Math.round(budget.savingsPercent), 10),
      target: 10,
      unit: "%",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // JUNHO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_dia_namorados",
    month: 6,
    name: "Amor Equilibrado",
    icon: "💑",
    eventSummary: "Dia dos Namorados (12/jun): 3ª maior data do varejo brasileiro. Gasto médio R$ 240.",
    description: "Celebre o amor sem exagerar: desejos ≤ 35% em junho.",
    baseXp: 35,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 35,
    progress: (_d, budget) => ({
      current: Math.max(0, 35 - Math.round(budget.wantsPercent)),
      target: 35,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_festa_junina",
    month: 6,
    name: "Arraial Controlado",
    icon: "🎪",
    eventSummary: "Festas Juninas (junho todo): maior festa popular do Nordeste. Gastos com roupas caipiras, ingressos e comidas típicas.",
    description: "Registre todas as festas: 12+ transações em junho.",
    baseXp: 45,
    difficulty: "médio",
    check: (domain, _b, monthKey) => txsInMonth(domain, monthKey).length >= 12,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(txsInMonth(domain, monthKey).length, 12),
      target: 12,
      unit: "transações",
    }),
  },
  {
    id: "seasonal_meio_ambiente",
    month: 6,
    name: "Consumo Consciente",
    icon: "🌱",
    eventSummary: "Dia do Meio Ambiente (5/jun): consciência sobre consumo sustentável. Menos é mais.",
    description: "Mantenha necessidades ≤ 50% — só o essencial em junho.",
    baseXp: 30,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.needsPercent <= 50,
    progress: (_d, budget) => ({
      current: Math.max(0, 50 - Math.round(budget.needsPercent)),
      target: 50,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_corpus_christi",
    month: 6,
    name: "Feriado Planejado",
    icon: "⛪",
    eventSummary: "Corpus Christi (feriado móvel): cria feriado prolongado que incentiva viagens e turismo interno.",
    description: "Feche junho com saldo positivo mesmo com o feriado prolongado.",
    baseXp: 40,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent > 0,
    progress: (_d, budget) => ({
      current: budget.savingsPercent > 0 ? 1 : 0,
      target: 1,
      unit: "meta",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // JULHO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_ferias_julho",
    month: 7,
    name: "Férias Inteligentes",
    icon: "🏖️",
    eventSummary: "Férias de julho: pico de viagens em família. Inflação de hospedagem de 30-60% no período.",
    description: "Registre todas as despesas das férias: 12+ transações em julho.",
    baseXp: 65,
    difficulty: "difícil",
    check: (domain, _b, monthKey) => txsInMonth(domain, monthKey).length >= 12,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(txsInMonth(domain, monthKey).length, 12),
      target: 12,
      unit: "transações",
    }),
  },
  {
    id: "seasonal_dia_avos",
    month: 7,
    name: "Raízes Sólidas",
    icon: "👴",
    eventSummary: "Dia dos Avós (26/jul): homenagem ao papel dos avós na família. Reuniões, presentes e almoço especial.",
    description: "Tenha ao menos 1 meta de poupança salva na lista de desejos.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain) => wishlistItemCount(domain) >= 1,
    progress: (domain) => ({
      current: Math.min(wishlistItemCount(domain), 1),
      target: 1,
      unit: "meta de poupança",
    }),
  },
  {
    id: "seasonal_nossa_sra_carmo",
    month: 7,
    name: "Oferta do Coração",
    icon: "🙏",
    eventSummary: "Nossa Senhora do Carmo (16/jul): padroeira de muitas cidades brasileiras. Quermesses e festas religiosas.",
    description: "Registre um dízimo ou oferta em julho.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, _b, monthKey) => hasDizimoInMonth(domain, monthKey),
    progress: (domain, _b, monthKey) => ({
      current: hasDizimoInMonth(domain, monthKey) ? 1 : 0,
      target: 1,
      unit: "registro",
    }),
  },
  {
    id: "seasonal_inverno",
    month: 7,
    name: "Aquecimento Econômico",
    icon: "🧣",
    eventSummary: "Pico do inverno: gastos com roupas de frio, aquecedores e gás de cozinha sobem 15-25%.",
    description: "Controle o inverno: necessidades ≤ 60% mesmo com os gastos sazonais.",
    baseXp: 50,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.needsPercent <= 60,
    progress: (_d, budget) => ({
      current: Math.max(0, 60 - Math.round(budget.needsPercent)),
      target: 60,
      unit: "% margem",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // AGOSTO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_dia_pais",
    month: 8,
    name: "Presente sem Parcelas",
    icon: "👔",
    eventSummary: "Dia dos Pais (2º domingo de agosto): 4ª maior data do varejo. Gasto médio R$ 250-350.",
    description: "Comemore o Dia dos Pais mantendo desejos ≤ 35% em agosto.",
    baseXp: 35,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 35,
    progress: (_d, budget) => ({
      current: Math.max(0, 35 - Math.round(budget.wantsPercent)),
      target: 35,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_dia_estudante",
    month: 8,
    name: "Educação Financeira",
    icon: "📚",
    eventSummary: "Dia do Estudante (11/ago): homenagem à criação dos cursos jurídicos em 1827. Conhecimento é poder.",
    description: "Aplique educação financeira: registre 10+ transações com 4+ categorias diferentes.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, _b, monthKey) =>
      txsInMonth(domain, monthKey).length >= 10 && categoriesUsedInMonth(domain, monthKey) >= 4,
    progress: (domain, _b, monthKey) => {
      const done = [
        txsInMonth(domain, monthKey).length >= 10,
        categoriesUsedInMonth(domain, monthKey) >= 4,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },
  {
    id: "seasonal_volta_aulas",
    month: 8,
    name: "Volta às Aulas Planejada",
    icon: "🎒",
    eventSummary: "Volta às aulas: material escolar, uniformes e taxas do 2º semestre chegam juntos. Gasto médio R$ 300-800 por filho.",
    description: "Controle os gastos escolares: necessidades ≤ 55% em agosto.",
    baseXp: 45,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.needsPercent <= 55,
    progress: (_d, budget) => ({
      current: Math.max(0, 55 - Math.round(budget.needsPercent)),
      target: 55,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_liquidacao_inverno",
    month: 8,
    name: "Liquidação com Cabeça",
    icon: "🏷️",
    eventSummary: "Liquidações de inverno em agosto: queima de estoque com descontos de 30-70%. Risco de compra impulsiva.",
    description: "Compre só o que estava planejado: feche agosto com poupança ≥ 10%.",
    baseXp: 45,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent >= 10,
    progress: (_d, budget) => ({
      current: Math.min(Math.round(budget.savingsPercent), 10),
      target: 10,
      unit: "%",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // SETEMBRO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_independencia",
    month: 9,
    name: "Independência Financeira",
    icon: "🇧🇷",
    eventSummary: "Independência do Brasil (7/set): proclamação de D. Pedro I em 1822. Símbolo de autonomia e soberania.",
    description: "Alcance independência: poupança ≥ 15% da renda em setembro.",
    baseXp: 70,
    difficulty: "difícil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent >= 15,
    progress: (_d, budget) => ({
      current: Math.min(Math.round(budget.savingsPercent), 15),
      target: 15,
      unit: "%",
    }),
  },
  {
    id: "seasonal_prep_crianca",
    month: 9,
    name: "Reserve para as Crianças",
    icon: "🧸",
    eventSummary: "Dia das Crianças (12/out): comércio começa as promoções em setembro. Presente médio R$ 150-250 por filho.",
    description: "Planeje com antecedência: feche setembro com poupança positiva.",
    baseXp: 35,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent > 0,
    progress: (_d, budget) => ({
      current: budget.savingsPercent > 0 ? 1 : 0,
      target: 1,
      unit: "meta",
    }),
  },
  {
    id: "seasonal_primavera",
    month: 9,
    name: "Florescimento Financeiro",
    icon: "🌸",
    eventSummary: "Início da primavera (23/set): dias mais longos, colecção de verão nas lojas. Gastos com roupas sobem.",
    description: "Floresça com controle: registre 12+ transações em setembro.",
    baseXp: 40,
    difficulty: "médio",
    check: (domain, _b, monthKey) => txsInMonth(domain, monthKey).length >= 12,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(txsInMonth(domain, monthKey).length, 12),
      target: 12,
      unit: "transações",
    }),
  },
  {
    id: "seasonal_transito",
    month: 9,
    name: "Custos Fixos na Mão",
    icon: "🚗",
    eventSummary: "Semana do Trânsito (18-25/set): revisão de seguro, CNH e manutenção preventiva do veículo.",
    description: "Controle suas despesas fixas: necessidades ≤ 55% da renda.",
    baseXp: 40,
    difficulty: "médio",
    check: (_d, budget) => budget.totalIncome > 0 && budget.needsPercent <= 55,
    progress: (_d, budget) => ({
      current: Math.max(0, 55 - Math.round(budget.needsPercent)),
      target: 55,
      unit: "% margem",
    }),
  },

  // ────────────────────────────────────────────────────────────────
  // OUTUBRO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_dia_criancas",
    month: 10,
    name: "Infância com Alegria",
    icon: "🎠",
    eventSummary: "Dia das Crianças / N. Sra. Aparecida (12/out): maior data de venda de brinquedos do Brasil.",
    description: "Celebre com equilíbrio: desejos ≤ 35% em outubro.",
    baseXp: 40,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 35,
    progress: (_d, budget) => ({
      current: Math.max(0, 35 - Math.round(budget.wantsPercent)),
      target: 35,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_outubro_rosa",
    month: 10,
    name: "Saúde é Investimento",
    icon: "🎀",
    eventSummary: "Outubro Rosa: campanha de prevenção ao câncer de mama. Saúde preventiva economiza muito mais que tratamento.",
    description: "Invista em saúde: tenha saldo positivo com ao menos 8 transações registradas.",
    baseXp: 35,
    difficulty: "fácil",
    check: (domain, budget, monthKey) =>
      budget.savingsPercent > 0 && txsInMonth(domain, monthKey).length >= 8,
    progress: (domain, budget, monthKey) => {
      const done = [
        budget.savingsPercent > 0,
        txsInMonth(domain, monthKey).length >= 8,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },
  {
    id: "seasonal_halloween",
    month: 10,
    name: "Susto no Orçamento? Não!",
    icon: "🎃",
    eventSummary: "Halloween (31/out): fantasias, doces e festas crescem no Brasil. Gastos impulsivos à noite.",
    description: "Sem sustos financeiros: desejos ≤ 30% em outubro.",
    baseXp: 30,
    difficulty: "fácil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 30,
    progress: (_d, budget) => ({
      current: Math.max(0, 30 - Math.round(budget.wantsPercent)),
      target: 30,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_prep_natal",
    month: 10,
    name: "Natal Antecipado",
    icon: "🎄",
    eventSummary: "Lojas começam o Natal em outubro. Planejar agora evita endividamento em dezembro.",
    description: "Planeje o Natal: crie ao menos 1 meta na lista de desejos e feche outubro com poupança positiva.",
    baseXp: 50,
    difficulty: "médio",
    check: (domain, budget) => wishlistItemCount(domain) >= 1 && budget.savingsPercent > 0,
    progress: (domain, budget) => {
      const done = [wishlistItemCount(domain) >= 1, budget.savingsPercent > 0].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },

  // ────────────────────────────────────────────────────────────────
  // NOVEMBRO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_black_friday",
    month: 11,
    name: "Black Friday Consciente",
    icon: "🛍️",
    eventSummary: "Black Friday: movimenta R$ 5,4 bilhões. 23% dos consumidores já ultrapassaram o limite do cartão.",
    description: "Sobreviva à Black Friday: feche novembro com poupança ≥ 10%.",
    baseXp: 80,
    difficulty: "difícil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent >= 10,
    progress: (_d, budget) => ({
      current: Math.min(Math.round(budget.savingsPercent), 10),
      target: 10,
      unit: "%",
    }),
  },
  {
    id: "seasonal_finados",
    month: 11,
    name: "Legado Financeiro",
    icon: "🕯️",
    eventSummary: "Finados (2/nov): reflexão sobre legado, família e gratidão. Em caso de emergência, sua família estaria protegida?",
    description: "Construa reservas: poupança positiva com 10+ transações em novembro.",
    baseXp: 50,
    difficulty: "médio",
    check: (domain, budget, monthKey) =>
      budget.savingsPercent > 0 && txsInMonth(domain, monthKey).length >= 10,
    progress: (domain, budget, monthKey) => {
      const done = [
        budget.savingsPercent > 0,
        txsInMonth(domain, monthKey).length >= 10,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },
  {
    id: "seasonal_consciencia_negra",
    month: 11,
    name: "Consciência no Consumo",
    icon: "✊",
    eventSummary: "Dia da Consciência Negra (20/nov): homenagem a Zumbi dos Palmares. Reflexão sobre desigualdade e consumo consciente.",
    description: "Registre conscientemente: 12+ transações em novembro.",
    baseXp: 35,
    difficulty: "fácil",
    check: (domain, _b, monthKey) => txsInMonth(domain, monthKey).length >= 12,
    progress: (domain, _b, monthKey) => ({
      current: Math.min(txsInMonth(domain, monthKey).length, 12),
      target: 12,
      unit: "transações",
    }),
  },
  {
    id: "seasonal_novembro_azul",
    month: 11,
    name: "Saúde em Dia",
    icon: "💙",
    eventSummary: "Novembro Azul: saúde masculina e prevenção ao câncer. Homens negligenciam saúde, gerando custos futuros maiores.",
    description: "Cuide-se e economize: feche novembro com poupança positiva e 8+ transações.",
    baseXp: 30,
    difficulty: "fácil",
    check: (domain, budget, monthKey) =>
      budget.savingsPercent > 0 && txsInMonth(domain, monthKey).length >= 8,
    progress: (domain, budget, monthKey) => {
      const done = [
        budget.savingsPercent > 0,
        txsInMonth(domain, monthKey).length >= 8,
      ].filter(Boolean).length;
      return { current: done, target: 2, unit: "objetivos" };
    },
  },

  // ────────────────────────────────────────────────────────────────
  // DEZEMBRO
  // ────────────────────────────────────────────────────────────────
  {
    id: "seasonal_natal",
    month: 12,
    name: "Natal sem Dívidas",
    icon: "🎅",
    eventSummary: "Natal: maior data de consumo do Brasil. 13º salário chega e vai embora rápido. Maior pico de endividamento.",
    description: "Celebre o Natal com controle: desejos ≤ 45% em dezembro.",
    baseXp: 80,
    difficulty: "difícil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 45,
    progress: (_d, budget) => ({
      current: Math.max(0, 45 - Math.round(budget.wantsPercent)),
      target: 45,
      unit: "% margem",
    }),
  },
  {
    id: "seasonal_decimo_terceiro",
    month: 12,
    name: "13º Bem Aplicado",
    icon: "💵",
    eventSummary: "Décimo terceiro: 73% dos trabalhadores usam para quitar dívidas. Apenas 27% investem ou poupam.",
    description: "Seja dos 27%: feche dezembro com poupança ≥ 20% da renda.",
    baseXp: 90,
    difficulty: "difícil",
    check: (_d, budget) => budget.totalIncome > 0 && budget.savingsPercent >= 20,
    progress: (_d, budget) => ({
      current: Math.min(Math.round(budget.savingsPercent), 20),
      target: 20,
      unit: "%",
    }),
  },
  {
    id: "seasonal_ferias_verao",
    month: 12,
    name: "Verão Planejado",
    icon: "☀️",
    eventSummary: "Férias de verão: maior movimento turístico do ano. Hotéis e passagens com alta de 40-80%.",
    description: "Planeje antes de partir: registre 8+ transações antes do dia 15 de dezembro.",
    baseXp: 70,
    difficulty: "difícil",
    check: (domain, _b, monthKey) => {
      const earlyTx = txsInMonth(domain, monthKey).filter(tx => {
        const day = parseInt(tx.date.slice(8, 10), 10);
        return day <= 15;
      });
      return earlyTx.length >= 8;
    },
    progress: (domain, _b, monthKey) => {
      const count = txsInMonth(domain, monthKey).filter(tx => {
        const day = parseInt(tx.date.slice(8, 10), 10);
        return day <= 15;
      }).length;
      return { current: Math.min(count, 8), target: 8, unit: "transações até dia 15" };
    },
  },
  {
    id: "seasonal_balanco_anual",
    month: 12,
    name: "Balanço do Ano",
    icon: "📊",
    eventSummary: "Virada do ano: maior balanço do calendário. Momento de avaliar o ano e definir metas para o próximo.",
    description: "Feche o ano com excelência: 15+ transações em dezembro com poupança positiva.",
    baseXp: 60,
    difficulty: "médio",
    check: (domain, budget, monthKey) =>
      txsInMonth(domain, monthKey).length >= 15 && budget.savingsPercent > 0,
    progress: (domain, _budget, monthKey) => {
      const count = txsInMonth(domain, monthKey).length;
      return { current: Math.min(count, 15), target: 15, unit: "transações" };
    },
  },
];
