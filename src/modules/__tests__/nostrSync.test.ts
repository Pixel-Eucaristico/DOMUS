import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { sha256 } from "@noble/hashes/sha2.js";
import { subscriptionSince } from "../syncPayload";
import { generateGroupSecret, deriveStrongGroupKeys } from "../strongGroup/groupSecret";
import { decryptStrongPayload } from "../strongGroup/eventCipher";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Pool Nostr falso: guarda o que é publicado e devolve `relayEvents` no pull.
const published: any[] = [];
let relayEvents: any[] = [];
// Último filtro e handler da assinatura, para simular a entrega ao vivo.
let lastSubFilter: any = null;
// Último filtro do pull; o pool falso aplica `since` e `limit` como um relay.
let lastQueryFilter: any = null;
let lastSubHandler: any = null;
let publishCalls = 0;
let publishRejectCondition: ((ev: any, callIndex: number) => boolean) | null = null;
let querySyncRejectError: Error | null = null;

vi.mock("nostr-tools/pool", () => ({
  SimplePool: class {
    publish(relays: string[], ev: any) {
      publishCalls++;
      if (publishRejectCondition && publishRejectCondition(ev, publishCalls)) {
        return relays.map(() => Promise.reject(new Error("Relay rejected event")));
      }
      published.push(ev);
      return relays.map(() => Promise.resolve("ok"));
    }
    querySync(_relays: string[], filter: any) {
      if (querySyncRejectError) {
        return Promise.reject(querySyncRejectError);
      }
      lastQueryFilter = filter;
      let out = relayEvents.filter((e) => {
        if (filter.since !== undefined && (e.created_at ?? 0) < filter.since) return false;
        if (filter.until !== undefined && (e.created_at ?? 0) > filter.until) return false;
        return true;
      });
      if (filter.limit !== undefined) {
        // Como um relay: os mais recentes por created_at primeiro, cortados no limite.
        out = [...out].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)).slice(0, filter.limit);
      }
      return Promise.resolve(out);
    }
    subscribeMany(_relays: string[], filter: any, handler: any) {
      lastSubFilter = filter;
      lastSubHandler = handler;
      return { close() {} };
    }
    close() {}
  },
}));

// eslint-disable-next-line import/first
import {
  parseSyncPayload,
  pullSyncEvents,
  publishSyncEvents,
  subscribeToSyncEvents,
  deriveKeysFromCode,
  computeStrongBatchId,
  closePool,
  type NostrSyncKeys,
  type PullSyncOptions,
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

function makeStrongKeys(): NostrSyncKeys {
  const secret = generateGroupSecret();
  const strong = deriveStrongGroupKeys(secret);
  return {
    privateKey: strong.nostrPrivateKey,
    publicKey: strong.nostrPublicKey,
    encryptionKey: strong.encryptionKey,
    isStrong: true,
  };
}

const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

/** Mesmo formato de `encryptPayload` (XOR com sha256(chave||nonce)). */
function encrypt(plain: string, encKey: Uint8Array): string {
  const nonce = new Uint8Array(16).map((_, i) => i + 1);
  const k = sha256(new Uint8Array([...encKey, ...nonce]));
  const bytes = new TextEncoder().encode(plain);
  return `${hex(nonce)}:${hex(bytes.map((b, i) => b ^ k[i % k.length]))}`;
}

/** Inverso de `encrypt`/`encryptPayload`: decifra o que o pool falso recebeu. */
function decrypt(content: string, encKey: Uint8Array): string {
  const [nonceHex, cipherHex] = content.split(":");
  const bytesOf = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));
  const nonce = bytesOf(nonceHex!);
  const k = sha256(new Uint8Array([...encKey, ...nonce]));
  return new TextDecoder().decode(bytesOf(cipherHex!).map((b, i) => b ^ k[i % k.length]));
}

const relayEvent = (id: string, content: string, created_at = 1_700_000_000) => ({
  id,
  tags: [["t", "domus-sync"]],
  content,
  created_at,
});

let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
  published.length = 0;
  relayEvents = [];
  lastSubFilter = null;
  lastQueryFilter = null;
  lastSubHandler = null;
  publishCalls = 0;
  publishRejectCondition = null;
  querySyncRejectError = null;
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
    expect(n.published).toBe(2);
    expect(published).toHaveLength(1);
    const logs = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logs).toContain("id=bad type=TRANSACTION_CREATED reason=invalid_timestamp");
    expect(logs).not.toContain("segredo");

    // O que foi publicado volta no pull só com os válidos.
    relayEvents = published.map((ev) => ({ ...ev, id: "pub-1" }));
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("Story 3.5: publicação e pull mantêm o timestamp idêntico, inclusive o adiantado", async () => {
    const keys = await deriveKeysFromCode("TESTE-35");
    const now = 1_792_627_200_000;
    const events = [
      valid({ id: "normal", timestamp: now }),
      valid({ id: "adiantado", timestamp: now + 25 * 60 * 60 * 1000 }),
    ] as any[];
    expect((await publishSyncEvents(keys, "dev-a", events)).published).toBe(2);
    relayEvents = published.map((ev) => ({ ...ev, id: "pub-35" }));
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled.map((e) => [e.id, e.timestamp])).toEqual(events.map((e) => [e.id, e.timestamp]));
    for (const e of pulled) expect(typeof e.timestamp).toBe("number");
  });

  it("revisão 23/10: eventos próprios 'local'/vazio são publicados com o id do aparelho", async () => {
    const keys = await deriveKeysFromCode("TESTE-2310");
    const events = [
      valid({ id: "loc", deviceId: "local" }),
      valid({ id: "LOC", deviceId: " LOCAL " }),
      valid({ id: "vazio", deviceId: "" }),
      valid({ id: "proprio", deviceId: "dev-a" }),
    ] as any[];
    const before = JSON.stringify(events);
    expect((await publishSyncEvents(keys, "dev-a", events)).published).toBe(4);
    const logs = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logs).not.toContain("invalid_device_id");
    expect(JSON.stringify(events)).toBe(before);

    relayEvents = published.map((ev) => ({ ...ev, id: "pub-2310" }));
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled.map((e) => [e.id, e.deviceId])).toEqual([
      ["loc", "dev-a"],
      ["LOC", "dev-a"],
      ["vazio", "dev-a"],
      ["proprio", "dev-a"],
    ]);
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
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
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
    await pullSyncEvents(keys, "dev-b", true);
    const logs2 = warn.mock.calls.map((c) => String(c[0]));
    expect(logs2).toEqual(["[NostrSync] Pull: 2 descartados de 6; 1 evento(s) do relay com JSON malformado."]);
  });
});

