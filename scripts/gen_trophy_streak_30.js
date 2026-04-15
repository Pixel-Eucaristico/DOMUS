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
  1: { cal: [.804, .498, .196, 1], calStroke: [.6, .35, .1, 1], wreath: [.5, .35, .15, 1], sealColor: null, conf: 2, sp: 1, go: 5, bg: false },
  2: { cal: [.75, .75, .78, 1], calStroke: [.55, .55, .6, 1], wreath: [.5, .55, .45, 1], sealColor: null, conf: 3, sp: 2, go: 10, bg: false },
  3: { cal: [1, .843, 0, 1], calStroke: [.855, .647, .125, 1], wreath: [.3, .65, .2, 1], sealColor: [1, .843, 0, 1], conf: 4, sp: 3, go: 18, bg: true },
  4: { cal: [.31, .765, .969, 1], calStroke: [.2, .55, .8, 1], wreath: [.2, .7, .3, 1], sealColor: [.31, .765, .969, 1], conf: 6, sp: 5, go: 25, bg: true },
};

function mf(c, op) { return { ty: "fl", c: { a: 0, k: c }, o: { a: 0, k: op || 100 }, r: 1, bm: 0, nm: "F" }; }
function ms(c, w, op) { return { ty: "st", c: { a: 0, k: c }, o: { a: 0, k: op || 100 }, w: { a: 0, k: w }, lc: 2, lj: 2, bm: 0, nm: "S" }; }
function sv(src, s) {
  return { v: src.v.map(p => [+(p[0]*s).toFixed(2), +(p[1]*s).toFixed(2)]),
    i: src.i.map(p => [+(p[0]*s).toFixed(2), +(p[1]*s).toFixed(2)]),
    o: src.o.map(p => [+(p[0]*s).toFixed(2), +(p[1]*s).toFixed(2)]), c: src.c };
}

