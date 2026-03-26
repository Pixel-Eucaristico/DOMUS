const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-praying.json'),'utf8'));

const L=[];
const gold=[1,.843,0,1],white=[1,1,1,1];
const purple=[.55,.3,.75,1],darkPurple=[.4,.2,.6,1],lightPurple=[.7,.5,.85,1];
const warmYellow=[1,.92,.5,1];

// --- Glow (warm golden for spiritual feel) ---
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf([.95,.85,.5,.4])],ip:0,op:90,st:0,bm:0});

// --- Halo/aureola behind hands ---
L.unshift({ddd:0,ind:2,ty:4,nm:"Halo",sr:1,ks:{o:{a:1,k:[{...io,t:10,s:[0]},{...io,t:16,s:[50]},{...io,t:45,s:[35]},{...io,t:67,s:[50]},{t:90,s:[35]}]},r:{a:0,k:0},p:{a:0,k:[100,bY-5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:10,s:[60,60,100]},{...io3,t:18,s:[100,100,100]},{...io3,t:45,s:[95,95,100]},{...io3,t:67,s:[105,105,100]},{t:90,s:[95,95,100]}]}},ao:0,shapes:[
  {ty:"el",d:1,s:{a:0,k:[85,85]},p:{a:0,k:[0,0]},nm:"Halo"},
  ms(warmYellow,2.5),
],ip:0,op:90,st:0,bm:0});

// --- Praying hands (SVG, drops in) ---
L.unshift({ddd:0,ind:10,ty:4,nm:"Hands",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[0,-80,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[0,8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[0,0,0],to:[0,0,0],ti:[0,0,0]},
  // idle float
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[0,-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[0,3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[0,-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[106,94,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Left hand
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.hands[0]},nm:"LHand"},
    mf(purple),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"LHandGrp"},
  // Right hand
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.hands[1]},nm:"RHand"},
    mf(purple),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"RHandGrp"},
  // Border on left hand
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.hands[0]},nm:"LBdr"},
    ms(darkPurple,1.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"LBdrGrp"},
  // Border on right hand
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:V.hands[1]},nm:"RBdr"},
    ms(darkPurple,1.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"RBdrGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Heart (appears above hands with bounce) ---
const heartDelay=18;
const heartY=bY-30;
// Heart shape from Material Icons SVG, centered at [0,0], scaled 1.6x
const hs=1.6;
const heartPath={"v":[[0,7.79*hs],[-1.21*hs,6.69*hs],[-8.33*hs,-2.92*hs],[-3.75*hs,-7.5*hs],[0,-5.76*hs],[3.75*hs,-7.5*hs],[8.33*hs,-2.92*hs],[1.21*hs,6.7*hs],[0,7.79*hs]],"i":[[0,0],[0,0],[0,3.15*hs],[-2.57*hs,0],[-0.91*hs,-1.07*hs],[-1.45*hs,0],[0,-2.57*hs],[4.29*hs,-3.9*hs],[0,0]],"o":[[0,0],[-4.29*hs,-3.89*hs],[0,-2.57*hs],[1.45*hs,0],[0.91*hs,-1.07*hs],[2.57*hs,0],[0,3.15*hs],[0,0],[0,0]],"c":true};

L.unshift({ddd:0,ind:20,ty:4,nm:"Heart",sr:1,ks:{o:{a:1,k:[{...io,t:heartDelay,s:[0]},{t:heartDelay+4,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:heartDelay,s:[100,heartY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,heartY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,heartY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,heartY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[
  {...io3,t:heartDelay,s:[0,0,100]},
  {...io3,t:heartDelay+4,s:[130,130,100]},
  {...io3,t:heartDelay+7,s:[100,100,100]},
  // Pulse beat
  {...io3,t:40,s:[100,100,100]},{...io3,t:43,s:[115,115,100]},{...io3,t:46,s:[100,100,100]},
  {...io3,t:70,s:[100,100,100]},{...io3,t:73,s:[115,115,100]},{t:76,s:[100,100,100]}
]}},ao:0,shapes:[
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:heartPath},nm:"Heart"},
    mf([.9,.2,.25,1]),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"HeartGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Cross on heart ---
L.unshift({ddd:0,ind:21,ty:4,nm:"Cross",sr:1,ks:{o:{a:1,k:[{...io,t:heartDelay+2,s:[0]},{t:heartDelay+6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:heartDelay,s:[100,heartY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,heartY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,heartY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,heartY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[
  {...io3,t:heartDelay+2,s:[0,0,100]},
  {...io3,t:heartDelay+5,s:[120,120,100]},
  {...io3,t:heartDelay+8,s:[100,100,100]},
  {...io3,t:40,s:[100,100,100]},{...io3,t:43,s:[115,115,100]},{...io3,t:46,s:[100,100,100]},
  {...io3,t:70,s:[100,100,100]},{...io3,t:73,s:[115,115,100]},{t:76,s:[100,100,100]}
]}},ao:0,shapes:[
  // Vertical bar
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[2,8]},p:{a:0,k:[0,-2]},r:{a:0,k:0.5},nm:"V"},
    mf(white),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"VGrp"},
  // Horizontal bar
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[6,2]},p:{a:0,k:[0,-4]},r:{a:0,k:0.5},nm:"H"},
    mf(white),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"HGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Light rays from behind (radial) ---
const rayCount=6;
for(let i=0;i<rayCount;i++){
  const angle=(i/rayCount)*Math.PI*2 - Math.PI/2;
  const rx=100+Math.cos(angle)*45;
  const ry=(bY-5)+Math.sin(angle)*45;
  const rot=((i/rayCount)*360);
  L.splice(2,0,{ddd:0,ind:30+i,ty:4,nm:"Ray"+i,sr:1,ks:{o:{a:1,k:[
    {...io,t:14+i*2,s:[0]},{...io,t:18+i*2,s:[40]},
    {...io,t:45,s:[25]},{...io,t:67,s:[40]},{t:90,s:[25]}
  ]},r:{a:0,k:rot},p:{a:0,k:[rx,ry,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},ao:0,shapes:[
    {ty:"rc",d:1,s:{a:0,k:[2,12]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"Ray"},
    mf(warmYellow),
  ],ip:0,op:90,st:0,bm:0});
}

// --- Sparkles ---
const spP=[[50,70],[150,65],[100,48]];
for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Monthly Dizimo",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'monthly_dizimo.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_dizimo.json',JSON.stringify(anim));}catch{}
console.log("Done: monthly_dizimo");
