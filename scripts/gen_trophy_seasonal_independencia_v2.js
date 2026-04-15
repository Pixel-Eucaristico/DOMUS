#!/usr/bin/env node
// V2: Escudo com cores do Brasil + seta subindo (independência financeira)
// Conceito: escudo aparece com bounce, seta cresce de baixo, estrelas giram ao redor

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

function makeSp(x,y,t,c) {
  return {
    ddd:0, ind:300+Math.floor(x*2+y), ty:4, nm:"Sp", sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+5,[100]),io(t+14,[0]),io(t+30,[0]),io(t+35,[100]),io(t+44,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[10]},{t:90,s:[190]}]},
      p:{a:0,k:[x,y,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+5,[100,100,100]),{t:t+14,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:8},os:{a:0,k:0},ix:1,nm:"S"},
      mf(c)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

// Seta crescendo (animada do baixo para cima)
const arrow = {
  ddd:0, ind:60, ty:4, nm:"Arrow", sr:1,
  ks:{
    o:{a:1,k:[io(22,[0]),{t:26,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(22,[100,112,0]),
      io(45,[100,108,0]),
      io(67,[100,114,0]),
      {t:90,s:[100,108,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(22,[100,0,100]),io3(30,[100,110,100]),{t:36,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Haste
    {ty:"rc",d:1,s:{a:0,k:[4,22]},p:{a:0,k:[0,5]},r:{a:0,k:2},nm:"Stem"},
    mf([1,.843,0,1]),
    // Ponta (triângulo)
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[0,-16],[7,-6],[-7,-6]],
      i:[[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0]],
      c:true
    }},nm:"Head"},
    mf([1,.843,0,1]),
    // Sombra/borda
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[0,-16],[7,-6],[-7,-6]],
      i:[[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0]],
      c:true
    }},nm:"HeadBrd"},
    ms([0.85,0.65,0,1],1)
  ],
  ip:0,op:90,st:0,bm:0
};

// Escudo com 3 faixas: verde/amarelo/azul
const shield = {
  ddd:0, ind:10, ty:4, nm:"Shield", sr:1,
  ks:{
    o:{a:1,k:[io(0,[0]),{t:6,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(0,[100,20,0]),
      io(10,[100,103,0]),
      io(15,[100,95,0]),
      io(20,[100,99,0]),
      io(45,[100,96,0]),
      io(67,[100,102,0]),
      {t:90,s:[100,96,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(8,[100,100,100]),io3(12,[108,108,100]),{t:16,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Escudo shape
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-28,-30],[28,-30],[28,10],[0,32],[-28,10]],
      i:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"ShieldBg"},
    mf([0,0.608,0.227,1]),
    // Faixa central amarela
    {ty:"rc",d:1,s:{a:0,k:[56,18]},p:{a:0,k:[0,-5]},r:{a:0,k:0},nm:"YellowBand"},
    mf([0.992,0.875,0,1]),
    // Círculo azul
    {ty:"el",d:1,s:{a:0,k:[26,26]},p:{a:0,k:[0,-5]},nm:"BlueCircle"},
    mf([0,0.153,0.463,1]),
    // Borda escudo
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-28,-30],[28,-30],[28,10],[0,32],[-28,10]],
      i:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"ShieldBrd"},
    ms([0,0.35,0.12,1],2)
  ],
  ip:0,op:90,st:0,bm:0
};

// Estrelas girando ao redor (3 pontos)
function makeOrbitStar(angleOffset, startFrame) {
  const ind = 200 + angleOffset;
  return {
    ddd:0, ind, ty:4, nm:`OrbitStar_${ind}`, sr:1,
    ks:{
      o:{a:1,k:[io(startFrame,[0]),{t:startFrame+6,s:[100]}]},
      r:{a:1,k:[{t:0,s:[angleOffset]},{t:90,s:[angleOffset+360]}]},
      p:{a:0,k:[100,100,0]},
      a:{a:0,k:[0,38,0]},
      s:{a:1,k:[io3(startFrame,[0,0,100]),{t:startFrame+8,s:[100,100,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:9},os:{a:0,k:0},ix:1,nm:"S"},
      mf([1,.843,0,1])
    ],
    ip:0,op:90,st:0,bm:0
  };
}

const orbitStars = [makeOrbitStar(0,30), makeOrbitStar(120,34), makeOrbitStar(240,38)];

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
    mf([0.82,0.95,0.87,1])
  ],
  ip:0,op:90,st:0,bm:0
};

const sparkles = [
  makeSp(55,48,24,[1,.843,0,1]),
  makeSp(148,44,30,[0,0.608,0.227,1]),
  makeSp(155,140,36,[1,.843,0,1]),
];

const lottie = {
  v:"5.7.4", fr:30, ip:0, op:90, w:200, h:200,
  nm:"Independência Financeira V2", ddd:0, assets:[], markers:[],
  layers:[...sparkles, ...orbitStars, arrow, shield, glow]
};

const fs = require('fs'), path = require('path');
const out = JSON.stringify(lottie);
['../assets/lottie/trophies/seasonal_independencia_v2.json',
 '../../DOMUS-Rive-Preview/public/assets/lottie/trophies/seasonal_independencia_v2.json'
].forEach(p => { fs.writeFileSync(path.join(__dirname,p), out); console.log('✅',p); });
