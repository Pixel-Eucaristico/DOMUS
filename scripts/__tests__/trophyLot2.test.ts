/**
 * Story 11.7 — lote 2 de Lottie (21 litúrgicos de fevereiro a abril).
 * Confere a tabela de scripts/trophy-lot-2.js, os JSON gerados em
 * assets/lottie/trophies/ (verificações comuns em trophyLotChecks.ts) e que
 * nenhum desenho se repete entre os dois lotes.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createRequire } from "node:module";
import { ALL_LITURGICAL_TROPHIES } from "../../packages/gamification/src/liturgicalTrophies/data";
import { checkLot, designFingerprint, readLottie, type Entry } from "./trophyLotChecks";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-2.js");
const lot1 = require("../trophy-lot-1.js");
const TROPHIES: Entry[] = lot.TROPHIES;

/** Cor litúrgica esperada: mártires, Domingo de Ramos e Sexta-Feira da Paixão em vermelho; Cinzas em roxo. */
const VERMELHO = ["lt_bras", "lt_agueda", "lt_valentim", "lt_perpetua_felicidade", "lt_ramos", "lt_sexta_paixao", "lt_jorge", "lt_marcos"];

describe("Lottie — lote 2", () => {
  it("tem os 21 litúrgicos de fevereiro a abril, e só eles", () => {
    const expected = ALL_LITURGICAL_TROPHIES.filter((t) => t.month >= 2 && t.month <= 4).map((t) => t.id).sort();
    const ids = TROPHIES.map((e) => e.id).sort();
    expect(ids).toEqual(expected);
    expect(ids).toHaveLength(21);
    expect(TROPHIES.every((e) => e.kind === "liturgical")).toBe(true);
  });

  it("cor litúrgica de cada festa", () => {
    for (const e of TROPHIES) {
      const cor = e.id === "lt_cinzas" ? "roxo" : VERMELHO.includes(e.id) ? "vermelho" : "branco";
      expect(e.color, e.id).toBe(cor);
    }
  });

  it("nenhum troféu repete o desenho do lote 1 (peça principal e geometria do gesto)", () => {
    const all: Entry[] = [...lot1.TROPHIES, ...TROPHIES];
    expect(() => lot.checkUniqueIcons(all)).not.toThrow();
    const prints = all.map((e) => designFingerprint(readLottie(`${e.id}.json`)));
    expect(new Set(prints).size).toBe(prints.length);
  });

  it("não há ids em comum com o lote 1", () => {
    const one = new Set(lot1.TROPHIES.map((e: Entry) => e.id));
    for (const e of TROPHIES) expect(one.has(e.id), e.id).toBe(false);
  });
});

checkLot({ name: "lote 2", lot, generator: path.resolve(__dirname, "../trophy-lot-2.js"), files: 63 });
