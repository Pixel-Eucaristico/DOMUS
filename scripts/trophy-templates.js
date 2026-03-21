/**
 * Trophy animation templates.
 * Each trophy defines its unique visual (main element + decoration).
 * The generator applies tier logic (Bronze/Silver/Gold/Diamond) automatically.
 *
 * mainType: "coin" | "star" | "shield" | "heart" | "flame" | "cross" | "book" | "chalice"
 * decoType: "leaves" | "rays" | "sparkles_only" | "vines" | "none"
 */

// Helper: default coin colors per tier (reused by most trophies)
const TIER_COIN = {
  1: { fill: [.804,.498,.196,1], stroke: [.6,.35,.1,1], dollar: [.45,.25,.05,1] },
  2: { fill: [.75,.75,.78,1], stroke: [.55,.55,.6,1], dollar: [.35,.35,.4,1] },
  3: { fill: [1,.843,0,1], stroke: [.855,.647,.125,1], dollar: [.6,.4,.05,1] },
  4: { fill: [.31,.765,.969,1], stroke: [.2,.55,.8,1], dollar: [.1,.35,.6,1] },
};

const TIER_GLOW = {
  1: [.804,.498,.196,1], 2: [.75,.75,.78,1], 3: [1,.843,0,1], 4: [.31,.765,.969,1],
};

const TIER_SPARKLE = {
  1: [1,.75,.35,1], 2: [.85,.87,.95,1], 3: [1,.92,.4,1], 4: [.7,.9,1,1],
};

const LEAF_GREEN = {
  1: { l: [.4,.55,.3,1], r: [.35,.5,.28,1] },
  2: { l: [.3,.65,.32,1], r: [.25,.6,.28,1] },
  3: { l: [.298,.788,.345,1], r: [.18,.678,.255,1] },
  4: { l: [.2,.85,.4,1], r: [.1,.75,.3,1] },
};

// ─── Achievement Templates (29) ───
const achievements = [
  { id: "first_transaction", mainType: "coin", decoType: "leaves", symbol: "dollar" },
  { id: "ten_transactions", mainType: "coin", decoType: "leaves", symbol: "dollar" },
  { id: "first_dizimo", mainType: "cross", decoType: "rays", symbol: "cross" },
  { id: "streak_7", mainType: "star", decoType: "sparkles_only", symbol: "7" },
  { id: "streak_30", mainType: "star", decoType: "sparkles_only", symbol: "30" },
  { id: "budget_ok", mainType: "shield", decoType: "leaves", symbol: "check" },
  { id: "level_5", mainType: "star", decoType: "rays", symbol: "5" },
  { id: "level_10", mainType: "star", decoType: "rays", symbol: "10" },
  { id: "tx_50", mainType: "book", decoType: "leaves", symbol: "50" },
  { id: "tx_100", mainType: "book", decoType: "leaves", symbol: "100" },
  { id: "tx_500", mainType: "book", decoType: "rays", symbol: "500" },
  { id: "streak_3", mainType: "flame", decoType: "sparkles_only", symbol: "3" },
  { id: "streak_14", mainType: "star", decoType: "sparkles_only", symbol: "14" },
  { id: "streak_90", mainType: "star", decoType: "rays", symbol: "90" },
  { id: "streak_365", mainType: "star", decoType: "rays", symbol: "L" },
  { id: "budget_3mo", mainType: "shield", decoType: "leaves", symbol: "3" },
  { id: "budget_6mo", mainType: "shield", decoType: "leaves", symbol: "6" },
  { id: "budget_12mo", mainType: "shield", decoType: "rays", symbol: "12" },
  { id: "savings_1mo", mainType: "coin", decoType: "leaves", symbol: "dollar" },
  { id: "savings_3mo", mainType: "coin", decoType: "leaves", symbol: "dollar" },
  { id: "savings_elite", mainType: "heart", decoType: "sparkles_only", symbol: "dollar" },
  { id: "wants_1mo", mainType: "shield", decoType: "leaves", symbol: "check" },
  { id: "wants_3mo", mainType: "shield", decoType: "rays", symbol: "check" },
  { id: "level_20", mainType: "star", decoType: "rays", symbol: "20" },
  { id: "level_50", mainType: "star", decoType: "rays", symbol: "crown" },
  { id: "first_income", mainType: "coin", decoType: "rays", symbol: "dollar" },
  { id: "five_categories_month", mainType: "star", decoType: "leaves", symbol: "5" },
  { id: "positive_balance", mainType: "coin", decoType: "sparkles_only", symbol: "plus" },
  { id: "dizimo_3mo", mainType: "cross", decoType: "rays", symbol: "cross" },
];

