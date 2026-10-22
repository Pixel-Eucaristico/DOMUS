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
import { checkLot, designFingerprint, readLottie, valueAt, type Entry } from "./trophyLotChecks";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-3.js");
const { ART_SCALE } = require("../lottie-lib/trophy-kit");
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

  /** Confere as camadas de pessoa: os grupos do rosto e da veste, com ou sem pés. */
  const confereGente = (porTrofeu: Record<string, string[][]>, corpoInteiro: boolean) => {
    for (const [id, porNivel] of Object.entries(porTrofeu)) {
      niveis(id).forEach((f, k) => {
        for (const nm of porNivel[k]) {
          const ly = readLottie(f).layers.find((l: any) => l.nm === nm);
          expect(ly, `${f} ${nm}`).toBeDefined();
          const grupos = ly.shapes.map((g: any) => g.nm);
          for (const g of ["Rosto", "Olhos", "Veste"]) expect(grupos, `${f} ${nm}`).toContain(g);
          for (const g of ["PeE", "PeD"]) expect(grupos.includes(g), `${f} ${nm}: ${g}`).toBe(corpoInteiro);
        }
      });
    }
  };

  it("santo como pessoa, em busto: o busto simples (rosto, olhos, veste, sem pés), como Maria e Águeda", () => {
    confereGente({
      lt_fatima: [[], ["T2_Pastorinhos"], ["T2_Pastorinhos"]],
      lt_visitacao: [["G_Maria", "G_Isabel"], ["G_Maria", "G_Isabel"], ["G_Maria", "G_Isabel"]],
      lt_antonio: [["G_Menino"], ["G_Menino"], ["G_Menino"]],
      lt_santana: [["G_Ana", "G_Joaquim", "G_Menina"], ["G_Ana", "G_Joaquim", "G_Menina"], ["G_Ana", "G_Joaquim", "G_Menina"]],
      lt_carmo: [[], [], ["T3_Maria"]],
    }, false);
  });

  it("santo como pessoa, de corpo inteiro: a `figura` no estilo do busto (com pés), em Fátima, Ascensão e São Tomé", () => {
    confereGente({
      lt_fatima: [["G_Maria"], ["G_Maria"], ["G_Maria"]],
      lt_ascensao: [["G_Jesus"], ["G_Jesus"], ["G_Jesus"]],
      lt_tome: [["G_Jesus", "G_Tome"], ["G_Jesus", "G_Tome"], ["G_Jesus", "G_Tome"]],
    }, true);
  });

  it("o busto fica atrás do que está na frente dele, nos três níveis", () => {
    // [na frente, atrás]: as camadas vão da frente para trás, então a da frente vem antes
    const ORDEM: Record<string, [string, string][]> = {
      // Fátima: Maria de pé sobre a azinheira, sempre na frente dela (ajuste do dono, rodada 3)
      lt_fatima: [["G_Maria", "G_Copa"]],
      lt_visitacao: [["G_Maos", "G_Maria"], ["G_Maria", "G_Isabel"]],
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

  describe("ajustes do dono (rodada 3)", () => {
    const camada = (f: string, nm: string) => {
      const ly = readLottie(f).layers.find((l: any) => l.nm === nm);
      expect(ly, `${f} ${nm}`).toBeDefined();
      return ly;
    };
    /** Valor final (quadro 89) de uma propriedade. */
    const fim = (prop: any): number[] => (prop.a === 1 ? prop.k[prop.k.length - 1].s : Array.isArray(prop.k) ? prop.k : [prop.k]);
    /** Centro de uma elipse (grupo `nm`) no quadro final, em coordenadas do quadro (transformação da camada, sem o ART_SCALE comum). */
    const centro = (ly: any, nm: string): number[] => {
      const g = ly.shapes.find((x: any) => x.nm === nm);
      expect(g, `${ly.nm}/${nm}`).toBeDefined();
      const [cx, cy] = g.it.find((it: any) => it.ty === "el").p.k;
      const [px, py] = fim(ly.ks.p), [ax, ay] = fim(ly.ks.a), [sx, sy] = fim(ly.ks.s).map((v) => v / 100);
      const r = (fim(ly.ks.r)[0] * Math.PI) / 180;
      const lx = (cx - ax) * sx, lyy = (cy - ay) * sy;
      return [px + lx * Math.cos(r) - lyy * Math.sin(r), py + lx * Math.sin(r) + lyy * Math.cos(r)];
    };
    const todas = (id: string) => niveis(id).map((f) => readLottie(f));

    it("São Matias: doze chamas (onze em círculo e a 12ª que acende) e nenhum dado", () => {
      for (const [k, l] of todas("lt_matias").entries()) {
        expect(JSON.stringify(l), `nível ${k + 1}`).not.toMatch(/1f3b2|Dado/);
        const chamas = l.layers.filter((ly: any) => /^G_/.test(ly.nm)).flatMap((ly: any) => ly.shapes).filter((g: any) => g.nm === "Chama");
        expect(chamas, `nível ${k + 1}`).toHaveLength(12);
      }
      expect(lot.ICONS["twemoji-1f3b2"]).toBeUndefined();
    });

    it("São Matias: a 12ª chama fica no lugar vago do alto do círculo e acende depois das onze", () => {
      for (const f of niveis("lt_matias")) {
        const onze = camada(f, "G_Onze"), doze = camada(f, "G_Chama12");
        const [cx, cy] = fim(onze.ks.p);
        // o pé de cada chama é o 5º vértice do contorno "Chama" (o ponto (0,0) da chamaShapes)
        const pes = onze.shapes.filter((g: any) => g.nm === "Chama").map((g: any) => g.it.find((it: any) => it.ty === "sh").ks.k.v[4]);
        expect(pes, f).toHaveLength(11);
        const raio = Math.hypot(pes[0][0], pes[0][1]) * (fim(onze.ks.s)[1] / 100); // o círculo na escala final da camada
        const angulos = pes.map(([x, y]: number[]) => Math.round(((Math.atan2(y, x) * 180) / Math.PI + 450) % 360)).sort((a: number, b: number) => a - b);
        // 12 lugares de 30° a partir do alto (0° = alto); o alto fica vago
        expect(angulos, f).toEqual([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);
        const [px, py] = fim(doze.ks.p);
        expect(px, f).toBeCloseTo(cx, 3);
        expect(py, f).toBeCloseTo(cy - raio, 3);
        const primeiro = (ly: any) => Array.from({ length: 90 }, (_, t) => t).find((t) => valueAt(ly.ks.o, t)[0] > 0 && valueAt(ly.ks.s, t)[0] > 0)!;
        const ultimaChaveOnze = Math.max(...[onze.ks.s, onze.ks.o].map((pr: any) => pr.k.find((kf: any) => kf.t > 0 && kf.s[0] >= 100)?.t ?? 0));
        expect(primeiro(doze), f).toBeGreaterThan(ultimaChaveOnze);
      }
    });

    it("Sagrado Coração: a coroa de espinhos tem uma parte na frente do coração e outra atrás", () => {
      expect(nomes("lt_sagrado_coracao.json").some((n) => /Espinhos/.test(n))).toBe(false);
      for (const f of ["lt_sagrado_coracao_t2.json", "lt_sagrado_coracao_t3.json"]) {
        const ns = nomes(f), coracao = ns.indexOf("G_Coracao");
        expect(ns.indexOf("T2_EspinhosFrente"), f).toBeGreaterThan(-1);
        expect(ns.indexOf("T2_EspinhosFrente"), f).toBeLessThan(coracao);
        expect(ns.indexOf("T2_EspinhosTras"), f).toBeGreaterThan(coracao);
      }
    });

    it("São Tomé: Jesus e Tomé de corpo inteiro, e a mão de Tomé na chaga de Jesus", () => {
      for (const f of niveis("lt_tome")) {
        for (const nm of ["G_Jesus", "G_Tome"]) {
          const grupos = camada(f, nm).shapes.map((g: any) => g.nm);
          for (const g of ["Rosto", "Veste", "PeE", "PeD"]) expect(grupos, `${f} ${nm}`).toContain(g);
        }
        const mao = centro(camada(f, "G_Braco"), "Mao"), chaga = centro(camada(f, "G_Jesus"), "Chaga");
        expect(Math.hypot(mao[0] - chaga[0], mao[1] - chaga[1]), `${f}: mão ${mao} × chaga ${chaga}`).toBeLessThan(2.5);
        expect(nomes(f).indexOf("G_Braco"), f).toBeLessThan(nomes(f).indexOf("G_Jesus"));
      }
    });

    it("Ascensão: Jesus glorioso de corpo inteiro sobe com a nuvem e a luzSuave acende", () => {
      for (const f of niveis("lt_ascensao")) {
        const grupos = camada(f, "G_Jesus").shapes.map((g: any) => g.nm);
        for (const g of ["Rosto", "Veste", "MaoE", "MaoD", "PeE"]) expect(grupos, f).toContain(g);
        expect(camada(f, "G_Luz").shapes.map((g: any) => g.nm), f).toEqual(["LuzFonte", "LuzRaios", "LuzMiolo", "LuzMeio", "LuzBorda"]);
        // Jesus acompanha a nuvem: cada chave de posição é a da nuvem deslocada de [0, −62] (no arquivo, já na ART_SCALE)
        const pj = camada(f, "G_Jesus").ks.p.k, pn = camada(f, "G_Nuvem").ks.p.k, dy = -62 * ART_SCALE;
        expect(pj.length, f).toBe(pn.length);
        pj.forEach((kf: any, n: number) => {
          expect(kf.t, f).toBe(pn[n].t);
          expect(kf.s[0], f).toBe(pn[n].s[0]);
          expect(kf.s[1], f).toBeCloseTo(pn[n].s[1] + dy, 2);
          if (kf.e) expect(kf.e[1], f).toBeCloseTo(pn[n].e[1] + dy, 2);
        });
        expect(TROPHIES.find((e) => e.id === "lt_ascensao")!.icon).toBe("desenho-jesus-glorioso");
      }
    });

    it("Visitação: sem braço solto; a mão de Isabel pousa sobre a de Maria", () => {
      for (const f of niveis("lt_visitacao")) {
        expect(nomes(f).some((n) => /Abraco|Braco/.test(n)), f).toBe(false);
        const maos = camada(f, "G_Maos").shapes.map((g: any) => g.nm);
        expect(maos.indexOf("MaoIsabel"), f).toBeGreaterThan(-1);
        expect(maos.indexOf("MaoIsabel"), f).toBeLessThan(maos.indexOf("MaoMaria"));
        // no quadro final as mãos se sobrepõem bem (a distância entre os centros fica 3 px abaixo da soma dos raios)
        const ly = camada(f, "G_Maos");
        const mi = centro(ly, "MaoIsabel"), mm = centro(ly, "MaoMaria");
        expect(Math.hypot(mi[0] - mm[0], mi[1] - mm[1]), f).toBeLessThan(3.6 + 3.6 - 3);
        // as mãos só aparecem depois que Maria e Isabel terminam de se inclinar
        const parada = (nm: string) => camada(f, nm).ks.r.k.at(-1).t;
        const aparece = Array.from({ length: 90 }, (_, t) => t).find((t) => valueAt(ly.ks.o, t)[0] > 0)!;
        expect(aparece, f).toBeGreaterThanOrEqual(Math.max(parada("G_Maria"), parada("G_Isabel")));
      }
    });

    it("Fátima: Maria de corpo inteiro e mãos postas, de pé sobre a copa", () => {
      for (const f of niveis("lt_fatima")) {
        const grupos = camada(f, "G_Maria").shapes.map((g: any) => g.nm);
        for (const g of ["MaosPostas", "Manto", "Orla", "PeE"]) expect(grupos, f).toContain(g);
        expect(nomes(f).some((n) => /Nuvem/.test(n)), f).toBe(false);
        // os pés de Maria ficam no alto da copa em todo quadro depois do pouso (sem afundar nem flutuar)
        const maria = camada(f, "G_Maria"), copa = camada(f, "G_Copa");
        const pe = maria.shapes.find((g: any) => g.nm === "PeE").it.find((it: any) => it.ty === "el");
        const folhas = copa.shapes.find((g: any) => g.nm === "Folhas3").it.find((it: any) => it.ty === "el");
        const pouso = maria.ks.p.k.at(-1).t;
        for (let t = pouso; t < 90; t++) {
          const peY = valueAt(maria.ks.p, t)[1] + (pe.p.k[1] - valueAt(maria.ks.a, t)[1]) * (valueAt(maria.ks.s, t)[1] / 100);
          const [, ay] = valueAt(copa.ks.a, t), [, py] = valueAt(copa.ks.p, t), sy = valueAt(copa.ks.s, t)[1] / 100;
          const topo = py + (folhas.p.k[1] - folhas.s.k[1] / 2 - ay) * sy;
          expect(Math.abs(peY - topo), `${f} quadro ${t}: pé ${peY}, copa ${topo}`).toBeLessThan(0.5);
        }
      }
    });
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
