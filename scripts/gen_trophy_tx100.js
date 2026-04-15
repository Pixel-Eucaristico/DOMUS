const fs = require('fs');
const { book, lines, pgR, pgL } = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-book.json'));

const tierColors = {
  1: { outline: [0.55,0.35,0.18,1], pageR: [0.95,0.92,0.85,1], pageL: [0.9,0.87,0.8,1], textLines: [0.65,0.55,0.4,1], hourglass: [0.7,0.6,0.4,1], sand: [0.85,0.75,0.55,1], frame: [0.5,0.35,0.2,1], glow: [0.55,0.35,0.18,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { outline: [0.45,0.45,0.5,1], pageR: [0.93,0.93,0.96,1], pageL: [0.88,0.88,0.92,1], textLines: [0.5,0.5,0.6,1], hourglass: [0.6,0.6,0.65,1], sand: [0.7,0.7,0.75,1], frame: [0.4,0.4,0.45,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { outline: [0.5,0.3,0.1,1], pageR: [1,0.97,0.9,1], pageL: [0.95,0.92,0.85,1], textLines: [0.5,0.4,0.2,1], hourglass: [1,0.84,0,1], sand: [1,0.84,0,1], frame: [0.6,0.4,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { outline: [0.1,0.2,0.4,1], pageR: [0.88,0.93,1,1], pageL: [0.82,0.88,0.96,1], textLines: [0.2,0.35,0.6,1], hourglass: [0.31,0.765,0.969,1], sand: [0.31,0.765,0.969,1], frame: [0.15,0.35,0.6,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e = (x,y) => ({x:[x],y:[y]});
const io = {i:e(.667,1),o:e(.333,0)};
const io3 = {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0, 2:1, 3:3, 4:5}[tier];
  const confCount = c.conf.length;
  const hasHourglass = tier >= 2;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2, 2:3, 3:4, 4:5}[tier];
  const lineCountR = {1:1, 2:2, 3:3, 4:3}[tier];
  const lineCountL = tier === 4 ? 3 : tier >= 3 ? 1 : 0;
  const bY = 100;

  const floatKF = (baseY, sf) => [
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos = [[25,30],[175,25],[100,12],[40,18],[160,38]];
  for (let i = 0; i < sparkleCount; i++) {
    const p = sPos[i], d = 32 + i * 4, sz = tier === 4 ? 9 : 7;
    layers.push({
      ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,
      ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},
      ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
    });
  }

  // ── TEXT LINES (SVG real — on top of pages) ──
  const allLines = [];
  for (let i = 0; i < lineCountR && i < 3; i++) allLines.push(lines[i]);
  for (let i = 0; i < lineCountL && i < 3; i++) allLines.push(lines[3 + i]);
  allLines.forEach((line, i) => {
    const d = 18 + i * 5;
    layers.push({
      ddd:0,ind:30+i,ty:4,nm:'TxtLine'+(i+1),sr:1,
      ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[80]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,100,100]},{t:d+6,s:[100,100,100]}]}},
      ao:0,shapes:[{ty:'sh',d:1,ks:{a:0,k:line},nm:'L'},{ty:'fl',c:{a:0,k:c.textLines},o:{a:0,k:70},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
    });
  });

  // ── PAGE FILLS (left & right — behind text lines, on top of outline) ──
  layers.push({
    ddd:0,ind:11,ty:4,nm:'PageR',sr:1,
    ks:{o:{a:1,k:[{...io,t:4,s:[0]},{t:10,s:[100]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},
    ao:0,shapes:[{ty:'sh',d:1,ks:{a:0,k:pgR},nm:'PR'},{ty:'fl',c:{a:0,k:c.pageR},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
  });
  layers.push({
    ddd:0,ind:12,ty:4,nm:'PageL',sr:1,
    ks:{o:{a:1,k:[{...io,t:4,s:[0]},{t:10,s:[100]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},
    ao:0,shapes:[{ty:'sh',d:1,ks:{a:0,k:pgL},nm:'PL'},{ty:'fl',c:{a:0,k:c.pageL},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
  });

  // ── HOURGLASS (tier 2+ — rendered in front of book) ──
  if (hasHourglass) {
    const hgX = 42, hgY = 22;
    const hgFloat = (sf) => [
      {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100+hgX,bY+hgY,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100+hgX,bY+hgY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
      {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100+hgX,bY+hgY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
      {t:90,s:[100+hgX,bY+hgY-floatRange,0]}
    ];
    layers.push({
      ddd:0,ind:18,ty:4,nm:'Hourglass',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:16,s:[0]},{t:22,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:hgFloat(16)},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:16,s:[0,0,100]},{...io3,t:20,s:[115,115,100]},{t:24,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Top bulb (rounded)
        {ty:'el',d:1,s:{a:0,k:[14,10]},p:{a:0,k:[0,-10]},nm:'TopBulb'},
        {ty:'fl',c:{a:0,k:c.hourglass},o:{a:0,k:40},r:1,bm:0,nm:'TBF'},
        // Bottom bulb (rounded)
        {ty:'el',d:1,s:{a:0,k:[14,10]},p:{a:0,k:[0,10]},nm:'BotBulb'},
        {ty:'fl',c:{a:0,k:c.hourglass},o:{a:0,k:40},r:1,bm:0,nm:'BBF'},
        // Neck (X shape connecting bulbs)
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-7,-5],[0,0],[7,-5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'NeckT'},
        {ty:'st',c:{a:0,k:c.frame},o:{a:0,k:80},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'NTS'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-7,5],[0,0],[7,5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'NeckB'},
        {ty:'st',c:{a:0,k:c.frame},o:{a:0,k:80},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'NBS'},
        // Sand top (shrinking)
        {ty:'el',d:1,s:{a:1,k:[{...io3,t:22,s:[8,5]},{...io3,t:65,s:[2,1]},{t:90,s:[8,5]}]},p:{a:0,k:[0,-9]},nm:'SandT'},
        {ty:'fl',c:{a:0,k:c.sand},o:{a:0,k:100},r:1,bm:0,nm:'STF'},
        // Sand bottom (growing)
        {ty:'el',d:1,s:{a:1,k:[{...io3,t:22,s:[2,1]},{...io3,t:65,s:[8,5]},{t:90,s:[2,1]}]},p:{a:0,k:[0,10]},nm:'SandB'},
        {ty:'fl',c:{a:0,k:c.sand},o:{a:0,k:100},r:1,bm:0,nm:'SBF'},
        // Frame top bar
        {ty:'rc',d:1,s:{a:0,k:[16,2]},p:{a:0,k:[0,-15]},r:{a:0,k:1},nm:'FrT'},
        {ty:'fl',c:{a:0,k:c.frame},o:{a:0,k:100},r:1,bm:0,nm:'FTF'},
        // Frame bottom bar
        {ty:'rc',d:1,s:{a:0,k:[16,2]},p:{a:0,k:[0,15]},r:{a:0,k:1},nm:'FrB'},
        {ty:'fl',c:{a:0,k:c.frame},o:{a:0,k:100},r:1,bm:0,nm:'FBF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── BOOK OUTLINE (SVG real — full open book shape) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Book',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+12,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-6,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:book},nm:'Outline'},
      {ty:'fl',c:{a:0,k:c.outline},o:{a:0,k:100},r:1,bm:0,nm:'F'}
    ],ip:0,op:90,st:0,bm:0
  });

  // (Hourglass moved to before book for z-order)

  // ── GLOW ──
  if (hasGlow) {
    const pm=tier===4?10:12,px=tier===4?35:25;
    layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[150,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }
  if (hasBorderGlow) {
    layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0});
  }

  // ── CONFETTI ──
  const confPos = [[40,30],[160,25],[55,50],[145,45],[30,40],[170,35]];
  for (let i = 0; i < confCount; i++) {
    const cp=confPos[i%confPos.length],d=24+i*2;
    layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  return {v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Financial Historian T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for (let t = 1; t <= 4; t++) {
  const a=createTier(t),j=JSON.stringify(a);
  fs.writeFileSync(__dirname+'/../assets/lottie/trophies/tx_100_t'+t+'.json',j);
  try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/tx_100_t'+t+'.json',j)}catch{}
  console.log('T'+t+':',a.layers.length,'layers');
}
const b=createTier(3);b.nm='Financial Historian';
const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/tx_100.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/tx_100.json',bj)}catch{}
console.log('Done!');
