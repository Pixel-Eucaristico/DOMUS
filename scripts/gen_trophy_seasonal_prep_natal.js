#!/usr/bin/env node
// seasonal_prep_natal - Natal Antecipado 🎄
// SVG: Tabler Icons filled christmas-tree (MIT) — viewBox 0 0 24 24

const fs=require('fs'),path=require('path');
const svgpath=require('svgpath');

const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function tr(){return{ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}}

// ── SVG paths ──────────────────────────────────────────────────────────────
// Árvore completa (tronco + corpo)
const SVG_TREE='M15 19v1a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-1zm-10 -1c-.89 0 -1.337 -1.077 -.707 -1.707l2.855 -2.857l-1.464 -.487a1 1 0 0 1 -.472 -1.565l.08 -.091l3.019 -3.02l-.758 -.379a1 1 0 0 1 -.343 -1.507l.083 -.094l4 -4a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 -.26 1.601l-.759 .379l3.02 3.02a1 1 0 0 1 -.279 1.61l-.113 .046l-1.465 .487l2.856 2.857c.603 .602 .22 1.614 -.593 1.701l-.114 .006z';

// ── Converter ─────────────────────────────────────────────────────────────
const CX=12, CY=12, SC=4.2, TX=100, TY=100;

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
      const x2=parseFloat(tokens[idx++]),y2=parseFloat(tokens[idx++]);
      const x=parseFloat(tokens[idx++]),y=parseFloat(tokens[idx++]);
      let x1,y1;
      if(v.length>0&&(prevCmd==='C'||prevCmd==='S')){
        const lv=v[v.length-1],li=inn[inn.length-1];
        x1=lv[0]-li[0]; y1=lv[1]-li[1];
      } else {x1=cx;y1=cy;}
      if(v.length>0){const p=v[v.length-1];out[out.length-1]=[x1-p[0],y1-p[1]];}
      v.push([x,y]);inn.push([x2-x,y2-y]);out.push([0,0]);cx=x;cy=y;
    }
  }
  return {v,i:inn,o:out,c:closed};
}

function convert(svgD){
  const d=svgpath(svgD).translate(-CX,-CY).scale(SC).translate(TX,TY).abs().unarc().round(2).toString();
  return d.split(/(?=M)/).filter(Boolean).map(function(s,i){
    return{ty:"sh",d:1,ks:{a:0,k:svgToLottie(s)},nm:"P"+i};
  });
}

const SH_TREE=convert(SVG_TREE);

// Estrela no topo (forma sr)
const STAR={ty:"sr",sy:1,d:1,pt:{a:0,k:5},p:{a:0,k:[0,-36]},r:{a:0,k:0},ir:{a:0,k:5},is:{a:0,k:0},or:{a:0,k:11},os:{a:0,k:0},ix:1,nm:"Star"};

// Bolinhas decorativas (círculos fixos sobre a árvore)
const ORNAMENT_POS=[[0,-12],[10,-4],[-10,-4],[6,6],[-7,6],[2,15]];

// ── Tiers ──────────────────────────────────────────────────────────────────
const TIERS={
  base:{nm:"Natal Antecipado",
    tree:[.176,.498,.216,1], star:[1,.843,.000,1],
    ornament:[[.937,.267,.267,1],[.180,.459,.733,1],[.953,.612,.071,1],[.937,.267,.267,1],[.180,.459,.733,1],[.953,.612,.071,1]],
    glow:[.176,.498,.216,1], sparkle:[1,.843,.000,1], coins:2, sparks:3},
  t2:{nm:"Natal Antecipado Prata",
    tree:[.500,.600,.520,1], star:[.900,.900,.920,1],
    ornament:[[.780,.780,.800,1],[.600,.700,.620,1],[.880,.880,.900,1],[.780,.780,.800,1],[.600,.700,.620,1],[.880,.880,.900,1]],
    glow:[.500,.600,.520,1], sparkle:[.780,.780,.800,1], coins:3, sparks:3},
  t3:{nm:"Natal Antecipado Ouro",
    tree:[.200,.560,.240,1], star:[1,.900,.100,1],
    ornament:[[1,.843,.000,1],[.953,.612,.071,1],[1,.900,.100,1],[1,.843,.000,1],[.953,.612,.071,1],[1,.900,.100,1]],
    glow:[1,.843,.000,1], sparkle:[1,.843,.000,1], coins:4, sparks:4},
};

