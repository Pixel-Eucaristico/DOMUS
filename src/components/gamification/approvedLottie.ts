/**
 * Registro dos troféus com Lottie aprovados pelo dono.
 *
 * Chave = trophyId; cada nível guarda um getter `() => require(...)`. Os
 * ~17 MB de JSON continuam dentro do pacote do app (o Metro empacota todo
 * require estático); o getter só adia a avaliação de cada módulo JSON (parse e
 * objeto em memória) até o troféu aparecer na tela. Os require() precisam ser
 * literais de string estáticos para o Metro.
 *
 * Níveis:
 * - conquistas: base + t1..t4 (Bronze/Prata/Ouro/Diamante, pela raridade);
 * - sazonais e litúrgicos: base = bronze, t2 = prata, t3 = ouro (getSeasonalTier);
 * - mensais: só base.
 *
 * Este arquivo é lido por `scripts/lottie-lib` (readApprovedIds /
 * readApprovedFiles): os geradores de lote recusam sobrescrever ids daqui, e
 * `assets/lottie/trophies/aprovados.sha256.json` trava o conteúdo dos arquivos
 * (regerar com `node scripts/lottie-approved-hashes.js`). Mantenha o formato
 * `"id": {` / `nível: () => require("@/assets/lottie/trophies/<arquivo>.json"),`.
 *
 * Sem import de react-native: a escolha de nível (lottieTierSelection.ts) e
 * este registro são testados no vitest.
 */
import type { ApprovedLottieEntry } from "./lottieTierSelection";

