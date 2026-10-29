import { describe, it, expect, vi, afterEach } from "vitest";
import { hkdfSync, randomBytes as nodeRandomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import {
  GROUP_SECRET_BYTES,
  GROUP_SECRET_PREFIX,
  STRONG_GROUP_LABELS,
  STRONG_GROUP_VERSION,
  deriveStrongGroupKeys,
  encodeGroupSecret,
  generateGroupSecret,
  isSameGroupSecret,
  parseGroupSecret,
  type GroupSecretParseError,
} from "../strongGroup/groupSecret";
import { deriveKeysFromCode } from "../nostrSync";

// Segredo de padrão (00 01 … 1f): nunca um segredo real em teste.
const PATTERN = Uint8Array.from({ length: 32 }, (_, i) => i);
const GOLDEN = {
  text: "DOMUS1-AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4IB-CEQT-CQKR-MFYY-DENB-WHA5-DYPS-NINV-RI",
  nostrPrivateKey: "987ba7253dad451882a63d06d5064173a041fe99c9b65d6bf94b41b546d05b64",
  nostrPublicKey: "edf43ce4ae9c7460b04706940003e4c591c4de7442ee978621683450a64f8e03",
  encryptionKey: "6896799c5613acea16ce6dba3d551b34c4367ef0ec1d445bc93e20d3e66e809a",
};

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const REASONS: GroupSecretParseError[] = [
  "empty",
  "legacy-code",
  "not-domus",
  "unsupported-version",
  "invalid-char",
  "wrong-length",
  "checksum",
];

function nodeHkdf(secret: Uint8Array, info: string): string {
  return Buffer.from(hkdfSync("sha256", secret, STRONG_GROUP_LABELS.salt, info, 32)).toString("hex");
}

/** Troca o símbolo na posição `i` do corpo (sem hífens) por outro símbolo válido. */
function swapBodySymbol(text: string, i: number): string {
  const body = text.slice(GROUP_SECRET_PREFIX.length).replace(/-/g, "");
  const current = body[i];
  const replacement = B32[(B32.indexOf(current) + 1) % B32.length];
  return GROUP_SECRET_PREFIX + body.slice(0, i) + replacement + body.slice(i + 1);
}

function expectRejected(input: string, reason: GroupSecretParseError) {
  const result = parseGroupSecret(input);
  expect(result).toEqual({ ok: false, reason });
  // O resultado só carrega o motivo fixo: nada do texto recebido.
  expect(Object.keys(result).sort()).toEqual(["ok", "reason"]);
  expect(REASONS).toContain((result as { reason: string }).reason);
  const trimmed = input.trim();
  if (trimmed.length > 0) expect(JSON.stringify(result)).not.toContain(trimmed);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("generateGroupSecret", () => {
  it("gera 32 bytes (256 bits, D-1)", () => {
    const s = generateGroupSecret();
    expect(s).toBeInstanceOf(Uint8Array);
    expect(s.length).toBe(GROUP_SECRET_BYTES);
    expect(GROUP_SECRET_BYTES * 8).toBeGreaterThanOrEqual(128);
  });

  it("10.000 segredos e textos distintos, cada um volta igual pela leitura, sem Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const secrets = new Set<string>();
    const texts = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const s = generateGroupSecret();
      const text = encodeGroupSecret(s);
      secrets.add(bytesToHex(s));
      texts.add(text);
      const parsed = parseGroupSecret(text);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(isSameGroupSecret(parsed.secret, s)).toBe(true);
    }
    expect(secrets.size).toBe(10_000);
    expect(texts.size).toBe(10_000);
    expect(random).not.toHaveBeenCalled();
  });

  it("usa crypto.getRandomValues por padrão", () => {
    const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
    generateGroupSecret();
    expect(spy).toHaveBeenCalled();
    expect((spy.mock.calls[0][0] as Uint8Array).length).toBe(32);
  });

  it("o gerador injetado recebe 32 e o resultado é uma cópia dos bytes dele", () => {
    const rng = vi.fn((n: number) => Uint8Array.from({ length: n }, (_, i) => i));
    const s = generateGroupSecret(rng);
    expect(rng).toHaveBeenCalledTimes(1);
    expect(rng).toHaveBeenCalledWith(32);
    expect(s).toEqual(PATTERN);
    expect(s).not.toBe(rng.mock.results[0].value);
  });

  it("lança erro se o gerador injetado devolve tamanho errado", () => {
    expect(() => generateGroupSecret(() => new Uint8Array(16))).toThrow();
  });

  it("sem globalThis.crypto lança erro e não cai para Math.random", () => {
    const random = vi.spyOn(Math, "random");
    vi.stubGlobal("crypto", undefined);
    expect(() => generateGroupSecret()).toThrow();
    expect(random).not.toHaveBeenCalled();
  });

  it("com crypto sem getRandomValues lança erro", () => {
    vi.stubGlobal("crypto", {});
    expect(() => generateGroupSecret()).toThrow();
  });
});

