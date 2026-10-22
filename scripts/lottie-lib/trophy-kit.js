/**
 * trophy-kit — montagem comum dos lotes de troféus com gesto (Story 11.7).
 *
 * Extraído de `scripts/trophy-lot-1.js` sem mudar a saída do lote 1: níveis
 * (bronze, prata, ouro), cores litúrgicas, base comum (brilhos, halo, auréola),
 * ajudas de peça (`piece`, `pt`, `pieces`) e a montagem/escrita de um lote.
 * Cada lote (`trophy-lot-1.js`, `trophy-lot-2.js`) tem a sua tabela de peças
 * (ICONS, com fonte e licença) e os seus gestos.
 */
const lib = require("./index");
const { anim, onda, aparecer, giro, hex } = lib;

/** Último quadro do laço (FORMAT.op): as ondas e giros terminam aqui. */
const END = lib.FORMAT.op;
/**
 * Fator com que o desenho (tudo menos brilhos e halo) é encolhido em volta do
 * centro do quadro, para caber, em todos os quadros, na janela que o
 * `LottieTrophy` mostra (lib.VIEW_WINDOW, ampliação lib.VIEW_ZOOM).
 */
const ART_SCALE = 0.82;

/**
 * Níveis (sazonais e litúrgicos): x.json = bronze, _t2 = prata, _t3 = ouro.
 * Bronze tem pouco brilho; a prata, brilho prateado; o ouro, brilho dourado.
 */
const TIERS = [
  { tier: 1, suffix: "",    nome: "bronze", metal: [0.804, 0.498, 0.196, 1], spark: [1, 0.75, 0.35, 1],    sparkPeak: 45, glowPeak: 8 },
  { tier: 2, suffix: "_t2", nome: "prata",  metal: [0.75, 0.75, 0.78, 1],    spark: [0.85, 0.87, 0.95, 1], sparkPeak: 85, glowPeak: 12 },
  { tier: 3, suffix: "_t3", nome: "ouro",   metal: [1, 0.843, 0, 1],         spark: [1, 0.92, 0.4, 1],     sparkPeak: 90, glowPeak: 16 },
];

/** Cor litúrgica da festa (cor de apoio): halo e luz dos litúrgicos. */
const LITURGICAL_COLORS = {
  branco:   { glow: [1, 0.88, 0.45, 1],  luz: [1, 0.97, 0.85, 1] },
  vermelho: { glow: [0.86, 0.16, 0.2, 1], luz: [1, 0.9, 0.86, 1] },
  roxo:     { glow: [0.55, 0.36, 0.78, 1], luz: [0.96, 0.93, 1, 1] },
};
const HALO_GOLD = [1, 0.843, 0, 1];
const RAY_GOLD = hex("#FFD983");
const CONFETE_OURO = [hex("#FFCC4D"), hex("#FFAC33"), hex("#FFE8B6"), hex("#F4900C")];

// ── Ajudas de montagem ───────────────────────────────────────────────────────
/** Camada de peça (o índice é numerado no fim). */
const L = (nm, shapes, ks) => lib.pieceLayer(0, nm, shapes, ks);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
/** Flutuar suave (sobe e desce `amp` px) de t0 até o fim do laço. */
const flutuar = (base, t0, amp = 2, period = 30) => onda(base, -amp, t0, END, { period, axis: 1 }, "flutuar");
/** Desloca as chaves de posição (para uma peça que acompanha outra). */
const deslocar = (keys, d) => keys.map(([t, v, c]) => [t, add(v, d), c]);
const stroke = (shapes, width, color, name, opts) => lib.makeStroke(shapes, width, color, name, opts);
const reta = (pts) => lib.polyline(pts, { smooth: false });

