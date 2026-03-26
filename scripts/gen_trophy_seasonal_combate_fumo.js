const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// Heart path (reused)
const hs=1.0;
const heartPath={"v":[[0,7.79*hs],[-1.21*hs,6.69*hs],[-8.33*hs,-2.92*hs],[-3.75*hs,-7.5*hs],[0,-5.76*hs],[3.75*hs,-7.5*hs],[8.33*hs,-2.92*hs],[1.21*hs,6.7*hs],[0,7.79*hs]],"i":[[0,0],[0,0],[0,3.15*hs],[-2.57*hs,0],[-0.91*hs,-1.07*hs],[-1.45*hs,0],[0,-2.57*hs],[4.29*hs,-3.9*hs],[0,0]],"o":[[0,0],[-4.29*hs,-3.89*hs],[0,-2.57*hs],[1.45*hs,0],[0.91*hs,-1.07*hs],[2.57*hs,0],[0,3.15*hs],[0,0],[0,0]],"c":true};

const white=[1,1,1,1];

const TIERS = {
  base: {
    nm:"Seasonal Combate Fumo",
    banColor:[.6,.3,.2,1],          // bronze-red ban circle
    banSlash:[.6,.3,.2,1],
    cigColor:[.6,.55,.45,1],        // gray cig
    cigTip:[.65,.4,.2,1],           // bronze tip
    heartColor:[.6,.35,.25,1],      // muted heart
    glow:[.5,.3,.2,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
    showHeart:false,
  },
  t2: {
    nm:"Seasonal Combate Fumo Prata",
    banColor:[.6,.25,.2,1],         // red ban
    banSlash:[.6,.25,.2,1],
    cigColor:[.55,.55,.6,1],        // silver cig
    cigTip:[.5,.5,.58,1],
    heartColor:[.65,.4,.55,1],      // soft pink
    glow:[.55,.35,.4,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
    showHeart:true,
  },
  t3: {
    nm:"Seasonal Combate Fumo Ouro",
    banColor:[.85,.15,.1,1],        // vivid red ban
    banSlash:[.85,.15,.1,1],
    cigColor:[.5,.5,.55,1],
    cigTip:[.85,.5,.1,1],           // orange tip
    heartColor:[.9,.2,.3,1],        // vivid red heart
    glow:[.85,.3,.2,.35],
    sparkle:[1,.843,0,1],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
    showHeart:true,
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

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Cigarette (behind ban symbol) — simple rect + filter tip
  L.unshift({ddd:0,ind:5,ty:4,nm:"Cigarette",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:-30},
    p:staticFloat(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:6,s:[105,95,100]},{t:10,s:[100,100,100]}]}
  },ao:0,shapes:[
    // White body
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[40,8]},p:{a:0,k:[5,0]},r:{a:0,k:2},nm:"Body"},mf([.95,.93,.88,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BodyGrp"},
    // Filter tip (left)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[12,8]},p:{a:0,k:[-20,0]},r:{a:0,k:2},nm:"Filter"},mf(tc.cigTip),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"FilterGrp"},
    // Burning tip (right, orange)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[5,5]},p:{a:0,k:[26,0]},nm:"Burn"},mf([.9,.45,.1,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BurnGrp"},
    // Border
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[40,8]},p:{a:0,k:[5,0]},r:{a:0,k:2},nm:"Bdr"},ms(tc.cigColor,1),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BdrGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Ban symbol (red circle + diagonal slash) — on top of cigarette
  const bDelay=8;
  L.unshift({ddd:0,ind:10,ty:4,nm:"Ban",sr:1,ks:{
    o:{a:1,k:[{...io,t:bDelay,s:[0]},{t:bDelay+4,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(bDelay),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:bDelay,s:[0,0,100]},{...io3,t:bDelay+3,s:[120,120,100]},{t:bDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Red circle outline
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[60,60]},p:{a:0,k:[0,0]},nm:"Circle"},ms(tc.banColor,4),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CircGrp"},
    // Diagonal slash
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-20,-20],[20,20]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"Slash"},
      ms(tc.banSlash,4),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SlashGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Green heart (healthy!) — for Prata/Ouro only
  if(tc.showHeart){
    const hDelay=16;
    L.unshift({ddd:0,ind:15,ty:4,nm:"Heart",sr:1,ks:{
      o:{a:1,k:[{...io,t:hDelay,s:[0]},{t:hDelay+3,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:hDelay,s:[130,bY-25,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[130,bY-28,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[130,bY-22,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[130,bY-28,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[
        {...io3,t:hDelay,s:[0,0,100]},{...io3,t:hDelay+3,s:[130,130,100]},{...io3,t:hDelay+6,s:[100,100,100]},
        {...io3,t:42,s:[100,100,100]},{...io3,t:45,s:[115,115,100]},{t:48,s:[100,100,100]},
        {...io3,t:72,s:[100,100,100]},{...io3,t:75,s:[115,115,100]},{t:78,s:[100,100,100]}
      ]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"Ht"},mf([.2,.75,.35,1]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HtGrp"},
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_combate_fumo_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_combate_fumo_t4.json'));}catch{}

const files={base:'seasonal_combate_fumo',t2:'seasonal_combate_fumo_t2',t3:'seasonal_combate_fumo_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_combate_fumo (Bronze + Prata + Ouro)");
