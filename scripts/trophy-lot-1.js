#!/usr/bin/env node
/**
 * trophy-lot-1.js — Story 11.7, lote 1 de Lottie dos troféus sem animação.
 *
 * Lote 1: os 3 sazonais sem Lottie e os 10 litúrgicos de janeiro. Todos com 3
 * níveis (como `getSeasonalTier`): x.json = bronze, x_t2 = prata, x_t3 = ouro.
 *
 * Segue `_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md`:
 * cada troféu tem um gesto próprio (tabela da §4), feito de 2 a 4 peças
 * animadas em camadas separadas (nome `G_*`), sem medalha nem disco em volta.
 * A prata acrescenta o que a tabela diz (camadas `T2_*`) e o ouro, o resto
 * (`T3_*`). A base comum fica discreta: os 5 brilhos e o halo mudam de cor e de
 * força por nível; a auréola dos litúrgicos é a mesma nos 3 níveis (só onde a
 * tabela põe a auréola no ouro ela aparece apenas no ouro).
 *
 * Fontes das peças (copiadas para a tabela comum `scripts/lottie-lib/icons.js`;
 * nada é baixado em tempo de execução):
 *  - Twemoji (https://github.com/jdecked/twemoji, v15.1.0), licença CC-BY 4.0
 *    — © Twitter, Inc. e colaboradores.
 *  - Bootstrap Icons (https://github.com/twbs/icons, v1.11.3), licença MIT
 *    — © The Bootstrap Authors.
 * Formas geométricas simples (mar, ondas, feixe de luz, raios, auréola,
 * cajado em T, confete, linha da pena) são desenhadas aqui mesmo, sem fonte
 * externa.
 *
 * Uso: node scripts/trophy-lot-1.js
 * Recusa (e não escreve) qualquer id que já esteja em APPROVED_LOTTIE.
 */
const lib = require("./lottie-lib");
const kit = require("./lottie-lib/trophy-kit");
const { anim, trajeto, pulo, queda, abrir, onda, aparecer, sumir, pop, pulsar, giro, hex } = lib;
const { END, RAY_GOLD, CONFETE_OURO, L, add, flutuar, deslocar, stroke, reta, aureola, raios, fracoes, pontosAoLongo } = kit;

// ── Peças (tabela comum em lottie-lib/icons.js: fonte e licença por ícone) ────
const { ICONS } = require("./lottie-lib/icons");

// ── Ajudas de peça (níveis, cores e base comum em lottie-lib/trophy-kit.js) ──
const { piece, pt, pieces, buildTrophy, checkUniqueIcons, checkUniqueIds, main } = kit.makeLot(ICONS);

// ── Gestos (tabela da §4 do guia) ────────────────────────────────────────────
// Cada gesto devolve as camadas da frente para trás. `t` = nível (1 bronze,
// 2 prata, 3 ouro); `c.col` = cor litúrgica.

/** 13º Bem Aplicado: a nota cai e entra no cofrinho, que dá um pulinho. */
function gestoDecimoTerceiro(t) {
  const NOTA = "twemoji-1f4b5";
  const pes = [100, 162];
  // `fica`: a nota termina metida na fenda, ainda à vista (quadro final do troféu parado)
  const nota = (nm, x, r0, t0, { size = 40, fica = false } = {}) => L(nm, piece(NOTA, size), {
    p: anim([[0, [x, 40]], ...queda([x, 40], [100, 104], t0, t0 + 20, { bounce: 0 })]),
    r: anim([[0, r0], [t0, r0], [t0 + 20, 0]]),
    s: anim([[0, 100], [t0 + 16, 100, "in"], [t0 + 24, fica ? [70, 45] : [60, 20]]]),
    o: anim(fica ? [[0, 0], [t0, 0], [t0 + 4, 100]] : [[0, 0], [t0, 0], [t0 + 4, 100], [t0 + 19, 100], [t0 + 25, 0]]),
  });
  const saltos = [[0, pes], ...pulo(pes, 28, { h: 8, d: 10 })];
  if (t >= 2) saltos.push(...pulo(pes, 50, { h: 8, d: 10 }));
  const cofre = L("G_Cofrinho", piece("bootstrap-piggy-bank-fill", 92, { fill: "#F4ABBA" }), {
    a: [0, 34], p: anim(saltos),
    s: anim(pop(0, 12, { over: 108 })),
    o: anim(aparecer(0, 6)),
    ...(t >= 2 ? { r: anim([[0, 0], ...onda(0, 6, 62, END, { period: 14 })]) } : {}),
  });

  const front = [], back = [];
  if (t >= 3) {
    front.push(L("T3_Estrela", piece("twemoji-2b50", 24), {
      p: anim([[0, [100, 104]], [64, [100, 104], "out"], [76, [100, 50]], ...flutuar([100, 50], 76, 2, 24)]),
      s: anim(pop(64, 10, { over: 125 })),
      r: anim([[0, 0], [64, 0, "out"], [76, 72]]),
      o: anim(aparecer(64, 3)),
    }));
    back.push(L("T3_BrilhoCofrinho", [lib.makeEllipse(0, 0, 46, 36, hex("#FFE8A3"), "Brilho")], {
      p: [100, 128], o: anim([...aparecer(40, 8, { to: 30 }), ...onda(30, 12, 48, END, { period: 20 })]),
    }));
    // chuva de notas ao fundo
    [[44, 42, -20], [156, 48, 18], [66, 56, 12]].forEach(([x, t0, r0], k) => {
      back.push(L(`T3_Chuva${k}`, piece(NOTA, 18), {
        p: anim([[0, [x, 30]], [t0, [x, 30], "linear"], [t0 + 26, [x + (k % 2 ? -8 : 8), 92]]]),
        r: anim([[0, r0], [t0, r0, "linear"], [t0 + 26, -r0]]),
        o: anim([[0, 0], [t0, 0], [t0 + 4, 100], [t0 + 20, 100], [t0 + 26, 0]]),
      }));
    });
  }
  const notas = [nota("G_Nota", 100, -14, 6)];
  if (t >= 2) notas.unshift(nota("T2_Nota2", 114, 12, 28, { fica: true }));
  return [...front, ...notas, cofre, ...back];
}

