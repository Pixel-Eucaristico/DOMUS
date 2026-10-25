const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Assina o build de release com a chave de upload quando o Gradle recebe as
 * propriedades MYAPP_UPLOAD_* (a CI passa por ORG_GRADLE_PROJECT_MYAPP_UPLOAD_*,
 * a partir dos secrets ANDROID_KEYSTORE_*). Sem elas, mantém a chave de
 * depuração do template.
 *
 * O build.gradle é lido por blocos com chaves balanceadas (ignorando
 * comentários e strings), então `release{`, espaços extras e comentários entre
 * o nome e a chave não quebram a busca. Cada inserção tem seu próprio marcador
 * para que rodar o plugin de novo não duplique nada.
 */
const CONFIG_MARK = "// withReleaseSigning: signingConfigs.release";
const BUILD_TYPE_MARK = "// withReleaseSigning: buildTypes.release";

const HAS_UPLOAD_KEY = "project.hasProperty('MYAPP_UPLOAD_STORE_FILE')";
const RELEASE_SIGNING_LINE = `signingConfig ${HAS_UPLOAD_KEY} ? signingConfigs.release : signingConfigs.debug ${BUILD_TYPE_MARK}`;

function releaseConfigBlock(indent) {
  const i1 = indent;
  const i2 = indent + "    ";
  const i3 = i2 + "    ";
  return [
    `${i1}release {`,
    `${i2}${CONFIG_MARK}`,
    `${i2}if (${HAS_UPLOAD_KEY}) {`,
    `${i3}storeFile file(MYAPP_UPLOAD_STORE_FILE)`,
    `${i3}storePassword MYAPP_UPLOAD_STORE_PASSWORD`,
    `${i3}keyAlias MYAPP_UPLOAD_KEY_ALIAS`,
    `${i3}keyPassword MYAPP_UPLOAD_KEY_PASSWORD`,
    `${i2}}`,
    `${i1}}`,
  ].join("\n");
}

/**
 * Troca comentários e o conteúdo de strings por espaços, mantendo o tamanho e
 * as quebras de linha: os índices do texto mascarado valem no original.
 */
function maskCode(src) {
  const out = src.split("");
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " ";
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      const end = src.indexOf("\n", i);
      const stop = end < 0 ? src.length : end;
      blank(i, stop);
      i = stop;
    } else if (c === "/" && n === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\") j++;
        j++;
      }
      const stop = Math.min(j + 1, src.length);
      blank(i, stop);
      i = stop;
    } else {
      i++;
    }
  }
  return out.join("");
}

function matchBrace(masked, open) {
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === "{") depth++;
    else if (masked[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const WORD = /[\w$.]/;

/**
 * Procura `name { ... }` no nível de aninhamento de `from` (sem entrar em
 * blocos filhos) até `to`. Devolve os índices da chave de abertura e da de
 * fechamento, ou null.
 */
function findBlock(masked, name, from, to) {
  let depth = 0;
  for (let i = from; i < to; i++) {
    const c = masked[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (
      depth === 0 &&
      masked.startsWith(name, i) &&
      (i === 0 || !WORD.test(masked[i - 1])) &&
      !WORD.test(masked[i + name.length] || "")
    ) {
      let j = i + name.length;
      while (j < to && /\s/.test(masked[j])) j++;
      if (masked[j] === "{") {
        const close = matchBrace(masked, j);
        if (close < 0 || close > to) {
          throw new Error(`withReleaseSigning: bloco ${name} sem chave de fechamento`);
        }
        return { start: i, open: j, close };
      }
    }
  }
  return null;
}

function requireBlock(masked, name, from, to, path) {
  const block = findBlock(masked, name, from, to);
  if (!block) throw new Error(`withReleaseSigning: bloco ${path} não encontrado no build.gradle`);
  return block;
}

function locate(gradle) {
  const masked = maskCode(gradle);
  const android = requireBlock(masked, "android", 0, masked.length, "android");
  const signingConfigs = requireBlock(masked, "signingConfigs", android.open + 1, android.close, "android.signingConfigs");
  const buildTypes = requireBlock(masked, "buildTypes", android.open + 1, android.close, "android.buildTypes");
  const releaseType = requireBlock(masked, "release", buildTypes.open + 1, buildTypes.close, "android.buildTypes.release");
  const releaseConfig = findBlock(masked, "release", signingConfigs.open + 1, signingConfigs.close);
  return { masked, signingConfigs, releaseType, releaseConfig };
}

function lineIndent(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart))[0];
}

function addReleaseSigning(gradle) {
  let out = gradle;

  // 1) buildTypes.release: troca só a linha `signingConfig ...` do release.
  let loc = locate(out);
  const releaseBody = out.slice(loc.releaseType.open + 1, loc.releaseType.close);
  if (!releaseBody.includes(BUILD_TYPE_MARK)) {
    const maskedBody = loc.masked.slice(loc.releaseType.open + 1, loc.releaseType.close);
    const match = /(^|\n)([ \t]*)signingConfig\b[^\n]*/.exec(maskedBody);
    if (match) {
      const lineStart = loc.releaseType.open + 1 + match.index + match[1].length + match[2].length;
      let lineEnd = out.indexOf("\n", lineStart);
      if (lineEnd < 0) lineEnd = out.length;
      out = out.slice(0, lineStart) + RELEASE_SIGNING_LINE + out.slice(lineEnd);
    } else {
      const indent = lineIndent(out, loc.releaseType.start) + "    ";
      const at = loc.releaseType.open + 1;
      out = out.slice(0, at) + `\n${indent}${RELEASE_SIGNING_LINE}` + out.slice(at);
    }
  }

  // 2) signingConfigs: insere o bloco release logo após a abertura.
  loc = locate(out);
  const configsBody = out.slice(loc.signingConfigs.open + 1, loc.signingConfigs.close);
  if (!configsBody.includes(CONFIG_MARK)) {
    if (loc.releaseConfig) {
      throw new Error(
        "withReleaseSigning: android.signingConfigs já tem um bloco release que não é deste plugin",
      );
    }
    const indent = lineIndent(out, loc.signingConfigs.start) + "    ";
    const at = loc.signingConfigs.open + 1;
    out = out.slice(0, at) + "\n" + releaseConfigBlock(indent) + out.slice(at);
  }

  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = addReleaseSigning(mod.modResults.contents);
    return mod;
  });
};
module.exports.addReleaseSigning = addReleaseSigning;
module.exports.CONFIG_MARK = CONFIG_MARK;
module.exports.BUILD_TYPE_MARK = BUILD_TYPE_MARK;
