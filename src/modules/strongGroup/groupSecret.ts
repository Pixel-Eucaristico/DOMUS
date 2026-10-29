// Segredo do Grupo forte (Story 4.1): geração, texto `DOMUS1-…` e derivação
// das chaves por HKDF-SHA256.
//
// Módulo puro: sem `react-native` nem `expo`; roda igual no app, na web e no
// vitest. Nada aqui registra o segredo, o texto dele ou as chaves derivadas, e
// nenhuma mensagem de erro ou motivo de recusa repete o texto recebido.

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { equalBytes } from "@noble/ciphers/utils.js";
import { getPublicKey } from "nostr-tools/pure";
import { decodeBase32, encodeBase32, BASE32_ALPHABET } from "./base32";

export const STRONG_GROUP_VERSION = 1;
/** D-1: 256 bits de aleatoriedade (FR-13 pede pelo menos 128). */
export const GROUP_SECRET_BYTES = 32;
/** "DOMUS" + versão; faz parte do formato e da verificação. */
export const GROUP_SECRET_PREFIX = "DOMUS1";

const DOMUS_MARKER = "DOMUS";
const CHECKSUM_BYTES = 4;
const BLOCK_SIZE = 4;
/** 36 bytes (segredo + verificação) → 58 símbolos base32. */
const BODY_SYMBOLS = Math.ceil(((GROUP_SECRET_BYTES + CHECKSUM_BYTES) * 8) / 5);
/** Alfabeto do código curto do Grupo antigo (`generateGroupCode`). */
const LEGACY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LEGACY_CODE_LENGTH = 6;
/** Tentativas de sorteio antes de desistir (só um gerador defeituoso chega ao limite). */
const MAX_GENERATE_ATTEMPTS = 8;

/**
 * Rótulos do HKDF do Grupo forte v1. Fazem parte do formato: mudar qualquer um
 * quebra o pareamento entre versões. Uso novo ganha `info` novo
 * (`domus/strong-group/v1/<uso>`); formato novo vira `v2` e `DOMUS2`.
 */
export const STRONG_GROUP_LABELS = {
  salt: "domus/strong-group/v1",
  nostrIdentityInfo: "domus/strong-group/v1/nostr-identity",
  eventEncryptionInfo: "domus/strong-group/v1/event-encryption",
} as const;

/** Ordem do grupo do secp256k1 (n), em big-endian. */
const SECP256K1_ORDER = Uint8Array.from([
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe,
  0xba, 0xae, 0xdc, 0xe6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5e, 0x8c, 0xd0, 0x36, 0x41, 0x41,
]);

export type GroupSecretParseError =
  | "empty"
  | "legacy-code"
  | "not-domus"
  | "unsupported-version"
  | "invalid-char"
  | "wrong-length"
  | "checksum";

export type GroupSecretParseResult =
  | { ok: true; secret: Uint8Array }
  | { ok: false; reason: GroupSecretParseError };

export interface StrongGroupKeys {
  version: 1;
  /** Assina os eventos do grupo (4.5) e o marcador de reset (FR-10). */
  nostrPrivateKey: Uint8Array;
  /** Hex; identidade pública do grupo nos relays (`authors`). */
  nostrPublicKey: string;
  /** 32 bytes, só para a cifra autenticada da Story 4.2 (AES-256-GCM, D-3). */
  encryptionKey: Uint8Array;
}

function assertSecret(secret: Uint8Array): void {
  if (!(secret instanceof Uint8Array) || secret.length !== GROUP_SECRET_BYTES) {
    throw new Error("Segredo de grupo com tamanho inválido.");
  }
}

function deriveKey(secret: Uint8Array, info: string): Uint8Array {
  return hkdf(sha256, secret, utf8ToBytes(STRONG_GROUP_LABELS.salt), utf8ToBytes(info), 32);
}

/** 1 ≤ k < n; senão a chave não serve ao secp256k1. */
function isValidNostrPrivateKey(key: Uint8Array): boolean {
  let isZero = true;
  for (let i = 0; i < key.length; i++) {
    if (key[i] !== 0) {
      isZero = false;
      break;
    }
  }
  if (isZero) return false;
  for (let i = 0; i < key.length; i++) {
    if (key[i] !== SECP256K1_ORDER[i]) return key[i] < SECP256K1_ORDER[i];
  }
  return false; // igual a n
}

function checksumOf(secret: Uint8Array): Uint8Array {
  const input = concatBytes(utf8ToBytes(GROUP_SECRET_PREFIX), secret);
  const digest = sha256(input);
  const check = digest.slice(0, CHECKSUM_BYTES);
  input.fill(0);
  digest.fill(0);
  return check;
}

/**
 * Sorteia um Segredo de grupo de 32 bytes do gerador criptográfico
 * (`globalThis.crypto.getRandomValues`, via `randomBytes` do `@noble/hashes`).
 * Sem gerador, lança erro: nunca usa gerador não criptográfico. Sorteia de novo se a
 * chave do Nostr derivada ficar fora do intervalo do secp256k1 (~2⁻¹²⁸).
 */
export function generateGroupSecret(rng: (n: number) => Uint8Array = randomBytes): Uint8Array {
  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const bytes = rng(GROUP_SECRET_BYTES);
    if (!(bytes instanceof Uint8Array) || bytes.length !== GROUP_SECRET_BYTES) {
      throw new Error("O gerador aleatório devolveu um tamanho inesperado.");
    }
    const secret = Uint8Array.from(bytes);
    // O buffer do gerador não fica com uma cópia do segredo.
    bytes.fill(0);
    const nostrKey = deriveKey(secret, STRONG_GROUP_LABELS.nostrIdentityInfo);
    const valid = isValidNostrPrivateKey(nostrKey);
    nostrKey.fill(0);
    if (valid) return secret;
    secret.fill(0);
  }
  throw new Error("Não foi possível gerar um segredo de grupo válido.");
}

