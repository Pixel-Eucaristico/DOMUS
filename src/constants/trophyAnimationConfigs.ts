/**
 * Animação individual por troféu (Roadmap 08).
 *
 * Cada troféu recebe a configuração da sua categoria temática e, quando faz
 * sentido, um ajuste próprio em TROPHY_OVERRIDES. Para mudar a animação de um
 * troféu específico basta editar/adicionar a entrada dele em TROPHY_OVERRIDES.
 */

export type TrophyMotion = "spin" | "float" | "bounce" | "shake" | "pulse" | "swing";
export type TrophyEffect = "glow" | "sparkle" | "ripple" | "none";
export type TrophyEntry = "scale" | "fade" | "slide" | "flip";
export type TrophyParticles = "stars" | "hearts" | "fire" | "snow" | "confetti" | "coins" | "none";

export interface TrophyAnimationConfig {
  /** Movimento principal em loop */
  primaryMotion: TrophyMotion;
  /** Duração de um ciclo do movimento (ms) */
  motionSpeed: number;
  /** Efeito secundário ao redor do troféu */
  secondaryEffect: TrophyEffect;
  /** Cor do efeito/partículas (padrão: cor do troféu) */
  effectColor?: string;
  /** Animação de entrada ao montar */
  entryAnimation: TrophyEntry;
  entryDuration: number;
  particles: TrophyParticles;
  particleCount: number;
}

export type TrophyAnimationCategory =
  | "transaction"
  | "streak"
  | "financial"
  | "level"
  | "religious"
  | "monthly"
  | "festive"
  | "economy"
  | "family"
  | "nature"
  | "awareness"
  | "seasonal_faith"
  | "liturgical"
  | "liturgical_feast"
  | "marian"
  | "martyr"
  | "angelic";

export const CATEGORY_CONFIGS: Record<TrophyAnimationCategory, TrophyAnimationConfig> = {
  // Conquistas
  transaction: { primaryMotion: "spin", motionSpeed: 3500, secondaryEffect: "sparkle", entryAnimation: "slide", entryDuration: 500, particles: "none", particleCount: 0 },
  streak: { primaryMotion: "pulse", motionSpeed: 1400, secondaryEffect: "glow", effectColor: "#FF7043", entryAnimation: "scale", entryDuration: 600, particles: "fire", particleCount: 5 },
  financial: { primaryMotion: "bounce", motionSpeed: 1800, secondaryEffect: "glow", effectColor: "#FFC107", entryAnimation: "scale", entryDuration: 600, particles: "coins", particleCount: 5 },
  level: { primaryMotion: "spin", motionSpeed: 2800, secondaryEffect: "ripple", entryAnimation: "scale", entryDuration: 700, particles: "stars", particleCount: 6 },
  religious: { primaryMotion: "float", motionSpeed: 4400, secondaryEffect: "glow", effectColor: "#FFF3B0", entryAnimation: "fade", entryDuration: 900, particles: "stars", particleCount: 3 },
  // Mensais: selo carimbado
  monthly: { primaryMotion: "pulse", motionSpeed: 2400, secondaryEffect: "ripple", entryAnimation: "flip", entryDuration: 600, particles: "none", particleCount: 0 },
  // Sazonais
  festive: { primaryMotion: "bounce", motionSpeed: 1600, secondaryEffect: "sparkle", entryAnimation: "scale", entryDuration: 500, particles: "confetti", particleCount: 8 },
  economy: { primaryMotion: "swing", motionSpeed: 2600, secondaryEffect: "glow", effectColor: "#FFC107", entryAnimation: "slide", entryDuration: 600, particles: "coins", particleCount: 4 },
  family: { primaryMotion: "float", motionSpeed: 4000, secondaryEffect: "glow", effectColor: "#F48FB1", entryAnimation: "fade", entryDuration: 800, particles: "hearts", particleCount: 4 },
  nature: { primaryMotion: "swing", motionSpeed: 3600, secondaryEffect: "sparkle", entryAnimation: "fade", entryDuration: 800, particles: "none", particleCount: 0 },
  awareness: { primaryMotion: "pulse", motionSpeed: 2200, secondaryEffect: "ripple", entryAnimation: "scale", entryDuration: 600, particles: "none", particleCount: 0 },
  seasonal_faith: { primaryMotion: "float", motionSpeed: 4400, secondaryEffect: "glow", effectColor: "#FFF3B0", entryAnimation: "fade", entryDuration: 900, particles: "stars", particleCount: 3 },
  // Litúrgicos
  liturgical: { primaryMotion: "float", motionSpeed: 4400, secondaryEffect: "sparkle", entryAnimation: "fade", entryDuration: 900, particles: "none", particleCount: 0 },
  liturgical_feast: { primaryMotion: "spin", motionSpeed: 5000, secondaryEffect: "glow", effectColor: "#FFE082", entryAnimation: "scale", entryDuration: 900, particles: "stars", particleCount: 6 },
  marian: { primaryMotion: "float", motionSpeed: 5000, secondaryEffect: "ripple", effectColor: "#90CAF9", entryAnimation: "fade", entryDuration: 1000, particles: "stars", particleCount: 4 },
  martyr: { primaryMotion: "pulse", motionSpeed: 2000, secondaryEffect: "glow", effectColor: "#E53935", entryAnimation: "scale", entryDuration: 700, particles: "fire", particleCount: 4 },
  angelic: { primaryMotion: "float", motionSpeed: 3200, secondaryEffect: "sparkle", effectColor: "#E1F5FE", entryAnimation: "slide", entryDuration: 800, particles: "stars", particleCount: 5 },
};

