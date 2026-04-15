const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// Heart path
const hs=1.3;
const heartPath={"v":[[0,7.79*hs],[-1.21*hs,6.69*hs],[-8.33*hs,-2.92*hs],[-3.75*hs,-7.5*hs],[0,-5.76*hs],[3.75*hs,-7.5*hs],[8.33*hs,-2.92*hs],[1.21*hs,6.7*hs],[0,7.79*hs]],"i":[[0,0],[0,0],[0,3.15*hs],[-2.57*hs,0],[-0.91*hs,-1.07*hs],[-1.45*hs,0],[0,-2.57*hs],[4.29*hs,-3.9*hs],[0,0]],"o":[[0,0],[-4.29*hs,-3.89*hs],[0,-2.57*hs],[1.45*hs,0],[0.91*hs,-1.07*hs],[2.57*hs,0],[0,3.15*hs],[0,0],[0,0]],"c":true};

const TIERS = {
  base: {
    nm:"Seasonal Nossa Sra Carmo",
    scapColor:[.5,.35,.18,1],        // brown scapular
    scapBorder:[.38,.25,.1,1],
    cordColor:[.45,.3,.15,1],        // darker cord
    heartColor:[.6,.3,.25,1],        // muted red
    crossColor:[.65,.45,.2,1],       // bronze cross
    glow:[.5,.3,.18,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Nossa Sra Carmo Prata",
    scapColor:[.55,.45,.3,1],        // warmer brown
    scapBorder:[.4,.32,.18,1],
    cordColor:[.5,.4,.25,1],
    heartColor:[.75,.25,.3,1],       // deeper red
    crossColor:[.6,.6,.68,1],        // silver cross
    glow:[.55,.35,.3,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.55,.6,1],
  },
  t3: {
    nm:"Seasonal Nossa Sra Carmo Ouro",
    scapColor:[.6,.42,.2,1],         // rich brown
    scapBorder:[.45,.3,.1,1],
    cordColor:[.5,.35,.15,1],
    heartColor:[.9,.15,.2,1],        // vivid red
    crossColor:[1,.843,0,1],         // gold cross
    glow:[.85,.4,.2,.4],
    sparkle:[1,.843,0,1],
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

  // === CORDAS (layer separada, atrás dos painéis) ===
  L.unshift({ddd:0,ind:8,ty:4,nm:"Cords",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Left cord (from top of left panel going up and curving over shoulder)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{
        v:[[-20,-26],[-15,-40],[-5,-48],[5,-48],[15,-40],[20,-26]],
        i:[[0,0],[-3,0],[-5,0],[-5,0],[-3,0],[0,0]],
        o:[[0,0],[3,0],[5,0],[5,0],[3,0],[0,0]],
        c:false
      }},nm:"Cord"},
      ms(tc.cordColor,3),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CordGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // === PAINÉIS DO ESCAPULÁRIO (layer separada) ===
  L.unshift({ddd:0,ind:10,ty:4,nm:"Panels",sr:1,ks:{
    o:{a:1,k:[{...io,t:2,s:[0]},{t:8,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(2),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:2,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Left panel (frente — Jesus)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[30,40]},p:{a:0,k:[-20,-6]},r:{a:0,k:4},nm:"LP"},mf(tc.scapColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LPGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[30,40]},p:{a:0,k:[-20,-6]},r:{a:0,k:4},nm:"LPB"},ms(tc.scapBorder,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LPBGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[24,34]},p:{a:0,k:[-20,-6]},r:{a:0,k:3},nm:"LPIn"},ms(tc.cordColor,1),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LPInGrp"},
    // Right panel (costas — Maria)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[30,40]},p:{a:0,k:[20,-6]},r:{a:0,k:4},nm:"RP"},mf(tc.scapColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RPGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[30,40]},p:{a:0,k:[20,-6]},r:{a:0,k:4},nm:"RPB"},ms(tc.scapBorder,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RPBGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[24,34]},p:{a:0,k:[20,-6]},r:{a:0,k:3},nm:"RPIn"},ms(tc.cordColor,1),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RPInGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // === SÍMBOLOS nos painéis (layer separada, NA FRENTE) ===
  const symDelay=8;
  L.unshift({ddd:0,ind:11,ty:4,nm:"Symbols",sr:1,ks:{
    o:{a:1,k:[{...io,t:symDelay,s:[0]},{t:symDelay+4,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(symDelay),a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },ao:0,shapes:[
    // CRUZ branca no painel esquerdo (Jesus)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[4,20]},p:{a:0,k:[-20,-6]},r:{a:0,k:1},nm:"CrV"},mf([1,1,.95,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CrVGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[16,4]},p:{a:0,k:[-20,-12]},r:{a:0,k:1},nm:"CrH"},mf([1,1,.95,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CrHGrp"},
    // 5 small stars on top (corona of Mary)
    ...[[-8,-16],[0,-18],[8,-16],[-5,-10],[5,-10]].map(([sx,sy],i)=>({ty:"gr",it:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[20+sx,-6+sy]},r:{a:0,k:0},ir:{a:0,k:1.5},is:{a:0,k:0},or:{a:0,k:3.5},os:{a:0,k:0},ix:1,nm:"Ms"+i},
      mf([1,1,.95,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"Ms"+i+"Grp"})),
    // "M" de Maria (embaixo das estrelas)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[12,4],[16,-6],[20,2],[24,-6],[28,4]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0]],c:false}},nm:"M"},
      ms([1,1,.95,1],3),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Heart (appears between the two panels)
  const hDelay=12;
  L.unshift({ddd:0,ind:15,ty:4,nm:"Heart",sr:1,ks:{
    o:{a:1,k:[{...io,t:hDelay,s:[0]},{t:hDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:hDelay,s:[100,bY+25,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+22,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+28,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY+22,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[
      {...io3,t:hDelay,s:[0,0,100]},{...io3,t:hDelay+3,s:[130,130,100]},{...io3,t:hDelay+6,s:[100,100,100]},
      {...io3,t:35,s:[100,100,100]},{...io3,t:38,s:[120,120,100]},{...io3,t:41,s:[100,100,100]},
      {...io3,t:55,s:[100,100,100]},{...io3,t:58,s:[120,120,100]},{...io3,t:61,s:[100,100,100]},
      {...io3,t:75,s:[100,100,100]},{...io3,t:78,s:[120,120,100]},{t:81,s:[100,100,100]}
    ]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"Ht"},mf(tc.heartColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HtGrp"},
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_nossa_sra_carmo_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_nossa_sra_carmo_t4.json'));}catch{}

const files={base:'seasonal_nossa_sra_carmo',t2:'seasonal_nossa_sra_carmo_t2',t3:'seasonal_nossa_sra_carmo_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_nossa_sra_carmo (Bronze + Prata + Ouro)");
