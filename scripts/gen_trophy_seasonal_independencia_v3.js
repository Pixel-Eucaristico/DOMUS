#!/usr/bin/env node
// V3: Troféu com losango amarelo + estrela grande + fogos de artifício
// Conceito: troféu com diamante Brasil entra rotacionando, fogos explodem em verde/amarelo/azul

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

// Partícula de fogo explodindo
function makeFirework(x, y, t, c, pts=4) {
  const ind = 400 + Math.floor(x*3+y+t);
  return {
    ddd:0, ind, ty:4, nm:`Fw_${ind}`, sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+3,[100]),io(t+14,[100]),io(t+22,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:t,s:[0]},{t:t+22,s:[180]}]},
      p:{a:1,k:[io(t,[x,y,0]),{t:t+22,s:[x+(Math.random()>0.5?18:-15),y-20,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+4,[100,100,100]),{t:t+22,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:pts},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:9},os:{a:0,k:0},ix:1,nm:"S"},
      mf(c)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

const fireworks = [
  // Primeira rajada
  makeFirework(72, 48, 26, [0,0.608,0.227,1], 4),
  makeFirework(128, 44, 28, [0.992,0.875,0,1], 5),
  makeFirework(145, 70, 30, [0,0.153,0.463,1], 4),
  makeFirework(55, 72, 27, [1,1,1,1], 5),
  makeFirework(100, 42, 29, [1,.843,0,1], 4),
  // Segunda rajada
  makeFirework(68, 50, 54, [1,.843,0,1], 5),
  makeFirework(134, 46, 56, [0,0.608,0.227,1], 4),
  makeFirework(148, 75, 58, [0.992,0.875,0,1], 5),
  makeFirework(52, 68, 55, [0,0.153,0.463,1], 4),
];

// Estrela grande girando no centro (decoração)
const bigStar = {
  ddd:0, ind:30, ty:4, nm:"BigStarBg", sr:1,
  ks:{
    o:{a:1,k:[io(12,[0]),io(18,[35]),io(45,[25]),io(67,[35]),{t:90,s:[25]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[90]}]},
    p:{a:1,k:[
      io(45,[100,103,0]),
      io(67,[100,109,0]),
      {t:90,s:[100,103,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },
  ao:0,
  shapes:[
    {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:28},is:{a:0,k:0},or:{a:0,k:55},os:{a:0,k:0},ix:1,nm:"S"},
    mf([0.992,0.875,0,.15])
  ],
  ip:0,op:90,st:0,bm:0
};

// Troféu principal com cores do Brasil
const trophy = {
  ddd:0, ind:10, ty:4, nm:"Trophy", sr:1,
  ks:{
    o:{a:1,k:[io(0,[0]),{t:8,s:[100]}]},
    r:{a:1,k:[{t:0,s:[-180]},{t:14,s:[8]},{t:18,s:[-2]},{t:22,s:[0]},{t:45,s:[-1]},{t:67,s:[2]},{t:90,s:[-1]}]},
    p:{a:1,k:[
      io(0,[100,100,0]),
      io(14,[100,103,0]),
      io(18,[100,97,0]),
      io(22,[100,100,0]),
      io(45,[100,97,0]),
      io(67,[100,103,0]),
      {t:90,s:[100,97,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(10,[80,80,100]),io3(14,[108,108,100]),{t:18,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Copa
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-22,-22],[22,-22],[18,8],[0,22],[-18,8]],
      i:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"Cup"},
    mf([0,0.608,0.227,1]),
    // Losango amarelo na copa
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[0,-14],[16,-3],[0,10],[-16,-3]],
      i:[[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"Diamond"},
    mf([0.992,0.875,0,1]),
    // Círculo azul na copa
    {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,-3]},nm:"BlueCirc"},
    mf([0,0.153,0.463,1]),
    // Estrela branca
    {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,-3]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"StarW"},
    mf([1,1,1,1]),
    // Haste
    {ty:"rc",d:1,s:{a:0,k:[8,12]},p:{a:0,k:[0,18]},r:{a:0,k:2},nm:"Stem"},
    mf([0.992,0.875,0,1]),
    // Base
    {ty:"rc",d:1,s:{a:0,k:[28,6]},p:{a:0,k:[0,26]},r:{a:0,k:3},nm:"Base"},
    mf([0.992,0.875,0,1]),
    // Alças
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-22,-22],[-28,-12],[-22,-5]],
      i:[[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0]],
      c:false
    }},nm:"H1"},
    ms([0,0.608,0.227,1],3),
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[22,-22],[28,-12],[22,-5]],
      i:[[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0]],
      c:false
    }},nm:"H2"},
    ms([0,0.608,0.227,1],3),
    // Borda
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-22,-22],[22,-22],[18,8],[0,22],[-18,8]],
      i:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"CupBrd"},
    ms([0,0.35,0.12,1],1.5)
  ],
  ip:0,op:90,st:0,bm:0
};

// Glow
const glow = {
  ddd:0, ind:1, ty:4, nm:"Glow", sr:1,
  ks:{
    o:{a:1,k:[io(0,[8]),io(45,[22]),{t:90,s:[8]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,100,0]}, a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[75,75,100]),io3(45,[100,100,100]),{t:90,s:[75,75,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[132,132]},p:{a:0,k:[0,0]},nm:"G"},
    mf([0.85,0.97,0.87,1])
  ],
  ip:0,op:90,st:0,bm:0
};

const lottie = {
  v:"5.7.4", fr:30, ip:0, op:90, w:200, h:200,
  nm:"Independência Financeira V3", ddd:0, assets:[], markers:[],
  layers:[...fireworks, bigStar, trophy, glow]
};

const fs = require('fs'), path = require('path');
const out = JSON.stringify(lottie);
['../assets/lottie/trophies/seasonal_independencia_v3.json',
 '../../DOMUS-Rive-Preview/public/assets/lottie/trophies/seasonal_independencia_v3.json'
].forEach(p => { fs.writeFileSync(path.join(__dirname,p), out); console.log('✅',p); });
