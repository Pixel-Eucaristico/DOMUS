const fs = require('fs'), path = require('path');
const { book, lines, pgR, pgL } = JSON.parse(fs.readFileSync(path.join(__dirname, 'lottie-verts-book.json'), 'utf8'));

const bY = 108;
const io = { i: { x: [.667], y: [1] }, o: { x: [.333], y: [0] } };
const io3 = { i: { x: [.667, .667, .667], y: [1, 1, 1] }, o: { x: [.333, .333, .333], y: [0, 0, 0] } };

function mf(c) { return { ty: "fl", c: { a: 0, k: c }, o: { a: 0, k: 100 }, r: 1, bm: 0, nm: "F" }; }
function ms(c, w) { return { ty: "st", c: { a: 0, k: c }, o: { a: 0, k: 100 }, w: { a: 0, k: w }, lc: 2, lj: 2, bm: 0, nm: "S" }; }

const TIERS = {
  base: {
    nm: "Seasonal Dia Estudante",
    bookColor: [.55, .35, .18, 1],        // bronze book cover
    pageR: [.95, .92, .85, 1],
    pageL: [.9, .87, .8, 1],
    textLines: [.65, .55, .4, 1],
    coinColor: [.804, .498, .196, 1],     // bronze coin
    dollarColor: [1, 1, 1, 1],
    glow: [.55, .35, .18, .25],
    sparkle: [.804, .498, .196, 1],
    extraSparkles: 0,
    pulse: false,
  },
  t2: {
    nm: "Seasonal Dia Estudante Prata",
    bookColor: [.45, .45, .5, 1],         // silver book cover
    pageR: [.93, .93, .96, 1],
    pageL: [.88, .88, .92, 1],
    textLines: [.5, .5, .6, 1],
    coinColor: [.75, .75, .78, 1],        // silver coin
    dollarColor: [1, 1, 1, 1],
    glow: [.6, .6, .65, .28],
    sparkle: [.75, .75, .78, 1],
    extraSparkles: 0,
    pulse: true,
    pulseColor: [.75, .75, .78, 1],
  },
  t3: {
    nm: "Seasonal Dia Estudante Ouro",
    bookColor: [.5, .3, .1, 1],           // rich brown/gold book cover
    pageR: [1, .97, .9, 1],
    pageL: [.95, .92, .85, 1],
    textLines: [.5, .4, .2, 1],
    coinColor: [1, .843, 0, 1],           // gold coin
    dollarColor: [1, 1, 1, 1],
    glow: [1, .843, 0, .35],
    sparkle: [1, .843, 0, 1],
    extraSparkles: 4,
    pulse: true,
    pulseColor: [1, .843, 0, 1],
  },
};

