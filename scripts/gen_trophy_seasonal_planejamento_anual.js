const fs=require('fs'),path=require('path');
const bY=105,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const white=[1,1,1,1];
const lineCol=[.3,.45,.65,1];

// Tier configs: colors, rows, star size, extras
const TIERS = {
  base: { // Bronze
    nm: "Seasonal Planejamento Anual",
    header: [.45,.3,.15,1],     // brown header
    clip: [.35,.22,.1,1],       // dark brown clip
    border: [.65,.5,.3,1],      // bronze border
    check: [.6,.4,.2,1],        // bronze checks
    star: [.804,.498,.196,1],   // bronze star
    sparkle: [.804,.498,.196,1],
    glow: [.5,.35,.2,.3],
    starSize: 11,
    rows: 3,                    // fewer rows for bronze
    extraSparkles: 0,
    pulse: false,
  },
  t2: { // Prata
    nm: "Seasonal Planejamento Anual Prata",
    header: [.35,.4,.5,1],      // silver-blue header
    clip: [.25,.3,.4,1],
    border: [.7,.72,.78,1],     // silver border
    check: [.5,.55,.65,1],      // silver checks
    star: [.75,.75,.78,1],      // silver star
    sparkle: [.75,.75,.8,1],
    glow: [.6,.6,.7,.35],
    starSize: 12,
    rows: 4,                    // more rows
    extraSparkles: 0,
    pulse: true,                // shimmer ring
    pulseColor: [.75,.75,.78,1],
  },
  t3: { // Ouro
    nm: "Seasonal Planejamento Anual Ouro",
    header: [.15,.25,.45,1],    // navy header (original, premium feel)
    clip: [.1,.18,.35,1],
    border: [1,.85,.2,1],       // gold border
    check: [.18,.78,.35,1],     // green checks (original, vibrant)
    star: [1,.843,0,1],         // gold star
    sparkle: [1,.843,0,1],
    glow: [.95,.85,.4,.45],     // brighter glow
    starSize: 15,               // bigger star
    rows: 4,
    extraSparkles: 5,           // lots of extra sparkles
    pulse: true,
    pulseColor: [1,.843,0,1],
  },
};

function dropAndFloat(){
  return {a:1,k:[
    {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,10,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[100,bY+6,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:18,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+3,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,bY-3,0]}
  ]};
}

