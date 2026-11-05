/**
 * Registro dos Lottie aprovados (approvedLottie.ts) e escolha de nível
 * (lottieTierSelection.ts) — Story 11.8. Sem react-native.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { APPROVED_LOTTIE } from "../approvedLottie";
import {
  lottieTierKey,
  selectLottieGetter,
  earnedSeasonalTier,
  currentMonthLottieTier,
  albumLottieTier,
  detailLottieTier,
  widgetLottieProps,
  resolveLottieSource,
  lottieSourceKey,
  staticLottieFrame,
  clampTier,
  type ApprovedLottieEntry,
} from "../lottieTierSelection";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import { getSeasonalTier, ALL_SEASONAL_TROPHIES } from "@packages/gamification/src/seasonalTrophies";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = require("../../../../scripts/lottie-lib");

const ROOT = path.resolve(__dirname, "../../../..");
const TROPHIES_DIR = path.join(ROOT, "assets/lottie/trophies");
const NOVOS_SAZONAIS = ["seasonal_decimo_terceiro", "seasonal_ferias_verao", "seasonal_balanco_anual"];

describe("APPROVED_LOTTIE", () => {
  const files: Map<string, Record<string, string>> = lib.readApprovedFiles();

  it("o arquivo lido pelos scripts tem os mesmos ids e níveis do registro carregado", () => {
    expect([...files.keys()].sort()).toEqual(Object.keys(APPROVED_LOTTIE).sort());
    for (const [id, tiers] of files) {
      expect(Object.keys(tiers).sort(), id).toEqual(Object.keys(APPROVED_LOTTIE[id]!).sort());
      for (const getter of Object.values(APPROVED_LOTTIE[id]!)) expect(typeof getter, id).toBe("function");
    }
  });

  it("todo litúrgico e os 3 sazonais novos têm bronze, prata e ouro (<id>, <id>_t2, <id>_t3), e os arquivos existem", () => {
    const ids = [...ALL_LITURGICAL_TROPHIES.map((t) => t.id), ...NOVOS_SAZONAIS];
    expect(ALL_LITURGICAL_TROPHIES).toHaveLength(114);
    for (const id of ids) {
      expect(files.get(id), id).toEqual({ base: `${id}.json`, t2: `${id}_t2.json`, t3: `${id}_t3.json` });
    }
  });

  it("os 48 sazonais de trophyData.ts e todos os lt_* estão no registro com bronze, prata e ouro", () => {
    expect(ALL_SEASONAL_TROPHIES).toHaveLength(48);
    const ids = [...ALL_SEASONAL_TROPHIES.map((t) => t.id), ...ALL_LITURGICAL_TROPHIES.map((t) => t.id)];
    for (const id of ids) {
      expect(APPROVED_LOTTIE[id], id).toBeDefined();
      expect(files.get(id), id).toMatchObject({ base: `${id}.json`, t2: `${id}_t2.json`, t3: `${id}_t3.json` });
    }
  });

  it("todo arquivo do registro existe em assets/lottie/trophies", () => {
    const list: string[] = lib.approvedFileList();
    expect(list.length).toBeGreaterThanOrEqual(351);
    for (const f of list) expect(fs.existsSync(path.join(TROPHIES_DIR, f)), f).toBe(true);
  });

  it("mantém os aprovados antes da Story 11.8 (ex.: conquista com t1..t4, mensal só base, sazonal antigo)", () => {
    expect(files.get("first_transaction")).toEqual({
      base: "first_transaction.json",
      t1: "first_transaction_t1.json",
      t2: "first_transaction_t2.json",
      t3: "first_transaction_t3.json",
      t4: "first_transaction_t4.json",
    });
    expect(files.get("monthly_registros")).toEqual({ base: "monthly_registros.json" });
    expect(files.get("seasonal_natal")).toEqual({
      base: "seasonal_natal.json",
      t2: "seasonal_natal_t2.json",
      t3: "seasonal_natal_t3.json",
    });
    expect(files.size).toBe(80 + 117);
  });
});

describe("nível → arquivo", () => {
  const getter = (name: string) => () => name;
  const registry: Record<string, ApprovedLottieEntry> = {
    lt_tome: { base: getter("lt_tome.json"), t2: getter("lt_tome_t2.json"), t3: getter("lt_tome_t3.json") },
    so_base: { base: getter("so_base.json") },
    conquista: { base: getter("c.json"), t1: getter("c_t1.json"), t3: getter("c_t3.json"), t4: getter("c_t4.json") },
  };
  const file = (id: string, ...args: Parameters<typeof lottieTierKey>) =>
    selectLottieGetter(registry, id, lottieTierKey(...args))?.();

  it("sazonal/litúrgico: 1 → bronze, 2 → prata, 3 (ou mais) → ouro, sem nível → bronze", () => {
    expect(file("lt_tome", "liturgical", { tier: 1 })).toBe("lt_tome.json");
    expect(file("lt_tome", "liturgical", { tier: 2 })).toBe("lt_tome_t2.json");
    expect(file("lt_tome", "liturgical", { tier: 3 })).toBe("lt_tome_t3.json");
    expect(file("lt_tome", "seasonal", { tier: 4 })).toBe("lt_tome_t3.json");
    expect(file("lt_tome", "seasonal", {})).toBe("lt_tome.json");
    // a raridade não muda o nível de sazonal/litúrgico
    expect(file("lt_tome", "seasonal", { rarity: "gold" })).toBe("lt_tome.json");
  });

  it("nível que falta no registro cai para base; id desconhecido → undefined (SVG)", () => {
    expect(file("so_base", "seasonal", { tier: 3 })).toBe("so_base.json");
    expect(file("conquista", "achievement", { rarity: "silver" })).toBe("c.json");
    expect(selectLottieGetter(registry, "nao_existe", "base")).toBeUndefined();
    expect(selectLottieGetter(registry, "toString", "base")).toBeUndefined();
  });

  it("conquista: raridade → t1..t4 (padrão ouro); mensal: base", () => {
    expect(file("conquista", "achievement", { rarity: "bronze" })).toBe("c_t1.json");
    expect(file("conquista", "achievement", { rarity: "gold" })).toBe("c_t3.json");
    expect(file("conquista", "achievement", { rarity: "diamond" })).toBe("c_t4.json");
    expect(file("conquista", "achievement", {})).toBe("c_t3.json");
    expect(lottieTierKey("monthly", { rarity: "diamond" })).toBe("base");
  });

  it("no registro real, lt_tome tier 1/2/3 escolhe o getter de cada nível", () => {
    const e = APPROVED_LOTTIE.lt_tome!;
    expect(selectLottieGetter(APPROVED_LOTTIE, "lt_tome", lottieTierKey("liturgical", { tier: 1 }))).toBe(e.base);
    expect(selectLottieGetter(APPROVED_LOTTIE, "lt_tome", lottieTierKey("liturgical", { tier: 2 }))).toBe(e.t2);
    expect(selectLottieGetter(APPROVED_LOTTIE, "lt_tome", lottieTierKey("liturgical", { tier: 3 }))).toBe(e.t3);
  });
});

describe("nível conquistado (estado reconstruído)", () => {
  const gam = {
    selectedSeasonalTrophies: [
      { trophyId: "lt_tome", monthKey: "2026-07", tier: 1 as const },
      { trophyId: "lt_tome", monthKey: "2027-07", tier: 3 as const },
      { trophyId: "lt_tome", monthKey: "2028-07", tier: 2 as const },
    ],
    completedSeasonalTrophies: [
      { trophyId: "lt_tome", monthKey: "2026-07", tier: 1 as const },
      { trophyId: "lt_tome", monthKey: "2027-07", tier: 3 as const },
    ],
  };

  it("concluído → nível gravado; não concluído → bronze", () => {
    expect(earnedSeasonalTier(gam, "lt_tome", "2026-07")).toBe(1);
    expect(earnedSeasonalTier(gam, "lt_tome", "2027-07")).toBe(3);
    expect(earnedSeasonalTier(gam, "lt_tome", "2028-07")).toBe(1);
    expect(earnedSeasonalTier({}, "lt_tome", "2026-07")).toBe(1);
  });

  it("sem tier na conclusão, usa o do sorteio", () => {
    const g = {
      selectedSeasonalTrophies: [{ trophyId: "x", monthKey: "2026-01", tier: 2 }],
      completedSeasonalTrophies: [{ trophyId: "x", monthKey: "2026-01" }],
    };
    expect(earnedSeasonalTier(g, "x", "2026-01")).toBe(2);
  });

  it("clampTier segue o getSeasonalTier: 1º bronze, 2º prata, 3º+ ouro", () => {
    const done = (n: number) => Array.from({ length: n }, (_, i) => ({ id: "x", monthKey: `202${i}-01` }));
    expect(clampTier(getSeasonalTier("x", done(0), "2030-01"))).toBe(1);
    expect(clampTier(getSeasonalTier("x", done(1), "2030-01"))).toBe(2);
    expect(clampTier(getSeasonalTier("x", done(5), "2030-01"))).toBe(3);
    expect(clampTier(undefined)).toBe(1);
    expect(clampTier(4)).toBe(3);
  });
});

describe("tier null ou string (eventos antigos)", () => {
  it("tier null na conclusão conta como ausente (usa o sorteio); \"2\" vira prata", () => {
    const g = {
      selectedSeasonalTrophies: [
        { trophyId: "x", monthKey: "2026-01", tier: 3 },
        { trophyId: "y", monthKey: "2026-01", tier: "2" },
      ],
      completedSeasonalTrophies: [
        { trophyId: "x", monthKey: "2026-01", tier: null },
        { trophyId: "y", monthKey: "2026-01", tier: "2" },
      ],
    };
    expect(earnedSeasonalTier(g, "x", "2026-01")).toBe(3);
    expect(earnedSeasonalTier(g, "y", "2026-01")).toBe(2);
    expect(clampTier("3")).toBe(3);
    expect(clampTier(null)).toBe(1);
    expect(clampTier("")).toBe(1);
    expect(clampTier("abc")).toBe(1);
    expect(lottieTierKey("seasonal", { tier: "2" })).toBe("t2");
    expect(lottieTierKey("seasonal", { tier: null })).toBe("base");
  });
});

describe("nível do Lottie por tela", () => {
  // Sorteado no ouro (tier 3) e ainda não concluído; mês passado concluído em prata.
  const gam = {
    selectedSeasonalTrophies: [
      { trophyId: "lt_tome", monthKey: "2026-10", tier: 3 },
      { trophyId: "seasonal_natal", monthKey: "2026-09", tier: 2 },
      { trophyId: "seasonal_pascoa", monthKey: "2026-08", tier: 3 },
    ],
    completedSeasonalTrophies: [{ trophyId: "seasonal_natal", monthKey: "2026-09", tier: 2 }],
  };

  it("álbum: sorteado no ouro mas não concluído → bronze (esmaecido); concluído → nível conquistado", () => {
    expect(albumLottieTier(gam, "lt_tome", "2026-10")).toBe(1);
    expect(albumLottieTier(gam, "seasonal_pascoa", "2026-08")).toBe(1);
    expect(albumLottieTier(gam, "seasonal_natal", "2026-09")).toBe(2);
  });

  it("card surpresa (mês atual): não concluído → nível em jogo (ouro); concluído → nível conquistado", () => {
    expect(currentMonthLottieTier(gam, "lt_tome", "2026-10")).toBe(3);
    expect(currentMonthLottieTier(gam, "seasonal_natal", "2026-09")).toBe(2);
    expect(currentMonthLottieTier({}, "lt_tome", "2026-10")).toBe(1);
  });

  it("detalhe: mês atual → nível em jogo; mês passado não concluído → bronze; concluído → conquistado", () => {
    expect(detailLottieTier(gam, "lt_tome", "2026-10", true)).toBe(3);
    expect(detailLottieTier(gam, "seasonal_pascoa", "2026-08", false)).toBe(1);
    expect(detailLottieTier(gam, "seasonal_natal", "2026-09", false)).toBe(2);
  });

  it("widget: nível sorteado do mês e tipo litúrgico para lt_*", () => {
    expect(widgetLottieProps({ id: "lt_tome", tier: 3 })).toEqual({ type: "liturgical", tier: 3 });
    expect(widgetLottieProps({ id: "seasonal_natal", tier: 2 })).toEqual({ type: "seasonal", tier: 2 });
    expect(widgetLottieProps({ id: "seasonal_natal", tier: undefined })).toEqual({ type: "seasonal", tier: 1 });
    // ouro no widget escolhe o arquivo _t3 (antes: rarity padrão gold → t3)
    const p = widgetLottieProps({ id: "seasonal_natal", tier: 3 });
    expect(selectLottieGetter(APPROVED_LOTTIE, "seasonal_natal", lottieTierKey(p.type, { tier: p.tier }))).toBe(
      APPROVED_LOTTIE.seasonal_natal!.t3,
    );
  });
});

describe("resolveLottieSource (fallback para o SVG)", () => {
  const registry: Record<string, ApprovedLottieEntry> = {
    ok: { base: () => ({ op: 90, nome: "ok" }), t2: () => ({ op: 60, nome: "ok_t2" }) },
    quebra: {
      base: () => {
        throw new Error("módulo ausente");
      },
      t3: () => ({ nome: "quebra_t3" }),
    },
  };
  const none = new Set<string>();

  it("resolve o nível pedido; id desconhecido → undefined", () => {
    expect(resolveLottieSource(registry, "ok", "base", none)).toEqual({ op: 90, nome: "ok" });
    expect(resolveLottieSource(registry, "ok", "t2", none)).toEqual({ op: 60, nome: "ok_t2" });
    expect(resolveLottieSource(registry, "nao_existe", "base", none)).toBeUndefined();
  });

  it("getter que lança → undefined; o outro nível do mesmo troféu ainda resolve", () => {
    expect(resolveLottieSource(registry, "quebra", "base", none)).toBeUndefined();
    expect(resolveLottieSource(registry, "quebra", "t3", none)).toEqual({ nome: "quebra_t3" });
  });

  it("falhas num conjunto: cada arquivo que falhou fica no SVG, os outros continuam", () => {
    const failed = new Set([lottieSourceKey("ok", "base"), lottieSourceKey("quebra", "t3")]);
    expect(resolveLottieSource(registry, "ok", "base", failed)).toBeUndefined();
    expect(resolveLottieSource(registry, "quebra", "t3", failed)).toBeUndefined();
    expect(resolveLottieSource(registry, "ok", "t2", failed)).toEqual({ op: 60, nome: "ok_t2" });
  });

  it("estático vai ao último quadro (op − 1; padrão 89)", () => {
    expect(staticLottieFrame({ op: 90 })).toBe(89);
    expect(staticLottieFrame({ op: 60 })).toBe(59);
    expect(staticLottieFrame(undefined)).toBe(89);
    expect(staticLottieFrame({})).toBe(89);
  });
});
