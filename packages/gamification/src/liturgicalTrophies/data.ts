import type { AppState } from "../../../domain/src/state";
import type { BudgetBreakdown } from "../../../domain/src/transactions";
import type { SeasonalTrophyProgress } from "../seasonalTrophies";
import type { LiturgicalTrophy } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txs(domain: AppState, mk: string) {
  return Object.values(domain.transactions).filter(t => t.date?.startsWith(mk));
}
function hasDizimo(domain: AppState, mk: string) {
  return txs(domain, mk).some(t => t.categoryId === "dizimo");
}
function catsUsed(domain: AppState, mk: string) {
  return new Set(
    txs(domain, mk)
      .filter(t => t.categoryId)
      .map(t => t.categoryId as string),
  ).size;
}

// ─── Check / Progress Factories ───────────────────────────────────────────────

type CK = "dizimo" | "income" | "sv10" | "sv20" | "wants30" | "tx3" | "tx5" | "tx10" | "positive" | "cats3";

function mkCheck(ck: CK) {
  return (domain: AppState, budget: BudgetBreakdown, mk: string): boolean => {
    switch (ck) {
      case "dizimo":   return hasDizimo(domain, mk);
      case "income":   return budget.totalIncome > 0 && txs(domain, mk).length >= 3;
      case "sv10":     return budget.savingsPercent >= 10 && budget.totalIncome > 0;
      case "sv20":     return budget.savingsPercent >= 20 && budget.totalIncome > 0;
      case "wants30":  return budget.wantsPercent <= 30 && budget.totalIncome > 0;
      case "tx3":      return txs(domain, mk).length >= 3;
      case "tx5":      return txs(domain, mk).length >= 5;
      case "tx10":     return txs(domain, mk).length >= 10;
      case "positive": return budget.savings > 0 && budget.totalIncome > 0;
      case "cats3":    return catsUsed(domain, mk) >= 3;
    }
  };
}

function mkProg(ck: CK) {
  return (domain: AppState, budget: BudgetBreakdown, mk: string): SeasonalTrophyProgress => {
    const n  = txs(domain, mk).length;
    const sp = budget.savingsPercent ?? 0;
    const wp = budget.wantsPercent ?? 0;
    switch (ck) {
      case "dizimo":   return { current: hasDizimo(domain, mk) ? 1 : 0, target: 1, unit: "dízimo/doação" };
      case "income":   return { current: Math.min(3, n), target: 3, unit: "lançamentos" };
      case "sv10":     return { current: Math.min(10, Math.max(0, Math.round(sp))), target: 10, unit: "% poupado" };
      case "sv20":     return { current: Math.min(20, Math.max(0, Math.round(sp))), target: 20, unit: "% poupado" };
      case "wants30":  return { current: wp <= 30 ? 30 : Math.max(0, 30 - Math.round(wp - 30)), target: 30, unit: "% desejos" };
      case "tx3":      return { current: Math.min(3, n), target: 3, unit: "lançamentos" };
      case "tx5":      return { current: Math.min(5, n), target: 5, unit: "lançamentos" };
      case "tx10":     return { current: Math.min(10, n), target: 10, unit: "lançamentos" };
      case "positive": return { current: budget.savings > 0 && budget.totalIncome > 0 ? 1 : 0, target: 1, unit: "saldo positivo" };
      case "cats3":    return { current: Math.min(3, catsUsed(domain, mk)), target: 3, unit: "categorias" };
    }
  };
}

// ─── Trophy Factory ───────────────────────────────────────────────────────────

type D = LiturgicalTrophy["difficulty"];

function lt(
  id: string, month: number, name: string,
  summary: string, desc: string,
  xp: number, icon: string, diff: D, ck: CK,
): LiturgicalTrophy {
  return { id, month, name, eventSummary: summary, description: desc, baseXp: xp, icon, difficulty: diff, check: mkCheck(ck), progress: mkProg(ck) };
}

// ─── All Liturgical Trophies ─────────────────────────────────────────────────

