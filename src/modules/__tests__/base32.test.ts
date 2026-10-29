import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encodeBase32, decodeBase32 } from "../strongGroup/base32";

const utf8 = (s: string) => new TextEncoder().encode(s);

describe("base32 (RFC 4648, sem padding)", () => {
  // RFC 4648 §10, sem os "=" do fim.
  const vectors: [string, string][] = [
    ["", ""],
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"],
  ];

  it.each(vectors)("codifica %j como %j", (input, expected) => {
    expect(encodeBase32(utf8(input))).toBe(expected);
  });

  it.each(vectors)("decodifica %j de volta", (input, encoded) => {
    expect(decodeBase32(encoded)).toEqual(utf8(input));
  });

  it("codifica 00…1f ‖ 26a1b58a como o base64.b32encode do Python (sem \"=\")", () => {
    const bytes = Uint8Array.from({ length: 36 }, (_, i) => (i < 32 ? i : [0x26, 0xa1, 0xb5, 0x8a][i - 32]));
    expect(encodeBase32(bytes)).toBe("AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQTCQKRMFYYDENBWHA5DYPSNINVRI");
  });

  it("ida e volta de 1.000 entradas aleatórias de 0 a 64 bytes", () => {
    for (let i = 0; i < 1000; i++) {
      const len = i % 65;
      const bytes = new Uint8Array(randomBytes(len));
      const text = encodeBase32(bytes);
      expect(text).toMatch(/^[A-Z2-7]*$/);
      expect(decodeBase32(text)).toEqual(bytes);
    }
  });

  it("recusa símbolo fora do alfabeto", () => {
    for (const bad of ["MZXW6YT0", "MZXW6YT1", "MZXW6YT8", "MZXW6YT9", "MZXW6YT!", "mzxw6ytb", "MZXW6YT=", "MZXW6YTÉ"]) {
      expect(decodeBase32(bad)).toBeNull();
    }
  });

  it("recusa tamanho impossível (resto 1, 3 ou 6 em blocos de 8)", () => {
    expect(decodeBase32("M")).toBeNull();
    expect(decodeBase32("MZX")).toBeNull();
    expect(decodeBase32("MZXW6Y")).toBeNull();
  });

  it("recusa bits finais diferentes de zero", () => {
    // "MY" = 01100 11000 → 'f' + 2 bits zero; "MZ" deixa um bit final ligado.
    expect(decodeBase32("MY")).toEqual(utf8("f"));
    expect(decodeBase32("MZ")).toBeNull();
  });
});