// ── Animações ──────────────────────────────────────────────────────────────
function treePos(){
  return {a:1,k:[
    {...io,t:0,s:[TX,TY+65,0]},
    {...io,t:9,s:[TX,TY-5,0]},
    {...io,t:13,s:[TX,TY+2,0]},
    {...io,t:16,s:[TX,TY,0]},
    {...io,t:42,s:[TX,TY-3,0]},
    {...io,t:60,s:[TX,TY+3,0]},
    {t:78,s:[TX,TY-3,0]},
  ]};
}
// Balanço suave da árvore
function treeRot(){
  return {a:1,k:[
    {...io,t:16,s:[0]},
    {...io,t:34,s:[-4]},
    {...io,t:52,s:[4]},
    {...io,t:70,s:[-3]},
    {t:88,s:[3]},
  ]};
}
// Estrela pisca
function starOpacity(){
  return {a:1,k:[
    {...io,t:8,s:[0]},{...io,t:13,s:[100]},
    {...io,t:38,s:[100]},{...io,t:42,s:[40]},
    {...io,t:46,s:[100]},{...io,t:56,s:[100]},
    {...io,t:60,s:[40]},{...io,t:64,s:[100]},
    {t:90,s:[100]}
  ]};
}
const scaleIn={a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:9,s:[112,112,100]},{t:14,s:[100,100,100]}]};

// ── Build ──────────────────────────────────────────────────────────────────
function buildAnim(tc){
  const L=[];
  const baseKs={r:treeRot(),p:treePos(),a:{a:0,k:[TX,TY,0]},s:scaleIn};

  // Coins
  const coinDefs=[[50,40,18],[152,38,22],[48,158,27],[154,156,31]];
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
  const spDefs=[[50,34,20],[152,32,24],[48,36,30],[154,38,34],[100,32,38]];
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

  // Estrela no topo (pisca)
  L.push({ddd:0,ind:15,ty:4,nm:"Star",sr:1,ks:{
    o:starOpacity(),
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[72]}]},
    p:treePos(), a:{a:0,k:[TX,TY,0]},
    s:{a:1,k:[{...io3,t:8,s:[0,0,100]},{...io3,t:14,s:[130,130,100]},{t:18,s:[100,100,100]}]}
  },ao:0,shapes:[
    {ty:"gr",it:[STAR,mf(tc.star),tr()],nm:"StarG"}
  ],ip:0,op:90,st:0,bm:0});

  // Enfeites coloridos
  ORNAMENT_POS.forEach(function(pos,i){
    const col=tc.ornament[i%tc.ornament.length];
    const t=16+i*2;
    L.push({ddd:0,ind:20+i,ty:4,nm:"Orn"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{t:t+3,s:[100]}]},
      r:{a:0,k:0}, p:treePos(), a:{a:0,k:[TX,TY,0]},
      s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:9,s:[112,112,100]},{t:14,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[7,7]},p:{a:0,k:pos},nm:"O"},mf(col),tr()],nm:"OG"}
    ],ip:0,op:90,st:0,bm:0});
  });

  // Árvore
  L.push({ddd:0,ind:11,ty:4,nm:"Tree",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:4,s:[100]}]}, ...baseKs
  },ao:0,shapes:[...SH_TREE,mf(tc.tree)],ip:0,op:90,st:0,bm:0});

  // Glow (backmost)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:16,s:[0]},{...io,t:22,s:[18]},{...io,t:45,s:[22]},{t:78,s:[10]}]},
    r:{a:0,k:0},p:{a:0,k:[TX,TY,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:16,s:[40,40,100]},{...io3,t:45,s:[108,108,100]},{t:78,s:[70,70,100]}]}
  },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[158,158]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

// ── Output ───────────────────────────────────────────────────────────────────
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';

['_t1','_t4'].forEach(function(sfx){
  try{fs.unlinkSync(path.join(prevDir,'seasonal_prep_natal'+sfx+'.json'));}catch{}
  try{fs.unlinkSync(path.join(outDir,'seasonal_prep_natal'+sfx+'.json'));}catch{}
});

const files={base:'seasonal_prep_natal',t2:'seasonal_prep_natal_t2',t3:'seasonal_prep_natal_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log(fname+'.json OK - tree verts:',anim.layers.find(l=>l.nm==='Tree').shapes[0].ks.k.v.length);
}
console.log("Done: seasonal_prep_natal");
