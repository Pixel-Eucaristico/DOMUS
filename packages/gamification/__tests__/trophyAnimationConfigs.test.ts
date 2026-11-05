import { describe, it, expect } from "vitest";
import {
  ALL_ACHIEVEMENTS,
  MONTHLY_TROPHIES,
  ALL_SEASONAL_TROPHIES,
  ALL_LITURGICAL_TROPHIES,
  TROPHY_ANIMATION_CONFIGS,
  CATEGORY_ANIMATION_PRESETS,
  DEFAULT_TROPHY_ANIMATION_CONFIG,
  getTrophyAnimationConfig,
  resolveActiveParticleCount,
  type PrimaryMotion,
  type SecondaryEffect,
  type EntryAnimation,
  type ParticleType,
} from "../index";

const VALID_PRIMARY_MOTIONS: PrimaryMotion[] = [
  "spin",
  "float",
  "bounce",
  "shake",
  "pulse",
  "swing",
];

const VALID_SECONDARY_EFFECTS: SecondaryEffect[] = [
  "glow",
  "sparkle",
  "trail",
  "ripple",
  "none",
];

const VALID_ENTRY_ANIMATIONS: EntryAnimation[] = [
  "scale",
  "fade",
  "slide",
  "flip",
];

const VALID_PARTICLES: ParticleType[] = [
  "stars",
  "hearts",
  "fire",
  "snow",
  "confetti",
  "none",
];

describe("TROPHY_ANIMATION_CONFIGS — Cobertura de Catálogo", () => {
  it("contém entrada explícita para cada conquista em ALL_ACHIEVEMENTS", () => {
    expect(ALL_ACHIEVEMENTS.length).toBeGreaterThan(0);
    for (const achievement of ALL_ACHIEVEMENTS) {
      const cfg = TROPHY_ANIMATION_CONFIGS[achievement.id];
      expect(cfg).toBeDefined();
      expect(getTrophyAnimationConfig(achievement.id)).toEqual(cfg);
    }
  });

  it("contém entrada explícita para cada troféu mensal em MONTHLY_TROPHIES", () => {
    expect(MONTHLY_TROPHIES.length).toBeGreaterThan(0);
    for (const monthly of MONTHLY_TROPHIES) {
      const cfg = TROPHY_ANIMATION_CONFIGS[monthly.id];
      expect(cfg).toBeDefined();
      expect(getTrophyAnimationConfig(monthly.id)).toEqual(cfg);
    }
  });

  it("contém entrada explícita para cada troféu sazonal em ALL_SEASONAL_TROPHIES", () => {
    expect(ALL_SEASONAL_TROPHIES.length).toBe(48);
    for (const seasonal of ALL_SEASONAL_TROPHIES) {
      const cfg = TROPHY_ANIMATION_CONFIGS[seasonal.id];
      expect(cfg).toBeDefined();
      expect(getTrophyAnimationConfig(seasonal.id)).toEqual(cfg);
    }
  });

  it("contém entrada explícita para cada troféu litúrgico em ALL_LITURGICAL_TROPHIES", () => {
    expect(ALL_LITURGICAL_TROPHIES.length).toBeGreaterThanOrEqual(73);
    for (const liturgical of ALL_LITURGICAL_TROPHIES) {
      const cfg = TROPHY_ANIMATION_CONFIGS[liturgical.id];
      expect(cfg).toBeDefined();
      expect(getTrophyAnimationConfig(liturgical.id)).toEqual(cfg);
    }
  });

  it("valida invariantes numéricos e de domínio em todas as configurações do mapa", () => {
    const entries = Object.entries(TROPHY_ANIMATION_CONFIGS);
    expect(entries.length).toBeGreaterThanOrEqual(167);

    for (const [, cfg] of entries) {
      expect(VALID_PRIMARY_MOTIONS.includes(cfg.primaryMotion)).toBe(true);
      expect(cfg.motionSpeed).toBeGreaterThan(0);
      expect(VALID_SECONDARY_EFFECTS.includes(cfg.secondaryEffect)).toBe(true);
      expect(VALID_ENTRY_ANIMATIONS.includes(cfg.entryAnimation)).toBe(true);
      expect(cfg.entryDuration).toBeGreaterThanOrEqual(0);
      expect(VALID_PARTICLES.includes(cfg.particles)).toBe(true);
      expect(cfg.particleCount).toBeGreaterThanOrEqual(0);
      expect(cfg.particleCount).toBeLessThanOrEqual(6);
    }
  });

  it("retorna cópia defensiva em getTrophyAnimationConfig sem mutar TROPHY_ANIMATION_CONFIGS", () => {
    const originalSpeed = TROPHY_ANIMATION_CONFIGS["streak_7"]!.motionSpeed;
    const resolved = getTrophyAnimationConfig("streak_7");
    resolved.motionSpeed = 99999;

    expect(TROPHY_ANIMATION_CONFIGS["streak_7"]!.motionSpeed).toBe(originalSpeed);
  });
});

