import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { sha256 } from "@noble/hashes/sha2.js";

// Pool Nostr falso: guarda o que é publicado e devolve `relayEvents` no pull.
const published: any[] = [];
let relayEvents: any[] = [];

vi.mock("nostr-tools/pool", () => ({
  SimplePool: class {
    publish(relays: string[], ev: any) {
      published.push(ev);
      return relays.map(() => Promise.resolve("ok"));
    }
    querySync() {
      return Promise.resolve(relayEvents);
    }
    subscribeMany() {
      return { close() {} };
    }
    close() {}
  },
}));

import {
  parseSyncPayload,
  pullSyncEvents,
  publishSyncEvents,
  deriveKeysFromCode,
  closePool,
} from "../nostrSync";

const valid = (over: Record<string, unknown> = {}) => ({
  id: "evt-1",
  type: "TRANSACTION_CREATED",
  payload: { amount: 1000, description: "segredo" },
  timestamp: 1_700_000_000_000,
  deviceId: "dev-a",
  signature: "sig",
  ...over,
});

const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

/** Mesmo formato de `encryptPayload` (XOR com sha256(chave||nonce)). */
function encrypt(plain: string, encKey: Uint8Array): string {
  const nonce = new Uint8Array(16).map((_, i) => i + 1);
  const k = sha256(new Uint8Array([...encKey, ...nonce]));
  const bytes = new TextEncoder().encode(plain);
  return `${hex(nonce)}:${hex(bytes.map((b, i) => b ^ k[i % k.length]))}`;
}

const relayEvent = (id: string, content: string) => ({
  id,
  tags: [["t", "domus-sync"]],
  content,
});

let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
  published.length = 0;
  relayEvents = [];
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  closePool();
});

describe("parseSyncPayload (nostrSync)", () => {
  it("lote misto: só os válidos seguem", () => {
    const batch = [valid({ id: "a" }), valid({ id: "b", payload: null }), valid({ id: "c" }), { id: "d" }, valid({ id: "e" })];
    expect(parseSyncPayload(JSON.stringify(batch)).map((e) => e.id)).toEqual(["a", "c", "e"]);
  });

  it("JSON malformado devolve lista vazia sem lançar", () => {
    expect(parseSyncPayload("{nope")).toEqual([]);
  });

  it("avisa uma vez por evento do relay", () => {
    const bad = JSON.stringify([valid({ id: "x", payload: null })]);
    parseSyncPayload(bad, "relay-evt-once");
    const n = warn.mock.calls.length;
    expect(n).toBeGreaterThan(0);
    parseSyncPayload(bad, "relay-evt-once");
    expect(warn.mock.calls.length).toBe(n);
  });
});

describe("publishSyncEvents + pullSyncEvents (ponta a ponta com pool falso)", () => {
  it("publish pula envelope inválido e avisa só com id/type/motivo", async () => {
    const keys = await deriveKeysFromCode("TESTE-31");
    const events = [valid({ id: "a" }), valid({ id: "bad", timestamp: 1_700_000_000 }), valid({ id: "c" })] as any[];
    const n = await publishSyncEvents(keys, "dev-a", events);
    expect(n).toBe(2);
    expect(published).toHaveLength(1);
    const logs = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logs).toContain("id=bad type=TRANSACTION_CREATED reason=invalid_timestamp");
    expect(logs).not.toContain("segredo");

    // O que foi publicado volta no pull só com os válidos.
    relayEvents = published.map((ev) => ({ ...ev, id: "pub-1" }));
    const pulled = await pullSyncEvents(keys, "dev-b", 0, true);
    expect(pulled.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("pull: lote misto + JSON malformado num evento do relay; os demais seguem e há uma linha de total", async () => {
    const keys = await deriveKeysFromCode("TESTE-31");
    const mixed = [
      valid({ id: "a" }),
      valid({ id: "b", payload: null }),
      valid({ id: "c", type: "FUTURE_EVENT_X" }),
      valid({ id: "d", type: "" }),
      (({ signature: _s, ...rest }) => ({ ...rest, id: "e" }))(valid()),
    ];
    relayEvents = [
      relayEvent("r1", encrypt(JSON.stringify(mixed), keys.encryptionKey)),
      relayEvent("r2", encrypt("isto não é json", keys.encryptionKey)),
      relayEvent("r3", encrypt(JSON.stringify(valid({ id: "f" })), keys.encryptionKey)),
    ];
    const pulled = await pullSyncEvents(keys, "dev-b", 0, true);
    expect(pulled.map((e) => e.id)).toEqual(["a", "c", "e", "f"]);
    expect(pulled.find((e) => e.id === "c")?.type).toBe("FUTURE_EVENT_X");
    expect(pulled.find((e) => e.id === "e")?.signature).toBe("");

    const logs = warn.mock.calls.map((c) => String(c[0]));
    expect(logs.filter((l) => l.startsWith("[NostrSync] Pull:"))).toEqual([
      "[NostrSync] Pull: 2 descartados de 6; 1 evento(s) do relay com JSON malformado.",
    ]);
    expect(logs.join("\n")).not.toContain("segredo");

    // Segundo pull: sem repetir os avisos por item, só a linha de total.
    warn.mockClear();
    await pullSyncEvents(keys, "dev-b", 0, true);
    const logs2 = warn.mock.calls.map((c) => String(c[0]));
    expect(logs2).toEqual(["[NostrSync] Pull: 2 descartados de 6; 1 evento(s) do relay com JSON malformado."]);
  });
});