/** Verão Planejado: o sol nasce no horizonte e o mar ondula. */
function gestoFeriasVerao(t) {
  const solKeys = [[0, [100, 150]], [2, [100, 150], "out"], [34, [100, 92]], ...flutuar([100, 92], 34)];
  const sol = L("G_Sol", piece("twemoji-2600", 62), { p: anim(solKeys), r: anim(giro(45)), o: anim(aparecer(2, 14)) });

  // mar: faixa com a borda de cima em onda
  const top = Array.from({ length: 17 }, (_, k) => [28 + k * 9, 128 + (k % 2 ? 2.5 : -2.5)]);
  const topLine = lib.polyline(top);
  const corners = [[172, 164], [164, 172], [36, 172], [28, 164]];
  const mar = {
    v: [...topLine.v, ...corners], i: [...topLine.i, ...corners.map(() => [0, 0])],
    o: [...topLine.o, ...corners.map(() => [0, 0])], c: true,
  };
  const marLayer = L("G_Mar", [lib.makeFill([mar], hex("#3B88C3"), "Mar")], {
    p: anim(onda([0, 0], 1.5, 0, END, { period: 30, axis: 1 })), o: anim(aparecer(0, 8)),
  });
  const linha = (y, x0, x1) => lib.polyline(Array.from({ length: Math.round((x1 - x0) / 8) + 1 }, (_, k) => [x0 + k * 8, y + (k % 2 ? 2 : -2)]));
  const onda1 = L("G_Onda1", [stroke([linha(142, 44, 156)], 2.5, hex("#BBDDF5"), "Onda", { opacity: 85 })], {
    p: anim(onda([0, 0], 6, 0, END, { period: 45, axis: 0 })), o: anim(aparecer(0, 8)),
  });
  const onda2 = L("G_Onda2", [stroke([linha(158, 56, 144)], 2.5, hex("#BBDDF5"), "Onda", { opacity: 70 })], {
    p: anim(onda([0, 0], -6, 0, END, { period: 45, axis: 0 })), o: anim(aparecer(0, 8)),
  });

  const layers = [onda1, onda2];
  if (t >= 3) {
    const faixas = [[136, 36], [146, 26], [156, 16], [164, 8]].map(([y, w]) => reta([[-w / 2, y], [w / 2, y]]));
    layers.push(L("T3_Reflexo", [stroke(faixas, 3, RAY_GOLD, "Reflexo")], {
      p: [100, 0], s: anim([[0, 100], ...onda([100, 100], 18, 34, END, { period: 20, axis: 0 })]),
      o: anim(aparecer(30, 10, { to: 90 })),
    }));
  }
  layers.push(marLayer, sol);
  if (t >= 3) layers.push(raios("T3_Raios", anim(solKeys), { count: 16, r1: 36, r2: 48, half: 3.5, t0: 30, peak: 85 }));
  if (t >= 2) {
    layers.unshift(L("T2_Gaivota", piece("twemoji-1f426", 24, { recolor: { "#DD2E44": "#F5F8FA", "#A0041E": "#AAB8C2" } }), {
      p: anim(trajeto([[150, 54], [124, 44], [100, 50], [78, 42], [56, 46]], 16, 80)),
      r: anim([[0, 0], ...onda(0, 8, 16, 80, { period: 12 })]),
      o: anim([[0, 0], [16, 0], [22, 100]]),
    }));
  }
  return layers;
}

