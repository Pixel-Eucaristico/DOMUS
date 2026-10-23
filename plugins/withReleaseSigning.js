const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Assina o build de release com a chave de upload quando o gradle.properties
 * traz MYAPP_UPLOAD_* (a CI grava esses valores a partir dos secrets
 * ANDROID_KEYSTORE_*). Sem eles, mantém a chave de depuração do template.
 */
const MARK = "// withReleaseSigning";

const RELEASE_CONFIG = `
        release {
            ${MARK}
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`;

function addReleaseSigning(gradle) {
  if (gradle.includes(MARK)) return gradle;

  const signingStart = gradle.indexOf("signingConfigs {");
  if (signingStart < 0) throw new Error("withReleaseSigning: bloco signingConfigs não encontrado");
  const insertAt = signingStart + "signingConfigs {".length;
  let out = gradle.slice(0, insertAt) + RELEASE_CONFIG + gradle.slice(insertAt);

  const releaseType = out.search(/buildTypes\s*\{[\s\S]*?release\s*\{/);
  if (releaseType < 0) throw new Error("withReleaseSigning: buildTypes.release não encontrado");
  const releaseBlock = out.indexOf("release {", out.indexOf("buildTypes", releaseType));
  const debugSigning = out.indexOf("signingConfig signingConfigs.debug", releaseBlock);
  if (debugSigning < 0) throw new Error("withReleaseSigning: signingConfig do release não encontrado");
  out =
    out.slice(0, debugSigning) +
    "signingConfig project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug" +
    out.slice(debugSigning + "signingConfig signingConfigs.debug".length);
  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = addReleaseSigning(mod.modResults.contents);
    return mod;
  });
};
module.exports.addReleaseSigning = addReleaseSigning;
