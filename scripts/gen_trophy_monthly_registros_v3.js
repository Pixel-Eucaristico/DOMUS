#!/usr/bin/env node
// V3: Calendário verde-esmeralda com troféu pequeno + confetti + todos os dias marcados
// Conceito: calendário rotaciona entrando, troféu aparece no topo, confetti cai suavemente

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

// Confetti particle
function makeConfetti(x, startY, endY, startFrame, color, rot0, rot1) {
  const ind = 400 + Math.floor(x*7+startFrame*3);
  return {
    ddd:0, ind, ty:4, nm:`Conf_${ind}`, sr:1,
    ks:{
      o:{a:1,k:[io(startFrame,[0]),io(startFrame+4,[85]),io(startFrame+22,[85]),io(startFrame+30,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:startFrame,s:[rot0]},{t:startFrame+30,s:[rot1]}]},
      p:{a:1,k:[io(startFrame,[x,startY,0]),{t:startFrame+30,s:[x+10,endY,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:0,k:[100,100,100]}
    },
    ao:0,
    shapes:[
      {ty:"rc",d:1,s:{a:0,k:[5,3]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"R"},
      mf(color)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

const confetti = [
  makeConfetti(72, 30, 85, 32, [0.22,0.8,0.45,1], 10, 180),
  makeConfetti(115, 28, 90, 35, [1,.843,0,1], -20, 150),
  makeConfetti(90, 25, 80, 38, [0.38,0.23,0.78,1], 30, 200),
  makeConfetti(130, 32, 88, 34, [1,0.3,0.3,1], -5, 160),
  makeConfetti(80, 27, 92, 40, [0.2,0.6,1,1], 15, 190),
  makeConfetti(108, 26, 85, 37, [1,.843,0,1], -25, 170),
  // Segunda onda
  makeConfetti(70, 28, 88, 58, [1,0.3,0.3,1], 20, 200),
  makeConfetti(120, 30, 92, 60, [0.22,0.8,0.45,1], -10, 175),
  makeConfetti(95, 26, 83, 62, [1,.843,0,1], 35, 210),
];

// Troféu pequeno no topo
const miniTrophy = {
  ddd:0, ind:50, ty:4, nm:"Trophy", sr:1,
  ks:{
    o:{a:1,k:[io(14,[0]),io(18,[100]),{t:90,s:[100]}]},
    r:{a:1,k:[{t:14,s:[-30]},{t:20,s:[5]},{t:45,s:[-2]},{t:67,s:[3]},{t:90,s:[-2]}]},
    p:{a:1,k:[
      io(14,[100,56,0]),
      io(22,[100,52,0]),
      io(45,[100,50,0]),
      io(67,[100,54,0]),
      {t:90,s:[100,50,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(14,[0,0,100]),io3(18,[130,130,100]),{t:22,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Copa do troféu (simplificada com retângulo arredondado)
    {ty:"rc",d:1,s:{a:0,k:[14,11]},p:{a:0,k:[0,-3]},r:{a:0,k:5},nm:"Cup"},
    mf([1,.843,0,1]),
    ms([0.85,0.65,0,1],1),
    // Base
    {ty:"rc",d:1,s:{a:0,k:[10,3]},p:{a:0,k:[0,4]},r:{a:0,k:1},nm:"Base"},
    mf([0.85,0.65,0,1]),
    // Pé
    {ty:"rc",d:1,s:{a:0,k:[14,2.5]},p:{a:0,k:[0,7]},r:{a:0,k:1},nm:"Foot"},
    mf([0.85,0.65,0,1]),
    // Alças
    {ty:"rc",d:1,s:{a:0,k:[3,7]},p:{a:0,k:[-9,-3]},r:{a:0,k:2},nm:"H1"},
    mf([1,.843,0,1]),
    ms([0.85,0.65,0,1],1),
    {ty:"rc",d:1,s:{a:0,k:[3,7]},p:{a:0,k:[9,-3]},r:{a:0,k:2},nm:"H2"},
    mf([1,.843,0,1]),
    ms([0.85,0.65,0,1],1),
    // Estrela interior
    {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,-3]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:6},os:{a:0,k:0},ix:1,nm:"S"},
    mf([0.85,0.65,0,1])
  ],
  ip:0,op:90,st:0,bm:0
};

// Calendário com header verde-esmeralda e todos os dias marcados
const calendar = {
  ddd:0, ind:10, ty:4, nm:"Calendar", sr:1,
  ks:{
    o:{a:1,k:[io(0,[0]),{t:6,s:[100]}]},
    r:{a:1,k:[{t:0,s:[-15]},{t:10,s:[3]},{t:15,s:[-1]},{t:20,s:[0]},{t:90,s:[0]}]},
    p:{a:1,k:[
      io(0,[100,150,0]),
      io(10,[100,103,0]),
      io(15,[100,97,0]),
      io(20,[100,100,0]),
      io(45,[100,97,0]),
      io(67,[100,103,0]),
      {t:90,s:[100,97,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[85,85,100]),io3(10,[105,105,100]),{t:15,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Body
    {ty:"rc",d:1,s:{a:0,k:[58,62]},p:{a:0,k:[0,9]},r:{a:0,k:6},nm:"Body"},
    mf([0.94,0.98,0.95,1]),
    // Header verde-esmeralda
    {ty:"rc",d:1,s:{a:0,k:[58,18]},p:{a:0,k:[0,-18]},r:{a:0,k:[6,6,0,0]},nm:"Hdr"},
    mf([0.05,0.65,0.40,1]),
    // Argolas
    {ty:"el",d:1,s:{a:0,k:[5,10]},p:{a:0,k:[-15,-27]},nm:"R1"},
    mf([0.1,0.1,0.1,1]),
    {ty:"el",d:1,s:{a:0,k:[5,10]},p:{a:0,k:[15,-27]},nm:"R2"},
    mf([0.1,0.1,0.1,1]),
    // Linha divisória
    {ty:"rc",d:1,s:{a:0,k:[52,1.5]},p:{a:0,k:[0,-8]},r:{a:0,k:0},nm:"Div"},
    mf([0.7,0.88,0.75,1]),
    // Borda
    {ty:"rc",d:1,s:{a:0,k:[58,62]},p:{a:0,k:[0,9]},r:{a:0,k:6},nm:"Bdr"},
    ms([0.7,0.88,0.75,1],1.5)
  ],
  ip:0,op:90,st:0,bm:0
};

// Grid de mini-checks verdes (todos os dias do mês marcados)
function makeGridCheck(x, y, t, c=[0.05,0.65,0.40,1]) {
  const ind = 200 + Math.floor(x*3 + y);
  return {
    ddd:0, ind, ty:4, nm:`GC_${ind}`, sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+3,[100]),{t:90,s:[100]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        io(45,[x,y+3,0]),
        io(67,[x,y-3,0]),
        {t:90,s:[x,y+3,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+3,[110,110,100]),{t:t+5,s:[100,100,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-3.5,-1],[-1,2],[3.5,-4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"V"},
      ms(c,2)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

const gridChecks = [];
const cols=4, rows=3;
const gx0=79, gy0=92, cdx=12, cdy=13;
let ci=0;
for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
  gridChecks.push(makeGridCheck(gx0+c*cdx+6, gy0+r*cdy+6, 20+ci*2));
  ci++;
}

// Glow verde
const glow = {
  ddd:0, ind:1, ty:4, nm:"Glow", sr:1,
  ks:{
    o:{a:1,k:[io(0,[8]),io(45,[22]),{t:90,s:[8]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[75,75,100]),io3(45,[100,100,100]),{t:90,s:[75,75,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[128,128]},p:{a:0,k:[0,0]},nm:"G"},
    mf([0.82,0.96,0.87,1])
  ],
  ip:0,op:90,st:0,bm:0
};

const lottie = {
  v:"5.7.4", fr:30, ip:0, op:90, w:200, h:200,
  nm:"Monthly Registros V3", ddd:0, assets:[], markers:[],
  layers:[
    ...confetti,
    miniTrophy,
    ...gridChecks,
    calendar,
    glow
  ]
};

const fs = require('fs');
const path = require('path');
const out = JSON.stringify(lottie);
const dest1 = path.join(__dirname,'../assets/lottie/trophies/monthly_registros_v3.json');
const dest2 = path.join(__dirname,'../../DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_registros_v3.json');
fs.writeFileSync(dest1, out);
fs.writeFileSync(dest2, out);
console.log('✅ V3 gerado:', dest1);
console.log('✅ V3 copiado para preview');
