const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// No SVG import — flower built with geometric shapes
// Also reuse heart path from material icons
const hs=1.3;
const heartPath={"v":[[0,7.79*hs],[-1.21*hs,6.69*hs],[-8.33*hs,-2.92*hs],[-3.75*hs,-7.5*hs],[0,-5.76*hs],[3.75*hs,-7.5*hs],[8.33*hs,-2.92*hs],[1.21*hs,6.7*hs],[0,7.79*hs]],"i":[[0,0],[0,0],[0,3.15*hs],[-2.57*hs,0],[-0.91*hs,-1.07*hs],[-1.45*hs,0],[0,-2.57*hs],[4.29*hs,-3.9*hs],[0,0]],"o":[[0,0],[-4.29*hs,-3.89*hs],[0,-2.57*hs],[1.45*hs,0],[0.91*hs,-1.07*hs],[2.57*hs,0],[0,3.15*hs],[0,0],[0,0]],"c":true};


const TIERS = {
  base: {
    nm:"Seasonal Dia Maes",
    petalColor:[.7,.45,.5,1],       // muted rose
    petalInner:[.8,.55,.6,1],       // lighter rose
    centerColor:[.65,.45,.2,1],     // bronze center
    heartColor:[.6,.35,.4,1],       // muted pink heart
    glow:[.6,.4,.45,.25],
    sparkle:[.804,.498,.196,1],
    heartCount:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Dia Maes Prata",
    petalColor:[.65,.55,.7,1],      // lavender
    petalInner:[.78,.7,.85,1],
    centerColor:[.6,.6,.68,1],      // silver center
    heartColor:[.7,.5,.65,1],       // soft pink
    glow:[.6,.5,.65,.3],
    sparkle:[.75,.75,.78,1],
    heartCount:2,
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.6,.75,1],
  },
  t3: {
    nm:"Seasonal Dia Maes Ouro",
    petalColor:[.9,.35,.55,1],      // vibrant pink
    petalInner:[1,.5,.65,1],        // bright pink
    centerColor:[1,.843,0,1],       // gold center
    heartColor:[.9,.2,.4,1],        // vivid red-pink
    glow:[.9,.4,.5,.4],
    sparkle:[1,.843,0,1],
    heartCount:4,
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};


function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Flower — 6 petal ellipses rotated around center + center circle
  // Each petal is a separate layer so they can animate in sequence
  const petalAngles=[0,60,120,180,240,300];
  petalAngles.forEach((angle,i)=>{
    const pDelay=i*2;
    L.unshift({ddd:0,ind:10+i,ty:4,nm:"Petal"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:pDelay,s:[0]},{t:pDelay+4,s:[100]}]},
      r:{a:0,k:angle},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:pDelay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[100,bY-3,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:pDelay,s:[0,0,100]},{...io3,t:pDelay+3,s:[115,115,100]},{t:pDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      // Petal (ellipse offset upward from center)
      {ty:"gr",it:[
        {ty:"el",d:1,s:{a:0,k:[18,28]},p:{a:0,k:[0,-22]},nm:"P"},
        mf(i%2===0?tc.petalColor:tc.petalInner),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"PGrp"},
      // Petal border
      {ty:"gr",it:[
        {ty:"el",d:1,s:{a:0,k:[18,28]},p:{a:0,k:[0,-22]},nm:"PB"},
        ms(tc.petalColor.map((v,i)=>i<3?v*0.65:v),1),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"PBGrp"},
    ],ip:0,op:90,st:0,bm:0});
  });

  // Flower center circle (on top of petals)
  const ctrDelay=12;
  L.unshift({ddd:0,ind:19,ty:4,nm:"Center",sr:1,ks:{
    o:{a:1,k:[{...io,t:ctrDelay,s:[0]},{t:ctrDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:ctrDelay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:ctrDelay,s:[0,0,100]},{...io3,t:ctrDelay+3,s:[130,130,100]},{t:ctrDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[18,18]},p:{a:0,k:[0,0]},nm:"Ctr"},mf(tc.centerColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CtrGrp"},
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[18,18]},p:{a:0,k:[0,0]},nm:"CtrB"},ms(tc.centerColor.map((v,i)=>i<3?v*0.7:v),1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CtrBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Heart (appears after flower settles)
  const hDelay=14;
  L.unshift({ddd:0,ind:15,ty:4,nm:"Heart",sr:1,ks:{
    o:{a:1,k:[{...io,t:hDelay,s:[0]},{t:hDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:hDelay,s:[100,bY-35,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-38,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-32,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-38,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[
      {...io3,t:hDelay,s:[0,0,100]},{...io3,t:hDelay+3,s:[130,130,100]},{...io3,t:hDelay+6,s:[100,100,100]},
      // heartbeat
      {...io3,t:40,s:[100,100,100]},{...io3,t:43,s:[115,115,100]},{...io3,t:46,s:[100,100,100]},
      {...io3,t:70,s:[100,100,100]},{...io3,t:73,s:[115,115,100]},{t:76,s:[100,100,100]}
    ]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"Ht"},mf(tc.heartColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HtGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Floating mini hearts (for higher tiers)
  const miniPos=[[65,bY-15],[135,bY-10],[70,bY+20],[130,bY+25]];
  for(let i=0;i<tc.heartCount;i++){
    const d=18+i*4;
    L.unshift({ddd:0,ind:30+i,ty:4,nm:"MiniH"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[70]},{...io,t:d+14,s:[0]},{...io,t:55+i*6,s:[0]},{...io,t:59+i*6,s:[70]},{...io,t:69+i*6,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[miniPos[i][0],miniPos[i][1],0],to:[0,-2,0],ti:[0,2,0]},
        {t:d+14,s:[miniPos[i][0],miniPos[i][1]-12,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:0,k:[50,50,100]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"MH"},mf(tc.heartColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MHGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sparkles
  const spP=[[55,72],[148,68],[100,50]];
  for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  // Extra sparkles
  const exSpP=[[48,82],[155,78],[65,58],[138,62],[100,42]];
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_maes_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_maes_t4.json'));}catch{}

const files={base:'seasonal_dia_maes',t2:'seasonal_dia_maes_t2',t3:'seasonal_dia_maes_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_dia_maes (Bronze + Prata + Ouro)");
