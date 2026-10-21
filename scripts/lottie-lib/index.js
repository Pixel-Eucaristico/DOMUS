/**
 * lottie-lib — código comum dos geradores de Lottie de troféus.
 *
 * Extraído de `scripts/gen_trophy_seasonal_natal.js`: parsePath (com
 * tokenizador mais estrito), makeFill, makeEllipse, keyframes da camada
 * principal (entrada + balanço), 5 brilhos e halo 175×175 em (100,105) — os
 * mesmos quadros e posições dos brilhos do natal. Diferente do natal: os ícones
 * são centrados em CENTER = (100,105) e há anel, raios e ajuste do ícone ao
 * disco. Os geradores antigos continuam com a sua própria cópia, para que a
 * saída deles não mude; os geradores novos (ex.: `scripts/trophy-lot-1.js`)
 * usam esta biblioteca.
 *
 * Formato de saída: Lottie v5.7.4, 30 fps, 90 quadros, 200×200.
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const ROOT = path.join(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "assets/lottie/trophies");
const LOTTIE_TROPHY_TSX = path.join(ROOT, "src/components/gamification/LottieTrophy.tsx");

const FORMAT = { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200 };
const CENTER = [100, 105];

// ── SVG → shapes (parser de gen_trophy_seasonal_natal.js, tokenizador estrito) ─
const TOKEN_RE = /[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const SUPPORTED = new Set(["M", "L", "H", "V", "C", "S", "Z"]);
function isNum(s) { return !/^[A-Za-z]$/.test(s); }

/** Separa números (com sinal e expoente, sem separador) e comandos. */
function tokenize(d) {
  const tokens = d.match(TOKEN_RE) || [];
  for (const t of tokens) {
    if (!isNum(t) && !SUPPORTED.has(t)) throw new Error(`Comando SVG não suportado: "${t}" em "${d.slice(0, 60)}"`);
  }
  return tokens;
}

function parsePath(d, cx, cy, sc, tx, ty) {
  const dAbs = svgpath(d).translate(-cx, -cy).scale(sc).translate(tx, ty).abs().unarc().round(3).toString();
  const subPaths = dAbs.split(/(?=M)/).filter(Boolean);
  const shapes = [];
  for (const sub of subPaths) {
    const tokens = tokenize(sub);
    let i = 0, cx2 = 0, cy2 = 0;
    const verts = [], inn = [], out = [];
    let closed = false, prevCmd = "", lastCmd = "";
    while (i < tokens.length) {
      const t = tokens[i];
      if (!isNum(t)) { prevCmd = lastCmd; lastCmd = t; i++; }
      const cmd = lastCmd;
      if (cmd === "M" || cmd === "L") {
        const x = parseFloat(tokens[i++]), y = parseFloat(tokens[i++]);
        verts.push([x, y]); inn.push([0, 0]); out.push([0, 0]); cx2 = x; cy2 = y;
      } else if (cmd === "H") {
        const x = parseFloat(tokens[i++]);
        verts.push([x, cy2]); inn.push([0, 0]); out.push([0, 0]); cx2 = x;
      } else if (cmd === "V") {
        const y = parseFloat(tokens[i++]);
        verts.push([cx2, y]); inn.push([0, 0]); out.push([0, 0]); cy2 = y;
      } else if (cmd === "C") {
        const x1 = parseFloat(tokens[i++]), y1 = parseFloat(tokens[i++]);
        const x2 = parseFloat(tokens[i++]), y2 = parseFloat(tokens[i++]);
        const x  = parseFloat(tokens[i++]), y  = parseFloat(tokens[i++]);
        if (verts.length > 0) { const lv = verts[verts.length - 1]; out[out.length - 1] = [x1 - lv[0], y1 - lv[1]]; }
        verts.push([x, y]); inn.push([x2 - x, y2 - y]); out.push([0, 0]);
        cx2 = x; cy2 = y; prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === "S") {
        const x2 = parseFloat(tokens[i++]), y2 = parseFloat(tokens[i++]);
        const x  = parseFloat(tokens[i++]), y  = parseFloat(tokens[i++]);
        let x1, y1;
        if (verts.length > 0 && (prevCmd === "C" || prevCmd === "S")) {
          const lv = verts[verts.length - 1], li = inn[inn.length - 1];
          x1 = lv[0] - li[0]; y1 = lv[1] - li[1];
        } else { x1 = cx2; y1 = cy2; }
        if (verts.length > 0) { const lv = verts[verts.length - 1]; out[out.length - 1] = [x1 - lv[0], y1 - lv[1]]; }
        verts.push([x, y]); inn.push([x2 - x, y2 - y]); out.push([0, 0]);
        cx2 = x; cy2 = y; prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === "Z") { closed = true; break; } else { throw new Error(`Comando SVG não suportado: "${cmd}"`); }
    }
    if (verts.length < 2) continue;
    shapes.push({ v: verts, i: inn, o: out, c: closed });
  }
  return shapes;
}

