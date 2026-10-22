/**
 * Story 11.7 — lote 1 de Lottie (3 sazonais + 10 litúrgicos de janeiro).
 * Confere a tabela de scripts/trophy-lot-1.js e os JSON gerados em
 * assets/lottie/trophies/ (verificações comuns em trophyLotChecks.ts).
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createRequire } from "node:module";
import { ALL_LITURGICAL_TROPHIES } from "../../packages/gamification/src/liturgicalTrophies/data";
import { ALL_SEASONAL_TROPHIES } from "../../packages/gamification/src/seasonalTrophies/trophyData";
import { checkLot, MEDAL_NAME, type Entry } from "./trophyLotChecks";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-1.js");
const TROPHIES: Entry[] = lot.TROPHIES;

describe("Lottie — lote 1", () => {
  it("tem os 3 sazonais e os 10 litúrgicos de janeiro", () => {
    const seasonal = TROPHIES.filter((e) => e.kind === "seasonal").map((e) => e.id).sort();
    expect(seasonal).toEqual(["seasonal_balanco_anual", "seasonal_decimo_terceiro", "seasonal_ferias_verao"]);

    const january = ALL_LITURGICAL_TROPHIES.filter((t) => t.month === 1).map((t) => t.id).sort();
    const liturgical = TROPHIES.filter((e) => e.kind === "liturgical").map((e) => e.id).sort();
    expect(liturgical).toEqual(january);
    expect(liturgical).toHaveLength(10);
  });

  it("todos os ids existem no app", () => {
    const appIds = new Set([...ALL_LITURGICAL_TROPHIES, ...ALL_SEASONAL_TROPHIES].map((t) => t.id));
    for (const e of TROPHIES) expect(appIds.has(e.id), e.id).toBe(true);
  });

  it("o filtro de nomes de medalha não pega palavras comuns", () => {
    for (const n of ["MedalFace", "MedalRim", "Disc", "Disco", "Aro", "G_Medal"]) expect(n).toMatch(MEDAL_NAME);
    for (const n of ["Primavera", "Disciplina", "Claro", "Trim", "Raros"]) expect(n).not.toMatch(MEDAL_NAME);
  });
});

checkLot({ name: "lote 1", lot, generator: path.resolve(__dirname, "../trophy-lot-1.js"), files: 39 });
