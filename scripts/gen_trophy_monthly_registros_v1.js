#!/usr/bin/env node
// V1: Calendar com grid de checkmarks progressivos + estrela dourada
// Conceito: calendário caindo de cima, dots do grid aparecem como checks um a um, estrela dourada no final

const io = (t,s,v=[1]) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

// Helpers de posição e escala animadas
function makeSparkle(x, y, startFrame, color=[1,.843,0,1]) {
  return {
    ddd:0, ind: Math.floor(Math.random()*1000)+300, ty:4, nm:"Sp", sr:1,
    ks:{
      o:{a:1,k:[io(startFrame,[0]),io(startFrame+5,[100]),io(startFrame+15,[0]),io(startFrame+30+20,[0]),io(startFrame+35+20,[100]),io(startFrame+45+20,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[0]},{t:90,s:[180]}]},
      p:{a:0,k:[x,y,0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(startFrame,[0,0,100]),io3(startFrame+5,[100,100,100]),{t:startFrame+15,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},
      mf(color)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

// Cria um "mini check" em posição xy que aparece no frame t
function makeMiniCheck(x, y, t, color=[0.18,0.75,0.34,1]) {
  return {
    ddd:0, ind: 100+Math.floor(x+y), ty:4, nm:`Chk_${x}_${y}`, sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+4,[100]),{t:90,s:[100]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        io(t,[x,y+4,0]),
        io(t+5,[x,y,0]),
        {t:90,s:[x,y,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+4,[120,120,100]),{t:t+7,s:[100,100,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-3.5,-1],[-1,2],[3.5,-4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"V"},
      ms(color, 2.2)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

// Grid de checks 4x3 no calendário (aparecendo frame a frame)
// Calendário body: de x=75 a x=125, y=75 a y=145 (centro 100,100 → body +5 offset)
// Grid cells: 4 colunas, 3 linhas
const gridChecks = [];
const cols = 4, rows = 3;
const gridX0 = 79, gridY0 = 90, cellW = 12, cellH = 13;
let checkIdx = 0;
for(let row=0; row<rows; row++){
  for(let col=0; col<cols; col++){
    const cx = gridX0 + col*cellW + 6;
    const cy = gridY0 + row*cellH + 6;
    const startT = 20 + checkIdx * 3; // cada check aparece 3 frames depois
    // Cor: últimos 2 checks em dourado
    const color = checkIdx >= 10 ? [1,.843,0,1] : [0.18,0.75,0.34,1];
    gridChecks.push(makeMiniCheck(cx, cy, startT, color));
    checkIdx++;
  }
}

// Big star (troféu) aparece depois de todos os checks
const bigStar = {
  ddd:0, ind:16, ty:4, nm:"BigStar", sr:1,
  ks:{
    o:{a:1,k:[io(54,[0]),{t:58,s:[100]}]},
    r:{a:1,k:[{t:54,s:[-20]},{t:60,s:[5]},{t:75,s:[-3]},{t:90,s:[3]}]},
    p:{a:1,k:[
      io(54,[100,64,0]),
      io(67,[100,60,0]),
      {t:90,s:[100,64,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(54,[0,0,100]),io3(57,[140,140,100]),{t:60,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:6},is:{a:0,k:0},or:{a:0,k:14},os:{a:0,k:0},ix:1,nm:"S"},
    mf([1,.843,0,1]),
    ms([.9,.7,0,1],1)
  ],
  ip:0,op:90,st:0,bm:0
};

// Calendário principal
const calendar = {
  ddd:0, ind:10, ty:4, nm:"Calendar", sr:1,
  ks:{
    o:{a:1,k:[io(0,[0]),{t:6,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(0,[100,5,0]),
      io(10,[100,103,0]),
      io(14,[100,96,0]),
      io(18,[100,100,0]),
      io(45,[100,97,0]),
      io(67,[100,103,0]),
      {t:90,s:[100,97,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(8,[100,100,100]),io3(11,[105,95,100]),{t:14,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Body
    {ty:"rc",d:1,s:{a:0,k:[54,58]},p:{a:0,k:[0,7]},r:{a:0,k:5},nm:"Body"},
    mf([0.96,0.97,1,1]),
    // Header
    {ty:"rc",d:1,s:{a:0,k:[54,16]},p:{a:0,k:[0,-18]},r:{a:0,k:[5,5,0,0]},nm:"Hdr"},
    mf([0.25,0.47,0.9,1]),
    // Argolas
    {ty:"el",d:1,s:{a:0,k:[5,9]},p:{a:0,k:[-13,-27]},nm:"R1"},
    mf([0.35,0.35,0.35,1]),
    {ty:"el",d:1,s:{a:0,k:[5,9]},p:{a:0,k:[13,-27]},nm:"R2"},
    mf([0.35,0.35,0.35,1]),
    // Linha separadora
    {ty:"rc",d:1,s:{a:0,k:[48,1.5]},p:{a:0,k:[0,-9]},r:{a:0,k:0},nm:"Line"},
    mf([0.85,0.88,0.95,1]),
    // Dias da semana (pontinhos)
    {ty:"rc",d:1,s:{a:0,k:[50,56]},p:{a:0,k:[0,7]},r:{a:0,k:5},nm:"Bdr"},
    ms([0.8,0.82,0.88,1],1.5)
  ],
  ip:0,op:90,st:0,bm:0
};

// Header text simulado (3 barrinhas)
const headerLines = {
  ddd:0, ind:11, ty:4, nm:"HdrTxt", sr:1,
  ks:{
    o:{a:1,k:[io(6,[0]),{t:10,s:[100]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,82,0]},
    a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },
  ao:0,
  shapes:[
    {ty:"rc",d:1,s:{a:0,k:[22,3]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:"L1"},
    mf([1,1,1,.9]),
    {ty:"rc",d:1,s:{a:0,k:[14,3]},p:{a:0,k:[0,5]},r:{a:0,k:2},nm:"L2"},
    mf([1,1,1,.6])
  ],
  ip:0,op:90,st:0,bm:0
};

// Glow
const glow = {
  ddd:0, ind:1, ty:4, nm:"Glow", sr:1,
  ks:{
    o:{a:1,k:[io(0,[8]),io(45,[20]),{t:90,s:[8]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,100,0]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[75,75,100]),io3(45,[100,100,100]),{t:90,s:[75,75,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},
    mf([0.86,0.9,1,1])
  ],
  ip:0,op:90,st:0,bm:0
};

// Sparkles
const sparkles = [
  makeSparkle(62,52,20,[1,.843,0,1]),
  makeSparkle(142,48,25,[0.18,0.75,0.34,1]),
  makeSparkle(155,72,30,[1,.843,0,1]),
  makeSparkle(55,80,22,[0.18,0.75,0.34,1]),
];

const lottie = {
  v:"5.7.4", fr:30, ip:0, op:90, w:200, h:200,
  nm:"Monthly Registros V1", ddd:0, assets:[], markers:[],
  layers:[
    ...sparkles,
    bigStar,
    ...gridChecks,
    headerLines,
    calendar,
    glow
  ]
};

const fs = require('fs');
const path = require('path');
const out = JSON.stringify(lottie);
const dest1 = path.join(__dirname,'../assets/lottie/trophies/monthly_registros_v1.json');
const dest2 = path.join(__dirname,'../../DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_registros_v1.json');
fs.writeFileSync(dest1, out);
fs.writeFileSync(dest2, out);
console.log('✅ V1 gerado:', dest1);
console.log('✅ V1 copiado para preview');
