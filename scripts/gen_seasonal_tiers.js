/**
 * Generates tier variants (t2=Prata, t3=Ouro) for all seasonal trophies.
 *
 * Strategy per tier:
 * - Bronze (base): original animation as-is
 * - Prata (t2): silver color scheme, slightly bigger elements
 * - Ouro (t3): gold+diamond glow, extra particles, larger star/effects
 *
 * We deep-modify the JSON to change colors, sizes, and add extra layers.
 */
const fs = require('fs'), path = require('path');
const outDir = path.join(__dirname, '..', 'assets', 'lottie', 'trophies');
const prevDir = 'C:/Code/ReactNative/DOMUS-Rive-Preview/public/assets/lottie/trophies';

// Color palettes
const SILVER = {
  main: [.75,.75,.78,1],
  glow: [.75,.75,.82,.4],
  accent: [.55,.55,.6,1],
  sparkle: [.85,.85,.9,1],
};
const GOLD_TIER = {
  main: [1,.843,0,1],
  glow: [1,.9,.3,.5],
  accent: [.85,.65,0,1],
  sparkle: [1,.95,.4,1],
};

function replaceAllColors(jsonStr, fromColor, toColor) {
  // Round to avoid floating point mismatches
  const from = JSON.stringify(fromColor.map(n => Math.round(n*1000)/1000));
  const to = JSON.stringify(toColor.map(n => Math.round(n*1000)/1000));
  return jsonStr.split(from).join(to);
}

function generateTiers(id) {
  const baseJson = fs.readFileSync(path.join(outDir, id + '.json'), 'utf8');

  // Identify the gold color used in sparkles/border (common across all seasonals)
  const goldColor = [1,.843,0,1];

  // === T2: SILVER ===
  let t2str = baseJson;
  // Replace gold sparkles/accents with silver
  t2str = replaceAllColors(t2str, goldColor, SILVER.sparkle);
  // Replace warm glow with silver glow
  t2str = replaceAllColors(t2str, [.95,.85,.4,1], SILVER.main);  // warm yellow glow
  t2str = replaceAllColors(t2str, [.95,.85,.5,.4], SILVER.glow);  // glow bg (some trophies)

  // Scale down sparkles slightly for bronze feel, scale up border
  const t2 = JSON.parse(t2str);
  t2.nm = id + ' Prata';

  // Add silver shimmer ring layer
  const shimmerLayer = {
    ddd:0,ind:999,ty:4,nm:"SilverShimmer",sr:1,
    ks:{
      o:{a:1,k:[{i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:15,s:[0]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:20,s:[30]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:30,s:[0]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:55,s:[0]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:60,s:[30]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:70,s:[0]},
        {t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,105,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[
        {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t:15,s:[60,60,100]},
        {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t:30,s:[120,120,100]},
        {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t:55,s:[60,60,100]},
        {t:70,s:[120,120,100]}]}
    },ao:0,
    shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},
      {ty:"st",c:{a:0,k:SILVER.main},o:{a:0,k:100},w:{a:0,k:2},lc:2,lj:2,bm:0,nm:"S"}],
    ip:0,op:90,st:0,bm:0
  };
  t2.layers.push(shimmerLayer);

  const t2out = JSON.stringify(t2);
  fs.writeFileSync(path.join(outDir, id + '_t2.json'), t2out);
  try { fs.writeFileSync(path.join(prevDir, id + '_t2.json'), t2out); } catch {}

  // === T3: GOLD ===
  let t3str = baseJson;
  // Enhance glow colors to be brighter/warmer
  t3str = replaceAllColors(t3str, [.95,.85,.5,.4], [1,.9,.3,.5]);  // brighter glow

  const t3 = JSON.parse(t3str);
  t3.nm = id + ' Ouro';

  // Make glow layer bigger and brighter
  t3.layers.forEach(layer => {
    if (layer.nm === 'Glow' || layer.nm === 'DarkBg') {
      // Increase glow opacity
      if (layer.ks.o && layer.ks.o.a === 1) {
        layer.ks.o.k.forEach(kf => {
          if (kf.s) kf.s = kf.s.map(v => Math.min(v * 1.5, 100));
        });
      }
    }
  });

  // Add golden pulse ring
  const goldPulse = {
    ddd:0,ind:998,ty:4,nm:"GoldPulse",sr:1,
    ks:{
      o:{a:1,k:[
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:12,s:[0]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:16,s:[45]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:26,s:[0]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:50,s:[0]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:54,s:[45]},
        {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]},t:64,s:[0]},
        {t:90,s:[0]}]},
      r:{a:0,k:0},p:{a:0,k:[100,105,0]},a:{a:0,k:[0,0,0]},
      s:{a:1,k:[
        {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t:12,s:[50,50,100]},
        {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t:26,s:[140,140,100]},
        {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]},t:50,s:[50,50,100]},
        {t:64,s:[140,140,100]}]}
    },ao:0,
    shapes:[{ty:"el",d:1,s:{a:0,k:[80,80]},p:{a:0,k:[0,0]},nm:"Ring"},
      {ty:"st",c:{a:0,k:GOLD_TIER.main},o:{a:0,k:100},w:{a:0,k:3},lc:2,lj:2,bm:0,nm:"S"}],
    ip:0,op:90,st:0,bm:0
  };
  t3.layers.push(goldPulse);

  // Add extra sparkles (6 more)
  const io={i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}};
  const io3={i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}};
  const extraSpP=[[45,80],[155,75],[65,60],[135,85],[80,50],[120,55]];
  for(let i=0;i<6;i++){
    const d=18+i*4;
    t3.layers.unshift({ddd:0,ind:900+i,ty:4,nm:"ExSp"+(i+1),sr:1,ks:{
      o:{a:1,k:[{...io,t:d,s:[0]},{...io,t:d+4,s:[100]},{...io,t:d+12,s:[0]},{...io,t:58+i*5,s:[0]},{...io,t:62+i*5,s:[100]},{...io,t:70+i*5,s:[0]},{t:90,s:[0]}]},
      r:{a:1,k:[{t:0,s:[i*60]},{t:90,s:[i*60+200]}]},
      p:{a:0,k:[extraSpP[i][0],extraSpP[i][1],0]},
      a:{a:0,k:[0,0,0]},
      s:{a:1,k:[{...io3,t:d,s:[0,0,100]},{...io3,t:d+4,s:[120,120,100]},{t:d+12,s:[0,0,100]}]}
    },ao:0,shapes:[
      {ty:"sr",sy:1,d:1,pt:{a:0,k:4},p:{a:0,k:[0,0]},r:{a:0,k:0},ir:{a:0,k:2},is:{a:0,k:0},or:{a:0,k:5},os:{a:0,k:0},ix:1,nm:"Star"},
      {ty:"fl",c:{a:0,k:GOLD_TIER.sparkle},o:{a:0,k:100},r:1,bm:0,nm:"F"}
    ],ip:0,op:90,st:0,bm:0});
  }

  const t3out = JSON.stringify(t3);
  fs.writeFileSync(path.join(outDir, id + '_t3.json'), t3out);
  try { fs.writeFileSync(path.join(prevDir, id + '_t3.json'), t3out); } catch {}

  console.log('  ' + id + ': t2 (Prata) + t3 (Ouro)');
}

// Generate for all approved seasonals
const seasonals = [
  'seasonal_ano_novo',
  'seasonal_planejamento_anual',
  'seasonal_dia_de_reis',
  'seasonal_queima_velhos',
  'seasonal_carnaval',
];

console.log('Generating seasonal tiers...');
seasonals.forEach(generateTiers);
console.log('Done! All seasonal tiers generated.');
