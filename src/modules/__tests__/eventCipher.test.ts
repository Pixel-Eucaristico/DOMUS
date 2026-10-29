import { describe, it, expect, vi, afterEach } from "vitest";
import { createCipheriv, createDecipheriv, randomBytes as nodeRandomBytes, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gcm } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { deriveStrongGroupKeys, generateGroupSecret } from "../strongGroup/groupSecret";
import { decodeBase64, encodeBase64 } from "../strongGroup/base64";
import {
  STRONG_CIPHER_MARKER,
  STRONG_MAX_CONTENT_CHARS,
  STRONG_MAX_PLAINTEXT_BYTES,
  STRONG_NONCE_BYTES,
  STRONG_TAG_BYTES,
  decryptStrongPayload,
  encryptStrongPayload,
  strongPlaintextBytes,
  type StrongCipherKeys,
  type StrongDecryptError,
} from "../strongGroup/eventCipher";

// Segredo de padrão (00 01 … 1f) da 4.1: nunca um segredo real em teste.
const PATTERN = Uint8Array.from({ length: 32 }, (_, i) => i);
const k = deriveStrongGroupKeys(PATTERN);
const k2 = deriveStrongGroupKeys(Uint8Array.from({ length: 32 }, (_, i) => 0x20 + i));
const PREFIX = `${STRONG_CIPHER_MARKER}.`;
const AAD = (pub: string) => Buffer.from(`domus-gcm-v1|${pub}`, "utf8");

const REASONS: StrongDecryptError[] = [
  "unknown-format",
  "legacy-xor",
  "unsupported-version",
  "too-large",
  "malformed",
  "auth-failed",
];

const LOTE = JSON.stringify([
  {
    id: "evt-0001",
    type: "TRANSACTION_CREATED",
    payload: { amount: 12345, description: "Pão de queijo ☕", category: "alimentação" },
    timestamp: 1700000000000,
    deviceId: "device-a",
    signature: "sig-0001",
  },
]);

/** Vetor de ouro: chaves do segredo de padrão, nonce 00 01 … 0b e `LOTE`. */
const GOLDEN_CONTENT =
  "domus-gcm-v1.AAECAwQFBgcICQoLvTgp2q/Wjr4/niJu3g+5HyvT02GX/ct8c4swKDOlysdiYIL+MlR0g5QKTJ3XTw/3hBX4Xbb6+mF5/w+OY8KGOHHDTNMsxmovx+wzK/haCNtZq4m2c+i0g+Oi42ersTbN0moKvQfoDQeg55uLiyT1I5DLfWBZ3qRzVWga/VfJQ9XcRbUvK51vnooxLxODn55fcefMLq/FJ/lNkPnP+CnthsuetLHtGNl06JZmRyN6i1PXXgZyKTeXj4qQdMepsK1Eei9JPS6dlAnTDOJjaN3MK79nI9OZL25FGGaRNhGeDS8=";

const fixedNonce = (n: number) => Uint8Array.from({ length: n }, (_, i) => i);

/** Mesmo formato do helper `encrypt` de `nostrSync.test.ts` (XOR do Grupo antigo). */
function legacyXorEncrypt(plain: string, encKey: Uint8Array): string {
  const nonce = new Uint8Array(16).map((_, i) => i + 1);
  const ks = sha256(new Uint8Array([...encKey, ...nonce]));
  const bytes = new TextEncoder().encode(plain);
  return `${bytesToHex(nonce)}:${bytesToHex(bytes.map((b, i) => b ^ ks[i % ks.length]))}`;
}

/** Bytes de `nonce ‖ cifra ‖ tag` de um `content` v1. */
function unpack(content: string): Uint8Array {
  expect(content.startsWith(PREFIX)).toBe(true);
  const bytes = decodeBase64(content.slice(PREFIX.length));
  expect(bytes).not.toBeNull();
  return bytes!;
}
const pack = (bytes: Uint8Array) => PREFIX + encodeBase64(bytes);

