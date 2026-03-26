const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

// Monstrance built with geometric shapes (no SVG dependency)

const TIERS = {
  base: {
    nm:"Seasonal Corpus Christi",
    bodyColor:[.6,.45,.22,1],       // bronze body
    bodyBorder:[.45,.32,.12,1],
    detailColor:[.7,.55,.3,1],      // lighter bronze details
    glow:[.55,.4,.2,.25],
    sparkle:[.804,.498,.196,1],
    gemColor:[.7,.3,.25,1],
    rays:0,
    extraSparkles:0,
    pulse:false,
  },
  t2: {
    nm:"Seasonal Corpus Christi Prata",
    bodyColor:[.6,.62,.7,1],        // silver
    bodyBorder:[.45,.47,.58,1],
    detailColor:[.72,.74,.8,1],
    glow:[.55,.57,.65,.3],
    sparkle:[.75,.75,.78,1],
    gemColor:[.75,.3,.45,1],
    rays:4,
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
  },
  t3: {
    nm:"Seasonal Corpus Christi Ouro",
    bodyColor:[1,.843,0,1],         // gold!
    bodyBorder:[.75,.6,.05,1],
    detailColor:[1,.92,.4,1],
    glow:[.95,.8,.2,.45],
    sparkle:[1,.843,0,1],
    gemColor:[.9,.15,.3,1],
    rays:8,
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
  },
};

