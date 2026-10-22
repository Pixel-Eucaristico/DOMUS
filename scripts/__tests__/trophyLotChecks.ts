/**
 * Story 11.7 — verificações comuns dos lotes de Lottie com gesto (lote 1, lote 2…).
 * Cada teste de lote chama `checkLot` com o módulo do gerador; as regras são
 * as mesmas para todos os lotes (formato, gesto, níveis, sem medalha, margem,
 * janela visível, quadro final, base comum, fontes e licenças).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const lib = require("../lottie-lib");

export const OUT = path.resolve(__dirname, "../../assets/lottie/trophies");

export type Entry = { id: string; kind: "seasonal" | "liturgical"; icon: string; color?: string; halo?: unknown };
export const SUFFIXES = ["", "_t2", "_t3"];

/** Bronze, prata e ouro: sazonais e litúrgicos têm 3 níveis (getSeasonalTier). */
export function filesOf(e: Entry): string[] {
  return SUFFIXES.map((s) => `${e.id}${s}.json`);
}

export function readLottie(file: string) {
  return JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8"));
}

type Pt = [number, number];
/** Nomes de medalha/disco/aro como palavra (MedalFace, Disc, Aro), não dentro de outras ("Primavera"). */
export const MEDAL_NAME = /(?:(?:^|[^A-Za-z])(?:[Mm]edal|[Dd]isco?|[Rr]im|[Aa]ro)|(?<=[a-z0-9])(?:Medal|Disco?|Rim|Aro))(?![a-z])/;
const isGesture = (ly: any) => /^G_/.test(ly.nm);
const moves = (ly: any) => ly.ks.p.a === 1 || ly.ks.s.a === 1 || ly.ks.r.a === 1;

/** Impressão digital do desenho: a geometria das peças do gesto, sem cores. */
export function designFingerprint(lottie: any): string {
  const geo = (it: any): any => (it.ty === "sh" ? it.ks.k.v : it.ty === "el" ? [it.p.k, it.s.k] : it.ty === "gr" ? it.it.map(geo) : null);
  return JSON.stringify(lottie.layers.filter(isGesture).map((ly: any) => ly.shapes.map(geo)));
}

/** Todas as shapes `sh` de um Lottie (grupos aninhados inclusive), com o nome da camada e do grupo. */
function allShapes(lottie: any): { layer: string; group: string; k: any }[] {
  const out: { layer: string; group: string; k: any }[] = [];
  const walk = (layer: string, g: any) => {
    for (const it of g.it) {
      if (it.ty === "sh") out.push({ layer, group: g.nm, k: it.ks.k });
      if (it.ty === "gr") walk(layer, it);
    }
  };
  for (const ly of lottie.layers) for (const g of ly.shapes) walk(ly.nm, g);
  return out;
}

/** Valor de uma propriedade no quadro t (interpolação linear entre as chaves s/e). */
function valueAt(prop: any, t: number): number[] {
  const arr = (v: any) => (Array.isArray(v) ? v : [v]);
  if (prop.a !== 1) return arr(prop.k);
  const ks = prop.k;
  if (t <= ks[0].t) return ks[0].s;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (t < b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return a.s.map((v: number, k: number) => v + (a.e[k] - v) * u);
    }
  }
  return ks[ks.length - 1].s;
}

/** Quadros a conferir a partir de `from`: todos os inteiros e todos os quadros de chave. */
function framesOf(lottie: any, from: number): number[] {
  const ts = new Set<number>();
  for (let f = from; f < lottie.op; f++) ts.add(f);
  const walk = (o: any) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      if (typeof o.t === "number" && "s" in o && o.t >= from && o.t < lottie.op) ts.add(o.t);
      Object.values(o).forEach(walk);
    }
  };
  walk(lottie.layers);
  return [...ts].sort((a, b) => a - b);
}

/**
 * Extensão da arte a partir do quadro `from` (depois da entrada), com as
 * transformações de cada camada (posição, âncora, escala, rotação) e só nos
 * quadros em que a camada está visível. Curvas amostradas; elipses pelos
 * cantos; contornos com metade da largura.
 */
