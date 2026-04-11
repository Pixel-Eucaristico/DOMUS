#!/usr/bin/env node
/**
 * gen_trophy_seasonal_finados.js
 * Trophy: seasonal_finados — "Legado Financeiro 🕯️"
 * Sources:
 *   - Fluent UI flat headstone (MIT, viewBox 0 0 32 32)
 *   - Twemoji candle 1f56f (CC-BY 4.0 Twitter, viewBox 0 0 36 36)
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const OUT = path.join(__dirname, "../assets/lottie/trophies");

// ── Fluent UI Headstone paths (viewBox 0 0 32 32) ────────────────────────────
const STONE_BODY_D =
  "M20.2616 6C20.0334 6 19.8373 5.84418 19.7592 5.62984C19.1998 4.09552 17.7278 3 16 3C14.2722 3 12.8002 4.09552 12.2408 5.62984C12.1627 5.84418 11.9666 6 11.7384 6H10C8.89543 6 8 6.89543 8 8V25H7C6.44772 25 6 25.4477 6 26V27.5H26V26C26 25.4477 25.5523 25 25 25H24V8C24 6.89543 23.1046 6 22 6H20.2616Z";

const STONE_SHADOW_D =
  "M16 5C14.8954 5 14 5.89543 14 7V7.07143C14 7.58426 13.5843 8 13.0714 8H10.5C10.2239 8 10 8.22386 10 8.5V25H9V8.5C9 7.67157 9.67157 7 10.5 7H13C13 5.34315 14.3431 4 16 4C17.6569 4 19 5.34315 19 7H21.5C22.3284 7 23 7.67157 23 8.5V25H22V8.5C22 8.22386 21.7761 8 21.5 8H18.9286C18.4157 8 18 7.58426 18 7.07143V7C18 5.89543 17.1046 5 16 5Z";

const GROUND_D =
  "M2 29C2 27.8954 2.89543 27 4 27H28C29.1046 27 30 27.8954 30 29V30H2V29Z";

// ── Twemoji Candle paths (viewBox 0 0 36 36) ─────────────────────────────────
const CANDLE_BODY_D =
  "M27.138 33.817C27.183 35.022 26.206 36 25 36H12.183C10.977 36 10 35.022 10 33.817V21c0-1.205.115-2.183 2.183-2.183S15 23 25 21c1.091 0 2.183.978 2.138 2.183v10.634z";

const CANDLE_WICK_D =
  "M20 21.5c0 .828-.672 1.5-1.5 1.5-.829 0-1.5-.672-1.5-1.5v-3c0-.829.671-1.5 1.5-1.5.828 0 1.5.671 1.5 1.5v3z";

const FLAME_OUTER_D =
  "M18.687 18.538c-2.595 0-6.962-1.934-6.962-5.898 0-3.988 4.351-5.414 7.005-11.401.751-1.693.999-1.107 1.86-.076 2.06 2.463 5.058 7.483 5.058 11.574-.001 4.641-4.64 5.801-6.961 5.801z";

const FLAME_INNER_D =
  "M18.687 17.447c-4.184 0-3.482-5.802 0-9.283 2.321 1.16 5.801 9.283 0 9.283z";

// ── SVG parser ────────────────────────────────────────────────────────────────
function isNum(s) { return /^-?\.?\d/.test(s); }

function parsePath(d, cx, cy, sc, tx, ty) {
  const dAbs = svgpath(d).translate(-cx, -cy).scale(sc).translate(tx, ty).abs().unarc().round(3).toString();
  const subPaths = dAbs.split(/(?=M)/).filter(Boolean);
  const shapes = [];
  for (const sub of subPaths) {
    const tokens = sub.replace(/([MLCSVHZmlcsvhz])/g, ' $1 ').trim().split(/[\s,]+/).filter(Boolean);
    let i = 0, cx2 = 0, cy2 = 0;
    const verts = [], inn = [], out = [];
    let closed = false, prevCmd = '', lastCmd = '';
    while (i < tokens.length) {
      const t = tokens[i];
      if (!isNum(t)) { prevCmd = lastCmd; lastCmd = t; i++; }
      const cmd = lastCmd;
      if (cmd === 'M' || cmd === 'L') {
        const x = parseFloat(tokens[i++]), y = parseFloat(tokens[i++]);
        verts.push([x, y]); inn.push([0, 0]); out.push([0, 0]); cx2 = x; cy2 = y;
      } else if (cmd === 'H') {
        const x = parseFloat(tokens[i++]);
        verts.push([x, cy2]); inn.push([0, 0]); out.push([0, 0]); cx2 = x;
      } else if (cmd === 'V') {
        const y = parseFloat(tokens[i++]);
        verts.push([cx2, y]); inn.push([0, 0]); out.push([0, 0]); cy2 = y;
      } else if (cmd === 'C') {
        const x1 = parseFloat(tokens[i++]), y1 = parseFloat(tokens[i++]);
        const x2 = parseFloat(tokens[i++]), y2 = parseFloat(tokens[i++]);
        const x  = parseFloat(tokens[i++]), y  = parseFloat(tokens[i++]);
        if (verts.length > 0) { const lv = verts[verts.length-1]; out[out.length-1] = [x1-lv[0], y1-lv[1]]; }
        verts.push([x, y]); inn.push([x2-x, y2-y]); out.push([0, 0]);
        cx2 = x; cy2 = y; prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === 'S') {
        const x2 = parseFloat(tokens[i++]), y2 = parseFloat(tokens[i++]);
        const x  = parseFloat(tokens[i++]), y  = parseFloat(tokens[i++]);
        let x1, y1;
        if (verts.length > 0 && (prevCmd === 'C' || prevCmd === 'S')) {
          const lv = verts[verts.length-1], li = inn[inn.length-1];
          x1 = lv[0]-li[0]; y1 = lv[1]-li[1];
        } else { x1 = cx2; y1 = cy2; }
        if (verts.length > 0) { const lv = verts[verts.length-1]; out[out.length-1] = [x1-lv[0], y1-lv[1]]; }
        verts.push([x, y]); inn.push([x2-x, y2-y]); out.push([0, 0]);
        cx2 = x; cy2 = y; prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === 'Z') { closed = true; break; } else { i++; }
    }
    if (verts.length < 2) continue;
    shapes.push({ v: verts, i: inn, o: out, c: closed });
  }
  return shapes;
}

// ── Lottie helpers ────────────────────────────────────────────────────────────
let _id = 1;
const nid = () => _id++;

function makeFill(shapes, color, name) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      ...shapes.map((s, idx) => ({
        ty: "sh", nm: `p${idx}`, ind: idx,
        ks: { a: 0, k: { v: s.v, i: s.i, o: s.o, c: s.c } }, hd: false
      })),
      { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0,0] }, a: { a: 0, k: [0,0] },
        s: { a: 0, k: [100,100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

// ── Flame flicker — só opacidade, irregular, sem escala ──────────────────────
function flameOpacityKF() {
  // opacidade irregular simulando tremor real da chama
  return [
    { t: 20, s: [0],   e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
    { t: 26, s: [100], e: [82],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 31, s: [82],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 36, s: [100], e: [88],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 40, s: [88],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 44, s: [100], e: [75],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 47, s: [75],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 52, s: [100], e: [90],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 56, s: [90],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 61, s: [100], e: [80],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 65, s: [80],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 70, s: [100], e: [85],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 74, s: [85],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 79, s: [100], e: [78],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 83, s: [78],  e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
    { t: 89, s: [100] },
  ];
}

// ── Build Lottie ──────────────────────────────────────────────────────────────
function buildLottie(stoneColor, stoneShadow, groundColor, bodyColor, wickColor,
                     flameOuterColor, flameInnerColor, glowColor, tier) {
  _id = 1;

  // Lápide: CX=16, CY=15, SC=5.8, TX=100, TY=95
  const stBody   = parsePath(STONE_BODY_D,   16, 15, 5.8, 100, 95);
  const stShadow = parsePath(STONE_SHADOW_D, 16, 15, 5.8, 100, 95);
  const ground   = parsePath(GROUND_D,       16, 15, 5.8, 100, 95);

  // Vela completa: mesmo CX/CY/SC/TX/TY para todas as partes — alinhamento correto
  // CY=18 = centro do viewBox 36x36, TY=125 → fundo da vela em ~175px
  const candleBody = parsePath(CANDLE_BODY_D, 18, 18, 2.8, 100, 125);
  const wick       = parsePath(CANDLE_WICK_D, 18, 18, 2.8, 100, 125);
  const flameOuter = parsePath(FLAME_OUTER_D, 18, 18, 2.8, 100, 125);
  const flameInner = parsePath(FLAME_INNER_D, 18, 18, 2.8, 100, 125);

  // Layer da lápide — sobe do fundo
  const graveLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Grave", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, 40, 0],  e: [0, 0, 0],  i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 18, s: [0, 0, 0],   e: [0, 4, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 24, s: [0, 4, 0],   e: [0, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 0, 0] },
      ]},
      a: { a: 0, k: [0,0,0] }, s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],   e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 12, s: [100], e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100] },
      ]},
    },
    shapes: [
      makeFill(stShadow, stoneShadow, "Shadow"),
      makeFill(stBody,   stoneColor,  "Stone"),
      makeFill(ground,   groundColor, "Ground"),
    ],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Layer da vela — aparece junto com a lápide
  const candleLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Candle", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, 40, 0],  e: [0, 0, 0],  i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 18, s: [0, 0, 0],   e: [0, 4, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 24, s: [0, 4, 0],   e: [0, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 0, 0] },
      ]},
      a: { a: 0, k: [0,0,0] }, s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],   e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 12, s: [100], e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100] },
      ]},
    },
    shapes: [
      makeFill(wick,       wickColor,  "Wick"),
      makeFill(candleBody, bodyColor,  "Body"),
    ],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Chama outer — flicker só de opacidade
  const flameOuterLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "FlameOuter", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, 40, 0], e: [0, 0, 0], i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 18, s: [0, 0, 0],  e: [0, 4, 0], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 24, s: [0, 4, 0],  e: [0, 0, 0], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 0, 0] },
      ]},
      a: { a: 0, k: [0,0,0] }, s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: flameOpacityKF() },
    },
    shapes: [makeFill(flameOuter, flameOuterColor, "FlameOuter")],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Chama inner — flicker ligeiramente defasado
  const flameInnerKF = flameOpacityKF().map(kf => ({ ...kf, t: kf.t + 2 }));
  const flameInnerLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "FlameInner", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, 40, 0], e: [0, 0, 0], i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 18, s: [0, 0, 0],  e: [0, 4, 0], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 24, s: [0, 4, 0],  e: [0, 0, 0], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 0, 0] },
      ]},
      a: { a: 0, k: [0,0,0] }, s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: flameInnerKF },
    },
    shapes: [makeFill(flameInner, flameInnerColor, "FlameInner")],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Glow — brilho quente da vela atrás de tudo
  const glowLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Glow", sr: 1,
    ks: {
      p: { a: 0, k: [0,0,0] }, a: { a: 0, k: [0,0,0] },
      s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],  e: [0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 22, s: [0],  e: [16], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 89, s: [16] },
      ]},
    },
    shapes: [{
      ty: "gr", nm: "Glow", hd: false,
      it: [
        { ty: "el", nm: "E", p: { a: 0, k: [100, 105] }, s: { a: 0, k: [180, 180] }, hd: false },
        { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: glowColor }, r: 1, hd: false },
        { ty: "tr", p: { a: 0, k: [0,0] }, a: { a: 0, k: [0,0] },
          s: { a: 0, k: [100,100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false },
      ],
    }],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // layers[0] = frontmost
  const layers = [
    flameInnerLayer,
    flameOuterLayer,
    candleLayer,
    graveLayer,
    glowLayer,
  ];

  return {
    v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
    nm: `seasonal_finados_t${tier}`,
    ddd: 0, assets: [], layers,
  };
}

// ── Tier configs ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    tier: 1, suffix: "",
    stoneColor:      [0.72, 0.70, 0.67, 1],  // pedra cinza (bronze)
    stoneShadow:     [0.42, 0.40, 0.38, 1],
    groundColor:     [0.30, 0.50, 0.15, 1],  // grama verde
    bodyColor:       [0.93, 0.90, 0.82, 1],  // cera creme
    wickColor:       [0.25, 0.28, 0.30, 1],  // mecha escura
    flameOuterColor: [1.00, 0.65, 0.15, 1],  // laranja
    flameInnerColor: [1.00, 0.88, 0.35, 1],  // amarelo
    glowColor:       [1.00, 0.55, 0.10, 1],
  },
  {
    tier: 2, suffix: "_t2",
    stoneColor:      [0.72, 0.73, 0.80, 1],  // pedra azulada (prata)
    stoneShadow:     [0.42, 0.43, 0.50, 1],
    groundColor:     [0.28, 0.48, 0.18, 1],
    bodyColor:       [0.90, 0.90, 0.96, 1],  // cera branquinha
    wickColor:       [0.20, 0.20, 0.28, 1],
    flameOuterColor: [0.85, 0.65, 1.00, 1],  // lilás
    flameInnerColor: [1.00, 0.90, 1.00, 1],  // branco-lilás
    glowColor:       [0.65, 0.50, 0.95, 1],
  },
  {
    tier: 3, suffix: "_t3",
    stoneColor:      [0.88, 0.78, 0.42, 1],  // pedra dourada (ouro)
    stoneShadow:     [0.58, 0.48, 0.12, 1],
    groundColor:     [0.28, 0.48, 0.18, 1],
    bodyColor:       [1.00, 0.97, 0.88, 1],  // cera marfim
    wickColor:       [0.22, 0.18, 0.08, 1],
    flameOuterColor: [1.00, 0.72, 0.10, 1],  // dourado
    flameInnerColor: [1.00, 0.95, 0.55, 1],  // amarelo ouro
    glowColor:       [1.00, 0.80, 0.10, 1],
  },
];

// ── Generate & write ──────────────────────────────────────────────────────────
for (const t of TIERS) {
  const lottie = buildLottie(
    t.stoneColor, t.stoneShadow, t.groundColor,
    t.bodyColor, t.wickColor,
    t.flameOuterColor, t.flameInnerColor,
    t.glowColor, t.tier
  );
  const fname = `seasonal_finados${t.suffix}.json`;
  fs.writeFileSync(path.join(OUT, fname), JSON.stringify(lottie));
  console.log(`✓ ${fname}`);
}
console.log("Done.");
