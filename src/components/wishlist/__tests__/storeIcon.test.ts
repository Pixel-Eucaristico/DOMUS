import { describe, it, expect } from "vitest";
import { resolveStoreIconUrl } from "../storeIcon";

describe("resolveStoreIconUrl — flag de consultas", () => {
  it("flag desligada: ícone genérico, nenhuma URL do Google", () => {
    expect(resolveStoreIconUrl("amazon", ["amazon.com.br"], false)).toBeNull();
  });

  it("flag ligada: favicon pelo domínio da loja", () => {
    expect(resolveStoreIconUrl("amazon", ["amazon.com.br"], true)).toBe(
      "https://www.google.com/s2/favicons?domain=amazon.com.br&sz=128",
    );
  });

  it("flag ligada e imagem falhou: ícone genérico", () => {
    expect(resolveStoreIconUrl("amazon", ["amazon.com.br"], true, true)).toBeNull();
  });
});
