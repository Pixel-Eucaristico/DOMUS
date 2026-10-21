import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import LottieView from "lottie-react-native";
import { configureLottieWasm } from "./lottieWasm";
import { AnimatedTrophy } from "./AnimatedTrophy";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import type { AchievementRarity } from "@packages/gamification/src/achievements";

/**
 * Mapa de troféus com Lottie aprovados.
 * Chave = trophyId, valor = require() do JSON.
 * Atualizar conforme cada animação é aprovada.
 */
/**
 * Troféus aprovados com variantes por tier.
 * base = fallback, t1-t4 = Bronze/Prata/Ouro/Diamante.
 */
configureLottieWasm();

const APPROVED_LOTTIE: Record<string, {
  base: any;
  t1?: any;
  t2?: any;
  t3?: any;
  t4?: any;
}> = {
  "first_transaction": {
    base: require("@/assets/lottie/trophies/first_transaction.json"),
    t1: require("@/assets/lottie/trophies/first_transaction_t1.json"),
    t2: require("@/assets/lottie/trophies/first_transaction_t2.json"),
    t3: require("@/assets/lottie/trophies/first_transaction_t3.json"),
    t4: require("@/assets/lottie/trophies/first_transaction_t4.json"),
  },
  "ten_transactions": {
    base: require("@/assets/lottie/trophies/ten_transactions.json"),
    t1: require("@/assets/lottie/trophies/ten_transactions_t1.json"),
    t2: require("@/assets/lottie/trophies/ten_transactions_t2.json"),
    t3: require("@/assets/lottie/trophies/ten_transactions_t3.json"),
    t4: require("@/assets/lottie/trophies/ten_transactions_t4.json"),
  },
  "streak_7": {
    base: require("@/assets/lottie/trophies/streak_7.json"),
    t1: require("@/assets/lottie/trophies/streak_7_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_7_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_7_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_7_t4.json"),
  },
  "streak_30": {
    base: require("@/assets/lottie/trophies/streak_30.json"),
    t1: require("@/assets/lottie/trophies/streak_30_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_30_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_30_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_30_t4.json"),
  },
  "budget_ok": {
    base: require("@/assets/lottie/trophies/budget_ok.json"),
    t1: require("@/assets/lottie/trophies/budget_ok_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_ok_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_ok_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_ok_t4.json"),
  },
  "level_5": {
    base: require("@/assets/lottie/trophies/level_5.json"),
    t1: require("@/assets/lottie/trophies/level_5_t1.json"),
    t2: require("@/assets/lottie/trophies/level_5_t2.json"),
    t3: require("@/assets/lottie/trophies/level_5_t3.json"),
    t4: require("@/assets/lottie/trophies/level_5_t4.json"),
  },
  "first_dizimo": {
    base: require("@/assets/lottie/trophies/first_dizimo.json"),
    t1: require("@/assets/lottie/trophies/first_dizimo_t1.json"),
    t2: require("@/assets/lottie/trophies/first_dizimo_t2.json"),
    t3: require("@/assets/lottie/trophies/first_dizimo_t3.json"),
    t4: require("@/assets/lottie/trophies/first_dizimo_t4.json"),
  },
  "level_10": {
    base: require("@/assets/lottie/trophies/level_10.json"),
    t1: require("@/assets/lottie/trophies/level_10_t1.json"),
    t2: require("@/assets/lottie/trophies/level_10_t2.json"),
    t3: require("@/assets/lottie/trophies/level_10_t3.json"),
    t4: require("@/assets/lottie/trophies/level_10_t4.json"),
  },
  "tx_50": {
    base: require("@/assets/lottie/trophies/tx_50.json"),
    t1: require("@/assets/lottie/trophies/tx_50_t1.json"),
    t2: require("@/assets/lottie/trophies/tx_50_t2.json"),
    t3: require("@/assets/lottie/trophies/tx_50_t3.json"),
    t4: require("@/assets/lottie/trophies/tx_50_t4.json"),
  },
  "tx_100": {
    base: require("@/assets/lottie/trophies/tx_100.json"),
    t1: require("@/assets/lottie/trophies/tx_100_t1.json"),
    t2: require("@/assets/lottie/trophies/tx_100_t2.json"),
    t3: require("@/assets/lottie/trophies/tx_100_t3.json"),
    t4: require("@/assets/lottie/trophies/tx_100_t4.json"),
  },
  "tx_500": {
    base: require("@/assets/lottie/trophies/tx_500.json"),
    t1: require("@/assets/lottie/trophies/tx_500_t1.json"),
    t2: require("@/assets/lottie/trophies/tx_500_t2.json"),
    t3: require("@/assets/lottie/trophies/tx_500_t3.json"),
    t4: require("@/assets/lottie/trophies/tx_500_t4.json"),
  },
  "streak_3": {
    base: require("@/assets/lottie/trophies/streak_3.json"),
    t1: require("@/assets/lottie/trophies/streak_3_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_3_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_3_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_3_t4.json"),
  },
  "streak_14": {
    base: require("@/assets/lottie/trophies/streak_14.json"),
    t1: require("@/assets/lottie/trophies/streak_14_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_14_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_14_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_14_t4.json"),
  },
  "streak_90": {
    base: require("@/assets/lottie/trophies/streak_90.json"),
    t1: require("@/assets/lottie/trophies/streak_90_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_90_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_90_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_90_t4.json"),
  },
  "streak_365": {
    base: require("@/assets/lottie/trophies/streak_365.json"),
    t1: require("@/assets/lottie/trophies/streak_365_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_365_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_365_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_365_t4.json"),
  },
  "budget_3mo": {
    base: require("@/assets/lottie/trophies/budget_3mo.json"),
    t1: require("@/assets/lottie/trophies/budget_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_3mo_t4.json"),
  },
  "budget_6mo": {
    base: require("@/assets/lottie/trophies/budget_6mo.json"),
    t1: require("@/assets/lottie/trophies/budget_6mo_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_6mo_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_6mo_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_6mo_t4.json"),
  },
  "budget_12mo": {
    base: require("@/assets/lottie/trophies/budget_12mo.json"),
    t1: require("@/assets/lottie/trophies/budget_12mo_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_12mo_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_12mo_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_12mo_t4.json"),
  },
  "savings_1mo": {
    base: require("@/assets/lottie/trophies/savings_1mo.json"),
    t1: require("@/assets/lottie/trophies/savings_1mo_t1.json"),
    t2: require("@/assets/lottie/trophies/savings_1mo_t2.json"),
    t3: require("@/assets/lottie/trophies/savings_1mo_t3.json"),
    t4: require("@/assets/lottie/trophies/savings_1mo_t4.json"),
  },
  "savings_3mo": {
    base: require("@/assets/lottie/trophies/savings_3mo.json"),
    t1: require("@/assets/lottie/trophies/savings_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/savings_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/savings_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/savings_3mo_t4.json"),
  },
  "savings_elite": {
    base: require("@/assets/lottie/trophies/savings_elite.json"),
    t1: require("@/assets/lottie/trophies/savings_elite_t1.json"),
    t2: require("@/assets/lottie/trophies/savings_elite_t2.json"),
    t3: require("@/assets/lottie/trophies/savings_elite_t3.json"),
    t4: require("@/assets/lottie/trophies/savings_elite_t4.json"),
  },
  "wants_1mo": {
    base: require("@/assets/lottie/trophies/wants_1mo.json"),
    t1: require("@/assets/lottie/trophies/wants_1mo_t1.json"),
    t2: require("@/assets/lottie/trophies/wants_1mo_t2.json"),
    t3: require("@/assets/lottie/trophies/wants_1mo_t3.json"),
    t4: require("@/assets/lottie/trophies/wants_1mo_t4.json"),
  },
  "wants_3mo": {
    base: require("@/assets/lottie/trophies/wants_3mo.json"),
    t1: require("@/assets/lottie/trophies/wants_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/wants_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/wants_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/wants_3mo_t4.json"),
  },
  "five_categories_month": {
    base: require("@/assets/lottie/trophies/five_categories_month.json"),
    t1: require("@/assets/lottie/trophies/five_categories_month_t1.json"),
    t2: require("@/assets/lottie/trophies/five_categories_month_t2.json"),
    t3: require("@/assets/lottie/trophies/five_categories_month_t3.json"),
    t4: require("@/assets/lottie/trophies/five_categories_month_t4.json"),
  },
  "level_20": {
    base: require("@/assets/lottie/trophies/level_20.json"),
    t1: require("@/assets/lottie/trophies/level_20_t1.json"),
    t2: require("@/assets/lottie/trophies/level_20_t2.json"),
    t3: require("@/assets/lottie/trophies/level_20_t3.json"),
    t4: require("@/assets/lottie/trophies/level_20_t4.json"),
  },
  "level_50": {
    base: require("@/assets/lottie/trophies/level_50.json"),
    t1: require("@/assets/lottie/trophies/level_50_t1.json"),
    t2: require("@/assets/lottie/trophies/level_50_t2.json"),
    t3: require("@/assets/lottie/trophies/level_50_t3.json"),
    t4: require("@/assets/lottie/trophies/level_50_t4.json"),
  },
  "first_income": {
    base: require("@/assets/lottie/trophies/first_income.json"),
    t1: require("@/assets/lottie/trophies/first_income_t1.json"),
    t2: require("@/assets/lottie/trophies/first_income_t2.json"),
    t3: require("@/assets/lottie/trophies/first_income_t3.json"),
    t4: require("@/assets/lottie/trophies/first_income_t4.json"),
  },
  "positive_balance": {
    base: require("@/assets/lottie/trophies/positive_balance.json"),
    t1: require("@/assets/lottie/trophies/positive_balance_t1.json"),
    t2: require("@/assets/lottie/trophies/positive_balance_t2.json"),
    t3: require("@/assets/lottie/trophies/positive_balance_t3.json"),
    t4: require("@/assets/lottie/trophies/positive_balance_t4.json"),
  },
  "dizimo_3mo": {
    base: require("@/assets/lottie/trophies/dizimo_3mo.json"),
    t1: require("@/assets/lottie/trophies/dizimo_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/dizimo_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/dizimo_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/dizimo_3mo_t4.json"),
  },
  // --- Monthly (sem tiers) ---
  "monthly_registros": {
    base: require("@/assets/lottie/trophies/monthly_registros.json"),
  },
  "monthly_equilibrado": {
    base: require("@/assets/lottie/trophies/monthly_equilibrado.json"),
  },
  "monthly_poupanca": {
    base: require("@/assets/lottie/trophies/monthly_poupanca.json"),
  },
  "monthly_controle": {
    base: require("@/assets/lottie/trophies/monthly_controle.json"),
  },
  "monthly_dizimo": {
    base: require("@/assets/lottie/trophies/monthly_dizimo.json"),
  },
  "monthly_saldo_positivo": {
    base: require("@/assets/lottie/trophies/monthly_saldo_positivo.json"),
  },
  // --- Seasonal (sem tiers) ---
  "seasonal_ano_novo": {
    base: require("@/assets/lottie/trophies/seasonal_ano_novo.json"),
    t2: require("@/assets/lottie/trophies/seasonal_ano_novo_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_ano_novo_t3.json"),
  },
  "seasonal_planejamento_anual": {
    base: require("@/assets/lottie/trophies/seasonal_planejamento_anual.json"),
    t2: require("@/assets/lottie/trophies/seasonal_planejamento_anual_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_planejamento_anual_t3.json"),
  },
  "seasonal_dia_de_reis": {
    base: require("@/assets/lottie/trophies/seasonal_dia_de_reis.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_de_reis_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_de_reis_t3.json"),
  },
  "seasonal_queima_velhos": {
    base: require("@/assets/lottie/trophies/seasonal_queima_velhos.json"),
    t2: require("@/assets/lottie/trophies/seasonal_queima_velhos_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_queima_velhos_t3.json"),
  },
  "seasonal_carnaval": {
    base: require("@/assets/lottie/trophies/seasonal_carnaval.json"),
    t2: require("@/assets/lottie/trophies/seasonal_carnaval_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_carnaval_t3.json"),
  },
  "seasonal_valentine": {
    base: require("@/assets/lottie/trophies/seasonal_valentine.json"),
    t2: require("@/assets/lottie/trophies/seasonal_valentine_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_valentine_t3.json"),
  },
  "seasonal_quaresma": {
    base: require("@/assets/lottie/trophies/seasonal_quaresma.json"),
    t2: require("@/assets/lottie/trophies/seasonal_quaresma_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_quaresma_t3.json"),
  },
  "seasonal_mes_coracao": {
    base: require("@/assets/lottie/trophies/seasonal_mes_coracao.json"),
    t2: require("@/assets/lottie/trophies/seasonal_mes_coracao_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_mes_coracao_t3.json"),
  },
  "seasonal_dia_mulher": {
    base: require("@/assets/lottie/trophies/seasonal_dia_mulher.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_mulher_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_mulher_t3.json"),
  },
  "seasonal_dia_consumidor": {
    base: require("@/assets/lottie/trophies/seasonal_dia_consumidor.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_consumidor_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_consumidor_t3.json"),
  },
  "seasonal_inicio_outono": {
    base: require("@/assets/lottie/trophies/seasonal_inicio_outono.json"),
    t2: require("@/assets/lottie/trophies/seasonal_inicio_outono_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_inicio_outono_t3.json"),
  },
  "seasonal_prep_pascoa": {
    base: require("@/assets/lottie/trophies/seasonal_prep_pascoa.json"),
    t2: require("@/assets/lottie/trophies/seasonal_prep_pascoa_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_prep_pascoa_t3.json"),
  },
  "seasonal_pascoa": {
    base: require("@/assets/lottie/trophies/seasonal_pascoa.json"),
    t2: require("@/assets/lottie/trophies/seasonal_pascoa_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_pascoa_t3.json"),
  },
  "seasonal_tiradentes": {
    base: require("@/assets/lottie/trophies/seasonal_tiradentes.json"),
    t2: require("@/assets/lottie/trophies/seasonal_tiradentes_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_tiradentes_t3.json"),
  },
  "seasonal_descobrimento": {
    base: require("@/assets/lottie/trophies/seasonal_descobrimento.json"),
    t2: require("@/assets/lottie/trophies/seasonal_descobrimento_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_descobrimento_t3.json"),
  },
  "seasonal_primavera": {
    base: require("@/assets/lottie/trophies/seasonal_primavera.json"),
    t2: require("@/assets/lottie/trophies/seasonal_primavera_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_primavera_t3.json"),
  },
  "seasonal_natal": {
    base: require("@/assets/lottie/trophies/seasonal_natal.json"),
    t2: require("@/assets/lottie/trophies/seasonal_natal_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_natal_t3.json"),
  },
  "seasonal_novembro_azul": {
    base: require("@/assets/lottie/trophies/seasonal_novembro_azul.json"),
    t2: require("@/assets/lottie/trophies/seasonal_novembro_azul_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_novembro_azul_t3.json"),
  },
  "seasonal_consciencia_negra": {
    base: require("@/assets/lottie/trophies/seasonal_consciencia_negra.json"),
    t2: require("@/assets/lottie/trophies/seasonal_consciencia_negra_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_consciencia_negra_t3.json"),
  },
  "seasonal_finados": {
    base: require("@/assets/lottie/trophies/seasonal_finados.json"),
    t2: require("@/assets/lottie/trophies/seasonal_finados_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_finados_t3.json"),
  },
  "seasonal_black_friday": {
    base: require("@/assets/lottie/trophies/seasonal_black_friday.json"),
    t2: require("@/assets/lottie/trophies/seasonal_black_friday_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_black_friday_t3.json"),
  },
  "seasonal_outubro_rosa": {
    base: require("@/assets/lottie/trophies/seasonal_outubro_rosa.json"),
    t2: require("@/assets/lottie/trophies/seasonal_outubro_rosa_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_outubro_rosa_t3.json"),
  },
  "seasonal_dia_criancas": {
    base: require("@/assets/lottie/trophies/seasonal_dia_criancas.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_criancas_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_criancas_t3.json"),
  },
  "seasonal_prep_natal": {
    base: require("@/assets/lottie/trophies/seasonal_prep_natal.json"),
    t2: require("@/assets/lottie/trophies/seasonal_prep_natal_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_prep_natal_t3.json"),
  },
  "seasonal_halloween": {
    base: require("@/assets/lottie/trophies/seasonal_halloween.json"),
    t2: require("@/assets/lottie/trophies/seasonal_halloween_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_halloween_t3.json"),
  },
  "seasonal_transito": {
    base: require("@/assets/lottie/trophies/seasonal_transito.json"),
    t2: require("@/assets/lottie/trophies/seasonal_transito_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_transito_t3.json"),
  },
  "seasonal_prep_crianca": {
    base: require("@/assets/lottie/trophies/seasonal_prep_crianca.json"),
    t2: require("@/assets/lottie/trophies/seasonal_prep_crianca_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_prep_crianca_t3.json"),
  },
  "seasonal_independencia": {
    base: require("@/assets/lottie/trophies/seasonal_independencia.json"),
    t2: require("@/assets/lottie/trophies/seasonal_independencia_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_independencia_t3.json"),
  },
  "seasonal_mes_boleto": {
    base: require("@/assets/lottie/trophies/seasonal_mes_boleto.json"),
    t2: require("@/assets/lottie/trophies/seasonal_mes_boleto_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_mes_boleto_t3.json"),
  },
  "seasonal_dia_trabalho": {
    base: require("@/assets/lottie/trophies/seasonal_dia_trabalho.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_trabalho_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_trabalho_t3.json"),
  },
  "seasonal_dia_maes": {
    base: require("@/assets/lottie/trophies/seasonal_dia_maes.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_maes_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_maes_t3.json"),
  },
  "seasonal_combate_fumo": {
    base: require("@/assets/lottie/trophies/seasonal_combate_fumo.json"),
    t2: require("@/assets/lottie/trophies/seasonal_combate_fumo_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_combate_fumo_t3.json"),
  },
  "seasonal_abolicao": {
    base: require("@/assets/lottie/trophies/seasonal_abolicao.json"),
    t2: require("@/assets/lottie/trophies/seasonal_abolicao_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_abolicao_t3.json"),
  },
  "seasonal_dia_namorados": {
    base: require("@/assets/lottie/trophies/seasonal_dia_namorados.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_namorados_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_namorados_t3.json"),
  },
  "seasonal_festa_junina": {
    base: require("@/assets/lottie/trophies/seasonal_festa_junina.json"),
    t2: require("@/assets/lottie/trophies/seasonal_festa_junina_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_festa_junina_t3.json"),
  },
  "seasonal_meio_ambiente": {
    base: require("@/assets/lottie/trophies/seasonal_meio_ambiente.json"),
    t2: require("@/assets/lottie/trophies/seasonal_meio_ambiente_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_meio_ambiente_t3.json"),
  },
  "seasonal_corpus_christi": {
    base: require("@/assets/lottie/trophies/seasonal_corpus_christi.json"),
    t2: require("@/assets/lottie/trophies/seasonal_corpus_christi_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_corpus_christi_t3.json"),
  },
  "seasonal_ferias_julho": {
    base: require("@/assets/lottie/trophies/seasonal_ferias_julho.json"),
    t2: require("@/assets/lottie/trophies/seasonal_ferias_julho_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_ferias_julho_t3.json"),
  },
  "seasonal_dia_avos": {
    base: require("@/assets/lottie/trophies/seasonal_dia_avos.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_avos_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_avos_t3.json"),
  },
  "seasonal_nossa_sra_carmo": {
    base: require("@/assets/lottie/trophies/seasonal_nossa_sra_carmo.json"),
    t2: require("@/assets/lottie/trophies/seasonal_nossa_sra_carmo_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_nossa_sra_carmo_t3.json"),
  },
  "seasonal_inverno": {
    base: require("@/assets/lottie/trophies/seasonal_inverno.json"),
    t2: require("@/assets/lottie/trophies/seasonal_inverno_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_inverno_t3.json"),
  },
  "seasonal_dia_pais": {
    base: require("@/assets/lottie/trophies/seasonal_dia_pais.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_pais_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_pais_t3.json"),
  },
  "seasonal_dia_estudante": {
    base: require("@/assets/lottie/trophies/seasonal_dia_estudante.json"),
    t2: require("@/assets/lottie/trophies/seasonal_dia_estudante_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_dia_estudante_t3.json"),
  },
  "seasonal_volta_aulas": {
    base: require("@/assets/lottie/trophies/seasonal_volta_aulas.json"),
    t2: require("@/assets/lottie/trophies/seasonal_volta_aulas_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_volta_aulas_t3.json"),
  },
  "seasonal_liquidacao_inverno": {
    base: require("@/assets/lottie/trophies/seasonal_liquidacao_inverno.json"),
    t2: require("@/assets/lottie/trophies/seasonal_liquidacao_inverno_t2.json"),
    t3: require("@/assets/lottie/trophies/seasonal_liquidacao_inverno_t3.json"),
  },
};

