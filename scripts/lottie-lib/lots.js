/**
 * lots — registro dos lotes de troféus com gesto (Story 11.7).
 *
 * Cada lote novo entra aqui. O `main` de cada lote confere, contra todos os
 * lotes registrados, que nenhum id e nenhuma peça principal (`icon`) se
 * repete — dentro do lote e entre lotes, nos dois sentidos.
 */
const path = require("path");

/** Geradores registrados, na ordem dos lotes. */
const LOTS = ["trophy-lot-1.js", "trophy-lot-2.js"].map((f) => path.join(__dirname, "..", f));

/** [{ file, TROPHIES }] de todos os lotes registrados (carregados na hora). */
function registeredLots() {
  return LOTS.map((file) => {
    const mod = require(file);
    if (!Array.isArray(mod.TROPHIES)) throw new Error(`Lote sem TROPHIES exportado: ${file}`);
    return { file, TROPHIES: mod.TROPHIES };
  });
}

module.exports = { LOTS, registeredLots };
