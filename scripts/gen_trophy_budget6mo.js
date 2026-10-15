const fs = require('fs');
const {body: tightropeBody, headCX, headCY, headR} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-tightrope.json'));

const tierColors = {
  1: { person: [0.55,0.35,0.2,1], rope: [0.6,0.5,0.35,1], crown: [0.7,0.45,0.15,1], crownDark: [0.5,0.3,0.1,1], glow: [0.6,0.45,0.25,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { person: [0.45,0.45,0.52,1], rope: [0.55,0.55,0.6,1], crown: [0.7,0.7,0.75,1], crownDark: [0.5,0.5,0.55,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { person: [0.85,0.65,0.13,1], rope: [0.6,0.4,0.05,1], crown: [1,0.84,0,1], crownDark: [0.85,0.65,0.13,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { person: [0.31,0.765,0.969,1], rope: [0.2,0.55,0.8,1], crown: [1,0.84,0,1], crownDark: [0.85,0.65,0.13,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:1,2:2,3:3,4:4}[tier];
  const bY = 95;
  const swayAmp = {1:2,2:3,3:4,4:5}[tier];

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[22,20],[178,15],[100,8],[38,12],[162,25]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=25+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── CROWN on walker head (same sway — follows walker) ──
  const penIO = {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]}};
  const swayKF = [
    {...penIO,t:0,s:[5]},
    {...penIO,t:12,s:[-swayAmp]},
    {...penIO,t:24,s:[swayAmp]},
    {...penIO,t:36,s:[-swayAmp*0.8]},
    {...penIO,t:48,s:[swayAmp*0.8]},
    {...penIO,t:60,s:[-swayAmp*0.6]},
    {...penIO,t:72,s:[swayAmp*0.6]},
    {...penIO,t:84,s:[-swayAmp*0.4]},
    {t:90,s:[swayAmp*0.3]}
  ];
  layers.push({
    ddd:0,ind:9,ty:4,nm:'Crown',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:12,s:[0]},{t:18,s:[100]}]},
      r:{a:1,k:swayKF},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,-30,0],to:[0,15,0],ti:[0,-15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-4,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,16,0]}, // same pivot as walker
      s:{a:0,k:[100,100,100]}
    },
    ao:0,shapes:[
      // Simple crown (3 peaks) positioned above head
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[headCX-5,headCY-headR-2],[headCX-5,headCY-headR-7],[headCX-2,headCY-headR-4],[headCX,headCY-headR-9],[headCX+2,headCY-headR-4],[headCX+5,headCY-headR-7],[headCX+5,headCY-headR-2]],
        i:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
        o:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
        c:true
      }},nm:'Cr'},
      {ty:'fl',c:{a:0,k:c.crown},o:{a:0,k:100},r:1,bm:0,nm:'CF'},
      {ty:'st',c:{a:0,k:c.crownDark},o:{a:0,k:60},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'CS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── TIGHTROPE WALKER (SVG real — body + head) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Walker',sr:1,
    ks:{
      o:{a:0,k:100},
      r:{a:1,k:swayKF},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,-30,0],to:[0,15,0],ti:[0,-15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-4,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,16,0]}, // pivot at feet (rope contact point)
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Body (SVG real)
      {ty:'sh',d:1,ks:{a:0,k:tightropeBody},nm:'Body'},
      {ty:'fl',c:{a:0,k:c.person},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
      // Head (circle)
      {ty:'el',d:1,s:{a:0,k:[headR*2,headR*2]},p:{a:0,k:[headCX,headCY]},nm:'Head'},
      {ty:'fl',c:{a:0,k:c.person},o:{a:0,k:100},r:1,bm:0,nm:'HF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── ROPE (tightrope line) ──
  layers.push({
    ddd:0,ind:11,ty:4,nm:'Rope',sr:1,
    ks:{o:{a:0,k:100},r:{a:0,k:0},p:{a:0,k:[100,bY+16,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-50,0],[50,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Rope'},
      {ty:'st',c:{a:0,k:c.rope},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'RS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=18+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Balance Master T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/budget_6mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/budget_6mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Balance Master';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/budget_6mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/budget_6mo.json',bj)}catch{}
console.log('Done!');
