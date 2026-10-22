#!/usr/bin/env node
/**
 * trophy-lot-5.js — Story 11.7, lote 5 de Lottie dos troféus sem animação.
 *
 * Lote 5, o último: os 32 litúrgicos de outubro a dezembro, com as festas
 * móveis do fim de novembro (Cristo Rei e 1º Domingo do Advento), da §8 de
 * `_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md`. Todos
 * com 3 níveis (como `getSeasonalTier`): x.json = bronze, x_t2 = prata,
 * x_t3 = ouro.
 *
 * Cada troféu tem o gesto da tabela da §8, feito de 2 a 4 peças animadas em
 * camadas separadas (nome `G_*`), sem medalha nem disco em volta. A prata
 * acrescenta o que a tabela diz (camadas `T2_*`) e o ouro, o resto (`T3_*`);
 * o quadro final (89, o troféu parado) mostra os acréscimos de cada nível.
 * Regras da §8: a luz usa só a `luzSuave` (sem esticar), sempre atrás das
 * pessoas; pessoa fazendo algo é a figura de corpo inteiro (`figura`,
 * `figuraHomem`) ou o busto (`busto`, `bustoHomem`), com a pele comum `PELE`,
 * menos a imagem de Aparecida e São Martinho de Porres, com `PELE_ESCURA`; os
 * homens têm o rosto de homem (`masculino`: cabelo curto rente, orelhas,
 * sobrancelhas e, onde é tradição, barba); Maria grande (≥ 60 px na tela) e
 * na frente; nada que lembre jogo ou aposta (as bolsinhas de Nicolau vão
 * fechadas, sem moedas); terço e objetos católicos desenhados; Santos
 * Inocentes e Santa Luzia sem violência nem sangue; peça principal nunca
 * repetida entre troféus. Mesmo formato, `ART_SCALE`, janela visível, base
 * comum e quadro final dos lotes 1 a 4 (montagem em
 * `scripts/lottie-lib/trophy-kit.js`).
 *
 * Fontes: o lote não usa peça de fora. As tabelas de peças dos lotes (em
 * `scripts/lottie-lib/icons.js`) vêm de:
 *  - Twemoji (https://github.com/jdecked/twemoji, v15.1.0), licença CC-BY 4.0
 *    — © Twitter, Inc. e colaboradores (nenhuma peça usada neste lote).
 *  - Bootstrap Icons (https://github.com/twbs/icons, v1.11.3), licença MIT
 *    — © The Bootstrap Authors (nenhuma peça usada neste lote).
 *
 * Peças principais desenhadas (tabela DRAWN), compostas de formas próprias,
 * feitas aqui mesmo ou em `scripts/lottie-lib/desenhos.js` (nenhuma embrulha
 * peça da tabela, `uses` vazio): desenho-teresinha-e-rosas,
 * desenho-anjo-da-guarda, desenho-francisco-e-passaros,
 * desenho-terco-que-acende, desenho-imagem-de-aparecida,
 * desenho-castelo-interior, desenho-touro-alado, desenho-papa-e-ferula,
 * desenho-simao-e-judas, desenho-multidao-de-santos, desenho-maos-e-crisantemos,
 * desenho-cao-gato-e-rato, desenho-humilitas, desenho-fachada-de-latrao,
 * desenho-capa-partida, desenho-paes-em-rosas, desenho-menina-no-templo,
 * desenho-orgao-de-cecilia, desenho-maria-das-gracas, desenho-cristo-no-trono,
 * desenho-cruz-em-x, desenho-coroa-do-advento, desenho-caranguejo-e-crucifixo,
 * desenho-tres-bolsinhas, desenho-abelha-nos-labios, desenho-imaculada,
 * desenho-luzia-e-pratinho, desenho-chama-no-carmelo, desenho-presepio,
 * desenho-estevao, desenho-aguia-sobre-livro e desenho-inocentes.
 * Todas as desenhadas: figuras de corpo inteiro (`figura`, `figuraHomem`) e
 * bustos (`busto`, `bustoHomem`); hábitos, véus, toucas, capas, mozetas,
 * pluvial, dalmática, mitra, solidéus, tiara, elmo, coroas (`coroaShapes`) e
 * a coroa de mártir; crucifixos (com rosas, o do Carmelo visto do alto, o do
 * caranguejo e o da férula); rosas (`rosaShapes`), lírio (`lirioShapes`),
 * pães (`paoShapes`), palmas (`palmaShapes`), estrelas (`estrelaShapes`),
 * asas (`asaShapes` e as de penas do touro, `asaDePenasShapes`), chamas (`chamaShapes`), livros (`livroAbertoShapes`),
 * o terço próprio do Rosário (`rosarioShapes`, com o laço de `tercoLaco`:
 * contas peroladas e a medalha de Maria), letras de traço
 * (`letrasShapes`: HUMILITAS, Α e Ω, TE DEUM), pássaros, lobo, touro, boi,
 * burrinho, cão, gato, rato, cavalo, caranguejo, águia, abelha e serpente;
 * aspersório de água benta; rede, barco, peixes e água; castelo de cristal; brasão de João Paulo II;
 * serra e clava; crisântemos; prato; fachada, colunas, estátuas e cruzes de
 * consagração; trono, cetro, globo com a cruz; cruz em X; coroa de Advento e
 * velas (`velaComprida`); navio; janela, bolsinhas fechadas, âncora e lua;
 * globo, a Medalha Milagrosa (objeto ao lado, numa fita); lua crescente;
 * pratinho com os olhos; monte; manjedoura; pedras; cálice com a serpente;
 * paleta e pincel; órgão e notas; avental; degraus e o Templo.
 *
 * Uso: node scripts/trophy-lot-5.js
 * Recusa (e não escreve) qualquer id que já esteja em APPROVED_LOTTIE.
 */
const lib = require("./lottie-lib");
const kit = require("./lottie-lib/trophy-kit");
const {
  rect, forma, poligono, fill, velaComprida, chuva, petala, PELE, PELE_ESCURA, busto, figura, bustoHomem, figuraHomem,
  chamaShapes, livroAbertoShapes, tercoLaco, espelhar, transladar, pontas, OMBRO_E, OMBRO_D,
  coroaShapes, palmaShapes, estrelaShapes, asaShapes, coracaoShapes, grupo, grupoAnimado, letrasShapes, rosaShapes, lirioShapes, paoShapes,
} = require("./lottie-lib/desenhos");
const { anim, pulo, abrir, onda, aparecer, pop, pulsar, giro, hex } = lib;
const { END, L, add, flutuar, deslocar, stroke, reta, aureola, raios } = kit;

// ── Peças ────────────────────────────────────────────────────────────────────
/** O lote não usa peça da tabela comum: tudo é desenhado (DRAWN). */
const ICONS = {};

/** Peças principais desenhadas no próprio gerador (sem fonte externa; ver o cabeçalho). */
const DRAWN = {
  "desenho-teresinha-e-rosas": { desc: "Santa Teresinha (busto, hábito marrom, capa branca e véu preto) abraçando o crucifixo coberto de rosas, com a chuva de rosas", uses: [] },
  "desenho-anjo-da-guarda": { desc: "o anjo da guarda (corpo inteiro, asas abertas) com a mão estendida sobre a criança que caminha", uses: [] },
  "desenho-francisco-e-passaros": { desc: "São Francisco (corpo inteiro, hábito marrom, cordão de três nós) de braços abertos, com os passarinhos pousando nas mãos (e o lobo manso sentado ao lado, na prata)", uses: [] },
  "desenho-terco-que-acende": { desc: "o terço próprio do Rosário (contas peroladas, medalha de Maria, crucifixo e cinco dezenas) que desce e acende dezena por dezena", uses: [] },
  "desenho-imagem-de-aparecida": { desc: "a imagem de Nossa Senhora Aparecida (rosto e mãos escuros, manto azul em triângulo com orla dourada) subindo na rede dos pescadores", uses: [] },
  "desenho-castelo-interior": { desc: "o castelo de cristal do Castelo Interior, que acende morada por morada até a luz do centro", uses: [] },
  "desenho-touro-alado": { desc: "o touro alado de São Lucas (asas de penas de ave, presas no ombro e abertas para cima e para trás) e o livro do Evangelho que se abre", uses: [] },
  "desenho-papa-e-ferula": { desc: "São João Paulo II (busto, batina branca e solidéu) erguendo a férula com o crucifixo e abençoando", uses: [] },
  "desenho-simao-e-judas": { desc: "São Simão e São Judas Tadeu (dois bustos com barba), a chama sobre Judas e a imagem de Cristo no peito dele", uses: [] },
  "desenho-multidao-de-santos": { desc: "a multidão de santos de vestes brancas em fileiras, com as auréolas acendendo uma a uma", uses: [] },
  "desenho-maos-e-crisantemos": { desc: "mãos postas rezando pelos mortos e o ramo de crisântemos brancos (o aspersório na prata)", uses: [] },
  "desenho-cao-gato-e-rato": { desc: "o cão, o gato e o rato comendo juntos do mesmo prato", uses: [] },
  "desenho-humilitas": { desc: "São Carlos Borromeu (busto, mozeta e solidéu vermelhos, corda no pescoço) e a palavra HUMILITAS que acende", uses: [] },
  "desenho-fachada-de-latrao": { desc: "a fachada da Basílica de Latrão, que se ergue coluna por coluna, com as estátuas e a cruz no alto", uses: [] },
  "desenho-capa-partida": { desc: "São Martinho de Tours (corpo inteiro, soldado romano) partindo a capa vermelha com a espada para o mendigo", uses: [] },
  "desenho-paes-em-rosas": { desc: "Santa Isabel da Hungria (busto, manto e tiara) abrindo o avental, com os pães que viram rosas", uses: [] },
  "desenho-menina-no-templo": { desc: "a menina Maria (corpo inteiro, vestido branco e véu azul) subindo os degraus do Templo", uses: [] },
  "desenho-orgao-de-cecilia": { desc: "Santa Cecília sentada de lado diante do pequeno órgão, olhando para o teclado, com as mãos nas teclas e as notas que sobem dos tubos", uses: [] },
  "desenho-maria-das-gracas": { desc: "Nossa Senhora das Graças (corpo inteiro) de pé sobre o globo, com os raios saindo das mãos", uses: [] },
  "desenho-cristo-no-trono": { desc: "Cristo Rei (corpo inteiro, túnica branca, manto vermelho e coroa) diante do trono, com o cetro e a mão que abençoa", uses: [] },
  "desenho-cruz-em-x": { desc: "a cruz em X de Santo André, que se ergue uma diagonal de cada vez", uses: [] },
  "desenho-coroa-do-advento": { desc: "a coroa de Advento (ramos verdes em roda) com as três velas roxas que acendem", uses: [] },
  "desenho-caranguejo-e-crucifixo": { desc: "o caranguejo que sai do mar trazendo o crucifixo de São Francisco Xavier", uses: [] },
  "desenho-tres-bolsinhas": { desc: "a mão do bispo (manga vermelha) deixando três bolsinhas fechadas na janela, à noite", uses: [] },
  "desenho-abelha-nos-labios": { desc: "Santo Ambrósio (busto, mitra e pluvial, barba) pregando, e a abelha que pousa nos lábios", uses: [] },
  "desenho-imaculada": { desc: "a Imaculada Conceição (corpo inteiro, túnica branca e manto azul) sobre a lua crescente, pisando a serpente", uses: [] },
  "desenho-luzia-e-pratinho": { desc: "Santa Luzia (busto, véu vermelho) erguendo o pratinho com os dois olhos, e a luz sobre ele", uses: [] },
  "desenho-chama-no-carmelo": { desc: "a chama viva de amor que acende no alto do Monte Carmelo, na noite", uses: [] },
  "desenho-presepio": { desc: "o Menino Jesus na manjedoura, com Maria (busto grande, manto azul) e José (busto) inclinados sobre ele", uses: [] },
  "desenho-estevao": { desc: "Santo Estêvão (busto, dalmática vermelha de diácono) erguendo os olhos para o céu que se abre, e as três pedras", uses: [] },
  "desenho-aguia-sobre-livro": { desc: "a águia de São João que abre as asas e pousa sobre o livro aberto", uses: [] },
  "desenho-inocentes": { desc: "três pequenos inocentes (bustos de bebê com asinhas) subindo com palmas nas mãos", uses: [] },
};

const { buildTrophy, checkUniqueIcons, checkUniqueIds, main } = kit.makeLot(ICONS, { DRAWN });

// ── Ajudas do lote ───────────────────────────────────────────────────────────
/** Ponto `xy` do desenho de uma camada na pose (posição `p`, âncora `a`, rotação `r` em graus). */
function naPose(p, a, r, [x, y]) {
  const ang = (r * Math.PI) / 180, lx = x - a[0], ly = y - a[1];
  return [p[0] + lx * Math.cos(ang) - ly * Math.sin(ang), p[1] + lx * Math.sin(ang) + ly * Math.cos(ang)];
}
/** Põe os grupos `extra` logo atrás do grupo de nome `nm`. */
function atrasDe(groups, nm, extra) {
  const k = groups.findIndex((g) => g.nm === nm);
  if (k < 0) throw new Error(`atrasDe: grupo ${nm} não encontrado`);
  return [...groups.slice(0, k + 1), ...extra, ...groups.slice(k + 1)];
}
/** Põe os grupos `extra` logo na frente do grupo de nome `nm`. */
function naFrenteDe(groups, nm, extra) {
  const k = groups.findIndex((g) => g.nm === nm);
  if (k < 0) throw new Error(`naFrenteDe: grupo ${nm} não encontrado`);
  return [...groups.slice(0, k), ...extra, ...groups.slice(k)];
}
/** Cenário parado (sem `G_`), que aparece no começo. */
const cena = (nm, shapes, t0 = 0) => L(nm, shapes, { p: [0, 0], o: anim(aparecer(t0, 6)) });
/** Palma do martírio desenhada, com o pé em `base`, que brota em t0. */
const palmaEmPe = (nm, h, base, t0, r = 0) => L(nm, palmaShapes(h), { p: base, r, s: anim([[0, 0], ...pop(t0, 12)]), o: anim(aparecer(t0, 4)) });
/** Coroa de mártir desenhada que desce até `fim` e flutua. */
function coroaDesce(nm, w, fim, t0) {
  return L(nm, coroaShapes(w), { p: anim([[0, add(fim, [0, -14])], [t0, add(fim, [0, -14]), "ease"], [t0 + 14, fim], ...flutuar(fim, t0 + 14, 1.5)]), o: anim(aparecer(t0, 8)) });
}
/** Luz do ouro (sempre a `luzSuave`, sem esticar), na cor litúrgica. */
const luzDoOuro = (c, opts = {}) => lib.luzSuave(0, c.col.luz, { nm: "T3_Luz", top: 24, bottom: 150, w0: 12, w1: 80, t0: 42, peak: 28, ...opts });
/** Auréola e raios do ouro, em volta de `center`. */
function aureolaERaios(center, { rx = 16, ry = 4.5, t0 = 52, r1 = 22, r2 = 32 } = {}) {
  return [aureola({ center, rx, ry, t0, nm: "T3_Aureola" }), raios("T3_Raios", center, { r1, r2, t0: t0 + 4 })];
}
/** Estrelas desenhadas paradas que acendem (o céu do ouro). */
function estrelasDoOuro(nm, pts, t0 = 48, r = 3.6) {
  return L(nm, pts.flatMap((d, k) => transladar(estrelaShapes(k % 2 ? r * 0.8 : r), d)), {
    a: [0, 0], p: [100, 100], s: anim([[0, 0], ...pop(t0, 12, { over: 112 }), ...pulsar(t0 + 14, END, { amp: 4, period: 22 })]), o: anim(aparecer(t0, 4)),
  });
}
/** Escala `k` aplicada a uma lista de pontos. */
const escala = (k, pts) => pts.map(([x, y]) => [x * k, y * k]);
/** Auréola (anel achatado) de uma camada de pessoa, no topo da cabeça `topo` (no desenho) da pose final. */
const haloNa = (pose, topo, opts = {}) => ({ center: naPose(pose.P, pose.A, pose.R, topo), rx: 11, ry: 3.2, ...opts });
/** Pose de um busto que se inclina: rosto em F, âncora na base (y `base`·k), inclinação final R. */
function pose(F, k, base, R = 0) { return { F, K: k, A: [0, base * k], P: [F[0], F[1] + base * k], R }; }
/** Topo (no desenho) para a auréola: busto de manto (capuz até −29), cabelo de homem (−17,4) ou cabelo longo (−18). */
const TOPO_MANTO = -32, TOPO_HOMEM = -21, TOPO_CABELO = -21;

/** Véu preto e touca branca de carmelita, para pôr atrás do rosto de um busto de manto (escala k). */
function veuCarmelita(k) {
  const P = (pts) => escala(k, pts);
  return [
    fill([forma(P([[0, -17], [10, -13], [14, -2], [13, 10], [7, 18], [0, 20], [-7, 18], [-13, 10], [-14, -2], [-10, -13]]))], "#FFFFFF", "Touca"),
    fill([forma(P([[0, -27], [16, -21], [24, -5], [26, 20], [18, 30], [12, 8], [10, -6], [6, -13], [0, -15], [-6, -13], [-10, -6], [-12, 8], [-18, 30], [-26, 20], [-24, -5], [-16, -21]]))], "#292F33", "Veu"),
  ];
}
/** Mitra de bispo (branca, faixas douradas), com a borda de baixo em (0,0), escala k (24·k de largura). */
function mitraShapes(k = 1, { cor = "#F5F8FA", faixa = "#FFCC4D" } = {}) {
  const P = (pts) => escala(k, pts);
  return [
    stroke([reta(P([[0, -30], [0, 0]])), reta(P([[-12, -8], [12, -8]]))], 2.4 * k, hex(faixa), "Faixas"),
    fill([forma(P([[-12, 0], [-12, -16], [-6, -26], [0, -32], [6, -26], [12, -16], [12, 0]]))], cor, "Mitra"),
  ];
}
/** Crucifixo de madeira com o corpo de Cristo, com o pé em (0,0) e altura h. */
function crucifixoShapes(h, { madeira = "#8A4633", corpo = PELE, pano = "#FFFFFF" } = {}) {
  const w = h * 0.09, y = -h * 0.74, b = h * 0.3;
  const P = (pts) => escala(h / 60, pts);
  return [
    fill([forma(P([[-3, -32], [3, -32], [2.4, -26], [-2.4, -26]]))], pano, "Pano"),
    stroke([polyline(P([[-15, -43], [-6, -41], [0, -38]])), polyline(P([[15, -43], [6, -41], [0, -38]]))], Math.max(1, h * 0.045), hex(corpo), "Bracos"),
    fill([forma(P([[0, -40], [2.6, -36], [2, -26], [1, -14], [-1, -14], [-2, -26], [-2.6, -36]]))], corpo, "Corpo"),
    lib.makeEllipse(0, -h * 0.71, h * 0.045, h * 0.05, hex(corpo), "Cabeca"),
    fill([rect(-b, y - w / 2, b, y + w / 2)], madeira, "Travessa"),
    fill([rect(-w / 2, -h, w / 2, 0)], madeira, "Haste"),
  ];
}
const polyline = lib.polyline;
/** Asas de anjo: par de asas desenhadas (raiz em (±dx, 0)). */
function parDeAsas(w, dx = 3) {
  return [...transladar(asaShapes(w), [dx, 0]), ...transladar(espelhar(asaShapes(w)), [-dx, 0])];
}

// ── Gestos (tabela da §8 do guia) ────────────────────────────────────────────
// Cada gesto devolve as camadas da frente para trás. `t` = nível (1 bronze,
// 2 prata, 3 ouro); `c.col` = cor litúrgica.

/** Pose de Santa Teresinha (busto de manto, inclinada para o crucifixo). */
const TERESINHA = pose([84, 88], 0.7, 75, 4);

