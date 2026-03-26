const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fire.json'),'utf8'));

const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze - fogo menor, cores marrom/cobre, sem broto, 2 brasas
    nm:"Seasonal Queima Velhos",
    outerFlame:[.7,.35,.1,1],    // brown-orange
    flameBorder:[.55,.2,.05,1],  // dark brown
    innerFlame:[.9,.6,.15,1],    // warm amber
    glow:[.7,.45,.15,.3],
    sparkle:[.804,.498,.196,1],  // bronze
    emberColors:[[.9,.6,.15,1],[.7,.35,.1,1]],
    emberCount:2,
    hasSprout:false,
    flameScale:100,
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata - fogo médio, cores azul-prata, broto pequeno, 3 brasas
    nm:"Seasonal Queima Velhos Prata",
    outerFlame:[.5,.55,.75,1],   // silver-blue flame
    flameBorder:[.35,.4,.6,1],
    innerFlame:[.8,.82,.9,1],    // white-silver
    glow:[.6,.6,.75,.35],
    sparkle:[.75,.75,.78,1],     // silver
    emberColors:[[.8,.82,.9,1],[.6,.62,.75,1]],
    emberCount:3,
    hasSprout:true,
    sproutColor:[.5,.7,.55,1],   // muted green
    sproutDark:[.35,.5,.38,1],
    flameScale:100,
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: { // Ouro - fogo grande, cores laranja/dourado vibrante, broto grande, 6 brasas, extras
    nm:"Seasonal Queima Velhos Ouro",
    outerFlame:[1,.55,.1,1],     // bright orange
    flameBorder:[.9,.2,.1,1],    // red border
    innerFlame:[1,.9,.2,1],      // bright yellow
    glow:[.95,.6,.15,.45],       // brighter glow
    sparkle:[1,.843,0,1],        // gold
    emberColors:[[1,.9,.2,1],[1,.55,.1,1],[1,.7,.15,1]],
    emberCount:6,
    hasSprout:true,
    sproutColor:[.2,.75,.35,1],  // vibrant green
    sproutDark:[.1,.5,.2,1],
    flameScale:100,
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function buildAnim(tc) {
  const L=[];
  const fScale=tc.flameScale/100;

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[8]},{...io,t:45,s:[22]},{t:90,s:[8]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[105,105,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Outer flame
  L.unshift({ddd:0,ind:10,ty:4,nm:"OuterFlame",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[0,-80,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[0,8,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:35,s:[0,-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:50,s:[0,2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:65,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:78,s:[0,1,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[0,-2,0]}
  ]},a:{a:0,k:[0,0,0]},s:{a:1,k:[
    {...io3,t:8,s:[fScale*100,fScale*100,100]},{...io3,t:11,s:[fScale*105,fScale*95,100]},{...io3,t:14,s:[fScale*100,fScale*100,100]},
    {...io3,t:30,s:[fScale*100,fScale*100,100]},{...io3,t:38,s:[fScale*98,fScale*103,100]},{...io3,t:46,s:[fScale*102,fScale*97,100]},
    {...io3,t:54,s:[fScale*97,fScale*104,100]},{...io3,t:62,s:[fScale*103,fScale*98,100]},{...io3,t:70,s:[fScale*98,fScale*102,100]},
    {...io3,t:80,s:[fScale*101,fScale*99,100]},{t:90,s:[fScale*100,fScale*100,100]}
  ]}},ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.outer[0]},nm:"Flame"},mf(tc.outerFlame),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"FlameGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.outer[0]},nm:"FlameBdr"},ms(tc.flameBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BdrGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Inner flame
  L.unshift({ddd:0,ind:11,ty:4,nm:"InnerFlame",sr:1,ks:{o:{a:1,k:[{...io,t:6,s:[0]},{t:10,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:10,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:35,s:[0,-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:50,s:[0,2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:65,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:78,s:[0,1,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[0,-2,0]}
  ]},a:{a:0,k:[0,0,0]},s:{a:1,k:[
    {...io3,t:6,s:[fScale*90,fScale*90,100]},{...io3,t:10,s:[fScale*100,fScale*100,100]},
    {...io3,t:32,s:[fScale*102,fScale*96,100]},{...io3,t:42,s:[fScale*96,fScale*104,100]},
    {...io3,t:52,s:[fScale*104,fScale*97,100]},{...io3,t:62,s:[fScale*97,fScale*103,100]},
    {...io3,t:72,s:[fScale*103,fScale*98,100]},{t:90,s:[fScale*100,fScale*100,100]}
  ]}},ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.inner[0]},nm:"Inner"},mf(tc.innerFlame),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"InnerGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sprout (Prata/Ouro only)
  if(tc.hasSprout){
    const sproutDelay=22;
    L.unshift({ddd:0,ind:20,ty:4,nm:"Sprout",sr:1,ks:{
      o:{a:1,k:[{...io,t:sproutDelay,s:[0]},{t:sproutDelay+4,s:[100]}]},
      r:{a:1,k:[{t:sproutDelay,s:[10]},{t:sproutDelay+8,s:[-5]},{t:50,s:[3]},{t:70,s:[-3]},{t:90,s:[3]}]},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:sproutDelay,s:[100,bY+35,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:sproutDelay+8,s:[100,bY+28,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+25,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+31,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[100,bY+25,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:sproutDelay,s:[0,0,100]},{...io3,t:sproutDelay+4,s:[100,40,100]},{...io3,t:sproutDelay+10,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[3,14]},p:{a:0,k:[0,3]},r:{a:0,k:1.5},nm:"Stem"},mf(tc.sproutDark),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"StemGrp"},
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[10,6]},p:{a:0,k:[-5,-3]},nm:"LL"},mf(tc.sproutColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-25},o:{a:0,k:100}}],nm:"LLGrp"},
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[10,6]},p:{a:0,k:[5,-3]},nm:"RL"},mf(tc.sproutColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:25},o:{a:0,k:100}}],nm:"RLGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Embers
  const emberP=[[90,bY-5],[110,bY-10],[95,bY+5],[105,bY],[85,bY-15],[115,bY-8]];
  for(let i=0;i<tc.emberCount;i++){
    const ep=emberP[i];const d=12+i*3;
    L.unshift({ddd:0,ind:30+i,ty:4,nm:"Ember"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[80]},{...io,t:d+15,s:[0]},
        {...io,t:50+i*4,s:[0]},{...io,t:53+i*4,s:[80]},{...io,t:65+i*4,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[ep[0],ep[1],0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d+15,s:[ep[0]+(i%2?5:-5),ep[1]-25,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:50+i*4,s:[ep[0],ep[1],0],to:[0,0,0],ti:[0,0,0]},
        {t:65+i*4,s:[ep[0]+(i%2?-5:5),ep[1]-25,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },ao:0,shapes:[
      {ty:"el",d:1,s:{a:0,k:[3,3]},p:{a:0,k:[0,0]},nm:"E"},
      mf(tc.emberColors[i%tc.emberColors.length]),
    ],ip:0,op:90,st:0,bm:0});
  }

  // Base sparkles (3)
  const spP=[[55,75],[148,72],[100,55]];
  for(let i=0;i<3;i++){const d=26+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  // Extra sparkles (Ouro)
  const exSpP=[[48,82],[155,78],[65,58],[138,62],[100,45]];
  for(let i=0;i<tc.extraSparkles;i++){
    const d=20+i*4;
    L.unshift({ddd:0,ind:300+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:62+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},p:{a:0,k:[exSpP[i][0],exSpP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});
  }

  // Pulse ring (Prata/Ouro)
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

const files={base:'seasonal_queima_velhos',t2:'seasonal_queima_velhos_t2',t3:'seasonal_queima_velhos_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_queima_velhos (Bronze + Prata + Ouro)");
