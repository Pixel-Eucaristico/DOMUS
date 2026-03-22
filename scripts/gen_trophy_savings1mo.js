const fs = require('fs');
const {piggy} = JSON.parse(fs.readFileSync(__dirname + '/lottie-verts-piggy.json'));

const tierColors = {
  1: { pig: [0.9,0.6,0.65,1], pigDark: [0.7,0.4,0.45,1], coin: [0.8,0.6,0.2,1], coinDark: [0.6,0.4,0.1,1], sprout: [0.4,0.65,0.3,1], glow: [0.9,0.6,0.65,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { pig: [0.75,0.75,0.8,1], pigDark: [0.55,0.55,0.6,1], coin: [0.7,0.7,0.75,1], coinDark: [0.5,0.5,0.55,1], sprout: [0.4,0.7,0.35,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { pig: [1,0.75,0.78,1], pigDark: [0.85,0.55,0.58,1], coin: [1,0.84,0,1], coinDark: [0.85,0.65,0.13,1], sprout: [0.35,0.75,0.3,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { pig: [0.6,0.82,1,1], pigDark: [0.35,0.6,0.85,1], coin: [1,0.84,0,1], coinDark: [0.85,0.65,0.13,1], sprout: [0.3,0.8,0.4,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const hasSprout = tier >= 2;
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
  const sPos=[[25,25],[175,20],[100,10],[40,15],[160,30]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=30+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── SPROUT on top of piggy (tier 2+) ──
  if (hasSprout) {
    const sproutH = {2:10,3:15,4:18}[tier];
    layers.push({
      ddd:0,ind:16,ty:4,nm:'Sprout',sr:1,
      ks:{o:{a:1,k:[{...io,t:18,s:[0]},{t:24,s:[100]}]},r:{a:0,k:0},p:{a:1,k:floatKF(bY,20)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:18,s:[100,0,100]},{...io3,t:22,s:[100,120,100]},{t:26,s:[100,100,100]}]}},
      ao:0,shapes:[
        // Stem
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-12],[0,-12-sproutH]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:'Stem'},
        {ty:'st',c:{a:0,k:c.sprout},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:'StS'},
        // Left leaf
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-12-sproutH*0.5],[-8,-12-sproutH*0.7],[0,-12-sproutH*0.5]],i:[[0,0],[-2,3],[0,0]],o:[[0,0],[2,-3],[0,0]],c:true}},nm:'LeafL'},
        {ty:'fl',c:{a:0,k:c.sprout},o:{a:0,k:90},r:1,bm:0,nm:'LLF'},
        // Right leaf
        {ty:'sh',d:1,ks:{a:0,k:{v:[[0,-12-sproutH*0.3],[8,-12-sproutH*0.5],[0,-12-sproutH*0.3]],i:[[0,0],[2,3],[0,0]],o:[[0,0],[-2,-3],[0,0]],c:true}},nm:'LeafR'},
        {ty:'fl',c:{a:0,k:c.sprout},o:{a:0,k:90},r:1,bm:0,nm:'LRF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── PIGGY BANK (SVG real — in front of coin) ──
  layers.push({
    ddd:0,ind:10,ty:4,nm:'Piggy',sr:1,
    ks:{
      o:{a:0,k:100},r:{a:0,k:0},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:0,s:[100,200,0],to:[0,-15,0],ti:[0,15,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:8,s:[100,bY+10,0],to:[0,0,0],ti:[0,0,0]},
        {i:{x:.5,y:1},o:{x:.5,y:0},t:12,s:[100,bY-5,0],to:[0,0,0],ti:[0,0,0]},
        ...floatKF(bY,16)
      ]},
      a:{a:0,k:[0,0,0]},
      // Squash when coin enters (frame 14-18)
      s:{a:1,k:[
        {...io3,t:8,s:[105,90,100]},{...io3,t:10,s:[95,108,100]},{...io3,t:14,s:[100,100,100]},
        {...io3,t:15,s:[108,94,100]},{...io3,t:17,s:[96,106,100]},{t:20,s:[100,100,100]}
      ]}
    },
    ao:0,shapes:[
      {ty:'sh',d:1,ks:{a:0,k:piggy},nm:'Pig'},
      {ty:'fl',c:{a:0,k:c.pig},o:{a:0,k:100},r:1,bm:0,nm:'PF'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── COIN falling into slot (behind piggy) ──
  layers.push({
    ddd:0,ind:15,ty:4,nm:'Coin',sr:1,
    ks:{
      o:{a:1,k:[{...io,t:8,s:[100]},{...io,t:16,s:[100]},{t:18,s:[0]}]},
      r:{a:1,k:[{...io,t:8,s:[15]},{t:14,s:[0]}]},
      p:{a:1,k:[
        {i:{x:.4,y:1},o:{x:.6,y:0},t:8,s:[100,-10,0],to:[0,10,0],ti:[0,-10,0]},
        {i:{x:.667,y:1},o:{x:.333,y:0},t:14,s:[100,bY-14,0],to:[0,0,0],ti:[0,0,0]},
        {t:18,s:[100,bY-10,0]}
      ]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:14,s:[100,100,100]},{...io3,t:16,s:[80,120,100]},{t:18,s:[60,60,100]}]}
    },
    ao:0,shapes:[
      {ty:'el',d:1,s:{a:0,k:[14,14]},p:{a:0,k:[0,0]},nm:'C'},
      {ty:'st',c:{a:0,k:c.coinDark},o:{a:0,k:100},w:{a:0,k:1.5},lc:1,lj:1,ml:4,bm:0,nm:'CS'},
      {ty:'fl',c:{a:0,k:c.coin},o:{a:0,k:100},r:1,bm:0,nm:'CF'},
      {ty:'sh',d:1,ks:{a:0,k:{v:[[2,-3],[-1,-3],[-2,-1],[0,0],[2,1],[1,3],[-2,3]],i:[[0,0],[0,0],[0,0],[1,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[-1,0],[0,0],[0,0],[0,0]],c:false}},nm:'$'},
      {ty:'st',c:{a:0,k:c.coinDark},o:{a:0,k:80},w:{a:0,k:1.2},lc:2,lj:2,bm:0,nm:'$S'}
    ],ip:0,op:90,st:0,bm:0
  });

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[140,130]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[130,120]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[35,30],[165,25],[50,55],[150,50],[25,45],[175,40]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=20+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,85,0],to:[(cp[0]-100)/10,(cp[1]-85)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'First Wealth Step T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/savings_1mo_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/savings_1mo_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='First Wealth Step';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/savings_1mo.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/savings_1mo.json',bj)}catch{}
console.log('Done!');
