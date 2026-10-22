/**
 * Story 11.7 — lote 5 de Lottie (32 litúrgicos de outubro a dezembro, com
 * Cristo Rei e o 1º Domingo do Advento).
 * Confere a tabela de scripts/trophy-lot-5.js, os JSON gerados em
 * assets/lottie/trophies/ (verificações comuns em trophyLotChecks.ts), que
 * nenhum desenho se repete entre os cinco lotes e as regras da §8 do guia
 * (pessoa como `figura` ou `busto`, com a pele comum e a escura de Aparecida e
 * de Martinho de Porres; homens com rosto de homem; Maria grande e na frente;
 * auréola no eixo da cabeça; luz só com a `luzSuave`, atrás das pessoas; terço
 * desenhado; nada que lembre jogo; Santos Inocentes e Luzia sem violência).
 * E o aceite do lote: todo `lt_*` tem os três níveis.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ALL_LITURGICAL_TROPHIES } from "../../packages/gamification/src/liturgicalTrophies/data";
import { checkLot, designFingerprint, guideRows, layerSamples, readLottie, valueAt, OUT, lib, type Entry } from "./trophyLotChecks";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-5.js");
const { PELE, PELE_ESCURA } = require("../lottie-lib/desenhos");
const { registeredLots } = require("../lottie-lib/lots");
const TROPHIES: Entry[] = lot.TROPHIES;

/** Cores litúrgicas da §8: vermelho para os evangelistas e mártires da lista, roxo para o Advento e Finados, branco para os demais. */
const VERMELHO = ["lt_lucas", "lt_simao_judas", "lt_cecilia", "lt_andre", "lt_luzia", "lt_estevao", "lt_santos_inocentes"];
const ROXO = ["lt_advento", "lt_fieis_defuntos"];

