// Base64 da RFC 4648 (§4), com `=` no fim, estrito.
// Módulo puro: sem `react-native`, sem `expo`, sem dependência externa
// (o `@scure/base` só existe como dependência do `nostr-tools`).

export const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Índice pelo código do caractere; -1 marca símbolo fora do alfabeto.
const DECODE_TABLE: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < BASE64_ALPHABET.length; i++) table[BASE64_ALPHABET.charCodeAt(i)] = i;
  return table;
})();

/** Codifica bytes em base64 padrão, com `=` completando o último bloco de 4. */
export function encodeBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63] + BASE64_ALPHABET[(n >> 6) & 63] + BASE64_ALPHABET[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63] + BASE64_ALPHABET[(n >> 6) & 63] + "=";
  }
  return out;
}

/**
 * Decodifica base64 padrão. Devolve `null` se o tamanho não for múltiplo de 4,
 * se houver símbolo fora do alfabeto (inclusive espaço e quebra de linha), `=`
 * fora do fim ou em excesso, ou bits de sobra diferentes de zero (assim cada
 * sequência de bytes tem um único texto aceito).
 */
export function decodeBase64(text: string): Uint8Array | null {
  if (typeof text !== "string" || text.length % 4 !== 0) return null;
  let padding = 0;
  if (text.endsWith("==")) padding = 2;
  else if (text.endsWith("=")) padding = 1;
  const symbols = text.length - padding;
  const out = new Uint8Array((text.length / 4) * 3 - padding);
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (let i = 0; i < symbols; i++) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? DECODE_TABLE[code] : -1;
    if (value < 0) return null;
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return null;
  return out;
}
