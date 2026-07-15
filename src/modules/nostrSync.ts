import { finalizeEvent, type UnsignedEvent, getPublicKey } from "nostr-tools/pure";
import { SimplePool, type SubCloser } from "nostr-tools/pool";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const DOMUS_KIND = 30333;
const DOMUS_APP_TAG = "domus-sync";

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social",
  "wss://relay.primal.net",
  "wss://relay.nostr.com.br",
  "wss://nostr.bitcoiner.social",
];

const RELAY_TIMEOUT_MS = 8000;
const PULL_TIMEOUT_MS = 25000; // Timeout longo para pull histórico
const BATCH_SIZE = 20;

export interface NostrSyncKeys {
  privateKey: Uint8Array;
  publicKey: string;
  encryptionKey: Uint8Array;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return result;
}

function getRandomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Usar sempre a implementação JS manual para consistência absoluta entre 
  // Mobile e Web, garantindo que as chaves derivadas do código do grupo sejam idênticas.
  return jsSha256(data);
}

function jsSha256(data: Uint8Array): Uint8Array {
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const ch = (x: number, y: number, z: number) => ((x & y) ^ (~x & z)) >>> 0;
  const maj = (x: number, y: number, z: number) => ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
  const sigma0 = (x: number) => (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
  const sigma1 = (x: number) => (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
  const gamma0 = (x: number) => (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
  const gamma1 = (x: number) => (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;

  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = ((56 - (msgLen + 1) % 64) + 64) % 64;
  const padded = new Uint8Array(msgLen + 1 + padLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      w[i] = ((gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) & 0xffffffff) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const t1 = ((h + sigma1(e) + ch(e, f, g) + K[i] + w[i]) & 0xffffffff) >>> 0;
      const t2 = ((sigma0(a) + maj(a, b, c)) & 0xffffffff) >>> 0;
      h = g; g = f; f = e;
      e = ((d + t1) & 0xffffffff) >>> 0;
      d = c; c = b; b = a;
      a = ((t1 + t2) & 0xffffffff) >>> 0;
    }

    h0 = ((h0 + a) & 0xffffffff) >>> 0;
    h1 = ((h1 + b) & 0xffffffff) >>> 0;
    h2 = ((h2 + c) & 0xffffffff) >>> 0;
    h3 = ((h3 + d) & 0xffffffff) >>> 0;
    h4 = ((h4 + e) & 0xffffffff) >>> 0;
    h5 = ((h5 + f) & 0xffffffff) >>> 0;
    h6 = ((h6 + g) & 0xffffffff) >>> 0;
    h7 = ((h7 + h) & 0xffffffff) >>> 0;
  }

  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, h0, false);
  rv.setUint32(4, h1, false);
  rv.setUint32(8, h2, false);
  rv.setUint32(12, h3, false);
  rv.setUint32(16, h4, false);
  rv.setUint32(20, h5, false);
  rv.setUint32(24, h6, false);
  rv.setUint32(28, h7, false);
  return result;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const blockSize = 64;

  let keyBytes = key;
  if (keyBytes.length > blockSize) {
    keyBytes = await sha256(keyBytes);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const inner = new Uint8Array(ipad.length + data.length);
  inner.set(ipad);
  inner.set(data, ipad.length);
  const innerHash = await sha256(inner);

  const outer = new Uint8Array(opad.length + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, opad.length);
  return sha256(outer);
}

async function hkdfDerive(
  ikm: Uint8Array,
  salt: string,
  info: string,
  length: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const saltBytes = enc.encode(salt);
  const infoBytes = enc.encode(info);

  const prk = await hmacSha256(
    saltBytes.length > 0 ? saltBytes : new Uint8Array(32),
    ikm,
  );

  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  const okm = new Uint8Array(n * hashLen);
  let prev = new Uint8Array(0);

  for (let i = 1; i <= n; i++) {
    const input = new Uint8Array(prev.length + infoBytes.length + 1);
    for (let j = 0; j < prev.length; j++) input[j] = prev[j];
    for (let j = 0; j < infoBytes.length; j++) input[prev.length + j] = infoBytes[j];
    input[prev.length + infoBytes.length] = i;
    prev = new Uint8Array(await hmacSha256(prk, input));
    for (let j = 0; j < prev.length; j++) okm[(i - 1) * hashLen + j] = prev[j];
  }

  return okm.slice(0, length);
}

function stringToBytes(str: string): Uint8Array {
  // Implementação manual de UTF-8 encoding para garantir consistência absoluta
  // entre ambientes Mobile (React Native/Hermes) e Web, evitando dependência de TextEncoder.
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }
  return new Uint8Array(utf8);
}

export async function deriveKeysFromCode(
  groupCode: string,
): Promise<NostrSyncKeys> {
  // Normalização agressiva para garantir chaves idênticas em todos os dispositivos
  const normalized = groupCode.trim().toUpperCase();
  
  const seed = await sha256(
    stringToBytes(`domus-group:${normalized}`),
  );

  const privateKey = await hkdfDerive(
    seed,
    "domus-nostr-identity",
    "nostr-private-key",
    32,
  );
  const encryptionKey = await hkdfDerive(
    seed,
    "domus-payload-encryption",
    "aes-key",
    32,
  );

  const publicKey = getPublicKey(privateKey);

  return { privateKey, publicKey, encryptionKey };
}

function xorEncryptDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

async function encryptPayload(
  payload: string,
  encKey: Uint8Array,
): Promise<string> {
  const nonce = getRandomBytes(16);

  const expandedKey = await sha256(
    new Uint8Array([...encKey, ...nonce]),
  );

  const plainBytes = new TextEncoder().encode(payload);
  const cipherBytes = xorEncryptDecrypt(plainBytes, expandedKey);

  return `${bytesToHex(nonce)}:${bytesToHex(cipherBytes)}`;
}

async function decryptPayload(
  encrypted: string,
  encKey: Uint8Array,
): Promise<string> {
  const [nonceHex, cipherHex] = encrypted.split(":");
  if (!nonceHex || !cipherHex) throw new Error("Invalid encrypted format");

  const nonce = hexToBytes(nonceHex);
  const cipherBytes = hexToBytes(cipherHex);

  const expandedKey = await sha256(
    new Uint8Array([...encKey, ...nonce]),
  );
  const plainBytes = xorEncryptDecrypt(cipherBytes, expandedKey);

  return new TextDecoder().decode(plainBytes);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms);
    promise
      .then((val) => { clearTimeout(timer); resolve(val); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Implementação manual de Promise.any para compatibilidade com ambientes mais antigos
 */
async function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  if (promises.length === 0) return Promise.reject(new Error("No promises provided"));
  return new Promise((resolve, reject) => {
    let errors: any[] = [];
    promises.forEach((p) => {
      p.then(resolve).catch((err) => {
        errors.push(err);
        if (errors.length === promises.length) {
          reject(new Error("All relays failed to publish"));
        }
      });
    });
  });
}

let _pool: SimplePool | null = null;

function getPool(): SimplePool {
  if (!_pool) {
    _pool = new SimplePool();
  }
  return _pool;
}

export function getRelays(): string[] {
  return [...DEFAULT_RELAYS];
}

export async function testRelayConnection(): Promise<{ connected: string[]; failed: string[] }> {
  const connected: string[] = [];
  const failed: string[] = [];

  const results = await Promise.all(
    DEFAULT_RELAYS.map(async (relay) => {
      try {
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            try {
              const ws = new WebSocket(relay);
              const timer = setTimeout(() => {
                try { ws.close(); } catch {}
                reject(new Error("timeout"));
              }, 5000);
              ws.onopen = () => {
                clearTimeout(timer);
                try { ws.close(); } catch {}
                resolve();
              };
              ws.onerror = () => {
                clearTimeout(timer);
                reject(new Error("connection failed"));
              };
            } catch (e) {
              reject(e);
            }
          }),
          6000,
          `relay ${relay}`,
        );
        return { status: "fulfilled", relay };
      } catch {
        return { status: "rejected", relay };
      }
    }),
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      connected.push((r as any).relay);
    } else {
      failed.push((r as any).relay);
    }
  }

  return { connected, failed };
}

