#!/usr/bin/env node
/**
 * gen_trophy_seasonal_black_friday.js
 * Trophy: seasonal_black_friday — "Black Friday Consciente 🛍️"
 * Icons:
 *   - Heroicons solid shopping-bag (MIT, viewBox 0 0 24 24)
 *   - Tabler filled circle-check (MIT, viewBox 0 0 24 24)
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const OUT = path.join(__dirname, "../assets/lottie/trophies");

// ── SVG paths ─────────────────────────────────────────────────────────────────

// Heroicons solid shopping-bag (3 sub-paths, fill-rule: evenodd)
const BAG_D =
  "M7.5 6V6.75H5.51287C4.55332 6.75 3.74862 7.47444 3.64817 8.42872L2.38502 20.4287C2.26848 21.5358 3.13652 22.5 4.24971 22.5H19.7504C20.8636 22.5 21.7317 21.5358 21.6151 20.4287L20.352 8.42872C20.2515 7.47444 19.4468 6.75 18.4873 6.75H16.5V6C16.5 3.51472 14.4853 1.5 12 1.5C9.51472 1.5 7.5 3.51472 7.5 6ZM12 3C10.3431 3 9 4.34315 9 6V6.75H15V6C15 4.34315 13.6569 3 12 3ZM9 11.25C9 12.9069 10.3431 14.25 12 14.25C13.6569 14.25 15 12.9069 15 11.25V10.5C15 10.0858 15.3358 9.75 15.75 9.75C16.1642 9.75 16.5 10.0858 16.5 10.5V11.25C16.5 13.7353 14.4853 15.75 12 15.75C9.51472 15.75 7.5 13.7353 7.5 11.25V10.5C7.5 10.0858 7.83579 9.75 8.25 9.75C8.66421 9.75 9 10.0858 9 10.5V11.25Z";

// Tabler filled circle-check (2 sub-paths: circle + checkmark)
const CHECK_D =
  "M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z";

// ── SVG tokenizer & parser ────────────────────────────────────────────────────
function isNum(s) { return /^-?\.?\d/.test(s); }

function svgToLottie(d, cx, cy, sc, tx, ty) {
  const dAbs = svgpath(d).translate(-cx, -cy).scale(sc).translate(tx, ty).abs().unarc().round(3).toString();
  const subPaths = dAbs.split(/(?=M)/).filter(Boolean);
  const shapes = [];
  for (const sub of subPaths) {
    const tokens = sub.replace(/([MLCSVHZmlcsvhz])/g, ' $1 ').trim().split(/[\s,]+/).filter(Boolean);
    let i = 0, cx2 = 0, cy2 = 0;
    const verts = [], inn = [], out = [];
    let closed = false;
    let prevCmd = '', lastCmd = '';
    while (i < tokens.length) {
      const t = tokens[i];
      if (!isNum(t)) { prevCmd = lastCmd; lastCmd = t; i++; }
      const cmd = lastCmd;
      if (cmd === 'M' || cmd === 'L') {
        const x = parseFloat(tokens[i++]), y = parseFloat(tokens[i++]);
        verts.push([x, y]); inn.push([0, 0]); out.push([0, 0]);
        cx2 = x; cy2 = y;
      } else if (cmd === 'H') {
        const x = parseFloat(tokens[i++]);
        verts.push([x, cy2]); inn.push([0, 0]); out.push([0, 0]);
        cx2 = x;
      } else if (cmd === 'V') {
        const y = parseFloat(tokens[i++]);
        verts.push([cx2, y]); inn.push([0, 0]); out.push([0, 0]);
        cy2 = y;
      } else if (cmd === 'C') {
        const x1 = parseFloat(tokens[i++]), y1 = parseFloat(tokens[i++]);
        const x2 = parseFloat(tokens[i++]), y2 = parseFloat(tokens[i++]);
        const x  = parseFloat(tokens[i++]), y  = parseFloat(tokens[i++]);
        if (verts.length > 0) {
          const lv = verts[verts.length - 1];
          out[out.length - 1] = [x1 - lv[0], y1 - lv[1]];
        }
        verts.push([x, y]); inn.push([x2 - x, y2 - y]); out.push([0, 0]);
        cx2 = x; cy2 = y;
        prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === 'S') {
        const x2 = parseFloat(tokens[i++]), y2 = parseFloat(tokens[i++]);
        const x  = parseFloat(tokens[i++]), y  = parseFloat(tokens[i++]);
        let x1, y1;
        if (verts.length > 0 && (prevCmd === 'C' || prevCmd === 'S')) {
          const lv = verts[verts.length - 1];
          const li = inn[inn.length - 1];
          x1 = lv[0] - li[0]; y1 = lv[1] - li[1];
        } else { x1 = cx2; y1 = cy2; }
        if (verts.length > 0) {
          const lv = verts[verts.length - 1];
          out[out.length - 1] = [x1 - lv[0], y1 - lv[1]];
        }
        verts.push([x, y]); inn.push([x2 - x, y2 - y]); out.push([0, 0]);
        cx2 = x; cy2 = y;
        prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === 'Z') {
        closed = true; break;
      } else { i++; }
    }
    if (verts.length < 2) continue;
    shapes.push({ v: verts, i: inn, o: out, c: closed });
  }
  return shapes;
}

// ── Lottie helpers ────────────────────────────────────────────────────────────
let _id = 1;
const nid = () => _id++;

function makeShape(shapes, color, name, fillRule) {
  const mergedPaths = shapes.map((s, idx) => ({
    ty: "sh", nm: `path_${idx}`, ind: idx,
    ks: { a: 0, k: { v: s.v, i: s.i, o: s.o, c: s.c } },
    hd: false
  }));
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      ...mergedPaths,
      { ty: "fl", nm: "Fill", o: { a: 0, k: 100 }, c: { a: 0, k: color },
        r: fillRule === "evenodd" ? 2 : 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

function makeGlow(color) {
  return {
    ty: "gr", nm: "Glow", hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [100, 108] }, s: { a: 0, k: [170, 170] }, hd: false },
      { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

// ── Build shapes ──────────────────────────────────────────────────────────────

// Bag: CX=12, CY=12, SC=3.8, TX=100, TY=104
function buildBagShapes(bagColor) {
  const shapes = svgToLottie(BAG_D, 12, 12, 3.8, 100, 104);
  return [makeShape(shapes, bagColor, "Bag", "evenodd")];
}

// Check badge: CX=12, CY=12, SC=2.2, TX=132, TY=130
function buildCheckShapes(circleColor, checkColor) {
  const dAbs = svgpath(CHECK_D).translate(-12, -12).scale(2.2).translate(132, 130).abs().unarc().round(3).toString();
  const subPaths = dAbs.split(/(?=M)/).filter(Boolean);
  const circle = subPaths[0] ? svgToLottie(subPaths[0], 0, 0, 1, 0, 0) : [];
  const check  = subPaths[1] ? svgToLottie(subPaths[1], 0, 0, 1, 0, 0) : [];
  const layers = [];
  if (check.length)  layers.push(makeShape(check,  checkColor,  "Check"));
  if (circle.length) layers.push(makeShape(circle, circleColor, "Circle"));
  return layers;
}

// ── Build Lottie ──────────────────────────────────────────────────────────────
function buildLottie(bagColor, badgeColor, checkColor, glowColor, sparkleColor, tier) {
  _id = 1;
  const bagShapes   = buildBagShapes(bagColor);
  const checkShapes = buildCheckShapes(badgeColor, checkColor);

  // Bag layer: drop-in from top + gentle bounce
  const bagLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Bag", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, -55, 0], e: [0, 0, 0],   i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 16, s: [0, 0, 0],   e: [0, 6, 0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 24, s: [0, 6, 0],   e: [0, -3, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 32, s: [0, -3, 0],  e: [0, 0, 0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        // gentle float
        { t: 50, s: [0, 0, 0],   e: [0, -5, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 70, s: [0, -5, 0],  e: [0, 0, 0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 0, 0] },
      ]},
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],   e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 10, s: [100], e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100] },
      ]},
    },
    shapes: bagShapes,
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Badge layer: pops in at frame 22
  const badgeLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Badge", sr: 1,
    ks: {
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { t: 0,  s: [0, 0, 100],     e: [0, 0, 100],     i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 22, s: [0, 0, 100],     e: [125, 125, 100], i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 29, s: [125, 125, 100], e: [100, 100, 100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 35, s: [100, 100, 100] },
      ]},
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
    },
    shapes: checkShapes,
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Sparkle dots
  const sparkDefs = [
    { x: 48,  y: 48,  sz: 5 },
    { x: 155, y: 52,  sz: 4 },
    { x: 162, y: 95,  sz: 6 },
    { x: 40,  y: 108, sz: 4 },
    { x: 100, y: 38,  sz: 5 },
  ];
  const sparkleLayers = sparkDefs.map(({ x, y, sz }, idx) => {
    const f = 30 + idx * 7;
    return {
      ddd: 0, ind: nid(), ty: 4, nm: `Sp${idx}`, sr: 1,
      ks: {
        p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 },
        o: { a: 1, k: [
          { t: f,    s: [0],  e: [85], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
          { t: f+7,  s: [85], e: [0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
          { t: f+14, s: [0] },
        ]},
      },
      shapes: [{
        ty: "gr", nm: "S", hd: false,
        it: [
          { ty: "el", nm: "E", p: { a: 0, k: [x, y] }, s: { a: 0, k: [sz, sz] }, hd: false },
          { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: sparkleColor }, r: 1, hd: false },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false },
        ],
      }],
      ip: 0, op: 90, st: 0, bm: 0,
    };
  });

  // Glow layer (LAST = backmost)
  const glowLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Glow", sr: 1,
    ks: {
      p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],  e: [0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 18, s: [0],  e: [14], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 35, s: [14], e: [20], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 60, s: [20], e: [14], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [14] },
      ]},
    },
    shapes: [makeGlow(glowColor)],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // layers[0] = frontmost
  const layers = [
    badgeLayer,
    bagLayer,
    ...sparkleLayers,
    glowLayer,
  ];

  return {
    v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
    nm: `seasonal_black_friday_t${tier}`,
    ddd: 0, assets: [],
    layers,
  };
}

// ── Tier configs ──────────────────────────────────────────────────────────────
// Black Friday theme: dark bag body, tier-colored badge
const TIERS = [
  {
    tier: 1, suffix: "",
    bagColor:     [0.55, 0.28, 0.75, 1],  // roxo vibrante
    badgeColor:   [0.72, 0.45, 0.20, 1],  // bronze badge
    checkColor:   [1.00, 1.00, 1.00, 1],
    glowColor:    [0.72, 0.45, 0.20, 1],
    sparkleColor: [1.00, 0.70, 0.30, 1],
  },
  {
    tier: 2, suffix: "_t2",
    bagColor:     [0.20, 0.45, 0.88, 1],  // azul vibrante
    badgeColor:   [0.60, 0.62, 0.68, 1],  // silver badge
    checkColor:   [1.00, 1.00, 1.00, 1],
    glowColor:    [0.60, 0.62, 0.75, 1],
    sparkleColor: [0.85, 0.85, 1.00, 1],
  },
  {
    tier: 3, suffix: "_t3",
    bagColor:     [0.85, 0.18, 0.18, 1],  // vermelho vibrante
    badgeColor:   [0.85, 0.65, 0.10, 1],  // gold badge
    checkColor:   [1.00, 1.00, 1.00, 1],
    glowColor:    [1.00, 0.80, 0.10, 1],
    sparkleColor: [1.00, 0.90, 0.30, 1],
  },
];

// ── Generate & write ──────────────────────────────────────────────────────────
for (const t of TIERS) {
  const lottie = buildLottie(
    t.bagColor, t.badgeColor, t.checkColor,
    t.glowColor, t.sparkleColor, t.tier
  );
  const fname = `seasonal_black_friday${t.suffix}.json`;
  fs.writeFileSync(path.join(OUT, fname), JSON.stringify(lottie));
  console.log(`✓ ${fname}`);
}
console.log("Done.");
