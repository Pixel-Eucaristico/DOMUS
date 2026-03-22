const fs = require('fs');

const tierColors = {
  1: { jar: [0.75,0.85,0.9,1], jarDark: [0.55,0.65,0.7,1], coin: [0.8,0.6,0.2,1], coinDark: [0.6,0.4,0.1,1], fill: [1,0.85,0.4,1], dollar: [0.5,0.35,0.15,1], glow: [0.8,0.6,0.2,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { jar: [0.8,0.85,0.92,1], jarDark: [0.6,0.65,0.72,1], coin: [0.7,0.7,0.75,1], coinDark: [0.5,0.5,0.55,1], fill: [0.8,0.82,0.9,1], dollar: [0.4,0.4,0.45,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { jar: [0.85,0.9,0.95,1], jarDark: [0.65,0.7,0.75,1], coin: [1,0.84,0,1], coinDark: [0.85,0.65,0.13,1], fill: [1,0.9,0.4,1], dollar: [0.6,0.4,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { jar: [0.8,0.9,1,1], jarDark: [0.55,0.7,0.85,1], coin: [1,0.84,0,1], coinDark: [0.85,0.65,0.13,1], fill: [0.5,0.82,1,1], dollar: [1,0.84,0,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const coinCount = {1:2,2:3,3:3,4:3}[tier];
  const hasDollar = tier >= 2;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 105;
  const jarW = 32, jarH = 45;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[25,22],[175,18],[100,8],[40,14],[160,26]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=32+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── DOLLAR SIGN on jar (tier 2+) ──
  if (hasDollar) {
    layers.push({
      ddd:0,ind:17,ty:4,nm:'Dollar',sr:1,
      ks:{o:{a:1,k:[{...io,t:22,s:[0]},{t:28,s:[90]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:22,s:[0,0,100]},{...io3,t:26,s:[120,120,100]},{t:30,s:[100,100,100]}]}},
      ao:0,shapes:[
        {ty:'sh',d:1,ks:{a:0,k:{v:[[3,-5],[-2,-5],[-3,-2],[0,0],[3,2],[2,5],[-3,5]],i:[[0,0],[0,0],[0,0],[1.5,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[-1.5,0],[0,0],[0,0],[0,0]],c:false}},nm:'S'},
        {ty:'st',c:{a:0,k:c.dollar},o:{a:0,k:90},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'SS'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-7],[0,7]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'VL'},
        {ty:'st',c:{a:0,k:c.dollar},o:{a:0,k:90},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'VLS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── FILL LEVEL (animated — rises inside jar) ──
  const fillMaxH = jarH - 10;
  layers.push({
    ddd:0,ind:12,ty:4,nm:'Fill',sr:1,
    ks:{o:{a:1,k:[{...io,t:10,s:[0]},{t:14,s:[70]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},
    ao:0,shapes:[
      {ty:'rc',d:1,s:{a:1,k:[
        {...io3,t:10,s:[jarW-6,0]},
        {...io3,t:14,s:[jarW-6,fillMaxH*0.2]},
        {...io3,t:20,s:[jarW-6,fillMaxH*0.5]},
        {t:28,s:[jarW-6,fillMaxH*0.85]}
      ]},p:{a:1,k:[
        {...io3,t:10,s:[0,jarH/2-3]},
        {...io3,t:14,s:[0,jarH/2-3-fillMaxH*0.1]},
        {...io3,t:20,s:[0,jarH/2-3-fillMaxH*0.25]},
        {t:28,s:[0,jarH/2-3-fillMaxH*0.425]}
      ]},r:{a:0,k:1},nm:'Fl'},
      {ty:'fl',c:{a:0,k:c.fill},o:{a:0,k:50},r:1,bm:0,nm:'FlF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── COINS falling into jar ──
  for (let ci = 0; ci < coinCount; ci++) {
    const d = 12 + ci * 5;
    const coinX = -4 + ci * 4;
    const landY = 8 - ci * 6;
    layers.push({
      ddd:0,ind:30+ci,ty:4,nm:'Coin'+(ci+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[100]},{...io,t:d+6,s:[100]},{t:d+8,s:[0]}]},
        r:{a:1,k:[{...io,t:d,s:[20-ci*15]},{t:d+5,s:[0]}]},
        p:{a:1,k:[
          {i:{x:.4,y:1},o:{x:.6,y:0},t:d,s:[100+coinX,-15,0],to:[0,10,0],ti:[0,-10,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+5,s:[100+coinX,bY+landY,0],to:[0,0,0],ti:[0,0,0]},
          {t:d+8,s:[100+coinX,bY+landY+3,0]}
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d+4,s:[100,100,100]},{...io3,t:d+6,s:[90,115,100]},{t:d+8,s:[70,70,100]}]}
      },
      ao:0,shapes:[
        {ty:'el',d:1,s:{a:0,k:[10,10]},p:{a:0,k:[0,0]},nm:'C'},
        {ty:'st',c:{a:0,k:c.coinDark},o:{a:0,k:80},w:{a:0,k:1.2},lc:1,lj:1,ml:4,bm:0,nm:'CS'},
        {ty:'fl',c:{a:0,k:c.coin},o:{a:0,k:100},r:1,bm:0,nm:'CF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── JAR (glass — transparent outline) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Jar',sr:1,
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
      // Jar body (trapezoid — wider at bottom)
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[-jarW/2+4,-jarH/2],[-jarW/2,jarH/2],[jarW/2,jarH/2],[jarW/2-4,-jarH/2]],
        i:[[0,0],[0,0],[0,0],[0,0]],
        o:[[0,0],[0,0],[0,0],[0,0]],
        c:true
      }},nm:'Body'},
      {ty:'fl',c:{a:0,k:c.jar},o:{a:0,k:30},r:1,bm:0,nm:'BF'},
      {ty:'st',c:{a:0,k:c.jarDark},o:{a:0,k:80},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'BS'},
      // Jar neck (narrower top)
      {ty:'rc',d:1,s:{a:0,k:[jarW-12,6]},p:{a:0,k:[0,-jarH/2-3]},r:{a:0,k:1.5},nm:'Neck'},
      {ty:'fl',c:{a:0,k:c.jar},o:{a:0,k:40},r:1,bm:0,nm:'NF'},
      {ty:'st',c:{a:0,k:c.jarDark},o:{a:0,k:80},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'NS'},
      // Lid
      {ty:'rc',d:1,s:{a:0,k:[jarW-6,4]},p:{a:0,k:[0,-jarH/2-6]},r:{a:0,k:2},nm:'Lid'},
      {ty:'fl',c:{a:0,k:c.jarDark},o:{a:0,k:60},r:1,bm:0,nm:'LF'},
      // Glass shine (reflection line)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-jarW/2+6,-jarH/2+6],[-jarW/2+4,jarH/2-8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Shine'},
      {ty:'st',c:{a:0,k:[1,1,1,1]},o:{a:0,k:25},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'ShS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,28],[165,22],[50,52],[150,48],[25,42],[175,38]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Consistent Saver T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/savings_3mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/savings_3mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Consistent Saver';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/savings_3mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/savings_3mo.json',bj)}catch{}
console.log('Done!');
