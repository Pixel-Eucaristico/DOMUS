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
/** Registro dos Lottie aprovados (`APPROVED_LOTTIE`), lido por readApprovedIds/readApprovedFiles. */
const APPROVED_LOTTIE_TS = path.join(ROOT, "src/components/gamification/approvedLottie.ts");
/** Lista com o sha256 de cada arquivo aprovado (D28). */
const APPROVED_HASHES = path.join(OUT_DIR, "aprovados.sha256.json");

const FORMAT = { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200 };
const CENTER = [100, 105];

/**
 * Ampliação do `LottieTrophy` (src/components/gamification/LottieTrophy.tsx:
 * `lottieSize = size * 1.45`, dentro de `overflow: hidden`): só a janela
 * central de 200/1,45 px do quadro aparece na tela.
 */
const VIEW_ZOOM = 1.45;
const VIEW_HALF = FORMAT.w / 2 / VIEW_ZOOM;
/** Janela visível [x0, y0, x1, y1] em coordenadas do quadro. */
const VIEW_WINDOW = [FORMAT.w / 2 - VIEW_HALF, FORMAT.h / 2 - VIEW_HALF, FORMAT.w / 2 + VIEW_HALF, FORMAT.h / 2 + VIEW_HALF];

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

/** "#abc" / "#AABBCC" → "#AABBCC" (para comparar cores). */
function normHex(h, who = "normHex") {
  if (typeof h !== "string" || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) throw new Error(`${who}: cor inválida ${JSON.stringify(h)}`);
  const s = h.slice(1).toUpperCase();
  return "#" + (s.length === 3 ? s.split("").map((c) => c + c).join("") : s);
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

/** Preenchimento de shapes. `rule`: 1 = nonzero (padrão), 2 = evenodd. */
function makeFill(shapes, color, name, opacity = 100, rule = 1) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      ...shapes.map((s, idx) => ({
        ty: "sh", nm: `p${idx}`, ind: idx,
        ks: { a: 0, k: { v: s.v, i: s.i, o: s.o, c: s.c } }, hd: false,
      })),
      { ty: "fl", nm: "F", o: { a: 0, k: opacity }, c: { a: 0, k: color }, r: rule, hd: false },
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
 * `{ fill, circle: [cx, cy, r] }` (com `rule: "evenodd"` opcional). Retorna da
 * frente para trás (ordem Lottie).
 *
 * Opções: `only` (índices dos elementos usados, para tirar uma peça de um
 * ícone), `recolor` (mapa "#RRGGBB" → "#RRGGBB", para trocar cores do original),
 * `fill` (uma cor só para todos os elementos) e `prefix` (nome dos grupos).
 */
function iconShapes(icon, size, center = CENTER, opts = {}) {
  const { only, recolor = {}, fill, prefix = "Icon" } = opts;
  if (!icon || !Array.isArray(icon.elements) || !(icon.viewBox > 0)) throw new Error(`iconShapes: ícone inválido (${prefix})`);
  if (only && new Set(only).size !== only.length) throw new Error(`iconShapes: índices repetidos em only: ${JSON.stringify(only)} (${prefix})`);
  const recolorN = {};
  for (const [k, v] of Object.entries(recolor)) recolorN[normHex(k, "iconShapes")] = v;
  const vb = icon.viewBox;
  const sc = size / vb;
  const c0 = vb / 2;
  const [tx, ty] = center;
  const picked = icon.elements.map((el, idx) => [el, idx]).filter(([, idx]) => !only || only.includes(idx));
  if (only && picked.length !== only.length) throw new Error(`Elementos inexistentes no ícone: ${JSON.stringify(only)}`);
  const used = new Set(picked.map(([el]) => (typeof el.fill === "string" ? normHex(el.fill, "iconShapes") : null)));
  const unused = Object.keys(recolorN).filter((k) => !used.has(k));
  if (unused.length) throw new Error(`iconShapes: recolor sem efeito (nenhum elemento com ${unused.join(", ")}) (${prefix})`);
  const groups = picked.map(([el, idx]) => {
    const name = `${prefix}_${idx}`;
    const src = typeof el.fill === "string" ? normHex(el.fill, "iconShapes") : el.fill;
    const color = hex(fill || recolorN[src] || el.fill);
    if (!el.d && !el.circle) throw new Error(`Elemento ${idx} do ícone sem "d" nem "circle"`);
    if (el.circle) {
      const [cx, cy, r] = el.circle;
      return makeEllipse(r3((cx - c0) * sc + tx), r3((cy - c0) * sc + ty), r3(r * sc), r3(r * sc), color, name);
    }
    return makeFill(parsePath(el.d, c0, c0, sc, tx, ty), color, name, 100, el.rule === "evenodd" ? 2 : 1);
  });
  return groups.reverse();
}

/** Ponto do viewBox do ícone → coordenada local de uma peça de largura `size` centrada em (0,0). */
function iconPoint(icon, size, [x, y]) {
  if (!icon || !(icon.viewBox > 0)) throw new Error("iconPoint: ícone inválido ou desconhecido");
  const sc = size / icon.viewBox, c0 = icon.viewBox / 2;
  return [r3((x - c0) * sc), r3((y - c0) * sc)];
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
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks, shapes, ip: 0, op: FORMAT.op, st: 0, bm: 0 };
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

/**
 * 5 brilhos (posições e quadros do natal) que piscam em sequência a partir do
 * quadro 26. `peak` é a opacidade máxima (85 no natal).
 */
function sparkleLayers(firstInd, color, defs = SPARK_DEFS, { peak = 85 } = {}) {
  return defs.map(({ x, y, sz }, idx) => {
    const f = 26 + idx * 9;
    return shapeLayer(firstInd + idx, `Sp${idx}`, staticKs({
      o: { a: 1, k: [
        { t: f,      s: [0],  e: [peak], ...EASE_FADE },
        { t: f + 6,  s: [peak], e: [0],  ...EASE },
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

/** Halo 175×175 em CENTER que acende a partir do quadro 18 até `peak`% de opacidade (16, como o natal). */
function glowLayer(ind, color, { peak = 16 } = {}) {
  return shapeLayer(ind, "Glow", staticKs({
    o: { a: 1, k: [
      { t: 0,  s: [0],  e: [0],  ...EASE },
      { t: 18, s: [0],  e: [peak], ...EASE_FADE },
      { t: 89, s: [peak] },
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

// ── Movimento: peças animadas ────────────────────────────────────────────────
//
// Cada peça do gesto é uma camada própria com o desenho centrado em (0,0): a
// posição (`p`) põe a peça no quadro e a âncora (`a`) é o ponto em volta do qual
// ela gira ou cresce. As ajudas abaixo devolvem listas de chaves
// `[quadro, valor, curva]` (a curva vale do quadro até a chave seguinte) que se
// somam e viram propriedade animada com `anim()`.

const EASINGS = {
  ease: EASE,
  in: { o: { x: [0.42], y: [0] }, i: { x: [1], y: [1] } },
  out: { o: { x: [0], y: [0] }, i: { x: [0.58], y: [1] } },
  linear: { o: { x: [0], y: [0] }, i: { x: [1], y: [1] } },
};

const isAnim = (v) => v != null && typeof v === "object" && !Array.isArray(v) && v.a === 1;
const vec = (v) => (Array.isArray(v) ? v.map(r3) : [r3(v)]);
/** Mesmo valor? Um número vale o mesmo que o vetor com ele repetido (escala 100 = [100, 100]). */
function same(a, b) {
  let x = vec(a), y = vec(b);
  if (x.length === 1 && y.length > 1) x = y.map(() => x[0]);
  if (y.length === 1 && x.length > 1) y = x.map(() => y[0]);
  return JSON.stringify(x) === JSON.stringify(y);
}

/**
 * Chaves `[t, valor, curva?]` → propriedade animada (formato s/e dos geradores
 * atuais). Chaves com o mesmo quadro e o mesmo valor (emenda de duas ajudas)
 * viram uma só; quadros fora de ordem lançam erro.
 */
function anim(keys) {
  const ks = [];
  for (const key of keys) {
    const last = ks[ks.length - 1];
    if (last && last[0] === key[0]) {
      if (!same(last[1], key[1])) throw new Error(`Chaves diferentes no mesmo quadro ${key[0]}`);
      ks[ks.length - 1] = [key[0], key[1], key[2] ?? last[2]];
      continue;
    }
    if (last && !(key[0] > last[0])) throw new Error(`Quadros fora de ordem: ${last[0]} → ${key[0]}`);
    ks.push(key);
  }
  if (ks.length < 2) throw new Error("anim precisa de ao menos 2 chaves");
  return {
    a: 1,
    k: ks.map(([t, v, curve = "ease"], idx) => {
      if (idx === ks.length - 1) return { t: r3(t), s: vec(v) };
      const e = EASINGS[curve];
      if (!e) throw new Error(`Curva desconhecida: ${curve}`);
      return { t: r3(t), s: vec(v), e: vec(ks[idx + 1][1]), ...e };
    }),
  };
}

/** Trajeto: passa pelos pontos entre os quadros t0 e t1, começando e terminando suave. */
function trajeto(points, t0, t1) {
  const n = points.length - 1;
  if (n < 1) throw new Error("trajeto precisa de 2 pontos");
  return points.map((pt, k) => [t0 + ((t1 - t0) * k) / n, pt, n === 1 ? "ease" : k === 0 ? "in" : k === n - 1 ? "out" : "linear"]);
}

/** Pulo: `n` pulos de altura `h` (px) e duração `d` (quadros) a partir de t0, com `gap` entre eles. */
function pulo(base, t0, { h = 12, d = 10, n = 1, gap = 0 } = {}) {
  const [x, y] = base;
  const keys = [];
  for (let k = 0; k < n; k++) {
    const t = t0 + k * (d + gap);
    keys.push([t, base, "out"], [t + d / 2, [x, y - h], "in"], [t + d, base]);
  }
  return keys;
}

/** Queda: de `from` até `to` entre t0 e t1 (acelerando), com um quique de `bounce` px. */
function queda(from, to, t0, t1, { bounce = 4 } = {}) {
  const end = bounce > 0 ? t1 + 8 : t1;
  if (!(t1 > t0) || end > FORMAT.op) throw new Error(`queda: quadros ${t0}→${end} fora de 0..${FORMAT.op}`);
  if (bounce <= 0) return [[t0, from, "in"], [t1, to]];
  return [[t0, from, "in"], [t1, to, "out"], [t1 + 4, [to[0], to[1] - bounce], "in"], [t1 + 8, to]];
}

/** Abrir: escala de fechado (`from`%) a 100% entre t0 e t1, no eixo "x", "y" ou "xy". */
function abrir(t0, t1, { axis = "x", from = 0 } = {}) {
  if (!["x", "y", "xy"].includes(axis)) throw new Error(`abrir: eixo desconhecido ${JSON.stringify(axis)} (use "x", "y" ou "xy")`);
  const closed = axis === "x" ? [from, 100] : axis === "y" ? [100, from] : [from, from];
  const keys = [[t0, closed, "out"], [t1, [100, 100]]];
  return t0 > 0 ? [[0, closed], ...keys] : keys;
}

/**
 * Onda: oscila em volta de `base` com amplitude `amp`, de t0 até t1, período
 * `period` quadros. Em vetor, `axis` escolhe a coordenada. Termina em `base`.
 */
function onda(base, amp, t0, t1, { period = 30, axis = null } = {}, who = "onda") {
  if (!Number.isFinite(period) || period <= 0) throw new Error(`${who}: período inválido ${period}`);
  if (![amp, t0, t1].every(Number.isFinite)) throw new Error(`${who}: amplitude e quadros precisam ser números`);
  if (t1 - t0 < period / 2) throw new Error(`${who}: trecho ${t0}→${t1} menor que meio período (${period / 2}); não oscila`);
  if (axis == null && typeof base !== "number") throw new Error(`${who}: base vetor pede axis`);
  if (axis != null && !(Array.isArray(base) && Number.isInteger(axis) && axis >= 0 && axis < base.length)) {
    throw new Error(`${who}: axis ${axis} não serve para a base ${JSON.stringify(base)}`);
  }
  const at = (f) => {
    if (axis == null) return base + amp * f;
    const v = [...base]; v[axis] = base[axis] + amp * f; return v;
  };
  const steps = [0, 1, 0, -1];
  const keys = [];
  for (let k = 0; t0 + (k * period) / 4 <= t1 + 1e-9; k++) keys.push([t0 + (k * period) / 4, at(steps[k % 4])]);
  while (keys.length > 1 && !same(keys[keys.length - 1][1], at(0))) keys.pop();
  return keys;
}

/** Aparecer: opacidade de `from` a `to` entre t0 e t0+dur. */
function aparecer(t0, dur, { from = 0, to = 100 } = {}) {
  const keys = [[t0, from, "ease"], [t0 + dur, to]];
  return t0 > 0 ? [[0, from], ...keys] : keys;
}

/** Sumir: opacidade de `from` a 0 entre t0 e t0+dur. */
function sumir(t0, dur, { from = 100 } = {}) {
  return [[t0, from, "ease"], [t0 + dur, 0]];
}

/** Pop: escala de 0 a `over`% e volta a `base`% entre t0 e t0+dur. */
function pop(t0, dur, { over = 115, base = 100 } = {}) {
  const keys = [[t0, 0, "out"], [t0 + dur * 0.65, over, "ease"], [t0 + dur, base]];
  return t0 > 0 ? [[0, 0], ...keys] : keys;
}

/** Pulsar: escala oscila em volta de `base`% entre t0 e t1. */
function pulsar(t0, t1, { amp = 8, period = 20, base = 100 } = {}) {
  return onda(base, amp, t0, t1, { period }, "pulsar");
}

/** Giro contínuo de `deg` graus por ciclo (sem salto no laço quando deg é a simetria da peça). */
function giro(deg) {
  return [[0, 0, "linear"], [FORMAT.op, deg]];
}

function prop3(v, z) {
  const to3 = (x) => (x.length === 1 ? [x[0], x[0], z] : x.length === 2 ? [x[0], x[1], z] : x);
  if (isAnim(v)) return { a: 1, k: v.k.map((kf) => ({ ...kf, s: to3(kf.s), ...(kf.e ? { e: to3(kf.e) } : {}) })) };
  return { a: 0, k: to3(vec(v)) };
}
function prop1(v) {
  if (isAnim(v)) return v;
  return { a: 0, k: r3(v) };
}

/**
 * Camada de uma peça. `p`, `a`, `s` (número ou [sx, sy]), `r` e `o` aceitam
 * valor fixo ou `anim(...)`.
 */
function pieceLayer(ind, nm, shapes, { p = CENTER, a = [0, 0], s = 100, r = 0, o = 100 } = {}) {
  return shapeLayer(ind, nm, {
    p: prop3(p, 0), a: prop3(a, 0), s: prop3(s, 100), r: prop1(r), o: prop1(o),
  }, shapes);
}

/** Shape de uma linha pelos pontos; `smooth` faz curvas (Catmull-Rom) em vez de retas. */
function polyline(points, { smooth = true, closed = false } = {}) {
  const n = points.length;
  const v = points.map(([x, y]) => [r3(x), r3(y)]);
  const i = v.map(() => [0, 0]), o = v.map(() => [0, 0]);
  if (smooth) {
    for (let k = 0; k < n; k++) {
      const prev = points[closed ? (k - 1 + n) % n : Math.max(0, k - 1)];
      const next = points[closed ? (k + 1) % n : Math.min(n - 1, k + 1)];
      const tx = (next[0] - prev[0]) / 6, ty = (next[1] - prev[1]) / 6;
      o[k] = [r3(tx), r3(ty)]; i[k] = [r3(-tx), r3(-ty)];
    }
  }
  return { v, i, o, c: closed };
}

/** Contorno (sem preenchimento) de shapes, com corte animado opcional (`trim: { s, e }`, em %). */
function makeStroke(shapes, width, color, name, { opacity = 100, trim = null } = {}) {
  const it = shapes.map((sh, idx) => ({
    ty: "sh", nm: `p${idx}`, ind: idx, ks: { a: 0, k: { v: sh.v, i: sh.i, o: sh.o, c: sh.c } }, hd: false,
  }));
  if (trim) {
    it.push({ ty: "tm", nm: "Trim", s: prop1(trim.s ?? 0), e: prop1(trim.e ?? 100), o: { a: 0, k: 0 }, m: 1, hd: false });
  }
  it.push({ ty: "st", nm: "S", o: { a: 0, k: opacity }, c: { a: 0, k: color }, w: { a: 0, k: width }, lc: 2, lj: 2, hd: false });
  it.push(TR());
  return { ty: "gr", nm: name, hd: false, it };
}

/** Anel elíptico (contorno), centrado em (cx, cy). */
function makeEllipseRing(cx, cy, rx, ry, width, color, name, opacity = 100) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [cx, cy] }, s: { a: 0, k: [rx * 2, ry * 2] }, hd: false },
      { ty: "st", nm: "S", o: { a: 0, k: opacity }, c: { a: 0, k: color }, w: { a: 0, k: width }, lc: 2, lj: 2, hd: false },
      TR(),
    ],
  };
}

/**
 * Luz do alto que acende e desce suave, sem esticar nem deformar (pedido do
 * dono na rodada 1 de ajustes, Story 11.7): a forma tem tamanho fixo — um
 * brilho difuso (três cones macios, um dentro do outro, mais forte no miolo) e
 * `rays` raios finos de comprimento fixo saindo do alto. A camada nunca muda de
 * escala: só ganha opacidade e desce `drop` px entre t0 e t0+dur; depois
 * respira devagar. Ocupa de `top` a `bottom` (descida incluída) e no máximo
 * `w1` de largura; `w0` é a largura da fonte de luz no alto. `peak` é o nível
 * de opacidade a que a luz acende; depois ela respira ±20% em volta dele
 * (por isso `peak` · 1,2 não pode passar de 100).
 * Substitui o antigo `luzDescendo` (feixe que crescia só na vertical) em
 * todos os troféus.
 */
function luzSuave(ind, color, { nm = "Luz", x = 100, top = 24, bottom = 150, w0 = 14, w1 = 70, t0 = 0, dur = 16, peak = 40, rays = 5, drop = 8 } = {}) {
  const h = bottom - top - drop;
  if (!(h > 0 && w1 > w0 && w0 > 0)) throw new Error(`luzSuave: medidas inválidas (top ${top}, bottom ${bottom}, drop ${drop}, w0 ${w0}, w1 ${w1})`);
  if (!(Number.isInteger(rays) && rays >= 2)) throw new Error(`luzSuave: raios inválidos ${rays}`);
  // a fonte (altura 0,7·w0) e o pé do raio mais curto (0,68·h) precisam caber, com os raios descendo
  if (!(w0 * 0.7 < h * 0.68)) throw new Error(`luzSuave: altura ${h} (bottom − top − drop) curta demais para w0 ${w0}`);
  if (!(Number.isFinite(dur) && dur > 0)) throw new Error(`luzSuave: dur inválido ${dur}`);
  if (!(Number.isFinite(t0) && t0 >= 0 && t0 + dur + 18 <= FORMAT.op - 1)) {
    throw new Error(`luzSuave: t0 ${t0} + dur ${dur} não deixa meio período (18 quadros) para respirar até o quadro ${FORMAT.op - 1}`);
  }
  if (!(Number.isFinite(peak) && peak > 0 && peak * 1.2 <= 100)) throw new Error(`luzSuave: peak ${peak} fora de 0..${r3(100 / 1.2)} (respira ±20%)`);
  // cone macio: estreito no alto (largura w0), abrindo até a base larga e arredondada
  const cone = (f) => {
    const w = w0 + (w1 - w0) * f, hh = h * (0.6 + 0.4 * f);
    const sh = polyline([[w0 / 2, 0], [w * 0.36, hh * 0.5], [w * 0.5, hh * 0.86], [w * 0.36, hh * 0.98], [0, hh],
      [-w * 0.36, hh * 0.98], [-w * 0.5, hh * 0.86], [-w * 0.36, hh * 0.5], [-w0 / 2, 0]], { closed: true });
    // borda de cima reta (cantos sem curva), para a luz não passar de `top`
    for (const k of [0, sh.v.length - 1]) { sh.i[k] = [0, 0]; sh.o[k] = [0, 0]; }
    return sh;
  };
  const src = r3(w0 * 0.35);
  const raios = Array.from({ length: rays }, (_, k) => {
    const u = (k / (rays - 1)) * 2 - 1;
    return polyline([[u * w0 * 0.3, src], [u * w1 * 0.42, h * (0.8 - 0.12 * Math.abs(u))]], { smooth: false });
  });
  return pieceLayer(ind, nm, [
    makeEllipse(0, src, w0 / 2, src, color, "LuzFonte", 90),
    makeStroke(raios, 1.4, color, "LuzRaios", { opacity: 65 }),
    makeFill([cone(0.35)], color, "LuzMiolo", 45),
    makeFill([cone(0.7)], color, "LuzMeio", 35),
    makeFill([cone(1)], color, "LuzBorda", 25),
  ], {
    p: anim([[0, [x, top]], [t0, [x, top], "out"], [t0 + dur, [x, top + drop]]]),
    o: anim([...aparecer(t0, dur * 0.75, { to: peak }), ...onda(peak, -peak * 0.2, t0 + dur, FORMAT.op - 1, { period: 36 })]),
  });
}

/** Ondulação na água: anel achatado que abre e some (onda). */
function ondulacao(ind, color, { nm = "Ondulacao", center = CENTER, rx = 30, ry = 7, width = 2, t0 = 0, dur = 24, peak = 90, rest = 0 } = {}) {
  return pieceLayer(ind, nm, [makeEllipseRing(0, 0, rx, ry, width, color, nm)], {
    p: center,
    s: anim([[0, 15], [t0, 15, "out"], [t0 + dur, 100]]),
    o: anim([[0, 0], [t0, 0, "linear"], [t0 + 2, peak, "in"], [t0 + dur, rest]]),
  });
}

/** Gerador pseudoaleatório fixo (mesma saída a cada execução). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Confete: `count` papeizinhos (uma camada cada) que caem girando dentro de
 * `area` = [x0, y0, x1, y1] (de y0 até y1) a partir de t0.
 */
function confete(firstInd, colors, { count = 6, t0 = 40, dur = 40, area = [40, 34, 160, 120], seed = 7, nm = "Confete" } = {}) {
  const rnd = seeded(seed);
  const [x0, y0, x1, y1] = area;
  if (!(t0 >= 0 && t0 + 22 < FORMAT.op)) throw new Error(`confete: início ${t0} não cabe em 0..${FORMAT.op}`);
  return Array.from({ length: count }, (_, k) => {
    const x = x0 + ((x1 - x0) * (k + 0.5)) / count + (rnd() - 0.5) * 8;
    const drift = (rnd() - 0.5) * 16;
    const start = t0 + rnd() * 10;
    const w = 3 + rnd() * 2, hgt = 5 + rnd() * 2;
    const rect = polyline([[-w / 2, -hgt / 2], [w / 2, -hgt / 2], [w / 2, hgt / 2], [-w / 2, hgt / 2]], { smooth: false, closed: true });
    const end = Math.min(FORMAT.op - 1, start + dur);
    return pieceLayer(firstInd + k, `${nm}${k}`, [makeFill([rect], colors[k % colors.length], "Papel")], {
      p: anim([[0, [x, y0]], [start, [x, y0], "linear"], [end, [x + drift, y1]]]),
      r: anim([[0, 0], [start, 0, "linear"], [end, (rnd() < 0.5 ? -1 : 1) * (180 + rnd() * 180)]]),
      o: anim([[0, 0], [start, 0, "ease"], [start + 4, 100, "ease"], [end - 6, 100, "ease"], [end, 0]]),
    });
  });
}

/**
 * Encolhe (ou amplia) uma camada inteira em volta de `center`, fator `k`:
 * posição p → center + k·(p − center) e escala s → k·s. Vale para valores
 * fixos e animados; o desenho, a âncora e a rotação não mudam.
 */
function scaleLayer(layer, k, center = [FORMAT.w / 2, FORMAT.h / 2]) {
  if (!(k > 0) || !Number.isFinite(k)) throw new Error(`scaleLayer: fator inválido ${k}`);
  const mapP = (v) => v.map((x, i) => (i < 2 ? r3(center[i] + k * (x - center[i])) : x));
  const mapS = (v) => v.map((x, i) => (i < 2 ? r3(x * k) : x));
  const apply = (prop, f) => {
    if (prop.a !== 1) return { ...prop, k: f(prop.k) };
    return { ...prop, k: prop.k.map((kf) => ({ ...kf, s: f(kf.s), ...(kf.e ? { e: f(kf.e) } : {}) })) };
  };
  return { ...layer, ks: { ...layer.ks, p: apply(layer.ks.p, mapP), s: apply(layer.ks.s, mapS) } };
}

function assemble(nm, layers) {
  return { ...FORMAT, nm, ddd: 0, assets: [], layers };
}

// ── Escrita com recusa de id aprovado ────────────────────────────────────────

/** Trecho do arquivo entre `const APPROVED_LOTTIE` e o `};` que fecha o mapa. */
function approvedBlock(file) {
  const src = fs.readFileSync(file, "utf8");
  const start = src.indexOf("const APPROVED_LOTTIE");
  if (start < 0) throw new Error(`APPROVED_LOTTIE não encontrado em ${file}`);
  const end = src.indexOf("\n};", start);
  if (end < 0) throw new Error(`Fim de APPROVED_LOTTIE ("};") não encontrado em ${file}`);
  return src.slice(start, end);
}

const ID_LINE = /^(\s*)(?:"([A-Za-z0-9_]+)"|'([A-Za-z0-9_]+)'|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*\{/;
// `nível: require("…")` (formato antigo) ou `nível: () => require("…")` (getter)
const TIER_LINE = /^\s*(base|t[1-4])\s*:\s*(?:\(\)\s*=>\s*)?require\(\s*["']([^"']+)["']\s*\)/;

/**
 * Linhas do bloco com o id de troféu quando a linha abre uma entrada de
 * primeiro nível (`"id": {` na menor indentação entre as linhas desse tipo);
 * objetos aninhados dentro de uma entrada (indentação maior) não viram id.
 */
function approvedLines(file) {
  const lines = approvedBlock(file).split("\n");
  const matches = lines.map((line) => line.match(ID_LINE));
  const indents = matches.filter(Boolean).map((m) => m[1].length);
  const top = indents.length ? Math.min(...indents) : -1;
  return lines.map((line, i) => {
    const m = matches[i];
    return { line, id: m && m[1].length === top ? m[2] || m[3] || m[4] : null };
  });
}

/** Lê os ids de `APPROVED_LOTTIE` (src/components/gamification/approvedLottie.ts). */
function readApprovedIds(file = APPROVED_LOTTIE_TS) {
  const ids = new Set();
  for (const { id } of approvedLines(file)) if (id) ids.add(id);
  return ids;
}

/**
 * Lê `APPROVED_LOTTIE` como Map id → { base, t1…t4 } com o nome de cada
 * arquivo em assets/lottie/trophies (ex.: "lt_tome_t2.json"). Lança erro se
 * um nível aponta para fora dessa pasta.
 */
function readApprovedFiles(file = APPROVED_LOTTIE_TS) {
  const out = new Map();
  let current = null;
  for (const { line, id } of approvedLines(file)) {
    if (id) {
      current = id;
      out.set(current, {});
      continue;
    }
    const tier = line.match(TIER_LINE);
    if (!tier) continue;
    if (!current) throw new Error(`Nível fora de um troféu em APPROVED_LOTTIE: ${line.trim()}`);
    const m = tier[2].match(/^@\/assets\/lottie\/trophies\/([A-Za-z0-9_]+\.json)$/);
    if (!m) throw new Error(`Arquivo fora de assets/lottie/trophies em APPROVED_LOTTIE (${current}.${tier[1]}): ${tier[2]}`);
    out.get(current)[tier[1]] = m[1];
  }
  return out;
}

/** Todos os arquivos referenciados por APPROVED_LOTTIE, em ordem alfabética. */
function approvedFileList(file = APPROVED_LOTTIE_TS) {
  const files = new Set();
  for (const tiers of readApprovedFiles(file).values()) for (const f of Object.values(tiers)) files.add(f);
  return [...files].sort();
}

/**
 * sha256 (hex) de cada arquivo aprovado: { "<arquivo>.json": "<hash>" }.
 * CRLF vira LF antes do hash, para um checkout com autocrlf (Windows) não
 * acusar mudança.
 */
function computeApprovedHashes({ file = APPROVED_LOTTIE_TS, outDir = OUT_DIR } = {}) {
  const crypto = require("crypto");
  const hashes = {};
  for (const f of approvedFileList(file)) {
    const text = fs.readFileSync(path.join(outDir, f), "utf8").replace(/\r\n/g, "\n");
    hashes[f] = crypto.createHash("sha256").update(text, "utf8").digest("hex");
  }
  return hashes;
}

/**
 * Compara a lista gravada com a calculada agora: { changed, missing, extra }
 * (arquivos com hash diferente, que faltam na lista atual, ou que sobram).
 * Tudo vazio = confere.
 */
function compareApprovedHashes(recorded, current) {
  const changed = [];
  const missing = [];
  const extra = [];
  for (const [f, hash] of Object.entries(recorded)) {
    if (!(f in current)) missing.push(f);
    else if (current[f] !== hash) changed.push(f);
  }
  for (const f of Object.keys(current)) if (!(f in recorded)) extra.push(f);
  return { changed: changed.sort(), missing: missing.sort(), extra: extra.sort() };
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
  FORMAT, CENTER, OUT_DIR, VIEW_ZOOM, VIEW_WINDOW,
  parsePath, hex, normHex, lighten,
  makeFill, makeEllipse, makeRing, makeRays, makeStroke, makeEllipseRing, polyline,
  iconShapes, iconPoint,
  samplePoints, iconRadius, fitIconSize,
  mainLayer, sparkleLayers, glowLayer, raysLayer, assemble,
  // movimento
  anim, trajeto, pulo, queda, abrir, onda, aparecer, sumir, pop, pulsar, giro,
  pieceLayer, scaleLayer, luzSuave, ondulacao, confete, seeded,
  readApprovedIds, readApprovedFiles, approvedFileList, computeApprovedHashes, compareApprovedHashes, writeTrophy,
  APPROVED_LOTTIE_TS, APPROVED_HASHES,
};