describe("Story 3.6: cursor dos relays pelo created_at", () => {
  const T = 1_792_627_200; // segundos
  const nowMs = T * 1000;

  it("evento novo e depois um antigo publicado depois: os dois voltam, maxCreatedAt = T+10 e o pull não tem since", async () => {
    const keys = await deriveKeysFromCode("TESTE-36");
    relayEvents = [
      relayEvent("r-novo", encrypt(JSON.stringify(valid({ id: "E1", timestamp: nowMs })), keys.encryptionKey), T),
      relayEvent(
        "r-antigo",
        encrypt(JSON.stringify(valid({ id: "E0", timestamp: nowMs - 24 * 3600 * 1000 })), keys.encryptionKey),
        T + 10,
      ),
      // Lote de um aparelho com relógio atrasado: created_at bem antigo, ainda assim volta.
      relayEvent("r-atrasado", encrypt(JSON.stringify(valid({ id: "Ea" })), keys.encryptionKey), T - 7 * 24 * 3600),
    ];
    const { events, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true);
    expect(events.map((e) => e.id).sort()).toEqual(["E0", "E1", "Ea"]);
    expect(maxCreatedAt).toBe(T + 10);
    expect(lastQueryFilter).not.toBeNull();
    expect("since" in lastQueryFilter).toBe(false);
    expect(lastQueryFilter.limit).toBe(500);
  });

  it("evento com timestamp +25 h: maxCreatedAt é o created_at (o since seguinte não vai para o futuro)", async () => {
    const keys = await deriveKeysFromCode("TESTE-36");
    const futureTs = nowMs + 25 * 3600 * 1000;
    relayEvents = [relayEvent("r-fut", encrypt(JSON.stringify(valid({ id: "F", timestamp: futureTs })), keys.encryptionKey), T)];
    const { events, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true);
    expect(events.map((e) => [e.id, e.timestamp])).toEqual([["F", futureTs]]);
    expect(maxCreatedAt).toBe(T);
    // A assinatura montada com esse cursor começa antes de T e recebe o próximo evento.
    expect(subscriptionSince(maxCreatedAt, T + 5)).toBe(T - 60);
  });

  it("created_at de evento sem a tag do app, que não decripta ou não finito não conta", async () => {
    const keys = await deriveKeysFromCode("TESTE-36");
    relayEvents = [
      relayEvent("r-ok", encrypt(JSON.stringify(valid({ id: "ok" })), keys.encryptionKey), T),
      { ...relayEvent("r-sem-tag", encrypt(JSON.stringify(valid({ id: "x" })), keys.encryptionKey), T + 500), tags: [] },
      relayEvent("r-lixo", "nao-decripta", T + 900),
      relayEvent("r-nan", encrypt(JSON.stringify(valid({ id: "nan" })), keys.encryptionKey), Number.NaN),
    ];
    const { maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true);
    expect(maxCreatedAt).toBe(T);
  });

  it("pull sem eventos devolve maxCreatedAt null", async () => {
    const keys = await deriveKeysFromCode("TESTE-36");
    expect(await pullSyncEvents(keys, "dev-b", true)).toEqual({ events: [], maxCreatedAt: null });
  });

  it("assinatura: usa o since recebido e o callback recebe o created_at", async () => {
    const keys = await deriveKeysFromCode("TESTE-36");
    const got: [string, number][] = [];
    subscribeToSyncEvents(keys, "dev-b", subscriptionSince(T, T + 3600), (evt, createdAt) => got.push([evt.id, createdAt]));
    expect(lastSubFilter.since).toBe(T - 60);
    expect(lastSubFilter["#t"]).toEqual(["domus-sync"]);

    lastSubHandler.onevent(relayEvent("live", encrypt(JSON.stringify(valid({ id: "L" })), keys.encryptionKey), T + 5));
    await vi.waitFor(() => expect(got).toEqual([["L", T + 5]]));
  });
});

