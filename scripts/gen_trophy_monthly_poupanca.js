const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// Load converted SVG vertices
const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-piggybank.json'),'utf8'));

const L=[];
const gold=[1,.843,0,1],pink=[1,.537,.522,1],darkRed=[.737,.314,.314,1],yellow=[1,.929,.2,1];

// --- Glow ---
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[20]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf([.95,.7,.75,.4])],ip:0,op:90,st:0,bm:0});

// --- Piggy body (SVG path, drops in with bounce) ---
L.unshift({ddd:0,ind:10,ty:4,nm:"PiggyBody",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[0,-80,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[0,8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[0,-4,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  // idle float
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[0,-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[106,94,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Body path
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.body},nm:"Body"},
    mf(pink),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BodyGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Eye + Eyebrow details ---
L.unshift({ddd:0,ind:11,ty:4,nm:"Details",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[0,-80,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[0,8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[0,-4,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[0,-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[106,94,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Eye
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.eye},nm:"Eye"},
    mf(darkRed),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"EyeGrp"},
  // Eyebrow
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.eyebrow},nm:"Brow"},
    mf(darkRed),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BrowGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Coin (animated: falls from top, repeats) ---
// Coin is originally at top of piggy. We'll animate it dropping in.
const coinDelay=16;
L.unshift({ddd:0,ind:20,ty:4,nm:"Coin",sr:1,ks:{o:{a:1,k:[
  {...io,t:coinDelay,s:[0]},{...io,t:coinDelay+2,s:[100]},
  {...io,t:coinDelay+12,s:[100]},{t:coinDelay+14,s:[0]},
  // repeat
  {...io,t:55,s:[0]},{...io,t:57,s:[100]},
  {...io,t:67,s:[100]},{t:69,s:[0]}
]},r:{a:0,k:0},p:{a:1,k:[
  // First drop
  {i:{x:.667,y:1},o:{x:.333,y:0},t:coinDelay,s:[0,-30,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:coinDelay+10,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:coinDelay+14,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  // Second drop
  {i:{x:.667,y:1},o:{x:.333,y:0},t:55,s:[0,-30,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:65,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  {t:69,s:[0,3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},ao:0,shapes:[
  // Coin ring (gold outline)
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.coinOuter},nm:"Ring"},
    mf(gold),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"RingGrp"},
  // Coin inner hole
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.coinInner},nm:"Inner"},
    mf(gold),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"InnerGrp"},
  // Coin fill
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.coinFill},nm:"Fill"},
    mf(yellow),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"FillGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Sparkles ---
const spP=[[55,70],[150,65],[100,45]];
for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Monthly Poupanca",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'monthly_poupanca.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_poupanca.json',JSON.stringify(anim));}catch{}
console.log("Done: monthly_poupanca");
