#!/usr/bin/env node
/**
 * gen_trophy_seasonal_natal.js
 * Trophy: seasonal_natal — "Natal sem Dívidas 🎅"
 * Source: Twemoji Santa Claus 1f385.svg (CC-BY 4.0, viewBox 0 0 36 36)
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const OUT = path.join(__dirname, "../assets/lottie/trophies");

// ── Twemoji Santa paths ───────────────────────────────────────────────────────
const P_EAR_L   = "M5 21c0 2.209-1.119 4-2.5 4S0 23.209 0 21s1.119-4 2.5-4S5 18.791 5 21z";
const P_FACE    = "M3 18.562C3 10.037 8.373 3.125 15 3.125s12 6.912 12 15.438C27 27.088 21.627 34 15 34S3 27.088 3 18.562z";
const P_HAT     = "M20 0c-.249 0-.478.007-.713.012C19.19.01 19.097 0 19 0 9 0 2 4.582 2 9s6.373 4 13 4c4.442 0 7.648 0 9.966-.086L25 13l6 15h2s.343-3.055 1-7c1-6 .533-21-14-21z";
const P_EAR_R   = "M30 21c0 2.209-1.119 4-2.5 4S25 23.209 25 21s1.119-4 2.5-4 2.5 1.791 2.5 4z";
const P_EYES    = "M10 21c-.552 0-1-.447-1-1v-2c0-.552.448-1 1-1s1 .448 1 1v2c0 .553-.448 1-1 1zm10 0c-.553 0-1-.447-1-1v-2c0-.552.447-1 1-1s1 .448 1 1v2c0 .553-.447 1-1 1z";
const P_NOSE    = "M16 26h-2c-.552 0-1-.447-1-1s.448-1 1-1h2c.552 0 1 .447 1 1s-.448 1-1 1z";
const P_BEARD   = "M27 25c0-2-2.293-.707-3 0-1 1-3 3-5 2-2.828-1.414-4-1-4-1s-1.171-.414-4 1c-2 1-4-1-5-2-.707-.707-3-2-3 0s1 2 1 2c-1 2 1 3 1 3 0 3 3 3 3 3 0 3 4 2 4 2 1 1 3 1 3 1s2 0 3-1c0 0 4 1 4-2 0 0 3 0 3-3 0 0 2-1 1-3 0 0 1 0 1-2z";
const P_SMILE   = "M15 28c7 0 4 2 0 2s-7-2 0-2z";
// Hat brim band (rect-like)
const P_BRIM    = "M29 12c0 1.104-.896 2-2 2H2c-1.104 0-2-.896-2-2v-1c0-1.104.896-2 2-2h25c1.104 0 2 .896 2 2v1z";

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

// Ellipse helper (orelha shadow, pompom)
function makeEllipse(cx, cy, rx, ry, color, name) {
  return {
    ty: "gr", nm: name, hd: false,
    it: [
      { ty: "el", nm: "E", p: { a: 0, k: [cx, cy] }, s: { a: 0, k: [rx*2, ry*2] }, hd: false },
      { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: color }, r: 1, hd: false },
      { ty: "tr", p: { a: 0, k: [0,0] }, a: { a: 0, k: [0,0] },
        s: { a: 0, k: [100,100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }
    ]
  };
}

function buildLottie(hatColor, brimColor, pompomColor, glowColor, sparkColor, tier) {
  _id = 1;

  // Santa: CX=15, CY=18, SC=4.8, TX=100, TY=105
  const SC = 3.5, CX = 15, CY = 18, TX = 100, TY = 108;
  const p = (d) => parsePath(d, CX, CY, SC, TX, TY);

  // Scale factor for ellipses/circles
  const ex = (x) => (x - CX) * SC + TX;
  const ey = (y) => (y - CY) * SC + TY;
  const er = (r) => r * SC;

  const santaLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Santa", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, -55, 0], e: [0, 0, 0],  i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 16, s: [0, 0, 0],   e: [0, 5, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 24, s: [0, 5, 0],   e: [0, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        // gentle sway
        { t: 45, s: [0, 0, 0],   e: [-4, 0, 0], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 60, s: [-4, 0, 0],  e: [4, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 75, s: [4, 0, 0],   e: [0, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [0, 0, 0] },
      ]},
      a: { a: 0, k: [0,0,0] }, s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],   e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 10, s: [100], e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100] },
      ]},
    },
    shapes: [
      // frontmost → backmost
      makeEllipse(ex(32), ey(29), er(4), er(4), pompomColor, "Pompom"),
      makeFill(p(P_BRIM),  brimColor,             "Brim"),
      makeFill(p(P_SMILE), [1.00, 0.86, 0.36, 1], "Smile"),
      makeFill(p(P_BEARD), brimColor,              "Beard"),
      makeFill(p(P_NOSE),  [0.72, 0.46, 0.37, 1], "Nose"),
      makeFill(p(P_EYES),  [0.40, 0.13, 0.07, 1], "Eyes"),
      makeEllipse(ex(26), ey(14), er(2), er(4), [0.82, 0.83, 0.84, 1], "EarShadowR"),
      makeEllipse(ex(3),  ey(14), er(2), er(4), [0.82, 0.83, 0.84, 1], "EarShadowL"),
      makeFill(p(P_EAR_R), [1.00, 0.86, 0.36, 1], "EarR"),
      makeFill(p(P_EAR_L), [1.00, 0.86, 0.36, 1], "EarL"),
      makeFill(p(P_HAT),   hatColor,               "Hat"),
      makeFill(p(P_FACE),  [1.00, 0.86, 0.36, 1], "Face"),
    ],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Sparkles
  const sparkDefs = [
    { x: 52,  y: 40, sz: 5 },
    { x: 150, y: 36, sz: 4 },
    { x: 40,  y: 98, sz: 4 },
    { x: 162, y: 90, sz: 3 },
    { x: 100, y: 28, sz: 5 },
  ];
  const sparkleLayers = sparkDefs.map(({ x, y, sz }, idx) => {
    const f = 26 + idx * 9;
    return {
      ddd: 0, ind: nid(), ty: 4, nm: `Sp${idx}`, sr: 1,
      ks: {
        p: { a: 0, k: [0,0,0] }, a: { a: 0, k: [0,0,0] },
        s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
        o: { a: 1, k: [
          { t: f,    s: [0],  e: [85], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
          { t: f+6,  s: [85], e: [0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
          { t: f+12, s: [0] },
        ]},
      },
      shapes: [{
        ty: "gr", nm: "S", hd: false,
        it: [
          { ty: "el", nm: "E", p: { a: 0, k: [x,y] }, s: { a: 0, k: [sz,sz] }, hd: false },
          { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: sparkColor }, r: 1, hd: false },
          { ty: "tr", p: { a: 0, k: [0,0] }, a: { a: 0, k: [0,0] },
            s: { a: 0, k: [100,100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false },
        ],
      }],
      ip: 0, op: 90, st: 0, bm: 0,
    };
  });

  // Glow
  const glowLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Glow", sr: 1,
    ks: {
      p: { a: 0, k: [0,0,0] }, a: { a: 0, k: [0,0,0] },
      s: { a: 0, k: [100,100,100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],  e: [0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 18, s: [0],  e: [16], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 89, s: [16] },
      ]},
    },
    shapes: [{
      ty: "gr", nm: "Glow", hd: false,
      it: [
        { ty: "el", nm: "E", p: { a: 0, k: [100,105] }, s: { a: 0, k: [175,175] }, hd: false },
        { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: glowColor }, r: 1, hd: false },
        { ty: "tr", p: { a: 0, k: [0,0] }, a: { a: 0, k: [0,0] },
          s: { a: 0, k: [100,100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false },
      ],
    }],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  const layers = [santaLayer, ...sparkleLayers, glowLayer];

  return {
    v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
    nm: `seasonal_natal_t${tier}`,
    ddd: 0, assets: [], layers,
  };
}

// ── Tier configs ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    tier: 1, suffix: "",
    hatColor:    [0.87, 0.18, 0.27, 1],  // vermelho natal
    brimColor:   [0.95, 0.95, 0.97, 1],  // branco
    pompomColor: [0.95, 0.95, 0.97, 1],
    glowColor:   [0.87, 0.18, 0.27, 1],
    sparkColor:  [1.00, 0.85, 0.30, 1],
  },
  {
    tier: 2, suffix: "_t2",
    hatColor:    [0.72, 0.15, 0.22, 1],  // vermelho mais escuro
    brimColor:   [0.90, 0.92, 0.96, 1],
    pompomColor: [0.78, 0.80, 0.88, 1],  // prata
    glowColor:   [0.60, 0.62, 0.75, 1],
    sparkColor:  [0.85, 0.87, 1.00, 1],
  },
  {
    tier: 3, suffix: "_t3",
    hatColor:    [0.70, 0.10, 0.18, 1],  // vermelho profundo
    brimColor:   [1.00, 0.97, 0.88, 1],  // marfim
    pompomColor: [0.95, 0.78, 0.20, 1],  // ouro
    glowColor:   [1.00, 0.80, 0.10, 1],
    sparkColor:  [1.00, 0.92, 0.35, 1],
  },
];

for (const t of TIERS) {
  const lottie = buildLottie(t.hatColor, t.brimColor, t.pompomColor, t.glowColor, t.sparkColor, t.tier);
  const fname = `seasonal_natal${t.suffix}.json`;
  fs.writeFileSync(path.join(OUT, fname), JSON.stringify(lottie));
  console.log(`✓ ${fname}`);
}
console.log("Done.");
