import { describe, it, expect, vi } from "vitest";
import {
  EXPIRY_MARGIN_MS,
  NATIVE_TOKEN_TTL_MS,
  isDriveConnected,
  resolveAccessToken,
  type DriveTokens,
} from "../driveTokens";

const NOW = 1_700_000_000_000;

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

describe("isDriveConnected", () => {
  it("é falso sem tokens", () => {
    expect(isDriveConnected(null)).toBe(false);
  });

  it("é verdadeiro com sessão nativa", () => {
    expect(isDriveConnected(tokens({ native: true }))).toBe(true);
  });

  it("é verdadeiro com refresh token legado", () => {
    expect(isDriveConnected(tokens({ refreshToken: "rt" }))).toBe(true);
  });

  it("é falso para token web implícito (sem refresh token)", () => {
    expect(isDriveConnected(tokens())).toBe(false);
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

  it("renova pelo provider quando falta menos que a margem", async () => {
    const t = tokens({ expiresAt: NOW + EXPIRY_MARGIN_MS - 1 });
    const provider = vi.fn(async () => "at-novo");

    const result = await resolveAccessToken(t, provider, NOW);

    expect(provider).toHaveBeenCalledWith("at-velho");
    expect(result?.accessToken).toBe("at-novo");
    expect(result?.expiresAt).toBe(NOW + NATIVE_TOKEN_TTL_MS);
    expect(result?.native).toBe(true);
    expect(result?.email).toBe("a@b.com");
  });

  it("renova token legado com refresh token pelo provider (sem client secret)", async () => {
    const t = tokens({ refreshToken: "rt", expiresAt: NOW - 1 });
    const provider = vi.fn(async () => "at-novo");

    const result = await resolveAccessToken(t, provider, NOW);

    expect(result?.accessToken).toBe("at-novo");
    expect(result?.refreshToken).toBe("rt");
  });

  it("devolve null quando o provider não tem sessão", async () => {
    const t = tokens({ expiresAt: NOW - 1 });
    expect(await resolveAccessToken(t, async () => null, NOW)).toBeNull();
  });

  it("devolve null quando vencido e não há provider (web)", async () => {
    const t = tokens({ expiresAt: NOW - 1 });
    expect(await resolveAccessToken(t, null, NOW)).toBeNull();
  });
});