/** Santa Teresinha do Menino Jesus: abraça o crucifixo coberto de rosas, e rosas caem do alto. */
function gestoTeresinha(t, c) {
  const { K, A, P, R } = TERESINHA;
  const teresinha = L("G_Teresinha", atrasDe(busto(K, { manto: "#EFE6D2", veste: "#7A4A2A", orla: "#C9B78F" }), "Rosto", veuCarmelita(K)), {
    a: A, p: P, r: anim([[0, 0], [8, 0, "ease"], [26, R]]), o: anim(aparecer(0, 6)),
  });
  // o crucifixo coberto de rosas, inclinado no colo dela, e as mãos que o abraçam
  const rosas = [[-6, -40], [7, -44], [0, -30], [-4, -18], [5, -8], [-12, -44], [13, -40]].flatMap((d, k) => transladar(rosaShapes(k % 3 ? 3.2 : 3.8, { cor: k % 2 ? "#DD2E44" : "#F4ABBA", escuro: k % 2 ? "#A0041E" : "#EA596E" }), d));
  const maos = [
    lib.makeEllipse(-3, -20, 3.4, 2.8, hex(PELE), "Mao1"), lib.makeEllipse(3, -12, 3.4, 2.8, hex(PELE), "Mao2"),
    stroke([reta([[-6, -19], [-18, -16]]), reta([[0, -11], [-16, -6]])], 5.5, hex("#7A4A2A"), "Mangas"),
  ];
  const ABRACO = [112, 140];
  const crucifixo = L("G_Crucifixo", [...maos, ...rosas, ...crucifixoShapes(66)], {
    p: anim([[0, [118, 172]], [6, [118, 172], "out"], [26, ABRACO]]), r: anim([[0, 30], [6, 30, "ease"], [26, 14]]), o: anim(aparecer(4, 6)),
  });
  // a chuva de rosas: as rosas descem do alto e ficam no chão em volta dela
  const caidas = [[44, 150], [62, 162], [146, 158], [160, 146], [132, 166]];
  const caem = L("G_Rosas", caidas.flatMap(([x, y], k) => transladar(rosaShapes(4, { cor: k % 2 ? "#F4ABBA" : "#DD2E44", escuro: k % 2 ? "#EA596E" : "#A0041E" }), [x - 100, y - 160])), {
    p: anim([[0, [100, 60]], [20, [100, 60], "in"], [52, [100, 160], "out"], [56, [100, 157]], [60, [100, 160]]]),
    r: anim([[0, -20], [20, -20, "linear"], [52, 0]]), o: anim(aparecer(20, 6)),
  });
  const layers = [caem, crucifixo, teresinha];
  if (t >= 2) {
    layers.unshift(...chuva("T2_Rosas", (k) => rosaShapes(3.4, { cor: k % 2 ? "#DD2E44" : "#F4ABBA", escuro: k % 2 ? "#A0041E" : "#EA596E" }), { count: 5, t0: 40, dur: 34, area: [36, 34, 164, 120], seed: 51, fade: false }));
    layers.push(L("T2_Livro", [
      stroke([reta([[-6, -6], [6, -6]]), reta([[-6, -2], [6, -2]]), reta([[-4, 2], [4, 2]])], 1.2, hex("#FFCC4D"), "Titulo"),
      stroke([poligono([[-7, -11], [7, -11], [7, 11], [-7, 11]])], 0.8, hex("#FFCC4D"), "Filetes"),
      fill([rect(-11, -14, -8, 14)], "#5C3A21", "Lombada"),
      fill([rect(-10, -14, 10, 14)], "#7A4A2A", "Capa"),
    ], { p: [160, 120], r: anim([[0, 0], [40, 0, "ease"], [52, 8]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  if (t >= 3) {
    const cores = ["#F4ABBA", "#FFFFFF", "#DD2E44"];
    layers.unshift(...chuva("T3_Petalas", (k) => petala(cores[k % 3]), { count: 8, t0: 44, area: [30, 30, 170, 164], seed: 53, fade: false }));
    layers.push(luzDoOuro(c, { x: 92, w1: 90, t0: 42 }));
  }
  return layers;
}

/** Pose do anjo da guarda (figura de pé, parada). */
const ANJO = { F: [74, 70], K: 0.54 };

/** Santos Anjos da Guarda: o anjo (figura, asas abertas) estende a mão sobre a criança que caminha. */
function gestoAnjosGuarda(t, c) {
  const { F, K } = ANJO;
  // a mão estendida (à direita de quem olha) vai do ombro até acima da cabeça da criança
  const MAO = [(108 - F[0]) / K, (100 - F[1]) / K];
  const braco = [lib.makeEllipse(MAO[0] * K, MAO[1] * K, 4.4 * K, 4 * K, hex(PELE), "MaoD"),
    stroke([polyline(escala(K, [OMBRO_D, [40, 40], MAO]))], 8 * K, hex("#DDEFFC"), "BracoD")];
  const anjo = L("G_Anjo", [...braco, ...figura(K, { tunica: "#DDEFFC", cabelo: "longo", corCabelo: "#FFCC4D", faixa: "#3B88C3", bracos: "esquerdo" })], {
    p: anim([[0, add(F, [0, -6])], [14, F], ...flutuar(F, 40, 0.8)]), o: anim(aparecer(0, 8)),
  });
  // as asas saem das costas e batem devagar; a raiz acompanha o anjo
  const raiz = (lado) => anim(deslocar([[0, add(F, [0, -6])], [14, F], ...flutuar(F, 40, 0.8)], [lado * 4, 20 * K]));
  const asa = (nm, lado) => L(nm, lado > 0 ? asaShapes(40) : espelhar(asaShapes(40)), {
    p: raiz(lado), r: anim([[0, lado * -30], [6, lado * -30, "out"], [22, 0], ...onda(0, lado * 6, 22, END, { period: 22 })]), o: anim(aparecer(4, 8)),
  });
  const KC = 0.32, Y = 158 - 108 * KC;
  const passos = [];
  for (let k = 0; k <= 6; k++) passos.push([4 + k * 5, [152 - k * 6, Y - (k % 2 ? 2 : 0)], "linear"]);
  const crianca = L("G_Crianca", figura(KC, { tunica: "#F4900C", cabelo: "curto", corCabelo: "#8A4633" }), {
    p: anim([[0, [152, Y]], ...passos, [36, [116, Y]]]), o: anim(aparecer(0, 6)),
  });
  const layers = [crianca, anjo, asa("G_AsaD", 1), asa("G_AsaE", -1)];
  if (t >= 2) {
    const tabuas = Array.from({ length: 9 }, (_, k) => rect(90 + k * 9, 158, 97 + k * 9, 163));
    layers.push(L("T2_Ponte", [
      stroke([reta([[88, 146], [176, 146]])], 1.4, hex("#8A4633"), "Corrimao"),
      stroke([reta([[90, 146], [90, 163]]), reta([[174, 146], [174, 163]])], 2.6, hex("#5C3A21"), "Postes"),
      fill(tabuas, "#C1694F", "Tabuas"),
      stroke([lib.polyline([[88, 160], [132, 166], [176, 160]])], 1.6, hex("#8A4633"), "Cordas"),
    ], { p: [0, 0], s: [100, 100], o: anim(aparecer(38, 8)) }));
  }
  if (t >= 3) layers.unshift(estrelasDoOuro("T3_Estrelas", [[-62, -56], [62, -52], [-36, -64], [40, -66], [70, -24]]));
  if (t >= 3) layers.push(luzDoOuro(c, { x: 96, w1: 92 }));
  return layers;
}

/** Passarinho desenhado (pardal), olhando para a direita, com os pés em (0,0). */
function passaroShapes(cor = "#C1694F", peito = "#FFE8B6") {
  return [
    lib.makeEllipse(5.4, -8.2, 0.8, 0.8, hex("#292F33"), "Olho"),
    fill([poligono([[7.6, -8], [10.6, -7], [7.6, -6]])], "#F4900C", "Bico"),
    fill([forma([[-4, -6], [1, -7.5], [3, -4.5], [-3, -3]])], "#8A4633", "AsaFechada"),
    lib.makeEllipse(4.6, -7.4, 3.4, 3.2, hex(cor), "Cabeca"),
    lib.makeEllipse(1, -4.6, 3.6, 2.8, hex(peito), "Peito"),
    fill([forma([[-9, -6], [-4, -8], [3, -7], [4, -3], [0, -1.6], [-5, -3]])], cor, "Corpo"),
    stroke([reta([[0, -2], [-0.6, 0]]), reta([[2, -2], [2, 0]])], 0.8, hex("#8A4633"), "Pes"),
  ];
}

/** Pose de São Francisco (figura de pé). */
const FRANCISCO = { F: [100, 66], K: 0.52 };

/** São Francisco de Assis: abre os braços e os passarinhos pousam nas mãos. */
function gestoFrancisco(t, c) {
  const { F, K } = FRANCISCO;
  const HABITO = "#7A4A2A";
  const cordao = [
    lib.makeEllipse(7 * K, 66 * K, 1.4 * K, 1.2 * K, hex("#F5F8FA"), "No1"), lib.makeEllipse(7.6 * K, 74 * K, 1.4 * K, 1.2 * K, hex("#F5F8FA"), "No2"), lib.makeEllipse(8.2 * K, 82 * K, 1.4 * K, 1.2 * K, hex("#F5F8FA"), "No3"),
    stroke([reta(escala(K, [[-24, 56], [24, 56]])), polyline(escala(K, [[6, 56], [7, 70], [8.4, 86]]))], 1.8 * K, hex("#F5F8FA"), "Cordao"),
  ];
  const capuz = fill([forma(escala(K, [[-18, 14], [-10, 22], [0, 24], [10, 22], [18, 14], [22, 26], [0, 32], [-22, 26]]))], "#5C3A21", "Capuz");
  const corpo = naFrenteDe(figuraHomem(K, { tunica: HABITO, corCabelo: "#5C3A21", barba: "#5C3A21", tonsura: true, bracos: "nenhum" }), "Veste", [...cordao, capuz]);
  const francisco = L("G_Francisco", corpo, { p: F, o: anim(aparecer(0, 6)) });
  // os braços sobem dos lados até abertos (a pose "abertos" da figura), girando no ombro
  const braco = (nm, lado) => {
    const ombro = [lado * OMBRO_D[0] * K, OMBRO_D[1] * K], mao = [lado * 44 * K, 2 * K];
    return L(nm, [lib.makeEllipse(mao[0], mao[1], 4.2 * K, 4.2 * K, hex(PELE), "Mao"), stroke([polyline(escala(K, [[lado * 20, 26], [lado * 34, 16], [lado * 44, 2]]))], 8 * K, hex(HABITO), "Manga")], {
      a: ombro, p: add(F, ombro), r: anim([[0, lado * -120], [6, lado * -120, "ease"], [24, 0]]), o: anim(aparecer(0, 6)),
    });
  };
  const maoE = add(F, [-44 * K, 2 * K - 3.4]), maoD = add(F, [44 * K, 2 * K - 3.4]);
  // cada passarinho é desenhado já pousado na mão; o grupo dele voa de `de` até lá (deslocamento que termina em zero)
  const voo = (de, para, t0) => {
    const d = (q) => [q[0] - para[0], q[1] - para[1]];
    return anim([[0, d(de)], [t0, d(de), "out"], [t0 + 8, d([(de[0] + para[0]) / 2, Math.min(de[1], para[1]) - 2])], [t0 + 18, [0, 0]], ...pulo([0, 0], t0 + 30, { h: 2, d: 6 })]);
  };
  const passaros = L("G_Passaros", [
    grupoAnimado("Passaro1", transladar(espelhar(passaroShapes()), maoE), { p: voo([36, 46], maoE, 22), o: anim(aparecer(22, 4)) }),
    grupoAnimado("Passaro2", transladar(passaroShapes("#8A4633", "#F5F8FA"), maoD), { p: voo([164, 46], maoD, 28), o: anim(aparecer(28, 4)) }),
  ], { p: [0, 0] });
  const chao = cena("Chao", [fill([forma([[44, 124], [100, 120], [156, 124], [100, 128]])], "#77B255", "Chao")]);
  const layers = [passaros, braco("G_BracoE", -1), braco("G_BracoD", 1), francisco];
  // o lobo, de um lado só, aparece sentado aos pés dele, sem cruzar o corpo do santo
  if (t >= 2) layers.push(L("T2_Lobo", loboShapes(), { a: [0, 0], p: LOBO, s: anim([[0, 0], ...pop(40, 12, { over: 94, base: 88 })]), o: anim(aparecer(40, 6)) }));
  layers.push(chao);
  if (t >= 3) {
    const sol = [lib.makeRays(10, 9, 13, 8, hex("#FFAC33"), "Coroa do sol", [0, 0]), lib.makeEllipse(0, 0, 8, 8, hex("#FFCC4D"), "Sol")];
    const lua = [fill([forma([[0, -9], [6, -6], [8, 0], [6, 6], [0, 9], [3, 4], [4, 0], [3, -4]])], "#FFE8B6", "Lua")];
    layers.push(L("T3_SolELua", [...transladar(sol, [-62, 0]), ...transladar(lua, [64, 0])], { p: anim([[0, [100, 40]], [48, [100, 40], "out"], [60, [100, 34]]]), o: anim(aparecer(48, 8)) }));
    layers.push(luzDoOuro(c, { w1: 90 }));
  }
  return layers;
}

/**
 * Lobo de Gúbio, manso, sentado de lado e olhando para a esquerda (para
 * Francisco): orelhas pontudas, focinho, peito claro, patas da frente em pé e
 * o rabo peludo no chão; as patas em y = 0, do x −11 (focinho) ao 40 (rabo).
 */
function loboShapes() {
  return [
    lib.makeEllipse(-10, -25, 1.5, 1.3, hex("#292F33"), "Nariz"),
    stroke([lib.polyline([[-3, -29.6], [-1.4, -30.4], [0.2, -29.6]])], 0.9, hex("#292F33"), "Olho"),
    fill([forma([[-10, -24.4], [-4, -22.6], [1, -22.4], [-3, -21]])], "#66757F", "Boca"),
    fill([poligono([[5, -40], [3.4, -32], [8, -33]])], "#E1E8ED", "Orelha clara"),
    fill([poligono([[2, -33], [5, -42], [9, -33]]), poligono([[7, -33], [11, -40], [12.6, -31]])], "#66757F", "Orelhas"),
    fill([forma([[-11, -26.4], [-5, -29], [-3, -27], [-2, -23], [-10, -24]])], "#CCD6DD", "Focinho"),
    fill([forma([[-4, -30], [2, -34.6], [9, -34], [13, -29], [12, -22], [6, -19.6], [-1, -21.4]])], "#8899A6", "Cabeca"),
    lib.makeEllipse(2.6, -1.2, 2.8, 1.4, hex("#66757F"), "PataE"), lib.makeEllipse(8.6, -1.2, 2.8, 1.4, hex("#66757F"), "PataD"),
    stroke([reta([[3, -13], [3, -1.6]]), reta([[8.4, -13], [8.4, -1.6]])], 3.6, hex("#8899A6"), "Patas da frente"),
    fill([forma([[0, -8], [0.6, -16], [4, -22], [9, -21], [9, -12], [6, -6]])], "#E1E8ED", "Peito"),
    fill([forma([[18, -2], [16, -10], [20, -16], [27, -15], [30, -8], [28, -1]])], "#8899A6", "Coxa"),
    fill([forma([[0, -6], [0, -16], [4, -24], [12, -24], [20, -18], [27, -12], [29, -4], [26, 0], [6, 0]])], "#AAB8C2", "Corpo"),
    fill([forma([[34, -4.6], [40, -4], [42, -1.6], [38, 0.2], [33, -1]])], "#E1E8ED", "Ponta do rabo"),
    fill([forma([[22, -1], [26, -5], [32, -6.4], [38, -5.4], [41, -2.4], [36, 0.4], [28, 1], [22, 1]])], "#8899A6", "Rabo"),
  ];
}
/** Onde o lobo se senta, aos pés de Francisco (à direita de quem olha), sem tocar o corpo dele. */
const LOBO = [129, 125];

/** Mãos postas e as mangas, num busto (escala k), com a cor da manga. */
function maosPostas(k, manga, pele = PELE) {
  return [
    fill([forma(escala(k, [[0, 30], [3.5, 38], [3, 46], [-3, 46], [-3.5, 38]]))], pele, "MaosPostas"),
    stroke([lib.polyline(escala(k, [[-18, 58], [-9, 50], [-3, 46]])), lib.polyline(escala(k, [[18, 58], [9, 50], [3, 46]]))], 7 * k, hex(manga), "Mangas"),
  ];
}

/** Rosto de Maria no Rosário (busto de manto) e a escala. */
const ROSARIO = { F: [100, 62], K: 0.74 };
/** Topo do terço do Rosário (nas mãos de Maria) e a escala do terço. */
const TERCO_TOPO = [100, 96], TERCO_ESCALA = 130;
/** Laço do terço próprio do Rosário (maior que o do `tercoShapes` comum). */
const ROSARIO_LACO = { rx: 16, ry: 15, cy: 16 };

/**
 * O terço próprio de Nossa Senhora do Rosário, pendurado pelo alto do laço em
 * (0,0): contas peroladas (5 dezenas de 10 contas pequenas, separadas por 4
 * contas grandes), a medalha de Maria (oval azul com o M) na junção, o
 * pendente (1 grande, 3 pequenas, 1 grande) e o crucifixo com o corpo de
 * Cristo. Diferente do `tercoShapes` comum, que é acréscimo de prata de
 * outros troféus.
 */
function rosarioShapes() {
  const { dezenas, grandes } = tercoLaco(ROSARIO_LACO);
  const BAIXO = ROSARIO_LACO.cy + ROSARIO_LACO.ry;
  const pendG = [[0, BAIXO + 6], [0, BAIXO + 17]], pendP = [[0, BAIXO + 9.4], [0, BAIXO + 11.8], [0, BAIXO + 14.2]];
  const CRUZ = BAIXO + 19.4;
  const contas = (centros, r, cor, nm) => grupo(nm, centros.map(([x, y]) => lib.makeEllipse(x, y, r, r, hex(cor), nm)));
  return [
    lib.makeEllipse(0, CRUZ + 3, 0.9, 0.9, hex(PELE), "Cabeca de Cristo"),
    stroke([lib.polyline([[-3.4, CRUZ + 3.4], [0, CRUZ + 4.6], [3.4, CRUZ + 3.4]])], 0.8, hex(PELE), "Bracos de Cristo"),
    fill([forma([[-0.8, CRUZ + 4], [0.8, CRUZ + 4], [0.6, CRUZ + 9], [-0.6, CRUZ + 9]])], PELE, "Corpo de Cristo"),
    fill([rect(-1, CRUZ, 1, CRUZ + 13), rect(-4.4, CRUZ + 3, 4.4, CRUZ + 5)], "#AAB8C2", "Crucifixo"),
    ...transladar(letrasShapes("M", 2.4, { cor: "#FFFFFF", largura: 0.5, nm: "M de Maria" }), [0, BAIXO + 0.2]),
    lib.makeEllipse(0, BAIXO + 0.2, 2, 2.4, hex("#3B88C3"), "Centro da medalha"),
    lib.makeEllipse(0, BAIXO + 0.2, 2.8, 3.3, hex("#AAB8C2"), "Medalha"),
    contas([...grandes, ...pendG], 1.9, "#C9D6E2", "ContasGrandes"),
    contas([...dezenas.flat(), ...pendP], 1.15, "#DCE6EE", "ContasPequenas"),
    stroke([reta([[0, BAIXO + 3], [0, CRUZ]])], 0.5, hex("#99AAB5"), "CordaPendente"),
    lib.makeEllipseRing(0, ROSARIO_LACO.cy, ROSARIO_LACO.rx, ROSARIO_LACO.ry, 0.5, hex("#99AAB5"), "Corda"),
  ];
}

/** Nossa Senhora do Rosário: o terço desce e as contas acendem dezena por dezena. */
function gestoRosario(t, c) {
  const desce = anim([[0, [100, 44]], [2, [100, 44], "out"], [18, TERCO_TOPO]]);
  const balanca = anim([[0, 0], [18, 0], ...onda(0, 3, 50, END, { period: 30 })]);
  const terco = L("G_Terco", rosarioShapes(), { p: desce, s: TERCO_ESCALA, r: balanca, o: anim(aparecer(0, 6)) });
  const { dezenas, grandes } = tercoLaco(ROSARIO_LACO);
  const acesas = dezenas.map((pts, d) => grupoAnimado(`Dezena${d + 1}`, [
    ...pts.map(([x, y], j) => lib.makeEllipse(x, y, 1.15, 1.15, hex("#FFCC4D"), `Conta${j}`)),
    ...(grandes[d] ? [lib.makeEllipse(grandes[d][0], grandes[d][1], 1.9, 1.9, hex("#F4900C"), "PaiNosso")] : []),
  ], { o: anim(aparecer(20 + d * 6, 4)) }));
  const dezenasL = L("G_Dezenas", acesas, { p: desce, s: TERCO_ESCALA, r: balanca });
  const layers = [];
  if (t >= 3) {
    const { F } = ROSARIO;
    const rosas = Array.from({ length: 9 }, (_, k) => {
      const a = Math.PI + ((k + 0.5) / 9) * Math.PI;
      return transladar(rosaShapes(3.6, { cor: "#FFFFFF", escuro: "#CCD6DD", folha: "#77B255" }), [30 * Math.cos(a), 12 + 30 * Math.sin(a)]);
    }).flat();
    layers.push(L("T3_AureolaRosas", rosas, { a: [0, 0], p: add(F, [0, -6]), s: anim([[0, 0], ...pop(48, 12, { over: 108 })]), o: anim(aparecer(48, 4)) }));
  }
  layers.push(dezenasL, terco);
  if (t >= 2) {
    const { F, K } = ROSARIO;
    layers.push(L("T2_Maria", [...maosPostas(K, "#3D6FB6"), ...busto(K, { manto: "#3D6FB6", veste: "#F5F8FA", orla: "#FFCC4D" })], {
      p: anim([[0, add(F, [0, 6])], [40, add(F, [0, 6]), "out"], [52, F]]), o: anim(aparecer(40, 8)),
    }));
  }
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 140, w1: 96 }));
  return layers;
}

/** A imagem de Nossa Senhora Aparecida, com o rosto em (0,0): manto azul em triângulo com orla dourada, rosto e mãos escuros, peanha. */
function aparecidaShapes() {
  const manto = forma([[0, -15], [9, -12], [12.5, -2], [15, 14], [22, 36], [29, 56], [33, 70], [0, 72], [-33, 70], [-29, 56], [-22, 36], [-15, 14], [-12.5, -2], [-9, -12]]);
  return [
    stroke([lib.polyline([[-3.6, -0.6], [-2.2, 0.6], [-0.8, -0.6]]), lib.polyline([[0.8, -0.6], [2.2, 0.6], [3.6, -0.6]])], 0.9, hex("#2B1A10"), "Olhos"),
    stroke([lib.polyline([[-1.6, 4.6], [0, 5.3], [1.6, 4.6]])], 0.9, hex("#4A2412"), "Boca"),
    lib.makeEllipse(0, 0, 6.6, 8.2, hex(PELE_ESCURA), "Rosto"),
    fill([forma([[0, 16], [3.6, 22], [3, 30], [-3, 30], [-3.6, 22]])], PELE_ESCURA, "MaosPostas"),
    stroke([reta([[0, 32], [0, 66]]), lib.polyline([[-7, 36], [0, 33], [7, 36]])], 1.4, hex("#FFCC4D"), "Bordado"),
    fill([forma([[0, 12], [7, 30], [11, 68], [-11, 68], [-7, 30]])], "#173A75", "Veste"),
    fill([forma([[0, -11], [7.5, -8], [9.5, 2], [8, 12], [0, 14], [-8, 12], [-9.5, 2], [-7.5, -8]])], "#2B1A10", "Cabelo"),
    stroke([manto], 2.4, hex("#FFCC4D"), "Orla"),
    fill([manto], "#1F4E9A", "Manto"),
    fill([rect(-20, 70, 20, 76)], "#E1E8ED", "Peanha"),
  ];
}
/** Rede de pesca (saco) com o meio da boca em (0, 50) e o fundo em (0, 84), no desenho da imagem. */
function redeShapes() {
  const fios = [];
  for (let k = 1; k <= 3; k++) {
    const f = k / 4;
    fios.push(lib.polyline([[-40 + 6 * f, 50 + 6 * f], [-22, 50 + 26 * f], [0, 50 + 34 * f], [22, 50 + 26 * f], [40 - 6 * f, 50 + 6 * f]]));
  }
  for (const x of [-30, -18, -6, 6, 18, 30]) fios.push(lib.polyline([[x, 50], [x * 0.7, 66], [x * 0.3, 82]]));
  return [
    stroke(fios, 1, hex("#8A6A3A"), "Malha"),
    stroke([lib.polyline([[-40, 50], [-22, 76], [0, 84], [22, 76], [40, 50]]), reta([[-40, 50], [-46, 6]]), reta([[40, 50], [46, 6]])], 1.8, hex("#5C3A21"), "Cordas"),
  ];
}
/** Água do rio (faixa com ondas), de x0 a x1, com o alto em y. */
function aguaShapes(x0, x1, y, alto = 26) {
  const linhaDeOnda = (dy) => lib.polyline(Array.from({ length: 9 }, (_, k) => [x0 + ((x1 - x0) * k) / 8, y + dy + (k % 2 ? -2 : 2)]));
  return [
    stroke([linhaDeOnda(8), linhaDeOnda(16)], 1.4, hex("#FFFFFF"), "Ondas", { opacity: 80 }),
    fill([forma([[x0, y], [(x0 + x1) / 2, y - 3], [x1, y], [x1 - 4, y + alto], [x0 + 4, y + alto]])], "#5DADEC", "Agua"),
  ];
}
/** Peixinho, olhando para a direita, centrado em (0,0). */
function peixinhoShapes(cor = "#AAB8C2") {
  return [
    lib.makeEllipse(3, -0.6, 0.7, 0.7, hex("#292F33"), "Olho"),
    fill([forma([[6, 0], [2, -3], [-3, -2.6], [-5, 0], [-3, 2.6], [2, 3]])], cor, "Peixe"),
    fill([poligono([[-4.4, 0], [-8, -3], [-7, 0], [-8, 3]])], cor, "Cauda"),
  ];
}

/** Rosto da imagem de Aparecida no fim da subida. */
const APARECIDA = [100, 56];

/** Nossa Senhora Aparecida: a rede sobe das águas trazendo a imagem; a água escorre. */
function gestoAparecida(t, c) {
  const sobe = [[0, [100, 84]], [4, [100, 84], "out"], [34, APARECIDA], ...flutuar(APARECIDA, 40, 1)];
  const imagem = L("G_Imagem", aparecidaShapes(), { p: anim(sobe), o: anim(aparecer(4, 8)) });
  const rede = L("G_Rede", redeShapes(), { p: anim(sobe), o: anim(aparecer(4, 8)) });
  const gota = (x, d) => transladar(lagrima(1.6), [x, d]);
  const gotas = L("G_Gotas", [...gota(-8, 0), ...gota(6, 6), ...gota(0, 12)], {
    p: anim([[0, [100, 142]], [30, [100, 142], "in"], [48, [100, 160]], [49, [100, 142]], [56, [100, 142], "in"], [74, [100, 160]], [75, [100, 142]], [78, [100, 142], "in"], [89, [100, 150]]]),
    o: anim([[0, 0], [30, 0], [32, 100], [46, 100], [48, 0], [56, 0], [58, 100], [72, 100], [74, 0], [78, 0], [80, 100]]),
  });
  const agua = L("G_Agua", aguaShapes(-70, 70, 0), { p: anim([[0, [100, 144]], ...onda([100, 144], 3, 0, END, { period: 45, axis: 0 })]), o: anim(aparecer(0, 6)) });
  const layers = [];
  if (t >= 3) layers.push(L("T3_Coroa", coroaShapes(18), { p: anim([[0, add(APARECIDA, [0, -26])], [48, add(APARECIDA, [0, -26]), "ease"], [60, add(APARECIDA, [0, -13])], ...flutuar(add(APARECIDA, [0, -13]), 60, 1)]), o: anim(aparecer(48, 6)) }));
  layers.push(imagem);
  if (t >= 2) layers.push(L("T2_Peixes", [...transladar(peixinhoShapes(), [-14, 78]), ...transladar(peixinhoShapes("#8899A6"), [12, 79]), ...transladar(espelhar(peixinhoShapes()), [0, 82])], {
    p: anim(deslocar(sobe, [0, 2])), o: anim(aparecer(40, 6)),
  }));
  layers.push(rede, gotas);
  if (t >= 2) {
    const pescador = (x, cor, barba) => transladar(bustoHomem(0.24, { veste: cor, corCabelo: barba, barba }), [x, 116]);
    layers.push(L("T2_Barco", [
      fill([poligono([[122, 128], [172, 128], [166, 142], [128, 142]])], "#8A4633", "Casco"),
      stroke([reta([[122, 128], [172, 128]])], 2, hex("#5C3A21"), "Borda do barco"),
      ...pescador(136, "#3B88C3", "#3B2416"), ...pescador(150, "#F4900C", "#5C3A21"), ...pescador(164, "#77B255", "#8A4633"),
    ], { p: anim([[0, [4, 0]], [40, [4, 0], "out"], [54, [0, 0]], ...onda([0, 0], 1.5, 54, END, { period: 30, axis: 1 })]), o: anim(aparecer(40, 8)) }));
  }
  layers.push(agua);
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 140, w1: 90 }));
  return layers;
}
/** Gota de água desenhada (a lágrima da biblioteca, mais clara). */
const lagrima = (r) => require("./lottie-lib/desenhos").lagrimaShapes(r, { cor: "#88C9F9" });

