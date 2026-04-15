#!/usr/bin/env node
/**
 * gen_trophy_seasonal_halloween.js
 * Trophy: seasonal_halloween — "Susto no Orçamento? Não! 🎃"
 * Icons: Tabler filled ghost + circle-x (MIT, viewBox 0 0 24 24)
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const OUT = path.join(__dirname, "../assets/lottie/trophies");

// ── SVG paths (Tabler filled, viewBox 0 0 24 24) ─────────────────────────────

// Ghost (filled) — ghost-filled.svg Tabler MIT — body + smile + 2 eyes
const GHOST_D = "M12 3a8 8 0 0 1 7.996 7.75l.004 .25l-.001 6.954l.01 .103a2.78 2.78 0 0 1 -1.468 2.618l-.163 .08c-1.053 .475 -2.283 .248 -3.129 -.593l-.137 -.146a.65 .65 0 0 0 -1.024 0a2.65 2.65 0 0 1 -4.176 0a.65 .65 0 0 0 -.512 -.25c-.2 0 -.389 .092 -.55 .296a2.78 2.78 0 0 1 -4.859 -2.005l.008 -.091l.001 -6.966l.004 -.25a8 8 0 0 1 7.996 -7.75zm2.82 10.429a1 1 0 0 0 -1.391 -.25a2.5 2.5 0 0 1 -2.858 0a1 1 0 0 0 -1.142 1.642a4.5 4.5 0 0 0 5.142 0a1 1 0 0 0 .25 -1.392zm-4.81 -4.429l-.127 .007a1 1 0 0 0 .117 1.993l.127 -.007a1 1 0 0 0 -.117 -1.993zm4 0l-.127 .007a1 1 0 0 0 .117 1.993l.127 -.007a1 1 0 0 0 -.117 -1.993z";

// Circle-X (filled)
const CX_D = "M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-6.489 5.8a1 1 0 0 0 -1.218 1.567l1.292 1.293l-1.292 1.293l-.083 .094a1 1 0 0 0 1.497 1.32l1.293 -1.292l1.293 1.292l.094 .083a1 1 0 0 0 1.32 -1.497l-1.292 -1.293l1.292 -1.293l.083 -.094a1 1 0 0 0 -1.497 -1.32l-1.293 1.292l-1.293 -1.292l-.094 -.083z";

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
      if (!isNum(t)) {
        prevCmd = lastCmd; lastCmd = t; i++;
      }
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
        } else {
          x1 = cx2; y1 = cy2;
        }
        if (verts.length > 0) {
          const lv = verts[verts.length - 1];
          out[out.length - 1] = [x1 - lv[0], y1 - lv[1]];
        }
        verts.push([x, y]); inn.push([x2 - x, y2 - y]); out.push([0, 0]);
        cx2 = x; cy2 = y;
        prevCmd = lastCmd; lastCmd = cmd;
      } else if (cmd === 'Z') {
        closed = true; break;
      } else {
        i++;
      }
    }
    if (verts.length < 2) continue;
    shapes.push({ v: verts, i: inn, o: out, c: closed });
  }
  return shapes;
}

// ── Lottie helpers ────────────────────────────────────────────────────────────
let _id = 1;
const nid = () => _id++;

function makeShape(shapes, color, name) {
  const mergedPaths = shapes.map((s, idx) => ({
    ty: "sh", nm: `path_${idx}`, ind: idx,
    ks: { a: 0, k: { v: s.v, i: s.i, o: s.o, c: s.c } },
    hd: false
  }));
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      ...mergedPaths,
      { ty: "fl", nm: "Fill", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

function makeGlow(color) {
  return {
    ty: "gr", nm: "Glow", hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [100, 105] }, s: { a: 0, k: [160, 160] }, hd: false },
      { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

function makeSparkle(x, y, color, startFrame, size) {
  return {
    ty: "gr", nm: `Spark_${x}`, hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [x, y] }, s: { a: 0, k: [size, size] }, hd: false },
      { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

// ── Build layers ──────────────────────────────────────────────────────────────

// Ghost shapes: CX=12, CY=12, SC=4.0, TX=100, TY=88
// Sub-paths after abs(): [0]=body, [1]=smile, [2]=eyeL, [3]=eyeR
function buildGhostShapes(ghostColor, faceColor) {
  const dAbs = svgpath(GHOST_D).translate(-12, -12).scale(4.0).translate(100, 88).abs().unarc().round(3).toString();
  const subPaths = dAbs.split(/(?=M)/).filter(Boolean);

  const body  = subPaths[0] ? svgToLottie(subPaths[0], 0, 0, 1, 0, 0) : [];
  const smile = subPaths[1] ? svgToLottie(subPaths[1], 0, 0, 1, 0, 0) : [];
  const eyeL  = subPaths[2] ? svgToLottie(subPaths[2], 0, 0, 1, 0, 0) : [];
  const eyeR  = subPaths[3] ? svgToLottie(subPaths[3], 0, 0, 1, 0, 0) : [];

  // shapes[0] = frontmost — face elements must come before body
  const layers = [];
  if (eyeR.length)  layers.push(makeShape(eyeR,  faceColor,  "EyeR"));
  if (eyeL.length)  layers.push(makeShape(eyeL,  faceColor,  "EyeL"));
  if (smile.length) layers.push(makeShape(smile, faceColor,  "Smile"));
  if (body.length)  layers.push(makeShape(body,  ghostColor, "Body"));
  return layers;
}

// Circle-X badge: bottom-right, CX=12, CY=12, SC=2.2, TX=133, TY=128
function buildBadgeShapes(badgeColor, xColor) {
  const dAbs = svgpath(CX_D).translate(-12, -12).scale(2.2).translate(133, 128).abs().unarc().round(3).toString();
  const subPaths = dAbs.split(/(?=M)/).filter(Boolean);

  const circle = subPaths[0] ? svgToLottie(subPaths[0], 0, 0, 1, 0, 0) : [];
  const xmark  = subPaths[1] ? svgToLottie(subPaths[1], 0, 0, 1, 0, 0) : [];

  const layers = [];
  if (circle.length) layers.push(makeShape(circle, badgeColor, "Circle"));
  if (xmark.length)  layers.push(makeShape(xmark, xColor, "XMark"));
  return layers;
}

function buildLottie(ghostColor, faceColor, badgeColor, xColor, glowColor, sparkleColor, tier) {
  _id = 1;
  const ghostShapes = buildGhostShapes(ghostColor, faceColor);
  const badgeShapes = buildBadgeShapes(badgeColor, xColor);

  // Ghost layer: entry bounce (offset from shape position), float + sway
  // Shapes already at absolute coords ~(100,88), so p uses relative offset [0, deltaY]
  const ghostLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Ghost", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, 60, 0],  e: [0, 0, 0],   i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 18, s: [0, 0, 0],   e: [0, 5, 0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 45, s: [0, 5, 0],   e: [0, -6, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 67, s: [0, -6, 0],  e: [0, 5, 0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 5, 0],   e: [0, 0, 0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
      ]},
      r: { a: 1, k: [
        { t: 0,  s: [0],   e: [-5],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 30, s: [-5],  e: [5],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 60, s: [5],   e: [-5],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [-5],  e: [0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
      ]},
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
      o: { a: 1, k: [
        { t: 0, s: [0], e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 12, s: [100], e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100] }
      ]},
    },
    shapes: ghostShapes,
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Badge layer: pops in at frame 20 with scale bounce
  const badgeLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Badge", sr: 1,
    ks: {
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { t: 0,  s: [0, 0, 100],   e: [0, 0, 100],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 20, s: [0, 0, 100],   e: [120, 120, 100], i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 27, s: [120, 120, 100], e: [100, 100, 100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 33, s: [100, 100, 100] }
      ]},
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
    },
    shapes: badgeShapes,
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Sparkles
  const sparkles = [
    { x: 55, y: 50, sz: 5, f: 25 },
    { x: 150, y: 42, sz: 4, f: 32 },
    { x: 165, y: 85, sz: 6, f: 38 },
    { x: 42, y: 105, sz: 4, f: 45 },
    { x: 158, y: 135, sz: 5, f: 28 },
  ];
  const sparkleLayers = sparkles.map(({ x, y, sz, f }) => ({
    ddd: 0, ind: nid(), ty: 4, nm: `Sp_${x}`, sr: 1,
    ks: {
      p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: f,    s: [0],   e: [80],  i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: f+8,  s: [80],  e: [0],   i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: f+16, s: [0] }
      ]},
    },
    shapes: [makeSparkle(x, y, sparkleColor, f, sz)],
    ip: 0, op: 90, st: 0, bm: 0,
  }));

  // Glow layer (LAST = backmost)
  const glowLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Glow", sr: 1,
    ks: {
      p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],  e: [0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 17, s: [0],  e: [15], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 30, s: [15], e: [20], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 55, s: [20], e: [14], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [14] }
      ]},
    },
    shapes: [makeGlow(glowColor)],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // layers array: first = frontmost
  const layers = [
    badgeLayer,
    ghostLayer,
    ...sparkleLayers,
    glowLayer, // backmost
  ];

  return {
    v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
    nm: `seasonal_halloween_t${tier}`,
    ddd: 0, assets: [],
    layers,
  };
}

// ── Tier configs ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    tier: 1, suffix: "",
    ghostColor:  [0.95, 0.95, 0.98, 1],   // off-white ghost
    faceColor:   [0.15, 0.08, 0.05, 1],   // dark brown face
    badgeColor:  [0.72, 0.45, 0.20, 1],   // bronze/copper badge
    xColor:      [1.00, 1.00, 1.00, 1],   // white X
    glowColor:   [0.72, 0.45, 0.20, 1],   // bronze glow
    sparkleColor:[1.00, 0.70, 0.30, 1],   // orange sparkles
  },
  {
    tier: 2, suffix: "_t2",
    ghostColor:  [0.92, 0.92, 0.95, 1],   // silver-ish ghost
    faceColor:   [0.10, 0.10, 0.18, 1],   // dark face
    badgeColor:  [0.60, 0.62, 0.68, 1],   // silver badge
    xColor:      [1.00, 1.00, 1.00, 1],
    glowColor:   [0.60, 0.62, 0.75, 1],   // silver glow
    sparkleColor:[0.85, 0.85, 1.00, 1],   // silver sparkles
  },
  {
    tier: 3, suffix: "_t3",
    ghostColor:  [1.00, 0.98, 0.90, 1],   // warm white ghost
    faceColor:   [0.18, 0.10, 0.00, 1],   // dark face
    badgeColor:  [0.85, 0.65, 0.10, 1],   // gold badge
    xColor:      [1.00, 1.00, 1.00, 1],
    glowColor:   [1.00, 0.80, 0.10, 1],   // gold glow
    sparkleColor:[1.00, 0.90, 0.30, 1],   // gold sparkles
  },
];

// ── Generate & write ──────────────────────────────────────────────────────────
for (const t of TIERS) {
  const lottie = buildLottie(
    t.ghostColor, t.faceColor,
    t.badgeColor, t.xColor,
    t.glowColor,  t.sparkleColor,
    t.tier
  );
  const fname = `seasonal_halloween${t.suffix}.json`;
  fs.writeFileSync(path.join(OUT, fname), JSON.stringify(lottie));
  console.log(`✓ ${fname}`);
}
console.log("Done.");
