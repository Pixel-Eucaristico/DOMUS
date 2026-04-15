#!/usr/bin/env node
// seasonal_prep_crianca - Reserve para as Crianças 🎁
// Design: Caixa de presente com laço + moedas + estrelas
// CORREÇÃO: cada elemento em layer separado (como nos troféus aprovados)

const io = (t,s) => ({i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t,s:Array.isArray(s)?s:[s]});
const io3 = (t,s) => ({i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t,s:Array.isArray(s)?s:[s,s,100]});
const mf = (c) => ({ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"});
const ms = (c,w) => ({ty:"st",c:{a:0,k:c},o:{a:0,k:100},w:{a:0,k:w},lc:2,lj:2,bm:0,nm:"S"});

// Posição animada do presente inteiro (entrada bounce)
function boxPos(baseY) {
  return {a:1,k:[
    io(0,[100,30,0]),
    io(10,[100,baseY+4,0]),
    io(14,[100,baseY-4,0]),
    io(18,[100,baseY,0]),
    io(45,[100,baseY-3,0]),
    io(67,[100,baseY+3,0]),
    {t:90,s:[100,baseY,0]}
  ]};
}
function boxScale() {
  return {a:1,k:[io3(8,[88,88,100]),io3(12,[114,114,100]),{t:16,s:[100,100,100]}]};
}
function boxOp(startT) {
  return {a:1,k:[io(0,[0]),{t:startT,s:[100]}]};
}

const TIERS = {
  1: { box:[.804,.498,.196,1], boxStr:[.55,.32,.08,1], ribbon:[.92,.22,.22,1], ribbonStr:[.65,.10,.10,1], coin:[.804,.498,.196,1], coinStr:[.55,.32,.08,1], glow:[.97,.90,.82,1], glowOp:[8,18], coins:2 },
  2: { box:[.78,.78,.80,1], boxStr:[.50,.50,.52,1], ribbon:[.30,.50,.88,1], ribbonStr:[.18,.32,.62,1], coin:[.78,.78,.80,1], coinStr:[.50,.50,.52,1], glow:[.88,.90,.96,1], glowOp:[10,22], coins:3 },
  3: { box:[1,.843,0,1], boxStr:[.75,.60,0,1], ribbon:[.82,.18,.62,1], ribbonStr:[.55,.08,.40,1], coin:[1,.843,0,1], coinStr:[.75,.60,0,1], glow:[.99,.97,.82,1], glowOp:[12,28], coins:4 },
};

let IND = 1;
function nextInd() { return IND++; }

// Cria layer simples (1 shape + fill + opcional stroke)
function makeLayer(nm, shape, fill, stroke, pos, scale, op) {
  const layer = {
    ddd:0, ind:nextInd(), ty:4, nm, sr:1,
    ks:{
      o: op || {a:0,k:100},
      r:{a:0,k:0},
      p: pos || {a:0,k:[100,100,0]},
      a:{a:0,k:[0,0,0]},
      s: scale || {a:0,k:[100,100,100]}
    },
    ao:0,
    shapes: stroke ? [shape, fill, stroke] : [shape, fill],
    ip:0, op:90, st:0, bm:0
  };
  return layer;
}

function makeStar(x,y,t,c) {
  return {
    ddd:0, ind:nextInd(), ty:4, nm:"St", sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+5,[100]),io(t+14,[0]),io(t+30,[0]),io(t+35,[100]),io(t+44,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[0]},{t:90,s:[200]}]},
      p:{a:0,k:[x,y,0]}, a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+5,[100,100,100]),{t:t+14,s:[0,0,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:4},is:{a:0,k:0},or:{a:0,k:9},os:{a:0,k:0},ix:1,nm:"S"},
      mf(c)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

function makeCoin(x,y,t,coinColor,coinStr) {
  return {
    ddd:0, ind:nextInd(), ty:4, nm:"Coin", sr:1,
    ks:{
      o:{a:1,k:[io(t,[0]),io(t+4,[100]),io(t+16,[100]),io(t+24,[0]),{t:90,s:[0]}]},
      r:{a:1,k:[{t,s:[0]},{t:t+24,s:[160]}]},
      p:{a:1,k:[io(t,[x,y,0]),{t:t+24,s:[x+5,y+24,0]}]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[io3(t,[0,0,100]),io3(t+4,[115,115,100]),{t:t+7,s:[100,100,100]}]}
    },
    ao:0,
    shapes:[
      {ty:"el",d:1,s:{a:0,k:[13,13]},p:{a:0,k:[0,0]},nm:"C"},
      mf(coinColor), ms(coinStr,1.2),
      {ty:"sh",d:1,ks:{a:0,k:{v:[[0,-4],[0,4]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],c:false}},nm:"L"},
      ms([1,1,1,.7],1.4)
    ],
    ip:0,op:90,st:0,bm:0
  };
}

