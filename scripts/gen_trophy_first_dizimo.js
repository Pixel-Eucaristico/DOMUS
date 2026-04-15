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
  1: { hd: [.804, .498, .196, 1], ht: [.7, .2, .15, 1], hs: [.5, .12, .08, 1], cr: [.95, .9, .8, 1], rays: 2, conf: 2, sp: 1, go: 5, bg: false },
  2: { hd: [.65, .65, .7, 1], ht: [.75, .12, .17, 1], hs: [.5, .08, .12, 1], cr: [.92, .92, .97, 1], rays: 3, conf: 3, sp: 2, go: 10, bg: false },
  3: { hd: [.95, .8, .3, 1], ht: [.85, .08, .13, 1], hs: [.65, .06, .09, 1], cr: [1, .97, .8, 1], rays: 4, conf: 4, sp: 3, go: 18, bg: true },
  4: { hd: [.25, .7, .92, 1], ht: [.92, .04, .08, 1], hs: [.7, .02, .05, 1], cr: [1, 1, 1, 1], rays: 6, conf: 6, sp: 5, go: 25, bg: true },
};

function mf(c, op) { return { ty: "fl", c: { a: 0, k: c }, o: { a: 0, k: op || 100 }, r: 1, bm: 0, nm: "F" }; }
function ms(c, w, op) { return { ty: "st", c: { a: 0, k: c }, o: { a: 0, k: op || 100 }, w: { a: 0, k: w }, lc: 2, lj: 2, bm: 0, nm: "S" }; }

function scaleVerts(src, sx, sy) {
  return {
    v: src.v.map(p => [+(p[0] * sx).toFixed(1), +(p[1] * (sy || sx)).toFixed(1)]),
    i: src.i.map(p => [+(p[0] * sx).toFixed(1), +(p[1] * (sy || sx)).toFixed(1)]),
    o: src.o.map(p => [+(p[0] * sx).toFixed(1), +(p[1] * (sy || sx)).toFixed(1)]),
    c: src.c
  };
}

