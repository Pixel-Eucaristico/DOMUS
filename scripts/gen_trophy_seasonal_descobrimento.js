const fs=require('fs'),path=require('path');
const bY=108,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const VC=JSON.parse(fs.readFileSync(path.join(__dirname,'lottie-verts-compass.json'),'utf8'));
const white=[1,1,1,1];

const TIERS = {
  base: { // Bronze
    nm:"Seasonal Descobrimento",
    compassBody:[.55,.4,.22,1],     // bronze compass
    compassInner:[.72,.58,.35,1],
    needleN:[.8,.2,.15,1],          // red north
    needleS:[.4,.35,.3,1],          // dark south
    compassBorder:[.4,.28,.12,1],
    glow:[.5,.35,.2,.25],
    sparkle:[.804,.498,.196,1],
    extraSparkles:0,
    pulse:false,
    flagColors:null,                // no flag for bronze
  },
  t2: { // Prata
    nm:"Seasonal Descobrimento Prata",
    compassBody:[.5,.52,.6,1],      // silver
    compassInner:[.68,.7,.76,1],
    needleN:[.7,.15,.1,1],
    needleS:[.35,.38,.45,1],
    compassBorder:[.4,.42,.5,1],
    glow:[.55,.57,.65,.3],
    sparkle:[.75,.75,.78,1],
    extraSparkles:0,
    pulse:true,
    pulseColor:[.75,.75,.78,1],
    flagColors:null,
  },
  t3: { // Ouro
    nm:"Seasonal Descobrimento Ouro",
    compassBody:[.85,.7,.15,1],     // gold
    compassInner:[1,.9,.4,1],
    needleN:[.85,.15,.1,1],
    needleS:[.15,.35,.6,1],         // blue south
    compassBorder:[.65,.5,.05,1],
    glow:[.9,.75,.2,.4],
    sparkle:[1,.843,0,1],
    extraSparkles:5,
    pulse:true,
    pulseColor:[1,.843,0,1],
    flagColors:[[0,.5,.15,1],[1,.85,0,1],[.1,.3,.7,1]], // green, yellow, blue (Brazil)
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

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Compass body (outer ring + inner)
  L.unshift({ddd:0,ind:10,ty:4,nm:"Compass",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:floatP(0),a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[106,94,100]},{t:12,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Outer ring fill
    ...VC.outer.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"Co"+i},mf(tc.compassBody),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"Co"+i+"Grp"})),
    // Inner circle (lighter fill)
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[52,52]},p:{a:0,k:[100,bY]},nm:"Inner"},
      mf(tc.compassInner),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"InnerGrp"},
    // Compass border
    ...VC.outer.map((sh,i)=>({ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:sh},nm:"Cb"+i},ms(tc.compassBorder,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"Cb"+i+"Grp"})),
  ],ip:0,op:90,st:0,bm:0});

  // Cardinal marks N/S/E/W — separate layer on top of compass, follows same float
  const mDelay=8;
  L.unshift({ddd:0,ind:9,ty:4,nm:"Cardinals",sr:1,ks:{
    o:{a:1,k:[{...io,t:mDelay,s:[0]},{t:mDelay+4,s:[100]}]},r:{a:0,k:0},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:mDelay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:mDelay,s:[0,0,100]},{...io3,t:mDelay+3,s:[110,110,100]},{t:mDelay+6,s:[100,100,100]}]}
  },ao:0,shapes:[
    // N (red, top)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[8,10]},p:{a:0,k:[0,-32]},r:{a:0,k:2},nm:"Nbg"},mf(tc.needleN),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"NbgGrp"},
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-2.5,-35.5],[0,-29],[2.5,-35.5],[-2.5,-35.5]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:false}},nm:"Nl"},
      ms(white,1.2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"NlGrp"},
    // S (bottom)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[7,9]},p:{a:0,k:[0,32]},r:{a:0,k:2},nm:"Sbg"},mf(tc.needleS),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"SbgGrp"},
    // E (right)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[9,7]},p:{a:0,k:[32,0]},r:{a:0,k:2},nm:"Ebg"},mf(tc.compassBorder),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"EbgGrp"},
    // W (left)
    {ty:"gr",it:[
      {ty:"rc",d:1,s:{a:0,k:[9,7]},p:{a:0,k:[-32,0]},r:{a:0,k:2},nm:"Wbg"},mf(tc.compassBorder),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"WbgGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Needle (rotates!) — separate layer so it can spin
  // Position follows compass center, anchor at [0,0] since shapes are relative to center
  const nDelay=10;
  L.unshift({ddd:0,ind:11,ty:4,nm:"Needle",sr:1,ks:{
    o:{a:1,k:[{...io,t:nDelay,s:[0]},{t:nDelay+3,s:[100]}]},
    r:{a:1,k:[
      {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:nDelay,s:[180]},
      {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:nDelay+12,s:[360]},
      {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:nDelay+18,s:[345]},
      {t:nDelay+22,s:[350]},
      // idle gentle wobble
      {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:50,s:[355]},
      {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:70,s:[345]},
      {t:90,s:[355]}
    ]},
    p:{a:1,k:[
      {i:{x:.667,y:1},o:{x:.333,y:0},t:nDelay,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100,bY-3,0]}
    ]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:nDelay,s:[0,0,100]},{...io3,t:nDelay+4,s:[110,110,100]},{t:nDelay+7,s:[100,100,100]}]}
  },ao:0,shapes:[
    // Red north half (triangle pointing up)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-22],[-6,0],[6,0]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:"NorthTri"},
      mf(tc.needleN),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"NTriGrp"},
    // Dark south half (triangle pointing down)
    {ty:"gr",it:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,22],[-6,0],[6,0]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:"SouthTri"},
      mf(tc.needleS),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"STriGrp"},
    // Center dot
    {ty:"gr",it:[
      {ty:"el",d:1,s:{a:0,k:[6,6]},p:{a:0,k:[0,0]},nm:"Ctr"},
      mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
    ],nm:"CtrGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Brazil flag colors for Ouro (small diamond below compass)
  if(tc.flagColors){
    const fDelay=22;
    L.unshift({ddd:0,ind:15,ty:4,nm:"Flag",sr:1,ks:{
      o:{a:1,k:[{...io,t:fDelay,s:[0]},{t:fDelay+3,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:fDelay,s:[100,bY+42,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+39,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+45,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[100,bY+39,0]}
      ]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:fDelay,s:[0,0,100]},{...io3,t:fDelay+3,s:[120,120,100]},{t:fDelay+6,s:[100,100,100]}]}
    },ao:0,shapes:[
      // Green bg rect
      {ty:"gr",it:[
        {ty:"rc",d:1,s:{a:0,k:[24,14]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:"Bg"},
        mf(tc.flagColors[0]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"BgGrp"},
      // Yellow diamond
      {ty:"gr",it:[
        {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-5],[10,0],[0,5],[-10,0]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"Dia"},
        mf(tc.flagColors[1]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"DiaGrp"},
      // Blue circle
      {ty:"gr",it:[
        {ty:"el",d:1,s:{a:0,k:[7,7]},p:{a:0,k:[0,0]},nm:"Circ"},
        mf(tc.flagColors[2]),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
      ],nm:"CircGrp"},
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

// Delete old tier files
try{fs.unlinkSync(path.join(prevDir,'seasonal_descobrimento_t1.json'));}catch{}
try{fs.unlinkSync(path.join(prevDir,'seasonal_descobrimento_t4.json'));}catch{}

const files={base:'seasonal_descobrimento',t2:'seasonal_descobrimento_t2',t3:'seasonal_descobrimento_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_descobrimento (Bronze + Prata + Ouro)");
