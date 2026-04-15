#!/usr/bin/env node
// seasonal_outubro_rosa - Saúde é Investimento 🎀
// SVG: outubro-rosa.svg (referência do usuário)
// viewBox: 2000 x 3587.57 — laço de conscientização

const fs=require('fs'),path=require('path');
const svgpath=require('svgpath');

const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function tr(){return{ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}}

// ── SVG paths (outubro-rosa.svg) ───────────────────────────────────────────
// path1: base/sombra (#ededed → substituímos por rosa claro)
const SVG_BASE='M2000 2775.34s-251.84-336.61-602.61-777.14c92.81-125.27 169.17-231.16 217-302.64 261.61-390.89 168.71-698 151.55-746.35s-130.12-309.48-185.87-462.63a1016.14 1016.14 0 0 0-42-99.59c-70.32-143.78-232.07-250.46-455.49-257.92C848 121.23 697.35 243.21 627 387a1020.11 1020.11 0 0 0-42 99.59c-55.71 153.14-168.68 414.26-185.85 462.62s-110.06 355.46 151.57 746.35c47.11 70.4 118.43 176.82 203.7 304C382.43 2417.68 59 2692.88 59 2692.88l180.15 812.24s429.26-546.85 817.37-1055.07c361.88 539.44 763.3 1137.52 763.3 1137.52zM610.76 615.55s197.3-142.66 471.82-142.66 471.77 142.66 471.77 142.66 0 44.31-25.74 137c-23.55 84.84-86.7 372.41-446 850.22C723.2 1125 660.06 837.4 636.5 752.56c-25.74-92.7-25.74-137.01-25.74-137.01z';
// path2: nó superior #f27ba4 (LOCKED - não mudar)
const SVG_KNOT='M567.94 258.28C638.31 114.5 789-7.48 1023.55.36 1247 7.83 1408.71 114.5 1479.07 258.28c19.76 64.41 29 141.25 16.25 228.56 0 0-197.3-142.66-471.77-142.66S551.72 486.84 551.72 486.84c-12.72-87.31-3.51-164.15 16.22-228.56z';
// path3: lado direito #f789af (LOCKED)
const SVG_RIGHT='M916.29 1611.2C1371 1051 1443.85 716.53 1469.58 623.86s25.74-137 25.74-137c12.76-87.31 3.51-164.15-16.25-228.56a1018.19 1018.19 0 0 1 42 99.59c55.75 153.15 168.7 414.27 185.87 462.63S1817 1176 1555.37 1566.85 180.14 3376.42 180.14 3376.42L0 2564.18s461.67-392.83 916.29-952.98z';
// path4: lado esquerdo #ffaac8 (LOCKED)
const SVG_LEFT='M1130.75 1611.2C676.09 1051 603.2 716.53 577.46 623.86s-25.74-137-25.74-137c-12.74-87.31-3.51-164.15 16.22-228.56a1024.66 1024.66 0 0 0-42 99.59C470.26 511 357.28 772.14 340.12 820.5S230.05 1176 491.68 1566.85s1269.14 1892 1269.14 1892L1941 2646.64s-355.6-475.29-810.25-1035.44z';

// ── Cores originais do laço (locked em todos os tiers) ──────────────────────
const C_BASE =[1.0,.910,.930,1];   // #ededed → rosa claro suave
const C_KNOT =[.949,.482,.643,1];  // #f27ba4
const C_RIGHT=[.969,.537,.686,1];  // #f789af
const C_LEFT =[1.0,.667,.784,1];   // #ffaac8

// ── Converter ─────────────────────────────────────────────────────────────
const CX=1000, CY=1794, SC=0.040, TX=100, TY=100;