/** Texto canônico para QR e colagem: `DOMUS1-XXXX-XXXX-…` (79 caracteres). */
export function encodeGroupSecret(secret: Uint8Array): string {
  assertSecret(secret);
  const check = checksumOf(secret);
  const body = concatBytes(secret, check);
  const symbols = encodeBase32(body);
  body.fill(0);
  const blocks: string[] = [];
  for (let i = 0; i < symbols.length; i += BLOCK_SIZE) blocks.push(symbols.slice(i, i + BLOCK_SIZE));
  return `${GROUP_SECRET_PREFIX}-${blocks.join("-")}`;
}

/**
 * Separadores ignorados na leitura: espaços e quebras (`\s`, que já inclui o
 * espaço sem quebra e o BOM U+FEFF), `-` e os traços que teclados, editores e
 * apps de mensagem põem no lugar do hífen (U+2010–U+2015: hífen sem quebra
 * U+2011, meia-risca –, travessão —; e o sinal de menos U+2212), mais os invisíveis
 * (hífen suave U+00AD, U+200B–U+200D e U+2060).
 */
const SEPARATORS = /[\s\-\u00AD\u2010-\u2015\u2212\u200B-\u200D\u2060\uFEFF]+/g;

/** Só ASCII depois de tirar os separadores (antes de passar para maiúsculas). */
function isAscii(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 127) return false;
  return true;
}

function isLegacyCode(normalized: string): boolean {
  if (normalized.length !== LEGACY_CODE_LENGTH) return false;
  for (const ch of normalized) if (!LEGACY_CODE_ALPHABET.includes(ch)) return false;
  return true;
}

/**
 * Lê o texto do segredo com tolerância: ignora espaços, quebras de linha,
 * hífens e traços parecidos e caracteres invisíveis (`SEPARATORS`), e aceita
 * minúsculas. Qualquer outro caractere fora do ASCII é recusado
 * (`invalid-char`) antes de passar para maiúsculas, porque a dobra de caixa
 * transformaria `ı`, `ſ` e `ß` em `I`, `S` e `SS`. Recusa com um motivo fixo,
 * que nunca repete o texto recebido. A mensagem em pt-BR de cada motivo é da
 * Story 4.4.
 */
export function parseGroupSecret(text: string): GroupSecretParseResult {
  const stripped = (typeof text === "string" ? text : "").replace(SEPARATORS, "");
  if (stripped.length === 0) return { ok: false, reason: "empty" };
  if (!isAscii(stripped)) return { ok: false, reason: "invalid-char" };
  const normalized = stripped.toUpperCase();
  if (isLegacyCode(normalized)) return { ok: false, reason: "legacy-code" };
  if (!normalized.startsWith(DOMUS_MARKER)) return { ok: false, reason: "not-domus" };
  // A versão é o símbolo logo após "DOMUS" (o corpo pode começar por 2–7,
  // então não dá para ler uma sequência de dígitos depois dos hífens sumirem).
  if (!normalized.startsWith(GROUP_SECRET_PREFIX)) return { ok: false, reason: "unsupported-version" };

  const body = normalized.slice(GROUP_SECRET_PREFIX.length);
  for (const ch of body) if (!BASE32_ALPHABET.includes(ch)) return { ok: false, reason: "invalid-char" };
  if (body.length !== BODY_SYMBOLS) return { ok: false, reason: "wrong-length" };

  // Bits finais diferentes de zero só vêm de símbolo trocado no fim: é erro de verificação.
  const bytes = decodeBase32(body);
  if (!bytes || bytes.length !== GROUP_SECRET_BYTES + CHECKSUM_BYTES) return { ok: false, reason: "checksum" };

  const secret = bytes.slice(0, GROUP_SECRET_BYTES);
  const check = bytes.slice(GROUP_SECRET_BYTES);
  bytes.fill(0);
  const expected = checksumOf(secret);
  if (!equalBytes(check, expected)) {
    secret.fill(0);
    return { ok: false, reason: "checksum" };
  }
  return { ok: true, secret };
}

/**
 * Deriva do segredo (bytes, nunca o texto) a identidade Nostr do grupo e a
 * chave da cifra, cada uma com o seu `info`. Determinística: o mesmo segredo dá
 * as mesmas chaves em qualquer aparelho.
 */
export function deriveStrongGroupKeys(secret: Uint8Array): StrongGroupKeys {
  assertSecret(secret);
  const nostrPrivateKey = deriveKey(secret, STRONG_GROUP_LABELS.nostrIdentityInfo);
  if (!isValidNostrPrivateKey(nostrPrivateKey)) {
    nostrPrivateKey.fill(0);
    throw new Error("O segredo de grupo gera uma chave Nostr inválida.");
  }
  const encryptionKey = deriveKey(secret, STRONG_GROUP_LABELS.eventEncryptionInfo);
  const nostrPublicKey = getPublicKey(nostrPrivateKey);
  return { version: 1, nostrPrivateKey, nostrPublicKey, encryptionKey };
}

/** Compara dois segredos em tempo constante (a 4.4 usa para "já é este grupo"). */
export function isSameGroupSecret(a: Uint8Array, b: Uint8Array): boolean {
  return equalBytes(a, b);
}