describe("Story 11.4: PAYSLIP_* fora do Grupo antigo", () => {
  const payslip = (id: string, type = "PAYSLIP_RECORDED") =>
    valid({
      id,
      type,
      payload:
        type === "PAYSLIP_RECORDED"
          ? { id: "p1", period: "2026-09", company: "ACME", grossSalary: 9876.54, netSalary: 7654.32, deductions: [], schemaVersion: 1 }
          : { id: "p1", schemaVersion: 1 },
    });

  it("publish: lote misto sai só com a transação; decifrado, nenhum PAYSLIP_*", async () => {
    const keys = await deriveKeysFromCode("TESTE-114");
    const events = [valid({ id: "tx" }), payslip("rec"), payslip("del", "PAYSLIP_DELETED")] as any[];
    const before = JSON.stringify(events);
    expect((await publishSyncEvents(keys, "dev-a", events)).published).toBe(1);
    expect(JSON.stringify(events)).toBe(before);
    expect(published).toHaveLength(1);
    const plain = decrypt(published[0].content, keys.encryptionKey);
    const sent = JSON.parse(plain) as { id: string; type: string }[];
    expect(sent.map((e) => [e.id, e.type])).toEqual([["tx", "TRANSACTION_CREATED"]]);
    expect(plain).not.toContain("PAYSLIP_");
    expect(plain).not.toContain("7654.32");
    expect(published[0].tags).toContainEqual(["batch", "1"]);
  });

  it("publish: lote só de holerites não publica nada e devolve 0", async () => {
    const keys = await deriveKeysFromCode("TESTE-114");
    const events = [payslip("rec"), payslip("del", "PAYSLIP_DELETED")] as any[];
    expect((await publishSyncEvents(keys, "dev-a", events)).published).toBe(0);
    expect(published).toHaveLength(0);
  });

  it("decisão 3a: pull descarta PAYSLIP_* recebido, com aviso único por evento e sem payload", async () => {
    const keys = await deriveKeysFromCode("TESTE-114");
    relayEvents = [
      relayEvent("r1", encrypt(JSON.stringify([valid({ id: "tx" }), payslip("rec-x"), payslip("del-x", "PAYSLIP_DELETED")]), keys.encryptionKey)),
    ];
    const { events } = await pullSyncEvents(keys, "dev-b", true);
    expect(events.map((e) => e.id)).toEqual(["tx"]);
    const logs = warn.mock.calls.map((c) => String(c[0]));
    expect(logs.filter((l) => l.includes("id=rec-x type=PAYSLIP_RECORDED"))).toHaveLength(1);
    expect(logs.filter((l) => l.includes("id=del-x type=PAYSLIP_DELETED"))).toHaveLength(1);
    expect(logs.join("\n")).not.toContain("7654.32");

    // Segundo pull: os mesmos eventos continuam fora, sem repetir o aviso.
    warn.mockClear();
    const again = await pullSyncEvents(keys, "dev-b", true);
    expect(again.events.map((e) => e.id)).toEqual(["tx"]);
    expect(warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("PAYSLIP_"))).toEqual([]);
  });

  it("decisão 3a: assinatura ao vivo também descarta PAYSLIP_*", async () => {
    const keys = await deriveKeysFromCode("TESTE-114");
    const got: string[] = [];
    subscribeToSyncEvents(keys, "dev-b", 0, (evt) => got.push(evt.id));
    lastSubHandler.onevent(
      relayEvent("live-114", encrypt(JSON.stringify([payslip("rec-live"), valid({ id: "L2" })]), keys.encryptionKey)),
    );
    await vi.waitFor(() => expect(got).toEqual(["L2"]));
  });
});

