#!/usr/bin/env node
// seasonal_independencia - Independência Financeira 🇧🇷
// Design: Troféu com losango Brasil + fogos de artifício
// 3 tiers: Bronze (base), Prata (_t2), Ouro (_t3)

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

const TIERS = {
  1: { frame:[.804,.498,.196,1], frameStr:[.55,.32,.08,1], glow:[.97,.90,.82,1], glowOp:[8,18], waves:1 },
  2: { frame:[.78,.78,.80,1],    frameStr:[.55,.55,.58,1], glow:[.90,.92,.96,1], glowOp:[10,22], waves:2 },
  3: { frame:[1,.843,0,1],       frameStr:[.75,.60,0,1],   glow:[.97,.97,.82,1], glowOp:[12,28], waves:3 },
};
const tierNames = {1:'Bronze',2:'Prata',3:'Ouro'};
const tierSuffix = {1:'',2:'_t2',3:'_t3'};

const FW_COLORS = [
  [0,0.608,0.227,1],[0.992,0.875,0,1],[0,0.153,0.463,1],[1,1,1,1]
];

let _ind = 400;
function makeFirework(x,y,t,c,pts,xOff) {
  const ind = _ind++;
  return {
    ddd:0,ind,ty:4,nm:`Fw${ind}`,sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+3,[100]),io(t+14,[100]),io(t+22,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t,s:[0]},{t:t+22,s:[180]}]},
      p:{a:1,k:[io(t,[x,y,0]),{t:t+22,s:[x+xOff,y-20,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },
    ao:0,
    shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:pts},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:9},os:{a:0,k:0},ix:1,nm:"S"},mf(c)],
    ip:0,op:90,st:0,bm:0
  };
}

let _spInd = 300;
function makeSp(x,y,t,c) {
  const ind = _spInd++;
  return {
    ddd:0,ind,ty:4,nm:`Sp${ind}`,sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+5,[100]),io(t+14,[0]),io(t+30,[0]),io(t+35,[100]),io(t+44,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[10]},{t:90,s:[190]}]},
      p:{a:0,k:[x,y,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+5,[100,100,100]),{t:t+14,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:8},os:{a:0,k:0},ix:1,nm:"S"},mf(c)],
    ip:0,op:90,st:0,bm:0
  };
}

