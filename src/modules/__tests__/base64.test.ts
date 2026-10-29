import { describe, it, expect } from "vitest";
import { randomBytes, randomInt } from "node:crypto";
import { BASE64_ALPHABET, decodeBase64, encodeBase64 } from "../strongGroup/base64";

const utf8 = (s: string) => new TextEncoder().encode(s);

describe("base64 (RFC 4648 §4)", () => {
  // Vetores da RFC 4648 §10.
  const vectors: [string, string][] = [
    ["", ""],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"],
  ];

  it.each(vectors)("codifica %j como %j", (plain, encoded) => {
    expect(encodeBase64(utf8(plain))).toBe(encoded);
  });

  it.each(vectors)("decodifica %j de volta", (plain, encoded) => {
    expect(decodeBase64(encoded)).toEqual(utf8(plain));
  });

  it("o alfabeto é o da RFC (com + e /, sem variante URL)", () => {
    expect(BASE64_ALPHABET).toHaveLength(64);
    expect(new Set(BASE64_ALPHABET).size).toBe(64);
    expect(BASE64_ALPHABET.slice(62)).toBe("+/");
    expect(encodeBase64(Uint8Array.from([0xfb, 0xff]))).toBe("+/8=");
  });

  it("ida e volta de 1.000 entradas aleatórias (0 a 300 bytes), conferidas com o Buffer do Node", () => {
    for (let i = 0; i < 1000; i++) {
      const bytes = new Uint8Array(randomBytes(randomInt(0, 301)));
      const encoded = encodeBase64(bytes);
      expect(encoded).toBe(Buffer.from(bytes).toString("base64"));
      expect(decodeBase64(encoded)).toEqual(bytes);
    }
  });

  it.each([
    ["tamanho fora de múltiplo de 4", "Zm9"],
    ["um símbolo só", "Z"],
    ["símbolo fora do alfabeto", "Zm9*"],
    ["variante URL (-)", "-_8="],
    ["espaço", "Zm9v Zg=="],
    ["quebra de linha", "Zm9v\nZg=="],
    ["espaço no fim", "Zm8= "],
    ["= no meio", "Zg==Zm9v"],
    ["= demais", "Z==="],
    ["só =", "===="],
    ["bits de sobra (1 byte)", "Zh=="],
    ["bits de sobra (2 bytes)", "Zm9="],
    ["não ASCII", "Zm9vÿ==="],
  ])("recusa %s", (_label, text) => {
    expect(decodeBase64(text)).toBeNull();
  });

  it("recusa entrada que não é string", () => {
    expect(decodeBase64(undefined as unknown as string)).toBeNull();
    expect(decodeBase64(1234 as unknown as string)).toBeNull();
  });
});
