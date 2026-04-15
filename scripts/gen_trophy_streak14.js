const fs = require('fs');

const tierColors = {
  1: { link: [0.75,0.55,0.3,1], linkDark: [0.55,0.38,0.18,1], check: [0.5,0.7,0.4,1], num: [0.5,0.35,0.15,1], glow: [0.75,0.55,0.3,1], sparkle: [1,0.75,0.35,1], conf: [[0.9,0.5,0.2,1],[0.8,0.6,0.3,1]] },
  2: { link: [0.7,0.7,0.75,1], linkDark: [0.5,0.5,0.55,1], check: [0.3,0.75,0.4,1], num: [0.4,0.4,0.45,1], glow: [0.75,0.75,0.78,1], sparkle: [0.85,0.87,0.95,1], conf: [[0.7,0.7,0.8,1],[0.85,0.85,0.9,1],[0.6,0.65,0.75,1]] },
  3: { link: [1,0.84,0,1], linkDark: [0.85,0.65,0.13,1], check: [0.27,0.83,0.35,1], num: [0.6,0.4,0.05,1], glow: [1,0.843,0,1], sparkle: [1,0.92,0.4,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.3,0.5,1,1],[0.3,0.85,0.4,1]] },
  4: { link: [0.31,0.765,0.969,1], linkDark: [0.2,0.55,0.8,1], check: [0.27,0.83,0.35,1], num: [0.15,0.4,0.7,1], glow: [0.31,0.765,0.969,1], sparkle: [0.7,0.9,1,1], conf: [[1,0.3,0.3,1],[1,0.84,0,1],[0.31,0.76,0.97,1],[0.3,0.85,0.4,1],[0.9,0.4,0.9,1],[0.5,0.9,1,1]] }
};

const e=(x,y)=>({x:[x],y:[y]});
const io={i:e(.667,1),o:e(.333,0)};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};

function createLink(cx, cy, w, h) {
  // Rounded rectangle chain link (outline only)
  const r = Math.min(w, h) * 0.35;
  const hw = w/2, hh = h/2;
  return {
    v: [[-hw+r,-hh],[hw-r,-hh],[hw,-hh+r],[hw,hh-r],[hw-r,hh],[-hw+r,hh],[-hw,hh-r],[-hw,-hh+r]],
    i: [[0,0],[0,0],[-r*0.55,0],[0,0],[0,0],[0,0],[0,r*0.55],[0,0]],
    o: [[0,0],[r*0.55,0],[0,0],[0,0],[0,0],[-r*0.55,0],[0,0],[0,-r*0.55]],
    c: true
  };
}

