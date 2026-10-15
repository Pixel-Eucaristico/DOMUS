const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-crown.json'),'utf8'));
// Close the path
V.crown.c = true;

const L=[];
const gold=[1,.843,0,1],darkGold=[.85,.65,0,1],lightGold=[1,.92,.5,1];
const ruby=[.85,.12,.18,1],emerald=[.1,.65,.35,1],sapphire=[.15,.3,.75,1];

// --- Glow ---
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf([.95,.85,.4,.35])],ip:0,op:90,st:0,bm:0});

// --- Crown from SVG (drops in with bounce) ---
L.unshift({ddd:0,ind:10,ty:4,nm:"Crown",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[0,-80,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[0,8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[0,-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[108,92,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Crown fill
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.crown},nm:"CrownFill"},
    mf(gold),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"FillGrp"},
  // Crown border
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.crown},nm:"CrownBdr"},
    ms(darkGold,2.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BdrGrp"},
  // Band line across base
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[77,130],[123,130]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"Band"},
    ms(darkGold,3),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BandGrp"},
],ip:0,op:90,st:0,bm:0});

// --- 3 Gems on band (3 Kings: ruby, emerald, sapphire) ---
const gemPositions = [{x:87,y:130},{x:100,y:130},{x:113,y:130}];
const gemColors = [ruby, emerald, sapphire];

gemPositions.forEach((gp,i) => {
  const d=14+i*3;
  L.unshift({ddd:0,ind:20+i,ty:4,nm:"Gem"+i,sr:1,ks:{
    o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},
    r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[gp.x,gp.y,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[gp.x,gp.y-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[gp.x,gp.y+3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[gp.x,gp.y-3,0]}
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+2,s:[140,140,100]},{t:d+4,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[7,7]},p:{a:0,k:[0,0]},nm:"Gem"},
    mf(gemColors[i]),
    {ty:"el",d:1,s:{a:0,k:[7,7]},p:{a:0,k:[0,0]},nm:"GemBdr"},
    ms(darkGold,1),
  ],ip:0,op:90,st:0,bm:0});
});

// --- Star on top peak ---
const starDelay=22;
L.unshift({ddd:0,ind:40,ty:4,nm:"TopStar",sr:1,ks:{
  o:{a:1,k:[{...io,t:starDelay,s:[0]},{t:starDelay+3,s:[100]}]},
  r:{a:1,k:[{t:starDelay,s:[-20]},{t:starDelay+6,s:[5]},{t:60,s:[-5]},{t:75,s:[5]},{t:90,s:[-5]}]},
  p:{a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:starDelay,s:[100,88,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,85,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,91,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,85,0]}
  ]},
  a:{a:0,k:[0,0,0]},
  s:{a:1,k:[{...io3,t:starDelay,s:[0,0,100]},{...io3,t:starDelay+3,s:[140,140,100]},{t:starDelay+6,s:[100,100,100]}]}
},ao:0,shapes:[
  {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:10},os:{a:0,k:0},ix:1,nm:"Star"},
  mf(lightGold),
],ip:0,op:90,st:0,bm:0});

// --- Sparkles ---
const spP=[[58,78],[145,75],[100,60]];
for(let i=0;i<3;i++){const d=26+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Seasonal Dia de Reis",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'seasonal_dia_de_reis.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/seasonal_dia_de_reis.json',JSON.stringify(anim));}catch{}
console.log("Done: seasonal_dia_de_reis");
