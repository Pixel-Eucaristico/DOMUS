import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../withDomusGoogleAuth");
const withDomusGoogleAuth: (
  config: Record<string, unknown>,
  props?: { iosClientId?: string; iosUrlScheme?: string },
) => {
  mods?: {
    ios?: {
      infoPlist?: (mod: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
    };
  };
} = plugin;
const deriveReversedClientId: (clientId: string) => string | null = plugin.deriveReversedClientId;
const extractGoogleIosCredentials: (xml: string) => {
  clientId: string | null;
  reversedClientId: string | null;
} = plugin.extractGoogleIosCredentials;
const applyDomusGoogleAuthToInfoPlist: (
  infoPlist: Record<string, unknown>,
  credentials: { clientId: string | null; reversedClientId: string | null },
) => Record<string, unknown> = plugin.applyDomusGoogleAuthToInfoPlist;

const PLIST_WITH_OAUTH = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CLIENT_ID</key>
  <string>1234567890-abc.apps.googleusercontent.com</string>
  <key>REVERSED_CLIENT_ID</key>
  <string>com.googleusercontent.apps.1234567890-abc</string>
  <key>BUNDLE_ID</key>
  <string>br.com.pixeleucaristico.domus</string>
</dict>
</plist>`;

const PLIST_WITHOUT_OAUTH = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>BUNDLE_ID</key>
  <string>br.com.pixeleucaristico.domus</string>
</dict>
</plist>`;

async function runInfoPlistMod(
  config: Record<string, unknown>,
  props: { iosClientId?: string; iosUrlScheme?: string } | undefined,
  projectRoot: string,
  initialInfoPlist: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const configured = withDomusGoogleAuth(config, props);
  const infoPlistMod = configured.mods?.ios?.infoPlist;
  if (!infoPlistMod) {
    throw new Error("mods.ios.infoPlist não registrado por withDomusGoogleAuth");
  }
  const modResult = await infoPlistMod({
    ...config,
    modRequest: { projectRoot },
    modResults: initialInfoPlist,
  });
  return modResult.modResults as Record<string, unknown>;
}

describe("withDomusGoogleAuth", () => {
  it("extrai CLIENT_ID e REVERSED_CLIENT_ID de GoogleService-Info.plist", () => {
    expect(extractGoogleIosCredentials(PLIST_WITH_OAUTH)).toEqual({
      clientId: "1234567890-abc.apps.googleusercontent.com",
      reversedClientId: "com.googleusercontent.apps.1234567890-abc",
    });
  });

  it("retorna nulls sem falhar quando GoogleService-Info.plist não possui CLIENT_ID/REVERSED_CLIENT_ID ou tem XML malformado", () => {
    expect(extractGoogleIosCredentials(PLIST_WITHOUT_OAUTH)).toEqual({
      clientId: null,
      reversedClientId: null,
    });
    expect(extractGoogleIosCredentials("<plist><dict><unclosed")).toEqual({
      clientId: null,
      reversedClientId: null,
    });
  });

  it("deriva REVERSED_CLIENT_ID corretamente a partir do CLIENT_ID", () => {
    expect(deriveReversedClientId("1234567890-abc.apps.googleusercontent.com")).toBe(
      "com.googleusercontent.apps.1234567890-abc",
    );
    expect(deriveReversedClientId("")).toBeNull();
  });

  it("lê o GoogleService-Info.plist real do repositório sem falhar", () => {
    const repoPlistPath = path.resolve(__dirname, "../../GoogleService-Info.plist");
    const xml = fs.readFileSync(repoPlistPath, "utf8");
    const creds = extractGoogleIosCredentials(xml);
    expect(creds).toHaveProperty("clientId");
    expect(creds).toHaveProperty("reversedClientId");
  });

  it("injeta GIDClientID e CFBundleURLTypes no Info.plist de forma idempotente e sem mutar o objeto original", () => {
    const creds = extractGoogleIosCredentials(PLIST_WITH_OAUTH);
    const originalSchemes = ["orcafacil"];
    const initial = {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: originalSchemes,
        },
      ],
    };

    const once = applyDomusGoogleAuthToInfoPlist(initial, creds);
    expect(once.GIDClientID).toBe("1234567890-abc.apps.googleusercontent.com");
    expect(originalSchemes).toEqual(["orcafacil"]);
    expect(initial.CFBundleURLTypes).toHaveLength(1);

    const schemes = (
      once.CFBundleURLTypes as { CFBundleURLSchemes?: string[] }[]
    ).flatMap((entry) => entry.CFBundleURLSchemes ?? []);
    expect(schemes).toContain("orcafacil");
    expect(schemes).toContain("com.googleusercontent.apps.1234567890-abc");

    const twice = applyDomusGoogleAuthToInfoPlist(once, creds);
    const schemesAfterTwice = (
      twice.CFBundleURLTypes as { CFBundleURLSchemes?: string[] }[]
    ).flatMap((entry) => entry.CFBundleURLSchemes ?? []);
    expect(
      schemesAfterTwice.filter((s) => s === "com.googleusercontent.apps.1234567890-abc"),
    ).toHaveLength(1);
  });

  it("mantém o Info.plist intacto quando credenciais estão ausentes", () => {
    const initial = { CFBundleDisplayName: "DOMUS" };
    const result = applyDomusGoogleAuthToInfoPlist(initial, {
      clientId: null,
      reversedClientId: null,
    });
    expect(result).toEqual(initial);
  });

  it("executa withDomusGoogleAuth(config) lendo plist temporário e registrando GIDClientID + scheme", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "domus-google-auth-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "GoogleService-Info.plist"), PLIST_WITH_OAUTH, "utf8");

      const result = await runInfoPlistMod(
        { name: "DOMUS", slug: "domus", ios: { googleServicesFile: "./GoogleService-Info.plist" } },
        undefined,
        tmpDir,
        { CFBundleURLTypes: [{ CFBundleURLSchemes: ["orcafacil"] }] },
      );

      expect(result.GIDClientID).toBe("1234567890-abc.apps.googleusercontent.com");
      const schemes = (result.CFBundleURLTypes as { CFBundleURLSchemes?: string[] }[]).flatMap(
        (e) => e.CFBundleURLSchemes ?? [],
      );
      expect(schemes).toContain("orcafacil");
      expect(schemes).toContain("com.googleusercontent.apps.1234567890-abc");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("executa withDomusGoogleAuth(config, { iosClientId }) derivando REVERSED_CLIENT_ID quando iosUrlScheme não é informado", async () => {
    const result = await runInfoPlistMod(
      { name: "DOMUS", slug: "domus", ios: {} },
      { iosClientId: "99999-xyz.apps.googleusercontent.com" },
      os.tmpdir(),
      {},
    );

    expect(result.GIDClientID).toBe("99999-xyz.apps.googleusercontent.com");
    const schemes = (result.CFBundleURLTypes as { CFBundleURLSchemes?: string[] }[]).flatMap(
      (e) => e.CFBundleURLSchemes ?? [],
    );
    expect(schemes).toContain("com.googleusercontent.apps.99999-xyz");
  });

  it("executa withDomusGoogleAuth sem falhar quando GoogleService-Info.plist não existe ou tem XML malformado", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "domus-google-auth-bad-"));
    try {
      const missingResult = await runInfoPlistMod(
        { name: "DOMUS", slug: "domus", ios: { googleServicesFile: "./inexistente.plist" } },
        undefined,
        tmpDir,
        { CFBundleDisplayName: "DOMUS" },
      );
      expect(missingResult).toEqual({ CFBundleDisplayName: "DOMUS" });

      fs.writeFileSync(path.join(tmpDir, "bad.plist"), "<plist><dict><broken", "utf8");
      const malformedResult = await runInfoPlistMod(
        { name: "DOMUS", slug: "domus", ios: { googleServicesFile: "./bad.plist" } },
        undefined,
        tmpDir,
        { CFBundleDisplayName: "DOMUS" },
      );
      expect(malformedResult).toEqual({ CFBundleDisplayName: "DOMUS" });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
