const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const L=[];
const gold=[1,.843,0,1],white=[1,1,1,1];
const blue=[.2,.55,.95,1],darkBlue=[.12,.38,.72,1],lightBlue=[.4,.7,1,1];
const green=[.18,.78,.35,1];

// Chart area: centered, ~70x55
const cx=100, chartTop=bY-28, chartBot=bY+27, chartLeft=cx-32, chartRight=cx+32;

// --- Glow ---
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[20]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+2,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf([.2,.5,.9,.35])],ip:0,op:90,st:0,bm:0});

// --- Chart background (white rounded rect, drops in) ---
L.unshift({ddd:0,ind:10,ty:4,nm:"ChartBg",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,10,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[100,bY+6,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[106,94,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // White bg card
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[70,58]},p:{a:0,k:[0,0]},r:{a:0,k:6},nm:"Card"},
    mf([.98,.98,1,1]),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"CardGrp"},
  // Card border
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[70,58]},p:{a:0,k:[0,0]},r:{a:0,k:6},nm:"Bdr"},
    ms([.8,.85,.95,1],1.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BdrGrp"},
  // Horizontal grid lines (3 lines)
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[-28,-10],[28,-10]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"GL1"},
    ms([.85,.88,.95,1],0.8),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"GL1Grp"},
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[-28,0],[28,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"GL2"},
    ms([.85,.88,.95,1],0.8),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"GL2Grp"},
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[-28,10],[28,10]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"GL3"},
    ms([.85,.88,.95,1],0.8),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"GL3Grp"},
],ip:0,op:90,st:0,bm:0});

// --- Trend line (draws in with animation, going UP) ---
const lineDelay=14;
// Line points: starts low-left, dips, then trends up to top-right
const trendLine={
  v:[[-25,18],[-12,10],[0,14],[14,-2],[25,-18]],
  i:[[0,0],[0,0],[0,0],[0,0],[0,0]],
  o:[[0,0],[0,0],[0,0],[0,0],[0,0]],
  c:false
};

L.unshift({ddd:0,ind:11,ty:4,nm:"TrendLine",sr:1,ks:{o:{a:1,k:[{...io,t:lineDelay,s:[0]},{t:lineDelay+3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:lineDelay,s:[100,0,100]},{...io3,t:lineDelay+8,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:trendLine},nm:"Line"},
    ms(blue,3),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"LineGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Data dots on the line ---
const dots=[[-25,18],[-12,10],[0,14],[14,-2],[25,-18]];
dots.forEach((d,i)=>{
  const dotDelay=lineDelay+3+i*2;
  L.unshift({ddd:0,ind:20+i,ty:4,nm:"Dot"+i,sr:1,ks:{o:{a:1,k:[{...io,t:dotDelay,s:[0]},{t:dotDelay+2,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100+d[0],bY+d[1],0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100+d[0],bY+d[1]-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100+d[0],bY+d[1]+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100+d[0],bY+d[1]-3,0]}
  ]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:dotDelay,s:[0,0,100]},{...io3,t:dotDelay+2,s:[130,130,100]},{t:dotDelay+4,s:[100,100,100]}]}},ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[6,6]},p:{a:0,k:[0,0]},nm:"Dot"},
    mf(i===4?green:blue),
  ],ip:0,op:90,st:0,bm:0});
});

// --- Arrow at top-right (appears last) ---
const arrowDelay=26;
L.unshift({ddd:0,ind:30,ty:4,nm:"Arrow",sr:1,ks:{o:{a:1,k:[{...io,t:arrowDelay,s:[0]},{t:arrowDelay+3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:arrowDelay,s:[125,bY-18,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[125,bY-21,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[125,bY-15,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[125,bY-21,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:arrowDelay,s:[0,0,100]},{...io3,t:arrowDelay+3,s:[130,130,100]},{t:arrowDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
  // Arrow head pointing up-right
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-7],[4,0],[0,0]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Arr"},
    ms(green,2.5),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"ArrGrp"},
],ip:0,op:90,st:0,bm:0});

// --- "+" badge (saldo positivo) ---
const badgeDelay=28;
L.unshift({ddd:0,ind:31,ty:4,nm:"Badge",sr:1,ks:{o:{a:1,k:[{...io,t:badgeDelay,s:[0]},{t:badgeDelay+3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:badgeDelay,s:[130,bY-5,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[130,bY-8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[130,bY-2,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[130,bY-8,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:badgeDelay,s:[0,0,100]},{...io3,t:badgeDelay+3,s:[130,130,100]},{t:badgeDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
  // Green circle
  {ty:"gr",it:[
    {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,0]},nm:"Bg"},
    mf(green),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"BgGrp"},
  // + vertical
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[2,8]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"PV"},
    mf(white),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"PVGrp"},
  // + horizontal
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[8,2]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"PH"},
    mf(white),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"PHGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Sparkles ---
const spP=[[55,72],[148,68],[100,52]];
for(let i=0;i<3;i++){const d=24+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Monthly Saldo Positivo",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'monthly_saldo_positivo.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_saldo_positivo.json',JSON.stringify(anim));}catch{}
console.log("Done: monthly_saldo_positivo");
