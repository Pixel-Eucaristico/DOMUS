#!/usr/bin/env node
// V2: Calendário minimalista roxo/índigo com check "desenhando" (stroke animation) + sparkles suaves
// Conceito: aparece com scale bounce, check traça seus dois segmentos suavemente, estrelinhas piscam

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

function makeSp(x,y,t,c=[1,.843,0,1]) {
  return {
    ddd:0, ind:300+x+y, ty:4, nm:"Sp", sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+5,[100]),io(t+14,[0]),io(t+32,[0]),io(t+37,[100]),io(t+46,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[20]},{t:90,s:[200]}]},
      p:{a:0,k:[x,y,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+5,[100,100,100]),{t:t+14,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:6},os:{a:0,k:0},ix:1,nm:"S"},
      mf(c)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

// Trim path para animar o desenho do check
// Segmento 1 do check: de (-12,-2) até (-3,7) → comprimento ≈ 12.8
// Segmento 2 do check: de (-3,7) até (12,-8) → comprimento ≈ 19.7
// Total ≈ 32.5, primeiro segmento ≈ 39% do total

const checkStroke = {
  ddd:0, ind:20, ty:4, nm:"CheckStroke", sr:1,
  ks:{
    o:{a:1,k:[io(18,[0]),{t:20,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(45,[100,107,0]),
      io(67,[100,113,0]),
      {t:90,s:[100,107,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },
  ao:0,
  shapes:[
    {ty:"sh",d:1,ks:{a:0,k:{
      v:[[-12,-2],[-3,7],[12,-8]],
      i:[[0,0],[0,0],[0,0]],
      o:[[0,0],[0,0],[0,0]],
      c:false
    }},nm:"Path"},
    ms([1,1,1,1], 5),
    // Trim path: anima end de 0→100
    {ty:"tm",
      s:{a:0,k:0},
      e:{a:1,k:[io(20,[0]),{t:32,s:[100]}]},
      o:{a:0,k:0},
      m:1,nm:"Trim"
    }
  ],
  ip:0,op:90,st:0,bm:0
};

// Círculo de check (fundo)
const checkCircle = {
  ddd:0, ind:19, ty:4, nm:"CheckBg", sr:1,
  ks:{
    o:{a:1,k:[io(16,[0]),{t:20,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(16,[100,110,0]),
      io(45,[100,107,0]),
      io(67,[100,113,0]),
      {t:90,s:[100,107,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(16,[0,0,100]),io3(20,[120,120,100]),{t:24,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[36,36]},p:{a:0,k:[0,0]},nm:"C"},
    mf([0.29,0.82,0.44,1])
  ],
  ip:0,op:90,st:0,bm:0
};

// Borda do círculo pulsando
const checkCircleBorder = {
  ddd:0, ind:18, ty:4, nm:"CheckBrd", sr:1,
  ks:{
    o:{a:1,k:[io(20,[0]),io(26,[60]),io(45,[40]),io(67,[60]),{t:90,s:[40]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(45,[100,107,0]),
      io(67,[100,113,0]),
      {t:90,s:[100,107,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(22,[90,90,100]),io3(45,[100,100,100]),{t:67,s:[90,90,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[40,40]},p:{a:0,k:[0,0]},nm:"C"},
    ms([0.29,0.82,0.44,1],2)
  ],
  ip:0,op:90,st:0,bm:0
};

// Calendário
const calendar = {
  ddd:0, ind:10, ty:4, nm:"Calendar", sr:1,
  ks:{
    o:{a:1,k:[io(0,[0]),{t:5,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(45,[100,95,0]),
      io(67,[100,101,0]),
      {t:90,s:[100,95,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[0,0,100]),io3(10,[115,115,100]),io3(14,[90,90,100]),{t:18,s:[100,100,100]}]}
  },
  ao:0,
  shapes:[
    // Body
    {ty:"rc",d:1,s:{a:0,k:[58,62]},p:{a:0,k:[0,8]},r:{a:0,k:6},nm:"Body"},
    mf([0.95,0.93,0.99,1]),
    // Header roxo/índigo
    {ty:"rc",d:1,s:{a:0,k:[58,18]},p:{a:0,k:[0,-19]},r:{a:0,k:[6,6,0,0]},nm:"Hdr"},
    mf([0.38,0.23,0.78,1]),
    // Argolas
    {ty:"el",d:1,s:{a:0,k:[5,10]},p:{a:0,k:[-15,-28]},nm:"R1"},
    mf([0.25,0.25,0.25,1]),
    {ty:"el",d:1,s:{a:0,k:[5,10]},p:{a:0,k:[15,-28]},nm:"R2"},
    mf([0.25,0.25,0.25,1]),
    // Linha divisória
    {ty:"rc",d:1,s:{a:0,k:[52,1.5]},p:{a:0,k:[0,-9]},r:{a:0,k:0},nm:"Div"},
    mf([0.75,0.7,0.88,1]),
    // 3 pontos no header
    {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[-8,-18]},nm:"D1"},
    mf([1,1,1,.5]),
    {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,-18]},nm:"D2"},
    mf([1,1,1,.8]),
    {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[8,-18]},nm:"D3"},
    mf([1,1,1,.5]),
    // Borda
    {ty:"rc",d:1,s:{a:0,k:[58,62]},p:{a:0,k:[0,8]},r:{a:0,k:6},nm:"Bdr"},
    ms([0.7,0.6,0.88,1],1.5)
  ],
  ip:0,op:90,st:0,bm:0
};

// Grade de mini dots (calendário body)
const calDots = {
  ddd:0, ind:11, ty:4, nm:"CalDots", sr:1,
  ks:{
    o:{a:1,k:[io(8,[0]),{t:14,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      io(45,[100,95,0]),
      io(67,[100,101,0]),
      {t:90,s:[100,95,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },
  ao:0,
  shapes: (() => {
    const shapes = [];
    const cols=4, rows=3;
    const x0=-18, y0=-4, dx=12, dy=12;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
      shapes.push({ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[x0+c*dx,y0+r*dy]},nm:`D${r*4+c}`});
      shapes.push(mf([0.75,0.7,0.88,1]));
    }
    return shapes;
  })(),
  ip:0,op:90,st:0,bm:0
};

// Glow roxo suave
const glow = {
  ddd:0, ind:1, ty:4, nm:"Glow", sr:1,
  ks:{
    o:{a:1,k:[io(0,[6]),io(45,[18]),{t:90,s:[6]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[io3(0,[70,70,100]),io3(45,[95,95,100]),{t:90,s:[70,70,100]}]}
  },
  ao:0,
  shapes:[
    {ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},
    mf([0.88,0.84,0.98,1])
  ],
  ip:0,op:90,st:0,bm:0
};

const sparkles = [
  makeSp(58,50,22,[0.38,0.23,0.78,1]),
  makeSp(145,45,28,[0.29,0.82,0.44,1]),
  makeSp(152,130,35,[1,.843,0,1]),
  makeSp(50,138,30,[0.38,0.23,0.78,1]),
];

const lottie = {
  v:"5.7.4", fr:30, ip:0, op:90, w:200, h:200,
  nm:"Monthly Registros V2", ddd:0, assets:[], markers:[],
  layers:[
    ...sparkles,
    checkStroke,
    checkCircle,
    checkCircleBorder,
    calDots,
    calendar,
    glow
  ]
};

const fs = require('fs');
const path = require('path');
const out = JSON.stringify(lottie);
const dest1 = path.join(__dirname,'../assets/lottie/trophies/monthly_registros_v2.json');
const dest2 = path.join(__dirname,'../../DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_registros_v2.json');
fs.writeFileSync(dest1, out);
fs.writeFileSync(dest2, out);
console.log('✅ V2 gerado:', dest1);
console.log('✅ V2 copiado para preview');