function gen(tier) {
  const t = TIER[tier];
  const L = [];
  const cx = 100, cy = 100;
  const hs = { 1: .7, 2: .85, 3: 1, 4: 1.15 }[tier];
  const hds = { 1: .6, 2: .7, 3: .8, 4: .9 }[tier];
  const cs = { 1: .6, 2: .7, 3: .85, 4: 1 }[tier];
  const fr = tier >= 3 ? 4 : tier === 2 ? 2 : 1;

  const fp = (oy) => [
    { i: { x: .4, y: 1 }, o: { x: .6, y: 0 }, t: 0, s: [cx, 10, 0], to: [0, 15, 0], ti: [0, -15, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 8, s: [cx, cy + oy + 6, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 12, s: [cx, cy + oy - 3, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 16, s: [cx, cy + oy, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [cx, cy + oy - fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [cx, cy + oy + fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { t: 90, s: [cx, cy + oy - fr, 0] }
  ];

  // GLOW
  const gs = { 1: 80, 2: 110, 3: 140, 4: 170 }[tier];
  L.push({ ddd: 0, ind: 100, ty: 4, nm: "Glow", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 0, s: [Math.max(t.go - 5, 2)] }, { ...io, t: 45, s: [t.go + 12] }, { t: 90, s: [Math.max(t.go - 5, 2)] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [cx, cy - 5, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 0, s: [80, 80, 100] }, { ...io3, t: 45, s: [100, 100, 100] }, { t: 90, s: [80, 80, 100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [gs, gs] }, p: { a: 0, k: [0, 0] }, nm: "G" }, mf(GC[tier], t.go)], ip: 0, op: 90, st: 0, bm: 0 });

  // BORDER GLOW
  if (t.bg) {
    L.push({ ddd: 0, ind: 101, ty: 4, nm: "BG", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 35, s: [0] }, { ...io, t: 42, s: [30] }, { ...io, t: 60, s: [15] }, { ...io, t: 75, s: [30] }, { t: 90, s: [15] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(-5) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 35, s: [90, 90, 100] }, { ...io3, t: 50, s: [108, 108, 100] }, { ...io3, t: 65, s: [90, 90, 100] }, { ...io3, t: 80, s: [108, 108, 100] }, { t: 90, s: [90, 90, 100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [130, 130] }, p: { a: 0, k: [0, 0] }, nm: "BG" }, ms(GC[tier], 3, 35)], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // RAYS
  for (let i = 0; i < t.rays; i++) {
    const a = (i / t.rays) * Math.PI * 2 - Math.PI / 2;
    const ir = hs * 20 + 5, or2 = ir + { 1: 12, 2: 16, 3: 20, 4: 25 }[tier];
    const d = 22 + i * 3;
    L.push({ ddd: 0, ind: 110 + i, ty: 4, nm: "R" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 6, s: [60] }, { ...io, t: d + 20, s: [25] }, { ...io, t: 55 + i * 3, s: [20] }, { ...io, t: 65 + i * 3, s: [45] }, { ...io, t: 75 + i * 3, s: [20] }, { t: 90, s: [20] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(-5) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { t: d + 8, s: [100, 100, 100] }] } }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: { v: [[+(Math.cos(a) * ir).toFixed(1), +(Math.sin(a) * ir).toFixed(1)], [+(Math.cos(a) * or2).toFixed(1), +(Math.sin(a) * or2).toFixed(1)]], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], c: false } }, nm: "R" }, ms(t.ht, tier >= 3 ? 2.5 : 2, 70)], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // HANDS (real SVG paths)
  const hv = scaleVerts(verts.hands, hds);
  L.unshift({ ddd: 0, ind: 10, ty: 4, nm: "Hands", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 3, s: [0] }, { t: 12, s: [100] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(8) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 3, s: [0, 0, 100] }, { ...io3, t: 10, s: [105, 105, 100] }, { t: 14, s: [100, 100, 100] }] } }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: hv }, nm: "H" }, mf(t.hd)], ip: 0, op: 90, st: 0, bm: 0 });

  // HEART (real SVG paths)
  const htv = scaleVerts(verts.heart, hs);
  L.unshift({ ddd: 0, ind: 12, ty: 4, nm: "Heart", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 12, s: [0] }, { t: 18, s: [100] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(-8) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 12, s: [0, 0, 100] }, { ...io3, t: 16, s: [115, 115, 100] }, { ...io3, t: 20, s: [100, 100, 100] }, { ...io3, t: 48, s: [100, 100, 100] }, { ...io3, t: 52, s: [112, 112, 100] }, { ...io3, t: 56, s: [100, 100, 100] }, { ...io3, t: 68, s: [100, 100, 100] }, { ...io3, t: 72, s: [108, 108, 100] }, { t: 76, s: [100, 100, 100] }] } }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: htv }, nm: "H" }, ms(t.hs, tier >= 3 ? 2 : 1.5), mf(t.ht)], ip: 0, op: 90, st: 0, bm: 0 });

  // CROSS (real SVG polygon)
  const cv = scaleVerts(verts.cross, cs);
  L.unshift({ ddd: 0, ind: 13, ty: 4, nm: "Cross", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 16, s: [0] }, { t: 22, s: [100] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(-10) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 16, s: [0, 0, 100] }, { ...io3, t: 20, s: [120, 120, 100] }, { t: 24, s: [100, 100, 100] }, { ...io3, t: 48, s: [100, 100, 100] }, { ...io3, t: 52, s: [112, 112, 100] }, { ...io3, t: 56, s: [100, 100, 100] }, { ...io3, t: 68, s: [100, 100, 100] }, { ...io3, t: 72, s: [108, 108, 100] }, { t: 76, s: [100, 100, 100] }] } }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: cv }, nm: "Cr" }, mf(t.cr)], ip: 0, op: 90, st: 0, bm: 0 });

  // CONFETTI
  const cc = [[.85, .15, .2, 1], [1, .843, 0, 1], [.31, .765, .969, 1], [.15, .75, .5, 1], [.9, .5, .1, 1], [.6, .3, .8, 1]];
  for (let i = 0; i < t.conf; i++) {
    const a = (i / t.conf) * Math.PI * 2 + .4;
    const d2 = 32 + (i % 2) * 16;
    const ex = cx + Math.cos(a) * d2, ey = cy - 5 + Math.sin(a) * d2;
    L.push({ ddd: 0, ind: 200 + i, ty: 4, nm: "Cf" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 18, s: [0] }, { ...io, t: 20, s: [100] }, { ...io, t: 36, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 18, s: [0] }, { t: 36, s: [180 + i * 55] }] }, p: { a: 1, k: [{ i: { x: .3, y: 1 }, o: { x: .7, y: 0 }, t: 18, s: [cx, cy - 5, 0], to: [0, 0, 0], ti: [0, 0, 0] }, { t: 36, s: [+ex.toFixed(1), +ey.toFixed(1), 0] }] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 18, s: [0, 0, 100] }, { ...io3, t: 21, s: [100, 100, 100] }, { t: 36, s: [30, 30, 100] }] } }, ao: 0, shapes: [{ ty: "rc", d: 1, s: { a: 0, k: [4, 4] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1 }, nm: "C" }, mf(cc[i % cc.length])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // SPARKLES
  const sp = [[60, 48], [142, 45], [100, 28], [52, 80], [150, 78]];
  for (let i = 0; i < t.sp; i++) {
    const p = sp[i], d = 20 + i * 5, sz = tier === 4 ? 9 : tier === 3 ? 7 : tier === 2 ? 5 : 4;
    L.unshift({ ddd: 0, ind: 300 + i, ty: 4, nm: "Sp" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 5, s: [100] }, { ...io, t: d + 15, s: [0] }, { ...io, t: 55 + i * 5, s: [0] }, { ...io, t: 60 + i * 5, s: [100] }, { ...io, t: 70 + i * 5, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 0, s: [i * 40] }, { t: 90, s: [i * 40 + 180] }] }, p: { a: 0, k: [p[0], p[1], 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { ...io3, t: d + 5, s: [100, 100, 100] }, { t: d + 15, s: [0, 0, 100] }] } }, ao: 0, shapes: [{ ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 4 }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: sz * .4 }, is: { a: 0, k: 0 }, or: { a: 0, k: sz }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" }, mf(SC[tier])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  return { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: "first_dizimo_t" + tier, ddd: 0, assets: [], layers: L, markers: [] };
}

[OUT, PREVIEW].forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch { } });
for (let t = 1; t <= 4; t++) {
  const a = gen(t), j = JSON.stringify(a);
  fs.writeFileSync(path.join(OUT, "first_dizimo_t" + t + ".json"), j);
  try { fs.writeFileSync(path.join(PREVIEW, "first_dizimo_t" + t + ".json"), j); } catch { }
  console.log("T" + t + ": " + a.layers.length + " layers");
}
const b = gen(3); b.nm = "first_dizimo";
fs.writeFileSync(path.join(OUT, "first_dizimo.json"), JSON.stringify(b));
try { fs.writeFileSync(path.join(PREVIEW, "first_dizimo.json"), JSON.stringify(b)); } catch { }
console.log("Done!");
