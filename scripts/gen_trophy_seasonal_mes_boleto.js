const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VR=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-receipt.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: {
    nm:"Seasonal Mes Boleto",
    paperColor:[.95,.92,.85,1],     // warm beige paper
    paperBorder:[.6,.5,.35,1],      // bronze border
    headerColor:[.55,.4,.22,1],     // bronze header
    barColor:[.45,.35,.2,1],        // bronze barcode
    lineColor:[.7,.6,.45,1],
    checkColor:[.6,.42,.2,1],       // bronze check
    glow:[.5,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Mes Boleto Prata",
    paperColor:[.92,.93,.95,1],     // cool white paper
    paperBorder:[.55,.57,.65,1],
    headerColor:[.45,.48,.58,1],    // silver header
    barColor:[.4,.42,.5,1],
    lineColor:[.65,.67,.73,1],
    checkColor:[.5,.52,.6,1],
    glow:[.55,.57,.65,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Mes Boleto Ouro",
    paperColor:[1,.98,.92,1],       // bright white-gold paper
    paperBorder:[.85,.7,.15,1],     // gold border
    headerColor:[.15,.3,.55,1],     // navy header (premium)
    barColor:[.2,.25,.4,1],
    lineColor:[.5,.55,.7,1],
    checkColor:[.18,.75,.35,1],     // green check
    glow:[.9,.75,.2,.4],
    sparkle:[1,.843,0,1],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function floatP(delay){
  return {a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:delay,s:[0,-90,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+8,s:[0,5,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+12,s:[0,-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay+16,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[0,-3,0]}
  ]};
}

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

  // Receipt paper (BS SVG with zigzag edges)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Receipt",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:floatP(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Inner paper fill (use shape[1] which is closed)
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VR.receipt[1]},nm:"PF"},mf(tc.paperColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"PFGrp"},
    // Paper border
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VR.receipt[1]},nm:"PB"},ms(tc.paperBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"PBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Content on receipt (header bar, text lines, barcode) — separate layer
  const cDelay=10;
  L.unshift({ddd:0,ind:11,ty:4,nm:"Content",sr:1,ks:{
    o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+4,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(cDelay),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:cDelay,s:[0,0,100]},{...io3,t:cDelay+3,s:[110,110,100]},{t:cDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Header bar
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[50,10]},p:{a:0,k:[0,-28]},r:{a:0,k:2},nm:"Hdr"},mf(tc.headerColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HdrGrp"},
    // Text lines
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[40,3]},p:{a:0,k:[-2,-15]},r:{a:0,k:1.5},nm:"L1"},mf(tc.lineColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"L1Grp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[35,3]},p:{a:0,k:[-4.5,-8]},r:{a:0,k:1.5},nm:"L2"},mf(tc.lineColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"L2Grp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[42,3]},p:{a:0,k:[-1,-1]},r:{a:0,k:1.5},nm:"L3"},mf(tc.lineColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"L3Grp"},
    // Barcode (multiple vertical bars)
    ...[0,4,6,9,11,14,16,18,21,23,25,28,30,33,35,38,40,42].map((x,i)=>({ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[i%3===0?3:2,14]},p:{a:0,k:[-22+x,18]},r:{a:0,k:0},nm:"Bar"+i},mf(tc.barColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"Bar"+i+"Grp"})),
  ],ip:0,op:90,st:0,bm:0});

  // Green check stamp (appears after content)
  const chkDelay=18;
  L.unshift({ddd:0,ind:15,ty:4,nm:"CheckStamp",sr:1,ks:{
    o:{a:1,k:[{...io,t:chkDelay,s:[0]},{t:chkDelay+3,s:[100]}]},r:{a:1,k:[{t:chkDelay,s:[-15]},{t:chkDelay+5,s:[5]},{t:chkDelay+8,s:[0]}]},
    p:staticFloat(chkDelay),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:chkDelay,s:[0,0,100]},{...io3,t:chkDelay+3,s:[130,130,100]},{t:chkDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Circle bg
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[22,22]},p:{a:0,k:[15,-5]},nm:"Cbg"},mf(tc.checkColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CbgGrp"},
    // White check
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[11,-8],[14,-3],[20,-10]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Chk"},
      ms(white,2.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"ChkGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Sparkles
  const spP=[[55,75],[148,72],[100,55]];
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_mes_boleto_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_mes_boleto_t4.json'));}catch{}

const files={base:'seasonal_mes_boleto',t2:'seasonal_mes_boleto_t2',t3:'seasonal_mes_boleto_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_mes_boleto (Bronze + Prata + Ouro)");
