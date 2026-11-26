const fs = require("fs");
const path = require("path");
const plist = require("@expo/plist");
const { IOSConfig, withInfoPlist } = require("expo/config-plugins");

/**
 * Deriva REVERSED_CLIENT_ID a partir de um CLIENT_ID OAuth iOS
 * (ex.: "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc").
 */
function deriveReversedClientId(clientId) {
  if (!clientId || typeof clientId !== "string") return null;
  const trimmed = clientId.trim();
  if (!trimmed || !trimmed.includes(".")) return null;
  return trimmed.split(".").reverse().join(".");
}

/**
 * Extrai CLIENT_ID e REVERSED_CLIENT_ID do conteúdo XML de um GoogleService-Info.plist.
 * Campos ausentes ou XML malformado retornam nulls sem interromper o prebuild.
 */
function extractGoogleIosCredentials(plistContents) {
  if (!plistContents || typeof plistContents !== "string") {
    return { clientId: null, reversedClientId: null };
  }

  try {
    const parsed = plist.default ? plist.default.parse(plistContents) : plist.parse(plistContents);
    const clientId =
      typeof parsed?.CLIENT_ID === "string" && parsed.CLIENT_ID.trim()
        ? parsed.CLIENT_ID.trim()
        : null;
    const reversedClientId =
      typeof parsed?.REVERSED_CLIENT_ID === "string" && parsed.REVERSED_CLIENT_ID.trim()
        ? parsed.REVERSED_CLIENT_ID.trim()
        : null;

    return { clientId, reversedClientId };
  } catch {
    return { clientId: null, reversedClientId: null };
  }
}

/**
 * Aplica GIDClientID e URL Scheme (REVERSED_CLIENT_ID) no Info.plist iOS de forma idempotente
 * e sem mutar o objeto ou os arrays originais de `infoPlist`.
 */
function applyDomusGoogleAuthToInfoPlist(infoPlist, credentials) {
  let updated = {
    ...infoPlist,
    ...(Array.isArray(infoPlist?.CFBundleURLTypes)
      ? {
          CFBundleURLTypes: infoPlist.CFBundleURLTypes.map((entry) =>
            entry && typeof entry === "object"
              ? {
                  ...entry,
                  ...(Array.isArray(entry.CFBundleURLSchemes)
                    ? { CFBundleURLSchemes: [...entry.CFBundleURLSchemes] }
                    : {}),
                }
              : entry,
          ),
        }
      : {}),
  };

  if (credentials?.clientId) {
    updated.GIDClientID = credentials.clientId;
  }

  if (credentials?.reversedClientId) {
    if (!IOSConfig.Scheme.hasScheme(credentials.reversedClientId, updated)) {
      updated = IOSConfig.Scheme.appendScheme(credentials.reversedClientId, updated);
    }
  }

  return updated;
}

/**
 * Config plugin do módulo local `domus-google-auth`.
 * No iOS, lê CLIENT_ID e REVERSED_CLIENT_ID de `GoogleService-Info.plist` (ou props explícitas)
 * e registra GIDClientID + CFBundleURLTypes no Info.plist para o GIDSignIn.
 */
function withDomusGoogleAuth(config, props = {}) {
  return withInfoPlist(config, (mod) => {
    let clientId =
      typeof props?.iosClientId === "string" && props.iosClientId.trim()
        ? props.iosClientId.trim()
        : null;
    let reversedClientId =
      typeof props?.iosUrlScheme === "string" && props.iosUrlScheme.trim()
        ? props.iosUrlScheme.trim()
        : null;

    const googleServicesFile = mod.ios?.googleServicesFile;
    if ((!clientId || !reversedClientId) && googleServicesFile) {
      const fullPath = path.resolve(mod.modRequest.projectRoot, googleServicesFile);
      if (fs.existsSync(fullPath)) {
        const contents = fs.readFileSync(fullPath, "utf8");
        const fromPlist = extractGoogleIosCredentials(contents);
        clientId = clientId || fromPlist.clientId;
        reversedClientId = reversedClientId || fromPlist.reversedClientId;
      }
    }

    if (!reversedClientId && clientId) {
      reversedClientId = deriveReversedClientId(clientId);
    }

    mod.modResults = applyDomusGoogleAuthToInfoPlist(mod.modResults, {
      clientId,
      reversedClientId,
    });
    return mod;
  });
}

module.exports = withDomusGoogleAuth;
module.exports.deriveReversedClientId = deriveReversedClientId;
module.exports.extractGoogleIosCredentials = extractGoogleIosCredentials;
module.exports.applyDomusGoogleAuthToInfoPlist = applyDomusGoogleAuthToInfoPlist;