/** Auréola que acende (anel dourado; elíptico quando rx ≠ ry). */
function aureola({ center, r, rx = r, ry = r, t0 = 30, width = 3, p = null, nm = "Aureola" } = {}) {
  if (!(rx > 0 && ry > 0)) throw new Error("aureola: falta o raio (r, ou rx e ry)");
  if (!center && !p) throw new Error("aureola: falta o centro (center ou p)");
  return L(nm, [lib.makeEllipseRing(0, 0, rx, ry, width, HALO_GOLD, "Aureola")], {
    p: p || center,
    s: anim([[0, 80], [t0, 80, "out"], [t0 + 10, 100]]),
    o: anim([...aparecer(t0, 10, { to: 80 }), ...onda(80, 15, t0 + 10, END, { period: 30 })]),
  });
}

/** Raios em volta de um ponto (fixo ou animado), girando sem salto no laço. */
function raios(nm, p, { count = 12, r1 = 26, r2 = 40, half = 4, t0 = 40, peak = 75, color = RAY_GOLD } = {}) {
  return L(nm, [lib.makeRays(count, r1, r2, half, color, "Raios", [0, 0])], {
    p, r: anim(giro(360 / count)), o: anim(aparecer(t0, 12, { to: peak })),
  });
}

/** Comprimento acumulado (0..1) de uma linha pelos pontos. */
function fracoes(points) {
  const d = [0];
  for (let k = 1; k < points.length; k++) {
    d.push(d[k - 1] + Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]));
  }
  return d.map((x) => x / d[d.length - 1]);
}

/** `n` pontos igualmente espaçados (pelo comprimento) sobre uma shape. */
function pontosAoLongo(shape, n) {
  const pts = lib.samplePoints(shape, 16);
  const f = fracoes(pts);
  return Array.from({ length: n }, (_, k) => {
    const target = k / (n - 1);
    let j = f.findIndex((x) => x >= target);
    if (j <= 0) return pts[Math.max(0, j)];
    const u = (target - f[j - 1]) / (f[j] - f[j - 1] || 1);
    return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u];
  });
}

/**
 * Ajudas que dependem da tabela de peças de um lote, e a montagem do lote.
 * `ICONS`: { chave: { source, license, viewBox, elements } }.
 * `DRAWN` (opcional): peças principais desenhadas no próprio gerador, sem
 * fonte externa ({ chave: { desc } }); valem como `icon` de um troféu.
 */
