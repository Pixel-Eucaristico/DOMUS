/**
 * desenhos — formas desenhadas no próprio código (sem fonte externa) e
 * camadas de efeito reaproveitáveis pelos lotes de troféus com gesto
 * (Story 11.7): retângulos e formas livres, hóstia, coroa de espinhos, vela
 * comprida, brilho, chuva de pedacinhos e pétala. Começaram no lote 2
 * (`scripts/trophy-lot-2.js`). O lote 3 acrescentou a cor de pele comum, o busto
 * simples de pessoa (no estilo de Maria Mãe de Deus e de Santa Águeda), a
 * chama e o livro aberto desenhados, o terço católico (antes só no lote 2), a
 * concha de vieira e as ajudas de espelhar e deslocar formas.
 */
const lib = require("./index");
const { anim, onda, aparecer, hex, polyline } = lib;
const { END, L, stroke, reta } = require("./trophy-kit");

/** Retângulo fechado (x0, y0) → (x1, y1). */
const rect = (x0, y0, x1, y1) => polyline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { smooth: false, closed: true });
/** Forma fechada suave pelos pontos. */
const forma = (points) => polyline(points, { closed: true });
/** Forma fechada com cantos retos. */
const poligono = (points) => polyline(points, { smooth: false, closed: true });
/** Preenchimento com cor "#RRGGBB". */
const fill = (shapes, color, name, opacity) => lib.makeFill(shapes, hex(color), name, opacity);

/** Hóstia: círculo branco com a cruz gravada, centrada em (0,0). */
function hostiaShapes(r) {
  return [
    stroke([reta([[0, -r * 0.55], [0, r * 0.55]]), reta([[-r * 0.55, 0], [r * 0.55, 0]])], Math.max(1.2, r * 0.12), hex("#E6D3A3"), "Cruz"),
    lib.makeEllipseRing(0, 0, r * 0.86, r * 0.86, Math.max(0.8, r * 0.06), hex("#EFE3C4"), "Borda"),
    lib.makeEllipse(0, 0, r, r, hex("#FFFBF0"), "Hostia"),
  ];
}

/** Coroa de espinhos: anel trançado com pontas, centrado em (0,0). */
function espinhosShapes(rx, ry, color = "#8A4633") {
  const ring = Array.from({ length: 24 }, (_, k) => {
    const a = (k / 24) * Math.PI * 2;
    const w = k % 2 ? 0.88 : 1.12;
    return [rx * w * Math.cos(a), ry * w * Math.sin(a)];
  });
  const spikes = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2 + 0.3;
    const [x, y] = [rx * Math.cos(a), ry * Math.sin(a)];
    return reta([[x, y], [x * 1.28 + (k % 2 ? 2 : -2), y * 1.5 - 2]]);
  });
  return [
    stroke(spikes, 1.6, hex(color), "Pontas"),
    stroke([polyline(ring, { closed: true })], 2.6, hex(color), "Trama"),
  ];
}

/** Vela comprida (de cera), centrada em (0,0), de pé: altura `h`, largura `w`. */
function velaComprida(h, w, cor = "#FFF1C1") {
  return [
    stroke([reta([[0, -h / 2], [0, -h / 2 - 4]])], 1.4, hex("#292F33"), "Pavio"),
    fill([rect(-w / 2 + 1.2, -h / 2, -w / 2 + 2.4, h / 2 - 2)], "#FFFFFF", "Reflexo", 70),
    fill([rect(-w / 2, -h / 2, w / 2, h / 2)], cor, "Cera"),
  ];
}

/** Brilho suave (elipse) que acende e pulsa. */
function brilho(nm, p, { rx = 20, ry = rx, color = "#FFE8A3", t0 = 30, peak = 45, period = 24 } = {}) {
  return L(nm, [lib.makeEllipse(0, 0, rx, ry, hex(color), "Brilho")], {
    p, o: anim([...aparecer(t0, 8, { to: peak }), ...onda(peak, -peak * 0.35, t0 + 8, END, { period })]),
  });
}

/** Quadros que cada pedacinho da chuva precisa: aparece em 4 e, com `fade`, some em 6. */
const CHUVA_APARECE = 4, CHUVA_SOME = 6;
/** Atraso máximo (quadros) do início de cada pedacinho depois de t0. */
const CHUVA_ATRASO = 10;

