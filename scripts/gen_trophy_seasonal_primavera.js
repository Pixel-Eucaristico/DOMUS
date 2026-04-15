#!/usr/bin/env node
// seasonal_primavera - Florescimento Financeiro 🌸
// Baseado em daisy.json (referência real)
// Paths bezier REAIS extraídos da referência, animação fiel ao original
// 5 pétalas com bounce -75°→50°→-50°→25°→0° (cascata), caule, folhas, moedas

const fs=require('fs'),path=require('path');
const CX=100, CY=90; // centro da flor no canvas 200x200
const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}
function tr(px,py,rot){return{ty:"tr",p:{a:0,k:[px||0,py||0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:rot||0},o:{a:0,k:100}}}

// Escala de 1080x1080 → 200x200 canvas
// Pétala original: height=178.7, width=131.7 → scale=0.28 → 50px x 37px
const SC = 0.28;

// Path bezier REAL da pétala (extraído de daisy.json petalo 1 group 1)
const PETAL_PATH = {
  v: [[0.001,89.372],[-65.872,-23.499],[0.001,-89.372],[65.872,-23.499]],
  i: [[36.38,0],[0,36.38],[-36.38,0],[0,-36.38]],
  o: [[-36.38,0],[0,-36.38],[36.38,0],[0,36.38]],
  c: true
};

// Path bezier REAL do centro/círculo (extraído de daisy.json flor group 0)
const CENTER_PATH = {
  v: [[65.872,-0.001],[0,65.872],[-65.872,-0.001],[0,-65.872]],
  i: [[0,-36.38],[36.38,0],[0,36.38],[-36.38,0]],
  o: [[0,36.38],[-36.38,0],[0,-36.38],[36.38,0]],
  c: true
};

// Escala de um path
function scalePath(p, sc) {
  return {
    v: p.v.map(pt=>[pt[0]*sc, pt[1]*sc]),
    i: p.i.map(pt=>[pt[0]*sc, pt[1]*sc]),
    o: p.o.map(pt=>[pt[0]*sc, pt[1]*sc]),
    c: p.c
  };
}

const PETAL = scalePath(PETAL_PATH, SC);   // pétala escalada
const CENTER = scalePath(CENTER_PATH, SC); // centro escalado

// Posições das 5 pétalas ao redor do centro
// Na referência cada pétala tem posição fixa + rotação animada
// Reproduzimos: layer em CX,CY, shape com tr.p offset upward (como dia_maes)
// Ângulos base para espaçar as 5 pétalas uniformemente (72° entre cada)
const PETAL_ANGLES = [0, 72, 144, 216, 288];
// Offset vertical da pétala dentro do grupo (centro da pétala 30px acima do pivot)
const POFFSET_Y = -30;

// Animação de rotação fiel ao original (bounce spring -75°→50°→-50°→25°→0°)
// Original: frames 10-14 start, 15-19 peak, 24-28 valley, 34-38 mid, 45-49 settle
// Adaptado para 90 frames: multiplicar por 90/75 ≈ 1.2
function petalRotKeys(startT) {
  return {a:1,k:[
    {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT,   s:[-75]},
    {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT+6, s:[50]},
    {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT+15,s:[-50]},
    {i:{x:[.833],y:[1]},o:{x:[.333],y:[0]},t:startT+24,s:[25]},
    {t:startT+35,s:[0]}
  ]};
}
function petalScaleKeys(startT) {
  return {a:1,k:[
    {...io3,t:startT,s:[118,118,100]},
    {...io3,t:startT+4,s:[95,95,100]},
    {t:startT+7,s:[100,100,100]}
  ]};
}
function petalOpKeys(startT) {
  return {a:1,k:[{...io,t:Math.max(0,startT-2),s:[0]},{t:startT,s:[100]}]};
}

const TIERS = {
  base:{
    nm:"Florescimento Financeiro",
    petalColor:[.941,.933,.867,1],   // creme (cor original da referência)
    petalStr:[.750,.720,.620,1],
    centerColor:[.961,.651,.137,1],  // amarelo (cor original da referência)
    centerStr:[.750,.450,.050,1],
    stemColor:[.196,.510,.196,1],
    leafColor:[.220,.588,.220,1],
    coinColor:[.804,.498,.196,1],
    coinStr:[.55,.32,.08,1],
    glow:[.99,.95,.82,.18],
    sparkle:[.961,.651,.137,1],
    coins:2, sparks:2,
  },
  t2:{
    nm:"Florescimento Financeiro Prata",
    petalColor:[.820,.780,.920,1],   // lilás claro
    petalStr:[.580,.520,.750,1],
    centerColor:[.780,.780,.800,1],
    centerStr:[.520,.520,.540,1],
    stemColor:[.220,.560,.220,1],
    leafColor:[.260,.620,.260,1],
    coinColor:[.780,.780,.800,1],
    coinStr:[.50,.50,.52,1],
    glow:[.88,.84,.99,.20],
    sparkle:[.700,.650,.900,1],
    coins:3, sparks:3,
  },
  t3:{
    nm:"Florescimento Financeiro Ouro",
    petalColor:[1,.820,.400,1],      // dourado
    petalStr:[.800,.580,.000,1],
    centerColor:[1,.843,.000,1],
    centerStr:[.750,.580,.000,1],
    stemColor:[.150,.500,.150,1],
    leafColor:[.200,.600,.200,1],
    coinColor:[1,.843,.000,1],
    coinStr:[.75,.60,.00,1],
    glow:[.99,.95,.70,.22],
    sparkle:[1,.843,.000,1],
    coins:4, sparks:4,
  },
};

function buildAnim(tc){
  const L=[];

  // --- Glow de fundo ---
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[16]},{...io,t:50,s:[28]},{t:90,s:[16]}]},
    r:{a:0,k:0},p:{a:0,k:[CX,CY,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[70,70,100]},{...io3,t:50,s:[108,108,100]},{t:90,s:[70,70,100]}]}
  },ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[152,152]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)
  ],ip:0,op:90,st:0,bm:0});

  // caule e folhas definidos aqui mas adicionados ao array DEPOIS das pétalas e centro
  const hojaL = {
    v:[[-148.865*SC*.5, 19.915*SC*.5],[70.736*SC*.5,-104.17*SC*.5]],
    i:[[297.729*SC*.5,84.256*SC*.5],[0,0]],
    o:[[0,0],[0,0]],
    c:true
  };
  const hojaR = {
    v:[[148.865*SC*.5, 19.915*SC*.5],[-70.736*SC*.5,-104.17*SC*.5]],
    i:[[-297.729*SC*.5,84.256*SC*.5],[0,0]],
    o:[[0,0],[0,0]],
    c:true
  };
  const talloLayer = {ddd:0,ind:60,ty:4,nm:"Tallo",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:3,s:[100]}]},
    r:{a:0,k:0},p:{a:0,k:[CX,CY,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[100,0,100]},{...io3,t:6,s:[100,112,100]},{t:9,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[0,10],[0,65]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"St"},
    ms(tc.stemColor,4)
  ],ip:0,op:90,st:0,bm:0};
  const hojaLLayer = {ddd:0,ind:61,ty:4,nm:"HojaL",sr:1,ks:{
    o:{a:1,k:[{...io,t:1,s:[0]},{t:4,s:[100]}]},
    r:{a:0,k:0},p:{a:0,k:[CX,CY+30,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:2,s:[0,0,100]},{...io3,t:7,s:[115,115,100]},{t:10,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"sh",d:1,ks:{a:0,k:hojaL},nm:"HL"},mf(tc.leafColor),ms(tc.stemColor,.8)
  ],ip:0,op:90,st:0,bm:0};
  const hojaRLayer = {ddd:0,ind:62,ty:4,nm:"HojaR",sr:1,ks:{
    o:{a:1,k:[{...io,t:2,s:[0]},{t:5,s:[100]}]},
    r:{a:0,k:0},p:{a:0,k:[CX,CY+30,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:3,s:[0,0,100]},{...io3,t:8,s:[115,115,100]},{t:11,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"sh",d:1,ks:{a:0,k:hojaR},nm:"HR"},mf(tc.leafColor),ms(tc.stemColor,.8)
  ],ip:0,op:90,st:0,bm:0};

  // --- Centro da flor (bezier real) — adicionado ANTES das pétalas = fica na frente ---
  const centerDelay = 18;
  L.push({ddd:0,ind:5,ty:4,nm:"Centro",sr:1,ks:{
    o:{a:1,k:[{...io,t:centerDelay,s:[0]},{t:centerDelay+3,s:[100]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[360]}]},
    p:{a:0,k:[CX,CY,0]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:centerDelay,s:[0,0,100]},{...io3,t:centerDelay+3,s:[130,130,100]},{t:centerDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:CENTER},nm:"C"},
      mf(tc.centerColor),
      ms(tc.centerStr,1.2),
      tr(0,0)
    ],nm:"CGrp"}
  ],ip:0,op:90,st:0,bm:0});

  // --- 5 Pétalas com bezier real + bounce animation da referência ---
  PETAL_ANGLES.forEach(function(baseAngle, i){
    const startT = 8 + (4-i)*1; // cascade: pétala 0 começa depois, como no original
    L.push({ddd:0,ind:10+i,ty:4,nm:"Petalo"+i,sr:1,ks:{
      o: petalOpKeys(startT),
      r:{a:1,k:[
        // rotação final = baseAngle (posição em torno da flor)
        // entrada: começa em baseAngle-75, vai para baseAngle+50, etc.
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT,   s:[baseAngle-75]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT+6, s:[baseAngle+50]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT+15,s:[baseAngle-50]},
        {i:{x:[.833],y:[1]},o:{x:[.333],y:[0]},t:startT+24,s:[baseAngle+25]},
        // settle + idle suave
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:startT+35,s:[baseAngle]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:60,s:[baseAngle-3]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:75,s:[baseAngle+3]},
        {t:90,s:[baseAngle-3]}
      ]},
      p:{a:0,k:[CX,CY,0]},
      a:{a:0,k:[0,0,0]},
      s: petalScaleKeys(startT)
    },ao:0,shapes:[
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:PETAL},nm:"P"},
        mf(tc.petalColor),
        ms(tc.petalStr,.8),
        tr(0, POFFSET_Y)   // desloca pétala para cima do pivot (como dia_maes p:[0,-22])
      ],nm:"PGrp"}
    ],ip:0,op:90,st:0,bm:0});
  });


  // Caule e folhas DEPOIS do centro → ficam atrás da flor inteira
  L.push(talloLayer);
  L.push(hojaLLayer);
  L.push(hojaRLayer);

  // --- Moedas flutuando ---
  const coinDefs=[[56,42,22],[146,40,26],[54,152,30],[148,150,33]];
  coinDefs.slice(0,tc.coins).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:30+i,ty:4,nm:"Coin"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+4,s:[100]},{...io,t:t+16,s:[100]},{...io,t:t+24,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t,s:[0]},{t:t+24,s:[160]}]},
      p:{a:1,k:[{...io,t,s:[x,y,0]},{t:t+24,s:[x+4,y+22,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+4,s:[115,115,100]},{t:t+7,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[13,13]},p:{a:0,k:[0,0]},nm:"C"},mf(tc.coinColor),ms(tc.coinStr,1.2),tr()],nm:"CG"},
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{v:[[0,-4],[0,4]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"L"},ms([1,1,1,.7],1.4),tr()],nm:"LG"}
    ],ip:0,op:90,st:0,bm:0});
  });

  // --- Brilhos ---
  const spDefs=[[52,38,20],[150,36,24],[52,44,31],[150,44,35]];
  spDefs.slice(0,tc.sparks).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:50+i,ty:4,nm:"Sp"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+4,s:[100]},{...io,t:t+13,s:[0]},{...io,t:56+i*8,s:[0]},{...io,t:60+i*8,s:[100]},{...io,t:69+i*8,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*45]},{t:90,s:[i*45+200]}]},
      p:{a:0,k:[x,y,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+4,s:[100,100,100]},{t:t+13,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"S"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  });

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';

['_t1','_t4'].forEach(function(sfx){
  try{fs.unlinkSync(path.join(prevDir,'seasonal_primavera'+sfx+'.json'));}catch{}
  try{fs.unlinkSync(path.join(outDir,'seasonal_primavera'+sfx+'.json'));}catch{}
});

const files={base:'seasonal_primavera',t2:'seasonal_primavera_t2',t3:'seasonal_primavera_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log(fname+'.json OK');
}
console.log("Done: seasonal_primavera - daisy real bezier paths");