function makeLot(ICONS, { DRAWN = {} } = {}) {
  /** Shapes de um ícone da tabela, centrado em (0,0), com `size` px de largura. */
  function piece(key, size, opts = {}) {
    const icon = ICONS[key];
    if (!icon) throw new Error(`Peça desconhecida: ${key}`);
    return lib.iconShapes(icon, size, [0, 0], { prefix: key, ...opts });
  }
  /** O ícone com `size` px de largura, centrado em `center` (coordenadas da camada). */
  function pieceAt(key, size, center, opts = {}) {
    if (!ICONS[key]) throw new Error(`Peça desconhecida: ${key}`);
    return lib.iconShapes(ICONS[key], size, center, { prefix: key, ...opts });
  }
  /** Ponto do viewBox do ícone em coordenadas locais da peça. */
  function pt(key, size, xy) {
    if (!ICONS[key]) throw new Error(`pt: peça desconhecida: ${key}`);
    return lib.iconPoint(ICONS[key], size, xy);
  }
  /** O mesmo ícone em vários lugares (coordenadas absolutas). */
  function pieces(key, size, centers, opts = {}) {
    const icon = ICONS[key];
    if (!icon) throw new Error(`Peça desconhecida: ${key}`);
    return centers.flatMap((c, k) => lib.iconShapes(icon, size, c, { prefix: `${key}#${k}`, ...opts }));
  }

  function buildTier(entry, tier) {
    const ctx = { col: entry.kind === "liturgical" ? LITURGICAL_COLORS[entry.color] : null };
    const art = [...entry.gesture(tier.tier, ctx)];
    if (entry.kind === "liturgical" && entry.halo) art.push(aureola(entry.halo));
    const layers = art.map((ly) => lib.scaleLayer(ly, ART_SCALE));
    layers.push(...lib.sparkleLayers(0, tier.spark, undefined, { peak: tier.sparkPeak }));
    layers.push(lib.glowLayer(0, entry.kind === "liturgical" ? ctx.col.glow : tier.metal, { peak: tier.glowPeak }));
    layers.forEach((ly, k) => { ly.ind = k + 1; });
    return lib.assemble(`${entry.id}_t${tier.tier}`, layers);
  }

  /** Arquivos de um troféu: [{ suffix, lottie }] (bronze, prata, ouro). */
  function buildTrophy(entry) {
    const id = entry && entry.id;
    if (!ICONS[entry.icon] && !DRAWN[entry.icon]) throw new Error(`${id}: ícone desconhecido: ${entry.icon}`);
    if (entry.kind === "liturgical" && !LITURGICAL_COLORS[entry.color]) {
      throw new Error(`${id}: cor litúrgica ausente ou desconhecida: ${JSON.stringify(entry.color)} (use ${Object.keys(LITURGICAL_COLORS).join(" | ")})`);
    }
    if (entry.kind !== "seasonal" && entry.kind !== "liturgical") throw new Error(`${id}: kind desconhecido: ${entry.kind}`);
    if (typeof entry.gesture !== "function") throw new Error(`${id}: sem gesto`);
    try {
      return TIERS.map((tier) => ({ suffix: tier.suffix, lottie: buildTier(entry, tier) }));
    } catch (err) {
      throw new Error(`${id}: ${err.message}`);
    }
  }

  function checkUniqueIcons(entries) {
    const seen = new Map();
    for (const e of entries) {
      if (seen.has(e.icon)) throw new Error(`Desenho repetido: ${e.id} e ${seen.get(e.icon)} usam ${e.icon}`);
      seen.set(e.icon, e.id);
    }
  }

  /**
   * Monta o lote todo e só então escreve; recusa ids já aprovados. `self` é o
   * arquivo do gerador, que precisa estar no registro (lottie-lib/lots.js): ids
   * e peças principais não se repetem dentro do lote nem entre lotes.
   */
  function main(TROPHIES, { self } = {}) {
    const lots = require("./lots").registeredLots();
    if (!lots.some((l) => l.file === self)) throw new Error(`Lote não registrado em lottie-lib/lots.js: ${self}`);
    const others = lots.filter((l) => l.file !== self).flatMap((l) => l.TROPHIES);
    checkUniqueIds([...others, ...TROPHIES]);
    checkUniqueIcons([...others, ...TROPHIES]);
    const approved = lib.readApprovedIds();
    const blocked = TROPHIES.filter((e) => approved.has(e.id));
    if (blocked.length) {
      console.error(`Recusado: já aprovados em APPROVED_LOTTIE: ${blocked.map((e) => e.id).join(", ")}. Nada foi escrito.`);
      process.exit(1);
    }
    // Monta tudo antes de escrever: um erro não deixa lote pela metade.
    const outputs = TROPHIES.flatMap((entry) =>
      buildTrophy(entry).map(({ suffix, lottie }) => ({ id: entry.id, suffix, lottie })));
    for (const { id, suffix, lottie } of outputs) {
      console.log(`✓ ${lib.writeTrophy(id, suffix, lottie, { approved })}`);
    }
    console.log(`Done: ${outputs.length} arquivos.`);
  }

  return { piece, pt, pieces, pieceAt, buildTrophy, checkUniqueIcons, checkUniqueIds, main };
}

/** Id repetido (dentro de um lote ou entre lotes) lança erro. */
function checkUniqueIds(entries) {
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.id)) throw new Error(`Id repetido: ${e.id} aparece mais de uma vez nos lotes`);
    seen.add(e.id);
  }
}

module.exports = {
  END, ART_SCALE, TIERS, LITURGICAL_COLORS, HALO_GOLD, RAY_GOLD, CONFETE_OURO,
  L, add, flutuar, deslocar, stroke, reta, aureola, raios, fracoes, pontosAoLongo,
  checkUniqueIds, makeLot,
};