/**
 * Chuva de pedacinhos (pétalas, corações, lascas, pixels, poeira): `count`
 * camadas que caem girando dentro de `area` = [x0, y0, x1, y1], a partir de t0
 * (cada uma com até CHUVA_ATRASO quadros de atraso) durante `dur` quadros,
 * cortados no fim do laço. `shape(k)` devolve os grupos de cada pedacinho,
 * centrados em (0,0).
 */
function chuva(nm, shape, { count = 6, t0 = 40, dur = 36, area = [40, 34, 160, 130], seed = 5, spin = 270, fade = true } = {}) {
  if (!(Number.isFinite(t0) && t0 >= 0)) throw new Error(`chuva: início ${t0} inválido`);
  if (!(Number.isFinite(dur) && dur > 0)) throw new Error(`chuva: duração ${dur} inválida`);
  // pior caso: o pedacinho mais atrasado começa em t0 + CHUVA_ATRASO e termina no último quadro do laço
  const sobra = Math.min(END - 1 - (t0 + CHUVA_ATRASO), dur);
  const precisa = CHUVA_APARECE + (fade ? CHUVA_SOME : 0);
  if (!(sobra > precisa)) {
    throw new Error(`chuva: cada pedacinho precisa de mais de ${precisa} quadros (${fade ? "aparecer e sumir" : "aparecer"}), `
      + `mas com início ${t0} (+${CHUVA_ATRASO} de atraso) e duração ${dur} sobram ${sobra} até o quadro ${END - 1}`);
  }
  const rnd = lib.seeded(seed);
  const [x0, y0, x1, y1] = area;
  return Array.from({ length: count }, (_, k) => {
    const x = x0 + ((x1 - x0) * (k + 0.5)) / count + (rnd() - 0.5) * 8;
    const drift = (rnd() - 0.5) * 14;
    const start = t0 + rnd() * CHUVA_ATRASO;
    const end = Math.min(END - 1, start + dur);
    const turn = (rnd() < 0.5 ? -1 : 1) * spin * (0.6 + rnd() * 0.4);
    return L(`${nm}${k}`, shape(k), {
      p: anim([[0, [x, y0]], [start, [x, y0], "linear"], [end, [x + drift, y1]]]),
      r: anim([[0, 0], [start, 0, "linear"], [end, turn]]),
      o: anim(fade
        ? [[0, 0], [start, 0], [start + CHUVA_APARECE, 100], [end - CHUVA_SOME, 100], [end, 0]]
        : [[0, 0], [start, 0], [start + CHUVA_APARECE, 100]]),
    });
  });
}

/** Folha/pétala: elipse pequena. */
const petala = (color, rx = 2.6, ry = 4.2) => [lib.makeEllipse(0, 0, rx, ry, hex(color), "Petala")];

/** Cor de pele comum das pessoas desenhadas do lote 3 (bustos, mãos e o corpo do crucifixo) e a sua sombra. */
const PELE = "#F7DECE";
const PELE_SOMBRA = "#E0B49A";

/**
 * Busto simples de pessoa, no estilo do manto de Maria Mãe de Deus (lote 1) e
 * da jovem de Santa Águeda (lote 2): rosto de olhos fechados, bochechas e
 * boca, pescoço e veste até os ombros. Centrado no rosto (0,0), com escala
 * `k`; com k = 1 o rosto tem 22 × 28 px (x ±11, y ±14).
 * - Com `manto` (manto de capuz que cobre a cabeça e cai até a base, como o de
 *   Maria; a veste aparece no meio; `orla` opcional contorna o manto): o
 *   desenho vai de y = −29 a 75 e de x = −44 a 44 (vezes k).
 * - Sem manto: cabelo `cabelo` ("curto", o padrão, ou "longo") na cor
 *   `corCabelo` e veste nos ombros; vai de y = −18 (cabelo longo; −17,5 o
 *   curto) a 70 e de x = −36 a 36 (vezes k). `barba` (cor) desenha a barba,
 *   e então o rosto fica sem bochechas.
 * `manto` com `cabelo` ou `corCabelo` lança erro (o capuz cobre o cabelo).
 * Devolve os grupos da frente para trás.
 */
