const fs = require('fs');
const {scale, panR, panL, circle} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-scale.json'));

const tierColors = {
  1: { main: [0.6,0.45,0.25,1], mainDark: [0.45,0.32,0.15,1], pan: [0.7,0.55,0.3,1], coin: [0.8,0.6,0.25,1], num: [0.5,0.35,0.15,1], glow: [0.6,0.45,0.25,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { main: [0.6,0.6,0.65,1], mainDark: [0.45,0.45,0.5,1], pan: [0.7,0.7,0.75,1], coin: [0.75,0.75,0.8,1], num: [0.4,0.4,0.45,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { main: [0.85,0.65,0.13,1], mainDark: [0.6,0.4,0.05,1], pan: [1,0.84,0,1], coin: [1,0.9,0.3,1], num: [0.6,0.4,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { main: [0.2,0.55,0.8,1], mainDark: [0.12,0.35,0.6,1], pan: [0.31,0.765,0.969,1], coin: [0.5,0.85,1,1], num: [1,0.84,0,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const coinCount = {1:0,2:1,3:2,4:3}[tier];
  const hasNum = false;
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
  const sPos=[[22,25],[178,20],[100,10],[38,15],[162,30]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=30+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── COINS on pans (tier 2+) ──
  for (let side = 0; side < 2; side++) {
    const cx = side === 0 ? -16 : 16; // left pan / right pan offset
    for (let ci = 0; ci < coinCount; ci++) {
      const coinY = -ci * 4 - 3;
      const d = 18 + ci * 3 + side * 2;
      layers.push({
        ddd:0,ind:50+side*10+ci,ty:4,nm:'Coin'+(side?'R':'L')+(ci+1),sr:1,
        ks:{
          o:{a:1,k:[{...io,t:d,s:[0]},{t:d+4,s:[100]}]},r:{a:0,k:0},
          p:{a:1,k:floatKF(bY+8,16)},a:{a:0,k:[0,0,0]},
          s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+3,s:[120,80,100]},{t:d+5,s:[100,100,100]}]}
        },
        ao:0,shapes:[
          {ty:'el',d:1,s:{a:0,k:[8,5]},p:{a:0,k:[cx,coinY]},nm:'C'},
          {ty:'st',c:{a:0,k:c.mainDark},o:{a:0,k:60},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'CS'},
          {ty:'fl',c:{a:0,k:c.coin},o:{a:0,k:100},r:1,bm:0,nm:'CF'}
        ],ip:0,op:90,st:0,bm:0
      });
    }
  }

  // ── "3" NUMBER (tier 3+) ──
  if (hasNum) {
    layers.push({
      ddd:0,ind:19,ty:4,nm:'Num3',sr:1,
      ks:{o:{a:1,k:[{...io,t:20,s:[0]},{t:26,s:[90]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY-8,16)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:20,s:[0,0,100]},{...io3,t:24,s:[120,120,100]},{t:28,s:[100,100,100]}]}},
      ao:0,shapes:[
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-4,-6],[3,-6],[4,-3],[1,0],[4,3],[3,6],[-4,6]],i:[[0,0],[0,0],[0,0],[2,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[-2,0],[0,0],[0,0],[0,0]],c:false}},nm:'N3'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:90},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'N3S'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── PANS (left + right — separate for oscillation) ──
  // Left pan oscillates down then up, right pan opposite, then both stabilize
  layers.push({
    ddd:0,ind:12,ty:4,nm:'PanL',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:6,s:[0]},{t:12,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        // Oscillation: left goes down first, then stabilizes
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[100,bY-6,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:20,s:[100,bY+4,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:26,s:[100,bY-2,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,30)
      ]},
      a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:panL},nm:'PL'},
      {ty:'fl',c:{a:0,k:c.pan},o:{a:0,k:80},r:1,bm:0,nm:'PLF'}
    ],ip:0,op:90,st:0,bm:0
  });
  layers.push({
    ddd:0,ind:13,ty:4,nm:'PanR',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:6,s:[0]},{t:12,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:[
        // Opposite oscillation: right goes up first
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY-8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[100,bY+5,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:20,s:[100,bY-3,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:26,s:[100,bY+1,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,30)
      ]},
      a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:panR},nm:'PR'},
      {ty:'fl',c:{a:0,k:c.pan},o:{a:0,k:80},r:1,bm:0,nm:'PRF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── SCALE BODY (pillar + beam + base — SVG real) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Scale',sr:1,
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
      {ty:'sh',d:1,ks:{a:0,k:scale},nm:'Body'},
      {ty:'fl',c:{a:0,k:c.main},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
      // Center circle highlight
      {ty:'sh',d:1,ks:{a:0,k:circle},nm:'Circle'},
      {ty:'fl',c:{a:0,k:c.mainDark},o:{a:0,k:100},r:1,bm:0,nm:'CF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Balance Streak T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/budget_3mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/budget_3mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Balance Streak';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/budget_3mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/budget_3mo.json',bj)}catch{}
console.log('Done!');
