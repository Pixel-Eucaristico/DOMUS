export interface CryptoAdapter {
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  sign(data: string, privateKey: string): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const HMAC_ALGO = { name: "HMAC", hash: "SHA-256" };

export const webCryptoAdapter: CryptoAdapter = {
  async generateKeyPair() {
    const key = await crypto.subtle.generateKey(HMAC_ALGO, true, [
      "sign",
      "verify",
    ]);
    const rawKey = await crypto.subtle.exportKey("raw", key);
    const hex = toHex(rawKey);
    return {
      publicKey: hex,
      privateKey: hex,
    };
  },

  async sign(data: string, privateKey: string) {
    const keyData = fromHex(privateKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      HMAC_ALGO,
      false,
      ["sign"],
    );
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return toHex(signature);
  },

  async verify(data: string, signature: string, publicKey: string) {
    const keyData = fromHex(publicKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      HMAC_ALGO,
      false,
      ["verify"],
    );
    const encoder = new TextEncoder();
    const sigBytes = fromHex(signature);
    return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
  },
};

export function createSimpleCrypto(): CryptoAdapter {
  function simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  return {
    async generateKeyPair() {
      const seed =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 18);
      const pub = simpleHash(seed + "pub");
      const priv = simpleHash(seed + "priv");
      return { publicKey: pub, privateKey: priv };
    },

    async sign(data: string, privateKey: string) {
      return simpleHash(data + privateKey);
    },

    async verify(data: string, signature: string, publicKey: string) {
      const expected = simpleHash(data + publicKey);
      return expected === signature;
    },
  };
}
