const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VT=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-tie.json'),'utf8'));
// 7 shapes from Game-icons tie SVG (shirt collar + tie parts)

const TIERS = {
  base: {
    nm:"Seasonal Dia Pais",
    tieColor:[.55,.35,.2,1],         // bronze tie
    tieBorder:[.4,.25,.12,1],
    tieStripe:[.65,.48,.28,1],
    giftColor:[.6,.42,.22,1],
    giftRibbon:[.7,.55,.3,1],
    coinColor:[.65,.48,.2,1],
    glow:[.5,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Dia Pais Prata",
    tieColor:[.3,.35,.55,1],         // navy-silver tie
    tieBorder:[.2,.25,.42,1],
    tieStripe:[.45,.5,.65,1],
    giftColor:[.5,.52,.62,1],
    giftRibbon:[.65,.67,.75,1],
    coinColor:[.6,.62,.7,1],
    glow:[.4,.42,.55,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Dia Pais Ouro",
    tieColor:[.15,.25,.5,1],         // deep navy tie (premium)
    tieBorder:[.08,.15,.35,1],
    tieStripe:[1,.843,0,1],          // gold stripes!
    giftColor:[.85,.15,.1,1],        // red gift
    giftRibbon:[1,.843,0,1],         // gold ribbon
    coinColor:[1,.843,0,1],
    glow:[.3,.35,.55,.4],
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

  // Tie (necktie shape: knot + body triangle)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Tie",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:0,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[0,-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Tie SVG (Game-icons — all 7 shapes = shirt collar + tie with knot)
    ...VT.shapes.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"T"+i},mf(i<2?[.92,.92,.9,1]:tc.tieColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"T"+i+"Grp"})),
    // Border on all shapes
    ...VT.shapes.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"TB"+i},ms(tc.tieBorder,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"TB"+i+"Grp"})),
  ],ip:0,op:90,st:0,bm:0});

  // Gift box (bottom right)
  const gDelay=10;
  L.unshift({ddd:0,ind:15,ty:4,nm:"Gift",sr:1,ks:{
    o:{a:1,k:[{...io,t:gDelay,s:[0]},{t:gDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:gDelay,s:[128,bY+18,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[128,bY+15,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[128,bY+21,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[128,bY+15,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:gDelay,s:[0,0,100]},{...io3,t:gDelay+3,s:[120,120,100]},{t:gDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Box body
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[22,18]},p:{a:0,k:[0,2]},r:{a:0,k:3},nm:"Box"},mf(tc.giftColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BoxGrp"},
    // Lid
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[25,6]},p:{a:0,k:[0,-8]},r:{a:0,k:2},nm:"Lid"},mf(tc.giftColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LidGrp"},
    // Ribbon vertical
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,24]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"RbV"},mf(tc.giftRibbon),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RbVGrp"},
    // Ribbon horizontal
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[25,3]},p:{a:0,k:[0,-8]},r:{a:0,k:1},nm:"RbH"},mf(tc.giftRibbon),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RbHGrp"},
    // Bow
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[8,5]},p:{a:0,k:[-5,-13]},nm:"Bw1"},mf(tc.giftRibbon),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:20},o:{a:0,k:100}}],nm:"Bw1Grp"},
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[8,5]},p:{a:0,k:[5,-13]},nm:"Bw2"},mf(tc.giftRibbon),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-20},o:{a:0,k:100}}],nm:"Bw2Grp"},
    // Border
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[22,18]},p:{a:0,k:[0,2]},r:{a:0,k:3},nm:"BoxB"},ms(tc.giftColor.map((v,i)=>i<3?v*0.7:v),1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BoxBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Coin (bottom left)
  const cDelay=14;
  L.unshift({ddd:0,ind:20,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[65,bY+18,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[65,bY+15,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[65,bY+21,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[65,bY+15,0]}
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_pais_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_pais_t4.json'));}catch{}

const files={base:'seasonal_dia_pais',t2:'seasonal_dia_pais_t2',t3:'seasonal_dia_pais_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_dia_pais (Bronze + Prata + Ouro)");
