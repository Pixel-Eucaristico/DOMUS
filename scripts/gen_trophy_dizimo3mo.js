const fs = require('fs');

const tierColors = {
  1: { basket: [0.6,0.45,0.25,1], basketDark: [0.45,0.3,0.15,1], weave: [0.5,0.38,0.2,1], heart: [0.8,0.2,0.15,1], heartDark: [0.6,0.12,0.1,1], glow: [0.8,0.2,0.15,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { basket: [0.55,0.55,0.6,1], basketDark: [0.4,0.4,0.45,1], weave: [0.48,0.48,0.53,1], heart: [0.85,0.15,0.2,1], heartDark: [0.65,0.1,0.12,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { basket: [0.7,0.55,0.3,1], basketDark: [0.5,0.35,0.15,1], weave: [0.6,0.45,0.22,1], heart: [0.9,0.1,0.1,1], heartDark: [0.7,0.05,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { basket: [0.25,0.5,0.75,1], basketDark: [0.15,0.35,0.55,1], weave: [0.2,0.45,0.65,1], heart: [0.95,0.08,0.12,1], heartDark: [0.75,0.04,0.06,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

// Mini heart shape
function makeHeart(cx, cy, sz) {
  const s = sz/10;
  return {
    v:[[cx,cy+4*s],[cx-5*s,cy-1*s],[cx-3*s,cy-4*s],[cx,cy-2*s],[cx+3*s,cy-4*s],[cx+5*s,cy-1*s]],
    i:[[0,0],[0,2*s],[-1.5*s,0],[0,0],[1.5*s,0],[0,-2*s]],
    o:[[0,0],[-2*s,0],[0,0],[0,0],[0,0],[2*s,0]],
    c:true
  };
}

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const heartCount = {1:2,2:3,3:3,4:4}[tier];
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 108;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  const entryKF = [
    {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
    ...floatKF(bY,16)
  ];

  // ── SPARKLES ──
  const sPos=[[22,22],[178,18],[100,8],[38,14],[162,26]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=28+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── HEARTS (popping out of basket) ──
  const heartPositions = [
    {x:0,y:-18,sz:12,rot:0,d:14},    // center big
    {x:-12,y:-12,sz:9,rot:-15,d:18},  // left
    {x:12,y:-12,sz:9,rot:15,d:20},    // right
    {x:0,y:-28,sz:8,rot:0,d:22},      // top (tier 4)
  ];
  for (let hi = 0; hi < heartCount; hi++) {
    const hp = heartPositions[hi];
    const heart = makeHeart(0, 0, hp.sz);
    layers.push({
      ddd:0,ind:20+hi,ty:4,nm:'Heart'+(hi+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:hp.d,s:[0]},{t:hp.d+4,s:[100]}]},
        r:{a:0,k:hp.rot},
        p:{a:1,k:[
          {i:{x:.5,y:1},o:{x:.5,y:0},t:hp.d,s:[100+hp.x,bY+2,0],to:[0,-3,0],ti:[0,3,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:hp.d+6,s:[100+hp.x,bY+hp.y,0],to:[0,0,0],ti:[0,0,0]},
          ...floatKF(bY+hp.y,hp.d+10).map(kf => ({...kf,s:[100+hp.x,kf.s[1],0]}))
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[
          {...io3,t:hp.d,s:[0,0,100]},
          {...io3,t:hp.d+3,s:[120,120,100]},
          {t:hp.d+6,s:[100,100,100]},
          // Heartbeat pulse
          {...io3,t:48+hi*4,s:[100,100,100]},
          {...io3,t:52+hi*4,s:[115,115,100]},
          {t:56+hi*4,s:[100,100,100]}
        ]}
      },
      ao:0,shapes:[
        {ty:'sh',d:1,ks:{a:0,k:heart},nm:'H'},
        {ty:'st',c:{a:0,k:c.heartDark},o:{a:0,k:60},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'HS'},
        {ty:'fl',c:{a:0,k:c.heart},o:{a:0,k:100},r:1,bm:0,nm:'HF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── BASKET ──
  const bw = 36, bh = 22;
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Basket',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:entryKF},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Salva/bandeja oval (offering plate)
      // Main bowl (wide oval)
      {ty:'el',d:1,s:{a:0,k:[bw+8,bh-4]},p:{a:0,k:[0,4]},nm:'Bowl'},
      {ty:'fl',c:{a:0,k:c.basket},o:{a:0,k:100},r:1,bm:0,nm:'BwF'},
      // Inner oval (depth)
      {ty:'el',d:1,s:{a:0,k:[bw-2,bh-10]},p:{a:0,k:[0,4]},nm:'Inner'},
      {ty:'fl',c:{a:0,k:c.basketDark},o:{a:0,k:40},r:1,bm:0,nm:'InF'},
      // Rim (outer edge — border)
      {ty:'el',d:1,s:{a:0,k:[bw+8,bh-4]},p:{a:0,k:[0,4]},nm:'Rim'},
      {ty:'st',c:{a:0,k:c.basketDark},o:{a:0,k:70},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'RS'},
      // Inner rim highlight
      {ty:'el',d:1,s:{a:0,k:[bw+2,bh-6]},p:{a:0,k:[0,4]},nm:'InRim'},
      {ty:'st',c:{a:0,k:c.weave},o:{a:0,k:30},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'IRS'},
      // Base/pedestal (small oval underneath)
      {ty:'el',d:1,s:{a:0,k:[16,6]},p:{a:0,k:[0,bh/2+2]},nm:'Base'},
      {ty:'fl',c:{a:0,k:c.basketDark},o:{a:0,k:80},r:1,bm:0,nm:'BsF'},
      // Cross ornament on rim (subtle)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-1],[0,5]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'CrV'},
      {ty:'st',c:{a:0,k:c.weave},o:{a:0,k:25},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'CVS'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-3,2],[3,2]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'CrH'},
      {ty:'st',c:{a:0,k:c.weave},o:{a:0,k:25},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'CHS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,110]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Faithful Offerer T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/dizimo_3mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/dizimo_3mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Faithful Offerer';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/dizimo_3mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/dizimo_3mo.json',bj)}catch{}
console.log('Done!');