/** Balanço do Ano: barras sobem uma a uma e aparece um ✓. */
function gestoBalancoAnual(t) {
  const B = "twemoji-1f4ca", S = 96, C = [100, 108];
  const barra = (nm, el, baseX, t0) => {
    const a = pt(B, S, [baseX, 33]);
    return L(nm, piece(B, S, { only: [el] }), {
      a, p: add(C, a),
      s: anim([[0, [100, 0]], [t0, [100, 0], "out"], [t0 + 10, [100, 108]], [t0 + 14, [100, 100]]]),
    });
  };
  const eixo = L("Eixo", [stroke([reta([[-46, 0], [46, 0]])], 3, hex("#CCD6DD"), "Eixo")], {
    p: [100, 149.5], o: anim(aparecer(0, 6)),
  });
  const check = L("G_Check", piece("twemoji-2714", 34, { recolor: { "#31373D": "#77B255" } }), {
    p: [100, 52],
    s: anim([...pop(30, 12, { over: 125 }), ...(t >= 3 ? pulsar(48, END, { amp: 8, period: 21 }) : [])]),
    o: anim(aparecer(30, 3)),
  });
  const layers = [];
  if (t >= 3) layers.push(...lib.confete(0, CONFETE_OURO, { count: 6, t0: 42, area: [36, 30, 164, 120], nm: "T3_Confete" }));
  layers.push(check);
  if (t >= 3) {
    layers.push(raios("T3_BrilhoCheck", [100, 52], { count: 12, r1: 20, r2: 28, half: 4, t0: 42, peak: 85 }));
  }
  if (t >= 2) {
    layers.push(L("T2_Seta", piece("bootstrap-graph-up-arrow", 70, { fill: "#FFAC33" }), {
      p: anim([[0, [88, 122]], ...trajeto([[88, 122], [100, 106]], 22, 36)]),
      s: anim([[0, 70], [22, 70, "out"], [36, 100]]),
      o: anim(aparecer(22, 6)),
    }));
  }
  layers.push(barra("G_Barra3", 3, 26, 16), barra("G_Barra2", 4, 18, 10), barra("G_Barra1", 2, 10, 4), eixo);
  return layers;
}

/** Maria Mãe de Deus: coroa desce devagar sobre o manto azul, auréola acende. */
function gestoMariaMaeDeus(t, c) {
  const manto = lib.polyline([[100, 68], [118, 74], [127, 92], [129, 118], [136, 146], [144, 168], [100, 172],
    [56, 168], [64, 146], [71, 118], [73, 92], [82, 74]], { closed: true });
  const veste = lib.polyline([[100, 112], [110, 124], [115, 168], [85, 168], [90, 124]], { closed: true });
  const mantoLayer = L("G_Manto", [
    lib.makeEllipse(100, 97, 12, 15, hex("#FFDC5D"), "Rosto"),
    lib.makeFill([veste], hex("#F5F8FA"), "Veste"),
    lib.makeFill([manto], hex("#3D6FB6"), "Manto"),
  ], {
    p: anim([[0, [0, 10], "out"], [14, [0, 0]], ...flutuar([0, 0], 14, 1.5)]),
    o: anim(aparecer(0, 10)),
  });
  const coroa = L("G_Coroa", piece("twemoji-1f451", 34), {
    p: anim([[0, [100, 38]], [8, [100, 38], "ease"], [44, [100, 60]], ...flutuar([100, 60], 44, 1.5)]),
    o: anim(aparecer(8, 10)),
  });
  const layers = [coroa];
  if (t >= 3) layers.push(lib.luzSuave(0, c.col.luz, { nm: "T3_Luz", top: 24, bottom: 130, w0: 12, w1: 84, t0: 30, peak: 30 }));
  layers.push(mantoLayer);
  const estrelas = (nm, centers, size, ks) => L(nm, pieces("twemoji-2b50", size, centers), { p: [100, 94], a: [100, 94], ...ks });
  if (t >= 3) {
    const doze = Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
      return [100 + 46 * Math.cos(a), 94 + 46 * Math.sin(a)];
    });
    layers.push(estrelas("T3_DozeEstrelas", doze, 9, { r: anim(giro(30)), o: anim(aparecer(40, 12)) }));
  } else if (t >= 2) {
    layers.push(estrelas("T2_Estrelas", [[54, 62], [146, 62], [46, 112], [154, 112], [100, 34]], 11, {
      s: anim([[0, 100], ...pulsar(40, END, { amp: 5, period: 30 })]), o: anim(aparecer(36, 10)),
    }));
  }
  return layers;
}

