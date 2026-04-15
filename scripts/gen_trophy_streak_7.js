const fs = require('fs');
const path = require('path');
const verts = JSON.parse(fs.readFileSync(path.join(__dirname, 'lottie-verts.json'), 'utf8'));

const OUT = path.join(__dirname, '..', 'assets', 'lottie', 'trophies');
const PREVIEW = path.join(__dirname, '..', '..', 'DOMUS-Rive-Preview', 'public', 'assets', 'lottie', 'trophies');
const io = { i: { x: [.667], y: [1] }, o: { x: [.333], y: [0] } };
const io3 = { i: { x: [.667, .667, .667], y: [1, 1, 1] }, o: { x: [.333, .333, .333], y: [0, 0, 0] } };
const GC = { 1: [.804, .498, .196, 1], 2: [.75, .75, .78, 1], 3: [1, .843, 0, 1], 4: [.31, .765, .969, 1] };
const SC = { 1: [1, .75, .35, 1], 2: [.85, .87, .95, 1], 3: [1, .92, .4, 1], 4: [.7, .9, 1, 1] };
const TIER = {
  // Fogo sempre quente (laranja/vermelho) — tier muda intensidade e extras
  1: { flame: [.8, .35, .1, 1], flameInner: [.9, .55, .15, 1], flameBase: [.5, .15, .05, 1], numColor: [.95, .9, .7, 1], starColor: [.65, .4, .15, 1], aura: null, embers: 2, rays: 0, conf: 2, sp: 1, go: 5, bg: false },
  2: { flame: [.9, .45, .05, 1], flameInner: [1, .7, .15, 1], flameBase: [.6, .18, .05, 1], numColor: [1, .95, .8, 1], starColor: [.75, .75, .78, 1], aura: null, embers: 3, rays: 2, conf: 3, sp: 2, go: 10, bg: false },
  3: { flame: [1, .55, 0, 1], flameInner: [1, .85, .2, 1], flameBase: [.7, .2, .02, 1], numColor: [1, 1, .9, 1], starColor: [1, .843, 0, 1], aura: null, embers: 5, rays: 4, conf: 4, sp: 3, go: 18, bg: true },
  4: { flame: [1, .6, 0, 1], flameInner: [1, .9, .3, 1], flameBase: [.75, .22, .02, 1], numColor: [1, 1, 1, 1], starColor: [1, .843, 0, 1], aura: [.31, .765, .969, .3], embers: 7, rays: 6, conf: 6, sp: 5, go: 25, bg: true },
};

function mf(c, op) { return { ty: "fl", c: { a: 0, k: c }, o: { a: 0, k: op || 100 }, r: 1, bm: 0, nm: "F" }; }
function ms(c, w, op) { return { ty: "st", c: { a: 0, k: c }, o: { a: 0, k: op || 100 }, w: { a: 0, k: w }, lc: 2, lj: 2, bm: 0, nm: "S" }; }

function scaleVerts(src, s) {
  return {
    v: src.v.map(p => [+(p[0] * s).toFixed(2), +(p[1] * s).toFixed(2)]),
    i: src.i.map(p => [+(p[0] * s).toFixed(2), +(p[1] * s).toFixed(2)]),
    o: src.o.map(p => [+(p[0] * s).toFixed(2), +(p[1] * s).toFixed(2)]),
    c: src.c
  };
}

