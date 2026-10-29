/**
 * Story 2.7: a versão do Node vem de um lugar só (`.nvmrc`). O `eas.json`
 * repete a versão exata em cada perfil, o `engines.node` do `package.json`
 * tem de aceitá-la e nenhum passo `actions/setup-node` dos workflows do GitHub
 * (nem de actions locais em `.github/actions/*`) fixa `node-version` à mão.
 * O `.gitlab-ci.yml` (legado) fica de fora de propósito.
 *
 * Os workflows são lidos com parser YAML (`yaml`, em devDependencies): aspas,
 * comentários, `./.nvmrc` e mapa em linha (`with: { node-version: 20 }`) saem
 * certos, sem os falsos positivos e negativos de ler o texto por regex.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import YAML from "yaml";

const ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");
const ACTIONS_DIR = path.join(ROOT, ".github", "actions");

const ler = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

type Versao = [number, number, number];

/** Versão exata `X.Y.Z` (sem `v`, sem pré-release); `null` se não for. */
function versaoExata(v: string): Versao | null {
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function comparar(a: Versao, b: Versao): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/**
 * `versao` dentro de `faixa`, para as formas usadas em `engines.node`:
 * alternativas com `||`, cada uma `^X.Y.Z`, `~X.Y.Z`, `>=X.Y.Z` ou `X.Y.Z`.
 * Forma fora dessas lança erro (o teste falha em vez de aceitar no escuro).
 */
function satisfaz(versao: string, faixa: string): boolean {
  const v = versaoExata(versao);
  if (!v) throw new Error(`versão inválida: "${versao}"`);
  return faixa.split("||").some((alt) => {
    const m = /^\s*(\^|~|>=)?\s*(\S+)\s*$/.exec(alt);
    const base = m ? versaoExata(m[2]) : null;
    if (!m || !base) throw new Error(`faixa não suportada: "${alt.trim()}"`);
    const op = m[1] ?? "";
    if (op === "") return comparar(v, base) === 0;
    if (comparar(v, base) < 0) return false;
    if (op === ">=") return true;
    if (op === "~") return v[0] === base[0] && v[1] === base[1];
    // ^: mesmo primeiro componente diferente de zero.
    if (base[0] !== 0) return v[0] === base[0];
    if (base[1] !== 0) return v[0] === 0 && v[1] === base[1];
    return comparar(v, base) === 0;
  });
}

type Passo = { uses?: unknown; with?: unknown };

const ehMapa = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/** Passos de um workflow (`jobs.*.steps`) ou de uma action composta (`runs.steps`). */
function passosDoDocumento(doc: unknown): Passo[] {
  if (!ehMapa(doc)) return [];
  const listas: unknown[] = [];
  if (ehMapa(doc.jobs)) for (const job of Object.values(doc.jobs)) if (ehMapa(job)) listas.push(job.steps);
  if (ehMapa(doc.runs)) listas.push(doc.runs.steps);
  return listas.flatMap((l) => (Array.isArray(l) ? l.filter(ehMapa) : []));
}

const ehSetupNode = (p: Passo) =>
  typeof p.uses === "string" && p.uses.trim().toLowerCase().startsWith("actions/setup-node@");

/** `.nvmrc` na raiz, em qualquer grafia aceita (`.nvmrc`, `./.nvmrc`, com aspas). */
const apontaParaNvmrc = (v: unknown) => typeof v === "string" && v.trim().replace(/^(\.\/)+/, "") === ".nvmrc";

/** Problemas de versão do Node nos passos `actions/setup-node` de um YAML. */
function problemasDoWorkflow(texto: string): string[] {
  const doc: unknown = YAML.parse(texto);
  const problemas: string[] = [];
  for (const passo of passosDoDocumento(doc).filter(ehSetupNode)) {
    const w = ehMapa(passo.with) ? passo.with : {};
    const uses = String(passo.uses);
    if ("node-version" in w) problemas.push(`${uses}: node-version fixo (${JSON.stringify(w["node-version"])})`);
    if (!apontaParaNvmrc(w["node-version-file"])) {
      problemas.push(`${uses}: sem node-version-file: .nvmrc (${JSON.stringify(w["node-version-file"])})`);
    }
  }
  return problemas;
}

/** Workflows e actions locais (`.github/actions/<nome>/action.y(a)ml`). */
function arquivosYaml(): string[] {
  const workflows = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => path.join(WORKFLOWS_DIR, f));
  const actions = fs.existsSync(ACTIONS_DIR)
    ? fs
        .readdirSync(ACTIONS_DIR)
        .flatMap((d) => ["action.yml", "action.yaml"].map((f) => path.join(ACTIONS_DIR, d, f)))
        .filter((f) => fs.existsSync(f))
    : [];
  return [...workflows, ...actions];
}

