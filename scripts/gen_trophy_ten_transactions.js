const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'lottie', 'trophies');
const PREVIEW = path.join(__dirname, '..', '..', 'DOMUS-Rive-Preview', 'public', 'assets', 'lottie', 'trophies');

const io = {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3 = {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

const TIER = {
  1: { boardColor:[.804,.498,.196,1], boardStroke:[.6,.35,.1,1], clipColor:[.5,.3,.1,1], checkColor:[.45,.25,.05,1], checks:1, glowOp:0, sparkles:0, hasSeal:false, hasConfetti:false, hasBorderGlow:false },
  2: { boardColor:[.75,.75,.78,1], boardStroke:[.55,.55,.6,1], clipColor:[.4,.4,.45,1], checkColor:[.3,.3,.35,1], checks:2, glowOp:8, sparkles:1, hasSeal:false, hasConfetti:false, hasBorderGlow:false },
  3: { boardColor:[1,.843,0,1], boardStroke:[.855,.647,.125,1], clipColor:[.7,.5,.05,1], checkColor:[.5,.35,.02,1], checks:3, glowOp:15, sparkles:3, hasSeal:false, hasConfetti:false, hasBorderGlow:false },
  4: { boardColor:[.31,.765,.969,1], boardStroke:[.2,.55,.8,1], clipColor:[.15,.4,.65,1], checkColor:[.08,.3,.55,1], checks:3, glowOp:25, sparkles:5, hasSeal:true, hasConfetti:true, hasBorderGlow:true },
};

const GLOW_C = {1:[.804,.498,.196,1],2:[.75,.75,.78,1],3:[1,.843,0,1],4:[.31,.765,.969,1]};
const SPARK_C = {1:[1,.75,.35,1],2:[.85,.87,.95,1],3:[1,.92,.4,1],4:[.7,.9,1,1]};

function createTier(tier) {
  const t = TIER[tier];
  const layers = [];
  const boardW = {1:44,2:50,3:56,4:60}[tier];
  const boardH = boardW * 1.3;
  const clipW = boardW * 0.4;
  const clipH = 8;
  const cx = 100, cy = 100;
  const fr = tier >= 3 ? 4 : tier === 2 ? 2 : 1; // float range

  // ── GLOW (tier >= 2)
  if (tier >= 2) {
    const pm = tier===4?10:t.glowOp-3, px = tier===4?35:t.glowOp+10;
    const gs = {2:100,3:140,4:160}[tier];
    layers.push({ddd:0,ind:100,ty:4,nm:"Glow",sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[cx,cy,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[gs,gs]},p:{a:0,k:[0,0]},nm:"G"},{ty:"fl",c:{a:0,k:GLOW_C[tier]},o:{a:0,k:t.glowOp},r:1,bm:0,nm:"F"}],ip:0,op:90,st:0,bm:0});
  }

  // ── BORDER GLOW (diamond only) — pulsing rectangle outline
  if (t.hasBorderGlow) {
    layers.push({ddd:0,ind:95,ty:4,nm:"BorderGlow",sr:1,ks:{
      o:{a:1,k:[{...io,t:40,s:[0]},{...io,t:48,s:[40]},{...io,t:60,s:[20]},{...io,t:75,s:[40]},{t:90,s:[20]}]},
      r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:0,s:[cx,cy,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[cx,cy-fr,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[cx,cy+fr,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[cx,cy-fr,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:40,s:[100,100,100]},{...io3,t:55,s:[108,108,100]},{...io3,t:70,s:[100,100,100]},{...io3,t:82,s:[108,108,100]},{t:90,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"rc",d:1,s:{a:0,k:[boardW+8,boardH+8]},p:{a:0,k:[0,0]},r:{a:0,k:6},nm:"BG"},
      {ty:"st",c:{a:0,k:[.4,.85,1,1]},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:"S"}
    ],ip:0,op:90,st:0,bm:0});
  }

  // Board float position keyframes
  const bp = [
    {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[cx,10,0],to:[0,15,0],ti:[0,-15,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[cx,cy+8,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[cx,cy-4,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:16,s:[cx,cy,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[cx,cy-fr,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[cx,cy+fr,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[cx,cy-fr,0]}
  ];

  // ── BOARD (clipboard body)
  layers.unshift({ddd:0,ind:10,ty:4,nm:"Board",sr:1,ks:{
    o:{a:0,k:100},
    r:{a:1,k:[{...io,t:0,s:[-10]},{...io,t:5,s:[0]},{...io,t:60,s:[-2]},{...io,t:75,s:[2]},{t:90,s:[-2]}]},
    p:{a:1,k:bp},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:10,s:[105,95,100]},{t:14,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"rc",d:1,s:{a:0,k:[boardW,boardH]},p:{a:0,k:[0,2]},r:{a:0,k:4},nm:"Board"},
    {ty:"st",c:{a:0,k:t.boardStroke},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:"S"},
    {ty:"fl",c:{a:0,k:t.boardColor},o:{a:0,k:100},r:1,bm:0,nm:"F"}
  ],ip:0,op:90,st:0,bm:0});

  // ── CLIP (top of clipboard)
  layers.unshift({ddd:0,ind:11,ty:4,nm:"Clip",sr:1,ks:{
    o:{a:0,k:100},
    r:{a:1,k:[{...io,t:0,s:[-10]},{...io,t:5,s:[0]},{...io,t:60,s:[-2]},{...io,t:75,s:[2]},{t:90,s:[-2]}]},
    p:{a:1,k:bp},a:{a:0,k:[0,boardH/2,0]},
    s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:10,s:[105,95,100]},{t:14,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"rc",d:1,s:{a:0,k:[clipW,clipH]},p:{a:0,k:[0,0]},r:{a:0,k:3},nm:"Clip"},
    {ty:"fl",c:{a:0,k:t.clipColor},o:{a:0,k:100},r:1,bm:0,nm:"F"}
  ],ip:0,op:90,st:0,bm:0});

  // ── CHECK LINES (appear sequentially)
  const lineStartY = -boardH/2 + 14;
  const lineSpacing = 16;
  const lineW = boardW * 0.55;

  for (let i = 0; i < 3; i++) {
    const showCheck = i < t.checks;
    const delay = 20 + i * 8;
    const lineY = lineStartY + i * lineSpacing;

    // Line background (gray bar)
    layers.unshift({ddd:0,ind:20+i,ty:4,nm:"Line"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:delay-2,s:[0]},{t:delay+3,s:[100]}]},
      r:{a:1,k:[{...io,t:0,s:[-10]},{...io,t:5,s:[0]},{...io,t:60,s:[-2]},{...io,t:75,s:[2]},{t:90,s:[-2]}]},
      p:{a:1,k:bp},a:{a:0,k:[-5,-(lineY+2),0]},
      s:{a:1,k:[{...io3,t:8,s:[100,100,100]},{...io3,t:10,s:[105,95,100]},{t:14,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"rc",d:1,s:{a:0,k:[lineW,4]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:"L"},
      {ty:"fl",c:{a:0,k:[.9,.9,.9,.5]},o:{a:0,k:60},r:1,bm:0,nm:"F"}
    ],ip:0,op:90,st:0,bm:0});

    // Checkmark ✓
    if (showCheck) {
      layers.unshift({ddd:0,ind:30+i,ty:4,nm:"Check"+(i+1),sr:1,ks:{
        o:{a:1,k:[{...io,t:delay,s:[0]},{t:delay+5,s:[100]}]},
        r:{a:1,k:[{...io,t:0,s:[-10]},{...io,t:5,s:[0]},{...io,t:60,s:[-2]},{...io,t:75,s:[2]},{t:90,s:[-2]}]},
        p:{a:1,k:bp},a:{a:0,k:[boardW/2-8,-(lineY+2),0]},
        s:{a:1,k:[
          {...io3,t:delay,s:[0,0,100]},
          {...io3,t:delay+3,s:[130,130,100]},
          {t:delay+6,s:[100,100,100]}
        ]}
      },ao:0,shapes:[
        {ty:"sh",d:1,ks:{a:0,k:{
          i:[[0,0],[0,0],[0,0]],
          o:[[0,0],[0,0],[0,0]],
          v:[[-4,0],[-1,3],[4,-4]],
          c:false
        }},nm:"V"},
        {ty:"st",c:{a:0,k:t.checkColor},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:"S"}
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // ── SEAL (diamond only) — stamp appearing after checks
  if (t.hasSeal) {
    layers.unshift({ddd:0,ind:50,ty:4,nm:"Seal",sr:1,ks:{
      o:{a:1,k:[{...io,t:48,s:[0]},{...io,t:52,s:[80]},{t:90,s:[80]}]},
      r:{a:1,k:[{...io,t:48,s:[-30]},{...io,t:54,s:[5]},{...io,t:58,s:[0]}]},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:48,s:[cx+12,cy+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:52,s:[cx+12,cy+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[cx+12,cy+10-fr,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[cx+12,cy+10-fr,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[
        {...io3,t:48,s:[0,0,100]},
        {...io3,t:51,s:[140,140,100]},
        {...io3,t:55,s:[100,100,100]}
      ]}
    },ao:0,shapes:[
      {ty:"el",d:1,s:{a:0,k:[22,22]},p:{a:0,k:[0,0]},nm:"Seal"},
      {ty:"st",c:{a:0,k:[.1,.6,.4,1]},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:"S"},
      {ty:"fl",c:{a:0,k:[.15,.75,.5,1]},o:{a:0,k:90},r:1,bm:0,nm:"F"}
    ],ip:0,op:90,st:0,bm:0});

    // Seal checkmark
    layers.unshift({ddd:0,ind:51,ty:4,nm:"SealCheck",sr:1,ks:{
      o:{a:1,k:[{...io,t:52,s:[0]},{t:55,s:[100]}]},
      r:{a:1,k:[{...io,t:48,s:[-30]},{...io,t:54,s:[5]},{...io,t:58,s:[0]}]},
      p:{a:1,k:[
        {i:{x:.667,y:1},o:{x:.333,y:0},t:52,s:[cx+12,cy+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[cx+12,cy+10-fr,0],to:[0,0,0],ti:[0,0,0]},
        {t:90,s:[cx+12,cy+10-fr,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:52,s:[0,0,100]},{t:55,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"sh",d:1,ks:{a:0,k:{i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],v:[[-4,0],[-1,3],[4,-4]],c:false}},nm:"V"},
      {ty:"st",c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:"S"}
    ],ip:0,op:90,st:0,bm:0});
  }

  // ── CONFETTI (diamond only) — small colored dots bursting out
  if (t.hasConfetti) {
    const confettiColors = [[.4,.85,1,1],[.15,.75,.5,1],[1,.843,0,1],[.9,.3,.4,1],[.6,.4,.9,1],[.3,.85,.5,1]];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      const dist = 35 + (i % 2) * 15;
      const endX = cx + Math.cos(angle) * dist;
      const endY = cy + Math.sin(angle) * dist;
      layers.push({ddd:0,ind:60+i,ty:4,nm:"Conf"+(i+1),sr:1,ks:{
        o:{a:1,k:[{...io,t:50,s:[0]},{...io,t:52,s:[100]},{...io,t:65,s:[0]},{t:90,s:[0]}]},
        r:{a:1,k:[{t:50,s:[0]},{t:65,s:[180+i*60]}]},
        p:{a:1,k:[
          {i:{x:.3,y:1},o:{x:.7,y:0},t:50,s:[cx,cy,0],to:[0,0,0],ti:[0,0,0]},
          {t:65,s:[+(endX.toFixed(1)),+(endY.toFixed(1)),0]}
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:50,s:[0,0,100]},{...io3,t:53,s:[100,100,100]},{t:65,s:[40,40,100]}]}
      },ao:0,shapes:[
        {ty:"rc",d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:"C"},
        {ty:"fl",c:{a:0,k:confettiColors[i]},o:{a:0,k:100},r:1,bm:0,nm:"F"}
      ],ip:0,op:90,st:0,bm:0});
    }
  }

  // ── SPARKLES
  const spos = [[65,55],[138,50],[100,38],[58,40],[142,62]];
  for (let i = 0; i < t.sparkles; i++) {
    const p = spos[i], d = 18 + i * 5, sz = tier === 4 ? 8 : tier === 3 ? 6 : 4;
    layers.unshift({ddd:0,ind:200+i,ty:4,nm:"Sp"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},
      p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:"Star"},
      {ty:"fl",c:{a:0,k:SPARK_C[tier]},o:{a:0,k:100},r:1,bm:0,nm:"F"}
    ],ip:0,op:90,st:0,bm:0});
  }

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:"ten_transactions_t"+tier,ddd:0,assets:[],layers,markers:[]};
}

// Generate
[OUT, PREVIEW].forEach(d => { try { fs.mkdirSync(d, {recursive:true}); } catch {} });

for (let t = 1; t <= 4; t++) {
  const anim = createTier(t);
  const json = JSON.stringify(anim);
  fs.writeFileSync(path.join(OUT, `ten_transactions_t${t}.json`), json);
  try { fs.writeFileSync(path.join(PREVIEW, `ten_transactions_t${t}.json`), json); } catch {}
  console.log(`T${t}: ${anim.layers.length} layers`);
}
const base = createTier(3);
base.nm = "ten_transactions";
fs.writeFileSync(path.join(OUT, "ten_transactions.json"), JSON.stringify(base));
try { fs.writeFileSync(path.join(PREVIEW, "ten_transactions.json"), JSON.stringify(base)); } catch {}
console.log("Done!");