function busto(k = 1, { pele = PELE, veste = "#BE1931", manto = null, orla = null, cabelo, corCabelo, barba = null } = {}) {
  if (!(Number.isFinite(k) && k > 0)) throw new Error(`busto: escala inválida ${k}`);
  if (manto && (cabelo !== undefined || corCabelo !== undefined)) throw new Error("busto: manto não combina com cabelo/corCabelo (o capuz cobre o cabelo)");
  if (!manto && orla) throw new Error("busto: orla só vale com manto");
  cabelo = cabelo ?? "curto";
  corCabelo = corCabelo ?? "#963B22";
  if (!["curto", "longo"].includes(cabelo)) throw new Error(`busto: cabelo ${JSON.stringify(cabelo)} (use "curto" ou "longo")`);
  const P = (pts) => pts.map(([x, y]) => [x * k, y * k]);
  const olho = (sx) => polyline(P([[sx * 6 - 3, -1], [sx * 6, 1], [sx * 6 + 3, -1]]));
  const frente = [
    stroke([olho(-1), olho(1)], 1.3 * k, hex("#662113"), "Olhos"),
    stroke([polyline(P([[-2.5, 8], [0, 9], [2.5, 8]]))], 1.2 * k, hex("#C1694F"), "Boca"),
  ];
  if (barba) {
    frente.push(fill([forma(P([[-11, 0], [-10, 10], [-5, 18], [0, 20], [5, 18], [10, 10], [11, 0], [6, 8], [0, 10.5], [-6, 8]]))], barba, "Barba"));
  } else {
    frente.push(
      lib.makeEllipse(-7 * k, 6 * k, 2.6 * k, 1.6 * k, hex("#F4ABBA"), "Face1", 80),
      lib.makeEllipse(7 * k, 6 * k, 2.6 * k, 1.6 * k, hex("#F4ABBA"), "Face2", 80),
    );
  }
  const rosto = lib.makeEllipse(0, 0, 11 * k, 14 * k, hex(pele), "Rosto");
  const pescoco = fill([rect(-4 * k, 8 * k, 4 * k, 20 * k)], pele, "Pescoco");
  if (manto) {
    // o manto de Maria Mãe de Deus (lote 1), com o rosto em (0,0)
    const capuz = forma(P([[0, -29], [18, -23], [27, -5], [29, 21], [36, 49], [44, 71], [0, 75], [-44, 71], [-36, 49], [-29, 21], [-27, -5], [-18, -23]]));
    const frenteVeste = forma(P([[0, 15], [10, 27], [15, 71], [-15, 71], [-10, 27]]));
    return [
      ...frente, rosto,
      fill([frenteVeste], veste, "Veste"),
      ...(orla ? [stroke([capuz], 1.6 * k, hex(orla), "Orla")] : []),
      fill([capuz], manto, "Manto"),
    ];
  }
  const ombros = forma(P([[0, 16], [14, 20], [28, 32], [34, 56], [36, 70], [-36, 70], [-34, 56], [-28, 32], [-14, 20]]));
  const decote = forma(P([[-7, 18], [7, 18], [0, 28]]));
  const fios = cabelo === "longo"
    ? forma(P([[0, -18], [13, -12], [16, 4], [17, 28], [8, 34], [-8, 34], [-17, 28], [-16, 4], [-13, -12]]))
    : forma(P([[0, -17.5], [12, -13], [14, -2], [12, 4], [-12, 4], [-14, -2], [-12, -13]]));
  return [...frente, rosto, pescoco, fill([decote], pele, "Decote"), fill([ombros], veste, "Veste"), fill([fios], corCabelo, "Cabelo")];
}

/**
 * Chama desenhada (sem emoji), com o pé em (0,0) e altura `h`: língua externa
 * laranja e miolo amarelo, levemente torta para o lado.
 */
function chamaShapes(h) {
  if (!(Number.isFinite(h) && h > 0)) throw new Error(`chamaShapes: altura inválida ${h}`);
  const w = h * 0.62;
  const lingua = (f, dx) => forma([[dx + w * 0.08 * f, -h * f], [dx + w * 0.3 * f, -h * 0.6 * f], [dx + w * 0.48 * f, -h * 0.3 * f], [dx + w * 0.36 * f, -h * 0.06 * f],
    [dx, 0], [dx - w * 0.36 * f, -h * 0.06 * f], [dx - w * 0.48 * f, -h * 0.3 * f], [dx - w * 0.26 * f, -h * 0.58 * f], [dx - w * 0.06 * f, -h * 0.7 * f]]);
  return [
    fill([lingua(0.32, 0)], "#FFF1C1", "Centro"),
    fill([lingua(0.62, 0)], "#FFCC4D", "Miolo"),
    fill([lingua(1, 0)], "#F4900C", "Chama"),
  ];
}

