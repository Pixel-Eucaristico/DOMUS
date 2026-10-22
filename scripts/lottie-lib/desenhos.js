/**
 * desenhos — formas desenhadas no próprio código (sem fonte externa) e
 * camadas de efeito reaproveitáveis pelos lotes de troféus com gesto
 * (Story 11.7): retângulos e formas livres, hóstia, coroa de espinhos, vela
 * comprida, brilho, chuva de pedacinhos e pétala. Começaram no lote 2
 * (`scripts/trophy-lot-2.js`).
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

module.exports = { rect, forma, poligono, fill, hostiaShapes, espinhosShapes, velaComprida, brilho, chuva, petala };
