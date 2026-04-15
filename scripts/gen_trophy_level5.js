const fs = require('fs');
const verts = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-planner.json'));

const tierColors = {
  1: { bars: [0.804,0.498,0.196,1], axis: [0.55,0.35,0.15,1], star: [0.804,0.498,0.196,1], glow: [0.804,0.498,0.196,1], sparkle: [1,0.75,0.35,1], text: [0.55,0.3,0.1,1] },
  2: { bars: [0.75,0.75,0.8,1], axis: [0.55,0.55,0.6,1], star: [0.82,0.82,0.85,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], text: [0.45,0.45,0.5,1] },
  3: { bars: [1,0.75,0.1,1], axis: [0.6,0.5,0.2,1], star: [1,0.843,0,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], text: [0.6,0.4,0.05,1] },
  4: { bars: [0.31,0.6,0.9,1], axis: [0.2,0.4,0.65,1], star: [0.31,0.765,0.969,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], text: [0.1,0.35,0.6,1] },
};
const sparkleCount = { 1: 0, 2: 1, 3: 3, 4: 5 };
const confettiCount = { 1: 0, 2: 0, 3: 4, 4: 6 };
const io = { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } };
const io3 = { i: { x: [0.667,0.667,0.667], y: [1,1,1] }, o: { x: [0.333,0.333,0.333], y: [0,0,0] } };

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];

  // GLOW (tier 2+)
  if (tier >= 2) {
    const go = tier === 4 ? 25 : tier === 3 ? 15 : 8;
    layers.push({
      ddd:0, ind:100, ty:4, nm:'Glow', sr:1,
      ks: { o: { a:1, k:[{...io,t:0,s:[go-5]},{...io,t:45,s:[go+10]},{t:90,s:[go-5]}] },
        r:{a:0,k:0}, p:{a:0,k:[100,100,0]}, a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:0,s:[85,85,100]},{...io3,t:45,s:[105,105,100]},{t:90,s:[85,85,100]}]}
      }, ao:0, shapes:[
        {ty:'el',d:1,s:{a:0,k:[150,150]},p:{a:0,k:[0,0]},nm:'G'},
        {ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:go},r:1,bm:0,nm:'F'}
      ], ip:0,op:90,st:0,bm:0
    });
  }

  // BORDER GLOW (tier 3+)
  if (tier >= 3) {
    layers.push({
      ddd:0, ind:99, ty:4, nm:'BorderGlow', sr:1,
      ks: { o:{a:1,k:[{...io,t:0,s:[25]},{...io,t:45,s:[50]},{t:90,s:[25]}]},
        r:{a:0,k:0}, p:{a:0,k:[100,100,0]}, a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:0,s:[92,92,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[92,92,100]}]}
      }, ao:0, shapes:[
        {ty:'el',d:1,s:{a:0,k:[140,140]},p:{a:0,k:[0,0]},nm:'BG'},
        {ty:'st',c:{a:0,k:c.glow},o:{a:0,k:35},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}
      ], ip:0,op:90,st:0,bm:0
    });
  }

  // AXIS
  layers.push({
    ddd:0, ind:50, ty:4, nm:'Axis', sr:1,
    ks: { o:{a:1,k:[{...io,t:0,s:[0]},{t:8,s:[100]}]},
      r:{a:0,k:0}, p:{a:0,k:[100,105,0]}, a:{a:0,k:[0,0,0]}, s:{a:0,k:[100,100,100]}
    }, ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:verts.axis},nm:'Ax'},
      {ty:'fl',c:{a:0,k:c.axis},o:{a:0,k:100},r:1,bm:0,nm:'F'}
    ], ip:0,op:90,st:0,bm:0
  });

  // BAR 1 (tallest left) — grows up
  layers.push({
    ddd:0, ind:40, ty:4, nm:'Bar1', sr:1,
    ks: { o:{a:0,k:100},
      r:{a:0,k:0}, p:{a:0,k:[100,105,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:5,s:[100,0,100]},{...io3,t:18,s:[100,110,100]},{t:22,s:[100,100,100]}]}
    }, ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:verts.bar1},nm:'B1'},
      {ty:'fl',c:{a:0,k:c.bars},o:{a:0,k:80},r:1,bm:0,nm:'F'}
    ], ip:0,op:90,st:0,bm:0
  });

  // BAR 2 (middle, tallest)
  layers.push({
    ddd:0, ind:41, ty:4, nm:'Bar2', sr:1,
    ks: { o:{a:0,k:100},
      r:{a:0,k:0}, p:{a:0,k:[100,105,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:10,s:[100,0,100]},{...io3,t:23,s:[100,110,100]},{t:27,s:[100,100,100]}]}
    }, ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:verts.bar2},nm:'B2'},
      {ty:'fl',c:{a:0,k:c.bars},o:{a:0,k:100},r:1,bm:0,nm:'F'}
    ], ip:0,op:90,st:0,bm:0
  });

  // BAR 3 (right, shortest)
  layers.push({
    ddd:0, ind:42, ty:4, nm:'Bar3', sr:1,
    ks: { o:{a:0,k:100},
      r:{a:0,k:0}, p:{a:0,k:[100,105,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:15,s:[100,0,100]},{...io3,t:28,s:[100,110,100]},{t:32,s:[100,100,100]}]}
    }, ao:0, shapes:[
      {ty:'sh',d:1,ks:{a:0,k:verts.bar3},nm:'B3'},
      {ty:'fl',c:{a:0,k:c.bars},o:{a:0,k:60},r:1,bm:0,nm:'F'}
    ], ip:0,op:90,st:0,bm:0
  });

  // STAR on top of bar2 (tier 2+)
  if (tier >= 2) {
    const starY = -25; // above the tallest bar
    layers.unshift({
      ddd:0, ind:30, ty:4, nm:'Star', sr:1,
      ks: { o:{a:1,k:[{...io,t:25,s:[0]},{t:32,s:[100]}]},
        r:{a:1,k:[{...io,t:25,s:[-30]},{t:35,s:[0]},{...io,t:60,s:[5]},{...io,t:75,s:[-5]},{t:90,s:[5]}]},
        p:{a:1,k:[
          {...{i:{x:.5,y:1},o:{x:.5,y:0}},t:25,s:[100,starY-20,0],to:[0,3,0],ti:[0,-3,0]},
          {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:32,s:[100,starY,0],to:[0,0,0],ti:[0,0,0]},
          {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:55,s:[100,starY-3,0],to:[0,0,0],ti:[0,0,0]},
          {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:72,s:[100,starY+3,0],to:[0,0,0],ti:[0,0,0]},
          {t:90,s:[100,starY-3,0]}
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:25,s:[0,0,100]},{...io3,t:30,s:[130,130,100]},{t:35,s:[100,100,100]}]}
      }, ao:0, shapes:[
        {ty:'sr',sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},
         ir:{a:0,k:tier===4?6:5},is:{a:0,k:0},or:{a:0,k:tier===4?14:12},os:{a:0,k:0},ix:1,nm:'Star'},
        {ty:'fl',c:{a:0,k:c.star},o:{a:0,k:100},r:1,bm:0,nm:'F'}
      ], ip:0,op:90,st:0,bm:0
    });
  }

  // NUMBER "5" — pencil-drawn style text
  layers.unshift({
    ddd:0, ind:20, ty:4, nm:'Num5', sr:1,
    ks: { o:{a:1,k:[{...io,t:30,s:[0]},{t:38,s:[100]}]},
      r:{a:0,k:0}, p:{a:0,k:[100,115,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:30,s:[0,0,100]},{...io3,t:36,s:[120,120,100]},{t:40,s:[100,100,100]}]}
    }, ao:0, shapes:[
      // "5" as path
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[4,-7],[-4,-7],[-4,-1],[2,-1],[4,1],[4,4],[2,7],[-4,7]],
        i:[[0,0],[0,0],[0,0],[0,0],[-2,0],[0,-2],[2,0],[0,0]],
        o:[[0,0],[0,0],[0,0],[2,0],[0,2],[0,2],[-2,0],[0,0]],
        c:false
      }},nm:'5'},
      {ty:'st',c:{a:0,k:c.text},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'S'}
    ], ip:0,op:90,st:0,bm:0
  });

  // PENCIL (small, tilted)
  layers.unshift({
    ddd:0, ind:15, ty:4, nm:'Pencil', sr:1,
    ks: { o:{a:1,k:[{...io,t:20,s:[0]},{t:28,s:[100]}]},
      r:{a:1,k:[
        {...io,t:20,s:[-60]},
        {...io,t:30,s:[-30]},
        {...io,t:42,s:[-20]},
        {...io,t:54,s:[-35]},
        {...io,t:66,s:[-20]},
        {...io,t:78,s:[-35]},
        {t:90,s:[-20]}
      ]},
      p:{a:1,k:[
        {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:20,s:[65,60,0],to:[0,3,0],ti:[0,-3,0]},
        {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:30,s:[65,85,0],to:[0,0,0],ti:[0,0,0]},
        {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:42,s:[70,85,0],to:[0,0,0],ti:[0,0,0]},
        {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:54,s:[60,85,0],to:[0,0,0],ti:[0,0,0]},
        {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:66,s:[70,85,0],to:[0,0,0],ti:[0,0,0]},
        {...{i:{x:.667,y:1},o:{x:.333,y:0}},t:78,s:[60,85,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[70,85,0]}
      ]},
      a:{a:0,k:[0,10,0]},
      s:{a:1,k:[{...io3,t:20,s:[0,0,100]},{t:30,s:[100,100,100]}]}
    }, ao:0, shapes:[
      // Pencil body
      {ty:'rc',d:1,s:{a:0,k:[5,30]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'Body'},
      {ty:'fl',c:{a:0,k:[1,0.85,0.2,1]},o:{a:0,k:100},r:1,bm:0,nm:'FB'},
      // Pencil tip
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-2.5,15],[0,20],[2.5,15]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'Tip'},
      {ty:'fl',c:{a:0,k:[0.3,0.3,0.3,1]},o:{a:0,k:100},r:1,bm:0,nm:'FT'},
      // Eraser
      {ty:'rc',d:1,s:{a:0,k:[5,4]},p:{a:0,k:[0,-17]},r:{a:0,k:1},nm:'Eraser'},
      {ty:'fl',c:{a:0,k:[1,0.5,0.5,1]},o:{a:0,k:100},r:1,bm:0,nm:'FE'},
    ], ip:0,op:90,st:0,bm:0
  });

  // SPARKLES
  const sc = sparkleCount[tier];
  const spos = [[45,30],[155,25],[100,15],[50,60],[150,60]];
  for (let i = 0; i < sc; i++) {
    const p = spos[i], d = 28 + i*4, sz = tier===4?9:7;
    layers.unshift({
      ddd:0, ind:200+i, ty:4, nm:'Sp'+(i+1), sr:1,
      ks: { o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},
        r:{a:1,k:[{t:0,s:[i*45]},{t:90,s:[i*45+180]}]},
        p:{a:0,k:[p[0],p[1],0]}, a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}
      }, ao:0, shapes:[
        {ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'Star'},
        {ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}
      ], ip:0,op:90,st:0,bm:0
    });
  }

  // CONFETTI
  const cc = confettiCount[tier];
  const confColors = [[1,0.3,0.3,1],[1,0.85,0,1],[0.3,0.5,1,1],[0.3,0.8,0.4,1],[1,0.5,0.8,1],[0.6,0.4,1,1]];
  for (let i = 0; i < cc; i++) {
    const angle = (i / cc) * Math.PI * 2 + Math.PI/4;
    const dist = 55 + (i%2)*15;
    const ex = 100 + Math.cos(angle)*dist;
    const ey = 80 + Math.sin(angle)*dist;
    layers.push({
      ddd:0, ind:300+i, ty:4, nm:'Conf'+(i+1), sr:1,
      ks: { o:{a:1,k:[{...io,t:25,s:[0]},{...io,t:30,s:[100]},{...io,t:50,s:[0]},{t:90,s:[0]}]},
        r:{a:1,k:[{t:25,s:[0]},{t:50,s:[180+i*60]}]},
        p:{a:1,k:[{...{i:{x:.667,y:1},o:{x:.333,y:0}},t:25,s:[100,80,0],to:[0,0,0],ti:[0,0,0]},{t:50,s:[ex,ey,0]}]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:25,s:[0,0,100]},{...io3,t:30,s:[100,100,100]},{t:50,s:[50,50,100]}]}
      }, ao:0, shapes:[
        {ty:'rc',d:1,s:{a:0,k:[5,5]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},
        {ty:'fl',c:{a:0,k:confColors[i%confColors.length]},o:{a:0,k:100},r:1,bm:0,nm:'F'}
      ], ip:0,op:90,st:0,bm:0
    });
  }

  // Orbit removido — não combina com gráfico

  return { v:'5.7.4', fr:30, ip:0, op:90, w:200, h:200, nm:'Level 5 T'+tier, ddd:0, assets:[], layers, markers:[] };
}

for (let t = 1; t <= 4; t++) {
  const anim = createTier(t);
  const json = JSON.stringify(anim);
  fs.writeFileSync(__dirname + '/../assets/lottie/trophies/level_5_t' + t + '.json', json);
  fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_5_t' + t + '.json', json);
  console.log('T' + t + ':', anim.layers.length, 'layers');
}
const base = createTier(3);
base.nm = 'Level 5';
fs.writeFileSync(__dirname + '/../assets/lottie/trophies/level_5.json', JSON.stringify(base));
fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_5.json', JSON.stringify(base));
console.log('Done! Saved to assets + preview');