function expectRejected(content: unknown, reason: StrongDecryptError, keys: StrongCipherKeys = k) {
  const result = decryptStrongPayload(content, keys);
  expect(result).toEqual({ ok: false, reason });
  // Só o motivo fixo: nada do texto, do conteúdo recebido ou da chave.
  expect(Object.keys(result).sort()).toEqual(["ok", "reason"]);
  expect("plaintext" in result).toBe(false);
  expect(REASONS).toContain((result as { reason: string }).reason);
}

/** Texto ASCII com exatamente `n` bytes. */
const asciiOf = (n: number) => "a".repeat(n);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("constantes do formato", () => {
  it("marcador, nonce, tag, teto e teto do conteúdo", () => {
    expect(STRONG_CIPHER_MARKER).toBe("domus-gcm-v1");
    expect(STRONG_NONCE_BYTES).toBe(12);
    expect(STRONG_TAG_BYTES).toBe(16);
    expect(STRONG_MAX_PLAINTEXT_BYTES).toBe(32 * 1024);
    // "domus-gcm-v1." + base64(12 + 32768 + 16) = 13 + 43728
    expect(STRONG_MAX_CONTENT_CHARS).toBe(13 + 4 * Math.ceil((12 + 32768 + 16) / 3));
    expect(STRONG_MAX_CONTENT_CHARS).toBe(43741);
  });
});

describe("encryptStrongPayload / decryptStrongPayload: ida e volta", () => {
  const textos = [
    "",
    "a",
    LOTE,
    "Ação, coração, pão, maçã, você, avô, à vista — R$ 1.234,56",
    "emoji 💸🏠👨‍👩‍👧‍👦 e 🇧🇷",
    "\u0000\u0001 controle e 😀",
    JSON.stringify({ id: "x", payload: { n: 1 } }),
  ];

  it.each(textos)("decifra de volta %j", (t) => {
    const content = encryptStrongPayload(t, k);
    expect(content.startsWith(`${STRONG_CIPHER_MARKER}.`)).toBe(true);
    expect(decryptStrongPayload(content, k)).toEqual({ ok: true, plaintext: t });
  });

  it("texto de exatamente STRONG_MAX_PLAINTEXT_BYTES bytes cifra e decifra, dentro do teto do conteúdo", () => {
    const t = asciiOf(STRONG_MAX_PLAINTEXT_BYTES);
    const content = encryptStrongPayload(t, k);
    expect(content.length).toBe(STRONG_MAX_CONTENT_CHARS);
    expect(decryptStrongPayload(content, k)).toEqual({ ok: true, plaintext: t });
  });

  it("texto de exatamente o teto com acentos (2 bytes cada) também passa", () => {
    const t = "ç".repeat(STRONG_MAX_PLAINTEXT_BYTES / 2);
    expect(strongPlaintextBytes(t)).toBe(STRONG_MAX_PLAINTEXT_BYTES);
    expect(decryptStrongPayload(encryptStrongPayload(t, k), k)).toEqual({ ok: true, plaintext: t });
  });

  it("o mesmo texto cifrado duas vezes dá conteúdos diferentes, e os dois decifram", () => {
    const a = encryptStrongPayload(LOTE, k);
    const b = encryptStrongPayload(LOTE, k);
    expect(a).not.toBe(b);
    expect(unpack(a).slice(0, 12)).not.toEqual(unpack(b).slice(0, 12));
    expect(decryptStrongPayload(a, k)).toEqual({ ok: true, plaintext: LOTE });
    expect(decryptStrongPayload(b, k)).toEqual({ ok: true, plaintext: LOTE });
  });

  it("2.000 cifragens têm nonces distintos, sem Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const nonces = new Set<string>();
    for (let i = 0; i < 2000; i++) nonces.add(bytesToHex(unpack(encryptStrongPayload("x", k)).slice(0, 12)));
    expect(nonces.size).toBe(2000);
    expect(random).not.toHaveBeenCalled();
  });

  it("o mesmo conteúdo entregue de novo decifra de novo (a cifra não impede repetição)", () => {
    const content = encryptStrongPayload(LOTE, k);
    expect(decryptStrongPayload(content, k)).toEqual({ ok: true, plaintext: LOTE });
    expect(decryptStrongPayload(content, k)).toEqual({ ok: true, plaintext: LOTE });
  });

  it("aceita só as duas chaves usadas (Pick de StrongGroupKeys)", () => {
    const only: StrongCipherKeys = { encryptionKey: k.encryptionKey, nostrPublicKey: k.nostrPublicKey };
    expect(decryptStrongPayload(encryptStrongPayload(LOTE, only), k)).toEqual({ ok: true, plaintext: LOTE });
  });

  it("é determinística com o mesmo nonce e não altera as chaves", () => {
    const keyBefore = bytesToHex(k.encryptionKey);
    expect(encryptStrongPayload(LOTE, k, fixedNonce)).toBe(encryptStrongPayload(LOTE, k, fixedNonce));
    expect(bytesToHex(k.encryptionKey)).toBe(keyBefore);
  });
});

