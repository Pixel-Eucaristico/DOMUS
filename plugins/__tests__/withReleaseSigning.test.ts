/**
 * Plugin de assinatura do release sobre o build.gradle real do template do
 * Expo SDK 54 (`node_modules/expo/template.tgz`, expo 54.0.37), copiado em
 * `fixtures/expo54-app-build.gradle`.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../withReleaseSigning");
const addReleaseSigning: (gradle: string) => string = plugin.addReleaseSigning;
const CONFIG_MARK: string = plugin.CONFIG_MARK;
const BUILD_TYPE_MARK: string = plugin.BUILD_TYPE_MARK;

const TEMPLATE = fs.readFileSync(path.join(__dirname, "fixtures", "expo54-app-build.gradle"), "utf8");

/** Corpo (entre chaves) do primeiro bloco `name {` a partir de `from`. */
function blockBody(text: string, name: string, from = 0): string {
  const re = new RegExp(`\\b${name}\\s*(?:/\\*[\\s\\S]*?\\*/\\s*)?\\{`, "g");
  re.lastIndex = from;
  const m = re.exec(text);
  if (!m) throw new Error(`bloco ${name} não encontrado`);
  const open = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error(`bloco ${name} sem fechamento`);
}

function buildTypes(text: string) {
  const body = blockBody(text, "buildTypes");
  return { debug: blockBody(body, "debug"), release: blockBody(body, "release") };
}

function signingConfigs(text: string) {
  return blockBody(text, "signingConfigs");
}

const NEW_SIGNING =
  "signingConfig project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug";

describe("withReleaseSigning sobre o build.gradle do template SDK 54", () => {
  it("o fixture é o template sem alterações (sanidade)", () => {
    expect(TEMPLATE).not.toContain("withReleaseSigning");
    expect(buildTypes(TEMPLATE).release).toContain("signingConfig signingConfigs.debug");
  });

  it("adiciona signingConfigs.release com a chave de upload", () => {
    const out = addReleaseSigning(TEMPLATE);
    const configs = signingConfigs(out);
    const release = blockBody(configs, "release");
    expect(release).toContain(CONFIG_MARK);
    expect(release).toContain("storeFile file(MYAPP_UPLOAD_STORE_FILE)");
    expect(release).toContain("storePassword MYAPP_UPLOAD_STORE_PASSWORD");
    expect(release).toContain("keyAlias MYAPP_UPLOAD_KEY_ALIAS");
    expect(release).toContain("keyPassword MYAPP_UPLOAD_KEY_PASSWORD");
    // o debug do signingConfigs continua igual
    expect(blockBody(configs, "debug")).toBe(blockBody(signingConfigs(TEMPLATE), "debug"));
  });

  it("troca só a linha signingConfig de buildTypes.release", () => {
    const out = addReleaseSigning(TEMPLATE);
    const before = buildTypes(TEMPLATE);
    const after = buildTypes(out);
    expect(after.release).toContain(NEW_SIGNING);
    expect(after.release).toContain(BUILD_TYPE_MARK);
    expect(after.release).not.toMatch(/^\s*signingConfig signingConfigs\.debug\s*$/m);
    // o resto do release fica igual (comentário "Caution!", shrink, proguard…)
    const strip = (s: string) => s.split("\n").filter((l) => !/^\s*signingConfig\b/.test(l));
    expect(strip(after.release)).toEqual(strip(before.release));
    expect(after.debug).toBe(before.debug);
    expect(after.debug).toContain("signingConfig signingConfigs.debug");
  });

  it("só mexe nos dois pontos: o resto do arquivo é idêntico", () => {
    const out = addReleaseSigning(TEMPLATE);
    const reverted = out
      .replace(`${NEW_SIGNING} ${BUILD_TYPE_MARK}`, "signingConfig signingConfigs.debug")
      .replace(/\n {8}release \{\n {12}\/\/ withReleaseSigning: signingConfigs\.release[\s\S]*?\n {8}\}/, "");
    expect(reverted).toBe(TEMPLATE);
  });

  it("é idempotente: rodar de novo não muda nada", () => {
    const once = addReleaseSigning(TEMPLATE);
    const twice = addReleaseSigning(once);
    expect(twice).toBe(once);
    expect(twice.split(CONFIG_MARK).length - 1).toBe(1);
    expect(twice.split(BUILD_TYPE_MARK).length - 1).toBe(1);
  });

  it("aceita `release{`, espaços extras e comentários entre o nome e a chave", () => {
    const variant = TEMPLATE.replace("signingConfigs {", "signingConfigs   /* chaves */ {")
      .replace(/buildTypes \{/, "buildTypes\n    {")
      .replace(/(\n\s*)release \{/, "$1release{ // tipo release");
    expect(variant).toContain("release{ // tipo release");
    const out = addReleaseSigning(variant);
    expect(buildTypes(out).release).toContain(NEW_SIGNING);
    expect(buildTypes(out).debug).toBe(buildTypes(variant).debug);
    expect(blockBody(signingConfigs(out), "release")).toContain(CONFIG_MARK);
    expect(addReleaseSigning(out)).toBe(out);
  });

  it("ignora `release {` em comentários e fora de buildTypes", () => {
    const variant = TEMPLATE.replace(
      "    buildTypes {",
      "    // release { signingConfig signingConfigs.debug }\n    buildTypes {",
    );
    const out = addReleaseSigning(variant);
    expect(out).toContain("// release { signingConfig signingConfigs.debug }");
    expect(buildTypes(out).release).toContain(NEW_SIGNING);
  });

  it("insere a linha de assinatura se o release não tiver signingConfig", () => {
    const variant = TEMPLATE.replace(
      /(release \{[\s\S]*?)\n\s*signingConfig signingConfigs\.debug/,
      "$1",
    );
    expect(buildTypes(variant).release).not.toContain("signingConfig");
    const out = addReleaseSigning(variant);
    expect(buildTypes(out).release).toContain(NEW_SIGNING);
    expect(addReleaseSigning(out)).toBe(out);
  });

  it("falha com mensagem clara quando falta um bloco", () => {
    expect(() => addReleaseSigning(TEMPLATE.replace("buildTypes {", "tiposDeBuild {"))).toThrow(
      /android\.buildTypes não encontrado/,
    );
    expect(() => addReleaseSigning(TEMPLATE.replace("signingConfigs {", "assinaturas {"))).toThrow(
      /android\.signingConfigs não encontrado/,
    );
    const noRelease = TEMPLATE.replace(/(buildTypes \{[\s\S]*?)release \{/, "$1naoRelease {");
    expect(() => addReleaseSigning(noRelease)).toThrow(/android\.buildTypes\.release não encontrado/);
    expect(() => addReleaseSigning("apply plugin: 'x'\n")).toThrow(/android não encontrado/);
  });

  it("recusa signingConfigs.release que não é do plugin", () => {
    const variant = TEMPLATE.replace("signingConfigs {", "signingConfigs {\n        release {\n        }");
    expect(() => addReleaseSigning(variant)).toThrow(/já tem um bloco release/);
  });
});
