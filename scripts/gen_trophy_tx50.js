const fs = require('fs');

const tierColors = {
  1: { scroll: [0.92,0.85,0.72,1], scrollDark: [0.78,0.68,0.52,1], quill: [0.5,0.35,0.2,1], quillTip: [0.3,0.2,0.1,1], ink: [0.15,0.1,0.3,1], lines: [0.4,0.35,0.25,1], inkwell: [0.3,0.25,0.15,1], glow: [0.92,0.85,0.72,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { scroll: [0.85,0.85,0.88,1], scrollDark: [0.65,0.65,0.7,1], quill: [0.6,0.6,0.65,1], quillTip: [0.4,0.4,0.45,1], ink: [0.2,0.2,0.35,1], lines: [0.35,0.35,0.4,1], inkwell: [0.35,0.35,0.4,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { scroll: [1,0.95,0.82,1], scrollDark: [0.9,0.8,0.6,1], quill: [0.6,0.4,0.15,1], quillTip: [0.85,0.65,0.13,1], ink: [0.1,0.05,0.2,1], lines: [0.3,0.25,0.15,1], inkwell: [0.25,0.2,0.1,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { scroll: [0.85,0.92,1,1], scrollDark: [0.6,0.75,0.9,1], quill: [0.2,0.5,0.8,1], quillTip: [1,0.84,0,1], ink: [0.05,0.15,0.35,1], lines: [0.15,0.3,0.55,1], inkwell: [0.1,0.25,0.5,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e = (x,y) => ({x:[x],y:[y]});
const io = {i:e(.667,1),o:e(.333,0)};
const io3 = {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0, 2:1, 3:3, 4:5}[tier];
  const confCount = c.conf.length;
  const lineCount = {1:1, 2:2, 3:3, 4:3}[tier];
  const hasInkwell = tier >= 2;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2, 2:3, 3:4, 4:5}[tier];

  const scrollCX = 100, scrollCY = 100;

  const floatKF = (baseY, sf) => [
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[scrollCX,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[scrollCX,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[scrollCX,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[scrollCX,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sparklePos = [[30,40],[170,35],[100,20],[45,25],[155,45]];
  for (let i = 0; i < sparkleCount; i++) {
    const p = sparklePos[i], d = 30 + i * 4;
    const sz = tier === 4 ? 9 : 7;
    layers.push({
      ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,
      ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},
      ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
    });
  }

  // ── QUILL (pena) with writing motion ──
  const quillX = 18, quillY = -22;
  const penIO = {i:{x:[.33],y:[1]},o:{x:[.67],y:[0]}};
  layers.push({
    ddd:0,ind:15,ty:4,nm:'Quill',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:12,s:[0]},{t:18,s:[100]}]},
      r:{a:1,k:[
        // Writing pendulum
        {...penIO,t:18,s:[-25]},{...penIO,t:28,s:[-35]},{...penIO,t:34,s:[-28]},
        {...penIO,t:40,s:[-33]},{...penIO,t:46,s:[-27]},{...penIO,t:52,s:[-32]},
        {...penIO,t:58,s:[-28]},{...penIO,t:64,s:[-31]},{...penIO,t:70,s:[-29]},
        {t:90,s:[-30]}
      ]},
      p:{a:1,k:floatKF(scrollCY-5, 16)},
      a:{a:0,k:[0,20,0]}, // pivot at quill tip
      s:{a:0,k:[100,100,100]}
    },
    ao:0,shapes:[
      // Feather body (filled leaf shape with bezier curves)
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[quillX-1,quillY],[quillX-12,quillY+12],[quillX-2,quillY+38],[quillX+10,quillY+12]],
        i:[[4,-4],[0,0],[-8,-6],[0,0]],
        o:[[0,0],[-6,10],[0,0],[4,-8]],
        c:true
      }},nm:'Feather'},
      {ty:'fl',c:{a:0,k:c.quill},o:{a:0,k:80},r:1,bm:0,nm:'FF'},
      // Central spine (rachis)
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[quillX-1,quillY],[quillX-2,quillY+42]],
        i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false
      }},nm:'Spine'},
      {ty:'st',c:{a:0,k:c.quill},o:{a:0,k:100},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'SpS'},
      // Nib (pointed tip)
      {ty:'sh',d:1,ks:{a:0,k:{
        v:[[quillX-3,quillY+40],[quillX-1.5,quillY+50],[quillX,quillY+40]],
        i:[[0,0],[-1.5,-2],[0,0]],
        o:[[0,0],[1.5,-2],[0,0]],
        c:true
      }},nm:'Nib'},
      {ty:'fl',c:{a:0,k:c.quillTip},o:{a:0,k:100},r:1,bm:0,nm:'NF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── TEXT LINES (appearing sequentially — pushed BEFORE scroll so they render on top) ──
  const lineW = 32;
  const lineStartY = -15;
  const sw = 55, sh = 65;
  for (let i = 0; i < lineCount; i++) {
    const ly = lineStartY + i * 11;
    const lw = lineW - i * 5;
    const d = 18 + i * 6;
    layers.push({
      ddd:0,ind:20+i,ty:4,nm:'Line'+(i+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]}]},
        r:{a:0,k:0},
        p:{a:1,k:floatKF(scrollCY, 16)},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[0,100,100]},{...io3,t:d+5,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'rc',d:1,s:{a:0,k:[lw,2.5]},p:{a:0,k:[-2,ly]},r:{a:0,k:1},nm:'L'},
        {ty:'fl',c:{a:0,k:c.lines},o:{a:0,k:80},r:1,bm:0,nm:'F'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── SCROLL (pergaminho) ──
  // Body: rounded rect
  // Top curl
  const topCurl = {v:[[-sw/2,-sh/2],[-sw/2-5,-sh/2-4],[sw/2+5,-sh/2-4],[sw/2,-sh/2]],i:[[0,0],[0,2],[0,0],[0,-2]],o:[[0,-2],[0,0],[0,2],[0,0]],c:false};
  // Bottom curl
  const botCurl = {v:[[-sw/2,sh/2],[-sw/2-5,sh/2+4],[sw/2+5,sh/2+4],[sw/2,sh/2]],i:[[0,0],[0,-2],[0,0],[0,2]],o:[[0,2],[0,0],[0,-2],[0,0]],c:false};

  layers.push({
    ddd:0,ind:10,ty:4,nm:'Scroll',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[scrollCX,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[scrollCX,scrollCY+12,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[scrollCX,scrollCY-6,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(scrollCY, 16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Main body (animated height — unrolling)
      {ty:'rc',d:1,s:{a:1,k:[
        {...io3,t:0,s:[sw,8]},
        {...io3,t:10,s:[sw,sh*0.5]},
        {t:16,s:[sw,sh]}
      ]},p:{a:1,k:[
        {...io3,t:0,s:[0,-sh/2+4]},
        {...io3,t:10,s:[0,-sh/4]},
        {t:16,s:[0,0]}
      ]},r:{a:0,k:3},nm:'Body'},
      {ty:'fl',c:{a:0,k:c.scroll},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
      // Top curl (roll — stays at top)
      {ty:'el',d:1,s:{a:1,k:[
        {...io3,t:0,s:[sw+10,12]},
        {t:16,s:[sw+10,8]}
      ]},p:{a:1,k:[
        {...io3,t:0,s:[0,-sh/2+4]},
        {t:16,s:[0,-sh/2]}
      ]},nm:'TopRoll'},
      {ty:'fl',c:{a:0,k:c.scrollDark},o:{a:0,k:100},r:1,bm:0,nm:'TRF'},
      // Bottom curl (roll — moves down as unrolls)
      {ty:'el',d:1,s:{a:1,k:[
        {...io3,t:0,s:[sw+10,12]},
        {t:16,s:[sw+10,8]}
      ]},p:{a:1,k:[
        {...io3,t:0,s:[0,-sh/2+12]},
        {...io3,t:10,s:[0,0]},
        {t:16,s:[0,sh/2]}
      ]},nm:'BotRoll'},
      {ty:'fl',c:{a:0,k:c.scrollDark},o:{a:0,k:100},r:1,bm:0,nm:'BRF'},
      // Border
      {ty:'rc',d:1,s:{a:1,k:[
        {...io3,t:0,s:[sw,8]},
        {...io3,t:10,s:[sw,sh*0.5]},
        {t:16,s:[sw,sh]}
      ]},p:{a:1,k:[
        {...io3,t:0,s:[0,-sh/2+4]},
        {...io3,t:10,s:[0,-sh/4]},
        {t:16,s:[0,0]}
      ]},r:{a:0,k:3},nm:'Border'},
      {ty:'st',c:{a:0,k:c.scrollDark},o:{a:0,k:50},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'BS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // (TEXT LINES moved above SCROLL for correct z-order)

  // ── INKWELL (tier 2+) ──
  if (hasInkwell) {
    layers.push({
      ddd:0,ind:16,ty:4,nm:'Inkwell',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:14,s:[0]},{t:20,s:[100]}]},
        r:{a:0,k:0},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:16,s:[scrollCX+32,scrollCY+22,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[scrollCX+32,scrollCY+22-floatRange,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[scrollCX+32,scrollCY+22+floatRange,0],to:[0,0,0],ti:[0,0,0]},
          {t:90,s:[scrollCX+32,scrollCY+22-floatRange,0]}
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:14,s:[0,0,100]},{...io3,t:18,s:[110,110,100]},{t:22,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Pot body
        {ty:'rc',d:1,s:{a:0,k:[12,14]},p:{a:0,k:[0,2]},r:{a:0,k:2},nm:'Pot'},
        {ty:'fl',c:{a:0,k:c.inkwell},o:{a:0,k:100},r:1,bm:0,nm:'PF'},
        // Ink surface
        {ty:'el',d:1,s:{a:0,k:[12,4]},p:{a:0,k:[0,-4]},nm:'Ink'},
        {ty:'fl',c:{a:0,k:c.ink},o:{a:0,k:100},r:1,bm:0,nm:'IF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── GLOW ──
  if (hasGlow) {
    const pm = tier===4?10:12, px = tier===4?35:25;
    layers.push({
      ddd:0,ind:1,ty:4,nm:'Glow',sr:1,
      ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},
      ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,140]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
    });
  }

  // ── BORDER GLOW (tier 4) ──
  if (hasBorderGlow) {
    layers.push({
      ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,
      ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},
      ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,140]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0
    });
  }

  // ── CONFETTI ──
  const confPos = [[45,35],[155,30],[65,55],[135,50],[35,45],[165,40]];
  for (let i = 0; i < confCount; i++) {
    const cp = confPos[i%confPos.length], d = 22+i*2;
    layers.push({
      ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,
      ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,80,0],to:[(cp[0]-100)/10,(cp[1]-80)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},
      ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0
    });
  }

  return {v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Chronicler T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for (let t = 1; t <= 4; t++) {
  const a = createTier(t), j = JSON.stringify(a);
  fs.writeFileSync(__dirname+'/../assets/lottie/trophies/tx_50_t'+t+'.json', j);
  try { fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/tx_50_t'+t+'.json', j); } catch {}
  console.log('T'+t+':',a.layers.length,'layers');
}
const b = createTier(3); b.nm='Chronicler';
const bj = JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/tx_50.json', bj);
try { fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/tx_50.json', bj); } catch {}
console.log('Done!');
