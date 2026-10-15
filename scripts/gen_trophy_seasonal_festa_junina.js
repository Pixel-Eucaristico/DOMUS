const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VF=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-campfire.json'),'utf8'));

const TIERS = {
  base: {
    nm:"Seasonal Festa Junina",
    fireColor:[.85,.4,.1,1],        // warm orange fire
    fireInner:[1,.7,.15,1],         // yellow inner
    logColor:[.45,.3,.15,1],
    balloonColor:[.8,.35,.15,1],    // warm red-orange balloon
    bandeiraColors:[[.85,.6,.15,1],[.7,.3,.12,1],[.55,.4,.2,1]],  // warm autumn tones
    glow:[.55,.35,.15,.25],
    sparkle:[.804,.498,.196,1],
    balloonCount:1,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Festa Junina Prata",
    fireColor:[.85,.45,.1,1],       // orange fire
    fireInner:[1,.7,.15,1],         // yellow inner
    logColor:[.4,.35,.28,1],
    balloonColor:[.6,.6,.7,1],      // silver balloon
    bandeiraColors:[[.65,.65,.72,1],[.55,.57,.65,1],[.7,.7,.78,1]],
    glow:[.7,.45,.15,.3],
    sparkle:[.75,.75,.78,1],
    balloonCount:2,
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Festa Junina Ouro",
    fireColor:[.9,.35,.05,1],       // vivid orange-red
    fireInner:[1,.85,.1,1],         // bright yellow
    logColor:[.35,.25,.12,1],
    balloonColor:[.9,.2,.15,1],     // red balloon
    bandeiraColors:[[1,.85,.1,1],[.1,.65,.2,1],[.9,.2,.15,1],[.2,.4,.85,1],[1,.5,.15,1]],
    glow:[.9,.5,.1,.4],
    sparkle:[1,.843,0,1],
    balloonCount:3,
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

function buildAnim(tc) {
  const L=[];

  // Glow (warm)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Campfire (Game-icons SVG) — fire shapes + logs
  // Shape 0: flame body, 1: flame detail, 2-3: logs, 4-6: log details
  L.unshift({ddd:0,ind:10,ty:4,nm:"Fire",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:floatP(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Flame body (shape 0) — orange/red
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VF.shapes[0]},nm:"Fl"},mf(tc.fireColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"FlGrp"},
    // Flame inner (shape 1) — yellow
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VF.shapes[1]},nm:"FlI"},mf(tc.fireInner),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"FlIGrp"},
    // Logs (shapes 2-6)
    ...VF.shapes.slice(2).map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"Log"+i},mf(tc.logColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"Log"+i+"Grp"})),
  ],ip:0,op:90,st:0,bm:0});

  // Flame flicker — inner flame pulses opacity smoothly (breathing fire)
  L.unshift({ddd:0,ind:11,ty:4,nm:"Flicker",sr:1,ks:{
    o:{a:1,k:[
      {...io,t:12,s:[0]},{...io,t:16,s:[60]},
      {...io,t:30,s:[30]},{...io,t:42,s:[65]},
      {...io,t:55,s:[25]},{...io,t:68,s:[60]},
      {...io,t:80,s:[30]},{t:90,s:[50]}
    ]},r:{a:0,k:0},
    p:floatP(0),a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:VF.shapes[0]},nm:"FlF"},mf(tc.fireInner),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"FlFGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Bandeirinhas (triangular flags on a string) — above the fire
  const bDelay=10;
  const flagY=bY-38;
  L.unshift({ddd:0,ind:20,ty:4,nm:"Bandeiras",sr:1,ks:{
    o:{a:1,k:[{...io,t:bDelay,s:[0]},{t:bDelay+4,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:bDelay,s:[100,flagY,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,flagY-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,flagY+3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,flagY-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:bDelay,s:[0,0,100]},{...io3,t:bDelay+3,s:[110,110,100]},{t:bDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // String
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-35,-2],[0,3],[35,-2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Str"},
      ms([.4,.3,.2,1],1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"StrGrp"},
    // Flags (triangles hanging from string)
    ...tc.bandeiraColors.map((col,i)=>{
      const x=-28+i*(56/(tc.bandeiraColors.length));
      const stringY=-2+Math.sin((i/(tc.bandeiraColors.length-1))*Math.PI)*5;
      return {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[x,stringY],[x-4,stringY+12],[x+4,stringY+12]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:"F"+i},
        mf(col),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"F"+i+"Grp"};
    }),
  ],ip:0,op:90,st:0,bm:0});

  // Balões de São João (hot air balloon shape — teardrop inverted)
  const balloonPositions=[[70,bY-20],[130,bY-25],[100,bY-35]];
  for(let i=0;i<tc.balloonCount;i++){
    const bDel=14+i*4;
    const bx=balloonPositions[i][0], by_=balloonPositions[i][1];
    L.unshift({ddd:0,ind:40+i,ty:4,nm:"Balloon"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:bDel,s:[0]},{t:bDel+4,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:bDel,s:[bx,by_+10,0],to:[0,-2,0],ti:[0,2,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:bDel+10,s:[bx,by_,0],to:[0,0,0],ti:[0,0,0]},
        // float
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[bx,by_-4,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[bx,by_+4,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[bx,by_-4,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:bDel,s:[0,0,100]},{...io3,t:bDel+3,s:[115,115,100]},{t:bDel+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      // Balloon body (teardrop: circle top + triangle bottom)
      {ty:"gr",it:[
        {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,-4]},nm:"BTop"},mf(tc.balloonColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BTopGrp"},
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[-8,-4],[0,10],[8,-4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:"BCone"},
        mf(tc.balloonColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BConeGrp"},
      // Basket (small rect at bottom)
      {ty:"gr",it:[
        {ty:"rc",d:1,s:{a:0,k:[6,4]},p:{a:0,k:[0,13]},r:{a:0,k:1},nm:"Bsk"},mf(tc.logColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BskGrp"},
      // String lines
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[-3,10],[-2,13]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"S1"},
        ms(tc.logColor,0.8),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"S1Grp"},
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[3,10],[2,13]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"S2"},
        ms(tc.logColor,0.8),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"S2Grp"},
      // Decorative stripe
      {ty:"gr",it:[
        {ty:"rc",d:1,s:{a:0,k:[14,3]},p:{a:0,k:[0,-4]},r:{a:0,k:1},nm:"Stripe"},
        mf(tc.bandeiraColors[i%tc.bandeiraColors.length]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"StripeGrp"},
    ],ip:0,op:90,st:0,bm:0});
  }

  // Sparkles
  const spP=[[55,75],[148,72],[100,55]];
  for(let i=0;i<3;i++){const d=22+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

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

try{fs.unlinkSync(path.join(prevDir,'seasonal_festa_junina_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_festa_junina_t4.json'));}catch{}

const files={base:'seasonal_festa_junina',t2:'seasonal_festa_junina_t2',t3:'seasonal_festa_junina_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_festa_junina (Bronze + Prata + Ouro)");