function floatKF(baseY, startFrame, range) {
  range = range || 3;
  return [
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: startFrame, s: [100, baseY, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [100, baseY - range, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [100, baseY + range, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { t: 90, s: [100, baseY - range, 0] }
  ];
}

function buildAnim(tc) {
  const L = [];

  // ── GLOW ──
  L.push({
    ddd: 0, ind: 1, ty: 4, nm: "Glow", sr: 1,
    ks: {
      o: { a: 1, k: [{ ...io, t: 0, s: [10] }, { ...io, t: 45, s: [25] }, { t: 90, s: [10] }] },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [100, bY + 5, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 0, s: [80, 80, 100] }, { ...io3, t: 45, s: [105, 105, 100] }, { t: 90, s: [80, 80, 100] }] }
    },
    ao: 0, shapes: [{ ty: "el", d: 1, s: { a: 0, k: [140, 120] }, p: { a: 0, k: [0, 0] }, nm: "G" }, mf(tc.glow)],
    ip: 0, op: 90, st: 0, bm: 0
  });

  // ── PAGE FILLS (left & right) ──
  L.push({
    ddd: 0, ind: 12, ty: 4, nm: "PageL", sr: 1,
    ks: {
      o: { a: 1, k: [{ ...io, t: 4, s: [0] }, { t: 10, s: [100] }] },
      r: { a: 0, k: 0 },
      p: { a: 1, k: floatKF(bY, 16) },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: pgL }, nm: "PL" }, mf(tc.pageL)],
    ip: 0, op: 90, st: 0, bm: 0
  });
  L.push({
    ddd: 0, ind: 11, ty: 4, nm: "PageR", sr: 1,
    ks: {
      o: { a: 1, k: [{ ...io, t: 4, s: [0] }, { t: 10, s: [100] }] },
      r: { a: 0, k: 0 },
      p: { a: 1, k: floatKF(bY, 16) },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: pgR }, nm: "PR" }, mf(tc.pageR)],
    ip: 0, op: 90, st: 0, bm: 0
  });

  // ── TEXT LINES (3 lines on right page) ──
  for (let i = 0; i < 3 && i < lines.length; i++) {
    const d = 20 + i * 5;
    L.push({
      ddd: 0, ind: 30 + i, ty: 4, nm: "TxtLine" + (i + 1), sr: 1,
      ks: {
        o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 4, s: [75] }] },
        r: { a: 0, k: 0 },
        p: { a: 1, k: floatKF(bY, 16) },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ ...io3, t: d, s: [0, 100, 100] }, { t: d + 6, s: [100, 100, 100] }] }
      },
      ao: 0, shapes: [{ ty: "sh", d: 1, ks: { a: 0, k: lines[i] }, nm: "L" }, mf(tc.textLines)],
      ip: 0, op: 90, st: 0, bm: 0
    });
  }

  // ── BOOK OUTLINE (SVG real) ──
  L.push({
    ddd: 0, ind: 10, ty: 4, nm: "Book", sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [
        { i: { x: .4, y: 1 }, o: { x: .6, y: 0 }, t: 0, s: [100, 200, 0], to: [0, -15, 0], ti: [0, 15, 0] },
        { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 8, s: [100, bY + 12, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { i: { x: .5, y: 1 }, o: { x: .5, y: 0 }, t: 12, s: [100, bY - 6, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        ...floatKF(bY, 16)
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: 8, s: [105, 90, 100] }, { ...io3, t: 10, s: [95, 108, 100] }, { t: 14, s: [100, 100, 100] }] }
    },
    ao: 0,
    shapes: [
      { ty: "sh", d: 1, ks: { a: 0, k: book }, nm: "Outline" },
      mf(tc.bookColor)
    ],
    ip: 0, op: 90, st: 0, bm: 0
  });

  // ── COIN (upper right, floating out of book) ──
  const cDelay = 12;
  L.push({
    ddd: 0, ind: 20, ty: 4, nm: "Coin", sr: 1,
    ks: {
      o: { a: 1, k: [{ ...io, t: cDelay, s: [0] }, { t: cDelay + 4, s: [100] }] },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: cDelay, s: [130, bY - 5, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [130, bY - 8, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [130, bY - 2, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { t: 90, s: [130, bY - 8, 0] }
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: cDelay, s: [0, 0, 100] }, { ...io3, t: cDelay + 3, s: [120, 120, 100] }, { t: cDelay + 6, s: [100, 100, 100] }] }
    },
    ao: 0,
    shapes: [
      { ty: "gr", it: [{ ty: "el", d: 1, s: { a: 0, k: [20, 20] }, p: { a: 0, k: [0, 0] }, nm: "CoinDisc" }, mf(tc.coinColor), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "CoinGrp" },
      { ty: "gr", it: [{ ty: "rc", d: 1, s: { a: 0, k: [2, 11] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1 }, nm: "DollarV" }, mf(tc.dollarColor), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "DollarVGrp" },
      { ty: "gr", it: [{ ty: "rc", d: 1, s: { a: 0, k: [9, 2] }, p: { a: 0, k: [0, -3] }, r: { a: 0, k: 1 }, nm: "DollarT" }, mf(tc.dollarColor), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "DollarTGrp" },
      { ty: "gr", it: [{ ty: "rc", d: 1, s: { a: 0, k: [9, 2] }, p: { a: 0, k: [0, 3] }, r: { a: 0, k: 1 }, nm: "DollarB" }, mf(tc.dollarColor), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "DollarBGrp" },
    ],
    ip: 0, op: 90, st: 0, bm: 0
  });

  // ── SECOND COIN (upper left, offset delay) ──
  const c2Delay = 18;
  L.push({
    ddd: 0, ind: 21, ty: 4, nm: "Coin2", sr: 1,
    ks: {
      o: { a: 1, k: [{ ...io, t: c2Delay, s: [0] }, { t: c2Delay + 4, s: [100] }] },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: c2Delay, s: [70, bY - 10, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 45, s: [70, bY - 13, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { i: { x: .667, y: 1 }, o: { x: .333, y: 0 }, t: 67, s: [70, bY - 7, 0], to: [0, 0, 0], ti: [0, 0, 0] },
        { t: 90, s: [70, bY - 13, 0] }
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ ...io3, t: c2Delay, s: [0, 0, 100] }, { ...io3, t: c2Delay + 3, s: [115, 115, 100] }, { t: c2Delay + 6, s: [100, 100, 100] }] }
    },
    ao: 0,
    shapes: [
      { ty: "gr", it: [{ ty: "el", d: 1, s: { a: 0, k: [16, 16] }, p: { a: 0, k: [0, 0] }, nm: "Coin2Disc" }, mf(tc.coinColor), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "Coin2Grp" },
      { ty: "gr", it: [{ ty: "rc", d: 1, s: { a: 0, k: [2, 9] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1 }, nm: "Dollar2V" }, mf(tc.dollarColor), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "Dollar2VGrp" },
    ],
    ip: 0, op: 90, st: 0, bm: 0
  });

  // ── SPARKLES (3 base) ──
  const spP = [[55, 75], [148, 72], [100, 55]];
  for (let i = 0; i < 3; i++) {
    const d = 22 + i * 5;
    L.push({
      ddd: 0, ind: 200 + i, ty: 4, nm: "Sp" + (i + 1), sr: 1,
      ks: {
        o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 5, s: [100] }, { ...io, t: d + 15, s: [0] }, { ...io, t: 55 + i * 7, s: [0] }, { ...io, t: 60 + i * 7, s: [100] }, { ...io, t: 70 + i * 7, s: [0] }, { t: 90, s: [0] }] },
        r: { a: 1, k: [{ t: 0, s: [i * 40] }, { t: 90, s: [i * 40 + 180] }] },
        p: { a: 0, k: [spP[i][0], spP[i][1], 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { ...io3, t: d + 5, s: [100, 100, 100] }, { t: d + 15, s: [0, 0, 100] }] }
      },
      ao: 0,
      shapes: [{ ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 4 }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: 3 }, is: { a: 0, k: 0 }, or: { a: 0, k: 7 }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" }, mf(tc.sparkle)],
      ip: 0, op: 90, st: 0, bm: 0
    });
  }

  // ── EXTRA SPARKLES (tier 3) ──
  const exSpP = [[48, 82], [155, 78], [65, 58], [138, 62]];
  for (let i = 0; i < tc.extraSparkles; i++) {
    const d = 20 + i * 4;
    L.push({
      ddd: 0, ind: 300 + i, ty: 4, nm: "ExSp" + (i + 1), sr: 1,
      ks: {
        o: { a: 1, k: [{ ...io, t: d, s: [0] }, { ...io, t: d + 4, s: [100] }, { ...io, t: d + 12, s: [0] }, { ...io, t: 58 + i * 5, s: [0] }, { ...io, t: 62 + i * 5, s: [100] }, { ...io, t: 70 + i * 5, s: [0] }, { t: 90, s: [0] }] },
        r: { a: 1, k: [{ t: 0, s: [i * 60] }, { t: 90, s: [i * 60 + 200] }] },
        p: { a: 0, k: [exSpP[i % exSpP.length][0], exSpP[i % exSpP.length][1], 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ ...io3, t: d, s: [0, 0, 100] }, { ...io3, t: d + 4, s: [120, 120, 100] }, { t: d + 12, s: [0, 0, 100] }] }
      },
      ao: 0,
      shapes: [{ ty: "sr", sy: 1, d: 1, pt: { a: 0, k: 4 }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, ir: { a: 0, k: 2 }, is: { a: 0, k: 0 }, or: { a: 0, k: 5 }, os: { a: 0, k: 0 }, ix: 1, nm: "Star" }, mf(tc.sparkle)],
      ip: 0, op: 90, st: 0, bm: 0
    });
  }

  // ── PULSE RING (tier 2+) ──
  if (tc.pulse) {
    L.push({
      ddd: 0, ind: 998, ty: 4, nm: "Pulse", sr: 1,
      ks: {
        o: { a: 1, k: [{ ...io, t: 18, s: [0] }, { ...io, t: 22, s: [30] }, { ...io, t: 32, s: [0] }, { ...io, t: 58, s: [0] }, { ...io, t: 62, s: [30] }, { ...io, t: 72, s: [0] }, { t: 90, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, bY + 5, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ ...io3, t: 18, s: [60, 60, 100] }, { ...io3, t: 32, s: [130, 130, 100] }, { ...io3, t: 58, s: [60, 60, 100] }, { t: 72, s: [130, 130, 100] }] }
      },
      ao: 0,
      shapes: [{ ty: "el", d: 1, s: { a: 0, k: [80, 80] }, p: { a: 0, k: [0, 0] }, nm: "Ring" }, ms(tc.pulseColor, 2.5)],
      ip: 0, op: 90, st: 0, bm: 0
    });
  }

  return { v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: tc.nm, ddd: 0, assets: [], layers: L, markers: [] };
}

const outDir = path.join(__dirname, '..', 'assets', 'lottie', 'trophies');
const prevDir = 'C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir, { recursive: true });

const files = { base: 'seasonal_dia_estudante', t2: 'seasonal_dia_estudante_t2', t3: 'seasonal_dia_estudante_t3' };
for (const [tier, fname] of Object.entries(files)) {
  const anim = buildAnim(TIERS[tier]);
  const j = JSON.stringify(anim);
  fs.writeFileSync(path.join(outDir, fname + '.json'), j);
  try { fs.writeFileSync(path.join(prevDir, fname + '.json'), j); } catch (e) { console.warn('Preview copy failed:', e.message); }
  console.log(fname + '.json:', anim.layers.length, 'layers');
}
console.log("Done: seasonal_dia_estudante (Bronze + Prata + Ouro)");
