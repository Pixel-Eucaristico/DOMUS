#!/usr/bin/env node
/**
 * trophy-lot-4.js — Story 11.7, lote 4 de Lottie dos troféus sem animação.
 *
 * Lote 4: os 24 litúrgicos de agosto e setembro (`month` 8 e 9 em
 * `packages/gamification/src/liturgicalTrophies/data.ts`). Todos com 3 níveis
 * (como `getSeasonalTier`): x.json = bronze, x_t2 = prata, x_t3 = ouro.
 *
 * Segue `_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md`:
 * cada troféu tem o gesto da tabela da §7, feito de 2 a 4 peças animadas em
 * camadas separadas (nome `G_*`), sem medalha nem disco em volta. A prata
 * acrescenta o que a tabela diz (camadas `T2_*`) e o ouro, o resto (`T3_*`).
 * Regras das §6 e §7: a luz usa só a `luzSuave` (sem esticar); pessoa fazendo
 * algo é a figura de corpo inteiro (`figura`) ou o busto (`busto`), com a pele
 * comum `PELE`; Maria grande e visível; nada que lembre jogo ou aposta; terço e
 * objetos católicos desenhados; peça principal nunca repetida entre troféus.
 * Mesmo formato, `ART_SCALE`, janela visível, base comum e quadro final dos
 * lotes 1 a 3 (montagem comum em `scripts/lottie-lib/trophy-kit.js`).
 *
 * Fontes das peças: o lote não traz peça nova; as que usa (lírio 269c e pão
 * 1f35e, nenhuma delas peça principal de troféu) vêm da tabela
 * comum `scripts/lottie-lib/icons.js` (REUSED), copiadas de:
 *  - Twemoji (https://github.com/jdecked/twemoji, v15.1.0), licença CC-BY 4.0
 *    — © Twitter, Inc. e colaboradores.
 *  - Bootstrap Icons (https://github.com/twbs/icons, v1.11.3), licença MIT
 *    — © The Bootstrap Authors (nenhuma peça usada neste lote).
 *
 * Peças principais desenhadas (tabela DRAWN), compostas de formas próprias,
 * feitas aqui mesmo ou em `scripts/lottie-lib/desenhos.js`; quando o desenho
 * também embrulha peças da tabela acima (com a fonte citada), ele as lista em
 * `uses`, e nenhuma delas é a peça principal de outro troféu:
 * desenho-confessionario, desenho-transfiguracao, desenho-cao-com-tocha,
 * desenho-grelha, desenho-clara-e-custodia, desenho-duas-coroas,
 * desenho-assuncao, desenho-colmeia, desenho-maria-rainha,
 * desenho-evangelho-e-faca, desenho-monica-em-oracao, desenho-coracao-e-seta,
 * desenho-bandeja-e-palma, desenho-papa-e-pomba, desenho-berco-e-estrela,
 * desenho-correntes-partidas, desenho-cruz-gloriosa, desenho-sete-espadas,
 * desenho-anjo-sobre-livro, desenho-padre-pio, desenho-medicos,
 * desenho-vicente-e-crianca, desenho-tres-arcanjos e desenho-leao-e-vulgata.
 * Todas as desenhadas: figuras de corpo inteiro (`figura`: Jesus na
 * Transfiguração, Moisés e Elias, Maria na Assunção); bustos (`busto`: o Cura
 * d'Ars, Santa Clara, os anjinhos, Maria Rainha, Santa Mônica, São Gregório,
 * Sant'Ana, o anjo de São Mateus, Padre Pio, Cosme e Damião, São Vicente e a
 * criança); estola, mãos, mangas, véu, mozeta, tiara, colarinho, capuz e
 * luvas; confessionário e grade; monte, colina (`Colina`) e nuvens
 * (`nuvemShapes`); cão com a tocha (`caoShapes`); grelha (`grelhaShapes`),
 * carvão e brasas; custódia (`custodiaShapes`); coroas (`coroaShapes`, também
 * a de mártir do ouro); estrelas (`estrelaShapes`, também a da fronte de São
 * Domingos e as do ouro); colmeia e abelhas (`colmeiaShapes`,
 * `abelhaShapes`); cetro (`cetroShapes`); livros (`livroAbertoShapes`,
 * `livroFechadoShapes`, `evangelhoShapes`); faca (`facaShapes`); coração
 * (`coracaoShapes`); seta (`setaShapes`); mitra (`mitraShapes`); lágrimas
 * (`lagrimaShapes`); bandeja (`bandejaShapes`); palma do martírio
 * (`palmaShapes`, em todos os níveis); cordeiro (`cordeiroShapes`); pomba
 * (`pombaShapes`); partitura; berço (`bercoShapes`); correntes e argolas
 * (`correnteShapes`); cruz de madeira (`cruzShapes`); cruz gloriosa
 * (`cruzGloriosaShapes`); coroa de louros; espadas (`espadaShapes`,
 * `espadaMiguelShapes`); asas (`asaShapes`); moedas; caixa de remédios
 * (`caixaShapes`), almofariz e pilão; escudo; peixe (`peixeShapes`); leão
 * (`leaoShapes`) e o rabo; estante; chapéu de cardeal (`galeroShapes`); o terço
 * católico (`tercoShapes`) e as chamas (`chamaShapes`).
 *
 * Uso: node scripts/trophy-lot-4.js
 * Recusa (e não escreve) qualquer id que já esteja em APPROVED_LOTTIE.
 */
const lib = require("./lottie-lib");
const kit = require("./lottie-lib/trophy-kit");
const { ICONS: SHARED_ICONS } = require("./lottie-lib/icons");
const {
  rect, forma, poligono, fill, hostiaShapes, brilho, chuva, petala, PELE, busto, figura,
  chamaShapes, livroAbertoShapes, tercoShapes, espelhar, transladar,
  coroaShapes, palmaShapes, estrelaShapes, asaShapes, coracaoShapes, lagrimaShapes, galeroShapes, pombaShapes,
} = require("./lottie-lib/desenhos");
const { anim, pulo, abrir, onda, aparecer, pop, pulsar, giro, hex } = lib;
const { END, L, add, flutuar, deslocar, stroke, reta, aureola, raios } = kit;

// ── Peças (todas da tabela comum, mesma fonte e licença) ─────────────────────
/** Peças da tabela comum (lottie-lib/icons.js) usadas aqui. */
const REUSED = ["twemoji-269c", "twemoji-1f35e"];

const ICONS = {};
for (const key of REUSED) {
  if (!SHARED_ICONS[key]) throw new Error(`Peça não encontrada na tabela comum: ${key}`);
  ICONS[key] = SHARED_ICONS[key];
}

/** Peças principais desenhadas no próprio gerador (sem fonte externa; ver o cabeçalho). */
const DRAWN = {
  "desenho-confessionario": { desc: "o Cura d'Ars (busto de homem: cabelo curto, colarinho romano, ombros largos de batina preta e estola roxa) inclinado para a grade do confessionário", uses: [] },
  "desenho-transfiguracao": { desc: "Jesus (corpo inteiro) sobre o monte, com a túnica que fica branca e brilhante", uses: [] },
  "desenho-cao-com-tocha": { desc: "cachorrinho cor de mel (focinho comprido, orelha caída, rabo levantado) que corre com a tocha acesa na boca", uses: [] },
  "desenho-grelha": { desc: "grelha de São Lourenço sobre as brasas", uses: [] },
  "desenho-clara-e-custodia": { desc: "Santa Clara (busto, hábito marrom e véu) erguendo a custódia", uses: [] },
  "desenho-duas-coroas": { desc: "as duas coroas de São Maximiliano Kolbe, a branca e a vermelha", uses: [] },
  "desenho-assuncao": { desc: "Maria (corpo inteiro, manto azul e branco) subindo entre nuvens desenhadas", uses: [] },
  "desenho-colmeia": { desc: "colmeia tradicional de palha (cúpula de rolos empilhados, entradinha no pé) e abelhas saindo e voando (o Doutor Melífluo)", uses: [] },
  "desenho-maria-rainha": { desc: "Maria (busto, manto azul) e a coroa desenhada que desce", uses: [] },
  "desenho-evangelho-e-faca": { desc: "livro do Evangelho de capa vermelha e a faca do martírio", uses: [] },
  "desenho-monica-em-oracao": { desc: "Santa Mônica (busto, véu escuro, mãos postas) e as lágrimas", uses: [] },
  "desenho-coracao-e-seta": { desc: "coração desenhado em chamas, atravessado pela seta", uses: [] },
  "desenho-bandeja-e-palma": { desc: "bandeja de prata com a palma de mártir desenhada (sem cabeça)", uses: [] },
  "desenho-papa-e-pomba": { desc: "São Gregório (busto, tiara) e a pomba desenhada pousada no ombro", uses: [] },
  "desenho-berco-e-estrela": { desc: "berço que balança e a estrela desenhada que acende", uses: [] },
  "desenho-correntes-partidas": { desc: "correntes que se partem no meio e caem", uses: [] },
  "desenho-cruz-gloriosa": { desc: "cruz dourada que se ergue sobre a colina e brilha", uses: [] },
  "desenho-sete-espadas": { desc: "coração de Maria com as sete espadas", uses: [] },
  "desenho-anjo-sobre-livro": { desc: "anjo (busto com asas desenhadas) sobre o livro aberto", uses: [] },
  "desenho-padre-pio": { desc: "Padre Pio (busto, hábito marrom, barba) erguendo as mãos com as luvas", uses: [] },
  "desenho-medicos": { desc: "Cosme e Damião (dois bustos), a caixa de remédios e o almofariz", uses: [] },
  "desenho-vicente-e-crianca": { desc: "São Vicente de Paulo (busto) acolhendo uma criança", uses: [] },
  "desenho-tres-arcanjos": { desc: "três pares de asas: a espada de Miguel, o lírio (Twemoji 269c) de Gabriel e o peixe de Rafael", uses: ["twemoji-269c"] },
  "desenho-leao-e-vulgata": { desc: "o leão deitado ao lado do livro aberto da Vulgata", uses: [] },
};

const { piece, pt, buildTrophy, checkUniqueIcons, checkUniqueIds, main } = kit.makeLot(ICONS, { DRAWN });

// ── Ajudas do lote ───────────────────────────────────────────────────────────
/**
 * Palma do martírio desenhada (`palmaShapes`), de altura `h`, com o pé em
 * `base`. Nenhum nível usa a palma do Twemoji 1f33f, que é a peça principal de
 * Santas Perpétua e Felicidade (lote 2).
 */