// ─── Monthly Templates (6) ───
const monthly = [
  { id: "monthly_registros", mainType: "book", decoType: "leaves", symbol: "pen" },
  { id: "monthly_equilibrado", mainType: "shield", decoType: "leaves", symbol: "balance" },
  { id: "monthly_poupanca", mainType: "coin", decoType: "leaves", symbol: "dollar" },
  { id: "monthly_controle", mainType: "shield", decoType: "sparkles_only", symbol: "check" },
  { id: "monthly_dizimo", mainType: "cross", decoType: "rays", symbol: "cross" },
  { id: "monthly_saldo_positivo", mainType: "coin", decoType: "sparkles_only", symbol: "plus" },
];

// ─── Seasonal Templates (48) — all use coin/star with themed decoration ───
const seasonal = [
  { id: "seasonal_ano_novo", mainType: "star", decoType: "rays" },
  { id: "seasonal_planejamento_anual", mainType: "book", decoType: "leaves" },
  { id: "seasonal_dia_de_reis", mainType: "star", decoType: "rays" },
  { id: "seasonal_queima_velhos", mainType: "flame", decoType: "sparkles_only" },
  { id: "seasonal_carnaval", mainType: "star", decoType: "sparkles_only" },
  { id: "seasonal_valentine", mainType: "heart", decoType: "sparkles_only" },
  { id: "seasonal_quaresma", mainType: "cross", decoType: "leaves" },
  { id: "seasonal_mes_coracao", mainType: "heart", decoType: "leaves" },
  { id: "seasonal_dia_mulher", mainType: "star", decoType: "sparkles_only" },
  { id: "seasonal_dia_consumidor", mainType: "coin", decoType: "sparkles_only" },
  { id: "seasonal_inicio_outono", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_prep_pascoa", mainType: "cross", decoType: "leaves" },
  { id: "seasonal_pascoa", mainType: "cross", decoType: "rays" },
  { id: "seasonal_tiradentes", mainType: "shield", decoType: "rays" },
  { id: "seasonal_descobrimento", mainType: "star", decoType: "rays" },
  { id: "seasonal_mes_boleto", mainType: "book", decoType: "leaves" },
  { id: "seasonal_dia_trabalho", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_dia_maes", mainType: "heart", decoType: "sparkles_only" },
  { id: "seasonal_combate_fumo", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_abolicao", mainType: "star", decoType: "rays" },
  { id: "seasonal_dia_namorados", mainType: "heart", decoType: "sparkles_only" },
  { id: "seasonal_festa_junina", mainType: "flame", decoType: "sparkles_only" },
  { id: "seasonal_meio_ambiente", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_corpus_christi", mainType: "chalice", decoType: "rays" },
  { id: "seasonal_ferias_julho", mainType: "star", decoType: "sparkles_only" },
  { id: "seasonal_dia_avos", mainType: "heart", decoType: "leaves" },
  { id: "seasonal_nossa_sra_carmo", mainType: "cross", decoType: "rays" },
  { id: "seasonal_inverno", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_dia_pais", mainType: "heart", decoType: "sparkles_only" },
  { id: "seasonal_dia_estudante", mainType: "book", decoType: "leaves" },
  { id: "seasonal_volta_aulas", mainType: "book", decoType: "leaves" },
  { id: "seasonal_liquidacao_inverno", mainType: "coin", decoType: "sparkles_only" },
  { id: "seasonal_independencia", mainType: "star", decoType: "rays" },
  { id: "seasonal_prep_crianca", mainType: "heart", decoType: "leaves" },
  { id: "seasonal_primavera", mainType: "star", decoType: "leaves" },
  { id: "seasonal_transito", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_dia_criancas", mainType: "heart", decoType: "sparkles_only" },
  { id: "seasonal_outubro_rosa", mainType: "heart", decoType: "sparkles_only" },
  { id: "seasonal_halloween", mainType: "flame", decoType: "sparkles_only" },
  { id: "seasonal_prep_natal", mainType: "star", decoType: "rays" },
  { id: "seasonal_black_friday", mainType: "coin", decoType: "sparkles_only" },
  { id: "seasonal_finados", mainType: "cross", decoType: "leaves" },
  { id: "seasonal_consciencia_negra", mainType: "star", decoType: "rays" },
  { id: "seasonal_novembro_azul", mainType: "shield", decoType: "leaves" },
  { id: "seasonal_natal", mainType: "star", decoType: "rays" },
  { id: "seasonal_decimo_terceiro", mainType: "coin", decoType: "sparkles_only" },
  { id: "seasonal_ferias_verao", mainType: "star", decoType: "sparkles_only" },
  { id: "seasonal_balanco_anual", mainType: "book", decoType: "rays" },
];

// ─── Liturgical Templates (113) — all use cross/chalice with rays ───
const liturgical = [
  "lt_cinzas","lt_ramos","lt_quinta_santa","lt_sexta_paixao","lt_pascoa",
  "lt_ascensao","lt_pentecostes","lt_corpus_christi","lt_sagrado_coracao","lt_advento",
  "lt_maria_mae_deus","lt_epifania","lt_batismo_senhor","lt_antonio_abade","lt_sebastiao",
  "lt_ines","lt_francisco_sales","lt_conv_paulo","lt_tomas_aquino","lt_joao_bosco",
  "lt_apresentacao","lt_bras","lt_agueda","lt_lourdes","lt_valentim",
  "lt_cathedra_pedro","lt_perpetua_felicidade","lt_patricio","lt_jose_esposo","lt_anunciacao",
  "lt_isidoro_sevilha","lt_joao_lasalle","lt_carlo_acutis","lt_jorge","lt_marcos",
  "lt_catarina_sena","lt_jose_operario","lt_fatima","lt_matias","lt_isidoro_lavrador",
  "lt_rita_cassia","lt_visitacao","lt_barnabe","lt_antonio","lt_luis_gonzaga",
  "lt_fisher_tomas_moro","lt_joao_batista","lt_ireneu","lt_pedro_paulo","lt_tome",
  "lt_bento","lt_carmo","lt_magdalena","lt_brigida","lt_charbel",
  "lt_tiago","lt_santana","lt_marta","lt_inacio_loyola","lt_joao_vianney",
  "lt_transfiguracao","lt_domingos","lt_lourenco","lt_clara","lt_kolbe",
  "lt_assuncao","lt_bernardo","lt_maria_rainha","lt_bartolomeu","lt_monica",
  "lt_agostinho","lt_joao_batista_mart","lt_gregorio_magno","lt_natividade_maria","lt_pedro_claver",
  "lt_exaltacao_cruz","lt_dores_maria","lt_mateus","lt_pio_pietrelcina","lt_cosme_damiao",
  "lt_vicente_paulo","lt_arcanjos","lt_jeronimo","lt_teresinha","lt_anjos_guarda",
  "lt_francisco_assis","lt_rosario","lt_aparecida","lt_teresa_avila","lt_lucas",
  "lt_joao_paulo_ii","lt_simao_judas","lt_todos_santos","lt_fieis_defuntos","lt_martinho_porres",
  "lt_carlos_borromeu","lt_basilica_laterao","lt_martinho_tours","lt_isabel_hungria","lt_apresentacao_maria",
  "lt_cecilia","lt_cristo_rei","lt_nsa_gracas","lt_andre","lt_francisco_xavier",
  "lt_nicolau","lt_ambrosio","lt_imaculada","lt_luzia","lt_joao_cruz",
  "lt_natal","lt_estevao","lt_joao_evangelista","lt_santos_inocentes",
].map(id => ({ id, mainType: "cross", decoType: "rays" }));

module.exports = {
  TIER_COIN, TIER_GLOW, TIER_SPARKLE, LEAF_GREEN,
  allTemplates: [...achievements, ...monthly, ...seasonal, ...liturgical],
};
