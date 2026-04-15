const fs = require('fs');
const {crown, crownBase} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-crown.json'));

const tierColors = {
  1: { crown: [0.804,0.498,0.196,1], crownDark: [0.6,0.35,0.1,1], base: [0.6,0.4,0.2,1], pillar: [0.8,0.6,0.3,1], pillarGlow: [1,0.8,0.4,1], num: [0.5,0.3,0.1,1], aura: [0.804,0.498,0.196,1], particle: [0.9,0.7,0.3,1], glow: [0.804,0.498,0.196,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { crown: [0.75,0.75,0.78,1], crownDark: [0.55,0.55,0.6,1], base: [0.5,0.5,0.55,1], pillar: [0.7,0.7,0.75,1], pillarGlow: [0.85,0.87,0.95,1], num: [0.4,0.4,0.45,1], aura: [0.75,0.75,0.78,1], particle: [0.8,0.82,0.9,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { crown: [1,0.84,0,1], crownDark: [0.85,0.65,0.13,1], base: [0.6,0.4,0.05,1], pillar: [1,0.9,0.4,1], pillarGlow: [1,0.95,0.6,1], num: [0.6,0.4,0.05,1], aura: [1,0.843,0,1], particle: [1,0.9,0.3,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { crown: [0.31,0.765,0.969,1], crownDark: [0.2,0.55,0.8,1], base: [0.15,0.4,0.65,1], pillar: [0.4,0.8,1,1], pillarGlow: [0.6,0.9,1,1], num: [1,0.84,0,1], aura: [0.31,0.765,0.969,1], particle: [0.5,0.85,1,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1],[1,0.6,0.2,1],[0.8,0.3,0.8,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const particleCount = {1:0,2:3,3:6,4:10}[tier];
  const hasAura = tier >= 2;
  const hasNum = tier >= 2;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const hasRays = tier >= 3;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const crownY = 72;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[20,20],[180,15],[100,5],[35,12],[165,25]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=30+i*4,sz=tier===4?10:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── CROWN (SVG real) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Crown',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        // Falls from top with majestic bounce
        {i:{x:.3,y:1},o:{x:.7,y:0},t:6,s:[100,-30,0],to:[0,15,0],ti:[0,-15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[100,crownY+12,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:18,s:[100,crownY-8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:22,s:[100,crownY+3,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(crownY,26)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:14,s:[110,85,100]},{...io3,t:16,s:[90,115,100]},{...io3,t:20,s:[105,95,100]},{t:24,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:crown},nm:'Crown'},
      {ty:'st',c:{a:0,k:c.crownDark},o:{a:0,k:80},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'CS'},
      {ty:'fl',c:{a:0,k:c.crown},o:{a:0,k:100},r:1,bm:0,nm:'CF'},
      // Base band
      {ty:'sh',d:1,ks:{a:0,k:crownBase},nm:'Base'},
      {ty:'fl',c:{a:0,k:c.base},o:{a:0,k:100},r:1,bm:0,nm:'BF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── "365" NUMBER ──
  if (hasNum) {
    layers.push({
      ddd:0,ind:19,ty:4,nm:'Num365',sr:1,
      ks:{o:{a:1,k:[{...io,t:20,s:[0]},{...io,t:24,s:[100]},{...io,t:26,s:[80]},{t:30,s:[90]}]},r:{a:0,k:0},p:{a:1,k:floatKF(crownY+28,26)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:20,s:[0,0,100]},{...io3,t:24,s:[120,120,100]},{t:28,s:[100,100,100]}]}},
      ao:0,shapes:[
        // "3" — two half-circles open left (shifted -13 to center)
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-16,-6],[-10,-6],[-9,-3],[-12,0],[-9,3],[-10,6],[-16,6]],i:[[0,0],[0,0],[0,0],[2,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[-2,0],[0,0],[0,0],[0,0]],c:false}},nm:'N3'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:90},w:{a:0,k:1.8},lc:2,lj:2,bm:0,nm:'N3S'},
        // "6" — circle with tail (shifted -13)
        {ty:'el',d:1,s:{a:0,k:[9,8]},p:{a:0,k:[1,2]},nm:'N6c'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:90},w:{a:0,k:1.8},lc:2,lj:2,bm:0,nm:'N6cs'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-3,-2],[-2,-6],[1,-7]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'N6t'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:90},w:{a:0,k:1.8},lc:2,lj:2,bm:0,nm:'N6ts'},
        // "5" (shifted -13)
        {ty:'sh',d:1,ks:{a:0,k:{v:[[15,-6],[9,-6],[9,-1],[14,-1],[16,2],[14,6],[9,6]],i:[[0,0],[0,0],[0,0],[0,0],[0,0],[2,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0],[-2,0],[0,0]],c:false}},nm:'N5'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:90},w:{a:0,k:1.8},lc:2,lj:2,bm:0,nm:'N5S'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── PILLAR OF LIGHT (multi-layer for depth) ──
  const pillarW = {1:14,2:20,3:26,4:32}[tier];
  const pillarH = 65;
  const pillarY = 125;
  // Outer glow layer (widest, faintest)
  layers.push({
    ddd:0,ind:11,ty:4,nm:'PillarOuter',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:0,s:[0]},{...io,t:4,s:[25]},{...io,t:45,s:[35]},{t:90,s:[25]}]},
      r:{a:0,k:0},p:{a:0,k:[100,pillarY,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:0,s:[30,0,100]},{...io3,t:4,s:[110,120,100]},{t:8,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'rc',d:1,s:{a:0,k:[pillarW*1.6,pillarH]},p:{a:0,k:[0,-pillarH/2+8]},r:{a:0,k:pillarW*0.8},nm:'Outer'},
      {ty:'fl',c:{a:0,k:c.pillar},o:{a:0,k:20},r:1,bm:0,nm:'OF'}
    ],ip:0,op:90,st:0,bm:0
  });
  // Middle layer
  layers.push({
    ddd:0,ind:12,ty:4,nm:'PillarMid',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:0,s:[0]},{...io,t:4,s:[45]},{...io,t:45,s:[55]},{t:90,s:[45]}]},
      r:{a:0,k:0},p:{a:0,k:[100,pillarY,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:0,s:[20,0,100]},{...io3,t:4,s:[100,120,100]},{t:8,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'rc',d:1,s:{a:0,k:[pillarW,pillarH]},p:{a:0,k:[0,-pillarH/2+8]},r:{a:0,k:pillarW/2},nm:'Mid'},
      {ty:'fl',c:{a:0,k:c.pillar},o:{a:0,k:40},r:1,bm:0,nm:'MF'}
    ],ip:0,op:90,st:0,bm:0
  });
  // Core layer (brightest, thinnest)
  layers.push({
    ddd:0,ind:13,ty:4,nm:'PillarCore',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:0,s:[0]},{...io,t:4,s:[70]},{...io,t:45,s:[85]},{t:90,s:[70]}]},
      r:{a:0,k:0},p:{a:0,k:[100,pillarY,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:0,s:[10,0,100]},{...io3,t:4,s:[100,120,100]},{t:8,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'rc',d:1,s:{a:0,k:[pillarW*0.4,pillarH]},p:{a:0,k:[0,-pillarH/2+8]},r:{a:0,k:pillarW*0.2},nm:'Core'},
      {ty:'fl',c:{a:0,k:c.pillarGlow},o:{a:0,k:60},r:1,bm:0,nm:'CF'}
    ],ip:0,op:90,st:0,bm:0
  });
  // Base flare (wide at bottom)
  layers.push({
    ddd:0,ind:14,ty:4,nm:'PillarBase',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:2,s:[0]},{...io,t:6,s:[40]},{...io,t:45,s:[50]},{t:90,s:[40]}]},
      r:{a:0,k:0},p:{a:0,k:[100,pillarY+8,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:2,s:[50,0,100]},{t:6,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'el',d:1,s:{a:0,k:[pillarW*2,12]},p:{a:0,k:[0,0]},nm:'Flare'},
      {ty:'fl',c:{a:0,k:c.pillarGlow},o:{a:0,k:30},r:1,bm:0,nm:'FlF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── RISING PARTICLES ──
  for (let i = 0; i < particleCount; i++) {
    const px = -15 + (i % 5) * 7 + Math.sin(i) * 5;
    const startY = 40;
    const endY = -40;
    const d = 8 + (i % 6) * 5;
    const sz = 2 + (i % 3);
    layers.push({
      ddd:0,ind:100+i,ty:4,nm:'Part'+(i+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[80]},{...io,t:d+25,s:[0]},{...io,t:d+35,s:[0]},{...io,t:d+40,s:[80]},{...io,t:d+60,s:[0]},{t:90,s:[0]}]},
        r:{a:0,k:0},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100+px,130+startY,0],to:[0,-8,0],ti:[0,8,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+25,s:[100+px+Math.sin(i*2)*8,130+endY,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+35,s:[100+px,130+startY,0],to:[0,-8,0],ti:[0,8,0]},
          {t:d+60,s:[100+px-Math.sin(i*2)*8,130+endY,0]}
        ]},
        a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
      },
      ao:0,shapes:[
        {ty:'el',d:1,s:{a:0,k:[sz,sz]},p:{a:0,k:[0,0]},nm:'P'},
        {ty:'fl',c:{a:0,k:c.particle},o:{a:0,k:70},r:1,bm:0,nm:'PF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── RAYS OF LIGHT (tier 3+) ──
  if (hasRays) {
    const rayCount = tier === 4 ? 8 : 5;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const len = 35 + (i % 2) * 10;
      layers.push({
        ddd:0,ind:150+i,ty:4,nm:'Ray'+(i+1),sr:1,
        ks:{
          o:{a:1,k:[{...io,t:16+i*2,s:[0]},{...io,t:20+i*2,s:[30]},{...io,t:30+i*2,s:[0]},{...io,t:50+i*2,s:[0]},{...io,t:54+i*2,s:[30]},{...io,t:64+i*2,s:[0]},{t:90,s:[0]}]},
          r:{a:0,k:0},p:{a:0,k:[100,crownY+5,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
        },
        ao:0,shapes:[
          {ty:'sh',d:1,ks:{a:0,k:{v:[[0,0],[Math.cos(angle)*len,Math.sin(angle)*len]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'R'},
          {ty:'st',c:{a:0,k:c.sparkle},o:{a:0,k:40},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'RS'}
        ],ip:0,op:90,st:0,bm:0
      });
    }
  }

  // ── AURA (circular glow behind crown) ──
  if (hasAura) {
    const auraSize = {2:80,3:100,4:120}[tier];
    layers.push({
      ddd:0,ind:3,ty:4,nm:'Aura',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:12,s:[0]},{...io,t:18,s:[tier===4?30:20]},{...io,t:45,s:[tier===4?45:30]},{t:90,s:[tier===4?30:20]}]},
        r:{a:0,k:0},p:{a:1,k:floatKF(crownY+5,26)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:12,s:[0,0,100]},{...io3,t:18,s:[110,110,100]},{...io3,t:45,s:[100,100,100]},{...io3,t:67,s:[108,108,100]},{t:90,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'el',d:1,s:{a:0,k:[auraSize,auraSize]},p:{a:0,k:[0,0]},nm:'A'},
        {ty:'fl',c:{a:0,k:c.aura},o:{a:0,k:25},r:1,bm:0,nm:'AF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?8:10,px=tier===4?30:22;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[160,160]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:15},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[15]},{...io,t:45,s:[45]},{t:90,s:[15]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[88,88,100]},{...io3,t:45,s:[110,110,100]},{t:90,s:[88,88,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[150,150]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:50},w:{a:0,k:3.5},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[30,25],[170,20],[50,50],[150,45],[25,40],[175,35],[60,60],[140,55]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=18+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+20,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*45]},{t:d+20,s:[i*45+200]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,70,0],to:[(cp[0]-100)/10,(cp[1]-70)/10,0],ti:[0,0,0]},{t:d+20,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+20,s:[30,30,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[5,5]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Legendary T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_365_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_365_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Legendary';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_365.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_365.json',bj)}catch{}
console.log('Done!');
