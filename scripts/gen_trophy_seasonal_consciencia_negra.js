#!/usr/bin/env node
/**
 * gen_trophy_seasonal_consciencia_negra.js
 * Trophy: seasonal_consciencia_negra — "Consciência no Consumo ✊"
 * Source: Twemoji 1f473 person with turban (CC-BY 4.0, viewBox 0 0 36 36)
 * Pele escura em todos os tiers — turbante e roupa variam por tier
 */
const fs = require("fs");
const path = require("path");
const svgpath = require("svgpath");

const OUT = path.join(__dirname, "../assets/lottie/trophies");

// ── Twemoji 1f473 paths (viewBox 0 0 36 36) ──────────────────────────────────
const P_SHIRT   = "M31.99 36v-2c0-3.314-3.685-6-7-6h-14c-3.313 0-7 2.686-7 6v2h28z";
const P_SKIN1   = "M21.906 3.262c-2.02-.653-6.772-.475-7.96 1.069-3.089.059-6.713 2.851-7.188 6.535-.47 3.645.578 5.338.951 8.079.422 3.106 2.168 4.099 3.564 4.515C13.28 26.114 15.415 26 19 26c7 0 10.334-4.684 10.629-12.639.178-4.811-2.645-8.456-7.723-10.099z";
const P_NECK    = "M15 24v4c0 1.657 1.343 3 3 3s3-1.343 3-3v-4h-6z";
const P_CHIN    = "M14.519 26.997c1.058 1.207 2.049 1.51 3.477 1.51 1.426 0 2.426-.304 3.485-1.51v-3.515H14.52v3.515z";
const P_FACE    = "M25.909 13.701c-.677-.938-1.544-1.693-3.445-1.96.713.327 1.396 1.455 1.485 2.079.089.624.178 1.129-.386.505-2.261-2.499-4.723-1.515-7.163-3.041-1.704-1.066-2.223-2.246-2.223-2.246s-.208 1.574-2.792 3.178c-.749.465-1.643 1.5-2.139 3.03C8.889 16.345 9 17.325 9 19c0 4.889 4.029 9 9 9s9-4.147 9-9c0-3.041-.319-4.229-1.091-5.299z";
const P_MOUTH   = "M22 24h-8s1 2 4 2 4-2 4-2zm-3-2.5h-2c-.276 0-.5-.224-.5-.5s.224-.5.5-.5h2c.276 0 .5.224.5.5s-.224.5-.5.5z";
const P_EYES    = "M14 18c-.552 0-1-.448-1-1v-1c0-.552.448-1 1-1s1 .448 1 1v1c0 .552-.448 1-1 1zm8 0c-.552 0-1-.448-1-1v-1c0-.552.448-1 1-1s1 .448 1 1v1c0 .552-.448 1-1 1z";
const P_TURBAN_DETAIL = "M26.697 15.571c-.248-1.197-.888-3.323-2.333-5.057S20.132 6.2 16.375 7.253s-4.397 4.768-3.22 5.966c.787.8 6.069-.092 9.516 1.445 2.037.907 4.026.907 4.026.907z";
const P_TURBAN_MAIN   = "M18.295 9.73s9.543 2.516 11.006 7.046c.638-1.383 1.008-4.409 1.008-6.118 0-5.197-4.005-8.962-10.512-8.962h-3.003c-5.506 0-10.512 3.765-10.512 8.962 0 1.708.37 4.96 1.007 6.342 1.463-4.532 11.006-7.27 11.006-7.27z";
const P_TURBAN_SHADE  = "M26.636 9.045c.919-.123 1.836-.207 2.749-.207.271 0 .508-.123.679-.311-.137-.535-.329-1.05-.568-1.542-.038-.005-.072-.022-.111-.022-3.784 0-7.613.961-11.383 2.854.186-.057.294-.087.294-.087s1.088.287 2.585.84c.87-.351 1.741-.631 2.612-.876.02.008.034.025.055.032 2.224.752 4.652 2.241 6.505 3.959.112-.787.188-1.578.226-2.274-1.127-.912-2.374-1.708-3.643-2.366zM6.437 12.948c2.679-1.943 11.569-7.771 21.813-7.852-.579-.677-1.257-1.281-2.015-1.796-8.951.674-16.605 5.197-19.946 7.475.013.616.061 1.371.148 2.173zm.095-4.434C9.839 6.366 16.13 3.25 23.125 2.016c-1.061-.319-2.182-.319-3.328-.319h-2.355C13.805 3.13 10.564 4.21 8.068 5.605c-.715.918-1.247 1.779-1.536 2.909z";
const P_TURBAN_ACCENT = "M24.99 28h-2.607c-3.719 1.618-7.837 4.462-11.434 8h2.174c5.032-4.63 10.088-7.141 13.512-7.785-.547-.136-1.101-.215-1.645-.215z";

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

