/**
 * Story 5.1: Teste de sincronização com três aparelhos simulados e relay em memória.
 *
 * Valida:
 * 1. Decisões puras de publicação e importação (shouldPublishGroupEvents, processIncomingEvents).
 * 2. Funcionamento do FakeMemoryRelay em memória com NIP-33 e telemetria de publicações.
 * 3. Simulação com 3 nós virtuais trocando N eventos e convergindo para o mesmo AppState.
 * 4. Prevenção de loops de eco e republicações infinitas (taxa de publicação = 1 por evento).
 * 5. Resiliência a nó offline temporário e reconciliação determinística pós-reconexão.
 *
 * Execução 100% no Vitest sem react-native, react ou APIs nativas do Expo (< 2s).
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  shouldPublishGroupEvents,
  processIncomingEvents,
  computeEventHash,
  processPushResult,
} from "../syncDecisions";
import { FakeMemoryRelay } from "../testing/fakeMemoryRelay";
import {
  createSimulatedDevice,
  type SimulatedSyncDevice,
} from "../testing/simulatedDevice";
import {
  generateGroupSecret,
  encodeGroupSecret,
  deriveStrongGroupKeys,
} from "../strongGroup/groupSecret";
import { computeStrongBatchId, type NostrSyncKeys } from "../nostrSync";

function makeEvent(overrides: Partial<SyncEvent> = {}): SyncEvent {
  const id = overrides.id ?? "evt-1";
  return {
    id,
    type: overrides.type ?? "TRANSACTION_CREATED",
    payload: overrides.payload ?? {
      id: `tx-${id}`,
      accountId: "acc-1",
      type: "expense",
      amount: 100,
      description: "Teste",
      categoryId: "alimentacao",
      date: "2026-10-01",
    },
    timestamp: overrides.timestamp ?? 1_700_000_000_000,
    deviceId: overrides.deviceId ?? "dev-a",
    signature: overrides.signature ?? `sig-${id}`,
  };
}

describe("Story 5.1 - Decisões puras de sincronização (syncDecisions)", () => {
  const dummyTracker = (published: string[] = []) => {
    const publishedSet = new Set(published);
    return {
      filterEventsToPublish: <T extends { id: string }>(events: readonly T[]) =>
        events.filter((e) => !publishedSet.has(e.id)),
    };
  };

  describe("computeEventHash", () => {
    it("retorna 'empty' para lista vazia", () => {
      expect(computeEventHash([])).toBe("empty");
    });

    it("invariância de ordem: lista com mesmos eventos em ordens distintas gera o mesmo hash", () => {
      const e1 = makeEvent({ id: "alpha" });
      const e2 = makeEvent({ id: "beta" });
      const e3 = makeEvent({ id: "gamma" });

      const hash1 = computeEventHash([e1, e2, e3]);
      const hash2 = computeEventHash([e3, e1, e2]);
      const hash3 = computeEventHash([e2, e3, e1]);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1).not.toBe("empty");
    });

    it("listas com eventos diferentes geram hashes distintos", () => {
      const e1 = makeEvent({ id: "alpha" });
      const e2 = makeEvent({ id: "beta" });
      const e3 = makeEvent({ id: "gamma" });

      const hashA = computeEventHash([e1, e2]);
      const hashB = computeEventHash([e1, e3]);

      expect(hashA).not.toBe(hashB);
    });
  });

  describe("shouldPublishGroupEvents", () => {
    it("retorna shouldPublish: false e reason: 'no-events' quando não há eventos deste aparelho", () => {
      const decision = shouldPublishGroupEvents({
        events: [makeEvent({ deviceId: "dev-other" })],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker(),
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(false);
      expect(decision.reason).toBe("no-events");
      expect(decision.myEvents).toHaveLength(0);
      expect(decision.hash).toBe("empty");
    });

    it("com isStrong: false exclui eventos PAYSLIP_* (não publica se houver apenas holerites)", () => {
      const payslipEvt = makeEvent({
        id: "p1",
        type: "PAYSLIP_RECORDED",
        deviceId: "dev-me",
        payload: { id: "p1", grossSalary: 5000 },
      });

      const decision = shouldPublishGroupEvents({
        events: [payslipEvt],
        groupId: "group-legacy",
        isStrong: false,
        tracker: dummyTracker(),
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(false);
      expect(decision.reason).toBe("no-events");
      expect(decision.myEvents).toHaveLength(0);
    });

    it("com isStrong: false publica apenas eventos permitidos e ignora PAYSLIP_*", () => {
      const normalEvt = makeEvent({ id: "n1", type: "TRANSACTION_CREATED", deviceId: "dev-me" });
      const payslipEvt = makeEvent({ id: "p1", type: "PAYSLIP_RECORDED", deviceId: "dev-me" });

      const decision = shouldPublishGroupEvents({
        events: [normalEvt, payslipEvt],
        groupId: "group-legacy",
        isStrong: false,
        tracker: dummyTracker([]),
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(true);
      expect(decision.reason).toBe("pending-events");
      expect(decision.myEvents).toEqual([normalEvt]);
    });

    it("com isStrong: true inclui eventos PAYSLIP_* na lista de publicação", () => {
      const payslipEvt = makeEvent({ id: "p1", type: "PAYSLIP_RECORDED", deviceId: "dev-me" });

      const decision = shouldPublishGroupEvents({
        events: [payslipEvt],
        groupId: "group-strong",
        isStrong: true,
        tracker: dummyTracker([]),
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(true);
      expect(decision.reason).toBe("pending-events");
      expect(decision.myEvents).toEqual([payslipEvt]);
    });

    it("retorna shouldPublish: true e reason: 'pending-events' quando há eventos locais pendentes", () => {
      const myEvt = makeEvent({ id: "e1", deviceId: "dev-me" });
      const decision = shouldPublishGroupEvents({
        events: [myEvt],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker([]),
        lastHash: null,
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(true);
      expect(decision.reason).toBe("pending-events");
      expect(decision.myEvents).toEqual([myEvt]);
      expect(decision.pendingEvents).toEqual([myEvt]);
      expect(decision.hash).toBe(computeEventHash([myEvt]));
    });

    it("retorna shouldPublish: false e reason: 'up-to-date' quando eventos já foram publicados e hash não mudou", () => {
      const myEvt = makeEvent({ id: "e1", deviceId: "dev-me" });
      const hash = computeEventHash([myEvt]);

      const decision = shouldPublishGroupEvents({
        events: [myEvt],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker(["e1"]),
        lastHash: hash,
        force: false,
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(false);
      expect(decision.reason).toBe("up-to-date");
      expect(decision.pendingEvents).toHaveLength(0);
    });

    it("retorna shouldPublish: true e reason: 'hash-changed' quando pendingEvents está vazio mas o hash mudou", () => {
      const myEvt = makeEvent({ id: "e1", deviceId: "dev-me" });
      const oldHash = "different-hash";

      const decision = shouldPublishGroupEvents({
        events: [myEvt],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker(["e1"]),
        lastHash: oldHash,
        force: false,
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(true);
      expect(decision.reason).toBe("hash-changed");
    });

    it("retorna shouldPublish: true e reason: 'forced' quando force: true mesmo com hash idêntico", () => {
      const myEvt = makeEvent({ id: "e1", deviceId: "dev-me" });
      const hash = computeEventHash([myEvt]);

      const decision = shouldPublishGroupEvents({
        events: [myEvt],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker(["e1"]),
        lastHash: hash,
        force: true,
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(true);
      expect(decision.reason).toBe("forced");
    });
  });

  describe("processIncomingEvents", () => {
    it("separa eventos inéditos para importação e lista IDs estrangeiros para markReceived", () => {
      const peerEvt1 = makeEvent({ id: "peer-1", deviceId: "dev-peer" });
      const peerEvt2 = makeEvent({ id: "peer-2", deviceId: "dev-peer" });
      const existing = new Set(["peer-1"]);

      const result = processIncomingEvents({
        incomingEvents: [peerEvt1, peerEvt2],
        currentDeviceId: "dev-me",
        existingIds: existing,
      });

      expect(result.eventsToImport).toEqual([peerEvt2]);
      expect(result.foreignEventIds).toEqual(["peer-1", "peer-2"]);
      expect(result.duplicateEventIds).toContain("peer-1");
      expect(result.echoEventIds).toHaveLength(0);
    });

    it("suprime eventos do próprio aparelho (prevenção de loop de eco)", () => {
      const ownEvt = makeEvent({ id: "own-1", deviceId: "dev-me" });
      const peerEvt = makeEvent({ id: "peer-1", deviceId: "dev-peer" });

      const result = processIncomingEvents({
        incomingEvents: [ownEvt, peerEvt],
        currentDeviceId: "dev-me",
        existingIds: new Set(),
      });

      expect(result.eventsToImport).toEqual([peerEvt]);
      expect(result.echoEventIds).toEqual(["own-1"]);
      expect(result.foreignEventIds).toEqual(["peer-1"]);
    });

    it("descarta duplicatas recebidas múltiplas vezes dentro do mesmo lote", () => {
      const peerEvt = makeEvent({ id: "peer-1", deviceId: "dev-peer" });

      const result = processIncomingEvents({
        incomingEvents: [peerEvt, peerEvt],
        currentDeviceId: "dev-me",
        existingIds: new Set(),
      });

      expect(result.eventsToImport).toEqual([peerEvt]);
      expect(result.duplicateEventIds).toEqual(["peer-1"]);
    });
  });
});

describe("Story 5.1 - FakeMemoryRelay em memória", () => {
  let relay: FakeMemoryRelay;

  beforeEach(() => {
    relay = new FakeMemoryRelay();
  });

  it("aplica substituição NIP-33 (kind: 30333) pelo identificador da tag 'd'", () => {
    const event1 = {
      id: "nostr-1",
      pubkey: "pubkey-group",
      created_at: 1000,
      kind: 30333,
      tags: [
        ["d", "sync-dev-a-0"],
        ["device", "dev-a"],
      ],
      content: "payload-1",
    };

    const event2 = {
      id: "nostr-2",
      pubkey: "pubkey-group",
      created_at: 2000,
      kind: 30333,
      tags: [
        ["d", "sync-dev-a-0"],
        ["device", "dev-a"],
      ],
      content: "payload-2-updated",
    };

    relay.publish(event1);
    expect(relay.getAllEvents()).toHaveLength(1);
    expect(relay.query({ kinds: [30333] })[0].content).toBe("payload-1");

    relay.publish(event2);
    // Substituído no armazenamento (mesmo pubkey + kind + d)
    const stored = relay.query({ kinds: [30333] });
    expect(stored).toHaveLength(1);
    expect(stored[0].content).toBe("payload-2-updated");

    // Telemetria registrou ambas as publicações
    expect(relay.getPublicationCountByDeviceId("dev-a")).toBe(2);
    expect(relay.getPublicationCountByNostrId("nostr-1")).toBe(1);
    expect(relay.getPublicationCountByNostrId("nostr-2")).toBe(1);
  });

  it("desempata eventos substituíveis com created_at idêntico pelo menor id lexicográfico", () => {
    const base = {
      pubkey: "pubkey-group",
      created_at: 1000,
      kind: 30333,
      tags: [["d", "sync-dev-a-0"]],
    };

    // Publica primeiro id "bbb"
    relay.publish({ ...base, id: "bbb", content: "primeiro" });
    expect(relay.query({ kinds: [30333] })[0].content).toBe("primeiro");

    // Publica id "aaa" (menor lexicograficamente): deve substituir
    relay.publish({ ...base, id: "aaa", content: "ganhador" });
    expect(relay.query({ kinds: [30333] })[0].content).toBe("ganhador");

    // Publica id "ccc" (maior lexicograficamente): deve ser descartado
    relay.publish({ ...base, id: "ccc", content: "perdedor" });
    expect(relay.query({ kinds: [30333] })[0].content).toBe("ganhador");
  });

  it("não transmite para inscritos eventos substituíveis mais antigos descartados", () => {
    const base = {
      pubkey: "pubkey-group",
      kind: 30333,
      tags: [["d", "sync-dev-a-0"]],
    };

    const received: string[] = [];
    relay.subscribe({ kinds: [30333] }, (ev) => {
      received.push(ev.content);
    });

    // Evento inicial (created_at 2000)
    relay.publish({ ...base, id: "ev-2", created_at: 2000, content: "recente" });
    expect(received).toEqual(["recente"]);

    // Evento antigo atrasado (created_at 1000): descartado e NÃO transmitido aos inscritos
    relay.publish({ ...base, id: "ev-1", created_at: 1000, content: "antigo-descartado" });
    expect(received).toEqual(["recente"]);
  });

  it("respeita filter.limit === 0 retornando array vazio", () => {
    relay.publish({
      id: "ev-1",
      pubkey: "pubkey-group",
      created_at: 1000,
      kind: 30333,
      tags: [["d", "batch-0"]],
      content: "dado",
    });

    expect(relay.query({ limit: 0 })).toEqual([]);
    expect(relay.query({ limit: 1 })).toHaveLength(1);
  });

  it("asPool().close() fecha pool sem apagar o banco de eventos do relay", () => {
    relay.publish({
      id: "ev-1",
      pubkey: "pubkey-group",
      created_at: 1000,
      kind: 30333,
      tags: [["d", "batch-0"]],
      content: "dado",
    });

    const pool = relay.asPool();
    pool.close();

    // Eventos permanecem no relay
    expect(relay.getAllEvents()).toHaveLength(1);
  });
});

describe("Story 5.1 - Simulação de sincronização com três aparelhos", () => {
  let relay: FakeMemoryRelay;
  let sharedSecret: string;
  let sharedKeys: NostrSyncKeys;

  let deviceA: SimulatedSyncDevice;
  let deviceB: SimulatedSyncDevice;
  let deviceC: SimulatedSyncDevice;

  beforeEach(async () => {
    relay = new FakeMemoryRelay();
    const secretBytes = generateGroupSecret();
    sharedSecret = encodeGroupSecret(secretBytes);
    const strongKeys = deriveStrongGroupKeys(secretBytes);
    sharedKeys = {
      privateKey: strongKeys.nostrPrivateKey,
      publicKey: strongKeys.nostrPublicKey,
      encryptionKey: strongKeys.encryptionKey,
      isStrong: true,
    };

    deviceA = await createSimulatedDevice({
      deviceId: "dev-A",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });

    deviceB = await createSimulatedDevice({
      deviceId: "dev-B",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });

    deviceC = await createSimulatedDevice({
      deviceId: "dev-C",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });
  });

  it("convergência de estado: Aparelho A (5 txs), B (3 contas + 4 txs) e C (2 txs) terminam com idêntico AppState", async () => {
    // Conta base criada no nó A para receber as transações
    deviceA.appendLocalEvent({
      id: "acc-base",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-base", name: "Conta Principal", type: "checking", balance: 5000, color: "#111" },
      timestamp: 1_700_000_000_000,
    });

    // Categoria criada no nó A
    deviceA.appendLocalEvent({
      id: "cat-geral",
      type: "CATEGORY_CREATED",
      payload: { id: "cat-geral", name: "Geral", group: "needs" },
      timestamp: 1_700_000_001_000,
    });

    // Aparelho A gera 5 transações
    for (let i = 1; i <= 5; i++) {
      deviceA.appendLocalEvent({
        id: `tx-a-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-a-${i}`,
          accountId: "acc-base",
          type: "expense",
          amount: 50 * i,
          description: `Despesa A ${i}`,
          categoryId: "cat-geral",
          date: `2026-10-0${i}`,
        },
        timestamp: 1_700_000_010_000 + i * 1000,
      });
    }

    // Aparelho B gera 3 contas e 4 transações
    for (let i = 1; i <= 3; i++) {
      deviceB.appendLocalEvent({
        id: `acc-b-${i}`,
        type: "ACCOUNT_CREATED",
        payload: { id: `acc-b-${i}`, name: `Conta B ${i}`, type: "savings", balance: 1000 * i, color: "#222" },
        timestamp: 1_700_000_020_000 + i * 1000,
      });
    }
    for (let i = 1; i <= 4; i++) {
      deviceB.appendLocalEvent({
        id: `tx-b-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-b-${i}`,
          accountId: `acc-b-1`,
          type: "income",
          amount: 200 * i,
          description: `Receita B ${i}`,
          categoryId: "cat-geral",
          date: `2026-10-1${i}`,
        },
        timestamp: 1_700_000_030_000 + i * 1000,
      });
    }

    // Aparelho C gera 2 transações
    for (let i = 1; i <= 2; i++) {
      deviceC.appendLocalEvent({
        id: `tx-c-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-c-${i}`,
          accountId: "acc-base",
          type: "expense",
          amount: 75 * i,
          description: `Despesa C ${i}`,
          categoryId: "cat-geral",
          date: `2026-10-2${i}`,
        },
        timestamp: 1_700_000_040_000 + i * 1000,
      });
    }

    // Total de eventos gerados:
    // A: 2 (base) + 5 txs = 7 eventos
    // B: 3 contas + 4 txs = 7 eventos
    // C: 2 txs = 2 eventos
    // Total global = 16 eventos de domínio
    expect(deviceA.getAllEvents()).toHaveLength(7);
    expect(deviceB.getAllEvents()).toHaveLength(7);
    expect(deviceC.getAllEvents()).toHaveLength(2);

    // Passo 1: Cada nó publica seus eventos locais para o relay
    const pushA = await deviceA.push();
    const pushB = await deviceB.push();
    const pushC = await deviceC.push();

    expect(pushA.pushed).toBe(true);
    expect(pushA.count).toBe(7);
    expect(pushB.pushed).toBe(true);
    expect(pushB.count).toBe(7);
    expect(pushC.pushed).toBe(true);
    expect(pushC.count).toBe(2);

    // Passo 2: Cada nó faz pull dos eventos do grupo
    const pullA = await deviceA.pull();
    const pullB = await deviceB.pull();
    const pullC = await deviceC.pull();

    // A importou os 7 de B + 2 de C = 9
    expect(pullA.importedCount).toBe(9);
    // B importou os 7 de A + 2 de C = 9
    expect(pullB.importedCount).toBe(9);
    // C importou os 7 de A + 7 de B = 14
    expect(pullC.importedCount).toBe(14);

    // Verificação de igualdade de contagem em todos os 3 nós
    expect(deviceA.getAllEvents()).toHaveLength(16);
    expect(deviceB.getAllEvents()).toHaveLength(16);
    expect(deviceC.getAllEvents()).toHaveLength(16);

    // Verificação de convergência estrita de estado derivado (replayAllEvents)
    const stateA = deviceA.getState();
    const stateB = deviceB.getState();
    const stateC = deviceC.getState();

    // Contas
    expect(Object.keys(stateA.accounts).sort()).toEqual(Object.keys(stateB.accounts).sort());
    expect(Object.keys(stateA.accounts).sort()).toEqual(Object.keys(stateC.accounts).sort());
    expect(stateA.accounts).toEqual(stateB.accounts);
    expect(stateA.accounts).toEqual(stateC.accounts);

    // Transações
    expect(Object.keys(stateA.transactions).sort()).toEqual(Object.keys(stateB.transactions).sort());
    expect(Object.keys(stateA.transactions).sort()).toEqual(Object.keys(stateC.transactions).sort());
    expect(stateA.transactions).toEqual(stateB.transactions);
    expect(stateA.transactions).toEqual(stateC.transactions);

    // Categorias
    expect(stateA.categories).toEqual(stateB.categories);
    expect(stateA.categories).toEqual(stateC.categories);

    // Quarentena limpa em todos os nós
    expect(deviceA.getReplayResult().quarantine).toEqual([]);
    expect(deviceB.getReplayResult().quarantine).toEqual([]);
    expect(deviceC.getReplayResult().quarantine).toEqual([]);
  });

  it("contagem e taxa de publicações: exatamente 1 publicação por evento/aparelho, zero loops e zero republicações", async () => {
    // Nó A gera 3 eventos
    deviceA.appendLocalEvent({
      id: "a-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "a-1", name: "Conta A", type: "checking", balance: 100 },
    });
    deviceA.appendLocalEvent({
      id: "a-2",
      type: "CATEGORY_CREATED",
      payload: { id: "a-2", name: "Cat A", group: "needs" },
    });
    deviceA.appendLocalEvent({
      id: "a-3",
      type: "TRANSACTION_CREATED",
      payload: { id: "a-3", accountId: "a-1", type: "income", amount: 100, date: "2026-10-01" },
    });

    // Nó B gera 2 eventos
    deviceB.appendLocalEvent({
      id: "b-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "b-1", name: "Conta B", type: "savings", balance: 200 },
    });
    deviceB.appendLocalEvent({
      id: "b-2",
      type: "TRANSACTION_CREATED",
      payload: { id: "b-2", accountId: "b-1", type: "income", amount: 50, date: "2026-10-01" },
    });

    // Nó C gera 1 evento
    deviceC.appendLocalEvent({
      id: "c-1",
      type: "TRANSACTION_CREATED",
      payload: { id: "c-1", accountId: "a-1", type: "expense", amount: 20, date: "2026-10-01" },
    });

    // Primeira rodada: todos publicam e puxam
    await deviceA.sync();
    await deviceB.sync();
    await deviceC.sync();

    // Rodada de estabilização: todos sincronizam novamente
    await deviceA.sync();
    await deviceB.sync();
    await deviceC.sync();

    // Todos os 3 nós devem possuir os 6 eventos
    expect(deviceA.getAllEvents()).toHaveLength(6);
    expect(deviceB.getAllEvents()).toHaveLength(6);
    expect(deviceC.getAllEvents()).toHaveLength(6);

    // Validação da contagem de publicações por aparelho:
    // Nó A publicou apenas seus 3 eventos em 1 lote Nostr
    expect(relay.getPublicationCountByDeviceId("dev-A")).toBe(1);
    // Nó B publicou apenas seus 2 eventos em 1 lote Nostr
    expect(relay.getPublicationCountByDeviceId("dev-B")).toBe(1);
    // Nó C publicou apenas seu 1 evento em 1 lote Nostr
    expect(relay.getPublicationCountByDeviceId("dev-C")).toBe(1);

    // Validação da taxa de publicação por evento de domínio:
    // Cada evento de domínio foi publicado exatamente 1 vez
    const eventIds = ["a-1", "a-2", "a-3", "b-1", "b-2", "c-1"];
    for (const eid of eventIds) {
      expect(relay.getPublicationCountByEventId(eid)).toBe(1);
    }

    // Rodada subsequente ociosa (idempotência pura)
    const pushA2 = await deviceA.push();
    const pushB2 = await deviceB.push();
    const pushC2 = await deviceC.push();

    expect(pushA2.pushed).toBe(false);
    expect(pushA2.reason).toBe("up-to-date");
    expect(pushB2.pushed).toBe(false);
    expect(pushB2.reason).toBe("up-to-date");
    expect(pushC2.pushed).toBe(false);
    expect(pushC2.reason).toBe("up-to-date");

    // Nenhuma nova publicação efetuada no relay
    expect(relay.getTotalPublications()).toBe(3);
  });

  it("resiliência a nó offline temporário: Nó C desconecta, A e B transacionam, C reconecta e todos convergem", async () => {
    // Estado inicial sincronizado entre os 3 nós
    deviceA.appendLocalEvent({
      id: "acc-init",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-init", name: "Conta Inicial", type: "checking", balance: 1000 },
    });
    await deviceA.push();
    await deviceB.pull();
    await deviceC.pull();

    expect(deviceA.getAllEvents()).toHaveLength(1);
    expect(deviceB.getAllEvents()).toHaveLength(1);
    expect(deviceC.getAllEvents()).toHaveLength(1);

    // Nó C fica offline temporariamente
    deviceC.setOnline(false);

    // Enquanto C está offline, A e B realizam transações e sincronizam entre si
    deviceA.appendLocalEvent({
      id: "tx-a-online",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-a-online", accountId: "acc-init", type: "income", amount: 500, date: "2026-10-02" },
    });
    deviceB.appendLocalEvent({
      id: "tx-b-online",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-b-online", accountId: "acc-init", type: "expense", amount: 150, date: "2026-10-02" },
    });

    await deviceA.sync();
    await deviceB.sync();
    await deviceA.sync();

    // A e B já possuem as duas novas transações (total = 3)
    expect(deviceA.getAllEvents()).toHaveLength(3);
    expect(deviceB.getAllEvents()).toHaveLength(3);

    // Nó C offline também cria uma transação localmente
    deviceC.appendLocalEvent({
      id: "tx-c-offline",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-c-offline", accountId: "acc-init", type: "expense", amount: 50, date: "2026-10-02" },
    });

    // Tentativa de sync de C enquanto offline não gera tráfego
    const syncOffline = await deviceC.sync();
    expect(syncOffline.pushed).toBe(false);
    expect(syncOffline.importedCount).toBe(0);

    // Nó C volta a ficar online
    deviceC.setOnline(true);

    // C sincroniza: envia sua transação represada e puxa o delta de A e B
    const syncOnlineC = await deviceC.sync();
    expect(syncOnlineC.pushed).toBe(true);
    expect(syncOnlineC.pushCount).toBe(1);
    expect(syncOnlineC.importedCount).toBe(2); // tx-a-online e tx-b-online

    // A e B puxam a transação enviada por C
    await deviceA.pull();
    await deviceB.pull();

    // Todos os 3 nós possuem agora os 4 eventos
    expect(deviceA.getAllEvents()).toHaveLength(4);
    expect(deviceB.getAllEvents()).toHaveLength(4);
    expect(deviceC.getAllEvents()).toHaveLength(4);

    // Estados financeiros rigorosamente idênticos
    expect(deviceA.getState()).toEqual(deviceB.getState());
    expect(deviceA.getState()).toEqual(deviceC.getState());
  });

  it("subscrições ao vivo: propagação em tempo real entre aparelhos conectados simultaneamente", async () => {
    // Inicia subscrições ao vivo em B e C
    const liveB = deviceB.startLiveSync();
    const liveC = deviceC.startLiveSync();

    // Nó A cria e publica um evento
    deviceA.appendLocalEvent({
      id: "live-evt-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "live-evt-1", name: "Conta Ao Vivo", type: "checking", balance: 999 },
    });

    await deviceA.push();

    // B e C devem ter recebido o evento imediatamente via live sub, sem chamar pull manual
    expect(deviceB.getExistingEventIds().has("live-evt-1")).toBe(true);
    expect(deviceC.getExistingEventIds().has("live-evt-1")).toBe(true);

    liveB.close();
    liveC.close();
  });

  it("convergência com timestamps idênticos concorrentes entre múltiplos aparelhos", async () => {
    const T_SAME = 1_700_000_000_000;

    // Aparelho A cria conta base com timestamp T_SAME
    deviceA.appendLocalEvent({
      id: "acc-concurrent",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-concurrent", name: "Conta Concorrente", type: "checking", balance: 1000 },
      timestamp: T_SAME,
    });

    // Aparelho B cria uma transação com o exato mesmo timestamp T_SAME
    deviceB.appendLocalEvent({
      id: "tx-b-concurrent",
      type: "TRANSACTION_CREATED",
      payload: {
        id: "tx-b-concurrent",
        accountId: "acc-concurrent",
        type: "income",
        amount: 200,
        date: "2026-10-01",
      },
      timestamp: T_SAME,
    });

    // Aparelho C cria outra transação com o exato mesmo timestamp T_SAME
    deviceC.appendLocalEvent({
      id: "tx-c-concurrent",
      type: "TRANSACTION_CREATED",
      payload: {
        id: "tx-c-concurrent",
        accountId: "acc-concurrent",
        type: "expense",
        amount: 50,
        date: "2026-10-01",
      },
      timestamp: T_SAME,
    });

    // Todos publicam
    await deviceA.push();
    await deviceB.push();
    await deviceC.push();

    // Todos puxam
    await deviceA.pull();
    await deviceB.pull();
    await deviceC.pull();

    // Todos devem ter os 3 eventos
    expect(deviceA.getAllEvents()).toHaveLength(3);
    expect(deviceB.getAllEvents()).toHaveLength(3);
    expect(deviceC.getAllEvents()).toHaveLength(3);

    // Ordem total (timestamp, deviceId, id) garante estados idênticos
    const stateA = deviceA.getState();
    const stateB = deviceB.getState();
    const stateC = deviceC.getState();

    expect(stateA).toEqual(stateB);
    expect(stateA).toEqual(stateC);
    expect(stateA.accounts["acc-concurrent"].balance).toBe(1150);
  });
});

describe("Story 5.2 - Confirmação por lote, reenvio e resiliência a relay derrubado", () => {
  let relay: FakeMemoryRelay;
  let sharedSecret: string;
  let sharedKeys: NostrSyncKeys;
  let deviceA: SimulatedSyncDevice;
  let deviceB: SimulatedSyncDevice;
  let deviceC: SimulatedSyncDevice;

  beforeEach(async () => {
    relay = new FakeMemoryRelay();
    const rawSecret = generateGroupSecret();
    sharedSecret = encodeGroupSecret(rawSecret);
    const strongKeys = deriveStrongGroupKeys(rawSecret);
    sharedKeys = {
      privateKey: strongKeys.nostrPrivateKey,
      publicKey: strongKeys.nostrPublicKey,
      encryptionKey: strongKeys.encryptionKey,
      isStrong: true,
    };

    deviceA = await createSimulatedDevice({
      deviceId: "dev-A",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });

    deviceB = await createSimulatedDevice({
      deviceId: "dev-B",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });

    deviceC = await createSimulatedDevice({
      deviceId: "dev-C",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });
  });

  it("FakeMemoryRelay: setDown e isDownRelay controlam adequadamente a resposta do relay e asPool", async () => {
    expect(relay.isDownRelay()).toBe(false);

    relay.setDown(true);
    expect(relay.isDownRelay()).toBe(true);

    const pubRes = relay.publish({
      id: "ev-test",
      pubkey: sharedKeys.publicKey,
      created_at: 1000,
      kind: 30333,
      tags: [["d", "sync-test-0"]],
      content: "secret",
    });
    expect(pubRes.ok).toBe(false);
    expect(pubRes.reason).toBe("relay is down");

    // Pool também rejeita publicações quando derrubado
    const pool = relay.asPool();
    const poolPromises = pool.publish(["wss://relay.fake"], {
      id: "ev-test-pool",
      pubkey: sharedKeys.publicKey,
      created_at: 1000,
      kind: 30333,
      tags: [],
      content: "pool",
    });
    await expect(poolPromises[0]).rejects.toThrow("Relay is down");

    // Consultas retornam vazio
    expect(relay.query({ kinds: [30333] })).toEqual([]);
    expect(await pool.querySync(["wss://relay.fake"], { kinds: [30333] })).toEqual([]);

    // Restaura
    relay.setDown(false);
    expect(relay.isDownRelay()).toBe(false);

    const pubResRestored = relay.publish({
      id: "ev-test-restored",
      pubkey: sharedKeys.publicKey,
      created_at: 1000,
      kind: 30333,
      tags: [["d", "sync-test-restored"]],
      content: "restored",
    });
    expect(pubResRestored.ok).toBe(true);
  });

  it("relay derrubado e depois restaurado: nenhum lote é marcado durante a queda, hash não avança e todos convergem após restauração", async () => {
    // Aparelho A gera conta e 4 transações locais (5 eventos)
    deviceA.appendLocalEvent({
      id: "acc-a",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-a", name: "Conta A", type: "checking", balance: 1000 },
    });
    for (let i = 1; i <= 4; i++) {
      deviceA.appendLocalEvent({
        id: `tx-a-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-a-${i}`,
          accountId: "acc-a",
          type: "income",
          amount: 100 * i,
          date: `2026-10-0${i}`,
        },
      });
    }
    expect(deviceA.getAllEvents()).toHaveLength(5);

    // 1. Derruba o relay antes do push
    relay.setDown(true);

    const pushDown = await deviceA.push();
    expect(pushDown.pushed).toBe(false);
    expect(pushDown.count).toBe(0);
    expect(pushDown.reason).toBe("relay-failed");
    expect(pushDown.confirmedEventIds).toEqual([]);
    expect(pushDown.failedEventIds).toHaveLength(5);

    // Hash NÃO deve avançar
    expect(deviceA.getLastPushHash()).toBe("empty");

    // Nenhum evento foi marcado no tracker
    const pendingDuringDown = deviceA.tracker.filterEventsToPublish(
      deviceA.getAllEvents(),
      deviceA.keys.publicKey,
    );
    expect(pendingDuringDown).toHaveLength(5);

    // Aparelhos B e C tentam ler e não encontram nada
    await deviceB.pull();
    await deviceC.pull();
    expect(deviceB.getAllEvents()).toHaveLength(0);
    expect(deviceC.getAllEvents()).toHaveLength(0);

    // 2. Restaura o relay
    relay.setDown(false);

    // Aparelho A realiza novo push: agora com sucesso
    const pushRestored = await deviceA.push();
    expect(pushRestored.pushed).toBe(true);
    expect(pushRestored.count).toBe(5);
    expect(pushRestored.confirmedEventIds).toHaveLength(5);
    expect(pushRestored.failedEventIds).toHaveLength(0);

    // Hash deve ter avançado
    expect(deviceA.getLastPushHash()).not.toBe("empty");

    // Todos os eventos devem estar assinalados no tracker
    const pendingAfterRestore = deviceA.tracker.filterEventsToPublish(
      deviceA.getAllEvents(),
      deviceA.keys.publicKey,
    );
    expect(pendingAfterRestore).toHaveLength(0);

    // 3. Aparelhos B e C puxam do relay e todos convergem
    await deviceB.pull();
    await deviceC.pull();

    expect(deviceA.getAllEvents()).toHaveLength(5);
    expect(deviceB.getAllEvents()).toHaveLength(5);
    expect(deviceC.getAllEvents()).toHaveLength(5);

    const stateA = deviceA.getState();
    const stateB = deviceB.getState();
    const stateC = deviceC.getState();

    expect(stateA).toEqual(stateB);
    expect(stateA).toEqual(stateC);
    expect(stateA.accounts["acc-a"].balance).toBe(2000); // 1000 + 100 + 200 + 300 + 400
  });

  it("falha parcial de lotes: Lote 0 confirmado, Lote 1 rejeitado -> apenas Lote 0 é marcado e hash retido", async () => {
    // Conta inicial
    deviceA.appendLocalEvent({
      id: "acc-part",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-part", name: "Conta Parcial", type: "checking", balance: 5000 },
    });

    // 24 transações adicionais (total 25 eventos -> Lote 0 com 20, Lote 1 com 5)
    for (let i = 1; i <= 24; i++) {
      deviceA.appendLocalEvent({
        id: `tx-part-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-part-${i}`,
          accountId: "acc-part",
          type: "expense",
          amount: 10,
          date: "2026-10-01",
        },
      });
    }
    expect(deviceA.getAllEvents()).toHaveLength(25);

    // Rejeita o Lote 1 no relay com a tag content-addressed
    const batch1Events = deviceA.getAllEvents().slice(20);
    const batch1Id = computeStrongBatchId(deviceA.deviceId, batch1Events);
    relay.rejectBatch(batch1Id);

    // Dispara push: Lote 0 confirma, Lote 1 falha
    const partialPush = await deviceA.push();
    expect(partialPush.pushed).toBe(true);
    expect(partialPush.count).toBe(20);
    expect(partialPush.reason).toBe("partial-failure");
    expect(partialPush.confirmedEventIds).toHaveLength(20);
    expect(partialPush.failedEventIds).toHaveLength(5);

    // Tracker deve ter apenas os 20 confirmados marcados; os 5 restantes permanecem pendentes
    const pendingEvents = deviceA.tracker.filterEventsToPublish(
      deviceA.getAllEvents(),
      deviceA.keys.publicKey,
    );
    expect(pendingEvents).toHaveLength(5);
    expect(pendingEvents.map((e) => e.id)).toEqual(partialPush.failedEventIds);

    // Hash de envio NÃO deve avançar
    expect(deviceA.getLastPushHash()).toBe("empty");

    // Aparelho B puxa do relay e recebe apenas o Lote 0 (20 eventos)
    await deviceB.pull();
    expect(deviceB.getAllEvents()).toHaveLength(20);

    // Agora o relay aceita o Lote 1
    relay.allowBatch(batch1Id);

    // Próximo ciclo de push: detecta pendências no tracker e reenvia APENAS os 5 pendentes (Story 5.3)
    const retryPush = await deviceA.push();
    expect(retryPush.pushed).toBe(true);
    expect(retryPush.count).toBe(5);
    expect(retryPush.confirmedEventIds).toHaveLength(5);
    expect(retryPush.failedEventIds).toHaveLength(0);

    // Agora que todos os lotes foram confirmados, o hash avança
    expect(deviceA.getLastPushHash()).not.toBe("empty");

    // Nenhum evento pendente no tracker de A
    const pendingFinal = deviceA.tracker.filterEventsToPublish(
      deviceA.getAllEvents(),
      deviceA.keys.publicKey,
    );
    expect(pendingFinal).toHaveLength(0);

    // Aparelho B puxa o restante e todos convergem para os 25 eventos
    await deviceB.pull();
    expect(deviceA.getAllEvents()).toHaveLength(25);
    expect(deviceB.getAllEvents()).toHaveLength(25);

    expect(deviceA.getState()).toEqual(deviceB.getState());
  });

  it("todos os lotes falharam: nenhum evento é marcado no tracker e hash não avança", async () => {
    deviceA.appendLocalEvent({
      id: "acc-fail-all",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-fail-all", name: "Conta", type: "checking", balance: 100 },
    });

    relay.setDown(true);

    const res = await deviceA.push();
    expect(res.pushed).toBe(false);
    expect(res.count).toBe(0);
    expect(res.confirmedEventIds).toEqual([]);
    expect(res.failedEventIds).toHaveLength(1);
    expect(deviceA.getLastPushHash()).toBe("empty");

    const pending = deviceA.tracker.filterEventsToPublish(
      deviceA.getAllEvents(),
      deviceA.keys.publicKey,
    );
    expect(pending).toHaveLength(1);
  });
});

describe("processPushResult (syncDecisions)", () => {
  it("todos confirmados: eventsToMark inclui confirmados, hash avança e não lança erro", () => {
    const outcome = processPushResult({
      result: {
        published: 20,
        confirmedEventIds: ["ev-1", "ev-2"],
        failedEventIds: [],
        rejectedEventIds: [],
        batches: [],
      },
      myEvents: [{ id: "ev-1" }, { id: "ev-2" }],
      currentHash: "hash-123",
    });

    expect(outcome.eventsToMark).toEqual(["ev-1", "ev-2"]);
    expect(outcome.shouldAdvanceHash).toBe(true);
    expect(outcome.nextHash).toBe("hash-123");
    expect(outcome.shouldThrow).toBe(false);
    expect(outcome.errorMessage).toBeUndefined();
  });

  it("falha parcial de lotes: eventsToMark tem confirmados, hash NÃO avança e shouldThrow é true", () => {
    const outcome = processPushResult({
      result: {
        published: 10,
        confirmedEventIds: ["ev-1"],
        failedEventIds: ["ev-2"],
        rejectedEventIds: [],
        batches: [],
      },
      myEvents: [{ id: "ev-1" }, { id: "ev-2" }],
      currentHash: "hash-456",
    });

    expect(outcome.eventsToMark).toEqual(["ev-1"]);
    expect(outcome.shouldAdvanceHash).toBe(false);
    expect(outcome.nextHash).toBeUndefined();
    expect(outcome.shouldThrow).toBe(true);
    expect(outcome.errorMessage).toContain("1 eventos em lotes não foram aceitos");
  });

  it("falha total: eventsToMark vazio, hash não avança e shouldThrow é true", () => {
    const outcome = processPushResult({
      result: {
        published: 0,
        confirmedEventIds: [],
        failedEventIds: ["ev-1", "ev-2"],
        rejectedEventIds: [],
        batches: [],
      },
      myEvents: [{ id: "ev-1" }, { id: "ev-2" }],
      currentHash: "hash-789",
    });

    expect(outcome.eventsToMark).toEqual([]);
    expect(outcome.shouldAdvanceHash).toBe(false);
    expect(outcome.shouldThrow).toBe(true);
  });

  it("envelopes rejeitados: são incluídos em eventsToMark para evitar loop infinito", () => {
    const outcome = processPushResult({
      result: {
        published: 10,
        confirmedEventIds: ["ev-valid"],
        failedEventIds: [],
        rejectedEventIds: ["ev-bad-1", "ev-bad-2"],
        batches: [],
      },
      myEvents: [{ id: "ev-valid" }, { id: "ev-bad-1" }, { id: "ev-bad-2" }],
      currentHash: "hash-rej",
    });

    // eventsToMark deve conter tanto o válido quanto os rejeitados
    expect(outcome.eventsToMark).toEqual(["ev-valid", "ev-bad-1", "ev-bad-2"]);
    expect(outcome.shouldAdvanceHash).toBe(true);
    expect(outcome.shouldThrow).toBe(false);
  });

  it("lista de eventos locais vazia: hash avança e shouldThrow é false", () => {
    const outcome = processPushResult({
      result: {
        published: 0,
        confirmedEventIds: [],
        failedEventIds: [],
        rejectedEventIds: [],
        batches: [],
      },
      myEvents: [],
      currentHash: "empty",
    });

    expect(outcome.eventsToMark).toEqual([]);
    expect(outcome.shouldAdvanceHash).toBe(true);
    expect(outcome.shouldThrow).toBe(false);
  });

  it("apenas envelopes rejeitados (nenhum confirmado): eventsToMark tem os rejeitados e hash não avança", () => {
    const outcome = processPushResult({
      result: {
        published: 0,
        confirmedEventIds: [],
        failedEventIds: [],
        rejectedEventIds: ["bad-only"],
        batches: [],
      },
      myEvents: [{ id: "bad-only" }],
      currentHash: "hash-bad-only",
    });

    expect(outcome.eventsToMark).toEqual(["bad-only"]);
    expect(outcome.shouldAdvanceHash).toBe(false);
    expect(outcome.shouldThrow).toBe(false);
  });
});

describe("Story 5.3 - Publicar só os lotes novos no Grupo forte (lotes imutáveis content-addressed)", () => {
  let relay: FakeMemoryRelay;
  let sharedSecret: string;
  let sharedKeys: NostrSyncKeys;
  let deviceA: SimulatedSyncDevice;
  let deviceB: SimulatedSyncDevice;

  beforeEach(async () => {
    relay = new FakeMemoryRelay();
    const rawSecret = generateGroupSecret();
    sharedSecret = encodeGroupSecret(rawSecret);
    const strongKeys = deriveStrongGroupKeys(rawSecret);
    sharedKeys = {
      privateKey: strongKeys.nostrPrivateKey,
      publicKey: strongKeys.nostrPublicKey,
      encryptionKey: strongKeys.encryptionKey,
      isStrong: true,
    };

    deviceA = await createSimulatedDevice({
      deviceId: "dev-A",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });

    deviceB = await createSimulatedDevice({
      deviceId: "dev-B",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });
  });

  it("adicionar 1 evento a um log de 100 publica só 1 novo lote", async () => {
    // 1. Gera 100 eventos no Aparelho A
    deviceA.appendLocalEvent({
      id: "acc-base",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-base", name: "Conta", type: "checking", balance: 10000 },
      timestamp: 1_700_000_000_000,
    });
    for (let i = 1; i <= 99; i++) {
      deviceA.appendLocalEvent({
        id: `tx-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-${i}`, accountId: "acc-base", type: "expense", amount: 10, date: "2026-10-01" },
        timestamp: 1_700_000_000_000 + i * 1000,
      });
    }
    expect(deviceA.getAllEvents()).toHaveLength(100);

    // 2. Aparelho A publica os 100 eventos (5 lotes de até 20 eventos)
    const initialPush = await deviceA.push();
    expect(initialPush.pushed).toBe(true);
    expect(initialPush.count).toBe(100);
    expect(initialPush.confirmedEventIds).toHaveLength(100);

    // No relay, temos exatamente 5 eventos Nostr publicados (kind 30333)
    const initialRelayEvents = relay.getAllEvents();
    expect(initialRelayEvents).toHaveLength(5);
    const initialPublicationLogLength = relay.getPublicationLog().length;
    expect(initialPublicationLogLength).toBe(5);

    // Todas as tags 'd' são content-addressed
    for (const re of initialRelayEvents) {
      const dTag = re.tags.find((t) => t[0] === "d")?.[1];
      expect(dTag).toMatch(/^sync-dev-A-[0-9a-f]{16}$/);
    }

    // 3. Adiciona 1 novo evento ao log de 100 no Aparelho A
    deviceA.appendLocalEvent({
      id: "tx-101",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-101", accountId: "acc-base", type: "expense", amount: 99, date: "2026-10-02" },
      timestamp: 1_700_000_200_000,
    });
    expect(deviceA.getAllEvents()).toHaveLength(101);

    // 4. Aparelho A dispara push novamente
    const secondPush = await deviceA.push();
    expect(secondPush.pushed).toBe(true);
    expect(secondPush.count).toBe(1);
    expect(secondPush.confirmedEventIds).toEqual(["tx-101"]);

    // No relay, foi adicionado ESTRITAMENTE 1 novo lote (total = 6 eventos)
    const updatedRelayEvents = relay.getAllEvents();
    expect(updatedRelayEvents).toHaveLength(6);
    expect(relay.getPublicationLog()).toHaveLength(6);

    // O novo lote contém exclusivamente a tag content-addressed do novo evento
    const newBatchEvent = updatedRelayEvents.find((e) => {
      const dTag = e.tags.find((t) => t[0] === "d")?.[1];
      return dTag === computeStrongBatchId("dev-A", [deviceA.getAllEvents()[100]]);
    });
    expect(newBatchEvent).toBeDefined();

    // 5. Aparelho B puxa do relay e recebe todos os 101 eventos, convergindo perfeitamente
    const pullB = await deviceB.pull();
    expect(pullB.importedCount).toBe(101);
    expect(deviceB.getAllEvents()).toHaveLength(101);
    expect(deviceB.getState()).toEqual(deviceA.getState());
  });

  it("um evento de timestamp antigo criado localmente não faz os outros lotes serem republicados", async () => {
    // 1. Gera 100 eventos com timestamps modernos
    deviceA.appendLocalEvent({
      id: "acc-base-old",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-base-old", name: "Conta", type: "checking", balance: 5000 },
      timestamp: 1_700_000_100_000,
    });
    for (let i = 1; i <= 99; i++) {
      deviceA.appendLocalEvent({
        id: `tx-mod-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-mod-${i}`, accountId: "acc-base-old", type: "expense", amount: 5, date: "2026-10-01" },
        timestamp: 1_700_000_100_000 + i * 1000,
      });
    }

    // Publica os 100 eventos
    await deviceA.push();
    expect(relay.getAllEvents()).toHaveLength(5);
    const pubCountBefore = relay.getPublicationLog().length;
    expect(pubCountBefore).toBe(5);

    // 2. Insere localmente um evento com timestamp do PASSADO (anterior a todos os outros)
    const pastEvent: SyncEvent = {
      id: "tx-past-1",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-past-1", accountId: "acc-base-old", type: "expense", amount: 1, date: "2020-01-01" },
      timestamp: 1_600_000_000_000, // No passado
      deviceId: "dev-A",
      signature: "sig-past",
    };
    deviceA.appendLocalEvent(pastEvent);

    // O EventStore ordena por timestamp: o evento do passado fica na primeira posição (índice 0)
    expect(deviceA.getAllEvents()[0].id).toBe("tx-past-1");

    // 3. Executa push: deve publicar APENAS o novo evento do passado em 1 lote novo
    const pushPast = await deviceA.push();
    expect(pushPast.pushed).toBe(true);
    expect(pushPast.count).toBe(1);
    expect(pushPast.confirmedEventIds).toEqual(["tx-past-1"]);

    // Exatamente 1 nova publicação no log do relay (total = 6)
    expect(relay.getPublicationLog().length).toBe(6);
    expect(relay.getAllEvents()).toHaveLength(6);

    // Aparelho B puxa e recebe todos os 101 eventos, convergindo com ordenação determinística
    await deviceB.pull();
    expect(deviceB.getAllEvents()).toHaveLength(101);
    expect(deviceB.getState()).toEqual(deviceA.getState());
  });

  it("evento de timestamp antigo recebido de peer via pull não gera republicação de lotes", async () => {
    // Aparelho A tem 40 eventos publicados (2 lotes)
    deviceA.appendLocalEvent({
      id: "acc-peer",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-peer", name: "Conta", type: "checking", balance: 1000 },
      timestamp: 1_700_000_000_000,
    });
    for (let i = 1; i <= 39; i++) {
      deviceA.appendLocalEvent({
        id: `tx-a-peer-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-a-peer-${i}`, accountId: "acc-peer", type: "expense", amount: 10, date: "2026-10-01" },
        timestamp: 1_700_000_000_000 + i * 1000,
      });
    }
    await deviceA.push();
    expect(relay.getAllEvents()).toHaveLength(2);

    // Aparelho B cria um evento antigo e publica
    deviceB.appendLocalEvent({
      id: "tx-b-old",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-b-old", accountId: "acc-peer", type: "income", amount: 500, date: "2026-09-01" },
      timestamp: 1_650_000_000_000, // Mais antigo que os eventos de A
    });
    await deviceB.push();
    expect(relay.getAllEvents()).toHaveLength(3); // 2 de A + 1 de B

    // Aparelho A recebe o evento antigo de B via pull
    const pullA = await deviceA.pull();
    expect(pullA.importedCount).toBe(1);
    expect(deviceA.getAllEvents().some((e) => e.id === "tx-b-old")).toBe(true);

    // Aparelho A tenta publicar: NENHUM lote é gerado nem publicado
    const logLengthBefore = relay.getPublicationLog().length;
    const pushAfterPull = await deviceA.push();
    expect(pushAfterPull.pushed).toBe(false);
    expect(pushAfterPull.reason).toBe("up-to-date");
    expect(relay.getPublicationLog().length).toBe(logLengthBefore);
  });

  it("lote com conteúdo idêntico publicado novamente é idempotente no relay (mesma tag d)", async () => {
    const singleEvent: SyncEvent = {
      id: "tx-idem",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-idem", accountId: "acc-base", type: "expense", amount: 50, date: "2026-10-01" },
      timestamp: 1_700_000_000_000,
      deviceId: "dev-A",
      signature: "sig-idem",
    };
    deviceA.appendLocalEvent(singleEvent);

    const firstPush = await deviceA.push();
    expect(firstPush.pushed).toBe(true);
    expect(relay.getPublicationLog()).toHaveLength(1);
    expect(relay.getAllEvents()).toHaveLength(1);
    const dTag1 = relay.getAllEvents()[0].tags.find((t) => t[0] === "d")?.[1];

    // Limpa o tracker do grupo para simular retransmissão do lote idêntico
    await deviceA.tracker.clearGroup(deviceA.keys.publicKey);

    // Segundo envio com o lote idêntico
    const secondPush = await deviceA.push();
    expect(secondPush.pushed).toBe(true);
    expect(secondPush.count).toBe(1);

    // O relay registrou a 2ª publicação no log, mas deduplicou por NIP-33 na mesma tag "d"
    expect(relay.getPublicationLog()).toHaveLength(2);
    expect(relay.getAllEvents()).toHaveLength(1);
    const dTag2 = relay.getAllEvents()[0].tags.find((t) => t[0] === "d")?.[1];
    expect(dTag1).toBe(dTag2);
  });
});