describe("encodeGroupSecret / parseGroupSecret", () => {
  const secret = PATTERN;
  const text = encodeGroupSecret(secret);
  const body = text.slice(GROUP_SECRET_PREFIX.length + 1).replace(/-/g, "");

  it("escreve DOMUS1- + 58 símbolos base32 em blocos de 4 (79 caracteres)", () => {
    expect(text).toBe(GOLDEN.text);
    expect(text).toMatch(/^DOMUS1(-[A-Z2-7]{4}){14}-[A-Z2-7]{2}$/);
    expect(text.length).toBe(79);
    expect(body.length).toBe(58);
    // Modo alfanumérico do QR: maiúsculas, dígitos e "-".
    expect(text).toMatch(/^[0-9A-Z-]+$/);
  });

  it("lê de volta os mesmos bytes", () => {
    expect(parseGroupSecret(text)).toEqual({ ok: true, secret });
  });

  it.each([
    ["minúsculas", text.toLowerCase()],
    ["sem hífens", text.replace(/-/g, "")],
    ["com espaços no lugar dos hífens", text.replace(/-/g, " ")],
    ["com quebras de linha", text.replace(/-/g, "\n")],
    ["com espaço e quebra nas pontas", `  \n${text}\t \r\n`],
    ["misturado", `domus1 ${body.slice(0, 20).toLowerCase()}\n${body.slice(20)}`],
  ])("aceita o texto %s", (_label, input) => {
    expect(parseGroupSecret(input)).toEqual({ ok: true, secret });
  });

  it("recusa vazio ou só espaços", () => {
    expectRejected("", "empty");
    expectRejected("   \n\t ", "empty");
    expectRejected(" - - ", "empty");
  });

  it("recusa o código do Grupo antigo", () => {
    expectRejected("K7M2QX", "legacy-code");
    expectRejected(" k7m2qx ", "legacy-code");
    expectRejected("ABC-DEF", "legacy-code");
  });

  it("recusa texto que não começa com DOMUS", () => {
    expectRejected("HELLO-WORLD", "not-domus");
    expectRejected(text.slice(1), "not-domus");
    expectRejected("K7M2Q", "not-domus");
    expectRejected("https://exemplo.com/" + text, "not-domus");
  });

  it("recusa versão futura ou ausente", () => {
    expectRejected(text.replace("DOMUS1", "DOMUS2"), "unsupported-version");
    expectRejected(text.replace("DOMUS1", "DOMUS9"), "unsupported-version");
    expectRejected("DOMUS", "unsupported-version");
    expectRejected("DOMUS-" + body, "unsupported-version");
  });

  it.each(["0", "1", "8", "9", "!", "É", "="])("recusa o símbolo %j fora do base32", (ch) => {
    const bad = GROUP_SECRET_PREFIX + body.slice(0, 10) + ch + body.slice(11);
    expectRejected(bad, "invalid-char");
  });

  it("recusa texto cortado ou com símbolo a mais", () => {
    expectRejected(text.slice(0, -1), "wrong-length");
    expectRejected(text.slice(0, -3), "wrong-length");
    expectRejected(text.slice(0, 40), "wrong-length");
    expectRejected(text + "A", "wrong-length");
    expectRejected(text + "-AAAA", "wrong-length");
    expectRejected("DOMUS1", "wrong-length");
  });

  it("recusa um símbolo trocado em qualquer posição do corpo", () => {
    for (let i = 0; i < body.length; i++) expectRejected(swapBodySymbol(text, i), "checksum");
  });

  it("recusa o mesmo corpo com dois símbolos trocados de lugar", () => {
    let i = 0;
    while (body[i] === body[i + 1]) i++;
    const swapped = GROUP_SECRET_PREFIX + body.slice(0, i) + body[i + 1] + body[i] + body.slice(i + 2);
    expectRejected(swapped, "checksum");
  });

  it("recusa entrada que não é texto sem lançar", () => {
    expect(parseGroupSecret(undefined as unknown as string)).toEqual({ ok: false, reason: "empty" });
  });

  it("encode lança erro sem repetir os bytes para segredo de tamanho errado", () => {
    const short = Uint8Array.from({ length: 16 }, () => 0xab);
    expect(() => encodeGroupSecret(short)).toThrow();
    try {
      encodeGroupSecret(short);
    } catch (e) {
      const msg = String((e as Error).message);
      expect(msg).not.toMatch(/ab/i);
      expect(msg).not.toContain("171");
    }
  });
});