function svgToLottie(d){
  const tokens=d.replace(/([MLCSVHZmlcsvhz])/g,' $1 ').trim().split(/[\s,]+/).filter(Boolean);
  const v=[],inn=[],out=[];
  let closed=false,idx=0,cx=0,cy=0,lastCmd='',prevCmd='';
  function isNum(t){return t&&/^[-+]?[0-9]/.test(t);}
  while(idx<tokens.length){
    const tok=tokens[idx];
    if(!tok){idx++;continue;}
    const isCmd=/^[MLCSVHZmlcsvhz]$/.test(tok);
    const cmd=isCmd?tok.toUpperCase():lastCmd;
    if(!isCmd&&!isNum(tok)){idx++;continue;}
    if(isCmd)idx++;
    prevCmd=lastCmd; lastCmd=cmd;
    if(cmd==='Z'){closed=true;break;}
    if(cmd==='M'||cmd==='L'){const x=parseFloat(tokens[idx++]),y=parseFloat(tokens[idx++]);v.push([x,y]);inn.push([0,0]);out.push([0,0]);cx=x;cy=y;}
    else if(cmd==='V'){const y=parseFloat(tokens[idx++]);v.push([cx,y]);inn.push([0,0]);out.push([0,0]);cy=y;}
    else if(cmd==='H'){const x=parseFloat(tokens[idx++]);v.push([x,cy]);inn.push([0,0]);out.push([0,0]);cx=x;}
    else if(cmd==='C'){
      const x1=parseFloat(tokens[idx++]),y1=parseFloat(tokens[idx++]);
      const x2=parseFloat(tokens[idx++]),y2=parseFloat(tokens[idx++]);
      const x=parseFloat(tokens[idx++]),y=parseFloat(tokens[idx++]);
      if(v.length>0){const p=v[v.length-1];out[out.length-1]=[x1-p[0],y1-p[1]];}
      v.push([x,y]);inn.push([x2-x,y2-y]);out.push([0,0]);cx=x;cy=y;
    }
    else if(cmd==='S'){
      // Smooth cubic: P1 = reflexo do último P2 (se anterior foi C ou S), senão = ponto atual
      const x2=parseFloat(tokens[idx++]),y2=parseFloat(tokens[idx++]);
      const x=parseFloat(tokens[idx++]),y=parseFloat(tokens[idx++]);
      let x1,y1;
      if(v.length>0&&(prevCmd==='C'||prevCmd==='S')){
        const lv=v[v.length-1],li=inn[inn.length-1];
        x1=2*lv[0]-(lv[0]+li[0]); y1=2*lv[1]-(lv[1]+li[1]);
      } else {x1=cx;y1=cy;}
      if(v.length>0){const p=v[v.length-1];out[out.length-1]=[x1-p[0],y1-p[1]];}
      v.push([x,y]);inn.push([x2-x,y2-y]);out.push([0,0]);cx=x;cy=y;
    }
  }
  return {v,i:inn,o:out,c:closed};
}

function convert(svgD){
  const d=svgpath(svgD).translate(-CX,-CY).scale(SC).translate(TX,TY).abs().unarc().round(2).toString();
  // pode ter sub-paths (M múltiplos) — pega o primeiro
  const sub=d.split(/(?=M)/).filter(Boolean);
  return sub.map(function(s,i){return{ty:"sh",d:1,ks:{a:0,k:svgToLottie(s)},nm:"P"+i};});
}

const SH={
  base:  convert(SVG_BASE),
  knot:  convert(SVG_KNOT),
  right: convert(SVG_RIGHT),
  left:  convert(SVG_LEFT),
};

// ── Tiers (laço sempre rosa, só decoração varia) ───────────────────────────
const TIERS={
  base:{nm:"Saúde é Investimento",
    glow:[.949,.482,.643,1], sparkle:[.949,.482,.643,1], coins:2, sparks:3},
  t2:{nm:"Saúde é Investimento Prata",
    glow:[.700,.700,.720,1], sparkle:[.780,.780,.800,1], coins:3, sparks:3},
  t3:{nm:"Saúde é Investimento Ouro",
    glow:[1,.843,.000,1], sparkle:[1,.843,.000,1], coins:4, sparks:4},
};

// ── Animações ──────────────────────────────────────────────────────────────
function ribbonPos(){
  return {a:1,k:[
    {...io,t:0,s:[TX,TY+65,0]},
    {...io,t:9,s:[TX,TY-5,0]},
    {...io,t:13,s:[TX,TY+2,0]},
    {...io,t:16,s:[TX,TY,0]},
    {...io,t:40,s:[TX,TY-4,0]},
    {...io,t:58,s:[TX,TY+4,0]},
    {t:76,s:[TX,TY-4,0]},
  ]};
}
// Leve balanço pendular
function ribbonRot(){
  return {a:1,k:[
    {...io,t:0,s:[0]},
    {...io,t:16,s:[0]},
    {...io,t:32,s:[-6]},
    {...io,t:50,s:[6]},
    {...io,t:68,s:[-5]},
    {t:85,s:[5]},
  ]};
}
const scaleIn={a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:9,s:[112,112,100]},{t:14,s:[100,100,100]}]};

