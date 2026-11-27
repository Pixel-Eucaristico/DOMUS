import { describe, it, expect } from "vitest";
import {
  DRIVE_RECONNECT_COPY,
  buildLegacyReconnectMessage,
  formatBackupFileSize,
  formatBackupModifiedTime,
} from "../driveReconnectCopy";

const UNACCENTED_PT_BR_RE =
  /\b(unica|reconexao|necessaria|conexao|padrao|seguranca|automaticos|nao|continuara|disponivel|apos|possivel|indisponivel|ultimo|perdeu|autorizacao|sera|ja)\b/i;

describe("driveReconnectCopy (Story 8.9)", () => {
  it("mantém 100% das strings com acentuação pt-BR completa e copy obrigatória", () => {
    const allStrings = [
      ...Object.values(DRIVE_RECONNECT_COPY),
      buildLegacyReconnectMessage(null),
      buildLegacyReconnectMessage("willian@example.com"),
    ];

    for (const text of allStrings) {
      expect(text, `Texto com palavra sem acento: "${text}"`).not.toMatch(
        UNACCENTED_PT_BR_RE,
      );
    }

    expect(DRIVE_RECONNECT_COPY.bannerCta).toBe("Reconectar Google Drive");
    expect(DRIVE_RECONNECT_COPY.bannerTitle).toContain("única vez");
    expect(DRIVE_RECONNECT_COPY.backupsLoadOffline).toBe(
      "Sem conexão com a internet para listar os backups agora.",
    );
    expect(DRIVE_RECONNECT_COPY.backupsLoadAuthError).toBe(
      "A autorização do Google Drive expirou ou foi revogada. Reconecte sua conta para continuar.",
    );
    expect(DRIVE_RECONNECT_COPY.disconnectLegacyConfirmTitle).toContain("Desconectar");
    expect(DRIVE_RECONNECT_COPY.disconnectLegacyConfirmMessage).toContain("não será apagado");

    const msgWithEmail = buildLegacyReconnectMessage("willian@example.com");
    expect(msgWithEmail).toContain("willian@example.com");
    expect(msgWithEmail).toContain("uma única vez");
    expect(msgWithEmail).toContain("não foi apagado");
    expect(msgWithEmail).toContain("continuará disponível após a reconexão");

    const msgWithoutEmail = buildLegacyReconnectMessage("   ");
    expect(msgWithoutEmail).not.toContain("()");
    expect(msgWithoutEmail).toContain("não foi apagado");
  });

  it("formata tamanhos de arquivo em pt-BR e trata valores ausentes/inválidos", () => {
    expect(formatBackupFileSize(0)).toBe("0 B");
    expect(formatBackupFileSize(512)).toBe("512 B");
    expect(formatBackupFileSize(1024)).toBe("1,0 KB");
    expect(formatBackupFileSize(1536)).toBe("1,5 KB");
    expect(formatBackupFileSize(1024 * 1024)).toBe("1,0 MB");
    expect(formatBackupFileSize(2.5 * 1024 * 1024)).toBe("2,5 MB");
    expect(formatBackupFileSize(1.25 * 1024 * 1024 * 1024)).toBe("1,25 GB");

    expect(formatBackupFileSize(null)).toBe("Tamanho indisponível");
    expect(formatBackupFileSize(undefined)).toBe("Tamanho indisponível");
    expect(formatBackupFileSize(-10)).toBe("Tamanho indisponível");
    expect(formatBackupFileSize(Number.NaN)).toBe("Tamanho indisponível");
  });

  it("formata data/hora em pt-BR e trata entradas inválidas", () => {
    const formattedIso = formatBackupModifiedTime("2026-11-26T19:23:00.000Z", "UTC");
    expect(formattedIso).toMatch(/26\/11\/2026.*19:23/);

    const formattedMs = formatBackupModifiedTime(
      Date.UTC(2026, 10, 26, 19, 23),
      "UTC",
    );
    expect(formattedMs).toMatch(/26\/11\/2026.*19:23/);

    expect(formatBackupModifiedTime(null)).toBe("Data indisponível");
    expect(formatBackupModifiedTime(undefined)).toBe("Data indisponível");
    expect(formatBackupModifiedTime("")).toBe("Data indisponível");
    expect(formatBackupModifiedTime("not-a-date")).toBe("Data indisponível");
  });
});