describe("deriveStrongGroupKeys", () => {
  it("RFC 5869 caso A.1 pelo hkdf do @noble/hashes", () => {
    const okm = hkdf(
      sha256,
      hexToBytes("0b".repeat(22)),
      hexToBytes("000102030405060708090a0b0c"),
      hexToBytes("f0f1f2f3f4f5f6f7f8f9"),
      42,
    );
    expect(bytesToHex(okm)).toBe(
      "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865",
    );
  });

  it("vetor de ouro do segredo 00 01 … 1f", () => {
    const keys = deriveStrongGroupKeys(PATTERN);
    expect(keys.version).toBe(1);
    expect(STRONG_GROUP_VERSION).toBe(1);
    expect(bytesToHex(keys.nostrPrivateKey)).toBe(GOLDEN.nostrPrivateKey);
    expect(keys.nostrPublicKey).toBe(GOLDEN.nostrPublicKey);
    expect(bytesToHex(keys.encryptionKey)).toBe(GOLDEN.encryptionKey);
  });

  it("os rótulos são exatamente os da spec (parte do formato)", () => {
    expect(STRONG_GROUP_LABELS).toEqual({
      salt: "domus/strong-group/v1",
      nostrIdentityInfo: "domus/strong-group/v1/nostr-identity",
      eventEncryptionInfo: "domus/strong-group/v1/event-encryption",
    });
  });

  it("bate com o hkdfSync do Node para 100 segredos aleatórios", () => {
    for (let i = 0; i < 100; i++) {
      const secret = new Uint8Array(nodeRandomBytes(32));
      const keys = deriveStrongGroupKeys(secret);
      expect(bytesToHex(keys.nostrPrivateKey)).toBe(nodeHkdf(secret, STRONG_GROUP_LABELS.nostrIdentityInfo));
      expect(bytesToHex(keys.encryptionKey)).toBe(nodeHkdf(secret, STRONG_GROUP_LABELS.eventEncryptionInfo));
    }
  });

  it("é determinística e devolve tamanhos certos", () => {
    const s = generateGroupSecret();
    const a = deriveStrongGroupKeys(s);
    const b = deriveStrongGroupKeys(Uint8Array.from(s));
    expect(a).toEqual(b);
    expect(a.nostrPrivateKey.length).toBe(32);
    expect(a.encryptionKey.length).toBe(32);
    expect(a.nostrPublicKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deriva dos bytes, não do texto: as variações do texto dão as mesmas chaves", () => {
    const text = encodeGroupSecret(PATTERN);
    for (const variant of [text, text.toLowerCase(), text.replace(/-/g, ""), ` ${text.replace(/-/g, " ")}\n`]) {
      const parsed = parseGroupSecret(variant);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(deriveStrongGroupKeys(parsed.secret).nostrPublicKey).toBe(GOLDEN.nostrPublicKey);
    }
  });

  it("lança erro sem repetir os bytes para segredo de tamanho errado", () => {
    for (const bad of [new Uint8Array(0), new Uint8Array(16).fill(0xcd), new Uint8Array(33).fill(0xcd)]) {
      let message = "";
      try {
        deriveStrongGroupKeys(bad);
      } catch (e) {
        message = String((e as Error).message);
      }
      expect(message).not.toBe("");
      expect(message).not.toMatch(/cd/i);
      expect(message).not.toContain("205");
    }
  });
});

describe("separação de domínio", () => {
  const nostrSyncSource = readFileSync(path.resolve(__dirname, "../nostrSync.ts"), "utf8");

  it("encryptionKey ≠ nostrPrivateKey", () => {
    for (let i = 0; i < 50; i++) {
      const keys = deriveStrongGroupKeys(generateGroupSecret());
      expect(isSameGroupSecret(keys.encryptionKey, keys.nostrPrivateKey)).toBe(false);
    }
  });

  it("nenhum rótulo do Grupo forte aparece entre os de deriveKeysFromCode", () => {
    // Confere que a leitura do fonte acha os rótulos do Grupo antigo.
    const legacyLabels = ["domus-group:", "domus-nostr-identity", "nostr-private-key", "domus-payload-encryption", "aes-key"];
    for (const label of legacyLabels) expect(nostrSyncSource).toContain(label);
    const strong = Object.values(STRONG_GROUP_LABELS);
    for (const label of strong) {
      expect(legacyLabels).not.toContain(label);
      expect(nostrSyncSource).not.toContain(label);
    }
    expect(new Set(strong).size).toBe(strong.length);
  });

  it("o texto do segredo no Grupo antigo dá chaves diferentes do Grupo forte", async () => {
    const text = encodeGroupSecret(PATTERN);
    const legacy = await deriveKeysFromCode(text);
    const strong = deriveStrongGroupKeys(PATTERN);
    expect(legacy.publicKey).not.toBe(strong.nostrPublicKey);
    expect(bytesToHex(legacy.encryptionKey)).not.toBe(bytesToHex(strong.encryptionKey));
    expect(bytesToHex(legacy.privateKey)).not.toBe(bytesToHex(strong.nostrPrivateKey));
  });

  it("isSameGroupSecret compara bytes", () => {
    expect(isSameGroupSecret(PATTERN, Uint8Array.from(PATTERN))).toBe(true);
    const other = Uint8Array.from(PATTERN);
    other[31] ^= 1;
    expect(isSameGroupSecret(PATTERN, other)).toBe(false);
    expect(isSameGroupSecret(PATTERN, PATTERN.slice(0, 31))).toBe(false);
  });
});

describe("fonte do módulo", () => {
  const dir = path.resolve(__dirname, "../strongGroup");
  const files = ["groupSecret.ts", "base32.ts"].map((f) => [f, readFileSync(path.join(dir, f), "utf8")] as const);

  it.each(files)("%s não importa react-native, expo nem @scure/base", (_name, src) => {
    const imports = [...src.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["']([^"']+)["']/g)].map((m) => m[1]);
    for (const spec of imports) {
      expect(spec).not.toMatch(/^react-native|^expo|^@expo\/|^@scure\//);
    }
  });

  it.each(files)("%s não tem console. nem Math.random", (_name, src) => {
    expect(src).not.toContain("console.");
    expect(src).not.toContain("Math.random");
  });

  it("groupSecret.ts importa o @noble com sufixo .js", () => {
    const src = files[0][1];
    const noble = [...src.matchAll(/from\s+["'](@noble\/[^"']+)["']/g)].map((m) => m[1]);
    expect(noble.length).toBeGreaterThan(0);
    for (const spec of noble) expect(spec).toMatch(/\.js$/);
  });
});
