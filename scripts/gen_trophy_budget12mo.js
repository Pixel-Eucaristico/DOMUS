const fs = require('fs');

const tierColors = {
  1: { bp: [0.15,0.25,0.45,1], bpLine: [0.7,0.8,0.95,1], building: [0.6,0.5,0.35,1], buildDark: [0.45,0.35,0.2,1], window: [0.8,0.85,0.95,1], ruler: [0.7,0.55,0.3,1], dollar: [0.5,0.35,0.15,1], glow: [0.15,0.25,0.45,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { bp: [0.2,0.28,0.45,1], bpLine: [0.75,0.82,0.95,1], building: [0.55,0.55,0.6,1], buildDark: [0.4,0.4,0.45,1], window: [0.82,0.85,0.92,1], ruler: [0.6,0.6,0.65,1], dollar: [0.4,0.4,0.45,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { bp: [0.12,0.22,0.4,1], bpLine: [1,0.92,0.5,1], building: [0.85,0.65,0.13,1], buildDark: [0.6,0.4,0.05,1], window: [1,0.95,0.7,1], ruler: [1,0.84,0,1], dollar: [0.6,0.4,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { bp: [0.08,0.15,0.3,1], bpLine: [0.5,0.85,1,1], building: [0.2,0.55,0.8,1], buildDark: [0.12,0.35,0.6,1], window: [0.7,0.9,1,1], ruler: [1,0.84,0,1], dollar: [1,0.84,0,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const floors = {1:2,2:3,3:4,4:5}[tier];
  const hasRuler = tier >= 2;
  const hasDollar = tier >= 3;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 105;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[22,18],[178,14],[100,6],[38,10],[162,22]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=32+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── DOLLAR on top of building (tier 3+) ──
  if (hasDollar) {
    const dollarY = -22 - floors * 8;
    layers.push({
      ddd:0,ind:16,ty:4,nm:'Dollar',sr:1,
      ks:{o:{a:1,k:[{...io,t:14+floors*3,s:[0]},{...io,t:18+floors*3,s:[100]},{...io,t:20+floors*3,s:[80]},{t:24+floors*3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:14+floors*3,s:[0,0,100]},{...io3,t:18+floors*3,s:[130,130,100]},{t:22+floors*3,s:[100,100,100]}]}},
      ao:0,shapes:[
        // $ sign
        {ty:'sh',d:1,ks:{a:0,k:{v:[[3,dollarY-5],[-2,dollarY-5],[-3,dollarY-2],[0,dollarY],[3,dollarY+2],[2,dollarY+5],[-3,dollarY+5]],i:[[0,0],[0,0],[0,0],[2,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[-2,0],[0,0],[0,0],[0,0]],c:false}},nm:'S'},
        {ty:'st',c:{a:0,k:c.dollar},o:{a:0,k:90},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'SS'},
        // Vertical line
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,dollarY-7],[0,dollarY+7]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'VL'},
        {ty:'st',c:{a:0,k:c.dollar},o:{a:0,k:90},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'VLS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── RULER/ESQUADRO (tier 2+) ──
  if (hasRuler) {
    layers.push({
      ddd:0,ind:15,ty:4,nm:'Ruler',sr:1,
      ks:{o:{a:1,k:[{...io,t:16,s:[0]},{t:22,s:[100]}]},r:{a:0,k:-15},p:{a:1,k:floatKF(bY+5,20)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:16,s:[0,0,100]},{...io3,t:20,s:[110,110,100]},{t:24,s:[100,100,100]}]}},
      ao:0,shapes:[
        // L-shaped ruler
        {ty:'sh',d:1,ks:{a:0,k:{v:[[28,-20],[28,-16],[20,-16],[20,12],[16,12],[16,-20]],i:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],c:true}},nm:'Ruler'},
        {ty:'fl',c:{a:0,k:c.ruler},o:{a:0,k:80},r:1,bm:0,nm:'RF'},
        // Tick marks on ruler
        {ty:'sh',d:1,ks:{a:0,k:{v:[[17,-16],[19,-16]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'T1'},
        {ty:'st',c:{a:0,k:c.buildDark},o:{a:0,k:50},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'T1S'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[17,-8],[19,-8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'T2'},
        {ty:'st',c:{a:0,k:c.buildDark},o:{a:0,k:50},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'T2S'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[17,0],[19,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'T3'},
        {ty:'st',c:{a:0,k:c.buildDark},o:{a:0,k:50},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'T3S'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[17,8],[19,8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'T4'},
        {ty:'st',c:{a:0,k:c.buildDark},o:{a:0,k:50},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'T4S'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── BUILDING (rises floor by floor from blueprint) ──
  const bldgW = 28, floorH = 8;
  const bldgH = floors * floorH;
  const bldgBaseY = 10;
  for (let f = 0; f < floors; f++) {
    const fy = bldgBaseY - f * floorH;
    const d = 10 + f * 3;
    const fw = bldgW - f * 1; // slightly narrower at top
    layers.push({
      ddd:0,ind:20+f,ty:4,nm:'Floor'+(f+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[100,0,100]},{...io3,t:d+2,s:[100,120,100]},{t:d+4,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Floor block
        {ty:'rc',d:1,s:{a:0,k:[fw,floorH-1]},p:{a:0,k:[0,fy]},r:{a:0,k:1},nm:'Fl'},
        {ty:'fl',c:{a:0,k:c.building},o:{a:0,k:100},r:1,bm:0,nm:'FlF'},
        {ty:'st',c:{a:0,k:c.buildDark},o:{a:0,k:40},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'FlS'},
        // Windows (2 per floor)
        {ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[-5,fy]},r:{a:0,k:0.5},nm:'W1'},
        {ty:'fl',c:{a:0,k:c.window},o:{a:0,k:80},r:1,bm:0,nm:'W1F'},
        {ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[5,fy]},r:{a:0,k:0.5},nm:'W2'},
        {ty:'fl',c:{a:0,k:c.window},o:{a:0,k:80},r:1,bm:0,nm:'W2F'}
      ],ip:0,op:90,st:0,bm:0
    });
  }
  // Roof (triangle)
  const roofY = bldgBaseY - floors * floorH;
  const roofD = 10 + floors * 3;
  layers.push({
    ddd:0,ind:19,ty:4,nm:'Roof',sr:1,
    ks:{o:{a:1,k:[{...io,t:roofD,s:[0]},{t:roofD+3,s:[100]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:roofD,s:[0,0,100]},{...io3,t:roofD+3,s:[110,110,100]},{t:roofD+5,s:[100,100,100]}]}},
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-bldgW/2+2,roofY+2],[0,roofY-6],[bldgW/2-2,roofY+2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'Rf'},
      {ty:'fl',c:{a:0,k:c.buildDark},o:{a:0,k:100},r:1,bm:0,nm:'RfF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── BLUEPRINT (base — with grid lines and building outline) ──
  const bpW = 60, bpH = 50;
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Blueprint',sr:1,
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
      // Blue paper
      {ty:'rc',d:1,s:{a:0,k:[bpW,bpH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Paper'},
      {ty:'fl',c:{a:0,k:c.bp},o:{a:0,k:100},r:1,bm:0,nm:'PF'},
      // Grid lines (horizontal)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-bpW/2+3,-12],[bpW/2-3,-12]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'GL1'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:20},w:{a:0,k:0.5},lc:2,lj:2,bm:0,nm:'GL1S'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-bpW/2+3,0],[bpW/2-3,0]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'GL2'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:20},w:{a:0,k:0.5},lc:2,lj:2,bm:0,nm:'GL2S'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-bpW/2+3,12],[bpW/2-3,12]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'GL3'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:20},w:{a:0,k:0.5},lc:2,lj:2,bm:0,nm:'GL3S'},
      // Grid lines (vertical)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-12,-bpH/2+3],[-12,bpH/2-3]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'GV1'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:20},w:{a:0,k:0.5},lc:2,lj:2,bm:0,nm:'GV1S'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[12,-bpH/2+3],[12,bpH/2-3]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'GV2'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:20},w:{a:0,k:0.5},lc:2,lj:2,bm:0,nm:'GV2S'},
      // Building outline sketch (blueprint projection)
      {ty:'rc',d:1,s:{a:0,k:[bldgW+4,bldgH+8]},p:{a:0,k:[0,bldgBaseY-bldgH/2+4]},r:{a:0,k:1},nm:'Proj'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,d:[{n:'d',nm:'d',v:{a:0,k:4}},{n:'g',nm:'g',v:{a:0,k:3}}],bm:0,nm:'ProjS'},
      // Roof outline (dashed)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-bldgW/2,roofY+4],[0,roofY-8],[bldgW/2,roofY+4]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'RfProj'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,d:[{n:'d',nm:'d',v:{a:0,k:4}},{n:'g',nm:'g',v:{a:0,k:3}}],bm:0,nm:'RfProjS'},
      // Border
      {ty:'rc',d:1,s:{a:0,k:[bpW,bpH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Bdr'},
      {ty:'st',c:{a:0,k:c.bpLine},o:{a:0,k:30},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'BdrS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,25],[165,20],[50,50],[150,45],[25,40],[175,35]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=20+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,80,0],to:[(cp[0]-100)/10,(cp[1]-80)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Financial Architect T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/budget_12mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/budget_12mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Financial Architect';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/budget_12mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/budget_12mo.json',bj)}catch{}
console.log('Done!');