describe("revisão 11.4 — R12: publicador único do Grupo antigo", () => {
  const root = path.resolve(__dirname, "../../..");
  const nostrSyncPath = path.resolve(__dirname, "../nostrSync.ts");

  function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "__tests__" || name === "testing") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) sourceFiles(full, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
    return out;
  }

  it("finalizeEvent( e .publish( só aparecem dentro de publishSyncEvents", () => {
    const src = readFileSync(nostrSyncPath, "utf8").replace(/\r\n/g, "\n");
    const start = src.indexOf("export async function publishSyncEvents(");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("\n}\n", start);
    expect(end).toBeGreaterThan(start);
    for (const re of [/finalizeEvent\(/g, /\.publish\(/g]) {
      const at = [...src.matchAll(re)].map((m) => m.index!);
      expect(at.length, String(re)).toBeGreaterThan(0);
      for (const i of at) expect(i > start && i < end, `${re} fora de publishSyncEvents`).toBe(true);
    }
  });

  it("nenhum outro arquivo de src/ ou app/ assina ou publica eventos Nostr", () => {
    const offenders = ["src", "app"]
      .flatMap((d) => sourceFiles(path.join(root, d)))
      .filter((f) => path.resolve(f) !== nostrSyncPath)
      .filter((f) => /finalizeEvent|\.publish\(|new SimplePool/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});

describe("Story 4.5: Publicar e ler eventos no Grupo forte", () => {
  const payslip = (id: string, type = "PAYSLIP_RECORDED") =>
    valid({
      id,
      type,
      payload:
        type === "PAYSLIP_RECORDED"
          ? { id: "p1", period: "2026-09", company: "ACME", grossSalary: 9876.54, netSalary: 7654.32, deductions: [], schemaVersion: 1 }
          : { id: "p1", schemaVersion: 1 },
    });

  it("publicação no Grupo forte: cifra com AES-GCM (domus-gcm-v1.), assina com pubkey forte e transmite PAYSLIP_*", async () => {
    const keys = makeStrongKeys();
    const events = [
      valid({ id: "tx-1" }),
      payslip("rec-1", "PAYSLIP_RECORDED"),
      payslip("del-1", "PAYSLIP_DELETED"),
    ] as any[];

    const count = await publishSyncEvents(keys, "dev-a", events);
    expect(count.published).toBe(3);
    expect(published).toHaveLength(1);

    const ev = published[0];
    expect(ev.pubkey).toBe(keys.publicKey);
    expect(ev.content.startsWith("domus-gcm-v1.")).toBe(true);

    // Decifra com decryptStrongPayload e verifica presença de holerite
    const res = decryptStrongPayload(ev.content, {
      encryptionKey: keys.encryptionKey,
      nostrPublicKey: keys.publicKey,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("Falha inesperada na decifra");

    const batch = JSON.parse(res.plaintext) as { id: string; type: string }[];
    expect(batch.map((e) => [e.id, e.type])).toEqual([
      ["tx-1", "TRANSACTION_CREATED"],
      ["rec-1", "PAYSLIP_RECORDED"],
      ["del-1", "PAYSLIP_DELETED"],
    ]);
  });

  it("lote grande no Grupo forte (> 32 KB): particiona em múltiplos lotes respeitando STRONG_MAX_PLAINTEXT_BYTES", async () => {
    const keys = makeStrongKeys();
    // 10 eventos com payload de 4 KB cada -> ~42 KB total (> 32 KB)
    const longText = "x".repeat(4000);
    const largeEvents = Array.from({ length: 10 }, (_, i) =>
      valid({
        id: `large-${i}`,
        payload: { note: longText, index: i },
      }),
    ) as any[];

    const count = await publishSyncEvents(keys, "dev-a", largeEvents);
    expect(count.published).toBe(10);
    expect(published.length).toBeGreaterThan(1); // Particionado em ao menos 2 lotes

    // Cada lote publicado deve ser um evento Nostr com domus-gcm-v1. válido
    for (const p of published) {
      expect(p.content.startsWith("domus-gcm-v1.")).toBe(true);
      const dec = decryptStrongPayload(p.content, {
        encryptionKey: keys.encryptionKey,
        nostrPublicKey: keys.publicKey,
      });
      expect(dec.ok).toBe(true);
    }

    // Pull traz todos os 10 eventos
    relayEvents = published.map((ev, idx) => ({ ...ev, id: `relay-${idx}`, created_at: 1_700_000_000 - idx }));
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled).toHaveLength(10);
    expect(pulled.map((e) => e.id).sort()).toEqual(largeEvents.map((e) => e.id).sort());
  });

  it("leitura / pull no Grupo forte: decifra domus-gcm-v1. e importa todos os eventos (inclusive PAYSLIP_*)", async () => {
    const keys = makeStrongKeys();
    const events = [
      valid({ id: "tx-2" }),
      payslip("rec-2", "PAYSLIP_RECORDED"),
      payslip("del-2", "PAYSLIP_DELETED"),
    ] as any[];

    await publishSyncEvents(keys, "dev-a", events);
    relayEvents = published.map((ev, idx) => ({ ...ev, id: `pub-${idx}` }));

    const { events: pulled, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled.map((e) => e.id)).toEqual(["tx-2", "rec-2", "del-2"]);
    expect(pulled.find((e) => e.id === "rec-2")?.type).toBe("PAYSLIP_RECORDED");
    expect(pulled.find((e) => e.id === "del-2")?.type).toBe("PAYSLIP_DELETED");
    expect(typeof maxCreatedAt).toBe("number");
  });

  it("terceiro sem o Segredo forte falha na decifra nos relays", async () => {
    const keys = makeStrongKeys();
    const otherKeys = makeStrongKeys();

    await publishSyncEvents(keys, "dev-a", [valid({ id: "secret-tx" }), payslip("rec-3")]);
    // Mesmo que o relay entregue o evento para o terceiro:
    relayEvents = published.map((ev, idx) => ({ ...ev, id: `leak-${idx}` }));

    const { events: pulledByThirdParty } = await pullSyncEvents(otherKeys, "dev-third", true);
    expect(pulledByThirdParty).toEqual([]);

    // Decifra manual com chave do terceiro falha com auth-failed
    const attempt = decryptStrongPayload(published[0].content, {
      encryptionKey: otherKeys.encryptionKey,
      nostrPublicKey: otherKeys.publicKey,
    });
    expect(attempt).toEqual({ ok: false, reason: "auth-failed" });

    // Tentativa de decifrar o content domus-gcm-v1. com XOR legado também falha
    expect(() => decrypt(published[0].content, keys.encryptionKey)).toThrow();
  });

  it("evento adulterado no relay é descartado silenciosamente no Grupo forte", async () => {
    const keys = makeStrongKeys();
    await publishSyncEvents(keys, "dev-a", [valid({ id: "tx-valid" })]);

    // Adultera um caractere do texto cifrado de forma garantida
    const originalContent = published[0].content;
    const targetIdx = originalContent.length - 5;
    const charToReplace = originalContent[targetIdx];
    const replacementChar = charToReplace === "X" ? "Y" : "X";
    const tamperedContent =
      originalContent.slice(0, targetIdx) +
      replacementChar +
      originalContent.slice(targetIdx + 1);

    relayEvents = [{ ...published[0], id: "tampered-1", content: tamperedContent }];
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled).toEqual([]);
  });

  it("isolamento total entre Grupo antigo e Grupo forte", async () => {
    const strongKeys = makeStrongKeys();
    const oldKeys = await deriveKeysFromCode("ANTIGO-1");

    // Publica no Grupo forte
    await publishSyncEvents(strongKeys, "dev-strong", [valid({ id: "strong-evt" })]);

    // O filtro de pull do Grupo antigo consulta estritamente authors: [oldKeys.publicKey]
    expect(oldKeys.publicKey).not.toBe(strongKeys.publicKey);

    // Se o relay do Grupo antigo recebesse o evento forte (adulteração de relay):
    relayEvents = published.map((ev, idx) => ({ ...ev, id: `relay-cross-${idx}` }));
    const { events: pulledOld } = await pullSyncEvents(oldKeys, "dev-old", true);
    expect(pulledOld).toEqual([]); // Ignorado pelo Grupo antigo

    // Se o relay do Grupo antigo recebesse um PAYSLIP_* em XOR, é descartado
    relayEvents = [
      relayEvent("rogue-slip", encrypt(JSON.stringify([payslip("rogue-rec")]), oldKeys.encryptionKey)),
    ];
    const { events: pulledRogue } = await pullSyncEvents(oldKeys, "dev-old", true);
    expect(pulledRogue).toEqual([]);
  });

  it("assinatura ao vivo (subscribeToSyncEvents) no Grupo forte decifra e repassa PAYSLIP_*", async () => {
    const keys = makeStrongKeys();
    const got: string[] = [];
    subscribeToSyncEvents(keys, "dev-b", 0, (evt) => got.push(evt.id));

    // Publica evento para obter o content cifrado domus-gcm-v1.
    await publishSyncEvents(keys, "dev-a", [payslip("live-slip", "PAYSLIP_RECORDED")]);
    const liveNostrEvent = published[0];

    lastSubHandler.onevent({
      id: "live-strong-evt",
      created_at: 1_700_000_100,
      tags: [["t", "domus-sync"]],
      content: liveNostrEvent.content,
    });

    await vi.waitFor(() => expect(got).toEqual(["live-slip"]));
  });

  it("Story 5.5: subscribeToSyncEvents despacha lote completo via onBatch quando fornecido", async () => {
    const keys = makeStrongKeys();
    const batchGot: { ids: string[]; createdAt: number }[] = [];
    const singleGot: string[] = [];

    const events = Array.from({ length: 5 }, (_, i) => valid({ id: `batch-live-${i}` }));
    await publishSyncEvents(keys, "dev-a", events);
    const liveNostrEvent = published[published.length - 1];

    subscribeToSyncEvents(
      keys,
      "dev-b",
      0,
      (evt) => singleGot.push(evt.id),
      (evts, createdAt) => batchGot.push({ ids: evts.map((e) => e.id), createdAt }),
    );

    lastSubHandler.onevent({
      id: "live-batch-evt",
      created_at: 1_700_000_150,
      tags: [["t", "domus-sync"]],
      content: liveNostrEvent.content,
    });

    await vi.waitFor(() => {
      expect(batchGot).toEqual([
        {
          ids: ["batch-live-0", "batch-live-1", "batch-live-2", "batch-live-3", "batch-live-4"],
          createdAt: 1_700_000_150,
        },
      ]);
      expect(singleGot).toHaveLength(0);
    });
  });

  it("Story 5.5: subscribeToSyncEvents despacha lote completo via onBatch no canal legado (XOR)", async () => {
    const keys = await deriveKeysFromCode("LEGACY-BATCH-123");
    const batchGot: { ids: string[]; createdAt: number }[] = [];
    const singleGot: string[] = [];

    const events = [valid({ id: "leg-batch-1" }), valid({ id: "leg-batch-2" })];
    const encrypted = encrypt(JSON.stringify(events), keys.encryptionKey);

    subscribeToSyncEvents(
      keys,
      "dev-b",
      0,
      (evt) => singleGot.push(evt.id),
      (evts, createdAt) => batchGot.push({ ids: evts.map((e) => e.id), createdAt }),
    );

    lastSubHandler.onevent(relayEvent("live-leg-batch", encrypted, 1_700_000_333));

    await vi.waitFor(() => {
      expect(batchGot).toEqual([
        {
          ids: ["leg-batch-1", "leg-batch-2"],
          createdAt: 1_700_000_333,
        },
      ]);
      expect(singleGot).toHaveLength(0);
    });
  });

  it("teto de 20 itens por lote no Grupo forte: 25 eventos geram 2 lotes (20 e 5)", async () => {
    const keys = makeStrongKeys();
    const events = Array.from({ length: 25 }, (_, i) => valid({ id: `item-${i}` }));

    const count = await publishSyncEvents(keys, "dev-a", events);
    expect(count.published).toBe(25);
    expect(published).toHaveLength(2);

    expect(published[0].tags).toContainEqual(["batch", "20"]);
    expect(published[1].tags).toContainEqual(["batch", "5"]);

    const dec1 = decryptStrongPayload(published[0].content, {
      encryptionKey: keys.encryptionKey,
      nostrPublicKey: keys.publicKey,
    });
    const dec2 = decryptStrongPayload(published[1].content, {
      encryptionKey: keys.encryptionKey,
      nostrPublicKey: keys.publicKey,
    });
    expect(dec1.ok).toBe(true);
    expect(dec2.ok).toBe(true);
    if (!dec1.ok || !dec2.ok) throw new Error("Falha na decifra");

    expect(JSON.parse(dec1.plaintext)).toHaveLength(20);
    expect(JSON.parse(dec2.plaintext)).toHaveLength(5);
  });

  it("envelope individual acima de 32 KB é descartado com aviso e os demais são publicados", async () => {
    const keys = makeStrongKeys();
    // Um evento individual sozinho com payload de 35 KB (> STRONG_MAX_PLAINTEXT_BYTES = 32 KB)
    const giantEvent = valid({ id: "giant", payload: { data: "y".repeat(35 * 1024) } });
    const normalEvent = valid({ id: "normal-ok" });

    const count = await publishSyncEvents(keys, "dev-a", [giantEvent, normalEvent]);
    expect(count.published).toBe(1);
    expect(published).toHaveLength(1);

    const res = decryptStrongPayload(published[0].content, {
      encryptionKey: keys.encryptionKey,
      nostrPublicKey: keys.publicKey,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("Falha na decifra");
    expect(JSON.parse(res.plaintext).map((e: any) => e.id)).toEqual(["normal-ok"]);

    // Confere aviso emitido sem expor payload
    const logs = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logs).toContain("id=giant");
    expect(logs).not.toContain("yyyy");
  });

  it("assinatura ao vivo (subscribeToSyncEvents) no Grupo forte ignora eventos corrompidos ou em formato desconhecido", async () => {
    const keys = makeStrongKeys();
    const got: string[] = [];
    subscribeToSyncEvents(keys, "dev-b", 0, (evt) => got.push(evt.id));

    // 1. Formato desconhecido (texto aleatório)
    lastSubHandler.onevent({
      id: "live-unknown",
      created_at: 1_700_000_200,
      tags: [["t", "domus-sync"]],
      content: "formato_desconhecido",
    });

    // 2. Formato legado XOR em canal forte
    lastSubHandler.onevent({
      id: "live-legacy-xor",
      created_at: 1_700_000_201,
      tags: [["t", "domus-sync"]],
      content: encrypt(JSON.stringify([valid({ id: "xor-in-strong" })]), keys.encryptionKey),
    });

    // 3. Formato domus-gcm-v1 com base64 adulterado (auth-failed)
    await publishSyncEvents(keys, "dev-a", [valid({ id: "valid-live" })]);
    const validContent = published[published.length - 1].content;
    const targetIdx = validContent.length - 5;
    const flippedChar = validContent.charAt(targetIdx) === "X" ? "Y" : "X";
    const tamperedContent =
      validContent.slice(0, targetIdx) +
      flippedChar +
      validContent.slice(targetIdx + 1);

    lastSubHandler.onevent({
      id: "live-tampered",
      created_at: 1_700_000_202,
      tags: [["t", "domus-sync"]],
      content: tamperedContent,
    });

    // Nenhuma das mensagens corrompidas deve invocar o callback
    expect(got).toEqual([]);

    // Agora entrega evento válido e confirma que é recebido normalmente
    lastSubHandler.onevent({
      id: "live-valid",
      created_at: 1_700_000_203,
      tags: [["t", "domus-sync"]],
      content: validContent,
    });

    await vi.waitFor(() => expect(got).toEqual(["valid-live"]));
  });
});

describe("Story 5.2 - Confirmação de envio por lote e relatório discriminado (nostrSync)", () => {
  it("lista vazia retorna resultado zerado e sem chamadas de rede", async () => {
    const keys = makeStrongKeys();
    const result = await publishSyncEvents(keys, "dev-a", []);
    expect(result).toEqual({
      published: 0,
      confirmedEventIds: [],
      failedEventIds: [],
      rejectedEventIds: [],
      batches: [],
    });
    expect(publishCalls).toBe(0);
    expect(published).toHaveLength(0);
  });

  it("todos os lotes confirmados: retorna confirmedEventIds completos e failedEventIds vazio", async () => {
    const keys = makeStrongKeys();
    const events = Array.from({ length: 40 }, (_, i) => valid({ id: `evt-${i}` }));

    const result = await publishSyncEvents(keys, "dev-a", events);
    expect(result.published).toBe(40);
    expect(result.confirmedEventIds).toHaveLength(40);
    expect(result.confirmedEventIds).toEqual(events.map((e) => e.id));
    expect(result.failedEventIds).toEqual([]);
    expect(result.batches).toHaveLength(2);
    expect(result.batches[0].success).toBe(true);
    expect(result.batches[0].batchIndex).toBe(0);
    expect(result.batches[0].batchId).toBe(computeStrongBatchId("dev-a", events.slice(0, 20)));
    expect(result.batches[0].batchId).toMatch(/^sync-dev-a-[0-9a-f]{16}$/);
    expect(result.batches[0].eventIds).toHaveLength(20);
    expect(result.batches[1].success).toBe(true);
    expect(result.batches[1].batchIndex).toBe(1);
    expect(result.batches[1].batchId).toBe(computeStrongBatchId("dev-a", events.slice(20, 40)));
    expect(result.batches[1].batchId).toMatch(/^sync-dev-a-[0-9a-f]{16}$/);
    expect(result.batches[1].eventIds).toHaveLength(20);
  });

  it("falha parcial de lotes: Lote 0 confirmado, Lote 1 falha em todos os relays", async () => {
    const keys = makeStrongKeys();
    const events = Array.from({ length: 25 }, (_, i) => valid({ id: `evt-${i}` }));

    // Rejeita a segunda chamada de publicação (Lote 1)
    publishRejectCondition = (_ev, callIndex) => callIndex === 2;

    const result = await publishSyncEvents(keys, "dev-a", events);
    expect(result.published).toBe(20);
    expect(result.confirmedEventIds).toHaveLength(20);
    expect(result.failedEventIds).toHaveLength(5);
    expect(result.confirmedEventIds).toEqual(events.slice(0, 20).map((e) => e.id));
    expect(result.failedEventIds).toEqual(events.slice(20).map((e) => e.id));

    expect(result.batches).toHaveLength(2);
    expect(result.batches[0].success).toBe(true);
    expect(result.batches[1].success).toBe(false);
    expect(result.batches[1].error).toBeDefined();
    expect(published).toHaveLength(1);
  });

  it("todos os lotes falharam: nenhum evento confirmado e todos listados em failedEventIds", async () => {
    const keys = makeStrongKeys();
    const events = Array.from({ length: 20 }, (_, i) => valid({ id: `evt-${i}` }));

    // Todos os relays rejeitam
    publishRejectCondition = () => true;

    const result = await publishSyncEvents(keys, "dev-a", events);
    expect(result.published).toBe(0);
    expect(result.confirmedEventIds).toEqual([]);
    expect(result.failedEventIds).toHaveLength(20);
    expect(result.failedEventIds).toEqual(events.map((e) => e.id));
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].success).toBe(false);
    expect(published).toHaveLength(0);
  });

  it("envelopes rejeitados por validação são discriminados em rejectedEventIds e não entram em failedEventIds", async () => {
    const keys = makeStrongKeys();
    const badTimestamp = valid({ id: "bad-time", timestamp: 1_700_000_000 }); // inválido em validateEnvelope (< 2020)
    const validEvt = valid({ id: "good-evt" });

    const result = await publishSyncEvents(keys, "dev-a", [badTimestamp, validEvt]);
    expect(result.published).toBe(1);
    expect(result.confirmedEventIds).toEqual(["good-evt"]);
    expect(result.failedEventIds).toEqual([]);
    expect(result.rejectedEventIds).toEqual(["bad-time"]);
    expect(published).toHaveLength(1);
  });

  it("lote onde todos os envelopes são inválidos: retorna rejectedEventIds sem chamadas de rede aos relays", async () => {
    const keys = makeStrongKeys();
    const bad1 = valid({ id: "bad-1", timestamp: 1_000 });
    const bad2 = valid({ id: "bad-2", payload: null as any });

    const result = await publishSyncEvents(keys, "dev-a", [bad1, bad2]);
    expect(result.published).toBe(0);
    expect(result.confirmedEventIds).toEqual([]);
    expect(result.failedEventIds).toEqual([]);
    expect(result.rejectedEventIds).toEqual(["bad-1", "bad-2"]);
    expect(result.batches).toEqual([]);
    expect(publishCalls).toBe(0);
    expect(published).toHaveLength(0);
  });

  describe("Story 5.3: Lotes imutáveis content-addressed no Grupo forte e preservação do Grupo antigo", () => {
    it("computeStrongBatchId: determinismo, unicidade por conteúdo e formato", () => {
      const e1 = valid({ id: "evt-1" });
      const e2 = valid({ id: "evt-2" });
      const batchA = [e1, e2];
      const batchB = [e1, valid({ id: "evt-2", payload: { amount: 999 } })];

      const id1 = computeStrongBatchId("dev-x", batchA);
      const id2 = computeStrongBatchId("dev-x", batchA);
      const idDifferentContent = computeStrongBatchId("dev-x", batchB);
      const idDifferentDevice = computeStrongBatchId("dev-y", batchA);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^sync-dev-x-[0-9a-f]{16}$/);
      expect(idDifferentContent).toMatch(/^sync-dev-x-[0-9a-f]{16}$/);
      expect(id1).not.toBe(idDifferentContent);
      // Mesmo conteúdo em aparelho diferente tem o mesmo hash de conteúdo
      const hashA = id1.replace("sync-dev-x-", "");
      const hashDevY = idDifferentDevice.replace("sync-dev-y-", "");
      expect(hashA).toBe(hashDevY);
    });

    it("Grupo antigo: preserva estritamente formato indexado substituível (sync-${deviceId}-${batchIndex})", async () => {
      const oldKeys = await deriveKeysFromCode("GRUPO-ANTIGO-53");
      const events = Array.from({ length: 25 }, (_, i) => valid({ id: `legacy-${i}` }));

      const result = await publishSyncEvents(oldKeys, "dev-legacy", events);
      expect(result.published).toBe(25);
      expect(result.batches).toHaveLength(2);
      expect(result.batches[0].batchId).toBe("sync-dev-legacy-0");
      expect(result.batches[1].batchId).toBe("sync-dev-legacy-1");

      expect(published).toHaveLength(2);
      expect(published[0].tags.find((t: string[]) => t[0] === "d")?.[1]).toBe("sync-dev-legacy-0");
      expect(published[1].tags.find((t: string[]) => t[0] === "d")?.[1]).toBe("sync-dev-legacy-1");
    });

    it("Grupo forte: tag 'd' do Nostr contém o batchId content-addressed", async () => {
      const strongKeys = makeStrongKeys();
      const events = [valid({ id: "strong-1" }), valid({ id: "strong-2" })];

      const result = await publishSyncEvents(strongKeys, "dev-strong", events);
      expect(result.published).toBe(2);
      expect(result.batches).toHaveLength(1);

      const expectedBatchId = computeStrongBatchId("dev-strong", events);
      expect(result.batches[0].batchId).toBe(expectedBatchId);

      expect(published).toHaveLength(1);
      expect(published[0].tags.find((t: string[]) => t[0] === "d")?.[1]).toBe(expectedBatchId);
    });
  });

  describe("Story 5.4: leitura incremental e paginada (pullSyncEvents)", () => {
    const baseTime = 1_700_000_000;

    it("recupera histórico de 1.200 lotes via paginação retroativa sem cursor", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-PAG");
      relayEvents = Array.from({ length: 1200 }, (_, i) =>
        relayEvent(`r-${i}`, encrypt(JSON.stringify(valid({ id: `e-${i}` })), keys.encryptionKey), baseTime + i),
      );

      const { events, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true);
      expect(events).toHaveLength(1200);
      expect(maxCreatedAt).toBe(baseTime + 1199);
      const ids = new Set(events.map((e) => e.id));
      expect(ids.size).toBe(1200);
    });

    it("busca incremental com cursor: aplica since no filtro e busca apenas eventos posteriores", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-INCR");
      relayEvents = Array.from({ length: 10 }, (_, i) =>
        relayEvent(`r-${i}`, encrypt(JSON.stringify(valid({ id: `e-${i}` })), keys.encryptionKey), baseTime + i * 10),
      );

      const options: PullSyncOptions = { cursor: baseTime + 70 };
      const { events, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true, options);
      // Com janela de 60s, since é baseTime + 10 (70 - 60): traz os eventos com created_at >= baseTime + 10 (e-1..e-9)
      expect(events).toHaveLength(9);
      expect(maxCreatedAt).toBe(baseTime + 90);
      expect(lastQueryFilter.since).toBe(baseTime + 10);
    });

    it("falha/rejeição de relays durante pullSyncEvents lança erro e não atualiza cursor", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-REJECT");
      querySyncRejectError = new Error("Relay connection refused");
      await expect(pullSyncEvents(keys, "dev-b", true)).rejects.toThrow("Relay connection refused");
    });

    it("paginação combinada (> 500 eventos) com filtro since/cursor ativo recupera todos os novos", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-PAG-SINCE");
      // 1.200 eventos no relay
      relayEvents = Array.from({ length: 1200 }, (_, i) =>
        relayEvent(`r-${i}`, encrypt(JSON.stringify(valid({ id: `e-${i}` })), keys.encryptionKey), baseTime + i),
      );

      // Filtro since a partir de baseTime + 500 (devem vir 700 eventos: 500 a 1199)
      const { events, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true, {
        since: baseTime + 500,
      });
      expect(events).toHaveLength(700);
      expect(maxCreatedAt).toBe(baseTime + 1199);
      expect(events.map((e) => e.id)).toContain("e-500");
      expect(events.map((e) => e.id)).toContain("e-1199");
      expect(events.map((e) => e.id)).not.toContain("e-499");
    });

    it("aplica janela de sobreposição de 60 segundos em since derivado de cursor para tolerar clock skew", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-SKEW");
      // Evento de peer com relógio 30s atrás do cursor do aparelho local
      relayEvents = [
        relayEvent("r-skewed", encrypt(JSON.stringify(valid({ id: "e-skewed" })), keys.encryptionKey), baseTime + 70),
        relayEvent("r-current", encrypt(JSON.stringify(valid({ id: "e-current" })), keys.encryptionKey), baseTime + 105),
      ];

      // Cursor local está em baseTime + 100.
      // Com tolerância de 60s, since enviado ao relay deve ser baseTime + 40 (100 - 60).
      const { events } = await pullSyncEvents(keys, "dev-b", true, { cursor: baseTime + 100 });
      expect(lastQueryFilter.since).toBe(baseTime + 40);
      expect(events.map((e) => e.id)).toEqual(["e-current", "e-skewed"]);
    });

    it("parâmetro since explícito em options tem precedência e aplica filtro", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-SINCE");
      relayEvents = [
        relayEvent("r-old", encrypt(JSON.stringify(valid({ id: "e-old" })), keys.encryptionKey), baseTime + 10),
        relayEvent("r-new", encrypt(JSON.stringify(valid({ id: "e-new" })), keys.encryptionKey), baseTime + 50),
      ];

      const { events } = await pullSyncEvents(keys, "dev-b", true, { since: baseTime + 30 });
      expect(events.map((e) => e.id)).toEqual(["e-new"]);
      expect(lastQueryFilter.since).toBe(baseTime + 30);
    });

    it("cursor nulo ou indefinido não inclui since no filtro (recuperação completa)", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-NOCURSOR");
      relayEvents = [
        relayEvent("r-1", encrypt(JSON.stringify(valid({ id: "e-1" })), keys.encryptionKey), baseTime + 10),
      ];

      await pullSyncEvents(keys, "dev-b", true, { cursor: null });
      expect("since" in lastQueryFilter).toBe(false);
    });

    it("salvaguarda: fronteira com múltiplos eventos com mesmo created_at termina sem loop infinito", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-BOUNDARY");
      relayEvents = Array.from({ length: 600 }, (_, i) =>
        relayEvent(
          `r-${i}`,
          encrypt(JSON.stringify(valid({ id: `e-${i}` })), keys.encryptionKey),
          i < 500 ? baseTime : baseTime - 1,
        ),
      );

      const { events } = await pullSyncEvents(keys, "dev-b", true);
      expect(events).toHaveLength(600);
    });

    it("salvaguarda: paginação para quando não há novos eventos retornados", async () => {
      const keys = await deriveKeysFromCode("TESTE-54-EMPTY");
      relayEvents = [];

      const { events, maxCreatedAt } = await pullSyncEvents(keys, "dev-b", true);
      expect(events).toEqual([]);
      expect(maxCreatedAt).toBeNull();
    });
  });
});
