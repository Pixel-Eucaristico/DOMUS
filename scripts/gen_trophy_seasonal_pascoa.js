const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VR=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-uxwing-rabbit.json'),'utf8'));
const VE=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-bs-egg.json'),'utf8'));
VE.egg.c=true;
const white=[1,1,1,1];

// Rabbit shapes: 0=tail area, 1=eye detail, 2=nose, 3=body outline, 4+5=ear inner, 6=head/face
// We render: body(3) behind, then head(6), then details on top

const TIERS = {
  base: { // Bronze
    nm:"Seasonal Pascoa",
    rabbitColor:[.6,.42,.25,1],
    rabbitDetail:white,
    glow:[.55,.4,.22,.2],
    sparkle:[.804,.498,.196,1],
    hasCheck:false,
    miniEggs:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata
    nm:"Seasonal Pascoa Prata",
    rabbitColor:[.65,.65,.72,1],
    rabbitDetail:white,
    glow:[.6,.6,.7,.3],
    sparkle:[.75,.75,.78,1],
    hasCheck:true,
    checkColor:[.6,.65,.72,1],
    miniEggs:2,
    miniColors:[[.7,.7,.78,1],[.62,.65,.72,1]],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.65,.65,.72,1],
  },
  t3: { // Ouro
    nm:"Seasonal Pascoa Ouro",
    rabbitColor:[.92,.88,.82,1],
    rabbitDetail:white,
    glow:[.9,.85,.6,.4],
    sparkle:[1,.843,0,1],
    hasCheck:true,
    checkColor:[.18,.78,.35,1],
    miniEggs:4,
    miniColors:[[.9,.4,.5,1],[.4,.75,.9,1],[.5,.85,.4,1],[1,.8,.3,1]],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function floatP(x,baseY,delay){
  return {a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:delay,s:[x,10,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+8,s:[x,baseY+5,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:delay+12,s:[x,baseY-2,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay+16,s:[x,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[x,baseY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[x,baseY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[x,baseY-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Rabbit (real UXWing SVG) — all shapes in one layer
  L.unshift({ddd:0,ind:10,ty:4,nm:"Rabbit",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Details on top (eye, nose, ear inners = white)
    ...[1,2,4,5].map((si,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:VR.shapes[si]},nm:"D"+i},mf(si===1?[.05,.05,.05,1]:tc.rabbitDetail),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"D"+i+"Grp"})),
    // Tail
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VR.shapes[0]},nm:"Tail"},mf(tc.rabbitColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TailGrp"},
    // Head/face area
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VR.shapes[6]},nm:"Head"},mf(tc.rabbitColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HeadGrp"},
    // Body outline (behind)
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VR.shapes[3]},nm:"Body"},mf(tc.rabbitColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BodyGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Check badge ("sem dívidas")
  if(tc.hasCheck){
    const cDelay=16;
    L.unshift({ddd:0,ind:15,ty:4,nm:"Check",sr:1,ks:{
      o:{a:1,k:[{...io,t:cDelay,s:[0]},{t:cDelay+3,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:cDelay,s:[130,bY+18,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[130,bY+15,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[130,bY+21,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[130,bY+15,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:cDelay,s:[0,0,100]},{...io3,t:cDelay+3,s:[130,130,100]},{t:cDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,0]},nm:"CBg"},mf(tc.checkColor),
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-4,-1],[-1.5,2.5],[5,-4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Ck"},
      ms(white,2),
    ],ip:0,op:90,st:0,bm:0});
  }

  // Mini easter eggs
  if(tc.miniEggs>0){
    const mePos=[[70,bY+22],[130,bY+20],[65,bY+5],[135,bY+10]];
    for(let i=0;i<tc.miniEggs;i++){
      const d=20+i*3;
      const mp=mePos[i];
      L.unshift({ddd:0,ind:20+i,ty:4,nm:"MiniEgg"+i,sr:1,ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},
        r:{a:1,k:[{t:d,s:[i%2?-12:12]},{t:d+6,s:[i%2?5:-5]},{t:50,s:[i%2?-3:3]},{t:70,s:[i%2?3:-3]},{t:90,s:[i%2?-3:3]}]},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[mp[0],mp[1]+8,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+6,s:[mp[0],mp[1],0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[mp[0],mp[1]-3,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[mp[0],mp[1]+3,0],to:[0,0,0],ti:[0,0,0]},
          {t:90,s:[mp[0],mp[1]-3,0]}]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+3,s:[42,42,100]},{t:d+6,s:[35,35,100]}]}
      },ao:0,shapes:[
        {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VE.egg},nm:"ME"},mf(tc.miniColors[i%tc.miniColors.length]),
          {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"MEGrp"},
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // Sparkles
  const spP=[[55,78],[148,72],[100,55]];
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
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[30]},{...io,t:32,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[30]},{...io,t:72,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[60,60,100]},{...io3,t:32,s:[130,130,100]},{...io3,t:58,s:[60,60,100]},{t:72,s:[130,130,100]}]}
    },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},ms(tc.pulseColor,2.5)],ip:0,op:90,st:0,bm:0});
  }

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});

const files={base:'seasonal_pascoa',t2:'seasonal_pascoa_t2',t3:'seasonal_pascoa_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_pascoa (Bronze + Prata + Ouro)");
