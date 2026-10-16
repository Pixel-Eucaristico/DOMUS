import { describe, it, expect } from "vitest";
import {
  ALL_ACHIEVEMENTS,
  MONTHLY_TROPHIES,
  ALL_SEASONAL_TROPHIES,
  ALL_LITURGICAL_TROPHIES,
} from "@packages/gamification";
import {
  CATEGORY_CONFIGS,
  TROPHY_OVERRIDES,
  getTrophyAnimationCategory,
  getTrophyAnimationConfig,
  type TrophyAnimationConfig,
} from "../trophyAnimationConfigs";

const ALL_IDS = [
  ...ALL_ACHIEVEMENTS.map((t) => t.id),
  ...MONTHLY_TROPHIES.map((t) => t.id),
  ...ALL_SEASONAL_TROPHIES.map((t) => t.id),
  ...ALL_LITURGICAL_TROPHIES.map((t) => t.id),
];

function expectValid(c: TrophyAnimationConfig) {
  expect(["spin", "float", "bounce", "shake", "pulse", "swing"]).toContain(c.primaryMotion);
  expect(["glow", "sparkle", "ripple", "none"]).toContain(c.secondaryEffect);
  expect(["scale", "fade", "slide", "flip"]).toContain(c.entryAnimation);
  expect(["stars", "hearts", "fire", "snow", "confetti", "coins", "none"]).toContain(c.particles);
  expect(c.motionSpeed).toBeGreaterThanOrEqual(800);
  expect(c.motionSpeed).toBeLessThanOrEqual(8000);
  expect(c.entryDuration).toBeGreaterThan(0);
  expect(c.particleCount).toBeGreaterThanOrEqual(0);
  expect(c.particleCount).toBeLessThanOrEqual(12);
  if (c.particles === "none") expect(c.particleCount).toBe(0);
  else expect(c.particleCount).toBeGreaterThan(0);
}

describe("trophyAnimationConfigs", () => {
  it("cobre todos os troféus do app com configuração válida", () => {
    expect(ALL_IDS.length).toBeGreaterThanOrEqual(167);
    for (const id of ALL_IDS) expectValid(getTrophyAnimationConfig(id));
  });

  it("toda categoria e todo override geram configuração válida", () => {
    Object.values(CATEGORY_CONFIGS).forEach(expectValid);
    Object.keys(TROPHY_OVERRIDES).forEach((id) => expectValid(getTrophyAnimationConfig(id)));
  });

  it("overrides só referenciam troféus existentes", () => {
    const known = new Set(ALL_IDS);
    expect(Object.keys(TROPHY_OVERRIDES).filter((id) => !known.has(id))).toEqual([]);
  });

  it("todo troféu sazonal tem categoria explícita (sem cair no padrão)", () => {
    // seasonal_* sem mapeamento cairia em "festive"; garantimos o mapeamento proposital
    const festive = ALL_SEASONAL_TROPHIES.filter((t) => getTrophyAnimationCategory(t.id) === "festive").map((t) => t.id);
    expect(festive.sort()).toEqual([
      "seasonal_ano_novo",
      "seasonal_carnaval",
      "seasonal_dia_criancas",
      "seasonal_festa_junina",
      "seasonal_halloween",
      "seasonal_independencia",
      "seasonal_queima_velhos",
    ]);
  });

  it.each([
    ["streak_30", "streak"],
    ["tx_100", "transaction"],
    ["ten_transactions", "transaction"],
    ["budget_6mo", "financial"],
    ["level_20", "level"],
    ["first_dizimo", "religious"],
    ["dizimo_3mo", "religious"],
    ["monthly_controle", "monthly"],
    ["seasonal_black_friday", "economy"],
    ["seasonal_dia_maes", "family"],
    ["lt_aparecida", "marian"],
    ["lt_lourenco", "martyr"],
    ["lt_arcanjos", "angelic"],
    ["lt_pascoa", "liturgical_feast"],
    ["lt_tomas_aquino", "liturgical"],
    [undefined, "transaction"],
  ])("%s → %s", (id, category) => {
    expect(getTrophyAnimationCategory(id)).toBe(category);
  });

  it("override sobrescreve só os campos informados", () => {
    const c = getTrophyAnimationConfig("streak_365");
    expect(c.particleCount).toBe(9);
    expect(c.particles).toBe("fire");
    expect(c.primaryMotion).toBe(CATEGORY_CONFIGS.streak.primaryMotion);
  });

  it("troféus diferentes da mesma categoria podem ter animações distintas", () => {
    const distinct = new Set(ALL_IDS.map((id) => JSON.stringify(getTrophyAnimationConfig(id))));
    expect(distinct.size).toBeGreaterThanOrEqual(40);
  });
});
