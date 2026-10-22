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

  it("confete é igual a cada execução e luzDescendo cresce do alto", () => {
    expect(JSON.stringify(lib.confete(1, [[1, 0, 0, 1]], { seed: 3 }))).toBe(JSON.stringify(lib.confete(1, [[1, 0, 0, 1]], { seed: 3 })));
    const luz = lib.luzDescendo(1, [1, 1, 1, 1], { t0: 4, dur: 10 });
    expect(luz.ks.s.a).toBe(1);
    expect(luz.ks.s.k[0].s).toEqual([100, 0, 100]);
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
