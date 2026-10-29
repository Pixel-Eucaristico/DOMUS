// Base32 da RFC 4648 (§6), sem padding, em maiúsculas.
// Módulo puro: sem `react-native`, sem `expo`, sem dependência externa
// (o `@scure/base` só existe como dependência do `nostr-tools`).

export const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Índice pelo código do caractere; -1 marca símbolo fora do alfabeto.
const DECODE_TABLE: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < BASE32_ALPHABET.length; i++) table[BASE32_ALPHABET.charCodeAt(i)] = i;
  return table;
})();

/** Codifica bytes em base32 maiúsculo, sem `=` no fim. */
export function encodeBase32(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    buffer = ((buffer << 8) | bytes[i]) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

/**
 * Decodifica base32 maiúsculo sem padding. Devolve `null` se houver símbolo
 * fora do alfabeto, tamanho impossível ou bits finais diferentes de zero
 * (assim cada sequência de bytes tem um único texto aceito).
 */
export function decodeBase32(text: string): Uint8Array | null {
  // Tamanhos válidos sem padding: resto 0, 2, 4, 5 ou 7 em blocos de 8.
  const rem = text.length % 8;
  if (rem === 1 || rem === 3 || rem === 6) return null;
  const out = new Uint8Array(Math.floor((text.length * 5) / 8));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? DECODE_TABLE[code] : -1;
    if (value < 0) return null;
    buffer = ((buffer << 5) | value) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return null;
  return out;
}
