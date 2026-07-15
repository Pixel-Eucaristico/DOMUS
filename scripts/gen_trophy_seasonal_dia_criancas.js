#!/usr/bin/env node
// seasonal_dia_criancas - Infância com Alegria 🎠
// SVG: Tabler Icons filled balloon (MIT) — viewBox 0 0 24 24

const fs=require('fs'),path=require('path');
const svgpath=require('svgpath');

const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function tr(){return{ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}}

// ── SVG paths (Tabler filled balloon) ────────────────────────────────────────
// Balão principal (oval) — separado do brilho interno
const SVG_BODY='M12 1a7 7 0 0 1 7 7c0 5.457 -3.028 10 -7 10c-3.9 0 -6.89 -4.379 -6.997 -9.703l-.003 -.297l.004 -.24a7 7 0 0 1 6.996 -6.76z';
// Brilho interno (bolinha de shine)
const SVG_SHINE='M12 5a1 1 0 0 0 0 2l.117 .007a1 1 0 0 1 .883 .993l.007 .117a1 1 0 0 0 1.993 -.117a3 3 0 0 0 -3 -3z';
// Nó + cordinha inferior
const SVG_KNOT='M12 16a1 1 0 0 1 .993 .883l.007 .117v1a3 3 0 0 1 -2.824 2.995l-.176 .005h-3a1 1 0 0 0 -.993 .883l-.007 .117a1 1 0 0 1 -2 0a3 3 0 0 1 2.824 -2.995l.176 -.005h3a1 1 0 0 0 .993 -.883l.007 -.117v-1a1 1 0 0 1 1 -1z';

// ── Converter ─────────────────────────────────────────────────────────────────
const CX=12, CY=9, SC=3.75, TX=100, TY=82;

function svgToLottie(d){
  const tokens=d.replace(/([MLCVHZmlcvhz])/g,' $1 ').trim().split(/[\s,]+/).filter(Boolean);
  const v=[],inn=[],out=[];
  let closed=false,idx=0,cx=0,cy=0,lastCmd='';
  function isNum(t){return t&&/^[-+]?[0-9]/.test(t);}
  while(idx<tokens.length){
    const tok=tokens[idx];
    if(!tok){idx++;continue;}
    const isCmd=/^[MLCVHZmlcvhz]$/.test(tok);
    const cmd=isCmd?tok.toUpperCase():lastCmd;
    if(!isCmd&&!isNum(tok)){idx++;continue;}
    if(isCmd)idx++;
    lastCmd=cmd;
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
  }
  return {v,i:inn,o:out,c:closed};
}

function convert(svgD){
  const d=svgpath(svgD).translate(-CX,-CY).scale(SC).translate(TX,TY).abs().unarc().round(2).toString();
  return {ty:"sh",d:1,ks:{a:0,k:svgToLottie(d)},nm:"P"};
}

const SH={
  body:  convert(SVG_BODY),
  shine: convert(SVG_SHINE),
  knot:  convert(SVG_KNOT),
};

// ── Tiers ─────────────────────────────────────────────────────────────────────
const TIERS={
  base:{nm:"Infância com Alegria",
    balloon:[.937,.267,.267,1], knotFill:[.700,.160,.160,1],
    glow:[.937,.267,.267,1], sparkle:[.957,.706,.404,1], coins:2, sparks:3},
  t2:{nm:"Infância com Alegria Prata",
    balloon:[.500,.620,.780,1], knotFill:[.330,.440,.570,1],
    glow:[.500,.620,.780,1], sparkle:[.780,.780,.800,1], coins:3, sparks:3},
  t3:{nm:"Infância com Alegria Ouro",
    balloon:[1,.843,.000,1], knotFill:[.720,.560,.000,1],
    glow:[1,.843,.000,1], sparkle:[1,.843,.000,1], coins:4, sparks:4},
};

