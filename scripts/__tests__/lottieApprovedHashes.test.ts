/**
 * D28: os Lottie aprovados pelo dono não mudam sem nova aprovação.
 * `assets/lottie/trophies/aprovados.sha256.json` guarda o sha256 de cada
 * arquivo de APPROVED_LOTTIE; depois de aprovar uma mudança, regravar com
 * `node scripts/lottie-approved-hashes.js`.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = require("../lottie-lib");

describe("lista de hash dos Lottie aprovados", () => {
  const lista: Record<string, string> = JSON.parse(fs.readFileSync(lib.APPROVED_HASHES, "utf8"));

  it("cobre todos os arquivos de APPROVED_LOTTIE, e só eles", () => {
    expect(Object.keys(lista).sort()).toEqual(lib.approvedFileList());
  });

  it("o sha256 de cada arquivo aprovado confere com a lista", () => {
    const atual: Record<string, string> = lib.computeApprovedHashes();
    expect(
      lib.compareApprovedHashes(lista, atual),
      "arquivo aprovado mudou sem atualizar aprovados.sha256.json (precisa de nova aprovação do dono)",
    ).toEqual({ changed: [], missing: [], extra: [] });
  });

  it("acusa arquivo aprovado alterado (cópia de lt_tome com o nível prata mudado)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aprovados-"));
    try {
      const nomes = ["lt_tome.json", "lt_tome_t2.json", "lt_tome_t3.json"];
      for (const f of nomes) fs.copyFileSync(path.join(path.dirname(lib.APPROVED_HASHES), f), path.join(dir, f));
      const reg = path.join(dir, "approved.ts");
      fs.writeFileSync(
        reg,
        [
          "export const APPROVED_LOTTIE = {",
          '  "lt_tome": {',
          '    base: () => require("@/assets/lottie/trophies/lt_tome.json"),',
          '    t2: () => require("@/assets/lottie/trophies/lt_tome_t2.json"),',
          '    t3: () => require("@/assets/lottie/trophies/lt_tome_t3.json"),',
          "  },",
          "};",
          "",
        ].join("\n"),
      );
      const gravada = Object.fromEntries(nomes.map((f) => [f, lista[f]!]));

      // cópia intacta confere com a lista real (inclusive com CRLF)
      expect(lib.compareApprovedHashes(gravada, lib.computeApprovedHashes({ file: reg, outDir: dir }))).toEqual({
        changed: [],
        missing: [],
        extra: [],
      });
      const t3 = path.join(dir, "lt_tome_t3.json");
      fs.writeFileSync(t3, fs.readFileSync(t3, "utf8").replace(/\n/g, "\r\n"));
      expect(lib.compareApprovedHashes(gravada, lib.computeApprovedHashes({ file: reg, outDir: dir })).changed).toEqual([]);

      // muda um valor do desenho do prata → acusado
      const t2 = path.join(dir, "lt_tome_t2.json");
      const json = JSON.parse(fs.readFileSync(t2, "utf8"));
      json.w = json.w + 1;
      fs.writeFileSync(t2, JSON.stringify(json));
      const diff = lib.compareApprovedHashes(gravada, lib.computeApprovedHashes({ file: reg, outDir: dir }));
      expect(diff).toEqual({ changed: ["lt_tome_t2.json"], missing: [], extra: [] });

      // arquivo novo no registro sem hash na lista → acusado como extra
      const semT3 = Object.fromEntries(Object.entries(gravada).filter(([f]) => f !== "lt_tome_t3.json"));
      expect(lib.compareApprovedHashes(semT3, lib.computeApprovedHashes({ file: reg, outDir: dir })).extra).toEqual([
        "lt_tome_t3.json",
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