function buildAnim(tc) {
  const L=[];

  // Glow
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[10]},{...io,t:45,s:[22]},{t:90,s:[10]}]},r:{a:0,k:0},p:{a:0,k:[100,bY+5,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  // Card
  L.unshift({ddd:0,ind:10,ty:4,nm:"Card",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:6,s:[100]}]},r:{a:0,k:0},p:dropAndFloat(),a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:11,s:[106,94,100]},{t:14,s:[100,100,100]}]}},ao:0,shapes:[
    {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[60,70]},p:{a:0,k:[0,2]},r:{a:0,k:5},nm:"Paper"},mf(white),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"PaperGrp"},
    {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[60,14]},p:{a:0,k:[0,-29]},r:{a:0,k:[5,5,0,0]},nm:"Header"},mf(tc.header),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"HeaderGrp"},
    {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[20,8]},p:{a:0,k:[0,-38]},r:{a:0,k:3},nm:"Clip"},mf(tc.clip),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"ClipGrp"},
    {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[60,70]},p:{a:0,k:[0,2]},r:{a:0,k:5},nm:"Bdr"},ms(tc.border,2),
      {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"BdrGrp"},
  ],ip:0,op:90,st:0,bm:0});

  // Checklist rows
  const allRows = [
    {y: bY-16, lineW: 28, delay: 14},
    {y: bY-4,  lineW: 24, delay: 17},
    {y: bY+8,  lineW: 28, delay: 20},
    {y: bY+20, lineW: 18, delay: 23},
  ];
  const rows = allRows.slice(0, tc.rows);
  rows.forEach((row, i) => {
    L.unshift({ddd:0,ind:20+i,ty:4,nm:"Row"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t:row.delay,s:[0]},{t:row.delay+3,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:row.delay,s:[100,row.y,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,row.y-3,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,row.y+3,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[100,row.y-3,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:row.delay,s:[0,0,100]},{...io3,t:row.delay+2,s:[110,110,100]},{t:row.delay+4,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[9,9]},p:{a:0,k:[-20,0]},nm:"Dot"+i},mf(tc.check),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"Dot"+i+"Grp"},
      {ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{v:[[-22.5,-1.5],[-20.5,1.5],[-17,-2.5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"Ck"+i},ms(white,1.5),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"Ck"+i+"Grp"},
      {ty:"gr",it:[{ty:"rc",d:1,s:{a:0,k:[row.lineW,3.5]},p:{a:0,k:[-4+(row.lineW/2),0]},r:{a:0,k:1.5},nm:"Tx"+i},mf(lineCol),
        {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}],nm:"Tx"+i+"Grp"},
    ],ip:0,op:90,st:0,bm:0});
  });

  // Star
  const starDelay=26;
  L.unshift({ddd:0,ind:60,ty:4,nm:"Star",sr:1,ks:{o:{a:1,k:[{...io,t:starDelay,s:[0]},{t:starDelay+3,s:[100]}]},r:{a:1,k:[{t:starDelay,s:[-20]},{t:starDelay+6,s:[5]},{t:60,s:[-3]},{t:75,s:[3]},{t:90,s:[-3]}]},p:{a:1,k:[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:starDelay,s:[135,bY-25,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[135,bY-28,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[135,bY-22,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[135,bY-28,0]}
  ]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:starDelay,s:[0,0,100]},{...io3,t:starDelay+3,s:[140,140,100]},{t:starDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
    {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:tc.starSize*0.4},is:{a:0,k:0},or:{a:0,k:tc.starSize},os:{a:0,k:0},ix:1,nm:"Star"},
    mf(tc.star),
  ],ip:0,op:90,st:0,bm:0});

  // Base sparkles (3)
  const spP=[[58,72],[145,68],[100,52]];
  for(let i=0;i<3;i++){const d=28+i*5;L.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:60+i*7,s:[100]},{...io,t:70+i*7,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*40]},{t:90,s:[i*40+180]}]},p:{a:0,k:[spP[i][0],spP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});}

  // Extra sparkles for higher tiers
  const exSpP=[[50,80],[150,78],[68,58],[132,60],[100,42]];
  for(let i=0;i<tc.extraSparkles;i++){
    const d=20+i*4;
    L.unshift({ddd:0,ind:300+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:62+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},p:{a:0,k:[exSpP[i][0],exSpP[i][1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}},ao:0,shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},mf(tc.sparkle)],ip:0,op:90,st:0,bm:0});
  }

  // Pulse ring for Prata/Ouro
  if(tc.pulse){
    L.push({ddd:0,ind:998,ty:4,nm:"Pulse",sr:1,ks:{
      o:{a:1,k:[{...io,t:18,s:[0]},{...io,t:22,s:[35]},{...io,t:32,s:[0]},{...io,t:58,s:[0]},{...io,t:62,s:[35]},{...io,t:72,s:[0]},{t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,bY+2,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:18,s:[60,60,100]},{...io3,t:32,s:[130,130,100]},{...io3,t:58,s:[60,60,100]},{t:72,s:[130,130,100]}]}
    },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},ms(tc.pulseColor,2.5)],ip:0,op:90,st:0,bm:0});
  }

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});

// Generate all 3 tiers
const files = {base:'seasonal_planejamento_anual', t2:'seasonal_planejamento_anual_t2', t3:'seasonal_planejamento_anual_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
}
console.log("Done: seasonal_planejamento_anual (Bronze + Prata + Ouro)");
