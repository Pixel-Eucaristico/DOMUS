#!/usr/bin/env node
// V1: Bandeira do Brasil ondulando + moeda R$ dourada
// Conceito: bandeira cai com bounce, ondula suavemente no idle, moeda aparece em cima com brilho

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

function makeSp(x,y,t,c=[1,.843,0,1]) {
  return {
    ddd:0, ind:300+Math.floor(x+y*3), ty:4, nm:"Sp", sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+5,[100]),io(t+14,[0]),io(t+32,[0]),io(t+37,[100]),io(t+46,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[0]},{t:90,s:[200]}]},
      p:{a:0,k:[x,y,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+5,[100,100,100]),{t:t+14,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"S"},
      mf(c)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

// Moeda R$ no topo
const coin = {
  ddd:0, ind:50, ty:4, nm:"Coin", sr:1,
  ks:{
    o:{a:1,k:[io(18,[0]),{t:22,s:[100]}]},
    r:{a:1,k:[{t:18,s:[-15]},{t:24,s:[5]},{t:45,s:[-2]},{t:67,s:[3]},{t:90,s:[-2]}]},
    p:{a:1,k:[
      io(18,[100,50,0]),
      io(26,[100,46,0]),
      io(45,[100,44,0]),
      io(67,[100,48,0]),
      {t:90,s:[100,44,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(18,[0,0,100]),io3(22,[130,130,100]),{t:26,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[22,22]},p:{a:0,k:[0,0]},nm:"C"},
    mf([1,.843,0,1]),
    ms([0.85,0.65,0,1],1.5),
    // R$
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-3,-6],[-3,6],[-3,0],[3,0],[5,-2],[5,-5],[-3,-5]],
      i:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
      c:false
    }},nm:"R"},
    ms([0.6,0.4,0,1],1.2)
  ],
  ip:0,op:90,st:0,bm:0
};

// Bandeira: verde + losango amarelo + círculo azul + faixa branca
// Tudo como um grupo animado
const flagGreen = {
  ddd:0, ind:10, ty:4, nm:"FlagGreen", sr:1,
  ks:{
    o:{a:1,k:[io(0,[0]),{t:8,s:[100]}]},
    r:{a:1,k:[{t:0,s:[-8]},{t:12,s:[2]},{t:16,s:[-1]},{t:20,s:[0]},{t:45,s:[-1]},{t:67,s:[1]},{t:90,s:[-1]}]},
    p:{a:1,k:[
      io(0,[100,160,0]),
      io(12,[100,110,0]),
      io(16,[100,104,0]),
      io(20,[100,107,0]),
      io(45,[100,104,0]),
      io(67,[100,110,0]),
      {t:90,s:[100,104,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },
  ao:0,
  shapes:[
    // Fundo verde
    {ty:"rc",d:1,s:{a:0,k:[72,48]},p:{a:0,k:[0,0]},r:{a:0,k:4},nm:"Bg"},
    mf([0,0.608,0.227,1]),
    ms([0,0.45,0.18,1],1.5),
    // Losango amarelo (usando shape path)
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[0,-17],[30,0],[0,17],[-30,0]],
      i:[[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"Diamond"},
    mf([0.992,0.875,0,1]),
    // Círculo azul
    {ty:"el",d:1,s:{a:0,k:[24,24]},p:{a:0,k:[0,0]},nm:"Circle"},
    mf([0,0.153,0.463,1]),
    // Faixa branca diagonal
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-16,-2],[16,-2],[16,2],[-16,2]],
      i:[[0,0],[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0],[0,0]],
      c:true
    }},nm:"Band"},
    mf([1,1,1,1]),
    // Estrela central
    {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:90},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:8},os:{a:0,k:0},ix:1,nm:"Star"},
    mf([1,1,1,1])
  ],
  ip:0,op:90,st:0,bm:0
};

// Brilho verde
const glow = {
  ddd:0, ind:1, ty:4, nm:"Glow", sr:1,
  ks:{
    o:{a:1,k:[io(0,[8]),io(45,[20]),{t:90,s:[8]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,100,0]}, a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[75,75,100]),io3(45,[100,100,100]),{t:90,s:[75,75,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},
    mf([0.85,0.97,0.85,1])
  ],
  ip:0,op:90,st:0,bm:0
};

const sparkles = [
  makeSp(60,45,22,[1,.843,0,1]),
  makeSp(145,42,28,[0,0.608,0.227,1]),
  makeSp(152,125,34,[1,.843,0,1]),
  makeSp(54,138,30,[0,0.153,0.463,1]),
];

const lottie = {
  v:"5.7.4", fr:30, ip:0, op:90, w:200, h:200,
  nm:"Independência Financeira V1", ddd:0, assets:[], markers:[],
  layers:[...sparkles, coin, flagGreen, glow]
};

const fs = require('fs'), path = require('path');
const out = JSON.stringify(lottie);
['../assets/lottie/trophies/seasonal_independencia_v1.json',
 '../../DOMUS-Rive-Preview/public/assets/lottie/trophies/seasonal_independencia_v1.json'
].forEach(p => { fs.writeFileSync(path.join(__dirname,p), out); console.log('✅',p); });