function staticFloat(delay){
  return {a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:delay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,bY-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];
  const ihsCol=[.35,.2,.08,1];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[25]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[105,105,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Monstrance — geometric shapes: base + stem + sun-burst + lunula + host
  L.unshift({ddd:0,ind:10,ty:4,nm:"Monstrance",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},
    p:staticFloat(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // === BASE (inspired by reference: wide elliptical pedestal) ===
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[30,8]},p:{a:0,k:[0,36]},nm:"BasePlate"},mf(tc.bodyBorder),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BasePlateGrp"},
    // Base trapezoid
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-16,35],[16,35],[10,28],[-10,28]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"BaseTrap"},
      mf(tc.bodyColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BaseTrapGrp"},
    // === STEM (nó decorativo + haste) ===
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[6,24]},p:{a:0,k:[0,15]},r:{a:0,k:2},nm:"Stem"},mf(tc.bodyColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"StemGrp"},
    // Knob (nó decorativo no meio da haste)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[12,7]},p:{a:0,k:[0,12]},nm:"Knob"},mf(tc.detailColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"KnobGrp"},
    // === SUNBURST (raios alternados grandes/pequenos, como no SVG ref) ===
    // Outer rays (16-point star, bigger)
    {ty:"gr",it:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:16},p:{a:0,k:[0,-10]},r:{a:0,k:0},ir:{a:0,k:20},is:{a:0,k:0},or:{a:0,k:32},os:{a:0,k:0},ix:1,nm:"BigRays"},
      mf(tc.bodyColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BigRaysGrp"},
    // Inner rays (16-point star, rotated, smaller — creates doubled ray effect)
    {ty:"gr",it:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:16},p:{a:0,k:[0,-10]},r:{a:0,k:11.25},ir:{a:0,k:18},is:{a:0,k:0},or:{a:0,k:27},os:{a:0,k:0},ix:1,nm:"SmallRays"},
      mf(tc.detailColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SmallRaysGrp"},
    // Glory circle (bright inner ring)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[30,30]},p:{a:0,k:[0,-10]},nm:"Glory"},mf(tc.detailColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"GloryGrp"},
    // === GEMAS decorativas (pink/red jewels from reference) ===
    // 4 gems at cardinal points of the sunburst
    ...[0,90,180,270].map((angle,i)=>{
      const r=angle*Math.PI/180;
      const gx=Math.sin(r)*24, gy=-Math.cos(r)*24-10;
      return {ty:"gr",it:[
        {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[gx,gy]},nm:"Gem"+i},mf(tc.gemColor),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"Gem"+i+"Grp"};
    }),
    // Cross on top
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,8]},p:{a:0,k:[0,-40]},r:{a:0,k:1},nm:"TopCrossV"},mf(tc.bodyColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TopCrossVGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[8,3]},p:{a:0,k:[0,-38]},r:{a:0,k:1},nm:"TopCrossH"},mf(tc.bodyColor),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"TopCrossHGrp"},
    // Outer border
    {ty:"gr",it:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:16},p:{a:0,k:[0,-10]},r:{a:0,k:0},ir:{a:0,k:20},is:{a:0,k:0},or:{a:0,k:32},os:{a:0,k:0},ix:1,nm:"SunB"},
      ms(tc.bodyBorder,1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SunBGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Dark hole (separate layer on top of monstrance)
  const holeDelay=6;
  L.unshift({ddd:0,ind:11,ty:4,nm:"DarkHole",sr:1,ks:{
    o:{a:1,k:[{...io,t:holeDelay,s:[0]},{t:holeDelay+3,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:holeDelay,s:[100,bY-10,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-13,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-7,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-13,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:holeDelay,s:[0,0,100]},{...io3,t:holeDelay+3,s:[110,110,100]},{t:holeDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[26,26]},p:{a:0,k:[0,0]},nm:"Hole"},mf([.1,.05,.02,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HoleGrp"},
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[26,26]},p:{a:0,k:[0,0]},nm:"HoleR"},ms(tc.bodyBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HoleRGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // White Host + IHS (separate layer, ON TOP of everything)
  const hostDelay=8;
  L.unshift({ddd:0,ind:12,ty:4,nm:"HostIHS",sr:1,ks:{
    o:{a:1,k:[{...io,t:hostDelay,s:[0]},{...io,t:hostDelay+4,s:[100]},{t:90,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:hostDelay,s:[100,bY-10,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-13,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-7,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-13,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:0,k:[100,100,100]}
  },ao:0,shapes:[
    // White host circle
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[20,20]},p:{a:0,k:[0,0]},nm:"Host"},mf([1,1,1,1]),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HostGrp"},
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[20,20]},p:{a:0,k:[0,0]},nm:"HostB"},ms([.75,.6,.3,1],1.5),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HostBGrp"},
    // IHS text — filled rects, large enough to see
    // "I"
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,12]},p:{a:0,k:[-7,0]},r:{a:0,k:1},nm:"I"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"IGrp"},
    // "H" left
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,12]},p:{a:0,k:[-1,0]},r:{a:0,k:1},nm:"HL"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HLGrp"},
    // "H" right
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,12]},p:{a:0,k:[3,0]},r:{a:0,k:1},nm:"HR"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HRGrp"},
    // "H" crossbar
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[7,3]},p:{a:0,k:[1,0]},r:{a:0,k:1},nm:"HBar"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HBarGrp"},
    // "S"
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[3,12]},p:{a:0,k:[8,0]},r:{a:0,k:1},nm:"S"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"SGrp"},
    // Cross above H
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[2,6]},p:{a:0,k:[1,-8]},r:{a:0,k:0.5},nm:"CrV"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CrVGrp"},
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[6,2]},p:{a:0,k:[1,-7]},r:{a:0,k:0.5},nm:"CrH"},mf(ihsCol),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"CrHGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Holy rays (for higher tiers) — emanating from center
  if(tc.rays>0){
    const rDelay=12;
    const rayAngles=Array.from({length:tc.rays},(_, i)=>i*(360/tc.rays));
    rayAngles.forEach((angle,i)=>{
      L.unshift({ddd:0,ind:30+i,ty:4,nm:"Ray"+i,sr:1,ks:{
        o:{a:1,k:[
          {...io,t:rDelay+i,s:[0]},{...io,t:rDelay+i+3,s:[40]},{...io,t:rDelay+i+12,s:[0]},
          {...io,t:55+i*2,s:[0]},{...io,t:58+i*2,s:[40]},{...io,t:67+i*2,s:[0]},{t:90,s:[0]}
        ]},
        r:{a:0,k:angle},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:rDelay,s:[100,bY-10,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-13,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-7,0],to:[0,0,0],ti:[0,0,0]},
          {t:90,s:[100,bY-13,0]}
        ]},a:{a:0,k:[0,0,0]},
        s:{a:0,k:[100,100,100]}
      },ao:0,shapes:[
        {ty:"gr",it:[
          {ty:"rc",d:1,s:{a:0,k:[2,18]},p:{a:0,k:[0,-35]},r:{a:0,k:1},nm:"R"},mf(tc.bodyColor),
          {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"RGrp"},
      ],ip:0,op:90,st:0,bm:0});
    });
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

try{fs.unlinkSync(path.join(prevDir,'seasonal_corpus_christi_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_corpus_christi_t4.json'));}catch{}

const files={base:'seasonal_corpus_christi',t2:'seasonal_corpus_christi_t2',t3:'seasonal_corpus_christi_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_corpus_christi (Bronze + Prata + Ouro)");
