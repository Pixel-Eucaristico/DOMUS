const fs=require('fs'),path=require('path');

const VB=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-school-bag.json'),'utf8'));

const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// Entry bounce + idle float (delta position)
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

// Build shapes array from verts file
function buildBagShapes(bagColor,detailColor){
  const bagShapes=VB.shapes.map(ks=>({ty:"sh",d:1,ks:{a:0,k:ks},nm:"P"}));
  bagShapes.push(mf(bagColor));
  bagShapes.push(ms(detailColor,2));
  return bagShapes;
}

const TIERS={
  base:{nm:"Volta às Aulas Planejada",bag:[.55,.3,.1,1],detail:[.35,.18,.06,1],coin:[.804,.498,.196,1],sparkle:[.804,.498,.196,1],glow:[.5,.3,.1,.25],pulse:false,extra:0},
  t2:  {nm:"Volta às Aulas Prata",   bag:[.35,.45,.6,1], detail:[.22,.32,.48,1],coin:[.75,.75,.78,1], sparkle:[.75,.75,.8,1], glow:[.4,.5,.6,.3], pulse:true,pulseC:[.75,.75,.78,1],extra:0},
  t3:  {nm:"Volta às Aulas Ouro",    bag:[.15,.25,.55,1],detail:[.1,.18,.42,1], coin:[1,.843,0,1],   sparkle:[1,.843,0,1],   glow:[.9,.8,.2,.4], pulse:true,pulseC:[1,.843,0,1],extra:4},
};

function buildAnim(tc){
  const L=[];

  // Glow (absolute position in canvas)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[25]},{t:90,s:[10]}]},
    r:{a:0,k:0},p:{a:0,k:[100,110,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[105,105,100]},{t:90,s:[80,80,100]}]}
  },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Backpack (SVG paths, delta position, shapes in absolute canvas coords)
  L.push({ddd:0,ind:10,ty:4,nm:"Backpack",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},
    r:{a:0,k:0},
    p:floatP(0),
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]},
  },ao:0,shapes:buildBagShapes(tc.bag,tc.detail),ip:0,op:90,st:0,bm:0});

  // Coin (canvas position, separate layer)
  const cd=22;
  L.push({ddd:0,ind:20,ty:4,nm:"Coin",sr:1,ks:{
    o:{a:1,k:[{...io,t:cd,s:[0]},{t:cd+4,s:[100]}]},
    r:{a:1,k:[{t:cd,s:[0]},{t:cd+10,s:[360]},{t:55,s:[350]},{t:72,s:[365]},{t:90,s:[355]}]},
    p:{a:1,k:[
      {...io,t:cd,s:[128,80,0],to:[0,0,0],ti:[0,0,0]},
      {...io,t:45,s:[128,76,0],to:[0,0,0],ti:[0,0,0]},
      {...io,t:67,s:[128,84,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[128,76,0]},
    ]},
    a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:cd,s:[0,0,100]},{...io3,t:cd+4,s:[120,120,100]},{t:cd+8,s:[100,100,100]}]},
  },ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[20,20]},p:{a:0,k:[0,0]},nm:"C"},
    mf(tc.coin),
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-7],[3,-4],[3,-1],[0,1],[-3,3],[-3,6],[0,7]],i:[[0,0],[-1,-1],[0,0],[1,-1],[0,0],[-1,1],[0,0]],o:[[1,-1],[0,0],[1,1],[0,0],[-1,1],[0,0],[-1,1]],c:false}},nm:"S"},
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-9],[0,9]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"L"},
      ms([1,1,1,1],1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}},
    ],nm:"Dollar"},
  ],ip:0,op:90,st:0,bm:0});

  // Sparkles
  const spPos=[[74,72],[128,68],[100,60],[78,84],[130,78]];
  for(let i=0;i<3;i++){
    const d=28+i*6;
    L.push({ddd:0,ind:200+i,ty:4,nm:"Sp"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:59+i*7,s:[100]},{...io,t:68+i*7,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+180]}]},
      p:{a:0,k:[spPos[i][0],spPos[i][1],0]},
      a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[100,100,100]},{t:d+12,s:[0,0,100]}]},
    },ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});
  }

  for(let i=0;i<tc.extra;i++){
    const d=18+i*5;
    L.push({ddd:0,ind:300+i,ty:4,nm:"ExSp"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+10,s:[0]},{...io,t:60+i*5,s:[0]},{...io,t:64+i*5,s:[100]},{...io,t:72+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*45]},{t:90,s:[i*45+220]}]},
      p:{a:0,k:[spPos[i+1][0],spPos[i+1][1],0]},
      a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[110,110,100]},{t:d+10,s:[0,0,100]}]},
    },ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});
  }

  if(tc.pulse){
    L.push({ddd:0,ind:998,ty:4,nm:"Pulse",sr:1,ks:{
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[40]},{...io,t:34,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[40]},{...io,t:74,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,105,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[55,55,100]},{...io3,t:34,s:[140,140,100]},{...io3,t:58,s:[55,55,100]},{t:74,s:[140,140,100]}]},
    },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"R"},ms(tc.pulseC,2)],ip:0,op:90,st:0,bm:0});
  }

  return{v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});
const files={base:'seasonal_volta_aulas',t2:'seasonal_volta_aulas_t2',t3:'seasonal_volta_aulas_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log("Written:",fname+'.json');
}
console.log("Done: seasonal_volta_aulas");