function palmaEmPe(nm, h, base, ks = {}) {
  return L(nm, palmaShapes(h), { p: base, ...ks });
}
/** Cordeiro desenhado, centrado em (0,0), olhando para a direita, com os cascos em y = 12 (no lugar do Twemoji 1f411, peça principal de Santa Inês). */
function cordeiroShapes() {
  return [
    lib.makeEllipse(13.4, -7, 0.9, 0.9, hex("#292F33"), "Olho"),
    fill([forma([[8, -10], [5, -13], [4, -9], [7, -7]])], "#CCD6DD", "Orelha"),
    lib.makeEllipse(11, -6, 5, 4.2, hex("#E1E8ED"), "Cabeca"),
    lib.makeEllipse(-6, -2, 7, 6, hex("#FFFFFF"), "La1"),
    lib.makeEllipse(2, -3, 7, 6.5, hex("#FFFFFF"), "La2"),
    lib.makeEllipse(-1, 2, 10, 5, hex("#F5F8FA"), "La3"),
    lib.makeEllipse(-13, -3, 2.6, 2.6, hex("#F5F8FA"), "Rabo"),
    stroke([reta([[-7, 5], [-7, 12]]), reta([[-2, 5], [-2, 12]]), reta([[4, 5], [4, 12]]), reta([[8, 4], [8, 12]])], 2.4, hex("#66757F"), "Pernas"),
  ];
}
/** Lírio branco (Twemoji 269c recolorido), com o pé em `base`. */
const LIRIO = "twemoji-269c";
const LIRIO_BRANCO = { "#744EAA": "#77B255", "#AA8DD8": "#FFFFFF", "#9266CC": "#FFCC4D" };
/** Chama desenhada (`chamaShapes`) de altura `size`, com o pé em `base`, crescendo em t0 e tremulando. */
function chama(nm, size, base, t0, { period = 10, amp = 8 } = {}) {
  return L(nm, chamaShapes(size), {
    a: [0, 0], p: base,
    s: anim([[0, [0, 0]], [t0, [0, 0], "out"], [t0 + 10, [100, 112]], [t0 + 14, [100, 100]], ...onda([100, 100], amp, t0 + 14, END, { period, axis: 1 })]),
    o: anim(aparecer(t0, 3)),
  });
}
/** Auréola e raios do ouro, em volta de `center`. */
function aureolaERaios(center, { rx = 18, ry = 5, t0 = 52, r1 = 22, r2 = 32 } = {}) {
  return [aureola({ center, rx, ry, t0, nm: "T3_Aureola" }), raios("T3_Raios", center, { r1, r2, t0: t0 + 4 })];
}
/** Luz do ouro (sempre a `luzSuave`, sem esticar), na cor litúrgica. */
const luzDoOuro = (c, opts = {}) => lib.luzSuave(0, c.col.luz, { nm: "T3_Luz", top: 24, bottom: 150, w0: 12, w1: 80, t0: 40, peak: 28, ...opts });
/** Altura da auréola num busto de manto (com k = 1): logo acima do alto do capuz (y −29). */
const BUSTO_MANTO_TOPO = -32;
/** Ponto `xy` do desenho de uma camada na pose (posição `p`, âncora `a`, rotação `r` em graus). */
function naPose(p, a, r, [x, y]) {
  const ang = (r * Math.PI) / 180, lx = x - a[0], ly = y - a[1];
  return [p[0] + lx * Math.cos(ang) - ly * Math.sin(ang), p[1] + lx * Math.sin(ang) + ly * Math.cos(ang)];
}
/** Põe os grupos `extra` logo atrás do grupo de nome `nm` (para encaixar véu, mozeta etc. num busto). */
function atrasDe(groups, nm, extra) {
  const k = groups.findIndex((g) => g.nm === nm);
  if (k < 0) throw new Error(`atrasDe: grupo ${nm} não encontrado`);
  return [...groups.slice(0, k + 1), ...extra, ...groups.slice(k + 1)];
}
/** Terço pendurado que balança, aparecendo em `t0` (o terço católico desenhado). */
function terco(nm, p, t0, cores) {
  return L(nm, tercoShapes(cores), { p, r: anim([[0, 0], ...onda(0, 5, t0 + 4, END, { period: 30 })]), o: anim(aparecer(t0, 8)) });
}
/** Livro fechado deitado, centrado em (0,0), 68 × 18 px: capa, lombada e o miolo das folhas. */
function livroFechadoShapes(capa = "#7A2E1E", lombada = "#5C1E14") {
  return [
    stroke([reta([[-28, -2], [30, -2]]), reta([[-28, 2], [30, 2]])], 0.8, hex("#E1C38F"), "Folhas"),
    fill([rect(-32, -9, 32, -6), rect(-32, 6, 32, 9)], capa, "Capa"),
    fill([rect(-30, -6, 31, 6)], "#FFE8B6", "Miolo"),
    fill([rect(-34, -9, -30, 9)], lombada, "Lombada"),
  ];
}
/** Mitra branca de bispo com faixas douradas, centrada em (0,0). */
function mitraShapes() {
  return [
    stroke([reta([[0, -18], [0, 12]]), reta([[-12, 4], [12, 4]])], 2.4, hex("#FFCC4D"), "Faixas"),
    fill([forma([[-12, 12], [-12, -4], [-6, -14], [0, -20], [6, -14], [12, -4], [12, 12]])], "#F5F8FA", "Mitra"),
    fill([rect(-8, 12, -4, 22), rect(4, 12, 8, 22)], "#FFCC4D", "Fitas"),
  ];
}
/** Nuvem desenhada (bolas brancas sobre uma base reta), com o meio da base em (0,0) e largura `w`. */
function nuvemShapes(w, { cor = "#FFFFFF", sombra = "#E1E8ED" } = {}) {
  const u = w / 10;
  return [
    lib.makeEllipse(-1.6 * u, -2.6 * u, 2.4 * u, 2.2 * u, hex(cor), "Bola1"),
    lib.makeEllipse(1.6 * u, -3 * u, 2.8 * u, 2.6 * u, hex(cor), "Bola2"),
    lib.makeEllipse(-3.4 * u, -1.4 * u, 1.8 * u, 1.6 * u, hex(cor), "Bola3"),
    lib.makeEllipse(3.6 * u, -1.4 * u, 1.6 * u, 1.5 * u, hex(cor), "Bola4"),
    fill([forma([[-5 * u, 0], [-4.4 * u, -1.2 * u], [4.4 * u, -1.2 * u], [5 * u, 0]])], sombra, "Base"),
  ];
}
/** Cruz de madeira simples, com o pé em (0,0), altura `h`. */
function cruzShapes(h, { cor = "#A0522D", luz = "#D99E82" } = {}) {
  const w = h * 0.1, braco = h * 0.32, y = -h * 0.72;
  return [
    stroke([reta([[-w * 0.15, -h + 3], [-w * 0.15, -2]])], Math.max(0.8, w * 0.22), hex(luz), "Veio"),
    fill([rect(-braco, y - w / 2, braco, y + w / 2)], cor, "Travessa"),
    fill([rect(-w / 2, -h, w / 2, 0)], cor, "Haste"),
  ];
}

// ── Gestos (tabela da §7 do guia) ────────────────────────────────────────────
// Cada gesto devolve as camadas da frente para trás. `t` = nível (1 bronze,
// 2 prata, 3 ouro); `c.col` = cor litúrgica.

/**
 * Busto de padre homem (o Cura d'Ars), a partir do `busto` comum (mesmo rosto,
 * olhos, boca e pele): cabelo curto rente, só no alto da cabeça, com a linha
 * da testa e as orelhas à mostra; sobrancelhas; sem o rubor das bochechas;
 * ombros largos e retos de batina preta, com o colarinho romano (gola alta
 * preta e a tira branca) e a fileira de botões. Rosto em (0,0), escala `k`;
 * vai de y −17 a 70 e de x −42 a 42 (vezes k). Grupos da frente para trás.
 */
function padreShapes(k) {
  const P_ = (pts) => pts.map(([x, y]) => [x * k, y * k]);
  const BATINA = "#292F33", CABELO = "#4A2E1A";
  const base = busto(k, { veste: BATINA, cabelo: "curto", corCabelo: CABELO });
  const so = (nm) => base.find((g) => g.nm === nm);
  const botoes = [24, 32, 40, 48, 56, 64].map((y) => lib.makeEllipse(0, y * k, 1.1 * k, 1.1 * k, hex("#66757F"), `Botao${y}`));
  return [
    stroke([lib.polyline(P_([[-8.5, -6.5], [-6, -7.5], [-3, -6.8]])), lib.polyline(P_([[3, -6.8], [6, -7.5], [8.5, -6.5]]))], 1.4 * k, hex(CABELO), "Sobrancelhas"),
    so("Olhos"), so("Boca"),
    // franja curta: o cabelo acaba na testa (y ≈ −8) e nas têmporas, sem descer pelo rosto
    fill([forma(P_([[-11.4, -3], [-11, -10], [-6, -14.6], [0, -15.4], [6, -14.6], [11, -10], [11.4, -3], [9.6, -7], [4, -9.6], [-3, -9.2], [-9.6, -7]]))], CABELO, "CabeloFrente"),
    so("Rosto"),
    lib.makeEllipse(-11 * k, 1 * k, 2.4 * k, 3.6 * k, hex(PELE), "OrelhaE"),
    lib.makeEllipse(11 * k, 1 * k, 2.4 * k, 3.6 * k, hex(PELE), "OrelhaD"),
    fill([rect(-1.8 * k, 13 * k, 1.8 * k, 17.5 * k)], "#FFFFFF", "Colarinho"),
    fill([rect(-6 * k, 12 * k, 6 * k, 19 * k)], BATINA, "Gola"),
    so("Pescoco"),
    ...botoes,
    stroke([reta(P_([[-26, 42], [-28, 70]])), reta(P_([[26, 42], [28, 70]]))], 1.2 * k, hex("#3B4148"), "Pregas"),
    // ombros largos e retos da batina (bem mais largos que o rosto)
    fill([poligono(P_([[0, 17], [16, 18.5], [30, 22], [37, 26], [40.5, 32], [42, 42], [42, 70], [-42, 70], [-42, 42], [-40.5, 32], [-37, 26], [-30, 22], [-16, 18.5]]))], BATINA, "Veste"),
    fill([forma(P_([[0, -17], [11, -13], [12.6, -4], [-12.6, -4], [-11, -13]]))], CABELO, "Cabelo"),
  ];
}

