#!/usr/bin/env node
// seasonal_transito - Custos Fixos na Mão 🚗
// SVG: car-with-luggage-svgrepo-com.svg
// viewBox="0 -70.63 390.645 390.645"

const fs=require('fs'),path=require('path');
const svgpath=require('svgpath');

const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
function mf(c){return{ty:"fl",c:{a:0,k:c},o:{a:0,k:100},r:1,bm:0,nm:"F"}}
function tr(){return{ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}}

// ── SVG paths from car-with-luggage-svgrepo-com.svg ──────────────────────────
const SVG_BODY='M131.152,208.992c19.556,0,113.9-.112,146.593-.112l92.289-7.788a121.287,121.287,0,0,0,13.34-2.138c6-3.481,5.143-21.187,3.7-29.339-3.8-21.478-11.938-33.162-20.368-38.846-5.1-3.44-8.842-8.435-11.692-13.888-6.267-11.99-12.786-25.027-20.2-41.1-4.432-9.6-14.3-15.379-24.874-15.489-42.225-.439-120-.587-149.389.044A38.177,38.177,0,0,0,133.436,73c-8.645,9.427-17.642,19.758-24.346,27.12a28.316,28.316,0,0,1-15.514,8.715c-23.53,4.609-48.524,10.38-68.4,17.059-8.2,2.756-17.121,6.337-20.971,14.088-4.25,8.557-.352,18.624,2.878,27.615,1.926,5.36,3.551,9.874,5.574,14.8.186-.016.37-.028.553-.036,2.4-.094,4.794,0,7.057,0,1.185,0,3.643-.13,5.408-.294a43.956,43.956,0,0,1,17.7-16.741c9.115-4.92,18.23-5.575,28.445-4.889,22.074,1.481,34.666,13.778,41.721,33.79,1.686,5.469,3.834,10.358,6.294,12.356,3.649,2.965,5.693,2.41,11.318,2.41';
const SVG_WIN_L='M117.321,122c8.644-10.365,23.458-28.413,31.46-38.3a16.593,16.593,0,0,1,12.932-6.154c14.866.03,45.49.1,57.541.122a4.725,4.725,0,0,1,4.718,4.685c.09,8.846.331,25.985.392,37.584a4.739,4.739,0,0,1-4.744,4.764c-25.584.014-76.56.123-89.945.123Z';
const SVG_WIN_R='M318.232,88.214c-1.258-2.974-2.412-5.639-3.38-7.762a4.747,4.747,0,0,0-4.325-2.788c-15.044.025-48.085.207-61.007.26a4.732,4.732,0,0,0-4.718,4.723c-.028,8.459-.093,25.656-.113,36.049a5.166,5.166,0,0,0,5.212,5.177c14.878-.119,56.613-.5,75.816-.6a4.741,4.741,0,0,0,4.337-6.6C326.611,108.549,321.962,97.028,318.232,88.214Z';
const SVG_LUGGAGE='M168.205,10.746c-.754,11.589-1.309,24.812-1.533,36.111a3.905,3.905,0,0,0,3.95,3.939c37.6-.212,94.97.364,132.352.148a3.872,3.872,0,0,0,3.882-3.924c-.294-11.018-1.182-27.129-2.071-36.244a4.131,4.131,0,0,0-3.914-3.9c-27.89-1.331-94.814-1.872-128.753-.071A4.111,4.111,0,0,0,168.205,10.746Z';
const SVG_WHEEL_L='M64.342,174.135c-20.566,0-36.909,13.809-36.909,35.98,0,28.378,21.368,39.274,37.5,39.274,17.737,0,37.5-9.882,37.5-38.007C102.433,193.9,90.947,174.135,64.342,174.135Z';
const SVG_WHEEL_R='M325.22,174.135c-20.566,0-36.909,13.809-36.909,35.98,0,28.378,21.368,39.274,37.5,39.274,17.737,0,37.5-9.882,37.5-38.007C363.311,193.9,351.825,174.135,325.22,174.135Z';
const SVG_HUB_L='M64.724,198.486c-7.256,0-13.022,4.872-13.022,12.7,0,10.013,7.539,13.857,13.231,13.857,6.258,0,13.231-3.487,13.231-13.41C78.164,205.459,74.111,198.486,64.724,198.486Z';
const SVG_HUB_R='M325.6,198.486c-7.256,0-13.022,4.872-13.022,12.7,0,10.013,7.539,13.857,13.231,13.857,6.258,0,13.231-3.487,13.231-13.41C339.042,205.459,334.989,198.486,325.6,198.486Z';

// ── Converter ──────────────────────────────────────────────────────────────
const CX=195,CY=120,SC=0.40,TX=100,TY=100;

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
  body:    convert(SVG_BODY),
  winL:    convert(SVG_WIN_L),
  winR:    convert(SVG_WIN_R),
  luggage: convert(SVG_LUGGAGE),
  wheelL:  convert(SVG_WHEEL_L),
  wheelR:  convert(SVG_WHEEL_R),
  hubL:    convert(SVG_HUB_L),
  hubR:    convert(SVG_HUB_R),
};