export async function publishSyncEvents(
  keys: NostrSyncKeys,
  deviceId: string,
  events: SyncEvent[],
): Promise<number> {
  if (events.length === 0) return 0;

  const pool = getPool();
  const relays = getRelays();
  let published = 0;

  for (let batchStart = 0; batchStart < events.length; batchStart += BATCH_SIZE) {
    const batch = events.slice(batchStart, batchStart + BATCH_SIZE);
    const batchIndex = Math.floor(batchStart / BATCH_SIZE);

    const batchPayload = JSON.stringify(
      batch.map((evt) => ({
        id: evt.id,
        type: evt.type,
        payload: evt.payload,
        timestamp: evt.timestamp,
        deviceId: evt.deviceId,
        signature: evt.signature || "",
      })),
    );

    const batchId = `sync-${deviceId}-${batchIndex}`;
    const encrypted = await encryptPayload(batchPayload, keys.encryptionKey);

    const nostrEvent = {
      kind: DOMUS_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", batchId],
        ["t", DOMUS_APP_TAG],
        ["device", deviceId],
        ["batch", String(batch.length)],
      ],
      content: encrypted,
      pubkey: keys.publicKey,
    } as UnsignedEvent;

    const signed = finalizeEvent(nostrEvent, keys.privateKey);

    try {
      const publishPromises = pool.publish(relays, signed);
      await withTimeout(
        promiseAny(publishPromises),
        RELAY_TIMEOUT_MS,
        "publish batch",
      );
      published += batch.length;
    } catch {
      console.warn(`[NostrSync] Failed to publish batch ${batchId} to any relay.`);
    }
  }

  return published;
}