function createTier(tier) {
  const c = tierColors[tier];
  const layers = [];
  const sparkleCount = {1:0,2:1,3:3,4:5}[tier];
  const confCount = c.conf.length;
  const linkCount = {1:3,2:3,3:4,4:4}[tier];
  const hasCheck = tier >= 2;
  const hasNum = tier >= 3;
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

  // Chain link dimensions
  const lw = 22, lh = 14, gap = 6;
  const totalW = linkCount * (lw - gap) + gap;
  const startX = -totalW/2 + lw/2;

  // ── SPARKLES ──
  const sPos=[[25,30],[175,25],[100,12],[40,18],[160,38]];
  for(let i=0;i<sparkleCount;i++){
    const p=sPos[i],d=30+i*4,sz=tier===4?9:7;
    layers.push({ddd:0,ind:200+i,ty:4,nm:'Sp'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+5,s:[100]},{...io,t:d+15,s:[0]},{...io,t:55+i*5,s:[0]},{...io,t:60+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:0,s:[i*37]},{t:90,s:[i*37+180]}]},p:{a:0,k:[p[0],p[1],0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+5,s:[100,100,100]},{t:d+15,s:[0,0,100]}]}},ao:0,shapes:[{ty:'sr',sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:sz*0.4},is:{a:0,k:0},or:{a:0,k:sz},os:{a:0,k:0},ix:1,nm:'S'},{ty:'fl',c:{a:0,k:c.sparkle},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0});
  }

  // ── CHECKMARK (tier 2+ — at end of chain) ──
  if (hasCheck) {
    const chkX = startX + (linkCount-0.5) * (lw - gap) + 14;
    layers.push({
      ddd:0,ind:18,ty:4,nm:'Check',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:12+linkCount*3,s:[0]},{t:16+linkCount*3,s:[100]}]},
        r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:12+linkCount*3,s:[0,0,100]},{...io3,t:14+linkCount*3,s:[130,130,100]},{t:18+linkCount*3,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        // Circle bg
        {ty:'el',d:1,s:{a:0,k:[16,16]},p:{a:0,k:[chkX,0]},nm:'Bg'},
        {ty:'fl',c:{a:0,k:c.check},o:{a:0,k:100},r:1,bm:0,nm:'BgF'},
        // Checkmark
        {ty:'sh',d:1,ks:{a:0,k:{v:[[chkX-4,0],[chkX-1,3],[chkX+4,-3]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:'Chk'},
        {ty:'st',c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:2.5},lc:2,lj:2,bm:0,nm:'CS'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── "14" NUMBER (tier 3+ — in center link) ──
  if (hasNum) {
    const centerIdx = Math.floor(linkCount / 2);
    const numX = startX + centerIdx * (lw - gap);
    // "1" as rectangle + "4" as L-shape
    layers.push({
      ddd:0,ind:19,ty:4,nm:'Num14',sr:1,
      ks:{
        o:{a:1,k:[{...io,t:18,s:[0]},{t:24,s:[90]}]},
        r:{a:0,k:0},
        p:{a:1,k:floatKF(bY,16)},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
      },
      ao:0,shapes:[
        // "1"
        {ty:'rc',d:1,s:{a:0,k:[2,8]},p:{a:0,k:[numX-3,0]},r:{a:0,k:0.5},nm:'N1'},
        {ty:'fl',c:{a:0,k:c.num},o:{a:0,k:80},r:1,bm:0,nm:'N1F'},
        // "4" vertical
        {ty:'rc',d:1,s:{a:0,k:[2,8]},p:{a:0,k:[numX+4,0]},r:{a:0,k:0.5},nm:'N4v'},
        {ty:'fl',c:{a:0,k:c.num},o:{a:0,k:80},r:1,bm:0,nm:'N4vF'},
        // "4" horizontal
        {ty:'rc',d:1,s:{a:0,k:[6,1.5]},p:{a:0,k:[numX+2,1]},r:{a:0,k:0.5},nm:'N4h'},
        {ty:'fl',c:{a:0,k:c.num},o:{a:0,k:80},r:1,bm:0,nm:'N4hF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── CHAIN LINKS (appearing sequentially) ──
  const linkShape = createLink(0, 0, lw, lh);
  for (let i = 0; i < linkCount; i++) {
    const lx = startX + i * (lw - gap);
    const d = 4 + i * 3; // staggered appearance
    const isEven = i % 2 === 0;
    layers.push({
      ddd:0,ind:10+i,ty:4,nm:'Link'+(i+1),sr:1,
      ks:{
        o:{a:1,k:[{...io,t:d,s:[0]},{t:d+4,s:[100]}]},
        r:{a:1,k:[
          // Slight rotation alternating for 3D feel
          {...io,t:d,s:[isEven ? 10 : -10]},
          {t:d+4,s:[0]}
        ]},
        p:{a:1,k:[
          // Slide in from left
          {i:{x:.5,y:1},o:{x:.5,y:0},t:d,s:[100+lx-20,bY,0],to:[4,0,0],ti:[-4,0,0]},
          // Click into place
          {i:{x:.5,y:1},o:{x:.5,y:0},t:d+3,s:[100+lx+3,bY,0],to:[0,0,0],ti:[0,0,0]},
          ...floatKF(bY,16).map(kf => ({...kf, s: [100+lx, kf.s[1], 0]}))
        ]},
        a:{a:0,k:[0,0,0]},
        s:{a:1,k:[{...io3,t:d+2,s:[110,90,100]},{...io3,t:d+4,s:[95,105,100]},{t:d+6,s:[100,100,100]}]}
      },
      ao:0,shapes:[
        {ty:'sh',d:1,ks:{a:0,k:linkShape},nm:'Link'},
        {ty:'st',c:{a:0,k:c.linkDark},o:{a:0,k:100},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'LS'},
        {ty:'fl',c:{a:0,k:c.link},o:{a:0,k:100},r:1,bm:0,nm:'LF'}
      ],ip:0,op:90,st:0,bm:0
    });
  }

  // ── WAVE GLOW (tier 4 — light traveling through chain) ──
  if (tier === 4) {
    for (let i = 0; i < linkCount; i++) {
      const lx = startX + i * (lw - gap);
      const waveD = 20 + i * 4;
      layers.splice(0, 0, { // insert at front
        ddd:0,ind:50+i,ty:4,nm:'Wave'+(i+1),sr:1,
        ks:{
          o:{a:1,k:[{...io,t:waveD,s:[0]},{...io,t:waveD+3,s:[60]},{...io,t:waveD+8,s:[0]},{...io,t:waveD+30,s:[0]},{...io,t:waveD+33,s:[60]},{...io,t:waveD+38,s:[0]},{t:90,s:[0]}]},
          r:{a:0,k:0},
          p:{a:1,k:floatKF(bY,16).map(kf => ({...kf, s: [100+lx, kf.s[1], 0]}))},
          a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
        },
        ao:0,shapes:[
          {ty:'el',d:1,s:{a:0,k:[lw+4,lh+4]},p:{a:0,k:[0,0]},nm:'W'},
          {ty:'fl',c:{a:0,k:[0.6,0.9,1,1]},o:{a:0,k:40},r:1,bm:0,nm:'WF'}
        ],ip:0,op:90,st:0,bm:0
      });
    }
  }

  // ── GLOW ──
  if(hasGlow){const pm=tier===4?10:12,px=tier===4?35:25;layers.push({ddd:0,ind:1,ty:4,nm:'Glow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[pm]},{...io,t:45,s:[px]},{t:90,s:[pm]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[80,80,100]},{...io3,t:45,s:[100,100,100]},{t:90,s:[80,80,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[160,100]},p:{a:0,k:[0,0]},nm:'G'},{ty:'fl',c:{a:0,k:c.glow},o:{a:0,k:20},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}
  if(hasBorderGlow){layers.push({ddd:0,ind:2,ty:4,nm:'BorderGlow',sr:1,ks:{o:{a:1,k:[{...io,t:0,s:[20]},{...io,t:45,s:[50]},{t:90,s:[20]}]},r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:0,s:[90,90,100]},{...io3,t:45,s:[108,108,100]},{t:90,s:[90,90,100]}]}},ao:0,shapes:[{ty:'el',d:1,s:{a:0,k:[150,90]},p:{a:0,k:[0,0]},nm:'BG'},{ty:'st',c:{a:0,k:c.glow},o:{a:0,k:40},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:'S'}],ip:0,op:90,st:0,bm:0})}

  // ── CONFETTI ──
  const confPos=[[40,50],[160,45],[55,65],[145,60],[30,55],[170,50]];
  for(let i=0;i<confCount;i++){const cp=confPos[i%confPos.length],d=22+i*2;layers.push({ddd:0,ind:300+i,ty:4,nm:'Conf'+(i+1),sr:1,ks:{o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+3,s:[100]},{...io,t:d+18,s:[0]},{t:90,s:[0]}]},r:{a:1,k:[{t:d,s:[i*60]},{t:d+18,s:[i*60+180]}]},p:{a:1,k:[{i:{x:.667,y:1},o:{x:.333,y:0},t:d,s:[100,95,0],to:[(cp[0]-100)/10,(cp[1]-95)/10,0],ti:[0,0,0]},{t:d+18,s:[cp[0],cp[1],0]}]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t:d,s:[100,100,100]},{t:d+18,s:[40,40,100]}]}},ao:0,shapes:[{ty:'rc',d:1,s:{a:0,k:[4,4]},p:{a:0,k:[0,0]},r:{a:0,k:1},nm:'C'},{ty:'fl',c:{a:0,k:c.conf[i]},o:{a:0,k:100},r:1,bm:0,nm:'F'}],ip:0,op:90,st:0,bm:0})}

  return{v:'5.7.4',fr:30,ip:0,op:90,w:200,h:200,nm:'Consistent Fortnight T'+tier,ddd:0,assets:[],layers,markers:[]};
}

for(let t=1;t<=4;t++){const a=createTier(t),j=JSON.stringify(a);fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_14_t'+t+'.json',j);try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_14_t'+t+'.json',j)}catch{}console.log('T'+t+':',a.layers.length,'layers')}
const b=createTier(3);b.nm='Consistent Fortnight';const bj=JSON.stringify(b);
fs.writeFileSync(__dirname+'/../assets/lottie/trophies/streak_14.json',bj);
try{fs.writeFileSync('C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies/streak_14.json',bj)}catch{}
console.log('Done!');
