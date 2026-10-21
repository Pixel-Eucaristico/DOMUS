/**
 * Story 11.7 — lote 1 de Lottie (3 sazonais + 10 litúrgicos de janeiro).
 * Confere a tabela de scripts/trophy-lot-1.js e os JSON gerados em
 * assets/lottie/trophies/.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { ALL_LITURGICAL_TROPHIES } from "../../packages/gamification/src/liturgicalTrophies/data";
import { ALL_SEASONAL_TROPHIES } from "../../packages/gamification/src/seasonalTrophies/trophyData";

const require = createRequire(import.meta.url);
const lot = require("../trophy-lot-1.js");
const lib = require("../lottie-lib");

const OUT = path.resolve(__dirname, "../../assets/lottie/trophies");

type Entry = { id: string; kind: "seasonal" | "liturgical"; icon: string };
const TROPHIES: Entry[] = lot.TROPHIES;

function filesOf(e: Entry): string[] {
  return e.kind === "seasonal"
    ? [`${e.id}.json`, `${e.id}_t2.json`, `${e.id}_t3.json`]
    : [`${e.id}.json`];
}

function readLottie(file: string) {
  return JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8"));
}

/** Impressão digital do desenho: só os grupos do ícone, sem cores. */
function designFingerprint(lottie: any): string {
  const main = lottie.layers[0];
  const icon = main.shapes.filter((g: any) => String(g.nm).startsWith("Icon_"));
  return JSON.stringify(icon.map((g: any) => g.it.filter((it: any) => it.ty === "sh" || it.ty === "el")
    .map((it: any) => (it.ty === "sh" ? it.ks.k.v : [it.p.k, it.s.k]))));
}

type Pt = [number, number];

/** Todas as shapes `sh` de um Lottie, com o nome da camada e do grupo. */
function allShapes(lottie: any): { layer: string; group: string; k: any }[] {
  const out: { layer: string; group: string; k: any }[] = [];
  for (const ly of lottie.layers) {
    for (const g of ly.shapes) {
      for (const it of g.it) if (it.ty === "sh") out.push({ layer: ly.nm, group: g.nm, k: it.ks.k });
    }
  }
  return out;
}

/**
 * Extensão estática (quadro em repouso, sem o deslocamento da entrada):
 * vértices e curvas amostradas, elipses, metade da largura dos contornos. A
 * camada que gira (raios) conta como o círculo do seu ponto mais distante do
 * centro de rotação.
 */
