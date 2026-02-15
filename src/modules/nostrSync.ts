import { finalizeEvent, type UnsignedEvent } from "nostr-tools/pure";
import { SimplePool, type SubCloser } from "nostr-tools/pool";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";
import { getPublicKey } from "nostr-tools/pure";
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

export function deriveKeysFromCode(groupCode: string): NostrSyncKeys {
  const seed = sha256(new TextEncoder().encode(`domus-group:${groupCode.toUpperCase()}`));

  const privateKey = hkdf(sha256, seed, "domus-nostr-identity", "nostr-private-key", 32);
  const encryptionKey = hkdf(sha256, seed, "domus-payload-encryption", "aes-key", 32);

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

function encryptPayload(payload: string, encKey: Uint8Array): string {
  const nonce = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(nonce);
  } else {
    for (let i = 0; i < 16; i++) nonce[i] = Math.floor(Math.random() * 256);
  }

  const expandedKey = sha256(new Uint8Array([...encKey, ...nonce]));

  const plainBytes = new TextEncoder().encode(payload);
  const cipherBytes = xorEncryptDecrypt(plainBytes, expandedKey);

  const nonceHex = bytesToHex(nonce);
  const cipherHex = bytesToHex(cipherBytes);
  return `${nonceHex}:${cipherHex}`;
}

function decryptPayload(encrypted: string, encKey: Uint8Array): string {
  const [nonceHex, cipherHex] = encrypted.split(":");
  if (!nonceHex || !cipherHex) throw new Error("Invalid encrypted format");

  const nonce = hexToBytes(nonceHex);
  const cipherBytes = hexToBytes(cipherHex);

  const expandedKey = sha256(new Uint8Array([...encKey, ...nonce]));
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

    const encrypted = encryptPayload(payload, keys.encryptionKey);

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

  const sinceUnix = sinceTimestamp > 0 ? Math.floor(sinceTimestamp / 1000) - 5 : 0;

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
        const decrypted = decryptPayload(ne.content, keys.encryptionKey);
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

  const sinceUnix = sinceTimestamp > 0 ? Math.floor(sinceTimestamp / 1000) - 5 : 0;

  const filter = {
    kinds: [DOMUS_KIND],
    authors: [keys.publicKey],
    "#t": [DOMUS_APP_TAG],
    since: sinceUnix > 0 ? sinceUnix : Math.floor(Date.now() / 1000) - 60,
  };

  const sub = pool.subscribeMany(getRelays(), [filter], {
    onevent(nostrEvent) {
      const deviceTag = nostrEvent.tags.find((t) => t[0] === "device");
      if (deviceTag && deviceTag[1] === deviceId) return;

      try {
        const decrypted = decryptPayload(nostrEvent.content, keys.encryptionKey);
        const parsed = JSON.parse(decrypted);
        onEvent({
          id: parsed.id,
          type: parsed.type,
          payload: parsed.payload,
          timestamp: parsed.timestamp,
          deviceId: parsed.deviceId,
          signature: parsed.signature || "",
        });
      } catch {}
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
