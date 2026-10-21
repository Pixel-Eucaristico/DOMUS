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