function staticExtent(lottie: any): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const add = (x: number, y: number) => {
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  };
  for (const ly of lottie.layers) {
    const rotates = ly.ks.r.a === 1;
    const center: Pt = rotates ? [ly.ks.a.k[0], ly.ks.a.k[1]] : [0, 0];
    let maxR = 0;
    const put = (x: number, y: number) => {
      if (rotates) maxR = Math.max(maxR, Math.hypot(x - center[0], y - center[1]));
      else add(x, y);
    };
    for (const g of ly.shapes) {
      const st = g.it.find((it: any) => it.ty === "st");
      const pad = st ? st.w.k / 2 : 0;
      for (const it of g.it) {
        if (it.ty === "sh") for (const [x, y] of lib.samplePoints(it.ks.k)) put(x, y);
        if (it.ty === "el") {
          const [cx, cy] = it.p.k, rx = it.s.k[0] / 2 + pad, ry = it.s.k[1] / 2 + pad;
          put(cx - rx, cy - ry); put(cx + rx, cy + ry); put(cx - rx, cy + ry); put(cx + rx, cy - ry);
        }
      }
    }
    if (rotates) { add(center[0] - maxR, center[1] - maxR); add(center[0] + maxR, center[1] + maxR); }
  }
  return b;
}

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

  it("gera 19 arquivos, cada um um Lottie válido no formato atual", () => {
    const files = TROPHIES.flatMap(filesOf);
    expect(files).toHaveLength(19);
    for (const f of files) {
      expect(fs.existsSync(path.join(OUT, f)), f).toBe(true);
      const l = readLottie(f);
      expect(l.v, f).toBe("5.7.4");
      expect(l.fr, f).toBe(30);
      expect(l.ip, f).toBe(0);
      expect(l.op, f).toBe(90);
      expect(l.w, f).toBe(200);
      expect(l.h, f).toBe(200);
      expect(Array.isArray(l.layers) && l.layers.length > 0, f).toBe(true);
      // entrada (posição animada), brilhos e halo
      expect(l.layers[0].ks.p.a, f).toBe(1);
      expect(l.layers.filter((ly: any) => /^Sp\d$/.test(ly.nm)), f).toHaveLength(5);
      expect(l.layers.some((ly: any) => ly.nm === "Glow"), f).toBe(true);
    }
  });

  it("a geometria é finita e com vértices e tangentes do mesmo tamanho", () => {
    for (const f of TROPHIES.flatMap(filesOf)) {
      const shapes = allShapes(readLottie(f));
      expect(shapes.length, f).toBeGreaterThan(0);
      for (const { layer, group, k } of shapes) {
        const where = `${f} ${layer}/${group}`;
        expect(k.v.length, where).toBeGreaterThan(1);
        expect(k.i.length, where).toBe(k.v.length);
        expect(k.o.length, where).toBe(k.v.length);
        for (const arr of [k.v, k.i, k.o]) {
          for (const pt of arr) {
            expect(pt, where).toHaveLength(2);
            for (const n of pt) expect(Number.isFinite(n), `${where}: ${JSON.stringify(pt)}`).toBe(true);
          }
        }
      }
    }
  });

  it("cada ícone cabe dentro da sua face, sem tocar o anel", () => {
    const [cx, cy] = lib.CENTER;
    for (const e of TROPHIES) {
      const m = e.kind === "seasonal" ? lot.SEASONAL : lot.LITURGICAL;
      const room = m.face - m.ring / 2;
      for (const f of filesOf(e)) {
        const l = readLottie(f);
        const main = l.layers[0];
        for (const g of main.shapes.filter((g: any) => String(g.nm).startsWith("Icon_"))) {
          for (const it of g.it) {
            const pts: Pt[] = it.ty === "sh" ? lib.samplePoints(it.ks.k)
              : it.ty === "el" ? [[it.p.k[0], it.p.k[1]]] : [];
            const extra = it.ty === "el" ? it.s.k[0] / 2 : 0;
            for (const [x, y] of pts) {
              expect(Math.hypot(x - cx, y - cy) + extra, `${f} ${g.nm}`).toBeLessThanOrEqual(room);
            }
          }
        }
      }
    }
  });

  it("a arte fica dentro da área usada pelos sazonais aprovados (seasonal_natal)", () => {
    const box = staticExtent(readLottie("seasonal_natal.json"));
    for (const f of TROPHIES.flatMap(filesOf)) {
      const [x0, y0, x1, y1] = staticExtent(readLottie(f));
      expect(x0, f).toBeGreaterThanOrEqual(box[0] - 1e-6);
      expect(y0, f).toBeGreaterThanOrEqual(box[1] - 1e-6);
      expect(x1, f).toBeLessThanOrEqual(box[2] + 1e-6);
      expect(y1, f).toBeLessThanOrEqual(box[3] + 1e-6);
    }
  });

  it("acusa cor litúrgica ausente ou desconhecida com o id do troféu", () => {
    const base = TROPHIES.find((e) => e.kind === "liturgical")!;
    expect(() => lot.buildTrophy({ ...base, color: undefined })).toThrow(new RegExp(`${base.id}.*cor litúrgica`));
    expect(() => lot.buildTrophy({ ...base, color: "roxo-x" })).toThrow(new RegExp(`${base.id}.*cor litúrgica`));
  });

  it("os arquivos no disco são a saída atual do gerador", () => {
    for (const e of TROPHIES) {
      for (const { suffix, lottie } of lot.buildTrophy(e)) {
        const disk = fs.readFileSync(path.join(OUT, `${e.id}${suffix}.json`), "utf8");
        expect(disk, `${e.id}${suffix}`).toBe(JSON.stringify(lottie));
      }
    }
  });

  it("recusa escrever um id já aprovado", () => {
    const approved: Set<string> = lib.readApprovedIds();
    const id = [...approved][0];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lot1-"));
    expect(() => lib.writeTrophy(id, "", { v: "5.7.4" }, { approved, outDir: dir })).toThrow(/Recusado/);
    expect(fs.readdirSync(dir)).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("nenhum par de troféus tem o mesmo desenho", () => {
    const icons = TROPHIES.map((e) => e.icon);
    expect(new Set(icons).size).toBe(icons.length);

    const prints = TROPHIES.map((e) => designFingerprint(readLottie(`${e.id}.json`)));
    expect(new Set(prints).size).toBe(prints.length);
  });

  it("acusa desenho repetido na tabela", () => {
    const dup = [
      { id: "a", kind: "liturgical", icon: "twemoji-2b50" },
      { id: "b", kind: "liturgical", icon: "twemoji-2b50" },
    ];
    expect(() => lot.checkUniqueIcons(dup)).toThrow(/Desenho repetido/);
  });

  it("cada ícone cita fonte e licença aberta", () => {
    for (const e of TROPHIES) {
      const icon = lot.ICONS[e.icon];
      expect(icon, e.icon).toBeDefined();
      expect(icon.source, e.icon).toMatch(/\S/);
      expect(icon.license, e.icon).toMatch(/CC-BY 4\.0|MIT/);
    }
  });
});