/** Epifania: a estrela cruza o céu com rastro e para brilhando. */
function gestoEpifania(t) {
  const caminho = [[34, 96], [52, 72], [76, 58], [100, 60]];
  const passos = trajeto(caminho, 0, 34);
  const f = fracoes(caminho);
  const fim = passos.map(([tt, , cv], k) => [tt, f[k] * 100, cv]);
  // `fica`: fração do caminho que o início do corte deixa de percorrer (ele vai só até (1 − fica)·100),
  // então o rastro fica mais comprido durante todo o voo e parte dele continua à vista no fim
  const rastro = (nm, width, opacity, lag, fica = 0) => {
    if (!(fica >= 0 && fica < 1)) throw new Error(`rastro: fica ${fica} fora de [0, 1)`);
    return L(nm, [stroke([lib.polyline(caminho)], width, hex("#FFE8B6"), "Rastro", {
    opacity,
    trim: { e: anim(fim), s: anim([[0, 0], ...fim.map(([tt, v, cv]) => [tt + lag, v * (1 - fica), cv])]) },
    })], { p: [0, 0] });
  };
  const estrela = L("G_Estrela", piece("twemoji-2b50", 34), {
    p: anim([...passos, ...flutuar([100, 60], 44, 1.5)]),
    s: anim([[0, 80], [34, 80, "out"], [40, 125], [48, 100], ...pulsar(48, END, { amp: 6, period: 21 })]),
    r: anim([[0, -40], [34, 0]]),
    o: anim(aparecer(0, 4)),
  });
  const brilho = L("G_Brilho", [lib.makeRays(8, 20, 30, 6, hex("#FFE8B6"), "Brilho", [0, 0])], {
    p: [100, 60],
    s: anim([...pop(34, 10, { over: 120 }), ...pulsar(44, END, { amp: 6, period: 21 })]),
    r: anim(giro(45)),
    o: anim([...aparecer(34, 4, { to: 90 }), [50, 70]]),
  });
  const layers = [estrela, brilho, rastro("G_Rastro", 4, 85, 10)];
  // Na prata o rastro longo é o único acréscimo: parte dele fica à vista no
  // troféu parado. No ouro (os presentes são o acréscimo à vista) fica como foi aprovado.
  if (t >= 2) layers.push(rastro("T2_RastroLongo", 8, 35, 26, t === 2 ? 0.45 : 0));
  if (t >= 3) {
    const presentes = [
      [58, 42, { "#FDD888": "#FFCC4D", "#FCAB40": "#F4900C", "#DA2F47": "#FFF1C1" }],  // ouro
      [100, 48, { "#FDD888": "#E1E8ED", "#FCAB40": "#AAB8C2", "#DA2F47": "#9266CC" }], // incenso
      [142, 54, { "#FDD888": "#C1694F", "#FCAB40": "#8A4633", "#DA2F47": "#DD2E44" }], // mirra
    ];
    presentes.forEach(([x, t0, recolor], k) => {
      layers.unshift(L(`T3_Presente${k + 1}`, piece("twemoji-1f381", 32, { recolor }), {
        p: anim([[0, [x, 154]], ...pulo([x, 154], t0 + 10, { h: 6, d: 8 })]),
        s: anim(pop(t0, 10)), o: anim(aparecer(t0, 3)),
      }));
    });
  }
  return layers;
}

/** Batismo do Senhor: a pomba desce em voo; gota cai e faz ondas. */
function gestoBatismoSenhor(t, c) {
  const pomba = L("G_Pomba", piece("twemoji-1f54a", 54), {
    p: anim([...trajeto([[148, 46], [128, 54], [100, 68]], 0, 34), ...flutuar([100, 68], 34)]),
    r: anim([...onda(0, 6, 0, 30, { period: 10 }), [44, 0]]),
    o: anim(aparecer(0, 6)),
  });
  const gota = L("G_Gota", piece("twemoji-1f4a7", 14), {
    p: anim([[0, [100, 98]], ...queda([100, 98], [100, 146], 30, 42, { bounce: 0 })]),
    s: anim([[0, 100], [30, 100, "in"], [42, [85, 120]]]),
    o: anim([[0, 0], [30, 0], [32, 100], [41, 100], [43, 0]]),
  });
  const agua = hex("#BBDDF5");
  const layers = [pomba, gota];
  if (t >= 2) layers.push(lib.ondulacao(0, agua, { nm: "T2_OndaMaior", center: [100, 150], rx: 44, ry: 10, width: 2.5, t0: 48, dur: 30, rest: 35 }));
  layers.push(
    lib.ondulacao(0, agua, { nm: "G_Onda", center: [100, 150], rx: 26, ry: 6, t0: 42, dur: 26 }),
    L("Rio", [lib.makeEllipse(0, 0, 46, 9, hex("#3B88C3"), "Rio", 45)], { p: [100, 151], o: anim(aparecer(0, 10)) }),
  );
  if (t >= 3) layers.push(lib.luzSuave(0, c.col.luz, { nm: "T3_Luz", top: 24, bottom: 104, w0: 10, w1: 64, t0: 20, peak: 34 }));
  return layers;
}

