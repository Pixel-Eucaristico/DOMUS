#!/usr/bin/env node
/**
 * gen_trophy_seasonal_decimo_terceiro.js
 * Trophy: seasonal_decimo_terceiro — "13º Bem Aplicado 💵"
 * Sources: Tabler filled cash + pig (MIT, viewBox 0 0 24 24)
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const OUT = path.join(__dirname, "../assets/lottie/trophies");

// Tabler filled cash (nota de dinheiro)
const CASH_D =
  "M19 5a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-14a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3zm-7 4a3 3 0 0 0 -2.996 2.85l-.004 .15a3 3 0 1 0 3 -3m6.01 2h-.01a1 1 0 0 0 0 2h.01a1 1 0 0 0 0 -2m-12 0h-.01a1 1 0 1 0 .01 2a1 1 0 0 0 0 -2";

// Tabler filled pig (cofre porquinho)
const PIG_D =
  "M15.999 2a1 1 0 0 1 1.001 1v3.255l.026 .018a7 7 0 0 1 2.204 2.537l.092 .19h.676a2 2 0 0 1 1.995 1.85l.005 .15v2a2 2 0 0 1 -2 2h-.676l-.104 .213a7 7 0 0 1 -1.097 1.558l-.123 .125v1.604a2.5 2.5 0 0 1 -2.336 2.495l-.162 .005c-1.16 0 -2.135 -.79 -2.418 -1.86l-.032 -.141l-4.05 .001l-.05 -.002l-.032 .141a2.5 2.5 0 0 1 -2.254 1.856l-.164 .005a2.5 2.5 0 0 1 -2.5 -2.5v-1.602l-.056 -.055a7 7 0 0 1 -1.576 -7.085l.092 -.256a7 7 0 0 1 6.539 -4.502h2.196l4.25 -2.832a1 1 0 0 1 .436 -.161zm-.999 8a1 1 0 0 0 -.993 .883l-.007 .127a1 1 0 0 0 1.993 .117l.007 -.127a1 1 0 0 0 -1 -1";

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

function buildLottie(noteColor, noteDetail, pigColor, glowColor, sparkColor, tier) {
  _id = 1;

  // Nota: CX=12, CY=12, SC=7.0, TX=100, TY=100
  const noteShapes = parsePath(CASH_D, 12, 12, 7.0, 100, 100);
  // Sub-paths: [0]=nota body, [1]=círculo central (moeda), [2]=pontinho dir, [3]=pontinho esq
  const noteBody   = noteShapes.slice(0, 1);
  const noteCircle = noteShapes.slice(1, 2);
  const noteDots   = noteShapes.slice(2);

  // Porquinho badge: CX=12, CY=12, SC=2.2, TX=130, TY=128
  const pigShapes = parsePath(PIG_D, 12, 12, 2.2, 130, 128);

  // Nota — entra com flip horizontal (escala X de 0→1)
  const noteLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Note", sr: 1,
    ks: {
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { t: 0,  s: [0, 100, 100],    e: [110, 100, 100], i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 16, s: [110, 100, 100],  e: [100, 100, 100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 22, s: [100, 100, 100] },
        // flutuação
        { t: 45, s: [100, 100, 100],  e: [100, 96, 100],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 60, s: [100, 96, 100],   e: [100, 104, 100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 75, s: [100, 104, 100],  e: [100, 100, 100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100, 100, 100] },
      ]},
      r: { a: 0, k: 0 },
      o: { a: 1, k: [
        { t: 0,  s: [0],   e: [100], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
        { t: 10, s: [100], e: [100], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 89, s: [100] },
      ]},
    },
    shapes: [
      makeFill(noteDots,   noteColor,  "Dots"),
      makeFill(noteCircle, noteDetail, "Circle"),
      makeFill(noteBody,   noteColor,  "Body"),
    ],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Porquinho badge — pop in frame 20
  const pigLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Pig", sr: 1,
    ks: {
      p: { a: 0, k: [0,0,0] }, a: { a: 0, k: [0,0,0] },
      s: { a: 1, k: [
        { t: 0,  s: [0,0,100],      e: [0,0,100],      i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 20, s: [0,0,100],      e: [130,130,100],  i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 27, s: [130,130,100],  e: [100,100,100],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 33, s: [100,100,100] },
      ]},
      r: { a: 0, k: 0 }, o: { a: 0, k: 100 },
    },
    shapes: [makeFill(pigShapes, pigColor, "Pig")],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Sparkles
  const sparkDefs = [
    { x: 52,  y: 42, sz: 5 },
    { x: 150, y: 38, sz: 4 },
    { x: 40,  y: 100, sz: 4 },
    { x: 162, y: 92,  sz: 3 },
    { x: 100, y: 28,  sz: 5 },
  ];
  const sparkleLayers = sparkDefs.map(({ x, y, sz }, idx) => {
    const f = 24 + idx * 9;
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
        { ty: "el", nm: "E", p: { a: 0, k: [100,100] }, s: { a: 0, k: [175,175] }, hd: false },
        { ty: "fl", nm: "F", o: { a: 0, k: 100 }, c: { a: 0, k: glowColor }, r: 1, hd: false },
        { ty: "tr", p: { a: 0, k: [0,0] }, a: { a: 0, k: [0,0] },
          s: { a: 0, k: [100,100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false },
      ],
    }],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  const layers = [pigLayer, noteLayer, ...sparkleLayers, glowLayer];

  return {
    v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
    nm: `seasonal_decimo_terceiro_t${tier}`,
    ddd: 0, assets: [], layers,
  };
}

// ── Tier configs ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    tier: 1, suffix: "",
    noteColor:  [0.15, 0.55, 0.25, 1],  // verde cédula
    noteDetail: [0.10, 0.40, 0.18, 1],  // verde escuro detalhe
    pigColor:   [0.72, 0.45, 0.20, 1],  // bronze
    glowColor:  [0.15, 0.55, 0.25, 1],
    sparkColor: [0.55, 0.88, 0.40, 1],
  },
  {
    tier: 2, suffix: "_t2",
    noteColor:  [0.18, 0.62, 0.30, 1],  // verde mais vivo
    noteDetail: [0.12, 0.45, 0.20, 1],
    pigColor:   [0.60, 0.62, 0.68, 1],  // prata
    glowColor:  [0.60, 0.62, 0.75, 1],
    sparkColor: [0.70, 0.95, 0.55, 1],
  },
  {
    tier: 3, suffix: "_t3",
    noteColor:  [0.85, 0.65, 0.10, 1],  // nota dourada
    noteDetail: [0.60, 0.42, 0.05, 1],
    pigColor:   [0.85, 0.65, 0.10, 1],  // ouro
    glowColor:  [1.00, 0.80, 0.10, 1],
    sparkColor: [1.00, 0.92, 0.35, 1],
  },
];

for (const t of TIERS) {
  const lottie = buildLottie(t.noteColor, t.noteDetail, t.pigColor, t.glowColor, t.sparkColor, t.tier);
  const fname = `seasonal_decimo_terceiro${t.suffix}.json`;
  fs.writeFileSync(path.join(OUT, fname), JSON.stringify(lottie));
  console.log(`✓ ${fname}`);
}
console.log("Done.");
