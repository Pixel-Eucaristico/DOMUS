const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VP=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-couple.json'),'utf8'));
// shapes: 0=right body, 1=right head, 2=left body, 3=left head

// Heart path
const hs=1.4;
const heartPath={"v":[[0,7.79*hs],[-1.21*hs,6.69*hs],[-8.33*hs,-2.92*hs],[-3.75*hs,-7.5*hs],[0,-5.76*hs],[3.75*hs,-7.5*hs],[8.33*hs,-2.92*hs],[1.21*hs,6.7*hs],[0,7.79*hs]],"i":[[0,0],[0,0],[0,3.15*hs],[-2.57*hs,0],[-0.91*hs,-1.07*hs],[-1.45*hs,0],[0,-2.57*hs],[4.29*hs,-3.9*hs],[0,0]],"o":[[0,0],[-4.29*hs,-3.89*hs],[0,-2.57*hs],[1.45*hs,0],[0.91*hs,-1.07*hs],[2.57*hs,0],[0,3.15*hs],[0,0],[0,0]],"c":true};

const TIERS = {
  base: {
    nm:"Seasonal Dia Namorados",
    personColor:[.55,.38,.25,1],     // bronze man
    womanColor:[.6,.45,.3,1],        // lighter bronze woman skin
    dressColor:[.65,.35,.3,1],       // muted red dress
    heartColor:[.65,.35,.3,1],
    glow:[.5,.3,.25,.25],
    sparkle:[.804,.498,.196,1],
    miniHearts:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Dia Namorados Prata",
    personColor:[.45,.48,.58,1],     // silver man
    womanColor:[.55,.55,.65,1],      // silver woman
    dressColor:[.7,.35,.5,1],        // pink dress
    heartColor:[.7,.35,.45,1],
    glow:[.55,.4,.5,.3],
    sparkle:[.75,.75,.78,1],
    miniHearts:2,
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.55,.65,1],
  },
  t3: {
    nm:"Seasonal Dia Namorados Ouro",
    personColor:[.15,.3,.55,1],      // navy man (premium)
    womanColor:[.25,.4,.65,1],       // blue woman
    dressColor:[.9,.2,.35,1],        // vivid red dress
    heartColor:[.9,.15,.25,1],
    glow:[.85,.3,.35,.4],
    sparkle:[1,.843,0,1],
    miniHearts:4,
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

function staticFloat(delay){
  return {a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,bY-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Man (left) — taller, square shoulders
  L.unshift({ddd:0,ind:10,ty:4,nm:"Man",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:6,s:[108,92,100]},{t:10,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Head
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[-14,-18]},nm:"MH"},mf(tc.personColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MHGrp"},
    // Body (rect with shoulders)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[20,28]},p:{a:0,k:[-14,4]},r:{a:0,k:4},nm:"MB"},mf(tc.personColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MBGrp"},
    // Legs
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[8,14]},p:{a:0,k:[-19,24]},r:{a:0,k:2},nm:"ML1"},mf(tc.personColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"ML1Grp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[8,14]},p:{a:0,k:[-9,24]},r:{a:0,k:2},nm:"ML2"},mf(tc.personColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"ML2Grp"},
  ],ip:0,op:90,st:0,bm:0});

  // Woman (right) — shorter, triangle dress, hair longer
  const wDelay=3;
  L.unshift({ddd:0,ind:11,ty:4,nm:"Woman",sr:1,ks:{
    o:{a:1,k:[{...io,t:wDelay,s:[0]},{t:wDelay+6,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(wDelay),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:wDelay,s:[0,0,100]},{...io3,t:wDelay+6,s:[108,92,100]},{t:wDelay+10,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Hair (slightly bigger circle behind head)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[18,20]},p:{a:0,k:[14,-15]},nm:"WHair"},mf(tc.personColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"WHairGrp"},
    // Head
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[14,14]},p:{a:0,k:[14,-14]},nm:"WH"},mf(tc.womanColor||tc.personColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"WHGrp"},
    // Dress (trapezoid/triangle)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[6,-4],[22,-4],[26,28],[2,28]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"WD"},
      mf(tc.dressColor||tc.heartColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"WDGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Big heart above couple (between their heads)
  const hDelay=12;
  L.unshift({ddd:0,ind:15,ty:4,nm:"Heart",sr:1,ks:{
    o:{a:1,k:[{...io,t:hDelay,s:[0]},{t:hDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:hDelay,s:[100,bY-30,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-33,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-27,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-33,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[
      {...io3,t:hDelay,s:[0,0,100]},{...io3,t:hDelay+3,s:[130,130,100]},{...io3,t:hDelay+6,s:[100,100,100]},
      // heartbeat
      {...io3,t:40,s:[100,100,100]},{...io3,t:43,s:[118,118,100]},{t:46,s:[100,100,100]},
      {...io3,t:65,s:[100,100,100]},{...io3,t:68,s:[118,118,100]},{t:71,s:[100,100,100]}
    ]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"Ht"},mf(tc.heartColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HtGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Mini floating hearts
  const miniPos=[[65,bY-15],[135,bY-10],[70,bY+5],[130,bY]];
  for(let i=0;i<tc.miniHearts;i++){
    const d=18+i*4;
    L.unshift({ddd:0,ind:30+i,ty:4,nm:"MiniH"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[70]},{...io,t:d+14,s:[0]},{...io,t:55+i*6,s:[0]},{...io,t:59+i*6,s:[70]},{...io,t:69+i*6,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[miniPos[i][0],miniPos[i][1],0],to:[0,-2,0],ti:[0,2,0]},
        {t:d+14,s:[miniPos[i][0],miniPos[i][1]-15,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:0,k:[45,45,100]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"MH"},mf(tc.heartColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MHGrp"},
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_namorados_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_namorados_t4.json'));}catch{}

const files={base:'seasonal_dia_namorados',t2:'seasonal_dia_namorados_t2',t3:'seasonal_dia_namorados_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_dia_namorados (Bronze + Prata + Ouro)");
