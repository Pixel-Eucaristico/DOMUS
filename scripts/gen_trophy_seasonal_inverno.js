const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// No SVG — hot cup + steam + coin geometric

const TIERS = {
  base: {
    nm:"Seasonal Inverno",
    cupColor:[.55,.38,.22,1],
    cupBorder:[.35,.22,.1,1],
    steamColor:[.6,.5,.35,.4],
    coinColor:[.65,.48,.2,1],
    glow:[.45,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    steamCount:2,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Inverno Prata",
    cupColor:[.5,.52,.62,1],
    cupBorder:[.35,.38,.48,1],
    steamColor:[.6,.62,.7,.4],
    coinColor:[.6,.62,.7,1],
    glow:[.5,.52,.6,.3],
    sparkle:[.75,.75,.78,1],
    steamCount:3,
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Inverno Ouro",
    cupColor:[.85,.15,.1,1],
    cupBorder:[.6,.08,.05,1],
    steamColor:[1,.9,.5,.5],         // golden steam
    coinColor:[1,.843,0,1],
    glow:[.8,.4,.15,.4],
    sparkle:[1,.843,0,1],
    steamCount:4,
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
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

  // Hot cup (mug body + handle + saucer)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Cup",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Saucer (ellipse at bottom)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[50,10]},p:{a:0,k:[0,22]},nm:"Saucer"},mf(tc.cupColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SaucerGrp"},
    // Mug body (trapezoid — wider at top)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-18,-12],[18,-12],[15,18],[-15,18]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"MugBody"},
      mf(tc.cupColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MugBodyGrp"},
    // Handle (semicircle on right)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[18,-5],[28,3],[18,12]],i:[[0,0],[0,-6],[0,0]],o:[[0,0],[0,6],[0,0]],c:false}},nm:"Handle"},
      ms(tc.cupColor,3.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HandleGrp"},
    // Liquid inside (darker line at top)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[30,4]},p:{a:0,k:[0,-8]},r:{a:0,k:1},nm:"Liquid"},mf(tc.cupBorder),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LiquidGrp"},
    // Mug border
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-18,-12],[18,-12],[15,18],[-15,18]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"MugB"},
      ms(tc.cupBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MugBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Steam (wavy lines rising from cup)
  for(let i=0;i<tc.steamCount;i++){
    const sD=10+i*4;
    const sx=-8+i*8;
    L.unshift({ddd:0,ind:30+i,ty:4,nm:"Steam"+i,sr:1,ks:{
      o:{a:1,k:[
        {...io,t:sD,s:[0]},{...io,t:sD+5,s:[50]},{...io,t:sD+18,s:[0]},
        {...io,t:50+i*5,s:[0]},{...io,t:55+i*5,s:[50]},{...io,t:68+i*5,s:[0]},
        {t:90,s:[0]}
      ]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:sD,s:[100+sx,bY-15,0],to:[0,-3,0],ti:[0,3,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:sD+18,s:[100+sx,bY-40,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:50+i*5,s:[100+sx,bY-15,0],to:[0,-3,0],ti:[0,3,0]},
        {t:68+i*5,s:[100+sx,bY-40,0]}
      ]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },ao:0,shapes:[
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[0,0],[-3,-8],[3,-16],[0,-24]],i:[[0,0],[2,3],[-2,3],[0,0]],o:[[0,0],[-2,-3],[2,-3],[0,0]],c:false}},nm:"Stm"},
        ms(tc.steamColor,2),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"StmGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Coin badge (top right)
  const cDelay=14;
  L.unshift({ddd:0,ind:20,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[135,bY-25,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[135,bY-28,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[135,bY-22,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[135,bY-28,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:cDelay,s:[0,0,100]},{...io3,t:cDelay+3,s:[130,130,100]},{t:cDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,0]},nm:"Cn"},mf(tc.coinColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CnGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[2,9]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"$"},mf([1,1,1,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"$Grp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sparkles
  const spP=[[55,75],[148,72],[100,55]];
  for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  const exSpP=[[48,82],[155,78],[65,58],[138,62],[100,45]];
  for(let i=0;i<tc.extraSparkles;i++){const d=20+i*4;L.unshift({ddd:0,ind:300+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:62+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},p:{a:0,k:[exSpP[i][0],exSpP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

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

try{fs.unlinkSync(path.join(prevDir,'seasonal_inverno_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_inverno_t4.json'));}catch{}

const files={base:'seasonal_inverno',t2:'seasonal_inverno_t2',t3:'seasonal_inverno_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_inverno (Bronze + Prata + Ouro)");
