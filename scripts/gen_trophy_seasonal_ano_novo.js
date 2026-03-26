const fs=require('fs'),path=require('path');
const bY=100,io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function ms(c,w){return{ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"}}

const L=[];
const gold=[1,.843,0,1],white=[1,1,1,1];
const red=[.95,.25,.2,1],orange=[1,.6,.15,1],cyan=[.2,.85,.95,1],magenta=[.9,.25,.7,1];
const darkBg=[.08,.06,.18,1];

// --- Dark circle background ---
L.push({ddd:0,ind:1,ty:4,nm:"DarkBg",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:5,s:[100]}]},r:{a:0,k:0},p:{a:0,k:[100,bY,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,105,100]},{t:12,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"el",d:1,s:{a:0,k:[90,90]},p:{a:0,k:[0,0]},nm:"Bg"},
  mf(darkBg),
],ip:0,op:90,st:0,bm:0});

// --- Firework burst helper ---
function makeFirework(ind, cx, cy, color, delay, particleCount, radius) {
  const particles = [];
  for(let i=0; i<particleCount; i++) {
    const angle = (i/particleCount) * Math.PI * 2;
    const endX = Math.cos(angle) * radius;
    const endY = Math.sin(angle) * radius;
    particles.push({ddd:0,ind:ind*100+i,ty:4,nm:"P"+ind+"_"+i,sr:1,ks:{
      o:{a:1,k:[
        {...io,t:delay,s:[0]},{...io,t:delay+2,s:[100]},
        {...io,t:delay+12,s:[100]},{t:delay+16,s:[0]}
      ]},
      r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:delay,s:[cx,cy,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:delay+8,s:[cx+endX,cy+endY,0],to:[0,0,0],ti:[0,0,0]},
        {t:delay+16,s:[cx+endX*1.1,cy+endY*1.1+4,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:delay,s:[120,120,100]},{...io3,t:delay+8,s:[80,80,100]},{t:delay+16,s:[30,30,100]}]}
    },ao:0,shapes:[
      {ty:"el",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},nm:"Dot"},
      mf(color),
    ],ip:0,op:90,st:0,bm:0});
  }
  return particles;
}

// --- Firework 1: Gold center burst ---
const fw1 = makeFirework(1, 100, bY-8, gold, 10, 10, 28);
fw1.forEach(p => L.unshift(p));

// --- Firework 2: Red top-left ---
const fw2 = makeFirework(2, 75, bY-20, red, 16, 8, 20);
fw2.forEach(p => L.unshift(p));

// --- Firework 3: Cyan top-right ---
const fw3 = makeFirework(3, 128, bY-18, cyan, 22, 8, 22);
fw3.forEach(p => L.unshift(p));

// --- Firework flash rings ---
function makeFlash(ind, cx, cy, color, delay) {
  return {ddd:0,ind:ind,ty:4,nm:"Flash"+ind,sr:1,ks:{
    o:{a:1,k:[{...io,t:delay,s:[0]},{...io,t:delay+2,s:[60]},{...io,t:delay+8,s:[0]},{t:90,s:[0]}]},
    r:{a:0,k:0},p:{a:0,k:[cx,cy,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:delay,s:[10,10,100]},{...io3,t:delay+8,s:[80,80,100]},{t:delay+12,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"el",d:1,s:{a:0,k:[50,50]},p:{a:0,k:[0,0]},nm:"Ring"},
    ms(color,1.5),
  ],ip:0,op:90,st:0,bm:0};
}

L.unshift(makeFlash(50, 100, bY-8, gold, 10));
L.unshift(makeFlash(51, 75, bY-20, red, 16));
L.unshift(makeFlash(52, 128, bY-18, cyan, 22));

// --- Second wave of fireworks (loop) ---
const fw4 = makeFirework(4, 90, bY-12, magenta, 50, 8, 22);
fw4.forEach(p => L.unshift(p));
const fw5 = makeFirework(5, 115, bY-5, orange, 56, 8, 20);
fw5.forEach(p => L.unshift(p));
L.unshift(makeFlash(53, 90, bY-12, magenta, 50));
L.unshift(makeFlash(54, 115, bY-5, orange, 56));

// --- Big star in center (appears after first burst) ---
const starDelay=14;
L.unshift({ddd:0,ind:60,ty:4,nm:"Star",sr:1,ks:{o:{a:1,k:[{...io,t:starDelay,s:[0]},{...io,t:starDelay+3,s:[100]}]},r:{a:1,k:[{t:starDelay,s:[-30]},{t:starDelay+6,s:[0]},{t:90,s:[10]}]},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:starDelay,s:[100,bY-8,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY-11,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY-11,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:starDelay,s:[0,0,100]},{...io3,t:starDelay+3,s:[140,140,100]},{t:starDelay+6,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:6},is:{a:0,k:0},or:{a:0,k:15},os:{a:0,k:0},ix:1,nm:"Star"},
  mf(gold),
],ip:0,op:90,st:0,bm:0});

