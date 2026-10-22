#!/usr/bin/env node
/**
 * Regrava `assets/lottie/trophies/aprovados.sha256.json` com o sha256 de cada
 * arquivo referenciado por `APPROVED_LOTTIE`
 * (src/components/gamification/approvedLottie.ts).
 *
 * Rodar só depois de o dono aprovar a mudança (novo troféu ou arquivo
 * aprovado alterado): o teste scripts/__tests__/lottieApprovedHashes.test.ts
 * falha se um arquivo aprovado mudar sem atualizar esta lista (D28).
 *
 * Uso: node scripts/lottie-approved-hashes.js           (regrava)
 *      node scripts/lottie-approved-hashes.js --check   (só confere; sai com 1 se diferente)
 */
const fs = require("fs");
const path = require("path");
const lib = require("./lottie-lib");

const hashes = lib.computeApprovedHashes();
const text = JSON.stringify(hashes, null, 2) + "\n";
const rel = path.relative(process.cwd(), lib.APPROVED_HASHES);

if (process.argv.includes("--check")) {
  // Compara o JSON lido (não os bytes): CRLF/indentação da lista não contam.
  let gravada = {};
  try {
    gravada = JSON.parse(fs.readFileSync(lib.APPROVED_HASHES, "utf8"));
  } catch {
    gravada = {};
  }
  const { changed, missing, extra } = lib.compareApprovedHashes(gravada, hashes);
  if (changed.length || missing.length || extra.length) {
    if (changed.length) console.error(`Alterados: ${changed.join(", ")}`);
    if (missing.length) console.error(`Fora de APPROVED_LOTTIE: ${missing.join(", ")}`);
    if (extra.length) console.error(`Sem hash na lista: ${extra.join(", ")}`);
    console.error(`${rel} está desatualizado: rode node scripts/lottie-approved-hashes.js depois da aprovação.`);
    process.exit(1);
  }
  console.log(`${rel} confere (${Object.keys(hashes).length} arquivos).`);
} else {
  fs.writeFileSync(lib.APPROVED_HASHES, text);
  console.log(`✓ ${rel}: ${Object.keys(hashes).length} arquivos.`);
}