export function frameExtent(lottie: any, from = 16): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const frames = framesOf(lottie, from);
  // pontos de um grupo e dos grupos dentro dele (o contorno vale para o grupo em que está)
  const collect = (items: any[], local: Pt[], inherited = 0) => {
    const st = items.find((it: any) => it.ty === "st");
    const pad = st ? st.w.k / 2 : inherited;
    const put = (x: number, y: number) => {
      if (pad) local.push([x - pad, y - pad], [x + pad, y - pad], [x - pad, y + pad], [x + pad, y + pad]);
      else local.push([x, y]);
    };
    for (const it of items) {
      if (it.ty === "sh") for (const [x, y] of lib.samplePoints(it.ks.k)) put(x, y);
      if (it.ty === "el") {
        const [cx, cy] = it.p.k, rx = it.s.k[0] / 2, ry = it.s.k[1] / 2;
        put(cx - rx, cy - ry); put(cx + rx, cy + ry); put(cx - rx, cy + ry); put(cx + rx, cy - ry);
      }
      if (it.ty === "gr") collect(it.it, local, pad);
    }
  };
  for (const ly of lottie.layers) {
    const local: Pt[] = [];
    collect(ly.shapes, local);
    for (const t of frames) {
      if (t < ly.ip || t >= ly.op || valueAt(ly.ks.o, t)[0] <= 0) continue;
      const [px, py] = valueAt(ly.ks.p, t), [ax, ay] = valueAt(ly.ks.a, t);
      const [sx, sy] = valueAt(ly.ks.s, t).map((v) => v / 100);
      const rad = (valueAt(ly.ks.r, t)[0] * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
      for (const [x, y] of local) {
        const lx = (x - ax) * sx, lyy = (y - ay) * sy;
        const X = px + lx * cos - lyy * sin, Y = py + lx * sin + lyy * cos;
        b[0] = Math.min(b[0], X); b[1] = Math.min(b[1], Y); b[2] = Math.max(b[2], X); b[3] = Math.max(b[3], Y);
      }
    }
  }
  return b;
}

export type LotOptions = {
  /** Nome do lote no describe ("lote 1"). */
  name: string;
  /** Módulo do gerador (`require("../trophy-lot-N.js")`). */
  lot: any;
  /** Arquivo do gerador, para conferir o cabeçalho de fontes. */
  generator: string;
  /** Quantos arquivos o lote gera. */
  files: number;
};

/** Tempo das verificações pesadas, que percorrem todos os valores ou quadros de todos os arquivos. */
const SLOW = 60_000;

