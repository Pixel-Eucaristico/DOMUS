const fs = require('fs');
const {subpaths: wheelParts} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-shipwheel.json'));

const tierColors = {
  1: { wheel: [0.55,0.38,0.2,1], wheelDark: [0.35,0.22,0.1,1], compass: [0.7,0.55,0.3,1], arrow: [0.8,0.2,0.15,1], glow: [0.55,0.38,0.2,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { wheel: [0.5,0.5,0.55,1], wheelDark: [0.35,0.35,0.4,1], compass: [0.65,0.65,0.7,1], arrow: [0.7,0.2,0.2,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { wheel: [0.85,0.65,0.13,1], wheelDark: [0.6,0.4,0.05,1], compass: [1,0.84,0,1], arrow: [0.85,0.15,0.1,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { wheel: [0.2,0.55,0.8,1], wheelDark: [0.15,0.4,0.65,1], compass: [0.31,0.765,0.969,1], arrow: [1,0.84,0,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
const penIO={i:{x:[.33],y:[1]},o:{x:[.67],y:[0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const hasCompass = tier >= 2;
  const hasAnchor = tier >= 3; // anchor symbol = stability
  const wheelScale = {1:85,2:90,3:100,4:110}[tier]; // bigger wheel per tier
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
  const sPos=[[22,22],[178,18],[100,8],[38,14],[162,26]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=28+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── COMPASS ARROW (tier 2+ — spins then points north = on track) ──
  if (hasCompass) {
    layers.push({
      ddd:0,ind:15,ty:4,nm:'Arrow',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:12,s:[0]},{t:16,s:[100]}]},
        // Spins wildly then stabilizes pointing up (north = controlled)
        r:{a:1,k:[
          {...penIO,t:12,s:[180]},
          {...penIO,t:18,s:[-90]},
          {...penIO,t:24,s:[45]},
          {...penIO,t:30,s:[-20]},
          {...penIO,t:36,s:[10]},
          {...penIO,t:42,s:[-5]},
          {t:48,s:[0]} // points up = under control
        ]},
        p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
      },
      ao:0,shapes:[
        // North arrow (red triangle pointing up)
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-12],[-3,2],[3,2]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'North'},
        {ty:'fl',c:{a:0,k:c.arrow},o:{a:0,k:100},r:1,bm:0,nm:'NF'},
        // South arrow (lighter, pointing down)
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,12],[-2,-1],[2,-1]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:true}},nm:'South'},
        {ty:'fl',c:{a:0,k:[0.9,0.9,0.92,1]},o:{a:0,k:80},r:1,bm:0,nm:'SF'},
        // Center dot
        {ty:'el',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},nm:'Dot'},
        {ty:'fl',c:{a:0,k:c.compass},o:{a:0,k:100},r:1,bm:0,nm:'DF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── SHIP WHEEL (SVG real — slowly rotating) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Wheel',sr:1,
    ks:{
      o:{a:0,k:100},
      // Slow steady rotation = in control
      r:{a:1,k:[
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:0,s:[30]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:10,s:[0]},
        // Gentle oscillation in idle
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:35,s:[-8]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:55,s:[8]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:75,s:[-5]},
        {t:90,s:[5]}
      ]},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[wheelScale,wheelScale,100]}]}
    },
    ao:0,shapes:[
      // All subpaths of wheel SVG
      ...wheelParts.map((wp,i) => ({ty:'sh',d:1,ks:{a:0,k:wp},nm:'Whl'+i})),
      {ty:'fl',c:{a:0,k:c.wheel},o:{a:0,k:100},r:1,bm:0,nm:'WF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── WAVES (tier 4 — navigating rough seas with control) ──
  if (tier === 4) {
    layers.push({
      ddd:0,ind:18,ty:4,nm:'Waves',sr:1,
      ks:{o:{a:0,k:60},r:{a:0,k:0},p:{a:0,k:[100,bY+38,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},
      ao:0,shapes:[
        // Wave 1 (animated)
        {ty:'sh',d:1,ks:{a:1,k:[
          {...io3,t:0,s:[{v:[[-35,0],[-20,-5],[0,0],[20,5],[35,0]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[8,-3],[0,0],[-8,3],[0,0]],c:false}]},
          {...io3,t:30,s:[{v:[[-35,0],[-20,5],[0,0],[20,-5],[35,0]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[8,3],[0,0],[-8,-3],[0,0]],c:false}]},
          {...io3,t:60,s:[{v:[[-35,0],[-20,-5],[0,0],[20,5],[35,0]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[8,-3],[0,0],[-8,3],[0,0]],c:false}]},
          {t:90,s:[{v:[[-35,0],[-20,5],[0,0],[20,-5],[35,0]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[8,3],[0,0],[-8,-3],[0,0]],c:false}]}
        ]},nm:'W1'},
        {ty:'st',c:{a:0,k:[0.4,0.75,1,1]},o:{a:0,k:70},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'W1S'},
        // Wave 2 (offset)
        {ty:'sh',d:1,ks:{a:1,k:[
          {...io3,t:0,s:[{v:[[-30,6],[-15,11],[5,6],[25,1],[40,6]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[6,-3],[0,0],[-6,3],[0,0]],c:false}]},
          {...io3,t:30,s:[{v:[[-30,6],[-15,1],[5,6],[25,11],[40,6]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[6,3],[0,0],[-6,-3],[0,0]],c:false}]},
          {...io3,t:60,s:[{v:[[-30,6],[-15,11],[5,6],[25,1],[40,6]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[6,-3],[0,0],[-6,3],[0,0]],c:false}]},
          {t:90,s:[{v:[[-30,6],[-15,1],[5,6],[25,11],[40,6]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[6,3],[0,0],[-6,-3],[0,0]],c:false}]}
        ]},nm:'W2'},
        {ty:'st',c:{a:0,k:[0.3,0.65,0.95,1]},o:{a:0,k:50},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'W2S'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── ANCHOR (tier 3+ — stability symbol below wheel) ──
  if (hasAnchor) {
    layers.push({
      ddd:0,ind:16,ty:4,nm:'Anchor',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:16,s:[0]},{t:22,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY+28,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:16,s:[0,0,100]},{...io3,t:20,s:[110,110,100]},{t:24,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Anchor vertical shaft
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-8],[0,8]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Shaft'},
        {ty:'st',c:{a:0,k:c.wheelDark},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'ShS'},
        // Anchor crossbar
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-6,-3],[6,-3]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Cross'},
        {ty:'st',c:{a:0,k:c.wheelDark},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'CrS'},
        // Anchor flukes (bottom curved arms)
        {ty:'sh',d:1,ks:{a:0,k:{v:[[-8,5],[0,8],[8,5]],i:[[0,0],[-4,3],[0,0]],o:[[0,0],[4,3],[0,0]],c:false}},nm:'Flukes'},
        {ty:'st',c:{a:0,k:c.wheelDark},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'FlS'},
        // Top ring
        {ty:'el',d:1,s:{a:0,k:[6,6]},p:{a:0,k:[0,-10]},nm:'Ring'},
        {ty:'st',c:{a:0,k:c.wheelDark},o:{a:0,k:100},w:{a:0,k:1.5},lc:2,lj:2,bm:0,nm:'RnS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[120,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=20+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Self Control T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/wants_1mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/wants_1mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Self Control';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/wants_1mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/wants_1mo.json',bj)}catch{}
console.log('Done!');
