/**
 * Story 2.7: a versão do Node vem de um lugar só (`.nvmrc`). O `eas.json`
 * repete a versão exata em cada perfil, o `engines.node` do `package.json`
 * tem de aceitá-la e nenhum workflow do GitHub fixa `node-version:` à mão.
 * O `.gitlab-ci.yml` (legado) fica de fora de propósito.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// `semver` vem como dependência transitiva (sem tipos próprios no projeto).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const semver: { valid(v: string): string | null; satisfies(v: string, range: string): boolean } = require("semver");

const ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");

const ler = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Linhas do YAML sem as comentadas (`# ...`). */
function linhasAtivas(texto: string): string[] {
  return texto.split(/\r?\n/).filter((l) => !/^\s*#/.test(l));
}

/** Problemas de versão do Node num workflow, lido como texto. */
function problemasDoWorkflow(texto: string): string[] {
  const linhas = linhasAtivas(texto);
  const problemas: string[] = [];
  for (const l of linhas) {
    if (/^\s*node-version\s*:/.test(l)) problemas.push(`node-version fixo: "${l.trim()}"`);
  }
  const setupNode = linhas.filter((l) => /uses:\s*actions\/setup-node@/.test(l)).length;
  const comArquivo = linhas.filter((l) => /^\s*node-version-file:\s*\.nvmrc\s*$/.test(l)).length;
  if (setupNode !== comArquivo) {
    problemas.push(`${setupNode} setup-node, mas ${comArquivo} com node-version-file: .nvmrc`);
  }
  return problemas;
}

describe("versão do Node (.nvmrc, eas.json, engines e workflows)", () => {
  const nvmrc = ler(".nvmrc").trim();

  it(".nvmrc tem uma versão exata do Node 24", () => {
    expect(semver.valid(nvmrc), `.nvmrc inválido: "${nvmrc}"`).toBe(nvmrc);
    expect(nvmrc.split(".")[0]).toBe("24");
  });

  it("todo perfil de build do eas.json usa a versão do .nvmrc", () => {
    const eas = JSON.parse(ler("eas.json")) as { build: Record<string, { node?: string }> };
    const perfis = Object.keys(eas.build);
    expect(perfis.length).toBeGreaterThan(0);
    const divergentes = perfis.filter((p) => eas.build[p].node !== nvmrc).map((p) => `${p}: ${eas.build[p].node}`);
    expect(divergentes, `perfis do eas.json sem "node": "${nvmrc}"`).toEqual([]);
  });

  it("a versão do .nvmrc satisfaz engines.node do package.json", () => {
    const pkg = JSON.parse(ler("package.json")) as { engines?: { node?: string } };
    const faixa = pkg.engines?.node;
    expect(faixa, "package.json sem engines.node").toBeTruthy();
    expect(semver.satisfies(nvmrc, faixa as string), `${nvmrc} fora de "${faixa}"`).toBe(true);
  });

  it("nenhum workflow do GitHub fixa node-version: todos leem o .nvmrc", () => {
    const arquivos = fs.readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f));
    expect(arquivos.length).toBeGreaterThan(0);
    const problemas = arquivos.flatMap((f) =>
      problemasDoWorkflow(fs.readFileSync(path.join(WORKFLOWS_DIR, f), "utf8")).map((p) => `${f}: ${p}`),
    );
    expect(problemas).toEqual([]);
  });

  it("acusa node-version fixo e setup-node sem node-version-file; ignora linha comentada", () => {
    const fixo = "steps:\n  - uses: actions/setup-node@v5\n    with:\n      node-version: 20\n";
    expect(problemasDoWorkflow(fixo).length).toBeGreaterThan(0);
    const comentado = "steps:\n  # - uses: actions/setup-node@v5\n  #     node-version: 20\n";
    expect(problemasDoWorkflow(comentado)).toEqual([]);
    const certo = "steps:\n  - uses: actions/setup-node@v5\n    with:\n      node-version-file: .nvmrc\n";
    expect(problemasDoWorkflow(certo)).toEqual([]);
  });

  it("o formato do .gitlab-ci.yml (NODE_VERSION) não é acusado", () => {
    expect(problemasDoWorkflow('variables:\n  NODE_VERSION: "20"\nimage: node:20\n')).toEqual([]);
  });
});
