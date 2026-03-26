const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VT=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-star5.json'),'utf8'));
// 1 shape from Font Awesome star SVG

const TIERS = {
  base: {
    nm:"Seasonal Independencia",
    starColor:[.4,.45,.18,1],       // verde-oliva
    starBorder:[.28,.32,.1,1],
    coinColor:[.65,.48,.2,1],       // bronze
    glow:[.45,.48,.2,.25],
    sparkle:[.7,.65,.2,1],
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Independencia Prata",
    starColor:[.3,.4,.55,1],        // azul-acinzentado
    starBorder:[.2,.28,.42,1],
    coinColor:[.6,.62,.7,1],        // prata
    glow:[.35,.42,.55,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Independencia Ouro",
    starColor:[.08,.5,.22,1],       // verde-esmeralda
    starBorder:[.05,.35,.15,1],
    coinColor:[1,.843,0,1],         // dourado
    glow:[.1,.45,.2,.4],
    sparkle:[1,.843,0,1],
    extraSparkles:4,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function floatP(delay){
  return {a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,bY-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];

  // Glow (static position)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[25]},{t:90,s:[10]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,bY+5,0]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[105,105,100]},{t:90,s:[80,80,100]}]}
  },ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[140,140]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)
  ],ip:0,op:90,st:0,bm:0});

  // Star (main shape from SVG, floatP(0), bounce entrance)
  const starShape = VT.shapes[0];
  L.unshift({ddd:0,ind:10,ty:4,nm:"Star",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:4,s:[100]}]},
    r:{a:0,k:0},
    p:floatP(0),
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[
      {...io3,t:0,s:[0,0,100]},
      {...io3,t:8,s:[110,90,100]},
      {...io3,t:12,s:[95,105,100]},
      {t:16,s:[100,100,100]}
    ]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:starShape},nm:"StarPath"},
      mf(tc.starColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"StarFillGrp"},
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:starShape},nm:"StarBorder"},
      ms(tc.starBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"StarBorderGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Coin (R$ symbol) — enters at frame 22, floats slightly offset
  const cDelay=22;
  L.unshift({ddd:0,ind:20,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+3,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[125,bY-18,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[125,bY-21,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[125,bY-15,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[125,bY-21,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:cDelay,s:[0,0,100]},{...io3,t:cDelay+4,s:[125,125,100]},{t:cDelay+8,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Coin body
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[22,22]},p:{a:0,k:[0,0]},nm:"CoinCircle"},
      mf(tc.coinColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"CoinGrp"},
    // R$ sign — vertical bar
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[2.5,12]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"RBar"},
      mf([1,1,1,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"RBarGrp"},
    // R$ sign — top horizontal
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[7,2]},p:{a:0,k:[1,-3]},r:{a:0,k:1},nm:"RTop"},
      mf([1,1,1,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"RTopGrp"},
    // R$ sign — middle horizontal
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[7,2]},p:{a:0,k:[1,0]},r:{a:0,k:1},nm:"RMid"},
      mf([1,1,1,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"RMidGrp"},
    // Coin border
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[22,22]},p:{a:0,k:[0,0]},nm:"CoinBorder"},
      ms(tc.coinColor.map((v,i)=>i<3?v*0.7:v),1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"CoinBorderGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sparkles base (3)
  const spP=[[58,78],[145,75],[100,58]];
  for(let i=0;i<3;i++){
    const d=22+i*5;
    L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*45]},{t:90,s:[i*45+180]}]},
      p:{a:0,k:[spP[i][0],spP[i][1],0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"SpStar"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  }

  // Extra sparkles (t3 only)
  const exSpP=[[50,85],[152,80],[68,60],[135,65],[100,48]];
  for(let i=0;i<tc.extraSparkles;i++){
    const d=18+i*4;
    L.unshift({ddd:0,ind:300+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:56+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},
      p:{a:0,k:[exSpP[i][0],exSpP[i][1],0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"ExSpStar"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  }

  // Pulse ring (t2 and t3)
  if(tc.pulse){
    L.push({ddd:0,ind:998,ty:4,nm:"Pulse",sr:1,ks:{
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[35]},{...io,t:32,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[35]},{...io,t:72,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[60,60,100]},{...io3,t:32,s:[135,135,100]},{...io3,t:58,s:[60,60,100]},{t:72,s:[135,135,100]}]}
    },ao:0,shapes:[
      {ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},
      ms(tc.pulseColor,2.5)
    ],ip:0,op:90,st:0,bm:0});
  }

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});

// Clean up any stray t1/t4
try{fs.unlinkSync(path.join(prevDir,'seasonal_independencia_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_independencia_t4.json'));}catch{}
try{fs.unlinkSync(path.join(outDir,'seasonal_independencia_t1.json'));}catch{}
try{fs.unlinkSync(path.join(outDir,'seasonal_independencia_t4.json'));}catch{}

const files={base:'seasonal_independencia',t2:'seasonal_independencia_t2',t3:'seasonal_independencia_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log('Written:',fname+'.json');
}
console.log("Done: seasonal_independencia (Bronze + Prata + Ouro)");