/** As verificações comuns de um lote. */
export function checkLot({ name, lot, generator, files: count }: LotOptions) {
  const TROPHIES: Entry[] = lot.TROPHIES;
  const DRAWN: Record<string, { desc: string }> = lot.DRAWN || {};

  describe(`Lottie — ${name} (verificações comuns)`, () => {
    it(`gera ${count} arquivos (3 níveis por troféu), cada um um Lottie válido no formato atual`, () => {
      const files = TROPHIES.flatMap(filesOf);
      expect(files).toHaveLength(count);
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
        // base comum: brilhos e halo
        expect(l.layers.filter((ly: any) => /^Sp\d$/.test(ly.nm)), f).toHaveLength(5);
        expect(l.layers.some((ly: any) => ly.nm === "Glow"), f).toBe(true);
        // índices de camada únicos, a partir de 1
        expect(l.layers.map((ly: any) => ly.ind), f).toEqual(l.layers.map((_: any, k: number) => k + 1));
      }
    });

    it("todo número é finito (sem null de NaN/Infinity) e toda chave animada tem `s`", () => {
      const walk = (o: any, where: string): void => {
        expect(o, where).not.toBeNull();
        if (typeof o === "number") expect(Number.isFinite(o), where).toBe(true);
        else if (Array.isArray(o)) o.forEach((x, k) => walk(x, `${where}[${k}]`));
        else if (o && typeof o === "object") {
          if (o.a === 1 && Array.isArray(o.k)) {
            for (const kf of o.k) expect(Array.isArray(kf.s), `${where}: chave sem s`).toBe(true);
          }
          for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`);
        }
      };
      for (const f of TROPHIES.flatMap(filesOf)) walk(readLottie(f), f);
    }, SLOW);

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
    }, SLOW);

    it("gesto: de 2 a 4 peças (G_*) no bronze, e ao menos uma se move", () => {
      for (const e of TROPHIES) {
        for (const f of filesOf(e)) {
          const gesture = readLottie(f).layers.filter(isGesture);
          if (f === `${e.id}.json`) {
            expect(gesture.length, f).toBeGreaterThanOrEqual(2);
            expect(gesture.length, f).toBeLessThanOrEqual(4);
          }
          expect(gesture.some(moves), `${f}: nenhuma peça do gesto tem posição, escala ou rotação animadas`).toBe(true);
        }
      }
    });

    it("níveis: o ouro tem mais camadas que a prata, que tem mais que o bronze", () => {
      for (const e of TROPHIES) {
        const [bronze, prata, ouro] = filesOf(e).map((f) => readLottie(f).layers);
        expect(prata.length, e.id).toBeGreaterThan(bronze.length);
        expect(ouro.length, e.id).toBeGreaterThan(prata.length);
        // o bronze é só o gesto básico; a prata e o ouro acrescentam peças próprias
        expect(bronze.some((ly: any) => /^T[23]_/.test(ly.nm)), e.id).toBe(false);
        expect(prata.some((ly: any) => /^T2_/.test(ly.nm)), e.id).toBe(true);
        expect(prata.some((ly: any) => /^T3_/.test(ly.nm)), e.id).toBe(false);
        expect(ouro.some((ly: any) => /^T3_/.test(ly.nm)), e.id).toBe(true);
      }
    });

    it("sem medalha: nenhuma camada de disco ou aro em volta do desenho", () => {
      for (const f of TROPHIES.flatMap(filesOf)) {
        for (const ly of readLottie(f).layers) {
          expect(ly.nm, f).not.toMatch(MEDAL_NAME);
          for (const g of ly.shapes) {
            expect(g.nm, `${f} ${ly.nm}`).not.toMatch(MEDAL_NAME);
            if (ly.nm === "Glow") continue; // halo da base comum (o mesmo do seasonal_natal)
            for (const it of g.it) {
              if (it.ty === "el") expect(Math.max(...it.s.k), `${f} ${ly.nm}/${g.nm}`).toBeLessThan(100);
            }
          }
        }
      }
    });

    it("a arte fica dentro da área usada pelos sazonais aprovados (seasonal_natal), em todos os quadros", () => {
      const box = frameExtent(readLottie("seasonal_natal.json"));
      for (const f of TROPHIES.flatMap(filesOf)) {
        const [x0, y0, x1, y1] = frameExtent(readLottie(f));
        expect(x0, f).toBeGreaterThanOrEqual(box[0] - 1e-6);
        expect(y0, f).toBeGreaterThanOrEqual(box[1] - 1e-6);
        expect(x1, f).toBeLessThanOrEqual(box[2] + 1e-6);
        expect(y1, f).toBeLessThanOrEqual(box[3] + 1e-6);
      }
    }, SLOW);

    it("o desenho (sem brilhos nem halo) fica na janela visível do LottieTrophy em todos os quadros, entrada inclusive", () => {
      // LottieTrophy desenha a 1,45× dentro de overflow:hidden: só o centro de 200/1,45 px aparece.
      expect(lib.VIEW_ZOOM).toBe(1.45);
      const half = 100 / lib.VIEW_ZOOM;
      expect(lib.VIEW_WINDOW).toEqual([100 - half, 100 - half, 100 + half, 100 + half]);
      const [w0, w1, w2, w3] = lib.VIEW_WINDOW;
      const art = (l: any) => ({ ...l, layers: l.layers.filter((ly: any) => ly.nm !== "Glow" && !/^Sp\d$/.test(ly.nm)) });
      for (const f of TROPHIES.flatMap(filesOf)) {
        const [x0, y0, x1, y1] = frameExtent(art(readLottie(f)), 0);
        expect(x0, f).toBeGreaterThanOrEqual(w0 - 1e-6);
        expect(y0, f).toBeGreaterThanOrEqual(w1 - 1e-6);
        expect(x1, f).toBeLessThanOrEqual(w2 + 1e-6);
        expect(y1, f).toBeLessThanOrEqual(w3 + 1e-6);
      }
    }, SLOW);

    it("quadro final (o do troféu parado): o gesto e o acréscimo do nível estão à vista", () => {
      const last = lib.FORMAT.op - 1;
      // corte (trim) com fim > início em todos os grupos que o têm, grupos aninhados inclusive
      // (início = fim, mesmo em 100, não mostra nada; com início > fim o Lottie mostra o trecho entre os dois)
      const trimsOk = (items: any[]): boolean => items.every((it: any) =>
        it.ty === "gr" ? trimsOk(it.it) : it.ty !== "tm" || Math.abs(valueAt(it.e, last)[0] - valueAt(it.s, last)[0]) > 0);
      const visible = (ly: any) => last >= ly.ip && last < ly.op && valueAt(ly.ks.o, last)[0] > 0
        && valueAt(ly.ks.s, last).slice(0, 2).every((v) => Math.abs(v) > 0) && trimsOk(ly.shapes);
      for (const e of TROPHIES) {
        filesOf(e).forEach((f, k) => {
          const shown = readLottie(f).layers.filter(visible).map((ly: any) => ly.nm);
          expect(shown.some((n: string) => /^G_/.test(n)), `${f}: ${shown}`).toBe(true);
          if (k > 0) expect(shown.some((n: string) => n.startsWith(`T${k + 1}_`)), `${f}: ${shown}`).toBe(true);
        });
      }
    });

    it("luz sem esticar: nenhuma camada de luz, brilho ou raios tem escala não uniforme nem forma animada", () => {
      // camadas de luz: pelo nome (Luz, Ceu, Brilho, Raios) ou pelo conteúdo (os grupos da luzSuave, brilhos e raios)
      const LUZ_NOME = /Luz|Ceu|Brilho|Raios/;
      const LUZ_GRUPOS = /^(Luz(Fonte|Raios|Miolo|Meio|Borda)|Brilho|Raios)$/;
      const groupsOf = (items: any[]): any[] => items.flatMap((it: any) => (it.ty === "gr" ? [it, ...groupsOf(it.it)] : []));
      const uniforme = (v: number[]) => Math.abs(v[0]) === Math.abs(v[1]);
      const valores = (prop: any): number[][] =>
        prop.a === 1 ? prop.k.flatMap((kf: any) => [kf.s, ...(kf.e ? [kf.e] : [])]) : [prop.k];
      let vistas = 0;
      for (const f of TROPHIES.flatMap(filesOf)) {
        for (const ly of readLottie(f).layers) {
          const groups = groupsOf(ly.shapes);
          if (!LUZ_NOME.test(ly.nm) && !groups.some((g: any) => LUZ_GRUPOS.test(g.nm))) continue;
          vistas++;
          for (const v of valores(ly.ks.s)) expect(uniforme(v), `${f} ${ly.nm}: escala ${JSON.stringify(v)}`).toBe(true);
          for (const g of groups) {
            for (const it of g.it) {
              if (it.ty === "tr") for (const v of valores(it.s)) expect(uniforme(v), `${f} ${ly.nm}/${g.nm}: escala do grupo ${JSON.stringify(v)}`).toBe(true);
              if (it.ty === "sh") expect(it.ks.a, `${f} ${ly.nm}/${g.nm}: forma animada`).not.toBe(1);
            }
          }
        }
      }
      expect(vistas).toBeGreaterThan(0);
    });

    it("base comum: brilhos e halo mais fortes a cada nível; halo litúrgico na cor da festa; auréola onde há halo", () => {
      const peak = (ly: any) => Math.max(...(ly.ks.o.a === 1 ? ly.ks.o.k.map((kf: any) => kf.s[0]) : [ly.ks.o.k]));
      const fillOf = (ly: any) => ly.shapes[0].it.find((it: any) => it.ty === "fl").c.k;
      for (const e of TROPHIES) {
        const tiers = filesOf(e).map((f) => readLottie(f).layers);
        const sp = tiers.map((ls) => peak(ls.find((ly: any) => ly.nm === "Sp0")));
        const glow = tiers.map((ls) => peak(ls.find((ly: any) => ly.nm === "Glow")));
        expect(sp[1], e.id).toBeGreaterThan(sp[0]); expect(sp[2], e.id).toBeGreaterThan(sp[1]);
        expect(glow[1], e.id).toBeGreaterThan(glow[0]); expect(glow[2], e.id).toBeGreaterThan(glow[1]);
        if (e.kind !== "liturgical") continue;
        for (const ls of tiers) {
          expect(fillOf(ls.find((ly: any) => ly.nm === "Glow")), e.id).toEqual(lot.LITURGICAL_COLORS[e.color!].glow);
          if (e.halo) expect(ls.some((ly: any) => ly.nm === "Aureola"), e.id).toBe(true);
        }
      }
    });

    it("acusa cor litúrgica ausente ou desconhecida com o id do troféu", () => {
      const base = TROPHIES.find((e) => e.kind === "liturgical")!;
      expect(() => lot.buildTrophy({ ...base, color: undefined })).toThrow(new RegExp(`${base.id}.*cor litúrgica`));
      expect(() => lot.buildTrophy({ ...base, color: "roxo-x" })).toThrow(new RegExp(`${base.id}.*cor litúrgica`));
    });

    it("erro de ajuda cita a ajuda e o id do troféu", () => {
      // um litúrgico qualquer do lote, com uma auréola de base inválida (vale mesmo se nenhum troféu tiver halo)
      const base = { ...TROPHIES[0], kind: "liturgical", color: TROPHIES[0].color ?? "branco" };
      expect(() => lot.buildTrophy({ ...base, halo: { t0: 3 } })).toThrow(new RegExp(`${base.id}: aureola: falta o raio`));
      expect(() => lot.buildTrophy({ ...base, halo: { r: 5 } })).toThrow(new RegExp(`${base.id}: aureola: falta o centro`));
    });

    it("auréola de base: todo santo tem `halo`, menos os da lista SEM_HALO (festa sem santo ou auréola só no ouro)", () => {
      const SEM_HALO: Record<string, string> = lot.SEM_HALO;
      expect(SEM_HALO, "o lote exporta SEM_HALO").toBeDefined();
      for (const e of TROPHIES) {
        if (e.kind !== "liturgical") continue;
        if (e.halo) expect(SEM_HALO[e.id], `${e.id}: tem halo e está em SEM_HALO`).toBeUndefined();
        else expect(SEM_HALO[e.id], `${e.id}: sem halo e fora de SEM_HALO`).toMatch(/^(festa sem santo|auréola só no ouro)/);
      }
      const ids = new Set(TROPHIES.map((e) => e.id));
      for (const id of Object.keys(SEM_HALO)) expect(ids.has(id), `SEM_HALO cita ${id}, que não está no lote`).toBe(true);
    });

    it("os arquivos no disco são a saída atual do gerador", () => {
      for (const e of TROPHIES) {
        for (const { suffix, lottie } of lot.buildTrophy(e)) {
          const disk = fs.readFileSync(path.join(OUT, `${e.id}${suffix}.json`), "utf8");
          expect(disk, `${e.id}${suffix}`).toBe(JSON.stringify(lottie));
        }
      }
    }, SLOW);

    it("nenhum par de troféus tem o mesmo desenho", () => {
      const icons = TROPHIES.map((e) => e.icon);
      expect(new Set(icons).size).toBe(icons.length);

      const prints = TROPHIES.map((e) => designFingerprint(readLottie(`${e.id}.json`)));
      expect(new Set(prints).size).toBe(prints.length);
    });

    it("cada peça cita fonte e licença aberta, ou é desenhada no gerador e declarada no cabeçalho", () => {
      for (const e of TROPHIES) expect(lot.ICONS[e.icon] || DRAWN[e.icon], e.icon).toBeDefined();
      // o gerador usa só Twemoji (CC-BY 4.0) e Bootstrap Icons (MIT), com a versão citada
      const LICENSE: Record<string, string> = { Twemoji: "CC-BY 4.0", "Bootstrap Icons": "MIT" };
      for (const [key, icon] of Object.entries<any>(lot.ICONS)) {
        const m = /^(Twemoji|Bootstrap Icons) \S+ \((?:jdecked\/twemoji|twbs\/icons) \d+\.\d+\.\d+\)$/.exec(icon.source);
        expect(m, `${key}: ${icon.source}`).not.toBeNull();
        expect(icon.license, key).toBe(LICENSE[m![1]]);
      }
      // cabeçalho = o primeiro bloco /** ... */ do gerador
      const header = /\/\*\*[\s\S]*?\*\//.exec(fs.readFileSync(generator, "utf8"))![0];
      expect(header).toMatch(/Twemoji .*v15\.1\.0.*CC-BY 4\.0/);
      expect(header).toMatch(/Bootstrap Icons .*v1\.11\.3.*MIT/);
      const used = new Set(TROPHIES.map((e) => e.icon));
      for (const [key, d] of Object.entries(DRAWN)) {
        expect(lot.ICONS[key], key).toBeUndefined();
        expect(d.desc, key).toMatch(/\S/);
        expect(header, `${key}: o cabeçalho cita a peça desenhada`).toContain(key);
        expect(used.has(key), `${key}: peça desenhada que nenhum troféu usa`).toBe(true);
      }
    });
  });
}