/** Santo Antônio Abade: o porquinho trota ao centro, cajado em T atrás. */
function gestoAntonioAbade(t) {
  const pes = [100, 158];
  const trote = Array.from({ length: 7 }, (_, k) => [k * 5, [150 - (k * 50) / 6, k % 2 ? 154 : 158], "linear"]);
  const porco = L("G_Porco", piece("twemoji-1f416", 66), {
    a: [0, 27], p: anim(trote),
    r: anim([...onda(0, 4, 0, 30, { period: 10 }), ...onda(0, 2, 34, END, { period: 28 })]),
    o: anim(aparecer(0, 5)),
  });
  const tau = [reta([[-2.5, -94], [2.5, -94], [2.5, 0], [-2.5, 0]]), reta([[-14, -100], [14, -100], [14, -94], [-14, -94]])];
  tau.forEach((s) => { s.c = true; });
  const cajado = L("G_Cajado", [lib.makeFill(tau, hex("#C1694F"), "Cajado")], {
    p: [140, 162],
    s: anim([[0, [100, 0]], [26, [100, 0], "out"], [38, [100, 100]]]),
    o: anim(aparecer(26, 4)),
  });
  const layers = [porco, cajado];
  if (t >= 2) {
    layers.unshift(L("T2_Sino", piece("twemoji-1f514", 16), {
      a: pt("twemoji-1f514", 16, [18, 0]), p: [132, 68],
      r: anim([[0, 0], ...onda(0, 18, 40, END, { period: 16 })]),
      o: anim(aparecer(38, 6)),
    }));
  }
  if (t >= 3) layers.push(aureola({ center: [100, 64], r: 20, t0: 40, nm: "T3_Aureola" }), raios("T3_Raios", [100, 64], { r2: 38, t0: 44 }));
  return layers;
}

/** Seta (da peça arco e flecha) que chega na direção da ponta e para tremendo. */
function flecha(nm, fim, { r = 0, flip = false, t0 = 0, dist = 40 } = {}) {
  const ICON = "twemoji-1f3f9", S = 56;
  const rad = (r * Math.PI) / 180;
  const dx0 = flip ? 1 : -1, dy0 = -1;
  const dir = [(dx0 * Math.cos(rad) - dy0 * Math.sin(rad)) / Math.SQRT2, (dx0 * Math.sin(rad) + dy0 * Math.cos(rad)) / Math.SQRT2];
  const inicio = [fim[0] - dir[0] * dist, fim[1] - dir[1] * dist];
  return L(nm, piece(ICON, S, { only: [2, 3, 4, 5, 6, 7, 8, 9, 10] }), {
    a: pt(ICON, S, [16, 16]),
    p: anim([[0, inicio], [t0, inicio, "in"], [t0 + 8, fim]]),
    r: anim([[0, r], [t0 + 8, r], ...onda(r, 3, t0 + 8, t0 + 20, { period: 6 })]),
    s: flip ? [-100, 100] : 100,
    o: anim([[0, 0], [t0, 0], [t0 + 2, 100]]),
  });
}

/** Palma do martírio (folhagem) em pé, com o caule embaixo. */
const palma = (nm, size, ks) => L(nm, piece("twemoji-1f33f", size), { r: -45, ...ks });

/** São Sebastião: flechas chegam e param; palma do martírio sobe. */
function gestoSebastiao(t) {
  const layers = [
    palma("G_Palma", 54, {
      p: anim([[0, [100, 136]], [24, [100, 136], "out"], [44, [100, 112]], ...flutuar([100, 112], 44)]),
      o: anim(aparecer(24, 8)),
    }),
  ];
  if (t >= 2) layers.push(flecha("T2_Flecha3", [100, 120], { r: 45, t0: 20, dist: 20 }));
  layers.push(flecha("G_Flecha2", [86, 116], { flip: true, t0: 12 }), flecha("G_Flecha1", [114, 116], { t0: 4 }));
  if (t >= 3) {
    layers.push(L("T3_Coroa", piece("twemoji-1f451", 28), {
      p: anim([[0, [100, 40]], [48, [100, 40], "ease"], [62, [100, 52]], ...flutuar([100, 52], 62, 1.5)]),
      o: anim(aparecer(48, 8)),
    }));
  }
  return layers;
}

