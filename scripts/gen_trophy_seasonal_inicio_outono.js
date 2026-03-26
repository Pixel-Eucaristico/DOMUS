const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-leaf.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze — folha marrom escura, sem folhas extras, sem hanger
    nm:"Seasonal Inicio Outono",
    leafColor:[.55,.38,.18,1],
    leafBorder:[.4,.25,.1,1],
    glow:[.55,.4,.2,.2],
    sparkle:[.804,.498,.196,1],
    fallingLeaves:0,
    hanger:false,
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata — folha prata-outonal, folhas caindo, cabide
    nm:"Seasonal Inicio Outono Prata",
    leafColor:[.6,.55,.45,1],
    leafBorder:[.45,.4,.32,1],
    glow:[.6,.55,.45,.3],
    sparkle:[.75,.75,.78,1],
    fallingLeaves:3,
    leafColors:[[.7,.55,.3,1],[.6,.5,.35,1],[.75,.6,.4,1]],
    hanger:true,
    hangerColor:[.65,.65,.7,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.65,.6,.5,1],
  },
  t3: { // Ouro — folha laranja vibrante, muitas folhas coloridas, cabide dourado
    nm:"Seasonal Inicio Outono Ouro",
    leafColor:[.9,.5,.1,1],
    leafBorder:[.7,.35,.05,1],
    glow:[.9,.55,.15,.4],
    sparkle:[1,.843,0,1],
    fallingLeaves:5,
    leafColors:[[.9,.5,.1,1],[.85,.3,.1,1],[1,.7,.15,1],[.75,.4,.08,1],[.95,.6,.2,1]],
    hanger:true,
    hangerColor:[1,.843,0,1],
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

const rng=(s)=>{let x=Math.sin(s)*10000;return x-Math.floor(x);};

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Main leaf (SVG)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Leaf",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},
    r:{a:1,k:[{t:0,s:[-15]},{t:10,s:[5]},{t:14,s:[-2]},{t:18,s:[0]},
      {t:35,s:[3]},{t:55,s:[-3]},{t:75,s:[2]},{t:90,s:[-2]}]},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"LF"},mf(tc.leafColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LFGrp"},
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"LB"},ms(tc.leafBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"LBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Hanger icon (simple hook shape)
  if(tc.hanger){
    const hDelay=14;
    L.unshift({ddd:0,ind:15,ty:4,nm:"Hanger",sr:1,ks:{
      o:{a:1,k:[{...io,t:hDelay,s:[0]},{t:hDelay+3,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:hDelay,s:[72,bY-15,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[72,bY-18,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[72,bY-12,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[72,bY-18,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:hDelay,s:[0,0,100]},{...io3,t:hDelay+3,s:[120,120,100]},{t:hDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      // Hanger hook (triangle shape)
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-8],[-10,5],[10,5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:"HK"},
      ms(tc.hangerColor,2.5),
      // Small circle on top
      {ty:"el",d:1,s:{a:0,k:[5,5]},p:{a:0,k:[0,-10]},nm:"HC"},
      ms(tc.hangerColor,2),
    ],ip:0,op:90,st:0,bm:0});
  }

  // Falling leaves
  if(tc.fallingLeaves>0){
    const leafPos=[[70,bY-20],[130,bY-15],[60,bY+5],[140,bY+10],[100,bY-30]];
    for(let i=0;i<tc.fallingLeaves;i++){
      const d=16+i*3;
      const lp=leafPos[i];
      const endY=lp[1]+30+rng(i*11+1)*15;
      const endX=lp[0]+(rng(i*11+2)-.5)*25;
      L.unshift({ddd:0,ind:20+i,ty:4,nm:"FLeaf"+i,sr:1,ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[80]},{...io,t:d+16,s:[0]},
          {...io,t:55+i*5,s:[0]},{...io,t:58+i*5,s:[80]},{...io,t:71+i*5,s:[0]},{t:90,s:[0]}]},
        r:{a:1,k:[{t:d,s:[i*30-20]},{t:d+16,s:[i*30+60]},{t:55+i*5,s:[i*30-20]},{t:71+i*5,s:[i*30+60]}]},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[lp[0],lp[1],0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+16,s:[endX,endY,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:55+i*5,s:[lp[0],lp[1],0],to:[0,0,0],ti:[0,0,0]},
          {t:71+i*5,s:[endX,endY,0]}]},
        a:{a:0,k:[0,0,0]},
        s:{a:0,k:[40,40,100]}
      },ao:0,shapes:[
        {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"FL"},mf(tc.leafColors[i%tc.leafColors.length]),
          {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"FLGrp"},
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // Sparkles (3 base)
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

const files={base:'seasonal_inicio_outono',t2:'seasonal_inicio_outono_t2',t3:'seasonal_inicio_outono_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_inicio_outono (Bronze + Prata + Ouro)");
