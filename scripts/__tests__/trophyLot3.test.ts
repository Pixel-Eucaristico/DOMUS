/**
 * Story 11.7 — lote 3 de Lottie (27 litúrgicos de maio a julho).
 * Confere a tabela de scripts/trophy-lot-3.js, os JSON gerados em
 * assets/lottie/trophies/ (verificações comuns em trophyLotChecks.ts), que
 * nenhum desenho se repete entre os três lotes e as regras da §6 do guia
 * (busto de pessoa atrás do que fica na frente dela).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ALL_LITURGICAL_TROPHIES } from "../../packages/gamification/src/liturgicalTrophies/data";
import { checkLot, designFingerprint, readLottie, type Entry } from "./trophyLotChecks";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-3.js");
const lot1 = require("../trophy-lot-1.js");
const lot2 = require("../trophy-lot-2.js");
const TROPHIES: Entry[] = lot.TROPHIES;

/** Cor litúrgica esperada: mártires e apóstolos e Pentecostes em vermelho; o resto em branco. */
const VERMELHO = ["lt_matias", "lt_pentecostes", "lt_barnabe", "lt_fisher_tomas_moro", "lt_ireneu", "lt_pedro_paulo", "lt_tome", "lt_tiago"];

const nomes = (f: string): string[] => readLottie(f).layers.map((ly: any) => ly.nm);
const niveis = (id: string) => [`${id}.json`, `${id}_t2.json`, `${id}_t3.json`];

