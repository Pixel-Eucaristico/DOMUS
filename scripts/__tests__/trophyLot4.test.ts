/**
 * Story 11.7 — lote 4 de Lottie (24 litúrgicos de agosto e setembro).
 * Confere a tabela de scripts/trophy-lot-4.js, os JSON gerados em
 * assets/lottie/trophies/ (verificações comuns em trophyLotChecks.ts), que
 * nenhum desenho se repete entre os quatro lotes e as regras das §6 e §7 do
 * guia (pessoa como `figura` ou `busto` com a pele comum, atrás do que fica na
 * frente dela; Maria grande e visível; luz só com a `luzSuave`; terço e objetos
 * católicos desenhados; nada que lembre jogo).
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createRequire } from "node:module";
import { ALL_LITURGICAL_TROPHIES } from "../../packages/gamification/src/liturgicalTrophies/data";
import { checkLot, designFingerprint, guideRows, readLottie, valueAt, type Entry } from "./trophyLotChecks";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-4.js");
const { PELE } = require("../lottie-lib/desenhos");
const { registeredLots } = require("../lottie-lib/lots");
const TROPHIES: Entry[] = lot.TROPHIES;

/** Cor litúrgica esperada: mártires e apóstolos e as festas da Cruz e da Paixão em vermelho; o resto em branco. */
const VERMELHO = ["lt_lourenco", "lt_kolbe", "lt_bartolomeu", "lt_joao_batista_mart", "lt_exaltacao_cruz", "lt_mateus", "lt_cosme_damiao"];