const nomes = (f: string): string[] => readLottie(f).layers.map((ly: any) => ly.nm);
const niveis = (id: string) => [`${id}.json`, `${id}_t2.json`, `${id}_t3.json`];
const camada = (f: string, nm: string) => {
  const ly = readLottie(f).layers.find((l: any) => l.nm === nm);
  expect(ly, `${f} ${nm}`).toBeDefined();
  return ly;
};
const em = (prop: any, t: number): number[] => valueAt(prop, t);
/** Ponto do quadro → desenho da camada (posição, âncora, escala e rotação no quadro t). */
const noDesenho = (ly: any, t: number, [X, Y]: number[]): number[] => {
  const [px, py] = em(ly.ks.p, t), [ax, ay] = em(ly.ks.a, t), [sx, sy] = em(ly.ks.s, t).map((v) => v / 100);
  const r = (-em(ly.ks.r, t)[0] * Math.PI) / 180, dx = X - px, dy = Y - py;
  return [ax + (dx * Math.cos(r) - dy * Math.sin(r)) / sx, ay + (dx * Math.sin(r) + dy * Math.cos(r)) / sy];
};
/** Vértices dos caminhos e cantos das elipses dos grupos (no desenho da camada). */
const pontosDe = (groups: any[]): number[][] => groups.flatMap((g: any) => g.it.flatMap((it: any) => {
  if (it.ty === "sh") return it.ks.k.v;
  if (it.ty === "el") return [[it.p.k[0] - it.s.k[0] / 2, it.p.k[1] - it.s.k[1] / 2], [it.p.k[0] + it.s.k[0] / 2, it.p.k[1] + it.s.k[1] / 2]];
  if (it.ty === "gr") return pontosDe([it]);
  return [];
}));
/** Centro da elipse do grupo `nm` (no desenho da camada). */
const centroDe = (ly: any, nm: string): number[] => {
  const g = ly.shapes.find((x: any) => x.nm === nm);
  expect(g, `${ly.nm}/${nm}`).toBeDefined();
  return g.it.find((it: any) => it.ty === "el").p.k;
};
const LUZ_SUAVE = ["LuzFonte", "LuzRaios", "LuzMiolo", "LuzMeio", "LuzBorda"];
const ehLuzSuave = (ly: any) => JSON.stringify(ly.shapes.map((g: any) => g.nm)) === JSON.stringify(LUZ_SUAVE);
const hexDe = (c: number[]) => `#${c.slice(0, 3).map((v: number) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
/** Cores de preenchimento de um grupo (e dos grupos dentro dele), em "#RRGGBB". */
const coresDe = (g: any): string[] => g.it.flatMap((it: any) => (it.ty === "fl" ? [hexDe(it.c.k)] : it.ty === "gr" ? coresDe(it) : []));
const todosOsGrupos = (items: any[]): any[] => items.flatMap((it: any) => (it.ty === "gr" ? [it, ...todosOsGrupos(it.it)] : []));

describe("Lottie — lote 5", () => {
  it("tem os 32 litúrgicos de outubro a dezembro (com Cristo Rei e o Advento), e só eles", () => {
    const expected = ALL_LITURGICAL_TROPHIES.filter((t) => t.month >= 10).map((t) => t.id).sort();
    const ids = TROPHIES.map((e) => e.id).sort();
    expect(ids).toEqual(expected);
    expect(ids).toHaveLength(32);
    expect(ids).toEqual(expect.arrayContaining(["lt_cristo_rei", "lt_advento"]));
    expect(TROPHIES.every((e) => e.kind === "liturgical")).toBe(true);
  });

  it("cada linha da §8 do guia é um troféu do lote (pelo nome)", () => {
    const linhas = guideRows(8);
    expect(linhas).toHaveLength(32);
    const porNome = new Map(ALL_LITURGICAL_TROPHIES.map((t) => [t.name, t.id]));
    const ids = new Set(TROPHIES.map((e) => e.id));
    for (const { nome } of linhas) expect(ids.has(porNome.get(nome) as string), `linha do guia sem troféu no lote: ${nome}`).toBe(true);
  });

  it("cor litúrgica da §8 (vermelho, roxo e branco)", () => {
    for (const e of TROPHIES) expect(e.color, e.id).toBe(VERMELHO.includes(e.id) ? "vermelho" : ROXO.includes(e.id) ? "roxo" : "branco");
  });

  it("nenhum troféu repete id nem desenho dos lotes 1 a 4 (peça principal e geometria do gesto)", () => {
    // só os lotes 1 a 5: o teste deste lote não depende de lotes que venham depois
    const all: Entry[] = registeredLots().slice(0, 5).flatMap((l: any) => l.TROPHIES);
    expect(all).toHaveLength(13 + 21 + 27 + 24 + 32);
    expect(() => lot.checkUniqueIds(all)).not.toThrow();
    expect(() => lot.checkUniqueIcons(all)).not.toThrow();
    const prints = all.map((e) => designFingerprint(readLottie(`${e.id}.json`)));
    expect(new Set(prints).size).toBe(prints.length);
  });

  it("nenhum acréscimo (T2_/T3_) do lote 5 repete o desenho do gesto (G_) de outro troféu ou de um sazonal aprovado, e nenhum gesto do lote 5 é acréscimo dos lotes 1 a 4", () => {
    const geo = (it: any): any => (it.ty === "sh" ? it.ks.k.v : it.ty === "el" ? [it.p.k, it.s.k] : it.ty === "gr" ? it.it.map(geo) : null);
    const impressao = (ly: any) => JSON.stringify(ly.shapes.map(geo));
    const lotes = registeredLots().slice(0, 5);
    // gestos (G_) de cada troféu de todos os lotes, pelo bronze
    const gestos = new Map<string, string>();
    for (const e of lotes.flatMap((l: any) => l.TROPHIES)) {
      for (const ly of readLottie(`${e.id}.json`).layers) if (/^G_/.test(ly.nm)) gestos.set(impressao(ly), e.id);
    }
    // todas as camadas dos sazonais aprovados (tirando a base comum de brilhos e halo)
    const sazonais = new Set<string>();
    for (const f of fs.readdirSync(OUT).filter((x) => /^seasonal_.*\.json$/.test(x))) {
      for (const ly of readLottie(f).layers) if (ly.nm !== "Glow" && !/^Sp\d$/.test(ly.nm)) sazonais.add(impressao(ly));
    }
    let vistos = 0;
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        for (const ly of readLottie(f).layers) {
          if (!/^T[23]_/.test(ly.nm)) continue;
          vistos++;
          const dono = gestos.get(impressao(ly));
          expect(dono === undefined || dono === e.id, `${f} ${ly.nm}: mesmo desenho do gesto de ${dono}`).toBe(true);
          expect(sazonais.has(impressao(ly)), `${f} ${ly.nm}: mesmo desenho de um sazonal aprovado`).toBe(false);
        }
      }
    }
    expect(vistos).toBeGreaterThan(100);
    // os acréscimos dos lotes 1 a 4 não têm o desenho de nenhum gesto do lote 5
    const meus = new Set(TROPHIES.flatMap((e) => readLottie(`${e.id}.json`).layers.filter((ly: any) => /^G_/.test(ly.nm)).map(impressao)));
    for (const e of lotes.slice(0, 4).flatMap((l: any) => l.TROPHIES)) {
      for (const f of niveis(e.id)) {
        for (const ly of readLottie(f).layers) if (/^T[23]_/.test(ly.nm)) expect(meus.has(impressao(ly)), `${f} ${ly.nm}: é o gesto de um troféu do lote 5`).toBe(false);
      }
    }
  });

  it("nenhum id do lote 5 está em APPROVED_LOTTIE", () => {
    const aprovados: Set<string> = lib.readApprovedIds();
    for (const e of TROPHIES) expect(aprovados.has(e.id), e.id).toBe(false);
  });

  it("todas as peças são desenhadas: nenhum nível usa peça da tabela (Twemoji ou Bootstrap), muito menos a peça principal de outro troféu", () => {
    expect(Object.keys(lot.ICONS)).toHaveLength(0);
    for (const e of TROPHIES) {
      expect(lot.DRAWN[e.icon], e.id).toBeDefined();
      expect(lot.DRAWN[e.icon].uses, e.id).toEqual([]);
      for (const f of niveis(e.id)) expect(JSON.stringify(readLottie(f)), f).not.toMatch(/(twemoji|bootstrap)-/);
    }
  });

  /** Confere as camadas de pessoa: rosto, olhos e veste, com ou sem pés. */
  const confereGente = (porTrofeu: Record<string, string[][]>, corpoInteiro: boolean) => {
    for (const [id, porNivel] of Object.entries(porTrofeu)) {
      niveis(id).forEach((f, k) => {
        for (const nm of porNivel[k]) {
          const grupos = camada(f, nm).shapes.map((g: any) => g.nm);
          for (const g of ["Rosto", "Olhos", "Veste"]) expect(grupos, `${f} ${nm}`).toContain(g);
          for (const g of ["PeE", "PeD"]) expect(grupos.includes(g), `${f} ${nm}: ${g}`).toBe(corpoInteiro);
        }
      });
    }
  };
  const todos = (nms: string[]) => [nms, nms, nms];
  const prataEOuro = (nms: string[]) => [[], nms, nms];
  const soOuro = (nms: string[]) => [[], [], nms];

  it("pessoa em ação, em busto: o busto simples (rosto, olhos, veste, sem pés)", () => {
    confereGente({
      lt_teresinha: todos(["G_Teresinha"]),
      lt_rosario: prataEOuro(["T2_Maria"]),
      lt_teresa_avila: prataEOuro(["T2_Teresa"]),
      lt_joao_paulo_ii: todos(["G_Papa"]),
      lt_simao_judas: todos(["G_Simao", "G_Judas"]),
      lt_martinho_porres: prataEOuro(["T2_Martinho"]),
      lt_carlos_borromeu: todos(["G_Carlos"]),
      lt_isabel_hungria: todos(["G_Isabel"]),
      lt_cecilia: todos(["G_Cecilia"]),
      lt_ambrosio: todos(["G_Ambrosio"]),
      lt_luzia: todos(["G_Siracusana"]),
      lt_natal: todos(["G_Maria", "G_Jose"]),
      lt_estevao: todos(["G_Estevao"]),
      lt_martinho_tours: soOuro(["T3_Cristo"]),
      lt_santos_inocentes: todos(["G_Bebe1", "G_Bebe2", "G_Bebe3"]),
    }, false);
    // a multidão de santos e os pais de Maria: vários bustos numa camada
    for (const f of niveis("lt_todos_santos")) {
      expect(camada(f, "G_FilaTras").shapes.filter((g: any) => g.nm === "Rosto"), f).toHaveLength(5);
      expect(camada(f, "G_FilaFrente").shapes.filter((g: any) => g.nm === "Rosto"), f).toHaveLength(4);
    }
    for (const f of niveis("lt_apresentacao_maria").slice(1)) expect(camada(f, "T2_Pais").shapes.filter((g: any) => g.nm === "Rosto"), f).toHaveLength(2);
    for (const f of niveis("lt_aparecida").slice(1)) expect(camada(f, "T2_Barco").shapes.filter((g: any) => g.nm === "Rosto"), f).toHaveLength(3);
  });

  it("pessoa em ação, de corpo inteiro: a `figura` (com pés)", () => {
    confereGente({
      lt_anjos_guarda: todos(["G_Anjo", "G_Crianca"]),
      lt_francisco_assis: todos(["G_Francisco"]),
      lt_martinho_tours: todos(["G_Martinho", "G_Mendigo"]),
      lt_apresentacao_maria: todos(["G_Maria"]),
      lt_nsa_gracas: todos(["G_Maria"]),
      lt_cristo_rei: todos(["G_Cristo"]),
      lt_imaculada: todos(["G_Maria"]),
    }, true);
  });

  it("os homens têm rosto de homem: cabelo curto rente, sobrancelhas e orelhas, sem as bochechas rosadas", () => {
    const HOMENS: [string, string, number][] = [
      ["lt_francisco_assis", "G_Francisco", 0], ["lt_joao_paulo_ii", "G_Papa", 0], ["lt_simao_judas", "G_Simao", 0], ["lt_simao_judas", "G_Judas", 0],
      ["lt_martinho_porres", "T2_Martinho", 1], ["lt_carlos_borromeu", "G_Carlos", 0], ["lt_martinho_tours", "G_Martinho", 0], ["lt_martinho_tours", "G_Mendigo", 0],
      ["lt_ambrosio", "G_Ambrosio", 0], ["lt_natal", "G_Jose", 0], ["lt_estevao", "G_Estevao", 0], ["lt_apresentacao_maria", "T2_Pais", 1], ["lt_aparecida", "T2_Barco", 1],
    ];
    for (const [id, nm, desde] of HOMENS) {
      for (const f of niveis(id).slice(desde)) {
        const grupos = camada(f, nm).shapes.map((g: any) => g.nm);
        for (const g of ["Sobrancelhas", "Orelhas", "Cabelo", "Nariz"]) expect(grupos, `${f} ${nm}`).toContain(g);
        if (nm !== "T2_Pais") expect(grupos.filter((g: string) => /^Face\d$/.test(g)), `${f} ${nm}: bochechas`).toHaveLength(0);
      }
    }
    // barba onde é tradição: os apóstolos, Francisco, Ambrósio, José, Martinho de Tours e o mendigo, Estêvão
    for (const [id, nm] of [["lt_simao_judas", "G_Simao"], ["lt_simao_judas", "G_Judas"], ["lt_francisco_assis", "G_Francisco"], ["lt_ambrosio", "G_Ambrosio"], ["lt_natal", "G_Jose"], ["lt_martinho_tours", "G_Martinho"], ["lt_martinho_tours", "G_Mendigo"], ["lt_estevao", "G_Estevao"]]) {
      expect(camada(`${id}.json`, nm).shapes.map((g: any) => g.nm), `${id} ${nm}`).toContain("Barba");
    }
  });

  it("todo rosto e toda mão têm a pele comum (PELE), menos a imagem de Aparecida e São Martinho de Porres (PELE_ESCURA)", () => {
    const ESCURA: Record<string, string> = { lt_aparecida: "G_Imagem", lt_martinho_porres: "T2_Martinho" };
    expect(PELE_ESCURA).not.toBe(PELE);
    let vistos = 0, escuros = 0;
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        for (const ly of readLottie(f).layers) {
          for (const g of ly.shapes) {
            if (!/^(Rosto|Pescoco|Mao\w*|MaosPostas|Bebe|Orelhas|Decote)$/.test(g.nm)) continue;
            // as orelhas dos bichos (lobo, gato…) não são pele: só as de quem tem rosto
            if (g.nm === "Orelhas" && !ly.shapes.some((x: any) => x.nm === "Rosto")) continue;
            const pele = ESCURA[e.id] === ly.nm ? PELE_ESCURA : PELE;
            for (const cor of coresDe(g)) {
              vistos++;
              if (pele === PELE_ESCURA) escuros++;
              expect(cor, `${f} ${ly.nm}/${g.nm}`).toBe(pele);
            }
          }
        }
      }
    }
    expect(vistos).toBeGreaterThan(200);
    expect(escuros).toBeGreaterThan(8);
  });

  it("Maria grande (≥ 60 px na tela) e visível: na frente de tudo o que não é o terço que ela segura, coroa ou estrelas", () => {
    const MARIA: [string, string, number][] = [
      ["lt_rosario", "T2_Maria", 1], ["lt_aparecida", "G_Imagem", 0], ["lt_apresentacao_maria", "G_Maria", 0],
      ["lt_nsa_gracas", "G_Maria", 0], ["lt_imaculada", "G_Maria", 0], ["lt_natal", "G_Maria", 0],
    ];
    const PODE_NA_FRENTE = /^(G_Terco|G_Dezenas|T3_AureolaRosas|T3_Coroa|T3_AureolaEstrelas)$/;
    for (const [id, nm, desde] of MARIA) {
      for (const f of niveis(id).slice(desde)) {
        const ns = nomes(f);
        const outros = ns.slice(0, ns.indexOf(nm));
        expect(outros.every((n) => PODE_NA_FRENTE.test(n)), `${f}: na frente de Maria: ${outros}`).toBe(true);
        const maria = camada(f, nm);
        expect(em(maria.ks.o, 89)[0], f).toBe(100);
        const corpo = maria.shapes.filter((g: any) => !/^(Peanha|MaosPostas|Mangas)$/.test(g.nm));
        const ys = pontosDe(corpo).map((p) => p[1]);
        // em px do quadro, já com a ART_SCALE (como no lote 4); na tela o LottieTrophy ainda amplia 1,45×
        const altura = (Math.max(...ys) - Math.min(...ys)) * (em(maria.ks.s, 89)[1] / 100);
        expect(altura, `${f}: altura de Maria`).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it("nenhuma luz fica na frente de uma pessoa: as camadas de luz vêm depois (atrás) de todas as pessoas", () => {
    const pessoa = (ly: any) => ly.shapes.some((g: any) => g.nm === "Rosto" || g.nm === "Bebe");
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        const layers = readLottie(f).layers;
        const ultimaPessoa = Math.max(...layers.map((ly: any, k: number) => (pessoa(ly) ? k : -1)));
        layers.forEach((ly: any, k: number) => {
          // as camadas vão da frente para trás: uma luz antes da última pessoa estaria na frente dela
          if (ehLuzSuave(ly)) expect(k > ultimaPessoa, `${f}: ${ly.nm} na frente de uma pessoa`).toBe(true);
        });
      }
    }
  });

  it("auréolas e coroas acompanham a cabeça: no quadro final ficam no eixo da cabeça, acima do rosto", () => {
    // [troféu, níveis, camada da auréola, camada da pessoa, grupo de referência da cabeça]
    const AUREOLAS: [string, number[], string, string, string][] = [
      ["lt_teresinha", [0, 1, 2], "Aureola", "G_Teresinha", "Rosto"],
      ["lt_anjos_guarda", [0, 1, 2], "Aureola", "G_Anjo", "Rosto"],
      ["lt_francisco_assis", [0, 1, 2], "Aureola", "G_Francisco", "Rosto"],
      ["lt_apresentacao_maria", [0, 1, 2], "Aureola", "G_Maria", "Rosto"],
      ["lt_cecilia", [0, 1, 2], "Aureola", "G_Cecilia", "Rosto"],
      ["lt_cecilia", [1, 2], "T2_CoroaDeFlores", "G_Cecilia", "Rosto"],
      ["lt_natal", [0, 1, 2], "Aureola", "G_Menino", "Bebe"],
      ["lt_rosario", [2], "T3_AureolaRosas", "T2_Maria", "Rosto"],
      ["lt_teresa_avila", [2], "T3_Aureola", "T2_Teresa", "Rosto"],
      ["lt_joao_paulo_ii", [2], "T3_Aureola", "G_Papa", "Rosto"],
      ["lt_simao_judas", [2], "T3_CoroaSimao", "G_Simao", "Rosto"],
      ["lt_simao_judas", [2], "T3_CoroaJudas", "G_Judas", "Rosto"],
      ["lt_simao_judas", [2], "T3_AureolaSimao", "G_Simao", "Rosto"],
      ["lt_simao_judas", [2], "T3_AureolaJudas", "G_Judas", "Rosto"],
      ["lt_nicolau", [2], "T3_Aureola", "T3_Nicolau", "Rosto"],
      ["lt_francisco_xavier", [2], "T3_Aureola", "G_Crucifixo", "Cabeca"],
      ["lt_santos_inocentes", [2], "T3_Aureola1", "G_Bebe1", "Rosto"],
      ["lt_santos_inocentes", [2], "T3_Aureola2", "G_Bebe2", "Rosto"],
      ["lt_santos_inocentes", [2], "T3_Aureola3", "G_Bebe3", "Rosto"],
      ["lt_martinho_porres", [2], "T3_Aureola", "T2_Martinho", "Rosto"],
      ["lt_carlos_borromeu", [2], "T3_Aureola", "G_Carlos", "Rosto"],
      ["lt_martinho_tours", [2], "T3_Aureola", "G_Martinho", "Rosto"],
      ["lt_martinho_tours", [2], "T3_AureolaCristo", "T3_Cristo", "Rosto"],
      ["lt_isabel_hungria", [2], "T3_Aureola", "G_Isabel", "Rosto"],
      ["lt_nsa_gracas", [2], "T3_Aureola", "G_Maria", "Rosto"],
      ["lt_ambrosio", [2], "T3_Aureola", "G_Ambrosio", "Rosto"],
      ["lt_imaculada", [2], "T3_AureolaEstrelas", "G_Maria", "Rosto"],
      ["lt_luzia", [2], "T3_Coroa", "G_Siracusana", "Rosto"],
      ["lt_luzia", [2], "T3_Aureola", "G_Siracusana", "Rosto"],
      ["lt_estevao", [2], "T3_Coroa", "G_Estevao", "Rosto"],
      ["lt_estevao", [2], "T3_Aureola", "G_Estevao", "Rosto"],
      ["lt_joao_evangelista", [2], "T3_Aureola", "G_Aguia", "Cabeca"],
      ["lt_aparecida", [2], "T3_Coroa", "G_Imagem", "Rosto"],
    ];
    for (const [id, ks, aur, pessoa, ref] of AUREOLAS) {
      for (const k of ks) {
        const f = niveis(id)[k];
        const halo = camada(f, aur), gente = camada(f, pessoa);
        const [hx, hy] = noDesenho(gente, 89, em(halo.ks.p, 89));
        const [rx, ry] = centroDe(gente, ref);
        expect(Math.abs(hx - rx), `${f} ${aur}: fora do eixo da cabeça (${hx} × ${rx})`).toBeLessThan(1);
        expect(hy, `${f} ${aur}: acima do rosto`).toBeLessThan(ry);
        // a auréola (anel) fica acima do alto do rosto e perto dele; as coroas de flores, de rosas e de estrelas envolvem a cabeça
        if (/CoroaDeFlores|Rosas|Estrelas/.test(aur)) continue;
        const g = gente.shapes.find((x: any) => x.nm === ref).it.find((it: any) => it.ty === "el");
        const topo = ry - g.s.k[1] / 2;
        expect(hy, `${f} ${aur}: acima do alto do rosto`).toBeLessThan(topo);
        expect(topo - hy, `${f} ${aur}: longe da cabeça`).toBeLessThan(25);
      }
    }
    // Todos os Santos: cada auréola da multidão fica sobre a cabeça do seu santo
    for (const f of niveis("lt_todos_santos")) {
      const aur = camada(f, "G_Aureolas");
      // as fileiras e as auréolas terminam na mesma posição e escala de camada: dá para comparar no desenho
      const rostos = ["G_FilaTras", "G_FilaFrente"].flatMap((nm) => {
        const ly = camada(f, nm);
        expect(em(ly.ks.p, 89), `${f} ${nm}`).toEqual(em(aur.ks.p, 89));
        expect(em(ly.ks.s, 89), `${f} ${nm}`).toEqual(em(aur.ks.s, 89));
        return ly.shapes.filter((g: any) => g.nm === "Rosto").map((g: any) => g.it.find((it: any) => it.ty === "el").p.k);
      });
      expect(aur.shapes, f).toHaveLength(9);
      for (const g of aur.shapes) {
        const [x, y] = g.it.find((it: any) => it.ty === "tr").p.k;
        expect(rostos.some(([rx, ry]: number[]) => Math.abs(rx - x) < 0.5 && y < ry && ry - y < 12), `${f} ${g.nm}`).toBe(true);
      }
    }
  });

  it("auréola de base: cada troféu tem `halo` ou está em SEM_HALO (nunca os dois); quem a tem só no ouro ganha a auréola (ou a coroa) no ouro", () => {
    const SEM_HALO: Record<string, string> = lot.SEM_HALO;
    for (const e of TROPHIES) expect(Boolean(e.halo) !== Boolean(SEM_HALO[e.id]), `${e.id}: halo ${Boolean(e.halo)}, SEM_HALO ${SEM_HALO[e.id]}`).toBe(true);
    expect(Object.keys(SEM_HALO).every((id) => TROPHIES.some((e) => e.id === id))).toBe(true);
    for (const [id, motivo] of Object.entries(SEM_HALO)) {
      if (!motivo.startsWith("auréola só no ouro")) continue;
      expect(nomes(`${id}_t3.json`).some((n) => /^T3_(Aureola|Coroa)/.test(n)), `${id}_t3: ${motivo}`).toBe(true);
      expect(nomes(`${id}_t2.json`).some((n) => /Aureola/.test(n)), `${id}_t2: auréola antes do ouro`).toBe(false);
    }
    // "sem pessoa no desenho" só onde nenhum nível desenha uma pessoa
    for (const [id, motivo] of Object.entries(SEM_HALO)) {
      if (!motivo.startsWith("sem pessoa")) continue;
      for (const f of niveis(id)) expect(JSON.stringify(readLottie(f)), f).not.toMatch(/"nm":"Rosto"/);
    }
  });

  it("todo ouro cuja coluna de ouro do guia (§8) fala em luz tem uma luzSuave", () => {
    const porNome = new Map(ALL_LITURGICAL_TROPHIES.map((t) => [t.name, t.id]));
    const comLuz = guideRows(8).filter(({ ouro }) => /\bluz\b/i.test(ouro)).map(({ nome }) => porNome.get(nome)!);
    expect(comLuz.length).toBeGreaterThan(20);
    for (const id of comLuz) {
      const tem = readLottie(`${id}_t3.json`).layers.some((ly: any) => /^T3_/.test(ly.nm) && ehLuzSuave(ly));
      expect(tem, `${id}_t3: o guia pede luz no ouro`).toBe(true);
    }
  });

  it("luz: camada de luz, brilho ou raios (pelo nome ou pelo conteúdo) é a luzSuave ou uma luz de escala fixa e uniforme, sem forma animada", () => {
    // G_Centro (a luz do centro do castelo de Santa Teresa) também é luz
    const LUZ_NOME = /Luz|Ceu|Brilho|Raios|Centro/;
    const LUZ_GRUPOS = /^(Luz(Fonte|Raios|Miolo|Meio|Borda)|Brilho|Raios)$/;
    let vistas = 0;
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        for (const ly of readLottie(f).layers) {
          if (ly.nm === "Glow" || /^Sp\d$/.test(ly.nm)) continue;
          const groups = todosOsGrupos(ly.shapes);
          if (!LUZ_NOME.test(ly.nm) && !groups.some((g: any) => LUZ_GRUPOS.test(g.nm))) continue;
          vistas++;
          if (/Luz/.test(ly.nm)) expect(ehLuzSuave(ly), `${f} ${ly.nm}`).toBe(true);
          expect(ly.ks.s.a, `${f} ${ly.nm}: escala animada`).not.toBe(1);
          const [sx, sy] = ly.ks.s.k;
          expect(Math.abs(sx), `${f} ${ly.nm}: escala ${ly.ks.s.k}`).toBe(Math.abs(sy));
          for (const g of groups) {
            for (const it of g.it) {
              if (it.ty === "tr") expect(it.s.a, `${f} ${ly.nm}/${g.nm}: escala do grupo animada`).not.toBe(1);
              if (it.ty === "sh") expect(it.ks.a, `${f} ${ly.nm}/${g.nm}: forma animada`).not.toBe(1);
            }
          }
        }
      }
    }
    expect(vistas).toBeGreaterThan(40);
  });

  it("terço próprio do Rosário (crucifixo, medalha de Maria e 5 dezenas), que acende dezena por dezena; Finados com o aspersório", () => {
    for (const f of niveis("lt_rosario")) {
      const ly = camada(f, "G_Terco");
      expect(ly.shapes.map((g: any) => g.nm), f).toEqual(expect.arrayContaining(["Crucifixo", "Corpo de Cristo", "Medalha", "M de Maria", "ContasGrandes", "ContasPequenas"]));
      const pequenas = ly.shapes.find((g: any) => g.nm === "ContasPequenas").it.filter((it: any) => it.ty === "gr");
      expect(pequenas.length, f).toBe(50 + 3);
    }
    for (const f of niveis("lt_fieis_defuntos").slice(1)) {
      expect(nomes(f), f).not.toContain("T2_Terco");
      expect(camada(f, "T2_Aspersorio").shapes.map((g: any) => g.nm), f).toEqual(expect.arrayContaining(["Gotas", "Bola do aspersorio", "Cabo"]));
    }
    for (const f of niveis("lt_rosario")) {
      const dezenas = camada(f, "G_Dezenas"), terco = camada(f, "G_Terco");
      // presas ao terço: mesma posição, rotação, escala e âncora, e cada conta acesa sobre uma conta do terço
      for (const k of ["p", "r", "s", "a"]) expect(JSON.stringify(dezenas.ks[k]), `${f} ${k}`).toBe(JSON.stringify(terco.ks[k]));
      const contas = terco.shapes.find((g: any) => g.nm === "ContasPequenas").it.filter((it: any) => it.ty === "gr").map((g: any) => g.it[0].p.k);
      const acesas = dezenas.shapes.flatMap((g: any) => g.it.filter((it: any) => it.ty === "gr" && /^Conta/.test(it.nm)).map((c: any) => c.it[0].p.k));
      expect(acesas, f).toEqual(contas.slice(0, 50));
      expect(dezenas.shapes.map((g: any) => g.nm), f).toEqual(["Dezena1", "Dezena2", "Dezena3", "Dezena4", "Dezena5"]);
      const acende = dezenas.shapes.map((g: any) => g.it.find((it: any) => it.ty === "tr").o.k.find((kf: any) => kf.s[0] > 0).t);
      for (let k = 1; k < acende.length; k++) expect(acende[k], `${f}: a dezena ${k + 1} acende depois da ${k}`).toBeGreaterThan(acende[k - 1]);
      for (const g of dezenas.shapes) expect(g.it.filter((it: any) => it.ty === "gr" && /^Conta/.test(it.nm)), `${f} ${g.nm}`).toHaveLength(10);
    }
  });

  it("nada que lembre jogo ou aposta: sem dados, cartas, fichas, roleta ou moedas; as bolsinhas de Nicolau vão fechadas", () => {
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) expect(JSON.stringify(readLottie(f)), f).not.toMatch(/"nm":"[^"]*(Dado|Carta|Ficha|Roleta|Moeda|Alvo)/);
    }
    for (const f of niveis("lt_nicolau")) {
      const bolsas = camada(f, "G_Bolsas");
      expect(bolsas.shapes.map((g: any) => g.nm), f).toEqual(["Bolsinha1", "Bolsinha2", "Bolsinha3"]);
      for (const g of bolsas.shapes) expect(g.it.filter((it: any) => it.ty === "gr").map((x: any) => x.nm), `${f} ${g.nm}`).toEqual(["Cordao", "Boca", "Bolsinha"]);
    }
  });

  it("sem os desenhos dos sazonais aprovados: o Natal sem Papai Noel nem árvore, Finados sem lápide nem vela", () => {
    for (const [id, proibido] of [["lt_natal", /"nm":"[^"]*(Papai|Noel|Gorro|Arvore|Pinheiro)/], ["lt_fieis_defuntos", /"nm":"[^"]*(Lapide|Tumulo|Vela|Pavio)/]] as [string, RegExp][]) {
      for (const f of niveis(id)) expect(JSON.stringify(readLottie(f)), f).not.toMatch(proibido);
    }
  });

  it("Santos Inocentes e Santa Luzia sem violência nem sangue; os olhos de Luzia desenhados com delicadeza no pratinho", () => {
    for (const id of ["lt_santos_inocentes", "lt_luzia"]) {
      for (const f of niveis(id)) expect(JSON.stringify(readLottie(f)), f).not.toMatch(/"nm":"[^"]*(Sangue|Ferida|Espada|Faca|Lamina|Lanca|Soldado)/);
    }
    for (const f of niveis("lt_luzia")) {
      const prato = camada(f, "G_Prato").shapes.map((g: any) => g.nm);
      expect(prato.filter((n: string) => n === "Iris"), f).toHaveLength(2);
      expect(prato, f).toEqual(expect.arrayContaining(["Prato", "Cilios", "Mao1", "Mao2"]));
    }
  });

  it("Santos Inocentes: as coroinhas de flores ficam na cabeça de cada inocente enquanto ele sobe e flutua", () => {
    const noQuadro = (ly: any, t: number, q: number[]): number[] => {
      const [px, py] = em(ly.ks.p, t), [ax, ay] = em(ly.ks.a, t), [sx, sy] = em(ly.ks.s, t).map((v) => v / 100);
      const r = (em(ly.ks.r, t)[0] * Math.PI) / 180, lx = (q[0] - ax) * sx, lyy = (q[1] - ay) * sy;
      return [px + lx * Math.cos(r) - lyy * Math.sin(r), py + lx * Math.sin(r) + lyy * Math.cos(r)];
    };
    for (const f of niveis("lt_santos_inocentes").slice(1)) {
      const coroinhas = camada(f, "T2_Coroinhas");
      expect(coroinhas.shapes, f).toHaveLength(3);
      coroinhas.shapes.forEach((g: any, k: number) => {
        const bebe = camada(f, `G_Bebe${k + 1}`);
        const ramo = g.it.find((x: any) => x.nm === "Ramo").it.find((x: any) => x.ty === "el").p.k;
        const tr = g.it.find((x: any) => x.ty === "tr");
        for (const t of [40, 52, 60, 75, 89]) {
          const desloc = em(tr.p, t);
          const [cx, cy] = noQuadro(coroinhas, t, [ramo[0] + desloc[0], ramo[1] + desloc[1]]);
          const [rx, ry] = noQuadro(bebe, t, centroDe(bebe, "Rosto"));
          expect(Math.abs(cx - rx), `${f} Coroinha${k + 1} quadro ${t}`).toBeLessThan(0.5);
          expect(ry - cy, `${f} Coroinha${k + 1} quadro ${t}: na cabeça`).toBeGreaterThan(0);
          expect(ry - cy, `${f} Coroinha${k + 1} quadro ${t}: na cabeça`).toBeLessThan(10);
        }
      });
    }
  });

  it("os acréscimos que a §8 pede na prata e no ouro estão lá: raios, estrelas, palma, coroa e auréola", () => {
    const porNome = new Map(ALL_LITURGICAL_TROPHIES.map((t) => [t.name, t.id]));
    // [palavra da coluna do guia, camada esperada, só no ouro?]
    const MAPA: [RegExp, RegExp, boolean][] = [
      [/\braios\b/i, /^T3_Raios/, true],
      [/\bestrelas\b/i, /^T3_(Estrelas|AureolaEstrelas)/, true],
      [/\bpalmas?\b/i, /^T[23]_Palma/, false],
      [/\bcoroas?\b/i, /^T3_(Coroa|Aureola(Rosas|Estrelas))/, true],
      [/\bauréolas?\b/i, /^T3_Aureola/, true],
    ];
    let vistos = 0;
    for (const { nome, prata, ouro } of guideRows(8)) {
      const id = porNome.get(nome)!;
      for (const [palavra, camadaEsperada, soOuro] of MAPA) {
        for (const [coluna, nivel] of [[prata, 2], [ouro, 3]] as [string, number][]) {
          if (soOuro && nivel === 2) continue;
          if (!palavra.test(coluna)) continue;
          vistos++;
          const f = niveis(id)[nivel - 1];
          expect(nomes(f).some((n) => camadaEsperada.test(n) && n.startsWith(`T${nivel}_`)), `${f}: a §8 pede "${coluna}"`).toBe(true);
        }
      }
    }
    expect(vistos).toBeGreaterThan(25);
  });

  it("aceite do lote: todo `lt_*` de liturgicalTrophies/data.ts tem os três níveis em assets/lottie/trophies", () => {
    const ids = ALL_LITURGICAL_TROPHIES.map((t) => t.id).filter((id) => id.startsWith("lt_"));
    expect(ids.length).toBe(ALL_LITURGICAL_TROPHIES.length);
    const faltam = ids.flatMap(niveis).filter((f) => !fs.existsSync(path.join(OUT, f)));
    expect(faltam).toEqual([]);
  });
});

describe("Lottie — lote 5, ajustes do dono (Cecília, Francisco, Lucas e Todos os Santos)", () => {
  /** Ponto do desenho da camada → quadro t (âncora, escala, rotação e posição). */
  const noQuadro = (ly: any, t: number, [x, y]: number[]): number[] => {
    const [px, py] = em(ly.ks.p, t), [ax, ay] = em(ly.ks.a, t), [sx, sy] = em(ly.ks.s, t).map((v) => v / 100);
    const r = (em(ly.ks.r, t)[0] * Math.PI) / 180, lx = (x - ax) * sx, lyy = (y - ay) * sy;
    return [px + lx * Math.cos(r) - lyy * Math.sin(r), py + lx * Math.sin(r) + lyy * Math.cos(r)];
  };
  /** Caixa [x0, y0, x1, y1] da área desenhada da camada no quadro t. */
  const caixa = (ly: any, t = 89): number[] => {
    const pts = layerSamples(ly, t);
    expect(pts.length, ly.nm).toBeGreaterThan(0);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const seCruzam = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const grupoDe = (ly: any, nm: string) => {
    const g = ly.shapes.find((x: any) => x.nm === nm);
    expect(g, `${ly.nm}/${nm}`).toBeDefined();
    return g;
  };
  const formas = (g: any) => g.it.filter((it: any) => it.ty === "sh" || it.ty === "el");

  it("Francisco: o lobo é uma camada só, de um lado só, sentado aos pés dele, sem cruzar o corpo do santo no quadro final", () => {
    for (const f of niveis("lt_francisco_assis").slice(1)) {
      const lobos = nomes(f).filter((n) => /Lobo/.test(n));
      expect(lobos, f).toEqual(["T2_Lobo"]);
      const lobo = caixa(camada(f, "T2_Lobo"));
      const corpo = caixa(camada(f, "G_Francisco"));
      for (const nm of ["G_Francisco", "G_BracoE", "G_BracoD"]) expect(seCruzam(lobo, caixa(camada(f, nm))), `${f}: o lobo cruza ${nm}`).toBe(false);
      // inteiro à direita do santo, e no chão, aos pés dele
      expect(lobo[0], `${f}: lobo de um lado só`).toBeGreaterThan(corpo[2]);
      expect(Math.abs(lobo[3] - corpo[3]), `${f}: lobo no chão, aos pés do santo`).toBeLessThan(6);
      expect(lobo[1], `${f}: lobo sentado, abaixo dos braços erguidos`).toBeGreaterThan(corpo[1] + 20);
      // um lobo manso: cinza, orelhas pontudas, focinho e rabo peludo
      const grupos = camada(f, "T2_Lobo").shapes.map((g: any) => g.nm);
      expect(grupos, f).toEqual(expect.arrayContaining(["Orelhas", "Focinho", "Nariz", "Rabo", "Corpo", "Patas da frente"]));
      expect(coresDe(grupoDe(camada(f, "T2_Lobo"), "Corpo")), f).toEqual(["#AAB8C2"]);
    }
  });

  it("Lucas: as asas são de penas, presas no ombro do touro, e abrem para cima e para trás (para o rabo)", () => {
    for (const f of niveis("lt_lucas")) {
      const asa = camada(f, "G_Asa"), touro = camada(f, "G_Touro");
      const ombro = em(asa.ks.p, 89);
      expect(em(asa.ks.a, 89).slice(0, 2), f).toEqual([0, 0]);
      // o rabo do touro fica à esquerda do ombro: "para trás" é para a esquerda
      const rabo = noQuadro(touro, 89, centroDe(touro, "Tufo"));
      expect(rabo[0], `${f}: rabo atrás do ombro`).toBeLessThan(ombro[0] - 20);
      // o ombro é no alto do corpo do touro
      const corpo = pontosDe([grupoDe(touro, "Corpo")]).map((q) => noQuadro(touro, 89, q));
      expect(ombro[0], f).toBeGreaterThan(Math.min(...corpo.map((q) => q[0])));
      expect(ombro[0], f).toBeLessThan(Math.max(...corpo.map((q) => q[0])));
      expect(Math.abs(ombro[1] - Math.min(...corpo.map((q) => q[1]))), `${f}: asa presa no alto do corpo`).toBeLessThan(6);
      // a ponta da asa (o ponto mais alto) fica acima e atrás do ombro, e a asa inteira também
      const pts = layerSamples(asa, 89);
      const ponta = pts.reduce((m, q) => (q[1] < m[1] ? q : m));
      expect(ponta[1], `${f}: ponta acima do ombro`).toBeLessThan(ombro[1] - 25);
      expect(ponta[0], `${f}: ponta atrás do ombro (lado do rabo)`).toBeLessThan(ombro[0]);
      const meio = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
      expect(meio[0], `${f}: asa para trás`).toBeLessThan(ombro[0]);
      expect(meio[1], `${f}: asa para cima`).toBeLessThan(ombro[1]);
      // de penas, em cor de ave (não a asa clara lisa): fileiras de penas
      for (const nm of ["Penas longas", "Penas medias", "Cobertas"]) expect(formas(grupoDe(asa, nm)).length, `${f} ${nm}`).toBeGreaterThanOrEqual(6);
      expect(coresDe(grupoDe(asa, "Penas longas")), f).toEqual(["#A0522D"]);
      // a asa de trás vai com o touro e também abre para o rabo
      const tras = pontosDe([grupoDe(touro, "Penas longas")]).map((q) => noQuadro(touro, 89, q));
      const topo = tras.reduce((m, q) => (q[1] < m[1] ? q : m));
      expect(topo[0], `${f}: asa de trás para o rabo`).toBeLessThan(ombro[0]);
      expect(topo[1], `${f}: asa de trás para cima`).toBeLessThan(ombro[1] - 20);
    }
  });

  it("Cecília: sentada de lado, com o rosto virado para o órgão e as mãos sobre o teclado", () => {
    for (const f of niveis("lt_cecilia")) {
      const cecilia = camada(f, "G_Cecilia"), orgao = camada(f, "G_Orgao"), maos = camada(f, "G_Maos");
      // rosto de três quartos: olhos, nariz e boca do lado do órgão
      const rosto = centroDe(cecilia, "Rosto");
      for (const nm of ["Olhos", "Nariz", "Boca"]) {
        const xs = pontosDe([grupoDe(cecilia, nm)]).map((q) => q[0]);
        expect(xs.reduce((s, x) => s + x, 0) / xs.length, `${f} ${nm}: virado para o órgão`).toBeGreaterThan(rosto[0] + 2);
      }
      const face = noQuadro(cecilia, 89, rosto);
      const teclado = pontosDe([grupoDe(orgao, "Teclado")]).map((q) => noQuadro(orgao, 89, q));
      const [tx0, ty0, tx1, ty1] = [Math.min(...teclado.map((q) => q[0])), Math.min(...teclado.map((q) => q[1])), Math.max(...teclado.map((q) => q[0])), Math.max(...teclado.map((q) => q[1]))];
      expect(tx0, `${f}: o órgão fica do lado para onde ela olha`).toBeGreaterThan(face[0]);
      expect(ty0, `${f}: o teclado abaixo do rosto (ela olha para baixo, para as teclas)`).toBeGreaterThan(face[1]);
      // as mãos sobre as teclas, em todo o toque (o quadro final e o meio da animação)
      for (const t of [30, 60, 89]) {
        for (const nm of ["Mao1", "Mao2"]) {
          const [x, y] = noQuadro(maos, t, centroDe(maos, nm));
          expect(x >= tx0 && x <= tx1 && y >= ty0 && y <= ty1, `${f} ${nm} quadro ${t}: (${x}, ${y}) fora do teclado`).toBe(true);
        }
      }
      // os braços vão do ombro (no corpo dela) até as mãos
      const manga = pontosDe([grupoDe(maos, "Manga")]).map((q) => noQuadro(maos, 89, q));
      const veste = caixa({ ...cecilia, shapes: [grupoDe(cecilia, "Veste")] });
      expect(manga[0][0] >= veste[0] && manga[0][0] <= veste[2] && manga[0][1] >= veste[1] && manga[0][1] <= veste[3], `${f}: braço sai do ombro`).toBe(true);
      // sentada: há o banco, e nenhum pé de figura em pé
      expect(cecilia.shapes.map((g: any) => g.nm), f).toEqual(expect.arrayContaining(["Banco", "Saia", "Cabelo"]));
    }
  });

  it("Todos os Santos (ouro): o Cordeiro tem lã em cachos, cara e orelhas escuras, quatro patas e o estandarte com a cruz vermelha, no alto da multidão", () => {
    const f = "lt_todos_santos_t3.json";
    const cordeiro = camada(f, "T3_Cordeiro");
    const g = (nm: string) => grupoDe(cordeiro, nm);
    expect(formas(g("La")).length, "cachos da lã").toBeGreaterThanOrEqual(12);
    expect(formas(g("Contorno da la")).length).toBe(formas(g("La")).length);
    expect(coresDe(g("La"))).toEqual(["#FFFFFF"]);
    const escura = (cor: string) => parseInt(cor.slice(1, 3), 16) + parseInt(cor.slice(3, 5), 16) + parseInt(cor.slice(5, 7), 16) < 3 * 0x60;
    for (const nm of ["Cara", "Orelhas"]) expect(coresDe(g(nm)).every(escura), `${nm} escura`).toBe(true);
    expect(formas(g("Orelhas"))).toHaveLength(2);
    expect(formas(g("Patas da frente")).length + formas(g("Patas de tras")).length, "quatro patas").toBe(4);
    expect(formas(g("Cascos"))).toHaveLength(4);
    expect(coresDe(g("Estandarte"))).toEqual(["#FFFFFF"]);
    expect(formas(g("Cruz do estandarte"))).toHaveLength(2);
    expect(hexDe(g("Cruz do estandarte").it.find((it: any) => it.ty === "st").c.k)).toBe("#DD2E44");
    expect(cordeiro.shapes.map((x: any) => x.nm)).toEqual(expect.arrayContaining(["Haste", "Tufo", "Olho", "Rabo"]));
    // de pé: os cascos no chão (y = 0) abaixo da lã
    const la = pontosDe([g("La")]).map((q) => q[1]);
    expect(Math.max(...pontosDe([g("Cascos")]).map((q) => q[1]))).toBeGreaterThan(Math.max(...la) + 2);
    // grande e no alto: acima da fileira de trás, com tamanho de peça (não um detalhe)
    const [x0, y0, x1, y1] = caixa(cordeiro);
    expect(x1 - x0, "largura do Cordeiro").toBeGreaterThan(30);
    expect(y1, "acima da multidão").toBeLessThan(caixa(camada(f, "G_FilaTras"))[1]);
    expect(y0).toBeGreaterThan(lib.VIEW_WINDOW[1]);
  });
});

checkLot({ name: "lote 5", lot, generator: path.resolve(__dirname, "../trophy-lot-5.js"), files: 96 });
