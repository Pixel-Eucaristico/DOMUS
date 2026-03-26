const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// No SVG — beach umbrella + waves built with geometric shapes

const TIERS = {
  base: {
    nm:"Seasonal Ferias Julho",
    umbrellaColor:[.7,.4,.15,1],
    sunColor:[.75,.55,.2,1],
    sandColor:[.8,.7,.5,1],
    coinColor:[.65,.48,.2,1],
    glow:[.6,.45,.2,.25],
    sparkle:[.804,.498,.196,1],
    waves:false,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Ferias Julho Prata",
    umbrellaColor:[.5,.52,.62,1],
    sunColor:[.65,.67,.75,1],
    sandColor:[.75,.72,.68,1],
    coinColor:[.6,.62,.7,1],
    glow:[.5,.55,.65,.3],
    sparkle:[.75,.75,.78,1],
    waves:true,
    waveColor:[.4,.6,.8,.5],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Ferias Julho Ouro",
    umbrellaColor:[.9,.25,.15,1],    // bright red umbrella
    sunColor:[1,.843,0,1],           // gold sun
    sandColor:[.95,.88,.65,1],
    coinColor:[1,.843,0,1],
    glow:[.9,.6,.1,.4],
    sparkle:[1,.843,0,1],
    waves:true,
    waveColor:[.15,.5,.85,.6],
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

  // Water (large ellipse, BEHIND sand, at bottom)
  if(tc.waves){
    L.unshift({ddd:0,ind:4,ty:4,nm:"Water",sr:1,ks:{
      o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
      p:staticFloat(0),a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[
        {ty:"el",d:1,s:{a:0,k:[100,45]},p:{a:0,k:[0,28]},nm:"Water"},mf(tc.waveColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"WaterGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sand (ellipse on top of water)
  L.unshift({ddd:0,ind:5,ty:4,nm:"Sand",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[80,22]},p:{a:0,k:[0,26]},nm:"Sand"},mf(tc.sandColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SandGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Beach umbrella — pole + half-circle canopy (flat bottom)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Umbrella",sr:1,ks:{
    o:{a:1,k:[{...io,t:2,s:[0]},{t:8,s:[100]}]},r:{a:0,k:10},  // slight tilt like beach umbrella
    p:staticFloat(2),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:2,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Pole (vertical stick)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,45]},p:{a:0,k:[0,5]},r:{a:0,k:1},nm:"Pole"},mf([.5,.4,.25,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"PoleGrp"},
    // Canopy — top half of circle (semicircle with flat base)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{
        v:[[-30,-17],[0,-42],[30,-17]],
        i:[[0,0],[-22,0],[0,0]],
        o:[[0,-22],[22,0],[0,0]],
        c:true
      }},nm:"Canopy"},
      mf(tc.umbrellaColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CanopyGrp"},
    // White stripe on canopy (alternating color)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[12,25]},p:{a:0,k:[0,-28]},r:{a:0,k:0},nm:"Str1"},mf([1,1,1,.5]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"Str1Grp"},
    // Canopy border
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{
        v:[[-30,-17],[0,-42],[30,-17]],
        i:[[0,0],[-22,0],[0,0]],
        o:[[0,-22],[22,0],[0,0]],
        c:true
      }},nm:"CanBdr"},
      ms(tc.umbrellaColor.map((v,i)=>i<3?v*0.7:v),2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CanBdrGrp"},
    // Top finial (small ball on top)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[5,5]},p:{a:0,k:[0,-42]},nm:"Top"},mf(tc.umbrellaColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TopGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sun (top left)
  const sDelay=10;
  L.unshift({ddd:0,ind:15,ty:4,nm:"Sun",sr:1,ks:{
    o:{a:1,k:[{...io,t:sDelay,s:[0]},{t:sDelay+3,s:[100]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[30]}]},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:sDelay,s:[65,bY-30,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[65,bY-33,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[65,bY-27,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[65,bY-33,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:sDelay,s:[0,0,100]},{...io3,t:sDelay+3,s:[120,120,100]},{t:sDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[14,14]},p:{a:0,k:[0,0]},nm:"SunC"},mf(tc.sunColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SunCGrp"},
    {ty:"gr",it:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:8},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:8},is:{a:0,k:0},or:{a:0,k:14},os:{a:0,k:0},ix:1,nm:"Rays"},
      mf(tc.sunColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RaysGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Coin (bottom right, on sand)
  const cDelay=14;
  L.unshift({ddd:0,ind:20,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[130,bY+20,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[130,bY+17,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[130,bY+23,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[130,bY+17,0]}
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_ferias_julho_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_ferias_julho_t4.json'));}catch{}

const files={base:'seasonal_ferias_julho',t2:'seasonal_ferias_julho_t2',t3:'seasonal_ferias_julho_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_ferias_julho (Bronze + Prata + Ouro)");