describe("versão do Node (.nvmrc, eas.json, engines e workflows)", () => {
  const nvmrc = ler(".nvmrc").trim();

  it(".nvmrc tem uma versão exata do Node 24", () => {
    const v = versaoExata(nvmrc);
    expect(v, `.nvmrc inválido: "${nvmrc}"`).not.toBeNull();
    expect(v?.[0]).toBe(24);
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
    expect(satisfaz(nvmrc, faixa as string), `${nvmrc} fora de "${faixa}"`).toBe(true);
  });

  it("comparação de versão: ^, ~, >=, exata e alternativas", () => {
    expect(satisfaz("24.22.2", "^22.12.0 || ^24.0.0")).toBe(true);
    expect(satisfaz("22.11.0", "^22.12.0 || ^24.0.0")).toBe(false);
    expect(satisfaz("25.0.0", "^22.12.0 || ^24.0.0")).toBe(false);
    expect(satisfaz("23.1.0", "^22.12.0 || ^24.0.0")).toBe(false);
    expect(satisfaz("24.22.2", ">=20.0.0")).toBe(true);
    expect(satisfaz("24.22.2", "~24.22.0")).toBe(true);
    expect(satisfaz("24.23.0", "~24.22.0")).toBe(false);
    expect(satisfaz("24.22.2", "24.22.2")).toBe(true);
    expect(satisfaz("0.3.1", "^0.2.0")).toBe(false);
    expect(() => satisfaz("24.22.2", "24.x")).toThrow();
    expect(versaoExata("v24.22.2")).toBeNull();
    expect(versaoExata("24.22")).toBeNull();
  });

  it("nenhum setup-node dos workflows e actions locais fixa node-version: todos leem o .nvmrc", () => {
    const arquivos = arquivosYaml();
    expect(arquivos.some((f) => f.startsWith(WORKFLOWS_DIR))).toBe(true);
    const problemas = arquivos.flatMap((f) =>
      problemasDoWorkflow(fs.readFileSync(f, "utf8")).map((p) => `${path.relative(ROOT, f)}: ${p}`),
    );
    expect(problemas).toEqual([]);
  });

  it("a leitura acha os setup-node dos workflows reais (o teste não passa no vazio)", () => {
    const total = arquivosYaml()
      .map((f) => passosDoDocumento(YAML.parse(fs.readFileSync(f, "utf8"))).filter(ehSetupNode).length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("aceita as grafias de .nvmrc, setup-node por SHA e comentário na linha", () => {
    const passo = (uses: string, w: string) => `jobs:\n  j:\n    steps:\n      - uses: ${uses}\n        with:\n${w}`;
    for (const valor of [".nvmrc", "'.nvmrc'", '".nvmrc"', "./.nvmrc", ".nvmrc # versão única"]) {
      expect(problemasDoWorkflow(passo("actions/setup-node@v5", `          node-version-file: ${valor}\n`)), valor).toEqual([]);
    }
    const porSha = passo(
      "actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0",
      "          node-version-file: .nvmrc\n          cache: npm\n",
    );
    expect(problemasDoWorkflow(porSha)).toEqual([]);
  });

  it("acusa node-version fixo (em bloco ou em mapa em linha) e setup-node sem node-version-file", () => {
    const emBloco = "jobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v5\n        with:\n          node-version: 20\n";
    expect(problemasDoWorkflow(emBloco).length).toBe(2);
    const emLinha = "jobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v5\n        with: { node-version-file: .nvmrc, node-version: 20 }\n";
    expect(problemasDoWorkflow(emLinha)).toHaveLength(1);
    const semWith = "jobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v5\n";
    expect(problemasDoWorkflow(semWith)).toHaveLength(1);
    const outroArquivo = "jobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v5\n        with:\n          node-version-file: package.json\n";
    expect(problemasDoWorkflow(outroArquivo)).toHaveLength(1);
    const composta = "runs:\n  using: composite\n  steps:\n    - uses: actions/setup-node@v5\n      with:\n        node-version: 24\n";
    expect(problemasDoWorkflow(composta).length).toBeGreaterThan(0);
  });

  it("ignora linhas comentadas, node-version fora de setup-node e o formato do .gitlab-ci.yml", () => {
    const comentado = "jobs:\n  j:\n    steps:\n      # - uses: actions/setup-node@v5\n      #     node-version: 20\n      - run: echo ok\n";
    expect(problemasDoWorkflow(comentado)).toEqual([]);
    const outraAction = "jobs:\n  j:\n    steps:\n      - uses: actions/setup-java@v5\n        with:\n          node-version: 20\n";
    expect(problemasDoWorkflow(outraAction)).toEqual([]);
    expect(problemasDoWorkflow('variables:\n  NODE_VERSION: "20"\nimage: node:20\n')).toEqual([]);
  });
});