// Wheel centers: L≈(65,212), R≈(326,212) in SVG space
function svgPt(x,y){return [Math.round((x-CX)*SC+TX), Math.round((y-CY)*SC+TY)];}
const [WLX,WLY]=svgPt(65,212);
const [WRX,WRY]=svgPt(326,212);

// ── Tiers ──────────────────────────────────────────────────────────────────
const TIERS={
  base:{nm:"Custos Fixos na Mão",bodyFill:[1,1,1,1],winFill:[.53,.80,.89,.65],luggageFill:[.957,.706,.404,1],wheelFill:[.13,.09,.08,1],hubFill:[1,1,1,1],glow:[.53,.80,.89,1],sparkle:[.957,.706,.404,1],coins:2,sparks:2},
  t2:{nm:"Custos Fixos na Mão Prata",bodyFill:[.78,.78,.80,1],winFill:[.53,.80,.89,.55],luggageFill:[.68,.68,.70,1],wheelFill:[.15,.11,.10,1],hubFill:[.88,.88,.90,1],glow:[.78,.78,.80,1],sparkle:[.78,.78,.80,1],coins:3,sparks:3},
  t3:{nm:"Custos Fixos na Mão Ouro",bodyFill:[1,.87,.20,1],winFill:[.90,.98,.50,.55],luggageFill:[1,.84,.00,1],wheelFill:[.15,.10,.05,1],hubFill:[1,.84,.00,1],glow:[1,.87,.20,1],sparkle:[1,.87,.20,1],coins:4,sparks:4},
};

// ── Animation helpers ──────────────────────────────────────────────────────
function bodyPos(){
  return {a:1,k:[
    {...io,t:0,s:[TX,TY+60,0]},
    {...io,t:10,s:[TX,TY-5,0]},
    {...io,t:14,s:[TX,TY+2,0]},
    {...io,t:17,s:[TX,TY,0]},
    {...io,t:45,s:[TX,TY-3,0]},
    {...io,t:62,s:[TX,TY+3,0]},
    {t:75,s:[TX,TY-3,0]},
  ]};
}
function wheelPos(wx,wy){
  return {a:1,k:[
    {...io,t:0,s:[wx,wy+60,0]},
    {...io,t:10,s:[wx,wy-5,0]},
    {...io,t:14,s:[wx,wy+2,0]},
    {...io,t:17,s:[wx,wy,0]},
    {...io,t:45,s:[wx,wy-3,0]},
    {...io,t:62,s:[wx,wy+3,0]},
    {t:75,s:[wx,wy-3,0]},
  ]};
}
const scaleIn={a:1,k:[{...io3,t:0,s:[0,0,100]},{...io3,t:7,s:[108,108,100]},{t:11,s:[100,100,100]}]};

