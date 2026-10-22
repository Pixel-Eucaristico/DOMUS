/**
 * desenhos — formas desenhadas no próprio código (sem fonte externa) e
 * camadas de efeito reaproveitáveis pelos lotes de troféus com gesto
 * (Story 11.7): retângulos e formas livres, hóstia, coroa de espinhos, vela
 * comprida, brilho, chuva de pedacinhos e pétala. Começaram no lote 2
 * (`scripts/trophy-lot-2.js`). O lote 3 acrescentou a cor de pele comum, o busto
 * simples de pessoa (no estilo de Maria Mãe de Deus e de Santa Águeda), a
 * chama e o livro aberto desenhados, o terço católico (antes só no lote 2), a
 * concha de vieira e as ajudas de espelhar e deslocar formas. O lote 4 acrescentou
 * a coroa, a palma, a estrela, a asa, o coração, a lágrima, o galero e a pomba. O
 * lote 5 acrescentou a pele escura, o rosto de homem (`masculino`, `bustoHomem`,
 * `figuraHomem`), o grupo animado, as contas do terço por dezena, as letras de
 * traço, a rosa, o lírio e o pão.
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

/**
 * Coroa de espinhos: anel trançado com pontas, centrado em (0,0). Com
 * `metade` ("frente" = arco de baixo, y > 0; "tras" = arco de cima) devolve só
 * aquela metade, para a coroa envolver uma peça: a frente numa camada na
 * frente dela e o resto numa camada atrás.
 */