function buildLayers(tier) {
  IND = 1;
  const T = TIERS[tier];
  const BY = 102; // base Y do presente
  const p = boxPos(BY);
  const sc = boxScale();
  const op8 = boxOp(8);

  const layers = [];

  // Tampa (quica separada no idle)
  const lidPos = {a:1,k:[
    io(8,[100,BY-28,0]),
    io(14,[100,BY-32,0]),
    io(20,[100,BY-30,0]),
    io(45,[100,BY-32,0]), io(52,[100,BY-36,0]), io(59,[100,BY-32,0]),
    io(67,[100,BY-30,0]), io(74,[100,BY-34,0]), io(81,[100,BY-30,0]),
    {t:90,s:[100,BY-32,0]}
  ]};

  // Fundo (glow)
  layers.push(makeLayer("Glow",
    {ty:"el",d:1,s:{a:0,k:[132,132]},p:{a:0,k:[0,0]},nm:"G"},
    {ty:"fl",c:{a:0,k:T.glow},o:{a:1,k:[io(0,[T.glowOp[0]]),io(45,[T.glowOp[1]]),{t:90,s:[T.glowOp[0]]}]},r:1,bm:0,nm:"F"},
    null, {a:0,k:[100,100,0]},
    {a:1,k:[io3(0,[75,75,100]),io3(45,[100,100,100]),{t:90,s:[75,75,100]}]}
  ));

  // Corpo da caixa
  layers.push(makeLayer("BoxBody",
    {ty:"rc",d:1,s:{a:0,k:[56,44]},p:{a:0,k:[0,0]},r:{a:0,k:4},nm:"R"},
    mf(T.box), ms(T.boxStr,1.5), p, sc, op8
  ));

  // Faixa vertical da caixa
  layers.push(makeLayer("BoxRibbon",
    {ty:"rc",d:1,s:{a:0,k:[10,44]},p:{a:0,k:[0,0]},r:{a:0,k:0},nm:"R"},
    mf(T.ribbon), null, p, sc, op8
  ));

  // Pontos decorativos (4 elipses separadas)
  const dotOffsets = [[-16,-10],[16,-10],[-16,6],[16,6]];
  dotOffsets.forEach(function(off) {
    layers.push(makeLayer("Dot",
      {ty:"el",d:1,s:{a:0,k:[5,5]},p:{a:0,k:[0,0]},nm:"D"},
      mf(T.ribbon), null,
      {a:1,k:p.k.map(function(kf){ return Object.assign({},kf,{s:kf.s?[kf.s[0]+off[0],kf.s[1]+off[1],0]:kf.s}); })},
      sc, op8
    ));
  });

  // Tampa
  layers.push(makeLayer("LidBody",
    {ty:"rc",d:1,s:{a:0,k:[56,14]},p:{a:0,k:[0,0]},r:{a:0,k:4},nm:"R"},
    mf(T.box), ms(T.boxStr,1.5), lidPos, sc, op8
  ));

  // Faixa da tampa
  layers.push(makeLayer("LidRibbon",
    {ty:"rc",d:1,s:{a:0,k:[10,14]},p:{a:0,k:[0,0]},r:{a:0,k:0},nm:"R"},
    mf(T.ribbon), null, lidPos, sc, op8
  ));

  // Laço — centro
  const bowPos = {a:1,k:[
    io(10,[100,BY-42,0]),
    io(16,[100,BY-46,0]),
    io(20,[100,BY-44,0]),
    io(45,[100,BY-46,0]), io(52,[100,BY-50,0]), io(59,[100,BY-46,0]),
    io(67,[100,BY-44,0]), io(74,[100,BY-48,0]), io(81,[100,BY-44,0]),
    {t:90,s:[100,BY-46,0]}
  ]};
  const bowSc = {a:1,k:[io3(10,[0,0,100]),io3(14,[130,130,100]),{t:18,s:[100,100,100]}]};

  layers.push(makeLayer("BowL",
    {ty:"el",d:1,s:{a:0,k:[20,14]},p:{a:0,k:[-12,0]},nm:"E"},
    mf(T.ribbon), ms(T.ribbonStr,1), bowPos, bowSc, boxOp(10)
  ));
  layers.push(makeLayer("BowR",
    {ty:"el",d:1,s:{a:0,k:[20,14]},p:{a:0,k:[12,0]},nm:"E"},
    mf(T.ribbon), ms(T.ribbonStr,1), bowPos, bowSc, boxOp(10)
  ));
  layers.push(makeLayer("BowC",
    {ty:"el",d:1,s:{a:0,k:[10,10]},p:{a:0,k:[0,0]},nm:"E"},
    mf(T.ribbonStr), null, bowPos, bowSc, boxOp(10)
  ));

  // Moedas
  const coinPos = [[62,52,22],[138,50,26],[66,60,30],[132,58,34]];
  coinPos.slice(0,T.coins).forEach(function(arr){ layers.push(makeCoin(arr[0],arr[1],arr[2],T.coin,T.coinStr)); });

  // Estrelas
  const starDefs = [[60,46,18],[142,44,24],[154,138,30],[48,140,26]];
  const starColors = [[1,.843,0,1], T.ribbon, [1,1,1,1], [.3,.7,1,1]];
  starDefs.slice(0, tier===1?2:tier===2?3:4).forEach(function(arr,i){ layers.push(makeStar(arr[0],arr[1],arr[2],starColors[i])); });

  return layers.reverse(); // frente → trás
}

const tierNames={1:'Bronze',2:'Prata',3:'Ouro'};
const tierSuffix={1:'',2:'_t2',3:'_t3'};
const fs=require('fs'),path=require('path');

[1,2,3].forEach(function(tier){
  const lottie={v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,
    nm:"Reserve para as Criancas ("+tierNames[tier]+")",
    ddd:0,assets:[],markers:[],layers:buildLayers(tier)};
  const out=JSON.stringify(lottie);
  const id="seasonal_prep_crianca"+tierSuffix[tier];
  ["../assets/lottie/trophies/"+id+".json",
   "../../DOMUS-Rive-Preview/public/assets/lottie/trophies/"+id+".json"
  ].forEach(function(p){ fs.writeFileSync(path.join(__dirname,p),out); });
  console.log("Tier "+tier+" ("+tierNames[tier]+"): "+id+".json OK");
});