const MARIAN = new Set([
  "lt_maria_mae_deus", "lt_lourdes", "lt_anunciacao", "lt_fatima", "lt_visitacao", "lt_carmo",
  "lt_assuncao", "lt_maria_rainha", "lt_natividade_maria", "lt_dores_maria", "lt_rosario",
  "lt_aparecida", "lt_apresentacao_maria", "lt_nsa_gracas", "lt_imaculada", "lt_santana",
]);

const MARTYRS = new Set([
  "lt_sebastiao", "lt_ines", "lt_agueda", "lt_perpetua_felicidade", "lt_jorge", "lt_fisher_tomas_moro",
  "lt_joao_batista_mart", "lt_lourenco", "lt_kolbe", "lt_estevao", "lt_santos_inocentes",
  "lt_pedro_paulo", "lt_bartolomeu", "lt_sexta_paixao", "lt_exaltacao_cruz", "lt_cecilia",
]);

const ANGELIC = new Set(["lt_arcanjos", "lt_anjos_guarda"]);

const LITURGICAL_FEASTS = new Set([
  "lt_pascoa", "lt_natal", "lt_pentecostes", "lt_ascensao", "lt_epifania", "lt_transfiguracao",
  "lt_todos_santos", "lt_cristo_rei", "lt_corpus_christi", "lt_sagrado_coracao", "lt_batismo_senhor",
  "lt_ramos", "lt_quinta_santa",
]);

