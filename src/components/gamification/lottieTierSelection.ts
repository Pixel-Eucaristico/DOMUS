/**
 * Escolha do arquivo Lottie por nível, sem react-native (testável no vitest).
 *
 * - Conquistas: a raridade escolhe t1..t4 (Bronze/Prata/Ouro/Diamante).
 * - Sazonais e litúrgicos: o nível conquistado (1º = bronze, 2º = prata,
 *   3º+ = ouro, como no `getSeasonalTier`) escolhe base/t2/t3; sem nível,
 *   bronze (base).
 * - Mensais: só base.
 * Nível ausente no registro cai para `base`; id fora do registro → undefined
 * (o chamador mostra o SVG).
 */

/**
 * Getter do JSON. O JSON vai no pacote do app de qualquer jeito; o getter só
 * adia a avaliação do módulo (parse/objeto em memória) até o troféu aparecer.
 */
export type LottieGetter = () => unknown;

export type LottieTierKey = "base" | "t1" | "t2" | "t3" | "t4";

export type ApprovedLottieEntry = { base: LottieGetter } & Partial<Record<Exclude<LottieTierKey, "base">, LottieGetter>>;

export type LottieTrophyType = "achievement" | "seasonal" | "liturgical" | "monthly";

/** Nível de sazonal/litúrgico: 1 = bronze, 2 = prata, 3 = ouro. */
export type TrophyTier = 1 | 2 | 3;

const RARITY_TO_TIER: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

/** Chave do nível no registro para o tipo de troféu. */
export function lottieTierKey(
  type: LottieTrophyType,
  { rarity, tier }: { rarity?: string; tier?: number | string | null } = {},
): LottieTierKey {
  if (type === "seasonal" || type === "liturgical") {
    const t = clampTier(tier);
    return t === 1 ? "base" : t === 2 ? "t2" : "t3";
  }
  if (type === "monthly") return "base";
  const n = RARITY_TO_TIER[rarity ?? "gold"] ?? 3;
  return `t${n}` as LottieTierKey;
}

/** Getter do nível pedido (ou `base`), ou undefined se o troféu não tem Lottie aprovado. */
export function selectLottieGetter(
  registry: Record<string, ApprovedLottieEntry>,
  trophyId: string,
  key: LottieTierKey,
): LottieGetter | undefined {
  const entry = Object.prototype.hasOwnProperty.call(registry, trophyId) ? registry[trophyId] : undefined;
  if (!entry) return undefined;
  return entry[key] ?? entry.base;
}

/** Registro de sazonais/litúrgicos no estado reconstruído (tier pode vir null ou "2" de eventos antigos). */
type SeasonalEntry = { trophyId: string; monthKey: string; tier?: number | string | null };

type SeasonalState = {
  selectedSeasonalTrophies?: SeasonalEntry[];
  completedSeasonalTrophies?: SeasonalEntry[];
};

function findEntry(list: SeasonalEntry[] | undefined, trophyId: string, monthKey: string) {
  return (list ?? []).find((e) => e.trophyId === trophyId && e.monthKey === monthKey);
}

/**
 * Nível conquistado de um sazonal/litúrgico num mês, a partir do estado
 * reconstruído: o `tier` da conclusão (SEASONAL_TROPHY_COMPLETED) ou, na
 * falta dele, o do sorteio (SEASONAL_TROPHY_SELECTED); não conquistado
 * naquele mês → bronze (1).
 */
export function earnedSeasonalTier(gamification: SeasonalState, trophyId: string, monthKey: string): TrophyTier {
  const done = findEntry(gamification.completedSeasonalTrophies, trophyId, monthKey);
  if (!done) return 1;
  if (done.tier != null) return clampTier(done.tier);
  return clampTier(findEntry(gamification.selectedSeasonalTrophies, trophyId, monthKey)?.tier);
}

/**
 * Troféu do mês atual (decisão do dono, 22/10/2026): concluído → nível
 * conquistado; ainda não concluído → o nível em jogo (o do sorteio), igual à
 * etiqueta, à cor e ao texto de compartilhamento.
 */
export function currentMonthLottieTier(gamification: SeasonalState, trophyId: string, monthKey: string): TrophyTier {
  const done = findEntry(gamification.completedSeasonalTrophies, trophyId, monthKey);
  if (done && done.tier != null) return clampTier(done.tier);
  return clampTier(findEntry(gamification.selectedSeasonalTrophies, trophyId, monthKey)?.tier);
}

/** Célula do álbum: nível conquistado; não concluído (inclusive o mês atual) → bronze esmaecido. */
export function albumLottieTier(gamification: SeasonalState, trophyId: string, monthKey: string): TrophyTier {
  return earnedSeasonalTier(gamification, trophyId, monthKey);
}

/** Detalhe aberto pelo álbum: mês atual mostra o nível em jogo; meses passados, o conquistado (ou bronze). */
export function detailLottieTier(
  gamification: SeasonalState,
  trophyId: string,
  monthKey: string,
  isCurrentMonth: boolean,
): TrophyTier {
  return isCurrentMonth
    ? currentMonthLottieTier(gamification, trophyId, monthKey)
    : earnedSeasonalTier(gamification, trophyId, monthKey);
}

/** Id de troféu litúrgico (`lt_*`). */
export function isLiturgicalTrophyId(trophyId: string): boolean {
  return trophyId.startsWith("lt_");
}

/**
 * Widget da tela inicial: `currentTrophy.tier` é o nível sorteado do mês atual
 * (o nível em jogo, mesma regra do card surpresa); `lt_*` → litúrgico.
 */
export function widgetLottieProps(currentTrophy: { id: string; tier?: number | string | null }): {
  type: "seasonal" | "liturgical";
  tier: TrophyTier;
} {
  return {
    type: isLiturgicalTrophyId(currentTrophy.id) ? "liturgical" : "seasonal",
    tier: clampTier(currentTrophy.tier),
  };
}

/** Converte um nível qualquer (ex.: 4 do DebugTools, "2", null) em 1, 2 ou 3. */
export function clampTier(tier: number | string | null | undefined): TrophyTier {
  const n = tier == null || tier === "" ? NaN : Number(tier);
  if (!Number.isFinite(n) || n < 2) return 1;
  return n >= 3 ? 3 : 2;
}

/** Chave usada para lembrar falhas de carregamento (por id + nível). */
export function lottieSourceKey(trophyId: string, key: LottieTierKey): string {
  return `${trophyId}:${key}`;
}

/**
 * Fonte do Lottie para id + nível, ou undefined (o chamador mostra o SVG):
 * id fora do registro, arquivo que já falhou (`failedKeys`) ou getter que lança.
 */
export function resolveLottieSource(
  registry: Record<string, ApprovedLottieEntry>,
  trophyId: string,
  key: LottieTierKey,
  failedKeys: ReadonlySet<string>,
): unknown {
  if (failedKeys.has(lottieSourceKey(trophyId, key))) return undefined;
  const getter = selectLottieGetter(registry, trophyId, key);
  if (!getter) return undefined;
  try {
    return getter() ?? undefined;
  } catch {
    return undefined;
  }
}

/** Último quadro da animação (os gerados têm op = 90 → quadro 89). */
export function staticLottieFrame(source: unknown): number {
  const op = (source as { op?: unknown } | null | undefined)?.op;
  return typeof op === "number" && Number.isFinite(op) && op >= 1 ? op - 1 : 89;
}