// --- "ANO NOVO" text representation: small rectangles forming abstract text hint ---
// Instead of text, add a golden ribbon/banner at bottom
const ribbonDelay=20;
L.unshift({ddd:0,ind:70,ty:4,nm:"Ribbon",sr:1,ks:{o:{a:1,k:[{...io,t:ribbonDelay,s:[0]},{t:ribbonDelay+4,s:[100]}]},r:{a:0,k:0},p:{a:1,k:[
  {i:{x:.667,y:1},o:{x:.333,y:0},t:ribbonDelay,s:[100,bY+22,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,bY+19,0],to:[0,0,0],ti:[0,0,0]},
  {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,bY+25,0],to:[0,0,0],ti:[0,0,0]},
  {t:90,s:[100,bY+19,0]}
]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:ribbonDelay,s:[0,100,100]},{...io3,t:ribbonDelay+4,s:[110,100,100]},{t:ribbonDelay+7,s:[100,100,100]}]}},ao:0,shapes:[
  // Ribbon body
  {ty:"gr",it:[
    {ty:"rc",d:1,s:{a:0,k:[50,12]},p:{a:0,k:[0,0]},r:{a:0,k:3},nm:"Rib"},
    mf(gold),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"RibGrp"},
  // Ribbon left notch
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[-28,6],[-25,0],[-28,-6]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"LN"},
    ms(darkBg,2),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"LNGrp"},
  // Ribbon right notch
  {ty:"gr",it:[
    {ty:"sh",d:1,ks:{a:0,k:{v:[[28,6],[25,0],[28,-6]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"RN"},
    ms(darkBg,2),
    {ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}
  ],nm:"RNGrp"},
],ip:0,op:90,st:0,bm:0});

// --- Border ring around dark bg ---
L.push({ddd:0,ind:80,ty:4,nm:"Border",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[0]},{t:5,s:[100]}]},r:{a:0,k:0},p:{a:0,k:[100,bY,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[105,105,100]},{t:12,s:[100,100,100]}]}},ao:0,shapes:[
  {ty:"el",d:1,s:{a:0,k:[90,90]},p:{a:0,k:[0,0]},nm:"Bdr"},
  ms(gold,2),
],ip:0,op:90,st:0,bm:0});

// --- Generate base (Bronze) ---
const anim={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"Seasonal Ano Novo",ddd:0,assets:[],layers:L,markers:[]};
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'seasonal_ano_novo.json'),JSON.stringify(anim));
try{fs.writeFileSync(path.join(prevDir,'seasonal_ano_novo.json'),JSON.stringify(anim));}catch{}

// --- Generate tier variants by replacing colors ---
const TIER_COLORS = {
  2: { // Prata
    border: [.75,.75,.78,1], star: [.75,.75,.78,1], ribbon: [.75,.75,.78,1],
    bg: [.06,.06,.12,1],
  },
  3: { // Ouro
    border: [1,.843,0,1], star: [1,.843,0,1], ribbon: [1,.843,0,1],
    bg: [.1,.06,.2,1],
  },
};

function replaceColor(json, from, to) {
  // Replace color arrays in the JSON string
  const fromStr = JSON.stringify(from);
  const toStr = JSON.stringify(to);
  return json.split(fromStr).join(toStr);
}

for (const tier of [2, 3]) {
  let json = JSON.stringify(anim);
  const tc = TIER_COLORS[tier];
  // Replace gold border/star/ribbon with tier color
  json = replaceColor(json, gold, tc.border);
  // Replace dark bg with tier bg
  json = replaceColor(json, darkBg, tc.bg);
  // Update name
  json = json.replace('"Seasonal Ano Novo"', `"Seasonal Ano Novo T${tier}"`);

  const fname = `seasonal_ano_novo_t${tier}.json`;
  fs.writeFileSync(path.join(outDir, fname), json);
  try{fs.writeFileSync(path.join(prevDir, fname), json);}catch{}
}

console.log("Done: seasonal_ano_novo (base + t2 + t3)");