const SEASONAL_CATEGORY: Record<string, TrophyAnimationCategory> = {
  seasonal_ano_novo: "festive",
  seasonal_carnaval: "festive",
  seasonal_festa_junina: "festive",
  seasonal_halloween: "festive",
  seasonal_dia_criancas: "festive",
  seasonal_independencia: "festive",
  seasonal_queima_velhos: "festive",

  seasonal_planejamento_anual: "economy",
  seasonal_dia_consumidor: "economy",
  seasonal_mes_boleto: "economy",
  seasonal_liquidacao_inverno: "economy",
  seasonal_black_friday: "economy",
  seasonal_decimo_terceiro: "economy",
  seasonal_balanco_anual: "economy",
  seasonal_transito: "economy",
  seasonal_descobrimento: "economy",
  seasonal_dia_trabalho: "economy",
  seasonal_dia_estudante: "economy",
  seasonal_volta_aulas: "economy",

  seasonal_valentine: "family",
  seasonal_mes_coracao: "family",
  seasonal_dia_maes: "family",
  seasonal_dia_pais: "family",
  seasonal_dia_namorados: "family",
  seasonal_dia_avos: "family",
  seasonal_prep_crianca: "family",

  seasonal_inicio_outono: "nature",
  seasonal_meio_ambiente: "nature",
  seasonal_inverno: "nature",
  seasonal_primavera: "nature",
  seasonal_ferias_julho: "nature",
  seasonal_ferias_verao: "nature",

  seasonal_dia_mulher: "awareness",
  seasonal_tiradentes: "awareness",
  seasonal_combate_fumo: "awareness",
  seasonal_abolicao: "awareness",
  seasonal_outubro_rosa: "awareness",
  seasonal_novembro_azul: "awareness",
  seasonal_consciencia_negra: "awareness",

  seasonal_dia_de_reis: "seasonal_faith",
  seasonal_quaresma: "seasonal_faith",
  seasonal_prep_pascoa: "seasonal_faith",
  seasonal_pascoa: "seasonal_faith",
  seasonal_corpus_christi: "seasonal_faith",
  seasonal_nossa_sra_carmo: "seasonal_faith",
  seasonal_finados: "seasonal_faith",
  seasonal_prep_natal: "seasonal_faith",
  seasonal_natal: "seasonal_faith",
};