function espinhosShapes(rx, ry, color = "#8A4633", opts = {}) {
  const { metade = null } = opts || {};
  if (metade !== null && metade !== "frente" && metade !== "tras") throw new Error(`espinhosShapes: metade ${JSON.stringify(metade)} (use "frente" ou "tras")`);
  const pontoAnel = (k) => {
    const a = (k / 24) * Math.PI * 2;
    const w = k % 2 ? 0.88 : 1.12;
    return [rx * w * Math.cos(a), ry * w * Math.sin(a)];
  };
  const naMetade = (a) => metade === null || (metade === "frente" ? Math.sin(a) >= 0 : Math.sin(a) < 0);
  // cada ponta guarda o próprio índice (a paridade decide para que lado ela entorta)
  const spikes = Array.from({ length: 10 }, (_, k) => ({ k, a: (k / 10) * Math.PI * 2 + 0.3 })).filter(({ a }) => naMetade(a)).map(({ k, a }) => {
    const [x, y] = [rx * Math.cos(a), ry * Math.sin(a)];
    let ty = y * 1.5 - 2;
    // numa metade, a ponta não passa para a outra metade
    if (metade === "frente") ty = Math.max(ty, 0);
    if (metade === "tras") ty = Math.min(ty, 0);
    return reta([[x, y], [x * 1.28 + (k % 2 ? 2 : -2), ty]]);
  });
  const anel = metade === null
    ? polyline(Array.from({ length: 24 }, (_, k) => pontoAnel(k)), { closed: true })
    : polyline(Array.from({ length: 13 }, (_, j) => pontoAnel(metade === "frente" ? j : 12 + j)));
  return [
    stroke(spikes, 1.6, hex(color), "Pontas"),
    stroke([anel], 2.6, hex(color), "Trama"),
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
 * Figura de corpo inteiro no estilo simples do `busto` (mesma cabeça, mesmo
 * tom de pele): rosto em (0,0), escala `k`; com k = 1 vai da cabeça (y −18;
 * −29 com manto) aos pés (y 108) e de x −34 a 34 no corpo (os braços abertos
 * chegam a ±46). Opções: `pele`; `tunica` (cor da túnica longa); `manto`
 * (manto de capuz até os pés, aberto na frente, com `orla` opcional; não
 * combina com cabelo); sem manto, `cabelo` ("curto" ou "longo"), `corCabelo`
 * e `barba`; `faixa` (cor de uma faixa que cruza o peito); `bracos`:
 * "abertos" (erguidos para os lados), "baixos", "postas" (mãos postas no
 * peito), "mostrando" (o direito, à esquerda de quem olha, aberto e o outro
 * baixo), "esquerdo" (só o braço à esquerda de quem olha, baixo; o outro vai
 * numa camada à parte) ou "nenhum"; `chaga` (desenha a
 * chaga do lado, em CHAGA·k, à esquerda de quem olha). Os ombros ficam em
 * OMBRO_E·k e OMBRO_D·k. `orla` sem `manto` e `manto` com cabelo lançam erro.
 * Devolve os grupos da frente para trás (braços, mãos, chaga e faixa na frente
 * do corpo e do manto).
 */
/** Pontos da figura com k = 1 (rosto em (0,0)): ombros e a chaga do lado (multiplique por k). */
const OMBRO_E = [-20, 26], OMBRO_D = [20, 26], CHAGA = [-11, 44];

function figura(k = 1, { pele = PELE, tunica = "#F5F8FA", manto = null, orla = null, cabelo, corCabelo, barba = null, faixa = null, bracos = "baixos", chaga = false } = {}) {
  if (!(Number.isFinite(k) && k > 0)) throw new Error(`figura: escala inválida ${k}`);
  if (manto && (cabelo !== undefined || corCabelo !== undefined)) throw new Error("figura: manto não combina com cabelo/corCabelo (o capuz cobre o cabelo)");
  if (!manto && orla) throw new Error("figura: orla só vale com manto");
  if (!["abertos", "baixos", "postas", "mostrando", "esquerdo", "nenhum"].includes(bracos)) throw new Error(`figura: bracos ${JSON.stringify(bracos)} desconhecido`);
  const P = (pts) => pts.map(([x, y]) => [x * k, y * k]);
  // a cabeça é a do busto, sem os ombros (o busto devolve rosto, pescoço, decote, veste e cabelo)
  const cabeca = busto(k, { pele, veste: tunica, manto, orla: null, cabelo, corCabelo, barba })
    .filter((g) => !["Veste", "Decote", "Manto", "Orla"].includes(g.nm));
  const corpo = forma(P([[0, 16], [14, 19], [24, 30], [26, 60], [32, 104], [-32, 104], [-26, 60], [-24, 30], [-14, 19]]));
  const manga = manto || tunica;
  const braco = (pts, nm) => {
    const fim = pts[pts.length - 1];
    return [lib.makeEllipse(fim[0] * k, fim[1] * k, 4.2 * k, 4.2 * k, hex(pele), `Mao${nm}`), stroke([polyline(P(pts))], 8 * k, hex(manga), `Braco${nm}`)];
  };
  const bracoPos = {
    abertos: [[OMBRO_E, [-34, 16], [-44, 2]], [OMBRO_D, [34, 16], [44, 2]]],
    baixos: [[OMBRO_E, [-26, 44], [-27, 62]], [OMBRO_D, [26, 44], [27, 62]]],
    mostrando: [[OMBRO_E, [-34, 22], [-44, 12]], [OMBRO_D, [26, 44], [27, 62]]],
    esquerdo: [[OMBRO_E, [-26, 44], [-27, 62]]],
  };
  const frente = [];
  if (bracos === "postas") {
    frente.push(
      fill([forma(P([[0, 30], [3.5, 38], [3, 46], [-3, 46], [-3.5, 38]]))], pele, "MaosPostas"),
      stroke([polyline(P([OMBRO_E, [-16, 44], [-4, 46]])), polyline(P([OMBRO_D, [16, 44], [4, 46]]))], 8 * k, hex(manga), "Bracos"),
    );
  } else if (bracos !== "nenhum") {
    const [esq, dir] = bracoPos[bracos];
    frente.push(...braco(esq, "E"), ...(dir ? braco(dir, "D") : []));
  }
  if (chaga) frente.push(lib.makeEllipse(CHAGA[0] * k, CHAGA[1] * k, 1.6 * k, 4 * k, hex("#BE1931"), "Chaga"));
  if (faixa) frente.push(stroke([reta(P([[18, 20], [-20, 70]]))], 6 * k, hex(faixa), "Faixa"));
  const pes = [lib.makeEllipse(-9 * k, 106 * k, 6 * k, 3 * k, hex(pele), "PeE"), lib.makeEllipse(9 * k, 106 * k, 6 * k, 3 * k, hex(pele), "PeD")];
  const pescoco = fill([rect(-4 * k, 8 * k, 4 * k, 20 * k)], pele, "Pescoco");
  if (manto) {
    const capa = forma(P([[0, -29], [18, -23], [27, -5], [29, 21], [32, 60], [38, 106], [-38, 106], [-32, 60], [-29, 21], [-27, -5], [-18, -23]]));
    const abertura = forma(P([[0, 15], [10, 27], [13, 104], [-13, 104], [-10, 27]]));
    return [
      ...frente, ...cabeca.filter((g) => g.nm !== "Pescoco"),
      fill([abertura], tunica, "Veste"),
      ...(orla ? [stroke([capa], 1.8 * k, hex(orla), "Orla")] : []),
      fill([capa], manto, "Manto"),
      ...pes,
    ];
  }
  const semPescoco = cabeca.filter((g) => g.nm !== "Pescoco" && g.nm !== "Cabelo");
  const cabelos = cabeca.filter((g) => g.nm === "Cabelo");
  return [...frente, ...semPescoco, pescoco, fill([corpo], tunica, "Veste"), ...cabelos, ...pes];
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
/** Laço do terço de `tercoShapes`: raios RX × RY e o centro em (0, CY) (também usado por `tercoContas`). */
const TERCO = { RX: 14, RY: 13, CY: 14 };

function tercoShapes({ contaGrande = "#744EAA", contaPequena = "#553788" } = {}) {
  const { RX, RY, CY } = TERCO, BAIXO = CY + RY;
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

// ── Lote 4 (agosto e setembro) ───────────────────────────────────────────────
// Desenhos próprios que substituem, nos gestos, peças do Twemoji que já são a
// peça principal de outro troféu (coroa 1f451, palma 1f33f, estrela 2b50,
// asa 1fabd, pomba 1f54a), e outros reaproveitáveis (coração, lágrima, galero).

/** Deixa pontas (sem curva) nos vértices `idxs` de uma forma suave; índice que não é inteiro entre 0 e o último vértice lança erro. */
function pontas(sh, idxs) {
  for (const k of idxs) {
    if (!(Number.isInteger(k) && k >= 0 && k < sh.v.length)) throw new Error(`pontas: índice inválido ${k} (a forma tem ${sh.v.length} vértices)`);
  }
  for (const k of idxs) { sh.i[k] = [0, 0]; sh.o[k] = [0, 0]; }
  return sh;
}

/** Confere uma medida (largura, altura, raio) finita e positiva. */
function medida(quem, nome, v) {
  if (!(Number.isFinite(v) && v > 0)) throw new Error(`${quem}: ${nome} inválid${["raio", "comprimento"].includes(nome) ? "o" : "a"} ${v}`);
}

/**
 * Coroa desenhada, com o meio da base em (0,0): `w` de largura e 0,7·w de
 * altura, `n` pontas com bolinhas e pedras na faixa da base.
 */
function coroaShapes(w, { cor = "#FFCC4D", faixa = "#F4900C", joia = "#DD2E44", bola = "#FFE8B6", n = 5 } = {}) {
  medida("coroaShapes", "largura", w);
  if (!(Number.isInteger(n) && n >= 3)) throw new Error(`coroaShapes: pontas inválidas ${n}`);
  const h = w * 0.7, W = w / 2;
  const topo = [[-W, 0], [-W, -h]];
  for (let k = 1; k < n; k++) {
    const x = -W + (k * w) / (n - 1);
    topo.push([x - w / (2 * (n - 1)), -h * 0.45], [x, -h]);
  }
  topo.push([W, 0]);
  const picos = Array.from({ length: n }, (_, k) => [-W + (k * w) / (n - 1), -h]);
  return [
    ...[-0.5, 0, 0.5].map((f, k) => lib.makeEllipse(f * W, -h * 0.15, w * 0.06, w * 0.05, hex(joia), `Pedra${k}`)),
    ...picos.map(([x, y], k) => lib.makeEllipse(x, y, w * 0.055, w * 0.055, hex(bola), `Bola${k}`)),
    fill([rect(-W, -h * 0.3, W, 0)], faixa, "Faixa"),
    fill([poligono(topo)], cor, "Coroa"),
  ];
}

/**
 * Palma do martírio desenhada (sem emoji), com o pé do talo em (0,0) e altura
 * `h`: talo levemente curvo e folíolos estreitos dos dois lados.
 */
function palmaShapes(h, { cor = "#5C913B", claro = "#77B255", talo = "#3E721D" } = {}) {
  medida("palmaShapes", "altura", h);
  const at = (u) => [h * 0.14 * u * u, -h * u];
  const foliolo = (u, lado) => {
    const [x, y] = at(u);
    const comp = h * (0.34 - 0.24 * u) + h * 0.06, larg = h * 0.035;
    const d = [lado * 0.82, -0.57];
    const meio = [x + d[0] * comp * 0.5, y + d[1] * comp * 0.5], nl = [-d[1] * larg, d[0] * larg];
    return forma([[x, y], [meio[0] + nl[0], meio[1] + nl[1]], [x + d[0] * comp, y + d[1] * comp], [meio[0] - nl[0], meio[1] - nl[1]]]);
  };
  const us = Array.from({ length: 9 }, (_, k) => 0.2 + k * 0.09);
  return [
    fill([...us.map((u) => foliolo(u, 1)), foliolo(1, 0.2)], claro, "FoliolosD"),
    fill(us.map((u) => foliolo(u, -1)), cor, "FoliolosE"),
    stroke([polyline(Array.from({ length: 7 }, (_, k) => at(k / 6)))], Math.max(1, h * 0.035), hex(talo), "Talo"),
  ];
}

/** Estrela de cinco pontas desenhada, centrada em (0,0), raio `r` (ponta para cima). */
function estrelaShapes(r, { cor = "#FFCC4D", miolo = null } = {}) {
  medida("estrelaShapes", "raio", r);
  const pts = Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    return [rr * Math.cos(a), rr * Math.sin(a)];
  });
  return [...(miolo ? [lib.makeEllipse(0, 0, r * 0.28, r * 0.28, hex(miolo), "Miolo")] : []), fill([poligono(pts)], cor, "Estrela")];
}

/**
 * Asa desenhada (sem emoji), com a raiz em (0,0), abrindo para a direita e
 * para cima até (w, −w); `espelhar` faz a outra asa do par.
 */
function asaShapes(w, { cor = "#F5F8FA", sombra = "#CCD6DD" } = {}) {
  medida("asaShapes", "largura", w);
  const P = (pts) => pts.map(([x, y]) => [x * w, y * w]);
  const contorno = pontas(forma(P([[0, 0], [0.12, -0.42], [0.42, -0.78], [0.98, -1], [0.82, -0.66], [1, -0.56], [0.74, -0.34], [0.86, -0.2], [0.52, -0.06], [0.58, 0.08], [0.2, 0.1]])), [3, 5, 7, 9]);
  return [
    stroke([lib.polyline(P([[0.2, -0.2], [0.5, -0.5], [0.8, -0.78]])), lib.polyline(P([[0.2, -0.08], [0.5, -0.25], [0.74, -0.44]])), lib.polyline(P([[0.18, 0.02], [0.4, -0.06], [0.6, -0.14]]))], Math.max(0.8, w * 0.035), hex(sombra), "Penas"),
    fill([contorno], cor, "Asa"),
  ];
}

/** Coração desenhado (sem emoji), centrado em (0,0), largura `w` (altura ≈ 0,9·w). */
function coracaoShapes(w, { cor = "#DD2E44", brilho = "#F4ABBA" } = {}) {
  medida("coracaoShapes", "largura", w);
  const P = (pts) => pts.map(([x, y]) => [x * w, y * w]);
  const c = pontas(forma(P([[0, -0.24], [0.14, -0.42], [0.36, -0.44], [0.5, -0.24], [0.44, 0.04], [0.22, 0.26], [0, 0.46], [-0.22, 0.26], [-0.44, 0.04], [-0.5, -0.24], [-0.36, -0.44], [-0.14, -0.42]])), [0, 6]);
  return [
    lib.makeEllipse(-0.25 * w, -0.24 * w, 0.08 * w, 0.06 * w, hex(brilho), "Reflexo", 80),
    fill([c], cor, "Coracao"),
  ];
}

/** Lágrima (gota) desenhada, com o meio da parte redonda em (0,0), raio `r` e a ponta para cima. */
function lagrimaShapes(r, { cor = "#5DADEC" } = {}) {
  medida("lagrimaShapes", "raio", r);
  return [fill([pontas(forma([[0, -2.2 * r], [0.55 * r, -0.95 * r], [r, 0.05 * r], [0.7 * r, 0.75 * r], [0, r], [-0.7 * r, 0.75 * r], [-r, 0.05 * r], [-0.55 * r, -0.95 * r]]), [0])], cor, "Lagrima")];
}

/** Chapéu de cardeal (galero), com o meio das abas em (0,0) e `w` de largura das abas (48 = o do lote 3): copa, abas, cordões e borlas. */
function galeroShapes(w, { copa = "#DD2E44", abas = "#BE1931", cordao = "#A0041E" } = {}) {
  medida("galeroShapes", "largura", w);
  const k = w / 48;
  const P = (pts) => pts.map(([x, y]) => [x * k, y * k]);
  return [
    stroke([reta(P([[-21, 1], [-25, 16]])), reta(P([[21, 1], [25, 16]]))], 1.2 * k, hex(cordao), "Cordoes"),
    fill([poligono(P([[-25, 15], [-28, 21], [-22, 21]])), poligono(P([[25, 15], [22, 21], [28, 21]]))], cordao, "Borlas"),
    fill([forma(P([[-10, 0], [-9, -8], [0, -11], [9, -8], [10, 0]]))], copa, "Copa"),
    lib.makeEllipse(0, 0, 24 * k, 5 * k, hex(abas), "Abas"),
  ];
}

/**
 * Pomba branca desenhada (sem emoji), pousada e olhando para a direita, com o
 * meio do corpo em (0,0) e `w` de comprimento (do rabo ao bico); os pés em
 * (0, 0,22·w).
 */
function pombaShapes(w) {
  medida("pombaShapes", "comprimento", w);
  const P = (pts) => pts.map(([x, y]) => [x * w, y * w]);
  return [
    lib.makeEllipse(0.33 * w, -0.24 * w, 0.025 * w, 0.025 * w, hex("#292F33"), "Olho"),
    fill([poligono(P([[0.4, -0.24], [0.5, -0.2], [0.4, -0.17]]))], "#F4900C", "Bico"),
    fill([forma(P([[-0.2, -0.08], [0.05, -0.14], [0.2, -0.06], [0.06, 0.06], [-0.24, 0.06], [-0.4, 0.02]]))], "#CCD6DD", "AsaFechada"),
    lib.makeEllipse(0.3 * w, -0.2 * w, 0.11 * w, 0.1 * w, hex("#FFFFFF"), "Cabeca"),
    fill([forma(P([[-0.5, -0.04], [-0.2, -0.1], [0.1, -0.14], [0.28, -0.1], [0.26, 0.06], [0.1, 0.16], [-0.16, 0.14], [-0.5, 0.06]]))], "#F5F8FA", "Corpo"),
    stroke([reta(P([[-0.02, 0.14], [-0.04, 0.22]])), reta(P([[0.06, 0.14], [0.06, 0.22]]))], Math.max(0.8, w * 0.03), hex("#F4900C"), "Pes"),
  ];
}

// ── Lote 5 (outubro a dezembro) ──────────────────────────────────────────────
// Pele escura comum (a imagem de Aparecida e São Martinho de Porres), o rosto de
// homem (para que padres, bispos e santos se leiam como homens), grupo com
// transformação animada (para acender peças uma a uma numa só camada), as
// contas do terço por dezena, letras de traço, rosa, lírio e pão desenhados.

/** Tom de pele escuro comum (a imagem de Aparecida e São Martinho de Porres). */
const PELE_ESCURA = "#8D5A3B";

/** Grupo com vários itens dentro (sem preenchimento próprio), com transformação neutra. */
function grupo(nm, items) {
  return { ty: "gr", nm, hd: false, it: [...items, { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, hd: false }] };
}

/**
 * Grupo com transformação animada: `o` (opacidade), `s` (escala [sx, sy]),
 * `p` (posição), `r` (rotação) e `a` (âncora), cada um valor fixo ou
 * `anim(...)`. Serve para acender, uma a uma, peças de uma mesma camada.
 */
function grupoAnimado(nm, items, { o = 100, s = [100, 100], p = [0, 0], a = [0, 0], r = 0 } = {}) {
  // valor já no formato Lottie ({ a: 0 | 1, k }) passa direto; o resto vira valor fixo
  const prop = (v) => (v && typeof v === "object" && !Array.isArray(v) && (v.a === 0 || v.a === 1) ? v : { a: 0, k: v });
  return { ty: "gr", nm, hd: false, it: [...items, { ty: "tr", p: prop(p), a: prop(a), s: prop(s), r: prop(r), o: prop(o), hd: false }] };
}

/**
 * Deixa um busto ou uma figura (sem manto) com rosto de homem: cabelo curto
 * rente (com `tonsura`, a coroa raspada dos frades), orelhas, sobrancelhas,
 * olhos abertos, nariz, sem as bochechas rosadas; `bigode` (cor) opcional.
 * Recebe os grupos do `busto` ou da `figura` (rosto em (0,0), escala `k`) e
 * devolve os grupos da frente para trás, com os mesmos nomes (Rosto, Olhos,
 * Cabelo, Veste…). Lança erro se o desenho não tem rosto ou tem manto.
 */
function masculino(groups, k, { pele = null, corCabelo = "#5C3A21", bigode = null, tonsura = false } = {}) {
  medida("masculino", "escala", k);
  const nomes = groups.map((g) => g.nm);
  if (!nomes.includes("Rosto") || !nomes.includes("Boca")) throw new Error("masculino: o desenho não tem rosto (Rosto e Boca)");
  // sem `pele`, as orelhas e a tonsura usam a cor do próprio rosto
  if (!pele) {
    const fl = groups.find((g) => g.nm === "Rosto").it.find((it) => it.ty === "fl");
    pele = `#${fl.c.k.slice(0, 3).map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }
  if (nomes.includes("Manto")) throw new Error("masculino: o manto cobre o cabelo; use sem manto");
  const P = (pts) => pts.map(([x, y]) => [x * k, y * k]);
  const olhos = grupo("Olhos", [lib.makeEllipse(-5 * k, 0, 1.5 * k, 1.6 * k, hex("#3B2416"), "OlhoE"), lib.makeEllipse(5 * k, 0, 1.5 * k, 1.6 * k, hex("#3B2416"), "OlhoD")]);
  const sobrancelhas = stroke([polyline(P([[-8.5, -4.2], [-5.5, -5.4], [-2.6, -4.8]])), polyline(P([[8.5, -4.2], [5.5, -5.4], [2.6, -4.8]]))], 1.6 * k, hex(corCabelo), "Sobrancelhas");
  const nariz = stroke([polyline(P([[0.4, 0.5], [1.2, 4.4], [-0.6, 4.8]]), { smooth: false })], 0.9 * k, hex("#C1694F"), "Nariz");
  const cabelo = fill([forma(P([[-11.8, 1], [-12.4, -7], [-10, -13], [-5, -16.6], [0, -17.4], [5, -16.6], [10, -13], [12.4, -7], [11.8, 1], [10.6, -3], [9.6, -8], [5, -10.4], [0, -10.8], [-5, -10.4], [-9.6, -8], [-10.6, -3]]))], corCabelo, "Cabelo");
  const coroa = tonsura ? [lib.makeEllipse(0, -12.5 * k, 8.4 * k, 4.6 * k, hex(pele), "Tonsura")] : [];
  const orelhas = grupo("Orelhas", [lib.makeEllipse(-11.4 * k, 1 * k, 2.4 * k, 3.6 * k, hex(pele), "OrelhaE"), lib.makeEllipse(11.4 * k, 1 * k, 2.4 * k, 3.6 * k, hex(pele), "OrelhaD")]);
  const out = [];
  for (const g of groups) {
    if (["Face1", "Face2", "Cabelo", "Olhos"].includes(g.nm)) continue;
    if (g.nm === "Boca") {
      out.push(olhos, sobrancelhas, nariz);
      if (bigode) out.push(fill([forma(P([[-5, 6.6], [-2, 5.6], [0, 6.2], [2, 5.6], [5, 6.6], [3, 7.6], [0, 7.2], [-3, 7.6]]))], bigode, "Bigode"));
      out.push(g);
      continue;
    }
    if (g.nm === "Rosto") { out.push(...coroa, cabelo, g, orelhas); continue; }
    out.push(g);
  }
  return out;
}

/** Busto de homem: o `busto` sem manto com o rosto de `masculino` (opções dos dois). */
function bustoHomem(k = 1, { pele = PELE, veste = "#BE1931", corCabelo = "#5C3A21", barba = null, bigode = null, tonsura = false } = {}) {
  return masculino(busto(k, { pele, veste, cabelo: "curto", corCabelo, barba }), k, { pele, corCabelo, bigode, tonsura });
}

/** Figura de homem: a `figura` sem manto com o rosto de `masculino` (opções das duas). */
function figuraHomem(k = 1, { pele = PELE, tunica = "#F5F8FA", corCabelo = "#5C3A21", barba = null, bigode = null, tonsura = false, faixa = null, bracos = "baixos", chaga = false } = {}) {
  return masculino(figura(k, { pele, tunica, cabelo: "curto", corCabelo, barba, faixa, bracos, chaga }), k, { pele, corCabelo, bigode, tonsura });
}

/**
 * Centros das contas do laço de um terço com o laço de raios `rx` × `ry` e
 * centro em (0, `cy`), na mesma distribuição de `tercoShapes`: as cinco
 * dezenas (10 contas pequenas cada, na ordem do laço) e as 4 contas grandes
 * entre elas; a junção de baixo (0, cy + ry) fica livre para a medalha (o
 * lugar de duas contas). O pendente não entra.
 */
function tercoLaco({ rx, ry, cy }) {
  [rx, ry, cy].forEach((v) => { if (!Number.isFinite(v)) throw new Error(`tercoLaco: medida inválida ${v}`); });
  const vagas = 54 + 2;
  const dezenas = [[], [], [], [], []], grandes = [];
  const pos = (k) => { const ang = Math.PI / 2 + ((k + 1.5) / vagas) * Math.PI * 2; return [rx * Math.cos(ang), cy + ry * Math.sin(ang)]; };
  let k = 0;
  for (let d = 0; d < 5; d++) {
    if (d > 0) grandes.push(pos(k++));
    for (let j = 0; j < 10; j++) dezenas[d].push(pos(k++));
  }
  return { dezenas, grandes };
}

/**
 * Centros das contas do laço do terço de `tercoShapes` (mesmas medidas,
 * TERCO): as cinco dezenas e as 4 contas grandes entre elas, sem o pendente.
 */
function tercoContas() {
  return tercoLaco({ rx: TERCO.RX, ry: TERCO.RY, cy: TERCO.CY });
}

/** Traços das letras (grade 0..4 × 0..6, y para baixo), para `letrasShapes`. */
const LETRAS = {
  A: [[[0, 6], [2, 0], [4, 6]], [[0.8, 3.8], [3.2, 3.8]]],
  D: [[[0, 0], [0, 6], [2.2, 6], [4, 4.4], [4, 1.6], [2.2, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0.8, 0], [3.2, 0]], [[0.8, 6], [3.2, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.4], [4, 0], [4, 6]]],
  S: [[[4, 0.6], [3, 0], [1, 0], [0, 1], [0, 2.2], [1, 3], [3, 3], [4, 3.8], [4, 5], [3, 6], [1, 6], [0, 5.4]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 4.6], [1.2, 6], [2.8, 6], [4, 4.6], [4, 0]]],
  "Α": [[[0, 6], [2, 0], [4, 6]], [[0.8, 3.8], [3.2, 3.8]]],
  "Ω": [[[0, 6], [1.4, 6], [1.4, 5], [0.2, 3.6], [0.2, 1.6], [1.4, 0.2], [2.6, 0.2], [3.8, 1.6], [3.8, 3.6], [2.6, 5], [2.6, 6], [4, 6]]],
};
/**
 * Texto em letras de traço (sem fonte externa), centrado em (0,0) pela
 * extensão real dos traços, com `h` de altura. Só as letras de LETRAS (e
 * espaços); outra letra, texto vazio ou só de espaços lança erro.
 */
function letrasShapes(texto, h, { cor = "#FFCC4D", largura = null, nm = "Letras" } = {}) {
  medida("letrasShapes", "altura", h);
  const chars = [...String(texto ?? "")];
  if (!chars.some((ch) => ch.trim())) throw new Error(`letrasShapes: texto vazio ${JSON.stringify(texto)}`);
  const u = h / 6, passo = 5.4 * u;
  const tracos = [];
  chars.forEach((ch, k) => {
    if (ch === " ") return;
    const g = LETRAS[ch];
    if (!g) throw new Error(`letrasShapes: letra sem desenho ${JSON.stringify(ch)}`);
    for (const tr of g) tracos.push(tr.map(([x, y]) => [k * passo + x * u, -h / 2 + y * u]));
  });
  const xs = tracos.flat().map((p) => p[0]), meio = (Math.min(...xs) + Math.max(...xs)) / 2;
  const linhas = tracos.map((tr) => polyline(tr.map(([x, y]) => [x - meio, y]), { smooth: false }));
  return [stroke(linhas, largura || Math.max(1, u * 0.9), hex(cor), nm)];
}

/** Rosa desenhada (vista de cima e de lado), centrada em (0,0), raio `r`, com o cálice verde embaixo. */
function rosaShapes(r, { cor = "#DD2E44", escuro = "#A0041E", folha = "#5C913B" } = {}) {
  medida("rosaShapes", "raio", r);
  const P = (pts) => pts.map(([x, y]) => [x * r, y * r]);
  return [
    stroke([polyline(P([[-0.35, -0.1], [0, -0.35], [0.35, -0.1], [0.1, 0.2], [-0.2, 0.05]]))], Math.max(0.7, r * 0.12), hex(escuro), "Espiral"),
    fill([forma(P([[0, -0.9], [0.6, -0.75], [0.95, -0.2], [0.75, 0.45], [0, 0.75], [-0.75, 0.45], [-0.95, -0.2], [-0.6, -0.75]]))], cor, "Petalas"),
    fill([pontas(forma(P([[-0.2, 0.6], [-0.95, 0.75], [-0.55, 1.05], [0, 0.85], [0.55, 1.05], [0.95, 0.75], [0.2, 0.6]])), [1, 5])], folha, "Calice"),
  ];
}

/**
 * Lírio branco desenhado, com o pé da haste em (0,0): a haste sobe até
 * (0, −0,78·h), onde abre a flor de seis pétalas, cuja pétala de cima chega a
 * y ≈ −1,04·h; folhas na haste.
 */
function lirioShapes(h, { cor = "#FFFFFF", sombra = "#E1E8ED", miolo = "#FFCC4D", haste = "#5C913B" } = {}) {
  medida("lirioShapes", "altura", h);
  const P = (pts) => pts.map(([x, y]) => [x * h, y * h]);
  const petala = (ang, comp) => {
    const a = (ang * Math.PI) / 180, d = [Math.sin(a), -Math.cos(a)], n = [-d[1], d[0]];
    const c = [0, -0.78], m = [c[0] + d[0] * comp * 0.5, c[1] + d[1] * comp * 0.5];
    return pontas(forma(P([c, [m[0] + n[0] * 0.07, m[1] + n[1] * 0.07], [c[0] + d[0] * comp, c[1] + d[1] * comp], [m[0] - n[0] * 0.07, m[1] - n[1] * 0.07]])), [2]);
  };
  return [
    stroke([polyline(P([[0, -0.78], [0.05, -0.92]])), polyline(P([[0, -0.78], [-0.06, -0.9]])), polyline(P([[0, -0.78], [0.1, -0.86]]))], Math.max(0.7, h * 0.02), hex(miolo), "Estames"),
    fill([petala(-50, 0.24), petala(0, 0.26), petala(50, 0.24)], cor, "PetalasFrente"),
    fill([petala(-100, 0.2), petala(100, 0.2), petala(180, 0.12)], sombra, "PetalasTras"),
    fill([forma(P([[0, -0.3], [0.14, -0.42], [0.18, -0.36], [0.04, -0.26]])), forma(P([[0, -0.15], [-0.16, -0.3], [-0.2, -0.24], [-0.04, -0.1]]))], haste, "Folhas"),
    stroke([polyline(P([[0, 0], [0.02, -0.4], [0, -0.78]]))], Math.max(1, h * 0.035), hex(haste), "Haste"),
  ];
}

/** Pão redondo desenhado (pão de casa), centrado em (0,0), largura `w`, com os cortes no alto. */
function paoShapes(w, { cor = "#E8A84C", claro = "#FFD983", corte = "#C1694F" } = {}) {
  medida("paoShapes", "largura", w);
  const P = (pts) => pts.map(([x, y]) => [x * w, y * w]);
  return [
    stroke([polyline(P([[-0.22, -0.12], [-0.12, -0.22]])), polyline(P([[-0.04, -0.14], [0.06, -0.25]])), polyline(P([[0.14, -0.12], [0.24, -0.21]]))], Math.max(0.8, w * 0.04), hex(corte), "Cortes"),
    lib.makeEllipse(-0.1 * w, -0.14 * w, 0.2 * w, 0.08 * w, hex(claro), "Reflexo", 70),
    fill([forma(P([[-0.5, 0.18], [-0.46, -0.08], [-0.28, -0.26], [0, -0.32], [0.28, -0.26], [0.46, -0.08], [0.5, 0.18], [0, 0.22]]))], cor, "Pao"),
  ];
}

module.exports = { rect, forma, poligono, fill, hostiaShapes, espinhosShapes, velaComprida, brilho, chuva, petala, PELE, PELE_SOMBRA, busto, figura, OMBRO_E, OMBRO_D, CHAGA, chamaShapes, livroAbertoShapes, tercoShapes, conchaShapes, espelhar, transladar,
  pontas, coroaShapes, palmaShapes, estrelaShapes, asaShapes, coracaoShapes, lagrimaShapes, galeroShapes, pombaShapes,
  PELE_ESCURA, grupo, grupoAnimado, masculino, bustoHomem, figuraHomem, TERCO, tercoLaco, tercoContas, LETRAS, letrasShapes, rosaShapes, lirioShapes, paoShapes };
