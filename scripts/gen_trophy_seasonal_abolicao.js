const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VC=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-breaking-chain.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: {
    nm:"Seasonal Abolicao",
    chainColor:[.5,.38,.22,1],
    chainBorder:[.38,.28,.15,1],
    doveColor:[.6,.55,.45,1],       // muted dove
    burstColor:[.65,.45,.2,1],
    glow:[.5,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
    showDove:false,
  },
  t2: {
    nm:"Seasonal Abolicao Prata",
    chainColor:[.5,.52,.6,1],
    chainBorder:[.38,.4,.5,1],
    doveColor:[.85,.85,.9,1],       // white-silver dove
    burstColor:[.6,.62,.7,1],
    glow:[.55,.57,.65,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
    showDove:true,
  },
  t3: {
    nm:"Seasonal Abolicao Ouro",
    chainColor:[.65,.5,.1,1],
    chainBorder:[.5,.38,.05,1],
    doveColor:[1,.98,.92,1],        // bright white dove
    burstColor:[1,.843,0,1],
    glow:[.9,.75,.2,.4],
    sparkle:[1,.843,0,1],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
    showDove:true,
  },
};

function staticFloat(delay){
  return {a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,bY-3,0]}
  ]};
}

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

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Breaking chain (Game-icons SVG) — all shapes in absolute coords
  L.unshift({ddd:0,ind:10,ty:4,nm:"Chain",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:floatP(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    ...VC.shapes.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"Ch"+i},mf(tc.chainColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"Ch"+i+"Grp"})),
    ...VC.shapes.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"ChB"+i},ms(tc.chainBorder,1.2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"ChB"+i+"Grp"})),
  ],ip:0,op:90,st:0,bm:0});

  // Burst effect (rays from center of chain break)
  const bDelay=10;
  const burstAngles=[0,45,90,135,180,225,270,315];
  burstAngles.forEach((angle,i)=>{
    L.unshift({ddd:0,ind:30+i,ty:4,nm:"Ray"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:bDelay,s:[0]},{...io,t:bDelay+3,s:[60]},{...io,t:bDelay+12,s:[0]},{...io,t:55,s:[0]},{...io,t:58,s:[60]},{...io,t:67,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:angle},
      p:staticFloat(bDelay),a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:bDelay,s:[30,30,100]},{...io3,t:bDelay+8,s:[100,100,100]},{t:bDelay+12,s:[30,30,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[
        {ty:"rc",d:1,s:{a:0,k:[2,12]},p:{a:0,k:[0,-25]},r:{a:0,k:1},nm:"R"},mf(tc.burstColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RGrp"},
    ],ip:0,op:90,st:0,bm:0});
  });

  // Dove (FA SVG) — for Prata/Ouro
  if(tc.showDove){
    const VD=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-dove.json'),'utf8'));
    // shapes: 0=wing, 1=body, 2=eye
    const dDelay=14;
    // Dove uses absolute coords centered ~[100,105], offset upward
    const doveOffY=-35;  // push dove to top of canvas
    L.unshift({ddd:0,ind:20,ty:4,nm:"Dove",sr:1,ks:{
      o:{a:1,k:[{...io,t:dDelay,s:[0]},{t:dDelay+4,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:dDelay,s:[0,doveOffY-10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:dDelay+8,s:[0,doveOffY,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,doveOffY-3,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,doveOffY+3,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[0,doveOffY-3,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:dDelay,s:[0,0,100]},{...io3,t:dDelay+3,s:[120,120,100]},{t:dDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      // Body (shape 1)
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VD.shapes[1]},nm:"DB"},mf(tc.doveColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DBGrp"},
      // Wing (shape 0)
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VD.shapes[0]},nm:"DW"},mf(tc.doveColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DWGrp"},
      // Eye (shape 2 — dark)
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VD.shapes[2]},nm:"DE"},mf([.1,.1,.15,1]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DEGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sparkles
  const spP=[[55,75],[148,72],[100,55]];
  for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

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

try{fs.unlinkSync(path.join(prevDir,'seasonal_abolicao_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_abolicao_t4.json'));}catch{}

const files={base:'seasonal_abolicao',t2:'seasonal_abolicao_t2',t3:'seasonal_abolicao_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_abolicao (Bronze + Prata + Ouro)");