/** Santa Inês: o cordeiro deita; a palma se abre por cima. */
function gestoInes(t, c) {
  const P = "twemoji-1f33f", PS = 46;
  const cordeiro = L("G_Cordeiro", piece("twemoji-1f411", 64), {
    a: [0, 32], p: anim([[0, [128, 160]], [16, [100, 160]]]),
    s: anim([[0, 100], [20, 100, "ease"], [32, [106, 84]]]),
    o: anim(aparecer(0, 6)),
  });
  const palmaLayer = L("G_Palma", piece(P, PS), {
    a: pt(P, PS, [4.75, 35]), p: [74, 92], r: anim([[0, 45], [46, 45], ...onda(45, 3, 46, END, { period: 30 })]),
    s: anim([[0, 0], ...abrir(30, 46, { axis: "xy" })]),
    o: anim(aparecer(30, 4)),
  });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Coroa", piece("twemoji-1f451", 26), {
      p: anim([[0, [100, 42]], [50, [100, 42], "ease"], [64, [100, 52]], ...flutuar([100, 52], 64, 1.5)]),
      o: anim(aparecer(50, 8)),
    }));
  }
  layers.push(palmaLayer);
  if (t >= 2) {
    const L1 = "twemoji-269c";
    layers.push(L("T2_Lirio", piece(L1, 30, { recolor: { "#744EAA": "#CCD6DD", "#AA8DD8": "#FFFFFF", "#9266CC": "#FFCC4D" } }), {
      a: pt(L1, 30, [18, 36]), p: [156, 164],
      s: anim(abrir(40, 54, { axis: "y" })), o: anim(aparecer(40, 4)),
    }));
  }
  layers.push(cordeiro);
  if (t >= 3) layers.push(lib.luzSuave(0, c.col.luz, { nm: "T3_Luz", top: 24, bottom: 132, w0: 10, w1: 70, t0: 40, peak: 30 }));
  return layers;
}

/** São Francisco de Sales: a pena escreve uma linha que vira coração. */
function gestoFranciscoSales(t) {
  const H = "twemoji-2764", HS = 64, HC = [100, 112];
  const contorno = lib.parsePath(ICONS[H].elements[0].d, 18, 18, HS / 36, HC[0], HC[1]);
  const passos = pontosAoLongo(contorno[0], 17);
  const PENA = "twemoji-1fab6", PS = 44;
  const pena = L("G_Pena", piece(PENA, PS), {
    a: pt(PENA, PS, [0.6, 35.4]),
    p: anim([[0, passos[0]], ...passos.map((q, k) => [4 + k * 2, q, "linear"]), [44, [128, 72]]]),
    o: anim([[0, 0], [2, 0], [4, 100], [38, 100], [46, 0]]),
  });
  const linha = L("G_Linha", [stroke(contorno, 3.5, hex("#F4ABBA"), "Linha", { trim: { e: anim([[0, 0], [4, 0, "linear"], [36, 100]]) } })], {
    p: [0, 0], o: anim([[0, 100], [40, 100], [48, 0]]),
  });
  const coracao = L("G_Coracao", piece(H, HS), {
    p: HC,
    s: anim([...pop(34, 12, { over: 112 }), ...(t >= 2 ? pulsar(48, END, { amp: 7, period: 15 }) : [])]),
    o: anim(aparecer(34, 4)),
  });
  const layers = [pena, linha, coracao];
  if (t >= 3) {
    const F = "twemoji-1f525";
    layers.push(L("T3_Chamas", piece(F, 28), {
      a: pt(F, 28, [18, 36]), p: [100, 92],
      s: anim([...pop(44, 8, { over: 110 }), ...onda([100, 100], 10, 52, END, { period: 10, axis: 1 })]),
      o: anim(aparecer(44, 4)),
    }));
  }
  if (t >= 2) {
    layers.push(L("T2_Pulso", [stroke(contorno, 2.5, hex("#F4ABBA"), "Pulso")], {
      p: HC, a: HC,
      s: anim([[0, 100], [50, 100, "out"], [64, 135, "linear"], [65, 100, "out"], [END - 1, 125]]),
      o: anim([[0, 0], [50, 0, "linear"], [51, 70], [64, 0, "linear"], [65, 70], [END - 1, 25]]),
    }));
  }
  return layers;
}