function gen(tier) {
  const t = TIER[tier];
  const L = [];
  const cx = 100, cy = 100;
  const calScale = { 1: .65, 2: .75, 3: .85, 4: .95 }[tier];
  const wrScale = { 1: .55, 2: .65, 3: .78, 4: .88 }[tier];
  const fr = tier >= 3 ? 4 : tier === 2 ? 2 : 1;

  const fp = (oy) => [
    { i: { x: .4, y: 1 }, o: { x: .6, y: 0 }, t: 0, s: [cx, 12, 0], to: [0, 14, 0], ti: [0, -14, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 8, s: [cx, cy + oy + 6, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 12, s: [cx, cy + oy - 3, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 16, s: [cx, cy + oy, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [cx, cy + oy - fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [cx, cy + oy + fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { t: 90, s: [cx, cy + oy - fr, 0] }
  ];

  // GLOW
  const gs = { 1: 80, 2: 110, 3: 145, 4: 170 }[tier];
  L.push({ ddd: 0, ind: 100, ty: 4, nm: "Glow", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 0, s: [Math.max(t.go - 5, 2)] }, { ...io, t: 45, s: [t.go + 12] }, { t: 90, s: [Math.max(t.go - 5, 2)] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [cx, cy, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 0, s: [80, 80, 100] }, { ...io3, t: 45, s: [100, 100, 100] }, { t: 90, s: [80, 80, 100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [gs, gs] }, p: { a: 0, k: [0, 0] }, nm: "G" }, mf(GC[tier], t.go)], ip: 0, op: 90, st: 0, bm: 0 });

  // BORDER GLOW
  if (t.bg) {
    L.push({ ddd: 0, ind: 101, ty: 4, nm: "BG", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 35, s: [0] }, { ...io, t: 42, s: [30] }, { ...io, t: 60, s: [15] }, { ...io, t: 75, s: [30] }, { t: 90, s: [15] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 35, s: [90, 90, 100] }, { ...io3, t: 50, s: [108, 108, 100] }, { ...io3, t: 65, s: [90, 90, 100] }, { ...io3, t: 80, s: [108, 108, 100] }, { t: 90, s: [90, 90, 100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [135, 135] }, p: { a: 0, k: [0, 0] }, nm: "BG" }, ms(GC[tier], 3, 35)], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // WREATH (real SVG — grows around calendar)
  const wreathParts = verts.wreath.map(p => sv(p, wrScale));
  wreathParts.forEach((wp, wi) => {
    L.push({ ddd: 0, ind: 40 + wi, ty: 4, nm: "Wreath" + wi, sr: 1, ks: {
      o: { a: 1, k: [{ ...io, t: 10, s: [0] }, { ...io, t: 22, s: [100] }] },
      r: { a: 0, k: 0 }, p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 10, s: [0, 0, 100] }, { ...io3, t: 18, s: [110, 110, 100] }, { t: 24, s: [100, 100, 100] }] }
    }, ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: wp }, nm: "W" + wi }, mf(t.wreath)], ip: 0, op: 90, st: 0, bm: 0 });
  });

  // CALENDAR — replicating the colorful SVG icon with native Lottie shapes
  const calW = 44 * calScale, calH = 50 * calScale;
  const calKs = {
    o: { a: 0, k: 100 },
    r: { a: 1, k: [{ ...io, t: 0, s: [-8] }, { ...io, t: 5, s: [0] }, { ...io, t: 60, s: [-2] }, { ...io, t: 75, s: [2] }, { t: 90, s: [-2] }] },
    p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 0, s: [0, 0, 100] }, { ...io3, t: 8, s: [108, 108, 100] }, { t: 14, s: [100, 100, 100] }] }
  };
  const s = calScale;

  // 1. Body white with gray border
  L.unshift({ ddd: 0, ind: 10, ty: 4, nm: "CalBody", sr: 1, ks: calKs, ao: 0, shapes: [
    { ty: "rc", d: 1, s: { a: 0, k: [calW, calH] }, p: { a: 0, k: [0, 4*s] }, r: { a: 0, k: 4*s }, nm: "B" },
    ms([.5, .5, .5, 1], 1.5*s), mf([1, 1, 1, 1])
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // 2. Header red
  L.unshift({ ddd: 0, ind: 11, ty: 4, nm: "CalHead", sr: 1, ks: calKs, ao: 0, shapes: [
    { ty: "rc", d: 1, s: { a: 0, k: [calW, 14*s] }, p: { a: 0, k: [0, -calH/2+11*s] }, r: { a: 0, k: 4*s }, nm: "H" },
    mf([.93, .25, .21, 1])
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // 3. Pin circles (red behind)
  [-12*s, 12*s].forEach((xOff, ci) => {
    L.unshift({ ddd: 0, ind: 12+ci, ty: 4, nm: "PinBg"+ci, sr: 1, ks: calKs, ao: 0, shapes: [
      { ty: "el", d: 1, s: { a: 0, k: [8*s, 8*s] }, p: { a: 0, k: [xOff, -calH/2+4*s] }, nm: "PB" },
      mf([.78, .17, .12, 1])
    ], ip: 0, op: 90, st: 0, bm: 0 });
  });

  // 4. Pin bars (dark)
  [-12*s, 12*s].forEach((xOff, ci) => {
    L.unshift({ ddd: 0, ind: 14+ci, ty: 4, nm: "Pin"+ci, sr: 1, ks: calKs, ao: 0, shapes: [
      { ty: "rc", d: 1, s: { a: 0, k: [3.5*s, 16*s] }, p: { a: 0, k: [xOff, -calH/2+1*s] }, r: { a: 0, k: 2*s }, nm: "P" },
      mf([.1, .1, .1, 1])
    ], ip: 0, op: 90, st: 0, bm: 0 });
  });

  // 5. Day grid (3x2 small gray squares)
  const gridStartX = -13*s, gridStartY = 2*s, cellSize = 8*s, gap = 4*s;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const gx = gridStartX + col*(cellSize+gap);
      const gy = gridStartY + row*(cellSize+gap);
      L.unshift({ ddd: 0, ind: 20+row*3+col, ty: 4, nm: "Day"+row+col, sr: 1, ks: { ...calKs, o: { a: 1, k: [{ ...io, t: 8+row*2+col, s: [0] }, { t: 14+row*2+col, s: [80] }] } }, ao: 0, shapes: [
        { ty: "rc", d: 1, s: { a: 0, k: [cellSize, cellSize] }, p: { a: 0, k: [gx, gy] }, r: { a: 0, k: 1.5*s }, nm: "D" },
        mf([.85, .85, .85, 1])
      ], ip: 0, op: 90, st: 0, bm: 0 });
    }
  }

  // 6. Check circle (dark, bottom-right, overlapping calendar)
  const chkR = 14*s;
  L.unshift({ ddd: 0, ind: 30, ty: 4, nm: "ChkCircle", sr: 1, ks: { ...calKs,
    o: { a: 1, k: [{ ...io, t: 16, s: [0] }, { t: 22, s: [100] }] },
    s: { a: 1, k: [{ ...io3, t: 16, s: [0, 0, 100] }, { ...io3, t: 20, s: [120, 120, 100] }, { t: 24, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [
    { ty: "el", d: 1, s: { a: 0, k: [chkR*2, chkR*2] }, p: { a: 0, k: [14*s, 14*s] }, nm: "CC" },
    mf([.15, .7, .3, 1])
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // 7. Checkmark (white, inside circle)
  const chkOx = 14*s, chkOy = 14*s;
  const cv2 = {
    v: [[-5*s+chkOx, 1*s+chkOy], [-1*s+chkOx, 5*s+chkOy], [7*s+chkOx, -5*s+chkOy]].map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]),
    i: [[0,0],[0,0],[0,0]], o: [[0,0],[0,0],[0,0]], c: false
  };
  L.unshift({ ddd: 0, ind: 31, ty: 4, nm: "Checkmark", sr: 1, ks: { ...calKs,
    o: { a: 1, k: [{ ...io, t: 20, s: [0] }, { t: 25, s: [100] }] },
    s: { a: 1, k: [{ ...io3, t: 20, s: [0, 0, 100] }, { ...io3, t: 23, s: [120, 120, 100] }, { t: 27, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [
    { ty: "sh", d: 1, ks: { a: 0, k: cv2 }, nm: "V" },
    ms([1, 1, 1, 1], 3*s)
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // SEAL (gold/diamond — stamp on top)
  if (t.sealColor) {
    // Star seal
    const sealSize = tier === 4 ? 14 : 11;
    L.unshift({ ddd: 0, ind: 50, ty: 4, nm: "Seal", sr: 1, ks: {
      o: { a: 1, k: [{ ...io, t: 28, s: [0] }, { ...io, t: 34, s: [100] }] },
      r: { a: 1, k: [{ ...io, t: 28, s: [-25] }, { ...io, t: 34, s: [0] }, { ...io, t: 60, s: [5] }, { ...io, t: 75, s: [-5] }, { t: 90, s: [5] }] },
      p: { a: 1, k: fp(-38 * calScale) }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 28, s: [0, 0, 100] }, { ...io3, t: 32, s: [130, 130, 100] }, { t: 36, s: [100, 100, 100] }] }
    }, ao: 0, shapes: [
      { ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 5 }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: sealSize * .45 }, is: { a: 0, k: 0 }, or: { a: 0, k: sealSize }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" },
      mf(t.sealColor)
    ], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // CONFETTI
  const cc = [[.85, .15, .2, 1], [1, .843, 0, 1], [.31, .765, .969, 1], [.15, .75, .5, 1], [.9, .5, .1, 1], [.6, .3, .8, 1]];
  for (let i = 0; i < t.conf; i++) {
    const a = (i / t.conf) * Math.PI * 2 + .3;
    const d2 = 35 + (i % 2) * 15;
    const ex = cx + Math.cos(a) * d2, ey = cy + Math.sin(a) * d2;
    L.push({ ddd: 0, ind: 200 + i, ty: 4, nm: "Cf" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 14, s: [0] }, { ...io, t: 16, s: [100] }, { ...io, t: 32, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 14, s: [0] }, { t: 32, s: [180 + i * 55] }] }, p: { a: 1, k: [{ i: { x: .3, y: 1 }, o: { x: .7, y: 0 }, t: 14, s: [cx, cy, 0], to: [0, 0, 0], ti: [0, 0, 0] }, { t: 32, s: [+ex.toFixed(1), +ey.toFixed(1), 0] }] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 14, s: [0, 0, 100] }, { ...io3, t: 17, s: [100, 100, 100] }, { t: 32, s: [30, 30, 100] }] } }, ao: 0, shapes: [{ ty: "rc", d: 1, s: { a: 0, k: [4, 4] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1 }, nm: "C" }, mf(cc[i % cc.length])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // SPARKLES
  const sp = [[55, 42], [148, 40], [100, 22], [48, 82], [155, 80]];
  for (let i = 0; i < t.sp; i++) {
    const p = sp[i], d = 18 + i * 5, sz = tier === 4 ? 9 : tier === 3 ? 7 : tier === 2 ? 5 : 4;
    L.unshift({ ddd: 0, ind: 300 + i, ty: 4, nm: "Sp" + (i + 1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 5, s: [100] }, { ...io, t: d + 15, s: [0] }, { ...io, t: 55 + i * 5, s: [0] }, { ...io, t: 60 + i * 5, s: [100] }, { ...io, t: 70 + i * 5, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 0, s: [i * 40] }, { t: 90, s: [i * 40 + 180] }] }, p: { a: 0, k: [p[0], p[1], 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { ...io3, t: d + 5, s: [100, 100, 100] }, { t: d + 15, s: [0, 0, 100] }] } }, ao: 0, shapes: [{ ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 4 }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: sz * .4 }, is: { a: 0, k: 0 }, or: { a: 0, k: sz }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" }, mf(SC[tier])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  return { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: "streak_30_t" + tier, ddd: 0, assets: [], layers: L, markers: [] };
}

[OUT, PREVIEW].forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch { } });
for (let t = 1; t <= 4; t++) {
  const a = gen(t), j = JSON.stringify(a);
  fs.writeFileSync(path.join(OUT, "streak_30_t" + t + ".json"), j);
  try { fs.writeFileSync(path.join(PREVIEW, "streak_30_t" + t + ".json"), j); } catch { }
  console.log("T" + t + ": " + a.layers.length + " layers");
}
const b = gen(3); b.nm = "streak_30";
fs.writeFileSync(path.join(OUT, "streak_30.json"), JSON.stringify(b));
try { fs.writeFileSync(path.join(PREVIEW, "streak_30.json"), JSON.stringify(b)); } catch { }
console.log("Done!");