describe("gerador do nonce", () => {
  it("o gerador injetado é chamado uma vez com 12; Math.random nunca", () => {
    const random = vi.spyOn(Math, "random");
    const rng = vi.fn(fixedNonce);
    const content = encryptStrongPayload(LOTE, k, rng);
    expect(rng).toHaveBeenCalledTimes(1);
    expect(rng).toHaveBeenCalledWith(12);
    expect(unpack(content).slice(0, 12)).toEqual(fixedNonce(12));
    expect(random).not.toHaveBeenCalled();
  });

  it("usa crypto.getRandomValues por padrão, com 12 bytes", () => {
    const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
    encryptStrongPayload(LOTE, k);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as Uint8Array).length).toBe(12);
  });

  it("sem globalThis.crypto lança erro e não cai para Math.random", () => {
    const random = vi.spyOn(Math, "random");
    vi.stubGlobal("crypto", undefined);
    expect(() => encryptStrongPayload(LOTE, k)).toThrow();
    expect(random).not.toHaveBeenCalled();
  });

  it("com crypto sem getRandomValues lança erro", () => {
    vi.stubGlobal("crypto", {});
    expect(() => encryptStrongPayload(LOTE, k)).toThrow();
  });

  it("lança erro se o gerador injetado devolve tamanho errado ou não é Uint8Array", () => {
    expect(() => encryptStrongPayload(LOTE, k, () => new Uint8Array(11))).toThrow();
    expect(() => encryptStrongPayload(LOTE, k, () => new Uint8Array(16))).toThrow();
    expect(() => encryptStrongPayload(LOTE, k, () => [0, 1, 2] as unknown as Uint8Array)).toThrow();
  });
});

describe("encryptStrongPayload: erros de programação", () => {
  function messageOf(fn: () => unknown): string {
    try {
      fn();
    } catch (e) {
      return String((e as Error).message);
    }
    return "";
  }

  it("chave de tamanho ≠ 32 lança sem os bytes na mensagem", () => {
    for (const bad of [new Uint8Array(0), new Uint8Array(16).fill(0xcd), new Uint8Array(33).fill(0xcd)]) {
      const message = messageOf(() => encryptStrongPayload(LOTE, { encryptionKey: bad, nostrPublicKey: k.nostrPublicKey }));
      expect(message).not.toBe("");
      expect(message).not.toMatch(/cd/i);
      expect(message).not.toContain("205");
      expect(message).not.toContain(k.nostrPublicKey);
    }
  });

  it("chave pública que não é hex minúsculo de 64 lança sem repetir a chave", () => {
    const bads = [
      "",
      k.nostrPublicKey.slice(0, 63),
      `${k.nostrPublicKey}00`,
      k.nostrPublicKey.toUpperCase(),
      `${k.nostrPublicKey.slice(0, 63)}g`,
      `npub${k.nostrPublicKey.slice(4)}`,
    ];
    for (const bad of bads) {
      const message = messageOf(() => encryptStrongPayload(LOTE, { encryptionKey: k.encryptionKey, nostrPublicKey: bad }));
      expect(message).not.toBe("");
      if (bad.length > 0) expect(message).not.toContain(bad);
      expect(message).not.toContain(bytesToHex(k.encryptionKey));
    }
    expect(() => encryptStrongPayload(LOTE, { encryptionKey: k.encryptionKey, nostrPublicKey: 42 as unknown as string })).toThrow();
    expect(() => encryptStrongPayload(LOTE, null as unknown as StrongCipherKeys)).toThrow();
  });

  it("texto acima do teto (D-6) lança sem repetir o texto; o teto exato passa", () => {
    expect(() => encryptStrongPayload(asciiOf(STRONG_MAX_PLAINTEXT_BYTES), k)).not.toThrow();
    const over = `segredo-financeiro-${asciiOf(STRONG_MAX_PLAINTEXT_BYTES)}`;
    const message = messageOf(() => encryptStrongPayload(over, k));
    expect(message).not.toBe("");
    expect(message).not.toContain("segredo-financeiro");
    expect(() => encryptStrongPayload(asciiOf(STRONG_MAX_PLAINTEXT_BYTES + 1), k)).toThrow();
    // Conta bytes UTF-8, não caracteres: 16.385 "ç" = 32.770 bytes.
    expect(() => encryptStrongPayload("ç".repeat(STRONG_MAX_PLAINTEXT_BYTES / 2 + 1), k)).toThrow();
  });

  it("sem gerador chamado quando a entrada é inválida", () => {
    const rng = vi.fn(fixedNonce);
    expect(() => encryptStrongPayload(asciiOf(STRONG_MAX_PLAINTEXT_BYTES + 1), k, rng)).toThrow();
    expect(rng).not.toHaveBeenCalled();
  });

  it("texto que não é string lança", () => {
    expect(() => encryptStrongPayload(42 as unknown as string, k)).toThrow();
  });
});