function buildLayers(tier) {
  const T = TIERS[tier];
  _ind = 400 + tier*100;
  _spInd = 300 + tier*50;

  const fw = [];
  fw.push(makeFirework(68,48,26,FW_COLORS[0],4,18));
  fw.push(makeFirework(130,44,28,FW_COLORS[1],5,-18));
  fw.push(makeFirework(148,72,30,FW_COLORS[2],4,15));
  fw.push(makeFirework(52,70,27,FW_COLORS[3],5,-15));
  if(T.waves>=2){
    fw.push(makeFirework(75,46,52,FW_COLORS[1],5,20));
    fw.push(makeFirework(126,42,54,FW_COLORS[0],4,-18));
    fw.push(makeFirework(150,76,56,FW_COLORS[3],5,14));
  }
  if(T.waves>=3){
    fw.push(makeFirework(70,44,66,FW_COLORS[2],4,18));
    fw.push(makeFirework(132,46,68,FW_COLORS[1],5,-16));
    fw.push(makeFirework(55,74,67,FW_COLORS[0],4,12));
  }

  const sp = [makeSp(60,48,24,FW_COLORS[1]),makeSp(142,46,32,FW_COLORS[0])];
  if(T.waves>=3){ sp.push(makeSp(155,135,36,FW_COLORS[1])); sp.push(makeSp(48,138,30,FW_COLORS[2])); }

  const bgStar = {
    ddd:0,ind:30,ty:4,nm:"BgStar",sr:1,
    ks:{
      o:{a:1,k:[io(12,[0]),io(18,[tier===3?30:18]),io(45,[tier===3?22:12]),io(67,[tier===3?30:18]),{t:90,s:[tier===3?22:12]}]},
      r:{a:1,k:[{t:0,s:[0]},{t:90,s:[90]}]},
      p:{a:1,k:[io(45,[100,103,0]),io(67,[100,109,0]),{t:90,s:[100,103,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}
    },
    ao:0,
    shapes:[{ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:28},is:{a:0,k:0},or:{a:0,k:55},os:{a:0,k:0},ix:1,nm:"S"},mf([0.992,0.875,0,tier===3?0.20:0.12])],
    ip:0,op:90,st:0,bm:0
  };

  const trophy = {
    ddd:0,ind:10,ty:4,nm:"Trophy",sr:1,
    ks:{
      o:{a:1,k:[io(0,[0]),{t:8,s:[100]}]},
      r:{a:1,k:[{t:22,s:[0]},{t:45,s:[-1]},{t:67,s:[2]},{t:90,s:[-1]}]},
      p:{a:1,k:[io(0,[100,100,0]),io(14,[100,103,0]),io(18,[100,97,0]),io(22,[100,100,0]),io(45,[100,97,0]),io(67,[100,103,0]),{t:90,s:[100,97,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(10,[80,80,100]),io3(14,[108,108,100]),{t:18,s:[100,100,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-22,-22],[22,-22],[18,8],[0,22],[-18,8]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"Cup"},
      mf([0,0.608,0.227,1]),
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-14],[16,-3],[0,10],[-16,-3]],i:[[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"Diamond"},
      mf([0.992,0.875,0,1]),
      {ty:"el",d:1,s:{a:0,k:[16,16]},p:{a:0,k:[0,-3]},nm:"BlueCirc"},
      mf([0,0.153,0.463,1]),
      {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,-3]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"StarW"},
      mf([1,1,1,1]),
      {ty:"rc",d:1,s:{a:0,k:[8,12]},p:{a:0,k:[0,18]},r:{a:0,k:2},nm:"Stem"},
      mf(T.frame),
      {ty:"rc",d:1,s:{a:0,k:[28,6]},p:{a:0,k:[0,26]},r:{a:0,k:3},nm:"Base"},
      mf(T.frame),
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-22,-22],[-28,-12],[-22,-5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"H1"},
      ms(T.frame,3.5),
      {ty:"sh",d:1,ks:{a:0,k:{v:[[22,-22],[28,-12],[22,-5]],i:[[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0]],c:false}},nm:"H2"},
      ms(T.frame,3.5),
      {ty:"sh",d:1,ks:{a:0,k:{v:[[-22,-22],[22,-22],[18,8],[0,22],[-18,8]],i:[[0,0],[0,0],[0,0],[0,0],[0,0]],o:[[0,0],[0,0],[0,0],[0,0],[0,0]],c:true}},nm:"CupBrd"},
      ms(T.frameStr,2)
    ],
    ip:0,op:90,st:0,bm:0
  };

  const glow = {
    ddd:0,ind:1,ty:4,nm:"Glow",sr:1,
    ks:{
      o:{a:1,k:[io(0,[T.glowOp[0]]),io(45,[T.glowOp[1]]),{t:90,s:[T.glowOp[0]]}]},
      r:{a:0,k:0},p:{a:0,k:[100,100,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(0,[75,75,100]),io3(45,[100,100,100]),{t:90,s:[75,75,100]}]}
    },
    ao:0,
    shapes:[{ty:"el",d:1,s:{a:0,k:[132,132]},p:{a:0,k:[0,0]},nm:"G"},mf(T.glow)],
    ip:0,op:90,st:0,bm:0
  };

  return [...fw,...sp,bgStar,trophy,glow];
}

const fs = require('fs'), path = require('path');

[1,2,3].forEach(tier => {
  const lottie = {
    v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,
    nm:`Independência Financeira (${tierNames[tier]})`,
    ddd:0,assets:[],markers:[],
    layers:buildLayers(tier)
  };
  const out = JSON.stringify(lottie);
  const id = `seasonal_independencia${tierSuffix[tier]}`;
  [
    `../assets/lottie/trophies/${id}.json`,
    `../../DOMUS-Rive-Preview/public/assets/lottie/trophies/${id}.json`
  ].forEach(p => { fs.writeFileSync(path.join(__dirname,p),out); });
  console.log(`✅ Tier ${tier} (${tierNames[tier]}): ${id}.json`);
});
