const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const L=[];
const gold=[1,.843,0,1],white=[1,1,1,1],red=[.85,.2,.15,1];

// Glow
L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[12]},{...io,t:45,s:[22]},{t:90,s:[12]}]},r:{a:0,k:0},p:{a:0,k:[100,bY-15,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[110,110]},p:{a:0,k:[0,0]},nm:"G"},mf([.95,.85,.4,1])],ip:0,op:90,st:0,bm:0});

// Calendar body - drops in with bounce
const calY=-12;
L.unshift({ddd:0,ind:10,ty:4,nm:"Calendar",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,10,0],to:[0,15,0],ti:[0,-15,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[100,bY+calY+5,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[100,bY+calY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY+calY,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+calY-3,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+calY+3,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY+calY-3,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[105,95,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
  // Calendar body (white)
  {ty:"rc",d:1,s:{a:0,k:[48,50]},p:{a:0,k:[0,5]},r:{a:0,k:4},nm:"Body"},
  mf(white),
  // Red header
  {ty:"rc",d:1,s:{a:0,k:[48,14]},p:{a:0,k:[0,-16]},r:{a:0,k:[4,4,0,0]},nm:"Header"},
  mf(red),
  // Rings (2 small circles on top)
  {ty:"el",d:1,s:{a:0,k:[5,8]},p:{a:0,k:[-12,-23]},nm:"Ring1"},
  mf([.4,.4,.4,1]),
  {ty:"el",d:1,s:{a:0,k:[5,8]},p:{a:0,k:[12,-23]},nm:"Ring2"},
  mf([.4,.4,.4,1]),
  // Grid lines (6 small dots for days)
  {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[-14,0]},nm:"D1"},mf([.85,.85,.85,1]),
  {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[-4,0]},nm:"D2"},mf([.85,.85,.85,1]),
  {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[6,0]},nm:"D3"},mf([.85,.85,.85,1]),
  {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[-14,10]},nm:"D4"},mf([.85,.85,.85,1]),
  {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[-4,10]},nm:"D5"},mf([.85,.85,.85,1]),
  {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[6,10]},nm:"D6"},mf([.85,.85,.85,1]),
  // "31" text
  {ty:"rc",d:1,s:{a:0,k:[5,8]},p:{a:0,k:[16,5]},r:{a:0,k:1},nm:"N3"},mf([.5,.5,.5,1]),
  {ty:"rc",d:1,s:{a:0,k:[3,8]},p:{a:0,k:[16,15]},r:{a:0,k:1},nm:"N1"},mf([.5,.5,.5,1]),
  // Border
  {ty:"rc",d:1,s:{a:0,k:[48,50]},p:{a:0,k:[0,5]},r:{a:0,k:4},nm:"Bdr"},
  ms([.7,.7,.7,1],1.5),
],ip:0,op:90,st:0,bm:0});

// Green circle behind checkmark
const chkPos = function(t18,t45,t67,t90){return {a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY+calY+5,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+calY+2,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+calY+8,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY+calY+2,0]}
]}};
const chkScale = {a:1,k:[{...io3,t:18,s:[0,0,100]},{...io3,t:22,s:[130,130,100]},{t:26,s:[100,100,100]}]};
const chkOpacity = {a:1,k:[{...io,t:18,s:[0]},{t:22,s:[100]}]};

L.unshift({ddd:0,ind:14,ty:4,nm:"GreenCircle",sr:1,ks:{o:chkOpacity,r:{a:0,k:0},p:chkPos(),a:{a:0,k:[0,0,0]},s:chkScale},ao:0,shapes:[
  {ty:"el",d:1,s:{a:0,k:[28,28]},p:{a:0,k:[0,0]},nm:"Bg"},
  mf([.18,.75,.34,.85]),
],ip:0,op:90,st:0,bm:0});

// White checkmark (separate layer, on top)
L.unshift({ddd:0,ind:15,ty:4,nm:"BigCheck",sr:1,ks:{o:chkOpacity,r:{a:0,k:0},p:chkPos(),a:{a:0,k:[0,0,0]},s:chkScale},ao:0,shapes:[
  {ty:"sh",d:1,ks:{a:0,k:{v:[[-7,-2],[-2,3],[9,-10]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Chk"},
  ms(white,3.5),
],ip:0,op:90,st:0,bm:0});

// Star on top
L.unshift({ddd:0,ind:16,ty:4,nm:"Star",sr:1,ks:{o:{a:1,k:[{...io,t:24,s:[0]},{t:28,s:[100]}]},r:{a:1,k:[{t:24,s:[-20]},{t:30,s:[5]},{t:60,s:[-3]},{t:75,s:[3]},{t:90,s:[-3]}]},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY+calY-35,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+calY-38,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+calY-32,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY+calY-38,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:24,s:[0,0,100]},{...io3,t:27,s:[130,130,100]},{t:30,s:[100,100,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:5},is:{a:0,k:0},or:{a:0,k:12},os:{a:0,k:0},ix:1,nm:"S"},mf(gold)],ip:0,op:90,st:0,bm:0});

// Sparkles
const spP=[[60,55],[140,50],[100,35]];
for(let i=0;i<3;i++){const d=20+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(gold)],ip:0,op:90,st:0,bm:0});}

const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Monthly Registros",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'monthly_registros.json'),JSON.stringify(anim));
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/monthly_registros.json',JSON.stringify(anim));}catch{}
console.log("Done!");