export const ALL_LITURGICAL_TROPHIES: LiturgicalTrophy[] = [

  // ══════════════════════════════════════════════════════════════
  // FESTAS MÓVEIS
  // ══════════════════════════════════════════════════════════════

  lt("lt_cinzas", 2, "Quarta-Feira de Cinzas",
    "Início da Quaresma, 46 dias antes da Páscoa. O padre impõe cinzas na testa com as palavras 'Lembra-te de que és pó, e ao pó retornarás.' Tempo de penitência, jejum e esmola.",
    "Inicie a Quaresma financeira: poupe ao menos 10% da renda este mês.",
    40, "⚱️", "médio", "sv10"),

  lt("lt_ramos", 4, "Domingo de Ramos",
    "Jesus entra triunfante em Jerusalém aclamado pelo povo com palmas e mantos no chão. Início da Semana Santa, uma semana antes da Páscoa.",
    "Organize sua vida financeira: registre ao menos 3 transações este mês.",
    30, "🌿", "fácil", "tx3"),

  lt("lt_quinta_santa", 4, "Quinta-Feira Santa",
    "Na Última Ceia, Jesus institui a Eucaristia e o sacerdócio, lavando os pés dos discípulos. Nascimento da missa, do ministério e do serviço.",
    "Oferenda de gratidão: registre um dízimo ou doação este mês.",
    45, "🍞", "fácil", "dizimo"),

  lt("lt_sexta_paixao", 4, "Sexta-Feira da Paixão",
    "Cristo é crucificado no Calvário. Único dia no ano sem missa. Dia de jejum e abstinência obrigatórios. A Igreja contempla o amor radical de Deus na Cruz.",
    "Jejum financeiro: mantenha gastos com desejos abaixo de 30% da renda.",
    50, "✝️", "difícil", "wants30"),

  lt("lt_pascoa", 4, "Páscoa da Ressurreição",
    "A maior festa do Cristianismo. Cristo ressuscita dos mortos ao terceiro dia, vencendo o pecado e a morte. 'Aleluia!' ecoa em todas as igrejas do mundo.",
    "Aleluia financeiro: feche o mês com saldo positivo — receitas superando despesas.",
    60, "🐣", "médio", "positive"),

  lt("lt_ascensao", 5, "Ascensão do Senhor",
    "Quarenta dias após a Páscoa, Jesus ascende aos céus diante dos apóstolos no Monte das Oliveiras, prometendo o Espírito Santo.",
    "Eleve seu nível financeiro: poupe ao menos 20% da renda.",
    55, "☁️", "difícil", "sv20"),

  lt("lt_pentecostes", 6, "Pentecostes",
    "Cinquenta dias após a Páscoa, o Espírito Santo desce sobre os apóstolos em línguas de fogo. Nasce a Igreja — o 'aniversário' da comunidade cristã.",
    "Sete dons do Espírito: use ao menos 3 categorias diferentes neste mês.",
    45, "🔥", "fácil", "cats3"),

  lt("lt_corpus_christi", 6, "Corpus Christi",
    "Solenidade do Corpo e Sangue de Cristo, 60 dias após a Páscoa. Grandes procissões com tapetes de flores. Feriado nacional no Brasil, celebrado com devoção popular.",
    "Em honra ao Corpus Christi: registre um dízimo ou oferta eucarística.",
    50, "🎊", "fácil", "dizimo"),

  lt("lt_sagrado_coracao", 6, "Sagrado Coração de Jesus",
    "Solenidade 68 dias após a Páscoa. O coração de Jesus, símbolo do amor divino, revelado a Santa Margarida Maria Alacoque no século XVII.",
    "Amor generoso: registre um dízimo ou doação como ato de amor ao próximo.",
    45, "❤️", "fácil", "dizimo"),

  lt("lt_advento", 11, "1º Domingo do Advento",
    "Quatro semanas de espera antes do Natal. O Advento é o 'Ano Novo' litúrgico — tempo de preparação, oração e conversão. As velas da Coroa de Advento acesas semana a semana.",
    "Prepare o coração e o bolso: economize ao menos 10% para não endividar no Natal.",
    40, "🕯️", "médio", "sv10"),

  // ══════════════════════════════════════════════════════════════
  // JANEIRO
  // ══════════════════════════════════════════════════════════════

  lt("lt_maria_mae_deus", 1, "Maria Mãe de Deus",
    "1º de janeiro — Solenidade de Maria. Oito dias após o Natal, a Igreja celebra Maria como Theotókos (Mãe de Deus), definido no Concílio de Éfeso (431). É o Dia Mundial da Paz.",
    "Ano Novo com bênção: comece janeiro com saldo positivo.",
    40, "👑", "médio", "positive"),

  lt("lt_epifania", 1, "Epifania do Senhor",
    "6 de janeiro — Os Três Reis Magos (Belchior, Gaspar e Baltasar) encontram o Menino Jesus em Belém, trazendo ouro, incenso e mirra. Manifestação de Cristo às nações.",
    "Como os Magos que oferendaram, registre um dízimo ou doação.",
    35, "⭐", "fácil", "dizimo"),

  lt("lt_batismo_senhor", 1, "Batismo do Senhor",
    "Encerra o tempo natalino. João Batista batiza Jesus no Rio Jordão; o Espírito Santo desce como pomba e o Pai proclama: 'Este é o meu Filho amado.' Início da vida pública de Jesus.",
    "Novo começo: registre ao menos 3 transações neste mês.",
    30, "🕊️", "fácil", "tx3"),

  lt("lt_antonio_abade", 1, "Santo Antônio Abade",
    "17 de janeiro — Monge egípcio do séc. III, pai do monaquismo cristão. Viveu 105 anos no deserto lutando contra tentações. Patrono dos animais domésticos, dos monges e dos açougueiros.",
    "Vida simples no deserto: mantenha gastos com desejos abaixo de 30%.",
    35, "🐷", "fácil", "wants30"),

  lt("lt_sebastiao", 1, "São Sebastião",
    "20 de janeiro — Soldado romano martirizado por flechas (c. 288 AD), padroeiro do Rio de Janeiro, de soldados e atletas. Sobreviveu ao ataque de flechas e foi decapitado por Diocleciano.",
    "Resiliência financeira: registre ao menos 5 transações este mês.",
    35, "🏹", "fácil", "tx5"),

  lt("lt_ines", 1, "Santa Inês",
    "21 de janeiro — Mártir romana de 12 anos que recusou casar com o filho do prefeito e foi martirizada (c. 304). Símbolo de pureza e coragem da fé em face do poder.",
    "Pureza financeira: mantenha gastos com desejos abaixo de 30%.",
    40, "🐑", "difícil", "wants30"),

  lt("lt_francisco_sales", 1, "São Francisco de Sales",
    "24 de janeiro — Bispo de Genebra e Doutor da Igreja, patrono dos jornalistas e escritores. Autor da 'Introdução à Vida Devota'. Conhecido pela mansidão e paciência pastoral.",
    "Com mansidão e organização: use ao menos 3 categorias diferentes.",
    30, "✍️", "fácil", "cats3"),

  lt("lt_conv_paulo", 1, "Conversão de São Paulo",
    "25 de janeiro — Paulo de Tarso, perseguidor de cristãos, é derrubado do cavalo por uma luz no caminho de Damasco. Sua conversão radical o torna o maior missionário do Cristianismo.",
    "Conversão financeira: feche o mês com saldo positivo.",
    40, "⚡", "médio", "positive"),

  lt("lt_tomas_aquino", 1, "São Tomás de Aquino",
    "28 de janeiro — Doutor Angélico, dominicano do século XIII, maior teólogo e filósofo do Ocidente cristão. Sua 'Suma Teológica' ainda é referência universal. Patrono das universidades.",
    "Sabedoria financeira: use ao menos 3 categorias diferentes neste mês.",
    35, "📚", "fácil", "cats3"),

  lt("lt_joao_bosco", 1, "São João Bosco",
    "31 de janeiro — Padre salesiano italiano (1815–1888), fundador dos Salesianos. Dedicou a vida à educação cristã de jovens pobres e abandonados em Turim. Patrono dos jovens e dos educadores.",
    "Investimento no futuro: registre ao menos 5 transações neste mês.",
    35, "🎓", "fácil", "tx5"),

  // ══════════════════════════════════════════════════════════════
  // FEVEREIRO — DEZEMBRO (remaining trophies use lt() factory)
  // ══════════════════════════════════════════════════════════════

  lt("lt_apresentacao", 2, "Apresentação do Senhor", "2 de fevereiro — Maria e José levam o Menino Jesus ao Templo de Jerusalém para a purificação ritual. Simeão reconhece o Salvador. Festa da Candelária, com procissão de velas.", "Oferenda ao Senhor: registre um dízimo ou doação.", 35, "🕯️", "fácil", "dizimo"),
  lt("lt_bras", 2, "São Brás", "3 de fevereiro — Bispo mártir da Capadócia (séc. IV), padroeiro da garganta. Bênção das gargantas com velas cruzadas. Segundo a tradição, salvou um menino engasgado com uma espinha.", "Saúde financeira: registre ao menos 3 transações este mês.", 30, "🕯️", "fácil", "tx3"),
  lt("lt_agueda", 2, "Santa Águeda", "5 de fevereiro — Virgem mártir siciliana do séc. III, martirizada por rejeitar o amor do governador Quinciano. Torturada e mutilada, permaneceu firme na fé. Padroeira das enfermeiras e das mulheres com câncer.", "Firmeza na fé: feche o mês com saldo positivo.", 35, "🌺", "médio", "positive"),
  lt("lt_lourdes", 2, "Nossa Senhora de Lourdes", "11 de fevereiro — Em 1858, Maria aparece 18 vezes a Bernadette Soubirous em Lourdes, França. A fonte que brota ali já curou centenas de doentes reconhecidos pela Igreja.", "Cura financeira: feche o mês com saldo positivo.", 40, "💧", "médio", "positive"),
  lt("lt_valentim", 2, "São Valentim", "14 de fevereiro — Sacerdote romano do século III, martirizado pelo Imperador Cláudio II. Tornou-se símbolo do amor cristão e padroeiro dos namorados em toda a cristandade.", "Amor ao próximo: registre um dízimo ou doação neste dia de amor.", 30, "💝", "fácil", "dizimo"),
  lt("lt_cathedra_pedro", 2, "Cátedra de São Pedro", "22 de fevereiro — Celebra o episcopado de Pedro em Roma, fundamento visível da unidade da Igreja. A cátedra (cadeira) representa a autoridade de ensinar. Celebrada desde o séc. IV.", "Fundação sólida: poupe ao menos 10% da renda.", 40, "🪑", "médio", "sv10"),

  lt("lt_perpetua_felicidade", 3, "Santas Perpétua e Felicidade", "7 de março — Mártires de Cartago (203 AD). Perpétua era nobre e Felicidade, sua escrava grávida. Ambas foram jogadas às feras no anfiteatro por se recusarem a apostatar.", "Coragem quaresmal: mantenha gastos com desejos abaixo de 30%.", 45, "🦁", "difícil", "wants30"),
  lt("lt_patricio", 3, "São Patrício", "17 de março — Missionário britano-romano que evangelizou a Irlanda no séc. V, usando o trevo para explicar a Trindade. Padroeiro da Irlanda, celebrado mundialmente.", "Missão diversificada: use ao menos 3 categorias de despesas.", 30, "🍀", "fácil", "cats3"),
  lt("lt_jose_esposo", 3, "São José Esposo de Maria", "19 de março — Esposo de Maria e pai adotivo de Jesus, artesão e justo. Patrono da Igreja Universal, da família, dos trabalhadores e dos moribundos. Declarado por Pio IX.", "Trabalho e família: registre renda e ao menos 3 transações.", 40, "🔨", "fácil", "income"),
  lt("lt_anunciacao", 3, "Anunciação do Senhor", "25 de março — O Anjo Gabriel anuncia a Maria que ela conceberia o Filho de Deus. O 'Fiat' de Maria muda a história da humanidade. Exatos nove meses antes do Natal.", "Sim ao futuro: poupe ao menos 10% da renda.", 40, "👼", "médio", "sv10"),

  lt("lt_isidoro_sevilha", 4, "São Isidoro de Sevilha", "4 de abril — Arcebispo do séc. VII, compilou o maior projeto enciclopédico da Idade Média nas 'Etymologiae'. Patrono dos estudantes, programadores e da internet.", "Organização enciclopédica: use ao menos 3 categorias diferentes.", 30, "📖", "fácil", "cats3"),
  lt("lt_joao_lasalle", 4, "São João de La Salle", "7 de abril — Padre francês que fundou os Irmãos das Escolas Cristãs (1680), pioneiro na educação popular gratuita e na formação de professores leigos. Patrono dos educadores.", "Educação financeira: registre ao menos 5 transações este mês.", 35, "🏫", "fácil", "tx5"),
  lt("lt_carlo_acutis", 4, "Carlo Acutis — Santo da Internet", "12 de abril — Carlos Acutis (1991–2006), jovem italiano beatificado em 2020 e canonizado em 2025. Programador apaixonado, catalogou milagres eucarísticos online. Patrono da internet.", "Como Carlo Acutis, organize sua vida digital e financeira: registre em ao menos 3 categorias.", 40, "💻", "fácil", "cats3"),
  lt("lt_jorge", 4, "São Jorge", "23 de abril — Soldado cristão do séc. III, martirizado por Diocleciano. O dragão representa o paganismo vencido pela fé. Padroeiro da Inglaterra, Portugal, Rio de Janeiro e guerreiros.", "Coragem contra o dragão das dívidas: feche o mês com saldo positivo.", 40, "🐉", "médio", "positive"),
  lt("lt_marcos", 4, "São Marcos Evangelista", "25 de abril — Autor do segundo Evangelho, o mais antigo e dinâmico, que apresenta Jesus em ação constante. Fundador da Igreja de Alexandria e mártir no Egito. Símbolo: o leão alado.", "Ação constante: registre ao menos 3 transações este mês.", 30, "🦁", "fácil", "tx3"),
  lt("lt_catarina_sena", 4, "Santa Catarina de Sena", "29 de abril — Terciária dominicana, Doutora da Igreja, mediou a volta do Papa de Avignon a Roma. Mística com estigmas, autora das 'Cartas' e do 'Diálogo'. Padroeira da Itália.", "Doutora da prudência: poupe ao menos 10% da renda.", 40, "🌸", "médio", "sv10"),

  lt("lt_jose_operario", 5, "São José Operário", "1º de maio — Em 1955, Pio XII institui a festa de São José Operário no Dia do Trabalho para santificar o trabalho humano. São José, artesão em Nazaré, padroeiro dos trabalhadores.", "Dignidade do trabalho: registre sua renda e ao menos 3 transações.", 40, "⚒️", "fácil", "income"),
  lt("lt_fatima", 5, "Nossa Senhora de Fátima", "13 de maio — Em 1917, Maria aparece a três pastorinhos em Fátima, Portugal. Pede oração, penitência e consagração. Um dos maiores eventos marianos do século XX.", "Três segredos de Fátima: registre uma doação ou dízimo.", 40, "🌸", "fácil", "dizimo"),
  lt("lt_matias", 5, "São Matias", "14 de maio — Escolhido por sorteio para substituir Judas Iscariotes, tornando o colégio apostólico completo novamente. Símbolo da providência divina nas escolhas da vida.", "Escolha providencial: registre ao menos 5 transações este mês.", 35, "🎲", "fácil", "tx5"),
  lt("lt_isidoro_lavrador", 5, "São Isidoro Lavrador", "15 de maio — Camponês madrilenho do séc. XII, servo que ora e trabalha. Sua fé gerou milagres no campo. Padroeiro dos agricultores e da cidade de Madrid.", "Frutos do trabalho: feche o mês com saldo positivo.", 35, "🌾", "médio", "positive"),
  lt("lt_rita_cassia", 5, "Santa Rita de Cássia", "22 de maio — A 'Santa dos Impossíveis'. Casada à força, viúva, religiosa agostiniana com estigma na testa. Italiana do séc. XV, padroeira das causas impossíveis e das mulheres sofridas.", "Impossível não é problema: poupe ao menos 20% da renda.", 55, "🌹", "difícil", "sv20"),
  lt("lt_visitacao", 5, "Visitação de Maria", "31 de maio — Maria visita sua prima Isabel, grávida de João Batista. O Magnificat transborda: 'Minha alma engrandece ao Senhor.' Ato de caridade e anúncio do Reino de Deus.", "Visita de bênção: diversifique — use ao menos 3 categorias de gastos.", 30, "🤝", "fácil", "cats3"),

  lt("lt_barnabe", 6, "São Barnabé", "11 de junho — Levita cipriota, um dos primeiros cristãos e companheiro de missão de São Paulo. Seu nome significa 'Filho da consolação'. Modelo de encorajamento e generosidade.", "Filho da consolação: registre ao menos 3 transações.", 30, "🫶", "fácil", "tx3"),
  lt("lt_antonio", 6, "Santo Antônio de Lisboa e Pádua", "13 de junho — Franciscano português (1195), Doutor da Igreja. Pregador dos pobres, patrono dos pobres, das causas perdidas e dos namorados. Feriado municipal em São Paulo.", "Amigo dos pobres: registre um dízimo ou doação.", 40, "🍞", "fácil", "dizimo"),
  lt("lt_luis_gonzaga", 6, "São Luís Gonzaga", "21 de junho — Nobre italiano que renunciou ao título para ser jesuíta, morto cuidando de doentes da peste (1591). Patrono da juventude católica. Seu desprendimento dos bens é lendário.", "Juventude e desprendimento: poupe ao menos 10% da renda.", 40, "🌿", "médio", "sv10"),
  lt("lt_fisher_tomas_moro", 6, "São João Fisher e São Tomás Moro", "22 de junho — Mártires ingleses executados por Henrique VIII (1535) por não aprovarem o divórcio real e o cisma com Roma. Fisher era bispo; Moro, chanceler do reino. 'Servo do rei, mas primeiro de Deus.'", "Integridade acima de tudo: feche o mês com saldo positivo.", 45, "⚖️", "médio", "positive"),
  lt("lt_joao_batista", 6, "Natividade de João Batista", "24 de junho — Único santo (além de Maria) cuja data de nascimento é celebrada liturgicamente. Precursor de Cristo, 'voz que clama no deserto'. Feriado em várias cidades brasileiras.", "Precursor da ordem: feche o mês com saldo positivo.", 40, "📣", "médio", "positive"),
  lt("lt_ireneu", 6, "São Ireneu de Lyon", "28 de junho — Bispo grego do séc. II, primeiro grande teólogo sistemático cristão. Combateu o gnosticismo com seu 'Adversus Haereses'. Patrono da unidade e da ortodoxia.", "Unidade nas finanças: use ao menos 3 categorias diferentes.", 35, "🕊️", "fácil", "cats3"),

  lt("lt_tome", 7, "São Tomé Apóstolo", "3 de julho — O apóstolo da dúvida que se tornou o mais corajoso, indo até a Índia. Ao ver as chagas de Cristo ressuscitado, proclamou: 'Meu Senhor e meu Deus!' Mártir na Índia.", "Fé nas suas finanças: registre ao menos 5 transações.", 35, "🙏", "fácil", "tx5"),
  lt("lt_bento", 7, "São Bento de Núrsia", "11 de julho — Pai do monaquismo ocidental, fundador da Ordem Beneditina (séc. VI). Sua Regra ('Ora et Labora') equilibra oração e trabalho. Padroeiro da Europa.", "Ora et Labora: registre sua renda e ao menos 3 transações.", 40, "🏛️", "fácil", "income"),
  lt("lt_carmo", 7, "Nossa Senhora do Carmo", "16 de julho — A Virgem do Carmo apareceu a São Simão Stock (1251) entregando o Escapulário como sinal de proteção. Ordem Carmelita fundada no Monte Carmelo, Israel.", "Proteção do escapulário: poupe ao menos 10% da renda.", 40, "🤎", "médio", "sv10"),
  lt("lt_magdalena", 7, "Santa Maria Madalena", "22 de julho — A primeira testemunha da Ressurreição, 'Apóstola dos Apóstolos'. Seguidora de Cristo, presente na Crucificação e no túmulo vazio. João Paulo II elevou sua festa a solenidade.", "Testemunha da vida nova: feche o mês com saldo positivo.", 40, "🌷", "médio", "positive"),
  lt("lt_brigida", 7, "Santa Brígida da Suécia", "23 de julho — Mística sueca (1303–1373), mãe de oito filhos, fundou a Ordem do Santíssimo Salvador. Suas 'Revelações' influenciaram a Igreja. Co-padroeira da Europa.", "Equilíbrio entre família e fé: registre ao menos 5 transações.", 35, "🌺", "fácil", "tx5"),
  lt("lt_charbel", 7, "São Charbel Makhlouf", "24 de julho — Monge maronita libanês (1828–1898), eremita de total desprendimento. Canonizado em 1977, seu corpo permaneceu incorrupto. Patrono do Líbano e dos eremitas.", "Desprendimento total: mantenha gastos com desejos abaixo de 30%.", 45, "🏔️", "difícil", "wants30"),
  lt("lt_tiago", 7, "São Tiago Maior", "25 de julho — Irmão de João, um dos primeiros apóstolos chamados. Primeiro apóstolo mártir (c. 44 AD). Seu túmulo em Compostela originou o Caminho de Santiago, a rota mais famosa do mundo.", "Caminho de Santiago: registre ao menos 10 transações neste mês.", 50, "⚜️", "difícil", "tx10"),
  lt("lt_marta", 7, "Santa Marta", "29 de julho — Irmã de Lázaro e Maria de Betânia, anfitriã de Jesus em sua casa. Ao reclamar da irmã contemplativa, Jesus responde: 'Marta, tu te preocupas com muitas coisas; mas uma só é necessária.' Padroeira das donas de casa e cozinheiras.", "Trabalho e descanso: registre ao menos 3 transações.", 30, "🍽️", "fácil", "tx3"),
  lt("lt_inacio_loyola", 7, "São Inácio de Loyola", "31 de julho — Militar basco convertido na convalescença de um ferimento. Fundou a Companhia de Jesus (Jesuítas) em 1540. Seus 'Exercícios Espirituais' são usados em todo o mundo.", "Estratégia jesuítica: poupe ao menos 20% da renda.", 55, "⚔️", "difícil", "sv20"),

  lt("lt_joao_vianney", 8, "São João Maria Vianney", "4 de agosto — O Cura d'Ars, sacerdote francês do séc. XIX que passava 18 h/dia confessando. Patrono dos sacerdotes. Sua pobreza radical e santidade atraíam multidões do mundo todo.", "Generosidade radical: registre um dízimo ou doação.", 40, "⛪", "fácil", "dizimo"),
  lt("lt_transfiguracao", 8, "Transfiguração do Senhor", "6 de agosto — Jesus sobe ao Monte Tabor com Pedro, Tiago e João. Seu rosto brilha como o sol, suas vestes ficam brancas como a neve. Moisés e Elias aparecem com Ele.", "Transformação financeira: feche o mês com saldo positivo.", 45, "✨", "médio", "positive"),
  lt("lt_domingos", 8, "São Domingos de Gusmão", "8 de agosto — Sacerdote espanhol que fundou a Ordem dos Pregadores (Dominicanos) em 1216. Pregava contra a heresia cátara pela força da palavra e da pobreza voluntária.", "Pregação diversificada: use ao menos 3 categorias diferentes.", 35, "📣", "fácil", "cats3"),
  lt("lt_lourenco", 8, "São Lourenço", "10 de agosto — Diácono romano mártir (258 AD). Quando o prefeito exigiu os tesouros da Igreja, Lourenço trouxe os pobres: 'Estes são os tesouros da Igreja.' Grelhou na fogueira.", "Os pobres são o tesouro: registre um dízimo ou doação.", 45, "🔥", "fácil", "dizimo"),
  lt("lt_clara", 8, "Santa Clara de Assis", "11 de agosto — Fundadora das Clarissas (1212), seguiu Francisco na pobreza radical. Viveu em clausura 42 anos. Patrona da televisão (visão remota milagrosa da missa).", "Pobreza voluntária: mantenha gastos com desejos abaixo de 30%.", 45, "💫", "difícil", "wants30"),
  lt("lt_kolbe", 8, "São Maximiliano Kolbe", "14 de agosto — Franciscano polonês que se ofereceu para morrer no lugar de um pai de família em Auschwitz (1941). Mártir da caridade perfeita, canonizado por João Paulo II em 1982.", "Em sua honra, pratique a doação sacrificial: registre um dízimo ou doação generosa.", 45, "✝️", "fácil", "dizimo"),
  lt("lt_assuncao", 8, "Assunção de Nossa Senhora", "15 de agosto — Dogma definido por Pio XII em 1950: ao fim de sua vida terrena, Maria foi elevada ao céu em corpo e alma. Feriado nacional em muitos países católicos. A maior festa mariana.", "Elevação financeira: poupe ao menos 20% da renda.", 55, "👸", "difícil", "sv20"),
  lt("lt_bernardo", 8, "São Bernardo de Claraval", "20 de agosto — Monge cisterciense do séc. XII, 'Doutor Melífluo'. Reformou o monaquismo, pregou a 2ª Cruzada e influenciou papas e reis com sua sabedoria espiritual.", "Mel da sabedoria: feche o mês com saldo positivo.", 40, "🍯", "médio", "positive"),
  lt("lt_maria_rainha", 8, "Maria Rainha", "22 de agosto — Oitavário da Assunção. A Igreja celebra Maria como Rainha do Céu e da Terra, coroada pelo Filho. Instituída por Pio XII em 1954 no jubileu do dogma da Imaculada.", "Reinado de ordem: feche o mês com saldo positivo.", 40, "👑", "médio", "positive"),
  lt("lt_bartolomeu", 8, "São Bartolomeu Apóstolo", "24 de agosto — Também chamado Natanael, discípulo que Jesus viu 'sem dolo' embaixo da figueira. Segundo a tradição, evangelizou a Armênia e foi esfolado vivo como mártir.", "Discípulo fiel: registre ao menos 5 transações.", 35, "📜", "fácil", "tx5"),
  lt("lt_monica", 8, "Santa Mônica", "27 de agosto — Mãe de Santo Agostinho, rezou por décadas pela conversão do filho dissoluto. Seus anos de lágrimas resultaram no maior filósofo cristão. Padroeira das mães.", "Perseverança da poupança: poupe ao menos 10% da renda.", 40, "💧", "médio", "sv10"),
  lt("lt_agostinho", 8, "Santo Agostinho", "28 de agosto — Bispo de Hipona, Doutor da Igreja (354–430). 'Nosso coração está inquieto até repousar em Ti.' Seu 'Confissões' inaugurou a autobiografia ocidental.", "Coração inquieto: use ao menos 3 categorias diferentes.", 40, "💡", "fácil", "cats3"),
  lt("lt_joao_batista_mart", 8, "Martírio de João Batista", "29 de agosto — Herodes manda decapitar o Batista a pedido da dançarina Salomé. João pagou com a vida por denunciar o adultério do rei. Coragem profética diante do poder.", "Coragem profética: mantenha gastos com desejos abaixo de 30%.", 45, "⚔️", "difícil", "wants30"),

  lt("lt_gregorio_magno", 9, "São Gregório Magno", "3 de setembro — Papa e Doutor da Igreja (590–604), organizou o canto gregoriano, reformou a liturgia e enviou missionários à Inglaterra. Assinou-se: 'Servo dos servos de Deus'.", "Ordem e harmonia: use ao menos 3 categorias diferentes.", 40, "🎵", "fácil", "cats3"),
  lt("lt_natividade_maria", 9, "Natividade de Nossa Senhora", "8 de setembro — Celebra o nascimento de Maria de Nazaré, filha de Joaquim e Ana. A Igreja dedica o dia à 'aurora que anuncia o sol'. Nossa Senhora da Natividade.", "Aurora de bênçãos: feche o mês com saldo positivo.", 40, "🌅", "médio", "positive"),
  lt("lt_pedro_claver", 9, "São Pedro Claver", "9 de setembro — Jesuíta espanhol que se autoproclamou 'escravo dos escravos africanos' em Cartagena, Colômbia. Batizou e cuidou de mais de 300 mil africanos escravizados.", "Escravo do próximo: registre um dízimo ou doação.", 45, "⛓️", "fácil", "dizimo"),
  lt("lt_exaltacao_cruz", 9, "Exaltação da Santa Cruz", "14 de setembro — Celebra a recuperação da Santa Cruz por Heráclito em 628 AD, roubada pelos persas. A Cruz é exaltada como trono de glória e instrumento de salvação.", "Glória na cruz: poupe ao menos 10% da renda.", 40, "✝️", "médio", "sv10"),
  lt("lt_dores_maria", 9, "Nossa Senhora das Dores", "15 de setembro — No dia seguinte à Exaltação da Cruz, a Igreja medita nas sete dores de Maria: a profecia de Simeão, a fuga para o Egito, a perda de Jesus no Templo, o encontro no Calvário, a Crucificação, a descida da Cruz e o sepultamento.", "Perseverança nas dores: registre ao menos 5 transações.", 40, "💜", "médio", "tx5"),
  lt("lt_mateus", 9, "São Mateus Apóstolo", "21 de setembro — Cobrador de impostos convertido por Jesus com um simples 'Segue-me.' Autor do primeiro Evangelho. Patrono dos contabilistas, banqueiros e administradores.", "Patrono dos contadores: registre ao menos 10 transações.", 50, "💰", "difícil", "tx10"),
  lt("lt_pio_pietrelcina", 9, "São Pio de Pietrelcina", "23 de setembro — Padre capuchinho italiano (1887–1968), com estigmas visíveis por 50 anos. Passava horas no confessionário. Canonizado por João Paulo II em 2002.", "Estigmas da disciplina: mantenha gastos com desejos abaixo de 30%.", 45, "🩸", "difícil", "wants30"),
  lt("lt_cosme_damiao", 9, "Santos Cosme e Damião", "26 de setembro — Médicos gêmeos mártires da Síria (séc. IV), que curavam gratuitamente. No Brasil, sua festa inclui distribuição de doces às crianças. Padroeiros dos médicos.", "Cura gratuita: registre ao menos 3 transações.", 30, "⚕️", "fácil", "tx3"),
  lt("lt_vicente_paulo", 9, "São Vicente de Paulo", "27 de setembro — Sacerdote francês do séc. XVII, fundou os Vicentinos e as Filhas da Caridade. Organizou a caridade cristã sistematicamente. 'Deixai tudo para servir o pobre'.", "Caridade organizada: registre um dízimo ou doação.", 40, "🤲", "fácil", "dizimo"),
  lt("lt_arcanjos", 9, "Santos Arcanjos Miguel, Gabriel e Rafael", "29 de setembro — Miguel (guerreiro de Deus), Gabriel (mensageiro de Deus) e Rafael (medicina de Deus). Os três arcanjos nomeados na Bíblia são celebrados juntos neste dia.", "Tríade angelical: use ao menos 3 categorias diferentes.", 35, "👼", "fácil", "cats3"),
  lt("lt_jeronimo", 9, "São Jerônimo", "30 de setembro — Doutor da Igreja, traduziu toda a Bíblia para o latim (Vulgata, séc. IV–V). Seu temperamento ríspido e seu ascetismo são lendários. Patrono dos tradutores e biblistas.", "Tradução fiel dos gastos: use ao menos 3 categorias diferentes.", 35, "📜", "fácil", "cats3"),

  lt("lt_teresinha", 10, "Santa Teresinha do Menino Jesus", "1º de outubro — Teresa Martin (1873–1897), carmelita francesa que morreu aos 24 anos. Sua 'Pequena Via' ensina a santidade nas coisas simples e cotidianas. Doutora da Igreja.", "Pequena via: poupe ao menos 10% da renda.", 40, "🌸", "médio", "sv10"),
  lt("lt_anjos_guarda", 10, "Santos Anjos da Guarda", "2 de outubro — A Igreja celebra os anjos guardiões, protetores de cada pessoa. 'Pondes vossos anjos para guardar todos os vossos caminhos' (Sl 91). Festa especialmente das crianças.", "Proteção angelical: registre ao menos 3 transações.", 30, "😇", "fácil", "tx3"),
  lt("lt_francisco_assis", 10, "São Francisco de Assis", "4 de outubro — Fundador dos Franciscanos (1209), o 'Poverello' que amou a pobreza. Autor do Cântico das Criaturas, o primeiro poema em italiano. Patrono dos animais e do meio-ambiente.", "Poverello: mantenha gastos com desejos abaixo de 30%.", 50, "🌿", "difícil", "wants30"),
  lt("lt_rosario", 10, "Nossa Senhora do Rosário", "7 de outubro — Nossa Senhora entregou o Rosário a São Domingos. A vitória cristã em Lepanto (1571) foi atribuída ao Rosário. Outubro inteiro é dedicado ao Rosário.", "Rosário de bênçãos: registre ao menos 5 transações.", 35, "📿", "fácil", "tx5"),
  lt("lt_aparecida", 10, "Nossa Senhora Aparecida", "12 de outubro — Padroeira do Brasil — feriado nacional. Em 1717, pescadores encontraram a imagem de Maria nas águas do Rio Paraíba. Desde 1929 é venerada no Santuário de Aparecida, SP.", "Em honra à Padroeira do Brasil: registre um dízimo ou doação e mantenha as finanças ordenadas.", 45, "🙏", "fácil", "dizimo"),
  lt("lt_teresa_avila", 10, "Santa Teresa de Ávila", "15 de outubro — Carmelita descalça espanhola do séc. XVI, Doutora da Igreja. Reformou o Carmelo com São João da Cruz. Autora do 'Castelo Interior'. 'Nada te turbe, nada te espante.'", "Castelo interior: poupe ao menos 20% da renda.", 55, "🏰", "difícil", "sv20"),
  lt("lt_lucas", 10, "São Lucas Evangelista", "18 de outubro — Médico sírio, autor do terceiro Evangelho e dos Atos dos Apóstolos. Companheiro de Paulo. O Evangelho mais belo literariamente, com o Magnificat e parábolas únicas.", "Arte e ciência: use ao menos 3 categorias diferentes.", 35, "🎨", "fácil", "cats3"),
  lt("lt_joao_paulo_ii", 10, "São João Paulo II", "22 de outubro — Karol Wojtyla (1920–2005), o Papa polonês que derrubou o comunismo com a fé. 'Não tenhais medo!' Viajou a 129 países e canonizou mais santos que qualquer outro Papa.", "Não tenhais medo: feche o mês com saldo positivo.", 45, "☮️", "médio", "positive"),
  lt("lt_simao_judas", 10, "São Simão e São Judas Tadeu", "28 de outubro — Dois apóstolos celebrados juntos. Judas Tadeu é o patrono das causas desesperadas. Simão, o Zelota, uniu fé e ardor. Tradição: evangelizaram a Pérsia juntos.", "Causas difíceis: registre ao menos 5 transações.", 35, "⭐", "fácil", "tx5"),

  lt("lt_todos_santos", 11, "Todos os Santos", "1º de novembro — Feriado que celebra todos os santos canonizados e os inúmeros anônimos que estão no Céu. 'Uma multidão que ninguém pode contar' (Ap 7,9). Feriado nacional.", "Multidão de virtudes: use ao menos 3 categorias de gastos.", 40, "🌟", "fácil", "cats3"),
  lt("lt_fieis_defuntos", 11, "Fiéis Defuntos", "2 de novembro — Dia de Finados, feriado nacional. A Igreja ora pelos que partiram e estão no purgatório. A visita aos cemitérios e a reza pelo repouso dos mortos é tradição cristã milenar.", "Memória viva: feche o mês com saldo positivo.", 35, "🕯️", "médio", "positive"),
  lt("lt_martinho_porres", 11, "São Martinho de Porres", "3 de novembro — Mestiço peruano (1579–1639), dominicano leigo. Cuidava de pobres, doentes e animais com amor igual. Primeiro negro americano canonizado (1962). 'Martinho dos pobres'.", "Caridade sem fronteiras: registre um dízimo ou doação.", 40, "🤝", "fácil", "dizimo"),
  lt("lt_carlos_borromeu", 11, "São Carlos Borromeu", "4 de novembro — Cardeal-arcebispo de Milão no séc. XVI, liderou a Reforma Católica pós-Trento. Vendeu seus bens para alimentar 3 mil pobres durante a fome. Patrono dos seminaristas.", "Reforma pessoal: registre ao menos 5 transações.", 40, "⚖️", "fácil", "tx5"),
  lt("lt_basilica_laterao", 11, "Dedicação da Basílica de Latrão", "9 de novembro — Aniversário da consagração da Basílica do Latrão (324 AD), catedral do Papa e 'mãe de todas as igrejas'. Símbolo da unidade da Igreja Universal.", "Fundação da casa: poupe ao menos 10% da renda.", 40, "🏛️", "médio", "sv10"),
  lt("lt_martinho_tours", 11, "São Martinho de Tours", "11 de novembro — Soldado romano do séc. IV que cortou sua capa ao meio para dar a um mendigo. Na noite seguinte sonhou com Cristo usando a metade que dera. Fundou o monaquismo na Gália.", "Metade da capa: registre um dízimo ou doação.", 40, "🧥", "fácil", "dizimo"),
  lt("lt_isabel_hungria", 11, "Santa Isabel da Hungria", "17 de novembro — Princesa húngara do séc. XIII que distribuiu seus bens aos pobres, ao ponto de ser expulsa do castelo. Fundou hospitais. Patrona das obras sociais e da caridade.", "Caridade real: poupe ao menos 20% da renda.", 55, "🌹", "difícil", "sv20"),
  lt("lt_apresentacao_maria", 11, "Apresentação de Maria", "21 de novembro — Tradição que celebra a apresentação de Maria ao Templo de Jerusalém na infância, por seus pais Joaquim e Ana. Origem da vida consagrada mariana.", "Oferenda ao Templo: registre um dízimo ou doação.", 35, "🏛️", "fácil", "dizimo"),
  lt("lt_cecilia", 11, "Santa Cecília", "22 de novembro — Mártir romana do séc. III, cantava a Deus no coração enquanto era martirizada. Patrona dos músicos e da música sacra. Sua festa inspira corais e orquestras.", "Sinfonia das finanças: feche o mês com saldo positivo.", 35, "🎵", "médio", "positive"),
  lt("lt_nsa_gracas", 11, "Nossa Senhora das Graças", "27 de novembro — Em 1830, Maria apareceu à irmã Catarina Labouré em Paris, pedindo a cunhagem da 'Medalha Milagrosa'. A medalha se espalhou pelo mundo inteiro em poucos anos.", "Graça da poupança: poupe ao menos 10% da renda.", 40, "🏅", "médio", "sv10"),
  lt("lt_andre", 11, "São André Apóstolo", "30 de novembro — Irmão de Pedro, primeiro apóstolo chamado por Jesus. Evangelizou a Grécia e a Rússia (por isso é padroeiro de ambas e da Escócia). Crucificado em forma de X.", "Primeiro discípulo: registre sua renda e ao menos 3 transações.", 35, "⚓", "fácil", "income"),

  lt("lt_francisco_xavier", 12, "São Francisco Xavier", "3 de dezembro — Jesuíta navarro, companheiro de Inácio de Loyola. Evangelizou a Índia, o Japão e a Ásia em 10 anos, batizando mais de 700 mil pessoas. Patrono das missões católicas.", "Missão global: use ao menos 3 categorias diferentes.", 40, "🌍", "fácil", "cats3"),
  lt("lt_nicolau", 12, "São Nicolau de Mira", "6 de dezembro — Bispo do séc. IV famoso por dar sacos de ouro secretamente para dotar moças pobres. Origem do Papai Noel. Patrono das crianças, dos navegantes e dos solteiros.", "Dádiva secreta: registre um dízimo ou doação.", 40, "🎁", "fácil", "dizimo"),
  lt("lt_ambrosio", 12, "Santo Ambrósio de Milão", "7 de dezembro — Governador civil eleito bispo por aclamação popular (374). Doutor da Igreja, enfrentou imperadores pela fé, criou o canto ambrosiano. Mestre de Santo Agostinho.", "Governança cristã: feche o mês com saldo positivo.", 40, "🏛️", "médio", "positive"),
  lt("lt_imaculada", 12, "Imaculada Conceição", "8 de dezembro — Dogma proclamado pelo Papa Pio IX em 1854: Maria foi preservada do pecado original desde a concepção. Feriado nacional que abre o tempo do Advento no Brasil.", "Comece o Advento sem dívidas: feche o mês com saldo positivo e resista ao consumismo natalino.", 45, "✨", "médio", "positive"),
  lt("lt_luzia", 12, "Santa Luzia", "13 de dezembro — Mártir siciliana do séc. IV que arrancou os próprios olhos para não se casar com um pagão. Patrona da vista e dos cegos. Seu nome vem de 'lux' (luz).", "Luz nas trevas: poupe ao menos 10% da renda.", 40, "💡", "médio", "sv10"),
  lt("lt_joao_cruz", 12, "São João da Cruz", "14 de dezembro — Carmelita descalço espanhol do séc. XVI, reformador com Santa Teresa de Ávila. Sua 'Noite Escura da Alma' é um dos maiores textos místicos cristãos.", "Noite escura: mantenha gastos com desejos abaixo de 30%.", 50, "🌑", "difícil", "wants30"),
  lt("lt_natal", 12, "Natal do Senhor", "25 de dezembro — Maior feriado cristão. O Filho de Deus nasce em Belém, em uma manjedoura, pobre e humilde. 'O Verbo se fez carne e habitou entre nós.' Glória a Deus nas alturas.", "Cristo nasce em nossas finanças: feche dezembro com saldo positivo.", 60, "⭐", "médio", "positive"),
  lt("lt_estevao", 12, "São Estêvão", "26 de dezembro — Primeiro mártir cristão (protomártir). Diácono que foi apedrejado por sua pregação corajosa. Enquanto morria, pedia perdão por seus algozes. Saulo assistia ao martírio.", "Coragem de testemunhar: registre ao menos 5 transações.", 40, "💎", "fácil", "tx5"),
  lt("lt_joao_evangelista", 12, "São João Evangelista", "27 de dezembro — O discípulo amado, único apóstolo não mártir, cuidou de Maria até o fim. Autor do quarto Evangelho, de três cartas e do Apocalipse. 'Deus é amor' (1Jo 4,8).", "Amor que permanece: registre ao menos 3 transações.", 30, "❤️", "fácil", "tx3"),
  lt("lt_santos_inocentes", 12, "Santos Inocentes", "28 de dezembro — Os bebês de Belém mortos por Herodes que buscava matar o Menino Jesus. Primeiros mártires — mortos em defesa de Cristo sem sabê-lo. Patronos dos nascituros.", "Proteção dos inocentes: poupe ao menos 10% da renda.", 40, "👼", "médio", "sv10"),

  // ══════════════════════════════════════════════════════════════
  // TROPHIES COM CHECK COMPOSTO
  // ══════════════════════════════════════════════════════════════

  {
    id: "lt_pedro_paulo",
    month: 6,
    name: "São Pedro e São Paulo",
    icon: "⛪",
    difficulty: "médio",
    baseXp: 50,
    eventSummary: "Feriado nacional (29/06). Pedro, o pescador eleito como rocha da Igreja, e Paulo, o grande evangelizador convertido — fundadores e pilares do Cristianismo, mártires em Roma.",
    description: "Construa uma base sólida: feche o mês com saldo positivo e ao menos 5 lançamentos registrados.",
    check: (domain, budget, mk) =>
      txs(domain, mk).length >= 5 && budget.savings > 0 && budget.totalIncome > 0,
    progress: (domain, budget, mk) => {
      const count = txs(domain, mk).length;
      const positive = budget.savings > 0 && budget.totalIncome > 0;
      const txPart = Math.min(5, count) / 5;
      const posPart = positive ? 1 : 0;
      const combined = Math.round((txPart * 0.6 + posPart * 0.4) * 10);
      return { current: combined, target: 10, unit: "pts" };
    },
  },

  {
    id: "lt_santana",
    month: 7,
    name: "Sant'Ana e São Joaquim",
    icon: "👴",
    difficulty: "fácil",
    baseXp: 35,
    eventSummary: "26 de julho — Pais de Nossa Senhora e avós de Jesus Cristo. Padroeiros das famílias, dos avós e das parteiras. Sua festa celebra a linhagem santa e o cuidado amoroso com as gerações.",
    description: "Cuide das gerações futuras: mantenha a poupança acima de 10% da renda e registre ao menos 5 transações.",
    check: (domain, budget, mk) =>
      budget.savingsPercent >= 10 && budget.totalIncome > 0 && txs(domain, mk).length >= 5,
    progress: (_domain, budget) => ({
      current: Math.min(10, Math.max(0, Math.round(budget.savingsPercent))),
      target: 10,
      unit: "% poupado",
    }),
  },

  {
    id: "lt_cristo_rei",
    month: 11,
    name: "Cristo Rei do Universo",
    icon: "👑",
    difficulty: "difícil",
    baseXp: 60,
    eventSummary: "Solenidade que encerra o ano litúrgico, proclamando Cristo como rei do universo e de nossas vidas. Criada pelo Papa Pio XI em 1925 para responder ao crescente secularismo moderno.",
    description: "Rejeite o secularismo financeiro: feche novembro com poupança ≥ 20% e desejos ≤ 30% — soberania plena sobre seu orçamento.",
    check: (_domain, budget) =>
      budget.savingsPercent >= 20 && budget.wantsPercent <= 30 && budget.totalIncome > 0,
    progress: (_domain, budget) => ({
      current: Math.min(20, Math.max(0, Math.round(budget.savingsPercent))),
      target: 20,
      unit: "% poupado",
    }),
  },
];