// ── Cores ─────────────────────────────────────────────────────────────────────
const r3 = (n) => Math.round(n * 1000) / 1000;

/** "#RRGGBB" → [r, g, b, a] em 0..1. */
function hex(h, a = 1) {
  if (typeof h !== "string" || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) {
    throw new Error(`Cor inválida: ${JSON.stringify(h)} (esperado "#RGB" ou "#RRGGBB")`);
  }
  const s = h.slice(1);
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(full, 16);
  return [r3(((n >> 16) & 255) / 255), r3(((n >> 8) & 255) / 255), r3((n & 255) / 255), a];
}

/** Mistura a cor com branco (t=0 → cor, t=1 → branco). */
function lighten(c, t) {
  return [r3(c[0] + (1 - c[0]) * t), r3(c[1] + (1 - c[1]) * t), r3(c[2] + (1 - c[2]) * t), c[3] ?? 1];
}

// ── Primitivas de shape ──────────────────────────────────────────────────────
const TR = () => ({
  ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
  s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false,
});

function makeFill(shapes, color, name, opacity = 100) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      ...shapes.map((s, idx) => ({
        ty: "sh", nm: `p${idx}`, ind: idx,
        ks: { a: 0, k: { v: s.v, i: s.i, o: s.o, c: s.c } }, hd: false,
      })),
      { ty: "fl", nm: "F", o: { a: 0, k: opacity }, c: { a: 0, k: color }, r: 1, hd: false },
      TR(),
    ],
  };
}

function makeEllipse(cx, cy, rx, ry, color, name, opacity = 100) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [cx, cy] }, s: { a: 0, k: [rx * 2, ry * 2] }, hd: false },
      { ty: "fl", nm: "F", o: { a: 0, k: opacity }, c: { a: 0, k: color }, r: 1, hd: false },
      TR(),
    ],
  };
}

/** Anel (círculo só com contorno). */
function makeRing(cx, cy, r, width, color, name, opacity = 100) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [cx, cy] }, s: { a: 0, k: [r * 2, r * 2] }, hd: false },
      { ty: "st", nm: "S", o: { a: 0, k: opacity }, c: { a: 0, k: color }, w: { a: 0, k: width }, lc: 2, lj: 2, hd: false },
      TR(),
    ],
  };
}

/**
 * Converte um ícone (tabela `{ viewBox, elements }`) em shapes Lottie, centrado
 * em `center` e com largura `size` px. Elementos: `{ fill, d }` ou
 * `{ fill, circle: [cx, cy, r] }`. Retorna da frente para trás (ordem Lottie).
 */
function iconShapes(icon, size, center = CENTER) {
  const vb = icon.viewBox;
  const sc = size / vb;
  const c0 = vb / 2;
  const [tx, ty] = center;
  const groups = icon.elements.map((el, idx) => {
    const name = `Icon_${idx}`;
    const color = hex(el.fill);
    if (!el.d && !el.circle) throw new Error(`Elemento ${idx} do ícone sem "d" nem "circle"`);
    if (el.circle) {
      const [cx, cy, r] = el.circle;
      return makeEllipse(r3((cx - c0) * sc + tx), r3((cy - c0) * sc + ty), r3(r * sc), r3(r * sc), color, name);
    }
    return makeFill(parsePath(el.d, c0, c0, sc, tx, ty), color, name);
  });
  return groups.reverse();
}

