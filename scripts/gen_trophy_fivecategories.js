const fs = require('fs');

// 5 slice colors (representing different spending categories)
const sliceColors = [
  [0.35,0.7,0.35,1],  // green - food
  [0.3,0.5,0.9,1],    // blue - housing
  [0.9,0.4,0.3,1],    // red - transport
  [0.95,0.7,0.2,1],   // yellow - entertainment
  [0.7,0.35,0.8,1],   // purple - health
];

const tierColors = {
  1: { bg: [0.85,0.82,0.75,1], border: [0.6,0.55,0.45,1], lens: [0.5,0.35,0.2,1], glow: [0.6,0.5,0.35,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { bg: [0.85,0.85,0.88,1], border: [0.55,0.55,0.6,1], lens: [0.4,0.4,0.48,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { bg: [0.95,0.92,0.8,1], border: [0.85,0.65,0.13,1], lens: [0.6,0.4,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { bg: [0.82,0.9,1,1], border: [0.2,0.55,0.8,1], lens: [1,0.84,0,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

// Create pie slice path with smooth arc (more bezier points)
function makeSlice(startAngle, endAngle, radius) {
  const sa = startAngle * Math.PI / 180;
  const ea = endAngle * Math.PI / 180;
  const steps = 4; // 4 points on arc = smooth curve
  const verts = [[0,0]];
  const ins = [[0,0]];
  const outs = [[0,0]];

  for (let i = 0; i <= steps; i++) {
    const a = sa + (ea - sa) * (i / steps);
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    verts.push([+x.toFixed(2), +y.toFixed(2)]);

    // Tangent direction (perpendicular to radius)
    const tanLen = radius * Math.tan((ea - sa) / steps / 2) * 0.55;
    const tx = -Math.sin(a) * tanLen;
    const ty = Math.cos(a) * tanLen;

    if (i === 0) {
      ins.push([0, 0]);
      outs.push([+tx.toFixed(2), +ty.toFixed(2)]);
    } else if (i === steps) {
      ins.push([+(-tx).toFixed(2), +(-ty).toFixed(2)]);
      outs.push([0, 0]);
    } else {
      ins.push([+(-tx).toFixed(2), +(-ty).toFixed(2)]);
      outs.push([+tx.toFixed(2), +ty.toFixed(2)]);
    }
  }

  return { v: verts, i: ins, o: outs, c: true };
}

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const sliceCount = {1:3,2:4,3:5,4:5}[tier];
  const hasLens = tier >= 2;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 100;
  const pieR = 25;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[22,22],[178,18],[100,8],[38,14],[162,26]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=30+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── MAGNIFYING GLASS / EYE (tier 2+ — specialist analyzing) ──
  if (hasLens) {
    layers.push({
      ddd:0,ind:15,ty:4,nm:'Lens',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:18,s:[0]},{t:24,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:18,s:[0,0,100]},{...io3,t:22,s:[120,120,100]},{t:26,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Lens circle
        {ty:'el',d:1,s:{a:0,k:[14,14]},p:{a:0,k:[0,0]},nm:'Glass'},
        {ty:'st',c:{a:0,k:c.lens},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'GS'},
        // Handle
        {ty:'sh',d:1,ks:{a:0,k:{v:[[5,5],[12,12]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Handle'},
        {ty:'st',c:{a:0,k:c.lens},o:{a:0,k:100},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'HS'},
        // Shine on glass
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-3,-4],[-1,-5]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Shine'},
        {ty:'st',c:{a:0,k:[1,1,1,1]},o:{a:0,k:40},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'ShS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── PIE SLICES (appearing one by one with rotation) ──
  const anglePerSlice = 360 / sliceCount;
  for (let si = 0; si < sliceCount; si++) {
    const startA = -90 + si * anglePerSlice;
    const endA = startA + anglePerSlice;
    const slice = makeSlice(startA, endA, pieR);
    const d = 10 + si * 3;
    const col = tier === 4
      ? sliceColors[si].map((v,j) => j < 3 ? Math.min(1, v * 1.2) : v) // brighter for diamond
      : sliceColors[si];

    layers.push({
      ddd:0,ind:20+si,ty:4,nm:'Slice'+(si+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},
        r:{a:1,k:[{...io,t:d,s:[-30]},{t:d+5,s:[0]}]}, // rotate in
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+3,s:[110,110,100]},{t:d+5,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'sh',d:1,ks:{a:0,k:slice},nm:'Sl'},
        {ty:'fl',c:{a:0,k:col},o:{a:0,k:90},r:1,bm:0,nm:'SF'},
        {ty:'st',c:{a:0,k:[1,1,1,1]},o:{a:0,k:30},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'SS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── CHART BORDER (circle outline) ──
  layers.push({
    ddd:0,ind:11,ty:4,nm:'Border',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:8,s:[0]},{t:14,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Background circle
      {ty:'el',d:1,s:{a:0,k:[pieR*2+4,pieR*2+4]},p:{a:0,k:[0,0]},nm:'Bg'},
      {ty:'fl',c:{a:0,k:c.bg},o:{a:0,k:40},r:1,bm:0,nm:'BgF'},
      // Border ring
      {ty:'el',d:1,s:{a:0,k:[pieR*2+4,pieR*2+4]},p:{a:0,k:[0,0]},nm:'Ring'},
      {ty:'st',c:{a:0,k:c.border},o:{a:0,k:80},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'RS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── SLOW ROTATION of entire pie (idle) ──
  // Apply to slices via the border layer parent? No — just gentle float is enough

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Finance Specialist T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/five_categories_month_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/five_categories_month_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Finance Specialist';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/five_categories_month.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/five_categories_month.json',bj)}catch{}
console.log('Done!');
