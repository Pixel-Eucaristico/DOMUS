const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-bs-egg.json'),'utf8'));
V.egg.c=true; // close the egg path
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze — ovo marrom simples, sem decoração
    nm:"Seasonal Prep Pascoa",
    eggColor:[.65,.45,.25,1],
    eggBorder:[.48,.3,.15,1],
    eggBand:null,
    glow:[.6,.45,.25,.2],
    sparkle:[.804,.498,.196,1],
    chick:false,
    miniEggs:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata — ovo prata com faixa decorativa, pintinho, 2 mini ovos
    nm:"Seasonal Prep Pascoa Prata",
    eggColor:[.7,.7,.75,1],
    eggBorder:[.5,.5,.58,1],
    eggBand:[.6,.6,.68,1],
    glow:[.6,.6,.7,.3],
    sparkle:[.75,.75,.78,1],
    chick:true,
    chickColor:[.75,.72,.5,1],
    miniEggs:2,
    miniColors:[[.65,.65,.72,1],[.72,.72,.78,1]],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.65,.65,.72,1],
  },
  t3: { // Ouro — ovo colorido vibrante, faixa zigzag, pintinho dourado, 4 mini ovos
    nm:"Seasonal Prep Pascoa Ouro",
    eggColor:[.95,.75,.2,1],
    eggBorder:[.75,.55,.1,1],
    eggBand:[.85,.6,.12,1],
    glow:[.95,.8,.3,.4],
    sparkle:[1,.843,0,1],
    chick:true,
    chickColor:[1,.9,.3,1],
    miniEggs:4,
    miniColors:[[.9,.4,.5,1],[.4,.7,.9,1],[.5,.85,.4,1],[.9,.6,.9,1]],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function floatP(x,baseY,delay){
  return {a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:delay,s:[x,10,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+8,s:[x,baseY+5,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+12,s:[x,baseY-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay+16,s:[x,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[x,baseY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[x,baseY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[x,baseY-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Main egg (SVG)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Egg",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[95,108,100]},{...io3,t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.egg},nm:"EF"},mf(tc.eggColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"EFGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.egg},nm:"EB"},ms(tc.eggBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"EBGrp"},
    // Decorative band (zigzag line across middle)
    ...(tc.eggBand ? [
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[-16,2],[-10,-4],[-4,2],[2,-4],[8,2],[14,-4],[20,2]],i:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],c:false}},nm:"ZZ"},
        ms(tc.eggBand,2),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"ZZGrp"},
    ] : []),
  ],ip:0,op:90,st:0,bm:0});

  // Chick popping out from top of egg
  if(tc.chick){
    const cDelay=14;
    L.unshift({ddd:0,ind:15,ty:4,nm:"Chick",sr:1,ks:{
      o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+4,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[100,bY-25,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay+6,s:[100,bY-30,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-33,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-27,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[100,bY-33,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:cDelay,s:[0,0,100]},{...io3,t:cDelay+3,s:[120,120,100]},{t:cDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      // Body (round)
      {ty:"el",d:1,s:{a:0,k:[16,14]},p:{a:0,k:[0,0]},nm:"CB"},mf(tc.chickColor),
      // Eyes (2 dots)
      {ty:"el",d:1,s:{a:0,k:[3,3]},p:{a:0,k:[-3,-2]},nm:"LE"},mf([.15,.1,.05,1]),
      {ty:"el",d:1,s:{a:0,k:[3,3]},p:{a:0,k:[3,-2]},nm:"RE"},mf([.15,.1,.05,1]),
      // Beak (small triangle)
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,0],[3,2],[0,4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:"Bk"},
      mf([.9,.5,.1,1]),
    ],ip:0,op:90,st:0,bm:0});
  }

  // Mini eggs around
  if(tc.miniEggs>0){
    const mePos=[[72,bY+18],[128,bY+15],[68,bY+5],[132,bY+8]];
    for(let i=0;i<tc.miniEggs;i++){
      const d=18+i*3;
      const mp=mePos[i];
      L.unshift({ddd:0,ind:20+i,ty:4,nm:"MiniEgg"+i,sr:1,ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},
        r:{a:1,k:[{t:d,s:[i%2?-15:15]},{t:d+6,s:[i%2?5:-5]},{t:50,s:[i%2?-3:3]},{t:70,s:[i%2?3:-3]},{t:90,s:[i%2?-3:3]}]},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[mp[0],mp[1]+10,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+6,s:[mp[0],mp[1],0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[mp[0],mp[1]-3,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[mp[0],mp[1]+3,0],to:[0,0,0],ti:[0,0,0]},
          {t:90,s:[mp[0],mp[1]-3,0]}]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+3,s:[50,50,100]},{t:d+6,s:[40,40,100]}]}
      },ao:0,shapes:[
        {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.egg},nm:"ME"},mf(tc.miniColors[i%tc.miniColors.length]),
          {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MEGrp"},
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // Sparkles
  const spP=[[55,78],[148,72],[100,55]];
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
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[30]},{...io,t:32,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[30]},{...io,t:72,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[60,60,100]},{...io3,t:32,s:[130,130,100]},{...io3,t:58,s:[60,60,100]},{t:72,s:[130,130,100]}]}
    },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},ms(tc.pulseColor,2.5)],ip:0,op:90,st:0,bm:0});
  }

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});

const files={base:'seasonal_prep_pascoa',t2:'seasonal_prep_pascoa_t2',t3:'seasonal_prep_pascoa_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_prep_pascoa (Bronze + Prata + Ouro)");
