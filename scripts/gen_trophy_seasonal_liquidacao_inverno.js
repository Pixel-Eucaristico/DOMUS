const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VT=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-price-tag.json'),'utf8'));
// 4 shapes from uxwing price-tag SVG

const TIERS = {
  base: {
    nm:"Seasonal Liquidacao Inverno",
    tagColor:[.75,.42,.15,1],        // bronze/laranja
    tagBorder:[.55,.3,.08,1],
    tagHole:[.9,.7,.4,1],            // buraco da etiqueta
    coinColor:[.65,.48,.2,1],        // moeda bronze
    percentColor:[1,1,1,1],
    glow:[.6,.38,.15,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Liquidacao Inverno Prata",
    tagColor:[.35,.42,.6,1],         // azul-acinzentado prata
    tagBorder:[.22,.3,.48,1],
    tagHole:[.65,.7,.82,1],
    coinColor:[.6,.62,.7,1],         // moeda prata
    percentColor:[1,1,1,1],
    glow:[.35,.42,.6,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Liquidacao Inverno Ouro",
    tagColor:[.1,.18,.45,1],         // navy escuro ouro
    tagBorder:[.05,.1,.3,1],
    tagHole:[.3,.4,.7,1],
    coinColor:[1,.843,0,1],          // moeda dourada
    percentColor:[1,.843,0,1],       // % dourado
    glow:[.2,.3,.55,.4],
    sparkle:[1,.843,0,1],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function floatP(delay){
  return {a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:delay,s:[0,-90,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+8,s:[0,5,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+12,s:[0,-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay+16,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[0,-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];

  // Glow de fundo (posição estática)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},
    r:{a:0,k:0},
    p:{a:0,k:[100,bY+5,0]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}
  },ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},
    mf(tc.glow)
  ],ip:0,op:90,st:0,bm:0});

  // Price tag (shapes do SVG, bounce + float)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Tag",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},
    r:{a:0,k:0},
    p:floatP(0),
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[108,92,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Shape 0: tag body (outer contour)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:VT.shapes[0]},nm:"TagBody"},
      mf(tc.tagColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"TagBodyGrp"},
    // Shape 1: tag hole area (keyring circle)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:VT.shapes[1]},nm:"TagRing"},
      mf(tc.tagHole),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"TagRingGrp"},
    // Border stroke
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:VT.shapes[0]},nm:"TagBdr"},
      ms(tc.tagBorder,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"TagBdrGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Símbolo % (layer separada, entra no frame 22, rotação suave)
  const pDelay=22;
  L.unshift({ddd:0,ind:20,ty:4,nm:"Percent",sr:1,ks:{
    o:{a:1,k:[{...io,t:pDelay,s:[0]},{t:pDelay+4,s:[100]}]},
    r:{a:1,k:[{...io,t:pDelay,s:[-20]},{t:pDelay+12,s:[0]}]},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:pDelay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-3,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:pDelay,s:[0,0,100]},{...io3,t:pDelay+4,s:[120,120,100]},{t:pDelay+8,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Circulo superior do %
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[7,7]},p:{a:0,k:[-6,-7]},nm:"Circ1"},
      ms(tc.percentColor,2.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"C1Grp"},
    // Circulo inferior do %
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[7,7]},p:{a:0,k:[6,7]},nm:"Circ2"},
      ms(tc.percentColor,2.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"C2Grp"},
    // Barra diagonal do %
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-8,9],[8,-9]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"Bar"},
      ms(tc.percentColor,2.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"BarGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Moeda inteligente (bottom right)
  const cDelay=14;
  L.unshift({ddd:0,ind:30,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+3,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[130,bY+18,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[130,bY+15,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[130,bY+21,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[130,bY+15,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:cDelay,s:[0,0,100]},{...io3,t:cDelay+3,s:[130,130,100]},{t:cDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[18,18]},p:{a:0,k:[0,0]},nm:"Cn"},
      mf(tc.coinColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"CnGrp"},
    // Check / visto indicando compra inteligente
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-4,0],[-1,3],[5,-4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Chk"},
      ms([1,1,1,1],2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"ChkGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sparkles base (3)
  const spP=[[58,78],[145,75],[100,58]];
  for(let i=0;i<3;i++){
    const d=22+i*5;
    L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},
      p:{a:0,k:[spP[i][0],spP[i][1],0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  }

  // Extra sparkles (t3: +5)
  const exSpP=[[48,85],[152,80],[68,60],[135,65],[100,48]];
  for(let i=0;i<tc.extraSparkles;i++){
    const d=20+i*4;
    L.unshift({ddd:0,ind:300+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:62+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},
      p:{a:0,k:[exSpP[i][0],exSpP[i][1],0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  }

  // Pulse ring (t2 e t3)
  if(tc.pulse){
    L.push({ddd:0,ind:998,ty:4,nm:"Pulse",sr:1,ks:{
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[35]},{...io,t:32,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[35]},{...io,t:72,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},
      p:{a:0,k:[100,bY+5,0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[60,60,100]},{...io3,t:32,s:[130,130,100]},{...io3,t:58,s:[60,60,100]},{t:72,s:[130,130,100]}]}
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

// Garantir que não existe _t1 nem _t4
try{fs.unlinkSync(path.join(outDir,'seasonal_liquidacao_inverno_t1.json'));}catch{}
try{fs.unlinkSync(path.join(outDir,'seasonal_liquidacao_inverno_t4.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_liquidacao_inverno_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_liquidacao_inverno_t4.json'));}catch{}

const files={base:'seasonal_liquidacao_inverno',t2:'seasonal_liquidacao_inverno_t2',t3:'seasonal_liquidacao_inverno_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch(e){console.warn('Preview copy skipped:',e.message);}
  console.log('Saved:',fname+'.json');
}
console.log("Done: seasonal_liquidacao_inverno (Bronze + Prata + Ouro)");