// ── Build Lottie ──────────────────────────────────────────────────────────────
// Pessoa: CX=18, CY=18, SC=4.8, TX=100, TY=105
function buildLottie(
  shirtColor,
  turbanMainColor, turbanShadeColor, turbanAccentColor, turbanDetailColor,
  glowColor, sparkColor, tier
) {
  _id = 1;

  // Cores fixas de pele escura — iguais em todos os tiers
  const SKIN_DARK    = [0.18, 0.10, 0.05, 1];
  const SKIN_MID     = [0.22, 0.13, 0.07, 1];
  const SKIN_LIGHT   = [0.28, 0.16, 0.09, 1];
  const MOUTH_COLOR  = [0.55, 0.20, 0.15, 1];
  const EYES_COLOR   = [0.08, 0.04, 0.02, 1];

  const SC = 4.8, TX = 100, TY = 105;
  const p = (d) => parsePath(d, 18, 18, SC, TX, TY);

  const personLayer = {
    ddd: 0, ind: nid(), ty: 4, nm: "Person", sr: 1,
    ks: {
      p: { a: 1, k: [
        { t: 0,  s: [0, 55, 0], e: [0, 0, 0],  i: { x: [0.2], y: [1.0] }, o: { x: [0.8], y: [0.0] } },
        { t: 18, s: [0, 0, 0],  e: [0, 5, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 26, s: [0, 5, 0],  e: [0, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        // float suave
        { t: 50, s: [0, 0, 0],  e: [0, -4, 0], i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
        { t: 70, s: [0, -4, 0], e: [0, 0, 0],  i: { x: [0.5], y: [1.0] }, o: { x: [0.5], y: [0.0] } },
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
      // frontmost → backmost
      makeFill(p(P_EYES),          EYES_COLOR,        "Eyes"),
      makeFill(p(P_MOUTH),         MOUTH_COLOR,       "Mouth"),
      makeFill(p(P_TURBAN_ACCENT), turbanAccentColor, "TurbanAccent"),
      makeFill(p(P_TURBAN_SHADE),  turbanShadeColor,  "TurbanShade"),
      makeFill(p(P_TURBAN_MAIN),   turbanMainColor,   "TurbanMain"),
      makeFill(p(P_TURBAN_DETAIL), turbanDetailColor, "TurbanDetail"),
      makeFill(p(P_FACE),          SKIN_MID,          "Face"),
      makeFill(p(P_CHIN),          SKIN_LIGHT,        "Chin"),
      makeFill(p(P_NECK),          SKIN_MID,          "Neck"),
      makeFill(p(P_SKIN1),         SKIN_DARK,         "Skin"),
      makeFill(p(P_SHIRT),         shirtColor,        "Shirt"),
    ],
    ip: 0, op: 90, st: 0, bm: 0,
  };

  // Sparkles
  const sparkDefs = [
    { x: 52,  y: 42, sz: 5 },
    { x: 150, y: 38, sz: 4 },
    { x: 40,  y: 95, sz: 4 },
    { x: 160, y: 88, sz: 3 },
    { x: 100, y: 26, sz: 5 },
  ];
  const sparkleLayers = sparkDefs.map(({ x, y, sz }, idx) => {
    const f = 28 + idx * 9;
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
        { t: 20, s: [0],  e: [16], i: { x: [0.3], y: [1.0] }, o: { x: [0.7], y: [0.0] } },
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

  const layers = [personLayer, ...sparkleLayers, glowLayer];

  return {
    v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
    nm: `seasonal_consciencia_negra_t${tier}`,
    ddd: 0, assets: [], layers,
  };
}

// ── Tier configs ──────────────────────────────────────────────────────────────
// Pele escura fixa — turbante e roupa variam
const TIERS = [
  {
    tier: 1, suffix: "",
    shirtColor:        [0.12, 0.45, 0.18, 1],  // verde pan-africano
    turbanMainColor:   [0.85, 0.48, 0.15, 1],  // terracota/cobre
    turbanShadeColor:  [0.65, 0.32, 0.08, 1],  // sombra terracota
    turbanAccentColor: [1.00, 0.72, 0.20, 1],  // dourado quente
    turbanDetailColor: [0.72, 0.38, 0.10, 1],  // detalhe bronze
    glowColor:         [0.85, 0.48, 0.15, 1],
    sparkColor:        [1.00, 0.75, 0.30, 1],
  },
  {
    tier: 2, suffix: "_t2",
    shirtColor:        [0.20, 0.20, 0.55, 1],  // azul royal
    turbanMainColor:   [0.72, 0.75, 0.82, 1],  // prata azulada
    turbanShadeColor:  [0.50, 0.53, 0.62, 1],  // sombra prata
    turbanAccentColor: [0.88, 0.90, 1.00, 1],  // prata claro
    turbanDetailColor: [0.60, 0.63, 0.72, 1],
    glowColor:         [0.60, 0.65, 0.90, 1],
    sparkColor:        [0.85, 0.88, 1.00, 1],
  },
  {
    tier: 3, suffix: "_t3",
    shirtColor:        [0.70, 0.12, 0.12, 1],  // vermelho pan-africano
    turbanMainColor:   [0.90, 0.72, 0.10, 1],  // ouro rico
    turbanShadeColor:  [0.65, 0.48, 0.05, 1],  // sombra ouro
    turbanAccentColor: [1.00, 0.92, 0.40, 1],  // ouro claro
    turbanDetailColor: [0.78, 0.58, 0.08, 1],
    glowColor:         [1.00, 0.80, 0.10, 1],
    sparkColor:        [1.00, 0.92, 0.35, 1],
  },
];

// ── Generate & write ──────────────────────────────────────────────────────────
for (const t of TIERS) {
  const lottie = buildLottie(
    t.shirtColor,
    t.turbanMainColor, t.turbanShadeColor,
    t.turbanAccentColor, t.turbanDetailColor,
    t.glowColor, t.sparkColor, t.tier
  );
  const fname = `seasonal_consciencia_negra${t.suffix}.json`;
  fs.writeFileSync(path.join(OUT, fname), JSON.stringify(lottie));
  console.log(`✓ ${fname}`);
}
console.log("Done.");
