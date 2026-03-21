const fs = require('fs');
const { body: capBody, top: capTop } = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-graduation.json'));
const dollar = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts.json')).dollar;

const tierColors = {
  1: { cap: [0.804,0.498,0.196,1], capStroke: [0.6,0.35,0.1,1], coin: [0.7,0.45,0.15,1], coinStroke: [0.5,0.3,0.1,1], dollarC: [0.45,0.25,0.05,1], tassel: [0.6,0.35,0.1,1], glow: [0.804,0.498,0.196,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { cap: [0.75,0.75,0.78,1], capStroke: [0.55,0.55,0.6,1], coin: [0.65,0.65,0.7,1], coinStroke: [0.45,0.45,0.5,1], dollarC: [0.35,0.35,0.4,1], tassel: [0.55,0.55,0.6,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { cap: [0.15,0.15,0.2,1], capStroke: [0.1,0.1,0.15,1], coin: [1,0.843,0,1], coinStroke: [0.855,0.647,0.125,1], dollarC: [0.6,0.4,0.05,1], tassel: [1,0.843,0,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { cap: [0.1,0.15,0.25,1], capStroke: [0.05,0.1,0.2,1], coin: [0.31,0.765,0.969,1], coinStroke: [0.2,0.55,0.8,1], dollarC: [0.1,0.35,0.6,1], tassel: [0.31,0.765,0.969,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e = (x,y) => ({x:[x],y:[y]});
const io = {i:e(.667,1),o:e(.333,0)};
const io3 = {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0, 2:1, 3:3, 4:5}[tier];
  const confCount = c.conf.length;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2, 2:3, 3:4, 4:5}[tier];
  const bounceH = {1:8, 2:12, 3:15, 4:18}[tier];
  const capY = 65; // vertical center for cap
  const coinY = capY + 28; // coin below cap

  // Float keyframes helper
  const floatKF = (baseY, startFrame) => [
    {i:{x:.667,y:1},o:{x:.333,y:0},t:startFrame,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sparklePos = [[35,30],[165,25],[100,18],[50,22],[150,35]];
  for (let i = 0; i < sparkleCount; i++) {
    const p = sparklePos[i], d = 28 + i * 4;
    const sz = tier === 4 ? 9 : 7;
    layers.push({
      ddd:0, ind:200+i, ty:4, nm:'Sp'+(i+1), sr:1,
      ks: {
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},
        r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},
        p:{a:0,k:[p[0],p[1],0]}, a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}
      },
      ao:0, shapes:[
        {ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'Star'},
        {ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}
      ], ip:0, op:90, st:0, bm:0
    });
  }

  // ── TASSEL (borla pendular from cap) ──
  const tasselAnchorX = 22, tasselLen = 15;
  layers.push({
    ddd:0, ind:14, ty:4, nm:'Tassel', sr:1,
    ks: {
      o:{a:1,k:[{...io,t:10,s:[0]},{t:16,s:[100]}]},
      r:{a:1,k:[
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:10,s:[30]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:20,s:[-20]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:30,s:[15]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:40,s:[-10]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:50,s:[8]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:60,s:[-5]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:70,s:[3]},
        {t:90,s:[0]}
      ]},
      p:{a:1,k:floatKF(capY - 2, 16)},
      a:{a:0,k:[0,-2,0]}, s:{a:0,k:[100,100,100]}
    },
    ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:{v:[[tasselAnchorX,0],[tasselAnchorX,tasselLen]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Str'},
      {ty:'st',c:{a:0,k:c.tassel},o:{a:0,k:100},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'S'},
      {ty:'el',d:1,s:{a:0,k:[6,6]},p:{a:0,k:[tasselAnchorX,tasselLen+3]},nm:'Ball'},
      {ty:'fl',c:{a:0,k:c.tassel},o:{a:0,k:100},r:1,bm:0,nm:'F'}
    ], ip:0, op:90, st:0, bm:0
  });

  // ── GRADUATION CAP (SVG real) ──
  layers.push({
    ddd:0, ind:10, ty:4, nm:'Cap', sr:1,
    ks: {
      o:{a:0,k:100}, r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,-20,0],to:[0,15,0],ti:[0,-15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,capY+bounceH,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,capY-bounceH/2,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(capY, 16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:capTop},nm:'Top'},
      {ty:'sh',d:1,ks:{a:0,k:capBody},nm:'Body'},
      {ty:'st',c:{a:0,k:c.capStroke},o:{a:0,k:100},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'S'},
      {ty:'fl',c:{a:0,k:c.cap},o:{a:0,k:100},r:1,bm:0,nm:'F'}
    ], ip:0, op:90, st:0, bm:0
  });

  // ── COIN (moeda dourada) ──
  const coinSize = {1:34, 2:36, 3:38, 4:42}[tier];
  layers.push({
    ddd:0, ind:11, ty:4, nm:'Coin', sr:1,
    ks: {
      o:{a:1,k:[{...io,t:8,s:[0]},{t:14,s:[100]}]},
      r:{a:0,k:0},
      p:{a:1,k:floatKF(coinY, 16)},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[0,0,100]},{...io3,t:14,s:[115,115,100]},{t:18,s:[100,100,100]}]}
    },
    ao:0, shapes:[
      {ty:'el',d:1,s:{a:0,k:[coinSize,coinSize]},p:{a:0,k:[0,0]},nm:'C'},
      {ty:'st',c:{a:0,k:c.coinStroke},o:{a:0,k:100},w:{a:0,k:2},lc:1,lj:1,ml:4,bm:0,nm:'S'},
      {ty:'fl',c:{a:0,k:c.coin},o:{a:0,k:100},r:1,bm:0,nm:'F'}
    ], ip:0, op:90, st:0, bm:0
  });

  // ── DOLLAR SIGN inside coin ──
  const dollarScale = coinSize / 50; // scale dollar to fit coin
  layers.push({
    ddd:0, ind:12, ty:4, nm:'Dollar', sr:1,
    ks: {
      o:{a:1,k:[{...io,t:14,s:[0]},{t:20,s:[100]}]},
      r:{a:0,k:0},
      p:{a:1,k:floatKF(coinY, 16)},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:14,s:[0,0,100]},{...io3,t:18,s:[120,120,100]},{t:22,s:[dollarScale*100,dollarScale*100,100]}]}
    },
    ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:dollar},nm:'$'},
      {ty:'st',c:{a:0,k:c.dollarC},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'S'},
      // Vertical line
      {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-12],[0,12]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Line'},
      {ty:'st',c:{a:0,k:c.dollarC},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'LS'}
    ], ip:0, op:90, st:0, bm:0
  });

  // ── GLOW ──
  if (hasGlow) {
    const pulseMin = tier === 4 ? 10 : 12;
    const pulseMax = tier === 4 ? 35 : 25;
    layers.push({
      ddd:0, ind:1, ty:4, nm:'Glow', sr:1,
      ks: {
        o:{a:1,k:[{...io,t:0,s:[pulseMin]},{...io,t:45,s:[pulseMax]},{t:90,s:[pulseMin]}]},
        r:{a:0,k:0}, p:{a:0,k:[100,85,0]}, a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}
      },
      ao:0, shapes:[
        {ty:'el',d:1,s:{a:0,k:[140,140]},p:{a:0,k:[0,0]},nm:'G'},
        {ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}
      ], ip:0, op:90, st:0, bm:0
    });
  }

  // ── BORDER GLOW (tier 4) ──
  if (hasBorderGlow) {
    layers.push({
      ddd:0, ind:2, ty:4, nm:'BorderGlow', sr:1,
      ks: {
        o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},
        r:{a:0,k:0}, p:{a:0,k:[100,85,0]}, a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}
      },
      ao:0, shapes:[
        {ty:'el',d:1,s:{a:0,k:[130,140]},p:{a:0,k:[0,0]},nm:'BG'},
        {ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}
      ], ip:0, op:90, st:0, bm:0
    });
  }

  // ── CONFETTI ──
  const confPos = [[45,35],[155,30],[65,55],[135,50],[35,45],[165,40]];
  for (let i = 0; i < confCount; i++) {
    const cp = confPos[i % confPos.length];
    const d = 18 + i * 2;
    layers.push({
      ddd:0, ind:300+i, ty:4, nm:'Conf'+(i+1), sr:1,
      ks: {
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},
        r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,75,0],to:[(cp[0]-100)/10,(cp[1]-75)/10,0],ti:[0,0,0]},
          {t:d+18,s:[cp[0],cp[1],0]}
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}
      },
      ao:0, shapes:[
        {ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},
        {ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}
      ], ip:0, op:90, st:0, bm:0
    });
  }

  return {
    v:'5.7.4', fr:30, ip:0, op:90, w:200, h:200,
    nm:'Financial Master T'+tier, ddd:0, assets:[], layers, markers:[]
  };
}

for (let t = 1; t <= 4; t++) {
  const anim = createTier(t);
  const j = JSON.stringify(anim);
  fs.writeFileSync(__dirname + '/../assets/lottie/trophies/level_10_t' + t + '.json', j);
  try { fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_10_t' + t + '.json', j); } catch {}
  console.log('T' + t + ':', anim.layers.length, 'layers');
}
const base = createTier(3);
base.nm = 'Financial Master';
const bj = JSON.stringify(base);
fs.writeFileSync(__dirname + '/../assets/lottie/trophies/level_10.json', bj);
try { fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_10.json', bj); } catch {}
console.log('Done!');