/** Conversão de São Paulo: clarão de luz desce do alto (⚡ do app) e a espada aparece. */
function gestoConvPaulo(t, c) {
  const raio = L("G_Raio", piece("twemoji-26a1", 38), {
    p: anim([[0, [100, 42]], [2, [100, 42], "in"], [10, [100, 58]], ...onda([100, 58], 2, 10, 22, { period: 4, axis: 0 }), ...flutuar([100, 58], 30, 1.5)]),
    s: anim([[0, 100], [10, 100, "out"], [14, 118], [20, 100]]),
    o: anim(aparecer(2, 4)),
  });
  const espada = L("G_Espada", piece("twemoji-1f5e1", 50), {
    p: [100, 112],
    r: anim([[0, -225], [16, -225, "out"], [30, -45]]),
    s: anim(pop(16, 14, { over: 110 })),
    o: anim(aparecer(16, 4)),
  });
  const luz = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", top: 24, bottom: 136, w0: 16, w1: 90, t0: 2, dur: 10, peak: 45 });
  const layers = [raio, espada];
  if (t >= 3) {
    layers.push(L("T3_Livro", piece("bootstrap-book-fill", 36, { fill: "#FFE8B6" }), {
      p: [100, 162], s: anim(abrir(36, 48, { axis: "x", from: 4 })), o: anim(aparecer(36, 3)),
    }));
  }
  if (t >= 2) layers.push(raios("T2_Raios", [100, 58], { count: 10, r1: 25, r2: 35, half: 5, t0: 10, peak: 80, color: hex("#FFE8A3") }));
  layers.push(luz);
  return layers;
}

/** São Tomás de Aquino: o livro se abre e um sol pequeno nasce das páginas. */
function gestoTomasAquino(t) {
  const solKeys = [[0, [100, 128]], [20, [100, 128], "out"], [40, [100, 80]], ...flutuar([100, 80], 40)];
  const sol = L("G_Sol", piece("twemoji-2600", 30), {
    p: anim(solKeys), s: anim([[0, 30], [20, 30, "out"], [40, 100]]), r: anim(giro(45)), o: anim(aparecer(20, 6)),
  });
  const livro = L("G_Livro", piece("twemoji-1f4d6", 76), {
    p: [100, 142], s: anim(abrir(4, 18, { axis: "x", from: 6 })), o: anim(aparecer(2, 4)),
  });
  const layers = [sol, livro];
  if (t >= 2) {
    layers.unshift(L("T2_Pomba", piece("twemoji-1f54a", 26), {
      p: anim([[0, [162, 74]], [30, [162, 74], "out"], [46, [144, 96]], ...flutuar([144, 96], 46)]),
      o: anim([[0, 0], [30, 0], [34, 100]]),
    }));
  }
  if (t >= 3) layers.push(raios("T3_Raios", anim(solKeys), { count: 16, r1: 22, r2: 32, half: 3, t0: 40, peak: 85 }));
  return layers;
}

/** São João Bosco: a criança pula e duas mãos de acolhimento aparecem. */
function gestoJoaoBosco(t) {
  const C = "twemoji-1f9d2", CS = 48;
  const x = t >= 2 ? 86 : 100;
  const saltos = [[0, [x, 116]], ...pulo([x, 116], 10, { h: 14, d: 12, n: 2, gap: 4 }), ...flutuar([x, 116], 38, 1.5)];
  const crianca = L("G_Crianca", piece(C, CS), { a: [0, 21], p: anim(saltos), o: anim(aparecer(0, 6)) });
  const maos = L("G_Maos", piece("twemoji-1f932", 56), {
    p: anim([[0, [100, 154]], [28, [100, 154], "out"], [40, [100, 148]]]), o: anim(aparecer(28, 6)),
  });
  const layers = [];
  if (t >= 3) {
    layers.push(...lib.confete(0, [hex("#FFCC4D"), hex("#55ACEE"), hex("#DD2E44"), hex("#77B255")], {
      count: 6, t0: 40, area: [36, 30, 164, 110], seed: 11, nm: "T3_Confete",
    }));
    layers.push(aureola({ rx: 14, ry: 4.5, t0: 40, p: anim(deslocar(saltos, [0, -50])), nm: "T3_Aureola" }));
  }
  layers.push(crianca);
  if (t >= 2) {
    const B = "twemoji-1f466";
    layers.push(L("T2_Crianca2", piece(B, 34), {
      a: [0, 16], p: anim([[0, [132, 122]], ...pulo([132, 122], 18, { h: 10, d: 10, n: 2, gap: 6 })]), o: anim(aparecer(0, 6)),
    }));
  }
  layers.push(maos);
  return layers;
}

