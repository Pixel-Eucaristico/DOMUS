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
  1: { shieldFill: [.804, .498, .196, 1], shieldStroke: [.6, .35, .1, 1], dollarColor: [.95, .85, .6, 1], hasCheck: false, conf: 2, sp: 1, go: 5, bg: false },
  2: { shieldFill: [.75, .75, .78, 1], shieldStroke: [.55, .55, .6, 1], dollarColor: [.95, .95, 1, 1], hasCheck: true, conf: 3, sp: 2, go: 10, bg: false },
  3: { shieldFill: [1, .843, 0, 1], shieldStroke: [.855, .647, .125, 1], dollarColor: [1, 1, .85, 1], hasCheck: true, conf: 4, sp: 3, go: 18, bg: true },
  4: { shieldFill: [.31, .765, .969, 1], shieldStroke: [.2, .55, .8, 1], dollarColor: [1, 1, 1, 1], hasCheck: true, conf: 6, sp: 5, go: 25, bg: true },
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
  const shScale = { 1: .7, 2: .8, 3: .95, 4: 1.05 }[tier];
  const fr = tier >= 3 ? 4 : tier === 2 ? 2 : 1;

  const fp = (oy) => [
    { i: { x: .4, y: 1 }, o: { x: .6, y: 0 }, t: 0, s: [cx, 12, 0], to: [0, 14, 0], ti: [0, -14, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 8, s: [cx, cy + oy + 8, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 12, s: [cx, cy + oy - 4, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 16, s: [cx, cy + oy, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [cx, cy + oy - fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [cx, cy + oy + fr, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { t: 90, s: [cx, cy + oy - fr, 0] }
  ];

  // GLOW
  const gs = { 1: 80, 2: 110, 3: 145, 4: 170 }[tier];
  L.push({ ddd: 0, ind: 100, ty: 4, nm: "Glow", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 0, s: [Math.max(t.go-5,2)] }, { ...io, t: 45, s: [t.go+12] }, { t: 90, s: [Math.max(t.go-5,2)] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [cx, cy, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 0, s: [80,80,100] }, { ...io3, t: 45, s: [100,100,100] }, { t: 90, s: [80,80,100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [gs,gs] }, p: { a: 0, k: [0,0] }, nm: "G" }, mf(GC[tier], t.go)], ip: 0, op: 90, st: 0, bm: 0 });

  // BORDER GLOW
  if (t.bg) {
    L.push({ ddd: 0, ind: 101, ty: 4, nm: "BG", sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 32, s: [0] }, { ...io, t: 40, s: [30] }, { ...io, t: 58, s: [15] }, { ...io, t: 73, s: [30] }, { t: 90, s: [15] }] }, r: { a: 0, k: 0 }, p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ ...io3, t: 32, s: [90,90,100] }, { ...io3, t: 48, s: [108,108,100] }, { ...io3, t: 64, s: [90,90,100] }, { ...io3, t: 80, s: [108,108,100] }, { t: 90, s: [90,90,100] }] } }, ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [130,140] }, p: { a: 0, k: [0,0] }, nm: "BG" }, ms(GC[tier], 3, 35)], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // SHIELD (real SVG — shield-checkmark-black-icon from UXWing)
  const shVerts = sv(verts.shieldCheck, shScale);
  L.unshift({ ddd: 0, ind: 10, ty: 4, nm: "Shield", sr: 1, ks: {
    o: { a: 0, k: 100 },
    r: { a: 1, k: [{ ...io, t: 0, s: [-10] }, { ...io, t: 5, s: [0] }, { ...io, t: 55, s: [-2] }, { ...io, t: 70, s: [2] }, { t: 90, s: [-2] }] },
    p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 0, s: [0, 0, 100] }, { ...io3, t: 8, s: [110, 110, 100] }, { t: 14, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [
    { ty: "sh", d: 1, ks: { a: 0, k: shVerts }, nm: "Sh" },
    ms(t.shieldStroke, 2.5 * shScale), mf(t.shieldFill)
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // SHIELD INNER (slightly darker, smaller — gives depth)
  const shInner = sv(verts.shieldCheck, shScale * 0.78);
  L.unshift({ ddd: 0, ind: 11, ty: 4, nm: "ShieldInner", sr: 1, ks: {
    o: { a: 1, k: [{ ...io, t: 6, s: [0] }, { t: 12, s: [50] }] },
    r: { a: 1, k: [{ ...io, t: 0, s: [-10] }, { ...io, t: 5, s: [0] }, { ...io, t: 55, s: [-2] }, { ...io, t: 70, s: [2] }, { t: 90, s: [-2] }] },
    p: { a: 1, k: fp(2) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 0, s: [0, 0, 100] }, { ...io3, t: 8, s: [110, 110, 100] }, { t: 14, s: [100, 100, 100] }] }
  }, ao: 0, shapes: [
    { ty: "sh", d: 1, ks: { a: 0, k: shInner }, nm: "Si" },
    mf(t.shieldStroke, 30)
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // DOLLAR SIGN ($) — real SVG S-curve scaled to fit shield + vertical stroke line
  // Dollar SVG is ~14.7w x 20.6h at scale 1. Target: ~60% of shield height
  const dolScale = shScale * 1.2;
  // Use stroke instead of fill for thinner S
  const dolVerts = sv(verts.dollar, dolScale);
  const dolKs = {
    o: { a: 1, k: [{ ...io, t: 12, s: [0] }, { t: 18, s: [100] }] },
    r: { a: 1, k: [{ ...io, t: 0, s: [-10] }, { ...io, t: 5, s: [0] }, { ...io, t: 55, s: [-2] }, { ...io, t: 70, s: [2] }, { t: 90, s: [-2] }] },
    p: { a: 1, k: fp(-2) }, a: { a: 0, k: [0, 0, 0] },
    s: { a: 1, k: [{ ...io3, t: 12, s: [0, 0, 100] }, { ...io3, t: 16, s: [120, 120, 100] }, { t: 20, s: [100, 100, 100] }] }
  };
  // S curve fill
  L.unshift({ ddd: 0, ind: 12, ty: 4, nm: "DollarS", sr: 1, ks: dolKs, ao: 0, shapes: [
    { ty: "sh", d: 1, ks: { a: 0, k: dolVerts }, nm: "S" },
    mf(t.dollarColor)
  ], ip: 0, op: 90, st: 0, bm: 0 });
  // Vertical line — proportional to S height (20.6 * dolScale), extend 15% beyond top and bottom
  const sHeight = 10.4 * dolScale; // half-height of S
  const lineExt = sHeight * 1.2;
  L.unshift({ ddd: 0, ind: 13, ty: 4, nm: "DollarLine", sr: 1, ks: dolKs, ao: 0, shapes: [
    { ty: "sh", d: 1, ks: { a: 0, k: {
      v: [[0, +(-lineExt).toFixed(1)], [0, +(lineExt).toFixed(1)]],
      i: [[0,0],[0,0]], o: [[0,0],[0,0]], c: false
    }}, nm: "L" },
    ms(t.dollarColor, 3.5)
  ], ip: 0, op: 90, st: 0, bm: 0 });

  // GREEN CHECK (bottom-right, tier 2+)
  if (t.hasCheck) {
    const chkS = shScale * 0.9;
    const chkOx = 18 * shScale, chkOy = 18 * shScale;
    // Circle green bg
    L.unshift({ ddd: 0, ind: 20, ty: 4, nm: "ChkBg", sr: 1, ks: {
      o: { a: 1, k: [{ ...io, t: 20, s: [0] }, { t: 26, s: [100] }] },
      r: { a: 0, k: 0 }, p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 20, s: [0, 0, 100] }, { ...io3, t: 24, s: [120, 120, 100] }, { t: 28, s: [100, 100, 100] }] }
    }, ao: 0, shapes: [
      { ty: "el", d: 1, s: { a: 0, k: [16*chkS, 16*chkS] }, p: { a: 0, k: [chkOx, chkOy] }, nm: "CB" },
      mf([.15, .7, .3, 1])
    ], ip: 0, op: 90, st: 0, bm: 0 });
    // Checkmark (real SVG from shield-checkmark icon, offset to circle position)
    const rawChk = sv(verts.shieldCheckmark, chkS * 0.5);
    const chkV = {
      v: rawChk.v.map(p => [+(p[0] + chkOx).toFixed(1), +(p[1] + chkOy).toFixed(1)]),
      i: rawChk.i, o: rawChk.o, c: rawChk.c
    };
    L.unshift({ ddd: 0, ind: 21, ty: 4, nm: "Chk", sr: 1, ks: {
      o: { a: 1, k: [{ ...io, t: 24, s: [0] }, { t: 28, s: [100] }] },
      r: { a: 0, k: 0 }, p: { a: 1, k: fp(0) }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 24, s: [0, 0, 100] }, { ...io3, t: 27, s: [120, 120, 100] }, { t: 30, s: [100, 100, 100] }] }
    }, ao: 0, shapes: [
      { ty: "sh", d: 1, ks: { a: 0, k: chkV }, nm: "V" },
      ms([1, 1, 1, 1], 2.5 * chkS)
    ], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // CONFETTI
  const cc = [[.85,.15,.2,1],[1,.843,0,1],[.31,.765,.969,1],[.15,.75,.5,1],[.9,.5,.1,1],[.6,.3,.8,1]];
  for (let i = 0; i < t.conf; i++) {
    const a = (i / t.conf) * Math.PI * 2 + .3;
    const d2 = 35 + (i % 2) * 15;
    const ex = cx + Math.cos(a) * d2, ey = cy + Math.sin(a) * d2;
    L.push({ ddd: 0, ind: 200+i, ty: 4, nm: "Cf"+(i+1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: 14, s: [0] }, { ...io, t: 16, s: [100] }, { ...io, t: 32, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 14, s: [0] }, { t: 32, s: [180+i*55] }] }, p: { a: 1, k: [{ i: { x: .3, y: 1 }, o: { x: .7, y: 0 }, t: 14, s: [cx, cy, 0], to: [0,0,0], ti: [0,0,0] }, { t: 32, s: [+ex.toFixed(1), +ey.toFixed(1), 0] }] }, a: { a: 0, k: [0,0,0] }, s: { a: 1, k: [{ ...io3, t: 14, s: [0,0,100] }, { ...io3, t: 17, s: [100,100,100] }, { t: 32, s: [30,30,100] }] } }, ao: 0, shapes: [{ ty: "rc", d: 1, s: { a: 0, k: [4,4] }, p: { a: 0, k: [0,0] }, r: { a: 0, k: 1 }, nm: "C" }, mf(cc[i%cc.length])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  // SPARKLES
  const sp = [[55,42],[148,40],[100,22],[48,82],[155,80]];
  for (let i = 0; i < t.sp; i++) {
    const p = sp[i], d = 18+i*5, sz = tier===4?9:tier===3?7:tier===2?5:4;
    L.unshift({ ddd: 0, ind: 300+i, ty: 4, nm: "Sp"+(i+1), sr: 1, ks: { o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d+5, s: [100] }, { ...io, t: d+15, s: [0] }, { ...io, t: 55+i*5, s: [0] }, { ...io, t: 60+i*5, s: [100] }, { ...io, t: 70+i*5, s: [0] }, { t: 90, s: [0] }] }, r: { a: 1, k: [{ t: 0, s: [i*40] }, { t: 90, s: [i*40+180] }] }, p: { a: 0, k: [p[0],p[1],0] }, a: { a: 0, k: [0,0,0] }, s: { a: 1, k: [{ ...io3, t: d, s: [0,0,100] }, { ...io3, t: d+5, s: [100,100,100] }, { t: d+15, s: [0,0,100] }] } }, ao: 0, shapes: [{ ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 4 }, p: { a: 0, k: [0,0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: sz*.4 }, is: { a: 0, k: 0 }, or: { a: 0, k: sz }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" }, mf(SC[tier])], ip: 0, op: 90, st: 0, bm: 0 });
  }

  return { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: "budget_ok_t"+tier, ddd: 0, assets: [], layers: L, markers: [] };
}

[OUT, PREVIEW].forEach(d => { try { fs.mkdirSync(d, {recursive:true}); } catch {} });
for (let t = 1; t <= 4; t++) {
  const a = gen(t), j = JSON.stringify(a);
  fs.writeFileSync(path.join(OUT, "budget_ok_t"+t+".json"), j);
  try { fs.writeFileSync(path.join(PREVIEW, "budget_ok_t"+t+".json"), j); } catch {}
  console.log("T"+t+": "+a.layers.length+" layers");
}
const b = gen(3); b.nm = "budget_ok";
fs.writeFileSync(path.join(OUT, "budget_ok.json"), JSON.stringify(b));
try { fs.writeFileSync(path.join(PREVIEW, "budget_ok.json"), JSON.stringify(b)); } catch {}
console.log("Done!");
