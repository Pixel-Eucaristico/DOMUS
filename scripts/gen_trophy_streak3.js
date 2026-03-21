const fs = require('fs');

const tierColors = {
  1: { stick: [0.6,0.45,0.25,1], head: [0.8,0.2,0.15,1], flame: [1,0.6,0.1,1], flameInner: [1,0.85,0.2,1], spark: [1,0.75,0.3,1], glow: [1,0.5,0.1,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { stick: [0.55,0.55,0.6,1], head: [0.7,0.2,0.2,1], flame: [0.9,0.55,0.15,1], flameInner: [1,0.8,0.3,1], spark: [0.85,0.87,0.95,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { stick: [0.5,0.35,0.15,1], head: [0.85,0.15,0.1,1], flame: [1,0.65,0,1], flameInner: [1,0.9,0.3,1], spark: [1,0.92,0.4,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { stick: [0.2,0.25,0.4,1], head: [0.31,0.5,0.9,1], flame: [0.31,0.765,0.969,1], flameInner: [0.6,0.9,1,1], spark: [0.7,0.9,1,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const sparkCount = {1:3,2:5,3:7,4:10}[tier]; // spark particles
  const flameSize = {1:0.6,2:0.8,3:1,4:1.15}[tier];
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:1,2:2,3:3,4:4}[tier];
  const bY = 105;
  const matchAngle = -25; // tilted match

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[30,25],[170,20],[100,10],[45,15],[155,30]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=28+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── FLAME (outer — teardrop shape, oscillating) ──
  const flameH = 28 * flameSize;
  const flameW = 14 * flameSize;
  const flameY = -42; // above match head
  layers.push({
    ddd:0,ind:16,ty:4,nm:'FlameOuter',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:10,s:[0]},{...io,t:16,s:[100]}]},
      r:{a:1,k:[
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:16,s:[matchAngle]},
        // Oscillation
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:30,s:[matchAngle-3]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:38,s:[matchAngle+3]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:46,s:[matchAngle-2]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:54,s:[matchAngle+2]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:62,s:[matchAngle-1.5]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:70,s:[matchAngle+1.5]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:78,s:[matchAngle-1]},
        {t:90,s:[matchAngle+1]}
      ]},
      p:{a:1,k:floatKF(bY,16)},
      a:{a:0,k:[0,25,0]}, // pivot at match head
      s:{a:1,k:[
        {...io3,t:10,s:[0,0,100]},
        {...io3,t:14,s:[120*flameSize,120*flameSize,100]},
        {...io3,t:18,s:[100*flameSize,100*flameSize,100]},
        // Pulse
        {...io3,t:40,s:[95*flameSize,105*flameSize,100]},
        {...io3,t:55,s:[105*flameSize,95*flameSize,100]},
        {...io3,t:70,s:[95*flameSize,105*flameSize,100]},
        {t:90,s:[100*flameSize,100*flameSize,100]}
      ]}
    },
    ao:0,shapes:[
      // Teardrop flame shape
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[0,flameY],[flameW/2,flameY+flameH*0.7],[0,flameY+flameH],[-flameW/2,flameY+flameH*0.7]],
        i:[[flameW*0.3,0],[0,0],[-flameW*0.3,0],[0,0]],
        o:[[0,0],[0,flameH*0.2],[0,0],[0,-flameH*0.2]],
        c:true
      }},nm:'Flame'},
      {ty:'fl',c:{a:0,k:c.flame},o:{a:0,k:90},r:1,bm:0,nm:'FF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── FLAME INNER (smaller, brighter) ──
  const iH = flameH * 0.55, iW = flameW * 0.5;
  layers.push({
    ddd:0,ind:17,ty:4,nm:'FlameInner',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:12,s:[0]},{...io,t:18,s:[100]}]},
      r:{a:1,k:[
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:16,s:[matchAngle]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:32,s:[matchAngle+2]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:48,s:[matchAngle-2]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:64,s:[matchAngle+1.5]},
        {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]},t:80,s:[matchAngle-1]},
        {t:90,s:[matchAngle]}
      ]},
      p:{a:1,k:floatKF(bY,16)},
      a:{a:0,k:[0,25,0]},
      s:{a:1,k:[
        {...io3,t:12,s:[0,0,100]},
        {...io3,t:18,s:[100,100,100]},
        {...io3,t:42,s:[90,110,100]},
        {...io3,t:58,s:[110,90,100]},
        {...io3,t:74,s:[90,110,100]},
        {t:90,s:[100,100,100]}
      ]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[0,flameY+flameH*0.15],[iW/2,flameY+flameH*0.65],[0,flameY+flameH*0.85],[-iW/2,flameY+flameH*0.65]],
        i:[[iW*0.25,0],[0,0],[-iW*0.25,0],[0,0]],
        o:[[0,0],[0,iH*0.15],[0,0],[0,-iH*0.15]],
        c:true
      }},nm:'Inner'},
      {ty:'fl',c:{a:0,k:c.flameInner},o:{a:0,k:100},r:1,bm:0,nm:'IF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── SPARK PARTICLES (exploding from match head) ──
  const sparkAngles = Array.from({length:sparkCount}, (_,i) => -90 + (i/(sparkCount-1||1)) * 180 - 45);
  for (let i = 0; i < sparkCount; i++) {
    const angle = sparkAngles[i] * Math.PI / 180;
    const dist = 12 + Math.random() * 10;
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist - 20;
    const d = 8 + i * 2;
    layers.push({
      ddd:0,ind:100+i,ty:4,nm:'Spark'+(i+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+2,s:[100]},{...io,t:d+12,s:[0]},{t:90,s:[0]}]},
        r:{a:0,k:0},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,bY-18,0],to:[ex/6,ey/6,0],ti:[0,0,0]},
          {t:d+12,s:[100+ex,bY-18+ey,0]}
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+12,s:[30,30,100]}]}
      },
      ao:0,shapes:[
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[0,0]},nm:'Sp'},
        {ty:'fl',c:{a:0,k:c.spark},o:{a:0,k:100},r:1,bm:0,nm:'SF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── MATCH STICK ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Match',sr:1,
    ks:{
      o:{a:0,k:100},
      r:{a:0,k:matchAngle},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,25,0]}, // pivot at head
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Stick (wooden)
      {ty:'rc',d:1,s:{a:0,k:[4,55]},p:{a:0,k:[0,25]},r:{a:0,k:1.5},nm:'Stick'},
      {ty:'fl',c:{a:0,k:c.stick},o:{a:0,k:100},r:1,bm:0,nm:'StF'},
      // Match head (rounded top)
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[-4,-2],[-4,-8],[0,-12],[4,-8],[4,-2]],
        i:[[0,0],[0,0],[-3,0],[0,0],[0,0]],
        o:[[0,0],[0,0],[3,0],[0,0],[0,0]],
        c:true
      }},nm:'Head'},
      {ty:'fl',c:{a:0,k:c.head},o:{a:0,k:100},r:1,bm:0,nm:'HF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,80,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,120]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,80,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[110,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[40,30],[160,25],[55,50],[145,45],[30,40],[170,35]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=20+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,75,0],to:[(cp[0]-100)/10,(cp[1]-75)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Spark T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_3_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_3_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Spark';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_3.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_3.json',bj)}catch{}
console.log('Done!');