/**
 * Livro aberto desenhado (sem emoji), centrado em (0,0), `w` × `h` px: capa
 * na cor `capa`, duas páginas em arco e linhas de texto.
 */
function livroAbertoShapes(w, h, capa = "#8A4633") {
  if (!(w > 0 && h > 0)) throw new Error(`livroAbertoShapes: medidas inválidas ${w} × ${h}`);
  const W = w / 2, H = h / 2;
  const pagina = (s) => forma([[0, -H + 3], [s * W * 0.5, -H], [s * (W - 2), -H + 2], [s * (W - 2), H - 4], [s * W * 0.5, H - 6], [0, H - 3]]);
  const linhas = [];
  for (let k = 0; k < 4; k++) {
    const y = -H + 8 + (k * (h - 16)) / 3;
    for (const s of [-1, 1]) linhas.push(reta([[s * W * 0.16, y], [s * W * 0.78, y - 1]]));
  }
  return [
    stroke(linhas, 1, hex("#AAB8C2"), "Linhas"),
    stroke([reta([[0, -H + 3], [0, H - 3]])], 1, hex("#CCD6DD"), "Dobra"),
    fill([pagina(-1), pagina(1)], "#F5F8FA", "Paginas"),
    fill([forma([[0, -H + 5], [W, -H + 2], [W, H], [0, H + 1], [-W, H], [-W, -H + 2]])], capa, "Capa"),
  ];
}

/**
 * Terço católico desenhado, pendurado pelo alto do laço em (0,0): laço de
 * cinco dezenas (10 contas pequenas, separadas por 1 conta maior), medalha na
 * junção e o pendente com 1 conta grande, 3 pequenas, 1 grande e o crucifixo.
 * Começou no terço de Nossa Senhora de Lourdes (lote 2); as cores das contas
 * são opção (o padrão é o do lote 2).
 */
function tercoShapes({ contaGrande = "#744EAA", contaPequena = "#553788" } = {}) {
  const RX = 14, RY = 13, CY = 14, BAIXO = CY + RY;
  const seq = [];
  for (let d = 0; d < 5; d++) {
    if (d > 0) seq.push("G");
    for (let k = 0; k < 10; k++) seq.push("p");
  }
  const vagas = seq.length + 2; // a medalha ocupa o lugar de duas contas
  const pequenas = [], grandes = [];
  seq.forEach((tipo, k) => {
    const ang = Math.PI / 2 + ((k + 1.5) / vagas) * Math.PI * 2;
    (tipo === "G" ? grandes : pequenas).push([RX * Math.cos(ang), CY + RY * Math.sin(ang)]);
  });
  for (const [x, y, tipo] of [[0, BAIXO + 3.4, "G"], [0, BAIXO + 6.4, "p"], [0, BAIXO + 8.6, "p"], [0, BAIXO + 10.8, "p"], [0, BAIXO + 13.8, "G"]]) {
    (tipo === "G" ? grandes : pequenas).push([x, y]);
  }
  const topoCruz = BAIXO + 15.6;
  const contas = (centros, r, cor, nm) => ({
    ty: "gr", nm, hd: false,
    it: [...centros.map(([x, y]) => lib.makeEllipse(x, y, r, r, hex(cor), nm)),
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }],
  });
  return [
    fill([rect(-0.9, topoCruz, 0.9, topoCruz + 10), rect(-3.2, topoCruz + 2.2, 3.2, topoCruz + 3.8)], "#FFCC4D", "Crucifixo"),
    lib.makeEllipse(0, BAIXO, 1.8, 1.5, hex("#CCD6DD"), "Medalha"),
    contas(grandes, 1.7, contaGrande, "ContasGrandes"),
    contas(pequenas, 0.95, contaPequena, "ContasPequenas"),
    stroke([reta([[0, BAIXO], [0, topoCruz]])], 0.5, hex("#AAB8C2"), "CordaPendente"),
    lib.makeEllipseRing(0, CY, RX, RY, 0.5, hex("#AAB8C2"), "Corda"),
  ];
}