describe("Lottie — lote 3", () => {
  it("tem os 27 litúrgicos de maio a julho, e só eles (Pedro e Paulo e Sant'Ana inclusive)", () => {
    const expected = ALL_LITURGICAL_TROPHIES.filter((t) => t.month >= 5 && t.month <= 7).map((t) => t.id).sort();
    const ids = TROPHIES.map((e) => e.id).sort();
    expect(ids).toEqual(expected);
    expect(ids).toHaveLength(27);
    expect(ids).toContain("lt_pedro_paulo");
    expect(ids).toContain("lt_santana");
    expect(TROPHIES.every((e) => e.kind === "liturgical")).toBe(true);
  });

  it("cor litúrgica de cada festa", () => {
    for (const e of TROPHIES) expect(e.color, e.id).toBe(VERMELHO.includes(e.id) ? "vermelho" : "branco");
  });

  it("nenhum troféu repete id nem desenho dos lotes 1 e 2 (peça principal e geometria do gesto)", () => {
    const all: Entry[] = [...lot1.TROPHIES, ...lot2.TROPHIES, ...TROPHIES];
    expect(() => lot.checkUniqueIds(all)).not.toThrow();
    expect(() => lot.checkUniqueIcons(all)).not.toThrow();
    const prints = all.map((e) => designFingerprint(readLottie(`${e.id}.json`)));
    expect(new Set(prints).size).toBe(prints.length);
  });

  it("santo como pessoa é o busto simples (rosto, olhos, veste), como Maria e Águeda", () => {
    const BUSTOS: Record<string, string[][]> = {
      lt_fatima: [["G_Maria"], ["G_Maria", "T2_Pastorinhos"], ["G_Maria", "T2_Pastorinhos"]],
      lt_visitacao: [["G_Maria", "G_Isabel"], ["G_Maria", "G_Isabel"], ["G_Maria", "G_Isabel"]],
      lt_antonio: [["G_Menino"], ["G_Menino"], ["G_Menino"]],
      lt_santana: [["G_Ana", "G_Joaquim", "G_Menina"], ["G_Ana", "G_Joaquim", "G_Menina"], ["G_Ana", "G_Joaquim", "G_Menina"]],
      lt_carmo: [[], [], ["T3_Maria"]],
    };
    for (const [id, porNivel] of Object.entries(BUSTOS)) {
      niveis(id).forEach((f, k) => {
        for (const nm of porNivel[k]) {
          const ly = readLottie(f).layers.find((l: any) => l.nm === nm);
          expect(ly, `${f} ${nm}`).toBeDefined();
          const grupos = ly.shapes.map((g: any) => g.nm);
          for (const g of ["Rosto", "Olhos", "Veste"]) expect(grupos, `${f} ${nm}`).toContain(g);
        }
      });
    }
  });

  it("o busto fica atrás do que está na frente dele, nos três níveis", () => {
    // [na frente, atrás]: as camadas vão da frente para trás, então a da frente vem antes
    const ORDEM: Record<string, [string, string][]> = {
      lt_fatima: [["G_Nuvem", "G_Maria"], ["G_Copa", "G_Maria"]],
      lt_visitacao: [["G_Abraco", "G_Maria"], ["G_Maria", "G_Isabel"]],
      lt_antonio: [["G_Livro", "G_Menino"]],
      lt_santana: [["G_Menina", "G_Ana"], ["G_Menina", "G_Joaquim"]],
    };
    for (const [id, pares] of Object.entries(ORDEM)) {
      for (const f of niveis(id)) {
        const ns = nomes(f);
        for (const [frente, atras] of pares) {
          expect(ns, f).toContain(frente);
          expect(ns, f).toContain(atras);
          expect(ns.indexOf(frente), `${f}: ${frente} na frente de ${atras}`).toBeLessThan(ns.indexOf(atras));
        }
      }
    }
    // os acréscimos que ficam na frente das pessoas
    for (const f of ["lt_santana_t2.json", "lt_santana_t3.json"]) expect(nomes(f).indexOf("T2_Livro"), f).toBeLessThan(nomes(f).indexOf("G_Menina"));
    const carmo = nomes("lt_carmo_t3.json");
    for (const nm of ["G_Panos", "G_Cordao"]) expect(carmo.indexOf(nm)).toBeLessThan(carmo.indexOf("T3_Maria"));
  });

  it("terço, escapulário, custódia, medalha de São Bento e crucifixo são desenhados, não emoji", () => {
    expect(nomes("lt_luis_gonzaga_t2.json")).toContain("T2_Terco");
    const terco = readLottie("lt_luis_gonzaga_t2.json").layers.find((ly: any) => ly.nm === "T2_Terco");
    expect(terco.shapes.map((g: any) => g.nm)).toEqual(expect.arrayContaining(["Crucifixo", "ContasGrandes", "ContasPequenas"]));
    const icons = (f: string) => JSON.stringify(readLottie(f)).match(/twemoji-[0-9a-f]+/g) || [];
    // 📿 (1f4ff), 🏅 (1f3c5), ✝ (271d), ⛪ (26ea) não entram neste lote
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) for (const key of icons(f)) expect(["twemoji-1f4ff", "twemoji-1f3c5", "twemoji-271d", "twemoji-26ea"], `${f}: ${key}`).not.toContain(key);
    }
    for (const [id, icon] of [["lt_carmo", "desenho-escapulario"], ["lt_corpus_christi", "desenho-custodia"], ["lt_bento", "desenho-medalha-sao-bento"], ["lt_luis_gonzaga", "desenho-crucifixo"]]) {
      expect(TROPHIES.find((e) => e.id === id)!.icon, id).toBe(icon);
      expect(lot.DRAWN[icon], icon).toBeDefined();
    }
  });

  it("peça principal desenhada: `uses` lista as peças da tabela que ela embrulha, e nenhuma é a peça principal de outro troféu", () => {
    const all: Entry[] = [...lot1.TROPHIES, ...lot2.TROPHIES, ...TROPHIES];
    const mains = new Set(all.map((e) => e.icon));
    // nome dos grupos de peça da tabela: "<chave>_<n>" ou "<chave>#<k>_<n>"
    const PECA = /^((?:twemoji|bootstrap)-[a-z0-9-]+?)(?:#\d+)?_\d+$/;
    for (const e of TROPHIES) {
      const usadas = new Set<string>();
      for (const ly of readLottie(`${e.id}.json`).layers.filter((l: any) => /^G_/.test(l.nm))) {
        for (const g of ly.shapes) {
          const m = PECA.exec(g.nm);
          if (m) usadas.add(m[1]);
        }
      }
      const drawn = lot.DRAWN[e.icon];
      if (!drawn) {
        // peça principal da tabela: o gesto só usa ela mesma
        expect([...usadas], e.id).toEqual([e.icon]);
        continue;
      }
      expect(Array.isArray(drawn.uses), `${e.icon}: uses`).toBe(true);
      expect([...usadas].sort(), `${e.id}: peças do gesto = uses de ${e.icon}`).toEqual([...drawn.uses].sort());
      for (const key of drawn.uses) expect(mains.has(key), `${e.icon} embrulha ${key}, peça principal de outro troféu`).toBe(false);
    }
    // a verificação do gerador recusa uma peça desenhada que embrulha a peça principal de outro troféu
    const fake = [{ id: "a", kind: "liturgical", icon: "desenho-arado" }, { id: "b", kind: "liturgical", icon: "twemoji-1f331" }];
    expect(() => lot.checkUniqueIcons(fake)).toThrow(/embrulha twemoji-1f331, peça principal de b/);
  });

  it("São Pedro e São Paulo: a rede tem fios nas duas diagonais", () => {
    for (const f of ["lt_pedro_paulo_t2.json", "lt_pedro_paulo_t3.json"]) {
      const rede = readLottie(f).layers.find((ly: any) => ly.nm === "T2_Rede");
      expect(rede, f).toBeDefined();
      const malha = rede.shapes.find((g: any) => g.nm === "Malha");
      const fios = malha.it.filter((it: any) => it.ty === "sh").map((it: any) => it.ks.k.v);
      const sobe = fios.filter(([[x0, y0], [x1, y1]]: number[][]) => (x1 - x0) * (y1 - y0) > 0).length;
      const desce = fios.filter(([[x0, y0], [x1, y1]]: number[][]) => (x1 - x0) * (y1 - y0) < 0).length;
      expect(sobe, f).toBeGreaterThan(3);
      expect(desce, f).toBe(sobe);
    }
  });

  it("todo ouro cuja coluna de ouro do guia (§6) fala em luz tem uma luzSuave", () => {
    const guia = fs.readFileSync(path.resolve(__dirname, "../../_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md"), "utf8");
    const secao = guia.slice(guia.indexOf("## 6."));
    const linhas = secao.split("\n").filter((l) => /^\| /.test(l) && !/^\| (Troféu|---)/.test(l));
    expect(linhas).toHaveLength(27);
    const porNome = new Map(ALL_LITURGICAL_TROPHIES.map((t) => [t.name, t.id]));
    const ids = new Set(TROPHIES.map((e) => e.id));
    const comLuz: string[] = [];
    for (const l of linhas) {
      const [nome, , , ouro] = l.split("|").slice(1).map((c) => c.trim());
      const id = porNome.get(nome);
      expect(id && ids.has(id), `linha do guia sem troféu no lote: ${nome}`).toBe(true);
      if (/\bluz\b/i.test(ouro)) comLuz.push(id!);
    }
    expect(comLuz.length).toBeGreaterThan(10);
    const LUZ_SUAVE = ["LuzFonte", "LuzRaios", "LuzMiolo", "LuzMeio", "LuzBorda"];
    for (const id of comLuz) {
      const tem = readLottie(`${id}_t3.json`).layers.some((ly: any) => JSON.stringify(ly.shapes.map((g: any) => g.nm)) === JSON.stringify(LUZ_SUAVE));
      expect(tem, `${id}_t3: o guia pede luz no ouro`).toBe(true);
    }
  });

  it("a luz do ouro é a luzSuave (nenhuma camada de luz com outro desenho)", () => {
    for (const e of TROPHIES) {
      for (const ly of readLottie(`${e.id}_t3.json`).layers) {
        if (!/Luz/.test(ly.nm)) continue;
        expect(ly.shapes.map((g: any) => g.nm), `${e.id}_t3 ${ly.nm}`).toEqual(["LuzFonte", "LuzRaios", "LuzMiolo", "LuzMeio", "LuzBorda"]);
      }
    }
  });
});

checkLot({ name: "lote 3", lot, generator: path.resolve(__dirname, "../trophy-lot-3.js"), files: 81 });