/** Ajustes individuais por troféu, aplicados sobre a configuração da categoria */
export const TROPHY_OVERRIDES: Record<string, Partial<TrophyAnimationConfig>> = {
  // Conquistas
  first_transaction: { entryAnimation: "scale", particles: "stars", particleCount: 3 },
  tx_500: { particles: "stars", particleCount: 6, secondaryEffect: "glow" },
  streak_3: { particleCount: 2, motionSpeed: 1800 },
  streak_365: { particleCount: 9, motionSpeed: 1000, secondaryEffect: "ripple" },
  budget_12mo: { primaryMotion: "spin", motionSpeed: 3000, particleCount: 8 },
  savings_elite: { particles: "coins", particleCount: 8 },
  wants_1mo: { primaryMotion: "shake", motionSpeed: 2400, particles: "none", particleCount: 0 },
  wants_3mo: { primaryMotion: "shake", motionSpeed: 2400, particles: "none", particleCount: 0 },
  positive_balance: { effectColor: "#4CAF50", particles: "stars", particleCount: 4 },
  first_income: { particleCount: 8 },
  five_categories_month: { particles: "confetti", particleCount: 6 },
  level_50: { particleCount: 10, motionSpeed: 2000, secondaryEffect: "glow" },
  // Mensais
  monthly_poupanca: { particles: "coins", particleCount: 3 },
  monthly_dizimo: { secondaryEffect: "glow", effectColor: "#FFF3B0" },
  monthly_saldo_positivo: { effectColor: "#4CAF50" },
  // Sazonais
  seasonal_ano_novo: { particles: "stars", particleCount: 10, secondaryEffect: "ripple" },
  seasonal_queima_velhos: { particles: "fire", particleCount: 6, primaryMotion: "pulse" },
  seasonal_halloween: { primaryMotion: "shake", motionSpeed: 2200, effectColor: "#FF9800" },
  seasonal_independencia: { effectColor: "#009C3B" },
  seasonal_black_friday: { primaryMotion: "shake", motionSpeed: 2000, particleCount: 8 },
  seasonal_decimo_terceiro: { primaryMotion: "bounce", particleCount: 9 },
  seasonal_valentine: { primaryMotion: "pulse", motionSpeed: 1200 },
  seasonal_dia_namorados: { primaryMotion: "pulse", motionSpeed: 1200 },
  seasonal_inverno: { particles: "snow", particleCount: 6 },
  seasonal_meio_ambiente: { effectColor: "#66BB6A" },
  seasonal_ferias_verao: { primaryMotion: "float", effectColor: "#FFB300", secondaryEffect: "glow" },
  seasonal_outubro_rosa: { effectColor: "#EC407A" },
  seasonal_novembro_azul: { effectColor: "#1E88E5" },
  seasonal_quaresma: { particles: "none", particleCount: 0, effectColor: "#7E57C2" },
  seasonal_finados: { particles: "none", particleCount: 0, effectColor: "#B0BEC5", motionSpeed: 5600 },
  seasonal_natal: { particles: "snow", particleCount: 8, secondaryEffect: "sparkle" },
  seasonal_prep_natal: { particles: "snow", particleCount: 5 },
  // Litúrgicos
  lt_natal: { particles: "snow", particleCount: 8 },
  lt_pentecostes: { particles: "fire", particleCount: 7, effectColor: "#FF7043", primaryMotion: "pulse" },
  lt_sagrado_coracao: { particles: "hearts", particleCount: 5, effectColor: "#E53935", primaryMotion: "pulse", motionSpeed: 1400 },
  lt_cinzas: { secondaryEffect: "none", particles: "none", particleCount: 0, motionSpeed: 5600 },
  lt_sexta_paixao: { particles: "none", particleCount: 0, effectColor: "#6A1B9A", motionSpeed: 3000 },
  lt_advento: { secondaryEffect: "glow", effectColor: "#7E57C2" },
  lt_valentim: { particles: "hearts", particleCount: 5, effectColor: "#EC407A" },
  lt_francisco_assis: { primaryMotion: "swing", particles: "hearts", particleCount: 3, effectColor: "#8BC34A" },
  lt_nicolau: { particles: "snow", particleCount: 5 },
  lt_mateus: { particles: "coins", particleCount: 5 },
  lt_lourenco: { particleCount: 7 },
  lt_lucas: { particles: "confetti", particleCount: 5 },
  lt_cecilia: { primaryMotion: "swing" },
  lt_gregorio_magno: { primaryMotion: "swing", particles: "stars", particleCount: 3 },
  lt_carlo_acutis: { primaryMotion: "bounce", effectColor: "#29B6F6" },
  lt_andre: { primaryMotion: "swing", effectColor: "#4FC3F7" },
  lt_aparecida: { effectColor: "#1565C0", particleCount: 6 },
  lt_imaculada: { effectColor: "#E3F2FD", particleCount: 6 },
};

/** Categoria temática do troféu, a partir do ID */
export function getTrophyAnimationCategory(trophyId: string | undefined): TrophyAnimationCategory {
  const id = trophyId ?? "";

  if (id.startsWith("lt_")) {
    if (MARIAN.has(id)) return "marian";
    if (MARTYRS.has(id)) return "martyr";
    if (ANGELIC.has(id)) return "angelic";
    if (LITURGICAL_FEASTS.has(id)) return "liturgical_feast";
    return "liturgical";
  }
  if (id.startsWith("seasonal_")) return SEASONAL_CATEGORY[id] ?? "festive";
  if (id.startsWith("monthly_")) return "monthly";

  if (id.includes("dizimo")) return "religious";
  if (id.startsWith("streak_")) return "streak";
  if (id.startsWith("level_")) return "level";
  if (id === "first_transaction" || id === "ten_transactions" || id.startsWith("tx_")) return "transaction";
  if (/^(budget|savings|wants)_/.test(id) || ["positive_balance", "first_income", "five_categories_month"].includes(id)) {
    return "financial";
  }
  return "transaction";
}

export function getTrophyAnimationConfig(trophyId: string | undefined): TrophyAnimationConfig {
  const base = CATEGORY_CONFIGS[getTrophyAnimationCategory(trophyId)];
  const override = trophyId ? TROPHY_OVERRIDES[trophyId] : undefined;
  return override ? { ...base, ...override } : base;
}