describe("strongPlaintextBytes", () => {
  it.each([
    "",
    "abc",
    "ação",
    "€ ✓ 中文",
    "💸🏠",
    "👨‍👩‍👧‍👦",
    "\ud83d sozinho",
    "fim solto \ud83d",
    "baixo solto \ude00",
    LOTE,
  ])("igual ao TextEncoder para %j", (t) => {
    expect(strongPlaintextBytes(t)).toBe(new TextEncoder().encode(t).length);
  });
});

describe("decryptStrongPayload: recusas", () => {
  const content = encryptStrongPayload(LOTE, k, fixedNonce);
  const packed = unpack(content);

  it("um byte trocado em qualquer posição (nonce, cifra, tag) → auth-failed", () => {
    expect(packed.length).toBe(12 + strongPlaintextBytes(LOTE) + 16);
    for (let i = 0; i < packed.length; i++) {
      for (const flip of [0x01, 0x80]) {
        const tampered = Uint8Array.from(packed);
        tampered[i] ^= flip;
        expectRejected(pack(tampered), "auth-failed");
      }
    }
  });

  it("cortar 1 byte, acrescentar 1 byte ou cortar a tag inteira (sobrando ≥ 28) → auth-failed", () => {
    expectRejected(pack(packed.slice(0, -1)), "auth-failed");
    expectRejected(pack(packed.slice(1)), "auth-failed");
    expectRejected(pack(Uint8Array.from([...packed, 0])), "auth-failed");
    expectRejected(pack(Uint8Array.from([0, ...packed])), "auth-failed");
    expectRejected(pack(packed.slice(0, 28)), "auth-failed");
  });

  it("cortado para menos de nonce + tag (28 bytes) → malformed", () => {
    for (const n of [0, 1, 12, 27]) expectRejected(pack(packed.slice(0, n)), "malformed");
  });

  it("chave de outro grupo → auth-failed", () => {
    expectRejected(content, "auth-failed", k2);
    expectRejected(content, "auth-failed", { encryptionKey: k2.encryptionKey, nostrPublicKey: k.nostrPublicKey });
  });

  it("chave certa com a chave pública de outro grupo (AAD) → auth-failed", () => {
    expectRejected(content, "auth-failed", { encryptionKey: k.encryptionKey, nostrPublicKey: k2.nostrPublicKey });
  });

  it("50 grupos aleatórios: cada conteúdo só abre no próprio grupo", () => {
    const groups = Array.from({ length: 50 }, () => deriveStrongGroupKeys(generateGroupSecret()));
    const contents = groups.map((g, i) => encryptStrongPayload(`lote ${i}`, g));
    for (let i = 0; i < groups.length; i++) {
      expect(decryptStrongPayload(contents[i], groups[i])).toEqual({ ok: true, plaintext: `lote ${i}` });
      expectRejected(contents[i], "auth-failed", groups[(i + 1) % groups.length]);
    }
  });

  it("conteúdo do Grupo antigo (hex:hex do encryptPayload) → legacy-xor", () => {
    const legacy = legacyXorEncrypt(LOTE, k.encryptionKey);
    expect(legacy).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    expectRejected(legacy, "legacy-xor");
    expectRejected(legacyXorEncrypt("", k.encryptionKey).concat("00"), "legacy-xor");
    // Lote antigo grande (acima do teto do v1) continua reconhecido como legado.
    expectRejected(legacyXorEncrypt(asciiOf(40_000), k.encryptionKey), "legacy-xor");
  });

  it("outra versão do formato → unsupported-version", () => {
    expectRejected(`domus-gcm-v2.${encodeBase64(packed)}`, "unsupported-version");
    expectRejected("domus-gcm-v10.AAAA", "unsupported-version");
    expectRejected("domus-gcm-v1:AAAA", "unsupported-version");
    expectRejected("domus-gcm-v", "unsupported-version");
  });

  it.each([
    ["vazio", ""],
    ["número", 42],
    ["null", null],
    ["undefined", undefined],
    ["objeto", { content }],
    ["Uint8Array", packed],
    ["texto qualquer", "olá, mundo"],
    ["JSON em claro", LOTE],
    ["base64 sem marcador", encodeBase64(packed)],
    ["marcador em maiúsculas", content.toUpperCase()],
    ["espaço antes do marcador", ` ${content}`],
    ["hex sem :", "abcdef0123"],
    ["hex maiúsculo com :", "ABCD:EF01"],
  ])("%s → unknown-format", (_label, value) => {
    expectRejected(value, "unknown-format");
  });

  it.each([
    ["base64 com símbolo inválido", `${PREFIX}${encodeBase64(packed).slice(0, -4)}*AAA`],
    ["base64 com espaço", `${PREFIX}${encodeBase64(packed.slice(0, 30))} `],
    ["base64 com quebra de linha", `${PREFIX}${encodeBase64(packed.slice(0, 30))}\n`],
    ["base64 URL", `${PREFIX}${encodeBase64(packed).replace(/\+/g, "-").replace(/\//g, "_")}`],
    ["tamanho fora de múltiplo de 4", `${PREFIX}${encodeBase64(packed).slice(0, -1)}`],
    ["bits de sobra", `${PREFIX}${encodeBase64(packed.slice(0, 31)).slice(0, -2)}B=`],
    ["sem base64", PREFIX],
    ["menos de 28 bytes", `${PREFIX}${encodeBase64(new Uint8Array(27))}`],
  ])("%s → malformed", (_label, value) => {
    expectRejected(value, "malformed");
  });

  it("o caso de bits de sobra é mesmo só bits de sobra", () => {
    const valid = encodeBase64(packed.slice(0, 31));
    expect(valid.endsWith("=")).toBe(true);
    expect(decodeBase64(valid)).not.toBeNull();
  });

  it("conteúdo acima de STRONG_MAX_CONTENT_CHARS → too-large, sem decodificar", () => {
    const over = PREFIX + "A".repeat(STRONG_MAX_CONTENT_CHARS - PREFIX.length + 4);
    expectRejected(over, "too-large");
    // Exatamente um acima do teto, mesmo sendo base64 inválido, é recusado pelo tamanho.
    expectRejected(PREFIX + "*".repeat(STRONG_MAX_CONTENT_CHARS - PREFIX.length + 1), "too-large");
    // No teto, o tamanho passa e quem decide é a decodificação ou a tag.
    expectRejected(PREFIX + "*".repeat(STRONG_MAX_CONTENT_CHARS - PREFIX.length), "malformed");
    expectRejected(PREFIX + "A".repeat(STRONG_MAX_CONTENT_CHARS - PREFIX.length), "auth-failed");
    // Gigante: recusado sem tocar no base64.
    expectRejected(PREFIX + "A".repeat(5_000_000), "too-large");
  });

  it("chaves inválidas na decifração → auth-failed, sem lançar", () => {
    expectRejected(content, "auth-failed", { encryptionKey: new Uint8Array(16), nostrPublicKey: k.nostrPublicKey });
    expectRejected(content, "auth-failed", { encryptionKey: k.encryptionKey, nostrPublicKey: "x" });
    expectRejected(content, "auth-failed", null as unknown as StrongCipherKeys);
  });

  it("nenhuma recusa lança, mesmo com entradas estranhas", () => {
    const weird: unknown[] = [Symbol("x"), () => 1, [], {}, true, 0n, new String(content), PREFIX + "\u0000".repeat(40)];
    for (const w of weird) {
      expect(() => decryptStrongPayload(w, k)).not.toThrow();
      expect(decryptStrongPayload(w, k).ok).toBe(false);
    }
  });

  it("nenhum motivo repete o texto claro, a chave ou o conteúdo recebido", () => {
    const keyHex = bytesToHex(k.encryptionKey);
    const tampered = Uint8Array.from(packed);
    tampered[20] ^= 1;
    for (const [value, keys] of [
      [pack(tampered), k],
      [content, k2],
      [legacyXorEncrypt(LOTE, k.encryptionKey), k],
      [`domus-gcm-v2.${encodeBase64(packed)}`, k],
      [`${PREFIX}%%%%`, k],
    ] as [string, StrongCipherKeys][]) {
      const serialized = JSON.stringify(decryptStrongPayload(value, keys));
      expect(serialized).not.toContain("Pão");
      expect(serialized).not.toContain("evt-0001");
      expect(serialized).not.toContain(keyHex);
      expect(serialized).not.toContain(k.nostrPublicKey);
      expect(serialized).not.toContain(value.slice(PREFIX.length, PREFIX.length + 16));
      expect(serialized).not.toMatch(/ghash|tag|expected/i);
    }
  });
});