// ── Animação do balão ─────────────────────────────────────────────────────────
// Entrada: sobe de baixo + escala; Idle: flutua suavemente + balanço
function balloonPos(){
  return {a:1,k:[
    {...io,t:0,s:[TX,TY+70,0]},
    {...io,t:9,s:[TX,TY-6,0]},
    {...io,t:13,s:[TX,TY+3,0]},
    {...io,t:16,s:[TX,TY,0]},
    {...io,t:38,s:[TX,TY-5,0]},
    {...io,t:56,s:[TX,TY+5,0]},
    {t:74,s:[TX,TY-5,0]},
  ]};
}
// Balão balança levemente
function balloonRot(){
  return {a:1,k:[
    {...io,t:0,s:[0]},
    {...io,t:16,s:[0]},
    {...io,t:30,s:[-5]},
    {...io,t:47,s:[5]},
    {...io,t:63,s:[-4]},
    {t:79,s:[4]},
  ]};
}
const scaleIn={a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:8,s:[115,115,100]},{t:13,s:[100,100,100]}]};

// ── Build ─────────────────────────────────────────────────────────────────────
function buildAnim(tc){
  const L=[];

  // Coins
  const coinDefs=[[55,45,18],[148,42,22],[52,150,27],[150,148,31]];
  coinDefs.slice(0,tc.coins).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:50+i,ty:4,nm:"Coin"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+4,s:[100]},{...io,t:t+18,s:[100]},{...io,t:t+26,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t,s:[0]},{t:t+26,s:[200]}]},
      p:{a:1,k:[{...io,t,s:[x,y,0]},{t:t+26,s:[x+5,y-22,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+4,s:[120,120,100]},{t:t+7,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[13,13]},p:{a:0,k:[0,0]},nm:"C"},mf(tc.sparkle),tr()],nm:"CG"}
    ],ip:0,op:90,st:0,bm:0});
  });

  // Sparkles
  const spDefs=[[55,40,20],[148,38,24],[50,42,30],[152,44,34],[100,42,38]];
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

  // Brilho (shine) — bolinha branca no balão, na frente do corpo
  L.push({ddd:0,ind:13,ty:4,nm:"Shine",sr:1,ks:{
    o:{a:1,k:[{...io,t:5,s:[0]},{t:10,s:[70]}]},
    r:balloonRot(),p:balloonPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn
  },ao:0,shapes:[SH.shine,mf([1,1,1,1])],ip:0,op:90,st:0,bm:0});

  // Nó do balão
  L.push({ddd:0,ind:12,ty:4,nm:"Knot",sr:1,ks:{
    o:{a:1,k:[{...io,t:3,s:[0]},{t:7,s:[100]}]},
    r:balloonRot(),p:balloonPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn
  },ao:0,shapes:[SH.knot,mf(tc.knotFill)],ip:0,op:90,st:0,bm:0});

  // Corpo do balão
  L.push({ddd:0,ind:11,ty:4,nm:"Balloon",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:4,s:[100]}]},
    r:balloonRot(),p:balloonPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn
  },ao:0,shapes:[SH.body,mf(tc.balloon)],ip:0,op:90,st:0,bm:0});

  // Glow (backmost)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:16,s:[0]},{...io,t:22,s:[16]},{...io,t:45,s:[20]},{t:74,s:[10]}]},
    r:{a:0,k:0},p:{a:0,k:[TX,TY,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:16,s:[40,40,100]},{...io3,t:45,s:[100,100,100]},{t:74,s:[70,70,100]}]}
  },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[150,150]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

// ── Output ───────────────────────────────────────────────────────────────────
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';

['_t1','_t4'].forEach(function(sfx){
  try{fs.unlinkSync(path.join(prevDir,'seasonal_dia_criancas'+sfx+'.json'));}catch{}
  try{fs.unlinkSync(path.join(outDir,'seasonal_dia_criancas'+sfx+'.json'));}catch{}
});

const files={base:'seasonal_dia_criancas',t2:'seasonal_dia_criancas_t2',t3:'seasonal_dia_criancas_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log(fname+'.json OK - balloon verts:',anim.layers.find(l=>l.nm==='Balloon').shapes[0].ks.k.v.length);
}
console.log("Done: seasonal_dia_criancas");