/**
 * Concha de vieira (do peregrino de Santiago e do batismo), com a charneira
 * em (0, r·0,55) e o leque de sete gomos aberto para cima; `r` é o raio do leque.
 */
function conchaShapes(r, { cor = "#FFE8B6", sulco = "#E8A87C", orelha = "#F4C28C" } = {}) {
  if (!(Number.isFinite(r) && r > 0)) throw new Error(`conchaShapes: raio inválido ${r}`);
  const base = [0, r * 0.55], N = 7;
  const borda = [];
  for (let k = 0; k <= 2 * N; k++) {
    const a = Math.PI * (1.08 + (0.84 * k) / (2 * N));
    const rr = r * (k % 2 ? 0.93 : 1);
    borda.push([rr * Math.cos(a), rr * Math.sin(a) + r * 0.1]);
  }
  const leque = forma([base, ...borda]);
  const sulcos = Array.from({ length: N - 1 }, (_, k) => reta([base, borda[2 * k + 2]]));
  const orelhas = poligono([[base[0] - r * 0.34, base[1] - r * 0.16], [base[0] + r * 0.34, base[1] - r * 0.16], [base[0] + r * 0.22, base[1] + r * 0.12], [base[0] - r * 0.22, base[1] + r * 0.12]]);
  return [
    stroke(sulcos, Math.max(0.8, r * 0.06), hex(sulco), "Sulcos"),
    fill([orelhas], orelha, "Orelhas"),
    fill([leque], cor, "Leque"),
  ];
}

/** Confere que o grupo só tem shapes estáticas, elipses estáticas e transformação neutra (para espelhar ou deslocar). */
function conferirGrupo(it, who) {
  if (it.ty === "rc" || it.ty === "sr") throw new Error(`${who}: item "${it.ty}" (retângulo/estrela) não suportado; use caminhos`);
  if (it.ty === "sh" && it.ks.a === 1) throw new Error(`${who}: caminho animado não suportado`);
  if (it.ty === "el" && (it.p.a === 1 || it.s.a === 1)) throw new Error(`${who}: elipse animada não suportada`);
  if (it.ty === "tr") {
    const zero = (prop) => prop.a !== 1 && prop.k.every((v) => v === 0);
    if (!zero(it.p) || !zero(it.a)) throw new Error(`${who}: grupo com deslocamento na transformação (p ${JSON.stringify(it.p.k)}, a ${JSON.stringify(it.a.k)}) não suportado`);
  }
}

/** Espelha grupos de shapes no eixo x = 0 (vértices, tangentes e elipses), sem mexer no original. */
function espelhar(groups) {
  const flipPt = ([x, y]) => [-x, y];
  const walk = (it) => {
    conferirGrupo(it, "espelhar");
    if (it.ty === "gr") return { ...it, it: it.it.map(walk) };
    if (it.ty === "sh") return { ...it, ks: { ...it.ks, k: { ...it.ks.k, v: it.ks.k.v.map(flipPt), i: it.ks.k.i.map(flipPt), o: it.ks.k.o.map(flipPt) } } };
    if (it.ty === "el") return { ...it, p: { ...it.p, k: flipPt(it.p.k) } };
    return it;
  };
  return groups.map(walk);
}

/** Desloca grupos de shapes de (dx, dy) (vértices e elipses; as tangentes são relativas e não mudam), sem mexer no original. */
function transladar(groups, d) {
  if (!Array.isArray(d) || d.length !== 2 || !d.every(Number.isFinite)) throw new Error(`transladar: deslocamento inválido ${JSON.stringify(d)}`);
  const [dx, dy] = d;
  const mv = ([x, y]) => [x + dx, y + dy];
  const walk = (it) => {
    conferirGrupo(it, "transladar");
    if (it.ty === "gr") return { ...it, it: it.it.map(walk) };
    if (it.ty === "sh") return { ...it, ks: { ...it.ks, k: { ...it.ks.k, v: it.ks.k.v.map(mv) } } };
    if (it.ty === "el") return { ...it, p: { ...it.p, k: mv(it.p.k) } };
    return it;
  };
  return groups.map(walk);
}

module.exports = { rect, forma, poligono, fill, hostiaShapes, espinhosShapes, velaComprida, brilho, chuva, petala, PELE, PELE_SOMBRA, busto, chamaShapes, livroAbertoShapes, tercoShapes, conchaShapes, espelhar, transladar };