describe("vetores", () => {
  it("NIST GCM caso 16 (AES-256, AAD de 20 bytes) pelo gcm do noble e pelo node:crypto", () => {
    const key = hexToBytes("feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308");
    const iv = hexToBytes("cafebabefacedbaddecaf888");
    const aad = hexToBytes("feedfacedeadbeeffeedfacedeadbeefabaddad2");
    const pt = hexToBytes(
      "d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39",
    );
    const ct = "522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662";
    const tag = "76fc6ece0f4e1768cddf8853bb2d551b";

    const sealed = gcm(key, iv, aad).encrypt(pt);
    expect(bytesToHex(sealed)).toBe(ct + tag);
    expect(gcm(key, iv, aad).decrypt(sealed)).toEqual(pt);

    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(aad);
    const nodeCt = Buffer.concat([cipher.update(pt), cipher.final()]).toString("hex");
    expect(nodeCt + cipher.getAuthTag().toString("hex")).toBe(ct + tag);
  });

  it("100 textos e nonces aleatórios: o content abre no aes-256-gcm do node:crypto, e o inverso", () => {
    for (let i = 0; i < 100; i++) {
      const keys = i % 2 === 0 ? k : deriveStrongGroupKeys(generateGroupSecret());
      const plaintext = nodeRandomBytes(randomInt(0, 600)).toString("base64") + (i % 3 === 0 ? " ação 💸" : "");
      const nonce = new Uint8Array(nodeRandomBytes(12));

      // DOMUS → node:crypto
      const content = encryptStrongPayload(plaintext, keys, () => Uint8Array.from(nonce));
      const bytes = unpack(content);
      expect(bytes.slice(0, 12)).toEqual(nonce);
      const decipher = createDecipheriv("aes-256-gcm", keys.encryptionKey, bytes.subarray(0, 12));
      decipher.setAAD(AAD(keys.nostrPublicKey));
      decipher.setAuthTag(bytes.subarray(bytes.length - 16));
      const opened = Buffer.concat([decipher.update(bytes.subarray(12, bytes.length - 16)), decipher.final()]).toString("utf8");
      expect(opened).toBe(plaintext);

      // node:crypto → DOMUS
      const cipher = createCipheriv("aes-256-gcm", keys.encryptionKey, nonce);
      cipher.setAAD(AAD(keys.nostrPublicKey));
      const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
      const nodeContent = `domus-gcm-v1.${Buffer.concat([nonce, body]).toString("base64")}`;
      expect(nodeContent).toBe(content);
      expect(decryptStrongPayload(nodeContent, keys)).toEqual({ ok: true, plaintext });
    }
  });

  it("vetor de ouro: segredo 00 01 … 1f, nonce 00 01 … 0b, lote de um envelope", () => {
    expect(bytesToHex(k.encryptionKey)).toBe("6896799c5613acea16ce6dba3d551b34c4367ef0ec1d445bc93e20d3e66e809a");
    expect(k.nostrPublicKey).toBe("edf43ce4ae9c7460b04706940003e4c591c4de7442ee978621683450a64f8e03");
    expect(encryptStrongPayload(LOTE, k, fixedNonce)).toBe(GOLDEN_CONTENT);
    expect(decryptStrongPayload(GOLDEN_CONTENT, k)).toEqual({ ok: true, plaintext: LOTE });
  });

  it("AAD: o vetor de ouro não abre sem AAD nem com outro separador", () => {
    const bytes = unpack(GOLDEN_CONTENT);
    const nonce = bytes.subarray(0, 12);
    const sealed = bytes.subarray(12);
    expect(() => gcm(k.encryptionKey, nonce).decrypt(sealed)).toThrow();
    const otherAad = new TextEncoder().encode(`domus-gcm-v1.${k.nostrPublicKey}`);
    expect(() => gcm(k.encryptionKey, nonce, otherAad).decrypt(sealed)).toThrow();
    const rightAad = new TextEncoder().encode(`domus-gcm-v1|${k.nostrPublicKey}`);
    expect(new TextDecoder().decode(gcm(k.encryptionKey, nonce, rightAad).decrypt(sealed))).toBe(LOTE);
  });
});

