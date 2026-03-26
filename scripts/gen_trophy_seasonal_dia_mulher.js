const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const V=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-fa-venus.json'),'utf8'));
// shapes[0] = venus symbol outer, shapes[1] = circle cutout (inner)
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze — símbolo escuro, sem extras
    nm:"Seasonal Dia Mulher",
    venusColor:[.55,.3,.45,1],       // muted dark purple
    venusBorder:[.38,.18,.32,1],
    innerColor:[.7,.45,.6,1],        // lighter
    glow:[.5,.3,.45,.2],
    sparkle:[.804,.498,.196,1],
    flowers:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: { // Prata — símbolo prata-roxo, flores, pulse
    nm:"Seasonal Dia Mulher Prata",
    venusColor:[.55,.45,.65,1],      // silver-purple
    venusBorder:[.38,.3,.5,1],
    innerColor:[.72,.65,.8,1],
    glow:[.55,.45,.65,.3],
    sparkle:[.75,.75,.78,1],
    flowers:3,
    flowerColors:[[.75,.6,.78,1],[.65,.55,.72,1],[.8,.7,.85,1]],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.65,.55,.75,1],
  },
  t3: { // Ouro — símbolo roxo vibrante, muitas flores, sparkles dourados
    nm:"Seasonal Dia Mulher Ouro",
    venusColor:[.6,.15,.7,1],        // vibrant purple
    venusBorder:[.42,.08,.52,1],
    innerColor:[.75,.35,.85,1],      // bright purple
    glow:[.6,.2,.7,.4],
    sparkle:[1,.843,0,1],
    flowers:5,
    flowerColors:[[1,.4,.6,1],[.9,.3,.8,1],[1,.6,.7,1],[.8,.2,.9,1],[1,.5,.55,1]],
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

  // Venus symbol outer (SVG)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Venus",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Inner circle (lighter, rendered first = behind)
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[1]},nm:"VI"},mf(tc.innerColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"VIGrp"},
    // Outer body (on top due to even-odd in original, but here we layer)
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"VO"},mf(tc.venusColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"VOGrp"},
    // Border
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[0]},nm:"VB"},ms(tc.venusBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"VBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Inner circle highlight (on top, separate layer to ensure visibility)
  L.unshift({ddd:0,ind:11,ty:4,nm:"InnerCircle",sr:1,ks:{
    o:{a:1,k:[{...io,t:6,s:[0]},{t:10,s:[100]}]},r:{a:0,k:0},
    p:floatP(100,bY,0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,95,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:V.shapes[1]},nm:"IC"},mf(tc.innerColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"ICGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Flowers (small 5-petal stars around the symbol)
  if(tc.flowers>0){
    const flowerPos=[[70,bY-18],[130,bY-15],[65,bY+10],[135,bY+5],[100,bY-30]];
    for(let i=0;i<tc.flowers;i++){
      const d=16+i*3;
      const fp=flowerPos[i];
      L.unshift({ddd:0,ind:20+i,ty:4,nm:"Flower"+i,sr:1,ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+14,s:[100]},
          {...io,t:55+i*5,s:[0]},{...io,t:58+i*5,s:[100]},{t:90,s:[100]}]},
        r:{a:1,k:[{t:d,s:[i*30]},{t:d+8,s:[i*30+15]},{t:60,s:[i*30+25]},{t:90,s:[i*30+35]}]},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[fp[0],fp[1]+10,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+6,s:[fp[0],fp[1],0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[fp[0],fp[1]-3,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[fp[0],fp[1]+3,0],to:[0,0,0],ti:[0,0,0]},
          {t:90,s:[fp[0],fp[1]-3,0]}]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+3,s:[120,120,100]},{t:d+6,s:[100,100,100]}]}
      },ao:0,shapes:[
        // 5-petal flower using star
        {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Fl"},
        mf(tc.flowerColors[i%tc.flowerColors.length]),
        // Center dot
        {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},nm:"Ctr"},
        mf(white),
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // Sparkles (3 base)
  const spP=[[55,78],[148,72],[100,55]];
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

const files={base:'seasonal_dia_mulher',t2:'seasonal_dia_mulher_t2',t3:'seasonal_dia_mulher_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_dia_mulher (Bronze + Prata + Ouro)");