const RARITY_TO_TIER: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

interface Props {
  trophyId: string;
  type: "achievement" | "seasonal" | "liturgical" | "monthly";
  size?: number;
  rarity?: AchievementRarity;
  icon?: string;
  color?: string;
  isLiturgical?: boolean;
  isStatic?: boolean;
  /** Callback ao tocar no troféu */
  onPress?: () => void;
}

/**
 * Renderiza Lottie se a animação está aprovada,
 * senão faz fallback para o SVG animado atual.
 *
 * Fluxo: criar .json no LottieFiles/SVGator/Recraft → aprovar →
 * adicionar em APPROVED_LOTTIE → LottieTrophy detecta automaticamente.
 */
export function LottieTrophy({
  trophyId,
  type,
  size = 64,
  rarity = "gold",
  icon,
  color,
  isLiturgical = false,
  isStatic = false,
  onPress,
}: Props) {
  const lottieRef = useRef<LottieView>(null);
  const [lottieError, setLottieError] = useState(false);

  // When static, jump to last frame after mount
  useEffect(() => {
    if (isStatic && lottieRef.current) {
      // Play to end then stop — shows all elements visible
      lottieRef.current.play(89, 89);
    }
  }, [isStatic]);

  const entry = APPROVED_LOTTIE[trophyId];
  const tier = RARITY_TO_TIER[rarity] ?? 3;
  const tierKey = `t${tier}` as "t1" | "t2" | "t3" | "t4";
  const source = entry ? (entry[tierKey] ?? entry.base) : undefined;

  if (source && !lottieError) {
    const lottieSize = size * 1.45; // Canvas has ~30% empty padding, compensate
    const lottieView = (
      <View style={[s.container, { width: size, height: size }]}>
        <LottieView
          ref={lottieRef}
          source={source}
          style={{ width: lottieSize, height: lottieSize }}
          autoPlay={!isStatic}
          loop={!isStatic}
          speed={1}
          onAnimationFailure={() => setLottieError(true)}
        />
      </View>
    );

    if (onPress) {
      return (
        <Pressable
          onPress={() => {
            lottieRef.current?.play();
            onPress();
          }}
        >
          {lottieView}
        </Pressable>
      );
    }

    return lottieView;
  }

  // Fallback: SVG animado existente
  if (type === "achievement") {
    return <AnimatedTrophy rarity={rarity} size={Math.round(size * 0.75) + 2} spinning={!isStatic} />;
  }

  return (
    <AnimatedSeasonalTrophy
      icon={icon}
      id={trophyId}
      size={size}
      color={color}
      isLiturgical={isLiturgical}
      isStatic={isStatic}
    />
  );
}

const s = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