// ── Build ──────────────────────────────────────────────────────────────────
function buildAnim(tc){
  const L=[];

  // Coins
  const coinDefs=[[30,60,20],[172,58,24],[28,155,29],[174,153,33]];
  coinDefs.slice(0,tc.coins).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:50+i,ty:4,nm:"Coin"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+4,s:[100]},{...io,t:t+18,s:[100]},{...io,t:t+26,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t,s:[0]},{t:t+26,s:[180]}]},
      p:{a:1,k:[{...io,t,s:[x,y,0]},{t:t+26,s:[x+5,y+22,0]}]},
      a:{a:0,k:[0,0,0]},s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+4,s:[115,115,100]},{t:t+7,s:[100,100,100]}]}
    },ao:0,shapes:[
      {ty:"gr",it:[{ty:"el",d:1,s:{a:0,k:[12,12]},p:{a:0,k:[0,0]},nm:"C"},mf(tc.sparkle),tr()],nm:"CG"}
    ],ip:0,op:90,st:0,bm:0});
  });

  // Sparkles
  const spDefs=[[30,54,22],[174,52,26],[28,158,32],[176,156,36]];
  spDefs.slice(0,tc.sparks).forEach(function(arr,i){
    const [x,y,t]=arr;
    L.push({ddd:0,ind:60+i,ty:4,nm:"Sp"+i,sr:1,ks:{
      o:{a:1,k:[{...io,t,s:[0]},{...io,t:t+3,s:[100]},{...io,t:t+10,s:[0]},{...io,t:55+i*7,s:[0]},{...io,t:58+i*7,s:[100]},{...io,t:66+i*7,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*45]},{t:90,s:[i*45+180]}]},
      p:{a:0,k:[x,y,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t,s:[0,0,100]},{...io3,t:t+3,s:[100,100,100]},{t:t+10,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:3},is:{a:0,k:0},or:{a:0,k:7},os:{a:0,k:0},ix:1,nm:"S"},
      mf(tc.sparkle)
    ],ip:0,op:90,st:0,bm:0});
  });

  // Luggage box (on roof)
  L.push({ddd:0,ind:12,ty:4,nm:"Luggage",sr:1,ks:{
    o:{a:1,k:[{...io,t:4,s:[0]},{t:8,s:[100]}]},
    r:{a:0,k:0},p:bodyPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn
  },ao:0,shapes:[SH.luggage,mf(tc.luggageFill)],ip:0,op:90,st:0,bm:0});

  // Hub R (white center, in front of wheel)
  L.push({ddd:0,ind:31,ty:4,nm:"HubR",sr:1,ks:{
    o:{a:1,k:[{...io,t:2,s:[0]},{t:6,s:[100]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[720]}]},
    p:wheelPos(WRX,WRY),a:{a:0,k:[WRX,WRY,0]},s:scaleIn
  },ao:0,shapes:[SH.hubR,mf(tc.hubFill)],ip:0,op:90,st:0,bm:0});

  // Hub L
  L.push({ddd:0,ind:30,ty:4,nm:"HubL",sr:1,ks:{
    o:{a:1,k:[{...io,t:2,s:[0]},{t:6,s:[100]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[720]}]},
    p:wheelPos(WLX,WLY),a:{a:0,k:[WLX,WLY,0]},s:scaleIn
  },ao:0,shapes:[SH.hubL,mf(tc.hubFill)],ip:0,op:90,st:0,bm:0});

  // Wheel R (dark tire)
  L.push({ddd:0,ind:21,ty:4,nm:"WheelR",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:3,s:[100]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[720]}]},
    p:wheelPos(WRX,WRY),a:{a:0,k:[WRX,WRY,0]},s:scaleIn
  },ao:0,shapes:[SH.wheelR,mf(tc.wheelFill)],ip:0,op:90,st:0,bm:0});

  // Wheel L
  L.push({ddd:0,ind:20,ty:4,nm:"WheelL",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:3,s:[100]}]},
    r:{a:1,k:[{t:0,s:[0]},{t:90,s:[720]}]},
    p:wheelPos(WLX,WLY),a:{a:0,k:[WLX,WLY,0]},s:scaleIn
  },ao:0,shapes:[SH.wheelL,mf(tc.wheelFill)],ip:0,op:90,st:0,bm:0});

  // Windows (blue, in front of body)
  L.push({ddd:0,ind:11,ty:4,nm:"Win",sr:1,ks:{
    o:{a:1,k:[{...io,t:3,s:[0]},{t:7,s:[100]}]},
    r:{a:0,k:0},p:bodyPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn
  },ao:0,shapes:[SH.winL,SH.winR,mf(tc.winFill)],ip:0,op:90,st:0,bm:0});

  // Body
  L.push({ddd:0,ind:10,ty:4,nm:"Body",sr:1,ks:{
    o:{a:1,k:[{...io,t:0,s:[0]},{t:3,s:[100]}]},
    r:{a:0,k:0},p:bodyPos(),a:{a:0,k:[TX,TY,0]},s:scaleIn
  },ao:0,shapes:[SH.body,mf(tc.bodyFill)],ip:0,op:90,st:0,bm:0});

  // Glow (backmost — atrás de tudo, opacidade baixa)
  L.push({ddd:0,ind:1,ty:4,nm:"Glow",sr:1,ks:{
    o:{a:1,k:[{...io,t:17,s:[0]},{...io,t:24,s:[18]},{...io,t:45,s:[22]},{t:62,s:[12]}]},
    r:{a:0,k:0},p:{a:0,k:[TX,TY,0]},a:{a:0,k:[0,0,0]},
    s:{a:1,k:[{...io3,t:17,s:[50,50,100]},{...io3,t:45,s:[105,105,100]},{t:62,s:[75,75,100]}]}
  },ao:0,shapes:[{ty:"el",d:1,s:{a:0,k:[160,160]},p:{a:0,k:[0,0]},nm:"G"},mf(tc.glow)],ip:0,op:90,st:0,bm:0});

  return {v:"5.7.4",fr:30,ip:0,op:90,w:200,h:200,nm:tc.nm,ddd:0,assets:[],layers:L,markers:[]};
}

// ── Output ──────────────────────────────────────────────────────────────────
const outDir=path.join(__dirname,'..','assets','lottie','trophies');
const prevDir='C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';

['_t1','_t4'].forEach(function(sfx){
  try{fs.unlinkSync(path.join(prevDir,'seasonal_transito'+sfx+'.json'));}catch{}
  try{fs.unlinkSync(path.join(outDir,'seasonal_transito'+sfx+'.json'));}catch{}
});

console.log('WL:',WLX,WLY,'WR:',WRX,WRY);

const files={base:'seasonal_transito',t2:'seasonal_transito_t2',t3:'seasonal_transito_t3'};
for(const [tier,fname] of Object.entries(files)){
  const anim=buildAnim(TIERS[tier]);
  fs.writeFileSync(path.join(outDir,fname+'.json'),JSON.stringify(anim));
  try{fs.writeFileSync(path.join(prevDir,fname+'.json'),JSON.stringify(anim));}catch{}
  console.log(fname+'.json OK - body verts:',anim.layers.find(l=>l.nm==='Body').shapes[0].ks.k.v.length);
}
console.log("Done: seasonal_transito");
