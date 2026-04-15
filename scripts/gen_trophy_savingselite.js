const fs = require('fs');
const {safe} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-safe.json'));

const tierColors = {
  1: { safe: [0.5,0.5,0.55,1], safeDark: [0.35,0.35,0.4,1], door: [0.55,0.55,0.6,1], handle: [0.65,0.5,0.25,1], bar: [0.8,0.6,0.2,1], barDark: [0.6,0.4,0.1,1], ray: [1,0.9,0.5,1], glow: [0.8,0.6,0.2,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { safe: [0.55,0.55,0.6,1], safeDark: [0.4,0.4,0.45,1], door: [0.6,0.6,0.65,1], handle: [0.7,0.7,0.75,1], bar: [0.75,0.75,0.8,1], barDark: [0.55,0.55,0.6,1], ray: [0.85,0.87,0.95,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { safe: [0.55,0.5,0.4,1], safeDark: [0.4,0.35,0.25,1], door: [0.6,0.55,0.45,1], handle: [1,0.84,0,1], bar: [1,0.84,0,1], barDark: [0.85,0.65,0.13,1], ray: [1,0.95,0.6,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { safe: [0.2,0.35,0.55,1], safeDark: [0.1,0.22,0.4,1], door: [0.25,0.4,0.6,1], handle: [1,0.84,0,1], bar: [1,0.84,0,1], barDark: [0.85,0.65,0.13,1], ray: [0.5,0.85,1,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const barCount = {1:1,2:2,3:3,4:4}[tier];
  const hasRays = tier >= 3;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 100;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[22,20],[178,15],[100,6],[38,12],[162,24]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=35+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── RAYS OF LIGHT from inside (tier 3+) ──
  if (hasRays) {
    const rayCount = tier === 4 ? 6 : 4;
    for (let i = 0; i < rayCount; i++) {
      const angle = -30 + (i / (rayCount-1)) * 60; // spread -30 to +30 degrees (left side)
      const rad = angle * Math.PI / 180;
      const len = 25 + (i % 2) * 10;
      const d = 22 + i * 2;
      layers.push({
        ddd:0,ind:150+i,ty:4,nm:'Ray'+(i+1),sr:1,
        ks:{
          o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[50]},{...io,t:d+12,s:[0]},{...io,t:d+30,s:[0]},{...io,t:d+34,s:[50]},{...io,t:d+42,s:[0]},{t:90,s:[0]}]},
          r:{a:0,k:0},p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
        },
        ao:0,shapes:[
          {ty:'sh',d:1,ks:{a:0,k:{v:[[-12,0],[-12+Math.cos(rad)*-len,Math.sin(rad)*-len]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'R'},
          {ty:'st',c:{a:0,k:c.ray},o:{a:0,k:60},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'RS'}
        ],ip:0,op:90,st:0,bm:0
      });
    }
  }

  // ── GOLD BARS (revealed when door opens) ──
  for (let bi = 0; bi < barCount; bi++) {
    const bx = -6 + (bi % 2) * 8;
    const by = 4 - Math.floor(bi / 2) * 8;
    const d = 20 + bi * 3;
    layers.push({
      ddd:0,ind:30+bi,ty:4,nm:'Bar'+(bi+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+4,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+3,s:[110,110,100]},{t:d+5,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Trapezoid gold bar
        {ty:'sh',d:1,ks:{a:0,k:{v:[[bx-4,by+2],[bx-3,by-2],[bx+3,by-2],[bx+4,by+2]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:'Br'},
        {ty:'fl',c:{a:0,k:c.bar},o:{a:0,k:100},r:1,bm:0,nm:'BrF'},
        {ty:'st',c:{a:0,k:c.barDark},o:{a:0,k:60},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'BrS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── DOOR (slides left to open, revealing inside) ──
  const safeW = 45, safeH = 40;
  const doorD = 14; // frame when door starts opening
  layers.push({
    ddd:0,ind:11,ty:4,nm:'Door',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        // Rise with safe first
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
        // Then slide left to open
        {i:{x:.667,y:1},o:{x:.333,y:0},t:doorD,s:[100,bY,0],to:[-5,0,0],ti:[5,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:doorD+12,s:[68,bY,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,doorD+16).map(kf => ({...kf, s: [68, kf.s[1], 0]}))
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:0,k:[100,100,100]}
    },
    ao:0,shapes:[
      // Door panel
      {ty:'rc',d:1,s:{a:0,k:[safeW-4,safeH-4]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Dr'},
      {ty:'fl',c:{a:0,k:c.door},o:{a:0,k:100},r:1,bm:0,nm:'DF'},
      {ty:'st',c:{a:0,k:c.safeDark},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'DS'},
      // Wheel (rotates before door opens)
      {ty:'el',d:1,s:{a:0,k:[14,14]},p:{a:0,k:[0,0]},nm:'Wheel'},
      {ty:'st',c:{a:0,k:c.handle},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'WS'},
      // Spokes (static cross)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-5],[0,5]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'SpV'},
      {ty:'st',c:{a:0,k:c.handle},o:{a:0,k:80},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'SpVS'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-5,0],[5,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'SpH'},
      {ty:'st',c:{a:0,k:c.handle},o:{a:0,k:80},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'SpHS'},
      // Handle bar
      {ty:'rc',d:1,s:{a:0,k:[18,3]},p:{a:0,k:[0,-12]},r:{a:0,k:1.5},nm:'Hndl'},
      {ty:'fl',c:{a:0,k:c.handle},o:{a:0,k:90},r:1,bm:0,nm:'HF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── SAFE BODY (native shapes with depth) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Safe',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[110,85,100]},{...io3,t:10,s:[92,112,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Outer body
      {ty:'rc',d:1,s:{a:0,k:[safeW,safeH]},p:{a:0,k:[0,0]},r:{a:0,k:3},nm:'Body'},
      {ty:'fl',c:{a:0,k:c.safe},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
      {ty:'st',c:{a:0,k:c.safeDark},o:{a:0,k:60},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'BS'},
      // ── 3D DEPTH: 4 trapezoids + inner back wall ──
      // Top trapezoid (connects outer top edge to inner top edge)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-safeW/2+3,-safeH/2+3],[safeW/2-3,-safeH/2+3],[safeW/2-9,-safeH/2+9],[-safeW/2+9,-safeH/2+9]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:'DepthT'},
      {ty:'fl',c:{a:0,k:c.safeDark},o:{a:0,k:80},r:1,bm:0,nm:'DTF'},
      // Bottom trapezoid
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-safeW/2+3,safeH/2-3],[safeW/2-3,safeH/2-3],[safeW/2-9,safeH/2-9],[-safeW/2+9,safeH/2-9]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:'DepthB'},
      {ty:'fl',c:{a:0,k:[c.safeDark[0]*0.7,c.safeDark[1]*0.7,c.safeDark[2]*0.7,1]},o:{a:0,k:90},r:1,bm:0,nm:'DBF'},
      // Left trapezoid
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-safeW/2+3,-safeH/2+3],[-safeW/2+3,safeH/2-3],[-safeW/2+9,safeH/2-9],[-safeW/2+9,-safeH/2+9]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:'DepthL'},
      {ty:'fl',c:{a:0,k:[c.safeDark[0]*0.85,c.safeDark[1]*0.85,c.safeDark[2]*0.85,1]},o:{a:0,k:85},r:1,bm:0,nm:'DLF'},
      // Right trapezoid
      {ty:'sh',d:1,ks:{a:0,k:{v:[[safeW/2-3,-safeH/2+3],[safeW/2-3,safeH/2-3],[safeW/2-9,safeH/2-9],[safeW/2-9,-safeH/2+9]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:'DepthR'},
      {ty:'fl',c:{a:0,k:[c.safeDark[0]*0.6,c.safeDark[1]*0.6,c.safeDark[2]*0.6,1]},o:{a:0,k:90},r:1,bm:0,nm:'DRF'},
      // Back wall (innermost — darkest)
      {ty:'rc',d:1,s:{a:0,k:[safeW-18,safeH-18]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'BackWall'},
      {ty:'fl',c:{a:0,k:[0.06,0.06,0.1,1]},o:{a:0,k:100},r:1,bm:0,nm:'BWF'},
      // Bottom edge (3D depth hint)
      {ty:'rc',d:1,s:{a:0,k:[safeW,4]},p:{a:0,k:[0,safeH/2+2]},r:{a:0,k:1},nm:'BotEdge'},
      {ty:'fl',c:{a:0,k:c.safeDark},o:{a:0,k:70},r:1,bm:0,nm:'BEF'},
      // Legs
      {ty:'rc',d:1,s:{a:0,k:[6,5]},p:{a:0,k:[-safeW/2+6,safeH/2+4]},r:{a:0,k:1},nm:'LegL'},
      {ty:'fl',c:{a:0,k:c.safeDark},o:{a:0,k:80},r:1,bm:0,nm:'LLF'},
      {ty:'rc',d:1,s:{a:0,k:[6,5]},p:{a:0,k:[safeW/2-6,safeH/2+4]},r:{a:0,k:1},nm:'LegR'},
      {ty:'fl',c:{a:0,k:c.safeDark},o:{a:0,k:80},r:1,bm:0,nm:'LRF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,28],[165,22],[50,52],[150,48],[25,42],[175,38]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=24+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Elite Saver T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/savings_elite_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/savings_elite_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Elite Saver';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/savings_elite.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/savings_elite.json',bj)}catch{}
console.log('Done!');
