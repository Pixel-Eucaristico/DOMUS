const fs = require('fs');
const {crown, crownBase} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-crown.json'));

const tierColors = {
  1: { scepter: [0.7,0.5,0.25,1], scepterDark: [0.5,0.35,0.15,1], jewel: [0.8,0.2,0.2,1], orb: [0.75,0.6,0.3,1], orbCross: [0.6,0.4,0.15,1], crown: [0.7,0.45,0.15,1], crownDark: [0.5,0.3,0.1,1], mantle: [0.6,0.2,0.15,1], glow: [0.7,0.5,0.25,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { scepter: [0.6,0.6,0.65,1], scepterDark: [0.45,0.45,0.5,1], jewel: [0.65,0.3,0.6,1], orb: [0.7,0.7,0.75,1], orbCross: [0.5,0.5,0.55,1], crown: [0.7,0.7,0.75,1], crownDark: [0.5,0.5,0.55,1], mantle: [0.5,0.5,0.6,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { scepter: [1,0.84,0,1], scepterDark: [0.85,0.65,0.13,1], jewel: [0.9,0.15,0.1,1], orb: [1,0.9,0.3,1], orbCross: [0.85,0.65,0.13,1], crown: [1,0.84,0,1], crownDark: [0.85,0.65,0.13,1], mantle: [0.7,0.1,0.08,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { scepter: [0.31,0.765,0.969,1], scepterDark: [0.2,0.55,0.8,1], jewel: [1,0.84,0,1], orb: [0.5,0.85,1,1], orbCross: [1,0.84,0,1], crown: [1,0.84,0,1], crownDark: [0.85,0.65,0.13,1], mantle: [0.15,0.3,0.55,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1],[1,0.6,0.2,1],[0.8,0.3,0.8,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const particleCount = tier === 4 ? 6 : 0;
  const hasCrown = tier >= 2;
  const hasMantle = tier >= 3;
  const hasGlow = tier >= 2;
  const hasBorderGlow = tier >= 4;
  const floatRange = {1:2,2:3,3:4,4:5}[tier];
  const bY = 120;

  const floatKF=(baseY,sf)=>[
    {i:{x:.667,y:1},o:{x:.333,y:0},t:sf,s:[100,baseY,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:45,s:[100,baseY-floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {i:{x:.667,y:1},o:{x:.333,y:0},t:67,s:[100,baseY+floatRange,0],to:[0,0,0],ti:[0,0,0]},
    {t:90,s:[100,baseY-floatRange,0]}
  ];

  // ── SPARKLES ──
  const sPos=[[18,18],[182,14],[100,4],[32,10],[168,22]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=32+i*4,sz=tier===4?10:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── CROWN (tier 2+ — SVG real, above scepter/orb) ──
  if (hasCrown) {
    layers.push({
      ddd:0,ind:18,ty:4,nm:'Crown',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:16,s:[0]},{t:20,s:[100]}]},r:{a:0,k:0},
        p:{a:1,k:[
          {i:{x:.3,y:1},o:{x:.7,y:0},t:16,s:[100,-20,0],to:[0,8,0],ti:[0,-8,0]},
          {i:{x:.5,y:1},o:{x:.5,y:0},t:22,s:[100,55,0],to:[0,0,0],ti:[0,0,0]},
          ...floatKF(53,26)
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:20,s:[0,0,100]},{...io3,t:22,s:[50,50,100]},{t:26,s:[45,45,100]}]}
      },
      ao:0,shapes:[
        {ty:'sh',d:1,ks:{a:0,k:crown},nm:'Cr'},
        {ty:'fl',c:{a:0,k:c.crown},o:{a:0,k:100},r:1,bm:0,nm:'CF'},
        {ty:'sh',d:1,ks:{a:0,k:crownBase},nm:'CrB'},
        {ty:'fl',c:{a:0,k:c.crownDark},o:{a:0,k:100},r:1,bm:0,nm:'CBF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── SCEPTER (left — angled) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Scepter',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:15},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[88,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[88,bY+8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[88,bY-4,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16).map(kf => ({...kf, s:[88,kf.s[1],0]}))
      ]},
      a:{a:0,k:[0,20,0]},
      s:{a:1,k:[{...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{t:14,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Shaft
      {ty:'rc',d:1,s:{a:0,k:[4,50]},p:{a:0,k:[0,0]},r:{a:0,k:2},nm:'Shaft'},
      {ty:'fl',c:{a:0,k:c.scepter},o:{a:0,k:100},r:1,bm:0,nm:'ShF'},
      {ty:'st',c:{a:0,k:c.scepterDark},o:{a:0,k:40},w:{a:0,k:0.8},lc:2,lj:2,bm:0,nm:'ShS'},
      // Top jewel holder
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-5,-22],[0,-28],[5,-22]],i:[[0,0],[-3,0],[0,0]],o:[[0,0],[3,0],[0,0]],c:true}},nm:'Holder'},
      {ty:'fl',c:{a:0,k:c.scepterDark},o:{a:0,k:100},r:1,bm:0,nm:'HF'},
      // Jewel
      {ty:'el',d:1,s:{a:0,k:[8,8]},p:{a:0,k:[0,-28]},nm:'Jewel'},
      {ty:'fl',c:{a:0,k:c.jewel},o:{a:0,k:100},r:1,bm:0,nm:'JF'},
      // Bands on shaft
      {ty:'rc',d:1,s:{a:0,k:[6,2]},p:{a:0,k:[0,-15]},r:{a:0,k:1},nm:'Band1'},
      {ty:'fl',c:{a:0,k:c.scepterDark},o:{a:0,k:70},r:1,bm:0,nm:'B1F'},
      {ty:'rc',d:1,s:{a:0,k:[6,2]},p:{a:0,k:[0,5]},r:{a:0,k:1},nm:'Band2'},
      {ty:'fl',c:{a:0,k:c.scepterDark},o:{a:0,k:70},r:1,bm:0,nm:'B2F'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── ORB (right — globus cruciger) ──
  layers.push({
    ddd:0,ind:11,ty:4,nm:'Orb',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:6,s:[0]},{t:12,s:[100]}]},r:{a:0,k:-10},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:2,s:[112,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:10,s:[112,bY+8,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:14,s:[112,bY-4,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,18).map(kf => ({...kf, s:[112,kf.s[1],0]}))
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:10,s:[110,85,100]},{...io3,t:12,s:[92,112,100]},{t:16,s:[100,100,100]}]}
    },
    ao:0,shapes:[
      // Sphere
      {ty:'el',d:1,s:{a:0,k:[22,22]},p:{a:0,k:[0,2]},nm:'Sphere'},
      {ty:'fl',c:{a:0,k:c.orb},o:{a:0,k:100},r:1,bm:0,nm:'SF'},
      {ty:'st',c:{a:0,k:c.scepterDark},o:{a:0,k:40},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'SS'},
      // Cross on top
      {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-6],[0,-14]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'CV'},
      {ty:'st',c:{a:0,k:c.orbCross},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'CVS'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[-4,-10],[4,-10]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'CH'},
      {ty:'st',c:{a:0,k:c.orbCross},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'CHS'},
      // Equator band
      {ty:'el',d:1,s:{a:0,k:[22,6]},p:{a:0,k:[0,2]},nm:'Band'},
      {ty:'st',c:{a:0,k:c.orbCross},o:{a:0,k:50},w:{a:0,k:1},lc:2,lj:2,bm:0,nm:'BnS'},
      // Shine
      {ty:'el',d:1,s:{a:0,k:[5,5]},p:{a:0,k:[-4,-2]},nm:'Shine'},
      {ty:'fl',c:{a:0,k:[1,1,1,1]},o:{a:0,k:25},r:1,bm:0,nm:'ShF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── MANTLE (tier 3+ — royal cape behind) ──
  if (hasMantle) {
    layers.push({
      ddd:0,ind:9,ty:4,nm:'Mantle',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:10,s:[0]},{t:16,s:[60]}]},r:{a:0,k:0},
        p:{a:1,k:floatKF(bY-5,16)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:10,s:[60,0,100]},{...io3,t:16,s:[100,110,100]},{t:20,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Cape shape (wide trapezoid)
        {ty:'sh',d:1,ks:{a:0,k:{
          v:[[-8,-25],[8,-25],[28,28],[-28,28]],
          i:[[0,0],[0,0],[4,-10],[-4,-10]],
          o:[[0,0],[0,0],[0,0],[0,0]],
          c:true
        }},nm:'Cape'},
        {ty:'fl',c:{a:0,k:c.mantle},o:{a:0,k:80},r:1,bm:0,nm:'CF'},
        // Ermine trim (white dots at bottom)
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[-20,24]},nm:'E1'},
        {ty:'fl',c:{a:0,k:[0.95,0.95,0.9,1]},o:{a:0,k:60},r:1,bm:0,nm:'E1F'},
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[-10,26]},nm:'E2'},
        {ty:'fl',c:{a:0,k:[0.95,0.95,0.9,1]},o:{a:0,k:60},r:1,bm:0,nm:'E2F'},
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[0,27]},nm:'E3'},
        {ty:'fl',c:{a:0,k:[0.95,0.95,0.9,1]},o:{a:0,k:60},r:1,bm:0,nm:'E3F'},
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[10,26]},nm:'E4'},
        {ty:'fl',c:{a:0,k:[0.95,0.95,0.9,1]},o:{a:0,k:60},r:1,bm:0,nm:'E4F'},
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[20,24]},nm:'E5'},
        {ty:'fl',c:{a:0,k:[0.95,0.95,0.9,1]},o:{a:0,k:60},r:1,bm:0,nm:'E5F'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── RISING PARTICLES (tier 4) ──
  for (let i = 0; i < particleCount; i++) {
    const px = -18 + (i % 4) * 10 + Math.sin(i) * 5;
    const d = 12 + (i % 5) * 6;
    layers.push({
      ddd:0,ind:100+i,ty:4,nm:'Part'+(i+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[70]},{...io,t:d+25,s:[0]},{...io,t:d+35,s:[0]},{...io,t:d+40,s:[70]},{...io,t:d+60,s:[0]},{t:90,s:[0]}]},
        r:{a:0,k:0},
        p:{a:1,k:[
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100+px,bY+30,0],to:[0,-8,0],ti:[0,8,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+25,s:[100+px+Math.sin(i*2)*6,bY-35,0],to:[0,0,0],ti:[0,0,0]},
          {i:{x:.667,y:1},o:{x:.333,y:0},t:d+35,s:[100+px,bY+30,0],to:[0,-8,0],ti:[0,8,0]},
          {t:d+60,s:[100+px-Math.sin(i*2)*6,bY-35,0]}
        ]},
        a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
      },
      ao:0,shapes:[
        {ty:'el',d:1,s:{a:0,k:[3,3]},p:{a:0,k:[0,0]},nm:'P'},
        {ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:60},r:1,bm:0,nm:'PF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?8:10,px=tier===4?30:22;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[150,150]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:18},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[15]},{...io,t:45,s:[45]},{t:90,s:[15]}]},r:{a:0,k:0},p:{a:0,k:[100,95,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[88,88,100]},{...io3,t:45,s:[110,110,100]},{t:90,s:[88,88,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,140]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:45},w:{a:0,k:3.5},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[30,25],[170,20],[50,50],[150,45],[20,40],[180,35],[60,60],[140,55]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=20+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+20,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*45]},{t:d+20,s:[i*45+200]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,80,0],to:[(cp[0]-100)/10,(cp[1]-80)/10,0],ti:[0,0,0]},{t:d+20,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+20,s:[30,30,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[5,5]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Grandmaster T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/level_50_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_50_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Grandmaster';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/level_50.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/level_50.json',bj)}catch{}
console.log('Done!');
