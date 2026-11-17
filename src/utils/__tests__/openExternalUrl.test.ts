import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { safeOpenExternalUrl } from "../openExternalUrl";

const ROOT_DIR = path.resolve(__dirname, "../../..");

describe("safeOpenExternalUrl", () => {
  it("chama openURL diretamente e retorna true em sucesso", async () => {
    const openURL = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();

    const result = await safeOpenExternalUrl("https://pixel-eucaristico.com.br/domus/privacy", {
      openURL,
      onError,
    });

    expect(result).toBe(true);
    expect(openURL).toHaveBeenCalledWith("https://pixel-eucaristico.com.br/domus/privacy");
    expect(onError).not.toHaveBeenCalled();
  });

  it("chama onError e retorna false quando openURL falha", async () => {
    const openURL = vi.fn().mockRejectedValue(new Error("No activity found"));
    const onError = vi.fn();

    const result = await safeOpenExternalUrl("https://pixel-eucaristico.com.br/domus/privacy", {
      openURL,
      onError,
    });

    expect(result).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("Story 1.4 policy parity", () => {
  it("mantém paridade da sincronização opcional de chaves de API/OCR e dados cifrados nos 3 textos", () => {
    const files = [
      "app/privacy-policy.tsx",
      "docs/politica-de-privacidade.md",
      "PLAY_STORE_LISTING.md",
    ];

    for (const rel of files) {
      const content = fs.readFileSync(path.join(ROOT_DIR, rel), "utf8").replace(/\s+/g, " ");
      expect(content).toContain("holerites");
      expect(content).toContain("sincronização opcional de chaves de API");
      expect(content).toContain("o mesmo vale para eventos de chaves já publicados caso você desligue a opção");
      expect(content).not.toContain("Exceções: a chave do Google Cloud Vision");
      expect(content).not.toContain("armazenamento do navegador, sem cifra");
    }
  });
});