/** Pontos de uma shape, com as curvas amostradas (para medir extensão). */
function samplePoints(s, steps = 8) {
  const pts = [];
  const n = s.v.length;
  const segs = s.c ? n : n - 1;
  for (let k = 0; k < segs; k++) {
    const p0 = s.v[k], p3 = s.v[(k + 1) % n];
    const p1 = [p0[0] + s.o[k][0], p0[1] + s.o[k][1]];
    const p2 = [p3[0] + s.i[(k + 1) % n][0], p3[1] + s.i[(k + 1) % n][1]];
    for (let j = 0; j <= steps; j++) {
      const t = j / steps, u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  }
  if (n === 1) pts.push(s.v[0]);
  return pts;
}

/** Maior distância do centro do viewBox até o desenho do ícone (unidades do viewBox). */
function iconRadius(icon) {
  const c0 = icon.viewBox / 2;
  let max = 0;
  for (const el of icon.elements) {
    if (el.circle) {
      const [cx, cy, r] = el.circle;
      max = Math.max(max, Math.hypot(cx - c0, cy - c0) + r);
    } else if (el.d) {
      for (const s of parsePath(el.d, 0, 0, 1, 0, 0)) {
        for (const [x, y] of samplePoints(s)) max = Math.max(max, Math.hypot(x - c0, y - c0));
      }
    }
  }
  return max;
}

/** Largura do ícone (px) para caber num círculo de raio `radius`, sem passar de `maxSize`. */
function fitIconSize(icon, radius, maxSize) {
  return Math.min(maxSize, (icon.viewBox * radius) / iconRadius(icon));
}

/** Raios (cunhas) em volta do centro, para a camada de raios. */
function makeRays(count, r1, r2, halfAngleDeg, color, name, center = CENTER) {
  const [cx, cy] = center;
  const shapes = [];
  const ha = (halfAngleDeg * Math.PI) / 180;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 - Math.PI / 2;
    const pt = (r, ang) => [r3(cx + r * Math.cos(ang)), r3(cy + r * Math.sin(ang))];
    const v = [pt(r1, a - ha), pt(r2, a), pt(r1, a + ha)];
    shapes.push({ v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c: true });
  }
  return makeFill(shapes, color, name);
}

// ── Keyframes ────────────────────────────────────────────────────────────────
const EASE_IN = { i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } };
const EASE = { i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } };
const EASE_FADE = { i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } };

function staticKs(extra = {}) {
  return {
    p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 },
    ...extra,
  };
}

function shapeLayer(ind, nm, ks, shapes) {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks, shapes, ip: 0, op: 90, st: 0, bm: 0 };
}

// ── Camadas ──────────────────────────────────────────────────────────────────

/** Camada principal: cai de y=−55, quica +5, balança ±4 (keyframes do natal). */
function mainLayer(ind, nm, shapes) {
  return shapeLayer(ind, nm, staticKs({
    p: { a: 1, k: [
      { t: 0,  s: [0, -55, 0], e: [0, 0, 0],  ...EASE_IN },
      { t: 16, s: [0, 0, 0],   e: [0, 5, 0],  ...EASE },
      { t: 24, s: [0, 5, 0],   e: [0, 0, 0],  ...EASE },
      { t: 45, s: [0, 0, 0],   e: [-4, 0, 0], ...EASE },
      { t: 60, s: [-4, 0, 0],  e: [4, 0, 0],  ...EASE },
      { t: 75, s: [4, 0, 0],   e: [0, 0, 0],  ...EASE },
      { t: 89, s: [0, 0, 0] },
    ]},
    o: { a: 1, k: [
      { t: 0,  s: [0],   e: [100], ...EASE_FADE },
      { t: 10, s: [100], e: [100], ...EASE },
      { t: 89, s: [100] },
    ]},
  }), shapes);
}

const SPARK_DEFS = [
  { x: 52,  y: 40, sz: 5 },
  { x: 150, y: 36, sz: 4 },
  { x: 40,  y: 98, sz: 4 },
  { x: 162, y: 90, sz: 3 },
  { x: 100, y: 28, sz: 5 },
];