/** Castelo de cristal (o Castelo Interior), com as sete janelas (moradas) apagadas. */
const MORADAS = [[[82, 104], [154, 104]], [[94, 124], [142, 124]], [[110, 92], [126, 92]], [[118, 116]]];
function casteloShapes() {
  const ameias = (x0, x1, y) => {
    const pts = [[x0, y + 8]];
    const n = Math.round((x1 - x0) / 5);
    for (let k = 0; k < n; k++) {
      const a = x0 + ((x1 - x0) * k) / n, b = x0 + ((x1 - x0) * (k + 0.5)) / n, d = x0 + ((x1 - x0) * (k + 1)) / n;
      pts.push([a, y], [b, y], [b, y + 3.5], [d, y + 3.5]);
    }
    pts.push([x1, y], [x1, y + 8]);
    return poligono(pts);
  };
  const janela = ([x, y], w = 4.4, h = 7) => forma([[x - w, y + h], [x - w, y - h * 0.3], [x, y - h], [x + w, y - h * 0.3], [x + w, y + h]]);
  const formas = [rect(78, 82, 96, 152), rect(140, 82, 158, 152), rect(88, 104, 148, 152), rect(102, 70, 134, 104), ameias(76, 98, 76), ameias(138, 160, 76), ameias(100, 136, 64)];
  return [
    stroke([reta([[86, 90], [86, 146]]), reta([[150, 90], [150, 146]]), reta([[108, 76], [108, 100]])], 1.2, hex("#FFFFFF"), "Facetas", { opacity: 90 }),
    fill(MORADAS.flat().map((p) => janela(p)), "#8EC5EE", "Janelas"),
    fill([forma([[112, 152], [112, 132], [118, 126], [124, 132], [124, 152]])], "#A9D4F5", "Porta"),
    stroke(formas, 1.6, hex("#5DADEC"), "Arestas"),
    fill(formas, "#DDF0FF", "Cristal"),
  ];
}

/** Rosto de Santa Teresa na prata, a escala e a âncora. */
const TERESA = pose([44, 100], 0.5, 75, 0);

/** Santa Teresa de Ávila: o castelo de cristal acende de fora para dentro, morada por morada, até a luz do centro. */
function gestoTeresaAvila(t, c) {
  const janela = ([x, y]) => forma([[x - 4.4, y + 7], [x - 4.4, y - 2.1], [x, y - 7], [x + 4.4, y - 2.1], [x + 4.4, y + 7]]);
  const castelo = L("G_Castelo", casteloShapes(), { a: [118, 152], p: [118, 152], s: anim(pop(0, 14, { over: 104 })), o: anim(aparecer(0, 6)) });
  const moradas = L("G_Moradas", MORADAS.slice(0, 3).map((ps, k) => grupoAnimado(`Morada${k + 1}`, [fill(ps.map(janela), "#FFD983", "Acesa")], { o: anim(aparecer(16 + k * 8, 5)) })), { p: [0, 0] });
  const centro = L("G_Centro", [
    lib.makeEllipse(0, 0, 3, 3, hex("#FFFFFF"), "Miolo"),
    fill([janela([0, 0])], "#FFCC4D", "Acesa"),
  ], { p: MORADAS[3][0], o: anim([...aparecer(42, 6), ...onda(100, -25, 48, END, { period: 20 })]) });
  const layers = [centro, moradas, castelo];
  if (t >= 2) {
    const { K, F } = TERESA;
    layers.push(
      L("T2_Pena", [
        stroke([reta([[0, 0], [0, -8]])], 1.2, hex("#5C3A21"), "Cano"),
        fill([forma([[0, -6], [3, -14], [4, -26], [0, -34], [-2, -24], [-3, -12]])], "#F5F8FA", "Pena"),
        stroke([reta([[0, -4], [0, -32]])], 0.8, hex("#AAB8C2"), "Haste"),
      ], { p: [70, 156], r: anim([[0, 0], [40, 0, "ease"], [52, 18], ...onda(18, 4, 52, END, { period: 24 })]), s: anim([[0, 0], ...pop(42, 10, { over: 170, base: 150 })]), o: anim(aparecer(42, 4)) }),
      L("T2_Teresa", atrasDe(busto(K, { manto: "#EFE6D2", veste: "#7A4A2A", orla: "#C9B78F" }), "Rosto", veuCarmelita(K)), { p: anim([[0, add(F, [0, 6])], [40, add(F, [0, 6]), "out"], [52, F]]), o: anim(aparecer(40, 8)) }),
    );
  }
  if (t >= 3) {
    layers.unshift(aureola({ center: [TERESA.F[0], TERESA.F[1] + TOPO_MANTO * TERESA.K], rx: 9, ry: 2.6, t0: 54, nm: "T3_Aureola" }));
    // os raios saem do centro do castelo, na frente dele
    layers.splice(layers.indexOf(centro) + 1, 0, raios("T3_Raios", MORADAS[3][0], { count: 16, r1: 10, r2: 26, half: 3, t0: 50, peak: 70 }));
    layers.push(luzDoOuro(c, { x: 114, w1: 90 }));
  }
  return layers;
}

/**
 * Asa de ave, de penas (como a da águia e a do anjo, não de morcego), com a
 * raiz em (0,0), abrindo para a direita e para cima até a ponta perto de (w, −w):
 * a fileira das penas longas (rêmiges), a das médias e a das cobertas, cada
 * pena com a ponta arredondada, em tons quentes de ave. `espelhar` faz a asa
 * que abre para a esquerda.
 */
function asaDePenasShapes(w, { penas = "#A0522D", medias = "#D4884A", cobertas = "#F2C47E", haste = "#6B3A1E", borda = "#F7DEB0" } = {}) {
  // o bordo de ataque (o "braço" da asa), que sobe da raiz até o punho; as penas saem dele em leque para fora
  const bordo = [[0, 0], [0.04, -0.36], [0.14, -0.66], [0.28, -0.82]];
  const em = (u) => {
    const n = bordo.length - 1, x = Math.min(n - 1e-9, Math.max(0, u * n)), k = Math.floor(x), f = x - k;
    return [bordo[k][0] + (bordo[k + 1][0] - bordo[k][0]) * f, bordo[k][1] + (bordo[k + 1][1] - bordo[k][1]) * f];
  };
  // cada pena sai do bordo em u, apontando de "para fora e um pouco para baixo" (perto da raiz) a "para fora e para cima" (no punho)
  const direcao = (u) => ((14 - 56 * u) * Math.PI) / 180;
  const pena = (u, comp, larg) => {
    const [bx, by] = em(u), ang = direcao(u);
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const P = (a, b) => [(bx + dx * a + nx * b) * w, (by + dy * a + ny * b) * w];
    return forma([P(0, -larg * 0.7), P(comp * 0.6, -larg), P(comp, 0), P(comp * 0.6, larg), P(0, larg * 0.7)]);
  };
  const comprimento = (u, k) => (0.46 + 0.3 * u) * k;
  const fileira = (n, k, larg) => Array.from({ length: n }, (_, j) => {
    const u = j / (n - 1);
    return pena(u, comprimento(u, k), larg);
  });
  const remiges = fileira(9, 1, 0.08);
  const hastes = Array.from({ length: 9 }, (_, j) => {
    const u = j / 8, [bx, by] = em(u), ang = direcao(u), comp = comprimento(u, 0.92);
    return reta([[(bx + Math.cos(ang) * 0.1) * w, (by + Math.sin(ang) * 0.1) * w], [(bx + Math.cos(ang) * comp) * w, (by + Math.sin(ang) * comp) * w]]);
  });
  const braco = forma([...bordo, [0.36, -0.74], [0.24, -0.5], [0.16, -0.2], [0.12, 0.04]].map(([x, y]) => [x * w, y * w]));
  return [
    fill([braco], cobertas, "Bordo"),
    fill(fileira(7, 0.36, 0.08), borda, "Cobertas"),
    fill(fileira(8, 0.66, 0.085), medias, "Penas medias"),
    stroke(hastes, Math.max(0.6, w * 0.018), hex(haste), "Hastes"),
    fill(remiges, penas, "Penas longas"),
  ];
}

/**
 * Touro de São Lucas, olhando para a direita, com o meio do corpo em (0,0) e
 * os cascos em y = 31; o rabo à esquerda. A asa de trás (de penas, a mesma da
 * frente, mais escura) sai do ombro e abre para cima e para trás (para o rabo).
 */
function touroShapes() {
  return [
    lib.makeEllipse(37, -14.5, 1.3, 1.3, hex("#292F33"), "Olho"),
    lib.makeEllipse(47, -6, 0.8, 0.8, hex("#5C3A21"), "Narina"),
    lib.makeEllipse(45, -6, 4.8, 3.8, hex("#D99E82"), "Focinho"),
    stroke([lib.polyline([[34, -19], [29, -25], [31, -31]]), lib.polyline([[40, -19], [45, -25], [43, -31]])], 2.8, hex("#FFE8B6"), "Chifres"),
    fill([forma([[31, -17], [24, -22], [22, -17], [28, -14]])], "#8A4633", "Orelha"),
    fill([forma([[26, -12], [33, -20], [42, -19], [48, -10], [47, -3], [40, -2], [30, -4]])], "#A0522D", "Cabeca"),
    stroke([reta([[16, 10], [17, 29]]), reta([[22, 8], [24, 29]]), reta([[-22, 10], [-23, 29]]), reta([[-14, 10], [-13, 29]])], 5, hex("#8A4633"), "Pernas"),
    fill([rect(14, 28, 20, 32), rect(21, 28, 27, 32), rect(-26, 28, -20, 32), rect(-16, 28, -10, 32)], "#3B2416", "Cascos"),
    fill([forma([[-30, -8], [-20, -16], [0, -17], [18, -16], [27, -10], [28, 6], [18, 12], [-20, 12], [-30, 6]])], "#A0522D", "Corpo"),
    stroke([lib.polyline([[-30, -4], [-35, 6], [-35, 16]])], 1.8, hex("#8A4633"), "Rabo"),
    lib.makeEllipse(-35, 17, 2, 3, hex("#3B2416"), "Tufo"),
    ...transladar(espelhar(asaDePenasShapes(34, { penas: "#7A3E1D", medias: "#A8683A", cobertas: "#C99A5E", haste: "#4A2812", borda: "#D9B27A" })), [ASA_DE_TRAS[0], ASA_DE_TRAS[1]]),
  ];
}
/** Touro de São Lucas: meio do corpo no fim. */
const TOURO = [88, 118];
/** Ombro do touro (no desenho, a partir do meio do corpo): a raiz da asa da frente; a de trás sai um pouco mais adiante e acima. */
const OMBRO_TOURO = [14, -12], ASA_DE_TRAS = [20, -16];

