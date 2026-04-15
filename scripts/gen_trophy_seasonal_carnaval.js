const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-masks-all.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze
    nm:"Seasonal Carnaval",
    sadColor:[.55,.4,.25,1],      // brown sad mask
    happyColor:[.7,.45,.2,1],     // bronze happy mask
    glow:[.5,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    confettiCount:4,              // fewer confetti
    confettiColors:[[.9,.6,.15,1],[.7,.35,.1,1],[.55,.4,.25,1],[.85,.55,.2,1]],
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata
    nm:"Seasonal Carnaval Prata",
    sadColor:[.45,.5,.65,1],      // silver-blue sad mask
    happyColor:[.6,.62,.72,1],    // silver happy mask
    glow:[.6,.6,.7,.3],
    sparkle:[.75,.75,.78,1],
    confettiCount:6,
    confettiColors:[[.75,.75,.8,1],[.5,.55,.7,1],[.65,.67,.75,1],[.8,.8,.85,1],[.55,.6,.72,1],[.7,.72,.8,1]],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: { // Ouro
    nm:"Seasonal Carnaval Ouro",
    sadColor:[.3,.5,.8,1],        // vibrant blue sad mask
    happyColor:[.6,.15,.75,1],    // vibrant purple happy mask
    glow:[.5,.2,.6,.4],           // brighter glow
    sparkle:[1,.843,0,1],
    confettiCount:10,             // lots of confetti!
    confettiColors:[[1,.85,.1,1],[.9,.2,.15,1],[.1,.7,.35,1],[.1,.8,.9,1],[.6,.15,.75,1],[1,.843,0,1],[1,.5,.2,1],[.3,.5,.8,1],[.9,.4,.6,1],[.2,.85,.5,1]],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function floatP(delay){
  return {a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:delay,s:[0,-100,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+8,s:[0,5,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+12,s:[0,-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay+16,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[0,-3,0]}
  ]};
}

const rng=(s)=>{let x=Math.sin(s)*10000;return x-Math.floor(x);};

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[20]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Sad mask
  L.unshift({ddd:0,ind:10,ty:4,nm:"SadMask",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:floatP(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[2]},nm:"SE"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SEGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"SM"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SMGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[1]},nm:"SB"},mf(tc.sadColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Happy mask
  L.unshift({ddd:0,ind:11,ty:4,nm:"HappyMask",sr:1,ks:{
    o:{a:1,k:[{...io,t:4,s:[0]},{t:10,s:[100]}]},r:{a:0,k:0},p:floatP(4),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:4,s:[0,0,100]},{...io3,t:10,s:[105,95,100]},{t:14,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[4]},nm:"HE1"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HE1Grp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[5]},nm:"HS"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HSGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[6]},nm:"HE2"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HE2Grp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[3]},nm:"HB"},mf(tc.happyColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Confetti
  for(let i=0;i<tc.confettiCount;i++){
    const d=14+i*2;
    const startX=65+rng(i*7+1)*70;
    const startY=bY-25+rng(i*7+2)*25;
    const endX=startX+(rng(i*7+3)-.5)*45;
    const endY=startY+25+rng(i*7+4)*25;
    const col=tc.confettiColors[i%tc.confettiColors.length];
    L.unshift({ddd:0,ind:40+i,ty:4,nm:"Conf"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[90]},{...io,t:d+18,s:[0]},
        {...io,t:55+i*3,s:[0]},{...io,t:58+i*3,s:[90]},{...io,t:73+i*3,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:d,s:[i*45]},{t:d+18,s:[i*45+180]},{t:55+i*3,s:[i*45]},{t:73+i*3,s:[i*45+180]}]},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[startX,startY-15,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d+18,s:[endX,endY,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:55+i*3,s:[startX,startY-15,0],to:[0,0,0],ti:[0,0,0]},
        {t:73+i*3,s:[endX,endY,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },ao:0,shapes:[
      {ty:"rc",d:1,s:{a:0,k:[4,3]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"C"},mf(col),
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sparkles (3 base)
  const spP=[[55,78],[148,75],[100,60]];
  for(let i=0;i<3;i++){const d=24+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  // Extra sparkles (Ouro)
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

const files={base:'seasonal_carnaval',t2:'seasonal_carnaval_t2',t3:'seasonal_carnaval_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_carnaval (Bronze + Prata + Ouro)");