// ── Build ──────────────────────────────────────────────────────────────────
function buildAnim(tc){
  const L=[];
  const ks={r:ribbonRot(),p:ribbonPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn};

  // Coins
  const coinDefs=[[52,38,18],[150,36,22],[50,158,27],[152,156,31]];
  coinDefs.slice(0,tc.coins).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:50+i,ty:4,nm:"Coin"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+4,s:[100]},{...io,t:t+18,s:[100]},{...io,t:t+26,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t,s:[0]},{t:t+26,s:[200]}]},
      p:{a:1,k:[{...io,t,s:[x,y,0]},{t:t+26,s:[x+6,y-20,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+4,s:[120,120,100]},{t:t+7,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[13,13]},p:{a:0,k:[0,0]},nm:"C"},mf(tc.sparkle),tr()],nm:"CG"}
    ],ip:0,op:90,st:0,bm:0});
  });

  // Sparkles
  const spDefs=[[52,32,20],[150,30,24],[48,34,30],[154,36,34],[100,30,38]];
  spDefs.slice(0,tc.sparks).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:60+i,ty:4,nm:"Sp"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+3,s:[100]},{...io,t:t+11,s:[0]},{...io,t:54+i*7,s:[0]},{...io,t:57+i*7,s:[100]},{...io,t:65+i*7,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*36]},{t:90,s:[i*36+220]}]},
      p:{a:0,k:[x,y,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+3,s:[100,100,100]},{t:t+11,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:8},os:{a:0,k:0},ix:1,nm:"S"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  });

  // Nó (knot) — topo do laço, na frente de tudo
  L.push({ddd:0,ind:14,ty:4,nm:"Knot",sr:1,ks:{
    o:{a:1,k:[{...io,t:3,s:[0]},{t:7,s:[100]}]}, ...ks
  },ao:0,shapes:[...SH.knot,mf(C_KNOT)],ip:0,op:90,st:0,bm:0});

  // Lado esquerdo (mais claro, na frente)
  L.push({ddd:0,ind:13,ty:4,nm:"Left",sr:1,ks:{
    o:{a:1,k:[{...io,t:2,s:[0]},{t:6,s:[100]}]}, ...ks
  },ao:0,shapes:[...SH.left,mf(C_LEFT)],ip:0,op:90,st:0,bm:0});

  // Lado direito
  L.push({ddd:0,ind:12,ty:4,nm:"Right",sr:1,ks:{
    o:{a:1,k:[{...io,t:1,s:[0]},{t:5,s:[100]}]}, ...ks
  },ao:0,shapes:[...SH.right,mf(C_RIGHT)],ip:0,op:90,st:0,bm:0});

  // Base (shape principal com as duas caudas + arco)
  L.push({ddd:0,ind:11,ty:4,nm:"Base",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:4,s:[100]}]}, ...ks
  },ao:0,shapes:[...SH.base,mf(C_BASE)],ip:0,op:90,st:0,bm:0});

  // Glow (backmost)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:16,s:[0]},{...io,t:22,s:[18]},{...io,t:45,s:[22]},{t:76,s:[10]}]},
    r:{a:0,k:0},p:{a:0,k:[TX,TY,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:16,s:[40,40,100]},{...io3,t:45,s:[105,105,100]},{t:76,s:[70,70,100]}]}
  },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[155,155]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

// ── Output ───────────────────────────────────────────────────────────────────
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';

['_t1','_t4'].forEach(function(sfx){
  try{fs.unlinkSync(path.join(prevDir,'seasonal_outubro_rosa'+sfx+'.json'));}catch{}
  try{fs.unlinkSync(path.join(outDir,'seasonal_outubro_rosa'+sfx+'.json'));}catch{}
});

const files={base:'seasonal_outubro_rosa',t2:'seasonal_outubro_rosa_t2',t3:'seasonal_outubro_rosa_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log(fname+'.json OK - base verts:',anim.layers.find(l=>l.nm==='Base').shapes[0].ks.k.v.length);
}
console.log("Done: seasonal_outubro_rosa");