function gen(tier) {
  const t = TIER[tier];
  const L = [];
  const cx = 100, cy = 100;
  const flameScale = { 1: .75, 2: .85, 3: 1, 4: 1.1 }[tier];
  const starScale = { 1: .6, 2: .7, 3: .85, 4: 1 }[tier];
  const fr = tier >= 3 ? 4 : tier === 2 ? 2 : 1;

  const fp = (oy) => [
    { i: { x: .4, y: 1 }, o: { x: .6, y: 0 }, t: 0, s: [cx, 15, 0], to: [0, 14, 0], ti: [0, -14, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 8, s: [cx, cy + oy + 6, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 12, s: [cx, cy + oy - 3, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 16, s: [cx, cy + oy, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [cx, cy + oy - fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [cx, cy + oy + fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { t: 90, s: [cx, cy + oy - fr, 0] }
  ];

  // GLOW
  const gs = { 1: 80, 2: 110, 3: 150, 4: 175 }[tier];
  L.push({ ddd: 0, ind: 100, ty: 4, nm: "Glow", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 0, s: [Math.max(t.go - 5, 2)] }, { ...io, t: 45, s: [t.go + 12] }, { t: 90, s: [Math.max(t.go - 5, 2)] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [cx, cy, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 0, s: [80, 80, 100] }, { ...io3, t: 45, s: [100, 100, 100] }, { t: 90, s: [80, 80, 100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [gs, gs] }, p: { a: 0, k: [0, 0] }, nm: "G" }, mf(GC[tier], t.go)], ip: 0, op: 90, st: 0, bm: 0 });

  // BORDER GLOW
  if (t.bg) {
    L.push({ ddd: 0, ind: 101, ty: 4, nm: "BG", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 30, s: [0] }, { ...io, t: 38, s: [30] }, { ...io, t: 55, s: [15] }, { ...io, t: 70, s: [30] }, { t: 90, s: [15] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(5) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 30, s: [90, 90, 100] }, { ...io3, t: 45, s: [108, 108, 100] }, { ...io3, t: 60, s: [90, 90, 100] }, { ...io3, t: 75, s: [108, 108, 100] }, { t: 90, s: [90, 90, 100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [120, 140] }, p: { a: 0, k: [0, 0] }, nm: "BG" }, ms(GC[tier], 3, 35)], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // RAYS
  for (let i = 0; i < t.rays; i++) {
    const a = (i / t.rays) * Math.PI * 2 - Math.PI / 2;
    const ir = 35 * flameScale, or2 = ir + { 2: 14, 3: 18, 4: 24 }[tier];
    const d = 20 + i * 3;
    L.push({ ddd: 0, ind: 110 + i, ty: 4, nm: "R" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 6, s: [50] }, { ...io, t: d + 18, s: [20] }, { ...io, t: 55 + i * 3, s: [15] }, { ...io, t: 65 + i * 3, s: [40] }, { ...io, t: 75 + i * 3, s: [15] }, { t: 90, s: [15] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(5) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { t: d + 8, s: [100, 100, 100] }] } }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: { v: [[+(Math.cos(a) * ir).toFixed(1), +(Math.sin(a) * ir).toFixed(1)], [+(Math.cos(a) * or2).toFixed(1), +(Math.sin(a) * or2).toFixed(1)]], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], c: false } }, nm: "R" }, ms(t.flame, tier >= 3 ? 2.5 : 2, 60)], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // CHARCOAL BASE (dark oval at bottom)
  L.push({ ddd: 0, ind: 49, ty: 4, nm: "Coal", sr: 1, ks: {
    o: { a: 1, k: [{ ...io, t: 6, s: [0] }, { t: 12, s: [100] }] },
    r: { a: 0, k: 0 }, p: { a: 1, k: fp(22) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 6, s: [0, 0, 100] }, { t: 12, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [
    { ty: "el", d: 1, s: { a: 0, k: [40 * flameScale, 12 * flameScale] }, p: { a: 0, k: [0, 0] }, nm: "C" },
    mf([.2, .1, .05, 1], 80)
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // EMBERS (small dots rising up)
  for (let i = 0; i < t.embers; i++) {
    const startX = cx + (Math.random() - 0.5) * 30 * flameScale;
    const offsetX = (i % 2 === 0 ? 1 : -1) * (5 + i * 3);
    const delay = 18 + i * 7;
    const endDelay = Math.min(delay + 25, 88);
    L.push({ ddd: 0, ind: 150 + i, ty: 4, nm: "Ember" + (i + 1), sr: 1, ks: {
      o: { a: 1, k: [{ ...io, t: delay, s: [0] }, { ...io, t: delay + 3, s: [90] }, { ...io, t: endDelay - 5, s: [60] }, { ...io, t: endDelay, s: [0] }, { t: 90, s: [0] }] },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: delay, s: [startX, cy + 15, 0], to: [offsetX / 6, -8, 0], ti: [-offsetX / 6, 8, 0] },
        { t: endDelay, s: [startX + offsetX, cy - 35 * flameScale, 0] }
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: delay, s: [100, 100, 100] }, { t: endDelay, s: [30, 30, 100] }] }
    }, ao: 0, shapes: [
      { ty: "el", d: 1, s: { a: 0, k: [3, 3] }, p: { a: 0, k: [0, 0] }, nm: "E" },
      mf(t.flameInner, 90)
    ], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // DIAMOND AURA (blue glow behind flame, only tier 4)
  if (t.aura) {
    L.push({ ddd: 0, ind: 102, ty: 4, nm: "Aura", sr: 1, ks: {
      o: { a: 1, k: [{ ...io, t: 20, s: [0] }, { ...io, t: 28, s: [25] }, { ...io, t: 50, s: [15] }, { ...io, t: 70, s: [25] }, { t: 90, s: [15] }] },
      r: { a: 0, k: 0 }, p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 20, s: [80, 80, 100] }, { ...io3, t: 28, s: [110, 115, 100] }, { ...io3, t: 50, s: [105, 110, 100] }, { ...io3, t: 70, s: [112, 118, 100] }, { t: 90, s: [105, 110, 100] }] }
    }, ao: 0, shapes: [
      { ty: "el", d: 1, s: { a: 0, k: [70, 85] }, p: { a: 0, k: [0, -5] }, nm: "A" },
      mf(t.aura, 20)
    ], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // FLAME BASE (darker red at bottom of flame)
  const fvBase = scaleVerts(verts.flame, flameScale * 0.85);
  L.unshift({ ddd: 0, ind: 9, ty: 4, nm: "FlameBase", sr: 1, ks: {
    o: { a: 1, k: [{ ...io, t: 6, s: [0] }, { t: 12, s: [90] }] },
    r: { a: 1, k: [{ ...io, t: 30, s: [3] }, { ...io, t: 45, s: [-3] }, { ...io, t: 60, s: [3] }, { ...io, t: 75, s: [-3] }, { t: 90, s: [3] }] },
    p: { a: 1, k: fp(8) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [
      { ...io3, t: 6, s: [0, 0, 100] }, { t: 14, s: [100, 100, 100] },
      { ...io3, t: 36, s: [100, 100, 100] }, { ...io3, t: 44, s: [102, 96, 100] },
      { ...io3, t: 52, s: [98, 103, 100] }, { ...io3, t: 60, s: [102, 97, 100] },
      { ...io3, t: 68, s: [98, 103, 100] }, { t: 76, s: [100, 100, 100] }
    ] }
  }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: fvBase }, nm: "Fb" }, mf(t.flameBase)], ip: 0, op: 90, st: 0, bm: 0 });

  // FLAME (real SVG) — dances with rotation oscillation
  const fv = scaleVerts(verts.flame, flameScale);
  L.unshift({ ddd: 0, ind: 10, ty: 4, nm: "Flame", sr: 1, ks: {
    o: { a: 0, k: 100 },
    r: { a: 1, k: [{ ...io, t: 0, s: [-8] }, { ...io, t: 5, s: [0] }, { ...io, t: 30, s: [4] }, { ...io, t: 45, s: [-4] }, { ...io, t: 60, s: [4] }, { ...io, t: 75, s: [-4] }, { t: 90, s: [4] }] },
    p: { a: 1, k: fp(5) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [
      { ...io3, t: 0, s: [0, 0, 100] }, { ...io3, t: 8, s: [105, 110, 100] }, { t: 14, s: [100, 100, 100] },
      // Flame "breathing" pulse
      { ...io3, t: 35, s: [100, 100, 100] }, { ...io3, t: 42, s: [97, 105, 100] }, { ...io3, t: 50, s: [103, 98, 100] },
      { ...io3, t: 58, s: [97, 104, 100] }, { ...io3, t: 66, s: [103, 97, 100] },
      { ...io3, t: 74, s: [97, 105, 100] }, { ...io3, t: 82, s: [103, 98, 100] }, { t: 90, s: [100, 100, 100] }
    ] }
  }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: fv }, nm: "Fl" }, ms(t.flame, 1.5, 40), mf(t.flame)], ip: 0, op: 90, st: 0, bm: 0 });

  // FLAME INNER (smaller, lighter color) — same dance
  const fvi = scaleVerts(verts.flame, flameScale * 0.6);
  L.unshift({ ddd: 0, ind: 11, ty: 4, nm: "FlameInner", sr: 1, ks: {
    o: { a: 1, k: [{ ...io, t: 8, s: [0] }, { t: 14, s: [80] }] },
    r: { a: 1, k: [{ ...io, t: 30, s: [-3] }, { ...io, t: 45, s: [3] }, { ...io, t: 60, s: [-3] }, { ...io, t: 75, s: [3] }, { t: 90, s: [-3] }] },
    p: { a: 1, k: fp(10) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [
      { ...io3, t: 8, s: [0, 0, 100] }, { t: 16, s: [100, 100, 100] },
      { ...io3, t: 38, s: [100, 100, 100] }, { ...io3, t: 46, s: [95, 108, 100] },
      { ...io3, t: 54, s: [105, 95, 100] }, { ...io3, t: 62, s: [95, 107, 100] },
      { ...io3, t: 70, s: [104, 95, 100] }, { ...io3, t: 78, s: [96, 106, 100] }, { t: 86, s: [100, 100, 100] }
    ] }
  }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: fvi }, nm: "Fi" }, mf(t.flameInner)], ip: 0, op: 90, st: 0, bm: 0 });

  // NUMBER 7 — simple text-like shape (two lines forming a 7)
  const numS = { 1: .7, 2: .8, 3: 1, 4: 1.1 }[tier];
  const sevenPath = {
    v: [[-6*numS, -8*numS], [6*numS, -8*numS], [0*numS, 8*numS]].map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]),
    i: [[0,0],[0,0],[0,0]], o: [[0,0],[0,0],[0,0]], c: false
  };
  L.unshift({ ddd: 0, ind: 12, ty: 4, nm: "Num7", sr: 1, ks: {
    o: { a: 1, k: [{ ...io, t: 14, s: [0] }, { t: 20, s: [100] }] },
    r: { a: 0, k: 0 }, p: { a: 1, k: fp(8) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 14, s: [0, 0, 100] }, { ...io3, t: 18, s: [120, 120, 100] }, { t: 22, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [
    { ty: "sh", d: 1, ks: { a: 0, k: sevenPath }, nm: "7" },
    ms(t.numColor, 3, 100)
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // STAR at top (real SVG)
  const sv = scaleVerts(verts.star, starScale);
  L.unshift({ ddd: 0, ind: 13, ty: 4, nm: "Star", sr: 1, ks: {
    o: { a: 1, k: [{ ...io, t: 18, s: [0] }, { t: 24, s: [100] }] },
    r: { a: 1, k: [{ ...io, t: 18, s: [-20] }, { ...io, t: 24, s: [0] }, { ...io, t: 60, s: [5] }, { ...io, t: 75, s: [-5] }, { t: 90, s: [5] }] },
    p: { a: 1, k: fp(-28 * flameScale) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 18, s: [0, 0, 100] }, { ...io3, t: 22, s: [130, 130, 100] }, { t: 26, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: sv }, nm: "St" }, mf(t.starColor)], ip: 0, op: 90, st: 0, bm: 0 });

  // CONFETTI
  const cc = [[.9, .3, .1, 1], [1, .843, 0, 1], [.31, .765, .969, 1], [.15, .75, .5, 1], [.85, .15, .2, 1], [.6, .3, .8, 1]];
  for (let i = 0; i < t.conf; i++) {
    const a = (i / t.conf) * Math.PI * 2 + .3;
    const d2 = 35 + (i % 2) * 15;
    const ex = cx + Math.cos(a) * d2, ey = cy + Math.sin(a) * d2;
    L.push({ ddd: 0, ind: 200 + i, ty: 4, nm: "Cf" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 16, s: [0] }, { ...io, t: 18, s: [100] }, { ...io, t: 34, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 16, s: [0] }, { t: 34, s: [180 + i * 60] }] }, p: { a: 1, k: [{ i: { x: .3, y: 1 }, o: { x: .7, y: 0 }, t: 16, s: [cx, cy, 0], to: [0, 0, 0], ti: [0, 0, 0] }, { t: 34, s: [+ex.toFixed(1), +ey.toFixed(1), 0] }] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 16, s: [0, 0, 100] }, { ...io3, t: 19, s: [100, 100, 100] }, { t: 34, s: [30, 30, 100] }] } }, ao: 0, shapes: [{ ty: "rc", d: 1, s: { a: 0, k: [4, 4] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1 }, nm: "C" }, mf(cc[i % cc.length])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // SPARKLES
  const sp = [[58, 45], [145, 42], [100, 22], [50, 82], [152, 78]];
  for (let i = 0; i < t.sp; i++) {
    const p = sp[i], d = 18 + i * 5, sz = tier === 4 ? 9 : tier === 3 ? 7 : tier === 2 ? 5 : 4;
    L.unshift({ ddd: 0, ind: 300 + i, ty: 4, nm: "Sp" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 5, s: [100] }, { ...io, t: d + 15, s: [0] }, { ...io, t: 55 + i * 5, s: [0] }, { ...io, t: 60 + i * 5, s: [100] }, { ...io, t: 70 + i * 5, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 0, s: [i * 40] }, { t: 90, s: [i * 40 + 180] }] }, p: { a: 0, k: [p[0], p[1], 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { ...io3, t: d + 5, s: [100, 100, 100] }, { t: d + 15, s: [0, 0, 100] }] } }, ao: 0, shapes: [{ ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 4 }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: sz * .4 }, is: { a: 0, k: 0 }, or: { a: 0, k: sz }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" }, mf(SC[tier])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  return { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: "streak_7_t" + tier, ddd: 0, assets: [], layers: L, markers: [] };
}

[OUT, PREVIEW].forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch { } });
for (let t = 1; t <= 4; t++) {
  const a = gen(t), j = JSON.stringify(a);
  fs.writeFileSync(path.join(OUT, "streak_7_t" + t + ".json"), j);
  try { fs.writeFileSync(path.join(PREVIEW, "streak_7_t" + t + ".json"), j); } catch { }
  console.log("T" + t + ": " + a.layers.length + " layers");
}
const b = gen(3); b.nm = "streak_7";
fs.writeFileSync(path.join(OUT, "streak_7.json"), JSON.stringify(b));
try { fs.writeFileSync(path.join(PREVIEW, "streak_7.json"), JSON.stringify(b)); } catch { }
console.log("Done!");