describe("fonte do módulo", () => {
  const dir = path.resolve(__dirname, "../strongGroup");
  const files = ["eventCipher.ts", "base64.ts"].map((f) => [f, readFileSync(path.join(dir, f), "utf8")] as const);
  const importsOf = (src: string) =>
    [...src.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["']([^"']+)["']/g)].map((m) => m[1]);

  it.each(files)("%s não importa react-native, expo, @scure/base nem nostr-tools/pool", (_name, src) => {
    for (const spec of importsOf(src)) {
      expect(spec).not.toMatch(/^react-native|^expo|^@expo\/|^@scure\/|^nostr-tools\/pool/);
    }
  });

  it.each(files)("%s não tem console. nem Math.random", (_name, src) => {
    expect(src).not.toContain("console.");
    expect(src).not.toContain("Math.random");
  });

  it("eventCipher.ts importa o @noble com sufixo .js e usa o gcm do aes.js", () => {
    const src = files[0][1];
    const noble = importsOf(src).filter((s) => s.startsWith("@noble/"));
    expect(noble).toContain("@noble/ciphers/aes.js");
    for (const spec of noble) expect(spec).toMatch(/\.js$/);
    expect(src).not.toMatch(/gcmsiv|managedNonce/);
  });

  it("o marcador e o AAD estão no fonte exatamente como na spec", () => {
    const src = files[0][1];
    expect(src).toContain('STRONG_CIPHER_MARKER = "domus-gcm-v1"');
    expect(src).toContain('AAD_SEPARATOR = "|"');
    expect(src).toContain("STRONG_CIPHER_MARKER + AAD_SEPARATOR + nostrPublicKey");
  });

  it("o Grupo antigo não usa a cifra nova nesta story", () => {
    const nostrSync = readFileSync(path.resolve(__dirname, "../nostrSync.ts"), "utf8");
    expect(nostrSync).not.toMatch(/strongGroup\/eventCipher|eventCipher/);
    expect(nostrSync).not.toContain("domus-gcm");
  });
});