/** São Lucas Evangelista: o touro alado aparece e o livro do Evangelho se abre. */
function gestoLucas(t, c) {
  const touro = L("G_Touro", touroShapes(), { a: [0, 31], p: add(TOURO, [0, 31]), s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  // a asa da frente, presa no ombro, abre para cima e para trás (para o rabo) e bate devagar
  const asa = L("G_Asa", espelhar(asaDePenasShapes(40)), {
    a: [0, 0], p: add(TOURO, OMBRO_TOURO), r: anim([[0, -50], [10, -50, "out"], [26, 0], ...onda(0, 7, 26, END, { period: 20 })]), o: anim(aparecer(8, 6)),
  });
  const livro = L("G_Livro", livroAbertoShapes(50, 30, "#BE1931"), { p: [118, 160], s: anim([[0, [4, 100]], ...abrir(18, 32, { axis: "x", from: 4 })]), o: anim(aparecer(18, 3)) });
  const layers = [livro, asa, touro];
  if (t >= 2) {
    layers.push(L("T2_Paleta", [
      ...[[-6, -4, "#DD2E44"], [0, -7, "#FFCC4D"], [6, -5, "#3B88C3"], [8, 1, "#77B255"]].map(([x, y, cor], k) => lib.makeEllipse(x, y, 2.2, 1.8, hex(cor), `Tinta${k}`)),
      lib.makeEllipse(-6, 3, 2.2, 2, hex("#C1694F"), "Furo"),
      fill([forma([[-12, 0], [-8, -9], [2, -11], [11, -7], [12, 2], [4, 9], [-4, 8], [-2, 4], [-8, 6]])], "#E8C89E", "Paleta"),
      stroke([reta([[-10, 16], [10, -14]])], 2, hex("#8A4633"), "Pincel"),
      fill([forma([[10, -14], [13, -19], [12, -13]])], "#3B2416", "Ponta"),
    ], { p: [38, 150], r: anim([[0, 0], [40, 0, "ease"], [52, -10]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  if (t >= 3) layers.push(...aureolaERaios(add(TOURO, [40, -40]), { rx: 13, ry: 3.6 }));
  return layers;
}

/** Pose de São João Paulo II (busto de homem que se inclina pouco). */
const JOAO_PAULO = pose([84, 92], 0.74, 70, -3);

/** São João Paulo II: o Papa ergue a férula com o crucifixo e abençoa. */
function gestoJoaoPaulo(t, c) {
  const { K, A, P, R } = JOAO_PAULO;
  const P_ = (pts) => escala(K, pts);
  const ombros = forma(P_([[0, 16], [14, 20], [28, 32], [34, 56], [36, 70], [-36, 70], [-34, 56], [-28, 32], [-14, 20]]));
  const pelegrina = forma(P_([[0, 16], [14, 20], [28, 32], [31, 44], [0, 48], [-31, 44], [-28, 32], [-14, 20]]));
  const extras = [
    stroke([lib.polyline(P_([[-6, 20], [0, 30], [6, 20]]))], 0.9 * K, hex("#FFCC4D"), "Cordao"),
    fill([rect(-1, 30 * K, 1, 40 * K), rect(-3.4, 33 * K, 3.4, 35 * K)], "#FFCC4D", "CruzPeitoral"),
    stroke([pelegrina], 1.1, hex("#AAB8C2"), "Contorno da pelegrina"),
    fill([pelegrina], "#FFFFFF", "Pelegrina"),
  ];
  const solideu = [lib.makeEllipseRing(0, -15.6 * K, 7.6 * K, 3.6 * K, 0.8, hex("#AAB8C2"), "Contorno do solideu"), lib.makeEllipse(0, -15.6 * K, 7.6 * K, 3.6 * K, hex("#FFFFFF"), "Solideu")];
  const corpo = bustoHomem(K, { veste: "#F5F8FA", corCabelo: "#CCD6DD" });
  const papa = L("G_Papa", [...solideu, ...naFrenteDe(atrasDe(corpo, "Decote", [stroke([ombros], 1.1, hex("#AAB8C2"), "Contorno")]), "Decote", extras)], {
    a: A, p: P, r: anim([[0, 0], [10, 0, "ease"], [26, R]]), o: anim(aparecer(0, 6)),
  });
  // a férula (cruz papal com o crucifixo) se ergue, girando na mão esquerda dele
  const MAO = [124, 124];
  const ferula = L("G_Ferula", [
    lib.makeEllipse(0, 0, 3.6, 3, hex(PELE), "MaoE"),
    stroke([reta([[-2, 2], [-12, 8]])], 5.5, hex("#F5F8FA"), "Manga"),
    lib.makeEllipse(0, -80.5, 2.2, 2.4, hex("#66757F"), "Cabeca de Cristo"),
    fill([forma([[0, -78], [2.4, -75], [1.8, -64], [0.8, -60], [-0.8, -60], [-1.8, -64], [-2.4, -75]])], "#66757F", "Corpo de Cristo"),
    stroke([lib.polyline([[-11, -78.5], [0, -76], [11, -78.5]])], 1.6, hex("#66757F"), "Bracos de Cristo"),
    stroke([reta([[-14, -78], [14, -78]]), reta([[0, -92], [0, 44]])], 3, hex("#AAB8C2"), "Ferula"),
  ], { a: [0, 0], p: MAO, r: anim([[0, -50], [6, -50, "ease"], [26, 0]]), o: anim(aparecer(4, 6)) });
  // a mão direita sobe e abençoa (um pequeno sinal da cruz)
  const ombro = naPose(P, A, R, [-24 * K, 30 * K]);
  const benze = L("G_Mao", [
    lib.makeEllipse(-19, -22, 3.6, 4, hex(PELE), "MaoD"),
    fill([forma([[-21, -25], [-20.4, -31], [-19, -31], [-18.6, -25]]), forma([[-18.6, -25], [-17.6, -30.6], [-16.2, -30.6], [-16.6, -24]])], PELE, "Dedos"),
    stroke([lib.polyline([[0, 0], [-13, -6], [-18, -17]])], 6, hex("#F5F8FA"), "Manga"),
    stroke([lib.polyline([[0, 0], [-13, -6], [-18, -17]])], 7.6, hex("#AAB8C2"), "Contorno da manga"),
  ], { a: [0, 0], p: ombro, r: anim([[0, -70], [12, -70, "ease"], [30, 0], [38, 10], [46, 0], [52, 6], [60, 0]]), o: anim(aparecer(10, 6)) });
  const layers = [benze, ferula, papa];
  if (t >= 2) {
    layers.push(L("T2_Brasao", [
      ...transladar(letrasShapes("M", 7, { cor: "#FFCC4D", nm: "M" }), [5, 8]),
      fill([rect(-5, -16, -1.4, 18), rect(-14, -6, 12, -2.4)], "#FFCC4D", "Cruz"),
      fill([forma([[-15, -18], [15, -18], [15, 4], [0, 20], [-15, 4]])], "#1F4E9A", "Brasao"),
    ], { p: [38, 148], s: anim([[0, 0], ...pop(40, 12, { over: 112 })]), o: anim(aparecer(40, 4)) }));
  }
  if (t >= 3) layers.push(aureola({ center: naPose(P, A, R, [0, TOPO_HOMEM * K]), rx: 11, ry: 3.2, t0: 50, nm: "T3_Aureola" }), luzDoOuro(c, { x: 92, w1: 92 }));
  return layers;
}

/** Imagem de Cristo (rosto com cabelo e barba numa moldura oval dourada), centrada em (0,0). */
function imagemDeCristoShapes(r) {
  return [
    stroke([lib.polyline([[-1.4, -0.6], [-0.8, -0.2]]), lib.polyline([[0.8, -0.2], [1.4, -0.6]])], 0.5, hex("#3B2416"), "Olhos de Cristo"),
    fill([forma([[-2.4, 0.6], [0, 4.4], [2.4, 0.6], [0, 2]])], "#8A4633", "Barba de Cristo"),
    lib.makeEllipse(0, 0, 2.6, 3.2, hex(PELE), "Rosto de Cristo"),
    fill([forma([[0, -4.4], [3.6, -2], [4, 3], [-4, 3], [-3.6, -2]])], "#8A4633", "Cabelo de Cristo"),
    lib.makeEllipseRing(0, 0, r, r * 1.25, 1.1, hex("#FFCC4D"), "Moldura"),
    lib.makeEllipse(0, 0, r, r * 1.25, hex("#FFF1C1"), "Fundo"),
  ];
}

/** Rostos de Simão e de Judas Tadeu e a escala. */
const SIMAO = [60, 92], JUDAS = [140, 92], K_APOSTOLO = 0.62;

/** São Simão e São Judas Tadeu: os dois lado a lado; a chama de Pentecostes acende sobre Judas, que traz a imagem de Cristo no peito. */
function gestoSimaoJudas(t, c) {
  const K = K_APOSTOLO;
  const entra = (F, dx) => ({ p: anim([[0, add(F, [dx, 0])], [16, F, "out"]]), o: anim(aparecer(0, 8)) });
  const simao = L("G_Simao", bustoHomem(K, { veste: "#BE1931", corCabelo: "#AAB8C2", barba: "#CCD6DD" }), entra(SIMAO, -10));
  const judas = L("G_Judas", naFrenteDe(bustoHomem(K, { veste: "#5C913B", corCabelo: "#5C3A21", barba: "#5C3A21" }), "Decote", transladar(imagemDeCristoShapes(5.4), [0, 42 * K])), entra(JUDAS, 10));
  const TOPO = add(JUDAS, [0, -17.4 * K - 1]);
  const chamaL = L("G_Chama", chamaShapes(18), {
    p: anim([[0, add(TOPO, [0, -30])], [14, add(TOPO, [0, -30]), "in"], [30, TOPO]]),
    s: anim([[0, [60, 60]], [30, [100, 100], "out"], ...onda([100, 100], 8, 34, END, { period: 10, axis: 1 })]), o: anim(aparecer(14, 4)),
  });
  const layers = [chamaL, simao, judas];
  if (t >= 2) {
    const dentes = Array.from({ length: 9 }, (_, k) => [[-4, -22 + k * 6], [-7, -19 + k * 6]]).flat();
    layers.push(
      L("T2_Serra", [
        stroke([lib.polyline([[-4, -26], ...dentes, [-4, 32]], { smooth: false })], 1, hex("#66757F"), "Dentes"),
        fill([rect(-4, -26, 4, 32)], "#CCD6DD", "Lamina"),
        fill([rect(-5, -38, 5, -26)], "#8A4633", "Cabo"),
      ], { p: [32, 134], r: anim([[0, 0], [40, 0, "ease"], [52, -6]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }),
      L("T2_Clava", [
        ...[[-2, -18], [3, -8], [-3, 2]].map(([x, y], k) => lib.makeEllipse(x, y, 1.6, 1.6, hex("#5C3A21"), `Calombo${k}`)),
        fill([forma([[-2.4, 30], [-6, -10], [-5, -24], [0, -28], [5, -24], [6, -10], [2.4, 30]])], "#A0522D", "Clava"),
      ], { p: [174, 134], r: anim([[0, 0], [44, 0, "ease"], [56, 8]]), s: anim([[0, 0], ...pop(44, 12)]), o: anim(aparecer(44, 4)) }),
    );
  }
  if (t >= 3) {
    layers.unshift(coroaDesce("T3_CoroaSimao", 16, add(SIMAO, [0, -17.4 * K - 8]), 48), coroaDesce("T3_CoroaJudas", 16, add(TOPO, [0, -20]), 52));
    layers.push(aureola({ center: add(SIMAO, [0, TOPO_HOMEM * K]), rx: 9, ry: 2.6, t0: 52, nm: "T3_AureolaSimao" }), aureola({ center: add(JUDAS, [0, TOPO_HOMEM * K]), rx: 9, ry: 2.6, t0: 56, nm: "T3_AureolaJudas" }));
    layers.push(palmaEmPe("T3_PalmaE", 40, [92, 170], 46, -20), palmaEmPe("T3_PalmaD", 40, [108, 170], 50, 20), luzDoOuro(c, { w1: 96 }));
  }
  return layers;
}

/** Contorno dos ombros de um busto sem manto (escala k), para a veste branca não sumir no fundo claro. */
const contornoOmbros = (k, cor = "#AAB8C2") => stroke([forma(escala(k, [[0, 16], [14, 20], [28, 32], [34, 56], [36, 70], [-36, 70], [-34, 56], [-28, 32], [-14, 20]]))], 1, hex(cor), "Contorno");

/** Santos da multidão de Todos os Santos: [x, y do rosto, escala, tipo]. */
const MULTIDAO = {
  tras: [[52, 102, 0.26, "homem"], [76, 100, 0.26, "mulher"], [100, 99, 0.26, "barba"], [124, 100, 0.26, "mulher2"], [148, 102, 0.26, "homem2"]],
  frente: [[64, 126, 0.3, "barba2"], [88, 124, 0.3, "mulher3"], [112, 124, 0.3, "homem3"], [136, 126, 0.3, "mulher4"]],
};
/** Um santo de vestes brancas, de tipo variado (homem com ou sem barba, mulher de cabelo solto). */
function santoDeBranco(k, tipo) {
  const veste = "#F5F8FA";
  const cabelos = { homem: "#5C3A21", homem2: "#292F33", homem3: "#8A4633", barba: "#CCD6DD", barba2: "#3B2416", mulher: "#8A4633", mulher2: "#FFCC4D", mulher3: "#292F33", mulher4: "#C1694F" };
  const cor = cabelos[tipo];
  const grupos = tipo.startsWith("mulher")
    ? busto(k, { veste, cabelo: "longo", corCabelo: cor })
    : bustoHomem(k, { veste, corCabelo: cor, barba: tipo.startsWith("barba") ? cor : null });
  return naFrenteDe(grupos, "Veste", [contornoOmbros(k)]);
}
/** Topo da cabeça (para a auréola) de um santo da multidão. */
const topoSanto = ([x, y, k]) => [x, y - 21 * k];

/** Todos os Santos: a multidão de santos aparece em fileiras e as auréolas acendem uma a uma. */
function gestoTodosSantos(t, c) {
  const fila = (nm, lista, t0) => L(nm, lista.flatMap(([x, y, k, tipo]) => transladar(santoDeBranco(k, tipo), [x, y])), {
    p: anim([[0, [0, 10]], [t0, [0, 10], "out"], [t0 + 14, [0, 0]]]), o: anim(aparecer(t0, 8)),
  });
  const todos = [...MULTIDAO.tras, ...MULTIDAO.frente];
  const ordem = [5, 0, 6, 1, 7, 2, 8, 3, 4];
  const aureolas = L("G_Aureolas", ordem.map((i, n) => grupoAnimado(`Aureola${i + 1}`, [lib.makeEllipseRing(...topoSanto(todos[i]), 5.6, 1.7, 1.5, kit.HALO_GOLD, "Anel")], {
    a: topoSanto(todos[i]), p: topoSanto(todos[i]), s: anim([[0, [0, 0]], [24 + n * 5, [0, 0], "out"], [30 + n * 5, [100, 100]]]), o: anim(aparecer(24 + n * 5, 4)),
  })), { p: [0, 0] });
  const layers = [];
  if (t >= 2) layers.push(L("T2_Palmas", MULTIDAO.frente.flatMap(([x, y]) => transladar(palmaShapes(24), [x + 9, y + 30])), { p: [0, 0], o: anim(aparecer(40, 8)) }));
  layers.push(fila("G_FilaFrente", MULTIDAO.frente, 6), aureolas, fila("G_FilaTras", MULTIDAO.tras, 0));
  if (t >= 3) layers.push(L("T3_Cordeiro", cordeiroDeDeusShapes(), { p: anim([[0, [102, 80]], [46, [102, 80], "out"], [58, [102, 86]], ...flutuar([102, 86], 58, 1.5)]), o: anim(aparecer(46, 8)) }));
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 100, bottom: 140 }));
  return layers;
}
/**
 * O Cordeiro de Deus, de pé nas quatro patas, olhando para a esquerda, com o
 * estandarte da Ressurreição (branco, com a cruz vermelha) na haste que ele
 * segura junto ao peito: lã branca em cachos (contorno de nuvem, com a borda
 * cinza para não sumir no fundo claro), cara e patas escuras, orelhas de lado
 * e o tufo de lã na cabeça. Os cascos em y = 0; vai de x −22 a 24 e de
 * y −54 (a cruz da haste) a 0.
 */
function cordeiroDeDeusShapes() {
  const C = [3, -19], RX = 14, RY = 8.6;
  // cachos em volta do corpo (o contorno de nuvem) e alguns por dentro
  const cachos = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2;
    return [C[0] + RX * Math.cos(a), C[1] + RY * Math.sin(a)];
  });
  const bolas = (r, cor, nm) => fill([...cachos.map(([x, y]) => lib.polyline(Array.from({ length: 12 }, (_, j) => [x + r * Math.cos((j / 12) * Math.PI * 2), y + r * Math.sin((j / 12) * Math.PI * 2)]), { closed: true })),
    forma([[C[0] - RX, C[1]], [C[0], C[1] - RY], [C[0] + RX, C[1]], [C[0], C[1] + RY]])], cor, nm);
  const caracois = [[-3, -21], [4, -24], [10, -19], [1, -15], [-6, -16], [8, -13]].map(([x, y]) => lib.polyline([[x - 2, y + 0.6], [x - 1, y - 1.2], [x + 1, y - 1.2], [x + 2, y + 0.6]]));
  const ESCURO = "#3D3330";
  return [
    // o estandarte: a bandeira tremula para a direita, presa no alto da haste
    stroke([reta([[-9, -50], [-9, -46]]), reta([[-11, -48.6], [-7, -48.6]])], 1.2, hex("#C99A3C"), "Cruz da haste"),
    stroke([reta([[-2.6, -44], [-2.6, -35]]), reta([[-7, -39.6], [2, -39.6]])], 1.8, hex("#DD2E44"), "Cruz do estandarte"),
    fill([forma([[-9, -45], [0, -46], [8, -44], [5, -40], [8, -35], [0, -34], [-9, -35]])], "#FFFFFF", "Estandarte"),
    stroke([forma([[-9, -45], [0, -46], [8, -44], [5, -40], [8, -35], [0, -34], [-9, -35]])], 0.8, hex("#CCD6DD"), "Borda do estandarte"),
    stroke([reta([[-9, -46], [-9, -10]])], 1.6, hex("#C99A3C"), "Haste"),
    // a cabeça: tufo de lã, olho, cara escura e orelhas de lado
    lib.makeEllipse(-15.4, -27.4, 1, 1, hex("#FFFFFF"), "Olho"),
    fill([forma([[-19, -30], [-17.4, -33.6], [-13, -35.4], [-8.6, -34], [-6.6, -30.6], [-10, -29.4], [-15, -29.4]])], "#FFFFFF", "Tufo"),
    stroke([forma([[-19, -30], [-17.4, -33.6], [-13, -35.4], [-8.6, -34], [-6.6, -30.6], [-10, -29.4], [-15, -29.4]])], 0.7, hex("#CCD6DD"), "Borda do tufo"),
    fill([forma([[-10, -29], [-6.4, -27], [-7, -25], [-11, -26]]), forma([[-17, -28], [-22, -27], [-21.4, -25.4], [-17, -26]])], ESCURO, "Orelhas"),
    fill([forma([[-12, -31], [-8, -28], [-8, -23], [-13, -18], [-18, -17.4], [-21, -20], [-19, -26], [-16, -30]])], ESCURO, "Cara"),
    stroke(caracois, 0.9, hex("#CCD6DD"), "Cachos"),
    bolas(4.2, "#FFFFFF", "La"),
    bolas(5, "#CCD6DD", "Contorno da la"),
    // as quatro patas escuras (as de trás, um pouco mais claras) e os cascos
    stroke([reta([[-6, -13], [-6, -1]]), reta([[10, -13], [10, -1]])], 2.8, hex(ESCURO), "Patas da frente"),
    stroke([reta([[-2, -13], [-2, -1]]), reta([[14, -13], [14, -1]])], 2.6, hex("#66575A"), "Patas de tras"),
    fill([rect(-7.6, -1.6, -4.4, 0), rect(8.4, -1.6, 11.6, 0), rect(-3.4, -1.6, -0.6, 0), rect(12.6, -1.6, 15.4, 0)], "#1E1A19", "Cascos"),
    lib.makeEllipse(19.4, -23, 3, 2.6, hex("#FFFFFF"), "Rabo"),
  ];
}

/** Crisântemo branco desenhado (vista de frente), centrado em (0,0), raio r. */
function crisantemoShapes(r) {
  const petalas = (n, rr, w, gira) => Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + gira, d = [Math.cos(a), Math.sin(a)], nn = [-d[1], d[0]];
    return forma([[d[0] * rr * 0.2, d[1] * rr * 0.2], [d[0] * rr * 0.6 + nn[0] * w, d[1] * rr * 0.6 + nn[1] * w], [d[0] * rr, d[1] * rr], [d[0] * rr * 0.6 - nn[0] * w, d[1] * rr * 0.6 - nn[1] * w]]);
  });
  return [
    lib.makeEllipse(0, 0, r * 0.22, r * 0.22, hex("#E8E3A0"), "Miolo"),
    fill(petalas(12, r * 0.7, r * 0.1, 0.26), "#FFFFFF", "PetalasDentro"),
    fill(petalas(16, r, r * 0.11, 0), "#E1E8ED", "PetalasFora"),
  ];
}
/** Mãos postas grandes (de frente, dedos para cima), com a base dos punhos em (0,0) e 64 px de altura, e as mangas. */
function maosRezandoShapes(manga = "#66757F") {
  const maos = forma([[0, -64], [4, -61], [8, -50], [11, -36], [14, -20], [13, -8], [8, -2], [0, 0], [-8, -2], [-13, -8], [-14, -20], [-11, -36], [-8, -50], [-4, -61]]);
  return [
    stroke([reta([[0, -62], [0, -4]])], 1, hex("#E0B49A"), "Juncao"),
    stroke([lib.polyline([[-2, -30], [-6, -20], [-7, -10]]), lib.polyline([[2, -30], [6, -20], [7, -10]])], 1.2, hex("#E0B49A"), "Polegares"),
    stroke([reta([[-6, -54], [-9, -40]]), reta([[6, -54], [9, -40]]), reta([[-9, -46], [-12, -32]]), reta([[9, -46], [12, -32]])], 0.8, hex("#E0B49A"), "Dedos"),
    fill([maos], PELE, "MaosPostas"),
    fill([forma([[-12, -6], [-20, 8], [-30, 34], [-10, 38], [0, 8]]), forma([[12, -6], [20, 8], [30, 34], [10, 38], [0, 8]])], manga, "Mangas"),
  ];
}

/** Fiéis Defuntos: mãos postas rezam pelos mortos, o ramo de crisântemos é depositado e uma luz sobe devagar. */
function gestoFieisDefuntos(t, c) {
  const MAOS = [100, 120];
  const maos = L("G_Maos", maosRezandoShapes(), { p: anim([[0, add(MAOS, [0, 8])], [16, MAOS, "out"]]), o: anim(aparecer(0, 8)) });
  const flor = (x, y, r) => transladar(crisantemoShapes(r), [x, y]);
  const ramo = L("G_Crisantemos", [
    fill([forma([[6, -3], [12, -6], [14, 0], [12, 6], [6, 3]])], "#744EAA", "Laco"),
    ...flor(-24, -6, 10), ...flor(-36, 6, 9.4), ...flor(-14, 7, 9),
    fill([forma([[-10, -2], [-4, -9], [2, -4]]), forma([[-6, 6], [0, 12], [4, 5]])], "#5C913B", "Folhas"),
    stroke([reta([[-20, -2], [28, 0]]), reta([[-28, 6], [28, 2]]), reta([[-12, 6], [28, 4]])], 2, hex("#3E721D"), "Hastes"),
  ], { p: anim([[0, [104, 132]], [14, [104, 132], "ease"], [34, [102, 164]]]), r: anim([[0, -40], [14, -40, "ease"], [34, 0]]), o: anim(aparecer(14, 6)) });
  // a luz sobe devagar: a luzSuave com `drop` negativo vai do alto 56 ao 26
  const sobe = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", top: 56, bottom: 96, drop: -30, w0: 8, w1: 34, t0: 26, dur: 40, peak: 50 });
  const layers = [];
  if (t >= 2) {
    const gotas = [[-5, 14], [2, 20], [7, 13]].flatMap(([x, y]) => transladar(lagrima(1.4), [x, y]));
    layers.push(L("T2_Aspersorio", [
      grupoAnimado("Gotas", gotas, { p: anim([[0, [0, 0]], [44, [0, 0], "in"], [60, [0, 10]], [61, [0, 0]], [64, [0, 0], "in"], [80, [0, 10]]]), o: anim([[0, 0], [44, 0], [46, 100], [58, 100], [60, 0], [64, 0], [66, 100], [78, 100], [80, 0]]) }),
      ...[[-3, -2], [0, -4], [3, -2], [-2, 1.4], [2, 1.4]].map(([x, y], k) => lib.makeEllipse(x, y, 0.9, 0.9, hex("#66757F"), `Furo${k}`)),
      lib.makeEllipse(-2, -3, 1.6, 1.2, hex("#FFFFFF"), "Reflexo", 80),
      lib.makeEllipse(0, 0, 6.4, 6.4, hex("#CCD6DD"), "Bola do aspersorio"),
      fill([rect(-2, 6, 2, 9)], "#99AAB5", "Anel"),
      fill([rect(-1.5, 9, 1.5, 34)], "#AAB8C2", "Cabo"),
      lib.makeEllipse(0, 35, 2.4, 2.4, hex("#99AAB5"), "Ponta do cabo"),
    ], { a: [0, 34], p: [152, 152], r: anim([[0, 30], [40, 30, "ease"], [50, -12], ...onda(-12, 5, 50, END, { period: 16 })]), o: anim(aparecer(40, 6)) }));
  }
  layers.push(ramo, maos, sobe);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 96, bottom: 140 }));
  return layers;
}

/** Cão marrom de orelha caída, olhando para a direita e comendo (cabeça baixa), com o meio do corpo em (0,0) e as patas em y = 18. */
function caoComendoShapes() {
  return [
    lib.makeEllipse(29.6, 4, 1.8, 1.5, hex("#292F33"), "Nariz"),
    lib.makeEllipse(20.4, -2.6, 1.1, 1.1, hex("#292F33"), "Olho"),
    fill([forma([[15, -6], [12, 2], [14, 8], [17, 4], [18, -4]])], "#5C3A21", "Orelha"),
    fill([forma([[14, -6], [20, -8], [26, -3], [30, 3], [28, 6], [20, 5], [14, 2]])], "#C1694F", "Cabeca"),
    fill([forma([[-18, -8], [-6, -10], [8, -10], [16, -4], [14, 6], [4, 9], [-12, 9], [-18, 4]])], "#C1694F", "Corpo"),
    lib.makeEllipse(8, 2, 5, 4.6, hex("#E8A87C"), "Peito"),
    stroke([reta([[-13, 7], [-14, 18]]), reta([[9, 7], [10, 18]])], 3, hex("#A0522D"), "Pernas"),
    stroke([reta([[-8, 7], [-7, 18]]), reta([[4, 7], [3, 18]])], 3, hex("#8A4633"), "PernasTras"),
    stroke([lib.polyline([[-17, -6], [-22, -14], [-20, -20]])], 2.6, hex("#C1694F"), "Rabo"),
  ];
}
/** Gato malhado de laranja, olhando para a esquerda e comendo, com o meio do corpo em (0,0) e as patas em y = 16. */
function gatoComendoShapes() {
  return [
    stroke([reta([[-21, 4], [-27, 3]]), reta([[-21, 5.6], [-27, 6.6]])], 0.5, hex("#66757F"), "Bigodes"),
    lib.makeEllipse(-21.4, 4.4, 1, 0.8, hex("#EA596E"), "Nariz"),
    stroke([lib.polyline([[-18.6, 0], [-17.4, 0.8], [-16.2, 0]])], 0.8, hex("#292F33"), "Olho"),
    fill([poligono([[-17, -5], [-15.6, -11], [-12.6, -6]]), poligono([[-12, -6], [-9, -11], [-8.6, -4.4]])], "#F4900C", "Orelhas"),
    lib.makeEllipse(-15, 1, 6.6, 5.6, hex("#F4900C"), "Cabeca"),
    stroke([reta([[-2, -7], [0, 4]]), reta([[4, -7], [6, 4]]), reta([[10, -6], [11, 3]])], 1.4, hex("#C1694F"), "Listras"),
    fill([forma([[-10, -2], [-4, -7], [10, -7], [16, -2], [15, 8], [-8, 8]])], "#FFAC33", "Corpo"),
    stroke([reta([[-7, 6], [-8, 16]]), reta([[12, 6], [13, 16]])], 2.8, hex("#F4900C"), "Pernas"),
    stroke([lib.polyline([[15, 0], [22, -4], [23, -14], [19, -18]])], 2.4, hex("#F4900C"), "Rabo"),
  ];
}
/** Ratinho cinza de orelhas redondas, olhando para a esquerda, com o meio do corpo em (0,0) e as patas em y = 4. */
function ratoShapes() {
  return [
    lib.makeEllipse(-9.6, 0.4, 0.8, 0.7, hex("#292F33"), "Nariz"),
    lib.makeEllipse(-6.4, -1.4, 0.6, 0.6, hex("#292F33"), "Olho"),
    lib.makeEllipse(-4, -4.4, 2.4, 2.4, hex("#F4ABBA"), "Orelha"),
    fill([forma([[-10, 0.4], [-6, -3], [-2, -2], [-3, 2], [-7, 2.4]])], "#8899A6", "Cabeca"),
    fill([forma([[-4, -2], [2, -4.4], [7, -2], [7, 3], [-3, 3]])], "#8899A6", "Corpo"),
    stroke([lib.polyline([[7, 1], [12, -1], [16, 2], [19, 0]])], 0.9, hex("#F4ABBA"), "Rabo"),
  ];
}
/** Pose de São Martinho de Porres (prata). */
const PORRES = { F: [100, 66], K: 0.56 };

/** São Martinho de Porres: o cão, o gato e o rato comem juntos do mesmo prato, sem brigar. */
function gestoMartinhoPorres(t, c) {
  const PRATO = [100, 152];
  const prato = L("G_Prato", [
    lib.makeEllipse(0, -2, 18, 3.6, hex("#E8A84C"), "Comida"),
    lib.makeEllipseRing(0, -1, 22, 5, 1.2, hex("#AAB8C2"), "Borda"),
    lib.makeEllipse(0, -1, 22, 5, hex("#E1E8ED"), "Prato"),
    fill([forma([[-21, 0], [21, 0], [14, 8], [-14, 8]])], "#CCD6DD", "Fundo"),
  ], { p: PRATO, s: anim(pop(0, 12, { over: 108 })), o: anim(aparecer(0, 6)) });
  const come = (base, t0) => [[t0, base], ...onda(base, 4, t0, END, { period: 16 })];
  const cao = L("G_Cao", caoComendoShapes(), { p: anim([[0, [44, 140]], [4, [44, 140], "linear"], [22, [62, 140]]]), r: anim([[0, -6], [22, 0, "ease"], ...come(0, 30).slice(1)]), o: anim(aparecer(4, 6)) });
  const gato = L("G_Gato", gatoComendoShapes(), { p: anim([[0, [156, 142]], [10, [156, 142], "linear"], [28, [140, 142]]]), r: anim([[0, 6], [28, 0, "ease"], ...come(0, 36).slice(1)]), o: anim(aparecer(10, 6)) });
  const rato = L("G_Rato", ratoShapes(), { p: anim([[0, [150, 162]], [18, [150, 162], "linear"], [34, [124, 162]], ...pulo([124, 162], 40, { h: 1.5, d: 6, n: 3, gap: 10 })]), o: anim(aparecer(18, 6)) });
  const layers = [rato, prato, cao, gato];
  if (t >= 2) {
    const { F, K } = PORRES;
    const capa = fill([forma(escala(K, [[-12, 20], [-28, 32], [-34, 56], [-36, 70], [-14, 70], [-8, 34]])), forma(escala(K, [[12, 20], [28, 32], [34, 56], [36, 70], [14, 70], [8, 34]]))], "#292F33", "Capa");
    layers.push(L("T2_Martinho", naFrenteDe(bustoHomem(K, { pele: PELE_ESCURA, veste: "#F5F8FA", corCabelo: "#292F33", bigode: "#292F33", tonsura: true }), "Veste", [capa]), {
      p: anim([[0, add(F, [0, 6])], [40, add(F, [0, 6]), "out"], [52, F]]), o: anim(aparecer(40, 8)),
    }));
    const palhas = Array.from({ length: 7 }, (_, k) => reta([[-6 + k * 2, 0], [-9 + k * 3, 16]]));
    layers.push(L("T2_Vassoura", [
      stroke(palhas, 1, hex("#C99A3C"), "Palhas"),
      fill([forma([[-6, 0], [6, 0], [10, 16], [-10, 16]])], "#E8C36A", "Cerdas"),
      fill([rect(-6, -2, 6, 2)], "#8A4633", "Amarra"),
      stroke([reta([[0, -2], [0, -52]])], 2.4, hex("#A0522D"), "Cabo"),
    ], { p: [146, 112], r: anim([[0, 30], [40, 30, "ease"], [52, 14]]), o: anim(aparecer(40, 6)) }));
  }
  if (t >= 3) layers.push(aureola({ center: [PORRES.F[0], PORRES.F[1] + TOPO_HOMEM * PORRES.K], rx: 10, ry: 3, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 90, bottom: 130 }));
  return layers;
}

/** Pose de São Carlos Borromeu (busto que ergue o rosto). */
const CARLOS = pose([100, 102], 0.76, 70, -3);

