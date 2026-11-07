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

vi.mock("nostr-tools/pool", () => ({
  SimplePool: class {
    publish(relays: string[], ev: any) {
      published.push(ev);
      return relays.map(() => Promise.resolve("ok"));
    }
    querySync(_relays: string[], filter: any) {
      lastQueryFilter = filter;
      let out = relayEvents.filter((e) => filter.since === undefined || (e.created_at ?? 0) >= filter.since);
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
  closePool,
  type NostrSyncKeys,
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
    expect(await publishSyncEvents(keys, "dev-a", events)).toBe(2);
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
    expect(await publishSyncEvents(keys, "dev-a", events)).toBe(4);
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
    expect(await publishSyncEvents(keys, "dev-a", events)).toBe(1);
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
    expect(await publishSyncEvents(keys, "dev-a", events)).toBe(0);
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
      if (name === "node_modules" || name === "__tests__") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) sourceFiles(full, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
    return out;
  }

  it("finalizeEvent( e .publish( só aparecem dentro de publishSyncEvents", () => {
    const src = readFileSync(nostrSyncPath, "utf8");
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
    expect(count).toBe(3);
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
    expect(count).toBe(10);
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
    relayEvents = published.map((ev, idx) => ({ ...ev, id: `relay-${idx}` }));
    const { events: pulled } = await pullSyncEvents(keys, "dev-b", true);
    expect(pulled).toHaveLength(10);
    expect(pulled.map((e) => e.id)).toEqual(largeEvents.map((e) => e.id));
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

    // Adultera um caractere do texto cifrado
    const originalContent = published[0].content;
    const tamperedContent =
      originalContent.slice(0, originalContent.length - 5) +
      (originalContent.endsWith("A") ? "B" : "A") +
      originalContent.slice(originalContent.length - 4);

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

  it("teto de 20 itens por lote no Grupo forte: 25 eventos geram 2 lotes (20 e 5)", async () => {
    const keys = makeStrongKeys();
    const events = Array.from({ length: 25 }, (_, i) => valid({ id: `item-${i}` }));

    const count = await publishSyncEvents(keys, "dev-a", events);
    expect(count).toBe(25);
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
    expect(count).toBe(1);
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
    const tamperedContent =
      validContent.slice(0, validContent.length - 5) +
      (validContent.endsWith("X") ? "Y" : "X") +
      validContent.slice(validContent.length - 4);

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
