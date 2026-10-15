const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const L=[];
const gold=[1,.843,0,1],white=[1,1,1,1],blue=[.23,.51,.85,1],darkBlue=[.15,.35,.65,1];
const lightBlue=[.4,.65,.95,1];

// --- Glow ---
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[20]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[120,120]},p:{a:0,k:[0,0]},nm:"G"},mf([.3,.55,.9,.5])],ip:0,op:90,st:0,bm:0});

// --- Base/Pedestal ---
L.unshift({ddd:0,ind:2,ty:4,nm:"Base",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:8,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,10,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY+8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:16,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
  // idle float
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[105,95,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Vertical pillar
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[6,50]},p:{a:0,k:[0,-5]},r:{a:0,k:2},nm:"Pillar"},
    mf(darkBlue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"PillarGrp"},
  // Base platform (trapezoid-like rectangle)
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[36,8]},p:{a:0,k:[0,22]},r:{a:0,k:3},nm:"Platform"},
    mf(darkBlue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"PlatformGrp"},
  // Horizontal beam (balance arm) - will tilt then settle
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[70,4]},p:{a:0,k:[0,-30]},r:{a:0,k:2},nm:"Beam"},
    mf(blue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BeamGrp"},
  // Center pivot circle
  {ty:"gr",it:[
    {ty:"el",d:1,s:{a:0,k:[10,10]},p:{a:0,k:[0,-30]},nm:"Pivot"},
    mf(gold),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"PivotGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Left Pan (appears with delay, swings) ---
const panDelay=14;
L.unshift({ddd:0,ind:3,ty:4,nm:"LeftPan",sr:1,ks:{o:{a:1,k:[{...io,t:panDelay,s:[0]},{t:panDelay+4,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay,s:[65,bY-10,0],to:[0,0,0],ti:[0,0,0]},
  // Swing: left pan goes down first then settles level
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay+8,s:[65,bY-5,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay+14,s:[65,bY-16,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay+20,s:[65,bY-12,0],to:[0,0,0],ti:[0,0,0]},
  // idle float synced
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[65,bY-15,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[65,bY-9,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[65,bY-15,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:panDelay,s:[0,0,100]},{...io3,t:panDelay+4,s:[110,110,100]},{t:panDelay+7,s:[100,100,100]}]}},ao:0,shapes:[
  // Chain line
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-14],[0,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"Chain"},
    ms(darkBlue,1.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"ChainGrp"},
  // Pan (curved bowl shape using ellipse)
  {ty:"gr",it:[
    {ty:"el",d:1,s:{a:0,k:[28,10]},p:{a:0,k:[0,2]},nm:"Bowl"},
    mf(lightBlue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BowlGrp"},
  // $ symbol on left pan
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[2,8]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"DollarLine"},
    mf(darkBlue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"DollarGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Right Pan ---
L.unshift({ddd:0,ind:4,ty:4,nm:"RightPan",sr:1,ks:{o:{a:1,k:[{...io,t:panDelay,s:[0]},{t:panDelay+4,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay,s:[135,bY-10,0],to:[0,0,0],ti:[0,0,0]},
  // Swing: right pan goes up first then settles level
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay+8,s:[135,bY-19,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay+14,s:[135,bY-8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:panDelay+20,s:[135,bY-12,0],to:[0,0,0],ti:[0,0,0]},
  // idle float synced
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[135,bY-15,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[135,bY-9,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[135,bY-15,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:panDelay,s:[0,0,100]},{...io3,t:panDelay+4,s:[110,110,100]},{t:panDelay+7,s:[100,100,100]}]}},ao:0,shapes:[
  // Chain line
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-14],[0,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"Chain"},
    ms(darkBlue,1.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"ChainGrp"},
  // Pan bowl
  {ty:"gr",it:[
    {ty:"el",d:1,s:{a:0,k:[28,10]},p:{a:0,k:[0,2]},nm:"Bowl"},
    mf(lightBlue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BowlGrp"},
  // $ symbol on right pan
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[2,8]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"DollarLine"},
    mf(darkBlue),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"DollarGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Green check (appears after pans settle = "balanced!") ---
const chkDelay=28;
const chkY=bY-38;
L.unshift({ddd:0,ind:5,ty:4,nm:"GreenCircle",sr:1,ks:{o:{a:1,k:[{...io,t:chkDelay,s:[0]},{t:chkDelay+3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:chkDelay,s:[100,chkY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,chkY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,chkY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,chkY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:chkDelay,s:[0,0,100]},{...io3,t:chkDelay+3,s:[130,130,100]},{t:chkDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"el",d:1,s:{a:0,k:[22,22]},p:{a:0,k:[0,0]},nm:"Bg"},
  mf([.18,.75,.34,.9]),
],ip:0,op:90,st:0,bm:0});

L.unshift({ddd:0,ind:6,ty:4,nm:"WhiteCheck",sr:1,ks:{o:{a:1,k:[{...io,t:chkDelay,s:[0]},{t:chkDelay+3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:chkDelay,s:[100,chkY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,chkY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,chkY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,chkY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:chkDelay,s:[0,0,100]},{...io3,t:chkDelay+3,s:[130,130,100]},{t:chkDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"sh",d:1,ks:{a:0,k:{v:[[-5,-1],[-2,3],[7,-6]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Chk"},
  ms(white,2.5),
],ip:0,op:90,st:0,bm:0});

// --- Sparkles ---
const spP=[[55,60],[145,55],[100,40]];
for(let i=0;i<3;i++){const d=24+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Monthly Equilibrado",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'monthly_equilibrado.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_equilibrado.json',JSON.stringify(anim));}catch{}
console.log("Done: monthly_equilibrado");