/** São Carlos Borromeu: ergue o rosto e a palavra HUMILITAS acende acima. */
function gestoCarlos(t, c) {
  const { K, A, P, R } = CARLOS;
  const P_ = (pts) => escala(K, pts);
  const mozeta = fill([forma(P_([[0, 16], [14, 20], [28, 32], [31, 46], [0, 50], [-31, 46], [-28, 32], [-14, 20]]))], "#BE1931", "Mozeta");
  const corda = stroke([lib.polyline(P_([[-8, 19], [-6, 34], [0, 40], [6, 34], [8, 19]])), lib.polyline(P_([[0, 40], [1, 50], [-1, 58]]))], 2 * K, hex("#C1A57A"), "Corda");
  const solideu = lib.makeEllipse(0, -15.6 * K, 7.4 * K, 3.6 * K, hex("#BE1931"), "Solideu");
  const corpo = naFrenteDe(bustoHomem(K, { veste: "#F5F8FA", corCabelo: "#3B2416" }), "Decote", [corda, mozeta]);
  const carlos = L("G_Carlos", [solideu, contornoOmbros(K), ...corpo], {
    a: A, p: anim([[0, add(P, [0, 6])], [16, P, "out"]]), r: anim([[0, 4], [10, 4, "ease"], [28, R]]), o: anim(aparecer(0, 6)),
  });
  const palavra = "HUMILITAS", H = 11, passo = 5.4 * (H / 6), total = passo * palavra.length - 1.4 * (H / 6);
  const letras = [...palavra].map((ch, k) => grupoAnimado(`Letra${k + 1}`, transladar(letrasShapes(ch, H, { cor: "#B8741A", largura: 2.4 }), [-total / 2 + k * passo + 2 * (H / 6), 0]), {
    o: anim(aparecer(24 + k * 3, 4)),
  }));
  const lema = L("G_Lema", letras, { p: anim([[0, [100, 54]], [24, [100, 54], "out"], [50, [100, 50]]]), o: 100 });
  const layers = [lema, carlos];
  if (t >= 2) {
    layers.push(L("T2_Paes", [
      ...transladar(paoShapes(14), [-6, -6]), ...transladar(paoShapes(14), [7, -7]), ...transladar(paoShapes(12), [0, -11]),
      stroke([reta([[-11, 1], [11, 1]]), reta([[-10, 5], [10, 5]])], 1, hex("#8A4633"), "Trama"),
      fill([forma([[-14, -4], [14, -4], [10, 9], [-10, 9]])], "#C1694F", "Cesto"),
    ], { p: [154, 156], s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  if (t >= 3) layers.push(aureola({ center: naPose(P, A, R, [0, TOPO_HOMEM * K]), rx: 11, ry: 3.2, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 92 }));
  return layers;
}

/** Colunas da fachada de Latrão (x do meio). */
const COLUNAS = [44, 66, 88, 112, 134, 156];

/** Dedicação da Basílica de Latrão: a fachada se ergue coluna por coluna, com as estátuas no alto e a cruz. */
function gestoLaterao(t, c) {
  const BASE = 160;
  const coluna = (x) => [
    fill([rect(x - 6, 92, x + 6, 97), rect(x - 6, 154, x + 6, BASE)], "#C9B78F", "Capitel e base"),
    stroke([reta([[x - 1.6, 98], [x - 1.6, 153]]), reta([[x + 1.6, 98], [x + 1.6, 153]])], 0.8, hex("#C9B78F"), "Caneluras"),
    fill([rect(x - 4, 96, x + 4, 154)], "#F2E6CC", "Fuste"),
  ];
  const colunas = L("G_Colunas", COLUNAS.map((x, k) => grupoAnimado(`Coluna${k + 1}`, coluna(x), {
    a: [x, BASE], p: [x, BASE], s: anim([[0, [100, 0]], [k * 5, [100, 0], "out"], [k * 5 + 10, [100, 100]]]),
  })), { p: [0, 0] });
  const balaustres = Array.from({ length: 22 }, (_, k) => reta([[42 + k * 5.5, 76], [42 + k * 5.5, 84]]));
  const frontao = L("G_Frontao", [
    stroke([poligono([[78, 74], [100, 58], [122, 74]])], 1.4, hex("#C9B78F"), "Moldura do frontao"),
    fill([poligono([[74, 74], [100, 54], [126, 74]])], "#E8DCC0", "Frontao"),
    stroke(balaustres, 1.4, hex("#C9B78F"), "Balaustrada"),
    fill([rect(38, 74, 162, 86)], "#F2E6CC", "Atico"),
    fill([rect(34, 86, 166, 93)], "#D8C8A8", "Entablamento"),
  ], { p: anim([[0, [0, -12]], [30, [0, -12], "out"], [42, [0, 0]]]), o: anim(aparecer(30, 6)) });
  const estatua = (x, y) => [lib.makeEllipse(x, y - 9, 2, 2, hex("#D8C8A8"), "CabecaEstatua"), fill([forma([[x - 2.6, y - 7], [x + 2.6, y - 7], [x + 3.2, y], [x - 3.2, y]])], "#D8C8A8", "Estatua")];
  const estatuas = L("G_Estatuas", [
    fill([rect(98.6, 34, 101.4, 54), rect(93.5, 39.5, 106.5, 42.5)], "#F4900C", "Cruz"),
    ...[44, 58, 72, 128, 142, 156].flatMap((x) => estatua(x, 74)),
    ...estatua(86, 66), ...estatua(114, 66),
  ], { a: [100, 74], p: [100, 74], s: anim([[0, 0], ...pop(40, 12, { over: 108 })]), o: anim(aparecer(40, 4)) });
  const paredes = L("Paredes", [
    fill([forma([[95, 154], [95, 126], [100, 120], [105, 126], [105, 154]]), ...[55, 77, 123, 145].map((x) => forma([[x - 5, 154], [x - 5, 134], [x, 129], [x + 5, 134], [x + 5, 154]]))], "#8A6A3A", "Portas"),
    fill([rect(40, 96, 160, BASE)], "#FAF3E3", "Parede"),
    fill([rect(30, BASE, 170, BASE + 4)], "#C9B78F", "Degrau"),
  ], { p: [0, 0], o: anim(aparecer(8, 14)) });
  const layers = [];
  if (t >= 3) layers.push(raios("T3_Raios", [100, 41], { count: 14, r1: 10, r2: 22, half: 4, t0: 50, peak: 80 }));
  if (t >= 2) {
    const cruzes = COLUNAS.flatMap((x) => [[x, 110], [x, 138]]).map(([x, y], k) => grupoAnimado(`Cruz${k + 1}`, [
      stroke([reta([[x, y - 2.2], [x, y + 2.2]]), reta([[x - 2.2, y], [x + 2.2, y]])], 1.1, hex("#DD2E44"), "CruzVermelha"),
      lib.makeEllipseRing(x, y, 3.4, 3.4, 0.8, hex("#DD2E44"), "Anel"),
    ], { o: anim(aparecer(40 + k * 2, 3)) }));
    layers.push(L("T2_Cruzes", cruzes, { p: [0, 0] }));
  }
  layers.push(estatuas, frontao, colunas, paredes);
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 120, w1: 100 }));
  return layers;
}

/** Cavalo branco, olhando para a esquerda, com o meio do corpo em (0,0) e os cascos em y = 32. */
function cavaloShapes() {
  const contorno = "#AAB8C2";
  const corpo = forma([[-26, -6], [-16, -12], [10, -12], [24, -8], [28, 2], [20, 10], [-20, 10], [-28, 4]]);
  const cabeca = forma([[-22, -8], [-26, -22], [-30, -32], [-38, -30], [-44, -22], [-42, -19], [-34, -22], [-30, -10]]);
  return [
    lib.makeEllipse(-34, -27, 1.1, 1.1, hex("#292F33"), "Olho"),
    fill([forma([[-25, -24], [-22, -32], [-30, -36], [-27, -28]]), poligono([[-31, -33], [-30, -39], [-28, -33]])], "#CCD6DD", "Crina e orelha"),
    stroke([cabeca, corpo], 1.2, hex(contorno), "Contorno"),
    fill([cabeca], "#F5F8FA", "Cabeca"),
    stroke([reta([[-20, 8], [-21, 30]]), reta([[-12, 8], [-11, 30]]), reta([[12, 8], [13, 30]]), reta([[20, 8], [21, 30]])], 3.4, hex("#E1E8ED"), "Pernas"),
    fill([rect(-23, 29, -19, 32), rect(-13, 29, -9, 32), rect(11, 29, 15, 32), rect(19, 29, 23, 32)], "#8899A6", "Cascos"),
    fill([corpo], "#F5F8FA", "Corpo"),
    fill([forma([[26, -6], [32, 0], [34, 14], [30, 18], [28, 4]])], "#CCD6DD", "Rabo"),
  ];
}
/** Rostos de Martinho de Tours e do mendigo, e as escalas. */
const TOURS = { F: [64, 86], K: 0.5 }, MENDIGO = { F: [146, 96], K: 0.44 };

/** São Martinho de Tours: Martinho (soldado) corta a capa vermelha com a espada e dá a metade ao mendigo. */
function gestoMartinhoTours(t, c) {
  const { F, K } = TOURS;
  const P_ = (pts) => escala(K, pts);
  const elmo = [
    fill([forma(P_([[-10, -21], [-5, -30], [5, -30], [10, -21], [0, -20]]))], "#DD2E44", "Penacho"),
    fill([forma(P_([[-12.6, -2], [-12.6, -12], [-8, -18.6], [0, -20.4], [8, -18.6], [12.6, -12], [12.6, -2], [10, -8], [0, -10.6], [-10, -8]]))], "#AAB8C2", "Elmo"),
  ];
  const couraca = [
    fill([rect(-24 * K, 52 * K, 24 * K, 57 * K)], "#C99A3C", "Cinto"),
    fill([forma(P_([[-14, 19], [14, 19], [22, 30], [22, 54], [-22, 54], [-22, 30]]))], "#AAB8C2", "Couraca"),
  ];
  const meiaCapa = fill([forma(P_([[-18, 20], [-30, 34], [-38, 80], [-34, 104], [-22, 102], [-24, 60]]))], "#DD2E44", "MeiaCapa");
  const soldado = naFrenteDe(figuraHomem(K, { tunica: "#A0522D", corCabelo: "#5C3A21", barba: "#5C3A21", bracos: "esquerdo" }), "Olhos", elmo);
  const martinho = L("G_Martinho", [...naFrenteDe(soldado, "Veste", couraca), meiaCapa], { p: F, o: anim(aparecer(0, 6)) });
  // o braço da espada gira no ombro: ergue e corta
  const ombro = add(F, [OMBRO_D[0] * K, OMBRO_D[1] * K]);
  const espada = L("G_Espada", [
    stroke([reta([[10, 18], [26, 2]])], 2.2, hex("#E1E8ED"), "Lamina"),
    stroke([reta([[7, 14], [13, 20]])], 2, hex("#C99A3C"), "Guarda"),
    lib.makeEllipse(10, 18, 2.4, 2.4, hex(PELE), "Mao"),
    stroke([lib.polyline([[0, 0], [6, 9], [10, 18]])], 4, hex("#A0522D"), "Braco"),
  ], { a: [0, 0], p: ombro, r: anim([[0, 0], [6, 0, "ease"], [16, -100], [22, -100, "in"], [26, 10], [32, 0]]), o: anim(aparecer(0, 6)) });
  // a metade da capa: presa a Martinho até o corte, depois vai para os ombros do mendigo
  const MB = MENDIGO.F, KB = MENDIGO.K;
  const capa = L("G_Capa", [
    stroke([lib.polyline([[-8, 6], [-12, 34]]), lib.polyline([[8, 6], [12, 34]]), lib.polyline([[0, 4], [0, 36]])], 0.9, hex("#BE1931"), "Dobras"),
    fill([forma([[-8, 0], [0, -2], [8, 0], [16, 12], [20, 38], [0, 40], [-20, 38], [-16, 12]])], "#DD2E44", "Capa"),
  ], {
    p: anim([[0, add(ombro, [16, 8])], [24, add(ombro, [16, 8]), "ease"], [44, add(MB, [0, 18 * KB])]]), r: anim([[0, -8], [24, -8, "ease"], [44, 0]]), o: anim(aparecer(0, 6)),
  });
  const remendos = fill([rect(-12 * KB, 60 * KB, -4 * KB, 68 * KB), rect(8 * KB, 80 * KB, 16 * KB, 88 * KB)], "#8899A6", "Remendos");
  const mendigo = L("G_Mendigo", naFrenteDe(figuraHomem(KB, { tunica: "#CCD6DD", corCabelo: "#8899A6", barba: "#AAB8C2" }), "Veste", [remendos]), {
    p: anim([[0, add(MB, [8, 0])], [10, MB, "out"]]), o: anim(aparecer(0, 8)),
  });
  const chao = cena("Chao", [fill([forma([[24, 142], [100, 138], [176, 142], [100, 146]])], "#C1A57A", "Chao")]);
  const layers = [];
  if (t >= 3) {
    const KC = 0.36, CF = [104, 44];
    const meia = fill([forma(escala(KC, [[-14, 20], [-28, 32], [-34, 56], [-36, 70], [-6, 70], [6, 30]]))], "#DD2E44", "MeiaCapa");
    layers.push(L("T3_Cristo", naFrenteDe(busto(KC, { veste: "#F5F8FA", cabelo: "longo", corCabelo: "#8A4633", barba: "#8A4633" }), "Decote", [meia]), {
      p: anim([[0, add(CF, [0, 6])], [44, add(CF, [0, 6]), "out"], [58, CF]]), o: anim(aparecer(44, 10)),
    }));
  }
  // a capa fica atrás do mendigo: aparece nos ombros e dos lados, sem cobrir o rosto nem o corpo
  layers.push(espada, martinho, mendigo, capa);
  if (t >= 2) layers.push(L("T2_Cavalo", cavaloShapes(), { p: anim([[0, [68, 108]], [40, [68, 108], "out"], [54, [62, 108]]]), o: anim(aparecer(40, 8)) }));
  layers.push(chao);
  if (t >= 3) {
    layers.push(aureola({ center: [104, 44 - 21 * 0.36], rx: 8, ry: 2.4, t0: 58, nm: "T3_AureolaCristo" }));
    layers.push(aureola({ center: [F[0], F[1] - 32 * K], rx: 9, ry: 2.6, t0: 54, nm: "T3_Aureola" }));
    layers.push(luzDoOuro(c, { x: 104, bottom: 120, w1: 70 }));
  }
  return layers;
}

/** Pose de Santa Isabel da Hungria (busto de manto, parada). */
const ISABEL = { F: [100, 70], K: 0.72 };

/** Santa Isabel da Hungria: abre o avental e os pães viram rosas vermelhas. */
function gestoIsabel(t, c) {
  const { F, K } = ISABEL;
  const tiara = [
    ...[-6, 0, 6].map((x, k) => lib.makeEllipse(x * K, (-27 - (k === 1 ? 3 : 1)) * K, 1.4 * K, 1.4 * K, hex(k === 1 ? "#DD2E44" : "#FFFFFF"), `Joia${k}`)),
    fill([forma(escala(K, [[-12, -22], [-8, -28], [-4, -26], [0, -32], [4, -26], [8, -28], [12, -22], [0, -20]]))], "#FFCC4D", "Tiara"),
  ];
  const isabel = L("G_Isabel", [...tiara, ...busto(K, { manto: "#9B2C5A", veste: "#F5F8FA", orla: "#FFCC4D" })], { p: anim([[0, add(F, [0, 6])], [12, F, "out"]]), o: anim(aparecer(0, 6)) });
  // o avental (preso nas mãos dela) se abre e mostra o que leva
  const AV = add(F, [0, 62 * K]);
  const avental = L("G_Avental", [
    lib.makeEllipse(-22, -2, 3.6, 3, hex(PELE), "MaoE"), lib.makeEllipse(22, -2, 3.6, 3, hex(PELE), "MaoD"),
    stroke([lib.polyline([[-22, 0], [0, 14], [22, 0]])], 1, hex("#C9B78F"), "Dobra"),
    stroke([forma([[-22, -2], [0, 2], [22, -2], [18, 14], [0, 22], [-18, 14]])], 1.2, hex("#C9B78F"), "Barra"),
    fill([forma([[-22, -2], [0, 2], [22, -2], [18, 14], [0, 22], [-18, 14]])], "#F2E6CC", "Avental"),
  ], { a: [0, 0], p: AV, s: anim([[0, [40, 100]], [10, [40, 100], "out"], [24, [100, 100]]]), o: anim(aparecer(4, 6)) });
  const paes = L("G_Paes", [...transladar(paoShapes(14), [-8, -4]), ...transladar(paoShapes(14), [8, -4]), ...transladar(paoShapes(13), [0, -9])], {
    p: AV, s: anim([[0, 0], [20, 0, "out"], [26, 100], [34, 100, "in"], [42, 0]]), o: anim([[0, 0], [20, 0], [24, 100], [38, 100], [42, 0]]),
  });
  const rosas = L("G_Rosas", [[-10, -4], [10, -4], [0, -10], [-2, 2], [-16, 2], [16, 2]].flatMap((d, k) => transladar(rosaShapes(k < 3 ? 5 : 4.2), d)), {
    p: AV, s: anim([[0, 0], [36, 0, "out"], [46, 115], [52, 100], ...pulsar(60, END, { amp: 4, period: 24 })]), o: anim(aparecer(36, 4)),
  });
  const layers = [rosas, paes, avental, isabel];
  if (t >= 2) {
    layers.push(L("T2_Coroa", [...transladar(coroaShapes(20), [0, -3]), fill([forma([[-14, -1], [14, -1], [16, 4], [12, 8], [-12, 8], [-16, 4]])], "#744EAA", "Almofada")], {
      p: [40, 158], r: anim([[0, -20], [40, -20, "ease"], [54, 0]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)),
    }));
  }
  if (t >= 3) layers.push(aureola({ center: [F[0], F[1] + TOPO_MANTO * K - 3], rx: 12, ry: 3.4, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 96 }));
  return layers;
}

/** Degraus do Templo: [x0, y do alto] de cada degrau (o primeiro é o mais baixo). */
const DEGRAUS = [[50, 156], [68, 146], [86, 136], [104, 126]];
/** Escala e pés de Maria menina no alto da escada. */
const MENINA = { K: 0.56, FIM: [116, 126] };

/** Apresentação de Maria: a menina Maria sobe sozinha os degraus do Templo. */
function gestoApresentacaoMaria(t, c) {
  const { K, FIM } = MENINA;
  const rosto = (pe) => [pe[0], pe[1] - 108 * K];
  const passos = [[0, rosto([40, 166])], [6, rosto([42, 166]), "ease"]];
  DEGRAUS.forEach(([x, y], k) => {
    const t0 = 10 + k * 9;
    passos.push([t0, rosto([x + 6, y - 4]), "ease"], [t0 + 4, rosto([x + 10, y]), "ease"]);
  });
  passos.push([48, rosto(FIM), "out"]);
  const maria = L("G_Maria", figura(K, { manto: "#5DADEC", tunica: "#FFFFFF", orla: "#3B88C3", bracos: "postas" }), { p: anim(passos), o: anim(aparecer(0, 6)) });
  const degraus = L("G_Degraus", DEGRAUS.flatMap(([x, y], k) => [
    fill([rect(x, y, 178, y + 3)], "#E8DCC0", `Pisada${k}`),
    fill([rect(x, y, 178, 172)], k % 2 ? "#D8C8A8" : "#CDBB98", `Degrau${k}`),
  ]), { p: anim([[0, [0, 8]], [10, [0, 0], "out"]]), o: anim(aparecer(0, 6)) });
  const templo = L("G_Templo", [
    fill([rect(142, 64, 164, 126)], "#6B4423", "Porta"),
    fill([rect(130, 54, 135, 126), rect(171, 54, 176, 126)], "#F2E6CC", "Colunas"),
    fill([poligono([[126, 54], [153, 34], [180, 54]])], "#E8DCC0", "Frontao"),
    fill([rect(126, 54, 180, 60)], "#D8C8A8", "Arquitrave"),
    fill([rect(135, 60, 171, 126)], "#FAF3E3", "Parede"),
  ], { p: anim([[0, [0, -6]], [4, [0, -6], "out"], [18, [0, 0]]]), o: anim(aparecer(0, 10)) });
  const layers = [maria];
  if (t >= 2) {
    const ana = busto(0.38, { manto: "#5C913B", veste: "#BE1931" });
    const joaquim = bustoHomem(0.38, { veste: "#8A4633", corCabelo: "#CCD6DD", barba: "#E1E8ED" });
    layers.push(L("T2_Pais", [...transladar(joaquim, [34, 138]), ...transladar(ana, [60, 140])], { p: anim([[0, [0, 6]], [40, [0, 6], "out"], [52, [0, 0]]]), o: anim(aparecer(40, 8)) }));
  }
  layers.push(degraus);
  if (t >= 3) {
    layers.push(L("T3_Porta", [
      grupoAnimado("FolhaE", [fill([rect(142, 64, 153, 126)], "#8A4633", "Folha")], { a: [142, 95], p: [142, 95], s: anim([[0, [100, 100]], [46, [100, 100], "ease"], [60, [15, 100]]]) }),
      grupoAnimado("FolhaD", [fill([rect(153, 64, 164, 126)], "#8A4633", "Folha")], { a: [164, 95], p: [164, 95], s: anim([[0, [100, 100]], [46, [100, 100], "ease"], [60, [15, 100]]]) }),
      fill([rect(142, 64, 164, 126)], "#FFF1C1", "Claridade"),
    ], { p: [0, 0], o: anim(aparecer(44, 2)) }));
  }
  // a luz do ouro fica na frente do Templo (sobre a porta aberta), mas atrás de Maria e dos pais
  if (t >= 3) layers.push(luzDoOuro(c, { x: 153, top: 34, bottom: 126, w0: 10, w1: 40 }));
  layers.push(templo);
  return layers;
}

/** Pose de Santa Cecília (busto de cabelo solto, parada). */
const CECILIA = { F: [72, 104], K: 0.62 };
/** Meio da base do órgão (no fim): o teclado fica ao alcance das mãos de Cecília. */
const ORGAO = [124, 146];
const VESTE_CECILIA = "#5C913B";
/**
 * Santa Cecília sentada de lado num banco, virada para a direita (para o
 * órgão): rosto de três quartos (olhos baixos, nariz e boca do lado do
 * teclado), cabelo longo caindo nas costas, tronco de perfil, o colo e a saia
 * até o chão; os braços vão numa camada à parte. Mesma cabeça do `busto`
 * (rosto 22 × 28 com k = 1, pele comum), rosto em (0,0), escala k; vai de
 * y −18 (cabelo) a 91 (pés do banco). Devolve os grupos da frente para trás.
 */
function ceciliaSentadaShapes(k) {
  const P = (pts) => escala(k, pts);
  const olho = (x) => lib.polyline(P([[x - 2.6, -0.4], [x, 1.6], [x + 2.6, -0.4]]));
  return [
    stroke([olho(1), olho(8.4)], 1.3 * k, hex("#662113"), "Olhos"),
    stroke([lib.polyline(P([[10.2, 0.6], [11.8, 4.6], [9.8, 5.4]]))], 1 * k, hex("#C1694F"), "Nariz"),
    stroke([lib.polyline(P([[3.6, 8.6], [5.8, 9.6], [8, 8.4]]))], 1.2 * k, hex("#C1694F"), "Boca"),
    lib.makeEllipse(0.6 * k, 6 * k, 2.6 * k, 1.6 * k, hex("#F4ABBA"), "Face1", 80),
    lib.makeEllipse(0, 0, 11 * k, 14 * k, hex(PELE), "Rosto"),
    fill([rect(-5 * k, 8 * k, 3 * k, 20 * k)], PELE, "Pescoco"),
    fill([forma(P([[-5, 18], [4, 18], [0, 25]]))], PELE, "Decote"),
    fill([forma(P([[2, -18], [11, -14], [13, -7], [8, -10.6], [1, -11], [-5, -8], [-8, -1], [-9, 10], [-7, 24], [-6, 34], [-15, 36], [-20, 24], [-19, 4], [-16, -9], [-9, -16]]))], "#8A4633", "Cabelo"),
    fill([forma(P([[-6, 16], [6, 17], [14, 24], [18, 36], [18, 50], [14, 58], [-14, 58], [-18, 44], [-16, 28], [-12, 20]]))], VESTE_CECILIA, "Veste"),
    fill([forma(P([[-15, 50], [16, 50], [34, 53], [39, 60], [36, 68], [-16, 68], [-18, 60]])), forma(P([[24, 56], [38, 57], [43, 86], [20, 86]]))], "#4A7A2E", "Saia"),
    lib.makeEllipse(40 * k, 87 * k, 5 * k, 2.4 * k, hex("#5C3A21"), "Sapato"),
    fill([rect(-22 * k, 68 * k, 22 * k, 73 * k), rect(-20 * k, 73 * k, -16 * k, 91 * k), rect(16 * k, 73 * k, 20 * k, 91 * k)], "#C1694F", "Banco"),
  ];
}
/** Órgão portátil: o meio da base em (0,0), tubos e teclado. */
function orgaoShapes() {
  const tubos = [[-18, 38], [-11, 46], [-4, 52], [3, 46], [10, 40], [17, 34]];
  return [
    stroke([-18, -14, -8, -4, 2, 6, 12, 16].map((x) => reta([[x, -10], [x, -6.4]])), 1.4, hex("#292F33"), "Teclas pretas"),
    fill([rect(-22, -10, 22, -3)], "#FFFFFF", "Teclado"),
    ...tubos.map(([x, h], k) => fill([rect(x - 2.6, -8 - h, x + 2.6, -8), forma([[x - 2.6, -8 - h], [x, -11 - h], [x + 2.6, -8 - h]])], k % 2 ? "#E1C38F" : "#FFCC4D", `Tubo${k}`)),
    fill([rect(-24, -8, 24, 14)], "#8A4633", "Caixa"),
    stroke([reta([[-20, 4], [20, 4]])], 1.2, hex("#5C3A21"), "Friso"),
  ];
}
/** Nota musical (colcheia), com a cabeça em (0,0). */
const notaShapes = () => [
  stroke([lib.polyline([[2.4, -0.4], [2.4, -11], [6.6, -7.6]])], 1.4, hex("#292F33"), "Haste"),
  lib.makeEllipse(0, 0, 2.8, 2.1, hex("#292F33"), "Cabeca"),
];

/** Santa Cecília: sentada de lado diante do pequeno órgão, olha para o teclado e toca; as notas sobem dos tubos. */
function gestoCecilia(t, c) {
  const { F, K } = CECILIA;
  const cecilia = L("G_Cecilia", ceciliaSentadaShapes(K), { p: anim([[0, add(F, [0, 6])], [12, F, "out"]]), o: anim(aparecer(0, 6)) });
  const orgao = L("G_Orgao", orgaoShapes(), { a: [0, 14], p: add(ORGAO, [0, 14]), s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  // os dois braços saem do ombro e estendem-se até o teclado; as mãos ficam sobre as teclas e tocam (sobem e descem)
  const teclas = add(ORGAO, [-18, -6.5]);
  const mao1 = teclas, mao2 = add(teclas, [9, 0]);
  const ombroPerto = add(F, [9 * K, 24 * K]), ombroLonge = add(F, [3 * K, 23 * K]);
  const maos = L("G_Maos", [
    lib.makeEllipse(mao2[0], mao2[1], 3.2, 2.6, hex(PELE), "Mao2"),
    lib.makeEllipse(mao1[0], mao1[1], 3.2, 2.6, hex(PELE), "Mao1"),
    stroke([lib.polyline([ombroPerto, add(F, [17 * K, 44 * K]), add(mao1, [-2.4, 0.6])])], 5.5, hex(VESTE_CECILIA), "Manga"),
    stroke([lib.polyline([ombroLonge, add(F, [14 * K, 47 * K]), add(mao2, [-2.4, 0.6])])], 5.5, hex("#4A7A2E"), "Manga de tras"),
  ], { p: anim([[0, [0, 0]], [16, [0, 0]], ...onda([0, 0], -1.5, 16, END, { period: 8, axis: 1 })]), o: anim(aparecer(10, 6)) });
  const sobe = (x0, t0) => [[0, [x0, 0]], [t0, [x0, 0], "linear"], [t0 + 30, [x0 + 8, -40]]];
  const notas = L("G_Notas", [
    grupoAnimado("Nota1", notaShapes(), { p: anim([...sobe(0, 18), [t0Fim(18), [0, 0], "linear"], [END, [6, -30]]]), o: anim([[0, 0], [18, 0], [22, 100], [44, 100], [48, 0], [52, 0], [56, 100]]) }),
    grupoAnimado("Nota2", notaShapes(), { p: anim([...sobe(10, 28), [t0Fim(28), [10, 0], "linear"], [END, [14, -16]]]), o: anim([[0, 0], [28, 0], [32, 100], [54, 100], [58, 0], [64, 0], [68, 100]]) }),
    grupoAnimado("Nota3", notaShapes(), { p: anim(sobe(-10, 38)), o: anim([[0, 0], [38, 0], [42, 100]]) }),
  ], { p: add(ORGAO, [0, -56]), s: 110 });
  const layers = [notas, maos, orgao, cecilia];
  if (t >= 2) {
    const flores = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      return k % 2 ? transladar(rosaShapes(2.6), [12 * Math.cos(a), 3.2 * Math.sin(a)]) : [lib.makeEllipse(12 * Math.cos(a), 3.2 * Math.sin(a), 2.6, 2.6, hex("#FFFFFF"), `Lirio${k}`)];
    }).flat();
    // a coroa de flores fica no cabelo, abaixo da auréola
    const CABECA = add(F, [0, -12 * K]);
    layers.unshift(L("T2_CoroaDeFlores", [...flores, lib.makeEllipseRing(0, 0, 12, 3.2, 1.4, hex("#5C913B"), "Ramo")], {
      p: anim([[0, add(CABECA, [0, -30])], [40, add(CABECA, [0, -30]), "ease"], [56, CABECA]]), o: anim(aparecer(40, 6)),
    }));
  }
  if (t >= 3) layers.push(palmaEmPe("T3_Palma", 44, [42, 162], 46, -6), coroaDesce("T3_Coroa", 18, [40, 110], 50), luzDoOuro(c, { x: 80, w1: 90 }));
  return layers;
}
/** Quadro em que a primeira subida de uma nota termina (e a segunda começa). */
const t0Fim = (t0) => t0 + 30 + 1;

/** Pose de Nossa Senhora das Graças (figura de manto, sobre o globo). */
const GRACAS = { F: [100, 50], K: 0.6 };
/** Globo terrestre desenhado, centrado em (0,0), raio r. */
function globoShapes(r, { mar = "#3B88C3", terra = "#77B255" } = {}) {
  return [
    stroke([lib.polyline([[-r, 0], [0, r * 0.22], [r, 0]]), lib.polyline([[0, -r], [r * 0.3, 0], [0, r]])], 0.8, hex("#88C9F9"), "Meridianos"),
    fill([forma([[-r * 0.6, -r * 0.5], [-r * 0.1, -r * 0.7], [r * 0.1, -r * 0.3], [-r * 0.3, r * 0.1], [-r * 0.7, -r * 0.1]]), forma([[r * 0.3, r * 0.1], [r * 0.7, r * 0.2], [r * 0.5, r * 0.6], [r * 0.2, r * 0.5]])], terra, "Terra"),
    lib.makeEllipse(0, 0, r, r, hex(mar), "Globo"),
  ];
}

/** Nossa Senhora das Graças: Maria, de pé sobre o globo, abre as mãos e delas saem raios de luz (as graças). */
function gestoGracas(t, c) {
  const { F, K } = GRACAS;
  const P_ = (pts) => escala(K, pts);
  const MAO_E = [-36, 58], MAO_D = [36, 58];
  const bracos = [
    lib.makeEllipse(MAO_E[0] * K, MAO_E[1] * K, 4.4 * K, 4.4 * K, hex(PELE), "MaoE"), lib.makeEllipse(MAO_D[0] * K, MAO_D[1] * K, 4.4 * K, 4.4 * K, hex(PELE), "MaoD"),
    stroke([lib.polyline(P_([OMBRO_E, [-30, 42], MAO_E])), lib.polyline(P_([OMBRO_D, [30, 42], MAO_D]))], 8 * K, hex("#3D6FB6"), "Bracos"),
  ];
  // véu branco sobre o manto azul (como na Medalha Milagrosa), braços baixos e abertos
  const veu = fill([forma(P_([[0, -29], [18, -23], [27, -5], [28, 14], [22, 22], [14, 8], [12, -4], [8, -12], [0, -15], [-8, -12], [-12, -4], [-14, 8], [-22, 22], [-28, 14], [-27, -5], [-18, -23]]))], "#FFFFFF", "VeuBranco");
  const contornoVeu = stroke([forma(P_([[0, -29], [18, -23], [27, -5], [28, 14], [22, 22], [14, 8], [12, -4], [8, -12], [0, -15], [-8, -12], [-12, -4], [-14, 8], [-22, 22], [-28, 14], [-27, -5], [-18, -23]]))], 0.8, hex("#CCD6DD"), "Contorno do veu");
  const maria = L("G_Maria", [...bracos, ...atrasDe(figura(K, { manto: "#3D6FB6", tunica: "#FFFFFF", orla: "#FFCC4D", bracos: "nenhum" }), "Rosto", [contornoVeu, veu])], {
    p: anim([[0, add(F, [0, 6])], [16, F, "out"]]), o: anim(aparecer(0, 8)),
  });
  const GLOBO = [100, 144];
  const globo = L("G_Globo", globoShapes(22), { p: GLOBO, s: anim(pop(0, 12, { over: 106 })), o: anim(aparecer(0, 6)) });
  const raiosMaos = (m, lado) => [0, 1, 2, 3].map((k) => {
    const a = ((lado > 0 ? 60 : 120) + lado * -12 * k) * (Math.PI / 180);
    const ini = add(F, [m[0] * K + Math.cos(a) * 4, m[1] * K + Math.sin(a) * 4]);
    return reta([ini, add(ini, [Math.cos(a) * 26, Math.sin(a) * 26])]);
  });
  const graca = L("G_RaiosDasMaos", [stroke([...raiosMaos(MAO_E, -1), ...raiosMaos(MAO_D, 1)], 2, hex("#FFCC4D"), "Feixes", { opacity: 85 })], {
    p: [0, 0], o: anim([...aparecer(22, 10, { to: 90 }), ...onda(90, -20, 32, END, { period: 20 })]),
  });
  const layers = [];
  layers.push(maria, graca, globo);
  if (t >= 3) layers.push(aureola({ center: add(F, [0, TOPO_MANTO * K]), rx: 12, ry: 3.4, t0: 52, nm: "T3_Aureola" }));
  if (t >= 2) {
    layers.push(L("T2_MedalhaMilagrosa", [
      ...transladar(coracaoShapes(5, { cor: "#DD2E44" }), [-2.6, 6]), ...transladar(coracaoShapes(5, { cor: "#DD2E44" }), [2.6, 6]),
      ...transladar(letrasShapes("M", 6, { cor: "#C99A3C", largura: 1.1, nm: "M" }), [0, -1]),
      stroke([reta([[-2.6, -9], [2.6, -9]]), reta([[0, -11.6], [0, -5]])], 1, hex("#C99A3C"), "Cruz"),
      lib.makeEllipseRing(0, 0, 9, 12, 1.2, hex("#C99A3C"), "Borda"),
      lib.makeEllipse(0, 0, 9, 12, hex("#FFE8A3"), "Oval"),
      stroke([lib.polyline([[-10, -40], [0, -13], [10, -40]], { smooth: false })], 2.6, hex("#3B88C3"), "Fita"),
    ], { p: anim([[0, [36, 112]], [40, [36, 112], "out"], [52, [36, 118]]]), r: anim([[0, 0], [52, 0], ...onda(0, 5, 52, END, { period: 26 })]), o: anim(aparecer(40, 6)) }));
  }
  if (t >= 3) layers.push(estrelasDoOuro("T3_Estrelas", [[-66, -40], [66, -50], [64, 8]], 50), luzDoOuro(c, { bottom: 160, w1: 100 }));
  return layers;
}

/** Pose de Cristo Rei (figura diante do trono). */
const CRISTO_REI = { F: [100, 84], K: 0.56 };
/** Cristo Rei do Universo: Cristo, diante do trono, ergue o cetro e abençoa. */
function gestoCristoRei(t, c) {
  const { F, K } = CRISTO_REI;
  const P_ = (pts) => escala(K, pts);
  // sentado no trono: a figura sem a túnica longa nem os pés, com o tronco, o colo sobre o assento, as pernas e os pés no degrau
  const corpo = figura(K, { tunica: "#FFFFFF", cabelo: "longo", corCabelo: "#8A4633", barba: "#8A4633", bracos: "mostrando", faixa: "#DD2E44" })
    .filter((g) => !["Veste", "PeE", "PeD"].includes(g.nm));
  const sentado = [
    fill([forma(P_([[0, 16], [14, 19], [24, 30], [26, 56], [28, 70], [-28, 70], [-26, 56], [-24, 30], [-14, 19]]))], "#FFFFFF", "Veste"),
    stroke([reta(P_([[-12, 84], [-11, 114]])), reta(P_([[12, 84], [11, 114]]))], 1, hex("#CCD6DD"), "Dobras"),
    fill([forma(P_([[-30, 62], [30, 62], [34, 74], [30, 82], [-30, 82], [-34, 74]]))], "#FFFFFF", "Colo"),
    fill([poligono(P_([[-24, 80], [24, 80], [22, 116], [-22, 116]]))], "#F5F8FA", "Pernas"),
    lib.makeEllipse(-9 * K, 118 * K, 6 * K, 3 * K, hex(PELE), "PeE"), lib.makeEllipse(9 * K, 118 * K, 6 * K, 3 * K, hex(PELE), "PeD"),
    fill([forma(P_([[-20, 20], [-38, 40], [-44, 82], [44, 82], [38, 40], [20, 20]]))], "#BE1931", "MantoVermelho"),
  ];
  const coroa = transladar(coroaShapes(16), [0, -16 * K]);
  const cristo = L("G_Cristo", [...coroa, ...corpo.filter((g) => g.nm !== "Cabelo"), ...sentado, ...corpo.filter((g) => g.nm === "Cabelo")], {
    p: anim([[0, add(F, [0, 6])], [12, F, "out"]]), o: anim(aparecer(0, 6)),
  });
  const MAO = add(F, [27 * K, 62 * K]);
  const cetro = L("G_Cetro", [
    lib.makeEllipse(0, -32, 3, 3, hex("#FFCC4D"), "Esfera"),
    fill([rect(-0.8, -40, 0.8, -34), rect(-2.6, -38.4, 2.6, -36.8)], "#F4900C", "Cruzinha"),
    stroke([reta([[0, -30], [0, 14]])], 2.4, hex("#F4900C"), "Haste"),
  ], { p: anim([[0, add(MAO, [0, 20])], [12, add(MAO, [0, 20]), "ease"], [30, MAO]]), o: anim(aparecer(12, 6)) });
  const trono = L("G_Trono", [
    fill([rect(70, 128, 130, 134)], "#C99A3C", "Assento"),
    stroke([forma([[72, 136], [72, 64], [86, 50], [100, 46], [114, 50], [128, 64], [128, 136]])], 3, hex("#F4900C"), "Moldura do trono"),
    fill([forma([[72, 136], [72, 64], [86, 50], [100, 46], [114, 50], [128, 64], [128, 136]])], "#A0041E", "Espaldar"),
    fill([rect(66, 134, 134, 156)], "#C99A3C", "Base"),
    fill([rect(60, 156, 140, 162)], "#8A6A3A", "Degrau"),
  ], { a: [100, 162], p: [100, 162], s: anim(pop(0, 12, { over: 104 })), o: anim(aparecer(0, 6)) });
  const layers = [];
  if (t >= 3) layers.push(L("T3_Globo", [
    fill([rect(-0.9, -14, 0.9, -8), rect(-3, -12.4, 3, -10.8)], "#F4900C", "Cruz"),
    stroke([reta([[-6.6, 0], [6.6, 0]]), reta([[0, -6.6], [0, 0]])], 1, hex("#F4900C"), "Faixas"),
    lib.makeEllipse(0, 0, 7, 7, hex("#FFCC4D"), "Globo"),
  ], { p: add(MAO, [0, 6]), s: anim([[0, 0], ...pop(46, 12)]), o: anim(aparecer(46, 4)) }));
  layers.push(cetro, cristo);
  if (t >= 2) {
    layers.push(L("T2_AlfaOmega", [
      grupoAnimado("Alfa", transladar(letrasShapes("Α", 16, { cor: "#E8A84C", largura: 2.6 }), [42, 84]), { o: anim(aparecer(40, 6)) }),
      grupoAnimado("Omega", transladar(letrasShapes("Ω", 16, { cor: "#E8A84C", largura: 2.6 }), [158, 84]), { o: anim(aparecer(46, 6)) }),
    ], { p: [0, 0] }));
  }
  layers.push(trono);
  if (t >= 3) layers.push(raios("T3_Raios", add(F, [0, -4]), { count: 16, r1: 34, r2: 44, half: 3, t0: 50, peak: 80 }));
  return layers;
}

/** São André Apóstolo: a cruz em X se ergue, uma diagonal de cada vez. */
function gestoAndre(t, c) {
  const viga = (de, para) => [
    stroke([reta([add(de, [1, -1]), add(para, [1, -1])])], 1, hex("#D99E82"), "Veio"),
    stroke([reta([de, para])], 8, hex("#8A4633"), "Viga"),
  ];
  const PE_A = [140, 156], PE_B = [60, 156];
  const vigaA = L("G_VigaA", viga([0, 0], [-80, -84]), { p: PE_A, r: anim([[0, -44], [4, -44, "ease"], [22, 0]]), o: anim(aparecer(0, 6)) });
  const vigaB = L("G_VigaB", viga([0, 0], [80, -84]), { p: PE_B, r: anim([[0, 44], [16, 44, "ease"], [34, 0]]), o: anim(aparecer(14, 6)) });
  const chao = cena("Chao", [fill([forma([[36, 158], [100, 154], [164, 158], [100, 162]])], "#C1A57A", "Chao")]);
  const layers = [vigaA, vigaB];
  if (t >= 2) {
    const malha = [];
    for (let k = 0; k <= 4; k++) malha.push(reta([[-16 + k * 8, -12], [-12 + k * 6, 14]]), reta([[-18, -12 + k * 6.5], [18, -12 + k * 6.5]]));
    layers.unshift(L("T2_Rede", [
      ...transladar(peixinhoShapes("#5DADEC"), [-6, 2]), ...transladar(espelhar(peixinhoShapes("#AAB8C2")), [7, 8]),
      stroke(malha, 0.9, hex("#8A6A3A"), "Malha"),
      stroke([poligono([[-18, -12], [18, -12], [14, 14], [-14, 14]])], 1.6, hex("#5C3A21"), "Cordas"),
      ...[-18, -6, 6, 18].map((x, k) => lib.makeEllipse(x, -13, 2, 1.6, hex("#F4900C"), `Boia${k}`)),
    ], { p: [154, 146], s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  layers.push(chao);
  if (t >= 3) layers.push(palmaEmPe("T3_Palma", 46, [40, 160], 46, -12), coroaDesce("T3_Coroa", 22, [100, 60], 50), luzDoOuro(c, { w1: 100 }));
  return layers;
}

/** Velas da coroa de Advento: [x, y da base]; as três roxas, a rosa e a branca do meio. */
const VELAS = { roxas: [[68, 138], [132, 138], [80, 156]], rosa: [122, 156], branca: [100, 146] };
/** Vela de pé (cera e pavio) com a base em (x, y) e altura h. */
const velaEmPe = ([x, y], h, cor, nm) => transladar(velaComprida(h, 9, cor), [x, y - h / 2]).map((g) => ({ ...g, nm: `${nm}${g.nm}` }));
/** Chama de vela que acende em t0 e tremula, com o pé no pavio da vela (base, altura h). */
function chamaDaVela(nm, [x, y], h, t0) {
  const pe = [x, y - h - 4];
  return grupoAnimado(nm, transladar(chamaShapes(12), pe), {
    a: pe, p: pe, s: anim([[0, [0, 0]], [t0, [0, 0], "out"], [t0 + 8, [100, 116]], [t0 + 12, [100, 100]], ...onda([100, 100], 8, t0 + 12, END, { period: 10, axis: 1 })]),
  });
}

/** 1º Domingo do Advento: a coroa de Advento aparece e as três velas roxas acendem uma a uma. */
function gestoAdvento(t, c) {
  const C = [100, 146];
  const folhas = Array.from({ length: 22 }, (_, k) => {
    const a = (k / 22) * Math.PI * 2, x = 49 * Math.cos(a), y = 14 * Math.sin(a), tx = -Math.sin(a) * 6, ty = Math.cos(a) * 2;
    return forma([[x - tx, y - ty], [x + 2, y - 3], [x + tx, y + ty], [x - 2, y + 3]]);
  });
  const guirlanda = L("G_Guirlanda", [
    fill([forma([[-6, 12], [0, 8], [6, 12], [3, 22], [0, 16], [-3, 22]])], "#744EAA", "Laco"),
    ...[[-30, 12], [26, 12], [-44, 4], [42, -6], [10, -14]].map(([x, y], k) => lib.makeEllipse(x, y, 2, 2, hex("#DD2E44"), `Baga${k}`)),
    fill(folhas, "#77B255", "Folhas"),
    lib.makeEllipseRing(0, 0, 49, 14, 11, hex("#3E721D"), "Ramos"),
  ], { a: [0, 0], p: C, s: anim(pop(0, 12, { over: 106 })), o: anim(aparecer(0, 6)) });
  const ROXO = "#7B3FA0", H = 38;
  const velas = L("G_Velas", [
    ...velaEmPe(VELAS.roxas[2], H, ROXO, "Vela3"), ...velaEmPe(VELAS.roxas[1], H, ROXO, "Vela2"), ...velaEmPe(VELAS.roxas[0], H, ROXO, "Vela1"),
  ], { a: C, p: C, s: anim([[0, [100, 0]], [6, [100, 0], "out"], [16, [100, 100]]]), o: anim(aparecer(6, 4)) });
  const chamas = L("G_Chamas", VELAS.roxas.map((b, k) => chamaDaVela(`Chama${k + 1}`, b, H, 20 + k * 10)), { p: [0, 0] });
  const layers = [];
  if (t >= 2) layers.push(L("T2_VelaRosa", [chamaDaVela("ChamaRosa", VELAS.rosa, H, 50), ...velaEmPe(VELAS.rosa, H, "#F4ABBA", "VelaRosa")], { a: VELAS.rosa, p: VELAS.rosa, s: anim([[0, [100, 0]], [40, [100, 0], "out"], [48, [100, 100]]]), o: anim(aparecer(40, 4)) }));
  layers.push(chamas, velas);
  if (t >= 3) layers.push(L("T3_VelaBranca", [chamaDaVela("ChamaBranca", VELAS.branca, 52, 60), ...velaEmPe(VELAS.branca, 52, "#FFFFFF", "VelaBranca"), fill([rect(90, 146, 110, 150)], "#C99A3C", "Pe")], { a: VELAS.branca, p: VELAS.branca, s: anim([[0, [100, 0]], [48, [100, 0], "out"], [58, [100, 100]]]), o: anim(aparecer(48, 4)) }));
  layers.push(guirlanda);
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 132, w1: 96 }));
  return layers;
}

/** Caranguejo vermelho, de frente, com o meio do corpo em (0,0); as pinças seguram o pé do crucifixo em (0, −18). */
function caranguejoShapes() {
  const pata = (lado, k) => lib.polyline([[lado * 12, -2 + k * 4], [lado * (20 + k), -6 + k * 5], [lado * (24 + k * 2), 4 + k * 5]]);
  const pinca = (lado) => [
    fill([forma([[lado * 2, -16], [lado * 7, -24], [lado * 10, -20], [lado * 9, -14], [lado * 5, -12]])], "#DD2E44", `Pinca${lado > 0 ? "D" : "E"}`),
    stroke([lib.polyline([[lado * 12, -4], [lado * 14, -10], [lado * 8, -14]])], 3.4, hex("#DD2E44"), `BracoPinca${lado > 0 ? "D" : "E"}`),
  ];
  return [
    ...pinca(-1), ...pinca(1),
    lib.makeEllipse(-5, -15, 1.2, 1.2, hex("#292F33"), "OlhoE"), lib.makeEllipse(5, -15, 1.2, 1.2, hex("#292F33"), "OlhoD"),
    lib.makeEllipse(-5, -15, 2.4, 2.4, hex("#FFFFFF"), "BrancoE"), lib.makeEllipse(5, -15, 2.4, 2.4, hex("#FFFFFF"), "BrancoD"),
    stroke([reta([[-4, -8], [-5, -13]]), reta([[4, -8], [5, -13]])], 1.4, hex("#BE1931"), "Antenas"),
    stroke([lib.polyline([[-6, 2], [0, 4], [6, 2]])], 1, hex("#BE1931"), "Boca"),
    lib.makeEllipse(-4, -4, 4, 2, hex("#F4ABBA"), "Reflexo", 70),
    lib.makeEllipse(0, 0, 15, 9, hex("#F4594B"), "Carapaca"),
    stroke([0, 1, 2].flatMap((k) => [pata(-1, k), pata(1, k)]), 2.2, hex("#DD2E44"), "Patas"),
  ];
}

/** São Francisco Xavier: o caranguejo sai do mar trazendo o crucifixo perdido na tempestade. */
function gestoFranciscoXavier(t, c) {
  const FIM = [100, 152];
  const anda = [[0, [100, 124]], [4, [100, 124], "linear"], [10, [96, 132], "linear"], [16, [104, 140], "linear"], [22, [97, 147], "linear"], [28, FIM, "out"]];
  const cresce = anim([[0, [60, 60]], [4, [60, 60], "linear"], [28, [100, 100]]]);
  const caranguejo = L("G_Caranguejo", caranguejoShapes(), { p: anim(anda), s: cresce, o: anim(aparecer(4, 6)) });
  const crucifixo = L("G_Crucifixo", crucifixoShapes(48), { a: [0, 18], p: anim(anda), s: cresce, o: anim(aparecer(4, 6)) });
  const ondas = Array.from({ length: 3 }, (_, j) => lib.polyline(Array.from({ length: 10 }, (_, k) => [26 + k * 16.6, 114 + j * 7 + (k % 2 ? -1.6 : 1.6)])));
  const mar = L("G_Mar", [
    stroke(ondas, 1.4, hex("#FFFFFF"), "Ondas", { opacity: 85 }),
    fill([pontas(forma([[22, 108], [100, 106], [178, 108], [178, 134], [22, 134]]), [0, 2, 3, 4])], "#3B88C3", "Mar"),
  ], { p: anim([[0, [0, 0]], ...onda([0, 0], 3, 0, END, { period: 30, axis: 0 })]), o: anim(aparecer(0, 6)) });
  const areia = cena("Areia", [fill([pontas(forma([[22, 134], [100, 128], [178, 134], [174, 168], [100, 170], [26, 168]]), [0, 2, 3, 5])], "#F2D7A0", "Areia")]);
  const layers = [];
  // no ouro: a auréola acima do crucifixo e os raios em volta do cruzamento
  // a auréola (nimbo redondo) em volta da cabeça do Cristo do crucifixo
  if (t >= 3) layers.push(aureola({ center: add(FIM, [0, -18 - 48 * 0.71 - 3.4]), r: 4.6, width: 1.4, t0: 52, nm: "T3_Aureola" }), raios("T3_Raios", add(FIM, [0, -18 - 48 * 0.74]), { r1: 16, r2: 26, t0: 56 }));
  layers.push(crucifixo, caranguejo);
  if (t >= 2) {
    layers.push(L("T2_Navio", [
      stroke([reta([[-2, -26], [-2, -2]]), reta([[10, -20], [10, -2]])], 1.4, hex("#5C3A21"), "Mastros"),
      stroke([poligono([[-1, -24], [8, -14], [-1, -6]]), poligono([[11, -18], [19, -10], [11, -4]])], 0.8, hex("#AAB8C2"), "Contorno das velas"),
      fill([poligono([[-1, -24], [8, -14], [-1, -6]]), poligono([[11, -18], [19, -10], [11, -4]])], "#FFFFFF", "Velas"),
      stroke([reta([[3, -18], [3, -12]]), reta([[1, -15], [5, -15]])], 1, hex("#DD2E44"), "Cruz da vela"),
      fill([poligono([[-14, -2], [24, -2], [18, 6], [-10, 6]])], "#8A4633", "Casco"),
    ], { p: anim([[0, [36, 108]], [40, [36, 108], "linear"], [END, [48, 108]]]), o: anim(aparecer(40, 8)) }));
  }
  layers.push(mar, areia);
  return layers;
}

/** Bolsinha de pano fechada (amarrada no alto, sem moeda à mostra), com o fundo no meio em (0,0). */
function bolsinhaShapes() {
  return [
    stroke([lib.polyline([[-3, -11], [0, -10], [3, -11]])], 1.4, hex("#8A4633"), "Cordao"),
    fill([forma([[-2.4, -10.4], [-3.6, -14], [0, -12.4], [3.6, -14], [2.4, -10.4]])], "#C99A3C", "Boca"),
    fill([forma([[-6, 0], [-7, -5], [-4.4, -9.4], [-1.8, -10.6], [1.8, -10.6], [4.4, -9.4], [7, -5], [6, 0]])], "#E8A84C", "Bolsinha"),
  ];
}
/** Rosto do bispo Nicolau (no ouro, na esquina) e a escala. */
const NICOLAU = { F: [38, 94], K: 0.5 };
/** Topo (no desenho do busto, vezes k) para a auréola acima da mitra. */
const TOPO_MITRA = -46;
/** Janela da casa de Nicolau e as três bolsinhas no peitoril. */
const PEITORIL = 120, BOLSAS = [122, 137, 152];

/** São Nicolau de Mira: à noite, a mão do bispo deixa três bolsinhas fechadas, uma a uma, na janela. */
function gestoNicolau(t, c) {
  const RAIZ = [30, 116];
  const alcances = [[0, [70, 118]], [6, [70, 118], "ease"], [16, [BOLSAS[0], 114]], [22, [86, 112]], [30, [BOLSAS[1], 114]], [36, [86, 112]], [44, [BOLSAS[2], 114]], [52, [80, 116]]];
  const mao = L("G_Mao", [
    lib.makeEllipse(2, -1, 4.4, 3.4, hex(PELE), "Mao"),
    fill([forma([[-2, -6], [-5, -6], [-6, 6], [-2, 6]])], "#E1E8ED", "Punho"),
  ], { p: anim(alcances), o: anim(aparecer(0, 6)) });
  // a manga vermelha, da esquina até a mão: gira e estica junto com ela
  const braco = alcances.map(([tt, h, e]) => {
    const d = [h[0] - 4 - RAIZ[0], h[1] - RAIZ[1]];
    return [tt, Math.atan2(d[1], d[0]) * (180 / Math.PI), Math.hypot(...d), e];
  });
  const manga = L("G_Braco", [fill([forma([[0, -7], [60, -6], [100, -5], [100, 5], [60, 6], [0, 7]])], "#BE1931", "Manga")], {
    a: [0, 0], p: RAIZ, r: anim(braco.map(([tt, r, , e]) => [tt, r, e])), s: anim(braco.map(([tt, , len, e]) => [tt, [len, 100], e])), o: anim(aparecer(0, 6)),
  });
  const bolsas = L("G_Bolsas", BOLSAS.map((x, k) => grupoAnimado(`Bolsinha${k + 1}`, transladar(bolsinhaShapes(), [x, PEITORIL]), {
    a: [x, PEITORIL], p: [x, PEITORIL], s: anim([[0, [0, 0]], [16 + k * 14, [0, 0], "out"], [20 + k * 14, [110, 110]], [24 + k * 14, [100, 100]]]),
  })), { p: [0, 0] });
  const pedras = Array.from({ length: 5 }, (_, k) => reta([[98, 56 + k * 24], [176, 56 + k * 24]]));
  const casa = L("G_Casa", [
    fill([rect(108, PEITORIL, 166, PEITORIL + 6)], "#A0522D", "Peitoril"),
    fill([rect(114, 72, 160, PEITORIL)], "#1F2A44", "Janela"),
    stroke([reta([[137, 72], [137, PEITORIL]]), reta([[114, 96], [160, 96]])], 2, hex("#8A4633"), "Caixilho"),
    fill([rect(110, 68, 164, PEITORIL)], "#8A4633", "Moldura"),
    stroke(pedras, 0.8, hex("#C9B78F"), "Pedras"),
    fill([rect(96, 44, 178, 168)], "#E8DCC0", "Parede"),
  ], { p: anim([[0, [4, 0]], [10, [0, 0], "out"]]), o: anim(aparecer(0, 6)) });
  const esquina = cena("Esquina", [
    stroke([reta([[18, 70], [40, 70]]), reta([[18, 100], [40, 100]]), reta([[18, 130], [40, 130]])], 0.8, hex("#8899A6"), "Pedras da esquina"),
    fill([rect(18, 52, 40, 168)], "#AAB8C2", "Esquina"),
  ]);
  const noite = cena("Noite", [fill([forma([[54, 40], [60, 44], [62, 50], [60, 56], [54, 60], [57, 54], [58, 50], [57, 46]])], "#FFE8B6", "Lua")]);
  const layers = [];
  if (t >= 2) layers.push(L("T2_Ancora", [
    lib.makeEllipseRing(0, -22, 3.4, 3.4, 1.8, hex("#66757F"), "Argola"),
    stroke([reta([[0, -18], [0, 12]]), reta([[-8, -12], [8, -12]])], 2.6, hex("#66757F"), "Haste"),
    stroke([lib.polyline([[-14, 2], [-10, 10], [0, 14], [10, 10], [14, 2]])], 2.6, hex("#66757F"), "Bracos da ancora"),
    fill([poligono([[-16, 0], [-12, 6], [-10, 0]]), poligono([[16, 0], [12, 6], [10, 0]])], "#66757F", "Unhas"),
  ], { p: [66, 152], r: anim([[0, -10], [40, -10, "ease"], [52, 0]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  // no ouro, o bispo aparece na esquina (de mitra), com a auréola na cabeça; a manga sai dele
  const { F, K } = NICOLAU;
  if (t >= 3) {
    const capa = fill([forma(escala(K, [[-10, 18], [-16, 19], [-30, 30], [-36, 56], [-38, 70], [38, 70], [36, 56], [30, 30], [16, 19], [10, 18], [6, 36], [0, 40], [-6, 36]]))], "#BE1931", "Capa");
    layers.push(L("T3_Nicolau", [...transladar(mitraShapes(K * 0.9), [0, -11 * K]), ...naFrenteDe(bustoHomem(K, { veste: "#F5F8FA", corCabelo: "#8A4633", barba: "#8A4633" }), "Veste", [capa])], {
      p: anim([[0, add(F, [0, 6])], [44, add(F, [0, 6]), "out"], [56, F]]), o: anim(aparecer(44, 8)),
    }));
  }
  layers.push(esquina, mao, manga, bolsas);
  if (t >= 3) layers.push(luzDoOuro(c, { x: 137, top: 30, bottom: 120, w0: 10, w1: 56 }));
  layers.push(casa, noite);
  if (t >= 3) layers.push(estrelasDoOuro("T3_Estrelas", [[-30, -62], [-12, -52], [6, -66], [-50, -44]], 46, 3.4), aureola({ center: [F[0], F[1] + TOPO_MITRA * K], rx: 9, ry: 2.6, t0: 58, nm: "T3_Aureola" }));
  return layers;
}

/** Abelha desenhada (maior que a de São Bernardo), olhando para a esquerda, centrada em (0,0). */
function abelhaGrandeShapes() {
  return [
    lib.makeEllipse(-6.6, -0.6, 0.8, 0.8, hex("#FFFFFF"), "Olho"),
    lib.makeEllipse(-6, 0, 2.8, 2.8, hex("#292F33"), "Cabeca"),
    stroke([reta([[-1, -3.6], [-1, 3.6]]), reta([[2.4, -3.6], [2.4, 3.6]])], 1.6, hex("#292F33"), "Listras"),
    lib.makeEllipse(1, 0, 5.6, 3.8, hex("#FFCC4D"), "Corpo"),
    lib.makeEllipse(-1, -5.4, 3, 2.2, hex("#E1F2FD"), "Asa1", 90),
    lib.makeEllipse(2.6, -5.8, 3, 2.2, hex("#CCE6F7"), "Asa2", 90),
  ];
}
/** Pose de Santo Ambrósio (busto de homem com mitra e pluvial). */
const AMBROSIO = { F: [92, 100], K: 0.72 };

/** Santo Ambrósio de Milão: Ambrósio prega e uma abelha pousa nos lábios ("boca de mel"). */
function gestoAmbrosio(t, c) {
  const { F, K } = AMBROSIO;
  const P_ = (pts) => escala(K, pts);
  const pluvial = [
    lib.makeEllipse(0, 24 * K, 3.6 * K, 3 * K, hex("#C99A3C"), "Broche"),
    stroke([reta(P_([[-9, 24], [-12, 70]])), reta(P_([[9, 24], [12, 70]]))], 4 * K, hex("#BE1931"), "Sebastos"),
    fill([forma(P_([[-10, 18], [-16, 19], [-30, 30], [-36, 56], [-38, 70], [38, 70], [36, 56], [30, 30], [16, 19], [10, 18], [6, 36], [0, 40], [-6, 36]]))], "#E8A84C", "Pluvial"),
  ];
  const mitra = transladar(mitraShapes(K * 0.9), [0, -11 * K]);
  const ambrosio = L("G_Ambrosio", [...mitra, ...naFrenteDe(bustoHomem(K, { veste: "#F5F8FA", corCabelo: "#8A4633", barba: "#8A4633" }), "Veste", pluvial)], {
    p: anim([[0, add(F, [0, 6])], [12, F, "out"]]), o: anim(aparecer(0, 6)),
  });
  const ombro = add(F, [-24 * K, 34 * K]);
  const prega = L("G_Mao", [
    fill([forma([[-17.6, -22], [-17, -30], [-15.6, -30], [-15.4, -22]])], PELE, "Dedo"),
    lib.makeEllipse(-17, -19, 3.6, 4, hex(PELE), "MaoD"),
    stroke([lib.polyline([[0, 0], [-12, -4], [-17, -15]])], 6, hex("#E8A84C"), "Manga"),
  ], { a: [0, 0], p: ombro, r: anim([[0, -60], [6, -60, "ease"], [22, 0], ...onda(0, 6, 22, END, { period: 22 })]), o: anim(aparecer(4, 6)) });
  // a abelha pousa no canto dos lábios, com a cabeça na boca e o corpo para fora do rosto
  const BOCA = add(F, [2.5 * K + 8.5, 8 * K]);
  const voo = [[0, [168, 52]], [14, [168, 52], "linear"], [22, [150, 70], "linear"], [30, [138, 56], "linear"], [38, [120, 82], "linear"], [46, add(BOCA, [6, -6]), "out"], [52, BOCA]];
  const abelha = L("G_Abelha", abelhaGrandeShapes(), { p: anim(voo), r: anim([[0, 0], [14, 0], ...onda(0, 12, 14, 52, { period: 6 }), [56, 0]]), o: anim(aparecer(14, 4)) });
  const layers = [abelha, prega, ambrosio];
  if (t >= 2) layers.push(L("T2_Livro", [
    ...transladar(letrasShapes("TE", 4.4, { cor: "#BE1931", largura: 0.9, nm: "TE" }), [-7, -2]),
    ...transladar(letrasShapes("DEUM", 4.4, { cor: "#BE1931", largura: 0.9, nm: "DEUM" }), [8.6, -2]),
    ...livroAbertoShapes(40, 24, "#8A4633"),
  ], { p: [150, 152], s: anim([[0, [4, 100]], ...abrir(40, 54, { axis: "x", from: 4 })]), o: anim(aparecer(40, 3)) }));
  if (t >= 3) layers.push(...aureolaERaios(add(F, [0, -11 * K - 32 * 0.9 * K - 4]), { rx: 12, ry: 3.4, r1: 18, r2: 28 }));
  return layers;
}

/** Pose da Imaculada (figura de manto, de pé sobre a lua). */
const IMACULADA = { F: [100, 54], K: 0.58 };

/** Imaculada Conceição: Maria, de pé sobre a lua crescente, pisa a serpente. */
function gestoImaculada(t, c) {
  const { F, K } = IMACULADA;
  const PES = F[1] + 108 * K;
  // manto azul-claro, mãos postas e a cabeça um pouco inclinada (diferente de Nossa Senhora das Graças)
  const maria = L("G_Maria", figura(K, { manto: "#7FB8E8", tunica: "#FFFFFF", orla: "#FFCC4D", bracos: "postas" }), {
    a: [0, 108 * K], p: anim([[0, [F[0], PES - 8]], [16, [F[0], PES], "out"]]), r: anim([[0, 0], [16, 0, "ease"], [30, -4]]), o: anim(aparecer(0, 8)),
  });
  const lua = L("G_Lua", [fill([forma([[-32, -6], [-20, 4], [0, 9], [20, 4], [32, -6], [18, -1], [0, 2], [-18, -1]])], "#FFD983", "Lua")], {
    a: [0, 0], p: [100, PES + 10], s: anim(pop(0, 12, { over: 108 })), o: anim(aparecer(0, 6)),
  });
  // a serpente fica entre os pés de Maria e a lua, com a cabeça sob o pé dela
  const corpo = lib.polyline([[2, 0], [10, -3], [18, 1], [26, -2], [34, 2], [40, 0]]);
  const serpente = L("G_Serpente", [
    lib.makeEllipse(-1.4, -1.2, 0.8, 0.8, hex("#292F33"), "Olho"),
    lib.makeEllipse(0, 0, 4.6, 3.2, hex("#5C913B"), "Cabeca"),
    stroke([corpo], 2, hex("#A6D388"), "Escamas"),
    stroke([corpo], 5, hex("#5C913B"), "Corpo"),
  ], { p: anim([[0, [134, PES + 3]], [8, [134, PES + 3], "out"], [28, [92, PES + 3]], [32, [94, PES + 3]], [36, [92, PES + 3]]]), o: anim(aparecer(8, 6)) });
  const layers = [];
  if (t >= 3) {
    const estrelas = Array.from({ length: 12 }, (_, k) => {
      const a = Math.PI * (0.92 + (k / 11) * 1.16);
      return transladar(estrelaShapes(2.8), [22 * Math.cos(a), 18 * Math.sin(a)]);
    }).flat();
    // a coroa de 12 estrelas acompanha a cabeça inclinada
    layers.push(L("T3_AureolaEstrelas", estrelas, { a: [0, 0], p: naPose([F[0], PES], [0, 108 * K], -4, [0, -14 * K]), r: -4, s: anim([[0, 0], ...pop(48, 12, { over: 110 })]), o: anim(aparecer(48, 4)) }));
  }
  layers.push(maria, serpente, lua);
  if (t >= 2) layers.push(L("T2_Lirio", lirioShapes(48), { p: [156, 168], s: anim([[0, [100, 0]], ...abrir(40, 54, { axis: "y" })]), o: anim(aparecer(40, 4)) }));
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 100 }));
  return layers;
}

/** Olho desenhado com delicadeza (amêndoa branca, íris azul e cílios), centrado em (0,0). */
function olhoShapes() {
  return [
    lib.makeEllipse(0.8, -0.8, 0.6, 0.6, hex("#FFFFFF"), "Reflexo"),
    lib.makeEllipse(0, 0, 1.2, 1.2, hex("#292F33"), "Pupila"),
    lib.makeEllipse(0, 0, 2.5, 2.5, hex("#3B88C3"), "Iris"),
    stroke([forma([[-4.6, 0], [0, -3], [4.6, 0], [0, 3]])], 0.8, hex("#8A4633"), "Contorno do olho"),
    fill([forma([[-4.6, 0], [0, -3], [4.6, 0], [0, 3]])], "#FFFFFF", "Branco"),
    stroke([reta([[-2.6, -2.6], [-3.4, -4.2]]), reta([[0, -3], [0, -4.8]]), reta([[2.6, -2.6], [3.4, -4.2]])], 0.7, hex("#5C3A21"), "Cilios"),
  ];
}
/** Pose de Santa Luzia (busto de véu vermelho, parada). */
const LUZIA = { F: [76, 88], K: 0.7 };

/** Santa Luzia: ergue o pratinho com os dois olhos e a luz acende sobre ele. */
function gestoLuzia(t, c) {
  const { F, K } = LUZIA;
  const santa = L("G_Siracusana", busto(K, { manto: "#BE1931", veste: "#F5F8FA", orla: "#FFCC4D" }), { p: anim([[0, add(F, [0, 6])], [12, F, "out"]]), o: anim(aparecer(0, 6)) });
  const ombro = add(F, [22 * K, 40 * K]);
  const PRATO = [146 - ombro[0], 118 - ombro[1]];
  const prato = L("G_Prato", [
    ...transladar(olhoShapes(), add(PRATO, [-6, -1])), ...transladar(olhoShapes(), add(PRATO, [6, -1])),
    lib.makeEllipseRing(PRATO[0], PRATO[1], 13, 6, 1, hex("#E8C36A"), "Fundo do prato"),
    lib.makeEllipse(PRATO[0], PRATO[1], 17, 8, hex("#FFE8A3"), "Prato"),
    lib.makeEllipse(PRATO[0] - 9, PRATO[1] + 7, 3.4, 2.8, hex(PELE), "Mao1"), lib.makeEllipse(PRATO[0] + 5, PRATO[1] + 8, 3.4, 2.8, hex(PELE), "Mao2"),
    stroke([lib.polyline([[0, 0], [20, 10], [PRATO[0] - 11, PRATO[1] + 8]])], 6, hex("#BE1931"), "Manga"),
  ], { a: [0, 0], p: ombro, r: anim([[0, 14], [8, 14, "ease"], [26, 0]]), o: anim(aparecer(4, 6)) });
  const luz = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", x: 146, top: 40, bottom: 118, w0: 8, w1: 40, t0: 26, peak: 50 });
  const layers = [prato, santa];
  if (t >= 2) layers.push(palmaEmPe("T2_Palma", 46, [38, 166], 40, -6));
  layers.push(luz);
  if (t >= 3) layers.unshift(coroaDesce("T3_Coroa", 18, [F[0], F[1] - 32 * K - 6], 48));
  if (t >= 3) layers.push(aureola({ center: [F[0], F[1] + TOPO_MANTO * K], rx: 11, ry: 3.2, t0: 54, nm: "T3_Aureola" }));
  if (t >= 3) layers.push(luzDoOuro(c, { x: 84, w1: 80 }));
  return layers;
}

/** Monte Carmelo: o contorno, com o meio da base em (100, 166) e o alto em (100, 84). */
const MONTE = pontas(forma([[22, 166], [32, 150], [50, 132], [72, 112], [92, 102], [112, 100], [132, 108], [154, 124], [170, 146], [178, 166]]), [0, 9]);

/** São João da Cruz: a noite escurece e a "chama viva de amor" acende no alto do Monte Carmelo. */
function gestoJoaoCruz(t, c) {
  const ARVORES = [60, 82, 128, 146].map((x, k) => poligono([[x - 6, 140 - k * 3 + (x > 100 ? 4 : 0)], [x, 124 - k * 3 + (x > 100 ? 4 : 0)], [x + 6, 140 - k * 3 + (x > 100 ? 4 : 0)]]));
  const monte = L("G_Monte", [
    fill(ARVORES, "#3E721D", "Arvores"),
    stroke([lib.polyline([[64, 160], [84, 140], [104, 132], [120, 140], [140, 158]])], 1.6, hex("#B0C98A"), "Trilha"),
    fill([MONTE], "#7C9A5A", "Monte"),
  ], { a: [100, 166], p: [100, 166], s: anim(pop(0, 12, { over: 104 })), o: anim(aparecer(0, 6)) });
  // a noite: escurece o monte e traz a lua (igual nos três níveis; no ouro, a camada T3_Clarear devolve a cor)
  const escuro = [[0, 0], [4, 0, "ease"], [28, 60]];
  const noite = L("G_Noite", [
    fill([forma([[30, 40], [36, 44], [38, 50], [36, 56], [30, 60], [33, 54], [34, 50], [33, 46]])], "#FFE8B6", "Lua"),
    fill([MONTE], "#1F2A44", "Sombra"),
  ], { p: [0, 0], o: anim(escuro) });
  // a chama paira acima do cume (não sai do monte)
  const CUME = [104, 84];
  const chama = L("G_Chama", [...transladar(coracaoShapes(8, { cor: "#DD2E44" }), [0, -8]), ...chamaShapes(30)], {
    a: [0, 0], p: CUME, s: anim([[0, [0, 0]], [22, [0, 0], "out"], [34, [100, 112]], [38, [100, 100]], ...onda([100, 100], 6, 38, END, { period: 12, axis: 1 })]), o: anim(aparecer(22, 3)),
  });
  const layers = [];
  if (t >= 3) layers.push(estrelasDoOuro("T3_Estrelas", [[-40, -56], [36, -60], [60, -40], [-62, -30], [8, -64]], 50));
  layers.push(chama);
  if (t >= 2) {
    layers.push(L("T2_Crucifixo", [
      stroke([lib.polyline([[-4, -10], [0, -6], [4, -10]])], 1.6, hex(PELE), "Bracos de Cristo"),
      lib.makeEllipse(0, -3, 2, 2.2, hex(PELE), "Cabeca de Cristo"),
      fill([forma([[-1.8, -2], [1.8, -2], [1.6, 8], [-1.6, 8]])], PELE, "Corpo de Cristo"),
      fill([poligono([[-16, -12], [16, -8], [16, -5], [-16, -9]])], "#8A4633", "Travessa"),
      fill([poligono([[-2.6, -26], [2.6, -26], [4, 24], [-4, 24]])], "#A0522D", "Haste"),
    ], { p: [42, 98], r: anim([[0, -24], [40, -24, "ease"], [52, -16]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  // no ouro, a noite clareia: o verde do monte e das árvores volta por cima da sombra
  if (t >= 3) layers.push(L("T3_Clarear", [fill(ARVORES, "#3E721D", "Arvores claras"), fill([MONTE], "#7C9A5A", "Monte claro")], { p: [0, 0], o: anim([[0, 0], [56, 0, "ease"], [80, 75]]) }));
  layers.push(noite, monte);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 110, bottom: 160 }));
  return layers;
}

/** Poses do presépio: Maria (busto de manto) e José (busto de homem), inclinados para a manjedoura. */
const NATAL_MARIA = pose([62, 74], 0.72, 75, 8), NATAL_JOSE = pose([142, 90], 0.6, 70, -7);
/** Cabeça do Menino na manjedoura. */
const MENINO = [114, 136];

/** Natal do Senhor: o Menino Jesus aparece na manjedoura e Maria e José se inclinam sobre ele. */
function gestoNatal(t, c) {
  const inclina = (pz, t0) => ({ a: pz.A, p: pz.P, r: anim([[0, 0], [t0, 0, "ease"], [t0 + 18, pz.R]]), o: anim(aparecer(0, 6)) });
  const maria = L("G_Maria", busto(NATAL_MARIA.K, { manto: "#3D6FB6", veste: "#F5F8FA", orla: "#FFCC4D" }), inclina(NATAL_MARIA, 10));
  const KJ = NATAL_JOSE.K;
  const manto = fill([forma(escala(KJ, [[-14, 20], [-28, 32], [-34, 56], [-36, 70], [-16, 70], [-8, 34]])), forma(escala(KJ, [[14, 20], [28, 32], [34, 56], [36, 70], [16, 70], [8, 34]]))], "#5C913B", "Manto");
  const jose = L("G_Jose", naFrenteDe(bustoHomem(KJ, { veste: "#A0522D", corCabelo: "#5C3A21", barba: "#5C3A21" }), "Veste", [manto]), inclina(NATAL_JOSE, 14));
  const menino = L("G_Menino", espelhar([
    stroke([lib.polyline([[-3, 0], [-1.8, 0.8], [-0.6, 0]]), lib.polyline([[0.8, 0], [2, 0.8], [3.2, 0]])], 0.8, hex("#662113"), "Olhos"),
    lib.makeEllipse(0, 0, 5.4, 5, hex(PELE), "Bebe"),
    fill([forma([[-4, -4], [0, -6], [4, -4], [2, -3], [-2, -3]])], "#C1694F", "Cabelo"),
    stroke([reta([[8, -3], [10, 4]]), reta([[15, -3], [17, 4]])], 0.9, hex("#CCD6DD"), "Faixas"),
    fill([forma([[3, -5], [16, -5], [24, -2], [24, 3], [16, 5], [3, 5]])], "#FFFFFF", "Panos"),
  ]), { a: [0, 0], p: MENINO, s: anim([[0, 0], ...pop(4, 12, { over: 140, base: 125 })]), o: anim(aparecer(4, 4)) });
  const palha = Array.from({ length: 9 }, (_, k) => reta([[76 + k * 6, 142], [74 + k * 6 + (k % 2 ? 4 : -2), 136]]));
  const manjedoura = L("G_Manjedoura", [
    stroke(palha, 1.4, hex("#FFCC4D"), "Palha"),
    fill([forma([[70, 140], [130, 140], [124, 154], [76, 154]])], "#A0522D", "Cocho"),
    stroke([reta([[80, 152], [92, 166]]), reta([[92, 152], [80, 166]]), reta([[108, 152], [120, 166]]), reta([[120, 152], [108, 166]])], 2.6, hex("#8A4633"), "Pes"),
  ], { a: [100, 166], p: [100, 166], s: anim(pop(0, 12, { over: 104 })), o: anim(aparecer(0, 6)) });
  const layers = [];
  layers.push(maria, jose, menino, manjedoura);
  if (t >= 3) {
    const anjo = (x) => [...transladar(busto(0.26, { veste: "#F5F8FA", cabelo: "curto", corCabelo: "#FFCC4D" }), [x, 0]), ...transladar(parDeAsas(13), [x, 8])];
    layers.push(L("T3_Anjos", [...anjo(-62), ...anjo(62)], { p: anim([[0, [100, 50]], [46, [100, 50], "out"], [58, [100, 42]], ...flutuar([100, 42], 58, 2)]), o: anim(aparecer(46, 8)) }));
  }

  if (t >= 2) {
    layers.push(L("T2_BoiEBurro", [
      // o boi, à esquerda: cabeça marrom com chifres e focinho claro
      lib.makeEllipse(30, 150, 1.2, 1.2, hex("#292F33"), "OlhoBoi"),
      lib.makeEllipse(36, 160, 6, 4.4, hex("#E8C89E"), "FocinhoBoi"),
      stroke([lib.polyline([[26, 144], [21, 140], [22, 135]]), lib.polyline([[38, 144], [43, 140], [42, 135]])], 2.4, hex("#FFE8B6"), "ChifresBoi"),
      fill([forma([[24, 146], [32, 142], [40, 146], [42, 158], [32, 164], [24, 156]])], "#8A4633", "CabecaBoi"),
      // o burrinho, à direita: cabeça cinza de orelhas compridas
      lib.makeEllipse(170, 150, 1.2, 1.2, hex("#292F33"), "OlhoBurro"),
      lib.makeEllipse(164, 161, 5.4, 4, hex("#CCD6DD"), "FocinhoBurro"),
      fill([forma([[166, 144], [168, 128], [172, 130], [171, 145]]), forma([[172, 146], [178, 132], [181, 135], [175, 148]])], "#8899A6", "OrelhasBurro"),
      fill([forma([[160, 146], [170, 142], [178, 148], [176, 158], [166, 164], [158, 158]])], "#AAB8C2", "CabecaBurro"),
    ], { p: anim([[0, [0, 8]], [40, [0, 8], "out"], [52, [0, 0]]]), o: anim(aparecer(40, 8)) }));
  }
  if (t >= 3) layers.push(luzDoOuro(c, { x: 96, bottom: 136, w1: 70 }));
  return layers;
}

/** Pose de Santo Estêvão (busto de homem que ergue os olhos ao céu). */
const ESTEVAO = pose([100, 94], 0.74, 70, -5);

/** Santo Estêvão: ergue os olhos e o céu se abre em luz; três pedras repousam a seus pés. */
function gestoEstevao(t, c) {
  const { K, A, P, R } = ESTEVAO;
  const P_ = (pts) => escala(K, pts);
  const dalmatica = [
    stroke([reta(P_([[-14, 24], [-15, 70]])), reta(P_([[14, 24], [15, 70]])), reta(P_([[-30, 52], [30, 52]]))], 3.4 * K, hex("#FFCC4D"), "Faixas"),
    fill([forma(P_([[-8, 17], [8, 17], [10, 22], [0, 26], [-10, 22]]))], "#FFFFFF", "Amito"),
  ];
  const estevao = L("G_Estevao", naFrenteDe(bustoHomem(K, { veste: "#BE1931", corCabelo: "#5C3A21", barba: "#5C3A21", tonsura: true }), "Veste", dalmatica), {
    a: A, p: P, r: anim([[0, 0], [8, 0, "ease"], [26, R]]), o: anim(aparecer(0, 6)),
  });
  const pedra = (x, y, rx, ry, cor) => lib.makeEllipse(x, y, rx, ry, hex(cor), `Pedra${x}`);
  const pedras = L("G_Pedras", [pedra(-28, 0, 8, 5, "#8899A6"), pedra(0, 3, 9, 5.4, "#AAB8C2"), pedra(28, 0, 7, 4.6, "#99AAB5")], {
    a: [0, 4], p: [100, 164], s: anim([[0, 0], ...pop(6, 12, { over: 108 })]), o: anim(aparecer(6, 4)),
  });
  const ceu = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", top: 22, bottom: 120, w0: 16, w1: 100, t0: 20, peak: 40 });
  const layers = [estevao, pedras];
  if (t >= 2) layers.push(palmaEmPe("T2_Palma", 46, [160, 166], 40, 10));
  if (t >= 3) layers.unshift(coroaDesce("T3_Coroa", 20, naPose(P, A, R, [0, -32 * K]), 48));
  if (t >= 3) layers.push(aureola({ center: naPose(P, A, R, [0, TOPO_HOMEM * K]), rx: 11, ry: 3.2, t0: 54, nm: "T3_Aureola" }));
  layers.push(ceu);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 90 }));
  return layers;
}

/** Corpo da águia (cabeça branca, bico curvo), de frente, com os pés em (0,0); as asas são outras camadas. */
function aguiaShapes() {
  return [
    lib.makeEllipse(5.4, -39.6, 1.2, 1.2, hex("#292F33"), "Olho"),
    fill([forma([[8, -41], [14, -39.4], [13.4, -34.6], [11, -36], [8, -37]])], "#FFAC33", "Bico"),
    lib.makeEllipseRing(2, -38, 7, 6.4, 0.8, hex("#CCD6DD"), "Contorno da cabeca"),
    lib.makeEllipse(2, -38, 7, 6.4, hex("#FFFFFF"), "Cabeca"),
    stroke([lib.polyline([[-5, -2], [-5, 2], [-7, 3]]), lib.polyline([[5, -2], [5, 2], [7, 3]]), lib.polyline([[-5, 2], [-3, 3]]), lib.polyline([[5, 2], [3, 3]])], 1.6, hex("#FFAC33"), "Garras"),
    fill([forma([[-6, -30], [6, -30], [8, -18], [0, -8], [-8, -18]])], "#8A5A33", "Peito"),
    fill([forma([[0, -34], [9, -28], [11, -14], [8, -4], [0, 0], [-8, -4], [-11, -14], [-9, -28]])], "#5C3A21", "Corpo"),
    fill([forma([[-7, -2], [7, -2], [9, 10], [0, 12], [-9, 10]])], "#4A2E1A", "Cauda"),
  ];
}
/** Asa de águia (marrom, penas abertas nas pontas), com a raiz em (0,0), abrindo para a direita e para cima. */
function asaDeAguiaShapes() {
  const contorno = pontas(forma([[0, 0], [8, -14], [22, -24], [40, -28], [36, -22], [44, -20], [38, -14], [44, -10], [36, -7], [40, -2], [28, 0], [14, 4]]), [3, 5, 7, 9]);
  return [
    stroke([lib.polyline([[6, -6], [20, -14], [34, -20]]), lib.polyline([[8, -1], [22, -6], [34, -9]])], 1, hex("#8A5A33"), "Penas"),
    fill([contorno], "#6B4423", "Asa"),
  ];
}
/** Pés da águia no fim (sobre o livro aberto). */
const AGUIA = [100, 138];

/** São João Evangelista: a águia abre as asas e pousa sobre o livro aberto. */
function gestoJoaoEvangelista(t, c) {
  const pousa = [[0, add(AGUIA, [10, -40])], [2, add(AGUIA, [10, -40]), "out"], [24, AGUIA]];
  const aguia = L("G_Aguia", aguiaShapes(), { p: anim(pousa), o: anim(aparecer(0, 6)) });
  const asa = (nm, lado) => L(nm, lado > 0 ? asaDeAguiaShapes() : espelhar(asaDeAguiaShapes()), {
    p: anim(deslocar(pousa, [lado * 7, -26])),
    r: anim([[0, lado * -20], [6, lado * 30, "ease"], [12, lado * -20, "ease"], [18, lado * 24, "ease"], [26, 0], ...onda(0, lado * -4, 30, END, { period: 26 })]),
    o: anim(aparecer(0, 6)),
  });
  const livro = L("G_Livro", livroAbertoShapes(64, 30, "#3B88C3"), { p: [100, 150], s: anim([[0, [4, 100]], ...abrir(0, 14, { axis: "x", from: 4 })]), o: anim(aparecer(0, 3)) });
  const layers = [aguia, asa("G_AsaD", 1), asa("G_AsaE", -1), livro];
  if (t >= 2) {
    layers.unshift(L("T2_Calice", [
      lib.makeEllipse(-1.4, -27.4, 0.6, 0.6, hex("#292F33"), "Olho da serpente"),
      stroke([lib.polyline([[-2, -16], [3, -20], [-1, -24], [-2, -27]])], 2, hex("#5C913B"), "Serpente"),
      lib.makeEllipse(0, -14, 9, 2.4, hex("#8899A6"), "Boca do calice"),
      fill([forma([[-9, -14], [9, -14], [7, -6], [2, -2], [-2, -2], [-7, -6]])], "#CCD6DD", "Copa"),
      fill([rect(-1.4, -2, 1.4, 10)], "#AAB8C2", "Haste"),
      fill([forma([[-8, 14], [-4, 9], [4, 9], [8, 14]])], "#AAB8C2", "Pe"),
    ], { p: [36, 156], s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  if (t >= 3) layers.push(aureola({ center: add(AGUIA, [2, -50]), rx: 10, ry: 3, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 96 }));
  return layers;
}

/** Os três inocentes: [x, y do rosto no fim, quadro em que começam a subir, cor do cabelo]. */
const INOCENTES = [[56, 98, 0, "#FFCC4D"], [100, 84, 6, "#8A4633"], [144, 98, 12, "#C1694F"]];
const K_BEBE = 0.42;
/** Subida de um inocente: de baixo até o lugar, e depois flutua. */
const subidaBebe = ([x, y, t0]) => [[0, [x, y + 36]], [t0, [x, y + 36], "out"], [t0 + 24, [x, y]], ...flutuar([x, y], t0 + 24, 1.5)];

/** Santos Inocentes: pequenos inocentes (bustos de bebê, como anjinhos) sobem com palmas nas mãos. */
function gestoInocentes(t, c) {
  const K = K_BEBE;
  // a mão segura a palma na frente; o talo e as folhas ficam atrás do corpo, ao lado da cabeça
  const bebe = (cabelo) => [
    lib.makeEllipse(9, 34 * K, 3, 2.6, hex(PELE), "Mao"),
    ...naFrenteDe(busto(K, { veste: "#FFFFFF", cabelo: "curto", corCabelo: cabelo }), "Veste", [contornoOmbros(K)]),
    ...transladar(palmaShapes(26), [12, 52 * K]),
    ...transladar(parDeAsas(18), [0, 12]),
  ];
  const layers = INOCENTES.map((b, k) => L(`G_Bebe${k + 1}`, bebe(b[3]), { p: anim(subidaBebe(b)), o: anim(aparecer(b[2], 8)) }));
  if (t >= 2) {
    const coroinha = Array.from({ length: 6 }, (_, k) => {
      const a = Math.PI + (k / 5) * Math.PI;
      return lib.makeEllipse(8 * Math.cos(a), -16 * K + 2.6 * Math.sin(a), 1.8, 1.8, hex(k % 2 ? "#FFFFFF" : "#F4ABBA"), `Flor${k}`);
    });
    // cada coroinha é desenhada na cabeça do seu inocente; o grupo acompanha a subida dele (deslocamento que termina em zero)
    const segue = (b) => anim(subidaBebe(b).map(([tt, v, e]) => [tt, [v[0] - b[0], v[1] - b[1]], e]));
    layers.unshift(L("T2_Coroinhas", INOCENTES.map((b, k) => grupoAnimado(`Coroinha${k + 1}`, transladar([...coroinha, lib.makeEllipseRing(0, -16 * K, 8, 2.6, 1.2, hex("#77B255"), "Ramo")], [b[0], b[1]]), { p: segue(b) })), {
      p: [0, 0], o: anim(aparecer(40, 8)),
    }));
  }
  if (t >= 3) layers.unshift(coroaDesce("T3_Coroa", 24, [100, 58], 48));
  // no ouro, cada inocente ganha a auréola, que acompanha a cabeça dele
  if (t >= 3) INOCENTES.forEach((b, k) => layers.push(aureola({ p: anim(deslocar(subidaBebe(b), [0, -22 * K])), rx: 7, ry: 2, t0: 54 + k * 2, nm: `T3_Aureola${k + 1}` })));
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 100 }));
  return layers;
}


// ── Tabela do lote 5 ─────────────────────────────────────────────────────────
const TROPHIES = [
  { id: "lt_teresinha",       kind: "liturgical", icon: "desenho-teresinha-e-rosas",   color: "branco", gesture: gestoTeresinha, halo: haloNa(TERESINHA, [0, TOPO_MANTO * TERESINHA.K], { rx: 12, ry: 3.5, t0: 30 }), symbol: "Teresinha abraça o crucifixo de rosas" },
  { id: "lt_anjos_guarda",    kind: "liturgical", icon: "desenho-anjo-da-guarda",      color: "branco", gesture: gestoAnjosGuarda, halo: { center: [ANJO.F[0], ANJO.F[1] + TOPO_CABELO * ANJO.K], rx: 9, ry: 2.6, t0: 40 }, symbol: "o anjo da guarda e a criança" },
  { id: "lt_francisco_assis", kind: "liturgical", icon: "desenho-francisco-e-passaros", color: "branco", gesture: gestoFrancisco, halo: { center: [FRANCISCO.F[0], FRANCISCO.F[1] + TOPO_HOMEM * FRANCISCO.K], rx: 9, ry: 2.6, t0: 40 }, symbol: "Francisco e os passarinhos" },
  { id: "lt_rosario",         kind: "liturgical", icon: "desenho-terco-que-acende",     color: "branco", gesture: gestoRosario, symbol: "o terço que acende dezena por dezena" },
  { id: "lt_aparecida",       kind: "liturgical", icon: "desenho-imagem-de-aparecida",  color: "branco", gesture: gestoAparecida, symbol: "a imagem de Aparecida na rede" },
  { id: "lt_teresa_avila",    kind: "liturgical", icon: "desenho-castelo-interior",     color: "branco", gesture: gestoTeresaAvila, symbol: "o castelo de cristal que acende" },
  { id: "lt_lucas",           kind: "liturgical", icon: "desenho-touro-alado",          color: "vermelho", gesture: gestoLucas, symbol: "o touro alado e o Evangelho" },
  { id: "lt_joao_paulo_ii",   kind: "liturgical", icon: "desenho-papa-e-ferula",        color: "branco", gesture: gestoJoaoPaulo, symbol: "o Papa ergue a férula e abençoa" },
  { id: "lt_simao_judas",     kind: "liturgical", icon: "desenho-simao-e-judas",        color: "vermelho", gesture: gestoSimaoJudas, symbol: "Simão e Judas Tadeu com a chama" },
  { id: "lt_todos_santos",    kind: "liturgical", icon: "desenho-multidao-de-santos",   color: "branco", gesture: gestoTodosSantos, symbol: "a multidão de santos e as auréolas" },
  { id: "lt_fieis_defuntos",  kind: "liturgical", icon: "desenho-maos-e-crisantemos",   color: "roxo",   gesture: gestoFieisDefuntos, symbol: "mãos postas e crisântemos brancos" },
  { id: "lt_martinho_porres", kind: "liturgical", icon: "desenho-cao-gato-e-rato",      color: "branco", gesture: gestoMartinhoPorres, symbol: "cão, gato e rato no mesmo prato" },
  { id: "lt_carlos_borromeu", kind: "liturgical", icon: "desenho-humilitas",            color: "branco", gesture: gestoCarlos, symbol: "São Carlos e o lema HUMILITAS" },
  { id: "lt_basilica_laterao", kind: "liturgical", icon: "desenho-fachada-de-latrao",   color: "branco", gesture: gestoLaterao, symbol: "a fachada de Latrão se ergue" },
  { id: "lt_martinho_tours",  kind: "liturgical", icon: "desenho-capa-partida",         color: "branco", gesture: gestoMartinhoTours, symbol: "Martinho parte a capa com o mendigo" },
  { id: "lt_isabel_hungria",  kind: "liturgical", icon: "desenho-paes-em-rosas",        color: "branco", gesture: gestoIsabel, symbol: "os pães que viram rosas" },
  { id: "lt_apresentacao_maria", kind: "liturgical", icon: "desenho-menina-no-templo",  color: "branco", gesture: gestoApresentacaoMaria, halo: { center: [MENINA.FIM[0], MENINA.FIM[1] - 108 * MENINA.K + TOPO_MANTO * MENINA.K], rx: 10, ry: 2.8, t0: 50 }, symbol: "a menina Maria sobe os degraus do Templo" },
  { id: "lt_cecilia",         kind: "liturgical", icon: "desenho-orgao-de-cecilia",     color: "vermelho", gesture: gestoCecilia, halo: { center: [CECILIA.F[0], CECILIA.F[1] - 26 * CECILIA.K], rx: 11, ry: 3.2, t0: 30 }, symbol: "Cecília toca o órgão" },
  { id: "lt_nsa_gracas",      kind: "liturgical", icon: "desenho-maria-das-gracas",     color: "branco", gesture: gestoGracas, symbol: "Maria sobre o globo, com os raios das mãos" },
  { id: "lt_cristo_rei",      kind: "liturgical", icon: "desenho-cristo-no-trono",      color: "branco", gesture: gestoCristoRei, symbol: "Cristo Rei diante do trono" },
  { id: "lt_andre",           kind: "liturgical", icon: "desenho-cruz-em-x",            color: "vermelho", gesture: gestoAndre, symbol: "a cruz em X se ergue" },
  { id: "lt_advento",         kind: "liturgical", icon: "desenho-coroa-do-advento",     color: "roxo",   gesture: gestoAdvento, symbol: "a coroa de Advento e as velas" },
  { id: "lt_francisco_xavier", kind: "liturgical", icon: "desenho-caranguejo-e-crucifixo", color: "branco", gesture: gestoFranciscoXavier, symbol: "o caranguejo com o crucifixo" },
  { id: "lt_nicolau",         kind: "liturgical", icon: "desenho-tres-bolsinhas",       color: "branco", gesture: gestoNicolau, symbol: "três bolsinhas fechadas na janela" },
  { id: "lt_ambrosio",        kind: "liturgical", icon: "desenho-abelha-nos-labios",    color: "branco", gesture: gestoAmbrosio, symbol: "Ambrósio prega e a abelha pousa" },
  { id: "lt_imaculada",       kind: "liturgical", icon: "desenho-imaculada",            color: "branco", gesture: gestoImaculada, symbol: "Maria sobre a lua pisa a serpente" },
  { id: "lt_luzia",           kind: "liturgical", icon: "desenho-luzia-e-pratinho",     color: "vermelho", gesture: gestoLuzia, symbol: "Luzia ergue o pratinho" },
  { id: "lt_joao_cruz",       kind: "liturgical", icon: "desenho-chama-no-carmelo",     color: "branco", gesture: gestoJoaoCruz, symbol: "a chama viva no alto do Carmelo" },
  { id: "lt_natal",           kind: "liturgical", icon: "desenho-presepio",             color: "branco", gesture: gestoNatal, halo: { center: add(MENINO, [0, -10]), rx: 7, ry: 2, t0: 30 }, symbol: "o Menino na manjedoura, Maria e José" },
  { id: "lt_estevao",         kind: "liturgical", icon: "desenho-estevao",              color: "vermelho", gesture: gestoEstevao, symbol: "Estêvão olha o céu aberto" },
  { id: "lt_joao_evangelista", kind: "liturgical", icon: "desenho-aguia-sobre-livro",   color: "branco", gesture: gestoJoaoEvangelista, symbol: "a águia pousa sobre o livro" },
  { id: "lt_santos_inocentes", kind: "liturgical", icon: "desenho-inocentes",           color: "vermelho", gesture: gestoInocentes, symbol: "os inocentes sobem com palmas" },
];

/** Litúrgicos sem auréola de base, com o motivo (os demais santos têm `halo`). */
const SEM_HALO = {
  lt_rosario: "auréola só no ouro (a coroa de rosas brancas em volta de Maria)",
  lt_aparecida: "auréola só no ouro (a coroa dourada sobre a imagem)",
  lt_teresa_avila: "auréola só no ouro (Teresa aparece na prata)",
  lt_lucas: "auréola só no ouro",
  lt_joao_paulo_ii: "auréola só no ouro",
  lt_simao_judas: "auréola só no ouro (as coroas de mártir)",
  lt_todos_santos: "festa sem santo (as auréolas da multidão fazem parte do gesto)",
  lt_fieis_defuntos: "festa sem santo",
  lt_martinho_porres: "auréola só no ouro (Martinho aparece na prata)",
  lt_carlos_borromeu: "auréola só no ouro",
  lt_basilica_laterao: "festa sem santo",
  lt_martinho_tours: "auréola só no ouro",
  lt_isabel_hungria: "auréola só no ouro",
  lt_nsa_gracas: "auréola só no ouro",
  lt_cristo_rei: "festa sem santo (Cristo Rei, com a coroa)",
  lt_andre: "sem pessoa no desenho (a cruz em X, a rede e a coroa de mártir)",
  lt_advento: "festa sem santo",
  lt_francisco_xavier: "auréola só no ouro",
  lt_nicolau: "auréola só no ouro",
  lt_ambrosio: "auréola só no ouro",
  lt_imaculada: "auréola só no ouro (a coroa de 12 estrelas em volta da cabeça de Maria)",
  lt_luzia: "auréola só no ouro (a coroa de mártir)",
  lt_joao_cruz: "sem pessoa no desenho (a chama, o monte e o crucifixo)",
  lt_estevao: "auréola só no ouro (a coroa de mártir, Stephanos)",
  lt_joao_evangelista: "auréola só no ouro",
  lt_santos_inocentes: "auréola só no ouro (a coroa de mártir)",
};

module.exports = { ICONS, DRAWN, TROPHIES, SEM_HALO, TIERS: kit.TIERS, LITURGICAL_COLORS: kit.LITURGICAL_COLORS, buildTrophy, checkUniqueIcons, checkUniqueIds, naPose };

if (require.main === module) main(TROPHIES, { self: __filename });
