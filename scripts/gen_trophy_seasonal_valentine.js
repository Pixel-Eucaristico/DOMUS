const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-heart.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze
    nm:"Seasonal Valentine",
    heartColor:[.7,.3,.25,1],       // muted dark red
    heartBorder:[.5,.18,.15,1],
    innerHeart:[.85,.45,.35,1],     // lighter bronze-red
    glow:[.7,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    coinColor:[.804,.498,.196,1],
    miniHearts:2,
    miniHeartColor:[.7,.3,.25,.6],
    extraSparkles:0,
    pulse:false,
    heartbeat:false,
  },
  t2: { // Prata
    nm:"Seasonal Valentine Prata",
    heartColor:[.7,.45,.55,1],      // silver-pink
    heartBorder:[.5,.3,.4,1],
    innerHeart:[.82,.6,.68,1],
    glow:[.65,.5,.6,.3],
    sparkle:[.75,.75,.78,1],
    coinColor:[.75,.75,.78,1],
    miniHearts:3,
    miniHeartColor:[.7,.5,.6,.5],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.6,.68,1],
    heartbeat:true,
  },
  t3: { // Ouro
    nm:"Seasonal Valentine Ouro",
    heartColor:[.9,.15,.2,1],       // vibrant red
    heartBorder:[.7,.08,.12,1],
    innerHeart:[1,.35,.4,1],        // bright pink-red
    glow:[.95,.3,.25,.4],
    sparkle:[1,.843,0,1],
    coinColor:[1,.843,0,1],
    miniHearts:5,
    miniHeartColor:[1,.3,.35,.7],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
    heartbeat:true,
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

  // Main heart (SVG path, centered at [0,0])
  const heartScale = tc.heartbeat ?
    {a:1,k:[
      {...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{...io3,t:12,s:[100,100,100]},
      // Heartbeat pulse
      {...io3,t:35,s:[100,100,100]},{...io3,t:38,s:[108,108,100]},{...io3,t:41,s:[100,100,100]},
      {...io3,t:44,s:[105,105,100]},{...io3,t:47,s:[100,100,100]},
      {...io3,t:65,s:[100,100,100]},{...io3,t:68,s:[108,108,100]},{...io3,t:71,s:[100,100,100]},
      {...io3,t:74,s:[105,105,100]},{t:77,s:[100,100,100]}
    ]} :
    {a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]};

  L.unshift({ddd:0,ind:10,ty:4,nm:"Heart",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},s:heartScale
  },ao:0,shapes:[
    // Heart fill
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.heart},nm:"HF"},mf(tc.heartColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HFGrp"},
    // Heart border
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.heart},nm:"HB"},ms(tc.heartBorder,2.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Inner heart (smaller, lighter, on top)
  L.unshift({ddd:0,ind:11,ty:4,nm:"InnerHeart",sr:1,ks:{
    o:{a:1,k:[{...io,t:8,s:[0]},{t:12,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},s:heartScale
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.heart},nm:"IH"},mf(tc.innerHeart),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[65,65]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"IHGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Coin/cifrão on heart (planning aspect)
  const coinDelay=16;
  L.unshift({ddd:0,ind:12,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:coinDelay,s:[0]},{t:coinDelay+3,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY-2,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:coinDelay,s:[0,0,100]},{...io3,t:coinDelay+3,s:[130,130,100]},{t:coinDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Coin circle
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[18,18]},p:{a:0,k:[0,0]},nm:"CC"},
      mf(tc.coinColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CCGrp"},
    // $ sign
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[2,10]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"DV"},
      mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DVGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[7,2]},p:{a:0,k:[0,-2]},r:{a:0,k:1},nm:"DH1"},
      mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DH1Grp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[7,2]},p:{a:0,k:[0,2]},r:{a:0,k:1},nm:"DH2"},
      mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DH2Grp"},
  ],ip:0,op:90,st:0,bm:0});

  // Mini hearts floating up
  const miniPos=[[80,bY-10],[120,bY-15],[70,bY+5],[130,bY],[90,bY-25]];
  for(let i=0;i<tc.miniHearts;i++){
    const d=18+i*4;
    L.unshift({ddd:0,ind:30+i,ty:4,nm:"MiniH"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[70]},{...io,t:d+14,s:[0]},
        {...io,t:55+i*5,s:[0]},{...io,t:58+i*5,s:[70]},{...io,t:69+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:d,s:[i%2?-10:10]},{t:d+14,s:[i%2?10:-10]}]},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[miniPos[i][0],miniPos[i][1],0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:d+14,s:[miniPos[i][0]+(i%2?8:-8),miniPos[i][1]-20,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:55+i*5,s:[miniPos[i][0],miniPos[i][1],0],to:[0,0,0],ti:[0,0,0]},
        {t:69+i*5,s:[miniPos[i][0]+(i%2?-8:8),miniPos[i][1]-20,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[40,40,100]},{...io3,t:d+5,s:[60,60,100]},{t:d+14,s:[30,30,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.heart},nm:"MH"},mf(tc.miniHeartColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MHGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sparkles (3 base)
  const spP=[[55,78],[148,72],[100,55]];
  for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  // Extra sparkles (Ouro)
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

const files={base:'seasonal_valentine',t2:'seasonal_valentine_t2',t3:'seasonal_valentine_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_valentine (Bronze + Prata + Ouro)");
