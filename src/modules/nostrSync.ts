import { finalizeEvent, type UnsignedEvent, getPublicKey } from "nostr-tools/pure";
import { SimplePool, type SubCloser } from "nostr-tools/pool";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const DOMUS_KIND = 29333;
const DOMUS_APP_TAG = "domus-sync";

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr.mom",
  "wss://relay.nostr.bg",
];

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

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

async function hkdfDerive(
  ikm: Uint8Array,
  salt: string,
  info: string,
  length: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode(salt),
      info: enc.encode(info),
    },
    keyMaterial,
    length * 8,
  );
  return new Uint8Array(derived);
}

export async function deriveKeysFromCode(
  groupCode: string,
): Promise<NostrSyncKeys> {
  const enc = new TextEncoder();
  const seed = await sha256(
    enc.encode(`domus-group:${groupCode.toUpperCase()}`),
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
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);

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

export async function publishSyncEvents(
  keys: NostrSyncKeys,
  deviceId: string,
  events: SyncEvent[],
): Promise<number> {
  const pool = getPool();
  let published = 0;

  for (const evt of events) {
    const payload = JSON.stringify({
      id: evt.id,
      type: evt.type,
      payload: evt.payload,
      timestamp: evt.timestamp,
      deviceId: evt.deviceId,
      signature: evt.signature || "",
    });

    const encrypted = await encryptPayload(payload, keys.encryptionKey);

    const nostrEvent: UnsignedEvent = {
      kind: DOMUS_KIND,
      created_at: Math.floor(evt.timestamp / 1000),
      tags: [
        ["d", evt.id],
        ["t", DOMUS_APP_TAG],
        ["device", deviceId],
      ],
      content: encrypted,
    };

    const signed = finalizeEvent(nostrEvent, keys.privateKey);

    try {
      await Promise.any(pool.publish(getRelays(), signed));
      published++;
    } catch {
      console.log("Failed to publish event to any relay:", evt.id);
    }
  }

  return published;
}

export async function pullSyncEvents(
  keys: NostrSyncKeys,
  deviceId: string,
  sinceTimestamp: number,
): Promise<SyncEvent[]> {
  const pool = getPool();

  const sinceUnix =
    sinceTimestamp > 0 ? Math.floor(sinceTimestamp / 1000) - 5 : 0;

  const filter = {
    kinds: [DOMUS_KIND],
    authors: [keys.publicKey],
    "#t": [DOMUS_APP_TAG],
    ...(sinceUnix > 0 ? { since: sinceUnix } : {}),
    limit: 500,
  };

  try {
    const nostrEvents = await pool.querySync(getRelays(), filter);
    const syncEvents: SyncEvent[] = [];

    for (const ne of nostrEvents) {
      const deviceTag = ne.tags.find((t) => t[0] === "device");
      if (deviceTag && deviceTag[1] === deviceId) continue;

      try {
        const decrypted = await decryptPayload(ne.content, keys.encryptionKey);
        const parsed = JSON.parse(decrypted);
        syncEvents.push({
          id: parsed.id,
          type: parsed.type,
          payload: parsed.payload,
          timestamp: parsed.timestamp,
          deviceId: parsed.deviceId,
          signature: parsed.signature || "",
        });
      } catch {
        console.log("Failed to decrypt/parse event:", ne.id);
      }
    }

    return syncEvents;
  } catch (err) {
    console.log("Pull from relays failed:", err);
    throw err;
  }
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

  const sub = pool.subscribeMany(getRelays(), [filter], {
    onevent(nostrEvent) {
      const deviceTag = nostrEvent.tags.find((t) => t[0] === "device");
      if (deviceTag && deviceTag[1] === deviceId) return;

      decryptPayload(nostrEvent.content, keys.encryptionKey)
        .then((decrypted) => {
          const parsed = JSON.parse(decrypted);
          onEvent({
            id: parsed.id,
            type: parsed.type,
            payload: parsed.payload,
            timestamp: parsed.timestamp,
            deviceId: parsed.deviceId,
            signature: parsed.signature || "",
          });
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
