/** Testes de scripts/lottie-lib (parser SVG, cores, ids aprovados). */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lib = require("../lottie-lib");

function tmpFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lottielib-"));
  const file = path.join(dir, "LottieTrophy.tsx");
  fs.writeFileSync(file, content);
  return file;
}

describe("parsePath", () => {
  it("lê coordenadas negativas sem separador (svgpath gera M-9-9) e mantém o Z", () => {
    // translate(-10,-10) leva tudo para coordenadas negativas
    const shapes = lib.parsePath("M1 1L5 1L5 5Z", 10, 10, 1, 0, 0);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].v).toEqual([[-9, -9], [-5, -9], [-5, -5]]);
    expect(shapes[0].c).toBe(true);
    for (const pt of [...shapes[0].v, ...shapes[0].i, ...shapes[0].o]) {
      for (const n of pt) expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("lê curvas com coordenadas negativas e expoente", () => {
    const shapes = lib.parsePath("M0 0C1e1 0 10 10 0 10Z", 20, 20, 1, 0, 0);
    expect(shapes[0].v).toEqual([[-20, -20], [-20, -10]]);
    expect(shapes[0].o[0]).toEqual([10, 0]);
    expect(shapes[0].i[1]).toEqual([10, 0]);
  });

  it("recusa comandos não suportados (Q/T)", () => {
    expect(() => lib.parsePath("M0 0Q5 5 10 0Z", 0, 0, 1, 0, 0)).toThrow(/não suportado/);
    expect(() => lib.parsePath("M0 0Q5 5 10 0T20 0", 0, 0, 1, 0, 0)).toThrow(/não suportado/);
  });
});

describe("hex / iconShapes", () => {
  it("recusa cor que não é hex", () => {
    expect(() => lib.hex("red")).toThrow(/Cor inválida/);
    expect(() => lib.hex(undefined)).toThrow(/Cor inválida/);
    expect(lib.hex("#FF0000")).toEqual([1, 0, 0, 1]);
  });

  it("recusa elemento sem d nem circle", () => {
    expect(() => lib.iconShapes({ viewBox: 36, elements: [{ fill: "#FFFFFF" }] }, 80)).toThrow(/sem "d" nem "circle"/);
  });
});

describe("readApprovedIds", () => {
  it("aceita chaves com aspas duplas, simples e sem aspas", () => {
    const file = tmpFile([
      "const APPROVED_LOTTIE: Record<string, {",
      "  base: any;",
      "}> = {",
      '  "dupla": {',
      '    base: require("a.json"),',
      "  },",
      "  'simples': {",
      '    base: require("b.json"),',
      "  },",
      "  sem_aspas: {",
      '    base: require("c.json"),',
      "  },",
      "};",
      "const OUTRO = { fora: { x: 1 } };",
    ].join("\n"));
    expect([...lib.readApprovedIds(file)].sort()).toEqual(["dupla", "sem_aspas", "simples"]);
  });

  it("lança erro sem o início ou sem o fim do bloco", () => {
    expect(() => lib.readApprovedIds(tmpFile("const OUTRO = {};\n"))).toThrow(/APPROVED_LOTTIE não encontrado/);
    expect(() => lib.readApprovedIds(tmpFile('const APPROVED_LOTTIE = {\n  "a": {\n    base: 1,\n  },\n'))).toThrow(/Fim de APPROVED_LOTTIE/);
  });

  it("no arquivo real, conta tantos ids quanto linhas `base: require(`", () => {
    const real = path.resolve(__dirname, "../../src/components/gamification/LottieTrophy.tsx");
    const src = fs.readFileSync(real, "utf8");
    const bases = src.split("\n").filter((l) => /^\s*base:\s*require\(/.test(l)).length;
    expect(bases).toBeGreaterThan(0);
    expect(lib.readApprovedIds(real).size).toBe(bases);
  });
});

describe("movimento", () => {
  it("anim monta chaves s/e, junta emendas iguais e recusa quadros fora de ordem", () => {
    const a = lib.anim([[0, 0], [10, 100, "out"], [10, 100], [20, [50, 60]]]);
    expect(a.a).toBe(1);
    expect(a.k.map((k: any) => k.t)).toEqual([0, 10, 20]);
    expect(a.k[0]).toMatchObject({ s: [0], e: [100] });
    expect(a.k[2]).toEqual({ t: 20, s: [50, 60] });
    expect(() => lib.anim([[10, 0], [5, 1]])).toThrow(/fora de ordem/);
    expect(() => lib.anim([[0, 0], [0, 1]])).toThrow(/mesmo quadro/);
    expect(() => lib.anim([[0, 0, "x"], [5, 1]])).toThrow(/Curva desconhecida/);
  });

  it("onda volta à base; trajeto passa pelos pontos; pulo sobe e volta", () => {
    const o = lib.onda([10, 20], 5, 0, 90, { period: 30, axis: 1 });
    expect(o[0][1]).toEqual([10, 20]);
    expect(o[o.length - 1][1]).toEqual([10, 20]);
    expect(Math.min(...o.map((k: any) => k[1][1]))).toBe(15);
    const tr = lib.trajeto([[0, 0], [10, 0], [20, 10]], 0, 20);
    expect(tr.map((k: any) => [k[0], k[1]])).toEqual([[0, [0, 0]], [10, [10, 0]], [20, [20, 10]]]);
    const p = lib.pulo([0, 50], 4, { h: 10, d: 8 });
    expect(p.map((k: any) => k[1])).toEqual([[0, 50], [0, 40], [0, 50]]);
  });

  it("pieceLayer completa posição, âncora e escala em 3 coordenadas", () => {
    const ly = lib.pieceLayer(1, "G_x", [], { p: lib.anim([[0, [1, 2]], [5, [3, 4]]]), s: lib.anim([[0, 0], [5, [100, 50]]]), a: [5, 6] });
    expect(ly.ks.p.k[0]).toMatchObject({ s: [1, 2, 0], e: [3, 4, 0] });
    expect(ly.ks.s.k[0]).toMatchObject({ s: [0, 0, 100], e: [100, 50, 100] });
    expect(ly.ks.a).toEqual({ a: 0, k: [5, 6, 0] });
  });

  it("iconShapes escolhe elementos, troca cores e usa evenodd", () => {
    const icon = { viewBox: 10, elements: [
      { fill: "#FF0000", d: "M0 0L10 0L10 10Z" },
      { fill: "#00FF00", rule: "evenodd", d: "M0 0L5 0L5 5Z" },
    ] };
    const g = lib.iconShapes(icon, 10, [0, 0], { only: [1], recolor: { "#00FF00": "#0000FF" } });
    expect(g).toHaveLength(1);
    const fl = g[0].it.find((it: any) => it.ty === "fl");
    expect(fl.c.k).toEqual([0, 0, 1, 1]);
    expect(fl.r).toBe(2);
    expect(() => lib.iconShapes(icon, 10, [0, 0], { only: [5] })).toThrow(/inexistentes/);
  });

  it("confete é igual a cada execução", () => {
    expect(JSON.stringify(lib.confete(1, [[1, 0, 0, 1]], { seed: 3 }))).toBe(JSON.stringify(lib.confete(1, [[1, 0, 0, 1]], { seed: 3 })));
  });

  it("luzSuave acende e desce sem mudar de escala, dentro de top..bottom", () => {
    const o = { top: 24, bottom: 150, w0: 12, w1: 80, t0: 30, dur: 16, peak: 30, drop: 8 };
    const luz = lib.luzSuave(1, [1, 1, 1, 1], o);
    expect(luz.ks.s).toEqual({ a: 0, k: [100, 100, 100] });
    const ps = luz.ks.p.k.map((kf: any) => kf.s[1]);
    expect(ps[0]).toBe(o.top);
    expect(ps[ps.length - 1]).toBe(o.top + o.drop);
    // acende até peak e respira ±20% em volta dele
    const aceso = luz.ks.o.k.find((kf: any) => kf.t === o.t0 + o.dur * 0.75);
    expect(aceso).toBeDefined();
    expect(aceso.s).toEqual([o.peak]);
    expect(Math.max(...luz.ks.o.k.map((kf: any) => kf.s[0]))).toBeCloseTo(o.peak * 1.2);
    // forma de tamanho fixo: de 0 a bottom − top − drop na altura e até w1 na largura,
    // com elipses pelos cantos e contornos com metade da largura (curvas suaves passam um fio)
    const pts: number[][] = [];
    const walk = (items: any[], pad = 0) => {
      const st = items.find((it: any) => it.ty === "st");
      const w = st ? st.w.k / 2 : pad;
      for (const it of items) {
        if (it.ty === "sh") for (const [x, y] of lib.samplePoints(it.ks.k)) pts.push([x - w, y - w], [x + w, y + w]);
        if (it.ty === "el") {
          const [cx, cy] = it.p.k, [ew, eh] = it.s.k;
          pts.push([cx - ew / 2, cy - eh / 2], [cx + ew / 2, cy + eh / 2]);
        }
        if (it.ty === "gr") walk(it.it, w);
      }
    };
    walk(luz.shapes);
    const tol = 0.5;
    expect(Math.max(...pts.map((q) => q[1]))).toBeLessThanOrEqual(o.bottom - o.top - o.drop + tol);
    expect(Math.min(...pts.map((q) => q[1]))).toBeGreaterThanOrEqual(-tol);
    expect(Math.max(...pts.map((q) => Math.abs(q[0])))).toBeLessThanOrEqual(o.w1 / 2 + tol);
  });

  it("luzSuave recusa medidas, quadros, raios e peak inválidos", () => {
    const luz = (extra: any) => () => lib.luzSuave(1, [1, 1, 1, 1], { top: 24, bottom: 150, w0: 12, w1: 80, t0: 30, peak: 30, ...extra });
    expect(luz({})).not.toThrow();
    expect(luz({ top: 100, bottom: 104 })).toThrow(/luzSuave: medidas/);
    expect(luz({ w1: 12 })).toThrow(/luzSuave: medidas.*w1 12/);
    expect(luz({ w0: 0 })).toThrow(/luzSuave: medidas.*w0 0/);
    expect(luz({ rays: 1 })).toThrow(/luzSuave: raios/);
    expect(luz({ rays: 2.5 })).toThrow(/luzSuave: raios/);
    expect(luz({ top: 100, bottom: 120, w0: 20, w1: 40 })).toThrow(/luzSuave: altura 12 .*w0 20/);
    expect(luz({ dur: 0 })).toThrow(/luzSuave: dur/);
    expect(luz({ dur: -4 })).toThrow(/luzSuave: dur/);
    expect(luz({ t0: 60, dur: 16 })).toThrow(/luzSuave: t0 60 \+ dur 16/);
    expect(luz({ peak: 90 })).toThrow(/luzSuave: peak 90/);
    expect(luz({ peak: 0 })).toThrow(/luzSuave: peak 0/);
  });

});

describe("validação das ajudas", () => {
  it("anim mantém a curva explícita da chave anterior na emenda", () => {
    const a = lib.anim([[0, 0, "out"], [10, 50, "in"], [10, 50], [20, 100]]);
    expect(a.k[1].o).toEqual({ x: [0.42], y: [0] });
    expect(a.k[1].i).toEqual({ x: [1], y: [1] });
    expect(a.k[0].i).toEqual({ x: [0.58], y: [1] });
  });

  it("onda, pulsar e abrir recusam entradas que não oscilam ou não existem", () => {
    expect(() => lib.onda(0, 1, 0, 30, { period: 0 })).toThrow(/onda: período/);
    expect(() => lib.onda(0, 1, 0, 30, { period: NaN })).toThrow(/onda: período/);
    expect(() => lib.onda(0, 1, 0, 10, { period: 30 })).toThrow(/onda: .*meio período/);
    expect(() => lib.onda([0, 0], 1, 0, 30)).toThrow(/onda: base vetor pede axis/);
    expect(() => lib.onda(0, 1, 0, 30, { axis: 1 })).toThrow(/onda: axis/);
    expect(() => lib.onda([0, 0], 1, 0, 30, { axis: 2 })).toThrow(/onda: axis/);
    expect(() => lib.pulsar(0, 5, { period: 30 })).toThrow(/pulsar:/);
    expect(() => lib.abrir(0, 10, { axis: "z" })).toThrow(/abrir: eixo/);
  });

  it("queda e confete não passam do último quadro", () => {
    expect(() => lib.queda([0, 0], [0, 10], 80, 88)).toThrow(/queda:/);
    expect(() => lib.confete(1, [[1, 0, 0, 1]], { t0: 80 })).toThrow(/confete:/);
  });

  it("iconShapes recusa recolor sem efeito e índices repetidos; aceita #abc e caixa baixa", () => {
    const icon = { viewBox: 10, elements: [{ fill: "#FF0000", d: "M0 0L10 0L10 10Z" }] };
    expect(() => lib.iconShapes(icon, 10, [0, 0], { recolor: { "#00FF00": "#0000FF" } })).toThrow(/recolor sem efeito/);
    expect(() => lib.iconShapes(icon, 10, [0, 0], { only: [0, 0] })).toThrow(/repetidos/);
    const g = lib.iconShapes(icon, 10, [0, 0], { recolor: { "#f00": "#0000FF" } });
    expect(g[0].it.find((it: any) => it.ty === "fl").c.k).toEqual([0, 0, 1, 1]);
    expect(() => lib.iconPoint(undefined, 10, [0, 0])).toThrow(/iconPoint/);
  });

  it("scaleLayer encolhe posição e escala em volta do centro", () => {
    const ly = lib.pieceLayer(1, "x", [], { p: lib.anim([[0, [0, 100]], [5, [200, 100]]]), s: 100 });
    const sc = lib.scaleLayer(ly, 0.5);
    expect(sc.ks.p.k[0]).toMatchObject({ s: [50, 100, 0], e: [150, 100, 0] });
    expect(sc.ks.s.k).toEqual([50, 50, 100]);
  });
});

describe("writeTrophy e montagem comum dos lotes (trophy-kit, lots, desenhos)", () => {
  const kit = require("../lottie-lib/trophy-kit");
  const { LOTS, registeredLots } = require("../lottie-lib/lots");
  const { chuva } = require("../lottie-lib/desenhos");

  it("recusa escrever um id já aprovado", () => {
    const approved: Set<string> = lib.readApprovedIds();
    expect(approved.size).toBeGreaterThan(0);
    const id = [...approved][0];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lot-"));
    try {
      expect(() => lib.writeTrophy(id, "", { v: "5.7.4" }, { approved, outDir: dir })).toThrow(/Recusado/);
      expect(fs.readdirSync(dir)).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("acusa peça principal repetida e id repetido", () => {
    const { checkUniqueIcons } = kit.makeLot({});
    const a = { id: "a", kind: "liturgical", icon: "twemoji-2b50" };
    expect(() => checkUniqueIcons([a, { id: "b", kind: "liturgical", icon: "twemoji-2b50" }])).toThrow(/Desenho repetido/);
    expect(() => kit.checkUniqueIds([a, { ...a, icon: "twemoji-2764" }])).toThrow(/Id repetido: a/);
  });

  it("o registro tem os lotes, sem id nem peça principal repetidos entre eles", () => {
    const lots = registeredLots();
    expect(lots.map((l: any) => path.basename(l.file))).toEqual(["trophy-lot-1.js", "trophy-lot-2.js", "trophy-lot-3.js", "trophy-lot-4.js"]);
    expect(LOTS).toHaveLength(lots.length);
    const all = lots.flatMap((l: any) => l.TROPHIES);
    expect(() => kit.checkUniqueIds(all)).not.toThrow();
    expect(() => kit.makeLot({}).checkUniqueIcons(all)).not.toThrow();
  });

  it("chuva recusa duração sem espaço para aparecer e sumir", () => {
    const peca = () => [];
    expect(() => chuva("C", peca, { t0: 40, dur: 36 })).not.toThrow();
    expect(() => chuva("C", peca, { t0: 40, dur: 10 })).toThrow(/mais de 10 quadros.*duração 10 sobram 10/);
    expect(() => chuva("C", peca, { t0: 40, dur: 8, fade: false })).not.toThrow();
    expect(() => chuva("C", peca, { t0: 70, dur: 30 })).toThrow(/sobram 9 até o quadro 89/);
    expect(() => chuva("C", peca, { t0: 40, dur: 0 })).toThrow(/duração 0 inválida/);
  });
});

describe("desenhos do lote 3 (busto, concha, espelhar, transladar)", () => {
  const { busto, conchaShapes, espelhar, transladar, forma, fill } = require("../lottie-lib/desenhos");
  const grupos = () => [fill([forma([[1, 2], [5, 2], [3, 6]])], "#FFFFFF", "Tri"), lib.makeEllipse(4, -3, 2, 2, lib.hex("#000000"), "Bola")];
  const sh = (g: any) => g.it.find((it: any) => it.ty === "sh").ks.k;
  const el = (g: any) => g.it.find((it: any) => it.ty === "el");

  it("busto recusa escala inválida, cabelo desconhecido e manto com cabelo", () => {
    expect(() => busto(0)).toThrow(/escala inválida 0/);
    expect(() => busto(NaN)).toThrow(/escala inválida NaN/);
    expect(() => busto(1, { cabelo: "careca" })).toThrow(/cabelo "careca"/);
    expect(() => busto(1, { manto: "#3D6FB6", cabelo: "longo" })).toThrow(/manto não combina com cabelo/);
    expect(() => busto(1, { manto: "#3D6FB6", corCabelo: "#000000" })).toThrow(/manto não combina com cabelo/);
    expect(() => busto(1, { manto: "#3D6FB6" })).not.toThrow();
  });

  it("busto com barba não tem bochechas (a barba não fica por baixo delas)", () => {
    const nomes = busto(1, { barba: "#CCD6DD" }).map((g: any) => g.nm);
    expect(nomes).toContain("Barba");
    expect(nomes).not.toContain("Face1");
    expect(busto(1).map((g: any) => g.nm)).toContain("Face1");
  });

  it("figura recusa escala e braços inválidos; espinhosShapes recusa metade desconhecida e divide a coroa", () => {
    const { figura, espinhosShapes } = require("../lottie-lib/desenhos");
    expect(() => figura(0)).toThrow(/escala inválida 0/);
    expect(() => figura(1, { bracos: "cruzados" })).toThrow(/bracos "cruzados"/);
    expect(() => figura(1, { manto: "#FFFFFF", cabelo: "longo" })).toThrow(/manto não combina com cabelo/);
    expect(() => espinhosShapes(10, 4, "#8A4633", { metade: "lado" })).toThrow(/metade "lado"/);
    const ys = (metade: string) => espinhosShapes(10, 4, "#8A4633", { metade })[1].it.find((it: any) => it.ty === "sh").ks.k.v.map(([, y]: number[]) => y);
    expect(ys("frente").every((y: number) => y >= -1e-9)).toBe(true);
    expect(ys("tras").every((y: number) => y <= 1e-9)).toBe(true);
  });

  describe("figura (corpo inteiro)", () => {
    const { figura, OMBRO_E, OMBRO_D, CHAGA } = require("../lottie-lib/desenhos");
    const grupo = (gs: any[], nm: string) => gs.find((g: any) => g.nm === nm);
    const centroEl = (g: any) => g.it.find((it: any) => it.ty === "el").p.k;
    const vs = (g: any) => g.it.filter((it: any) => it.ty === "sh").flatMap((it: any) => it.ks.k.v);

    it("recusa orla sem manto e manto com cabelo, com o nome da ajuda", () => {
      expect(() => figura(1, { orla: "#FFCC4D" })).toThrow(/^figura: orla só vale com manto/);
      expect(() => figura(1, { manto: "#FFFFFF", corCabelo: "#000000" })).toThrow(/^figura: manto não combina/);
    });

    it("geometria documentada (k = 1 e k = 0,5): rosto 22 × 28, corpo x ±32 de y 16 a 104, pés em y 106, manto de −29 a 106", () => {
      for (const k of [1, 0.5]) {
        const gs = figura(k);
        expect(grupo(gs, "Rosto").it.find((it: any) => it.ty === "el").s.k).toEqual([22 * k, 28 * k]);
        const corpo = vs(grupo(gs, "Veste"));
        expect(Math.min(...corpo.map(([x]: number[]) => x))).toBeCloseTo(-32 * k);
        expect(Math.max(...corpo.map(([x]: number[]) => x))).toBeCloseTo(32 * k);
        expect(Math.min(...corpo.map(([, y]: number[]) => y))).toBeCloseTo(16 * k);
        expect(Math.max(...corpo.map(([, y]: number[]) => y))).toBeCloseTo(104 * k);
        expect(centroEl(grupo(gs, "PeE"))).toEqual([-9 * k, 106 * k]);
        expect(centroEl(grupo(gs, "PeD"))).toEqual([9 * k, 106 * k]);
        const capa = vs(grupo(figura(k, { manto: "#FFFFFF" }), "Manto"));
        expect(Math.min(...capa.map(([, y]: number[]) => y))).toBeCloseTo(-29 * k);
        expect(Math.max(...capa.map(([, y]: number[]) => y))).toBeCloseTo(106 * k);
      }
    });

    it("braços: abertos chegam a ±44; mostrando ergue só o da esquerda; esquerdo só desenha esse; postas junta as mãos no peito", () => {
      const abertos = figura(1, { bracos: "abertos" });
      expect(centroEl(grupo(abertos, "MaoE"))).toEqual([-44, 2]);
      expect(centroEl(grupo(abertos, "MaoD"))).toEqual([44, 2]);
      const mostrando = figura(1, { bracos: "mostrando" });
      expect(centroEl(grupo(mostrando, "MaoE"))).toEqual([-44, 12]);
      expect(centroEl(grupo(mostrando, "MaoD"))).toEqual([27, 62]);
      const esquerdo = figura(1, { bracos: "esquerdo" });
      expect(grupo(esquerdo, "MaoE")).toBeDefined();
      expect(grupo(esquerdo, "MaoD")).toBeUndefined();
      expect(grupo(esquerdo, "BracoD")).toBeUndefined();
      const postas = figura(1, { bracos: "postas" });
      expect(grupo(postas, "MaosPostas")).toBeDefined();
      expect(grupo(postas, "MaoE")).toBeUndefined();
      // os braços começam nos ombros exportados
      expect(vs(grupo(abertos, "BracoE"))[0]).toEqual(OMBRO_E);
      expect(vs(grupo(abertos, "BracoD"))[0]).toEqual(OMBRO_D);
    });

    it("chaga (em CHAGA·k) e faixa ficam na frente do corpo e do manto", () => {
      const gs = figura(0.5, { manto: "#FFFFFF", chaga: true, faixa: "#FFCC4D" });
      const ix = (nm: string) => gs.findIndex((g: any) => g.nm === nm);
      expect(centroEl(grupo(gs, "Chaga"))).toEqual([CHAGA[0] * 0.5, CHAGA[1] * 0.5]);
      for (const nm of ["Chaga", "Faixa"]) {
        expect(ix(nm), nm).toBeGreaterThan(-1);
        expect(ix(nm), nm).toBeLessThan(ix("Manto"));
        expect(ix(nm), nm).toBeLessThan(ix("Veste"));
      }
    });
  });

  it("espinhosShapes: frente + trás = a coroa inteira, e nenhuma ponta passa para a outra metade", () => {
    const { espinhosShapes } = require("../lottie-lib/desenhos");
    expect(() => espinhosShapes(10, 4, "#8A4633", null)).not.toThrow();
    const partes = (metade: string | null) => {
      const [pontas, trama] = espinhosShapes(26, 4, "#8A4633", { metade });
      return {
        pontas: pontas.it.filter((it: any) => it.ty === "sh").map((it: any) => it.ks.k.v),
        anel: trama.it.find((it: any) => it.ty === "sh").ks.k.v,
      };
    };
    const toda = partes(null), frente = partes("frente"), tras = partes("tras");
    const chave = (pts: number[][]) => pts.map((p) => p.join(",")).sort();
    // as mesmas pontas (pela base) e os mesmos pontos do anel
    expect(chave([...frente.pontas, ...tras.pontas].map((v: number[][]) => v[0]))).toEqual(chave(toda.pontas.map((v: number[][]) => v[0])));
    expect(new Set([...frente.anel, ...tras.anel].map((p: number[]) => p.join(",")))).toEqual(new Set(toda.anel.map((p: number[]) => p.join(","))));
    for (const v of frente.pontas) for (const [, y] of v) expect(y).toBeGreaterThanOrEqual(0);
    for (const v of tras.pontas) for (const [, y] of v) expect(y).toBeLessThanOrEqual(0);
    // a coroa inteira (lote 2) não muda: com ry = 4 alguma ponta da frente cruzaria y = 0
    expect(toda.pontas.some((v: number[][]) => v[0][1] >= 0 && v[1][1] < 0)).toBe(true);
  });

  it("conchaShapes recusa raio inválido", () => {
    expect(() => conchaShapes(0)).toThrow(/raio inválido 0/);
  });

  it("espelhar troca o sinal de x em v, i, o e no centro da elipse, sem mexer no original", () => {
    const g = grupos();
    const antes = JSON.stringify(g);
    const [tri, bola] = espelhar(g);
    const k0 = sh(g[0]), k1 = sh(tri);
    const neg = (x: number) => (x === 0 ? 0 : -x); // sem −0
    for (const c of ["v", "i", "o"]) {
      expect(k0[c].some(([x]: number[]) => x !== 0), c).toBe(true);
      expect(k1[c].map(([x, y]: number[]) => [x === 0 ? 0 : x, y]), c).toEqual(k0[c].map(([x, y]: number[]) => [neg(x), y]));
    }
    expect(k1.v).toEqual([[-1, 2], [-5, 2], [-3, 6]]);
    expect(el(bola).p.k).toEqual([-4, -3]);
    expect(JSON.stringify(g)).toBe(antes);
  });

  it("transladar move v e o centro da elipse, mas não as tangentes i/o, sem mexer no original", () => {
    const g = grupos();
    const antes = JSON.stringify(g);
    const [tri, bola] = transladar(g, [10, -1]);
    expect(sh(tri).v).toEqual([[11, 1], [15, 1], [13, 5]]);
    expect(sh(tri).i).toEqual(sh(g[0]).i);
    expect(sh(tri).o).toEqual(sh(g[0]).o);
    expect(el(bola).p.k).toEqual([14, -4]);
    expect(JSON.stringify(g)).toBe(antes);
  });

  it("espelhar e transladar recusam caminho animado, grupo deslocado, rc/sr e deslocamento inválido", () => {
    const animado = [{ ty: "gr", nm: "A", it: [{ ty: "sh", ks: { a: 1, k: [] } }] }];
    const deslocado = [{ ty: "gr", nm: "D", it: [{ ty: "tr", p: { a: 0, k: [3, 0] }, a: { a: 0, k: [0, 0] } }] }];
    const rc = [{ ty: "gr", nm: "R", it: [{ ty: "rc" }] }];
    const sr = [{ ty: "gr", nm: "S", it: [{ ty: "sr" }] }];
    for (const f of [espelhar, (g: any) => transladar(g, [1, 1])]) {
      expect(() => f(animado)).toThrow(/caminho animado/);
      expect(() => f(deslocado)).toThrow(/deslocamento na transformação/);
      expect(() => f(rc)).toThrow(/"rc"/);
      expect(() => f(sr)).toThrow(/"sr"/);
    }
    expect(() => transladar(grupos(), [NaN, 0])).toThrow(/deslocamento inválido/);
    expect(() => transladar(grupos(), [0, Infinity])).toThrow(/deslocamento inválido/);
  });
});

describe("desenhos do lote 4 (coroa, palma, estrela, asa, coração, lágrima, galero, pomba)", () => {
  const d = require("../lottie-lib/desenhos");
  /** Todos os vértices e cantos de elipse dos grupos (grupos aninhados inclusive). */
  const pontos = (groups: any[]): number[][] => groups.flatMap((g: any) => g.it.flatMap((it: any) => {
    if (it.ty === "sh") return it.ks.k.v;
    if (it.ty === "el") return [[it.p.k[0] - it.s.k[0] / 2, it.p.k[1] - it.s.k[1] / 2], [it.p.k[0] + it.s.k[0] / 2, it.p.k[1] + it.s.k[1] / 2]];
    if (it.ty === "gr") return pontos([it]);
    return [];
  }));
  const caixa = (groups: any[]) => {
    const ps = pontos(groups);
    return [Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1]))];
  };

  it("recusam medidas inválidas (zero, negativa, NaN, infinita)", () => {
    for (const [nome, f] of [["coroaShapes", d.coroaShapes], ["palmaShapes", d.palmaShapes], ["estrelaShapes", d.estrelaShapes], ["asaShapes", d.asaShapes],
      ["coracaoShapes", d.coracaoShapes], ["lagrimaShapes", d.lagrimaShapes], ["galeroShapes", d.galeroShapes], ["pombaShapes", d.pombaShapes]] as [string, any][]) {
      for (const v of [0, -5, NaN, Infinity, -Infinity, undefined]) expect(() => f(v), `${nome}(${v})`).toThrow(new RegExp(`${nome}: .*inválid`));
      expect(() => f(10), nome).not.toThrow();
    }
    expect(() => d.coroaShapes(20, { n: 2 })).toThrow(/pontas inválidas 2/);
    expect(() => d.coroaShapes(20, { n: 4.5 })).toThrow(/pontas inválidas 4.5/);
  });

  it("opções: coroa com outro número de pontas, estrela com miolo, lágrima e galero com cores", () => {
    const nomes = (gs: any[]) => gs.map((g: any) => g.nm);
    const coroa3 = d.coroaShapes(30, { n: 3 }), coroa7 = d.coroaShapes(30, { n: 7 });
    expect(nomes(coroa3).filter((n: string) => /^Bola\d$/.test(n))).toHaveLength(3);
    expect(nomes(coroa7).filter((n: string) => /^Bola\d$/.test(n))).toHaveLength(7);
    // contorno: os dois cantos da base, a primeira ponta e, para cada uma das outras 6, o vale e a ponta
    expect(coroa7.find((g: any) => g.nm === "Coroa").it.find((it: any) => it.ty === "sh").ks.k.v).toHaveLength(2 + 1 + 2 * 6);
    expect(nomes(d.estrelaShapes(10))).toEqual(["Estrela"]);
    expect(nomes(d.estrelaShapes(10, { miolo: "#FFFFFF" }))).toEqual(["Miolo", "Estrela"]);
    const corDe = (g: any) => g.it.find((it: any) => it.ty === "fl" || it.ty === "st").c.k;
    expect(corDe(d.lagrimaShapes(2, { cor: "#FF0000" })[0])).toEqual(lib.hex("#FF0000"));
    expect(corDe(d.galeroShapes(48, { copa: "#00FF00" }).find((g: any) => g.nm === "Copa"))).toEqual(lib.hex("#00FF00"));
    // o galero de 48 px é o do lote 3; com 24 px, tudo pela metade
    const abas = (w: number) => d.galeroShapes(w).find((g: any) => g.nm === "Abas").it.find((it: any) => it.ty === "el").s.k;
    expect(abas(48)).toEqual([48, 10]);
    expect(abas(24)).toEqual([24, 5]);
  });

  it("ficam onde a documentação diz (pé, base ou centro e medidas)", () => {
    // coroa: base em y = 0, altura 0,7·w, largura w
    const [cx0, cy0, cx1, cy1] = caixa(d.coroaShapes(30));
    expect(cx0).toBeLessThanOrEqual(-15); expect(cx1).toBeGreaterThanOrEqual(15);
    expect(cy1).toBeCloseTo(0, 3); expect(cy0).toBeLessThan(-0.7 * 30 + 0.1);
    // palma: pé em (0,0) e altura h
    const [, py0, , py1] = caixa(d.palmaShapes(60));
    expect(py1).toBeLessThan(3); expect(py0).toBeLessThan(-58); expect(py0).toBeGreaterThan(-70);
    // estrela: raio r em volta de (0,0), ponta para cima
    const [, sy0, , sy1] = caixa(d.estrelaShapes(10));
    expect(sy0).toBeCloseTo(-10, 3); expect(sy1).toBeLessThan(10);
    // asa: raiz em (0,0), abrindo para a direita e para cima até (w, −w); espelhar faz a outra
    const [ax0, ay0, ax1] = caixa(d.asaShapes(20));
    expect(ax0).toBeCloseTo(0, 3); expect(ax1).toBeCloseTo(20, 3); expect(ay0).toBeCloseTo(-20, 3);
    const [ex0, , ex1] = caixa(d.espelhar(d.asaShapes(20)));
    expect(ex0).toBeCloseTo(-20, 3); expect(ex1).toBeCloseTo(0, 3);
    // coração e lágrima: centrados; a ponta do coração embaixo e a da lágrima em cima, sem curva
    const coracao = d.coracaoShapes(40).find((g: any) => g.nm === "Coracao").it.find((it: any) => it.ty === "sh").ks.k;
    expect(coracao.v[6]).toEqual([0, 18.4]);
    expect(coracao.i[6]).toEqual([0, 0]); expect(coracao.o[6]).toEqual([0, 0]);
    const gota = d.lagrimaShapes(2)[0].it.find((it: any) => it.ty === "sh").ks.k;
    expect(gota.v[0]).toEqual([0, -4.4]); expect(gota.i[0]).toEqual([0, 0]);
    // pomba: os pés em (0, 0,22·w)
    const pes = d.pombaShapes(30).find((g: any) => g.nm === "Pes");
    expect(Math.max(...pontos([pes]).map((p) => p[1]))).toBeCloseTo(0.22 * 30, 3);
    expect(d.galeroShapes(48).map((g: any) => g.nm)).toEqual(["Cordoes", "Borlas", "Copa", "Abas"]);
  });

  it("pontas zera as tangentes só nos vértices pedidos", () => {
    const sh = d.pontas(d.forma([[0, 0], [10, 0], [10, 10], [0, 10]]), [1]);
    expect(sh.i[1]).toEqual([0, 0]); expect(sh.o[1]).toEqual([0, 0]);
    expect(sh.i[2]).not.toEqual([0, 0]);
    for (const k of [-1, 4, 1.5, NaN, Infinity]) expect(() => d.pontas(d.forma([[0, 0], [10, 0], [10, 10], [0, 10]]), [k]), String(k)).toThrow(new RegExp(`pontas: índice inválido ${k}`));
  });
});
