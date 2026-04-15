const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-cart.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze — carrinho escuro, sem badge, sem moedas extras
    nm:"Seasonal Dia Consumidor",
    cartColor:[.5,.35,.2,1],
    cartBorder:[.35,.22,.12,1],
    glow:[.5,.35,.2,.2],
    sparkle:[.804,.498,.196,1],
    badge:false,
    coins:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata — carrinho prata, badge check, 2 moedas
    nm:"Seasonal Dia Consumidor Prata",
    cartColor:[.5,.55,.65,1],
    cartBorder:[.35,.4,.5,1],
    glow:[.55,.55,.65,.3],
    sparkle:[.75,.75,.78,1],
    badge:true,
    badgeColor:[.5,.55,.65,1],
    badgeIcon:"check",
    coins:2,
    coinColor:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.6,.62,.72,1],
  },
  t3: { // Ouro — carrinho verde vibrante, badge estrela, 4 moedas douradas
    nm:"Seasonal Dia Consumidor Ouro",
    cartColor:[.15,.6,.35,1],
    cartBorder:[.08,.42,.22,1],
    glow:[.15,.55,.35,.4],
    sparkle:[1,.843,0,1],
    badge:true,
    badgeColor:[1,.843,0,1],
    badgeIcon:"star",
    coins:4,
    coinColor:[1,.843,0,1],
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

  // Shopping cart (SVG)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Cart",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"CF"},mf(tc.cartColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CFGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"CB"},ms(tc.cartBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Badge (check or star) — top right
  if(tc.badge){
    const bDelay=16;
    const badgeShapes = tc.badgeIcon==="star" ?
      [{ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:10},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.badgeColor)] :
      [
        // Green circle + white check
        {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,0]},nm:"Bg"},mf(tc.badgeColor),
        {ty:"sh",d:1,ks:{a:0,k:{v:[[-4,-1],[-1.5,2.5],[5,-4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Ck"},
        ms(white,2),
      ];

    L.unshift({ddd:0,ind:15,ty:4,nm:"Badge",sr:1,ks:{
      o:{a:1,k:[{...io,t:bDelay,s:[0]},{t:bDelay+3,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:bDelay,s:[130,bY-22,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[130,bY-25,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[130,bY-19,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[130,bY-25,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:bDelay,s:[0,0,100]},{...io3,t:bDelay+3,s:[130,130,100]},{t:bDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:badgeShapes,ip:0,op:90,st:0,bm:0});
  }

  // Coins falling into cart
  if(tc.coins>0){
    const coinPos=[[90,bY-30],[108,bY-35],[95,bY-25],[112,bY-32]];
    for(let i=0;i<tc.coins;i++){
      const d=18+i*4;
      const cp=coinPos[i];
      L.unshift({ddd:0,ind:30+i,ty:4,nm:"Coin"+i,sr:1,ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+2,s:[100]},{...io,t:d+10,s:[100]},{t:d+12,s:[0]},
          {...io,t:55+i*5,s:[0]},{...io,t:57+i*5,s:[100]},{...io,t:65+i*5,s:[100]},{t:67+i*5,s:[0]}]},
        r:{a:1,k:[{t:d,s:[-10+i*5]},{t:d+10,s:[5]}]},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[cp[0],cp[1]-15,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+10,s:[cp[0],cp[1]+10,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:55+i*5,s:[cp[0],cp[1]-15,0],to:[0,0,0],ti:[0,0,0]},
          {t:65+i*5,s:[cp[0],cp[1]+10,0]}]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[80,80,100]},{t:d+5,s:[100,100,100]}]}
      },ao:0,shapes:[
        {ty:"el",d:1,s:{a:0,k:[10,10]},p:{a:0,k:[0,0]},nm:"C"},mf(tc.coinColor),
        {ty:"rc",d:1,s:{a:0,k:[1.5,6]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"$"},mf(white),
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // Sparkles (3 base)
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

const files={base:'seasonal_dia_consumidor',t2:'seasonal_dia_consumidor_t2',t3:'seasonal_dia_consumidor_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_dia_consumidor (Bronze + Prata + Ouro)");
