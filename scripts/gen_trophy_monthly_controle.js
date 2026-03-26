const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-shield-bootstrap.json'),'utf8'));

const L=[];
const gold=[1,.843,0,1],white=[1,1,1,1];
const teal=[.15,.6,.52,1],darkTeal=[.1,.42,.35,1],lightTeal=[.25,.78,.68,1];

// --- Glow ---
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf([.15,.55,.5,.4])],ip:0,op:90,st:0,bm:0});

// --- Shield (Bootstrap SVG, drops in with bounce) ---
L.unshift({ddd:0,ind:10,ty:4,nm:"Shield",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[0,-80,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[0,8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  // idle float
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[0,-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[106,94,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Shield outer fill
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.shield[0]},nm:"ShOuter"},
    mf(teal),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"OuterGrp"},
  // Shield inner fill (lighter)
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.inner[0]},nm:"ShInner"},
    mf(lightTeal),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"InnerGrp"},
  // Shield border
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.shield[0]},nm:"Bdr"},
    ms(darkTeal,2),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BdrGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Checkmark (SVG path, appears with bounce after shield) ---
const chkDelay=16;
L.unshift({ddd:0,ind:11,ty:4,nm:"Check",sr:1,ks:{o:{a:1,k:[{...io,t:chkDelay,s:[0]},{t:chkDelay+4,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:chkDelay,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[0,-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:chkDelay,s:[0,0,100]},{...io3,t:chkDelay+3,s:[130,130,100]},{t:chkDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.check[0]},nm:"Chk"},
    mf(white),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"ChkGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Pulse ring ---
L.unshift({ddd:0,ind:12,ty:4,nm:"Pulse",sr:1,ks:{o:{a:1,k:[
  {...io,t:22,s:[0]},{...io,t:26,s:[35]},{...io,t:36,s:[0]},
  {...io,t:62,s:[0]},{...io,t:66,s:[35]},{...io,t:76,s:[0]},
  {t:90,s:[0]}
]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[
  {...io3,t:22,s:[80,80,100]},{...io3,t:36,s:[140,140,100]},
  {...io3,t:62,s:[80,80,100]},{...io3,t:76,s:[140,140,100]},
  {t:90,s:[80,80,100]}
]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[80,90]},p:{a:0,k:[0,0]},nm:"Ring"},ms(teal,2)],ip:0,op:90,st:0,bm:0});

// --- Sparkles ---
const spP=[[55,70],[150,65],[100,50]];
for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Monthly Controle",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'monthly_controle.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_controle.json',JSON.stringify(anim));}catch{}
console.log("Done: monthly_controle");
