const fs = require('fs');

const tierColors = {
  1: { cert: [0.92,0.88,0.78,1], certDark: [0.7,0.65,0.5,1], certLine: [0.6,0.55,0.4,1], seal: [0.7,0.45,0.15,1], sealDark: [0.5,0.3,0.08,1], star: [0.9,0.7,0.3,1], ribbon: [0.7,0.2,0.15,1], glow: [0.7,0.45,0.15,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { cert: [0.9,0.9,0.93,1], certDark: [0.65,0.65,0.7,1], certLine: [0.55,0.55,0.6,1], seal: [0.6,0.6,0.65,1], sealDark: [0.45,0.45,0.5,1], star: [0.8,0.8,0.85,1], ribbon: [0.55,0.55,0.65,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { cert: [1,0.97,0.88,1], certDark: [0.85,0.75,0.55,1], certLine: [0.6,0.5,0.3,1], seal: [1,0.84,0,1], sealDark: [0.85,0.65,0.13,1], star: [1,1,0.85,1], ribbon: [0.85,0.15,0.1,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { cert: [0.85,0.92,1,1], certDark: [0.55,0.7,0.85,1], certLine: [0.3,0.5,0.7,1], seal: [1,0.84,0,1], sealDark: [0.85,0.65,0.13,1], star: [0.8,0.95,1,1], ribbon: [0.31,0.765,0.969,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const hasStar = tier >= 2;
  const hasRibbon = tier >= 3;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 100;
  const certW = 50, certH = 38;
  const sealR = 10;
  const sealX = 12, sealY = 14;

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

  // ── STAR inside seal (tier 2+) ──
  if (hasStar) {
    layers.push({
      ddd:0,ind:17,ty:4,nm:'Star',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:20,s:[0]},{...io,t:24,s:[100]},{...io,t:28,s:[80]},{t:32,s:[100]}]},
        r:{a:1,k:[{...io,t:20,s:[-30]},{t:26,s:[0]}]},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:20,s:[0,0,100]},{...io3,t:24,s:[130,130,100]},{t:28,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'sr',sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[sealX,sealY]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:'St'},
        {ty:'fl',c:{a:0,k:c.star},o:{a:0,k:100},r:1,bm:0,nm:'StF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── SEAL (wax stamp — appears with stamp bounce) ──
  layers.push({
    ddd:0,ind:16,ty:4,nm:'Seal',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:14,s:[0]},{t:16,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[
        {...io3,t:14,s:[0,0,100]},
        {...io3,t:16,s:[140,140,100]}, // stamp!
        {...io3,t:18,s:[90,110,100]},
        {t:22,s:[100,100,100]}
      ]}
    },
    ao:0,shapes:[
      // Seal circle (scalloped edge)
      {ty:'sr',sy:1,d:1,pt:{a:0,k:12},p:{a:0,k:[sealX,sealY]},r:{a:0,k:0},ir:{a:0,k:sealR-2},is:{a:0,k:0},or:{a:0,k:sealR},os:{a:0,k:0},ix:1,nm:'Edge'},
      {ty:'fl',c:{a:0,k:c.seal},o:{a:0,k:100},r:1,bm:0,nm:'EF'},
      // Inner circle
      {ty:'el',d:1,s:{a:0,k:[sealR*1.4,sealR*1.4]},p:{a:0,k:[sealX,sealY]},nm:'Inner'},
      {ty:'st',c:{a:0,k:c.sealDark},o:{a:0,k:60},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'IS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── RIBBON (tier 3+ — hanging from seal) ──
  if (hasRibbon) {
    layers.push({
      ddd:0,ind:18,ty:4,nm:'Ribbon',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:20,s:[0]},{t:26,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:20,s:[100,0,100]},{t:26,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Two ribbon tails
        {ty:'sh',d:1,ks:{a:0,k:{v:[[sealX-3,sealY+sealR],[sealX-5,sealY+sealR+14],[sealX-2,sealY+sealR+10]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'RL'},
        {ty:'st',c:{a:0,k:c.ribbon},o:{a:0,k:100},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'RLS'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[sealX+3,sealY+sealR],[sealX+5,sealY+sealR+14],[sealX+2,sealY+sealR+10]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'RR'},
        {ty:'st',c:{a:0,k:c.ribbon},o:{a:0,k:100},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'RRS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── CERTIFICATE (main document) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Cert',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
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
      // Paper
      {ty:'rc',d:1,s:{a:0,k:[certW,certH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Paper'},
      {ty:'fl',c:{a:0,k:c.cert},o:{a:0,k:100},r:1,bm:0,nm:'PF'},
      // Border frame (ornamental)
      {ty:'rc',d:1,s:{a:0,k:[certW-6,certH-6]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'Frame'},
      {ty:'st',c:{a:0,k:c.certDark},o:{a:0,k:50},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'FS'},
      // Inner frame (double border)
      {ty:'rc',d:1,s:{a:0,k:[certW-10,certH-10]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'Frame2'},
      {ty:'st',c:{a:0,k:c.certDark},o:{a:0,k:30},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'F2S'},
      // Title line (top)
      {ty:'rc',d:1,s:{a:0,k:[24,2.5]},p:{a:0,k:[-4,-10]},r:{a:0,k:1},nm:'Title'},
      {ty:'fl',c:{a:0,k:c.certLine},o:{a:0,k:60},r:1,bm:0,nm:'TF'},
      // Text lines
      {ty:'rc',d:1,s:{a:0,k:[30,1.5]},p:{a:0,k:[-2,-4]},r:{a:0,k:0.5},nm:'L1'},
      {ty:'fl',c:{a:0,k:c.certLine},o:{a:0,k:40},r:1,bm:0,nm:'L1F'},
      {ty:'rc',d:1,s:{a:0,k:[26,1.5]},p:{a:0,k:[-4,0]},r:{a:0,k:0.5},nm:'L2'},
      {ty:'fl',c:{a:0,k:c.certLine},o:{a:0,k:40},r:1,bm:0,nm:'L2F'},
      {ty:'rc',d:1,s:{a:0,k:[20,1.5]},p:{a:0,k:[-6,4]},r:{a:0,k:0.5},nm:'L3'},
      {ty:'fl',c:{a:0,k:c.certLine},o:{a:0,k:40},r:1,bm:0,nm:'L3F'},
      // Outer border
      {ty:'rc',d:1,s:{a:0,k:[certW,certH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Bdr'},
      {ty:'st',c:{a:0,k:c.certDark},o:{a:0,k:60},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'BS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,110]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Finance Specialist T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/level_20_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_20_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Finance Specialist';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/level_20.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_20.json',bj)}catch{}
console.log('Done!');