// ── Tabela do lote 1 ─────────────────────────────────────────────────────────
/**
 * kind: "seasonal" | "liturgical" (ambos com 3 níveis).
 * icon: peça principal do gesto (chave em ICONS; uma diferente por troféu).
 * gesture: função do gesto. halo: auréola dos litúrgicos que acende (centro e
 * raio `r`, ou `rx`/`ry` para a auréola elíptica por cima do desenho). Sem halo:
 * Epifania (festa sem santo: a estrela brilha no lugar) e os troféus em que a
 * tabela do guia põe a auréola só no ouro (Antônio Abade, João Bosco).
 */
const TROPHIES = [
  // Sazonais
  { id: "seasonal_decimo_terceiro", kind: "seasonal", icon: "bootstrap-piggy-bank-fill", gesture: gestoDecimoTerceiro, symbol: "nota que entra no cofrinho (13º bem aplicado)" },
  { id: "seasonal_ferias_verao",    kind: "seasonal", icon: "twemoji-2600",  gesture: gestoFeriasVerao,  symbol: "sol nascendo sobre o mar" },
  { id: "seasonal_balanco_anual",   kind: "seasonal", icon: "twemoji-1f4ca", gesture: gestoBalancoAnual, symbol: "barras do balanço e ✓" },
  // Litúrgicos de janeiro
  { id: "lt_maria_mae_deus",  kind: "liturgical", icon: "twemoji-1f451", color: "branco",   gesture: gestoMariaMaeDeus,   halo: { center: [100, 94], r: 34, t0: 44 }, symbol: "coroa sobre o manto azul de Maria" },
  { id: "lt_epifania",        kind: "liturgical", icon: "twemoji-2b50",  color: "branco",   gesture: gestoEpifania,       symbol: "estrela de Belém que guiou os Magos" },
  { id: "lt_batismo_senhor",  kind: "liturgical", icon: "twemoji-1f54a", color: "branco",   gesture: gestoBatismoSenhor,  halo: { center: [100, 34], rx: 20, ry: 5.5, t0: 34 }, symbol: "pomba do Espírito Santo sobre o Jordão" },
  { id: "lt_antonio_abade",   kind: "liturgical", icon: "twemoji-1f416", color: "branco",   gesture: gestoAntonioAbade,   symbol: "porco e cajado em T de Santo Antão" },
  { id: "lt_sebastiao",       kind: "liturgical", icon: "twemoji-1f3f9", color: "vermelho", gesture: gestoSebastiao,      halo: { center: [100, 68], rx: 16, ry: 5, t0: 44 }, symbol: "flechas e palma do martírio" },
  { id: "lt_ines",            kind: "liturgical", icon: "twemoji-1f411", color: "vermelho", gesture: gestoInes,           halo: { center: [76, 126], r: 13, t0: 36 }, symbol: "cordeiro (Agnes ↔ agnus) e palma" },
  { id: "lt_francisco_sales", kind: "liturgical", icon: "twemoji-1fab6", color: "branco",   gesture: gestoFranciscoSales, halo: { center: [100, 62], rx: 20, ry: 5.5, t0: 46 }, symbol: "pena que escreve um coração" },
  { id: "lt_conv_paulo",      kind: "liturgical", icon: "twemoji-26a1",  color: "branco",   gesture: gestoConvPaulo,      halo: { center: [100, 30], rx: 18, ry: 5, t0: 12 }, symbol: "clarão de luz e espada de São Paulo" },
  { id: "lt_tomas_aquino",    kind: "liturgical", icon: "twemoji-1f4d6", color: "branco",   gesture: gestoTomasAquino,    halo: { center: [100, 40], rx: 16, ry: 4.5, t0: 40 }, symbol: "livro aberto e sol da sabedoria" },
  { id: "lt_joao_bosco",      kind: "liturgical", icon: "twemoji-1f9d2", color: "branco",   gesture: gestoJoaoBosco,      symbol: "criança acolhida, patrono dos jovens" },
];

/** Litúrgicos sem auréola de base, com o motivo (os demais santos têm `halo`). */
const SEM_HALO = {
  lt_epifania: "festa sem santo",
  lt_antonio_abade: "auréola só no ouro",
  lt_joao_bosco: "auréola só no ouro",
};

module.exports = { ICONS, TROPHIES, SEM_HALO, TIERS: kit.TIERS, LITURGICAL_COLORS: kit.LITURGICAL_COLORS, buildTrophy, checkUniqueIcons, checkUniqueIds };

if (require.main === module) main(TROPHIES, { self: __filename });