describe("Identidade Temática por Categoria de Troféu", () => {
  it("atribui partículas de fogo e movimento pulse/shake aos troféus de streak", () => {
    const streak7 = getTrophyAnimationConfig("streak_7");
    const streak30 = getTrophyAnimationConfig("streak_30");
    const streak365 = getTrophyAnimationConfig("streak_365");

    expect(streak7.particles).toBe("fire");
    expect(streak30.particles).toBe("fire");
    expect(streak365.particles).toBe("fire");
    expect(["pulse", "shake"].includes(streak7.primaryMotion)).toBe(true);
    expect(streak365.motionSpeed).toBeLessThan(streak7.motionSpeed);
  });

  it("atribui partículas de festa (confetti/fire/snow) aos troféus sazonais festivos", () => {
    const carnaval = getTrophyAnimationConfig("seasonal_carnaval");
    const natal = getTrophyAnimationConfig("seasonal_natal");
    const maes = getTrophyAnimationConfig("seasonal_dia_maes");

    expect(carnaval.particles).toBe("confetti");
    expect(natal.particles).toBe("snow");
    expect(maes.particles).toBe("hearts");
  });

  it("atribui animação solene (float/glow/stars) aos troféus litúrgicos e religiosos", () => {
    const pascoa = getTrophyAnimationConfig("lt_pascoa");
    const dizimo = getTrophyAnimationConfig("first_dizimo");

    expect(pascoa.primaryMotion).toBe("float");
    expect(pascoa.secondaryEffect).toBe("glow");
    expect(pascoa.particles).toBe("stars");
    expect(dizimo.secondaryEffect).toBe("glow");
  });

  it("diferencia troféus mensais com animações de selo/escala e efeitos distintos", () => {
    const registros = getTrophyAnimationConfig("monthly_registros");
    const poupanca = getTrophyAnimationConfig("monthly_poupanca");

    expect(registros.entryAnimation).toBe("scale");
    expect(poupanca.entryAnimation).toBe("scale");
    expect(registros.primaryMotion).not.toBe(poupanca.primaryMotion);
  });
});

