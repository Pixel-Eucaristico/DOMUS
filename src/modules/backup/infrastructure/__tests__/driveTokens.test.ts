import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import {
  EXPIRY_MARGIN_MS,
  NATIVE_TOKEN_TTL_MS,
  isDriveConnected,
  isLegacyDriveConnection,
  refreshExpiredAccessToken,
  resolveAccessToken,
  type DriveTokens,
} from "../driveTokens";

const NOW = 1_700_000_000_000;
const REPO_ROOT = path.resolve(__dirname, "../../../../..");

function tokens(overrides: Partial<DriveTokens> = {}): DriveTokens {
  return {
    accessToken: "at-velho",
    refreshToken: "",
    expiresAt: NOW + 60 * 60 * 1000,
    email: "a@b.com",
    clientId: "client-id",
    ...overrides,
  };
}

function collectFiles(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules" || entry.name === "build") {
        continue;
      }
      results.push(...collectFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe("isDriveConnected", () => {
  it("é falso sem tokens", () => {
    expect(isDriveConnected(null)).toBe(false);
  });

  it("é verdadeiro com sessão nativa moderna (credential-manager)", () => {
    expect(
      isDriveConnected(tokens({ native: true, authProvider: "credential-manager" })),
    ).toBe(true);
  });

  it("é verdadeiro com sessão nativa legada (sem authProvider) para compatibilidade com a Story 8.9", () => {
    expect(isDriveConnected(tokens({ native: true }))).toBe(true);
  });

  it("é verdadeiro com refresh token legado", () => {
    expect(isDriveConnected(tokens({ refreshToken: "rt" }))).toBe(true);
  });

  it("é verdadeiro para token web implícito ainda válido (sem refresh token)", () => {
    expect(isDriveConnected(tokens({ expiresAt: NOW + 60_000 }), NOW)).toBe(true);
  });

  it("é falso para token web implícito já expirado (sem refresh token)", () => {
    expect(isDriveConnected(tokens({ expiresAt: NOW - 1 }), NOW)).toBe(false);
  });
});

describe("isLegacyDriveConnection (Story 8.9)", () => {
  it("é falso sem tokens (nativo e web)", () => {
    expect(isLegacyDriveConnection(null, false)).toBe(false);
    expect(isLegacyDriveConnection(null, true)).toBe(false);
  });

  it("detecta sessão nativa legada com native: true sem authProvider", () => {
    expect(isLegacyDriveConnection(tokens({ native: true }), false)).toBe(true);
  });

  it("detecta sessão nativa legada com refreshToken sem authProvider", () => {
    expect(isLegacyDriveConnection(tokens({ refreshToken: "rt-antigo" }), false)).toBe(true);
  });

  it("é falso para sessão nativa moderna (credential-manager)", () => {
    expect(
      isLegacyDriveConnection(
        tokens({ native: true, authProvider: "credential-manager" }),
        false,
      ),
    ).toBe(false);
    expect(
      isLegacyDriveConnection(
        tokens({ refreshToken: "rt", authProvider: "credential-manager" }),
        false,
      ),
    ).toBe(false);
  });

  it("é falso no nativo se não for sessão nativa nem tiver refreshToken", () => {
    expect(isLegacyDriveConnection(tokens({ native: undefined, refreshToken: "" }), false)).toBe(
      false,
    );
  });

  it("nunca dispara na web, mesmo sem authProvider", () => {
    expect(isLegacyDriveConnection(tokens({ native: true }), true)).toBe(false);
    expect(isLegacyDriveConnection(tokens({ refreshToken: "rt-antigo" }), true)).toBe(false);
    expect(isLegacyDriveConnection(tokens({ native: undefined, refreshToken: "" }), true)).toBe(
      false,
    );
  });
});

describe("resolveAccessToken", () => {
  it("devolve null sem tokens", async () => {
    const provider = vi.fn();
    expect(await resolveAccessToken(null, provider, NOW)).toBeNull();
    expect(provider).not.toHaveBeenCalled();
  });

  it("reaproveita o token ainda válido, sem chamar o provider", async () => {
    const t = tokens();
    const provider = vi.fn();
    expect(await resolveAccessToken(t, provider, NOW)).toBe(t);
    expect(provider).not.toHaveBeenCalled();
  });

  it("renova pelo provider passando staleAccessToken e accountEmail quando falta menos que a margem", async () => {
    const t = tokens({ expiresAt: NOW + EXPIRY_MARGIN_MS - 1 });
    const provider = vi.fn(async () => "at-novo");

    const result = await resolveAccessToken(t, provider, NOW);

    expect(provider).toHaveBeenCalledWith("at-velho", "a@b.com");
    expect(result?.accessToken).toBe("at-novo");
    expect(result?.expiresAt).toBe(NOW + NATIVE_TOKEN_TTL_MS);
    expect(result?.native).toBe(true);
    expect(result?.authProvider).toBe("credential-manager");
    expect(result?.email).toBe("a@b.com");
  });

  it("renova token legado com refresh token pelo provider (sem client secret)", async () => {
    const t = tokens({ refreshToken: "rt", expiresAt: NOW - 1 });
    const provider = vi.fn(async () => "at-novo");

    const result = await resolveAccessToken(t, provider, NOW);

    expect(provider).toHaveBeenCalledWith("at-velho", "a@b.com");
    expect(result?.accessToken).toBe("at-novo");
    expect(result?.refreshToken).toBe("rt");
    expect(result?.authProvider).toBe("credential-manager");
  });

  it("devolve null quando o provider não tem sessão ou exige interação", async () => {
    const t = tokens({ expiresAt: NOW - 1 });
    expect(await resolveAccessToken(t, async () => null, NOW)).toBeNull();
  });

  it("devolve null quando vencido e não há provider (web)", async () => {
    const t = tokens({ expiresAt: NOW - 1 });
    expect(await resolveAccessToken(t, null, NOW)).toBeNull();
  });
});

describe("refreshExpiredAccessToken", () => {
  it("força renovação silenciosa após HTTP 401 mesmo com expiresAt local no futuro", async () => {
    const t = tokens({ expiresAt: NOW + 25 * 60 * 1000, native: true });
    const provider = vi.fn(async () => "at-renovado-401");

    const result = await refreshExpiredAccessToken(t, provider, NOW);

    expect(provider).toHaveBeenCalledWith("at-velho", "a@b.com");
    expect(result?.accessToken).toBe("at-renovado-401");
    expect(result?.expiresAt).toBe(NOW + NATIVE_TOKEN_TTL_MS);
    expect(result?.authProvider).toBe("credential-manager");
  });

  it("devolve null quando o provider devolve o mesmo accessToken após HTTP 401 (sem estender expiresAt)", async () => {
    const t = tokens({ accessToken: "at-revogado", expiresAt: NOW + 25 * 60 * 1000, native: true });
    const provider = vi.fn(async () => "at-revogado");

    const result = await refreshExpiredAccessToken(t, provider, NOW);

    expect(provider).toHaveBeenCalledWith("at-revogado", "a@b.com");
    expect(result).toBeNull();
  });

  it("devolve null sem provider (web) ou quando o provider não renova", async () => {
    const t = tokens();
    expect(await refreshExpiredAccessToken(t, null, NOW)).toBeNull();
    expect(await refreshExpiredAccessToken(t, async () => null, NOW)).toBeNull();
    expect(await refreshExpiredAccessToken(null, async () => "at", NOW)).toBeNull();
  });
});

describe("guardas da migração Google Auth (Story 8.8)", () => {
  it("remove 100% de @react-native-google-signin/google-signin de package.json e app.json", () => {
    const pkg = fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8");
    const appJson = fs.readFileSync(path.join(REPO_ROOT, "app.json"), "utf8");

    expect(pkg).not.toContain("@react-native-google-signin/google-signin");
    expect(appJson).not.toContain("@react-native-google-signin/google-signin");
    expect(appJson).toContain("./plugins/withDomusGoogleAuth");
  });

  it("não possui referências a GoogleSignInClient, GoogleSignInOptions, getTokens() nem client_secret", () => {
    const files = [
      ...collectFiles(path.join(REPO_ROOT, "src/modules/backup"), [".ts", ".tsx"]),
      ...collectFiles(path.join(REPO_ROOT, "modules/domus-google-auth"), [
        ".ts",
        ".tsx",
        ".kt",
        ".swift",
      ]),
      path.join(REPO_ROOT, "plugins/withDomusGoogleAuth.js"),
    ];

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const rel = path.relative(REPO_ROOT, file);

      expect(content, `${rel} não deve referenciar @react-native-google-signin`).not.toContain(
        "@react-native-google-signin/google-signin",
      );
      expect(content, `${rel} não deve usar GoogleSignInClient legado`).not.toContain(
        "GoogleSignInClient",
      );
      expect(content, `${rel} não deve usar GoogleSignInOptions legado`).not.toContain(
        "GoogleSignInOptions",
      );
      expect(content, `${rel} não deve usar getTokens()`).not.toMatch(/\bgetTokens\s*\(/);
      expect(content, `${rel} não deve embutir client_secret`).not.toMatch(
        /client_secret\s*[:=]/i,
      );
    }
  });
});