/** São João Maria Vianney: o padre (busto, batina preta e estola roxa) se inclina no confessionário e a grade acende. */
function gestoVianney(t, c) {
  const K = 0.72, F = [74, 92], A = [0, 70 * K], P = [F[0], F[1] + 70 * K], LEAN = 8;
  const P_ = (pts) => pts.map(([x, y]) => [x * K, y * K]);
  const estola = [
    fill([poligono(P_([[-11, 52], [-5, 52], [-6, 58], [-10, 58]])), poligono(P_([[5, 52], [11, 52], [10, 58], [6, 58]]))], "#FFCC4D", "Franja"),
    stroke([lib.polyline(P_([[-5, 17], [-8, 34], [-8, 52]])), lib.polyline(P_([[5, 17], [8, 34], [8, 52]]))], 5 * K, hex("#744EAA"), "Estola"),
  ];
  const padre = L("G_Padre", [...estola, ...padreShapes(K)], {
    a: A, p: P, r: anim([[0, 0], [10, 0, "ease"], [28, LEAN]]), o: anim(aparecer(0, 6)),
  });
  const JAN = [134, 72, 164, 114];
  const barras = [140, 146, 152, 158].map((x) => reta([[x, JAN[1]], [x, JAN[3]]]));
  const travessas = [80, 88, 96, 104].map((y) => reta([[JAN[0], y], [JAN[2], y]]));
  const grade = L("G_Grade", [
    stroke([...barras, ...travessas], 1.6, hex("#C1694F"), "Grade"),
    stroke([poligono([[JAN[0], JAN[1]], [JAN[2], JAN[1]], [JAN[2], JAN[3]], [JAN[0], JAN[3]]])], 3, hex("#8A4633"), "Moldura"),
  ], { a: [149, 93], p: [149, 93], s: anim([[0, 100], [18, 100, "out"], [26, 106], [32, 100]]), o: anim(aparecer(0, 6)) });
  const luz = brilho("G_Brilho", [149, 93], { rx: 13, ry: 19, color: "#FFE8A3", t0: 20, peak: 80, period: 20 });
  const cabine = L("Cabine", [
    fill([rect(JAN[0], JAN[1], JAN[2], JAN[3])], "#3B2416", "Janela"),
    fill([rect(122, 42, 176, 50)], "#8A4633", "Cornija"),
    fill([rect(126, 48, 172, 168)], "#A0522D", "Madeira"),
  ], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [];
  if (t >= 2) layers.push(terco("T2_Terco", [36, 94], 40));
  layers.push(padre, grade, luz, cabine);
  if (t >= 3) {
    const cabeca = naPose(P, A, LEAN, [0, -24 * K]);
    layers.push(aureola({ center: cabeca, rx: 11, ry: 3.2, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { x: 92, w1: 84, t0: 44 }));
  }
  return layers;
}

/** Transfiguração do Senhor: Jesus (figura) sobre o monte, a túnica fica branca e brilhante e a luz acende. */
function gestoTransfiguracao(t, c) {
  const K = 0.52, ROSTO = 130 - 106 * K;
  const sobe = [[0, [100, ROSTO]], [16, [100, ROSTO], "ease"], [36, [100, ROSTO - 5]], ...flutuar([100, ROSTO - 5], 36, 1)];
  const comum = { cabelo: "longo", corCabelo: "#8A4633", barba: "#8A4633", bracos: "mostrando" };
  const jesus = L("G_Jesus", figura(K, { ...comum, tunica: "#A0522D", faixa: "#3D6FB6" }), { p: anim(sobe), o: anim(aparecer(0, 6)) });
  const glorioso = L("G_Glorioso", figura(K, { ...comum, tunica: "#FFFFFF", faixa: "#FFE8A3" }), { p: anim(sobe), o: anim(aparecer(16, 16)) });
  const luz = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", top: 24, bottom: 136, w0: 16, w1: 92, t0: 18, peak: 32 });
  const monte = L("Monte", [
    fill([forma([[80, 140], [100, 128], [118, 136], [104, 142]])], "#AAB8C2", "Neve"),
    fill([forma([[22, 176], [52, 150], [80, 134], [100, 128], [122, 134], [150, 150], [178, 176]])], "#8899A6", "Monte"),
  ], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [glorioso, jesus];
  if (t >= 2) {
    const profeta = (x, tunica, cabelo) => transladar(figura(0.3, { tunica, cabelo: "longo", corCabelo: cabelo, barba: cabelo, bracos: "postas" }), [x, 150 - 106 * 0.3]);
    layers.push(L("T2_MoisesElias", [...profeta(50, "#3B88C3", "#E1E8ED"), ...profeta(150, "#8A4633", "#CCD6DD")], {
      p: anim([[0, [0, 4]], [40, [0, 4], "out"], [52, [0, 0]]]), o: anim(aparecer(40, 8)),
    }));
  }
  if (t >= 3) {
    // a nuvem luminosa fica atrás de Jesus e fora dele, em todos os quadros: uma acima da
    // cabeça (a base acaba antes do alto do cabelo, y ≈ 59,6) e duas dos lados, longe dos braços
    const nuvem = (w) => nuvemShapes(w, { cor: "#FFFFFF", sombra: "#FFE8A3" });
    layers.push(L("T3_Nuvem", nuvem(60), {
      p: anim([[0, [100, 51]], [46, [100, 51], "out"], [60, [100, 54]], ...flutuar([100, 54], 60, 1.5)]), o: anim(aparecer(46, 10, { to: 95 })),
    }));
    for (const [nm, x] of [["T3_NuvemE", 50], ["T3_NuvemD", 150]]) {
      layers.push(L(nm, nuvem(34), {
        p: anim([[0, [x, 92]], [50, [x, 92], "out"], [64, [x, 96]], ...flutuar([x, 96], 64, 1.5)]), o: anim(aparecer(50, 10, { to: 95 })),
      }));
    }
  }
  layers.push(monte);
  if (t >= 3) layers.push(raios("T3_Raios", [100, ROSTO + 20], { count: 16, r1: 34, r2: 50, half: 3, t0: 50, peak: 80 }));
  layers.push(luz);
  return layers;
}

/**
 * Cachorrinho (perdigueiro de pelo curto, cor de mel, sem manchas), olhando
 * para a direita, com a tocha na boca: focinho comprido com o nariz preto na
 * ponta, orelha comprida caída, coleira, peito fundo e barriga recolhida,
 * patas finas e o rabo levantado. O meio do corpo em (0,0), as patas em
 * y = 22 e a ponta da tocha em (44, −26).
 */
function caoShapes() {
  const PELO = "#D99A4E", SOMBRA = "#B87835", CLARO = "#F3D3A0";
  const pata = (pts, cor, nm) => stroke([lib.polyline(pts, { smooth: false })], 2.6, hex(cor), nm);
  return [
    lib.makeEllipse(37, -17.6, 1.9, 1.6, hex("#292F33"), "Nariz"),
    lib.makeEllipse(44, -25, 3.2, 2, hex("#F4900C"), "Copo"),
    stroke([reta([[29, -12], [44, -24]])], 3, hex("#8A4633"), "Tocha"),
    stroke([lib.polyline([[30, -14.4], [35, -15]])], 0.9, hex("#5C3A21"), "Boca"),
    lib.makeEllipse(23.4, -21.6, 1.3, 1.3, hex("#292F33"), "Olho"),
    fill([forma([[16, -24], [20.5, -25], [21, -18], [19, -11], [16.2, -9.6], [14.6, -14]])], "#8A4633", "Orelha"),
    fill([forma([[23, -22.6], [31, -20.4], [37.6, -19], [38, -16], [31, -13.6], [23, -14]])], CLARO, "Focinho"),
    lib.makeEllipse(20.5, -19, 6.6, 5.6, hex(PELO), "Cabeca"),
    fill([rect(10.4, -13, 17.4, -10.6)], "#BE1931", "Coleira"),
    fill([forma([[8, -6], [12, -14], [17, -17], [21, -14], [19, -6], [15, 2]])], PELO, "PescocoCao"),
    fill([forma([[6, -2], [14, -2], [15, 5], [9, 7]])], CLARO, "Peito"),
    pata([[13, 4], [14, 13], [14, 21.4], [16.4, 22]], PELO, "PataFrente"),
    pata([[-15, 2], [-18, 11], [-15, 21.4], [-12.6, 22]], PELO, "PataTras"),
    fill([forma([[-20, -5], [-13, -9], [2, -9.4], [12, -7], [16, -1], [13, 6], [4, 4.6], [-6, 3.6], [-15, 5], [-20, 1]])], PELO, "Corpo"),
    pata([[9, 4], [8, 13], [9, 21.4], [11.4, 22]], SOMBRA, "PataFrente2"),
    pata([[-11, 2], [-13, 11], [-10, 21.4], [-7.6, 22]], SOMBRA, "PataTras2"),
    stroke([lib.polyline([[-19, -4], [-25, -10], [-27, -18], [-25.4, -24]])], 2.8, hex(PELO), "Rabo"),
  ];
}

/** Fronte do cachorrinho (no desenho de `caoShapes`), onde fica a estrela do ouro. */
const CAO_FRONTE = [20, -22.6];

/** São Domingos de Gusmão: o cachorrinho com a tocha na boca corre e a tocha acende. */
function gestoDomingos(t, c) {
  const Y = 132, X0 = 50, X1 = 92, CORRE = 32;
  const corre = [];
  for (let k = 0; k <= 8; k++) corre.push([(k * CORRE) / 8, [X0 + ((X1 - X0) * k) / 8, Y - (k % 2 ? 4 : 0)], "linear"]);
  const passos = [...corre, ...flutuar([X1, Y], CORRE, 0.8, 20)];
  const cao = L("G_Cao", caoShapes(), { p: anim(passos), o: anim(aparecer(0, 6)) });
  const TOCHA = [44, -27];
  const fogo = L("G_Chama", chamaShapes(18), {
    p: anim(deslocar(passos, TOCHA)),
    s: anim([[0, [0, 0]], [22, [0, 0], "out"], [32, [100, 114]], [36, [100, 100]], ...onda([100, 100], 8, 36, END, { period: 10, axis: 1 })]),
    o: anim(aparecer(22, 3)),
  });
  const luz = brilho("G_Brilho", add([X1, Y], [TOCHA[0], TOCHA[1] - 9]), { rx: 13, ry: 14, color: "#FFE8A3", t0: 34, peak: 35, period: 12 });
  const chao = L("Chao", [fill([forma([[30, 158], [60, 154], [140, 154], [170, 158], [140, 160], [60, 160]])], "#8899A6", "Chao")], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [];
  // a estrela (desenhada) na fronte do cachorrinho, acompanhando o passo dele
  if (t >= 3) layers.push(L("T3_Estrela", estrelaShapes(4.4, { miolo: "#FFF1C1" }), {
    p: anim(deslocar(passos, CAO_FRONTE)), s: anim([[0, 0], ...pop(50, 10, { over: 130 }), ...pulsar(60, END, { amp: 10, period: 16 })]), o: anim(aparecer(50, 3)),
  }));
  layers.push(fogo, cao, luz);
  if (t >= 2) layers.push(terco("T2_Terco", [40, 52], 40));
  layers.push(chao);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** Grelha de São Lourenço, centrada em (0,0): moldura, barras, cabo e pés. */
function grelhaShapes() {
  return [
    lib.makeEllipseRing(56, -7, 3.2, 3.2, 2, hex("#66757F"), "Argola"),
    stroke([reta([[34, 0], [53, -6]])], 3, hex("#66757F"), "Cabo"),
    stroke([-24, -16, -8, 0, 8, 16, 24].map((x) => reta([[x, -16], [x, 16]])), 2.2, hex("#8899A6"), "Barras"),
    stroke([poligono([[-34, -16], [34, -16], [34, 16], [-34, 16]])], 3, hex("#66757F"), "Moldura"),
    stroke([reta([[-30, 16], [-33, 30]]), reta([[30, 16], [33, 30]])], 3, hex("#66757F"), "Pes"),
  ];
}

/** São Lourenço: a grelha aparece e as brasas acendem embaixo. */
function gestoLourenco(t, c) {
  const G = [96, 108];
  const grelha = L("G_Grelha", grelhaShapes(), { p: G, s: anim(pop(0, 14, { over: 108 })), o: anim(aparecer(0, 6)) });
  const pedras = [[72, 146, 7, 4], [86, 149, 8, 4.5], [101, 146, 8, 4.2], [115, 149, 8, 4.5], [128, 146, 6, 3.6], [94, 142, 6, 3.4], [110, 142, 6, 3.4]];
  const carvao = L("Carvao", pedras.map(([x, y, rx, ry], k) => lib.makeEllipse(x, y, rx, ry, hex(k % 2 ? "#3B2416" : "#292F33"), `Carvao${k}`)), {
    p: [0, 0], o: anim(aparecer(0, 6)),
  });
  const brasas = L("G_Brasas", pedras.map(([x, y, rx, ry], k) => lib.makeEllipse(x, y - 0.6, rx * 0.8, ry * 0.7, hex(k % 2 ? "#F4900C" : "#DD2E44"), `Brasa${k}`)), {
    p: [0, 0], o: anim([...aparecer(12, 14, { to: 95 }), ...onda(95, -25, 26, END, { period: 14 })]),
  });
  const chamas = L("G_Chamas", [[80, 144], [100, 143], [120, 144]].flatMap((b) => transladar(chamaShapes(14), b)), {
    a: [100, 144], p: [100, 144],
    s: anim([[0, [0, 0]], [22, [0, 0], "out"], [32, [100, 112]], [36, [100, 100]], ...onda([100, 100], 10, 36, END, { period: 9, axis: 1 })]),
    o: anim(aparecer(22, 3)),
  });
  const layers = [];
  // coroa de mártir desenhada (o Twemoji 1f451 é a peça principal de Maria Mãe de Deus)
  if (t >= 3) layers.push(L("T3_Coroa", coroaShapes(24), {
    p: anim([[0, [96, 42]], [48, [96, 42], "ease"], [62, [96, 58]], ...flutuar([96, 58], 62, 1.5)]), o: anim(aparecer(48, 8)),
  }));
  layers.push(grelha, chamas, brasas, carvao);
  if (t >= 2) layers.push(palmaEmPe("T2_Palma", 48, [146, 160], { s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  if (t >= 3) layers.push(luzDoOuro(c, { x: 96, bottom: 134, w1: 80, t0: 42 }));
  return layers;
}

/** Custódia pequena (de mão), com a luneta em (0,0) e o pé em y = 40. */
function custodiaShapes() {
  return [
    ...hostiaShapes(6.5),
    lib.makeEllipseRing(0, 0, 9, 9, 2.2, hex("#F4900C"), "Moldura"),
    lib.makeRays(16, 9, 20, 6, hex("#FFCC4D"), "RaiosDourados", [0, 0]),
    stroke([reta([[0, -20], [0, -27]]), reta([[-3.5, -24], [3.5, -24]])], 2, hex("#F4900C"), "Cruz"),
    lib.makeEllipse(0, 24, 3.6, 2.6, hex("#F4900C"), "No"),
    fill([rect(-1.6, 9, 1.6, 36)], "#FFAC33", "Haste"),
    fill([forma([[-11, 40], [-6, 34], [6, 34], [11, 40]])], "#F4900C", "Pe"),
  ];
}

/** Pose de Santa Clara: escala, rosto, âncora (base do busto), posição e a inclinação final. */
const CLARA = (() => { const K = 0.68, F = [72, 92]; return { K, F, A: [0, 75 * K], P: [F[0], F[1] + 75 * K], R: -3 }; })();

/** Santa Clara de Assis: Clara (busto, hábito marrom e véu) ergue a custódia. */
function gestoClara(t, c) {
  const { K, A, P } = CLARA;
  const P_ = (pts) => pts.map(([x, y]) => [x * K, y * K]);
  const veu = fill([forma(P_([[0, -27], [16, -21], [24, -5], [25, 18], [17, 26], [12, 6], [11, -6], [6, -13], [0, -15], [-6, -13], [-11, -6], [-12, 6], [-17, 26], [-25, 18], [-24, -5], [-16, -21]]))], "#292F33", "Veu");
  const clara = L("G_Clara", atrasDe(busto(K, { manto: "#7A4A2A", veste: "#F5F8FA" }), "Rosto", [veu]), {
    a: A, p: P, r: anim([[0, 0], [10, 0, "ease"], [30, CLARA.R]]), o: anim(aparecer(0, 6)),
  });
  const ALTO = [124, 82];
  const ergue = [[0, [124, 118]], [8, [124, 118], "ease"], [32, ALTO], ...flutuar(ALTO, 32, 1)];
  // as duas mãos seguram a haste, uma acima da outra, com o punho da manga vindo do lado de Clara
  const manga = (m) => stroke([reta([add(m, [-3, 1.6]), add(m, [-11, 6])])], 5.5, hex("#7A4A2A"), "Manga");
  const custodia = L("G_Custodia", [
    lib.makeEllipse(0.4, 17, 3.4, 2.8, hex(PELE), "Mao1"),
    lib.makeEllipse(0.4, 27, 3.4, 2.8, hex(PELE), "Mao2"),
    manga([0.4, 17]), manga([0.4, 27]),
    ...custodiaShapes(),
  ], { p: anim(ergue), o: anim(aparecer(4, 6)) });
  const luz = brilho("G_Brilho", ALTO, { rx: 14, ry: 14, color: "#FFF8D6", t0: 32, peak: 35, period: 20 });
  const layers = [custodia, luz, clara];
  if (t >= 2) layers.unshift(L("T2_Lirio", piece(LIRIO, 34, { recolor: LIRIO_BRANCO }), {
    a: pt(LIRIO, 34, [18, 36]), p: [160, 164], s: anim([[0, [100, 0]], ...abrir(40, 54, { axis: "y" })]), o: anim(aparecer(40, 4)),
  }));
  if (t >= 3) layers.push(raios("T3_Raios", ALTO, { count: 16, r1: 22, r2: 34, half: 3, t0: 50, peak: 80 }), luzDoOuro(c, { x: 110, w1: 84, t0: 44 }));
  return layers;
}

/** São Maximiliano Kolbe: as duas coroas (branca e vermelha) descem. */
function gestoKolbe(t, c) {
  const desce = (nm, shapes, x, t0, r1) => L(nm, shapes, {
    p: anim([[0, [x, 56]], [t0, [x, 56], "in"], [t0 + 22, [x, 112], "out"], [t0 + 26, [x, 109]], [t0 + 30, [x, 112]], ...flutuar([x, 112], t0 + 30, 1.5)]),
    r: anim([[0, r1], [t0, r1, "ease"], [t0 + 22, 0]]), o: anim(aparecer(t0, 6)),
  });
  const branca = desce("G_CoroaBranca", coroaShapes(34, { cor: "#F5F8FA", faixa: "#CCD6DD", joia: "#FFCC4D", bola: "#FFFFFF" }), 74, 0, -14);
  const vermelha = desce("G_CoroaVermelha", coroaShapes(34, { cor: "#DD2E44", faixa: "#A0041E", joia: "#FFCC4D", bola: "#FFE8B6" }), 126, 8, 14);
  const layers = [branca, vermelha];
  if (t >= 2) layers.push(palmaEmPe("T2_Palma", 50, [100, 162], { s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  if (t >= 3) layers.push(aureola({ center: [100, 62], rx: 18, ry: 5, t0: 50, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 90, t0: 44 }));
  return layers;
}

/** Assunção de Nossa Senhora: Maria (figura, manto azul e branco) sobe entre nuvens com a luz. */
function gestoAssuncao(t, c) {
  const K = 0.56, FIM = [100, 66];
  const sobe = [[0, [100, 96]], [6, [100, 96], "in"], [46, FIM, "out"], ...flutuar(FIM, 46, 1.5)];
  const maria = L("G_Maria", [
    ...figura(K, { manto: "#3D6FB6", tunica: "#F5F8FA", orla: "#FFCC4D", bracos: "abertos" }),
    ...transladar(nuvemShapes(46), [0, 108 * K + 8]),
  ], { p: anim(sobe), o: anim(aparecer(0, 8)) });
  const nuvens = L("G_Nuvens", [...transladar(nuvemShapes(38), [-44, 6]), ...transladar(nuvemShapes(38), [44, 6])], {
    p: anim([[0, [100, 112]], [6, [100, 112], "out"], [46, [100, 128]], ...onda([100, 128], 3, 46, END, { period: 40, axis: 0 })]),
    o: anim(aparecer(0, 10, { to: 95 })),
  });
  const luz = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", top: 24, bottom: 132, w0: 16, w1: 90, t0: 24, peak: 30 });
  const layers = [];
  if (t >= 3) {
    const estrelas = Array.from({ length: 12 }, (_, k) => {
      const a = Math.PI + (k / 11) * Math.PI;
      return transladar(estrelaShapes(3.4), [22 * Math.cos(a), 9 * Math.sin(a)]);
    }).flat();
    // a coroa de 12 estrelas é a auréola de Maria no ouro: acompanha a cabeça dela
    layers.push(L("T3_AureolaEstrelas", estrelas, {
      p: anim(deslocar(sobe, [0, -13])), s: anim([[0, 0], ...pop(50, 12, { over: 112 }), ...pulsar(62, END, { amp: 5, period: 20 })]), o: anim(aparecer(50, 4)),
    }));
  }
  layers.push(maria);
  if (t >= 2) {
    const anjo = (x) => [...transladar(busto(0.22, { veste: "#F5F8FA", cabelo: "curto", corCabelo: "#FFCC4D" }), [x, 0]),
      ...transladar(asaShapes(14), [x + 3, 8]), ...transladar(espelhar(asaShapes(14)), [x - 3, 8])];
    layers.push(L("T2_Anjos", [...anjo(-50), ...anjo(50)], { p: anim([[0, [100, 92]], [40, [100, 92], "out"], [52, [100, 84]], ...flutuar([100, 84], 52, 2)]), o: anim(aparecer(40, 8)) }));
  }
  layers.push(nuvens, luz);
  return layers;
}

/**
 * Meia largura da cúpula da colmeia de palha na altura y (de 0, a base, a −50,
 * o alto): a curva do sino, larga embaixo e redonda em cima.
 */
const COLMEIA_ALTURA = 50, COLMEIA_LARGURA = 30;
const colmeiaMeia = (y) => COLMEIA_LARGURA * Math.sqrt(Math.max(0, 1 - (-y / COLMEIA_ALTURA) ** 2.4));
/** Rolos de palha empilhados da colmeia (a altura de cada costura entre dois rolos). */
const COLMEIA_COSTURAS = [-8, -16, -24, -31.5, -38.5, -44.5];
/**
 * Colmeia tradicional de palha (o cortiço em sino, "skep"), com o meio da base
 * em (0,0): cúpula de rolos de palha trançada empilhados na horizontal, as
 * costuras entre os rolos, a entradinha escura em arco no pé e a tábua.
 */
function colmeiaShapes() {
  const lado = [];
  for (let k = 0; k <= 12; k++) { const y = -(COLMEIA_ALTURA * k) / 12; lado.push([colmeiaMeia(y), y]); }
  const cupula = [...lado.map(([x, y]) => [-x, y]), ...lado.slice(0, -1).reverse()];
  const costura = (y) => { const w = colmeiaMeia(y) - 0.6; return lib.polyline([[-w, y - 0.6], [-w * 0.5, y + 1.2], [0, y + 1.6], [w * 0.5, y + 1.2], [w, y - 0.6]]); };
  const brilhoRolo = (y0, y1) => { const y = (y0 + y1) / 2 - 1, w = colmeiaMeia(y) * 0.55; return lib.polyline([[-w, y], [0, y + 0.8], [w * 0.4, y + 0.6]]); };
  const juntas = [0, ...COLMEIA_COSTURAS];
  return [
    fill([forma([[-5.5, 0], [-5.5, -4.5], [-3, -7.6], [0, -8.4], [3, -7.6], [5.5, -4.5], [5.5, 0]])], "#3B2416", "Entrada"),
    stroke(juntas.slice(0, -1).map((y0, k) => brilhoRolo(y0, juntas[k + 1])), 1.2, hex("#F6C878"), "Palha"),
    stroke(COLMEIA_COSTURAS.map(costura), 1.6, hex("#A8662A"), "Aneis"),
    fill([lib.polyline(cupula, { closed: true })], "#E2A04C", "Cupula"),
    fill([rect(-36, -1, 36, 4)], "#8A4633", "Tabua"),
  ];
}
/** Abelha desenhada, centrada em (0,0), olhando para a direita. */
function abelhaShapes() {
  return [
    lib.makeEllipse(-1, -4, 2.6, 3.2, hex("#F5F8FA"), "AsaFrente", 85),
    stroke([reta([[-1, -2.6], [-1, 2.6]]), reta([[1.6, -2.8], [1.6, 2.8]])], 1.3, hex("#292F33"), "Listras"),
    lib.makeEllipse(4.6, 0, 1.9, 1.9, hex("#292F33"), "Cabeca"),
    lib.makeEllipse(0, 0, 4.4, 3.2, hex("#FFCC4D"), "Corpo"),
    lib.makeEllipse(-3, -4.4, 2.2, 2.8, hex("#E1E8ED"), "AsaTras", 70),
  ];
}

/** São Bernardo de Claraval: a colmeia aparece e as abelhas voam (o "Doutor Melífluo"). */
function gestoBernardo(t) {
  const colmeia = L("G_Colmeia", colmeiaShapes(), { a: [0, 0], p: [100, 152], s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  // a entradinha da colmeia (no pé da cúpula), de onde as abelhas saem
  const ENTRADA = [100, 148];
  // cada abelha sai da porta e dá voltas em volta da colmeia, fechando o laço sem salto
  const abelha = (nm, fase, rx, ry, cy, t0) => {
    const pos = (u) => [100 + rx * Math.cos(fase + u * Math.PI * 4), cy + ry * Math.sin(fase + u * Math.PI * 4)];
    const keys = [[0, ENTRADA], [t0, ENTRADA, "out"]];
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const tt = t0 + 10 + ((END - t0 - 10) * k) / n;
      keys.push([tt, pos(k / n), "linear"]);
    }
    return L(nm, abelhaShapes(), { p: anim(keys), s: anim([[0, 0], ...pop(t0, 8, { over: 140, base: 120 })]), o: anim(aparecer(t0, 3)) });
  };
  const layers = [abelha("G_Abelha1", 0, 46, 20, 100, 10), abelha("G_Abelha2", 2.1, 40, 16, 92, 18), abelha("G_Abelha3", 4.2, 50, 24, 106, 26), colmeia];
  if (t >= 2) layers.push(L("T2_Livro", livroAbertoShapes(36, 22, "#8A4633"), {
    p: [40, 156], s: anim([[0, [4, 100]], ...abrir(40, 54, { axis: "x", from: 4 })]), o: anim(aparecer(40, 3)),
  }));
  if (t >= 3) layers.push(...aureolaERaios([100, 66], { t0: 54 }));
  return layers;
}

/** Cetro dourado com a flor de lis, com o pé em (0,0). */
function cetroShapes() {
  return [
    fill([forma([[0, -64], [3, -58], [0, -52], [-3, -58]]), forma([[-1, -54], [-8, -60], [-9, -52], [-3, -51]]), forma([[1, -54], [8, -60], [9, -52], [3, -51]])], "#FFCC4D", "Lis"),
    lib.makeEllipse(0, -50, 3, 2.4, hex("#F4900C"), "No"),
    stroke([reta([[0, 0], [0, -50]])], 3, hex("#F4900C"), "Haste"),
  ];
}

/** Maria Rainha: Maria (busto, manto azul) recebe a coroa que desce. */
function gestoMariaRainha(t, c) {
  const K = 0.74, F = [100, 102];
  const maria = L("G_Maria", busto(K, { manto: "#3D6FB6", veste: "#F5F8FA", orla: "#FFCC4D" }), {
    p: anim([[0, [100, 108]], [12, F]]), o: anim(aparecer(0, 8)),
  });
  const CABECA = [100, F[1] - 26 * K + 2];
  const coroa = L("G_Coroa", coroaShapes(26), {
    p: anim([[0, [100, 40]], [10, [100, 40], "in"], [32, add(CABECA, [0, 2]), "out"], [36, CABECA]]),
    r: anim([[0, -10], [10, -10, "ease"], [32, 0]]), o: anim(aparecer(10, 6)),
  });
  const luz = brilho("G_Brilho", add(CABECA, [0, -8]), { rx: 16, ry: 12, color: "#FFF1C1", t0: 34, peak: 35, period: 20 });
  const layers = [];
  if (t >= 3) {
    const pos = [[-30, -6], [30, -6], [-22, -22], [22, -22], [0, -30]];
    layers.push(L("T3_Estrelas", pos.flatMap((d) => transladar(estrelaShapes(4), d)), {
      p: CABECA, s: anim([[0, 0], ...pop(50, 12, { over: 115 }), ...pulsar(62, END, { amp: 8, period: 18 })]), o: anim(aparecer(50, 4)),
    }));
  }
  layers.push(coroa, maria);
  // o cetro fica ao lado e atrás de Maria (nada cobre Maria além da coroa e das estrelas)
  if (t >= 2) layers.push(L("T2_Cetro", cetroShapes(), { p: [146, 160], r: anim([[0, 30], [40, 30, "ease"], [54, 14]]), o: anim(aparecer(40, 6)) }));
  layers.push(luz);
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 146, w1: 84, t0: 44 }));
  return layers;
}

/** Livro do Evangelho em pé, capa vermelha com a cruz dourada, centrado em (0,0). */
function evangelhoShapes() {
  return [
    stroke([reta([[1, -14], [1, 10]]), reta([[-7, -6], [9, -6]])], 3, hex("#FFCC4D"), "Cruz"),
    fill([rect(-22, -26, -17, 26)], "#A0041E", "Lombada"),
    fill([rect(-17, -26, 20, 26)], "#BE1931", "Capa"),
    fill([rect(16, -24, 24, 24)], "#FFE8B6", "Folhas"),
  ];
}
/** Faca do martírio de São Bartolomeu, com o fim do cabo em (0,0) e a lâmina para cima. */
function facaShapes() {
  return [
    stroke([lib.polyline([[2, -18], [7, -30], [6, -40]])], 1, hex("#8899A6"), "Fio"),
    fill([forma([[-2, -16], [3, -18], [9, -30], [8, -42], [3, -34], [-1, -24]])], "#CCD6DD", "Lamina"),
    lib.makeEllipse(0, -16, 5, 1.8, hex("#66757F"), "Guarda"),
    fill([rect(-2.6, -16, 2.6, 0)], "#8A4633", "Cabo"),
  ];
}

/** São Bartolomeu Apóstolo: o livro do Evangelho e a faca do martírio aparecem. */
function gestoBartolomeu(t, c) {
  const livro = L("G_Livro", evangelhoShapes(), { p: [88, 116], s: anim(pop(0, 14, { over: 108 })), r: -4, o: anim(aparecer(0, 6)) });
  const faca = L("G_Faca", facaShapes(), {
    p: anim([[0, [148, 118]], [14, [148, 118], "out"], [32, [132, 146]]]),
    r: anim([[0, 50], [14, 50, "ease"], [32, 16], [36, 20]]), o: anim(aparecer(14, 4)),
  });
  const layers = [faca, livro];
  if (t >= 2) layers.push(palmaEmPe("T2_Palma", 48, [50, 160], { r: -8, s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  if (t >= 3) layers.push(aureola({ center: [92, 74], rx: 16, ry: 4.5, t0: 50, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** Pose de Santa Mônica: escala, rosto, âncora (base do busto), posição e a inclinação de oração. */
const MONICA = (() => { const K = 0.74, F = [100, 90]; return { K, F, A: [0, 75 * K], P: [F[0], F[1] + 75 * K], R: -5 }; })();

/** Santa Mônica: Mônica (busto, véu escuro) reza e lágrimas caem. */
function gestoMonica(t, c) {
  const { K, A, P, R: INCLINA } = MONICA;
  const P_ = (pts) => pts.map(([x, y]) => [x * K, y * K]);
  const maos = [
    fill([forma(P_([[0, 32], [3.5, 40], [3, 48], [-3, 48], [-3.5, 40]]))], PELE, "MaosPostas"),
    stroke([lib.polyline(P_([[-18, 60], [-9, 52], [-3, 48]])), lib.polyline(P_([[18, 60], [9, 52], [3, 48]]))], 7 * K, hex("#3B3F45"), "Mangas"),
  ];
  const inclina = () => anim([[0, 0], [10, 0, "ease"], [24, INCLINA]]);
  const monica = L("G_Monica", [...maos, ...busto(K, { manto: "#292F33", veste: "#CCD6DD", orla: "#8899A6" })], {
    a: A, p: P, r: inclina(), o: anim(aparecer(0, 6)),
  });
  // as lágrimas ficam no desenho do busto (rosto em (0,0)) e na mesma posição e inclinação dele;
  // a queda vem da âncora: subir a âncora d px desce a gota d px ao longo do rosto inclinado
  const gota = (sx, dy) => transladar(lagrimaShapes(2.3, { cor: "#88C9F9" }), [sx * 6 * K, 3 * K + dy]);
  const ancora = (d) => [A[0], A[1] - d];
  const lagrimas = L("G_Lagrimas", [...gota(-1, 0), ...gota(1, 3)], {
    a: anim([[0, ancora(0)], [24, ancora(0), "in"], [42, ancora(14)], [43, ancora(0)], [52, ancora(0), "in"], [70, ancora(14)]]),
    p: P, r: inclina(),
    o: anim([[0, 0], [24, 0], [27, 100], [38, 100], [42, 0], [52, 0], [55, 100], [66, 100], [70, 0]]),
  });
  const layers = [];
  if (t >= 2) layers.push(terco("T2_Terco", naPose(P, A, INCLINA, [0, 48 * K]), 40, { contaGrande: "#F5F8FA", contaPequena: "#CCD6DD" }));
  layers.push(lagrimas, monica);
  if (t >= 3) layers.push(luzDoOuro(c, { x: 96, bottom: 146, w1: 86, t0: 44, peak: 32 }));
  return layers;
}

/** Seta que atravessa o coração, de (−34, 18) a (30, −16) em volta de (0,0), com a ponta e as penas. */
function setaShapes() {
  return [
    fill([poligono([[36, -19], [26, -17], [30, -12]])], "#AAB8C2", "Ponta"),
    fill([poligono([[-30, 16], [-38, 14], [-36, 20]]), poligono([[-34, 18], [-40, 22], [-35, 24]])], "#F5F8FA", "Penas"),
    stroke([reta([[-36, 19], [30, -15]])], 2.4, hex("#C1694F"), "Haste"),
  ];
}

/** Santo Agostinho: o coração em chamas atravessado pela seta acende. */
function gestoAgostinho(t, c) {
  const C = [100, 118];
  const coracao = L("G_Coracao", coracaoShapes(44), { p: C, s: anim([[0, 0], ...pop(0, 12, { over: 110 }), ...pulsar(40, END, { amp: 5, period: 20 })]), o: anim(aparecer(0, 4)) });
  const dir = [64 / Math.hypot(64, 34), -34 / Math.hypot(64, 34)];
  const seta = L("G_Seta", setaShapes(), {
    p: anim([[0, add(C, [-dir[0] * 40, -dir[1] * 40])], [10, add(C, [-dir[0] * 40, -dir[1] * 40]), "out"], [20, C], [22, add(C, [1.5, -0.8])], [24, C]]),
    o: anim(aparecer(10, 3)),
  });
  const chamas = chama("G_Chamas", 26, add(C, [0, -10]), 22, { period: 10 });
  const layers = [];
  if (t >= 3) layers.push(L("T3_Mitra", mitraShapes(), {
    p: anim([[0, [152, 58]], [46, [152, 58], "ease"], [58, [152, 66]], ...flutuar([152, 66], 58, 1.5)]), r: 12, o: anim(aparecer(46, 8)),
  }));
  layers.push(seta, coracao, chamas);
  if (t >= 2) layers.push(L("T2_Livro", livroFechadoShapes("#3D6FB6", "#1F4E79"), {
    p: [100, 162], s: anim([[0, 0], ...pop(40, 10, { over: 72, base: 66 })]), o: anim(aparecer(40, 4)),
  }));
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 136, w1: 80, t0: 44 }));
  return layers;
}

/** Bandeja de prata em perspectiva, com o meio em (0,0). */
function bandejaShapes() {
  return [
    lib.makeEllipse(-14, -2, 8, 2, hex("#FFFFFF"), "Reflexo", 70),
    lib.makeEllipse(0, -1, 32, 8, hex("#E1E8ED"), "Fundo"),
    lib.makeEllipseRing(0, 0, 40, 11, 1.6, hex("#8899A6"), "Borda"),
    lib.makeEllipse(0, 0, 40, 11, hex("#CCD6DD"), "Bandeja"),
    fill([forma([[-14, 8], [14, 8], [18, 16], [-18, 16]])], "#AAB8C2", "Pe"),
  ];
}

/** Martírio de João Batista: a bandeja aparece com uma palma de mártir (sem cabeça). */
function gestoJoaoBatistaMartirio(t, c) {
  const B = [100, 136];
  const bandeja = L("G_Bandeja", bandejaShapes(), { p: B, s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  const palma = L("G_Palma", palmaShapes(72), {
    p: add(B, [-4, -1]), s: anim([[0, [100, 0]], ...abrir(14, 38, { axis: "y" })]),
    r: anim([[0, -6], [38, -6], ...onda(-6, 3, 38, END, { period: 30 })]), o: anim(aparecer(14, 4)),
  });
  const layers = [];
  if (t >= 3) layers.push(L("T3_Coroa", coroaShapes(22), {
    p: anim([[0, [108, 44]], [48, [108, 44], "ease"], [62, [108, 58]], ...flutuar([108, 58], 62, 1.5)]), o: anim(aparecer(48, 8)),
  }));
  layers.push(palma, bandeja);
  if (t >= 2) layers.push(L("T2_Cordeiro", cordeiroShapes(), {
    p: anim([[0, [44, 150]], ...pulo([44, 150], 40, { h: 6, d: 10, n: 2, gap: 4 })]), o: anim(aparecer(36, 6)),
  }));
  // a auréola do ouro fica sob a coroa de mártir, no alto da palma
  if (t >= 3) layers.push(aureola({ center: [108, 62], rx: 13, ry: 3.6, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** São Gregório Magno: a pomba pousa no ombro do papa (busto, tiara). */
function gestoGregorio(t, c) {
  const K = 0.72, F = [86, 98];
  const P_ = (pts) => pts.map(([x, y]) => [x * K, y * K]);
  const tiara = [
    stroke([reta(P_([[0, -36], [0, -42]])), reta(P_([[-3, -39.5], [3, -39.5]]))], 1.6 * K, hex("#F4900C"), "CruzTiara"),
    stroke([lib.polyline(P_([[-13, -12], [0, -10], [13, -12]])), lib.polyline(P_([[-12.5, -21], [0, -19], [12.5, -21]])), lib.polyline(P_([[-10, -29], [0, -27], [10, -29]]))], 2.6 * K, hex("#FFCC4D"), "Coroas"),
    fill([forma(P_([[-13.5, -10], [-13, -22], [-10, -31], [-4, -36], [4, -36], [10, -31], [13, -22], [13.5, -10]]))], "#F5F8FA", "Tiara"),
  ];
  const mozeta = fill([forma(P_([[0, 16], [14, 20], [28, 32], [31, 46], [0, 50], [-31, 46], [-28, 32], [-14, 20]]))], "#BE1931", "Mozeta");
  const papa = L("G_Papa", [...tiara, ...atrasDe(busto(K, { veste: "#F5F8FA", cabelo: "curto", corCabelo: "#CCD6DD" }), "Decote", [mozeta])], {
    p: anim([[0, [F[0], F[1] + 4]], [12, F]]), o: anim(aparecer(0, 8)),
  });
  // a pomba (desenhada, virada para a cabeça do papa) pousa no ombro direito dele
  const W = 30, OMBRO = add(F, [24 * K, 28 * K]), POUSO = add(OMBRO, [0, -0.22 * W]);
  const pomba = L("G_Pomba", pombaShapes(W), {
    s: [-100, 100],
    p: anim([[0, [166, 46]], [8, [166, 46], "ease"], [20, [150, 66]], [32, add(POUSO, [0, -3]), "out"], [36, POUSO], ...pulo(POUSO, 60, { h: 2, d: 6 })]),
    r: anim([[0, -16], [8, -16, "ease"], [32, 0]]), o: anim(aparecer(8, 6)),
  });
  const layers = [pomba, papa];
  if (t >= 2) {
    const pauta = [-10, -5, 0, 5].map((y) => reta([[-13, y], [13, y]]));
    const notas = [[-8, -7.5], [-3, -2.5], [2, -5], [7, 0]].map(([x, y]) => rect(x - 1.6, y - 1.4, x + 1.6, y + 1.4));
    layers.push(L("T2_Partitura", [
      fill(notas, "#292F33", "Notas"),
      stroke(pauta, 0.8, hex("#BE1931"), "Pauta"),
      fill([rect(-16, -18, 16, 14)], "#FFE8B6", "Pergaminho"),
    ], { p: [146, 148], r: anim([[0, 0], [40, 0, "ease"], [52, 8]]), s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  }
  if (t >= 3) layers.push(aureola({ center: add(F, [0, -8]), r: 24, t0: 50, nm: "T3_Aureola" }), luzDoOuro(c, { x: 92, bottom: 146, w1: 86, t0: 44 }));
  return layers;
}

/** Berço de balanço, com o meio dos balanços em (0,0): balanços, cesto, manta e o bebê. */
function bercoShapes() {
  return [
    stroke([lib.polyline([[-8, -35.5], [-6, -34.5], [-4, -35.5]])], 0.9, hex("#662113"), "Olhos"),
    lib.makeEllipse(-6, -34, 5.6, 5.6, hex(PELE), "Bebe"),
    fill([forma([[-22, -30], [22, -30], [18, -23], [-18, -23]])], "#F4ABBA", "Manta"),
    stroke([-14, -5, 5, 14].map((x) => reta([[x, -28], [x * 0.88, -9]])), 1, hex("#C1694F"), "Trama"),
    fill([forma([[-26, -30], [26, -30], [22, -8], [-22, -8]])], "#D99E82", "Cesto"),
    stroke([reta([[-18, 0], [-17, -9]]), reta([[18, 0], [17, -9]])], 3, hex("#8A4633"), "Pes"),
    stroke([lib.polyline([[-32, -4], [-16, 1], [0, 2], [16, 1], [32, -4]])], 3.5, hex("#8A4633"), "Balancos"),
  ];
}

/** Meio dos balanços do berço e a cabeça do bebê (no desenho de `bercoShapes`). */
const BERCO = [100, 152], BEBE = [-6, -34];
/** O berço balança até o quadro 34 e para: a auréola do bebê (t0 36) acende com ele parado. */
const BERCO_PARA = 34;

/** Natividade de Nossa Senhora: o berço balança e uma estrela acende sobre ele. */
function gestoNatividadeMaria(t, c) {
  const B = BERCO, ESTRELA = [100, 70];
  const berco = L("G_Berco", bercoShapes(), {
    p: B, r: anim([[0, 0], [4, 0, "ease"], [11.5, 4, "ease"], [19, -4, "ease"], [26.5, 3, "ease"], [BERCO_PARA, 0]]), s: anim(pop(0, 12, { over: 106 })), o: anim(aparecer(0, 6)),
  });
  const estrela = L("G_Estrela", estrelaShapes(11, { miolo: "#FFF1C1" }), {
    p: ESTRELA, s: anim([[0, 0], ...pop(18, 12, { over: 125 }), ...pulsar(30, END, { amp: 8, period: 20 })]), o: anim(aparecer(18, 3)),
  });
  const luz = brilho("G_Brilho", ESTRELA, { rx: 18, ry: 18, color: "#FFF1C1", t0: 24, peak: 30, period: 20 });
  const layers = [estrela, luz, berco];
  if (t >= 2) layers.push(L("T2_SantAna", busto(0.52, { manto: "#5C913B", veste: "#BE1931" }), {
    p: anim([[0, [48, 116]], [40, [48, 116], "out"], [54, [48, 110]]]), o: anim(aparecer(40, 8)),
  }));
  if (t >= 3) {
    const cores = ["#F4ABBA", "#FFFFFF", "#FFCC4D"];
    layers.unshift(...chuva("T3_Flores", (k) => petala(cores[k % 3]), { count: 7, t0: 44, area: [36, 40, 164, 150], seed: 41 }));
    layers.push(luzDoOuro(c, { w1: 84, t0: 42 }));
  }
  return layers;
}

/** Meia corrente que sai da argola em (0,0) e vai `n` elos na direção `lado` (1 = direita), com o último elo aberto. */
function correnteShapes(n, lado) {
  const elos = [];
  for (let k = 0; k < n; k++) {
    const x = lado * (8 + k * 8);
    if (k % 2 === 0) {
      if (k === n - 1) elos.push(stroke([lib.polyline([[x + lado * 5, -3], [x, -3.4], [x - lado * 5, -1.5], [x - lado * 5, 1.5], [x, 3.4], [x + lado * 2, 3]])], 2.2, hex("#8899A6"), `Elo${k}`));
      else elos.push(lib.makeEllipseRing(x, 0, 5.5, 3.2, 2.2, hex("#8899A6"), `Elo${k}`));
    } else {
      elos.push(stroke([reta([[x - 4.5, 0], [x + 4.5, 0]])], 2.6, hex("#66757F"), `Elo${k}`));
    }
  }
  return [...elos, lib.makeEllipseRing(0, 0, 6, 6, 2.6, hex("#66757F"), "Argola")];
}

/** São Pedro Claver: as correntes se partem e caem. */
function gestoPedroClaver(t, c) {
  const E = [40, 96], D = [160, 96], N = 7;
  const metade = (nm, lado, base, queda) => L(nm, correnteShapes(N, lado), {
    p: base,
    r: anim([[0, 0], [16, 0], [18, -lado * 3], [20, lado * 3], [22, 0, "in"], [34, queda, "out"], [40, queda - lado * 8], [46, queda], ...onda(queda, 3, 46, END, { period: 30 })]),
    o: anim(aparecer(0, 6)),
  });
  // clarão de quando a corrente se parte: acende e some (não fica um disco parado)
  const luz = L("G_Brilho", [lib.makeEllipse(0, 0, 16, 16, hex("#FFF1C1"), "Brilho")], {
    p: [100, 96], o: anim([[0, 0], [20, 0], [23, 85], [36, 0]]),
  });
  const placas = L("Placas", [fill([rect(30, 84, 36, 108), rect(164, 84, 170, 108)], "#3B2416", "Placas")], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [metade("G_CorrenteE", 1, E, 74), metade("G_CorrenteD", -1, D, -74), luz, placas];
  if (t >= 2) layers.unshift(L("T2_Cruz", cruzShapes(50), { p: [100, 150], s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }));
  if (t >= 3) layers.push(aureola({ center: [100, 84], rx: 14, ry: 4, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** Cruz gloriosa dourada, com o pé em (0,0) e 90 px de altura. */
function cruzGloriosaShapes() {
  return [
    lib.makeEllipseRing(0, -66, 6, 6, 2, hex("#FFF1C1"), "Centro"),
    stroke([reta([[0, -86], [0, -4]]), reta([[-22, -66], [22, -66]])], 1.4, hex("#FFF1C1"), "Filete"),
    fill([rect(-26, -70, 26, -62)], "#FFAC33", "Travessa"),
    fill([rect(-4.5, -90, 4.5, 0)], "#F4900C", "Haste"),
  ];
}

/** Exaltação da Santa Cruz: a cruz se ergue e brilha. */
function gestoExaltacao(t, c) {
  const PE = [100, 152];
  const cruz = L("G_Cruz", cruzGloriosaShapes(), {
    p: PE, r: anim([[0, -58], [4, -58, "ease"], [28, 4], [32, 0]]), o: anim(aparecer(0, 6)),
  });
  const luz = brilho("G_Brilho", add(PE, [0, -66]), { rx: 26, ry: 26, color: "#FFF1C1", t0: 28, peak: 28, period: 24 });
  const colina = L("Colina", [fill([forma([[34, 172], [66, 154], [100, 148], [134, 154], [166, 172]])], "#8899A6", "Colina")], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [];
  if (t >= 2) {
    const folhas = Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2, x = 12 * Math.cos(a), y = 12 * Math.sin(a), tx = -Math.sin(a), ty = Math.cos(a);
      return forma([[x, y], [x + tx * 4 + x * 0.25, y + ty * 4 + y * 0.25], [x + tx * 8, y + ty * 8], [x + tx * 4 - x * 0.12, y + ty * 4 - y * 0.12]]);
    });
    layers.push(L("T2_Louros", [
      fill([poligono([[-3, 12], [-7, 22], [-2, 19]]), poligono([[3, 12], [7, 22], [2, 19]])], "#DD2E44", "Fita"),
      fill(folhas, "#5C913B", "Folhas"),
    ], { p: add(PE, [0, -66]), s: anim([[0, 0], ...pop(40, 12, { over: 115 })]), o: anim(aparecer(40, 4)) }));
  }
  layers.push(cruz, luz, colina);
  if (t >= 3) layers.push(raios("T3_Raios", add(PE, [0, -66]), { count: 16, r1: 36, r2: 52, half: 3, t0: 50, peak: 80 }), luzDoOuro(c, { bottom: 140, w1: 84, t0: 44 }));
  return layers;
}

/** Espada desenhada apontando para (0,0), vinda do ângulo `ang` (graus; 0 = direita, 90 = embaixo). */
function espadaShapes(ang, nm) {
  const u = [Math.cos((ang * Math.PI) / 180), Math.sin((ang * Math.PI) / 180)], n = [-u[1], u[0]];
  const at = (r, s = 0) => [u[0] * r + n[0] * s, u[1] * r + n[1] * s];
  return [
    lib.makeEllipse(...at(43), 2.2, 2.2, hex("#FFCC4D"), `${nm}Pomo`),
    stroke([reta([at(36), at(41)])], 2.8, hex("#8A4633"), `${nm}Cabo`),
    stroke([reta([at(35, -5), at(35, 5)])], 2.4, hex("#FFCC4D"), `${nm}Guarda`),
    fill([poligono([at(4), at(34, -2), at(34, 2)])], "#E1E8ED", `${nm}Lamina`),
  ];
}

/** Nossa Senhora das Dores: o coração de Maria com as sete espadas acende. */
function gestoDores(t, c) {
  const C = [100, 112];
  const coracao = L("G_Coracao", coracaoShapes(40, { cor: "#DD2E44" }), { p: C, s: anim([[0, 0], ...pop(0, 12, { over: 108 }), ...pulsar(40, END, { amp: 4, period: 22 })]), o: anim(aparecer(0, 4)) });
  const espadas = (nm, angs, de, t0) => L(nm, angs.flatMap((a, k) => espadaShapes(a, `E${k}`)), {
    p: anim([[0, add(C, de)], [t0, add(C, de), "out"], [t0 + 12, C]]), o: anim(aparecer(t0, 4)),
  });
  const esq = espadas("G_EspadasE", [195, 220, 245], [-14, -10], 10);
  const dir = espadas("G_EspadasD", [285, 308, 331, 354], [14, -10], 16);
  const luz = brilho("G_Brilho", C, { rx: 28, ry: 26, color: "#FFE8A3", t0: 30, peak: 28, period: 22 });
  const layers = [];
  if (t >= 3) layers.push(L("T3_Estrelas", [[46, 66], [154, 66], [40, 120], [160, 120], [70, 46], [130, 46]].flatMap((d) => transladar(estrelaShapes(4.5), d)), {
    a: [100, 90], p: [100, 90], s: anim([[0, 0], ...pop(48, 12)]), o: anim(aparecer(48, 4)),
  }));
  // as espadas ficam atrás do coração: só a parte de fora aparece, entrando por ele
  layers.push(coracao, esq, dir);
  if (t >= 2) {
    layers.push(L("T2_Lagrimas", [...transladar(lagrimaShapes(2), [-8, 0]), ...transladar(lagrimaShapes(2), [6, 8]), ...transladar(lagrimaShapes(1.6), [14, -4])], {
      p: anim([[0, [100, 138]], [40, [100, 138], "in"], [58, [100, 152]], [59, [100, 138]], [62, [100, 138], "in"], [80, [100, 152]]]),
      o: anim([[0, 0], [40, 0], [43, 100], [54, 100], [58, 0], [62, 0], [65, 100]]),
    }));
  }
  layers.push(luz);
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 140, w1: 84, t0: 44 }));
  return layers;
}

/** São Mateus Apóstolo: o anjo (asas) aparece sobre o livro aberto. */
function gestoMateus(t, c) {
  const K = 0.42, FIM = [100, 92];
  const desce = [[0, [100, 74]], [8, [100, 74], "out"], [30, FIM], ...flutuar(FIM, 30, 1.5)];
  const livro = L("G_Livro", livroAbertoShapes(60, 34, "#BE1931"), { p: [100, 146], s: anim(abrir(0, 14, { axis: "x", from: 4 })), o: anim(aparecer(0, 3)) });
  const anjo = L("G_Anjo", busto(K, { veste: "#F5F8FA", cabelo: "longo", corCabelo: "#FFCC4D" }), { p: anim(desce), o: anim(aparecer(8, 8)) });
  const RAIZ = [5, 14];
  const bate = (lado) => anim([[0, 0], [30, 0], ...onda(0, lado * 10, 30, END, { period: 15 })]);
  const asaD = L("G_AsaD", asaShapes(30), { a: [0, 0], p: anim(deslocar(desce, RAIZ)), r: bate(1), o: anim(aparecer(8, 8)) });
  const asaE = L("G_AsaE", espelhar(asaShapes(30)), { a: [0, 0], p: anim(deslocar(desce, [-RAIZ[0], RAIZ[1]])), r: bate(-1), o: anim(aparecer(8, 8)) });
  const layers = [livro, anjo, asaD, asaE];
  if (t >= 2) {
    const moeda = (x, y) => [lib.makeEllipseRing(x, y, 6, 2.2, 1, hex("#F4900C"), "Borda"), lib.makeEllipse(x, y, 6, 2.2, hex("#FFCC4D"), "Moeda")];
    layers.unshift(L("T2_Moedas", [...moeda(0, -6), ...moeda(1, -3), ...moeda(-1, 0), ...moeda(12, 1)], {
      p: anim([[0, [36, 140]], [40, [36, 140], "in"], [50, [36, 158], "out"], [54, [36, 155]], [58, [36, 158]]]), o: anim(aparecer(40, 3)),
    }));
  }
  if (t >= 3) layers.push(aureola({ center: [100, 80], rx: 10, ry: 3, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** São Pio de Pietrelcina: Padre Pio (busto, hábito marrom e barba) ergue as mãos com luvas. */
function gestoPio(t, c) {
  const K = 0.74, F = [100, 92];
  const P_ = (pts) => pts.map(([x, y]) => [x * K, y * K]);
  const capuz = fill([forma(P_([[-20, 14], [-12, 22], [0, 24], [12, 22], [20, 14], [24, 26], [0, 32], [-24, 26]]))], "#5C3A21", "Capuz");
  const pio = L("G_Pio", atrasDe(busto(K, { veste: "#7A4A2A", cabelo: "curto", corCabelo: "#CCD6DD", barba: "#E1E8ED" }), "Pescoco", [capuz]), {
    p: anim([[0, [F[0], F[1] + 4]], [12, F]]), o: anim(aparecer(0, 8)),
  });
  // a luva de meio dedo de Padre Pio: a palma coberta e as pontas dos dedos à vista
  const mao = (x) => [
    ...[-3, -1, 1, 3].map((dx, k) => lib.makeEllipse(x + dx, -7 + Math.abs(dx) * 0.4, 1.1, 2.2, hex(PELE), `Dedo${k}`)),
    lib.makeEllipse(x, 0, 5.2, 6, hex("#5C3A21"), "Luva"),
    stroke([reta([[x, 5], [x + Math.sign(x) * 3, 18]])], 8, hex("#7A4A2A"), "Manga"),
  ];
  const ergue = [[0, [100, 132]], [10, [100, 132], "ease"], [34, [100, 108]], ...flutuar([100, 108], 34, 1)];
  const maos = L("G_Maos", [...mao(-26), ...mao(26)], { p: anim(ergue), o: anim(aparecer(10, 6)) });
  const layers = [];
  if (t >= 2) layers.push(L("T2_Terco", tercoShapes({ contaGrande: "#8A4633", contaPequena: "#5C3A21" }), { p: anim(deslocar(ergue, [26, 4])), o: anim(aparecer(40, 8)) }));
  layers.push(maos, pio);
  if (t >= 3) layers.push(aureola({ center: [100, 74], rx: 12, ry: 3.5, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { bottom: 146, w1: 86, t0: 44 }));
  return layers;
}

/** Caixa de remédios de madeira, com os frascos, centrada em (0,0). */
function caixaShapes() {
  return [
    stroke([reta([[-2, 0], [2, 0]]), reta([[0, -2], [0, 2]])], 1.4, hex("#FFFFFF"), "Cruz"),
    lib.makeEllipse(0, 0, 4, 4, hex("#BE1931"), "Selo"),
    fill([rect(-18, -10, 18, 12)], "#A0522D", "Caixa"),
    fill([rect(-19, -14, 19, -9)], "#8A4633", "Tampa"),
    fill([rect(-13, -22, -8, -14), rect(-2, -24, 3, -14), rect(8, -21, 13, -14)], "#5DADEC", "Frascos"),
  ];
}

/** Santos Cosme e Damião: dois médicos (bustos) com a caixa de remédios e o almofariz. */
function gestoCosmeDamiao(t, c) {
  const K = 0.6;
  const entra = (x0, x1, t0) => ({ p: anim([[0, [x0, 88]], [t0, [x0, 88], "out"], [t0 + 16, [x1, 84]]]), o: anim(aparecer(t0, 8)) });
  const gemeo = (veste) => busto(K, { veste, cabelo: "curto", corCabelo: "#3B2416", barba: "#3B2416" });
  const cosme = L("G_Cosme", gemeo("#BE1931"), entra(56, 64, 0));
  const damiao = L("G_Damiao", gemeo("#3E721D"), entra(144, 136, 4));
  const ALM = [128, 150];
  const caixa = L("G_Caixa", [
    ...transladar(caixaShapes(), [78, 148]),
    lib.makeEllipse(ALM[0], ALM[1] - 6, 12, 3, hex("#CCD6DD"), "Boca"),
    fill([forma([[ALM[0] - 12, ALM[1] - 6], [ALM[0] + 12, ALM[1] - 6], [ALM[0] + 9, ALM[1] + 6], [ALM[0] - 9, ALM[1] + 6]])], "#AAB8C2", "Almofariz"),
    fill([rect(ALM[0] - 7, ALM[1] + 6, ALM[0] + 7, ALM[1] + 10)], "#8899A6", "Base"),
  ], { a: [100, 160], p: [100, 160], s: anim([[0, 0], ...pop(16, 12, { over: 106 })]), o: anim(aparecer(16, 4)) });
  const pilao = L("G_Pilao", [stroke([reta([[0, 0], [0, -22]])], 4, hex("#8A4633"), "Pilao"), lib.makeEllipse(0, -23, 3.4, 3, hex("#A0522D"), "Pega")], {
    p: [ALM[0], ALM[1] - 4], r: anim([[0, 20], [28, 20], ...onda(20, 14, 28, END, { period: 14 })]), o: anim(aparecer(24, 4)),
  });
  const layers = [];
  if (t >= 2) layers.push(palmaEmPe("T2_PalmaE", 40, [40, 164], { s: anim([[0, 0], ...pop(40, 12)]), o: anim(aparecer(40, 4)) }),
    palmaEmPe("T2_PalmaD", 40, [156, 164], { s: anim([[0, 0], ...pop(44, 12)]), o: anim(aparecer(44, 4)) }));
  layers.push(pilao, caixa, cosme, damiao);
  if (t >= 3) layers.push(
    aureola({ center: [64, 68], rx: 11, ry: 3, t0: 52, nm: "T3_Aureola1" }),
    aureola({ center: [136, 68], rx: 11, ry: 3, t0: 56, nm: "T3_Aureola2" }),
    luzDoOuro(c, { w1: 90, t0: 44 }),
  );
  return layers;
}

/** São Vicente de Paulo: Vicente (busto) acolhe uma criança. */
function gestoVicente(t, c) {
  const K = 0.74, F = [80, 88], A = [0, 70 * K], P = [F[0], F[1] + 70 * K], LEAN = 7;
  // colarinho branco sobre a batina preta (para a batina não sumir no fundo escuro)
  const gola = fill([poligono([[-7 * K, 19 * K], [7 * K, 19 * K], [4 * K, 30 * K], [-4 * K, 30 * K]])], "#F5F8FA", "Gola");
  const vicente = L("G_Vicente", atrasDe(busto(K, { veste: "#292F33", cabelo: "curto", corCabelo: "#E1E8ED", barba: "#E1E8ED" }), "Barba", [gola]), {
    a: A, p: P, r: anim([[0, 0], [20, 0, "ease"], [34, LEAN]]), o: anim(aparecer(0, 6)),
  });
  const KC = 0.42, CF = [126, 120];
  const crianca = L("G_Crianca", busto(KC, { veste: "#F4900C", cabelo: "curto", corCabelo: "#8A4633" }), {
    p: anim([[0, [152, CF[1]]], [4, [152, CF[1]], "linear"], [24, CF], ...pulo(CF, 24, { h: 3, d: 8 })]), o: anim(aparecer(4, 6)),
  });
  // a mão de Vicente pousa no ombro da criança, com o punho da manga vindo do corpo dele
  const mao = add(CF, [-9, 10]), ombro = naPose(P, A, LEAN, [26, 34]);
  const d = Math.hypot(ombro[0] - mao[0], ombro[1] - mao[1]), u = [(ombro[0] - mao[0]) / d, (ombro[1] - mao[1]) / d];
  const maoL = L("G_Mao", [
    lib.makeEllipse(mao[0], mao[1], 3.8, 3.2, hex(PELE), "Mao"),
    stroke([reta([add(mao, [u[0] * 2.5, u[1] * 2.5]), add(mao, [u[0] * 9, u[1] * 9])])], 5.5, hex("#292F33"), "Punho"),
  ], { p: anim([[0, [0, 3]], [36, [0, 3], "out"], [42, [0, 0]]]), o: anim(aparecer(36, 6)) });
  const layers = [];
  if (t >= 2) layers.push(L("T2_Pao", piece("twemoji-1f35e", 24), { p: [38, 152], s: anim([[0, 0], ...pop(40, 10)]), o: anim(aparecer(40, 4)) }));
  layers.push(maoL, crianca, vicente);
  if (t >= 3) layers.push(aureola({ center: naPose(P, A, LEAN, [0, -24 * K]), rx: 11, ry: 3.2, t0: 52, nm: "T3_Aureola" }), luzDoOuro(c, { x: 96, w1: 86, t0: 44 }));
  return layers;
}

/** Espada de São Miguel, de pé, com o punho em cima e o meio em (0,0). */
function espadaMiguelShapes() {
  return [
    lib.makeEllipse(0, -20, 2.2, 2.2, hex("#FFCC4D"), "Pomo"),
    stroke([reta([[0, -18], [0, -13]])], 3, hex("#8A4633"), "Cabo"),
    stroke([reta([[-6, -12], [6, -12]])], 2.6, hex("#FFCC4D"), "Guarda"),
    fill([poligono([[-2.2, -11], [2.2, -11], [2.2, 16], [0, 21], [-2.2, 16]])], "#CCD6DD", "Lamina"),
  ];
}
/** Peixe de São Rafael, centrado em (0,0), olhando para a direita. */
function peixeShapes() {
  return [
    lib.makeEllipse(7, -1.5, 1.4, 1.4, hex("#292F33"), "Olho"),
    stroke([lib.polyline([[-4, -5], [-2, 0], [-4, 5]])], 1, hex("#3B88C3"), "Escamas"),
    fill([forma([[12, 0], [6, -6], [-4, -6], [-10, 0], [-4, 6], [6, 6]])], "#5DADEC", "Peixe"),
    fill([poligono([[-9, 0], [-17, -7], [-15, 0], [-17, 7]])], "#3B88C3", "Cauda"),
  ];
}

/** Santos Arcanjos Miguel, Gabriel e Rafael: três pares de asas aparecem, com a espada, o lírio e o peixe. */
function gestoArcanjos(t, c) {
  const asas = (w) => [...asaShapes(w), ...espelhar(asaShapes(w))];
  const anjo = (nm, emblema, p, t0) => L(nm, [...emblema, ...transladar(asas(26), [0, 6])], {
    p, s: anim([[0, [0, 0]], ...pop(t0, 12, { over: 112 }).map(([tt, v, e]) => [tt, [v, v], e]), ...onda([100, 100], 7, t0 + 14, END, { period: 18, axis: 0 })]),
    o: anim(aparecer(t0, 4)),
  });
  const miguel = anjo("G_Miguel", espadaMiguelShapes(), [54, 112], 0);
  const gabriel = anjo("G_Gabriel", piece(LIRIO, 30, { recolor: LIRIO_BRANCO }), [100, 92], 8);
  const rafael = anjo("G_Rafael", peixeShapes(), [146, 112], 16);
  const layers = [];
  if (t >= 2) layers.push(L("T2_Escudo", [
    stroke([reta([[0, -7], [0, 9]]), reta([[-6, -1], [6, -1]])], 2.4, hex("#DD2E44"), "Cruz"),
    fill([forma([[-10, -11], [10, -11], [10, 2], [0, 14], [-10, 2]])], "#F5F8FA", "Escudo"),
  ], { p: [66, 140], s: anim([[0, 0], ...pop(40, 12, { over: 115 })]), o: anim(aparecer(40, 4)) }));
  layers.push(miguel, gabriel, rafael);
  if (t >= 3) layers.push(raios("T3_Raios", [100, 92], { count: 16, r1: 32, r2: 48, half: 3, t0: 50, peak: 80 }), luzDoOuro(c, { w1: 92, t0: 44 }));
  return layers;
}

/** Leão deitado, olhando para a direita, com o meio da barriga em (0,0); o rabo é outra camada. */
function leaoShapes() {
  const juba = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2, r = k % 2 ? 10.5 : 13.5;
    return [16 + r * Math.cos(a), -22 + r * Math.sin(a)];
  });
  return [
    lib.makeEllipse(26.5, -21.5, 1.6, 1.2, hex("#662113"), "Nariz"),
    stroke([lib.polyline([[17, -25], [18.5, -24], [20, -25]])], 0.9, hex("#662113"), "Olho"),
    lib.makeEllipse(23, -19.5, 4.4, 3.4, hex("#FFE8B6"), "Focinho"),
    lib.makeEllipse(18, -22, 8.5, 8, hex("#FFCC4D"), "Cabeca"),
    fill([forma(juba)], "#C1694F", "Juba"),
    lib.makeEllipse(30, -1, 4, 2.6, hex("#FFCC4D"), "Pata1"),
    lib.makeEllipse(24, 0, 4, 2.6, hex("#E8A84C"), "Pata2"),
    stroke([reta([[10, -3], [28, -1]])], 6, hex("#E8A84C"), "PernaFrente"),
    fill([forma([[-30, 0], [-33, -10], [-22, -18], [2, -18], [12, -12], [14, 0]])], "#E8A84C", "Corpo"),
    lib.makeEllipse(-22, -2, 7, 4, hex("#D4893A"), "Coxa"),
  ];
}

/** São Jerônimo: o leão deita ao lado do livro aberto da Vulgata. */
function gestoJeronimo(t, c) {
  const Y = 154, X0 = 64, X1 = 80;
  const anda = [[0, [X0, Y - 3]], [6, [X0 + 4, Y - 5], "linear"], [12, [X0 + 8, Y - 3], "linear"], [18, [X0 + 12, Y - 5], "linear"], [24, [X1, Y - 3], "ease"], [32, [X1, Y]]];
  const leao = L("G_Leao", leaoShapes(), { p: anim(anda), s: anim([[0, [100, 100]], [24, [100, 100], "ease"], [32, [103, 96]]]), o: anim(aparecer(0, 6)) });
  const cauda = L("G_Cauda", [
    lib.makeEllipse(-44, -20, 3.4, 3.4, hex("#C1694F"), "Tufo"),
    stroke([lib.polyline([[-30, -4], [-38, -8], [-43, -17]])], 2.4, hex("#E8A84C"), "Rabo"),
  ], { a: [-30, -4], p: anim(deslocar(anda, [-30, -4])), r: anim([[0, 0], [32, 0], ...onda(0, 10, 32, END, { period: 22 })]), o: anim(aparecer(0, 6)) });
  const livro = L("G_Livro", livroAbertoShapes(44, 26, "#BE1931"), {
    p: [146, 120], r: -8, s: anim([[0, [4, 100]], ...abrir(20, 34, { axis: "x", from: 4 })]), o: anim(aparecer(20, 3)),
  });
  const estante = L("Estante", [
    stroke([reta([[146, 128], [146, 160]]), reta([[134, 162], [158, 162]])], 3.4, hex("#8A4633"), "Pe"),
    fill([poligono([[124, 124], [166, 118], [168, 124], [126, 130]])], "#A0522D", "Tampo"),
  ], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [livro, estante, leao, cauda];
  if (t >= 2) layers.unshift(L("T2_Galero", galeroShapes(48), {
    p: anim([[0, [56, 66]], [40, [56, 66], "ease"], [54, [56, 74]], ...flutuar([56, 74], 54, 1.5)]), r: -8, o: anim(aparecer(40, 8)),
  }));
  if (t >= 3) layers.push(aureola({ center: [116, 66], rx: 16, ry: 4.5, t0: 50, nm: "T3_Aureola" }), luzDoOuro(c, { x: 112, w1: 84, t0: 44 }));
  return layers;
}

// ── Tabela do lote 4 ─────────────────────────────────────────────────────────
/**
 * Os 24 litúrgicos de agosto e setembro, na ordem do calendário.
 * icon: peça principal do gesto (chave em ICONS ou DRAWN; uma diferente por
 * troféu, em todos os lotes). color: cor litúrgica (vermelho para os mártires e
 * apóstolos — Lourenço, Kolbe, Bartolomeu, Martírio de João Batista, Mateus,
 * Cosme e Damião — e para as festas da Cruz e da Paixão — Exaltação da Santa
 * Cruz; branco para as demais). halo: auréola de base que acende;
 * todo santo tem, menos os da lista SEM_HALO (festas sem santo e troféus em
 * que a tabela do guia põe a auréola só no ouro).
 */
const TROPHIES = [
  // Agosto
  { id: "lt_joao_vianney",      kind: "liturgical", icon: "desenho-confessionario",     color: "branco",   gesture: gestoVianney,             symbol: "o Cura d'Ars no confessionário" },
  { id: "lt_transfiguracao",    kind: "liturgical", icon: "desenho-transfiguracao",     color: "branco",   gesture: gestoTransfiguracao,      symbol: "Jesus de túnica branca e brilhante sobre o monte" },
  { id: "lt_domingos",          kind: "liturgical", icon: "desenho-cao-com-tocha",      color: "branco",   gesture: gestoDomingos,            halo: { center: [100, 62], rx: 14, ry: 4, t0: 40 }, symbol: "cachorrinho com a tocha acesa" },
  { id: "lt_lourenco",          kind: "liturgical", icon: "desenho-grelha",             color: "vermelho", gesture: gestoLourenco,            halo: { center: [96, 72], rx: 16, ry: 4.5, t0: 40 }, symbol: "grelha sobre as brasas" },
  { id: "lt_clara",             kind: "liturgical", icon: "desenho-clara-e-custodia",   color: "branco",   gesture: gestoClara,               halo: { center: naPose(CLARA.P, CLARA.A, CLARA.R, [0, BUSTO_MANTO_TOPO * CLARA.K]), rx: 11, ry: 3.2, t0: 34 }, symbol: "Santa Clara erguendo a custódia" },
  { id: "lt_kolbe",             kind: "liturgical", icon: "desenho-duas-coroas",        color: "vermelho", gesture: gestoKolbe,               symbol: "as coroas branca e vermelha" },
  { id: "lt_assuncao",          kind: "liturgical", icon: "desenho-assuncao",           color: "branco",   gesture: gestoAssuncao,            symbol: "Maria subindo entre nuvens" },
  { id: "lt_bernardo",          kind: "liturgical", icon: "desenho-colmeia",            color: "branco",   gesture: gestoBernardo,            symbol: "colmeia e abelhas" },
  { id: "lt_maria_rainha",      kind: "liturgical", icon: "desenho-maria-rainha",       color: "branco",   gesture: gestoMariaRainha,         halo: { center: [100, 96], r: 25, t0: 34 }, symbol: "Maria recebe a coroa" },
  { id: "lt_bartolomeu",        kind: "liturgical", icon: "desenho-evangelho-e-faca",   color: "vermelho", gesture: gestoBartolomeu,          symbol: "Evangelho e faca do martírio" },
  { id: "lt_monica",            kind: "liturgical", icon: "desenho-monica-em-oracao",   color: "branco",   gesture: gestoMonica,              halo: { center: naPose(MONICA.P, MONICA.A, MONICA.R, [0, BUSTO_MANTO_TOPO * MONICA.K]), rx: 12, ry: 3.5, t0: 30 }, symbol: "Santa Mônica reza e chora" },
  { id: "lt_agostinho",         kind: "liturgical", icon: "desenho-coracao-e-seta",     color: "branco",   gesture: gestoAgostinho,           halo: { center: [100, 62], rx: 14, ry: 4, t0: 40 }, symbol: "coração em chamas atravessado pela seta" },
  { id: "lt_joao_batista_mart", kind: "liturgical", icon: "desenho-bandeja-e-palma",    color: "vermelho", gesture: gestoJoaoBatistaMartirio, symbol: "bandeja com a palma de mártir" },
  // Setembro
  { id: "lt_gregorio_magno",    kind: "liturgical", icon: "desenho-papa-e-pomba",       color: "branco",   gesture: gestoGregorio,            symbol: "a pomba no ombro do papa" },
  { id: "lt_natividade_maria",  kind: "liturgical", icon: "desenho-berco-e-estrela",    color: "branco",   gesture: gestoNatividadeMaria,     halo: { center: add(BERCO, add(BEBE, [0, -8])), rx: 7, ry: 2, t0: BERCO_PARA + 2 }, symbol: "berço e estrela" },
  { id: "lt_pedro_claver",      kind: "liturgical", icon: "desenho-correntes-partidas", color: "branco",   gesture: gestoPedroClaver,         symbol: "correntes partidas" },
  { id: "lt_exaltacao_cruz",    kind: "liturgical", icon: "desenho-cruz-gloriosa",      color: "vermelho",   gesture: gestoExaltacao,           symbol: "a cruz se ergue e brilha" },
  { id: "lt_dores_maria",       kind: "liturgical", icon: "desenho-sete-espadas",       color: "branco",   gesture: gestoDores,               halo: { center: [100, 56], rx: 14, ry: 4, t0: 40 }, symbol: "coração com sete espadas" },
  { id: "lt_mateus",            kind: "liturgical", icon: "desenho-anjo-sobre-livro",   color: "vermelho", gesture: gestoMateus,              symbol: "anjo sobre o livro aberto" },
  { id: "lt_pio_pietrelcina",   kind: "liturgical", icon: "desenho-padre-pio",          color: "branco",   gesture: gestoPio,                 symbol: "Padre Pio ergue as mãos com luvas" },
  { id: "lt_cosme_damiao",      kind: "liturgical", icon: "desenho-medicos",            color: "vermelho", gesture: gestoCosmeDamiao,         symbol: "dois médicos, caixa de remédios e almofariz" },
  { id: "lt_vicente_paulo",     kind: "liturgical", icon: "desenho-vicente-e-crianca",  color: "branco",   gesture: gestoVicente,             symbol: "São Vicente acolhe uma criança" },
  { id: "lt_arcanjos",          kind: "liturgical", icon: "desenho-tres-arcanjos",      color: "branco",   gesture: gestoArcanjos,            halo: { center: [100, 62], rx: 14, ry: 4, t0: 40 }, symbol: "três pares de asas: espada, lírio e peixe" },
  { id: "lt_jeronimo",          kind: "liturgical", icon: "desenho-leao-e-vulgata",     color: "branco",   gesture: gestoJeronimo,            symbol: "leão deitado ao lado da Vulgata" },
];

/** Litúrgicos sem auréola de base, com o motivo (os demais santos têm `halo`). */
const SEM_HALO = {
  lt_joao_vianney: "auréola só no ouro",
  lt_transfiguracao: "festa sem santo",
  lt_kolbe: "auréola só no ouro",
  lt_assuncao: "auréola só no ouro (a coroa de 12 estrelas em volta da cabeça de Maria)",
  lt_bernardo: "auréola só no ouro",
  lt_bartolomeu: "auréola só no ouro",
  lt_joao_batista_mart: "auréola só no ouro (com a coroa de mártir)",
  lt_gregorio_magno: "auréola só no ouro",
  lt_pedro_claver: "auréola só no ouro",
  lt_exaltacao_cruz: "festa sem santo",
  lt_mateus: "auréola só no ouro",
  lt_pio_pietrelcina: "auréola só no ouro",
  lt_cosme_damiao: "auréola só no ouro (as duas)",
  lt_vicente_paulo: "auréola só no ouro",
  lt_jeronimo: "auréola só no ouro",
};

module.exports = { ICONS, DRAWN, TROPHIES, SEM_HALO, TIERS: kit.TIERS, LITURGICAL_COLORS: kit.LITURGICAL_COLORS, buildTrophy, checkUniqueIcons, checkUniqueIds };

if (require.main === module) main(TROPHIES, { self: __filename });