export const APPROVED_LOTTIE: Record<string, ApprovedLottieEntry> = {
  "first_transaction": {
    base: () => require("@/assets/lottie/trophies/first_transaction.json"),
    t1: () => require("@/assets/lottie/trophies/first_transaction_t1.json"),
    t2: () => require("@/assets/lottie/trophies/first_transaction_t2.json"),
    t3: () => require("@/assets/lottie/trophies/first_transaction_t3.json"),
    t4: () => require("@/assets/lottie/trophies/first_transaction_t4.json"),
  },
  "ten_transactions": {
    base: () => require("@/assets/lottie/trophies/ten_transactions.json"),
    t1: () => require("@/assets/lottie/trophies/ten_transactions_t1.json"),
    t2: () => require("@/assets/lottie/trophies/ten_transactions_t2.json"),
    t3: () => require("@/assets/lottie/trophies/ten_transactions_t3.json"),
    t4: () => require("@/assets/lottie/trophies/ten_transactions_t4.json"),
  },
  "streak_7": {
    base: () => require("@/assets/lottie/trophies/streak_7.json"),
    t1: () => require("@/assets/lottie/trophies/streak_7_t1.json"),
    t2: () => require("@/assets/lottie/trophies/streak_7_t2.json"),
    t3: () => require("@/assets/lottie/trophies/streak_7_t3.json"),
    t4: () => require("@/assets/lottie/trophies/streak_7_t4.json"),
  },
  "streak_30": {
    base: () => require("@/assets/lottie/trophies/streak_30.json"),
    t1: () => require("@/assets/lottie/trophies/streak_30_t1.json"),
    t2: () => require("@/assets/lottie/trophies/streak_30_t2.json"),
    t3: () => require("@/assets/lottie/trophies/streak_30_t3.json"),
    t4: () => require("@/assets/lottie/trophies/streak_30_t4.json"),
  },
  "budget_ok": {
    base: () => require("@/assets/lottie/trophies/budget_ok.json"),
    t1: () => require("@/assets/lottie/trophies/budget_ok_t1.json"),
    t2: () => require("@/assets/lottie/trophies/budget_ok_t2.json"),
    t3: () => require("@/assets/lottie/trophies/budget_ok_t3.json"),
    t4: () => require("@/assets/lottie/trophies/budget_ok_t4.json"),
  },
  "level_5": {
    base: () => require("@/assets/lottie/trophies/level_5.json"),
    t1: () => require("@/assets/lottie/trophies/level_5_t1.json"),
    t2: () => require("@/assets/lottie/trophies/level_5_t2.json"),
    t3: () => require("@/assets/lottie/trophies/level_5_t3.json"),
    t4: () => require("@/assets/lottie/trophies/level_5_t4.json"),
  },
  "first_dizimo": {
    base: () => require("@/assets/lottie/trophies/first_dizimo.json"),
    t1: () => require("@/assets/lottie/trophies/first_dizimo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/first_dizimo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/first_dizimo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/first_dizimo_t4.json"),
  },
  "level_10": {
    base: () => require("@/assets/lottie/trophies/level_10.json"),
    t1: () => require("@/assets/lottie/trophies/level_10_t1.json"),
    t2: () => require("@/assets/lottie/trophies/level_10_t2.json"),
    t3: () => require("@/assets/lottie/trophies/level_10_t3.json"),
    t4: () => require("@/assets/lottie/trophies/level_10_t4.json"),
  },
  "tx_50": {
    base: () => require("@/assets/lottie/trophies/tx_50.json"),
    t1: () => require("@/assets/lottie/trophies/tx_50_t1.json"),
    t2: () => require("@/assets/lottie/trophies/tx_50_t2.json"),
    t3: () => require("@/assets/lottie/trophies/tx_50_t3.json"),
    t4: () => require("@/assets/lottie/trophies/tx_50_t4.json"),
  },
  "tx_100": {
    base: () => require("@/assets/lottie/trophies/tx_100.json"),
    t1: () => require("@/assets/lottie/trophies/tx_100_t1.json"),
    t2: () => require("@/assets/lottie/trophies/tx_100_t2.json"),
    t3: () => require("@/assets/lottie/trophies/tx_100_t3.json"),
    t4: () => require("@/assets/lottie/trophies/tx_100_t4.json"),
  },
  "tx_500": {
    base: () => require("@/assets/lottie/trophies/tx_500.json"),
    t1: () => require("@/assets/lottie/trophies/tx_500_t1.json"),
    t2: () => require("@/assets/lottie/trophies/tx_500_t2.json"),
    t3: () => require("@/assets/lottie/trophies/tx_500_t3.json"),
    t4: () => require("@/assets/lottie/trophies/tx_500_t4.json"),
  },
  "streak_3": {
    base: () => require("@/assets/lottie/trophies/streak_3.json"),
    t1: () => require("@/assets/lottie/trophies/streak_3_t1.json"),
    t2: () => require("@/assets/lottie/trophies/streak_3_t2.json"),
    t3: () => require("@/assets/lottie/trophies/streak_3_t3.json"),
    t4: () => require("@/assets/lottie/trophies/streak_3_t4.json"),
  },
  "streak_14": {
    base: () => require("@/assets/lottie/trophies/streak_14.json"),
    t1: () => require("@/assets/lottie/trophies/streak_14_t1.json"),
    t2: () => require("@/assets/lottie/trophies/streak_14_t2.json"),
    t3: () => require("@/assets/lottie/trophies/streak_14_t3.json"),
    t4: () => require("@/assets/lottie/trophies/streak_14_t4.json"),
  },
  "streak_90": {
    base: () => require("@/assets/lottie/trophies/streak_90.json"),
    t1: () => require("@/assets/lottie/trophies/streak_90_t1.json"),
    t2: () => require("@/assets/lottie/trophies/streak_90_t2.json"),
    t3: () => require("@/assets/lottie/trophies/streak_90_t3.json"),
    t4: () => require("@/assets/lottie/trophies/streak_90_t4.json"),
  },
  "streak_365": {
    base: () => require("@/assets/lottie/trophies/streak_365.json"),
    t1: () => require("@/assets/lottie/trophies/streak_365_t1.json"),
    t2: () => require("@/assets/lottie/trophies/streak_365_t2.json"),
    t3: () => require("@/assets/lottie/trophies/streak_365_t3.json"),
    t4: () => require("@/assets/lottie/trophies/streak_365_t4.json"),
  },
  "budget_3mo": {
    base: () => require("@/assets/lottie/trophies/budget_3mo.json"),
    t1: () => require("@/assets/lottie/trophies/budget_3mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/budget_3mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/budget_3mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/budget_3mo_t4.json"),
  },
  "budget_6mo": {
    base: () => require("@/assets/lottie/trophies/budget_6mo.json"),
    t1: () => require("@/assets/lottie/trophies/budget_6mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/budget_6mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/budget_6mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/budget_6mo_t4.json"),
  },
  "budget_12mo": {
    base: () => require("@/assets/lottie/trophies/budget_12mo.json"),
    t1: () => require("@/assets/lottie/trophies/budget_12mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/budget_12mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/budget_12mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/budget_12mo_t4.json"),
  },
  "savings_1mo": {
    base: () => require("@/assets/lottie/trophies/savings_1mo.json"),
    t1: () => require("@/assets/lottie/trophies/savings_1mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/savings_1mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/savings_1mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/savings_1mo_t4.json"),
  },
  "savings_3mo": {
    base: () => require("@/assets/lottie/trophies/savings_3mo.json"),
    t1: () => require("@/assets/lottie/trophies/savings_3mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/savings_3mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/savings_3mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/savings_3mo_t4.json"),
  },
  "savings_elite": {
    base: () => require("@/assets/lottie/trophies/savings_elite.json"),
    t1: () => require("@/assets/lottie/trophies/savings_elite_t1.json"),
    t2: () => require("@/assets/lottie/trophies/savings_elite_t2.json"),
    t3: () => require("@/assets/lottie/trophies/savings_elite_t3.json"),
    t4: () => require("@/assets/lottie/trophies/savings_elite_t4.json"),
  },
  "wants_1mo": {
    base: () => require("@/assets/lottie/trophies/wants_1mo.json"),
    t1: () => require("@/assets/lottie/trophies/wants_1mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/wants_1mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/wants_1mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/wants_1mo_t4.json"),
  },
  "wants_3mo": {
    base: () => require("@/assets/lottie/trophies/wants_3mo.json"),
    t1: () => require("@/assets/lottie/trophies/wants_3mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/wants_3mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/wants_3mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/wants_3mo_t4.json"),
  },
  "five_categories_month": {
    base: () => require("@/assets/lottie/trophies/five_categories_month.json"),
    t1: () => require("@/assets/lottie/trophies/five_categories_month_t1.json"),
    t2: () => require("@/assets/lottie/trophies/five_categories_month_t2.json"),
    t3: () => require("@/assets/lottie/trophies/five_categories_month_t3.json"),
    t4: () => require("@/assets/lottie/trophies/five_categories_month_t4.json"),
  },
  "level_20": {
    base: () => require("@/assets/lottie/trophies/level_20.json"),
    t1: () => require("@/assets/lottie/trophies/level_20_t1.json"),
    t2: () => require("@/assets/lottie/trophies/level_20_t2.json"),
    t3: () => require("@/assets/lottie/trophies/level_20_t3.json"),
    t4: () => require("@/assets/lottie/trophies/level_20_t4.json"),
  },
  "level_50": {
    base: () => require("@/assets/lottie/trophies/level_50.json"),
    t1: () => require("@/assets/lottie/trophies/level_50_t1.json"),
    t2: () => require("@/assets/lottie/trophies/level_50_t2.json"),
    t3: () => require("@/assets/lottie/trophies/level_50_t3.json"),
    t4: () => require("@/assets/lottie/trophies/level_50_t4.json"),
  },
  "first_income": {
    base: () => require("@/assets/lottie/trophies/first_income.json"),
    t1: () => require("@/assets/lottie/trophies/first_income_t1.json"),
    t2: () => require("@/assets/lottie/trophies/first_income_t2.json"),
    t3: () => require("@/assets/lottie/trophies/first_income_t3.json"),
    t4: () => require("@/assets/lottie/trophies/first_income_t4.json"),
  },
  "positive_balance": {
    base: () => require("@/assets/lottie/trophies/positive_balance.json"),
    t1: () => require("@/assets/lottie/trophies/positive_balance_t1.json"),
    t2: () => require("@/assets/lottie/trophies/positive_balance_t2.json"),
    t3: () => require("@/assets/lottie/trophies/positive_balance_t3.json"),
    t4: () => require("@/assets/lottie/trophies/positive_balance_t4.json"),
  },
  "dizimo_3mo": {
    base: () => require("@/assets/lottie/trophies/dizimo_3mo.json"),
    t1: () => require("@/assets/lottie/trophies/dizimo_3mo_t1.json"),
    t2: () => require("@/assets/lottie/trophies/dizimo_3mo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/dizimo_3mo_t3.json"),
    t4: () => require("@/assets/lottie/trophies/dizimo_3mo_t4.json"),
  },
  // --- Monthly (sem tiers) ---
  "monthly_registros": {
    base: () => require("@/assets/lottie/trophies/monthly_registros.json"),
  },
  "monthly_equilibrado": {
    base: () => require("@/assets/lottie/trophies/monthly_equilibrado.json"),
  },
  "monthly_poupanca": {
    base: () => require("@/assets/lottie/trophies/monthly_poupanca.json"),
  },
  "monthly_controle": {
    base: () => require("@/assets/lottie/trophies/monthly_controle.json"),
  },
  "monthly_dizimo": {
    base: () => require("@/assets/lottie/trophies/monthly_dizimo.json"),
  },
  "monthly_saldo_positivo": {
    base: () => require("@/assets/lottie/trophies/monthly_saldo_positivo.json"),
  },
  // --- Sazonais (bronze = base, prata = t2, ouro = t3) ---
  "seasonal_ano_novo": {
    base: () => require("@/assets/lottie/trophies/seasonal_ano_novo.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_ano_novo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_ano_novo_t3.json"),
  },
  "seasonal_planejamento_anual": {
    base: () => require("@/assets/lottie/trophies/seasonal_planejamento_anual.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_planejamento_anual_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_planejamento_anual_t3.json"),
  },
  "seasonal_dia_de_reis": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_de_reis.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_de_reis_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_de_reis_t3.json"),
  },
  "seasonal_queima_velhos": {
    base: () => require("@/assets/lottie/trophies/seasonal_queima_velhos.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_queima_velhos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_queima_velhos_t3.json"),
  },
  "seasonal_carnaval": {
    base: () => require("@/assets/lottie/trophies/seasonal_carnaval.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_carnaval_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_carnaval_t3.json"),
  },
  "seasonal_valentine": {
    base: () => require("@/assets/lottie/trophies/seasonal_valentine.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_valentine_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_valentine_t3.json"),
  },
  "seasonal_quaresma": {
    base: () => require("@/assets/lottie/trophies/seasonal_quaresma.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_quaresma_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_quaresma_t3.json"),
  },
  "seasonal_mes_coracao": {
    base: () => require("@/assets/lottie/trophies/seasonal_mes_coracao.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_mes_coracao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_mes_coracao_t3.json"),
  },
  "seasonal_dia_mulher": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_mulher.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_mulher_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_mulher_t3.json"),
  },
  "seasonal_dia_consumidor": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_consumidor.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_consumidor_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_consumidor_t3.json"),
  },
  "seasonal_inicio_outono": {
    base: () => require("@/assets/lottie/trophies/seasonal_inicio_outono.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_inicio_outono_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_inicio_outono_t3.json"),
  },
  "seasonal_prep_pascoa": {
    base: () => require("@/assets/lottie/trophies/seasonal_prep_pascoa.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_prep_pascoa_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_prep_pascoa_t3.json"),
  },
  "seasonal_pascoa": {
    base: () => require("@/assets/lottie/trophies/seasonal_pascoa.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_pascoa_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_pascoa_t3.json"),
  },
  "seasonal_tiradentes": {
    base: () => require("@/assets/lottie/trophies/seasonal_tiradentes.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_tiradentes_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_tiradentes_t3.json"),
  },
  "seasonal_descobrimento": {
    base: () => require("@/assets/lottie/trophies/seasonal_descobrimento.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_descobrimento_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_descobrimento_t3.json"),
  },
  "seasonal_primavera": {
    base: () => require("@/assets/lottie/trophies/seasonal_primavera.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_primavera_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_primavera_t3.json"),
  },
  "seasonal_natal": {
    base: () => require("@/assets/lottie/trophies/seasonal_natal.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_natal_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_natal_t3.json"),
  },
  "seasonal_novembro_azul": {
    base: () => require("@/assets/lottie/trophies/seasonal_novembro_azul.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_novembro_azul_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_novembro_azul_t3.json"),
  },
  "seasonal_consciencia_negra": {
    base: () => require("@/assets/lottie/trophies/seasonal_consciencia_negra.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_consciencia_negra_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_consciencia_negra_t3.json"),
  },
  "seasonal_finados": {
    base: () => require("@/assets/lottie/trophies/seasonal_finados.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_finados_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_finados_t3.json"),
  },
  "seasonal_black_friday": {
    base: () => require("@/assets/lottie/trophies/seasonal_black_friday.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_black_friday_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_black_friday_t3.json"),
  },
  "seasonal_outubro_rosa": {
    base: () => require("@/assets/lottie/trophies/seasonal_outubro_rosa.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_outubro_rosa_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_outubro_rosa_t3.json"),
  },
  "seasonal_dia_criancas": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_criancas.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_criancas_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_criancas_t3.json"),
  },
  "seasonal_prep_natal": {
    base: () => require("@/assets/lottie/trophies/seasonal_prep_natal.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_prep_natal_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_prep_natal_t3.json"),
  },
  "seasonal_halloween": {
    base: () => require("@/assets/lottie/trophies/seasonal_halloween.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_halloween_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_halloween_t3.json"),
  },
  "seasonal_transito": {
    base: () => require("@/assets/lottie/trophies/seasonal_transito.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_transito_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_transito_t3.json"),
  },
  "seasonal_prep_crianca": {
    base: () => require("@/assets/lottie/trophies/seasonal_prep_crianca.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_prep_crianca_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_prep_crianca_t3.json"),
  },
  "seasonal_independencia": {
    base: () => require("@/assets/lottie/trophies/seasonal_independencia.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_independencia_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_independencia_t3.json"),
  },
  "seasonal_mes_boleto": {
    base: () => require("@/assets/lottie/trophies/seasonal_mes_boleto.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_mes_boleto_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_mes_boleto_t3.json"),
  },
  "seasonal_dia_trabalho": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_trabalho.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_trabalho_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_trabalho_t3.json"),
  },
  "seasonal_dia_maes": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_maes.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_maes_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_maes_t3.json"),
  },
  "seasonal_combate_fumo": {
    base: () => require("@/assets/lottie/trophies/seasonal_combate_fumo.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_combate_fumo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_combate_fumo_t3.json"),
  },
  "seasonal_abolicao": {
    base: () => require("@/assets/lottie/trophies/seasonal_abolicao.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_abolicao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_abolicao_t3.json"),
  },
  "seasonal_dia_namorados": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_namorados.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_namorados_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_namorados_t3.json"),
  },
  "seasonal_festa_junina": {
    base: () => require("@/assets/lottie/trophies/seasonal_festa_junina.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_festa_junina_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_festa_junina_t3.json"),
  },
  "seasonal_meio_ambiente": {
    base: () => require("@/assets/lottie/trophies/seasonal_meio_ambiente.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_meio_ambiente_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_meio_ambiente_t3.json"),
  },
  "seasonal_corpus_christi": {
    base: () => require("@/assets/lottie/trophies/seasonal_corpus_christi.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_corpus_christi_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_corpus_christi_t3.json"),
  },
  "seasonal_ferias_julho": {
    base: () => require("@/assets/lottie/trophies/seasonal_ferias_julho.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_ferias_julho_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_ferias_julho_t3.json"),
  },
  "seasonal_dia_avos": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_avos.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_avos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_avos_t3.json"),
  },
  "seasonal_nossa_sra_carmo": {
    base: () => require("@/assets/lottie/trophies/seasonal_nossa_sra_carmo.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_nossa_sra_carmo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_nossa_sra_carmo_t3.json"),
  },
  "seasonal_inverno": {
    base: () => require("@/assets/lottie/trophies/seasonal_inverno.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_inverno_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_inverno_t3.json"),
  },
  "seasonal_dia_pais": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_pais.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_pais_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_pais_t3.json"),
  },
  "seasonal_dia_estudante": {
    base: () => require("@/assets/lottie/trophies/seasonal_dia_estudante.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_dia_estudante_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_dia_estudante_t3.json"),
  },
  "seasonal_volta_aulas": {
    base: () => require("@/assets/lottie/trophies/seasonal_volta_aulas.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_volta_aulas_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_volta_aulas_t3.json"),
  },
  "seasonal_liquidacao_inverno": {
    base: () => require("@/assets/lottie/trophies/seasonal_liquidacao_inverno.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_liquidacao_inverno_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_liquidacao_inverno_t3.json"),
  },
  // --- Sazonais aprovados na Story 11.8 ---
  "seasonal_decimo_terceiro": {
    base: () => require("@/assets/lottie/trophies/seasonal_decimo_terceiro.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_decimo_terceiro_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_decimo_terceiro_t3.json"),
  },
  "seasonal_ferias_verao": {
    base: () => require("@/assets/lottie/trophies/seasonal_ferias_verao.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_ferias_verao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_ferias_verao_t3.json"),
  },
  "seasonal_balanco_anual": {
    base: () => require("@/assets/lottie/trophies/seasonal_balanco_anual.json"),
    t2: () => require("@/assets/lottie/trophies/seasonal_balanco_anual_t2.json"),
    t3: () => require("@/assets/lottie/trophies/seasonal_balanco_anual_t3.json"),
  },
  // --- Litúrgicos aprovados na Story 11.8 (bronze = base, prata = t2, ouro = t3) ---
  "lt_cinzas": {
    base: () => require("@/assets/lottie/trophies/lt_cinzas.json"),
    t2: () => require("@/assets/lottie/trophies/lt_cinzas_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_cinzas_t3.json"),
  },
  "lt_ramos": {
    base: () => require("@/assets/lottie/trophies/lt_ramos.json"),
    t2: () => require("@/assets/lottie/trophies/lt_ramos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_ramos_t3.json"),
  },
  "lt_quinta_santa": {
    base: () => require("@/assets/lottie/trophies/lt_quinta_santa.json"),
    t2: () => require("@/assets/lottie/trophies/lt_quinta_santa_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_quinta_santa_t3.json"),
  },
  "lt_sexta_paixao": {
    base: () => require("@/assets/lottie/trophies/lt_sexta_paixao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_sexta_paixao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_sexta_paixao_t3.json"),
  },
  "lt_pascoa": {
    base: () => require("@/assets/lottie/trophies/lt_pascoa.json"),
    t2: () => require("@/assets/lottie/trophies/lt_pascoa_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_pascoa_t3.json"),
  },
  "lt_ascensao": {
    base: () => require("@/assets/lottie/trophies/lt_ascensao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_ascensao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_ascensao_t3.json"),
  },
  "lt_pentecostes": {
    base: () => require("@/assets/lottie/trophies/lt_pentecostes.json"),
    t2: () => require("@/assets/lottie/trophies/lt_pentecostes_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_pentecostes_t3.json"),
  },
  "lt_corpus_christi": {
    base: () => require("@/assets/lottie/trophies/lt_corpus_christi.json"),
    t2: () => require("@/assets/lottie/trophies/lt_corpus_christi_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_corpus_christi_t3.json"),
  },
  "lt_sagrado_coracao": {
    base: () => require("@/assets/lottie/trophies/lt_sagrado_coracao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_sagrado_coracao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_sagrado_coracao_t3.json"),
  },
  "lt_advento": {
    base: () => require("@/assets/lottie/trophies/lt_advento.json"),
    t2: () => require("@/assets/lottie/trophies/lt_advento_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_advento_t3.json"),
  },
  "lt_maria_mae_deus": {
    base: () => require("@/assets/lottie/trophies/lt_maria_mae_deus.json"),
    t2: () => require("@/assets/lottie/trophies/lt_maria_mae_deus_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_maria_mae_deus_t3.json"),
  },
  "lt_epifania": {
    base: () => require("@/assets/lottie/trophies/lt_epifania.json"),
    t2: () => require("@/assets/lottie/trophies/lt_epifania_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_epifania_t3.json"),
  },
  "lt_batismo_senhor": {
    base: () => require("@/assets/lottie/trophies/lt_batismo_senhor.json"),
    t2: () => require("@/assets/lottie/trophies/lt_batismo_senhor_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_batismo_senhor_t3.json"),
  },
  "lt_antonio_abade": {
    base: () => require("@/assets/lottie/trophies/lt_antonio_abade.json"),
    t2: () => require("@/assets/lottie/trophies/lt_antonio_abade_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_antonio_abade_t3.json"),
  },
  "lt_sebastiao": {
    base: () => require("@/assets/lottie/trophies/lt_sebastiao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_sebastiao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_sebastiao_t3.json"),
  },
  "lt_ines": {
    base: () => require("@/assets/lottie/trophies/lt_ines.json"),
    t2: () => require("@/assets/lottie/trophies/lt_ines_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_ines_t3.json"),
  },
  "lt_francisco_sales": {
    base: () => require("@/assets/lottie/trophies/lt_francisco_sales.json"),
    t2: () => require("@/assets/lottie/trophies/lt_francisco_sales_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_francisco_sales_t3.json"),
  },
  "lt_conv_paulo": {
    base: () => require("@/assets/lottie/trophies/lt_conv_paulo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_conv_paulo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_conv_paulo_t3.json"),
  },
  "lt_tomas_aquino": {
    base: () => require("@/assets/lottie/trophies/lt_tomas_aquino.json"),
    t2: () => require("@/assets/lottie/trophies/lt_tomas_aquino_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_tomas_aquino_t3.json"),
  },
  "lt_joao_bosco": {
    base: () => require("@/assets/lottie/trophies/lt_joao_bosco.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_bosco_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_bosco_t3.json"),
  },
  "lt_apresentacao": {
    base: () => require("@/assets/lottie/trophies/lt_apresentacao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_apresentacao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_apresentacao_t3.json"),
  },
  "lt_bras": {
    base: () => require("@/assets/lottie/trophies/lt_bras.json"),
    t2: () => require("@/assets/lottie/trophies/lt_bras_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_bras_t3.json"),
  },
  "lt_agueda": {
    base: () => require("@/assets/lottie/trophies/lt_agueda.json"),
    t2: () => require("@/assets/lottie/trophies/lt_agueda_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_agueda_t3.json"),
  },
  "lt_lourdes": {
    base: () => require("@/assets/lottie/trophies/lt_lourdes.json"),
    t2: () => require("@/assets/lottie/trophies/lt_lourdes_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_lourdes_t3.json"),
  },
  "lt_valentim": {
    base: () => require("@/assets/lottie/trophies/lt_valentim.json"),
    t2: () => require("@/assets/lottie/trophies/lt_valentim_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_valentim_t3.json"),
  },
  "lt_cathedra_pedro": {
    base: () => require("@/assets/lottie/trophies/lt_cathedra_pedro.json"),
    t2: () => require("@/assets/lottie/trophies/lt_cathedra_pedro_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_cathedra_pedro_t3.json"),
  },
  "lt_perpetua_felicidade": {
    base: () => require("@/assets/lottie/trophies/lt_perpetua_felicidade.json"),
    t2: () => require("@/assets/lottie/trophies/lt_perpetua_felicidade_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_perpetua_felicidade_t3.json"),
  },
  "lt_patricio": {
    base: () => require("@/assets/lottie/trophies/lt_patricio.json"),
    t2: () => require("@/assets/lottie/trophies/lt_patricio_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_patricio_t3.json"),
  },
  "lt_jose_esposo": {
    base: () => require("@/assets/lottie/trophies/lt_jose_esposo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_jose_esposo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_jose_esposo_t3.json"),
  },
  "lt_anunciacao": {
    base: () => require("@/assets/lottie/trophies/lt_anunciacao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_anunciacao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_anunciacao_t3.json"),
  },
  "lt_isidoro_sevilha": {
    base: () => require("@/assets/lottie/trophies/lt_isidoro_sevilha.json"),
    t2: () => require("@/assets/lottie/trophies/lt_isidoro_sevilha_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_isidoro_sevilha_t3.json"),
  },
  "lt_joao_lasalle": {
    base: () => require("@/assets/lottie/trophies/lt_joao_lasalle.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_lasalle_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_lasalle_t3.json"),
  },
  "lt_carlo_acutis": {
    base: () => require("@/assets/lottie/trophies/lt_carlo_acutis.json"),
    t2: () => require("@/assets/lottie/trophies/lt_carlo_acutis_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_carlo_acutis_t3.json"),
  },
  "lt_jorge": {
    base: () => require("@/assets/lottie/trophies/lt_jorge.json"),
    t2: () => require("@/assets/lottie/trophies/lt_jorge_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_jorge_t3.json"),
  },
  "lt_marcos": {
    base: () => require("@/assets/lottie/trophies/lt_marcos.json"),
    t2: () => require("@/assets/lottie/trophies/lt_marcos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_marcos_t3.json"),
  },
  "lt_catarina_sena": {
    base: () => require("@/assets/lottie/trophies/lt_catarina_sena.json"),
    t2: () => require("@/assets/lottie/trophies/lt_catarina_sena_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_catarina_sena_t3.json"),
  },
  "lt_jose_operario": {
    base: () => require("@/assets/lottie/trophies/lt_jose_operario.json"),
    t2: () => require("@/assets/lottie/trophies/lt_jose_operario_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_jose_operario_t3.json"),
  },
  "lt_fatima": {
    base: () => require("@/assets/lottie/trophies/lt_fatima.json"),
    t2: () => require("@/assets/lottie/trophies/lt_fatima_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_fatima_t3.json"),
  },
  "lt_matias": {
    base: () => require("@/assets/lottie/trophies/lt_matias.json"),
    t2: () => require("@/assets/lottie/trophies/lt_matias_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_matias_t3.json"),
  },
  "lt_isidoro_lavrador": {
    base: () => require("@/assets/lottie/trophies/lt_isidoro_lavrador.json"),
    t2: () => require("@/assets/lottie/trophies/lt_isidoro_lavrador_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_isidoro_lavrador_t3.json"),
  },
  "lt_rita_cassia": {
    base: () => require("@/assets/lottie/trophies/lt_rita_cassia.json"),
    t2: () => require("@/assets/lottie/trophies/lt_rita_cassia_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_rita_cassia_t3.json"),
  },
  "lt_visitacao": {
    base: () => require("@/assets/lottie/trophies/lt_visitacao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_visitacao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_visitacao_t3.json"),
  },
  "lt_barnabe": {
    base: () => require("@/assets/lottie/trophies/lt_barnabe.json"),
    t2: () => require("@/assets/lottie/trophies/lt_barnabe_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_barnabe_t3.json"),
  },
  "lt_antonio": {
    base: () => require("@/assets/lottie/trophies/lt_antonio.json"),
    t2: () => require("@/assets/lottie/trophies/lt_antonio_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_antonio_t3.json"),
  },
  "lt_luis_gonzaga": {
    base: () => require("@/assets/lottie/trophies/lt_luis_gonzaga.json"),
    t2: () => require("@/assets/lottie/trophies/lt_luis_gonzaga_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_luis_gonzaga_t3.json"),
  },
  "lt_fisher_tomas_moro": {
    base: () => require("@/assets/lottie/trophies/lt_fisher_tomas_moro.json"),
    t2: () => require("@/assets/lottie/trophies/lt_fisher_tomas_moro_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_fisher_tomas_moro_t3.json"),
  },
  "lt_joao_batista": {
    base: () => require("@/assets/lottie/trophies/lt_joao_batista.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_batista_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_batista_t3.json"),
  },
  "lt_ireneu": {
    base: () => require("@/assets/lottie/trophies/lt_ireneu.json"),
    t2: () => require("@/assets/lottie/trophies/lt_ireneu_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_ireneu_t3.json"),
  },
  "lt_tome": {
    base: () => require("@/assets/lottie/trophies/lt_tome.json"),
    t2: () => require("@/assets/lottie/trophies/lt_tome_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_tome_t3.json"),
  },
  "lt_bento": {
    base: () => require("@/assets/lottie/trophies/lt_bento.json"),
    t2: () => require("@/assets/lottie/trophies/lt_bento_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_bento_t3.json"),
  },
  "lt_carmo": {
    base: () => require("@/assets/lottie/trophies/lt_carmo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_carmo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_carmo_t3.json"),
  },
  "lt_magdalena": {
    base: () => require("@/assets/lottie/trophies/lt_magdalena.json"),
    t2: () => require("@/assets/lottie/trophies/lt_magdalena_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_magdalena_t3.json"),
  },
  "lt_brigida": {
    base: () => require("@/assets/lottie/trophies/lt_brigida.json"),
    t2: () => require("@/assets/lottie/trophies/lt_brigida_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_brigida_t3.json"),
  },
  "lt_charbel": {
    base: () => require("@/assets/lottie/trophies/lt_charbel.json"),
    t2: () => require("@/assets/lottie/trophies/lt_charbel_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_charbel_t3.json"),
  },
  "lt_tiago": {
    base: () => require("@/assets/lottie/trophies/lt_tiago.json"),
    t2: () => require("@/assets/lottie/trophies/lt_tiago_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_tiago_t3.json"),
  },
  "lt_marta": {
    base: () => require("@/assets/lottie/trophies/lt_marta.json"),
    t2: () => require("@/assets/lottie/trophies/lt_marta_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_marta_t3.json"),
  },
  "lt_inacio_loyola": {
    base: () => require("@/assets/lottie/trophies/lt_inacio_loyola.json"),
    t2: () => require("@/assets/lottie/trophies/lt_inacio_loyola_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_inacio_loyola_t3.json"),
  },
  "lt_joao_vianney": {
    base: () => require("@/assets/lottie/trophies/lt_joao_vianney.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_vianney_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_vianney_t3.json"),
  },
  "lt_transfiguracao": {
    base: () => require("@/assets/lottie/trophies/lt_transfiguracao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_transfiguracao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_transfiguracao_t3.json"),
  },
  "lt_domingos": {
    base: () => require("@/assets/lottie/trophies/lt_domingos.json"),
    t2: () => require("@/assets/lottie/trophies/lt_domingos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_domingos_t3.json"),
  },
  "lt_lourenco": {
    base: () => require("@/assets/lottie/trophies/lt_lourenco.json"),
    t2: () => require("@/assets/lottie/trophies/lt_lourenco_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_lourenco_t3.json"),
  },
  "lt_clara": {
    base: () => require("@/assets/lottie/trophies/lt_clara.json"),
    t2: () => require("@/assets/lottie/trophies/lt_clara_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_clara_t3.json"),
  },
  "lt_kolbe": {
    base: () => require("@/assets/lottie/trophies/lt_kolbe.json"),
    t2: () => require("@/assets/lottie/trophies/lt_kolbe_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_kolbe_t3.json"),
  },
  "lt_assuncao": {
    base: () => require("@/assets/lottie/trophies/lt_assuncao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_assuncao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_assuncao_t3.json"),
  },
  "lt_bernardo": {
    base: () => require("@/assets/lottie/trophies/lt_bernardo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_bernardo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_bernardo_t3.json"),
  },
  "lt_maria_rainha": {
    base: () => require("@/assets/lottie/trophies/lt_maria_rainha.json"),
    t2: () => require("@/assets/lottie/trophies/lt_maria_rainha_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_maria_rainha_t3.json"),
  },
  "lt_bartolomeu": {
    base: () => require("@/assets/lottie/trophies/lt_bartolomeu.json"),
    t2: () => require("@/assets/lottie/trophies/lt_bartolomeu_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_bartolomeu_t3.json"),
  },
  "lt_monica": {
    base: () => require("@/assets/lottie/trophies/lt_monica.json"),
    t2: () => require("@/assets/lottie/trophies/lt_monica_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_monica_t3.json"),
  },
  "lt_agostinho": {
    base: () => require("@/assets/lottie/trophies/lt_agostinho.json"),
    t2: () => require("@/assets/lottie/trophies/lt_agostinho_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_agostinho_t3.json"),
  },
  "lt_joao_batista_mart": {
    base: () => require("@/assets/lottie/trophies/lt_joao_batista_mart.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_batista_mart_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_batista_mart_t3.json"),
  },
  "lt_gregorio_magno": {
    base: () => require("@/assets/lottie/trophies/lt_gregorio_magno.json"),
    t2: () => require("@/assets/lottie/trophies/lt_gregorio_magno_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_gregorio_magno_t3.json"),
  },
  "lt_natividade_maria": {
    base: () => require("@/assets/lottie/trophies/lt_natividade_maria.json"),
    t2: () => require("@/assets/lottie/trophies/lt_natividade_maria_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_natividade_maria_t3.json"),
  },
  "lt_pedro_claver": {
    base: () => require("@/assets/lottie/trophies/lt_pedro_claver.json"),
    t2: () => require("@/assets/lottie/trophies/lt_pedro_claver_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_pedro_claver_t3.json"),
  },
  "lt_exaltacao_cruz": {
    base: () => require("@/assets/lottie/trophies/lt_exaltacao_cruz.json"),
    t2: () => require("@/assets/lottie/trophies/lt_exaltacao_cruz_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_exaltacao_cruz_t3.json"),
  },
  "lt_dores_maria": {
    base: () => require("@/assets/lottie/trophies/lt_dores_maria.json"),
    t2: () => require("@/assets/lottie/trophies/lt_dores_maria_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_dores_maria_t3.json"),
  },
  "lt_mateus": {
    base: () => require("@/assets/lottie/trophies/lt_mateus.json"),
    t2: () => require("@/assets/lottie/trophies/lt_mateus_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_mateus_t3.json"),
  },
  "lt_pio_pietrelcina": {
    base: () => require("@/assets/lottie/trophies/lt_pio_pietrelcina.json"),
    t2: () => require("@/assets/lottie/trophies/lt_pio_pietrelcina_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_pio_pietrelcina_t3.json"),
  },
  "lt_cosme_damiao": {
    base: () => require("@/assets/lottie/trophies/lt_cosme_damiao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_cosme_damiao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_cosme_damiao_t3.json"),
  },
  "lt_vicente_paulo": {
    base: () => require("@/assets/lottie/trophies/lt_vicente_paulo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_vicente_paulo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_vicente_paulo_t3.json"),
  },
  "lt_arcanjos": {
    base: () => require("@/assets/lottie/trophies/lt_arcanjos.json"),
    t2: () => require("@/assets/lottie/trophies/lt_arcanjos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_arcanjos_t3.json"),
  },
  "lt_jeronimo": {
    base: () => require("@/assets/lottie/trophies/lt_jeronimo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_jeronimo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_jeronimo_t3.json"),
  },
  "lt_teresinha": {
    base: () => require("@/assets/lottie/trophies/lt_teresinha.json"),
    t2: () => require("@/assets/lottie/trophies/lt_teresinha_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_teresinha_t3.json"),
  },
  "lt_anjos_guarda": {
    base: () => require("@/assets/lottie/trophies/lt_anjos_guarda.json"),
    t2: () => require("@/assets/lottie/trophies/lt_anjos_guarda_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_anjos_guarda_t3.json"),
  },
  "lt_francisco_assis": {
    base: () => require("@/assets/lottie/trophies/lt_francisco_assis.json"),
    t2: () => require("@/assets/lottie/trophies/lt_francisco_assis_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_francisco_assis_t3.json"),
  },
  "lt_rosario": {
    base: () => require("@/assets/lottie/trophies/lt_rosario.json"),
    t2: () => require("@/assets/lottie/trophies/lt_rosario_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_rosario_t3.json"),
  },
  "lt_aparecida": {
    base: () => require("@/assets/lottie/trophies/lt_aparecida.json"),
    t2: () => require("@/assets/lottie/trophies/lt_aparecida_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_aparecida_t3.json"),
  },
  "lt_teresa_avila": {
    base: () => require("@/assets/lottie/trophies/lt_teresa_avila.json"),
    t2: () => require("@/assets/lottie/trophies/lt_teresa_avila_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_teresa_avila_t3.json"),
  },
  "lt_lucas": {
    base: () => require("@/assets/lottie/trophies/lt_lucas.json"),
    t2: () => require("@/assets/lottie/trophies/lt_lucas_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_lucas_t3.json"),
  },
  "lt_joao_paulo_ii": {
    base: () => require("@/assets/lottie/trophies/lt_joao_paulo_ii.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_paulo_ii_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_paulo_ii_t3.json"),
  },
  "lt_simao_judas": {
    base: () => require("@/assets/lottie/trophies/lt_simao_judas.json"),
    t2: () => require("@/assets/lottie/trophies/lt_simao_judas_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_simao_judas_t3.json"),
  },
  "lt_todos_santos": {
    base: () => require("@/assets/lottie/trophies/lt_todos_santos.json"),
    t2: () => require("@/assets/lottie/trophies/lt_todos_santos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_todos_santos_t3.json"),
  },
  "lt_fieis_defuntos": {
    base: () => require("@/assets/lottie/trophies/lt_fieis_defuntos.json"),
    t2: () => require("@/assets/lottie/trophies/lt_fieis_defuntos_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_fieis_defuntos_t3.json"),
  },
  "lt_martinho_porres": {
    base: () => require("@/assets/lottie/trophies/lt_martinho_porres.json"),
    t2: () => require("@/assets/lottie/trophies/lt_martinho_porres_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_martinho_porres_t3.json"),
  },
  "lt_carlos_borromeu": {
    base: () => require("@/assets/lottie/trophies/lt_carlos_borromeu.json"),
    t2: () => require("@/assets/lottie/trophies/lt_carlos_borromeu_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_carlos_borromeu_t3.json"),
  },
  "lt_basilica_laterao": {
    base: () => require("@/assets/lottie/trophies/lt_basilica_laterao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_basilica_laterao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_basilica_laterao_t3.json"),
  },
  "lt_martinho_tours": {
    base: () => require("@/assets/lottie/trophies/lt_martinho_tours.json"),
    t2: () => require("@/assets/lottie/trophies/lt_martinho_tours_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_martinho_tours_t3.json"),
  },
  "lt_isabel_hungria": {
    base: () => require("@/assets/lottie/trophies/lt_isabel_hungria.json"),
    t2: () => require("@/assets/lottie/trophies/lt_isabel_hungria_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_isabel_hungria_t3.json"),
  },
  "lt_apresentacao_maria": {
    base: () => require("@/assets/lottie/trophies/lt_apresentacao_maria.json"),
    t2: () => require("@/assets/lottie/trophies/lt_apresentacao_maria_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_apresentacao_maria_t3.json"),
  },
  "lt_cecilia": {
    base: () => require("@/assets/lottie/trophies/lt_cecilia.json"),
    t2: () => require("@/assets/lottie/trophies/lt_cecilia_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_cecilia_t3.json"),
  },
  "lt_nsa_gracas": {
    base: () => require("@/assets/lottie/trophies/lt_nsa_gracas.json"),
    t2: () => require("@/assets/lottie/trophies/lt_nsa_gracas_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_nsa_gracas_t3.json"),
  },
  "lt_andre": {
    base: () => require("@/assets/lottie/trophies/lt_andre.json"),
    t2: () => require("@/assets/lottie/trophies/lt_andre_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_andre_t3.json"),
  },
  "lt_francisco_xavier": {
    base: () => require("@/assets/lottie/trophies/lt_francisco_xavier.json"),
    t2: () => require("@/assets/lottie/trophies/lt_francisco_xavier_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_francisco_xavier_t3.json"),
  },
  "lt_nicolau": {
    base: () => require("@/assets/lottie/trophies/lt_nicolau.json"),
    t2: () => require("@/assets/lottie/trophies/lt_nicolau_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_nicolau_t3.json"),
  },
  "lt_ambrosio": {
    base: () => require("@/assets/lottie/trophies/lt_ambrosio.json"),
    t2: () => require("@/assets/lottie/trophies/lt_ambrosio_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_ambrosio_t3.json"),
  },
  "lt_imaculada": {
    base: () => require("@/assets/lottie/trophies/lt_imaculada.json"),
    t2: () => require("@/assets/lottie/trophies/lt_imaculada_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_imaculada_t3.json"),
  },
  "lt_luzia": {
    base: () => require("@/assets/lottie/trophies/lt_luzia.json"),
    t2: () => require("@/assets/lottie/trophies/lt_luzia_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_luzia_t3.json"),
  },
  "lt_joao_cruz": {
    base: () => require("@/assets/lottie/trophies/lt_joao_cruz.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_cruz_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_cruz_t3.json"),
  },
  "lt_natal": {
    base: () => require("@/assets/lottie/trophies/lt_natal.json"),
    t2: () => require("@/assets/lottie/trophies/lt_natal_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_natal_t3.json"),
  },
  "lt_estevao": {
    base: () => require("@/assets/lottie/trophies/lt_estevao.json"),
    t2: () => require("@/assets/lottie/trophies/lt_estevao_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_estevao_t3.json"),
  },
  "lt_joao_evangelista": {
    base: () => require("@/assets/lottie/trophies/lt_joao_evangelista.json"),
    t2: () => require("@/assets/lottie/trophies/lt_joao_evangelista_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_joao_evangelista_t3.json"),
  },
  "lt_santos_inocentes": {
    base: () => require("@/assets/lottie/trophies/lt_santos_inocentes.json"),
    t2: () => require("@/assets/lottie/trophies/lt_santos_inocentes_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_santos_inocentes_t3.json"),
  },
  "lt_pedro_paulo": {
    base: () => require("@/assets/lottie/trophies/lt_pedro_paulo.json"),
    t2: () => require("@/assets/lottie/trophies/lt_pedro_paulo_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_pedro_paulo_t3.json"),
  },
  "lt_santana": {
    base: () => require("@/assets/lottie/trophies/lt_santana.json"),
    t2: () => require("@/assets/lottie/trophies/lt_santana_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_santana_t3.json"),
  },
  "lt_cristo_rei": {
    base: () => require("@/assets/lottie/trophies/lt_cristo_rei.json"),
    t2: () => require("@/assets/lottie/trophies/lt_cristo_rei_t2.json"),
    t3: () => require("@/assets/lottie/trophies/lt_cristo_rei_t3.json"),
  },
};