const nomes = (f: string): string[] => readLottie(f).layers.map((ly: any) => ly.nm);
const niveis = (id: string) => [`${id}.json`, `${id}_t2.json`, `${id}_t3.json`];
const camada = (f: string, nm: string) => {
  const ly = readLottie(f).layers.find((l: any) => l.nm === nm);
  expect(ly, `${f} ${nm}`).toBeDefined();
  return ly;
};
/** Confere que as duas camadas existem e que `frente` vem antes de `atras` (as camadas vão da frente para trás). */
const naFrente = (f: string, frente: string, atras: string) => {
  const ns = nomes(f);
  expect(ns, f).toContain(frente);
  expect(ns, f).toContain(atras);
  expect(ns.indexOf(frente), `${f}: ${frente} na frente de ${atras}`).toBeLessThan(ns.indexOf(atras));
};
/** Valor de uma propriedade no quadro t (estática ou animada). */
const em = (prop: any, t: number): number[] => valueAt(prop, t);
/** Ponto do desenho de uma camada → quadro (posição, âncora, escala e rotação no quadro t). */
const noQuadro = (ly: any, t: number, [x, y]: number[]): number[] => {
  const [px, py] = em(ly.ks.p, t), [ax, ay] = em(ly.ks.a, t), [sx, sy] = em(ly.ks.s, t).map((v) => v / 100);
  const r = (em(ly.ks.r, t)[0] * Math.PI) / 180, lx = (x - ax) * sx, lyy = (y - ay) * sy;
  return [px + lx * Math.cos(r) - lyy * Math.sin(r), py + lx * Math.sin(r) + lyy * Math.cos(r)];
};
/** Ponto do quadro → desenho da camada (a inversa de `noQuadro`). */
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
/** Cor de preenchimento de um grupo, em "#RRGGBB". */
const corDe = (g: any) => {
  const c = g.it.find((it: any) => it.ty === "fl").c.k;
  return `#${c.slice(0, 3).map((v: number) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

describe("Lottie — lote 4", () => {
  it("tem os 24 litúrgicos de agosto e setembro, e só eles", () => {
    const expected = ALL_LITURGICAL_TROPHIES.filter((t) => t.month === 8 || t.month === 9).map((t) => t.id).sort();
    const ids = TROPHIES.map((e) => e.id).sort();
    expect(ids).toEqual(expected);
    expect(ids).toHaveLength(24);
    expect(TROPHIES.every((e) => e.kind === "liturgical")).toBe(true);
  });

  it("cor litúrgica de cada festa (vermelho para mártires, apóstolos e a Exaltação da Santa Cruz)", () => {
    for (const e of TROPHIES) expect(e.color, e.id).toBe(VERMELHO.includes(e.id) ? "vermelho" : "branco");
  });

  it("nenhum troféu repete id nem desenho dos lotes 1 a 3 (peça principal e geometria do gesto)", () => {
    const all: Entry[] = registeredLots().flatMap((l: any) => l.TROPHIES);
    expect(all).toHaveLength(13 + 21 + 27 + 24);
    expect(() => lot.checkUniqueIds(all)).not.toThrow();
    expect(() => lot.checkUniqueIcons(all)).not.toThrow();
    const prints = all.map((e) => designFingerprint(readLottie(`${e.id}.json`)));
    expect(new Set(prints).size).toBe(prints.length);
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

  it("pessoa em ação, em busto: o busto simples (rosto, olhos, veste, sem pés)", () => {
    confereGente({
      lt_joao_vianney: todos(["G_Padre"]),
      lt_clara: todos(["G_Clara"]),
      lt_assuncao: prataEOuro(["T2_Anjos"]),
      lt_maria_rainha: todos(["G_Maria"]),
      lt_monica: todos(["G_Monica"]),
      lt_gregorio_magno: todos(["G_Papa"]),
      lt_natividade_maria: prataEOuro(["T2_SantAna"]),
      lt_mateus: todos(["G_Anjo"]),
      lt_pio_pietrelcina: todos(["G_Pio"]),
      lt_cosme_damiao: todos(["G_Cosme", "G_Damiao"]),
      lt_vicente_paulo: todos(["G_Vicente", "G_Crianca"]),
    }, false);
    for (const f of ["lt_assuncao_t2.json", "lt_assuncao_t3.json"]) {
      expect(camada(f, "T2_Anjos").shapes.filter((g: any) => g.nm === "Rosto"), f).toHaveLength(2);
    }
  });

  it("pessoa em ação, de corpo inteiro: a `figura` (com pés), na Transfiguração e na Assunção", () => {
    confereGente({
      lt_transfiguracao: todos(["G_Jesus", "G_Glorioso"]),
      lt_assuncao: todos(["G_Maria"]),
    }, true);
    for (const f of ["lt_transfiguracao_t2.json", "lt_transfiguracao_t3.json"]) {
      const grupos = camada(f, "T2_MoisesElias").shapes.map((g: any) => g.nm);
      for (const g of ["Rosto", "Olhos", "Veste", "PeE", "PeD"]) expect(grupos.filter((n: string) => n === g), `${f} ${g}`).toHaveLength(2);
    }
  });

  it("todo rosto e toda mão do lote têm a mesma cor de pele (PELE)", () => {
    let vistos = 0;
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        for (const ly of readLottie(f).layers) {
          for (const g of ly.shapes) {
            if (!/^(Rosto|Pescoco|Mao\w*|MaosPostas|Bebe)$/.test(g.nm)) continue;
            vistos++;
            expect(corDe(g), `${f} ${ly.nm}/${g.nm}`).toBe(PELE);
          }
        }
      }
    }
    expect(vistos).toBeGreaterThan(50);
  });

  it("a pessoa fica atrás do que está na frente dela, nos três níveis (e os acréscimos da prata e do ouro)", () => {
    const ORDEM: Record<string, [string, string][]> = {
      lt_joao_vianney: [["G_Padre", "Cabine"]],
      lt_clara: [["G_Custodia", "G_Clara"]],
      lt_maria_rainha: [["G_Coroa", "G_Maria"]],
      lt_monica: [["G_Lagrimas", "G_Monica"]],
      lt_gregorio_magno: [["G_Pomba", "G_Papa"]],
      lt_mateus: [["G_Anjo", "G_AsaD"], ["G_Anjo", "G_AsaE"]],
      lt_pio_pietrelcina: [["G_Maos", "G_Pio"]],
      lt_cosme_damiao: [["G_Caixa", "G_Cosme"], ["G_Caixa", "G_Damiao"], ["G_Pilao", "G_Caixa"]],
      lt_vicente_paulo: [["G_Mao", "G_Crianca"], ["G_Crianca", "G_Vicente"]],
      lt_transfiguracao: [["G_Glorioso", "G_Jesus"], ["G_Jesus", "Monte"]],
      lt_assuncao: [["G_Maria", "G_Nuvens"], ["G_Maria", "G_Luz"]],
    };
    const ORDEM_PRATA: Record<string, [string, string][]> = {
      lt_monica: [["T2_Terco", "G_Monica"]],
      lt_pio_pietrelcina: [["T2_Terco", "G_Pio"]],
      lt_assuncao: [["G_Maria", "T2_Anjos"]],
      lt_natividade_maria: [["G_Berco", "T2_SantAna"]],
      lt_transfiguracao: [["G_Jesus", "T2_MoisesElias"], ["T2_MoisesElias", "Monte"]],
    };
    for (const [id, pares] of Object.entries(ORDEM)) for (const f of niveis(id)) for (const [a, b] of pares) naFrente(f, a, b);
    for (const [id, pares] of Object.entries(ORDEM_PRATA)) for (const f of niveis(id).slice(1)) for (const [a, b] of pares) naFrente(f, a, b);
  });

  it("auréolas acompanham a cabeça: no quadro final o centro da auréola fica no eixo da cabeça, acima do rosto", () => {
    // [troféu, níveis, camada da auréola, camada da pessoa, grupo de referência da cabeça]
    const AUREOLAS: [string, number[], string, string, string][] = [
      ["lt_clara", [0, 1, 2], "Aureola", "G_Clara", "Rosto"],
      ["lt_maria_rainha", [0, 1, 2], "Aureola", "G_Maria", "Rosto"],
      ["lt_monica", [0, 1, 2], "Aureola", "G_Monica", "Rosto"],
      ["lt_natividade_maria", [0, 1, 2], "Aureola", "G_Berco", "Bebe"],
      ["lt_joao_vianney", [2], "T3_Aureola", "G_Padre", "Rosto"],
      ["lt_assuncao", [2], "T3_AureolaEstrelas", "G_Maria", "Rosto"],
      ["lt_gregorio_magno", [2], "T3_Aureola", "G_Papa", "Rosto"],
      ["lt_mateus", [2], "T3_Aureola", "G_Anjo", "Rosto"],
      ["lt_pio_pietrelcina", [2], "T3_Aureola", "G_Pio", "Rosto"],
      ["lt_cosme_damiao", [2], "T3_Aureola1", "G_Cosme", "Rosto"],
      ["lt_cosme_damiao", [2], "T3_Aureola2", "G_Damiao", "Rosto"],
      ["lt_vicente_paulo", [2], "T3_Aureola", "G_Vicente", "Rosto"],
    ];
    for (const [id, ks, aur, pessoa, ref] of AUREOLAS) {
      for (const k of ks) {
        const f = niveis(id)[k];
        const halo = camada(f, aur), gente = camada(f, pessoa);
        const [hx, hy] = noDesenho(gente, 89, em(halo.ks.p, 89));
        const [rx, ry] = centroDe(gente, ref);
        expect(Math.abs(hx - rx), `${f} ${aur}: fora do eixo da cabeça (${hx} × ${rx})`).toBeLessThan(1);
        expect(hy, `${f} ${aur}: acima do rosto`).toBeLessThan(ry);
      }
    }
  });

  it("Santa Mônica: as lágrimas descem dos olhos na mesma inclinação do busto", () => {
    for (const f of niveis("lt_monica")) {
      const busto = camada(f, "G_Monica"), gotas = camada(f, "G_Lagrimas");
      expect(JSON.stringify(gotas.ks.p), f).toBe(JSON.stringify(busto.ks.p));
      expect(JSON.stringify(gotas.ks.r), f).toBe(JSON.stringify(busto.ks.r));
      // no quadro em que a gota aparece, ela está nos olhos (no desenho do busto, rosto em (0,0))
      const olhos = busto.shapes.find((g: any) => g.nm === "Olhos");
      const yOlho = Math.max(...pontosDe([olhos]).map((p) => p[1]));
      for (const t of [27, 55]) {
        const gota = noDesenho(busto, t, noQuadro(gotas, t, centroDeGota(gotas)));
        expect(Math.abs(gota[1] - yOlho), `${f} quadro ${t}`).toBeLessThan(4);
      }
    }
  });

  it("Maria grande e visível: na frente das nuvens, da luz e de tudo o que não é coroa ou estrela", () => {
    for (const [id, nm] of [["lt_assuncao", "G_Maria"], ["lt_maria_rainha", "G_Maria"]]) {
      for (const f of niveis(id)) {
        const ns = nomes(f);
        expect(ns, f).toContain(nm);
        const outros = ns.slice(0, ns.indexOf(nm));
        expect(outros.every((n) => /^(G_Coroa|T3_Estrelas|T3_AureolaEstrelas)$/.test(n)), `${f}: na frente de Maria: ${outros}`).toBe(true);
        expect(em(camada(f, nm).ks.o, 89)[0], f).toBe(100);
      }
    }
    // Maria de corpo inteiro na Assunção: só a figura (sem a nuvem dos pés), na escala da camada, com ao menos 60 px
    for (const f of niveis("lt_assuncao")) {
      const maria = camada(f, "G_Maria");
      const figura = maria.shapes.filter((g: any) => !/^(Bola\d|Base)$/.test(g.nm));
      const ys = pontosDe(figura).map((p) => p[1]);
      const altura = (Math.max(...ys) - Math.min(...ys)) * (em(maria.ks.s, 89)[1] / 100);
      expect(altura, f).toBeGreaterThanOrEqual(60);
    }
    // Nossa Senhora das Dores: o coração de Maria fica na frente das sete espadas
    for (const f of niveis("lt_dores_maria")) {
      for (const nm of ["G_EspadasE", "G_EspadasD"]) naFrente(f, "G_Coracao", nm);
      const espadas = ["G_EspadasE", "G_EspadasD"].flatMap((nm) => camada(f, nm).shapes.filter((g: any) => /Lamina$/.test(g.nm)));
      expect(espadas, f).toHaveLength(7);
    }
  });

  it("São Domingos: a estrela do ouro fica na fronte do cachorrinho e acompanha o passo dele", () => {
    const f = "lt_domingos_t3.json";
    const cao = camada(f, "G_Cao"), estrela = camada(f, "T3_Estrela");
    const [fx, fy] = centroDe(cao, "Cabeca");
    for (const t of [52, 70, 89]) {
      const [x, y] = noDesenho(cao, t, em(estrela.ks.p, t));
      expect(Math.abs(x - fx), `quadro ${t}`).toBeLessThan(4);
      expect(y, `quadro ${t}: acima do meio da cabeça`).toBeLessThan(fy);
      expect(fy - y, `quadro ${t}: na fronte, não acima dela`).toBeLessThan(9);
    }
    expect(JSON.stringify(readLottie(f)), f).not.toMatch(/twemoji-2b50/);
  });

  it("terço e objetos católicos são desenhados, não emoji; nada que lembre jogo ou aposta", () => {
    for (const [id, nm] of [["lt_joao_vianney", "T2_Terco"], ["lt_domingos", "T2_Terco"], ["lt_monica", "T2_Terco"], ["lt_pio_pietrelcina", "T2_Terco"]]) {
      for (const f of [`${id}_t2.json`, `${id}_t3.json`]) {
        expect(camada(f, nm).shapes.map((g: any) => g.nm), f).toEqual(expect.arrayContaining(["Crucifixo", "ContasGrandes", "ContasPequenas"]));
      }
    }
    // 📿 terço, 🏅 medalha, ✝ cruz, ⛪ igreja; 🎲 dado, 🃏 carta, 🎰 caça-níquel, 🎯 alvo, 🪙 moeda
    const PROIBIDOS = ["1f4ff", "1f3c5", "271d", "26ea", "1f3b2", "1f0cf", "1f3b0", "1f3af", "1fa99"].map((k) => `twemoji-${k}`);
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        const txt = JSON.stringify(readLottie(f));
        for (const key of txt.match(/twemoji-[0-9a-f]+/g) || []) expect(PROIBIDOS, `${f}: ${key}`).not.toContain(key);
        expect(txt, f).not.toMatch(/"nm":"(Dado|Carta|Ficha|Roleta)/);
      }
    }
    for (const [id, icon] of [["lt_exaltacao_cruz", "desenho-cruz-gloriosa"], ["lt_clara", "desenho-clara-e-custodia"], ["lt_joao_vianney", "desenho-confessionario"]]) {
      expect(TROPHIES.find((e) => e.id === id)!.icon, id).toBe(icon);
      expect(lot.DRAWN[icon], icon).toBeDefined();
    }
  });

  it("peças da tabela: nenhuma camada de nenhum nível usa a peça principal de outro troféu, e o gesto usa só o `uses` da peça desenhada", () => {
    const all: Entry[] = registeredLots().flatMap((l: any) => l.TROPHIES);
    const mains = new Set(all.map((e) => e.icon));
    // nome dos grupos de peça da tabela: "<chave>_<n>" ou "<chave>#<k>_<n>"
    const PECA = /^((?:twemoji|bootstrap)-[a-z0-9-]+?)(?:#\d+)?_\d+$/;
    const pecas = (layers: any[]) => {
      const out = new Set<string>();
      for (const ly of layers) for (const g of ly.shapes) { const m = PECA.exec(g.nm); if (m) out.add(m[1]); }
      return out;
    };
    let vistas = 0;
    for (const e of TROPHIES) {
      const drawn = lot.DRAWN[e.icon];
      expect(drawn, `${e.id}: peça principal desenhada`).toBeDefined();
      for (const key of drawn.uses) expect(mains.has(key), `${e.icon} embrulha ${key}, peça principal de outro troféu`).toBe(false);
      for (const f of niveis(e.id)) {
        const layers = readLottie(f).layers;
        expect([...pecas(layers.filter((l: any) => /^G_/.test(l.nm)))].sort(), `${f}: peças do gesto = uses de ${e.icon}`).toEqual([...drawn.uses].sort());
        for (const key of pecas(layers)) {
          vistas++;
          expect(mains.has(key), `${f}: ${key} é a peça principal de ${all.find((x) => x.icon === key)?.id}`).toBe(false);
        }
      }
    }
    expect(vistas).toBeGreaterThan(0);
  });

  it("Martírio de João Batista: a bandeja traz só a palma de mártir desenhada (sem cabeça, sem pessoa)", () => {
    for (const f of niveis("lt_joao_batista_mart")) {
      const grupos = readLottie(f).layers.flatMap((ly: any) => ly.shapes.map((g: any) => g.nm));
      for (const g of ["Rosto", "Olhos", "Cabelo", "Barba"]) expect(grupos, f).not.toContain(g);
      expect(camada(f, "G_Bandeja").shapes.map((g: any) => g.nm), f).toContain("Bandeja");
      expect(camada(f, "G_Palma").shapes.map((g: any) => g.nm), f).toEqual(["FoliolosD", "FoliolosE", "Talo"]);
    }
  });

  it("auréola de base: cada troféu tem `halo` ou está em SEM_HALO (nunca os dois), e quem tem a auréola só no ouro tem a T3_Aureola", () => {
    const SEM_HALO: Record<string, string> = lot.SEM_HALO;
    for (const e of TROPHIES) expect(Boolean(e.halo) !== Boolean(SEM_HALO[e.id]), `${e.id}: halo ${Boolean(e.halo)}, SEM_HALO ${SEM_HALO[e.id]}`).toBe(true);
    expect(Object.keys(SEM_HALO).every((id) => TROPHIES.some((e) => e.id === id))).toBe(true);
    for (const [id, motivo] of Object.entries(SEM_HALO)) {
      if (!motivo.startsWith("auréola só no ouro")) continue;
      expect(nomes(`${id}_t3.json`).some((n) => /^T3_Aureola/.test(n)), `${id}_t3: ${motivo}`).toBe(true);
      expect(nomes(`${id}_t2.json`).some((n) => /Aureola/.test(n)), `${id}_t2: auréola antes do ouro`).toBe(false);
    }
  });

  it("todo ouro cuja coluna de ouro do guia (§7) fala em luz tem uma luzSuave", () => {
    const linhas = guideRows(7);
    expect(linhas).toHaveLength(24);
    const porNome = new Map(ALL_LITURGICAL_TROPHIES.map((t) => [t.name, t.id]));
    const ids = new Set(TROPHIES.map((e) => e.id));
    const comLuz: string[] = [];
    for (const { nome, ouro } of linhas) {
      const id = porNome.get(nome);
      expect(id && ids.has(id), `linha do guia sem troféu no lote: ${nome}`).toBe(true);
      if (/\bluz\b/i.test(ouro)) comLuz.push(id!);
    }
    expect(comLuz.length).toBeGreaterThan(15);
    for (const id of comLuz) {
      const tem = readLottie(`${id}_t3.json`).layers.some((ly: any) => /^T3_/.test(ly.nm) && ehLuzSuave(ly));
      expect(tem, `${id}_t3: o guia pede luz no ouro`).toBe(true);
    }
  });

  it("luz: camada de luz, brilho ou raios (pelo nome ou pelo conteúdo) é a luzSuave ou uma luz de escala fixa e uniforme, sem forma animada", () => {
    const LUZ_NOME = /Luz|Ceu|Brilho|Raios/;
    const LUZ_GRUPOS = /^(Luz(Fonte|Raios|Miolo|Meio|Borda)|Brilho|Raios)$/;
    const groupsOf = (items: any[]): any[] => items.flatMap((it: any) => (it.ty === "gr" ? [it, ...groupsOf(it.it)] : []));
    let vistas = 0;
    for (const e of TROPHIES) {
      for (const f of niveis(e.id)) {
        for (const ly of readLottie(f).layers) {
          if (ly.nm === "Glow" || /^Sp\d$/.test(ly.nm)) continue;
          const groups = groupsOf(ly.shapes);
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
    expect(vistas).toBeGreaterThan(30);
    // Transfiguração e Assunção: a luz faz parte do gesto desde o bronze
    for (const id of ["lt_transfiguracao", "lt_assuncao"]) expect(ehLuzSuave(camada(`${id}.json`, "G_Luz")), id).toBe(true);
  });

  it("Transfiguração: a túnica fica branca (a figura branca aparece depois sobre a de túnica comum)", () => {
    for (const f of niveis("lt_transfiguracao")) {
      const comum = camada(f, "G_Jesus"), branca = camada(f, "G_Glorioso");
      const tunica = (ly: any) => corDe(ly.shapes.find((g: any) => g.nm === "Veste"));
      expect(tunica(branca), f).toBe("#FFFFFF");
      expect(tunica(comum), f).not.toBe("#FFFFFF");
      expect(em(branca.ks.o, 0)[0], f).toBe(0);
      expect(em(branca.ks.o, 89)[0], f).toBe(100);
      expect(JSON.stringify(branca.ks.p), f).toBe(JSON.stringify(comum.ks.p));
    }
  });

  it("São Pedro Claver: as duas metades da corrente começam juntas no meio (x = 100) e caem", () => {
    for (const f of niveis("lt_pedro_claver")) {
      const e = camada(f, "G_CorrenteE"), d = camada(f, "G_CorrenteD");
      const xs = (ly: any) => pontosDe(ly.shapes).map((p) => noQuadro(ly, 0, p)[0]);
      const pontaE = Math.max(...xs(e)), pontaD = Math.min(...xs(d));
      expect(Math.abs(pontaE - 100), `${f}: ponta de dentro da metade esquerda em ${pontaE}`).toBeLessThan(4);
      expect(Math.abs(pontaD - 100), `${f}: ponta de dentro da metade direita em ${pontaD}`).toBeLessThan(4);
      expect(pontaE, `${f}: as metades se tocam`).toBeGreaterThanOrEqual(pontaD);
      expect(em(e.ks.r, 0)[0], f).toBe(0);
      expect(em(e.ks.r, 89)[0], f).toBeGreaterThan(50);
      expect(em(d.ks.r, 89)[0], f).toBeLessThan(-50);
    }
  });
});

/** Centro (no desenho da camada) da primeira gota de uma camada de lágrimas. */
function centroDeGota(ly: any): number[] {
  const ps = pontosDe([ly.shapes[0]]);
  const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, Math.max(...ys) - (Math.max(...xs) - Math.min(...xs)) / 2];
}

checkLot({ name: "lote 4", lot, generator: path.resolve(__dirname, "../trophy-lot-4.js"), files: 72 });
