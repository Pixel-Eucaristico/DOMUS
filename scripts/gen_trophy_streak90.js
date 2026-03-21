const fs = require('fs');

const tierColors = {
  1: { wall: [0.6,0.5,0.35,1], wallDark: [0.45,0.35,0.22,1], tower: [0.55,0.45,0.3,1], gate: [0.3,0.22,0.12,1], flag: [0.7,0.25,0.2,1], flagPole: [0.5,0.4,0.25,1], num: [0.4,0.3,0.18,1], glow: [0.6,0.5,0.35,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { wall: [0.6,0.6,0.65,1], wallDark: [0.45,0.45,0.5,1], tower: [0.55,0.55,0.6,1], gate: [0.25,0.25,0.3,1], flag: [0.6,0.6,0.7,1], flagPole: [0.4,0.4,0.45,1], num: [0.35,0.35,0.4,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { wall: [0.75,0.6,0.35,1], wallDark: [0.6,0.45,0.2,1], tower: [0.7,0.55,0.3,1], gate: [0.3,0.2,0.08,1], flag: [0.85,0.15,0.1,1], flagPole: [1,0.84,0,1], num: [1,0.84,0,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { wall: [0.2,0.35,0.55,1], wallDark: [0.12,0.22,0.4,1], tower: [0.18,0.3,0.5,1], gate: [0.08,0.15,0.28,1], flag: [1,0.84,0,1], flagPole: [0.31,0.765,0.969,1], num: [0.6,0.9,1,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const hasFlag = tier >= 2;
  const hasNum = tier >= 3;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:1,2:2,3:3,4:4}[tier];
  const bY = 108;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[25,22],[175,18],[100,8],[40,15],[160,28]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=32+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── "90" NUMBER (tier 3+) ──
  if (hasNum) {
    layers.push({
      ddd:0,ind:19,ty:4,nm:'Num90',sr:1,
      ks:{o:{a:1,k:[{...io,t:20,s:[0]},{t:26,s:[90]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},
      ao:0,shapes:[
        // "9" — circle + descending tail
        {ty:'el',d:1,s:{a:0,k:[8,7]},p:{a:0,k:[-6,-3]},nm:'9c'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:80},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'9cs'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-2,-1],[-2,5]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'9t'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:80},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'9ts'},
        // "0"
        {ty:'el',d:1,s:{a:0,k:[8,10]},p:{a:0,k:[5,-1]},nm:'0'},
        {ty:'st',c:{a:0,k:c.num},o:{a:0,k:80},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'0s'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── MERLONS (battlements on top of wall) ──
  const merlonW = 6, merlonH = 6, merlonGap = 4;
  const merlonCount = 7;
  const wallW = merlonCount * (merlonW + merlonGap) - merlonGap;
  const wallH = 40;
  const towerH = 55;
  const towerW = 18;

  for (let i = 0; i < merlonCount; i++) {
    const mx = -wallW/2 + i * (merlonW + merlonGap) + merlonW/2;
    const my = -wallH/2 - merlonH/2;
    const d = 6 + i * 1;
    layers.push({
      ddd:0,ind:30+i,ty:4,nm:'Merlon'+(i+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[100,0,100]},{t:d+4,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'rc',d:1,s:{a:0,k:[merlonW,merlonH]},p:{a:0,k:[mx,my]},r:{a:0,k:1},nm:'M'},
        {ty:'fl',c:{a:0,k:c.wall},o:{a:0,k:100},r:1,bm:0,nm:'MF'},
        {ty:'st',c:{a:0,k:c.wallDark},o:{a:0,k:40},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'MS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── WALL (main body) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Wall',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-4,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:0,s:[100,0,100]},{...io3,t:10,s:[100,110,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Main wall
      {ty:'rc',d:1,s:{a:0,k:[wallW,wallH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Wall'},
      {ty:'fl',c:{a:0,k:c.wall},o:{a:0,k:100},r:1,bm:0,nm:'WF'},
      {ty:'st',c:{a:0,k:c.wallDark},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'WS'},
      // Gate (arch)
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[-6,wallH/2],[-6,5],[0,-2],[6,5],[6,wallH/2]],
        i:[[0,0],[0,0],[-4,0],[0,0],[0,0]],
        o:[[0,0],[0,0],[4,0],[0,0],[0,0]],
        c:true
      }},nm:'Gate'},
      {ty:'fl',c:{a:0,k:c.gate},o:{a:0,k:100},r:1,bm:0,nm:'GF'},
      // Brick lines (horizontal)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-wallW/2+3,-8],[wallW/2-3,-8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'BL1'},
      {ty:'st',c:{a:0,k:c.wallDark},o:{a:0,k:20},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'BL1S'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-wallW/2+3,4],[wallW/2-3,4]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'BL2'},
      {ty:'st',c:{a:0,k:c.wallDark},o:{a:0,k:20},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'BL2S'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── TOWER (center, taller) ──
  layers.push({
    ddd:0,ind:11,ty:4,nm:'Tower',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:4,s:[0]},{t:10,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:floatKF(bY-8,16)},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:4,s:[100,0,100]},{...io3,t:12,s:[100,110,100]},{t:16,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'rc',d:1,s:{a:0,k:[towerW,towerH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Twr'},
      {ty:'fl',c:{a:0,k:c.tower},o:{a:0,k:100},r:1,bm:0,nm:'TF'},
      {ty:'st',c:{a:0,k:c.wallDark},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'TS'},
      // Tower merlons (3 small)
      {ty:'rc',d:1,s:{a:0,k:[4,5]},p:{a:0,k:[-6,-towerH/2-2.5]},r:{a:0,k:1},nm:'TM1'},
      {ty:'fl',c:{a:0,k:c.tower},o:{a:0,k:100},r:1,bm:0,nm:'TM1F'},
      {ty:'rc',d:1,s:{a:0,k:[4,5]},p:{a:0,k:[0,-towerH/2-2.5]},r:{a:0,k:1},nm:'TM2'},
      {ty:'fl',c:{a:0,k:c.tower},o:{a:0,k:100},r:1,bm:0,nm:'TM2F'},
      {ty:'rc',d:1,s:{a:0,k:[4,5]},p:{a:0,k:[6,-towerH/2-2.5]},r:{a:0,k:1},nm:'TM3'},
      {ty:'fl',c:{a:0,k:c.tower},o:{a:0,k:100},r:1,bm:0,nm:'TM3F'},
      // Window
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-3,0],[-3,-4],[0,-7],[3,-4],[3,0]],i:[[0,0],[0,0],[-2,0],[0,0],[0,0]],o:[[0,0],[0,0],[2,0],[0,0],[0,0]],c:true}},nm:'Win'},
      {ty:'fl',c:{a:0,k:c.gate},o:{a:0,k:80},r:1,bm:0,nm:'WinF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── FLAG (tier 2+ — behind tower, pole+cloth visible above) ──
  if (hasFlag) {
    const fX = 4, fTop = -48;
    // Pole + cloth in one layer, behind castle
    layers.push({
      ddd:0,ind:17,ty:4,nm:'FlagAll',sr:1,
      ks:{
        o:{a:0,k:100},r:{a:0,k:0},
        p:{a:1,k:[
          {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
          {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-12,0],to:[0,0,0],ti:[0,0,0]},
          ...floatKF(bY-8,16)
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:0,s:[100,0,100]},{...io3,t:10,s:[100,110,100]},{t:14,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Pole
        {ty:'sh',d:1,ks:{a:0,k:{v:[[fX,fTop-2],[fX,-8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Pole'},
        {ty:'st',c:{a:0,k:c.flagPole},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'PS'},
        // Ball top
        {ty:'el',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[fX,fTop-4]},nm:'Ball'},
        {ty:'fl',c:{a:0,k:c.flagPole},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
        // Cloth (appears after pole rises, wipe from left)
        {ty:'rc',d:1,s:{a:1,k:[{...io3,t:14,s:[0,12]},{t:20,s:[18,12]}]},p:{a:1,k:[{...io3,t:14,s:[fX+2,fTop+5]},{t:20,s:[fX+11,fTop+5]}]},r:{a:0,k:1},nm:'Cloth'},
        {ty:'fl',c:{a:0,k:c.flag},o:{a:1,k:[{...io,t:14,s:[0]},{t:16,s:[100]}]},r:1,bm:0,nm:'CF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,120]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,110]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=24+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Disciplined Quarter T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_90_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_90_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Disciplined Quarter';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_90.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_90.json',bj)}catch{}
console.log('Done!');