function parseSyncPayload(decrypted: string): SyncEvent[] {
  const parsed = JSON.parse(decrypted);
  if (Array.isArray(parsed)) {
    return parsed.map((p: any) => ({
      id: p.id,
      type: p.type,
      payload: p.payload,
      timestamp: p.timestamp,
      deviceId: p.deviceId,
      signature: p.signature || "",
    }));
  }
  return [
    {
      id: parsed.id,
      type: parsed.type,
      payload: parsed.payload,
      timestamp: parsed.timestamp,
      deviceId: parsed.deviceId,
      signature: parsed.signature || "",
    },
  ];
}

export async function pullSyncEvents(
  keys: NostrSyncKeys,
  deviceId: string,
  sinceTimestamp: number,
  includeMyEvents: boolean = false,
): Promise<SyncEvent[]> {
  const pool = getPool();
  const relays = getRelays();

  const filter = {
    kinds: [DOMUS_KIND],
    authors: [keys.publicKey],
    limit: 500,
  };

  const seenIds = new Set<string>();
  const syncEvents: SyncEvent[] = [];

  const relayResults = await Promise.all(
    relays.map(async (relay) => {
      try {
        const events = await withTimeout(
          pool.querySync([relay], filter),
          PULL_TIMEOUT_MS,
          `pull from ${relay}`,
        );
        return { status: "fulfilled", value: events };
      } catch (err) {
        return { status: "rejected", reason: err };
      }
    }),
  );

  for (const result of relayResults) {
    if (result.status !== "fulfilled") continue;
    const nostrEvents = (result as any).value;

    for (const ne of nostrEvents) {
      if (seenIds.has(ne.id)) continue;
      seenIds.add(ne.id);

      const hasAppTag = ne.tags.some((t: string[]) => t[0] === "t" && t[1] === DOMUS_APP_TAG);
      if (!hasAppTag) continue;

      try {
        const decrypted = await decryptPayload(ne.content, keys.encryptionKey);
        const events = parseSyncPayload(decrypted);
        syncEvents.push(...events);
      } catch {
        // Ignorar falhas de decriptação (eventos de outros grupos)
      }
    }
  }

  return syncEvents;
}

export function subscribeToSyncEvents(
  keys: NostrSyncKeys,
  deviceId: string,
  sinceTimestamp: number,
  onEvent: (event: SyncEvent) => void,
): SubCloser {
  const pool = getPool();

  const sinceUnix =
    sinceTimestamp > 0 ? Math.floor(sinceTimestamp / 1000) - 5 : 0;

  const filter = {
    kinds: [DOMUS_KIND],
    authors: [keys.publicKey],
    "#t": [DOMUS_APP_TAG],
    since:
      sinceUnix > 0 ? sinceUnix : Math.floor(Date.now() / 1000) - 60,
  };

  const sub = pool.subscribeMany(getRelays(), filter as any, {
    onevent(nostrEvent: any) {
      decryptPayload(nostrEvent.content, keys.encryptionKey)
        .then((decrypted) => {
          const events = parseSyncPayload(decrypted);
          for (const evt of events) {
            onEvent(evt);
          }
        })
        .catch(() => {});
    },
  });

  return sub;
}

export function closePool(): void {
  if (_pool) {
    _pool.close(getRelays());
    _pool = null;
  }
}
