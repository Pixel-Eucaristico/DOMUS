const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-cross.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze
    nm:"Seasonal Quaresma",
    crossColor:[.55,.35,.2,1],      // brown cross
    crossBorder:[.4,.22,.12,1],
    glow:[.5,.35,.2,.2],
    sparkle:[.804,.498,.196,1],
    // Coin with slash (gastos cortados)
    coinColor:[.804,.498,.196,1],
    slashColor:[.55,.35,.2,1],
    // Light rays
    rayCount:0,
    rayColor:[.804,.498,.196,.3],
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata
    nm:"Seasonal Quaresma Prata",
    crossColor:[.5,.5,.55,1],       // silver cross
    crossBorder:[.35,.35,.42,1],
    glow:[.55,.55,.65,.3],
    sparkle:[.75,.75,.78,1],
    coinColor:[.75,.75,.78,1],
    slashColor:[.5,.5,.55,1],
    rayCount:4,
    rayColor:[.75,.75,.78,.3],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: { // Ouro
    nm:"Seasonal Quaresma Ouro",
    crossColor:[.55,.25,.55,1],     // purple cross (liturgical color)
    crossBorder:[.4,.12,.4,1],
    glow:[.6,.3,.6,.35],
    sparkle:[1,.843,0,1],
    coinColor:[1,.843,0,1],
    slashColor:[.55,.25,.55,1],
    rayCount:6,
    rayColor:[1,.9,.5,.3],
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
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[20]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Light rays behind cross
  if(tc.rayCount>0){
    for(let i=0;i<tc.rayCount;i++){
      const angle=(i/tc.rayCount)*Math.PI*2-Math.PI/2;
      const rx=100+Math.cos(angle)*42;
      const ry=bY+Math.sin(angle)*42;
      const rot=(i/tc.rayCount)*360;
      L.unshift({ddd:0,ind:5+i,ty:4,nm:"Ray"+i,sr:1,ks:{
        o:{a:1,k:[{...io,t:12+i*2,s:[0]},{...io,t:16+i*2,s:[40]},{...io,t:45,s:[25]},{...io,t:67,s:[40]},{t:90,s:[25]}]},
        r:{a:0,k:rot},p:{a:0,k:[rx,ry,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
      },ao:0,shapes:[
        {ty:"rc",d:1,s:{a:0,k:[2.5,14]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"Ray"},mf(tc.rayColor),
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // Cross (SVG path)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Cross",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.cross},nm:"CF"},mf(tc.crossColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CFGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.cross},nm:"CB"},ms(tc.crossBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Coin with slash (gastos cortados) — bottom right of cross
  const coinDelay=16;
  L.unshift({ddd:0,ind:20,ty:4,nm:"CoinSlash",sr:1,ks:{
    o:{a:1,k:[{...io,t:coinDelay,s:[0]},{t:coinDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:coinDelay,s:[120,bY+15,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[120,bY+12,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[120,bY+18,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[120,bY+12,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:coinDelay,s:[0,0,100]},{...io3,t:coinDelay+3,s:[130,130,100]},{t:coinDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Coin circle
    {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[20,20]},p:{a:0,k:[0,0]},nm:"CC"},mf(tc.coinColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CCGrp"},
    // $ sign
    {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[2,10]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"DV"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"DVGrp"},
    // Diagonal slash (jejum/corte)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-8,8],[8,-8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"Slash"},
      ms(tc.slashColor,3),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SlashGrp"},
    // Coin border
    {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[20,20]},p:{a:0,k:[0,0]},nm:"CBdr"},ms(tc.slashColor,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CBdrGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sparkles (3 base)
  const spP=[[58,78],[145,72],[100,55]];
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

const files={base:'seasonal_quaresma',t2:'seasonal_quaresma_t2',t3:'seasonal_quaresma_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_quaresma (Bronze + Prata + Ouro)");