describe("getTrophyAnimationConfig — Fallbacks e Casos de Borda", () => {
  it("resolve séries infinitas e IDs desconhecidos pelo prefixo da categoria", () => {
    expect(getTrophyAnimationConfig("streak_730")).toEqual(
      CATEGORY_ANIMATION_PRESETS.streak,
    );
    expect(getTrophyAnimationConfig("tx_1000")).toEqual(
      CATEGORY_ANIMATION_PRESETS.transaction,
    );
    expect(getTrophyAnimationConfig("budget_24mo")).toEqual(
      CATEGORY_ANIMATION_PRESETS.financial,
    );
    expect(getTrophyAnimationConfig("savings_6mo")).toEqual(
      CATEGORY_ANIMATION_PRESETS.financial,
    );
    expect(getTrophyAnimationConfig("wants_6mo")).toEqual(
      CATEGORY_ANIMATION_PRESETS.financial,
    );
    expect(getTrophyAnimationConfig("dizimo_6mo")).toEqual(
      CATEGORY_ANIMATION_PRESETS.religious,
    );
    expect(getTrophyAnimationConfig("level_100")).toEqual(
      CATEGORY_ANIMATION_PRESETS.level,
    );
    expect(getTrophyAnimationConfig("lt_novo_santo")).toEqual(
      CATEGORY_ANIMATION_PRESETS.religious,
    );
    expect(getTrophyAnimationConfig("monthly_novo")).toEqual(
      CATEGORY_ANIMATION_PRESETS.monthly,
    );
    expect(getTrophyAnimationConfig("monthly_dizimo_extra")).toEqual(
      CATEGORY_ANIMATION_PRESETS.monthly,
    );
    expect(getTrophyAnimationConfig("seasonal_familia_nova")).toEqual(
      CATEGORY_ANIMATION_PRESETS.seasonal_family,
    );
    expect(getTrophyAnimationConfig("seasonal_festa_nova")).toEqual(
      CATEGORY_ANIMATION_PRESETS.seasonal_party,
    );
    expect(getTrophyAnimationConfig("seasonal_novo_evento")).toEqual(
      CATEGORY_ANIMATION_PRESETS.seasonal_economy,
    );
  });

  it("retorna DEFAULT_TROPHY_ANIMATION_CONFIG para ID vazio, undefined ou chaves de Object.prototype", () => {
    expect(getTrophyAnimationConfig(undefined)).toEqual(
      DEFAULT_TROPHY_ANIMATION_CONFIG,
    );
    expect(getTrophyAnimationConfig("")).toEqual(
      DEFAULT_TROPHY_ANIMATION_CONFIG,
    );
    expect(getTrophyAnimationConfig("   ")).toEqual(
      DEFAULT_TROPHY_ANIMATION_CONFIG,
    );
    expect(getTrophyAnimationConfig("constructor")).toEqual(
      DEFAULT_TROPHY_ANIMATION_CONFIG,
    );
    expect(getTrophyAnimationConfig("toString")).toEqual(
      DEFAULT_TROPHY_ANIMATION_CONFIG,
    );
  });

  it("respeita options.isLiturgical e options.rarity em IDs desconhecidos", () => {
    const liturgicalFallback = getTrophyAnimationConfig("custom_saint", {
      isLiturgical: true,
    });
    expect(liturgicalFallback).toEqual(CATEGORY_ANIMATION_PRESETS.religious);

    const diamondFallback = getTrophyAnimationConfig("unknown_trophy", {
      rarity: "diamond",
    });
    expect(diamondFallback.effectColor).toBe("#4FC3F7");
    expect(diamondFallback.particleCount).toBe(5);

    const silverFallback = getTrophyAnimationConfig("unknown_trophy", {
      rarity: "silver",
    });
    expect(silverFallback.effectColor).toBe("#B0B0B0");
    expect(silverFallback.particleCount).toBe(2);
  });
});

describe("resolveActiveParticleCount", () => {
  it("retorna 0 quando isStatic é true, particles é 'none' ou particleCount <= 0", () => {
    expect(
      resolveActiveParticleCount({ particles: "stars", particleCount: 5 }, true),
    ).toBe(0);
    expect(
      resolveActiveParticleCount({ particles: "none", particleCount: 5 }, false),
    ).toBe(0);
    expect(
      resolveActiveParticleCount({ particles: "stars", particleCount: 0 }, false),
    ).toBe(0);
  });

  it("retorna a contagem ativa limitada ao máximo de slots", () => {
    expect(
      resolveActiveParticleCount({ particles: "fire", particleCount: 4 }, false, 6),
    ).toBe(4);
    expect(
      resolveActiveParticleCount({ particles: "confetti", particleCount: 99 }, false, 6),
    ).toBe(6);
  });
});
