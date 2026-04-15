const fs = require('fs');

const tierColors = {
  1: { env: [0.85,0.78,0.65,1], envDark: [0.7,0.6,0.45,1], envInner: [0.75,0.68,0.55,1], note: [0.22,0.55,0.35,1], noteBorder: [0.15,0.4,0.25,1], noteLight: [0.35,0.65,0.45,1], rs: [0.95,0.92,0.85,1], glow: [0.22,0.55,0.35,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { env: [0.82,0.82,0.86,1], envDark: [0.65,0.65,0.7,1], envInner: [0.72,0.72,0.76,1], note: [0.22,0.55,0.35,1], noteBorder: [0.15,0.4,0.25,1], noteLight: [0.35,0.65,0.45,1], rs: [0.95,0.95,0.97,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { env: [1,0.95,0.82,1], envDark: [0.88,0.78,0.58,1], envInner: [0.9,0.82,0.65,1], note: [0.18,0.5,0.3,1], noteBorder: [0.12,0.38,0.22,1], noteLight: [0.3,0.6,0.4,1], rs: [0.95,0.92,0.82,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { env: [0.82,0.9,1,1], envDark: [0.6,0.72,0.88,1], envInner: [0.7,0.8,0.92,1], note: [0.18,0.5,0.3,1], noteBorder: [0.12,0.38,0.22,1], noteLight: [0.3,0.6,0.4,1], rs: [0.88,0.93,1,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const noteCount = {1:1,2:2,3:3,4:4}[tier];
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 110;
  const envW = 50, envH = 32;
  const noteW = 36, noteH = 18;

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

  // ── REAL BANKNOTES (IN FRONT — above envelope) ──
  for (let ni = 0; ni < noteCount; ni++) {
    const nx = -2 + ni * 2;
    const d = 18 + ni * 5;
    layers.push({
      ddd:0,ind:20+ni,ty:4,nm:'Note'+(ni+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+3,s:[100]}]},
        r:{a:0,k:-3+ni*3},
        p:{a:1,k:[
          {i:{x:.5,y:1},o:{x:.5,y:0},t:d,s:[100+nx,bY-5,0],to:[0,-5,0],ti:[0,5,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+8,s:[100+nx,bY-30-ni*10,0],to:[0,0,0],ti:[0,0,0]},
          ...floatKF(bY-32-ni*10,d+12).map(kf => ({...kf,s:[100+nx,kf.s[1],0]}))
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d,s:[100,0,100]},{...io3,t:d+5,s:[100,110,100]},{t:d+8,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // ── CÉDULA DE REAL estilizada ──
        // Note body (green background)
        {ty:'rc',d:1,s:{a:0,k:[noteW,noteH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Body'},
        {ty:'fl',c:{a:0,k:c.note},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
        // Border
        {ty:'rc',d:1,s:{a:0,k:[noteW,noteH]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Bdr'},
        {ty:'st',c:{a:0,k:c.noteBorder},o:{a:0,k:80},w:{a:0,k:1.2},lc:2,lj:2,bm:0,nm:'BS'},
        // Inner ornamental frame
        {ty:'rc',d:1,s:{a:0,k:[noteW-4,noteH-3]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'Frame'},
        {ty:'st',c:{a:0,k:c.noteLight},o:{a:0,k:35},w:{a:0,k:0.6},lc:2,lj:2,bm:0,nm:'FS'},
        // Left color stripe (faixa lateral — like real notes)
        {ty:'rc',d:1,s:{a:0,k:[4,noteH-2]},p:{a:0,k:[-noteW/2+3,0]},r:{a:0,k:1},nm:'Stripe'},
        {ty:'fl',c:{a:0,k:c.noteLight},o:{a:0,k:40},r:1,bm:0,nm:'StF'},
        // ── CENTER CIRCLE with R$ (main element of the note) ──
        {ty:'el',d:1,s:{a:0,k:[14,14]},p:{a:0,k:[0,0]},nm:'CenterCircle'},
        {ty:'st',c:{a:0,k:c.rs},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'CCS'},
        {ty:'el',d:1,s:{a:0,k:[10,10]},p:{a:0,k:[0,0]},nm:'InnerCircle'},
        {ty:'fl',c:{a:0,k:c.noteLight},o:{a:0,k:20},r:1,bm:0,nm:'ICF'},
        // R$ text centered
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-4,-3],[-4,3],[-2,3],[-2,0.5],[0,3]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0]],c:false}},nm:'R'},
        {ty:'st',c:{a:0,k:c.rs},o:{a:0,k:70},w:{a:0,k:1.3},lc:2,lj:2,bm:0,nm:'RS'},
        {ty:'sh',d:1,ks:{a:0,k:{v:[[3,-3],[1,-3],[0.5,-1],[2,0.5],[2.5,3],[0,3]],i:[[0,0],[0,0],[0,0],[1,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[-1,0],[0,0],[0,0]],c:false}},nm:'$'},
        {ty:'st',c:{a:0,k:c.rs},o:{a:0,k:70},w:{a:0,k:1.3},lc:2,lj:2,bm:0,nm:'$S'},
        // Horizontal security line
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-noteW/2+6,noteH/2-2.5],[noteW/2-6,noteH/2-2.5]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'SecLine'},
        {ty:'st',c:{a:0,k:c.rs},o:{a:0,k:15},w:{a:0,k:0.5},lc:2,lj:2,bm:0,nm:'SLS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── ENVELOPE (clean — rect body + V flap, transitions closed→open) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Envelope',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:entryKF},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Envelope body (rectangle — outer)
      {ty:'rc',d:1,s:{a:0,k:[envW,envH]},p:{a:0,k:[0,4]},r:{a:0,k:2},nm:'Body'},
      {ty:'fl',c:{a:0,k:c.env},o:{a:0,k:100},r:1,bm:0,nm:'BF'},
      // Inner background (different color — visible inside)
      {ty:'rc',d:1,s:{a:0,k:[envW-4,envH-4]},p:{a:0,k:[0,4]},r:{a:0,k:1},nm:'Inner'},
      {ty:'fl',c:{a:0,k:c.envInner},o:{a:0,k:100},r:1,bm:0,nm:'IF'},
      // Front V fold (lighter — the visible front flap of envelope)
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-envW/2+1,4-envH/2],[0,4+8],[envW/2-1,4-envH/2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'FrontV'},
      {ty:'fl',c:{a:0,k:c.env},o:{a:0,k:100},r:1,bm:0,nm:'FVF'},
      // Bottom V fold
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-envW/2+1,4+envH/2],[0,4+8],[envW/2-1,4+envH/2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'BotV'},
      {ty:'fl',c:{a:0,k:c.env},o:{a:0,k:85},r:1,bm:0,nm:'BVF'},
      // Fold lines
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-envW/2+1,4-envH/2],[0,4+8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'FoldL'},
      {ty:'st',c:{a:0,k:c.envDark},o:{a:0,k:20},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'FLS'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[envW/2-1,4-envH/2],[0,4+8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'FoldR'},
      {ty:'st',c:{a:0,k:c.envDark},o:{a:0,k:20},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'FRS'},
      // Top flap (animated: closed V down → open V up)
      {ty:'sh',d:1,ks:{a:1,k:[
        {...io3,t:0,s:[{v:[[-envW/2+1,4-envH/2],[0,4+4],[envW/2-1,4-envH/2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}]},
        {...io3,t:14,s:[{v:[[-envW/2+1,4-envH/2],[0,4+4],[envW/2-1,4-envH/2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}]},
        {...io3,t:18,s:[{v:[[-envW/2+1,4-envH/2],[0,4-envH/2-4],[envW/2-1,4-envH/2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}]},
        {t:22,s:[{v:[[-envW/2+1,4-envH/2],[0,4-envH/2-14],[envW/2-1,4-envH/2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}]}
      ]},nm:'Flap'},
      {ty:'fl',c:{a:0,k:c.envDark},o:{a:0,k:100},r:1,bm:0,nm:'FF'},
      // Outer border
      {ty:'rc',d:1,s:{a:0,k:[envW,envH]},p:{a:0,k:[0,4]},r:{a:0,k:2},nm:'Bdr'},
      {ty:'st',c:{a:0,k:c.envDark},o:{a:0,k:40},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'BdS'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,105,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,105,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,110]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,90,0],to:[(cp[0]-100)/10,(cp[1]-90)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'First Income T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/first_income_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/first_income_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='First Income';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/first_income.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/first_income.json',bj)}catch{}
console.log('Done!');