/** 5 brilhos (posições e quadros do natal) que piscam em sequência a partir do quadro 26. */
function sparkleLayers(firstInd, color, defs = SPARK_DEFS) {
  return defs.map(({ x, y, sz }, idx) => {
    const f = 26 + idx * 9;
    return shapeLayer(firstInd + idx, `Sp${idx}`, staticKs({
      o: { a: 1, k: [
        { t: f,      s: [0],  e: [85], ...EASE_FADE },
        { t: f + 6,  s: [85], e: [0],  ...EASE },
        { t: f + 12, s: [0] },
      ]},
    }), [{
      ty: "gr", nm: "S", hd: false,
      it: [
        { ty: "el", nm: "E", p: { a: 0, k: [x, y] }, s: { a: 0, k: [sz, sz] }, hd: false },
        { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
        TR(),
      ],
    }]);
  });
}

/** Halo 175×175 em CENTER que acende a partir do quadro 18 até 16% de opacidade (como o natal). */
function glowLayer(ind, color) {
  return shapeLayer(ind, "Glow", staticKs({
    o: { a: 1, k: [
      { t: 0,  s: [0],  e: [0],  ...EASE },
      { t: 18, s: [0],  e: [16], ...EASE_FADE },
      { t: 89, s: [16] },
    ]},
  }), [makeEllipse(CENTER[0], CENTER[1], 87.5, 87.5, color, "Glow")]);
}

/**
 * Raios que acendem depois da entrada e giram um passo (360/count) por ciclo,
 * para o laço não ter salto.
 */
function raysLayer(ind, color, { count = 12, r1 = 66, r2 = 86, halfAngle = 4 } = {}) {
  const step = 360 / count;
  return shapeLayer(ind, "Rays", {
    p: { a: 0, k: [CENTER[0], CENTER[1], 0] },
    a: { a: 0, k: [CENTER[0], CENTER[1], 0] },
    s: { a: 0, k: [100, 100, 100] },
    r: { a: 1, k: [
      // termina em t=90 (= op, um quadro depois do último): o quadro 0 do laço seguinte
      // continua exatamente de onde o 89 parou, sem salto.
      { t: 0, s: [0], e: [step], i: { x: [1], y: [1] }, o: { x: [0], y: [0] } },
      { t: 90, s: [step] },
    ]},
    o: { a: 1, k: [
      { t: 0,  s: [0],  e: [0],  ...EASE },
      { t: 16, s: [0],  e: [70], ...EASE_FADE },
      { t: 89, s: [70] },
    ]},
  }, [makeRays(count, r1, r2, halfAngle, color, "Rays")]);
}

function assemble(nm, layers) {
  return { ...FORMAT, nm, ddd: 0, assets: [], layers };
}

// ── Escrita com recusa de id aprovado ────────────────────────────────────────

/** Lê os ids de `APPROVED_LOTTIE` em LottieTrophy.tsx. */
function readApprovedIds(file = LOTTIE_TROPHY_TSX) {
  const src = fs.readFileSync(file, "utf8");
  const start = src.indexOf("const APPROVED_LOTTIE");
  if (start < 0) throw new Error(`APPROVED_LOTTIE não encontrado em ${file}`);
  const end = src.indexOf("\n};", start);
  if (end < 0) throw new Error(`Fim de APPROVED_LOTTIE ("};") não encontrado em ${file}`);
  const body = src.slice(start, end);
  const ids = new Set();
  const re = /^\s*(?:"([A-Za-z0-9_]+)"|'([A-Za-z0-9_]+)'|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*\{/gm;
  for (const m of body.matchAll(re)) ids.add(m[1] || m[2] || m[3]);
  return ids;
}

/**
 * Escreve `<id><suffix>.json`. Recusa (lança erro, sem escrever) se o id já
 * está em APPROVED_LOTTIE.
 */
function writeTrophy(id, suffix, lottie, { approved = readApprovedIds(), outDir = OUT_DIR } = {}) {
  if (approved.has(id)) {
    throw new Error(`Recusado: "${id}" já tem Lottie aprovado em APPROVED_LOTTIE; não sobrescrevo ${id}${suffix}.json.`);
  }
  const fname = `${id}${suffix}.json`;
  fs.writeFileSync(path.join(outDir, fname), JSON.stringify(lottie));
  return fname;
}

module.exports = {
  FORMAT, CENTER, OUT_DIR,
  parsePath, hex, lighten,
  makeFill, makeEllipse, makeRing, makeRays, iconShapes,
  samplePoints, iconRadius, fitIconSize,
  mainLayer, sparkleLayers, glowLayer, raysLayer, assemble,
  readApprovedIds, writeTrophy,
};
