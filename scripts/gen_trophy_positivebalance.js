const fs = require('fs');

const tierColors = {
  1: { axis: [0.5,0.45,0.35,1], line: [0.2,0.45,0.7,1], arrow: [0.2,0.5,0.8,1], zero: [0.7,0.3,0.25,1], check: [0.4,0.65,0.35,1], glow: [0.2,0.45,0.7,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { axis: [0.45,0.45,0.5,1], line: [0.2,0.45,0.75,1], arrow: [0.2,0.5,0.85,1], zero: [0.65,0.3,0.3,1], check: [0.3,0.7,0.35,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { axis: [0.5,0.4,0.25,1], line: [0.15,0.4,0.75,1], arrow: [0.1,0.45,0.85,1], zero: [0.7,0.25,0.2,1], check: [0.25,0.75,0.3,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { axis: [0.3,0.4,0.55,1], line: [0.1,0.5,0.9,1], arrow: [0.31,0.765,0.969,1], zero: [0.6,0.25,0.25,1], check: [0.2,0.8,0.35,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const hasCheck = tier >= 2;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 105;
  const lineW = {1:2,2:2.5,3:3,4:3.5}[tier];
  const arrowSize = {1:8,2:10,3:12,4:14}[tier];
  // Arrow position matches end of graph line per tier
  const lastPts = [[-6,5],[2,-2],[10,-8],[18,-18]];
  const lastPt = lastPts[tier-1];

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
    const p=sPos[i],d=30+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── ARROW (blue, pointing up — at end of graph line) ──
  const arrowX = lastPt[0], arrowY = lastPt[1] - arrowSize * 0.8;
  layers.push({
    ddd:0,ind:16,ty:4,nm:'Arrow',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:20,s:[0]},{t:24,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:20,s:[0,0,100]},{...io3,t:22,s:[130,130,100]},{...io3,t:24,s:[90,110,100]},{t:28,s:[100,100,100]},
        // Pulse in idle
        {...io3,t:50,s:[95,105,100]},{...io3,t:65,s:[105,95,100]},{t:80,s:[100,100,100]}
      ]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:{v:[[arrowX-arrowSize/2,arrowY+arrowSize*0.6],[arrowX,arrowY-arrowSize*0.4],[arrowX+arrowSize/2,arrowY+arrowSize*0.6]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'Ar'},
      {ty:'fl',c:{a:0,k:c.arrow},o:{a:0,k:100},r:1,bm:0,nm:'AF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── CHECKMARK (tier 2+) ──
  if (hasCheck) {
    layers.push({
      ddd:0,ind:17,ty:4,nm:'Check',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:24,s:[0]},{t:28,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:24,s:[0,0,100]},{...io3,t:26,s:[130,130,100]},{t:30,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'el',d:1,s:{a:0,k:[14,14]},p:{a:0,k:[22,8]},nm:'Bg'},
        {ty:'fl',c:{a:0,k:c.check},o:{a:0,k:100},r:1,bm:0,nm:'BgF'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[19,8],[21,11],[26,5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'Chk'},
        {ty:'st',c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'CS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── GRAPH LINE (drawing left to right, ascending — always above zero) ──
  layers.push({
    ddd:0,ind:15,ty:4,nm:'GraphLine',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:10,s:[0]},{t:14,s:[100]}]},r:{a:0,k:0},
      p:{a:1,k:entryKF},a:{a:0,k:[0,0,0]},
      // Wipe effect: scaleX grows from 0 to 100
      s:{a:1,k:[{...io3,t:10,s:[0,100,100]},{t:22,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Graph line path (grows with each tier)
      {ty:'sh',d:1,ks:{a:0,k:(function(){
        const pts = [[-22,8],[-14,2],[-6,5],[2,-2],[10,-8],[18,-18]];
        const count = {1:3,2:4,3:5,4:6}[tier];
        const v = pts.slice(0,count);
        const iArr = v.map(()=>[0,0]);
        const o = v.map((_,i)=> i<count-1 && i%2===0 ? [4,-3] : [0,0]);
        return {v, i:iArr, o, c:false};
      })()},nm:'Line'},
      {ty:'st',c:{a:0,k:c.line},o:{a:0,k:100},w:{a:0,k:lineW},lc:2,lj:2,bm:0,nm:'LS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── AXES + ZERO LINE (chart frame) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Chart',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:entryKF},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Y axis
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-24,-25],[-24,18]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'YAxis'},
      {ty:'st',c:{a:0,k:c.axis},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'YS'},
      // X axis
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-24,18],[24,18]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'XAxis'},
      {ty:'st',c:{a:0,k:c.axis},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'XS'},
      // Zero line (dashed — red/danger zone below)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-24,10],[24,10]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Zero'},
      {ty:'st',c:{a:0,k:c.zero},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,d:[{n:'d',nm:'d',v:{a:0,k:4}},{n:'g',nm:'g',v:{a:0,k:3}}],bm:0,nm:'ZS'},
      // "0" label
      {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[-26,10]},nm:'ZeroD'},
      {ty:'fl',c:{a:0,k:c.zero},o:{a:0,k:40},r:1,bm:0,nm:'ZDF'},
      // Danger zone below zero (subtle red tint)
      {ty:'rc',d:1,s:{a:0,k:[48,8]},p:{a:0,k:[0,14]},r:{a:0,k:0},nm:'Danger'},
      {ty:'fl',c:{a:0,k:c.zero},o:{a:0,k:8},r:1,bm:0,nm:'DF'},
      // Safe zone above zero (subtle blue tint)
      {ty:'rc',d:1,s:{a:0,k:[48,28]},p:{a:0,k:[0,-6]},r:{a:0,k:0},nm:'Safe'},
      {ty:'fl',c:{a:0,k:c.line},o:{a:0,k:6},r:1,bm:0,nm:'SF'},
      // Y axis tick marks
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-26,0],[-22,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'T1'},
      {ty:'st',c:{a:0,k:c.axis},o:{a:0,k:50},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'T1S'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-26,-10],[-22,-10]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'T2'},
      {ty:'st',c:{a:0,k:c.axis},o:{a:0,k:50},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'T2S'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,110]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Always Blue T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/positive_balance_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/positive_balance_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Always Blue';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/positive_balance.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/positive_balance.json',bj)}catch{}
console.log('Done!');
