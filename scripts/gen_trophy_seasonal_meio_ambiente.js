const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VT=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-tree-bs.json'),'utf8'));
// VT.tree: 1 shape (tree-fill BS SVG)
// VT.recycle: 3 shapes (recycle BS SVG arrows)

const TIERS = {
  base: {
    nm:"Seasonal Meio Ambiente",
    leafColor:[.4,.5,.25,1],         // muted olive green
    leafBorder:[.3,.38,.18,1],
    potColor:[.55,.38,.22,1],        // bronze pot
    potBorder:[.4,.28,.12,1],
    recycleColor:[.45,.5,.3,1],
    glow:[.35,.45,.2,.25],
    sparkle:[.804,.498,.196,1],
    drops:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Meio Ambiente Prata",
    leafColor:[.3,.6,.35,1],         // medium green
    leafBorder:[.2,.45,.25,1],
    potColor:[.5,.52,.6,1],          // silver pot
    potBorder:[.38,.4,.5,1],
    recycleColor:[.5,.6,.55,1],
    glow:[.3,.5,.35,.3],
    sparkle:[.75,.75,.78,1],
    drops:2,                          // water drops
    extraSparkles:0,
    pulse:true,
    pulseColor:[.4,.7,.45,1],
  },
  t3: {
    nm:"Seasonal Meio Ambiente Ouro",
    leafColor:[.15,.7,.3,1],         // vivid green
    leafBorder:[.08,.5,.2,1],
    potColor:[.85,.7,.15,1],         // gold pot
    potBorder:[.65,.5,.05,1],
    recycleColor:[.1,.65,.25,1],
    glow:[.2,.6,.25,.4],
    sparkle:[1,.843,0,1],
    drops:4,
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

  // Glow (green)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Tree (BS tree-fill SVG) — vertices in absolute coords
  L.unshift({ddd:0,ind:10,ty:4,nm:"Tree",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:0,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[0,-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[
      {...io3,t:0,s:[100,0,100]},     // grow upward
      {...io3,t:10,s:[100,110,100]},
      {t:14,s:[100,100,100]}
    ]}
  },ao:0,shapes:[
    // Tree foliage
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VT.tree[0]},nm:"Tr"},mf(tc.leafColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TrGrp"},
    // Trunk (brown rect below tree)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[8,18]},p:{a:0,k:[100,138]},r:{a:0,k:2},nm:"Trunk"},mf(tc.potColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TrunkGrp"},
    // Border
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VT.tree[0]},nm:"TrB"},ms(tc.leafBorder,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TrBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Recycle symbol (BS recycle SVG — 3 arrow shapes) — top right badge
  const rDelay=14;
  L.unshift({ddd:0,ind:15,ty:4,nm:"Recycle",sr:1,ks:{
    o:{a:1,k:[{...io,t:rDelay,s:[0]},{t:rDelay+3,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:rDelay,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[0,-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:rDelay,s:[0,0,100]},{...io3,t:rDelay+3,s:[130,130,100]},{t:rDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // 3 recycle arrow shapes from BS SVG
    ...VT.recycle.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"R"+i},mf(tc.recycleColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"R"+i+"Grp"})),
  ],ip:0,op:90,st:0,bm:0});

  // Water drops (for higher tiers)
  const dropPos=[[85,bY-12],[115,bY-8],[78,bY],[122,bY+2]];
  for(let i=0;i<tc.drops;i++){
    const d=20+i*4;
    L.unshift({ddd:0,ind:40+i,ty:4,nm:"Drop"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[70]},{...io,t:d+14,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:61+i*5,s:[70]},{...io,t:72+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[dropPos[i][0],dropPos[i][1]-8,0],to:[0,2,0],ti:[0,-2,0]},
        {t:d+14,s:[dropPos[i][0],dropPos[i][1]+8,0]}
      ]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },ao:0,shapes:[
      // Teardrop shape
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-5],[-3,1],[0,5],[3,1]],i:[[0,0],[0,-3],[3,0],[0,3]],o:[[0,0],[-3,0],[0,3],[0,-3]],c:true}},nm:"Dr"},
        mf([.3,.6,.9,.7]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DrGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sparkles
  const spP=[[55,75],[148,72],[100,55]];
  for(let i=0;i<3;i++){const d=24+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  // Extra sparkles
  const exSpP=[[48,82],[155,78],[65,58],[138,62],[100,45]];
  for(let i=0;i<tc.extraSparkles;i++){
    const d=20+i*4;
    L.unshift({ddd:0,ind:300+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:62+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},p:{a:0,k:[exSpP[i][0],exSpP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});
  }

  // Pulse ring
  if(tc.pulse){
    L.push({ddd:0,ind:998,ty:4,nm:"Pulse",sr:1,ks:{
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[35]},{...io,t:32,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[35]},{...io,t:72,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[60,60,100]},{...io3,t:32,s:[130,130,100]},{...io3,t:58,s:[60,60,100]},{t:72,s:[130,130,100]}]}
    },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},ms(tc.pulseColor,2.5)],ip:0,op:90,st:0,bm:0});
  }

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});

try{fs.unlinkSync(path.join(prevDir,'seasonal_meio_ambiente_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_meio_ambiente_t4.json'));}catch{}

const files={base:'seasonal_meio_ambiente',t2:'seasonal_meio_ambiente_t2',t3:'seasonal_meio_ambiente_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_meio_ambiente (Bronze + Prata + Ouro)");
