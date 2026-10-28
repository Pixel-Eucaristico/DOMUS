import { describe, it, expect } from "vitest";
import { chaveAcessoCheckDigit, isValidChaveAcesso, CHAVE_ACESSO_LENGTH } from "../index";

// Exemplos com DV conhecido (Manual de Orientação do Contribuinte e chave de homologação).
const VALID = ["52060433009911002506550120000007800267301615", "35080599999090910270550010000000015180051273"];

describe("chave de acesso da NF-e (módulo 11, Story 13.6 R6)", () => {
  it.each(VALID)("%s é válida", (chave) => {
    expect(chave).toHaveLength(CHAVE_ACESSO_LENGTH);
    expect(isValidChaveAcesso(chave)).toBe(true);
    expect(chaveAcessoCheckDigit(chave.slice(0, 43))).toBe(Number(chave[43]));
  });

  it("DV trocado, um dígito trocado ou dois vizinhos invertidos → inválida", () => {
    const k = VALID[0]!;
    expect(isValidChaveAcesso(`${k.slice(0, 43)}${(Number(k[43]) + 1) % 10}`)).toBe(false);
    expect(isValidChaveAcesso(`${k.slice(0, 10)}${(Number(k[10]) + 1) % 10}${k.slice(11)}`)).toBe(false);
    expect(isValidChaveAcesso(`${k.slice(0, 5)}${k[6]}${k[5]}${k.slice(7)}`)).toBe(false);
  });

  it("resto 0 ou 1 → DV 0", () => {
    // 43 zeros: soma 0, resto 0
    expect(chaveAcessoCheckDigit("0".repeat(43))).toBe(0);
    // "1" na última posição (peso 2) e o resto em zero: soma 2 → DV 9
    expect(chaveAcessoCheckDigit(`${"0".repeat(42)}1`)).toBe(9);
    // resto 1: "6" no peso 2 → soma 12, resto 1 → DV 0
    expect(chaveAcessoCheckDigit(`${"0".repeat(42)}6`)).toBe(0);
  });

  it("formato errado → inválida", () => {
    expect(isValidChaveAcesso("")).toBe(false);
    expect(isValidChaveAcesso(VALID[0]!.slice(0, 43))).toBe(false);
    expect(isValidChaveAcesso(`${VALID[0]} `)).toBe(false);
    expect(isValidChaveAcesso(VALID[0]!.replace(/^5/, "a"))).toBe(false);
    expect(chaveAcessoCheckDigit("123")).toBeNull();
  });
});
