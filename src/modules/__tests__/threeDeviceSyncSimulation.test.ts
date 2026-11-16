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

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  shouldPublishGroupEvents,
  processIncomingEvents,
  computeEventHash,
  processPushResult,
  resolvePullSyncOptions,
  RESET_MARKER_EVENT_TYPE,
  type ResetMarkerPayload,
  createResetMarkerEvent,
  filterEventsAgainstMarkers,
} from "../syncDecisions";
import {
  FakeMemoryRelay,
  createSimulatedClock,
  type NostrEvent,
} from "../testing/fakeMemoryRelay";
import {
  createSimulatedDevice,
  type SimulatedSyncDevice,
} from "../testing/simulatedDevice";
import {
  generateGroupSecret,
  encodeGroupSecret,
  parseGroupSecret,
  deriveStrongGroupKeys,
} from "../strongGroup/groupSecret";
import { encryptStrongPayload } from "../strongGroup/eventCipher";
import { computeStrongBatchId, type NostrSyncKeys } from "../nostrSync";
import { RELAY_CURSOR_OVERLAP_SEC } from "../syncPayload";

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
  const dummyTracker = (published: string[] = [], received: string[] = []) => {
    const publishedSet = new Set(published);
    const receivedSet = new Set(received);
    return {
      filterEventsToPublish: <T extends { id: string }>(events: readonly T[]) =>
        events.filter((e) => !publishedSet.has(e.id) && !receivedSet.has(e.id)),
      hasReceived: (id: string, groupId?: string) => receivedSet.has(id),
      hasPublished: (id: string, groupId?: string) => publishedSet.has(id),
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
    it("retorna shouldPublish: false e reason: 'no-events' quando não há eventos deste aparelho ou todos já foram recebidos do grupo", () => {
      const decision = shouldPublishGroupEvents({
        events: [makeEvent({ id: "peer-1", deviceId: "dev-other" })],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker([], ["peer-1"]),
        deviceId: "dev-me",
      });

      expect(decision.shouldPublish).toBe(false);
      expect(decision.reason).toBe("no-events");
      expect(decision.myEvents).toHaveLength(0);
      expect(decision.hash).toBe("empty");
    });

    it("retorna shouldPublish: false e reason: 'no-events' para lista vazia de eventos", () => {
      const decision = shouldPublishGroupEvents({
        events: [],
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

    it("permite publicação de evento de backup restaurado com deviceId antigo se não foi recebido do grupo", () => {
      const backupEvt = makeEvent({ id: "backup-1", deviceId: "dev-old" });
      const decision = shouldPublishGroupEvents({
        events: [backupEvt],
        groupId: "group-1",
        isStrong: true,
        tracker: dummyTracker([], []),
        deviceId: "dev-new",
      });

      expect(decision.shouldPublish).toBe(true);
      expect(decision.reason).toBe("pending-events");
      expect(decision.myEvents).toEqual([backupEvt]);
      expect(decision.pendingEvents).toEqual([backupEvt]);
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

describe("resolvePullSyncOptions (syncDecisions)", () => {
  it("modo recuperação (isRecovery = true): retorna cursor null e sem since mesmo com cursor salvo", () => {
    const opts = resolvePullSyncOptions({
      isRecovery: true,
      isStrong: true,
      cursor: 1_700_000_100,
    });
    expect(opts).toEqual({ cursor: null });
    expect(opts.since).toBeUndefined();
  });

  it("grupo legado (isStrong = false): não usa cursor nem since para evitar contaminação", () => {
    const opts = resolvePullSyncOptions({
      isRecovery: false,
      isStrong: false,
      cursor: 1_700_000_100,
    });
    expect(opts).toEqual({ cursor: null });
    expect(opts.since).toBeUndefined();
  });

  it("grupo forte com cursor ativo: preserva cursor e aplica janela de sobreposição de 60 segundos em since", () => {
    const cursor = 1_700_000_100;
    const opts = resolvePullSyncOptions({
      isRecovery: false,
      isStrong: true,
      cursor,
    });
    expect(opts.cursor).toBe(cursor);
    expect(opts.since).toBe(cursor - 60);
  });

  it("cursor nulo, indefinido ou <= 0: retorna cursor null e sem since", () => {
    expect(resolvePullSyncOptions({ isStrong: true, cursor: null })).toEqual({ cursor: null });
    expect(resolvePullSyncOptions({ isStrong: true, cursor: undefined })).toEqual({ cursor: null });
    expect(resolvePullSyncOptions({ isStrong: true, cursor: 0 })).toEqual({ cursor: null });
    expect(resolvePullSyncOptions({ isStrong: true, cursor: -10 })).toEqual({ cursor: null });
    expect(resolvePullSyncOptions({ isStrong: true, cursor: Number.NaN })).toEqual({ cursor: null });
    expect(resolvePullSyncOptions({ isStrong: true, cursor: Infinity })).toEqual({ cursor: null });
    expect(resolvePullSyncOptions({ isStrong: true, cursor: -Infinity })).toEqual({ cursor: null });
  });

  it("limita since para não exceder nowSec - RELAY_CURSOR_OVERLAP_SEC em caso de relógio adiantado", () => {
    const nowSec = 1_700_000_000;
    const futureCursor = nowSec + 3600; // 1 hora no futuro
    const opts = resolvePullSyncOptions({
      isRecovery: false,
      isStrong: true,
      cursor: futureCursor,
      nowSec,
    });
    expect(opts.cursor).toBe(futureCursor);
    expect(opts.since).toBe(nowSec - RELAY_CURSOR_OVERLAP_SEC);
  });

  it("janela de sobreposição não produz timestamp negativo quando cursor < 60s", () => {
    const opts = resolvePullSyncOptions({
      isRecovery: false,
      isStrong: true,
      cursor: 30,
    });
    expect(opts.cursor).toBe(30);
    expect(opts.since).toBe(0);
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

describe("Story 5.4 - Ler o histórico de forma incremental e paginada", () => {
  let relay: FakeMemoryRelay;
  let sharedSecret: string;
  let sharedKeys: NostrSyncKeys;
  let deviceB: SimulatedSyncDevice;
  const baseTime = 1_700_000_000;

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

    deviceB = await createSimulatedDevice({
      deviceId: "dev-B",
      relay,
      keys: sharedKeys,
      groupSecret: sharedSecret,
    });
  });

  it("histórico de 1.200 lotes no relay falso é lido por inteiro via paginação em páginas de até 500", async () => {
    // 1. Popula o relay com 1.200 lotes Nostr válidos e decifráveis com chave forte
    for (let i = 0; i < 1200; i++) {
      const syncEvt: SyncEvent = {
        id: `evt-hist-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `evt-hist-${i}`, accountId: "acc-1", type: "expense", amount: 10, date: "2026-10-01" },
        timestamp: 1_700_000_000_000 + i * 1000,
        deviceId: "dev-publisher",
        signature: `sig-${i}`,
      };
      const ciphertext = encryptStrongPayload(JSON.stringify([syncEvt]), {
        encryptionKey: sharedKeys.encryptionKey,
        nostrPublicKey: sharedKeys.publicKey,
      });
      const nostrEvent: NostrEvent = {
        id: `nostr-batch-${i}`,
        pubkey: sharedKeys.publicKey,
        created_at: baseTime + i,
        kind: 30333,
        tags: [
          ["t", "domus-sync"],
          ["d", `sync-dev-publisher-${i}`],
        ],
        content: ciphertext,
      };
      relay.publish(nostrEvent);
    }

    expect(relay.getAllEvents()).toHaveLength(1200);
    expect(deviceB.getCursor()).toBeNull();

    // 2. Aparelho B executa pull()
    const pullResult = await deviceB.pull();
    expect(pullResult.importedCount).toBe(1200);
    expect(deviceB.getAllEvents()).toHaveLength(1200);

    // 3. Comprova que a recuperação paginou em 3 páginas (500 + 500 + 200)
    const queries = relay.getQueryLog();
    expect(queries).toHaveLength(3);
    // 1ª página: limit 500, sem since nem until
    expect(queries[0].limit).toBe(500);
    expect(queries[0].since).toBeUndefined();
    expect(queries[0].until).toBeUndefined();
    // 2ª página: limit 500, until definido pelo menor timestamp da 1ª página
    expect(queries[1].limit).toBe(500);
    expect(queries[1].until).toBe(baseTime + 700);
    // 3ª página: limit 500, until definido pelo menor timestamp da 2ª página
    expect(queries[2].limit).toBe(500);
    expect(queries[2].until).toBe(baseTime + 201);

    // 4. Cursor avançou para o maior created_at
    expect(deviceB.getCursor()).toBe(baseTime + 1199);
  });

  it("ciclo subsequente com cursor ativo lê apenas o que chegou após o cursor", async () => {
    // 1. Popula 1.200 lotes e faz a leitura inicial
    for (let i = 0; i < 1200; i++) {
      const syncEvt: SyncEvent = {
        id: `evt-hist-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `evt-hist-${i}`, accountId: "acc-1", type: "expense", amount: 10, date: "2026-10-01" },
        timestamp: 1_700_000_000_000 + i * 1000,
        deviceId: "dev-publisher",
        signature: `sig-${i}`,
      };
      const ciphertext = encryptStrongPayload(JSON.stringify([syncEvt]), {
        encryptionKey: sharedKeys.encryptionKey,
        nostrPublicKey: sharedKeys.publicKey,
      });
      relay.publish({
        id: `nostr-batch-${i}`,
        pubkey: sharedKeys.publicKey,
        created_at: baseTime + i,
        kind: 30333,
        tags: [
          ["t", "domus-sync"],
          ["d", `sync-dev-publisher-${i}`],
        ],
        content: ciphertext,
      });
    }

    await deviceB.pull();
    expect(deviceB.getCursor()).toBe(baseTime + 1199);

    // 2. Aparelho A publica 1 novo lote com timestamp mais recente
    const newEvt: SyncEvent = {
      id: "evt-subsequent-1",
      type: "TRANSACTION_CREATED",
      payload: { id: "evt-subsequent-1", accountId: "acc-1", type: "income", amount: 200, date: "2026-10-02" },
      timestamp: 1_700_000_000_000 + 1300 * 1000,
      deviceId: "dev-A",
      signature: "sig-subsequent-1",
    };
    const newCiphertext = encryptStrongPayload(JSON.stringify([newEvt]), {
      encryptionKey: sharedKeys.encryptionKey,
      nostrPublicKey: sharedKeys.publicKey,
    });
    relay.publish({
      id: "nostr-new-batch",
      pubkey: sharedKeys.publicKey,
      created_at: baseTime + 1250,
      kind: 30333,
      tags: [
        ["t", "domus-sync"],
        ["d", "sync-dev-A-new"],
      ],
      content: newCiphertext,
    });

    // 3. Aparelho B executa segundo pull: lê estritamente o novo lote
    const queryCountBefore = relay.getQueryLog().length;
    const secondPull = await deviceB.pull();
    expect(secondPull.importedCount).toBe(1);
    expect(deviceB.getAllEvents()).toHaveLength(1201);

    // 4. Apenas 1 consulta foi realizada no segundo pull, com since: baseTime + 1199 - RELAY_CURSOR_OVERLAP_SEC
    const secondQueries = relay.getQueryLog().slice(queryCountBefore);
    expect(secondQueries).toHaveLength(1);
    expect(secondQueries[0].since).toBe(baseTime + 1199 - RELAY_CURSOR_OVERLAP_SEC);
    expect(secondQueries[0].until).toBeUndefined();

    // 5. Cursor avançou para o timestamp do novo lote
    expect(deviceB.getCursor()).toBe(baseTime + 1250);
  });

  it("ciclo subsequente sem novos eventos é no-op e mantém o cursor inalterado", async () => {
    // 1. Popula 5 lotes e lê inicialmente
    for (let i = 0; i < 5; i++) {
      const syncEvt: SyncEvent = {
        id: `evt-noop-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `evt-noop-${i}`, accountId: "acc-1", type: "expense", amount: 10, date: "2026-10-01" },
        timestamp: 1_700_000_000_000 + i * 1000,
        deviceId: "dev-publisher",
        signature: `sig-${i}`,
      };
      const ciphertext = encryptStrongPayload(JSON.stringify([syncEvt]), {
        encryptionKey: sharedKeys.encryptionKey,
        nostrPublicKey: sharedKeys.publicKey,
      });
      relay.publish({
        id: `nostr-noop-${i}`,
        pubkey: sharedKeys.publicKey,
        created_at: baseTime + i,
        kind: 30333,
        tags: [
          ["t", "domus-sync"],
          ["d", `sync-dev-publisher-${i}`],
        ],
        content: ciphertext,
      });
    }

    await deviceB.pull();
    expect(deviceB.getCursor()).toBe(baseTime + 4);

    // 2. Terceiro pull sem nenhuma publicação nova
    const pullNoOp = await deviceB.pull();
    expect(pullNoOp.importedCount).toBe(0);
    expect(deviceB.getCursor()).toBe(baseTime + 4);
  });

  it("fronteira de página com múltiplos lotes com mesmo created_at não duplica nem entra em loop", async () => {
    // 600 lotes: 500 no baseTime + 10, e 100 no baseTime
    for (let i = 0; i < 600; i++) {
      const syncEvt: SyncEvent = {
        id: `evt-boundary-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `evt-boundary-${i}`, accountId: "acc-1", type: "expense", amount: 10, date: "2026-10-01" },
        timestamp: 1_700_000_000_000 + i * 1000,
        deviceId: "dev-publisher",
        signature: `sig-${i}`,
      };
      const ciphertext = encryptStrongPayload(JSON.stringify([syncEvt]), {
        encryptionKey: sharedKeys.encryptionKey,
        nostrPublicKey: sharedKeys.publicKey,
      });
      relay.publish({
        id: `nostr-boundary-${i}`,
        pubkey: sharedKeys.publicKey,
        created_at: i < 500 ? baseTime + 10 : baseTime,
        kind: 30333,
        tags: [
          ["t", "domus-sync"],
          ["d", `sync-dev-publisher-${i}`],
        ],
        content: ciphertext,
      });
    }

    const pullResult = await deviceB.pull();
    expect(pullResult.importedCount).toBe(600);
    expect(deviceB.getAllEvents()).toHaveLength(600);
    expect(deviceB.getCursor()).toBe(baseTime + 10);
  });
});

describe("Story 5.5 - Enfileirar eventos recebidos em rajada", () => {
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

  it("publicação de lote de 20 eventos por A é recebida integralmente por B e C via subscrição ao vivo sem perdas", async () => {
    const liveB = deviceB.startLiveSync();
    const liveC = deviceC.startLiveSync();

    // Cria conta base e 19 transações (total 20 eventos em 1 lote de push)
    deviceA.appendLocalEvent({
      id: "acc-burst-base",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-burst-base", name: "Conta Rajada", type: "checking", balance: 5000 },
      timestamp: 1_700_000_000_000,
    });

    for (let i = 1; i <= 19; i++) {
      deviceA.appendLocalEvent({
        id: `tx-burst-20-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-burst-20-${i}`,
          accountId: "acc-burst-base",
          type: "expense",
          amount: 25 * i,
          date: "2026-10-10",
        },
        timestamp: 1_700_000_000_000 + i * 1000,
      });
    }

    expect(deviceA.getAllEvents()).toHaveLength(20);

    const pushResult = await deviceA.push();
    expect(pushResult.pushed).toBe(true);
    expect(pushResult.count).toBe(20);

    // Aguarda drenagem completa das filas assíncronas em B e C
    await deviceB.idle();
    await deviceC.idle();

    // Todos os 20 eventos foram importados
    expect(deviceB.getAllEvents()).toHaveLength(20);
    expect(deviceC.getAllEvents()).toHaveLength(20);

    expect(deviceB.getExistingEventIds().has("acc-burst-base")).toBe(true);
    expect(deviceC.getExistingEventIds().has("acc-burst-base")).toBe(true);

    for (let i = 1; i <= 19; i++) {
      expect(deviceB.getExistingEventIds().has(`tx-burst-20-${i}`)).toBe(true);
      expect(deviceC.getExistingEventIds().has(`tx-burst-20-${i}`)).toBe(true);
    }

    // Cursor do relay avançou em ambos
    expect(deviceB.getCursor()).not.toBeNull();
    expect(deviceC.getCursor()).not.toBeNull();
    expect(deviceB.getCursor()).toBe(deviceC.getCursor());

    // Estados financeiros idênticos
    expect(deviceB.getState()).toEqual(deviceA.getState());
    expect(deviceC.getState()).toEqual(deviceA.getState());

    liveB.close();
    liveC.close();
  });

  it("eventos ao vivo chegam enquanto B está ocupado com pull() (isImporting: true) e são importados logo após sem descarte", async () => {
    // 1. A publica uma conta base que B irá puxar via pull()
    deviceA.appendLocalEvent({
      id: "acc-pull-base",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-pull-base", name: "Conta Inicial", type: "checking", balance: 1000 },
      timestamp: 1_700_000_000_000,
    });
    await deviceA.push();

    const liveB = deviceB.startLiveSync();

    // 2. Intercepta o tracker de B para suspender o pull() no meio da importação
    let releasePull!: () => void;
    const pullGate = new Promise<void>((resolve) => {
      releasePull = resolve;
    });

    const originalMarkReceived = deviceB.tracker.markReceived.bind(deviceB.tracker);
    let pullBlocked = false;
    deviceB.tracker.markReceived = async (ids, groupId) => {
      pullBlocked = true;
      await pullGate;
      return originalMarkReceived(ids, groupId);
    };

    const pullPromise = deviceB.pull();

    // Aguarda o pull de B começar e ficar retido no mutex
    while (!pullBlocked) {
      await new Promise((r) => setTimeout(r, 2));
    }
    expect(deviceB.isImporting()).toBe(true);

    // 3. Enquanto B está ocupado (isImporting: true), chegam 5 novos eventos ao vivo via A.push()
    for (let i = 1; i <= 5; i++) {
      deviceA.appendLocalEvent({
        id: `tx-during-pull-${i}`,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-during-pull-${i}`,
          accountId: "acc-pull-base",
          type: "income",
          amount: 50 * i,
          date: "2026-10-10",
        },
        timestamp: 1_700_000_000_000 + (10 + i) * 1000,
      });
    }

    const pushResult = await deviceA.push();
    expect(pushResult.pushed).toBe(true);
    expect(pushResult.count).toBe(5);

    // B ainda está travado no pull original
    expect(deviceB.isImporting()).toBe(true);
    // Os 5 novos eventos estão enfileirados e NÃO foram descartados
    for (let i = 1; i <= 5; i++) {
      expect(deviceB.getExistingEventIds().has(`tx-during-pull-${i}`)).toBe(false);
    }

    // 4. Libera o pull
    releasePull();
    await pullPromise;

    // 5. Aguarda drenagem da fila ao vivo sob o mutex
    await deviceB.idle();

    expect(deviceB.isImporting()).toBe(false);

    // Todos os 5 eventos ao vivo e o evento inicial do pull foram integralmente importados
    expect(deviceB.getAllEvents()).toHaveLength(6);
    expect(deviceB.getExistingEventIds().has("acc-pull-base")).toBe(true);
    for (let i = 1; i <= 5; i++) {
      expect(deviceB.getExistingEventIds().has(`tx-during-pull-${i}`)).toBe(true);
    }

    expect(deviceB.getState()).toEqual(deviceA.getState());

    liveB.close();
  });

  it("múltiplas rajadas sequenciais rápidas resultam em convergência completa e estados idênticos", async () => {
    const liveA = deviceA.startLiveSync();
    const liveB = deviceB.startLiveSync();
    const liveC = deviceC.startLiveSync();

    // Conta compartilhada criada no nó A
    deviceA.appendLocalEvent({
      id: "acc-shared",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-shared", name: "Conta Coletiva", type: "checking", balance: 5000 },
      timestamp: 1_700_000_000_000,
    });
    await deviceA.push();
    await deviceA.idle();
    await deviceB.idle();
    await deviceC.idle();

    // 5 rajadas rápidas de 4 transações (20 transações no total, geradas por A, B e C)
    // Disparadas em rápida sucessão sem esperar idle() intermediário
    // Rajada 1 (A): 4 txs
    for (let i = 1; i <= 4; i++) {
      deviceA.appendLocalEvent({
        id: `tx-burst1-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-burst1-${i}`, accountId: "acc-shared", type: "income", amount: 10, date: "2026-10-10" },
        timestamp: 1_700_000_000_000 + i * 10,
      });
    }
    const p1 = deviceA.push();

    // Rajada 2 (B): 4 txs
    for (let i = 1; i <= 4; i++) {
      deviceB.appendLocalEvent({
        id: `tx-burst2-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-burst2-${i}`, accountId: "acc-shared", type: "expense", amount: 5, date: "2026-10-10" },
        timestamp: 1_700_000_000_000 + (10 + i) * 10,
      });
    }
    const p2 = deviceB.push();

    // Rajada 3 (C): 4 txs
    for (let i = 1; i <= 4; i++) {
      deviceC.appendLocalEvent({
        id: `tx-burst3-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-burst3-${i}`, accountId: "acc-shared", type: "income", amount: 20, date: "2026-10-10" },
        timestamp: 1_700_000_000_000 + (20 + i) * 10,
      });
    }
    const p3 = deviceC.push();

    // Rajada 4 (A): 4 txs
    for (let i = 1; i <= 4; i++) {
      deviceA.appendLocalEvent({
        id: `tx-burst4-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-burst4-${i}`, accountId: "acc-shared", type: "expense", amount: 8, date: "2026-10-10" },
        timestamp: 1_700_000_000_000 + (30 + i) * 10,
      });
    }
    const p4 = deviceA.push();

    // Rajada 5 (B): 4 txs
    for (let i = 1; i <= 4; i++) {
      deviceB.appendLocalEvent({
        id: `tx-burst5-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-burst5-${i}`, accountId: "acc-shared", type: "income", amount: 15, date: "2026-10-10" },
        timestamp: 1_700_000_000_000 + (40 + i) * 10,
      });
    }
    const p5 = deviceB.push();

    await Promise.all([p1, p2, p3, p4, p5]);

    // Drenagem de todas as filas
    await deviceA.idle();
    await deviceB.idle();
    await deviceC.idle();

    // Total: 1 conta + 20 transações = 21 eventos em todos os aparelhos
    expect(deviceA.getAllEvents()).toHaveLength(21);
    expect(deviceB.getAllEvents()).toHaveLength(21);
    expect(deviceC.getAllEvents()).toHaveLength(21);

    // Sem duplicações
    expect(deviceA.getExistingEventIds().size).toBe(21);
    expect(deviceB.getExistingEventIds().size).toBe(21);
    expect(deviceC.getExistingEventIds().size).toBe(21);

    // Estados convergem perfeitamente
    expect(deviceB.getState()).toEqual(deviceA.getState());
    expect(deviceC.getState()).toEqual(deviceA.getState());

    liveA.close();
    liveB.close();
    liveC.close();
  });

  it("eventos duplicados dentro da mesma rajada são deduplicados sem erro", async () => {
    const liveB = deviceB.startLiveSync();

    const dupEvent: SyncEvent = {
      id: "tx-duplicate-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-dup", name: "Conta Dup", type: "checking", balance: 500 },
      timestamp: 1_700_000_000_000,
      deviceId: "dev-A",
      signature: "sig-dup",
    };

    // Enfileira rajada contendo 2 cópias do mesmo evento
    deviceB.enqueueLiveBatch([dupEvent, dupEvent], 1_700_000_100);
    await deviceB.idle();

    // Apenas 1 evento importado no banco
    expect(deviceB.getAllEvents()).toHaveLength(1);
    expect(deviceB.getExistingEventIds().has("tx-duplicate-1")).toBe(true);

    liveB.close();
  });
});

describe("Story 5.6 - Nunca republicar o que veio do grupo", () => {
  let relay: FakeMemoryRelay;
  let groupSecret: string;
  let deviceA: SimulatedSyncDevice;
  let deviceB: SimulatedSyncDevice;
  let deviceC: SimulatedSyncDevice;

  beforeEach(async () => {
    relay = new FakeMemoryRelay();
    const secret = generateGroupSecret();
    groupSecret = encodeGroupSecret(secret);

    deviceA = await createSimulatedDevice({
      deviceId: "dev-A",
      relay,
      groupSecret,
    });
    deviceB = await createSimulatedDevice({
      deviceId: "dev-B",
      relay,
      groupSecret,
    });
    deviceC = await createSimulatedDevice({
      deviceId: "dev-C",
      relay,
      groupSecret,
    });
  });

  it("três aparelhos trocando N eventos geram exatamente N publicações no relay sem crescer ao longo do tempo", async () => {
    // Aparelho A gera 3 eventos
    deviceA.appendLocalEvent({
      id: "tx-a-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-1", name: "Conta A", type: "checking", balance: 1000 },
    });
    deviceA.appendLocalEvent({
      id: "tx-a-2",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-a-2", accountId: "acc-1", type: "expense", amount: 100, date: "2026-10-01" },
    });
    deviceA.appendLocalEvent({
      id: "tx-a-3",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-a-3", accountId: "acc-1", type: "expense", amount: 50, date: "2026-10-02" },
    });

    // Aparelho B gera 2 eventos
    deviceB.appendLocalEvent({
      id: "tx-b-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-2", name: "Conta B", type: "savings", balance: 2000 },
    });
    deviceB.appendLocalEvent({
      id: "tx-b-2",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-b-2", accountId: "acc-2", type: "income", amount: 300, date: "2026-10-03" },
    });

    // Aparelho C gera 4 eventos
    deviceC.appendLocalEvent({
      id: "tx-c-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-3", name: "Conta C", type: "checking", balance: 500 },
    });
    deviceC.appendLocalEvent({
      id: "tx-c-2",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-c-2", accountId: "acc-3", type: "expense", amount: 40, date: "2026-10-04" },
    });
    deviceC.appendLocalEvent({
      id: "tx-c-3",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-c-3", accountId: "acc-3", type: "expense", amount: 60, date: "2026-10-05" },
    });
    deviceC.appendLocalEvent({
      id: "tx-c-4",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-c-4", accountId: "acc-3", type: "income", amount: 150, date: "2026-10-06" },
    });

    // Cada aparelho publica seus eventos locais para o relay
    const pushA = await deviceA.push();
    const pushB = await deviceB.push();
    const pushC = await deviceC.push();

    expect(pushA.pushed).toBe(true);
    expect(pushA.count).toBe(3);
    expect(pushB.pushed).toBe(true);
    expect(pushB.count).toBe(2);
    expect(pushC.pushed).toBe(true);
    expect(pushC.count).toBe(4);

    // Total de 9 eventos publicados no relay (3 lotes Nostr)
    const relayPublishCount = relay.getTotalPublications();
    expect(relayPublishCount).toBe(3);
    expect(relay.getAllEvents()).toHaveLength(3);

    // Todos os aparelhos puxam os eventos do relay
    await deviceA.pull();
    await deviceB.pull();
    await deviceC.pull();

    // Mais uma rodada de pull para convergência mútua
    await deviceA.pull();
    await deviceB.pull();
    await deviceC.pull();

    // Todos os 3 aparelhos possuem exatamente os 9 eventos
    expect(deviceA.getAllEvents()).toHaveLength(9);
    expect(deviceB.getAllEvents()).toHaveLength(9);
    expect(deviceC.getAllEvents()).toHaveLength(9);

    // Estados financeiros de domínio são idênticos em todos os aparelhos
    expect(deviceB.getState()).toEqual(deviceA.getState());
    expect(deviceC.getState()).toEqual(deviceA.getState());

    // Executa múltiplos ciclos repetidos de push subsequentes em todos os nós
    for (let round = 1; round <= 5; round++) {
      const repA = await deviceA.push();
      const repB = await deviceB.push();
      const repC = await deviceC.push();

      expect(repA.pushed).toBe(false);
      expect(repA.count).toBe(0);
      expect(repA.reason).toBe("up-to-date");

      expect(repB.pushed).toBe(false);
      expect(repB.count).toBe(0);
      expect(repB.reason).toBe("up-to-date");

      expect(repC.pushed).toBe(false);
      expect(repC.count).toBe(0);
      expect(repC.reason).toBe("up-to-date");
    }

    // A contagem de publicações no relay permaneceu rigorosamente constante (exatamente 3 lotes com 9 eventos)
    expect(relay.getTotalPublications()).toBe(relayPublishCount);
    expect(relay.getAllEvents()).toHaveLength(3);
  });

  it("aparelho que restaura backup com deviceId antigo publica os eventos no grupo forte com sucesso", async () => {
    // Aparelho B restaura backup contendo eventos gerados por um deviceId antigo
    const backupEvents: SyncEvent[] = [
      {
        id: "tx-backup-old-1",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-restored", name: "Conta Backup Restaurada", type: "checking", balance: 5000 },
        timestamp: 1_690_000_000_000,
        deviceId: "dev-legacy-backup-uuid",
        signature: "sig-bkp-1",
      },
      {
        id: "tx-backup-old-2",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-restored-2", accountId: "acc-restored", type: "expense", amount: 450, date: "2026-07-15" },
        timestamp: 1_690_000_100_000,
        deviceId: "dev-legacy-backup-uuid",
        signature: "sig-bkp-2",
      },
    ];

    deviceB.restoreBackupEvents(backupEvents);

    // Os eventos estão no eventStore de B, mas com deviceId antigo ("dev-legacy-backup-uuid" !== "dev-B")
    expect(deviceB.getAllEvents()).toHaveLength(2);
    expect(deviceB.getAllEvents().every((e) => e.deviceId === "dev-legacy-backup-uuid")).toBe(true);

    // Aparelho B faz push: os eventos de backup devem ser publicados no grupo forte pois ainda não constam no tracker
    const pushResult = await deviceB.push();
    expect(pushResult.pushed).toBe(true);
    expect(pushResult.count).toBe(2);
    expect(pushResult.confirmedEventIds).toEqual(["tx-backup-old-1", "tx-backup-old-2"]);

    // Idempotência subsequente no próprio aparelho B: push repetido é no-op (up-to-date)
    const repushB = await deviceB.push();
    expect(repushB.pushed).toBe(false);
    expect(repushB.reason).toBe("up-to-date");
    expect(repushB.count).toBe(0);

    // Aparelho A puxa do relay e importa os eventos de backup restaurados de B
    const pullA = await deviceA.pull();
    expect(pullA.importedCount).toBe(2);
    expect(deviceA.getExistingEventIds().has("tx-backup-old-1")).toBe(true);
    expect(deviceA.getExistingEventIds().has("tx-backup-old-2")).toBe(true);

    // Estado financeiro em A reflete a conta e despesa do backup restaurado
    const stateA = deviceA.getState();
    const restoredAccount = stateA.accounts["acc-restored"];
    expect(restoredAccount?.name).toBe("Conta Backup Restaurada");
    expect(restoredAccount?.balance).toBe(4550); // 5000 - 450

    // Aparelho A marcou os eventos no tracker como recebidos e jamais os republica
    expect(deviceA.tracker.hasReceived("tx-backup-old-1", deviceA.keys.publicKey)).toBe(true);
    expect(deviceA.tracker.hasReceived("tx-backup-old-2", deviceA.keys.publicKey)).toBe(true);

    const repushA = await deviceA.push();
    expect(repushA.pushed).toBe(false);
    expect(repushA.count).toBe(0);
  });

  it("importação de eventos remotos de outro aparelho não altera o estado de gamificação (totalXp e conquistas)", async () => {
    // Estado inicial de gamificação de B: 0 XP e sem troféus
    const initialGamificationB = deviceB.getReplayResult().gamification;
    expect(initialGamificationB.totalXp).toBe(0);
    expect(initialGamificationB.level).toBe(1);
    expect(initialGamificationB.unlockedAchievements).toHaveLength(0);
    expect(initialGamificationB.currentStreak).toBe(0);

    // Aparelho A cria 1 conta e 4 transações e publica no relay
    deviceA.appendLocalEvent({
      id: "acc-gamification-test",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-gam-1", name: "Conta Gamificação", type: "checking", balance: 1000 },
    });
    for (let i = 1; i <= 4; i++) {
      deviceA.appendLocalEvent({
        id: `tx-gam-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-gam-${i}`, accountId: "acc-gam-1", type: "expense", amount: 10 * i, date: "2026-10-01" },
      });
    }

    await deviceA.push();

    // Aparelho B importa todos os eventos de A
    const pullResult = await deviceB.pull();
    expect(pullResult.importedCount).toBe(5);

    // O domínio de B foi atualizado com as transações e o saldo correto
    const stateB = deviceB.getState();
    expect(Object.keys(stateB.transactions)).toHaveLength(4);
    expect(stateB.accounts["acc-gam-1"]?.balance).toBe(900); // 1000 - 100

    // A gamificação de B permaneceu rigorosamente intacta (sem concessão de XP nem troféus pelo tráfego)
    const postSyncGamificationB = deviceB.getReplayResult().gamification;
    expect(postSyncGamificationB.totalXp).toBe(0);
    expect(postSyncGamificationB.level).toBe(1);
    expect(postSyncGamificationB.unlockedAchievements).toEqual(initialGamificationB.unlockedAchievements);
    // Story 7.9: streak é derivado das transações confirmadas presentes no log (4 transações em 2026-10-01 -> streak 1)
    expect(postSyncGamificationB.currentStreak).toBe(1);
  });

  it("aparelho que recebe evento do grupo nunca o devolve em ciclos de push subsequentes (supressão estrita de eco)", async () => {
    // Aparelho A cria e publica evento
    deviceA.appendLocalEvent({
      id: "evt-no-echo-1",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-echo", name: "Conta Anti-Eco", type: "checking", balance: 750 },
    });
    await deviceA.push();

    // Aparelho B puxa do relay
    await deviceB.pull();
    expect(deviceB.getExistingEventIds().has("evt-no-echo-1")).toBe(true);
    expect(deviceB.tracker.hasReceived("evt-no-echo-1", deviceB.keys.publicKey)).toBe(true);

    // Decisão pura de publicação em B exclui o evento recebido
    const decisionB = shouldPublishGroupEvents({
      events: deviceB.getAllEvents(),
      groupId: deviceB.keys.publicKey,
      isStrong: true,
      tracker: deviceB.tracker,
      deviceId: deviceB.deviceId,
    });
    expect(decisionB.shouldPublish).toBe(false);
    expect(decisionB.reason).toBe("no-events");
    expect(decisionB.myEvents).toHaveLength(0);

    // Push em B não publica nada
    const pushB1 = await deviceB.push();
    expect(pushB1.pushed).toBe(false);
    expect(pushB1.count).toBe(0);
    expect(pushB1.reason).toBe("no-events");

    // Agora Aparelho B cria um evento genuinamente local
    deviceB.appendLocalEvent({
      id: "evt-local-b-new",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-local-b", accountId: "acc-echo", type: "income", amount: 250, date: "2026-10-02" },
    });

    // Ao publicar, o lote de B contém APENAS o evento local de B, excluindo o evento recebido de A
    const pushB2 = await deviceB.push();
    expect(pushB2.pushed).toBe(true);
    expect(pushB2.confirmedEventIds).toEqual(["evt-local-b-new"]);
    expect(pushB2.confirmedEventIds).not.toContain("evt-no-echo-1");

    // Aparelho A puxa e importa apenas o evento novo de B
    const pullA = await deviceA.pull();
    expect(pullA.importedCount).toBe(1);
    expect(deviceA.getExistingEventIds().has("evt-local-b-new")).toBe(true);

    // Aparelho A não republica o evento recebido de B
    const pushA2 = await deviceA.push();
    expect(pushA2.pushed).toBe(false);
    expect(pushA2.count).toBe(0);
  });

  it("canal legado exclui PAYSLIP_* de backup restaurado mas forte aceita e publica", () => {
    const dummy = (published: string[] = [], received: string[] = []) => {
      const pSet = new Set(published);
      const rSet = new Set(received);
      return {
        filterEventsToPublish: <T extends { id: string }>(evts: readonly T[]) =>
          evts.filter((e) => !pSet.has(e.id) && !rSet.has(e.id)),
        hasReceived: (id: string, groupId?: string) => rSet.has(id),
        hasPublished: (id: string, groupId?: string) => pSet.has(id),
      };
    };

    const payslipBackupEvt: SyncEvent = {
      id: "bkp-payslip-1",
      type: "PAYSLIP_RECORDED",
      payload: { id: "p1", grossSalary: 8000 },
      timestamp: 1_700_000_000_000,
      deviceId: "dev-old-device",
      signature: "sig-p1",
    };

    // No canal legado (isStrong: false), PAYSLIP_* é excluído e não é publicado
    const legacyDecision = shouldPublishGroupEvents({
      events: [payslipBackupEvt],
      groupId: "legacy-group-pubkey",
      isStrong: false,
      tracker: dummy(),
      deviceId: "dev-new-device",
    });
    expect(legacyDecision.shouldPublish).toBe(false);
    expect(legacyDecision.reason).toBe("no-events");
    expect(legacyDecision.myEvents).toHaveLength(0);

    // No canal forte (isStrong: true), PAYSLIP_* de backup restaurado é aceito e elegível para envio
    const strongDecision = shouldPublishGroupEvents({
      events: [payslipBackupEvt],
      groupId: "strong-group-pubkey",
      isStrong: true,
      tracker: dummy(),
      deviceId: "dev-new-device",
    });
    expect(strongDecision.shouldPublish).toBe(true);
    expect(strongDecision.reason).toBe("pending-events");
    expect(strongDecision.myEvents).toEqual([payslipBackupEvt]);
    expect(strongDecision.pendingEvents).toEqual([payslipBackupEvt]);
  });
});

describe("Story 5.7 - Propagar rápido, inclusive depois de ficar offline", () => {
  it("propaga gasto do celular para o tablet em até 15 segundos medidos no relógio simulado", async () => {
    let simTime = 1_700_000_000_000;
    const now = () => simTime;

    const relay = new FakeMemoryRelay({ now });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-1",
      relay,
      groupSecret: secret,
      now,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-1",
      relay,
      groupSecret: secret,
      now,
    });

    // Tablet inicia com assinatura ao vivo ativa
    tablet.startLiveSync();

    // Celular cria conta inicial e um gasto
    const tStart = simTime;
    phone.appendLocalEvent({
      id: "evt-acc-phone",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-main", name: "Conta Corrente", type: "checking", balance: 1000 },
      timestamp: tStart,
    });
    const expenseEvt = phone.appendLocalEvent({
      id: "evt-tx-phone",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-lunch", accountId: "acc-main", type: "expense", amount: 45, description: "Almoço", date: "2026-10-01" },
      timestamp: tStart + 100,
    });

    // Celular publica no relay
    await phone.push();

    // Simula atraso na rede de transmissão (2.500 ms)
    simTime += 2500;

    // Tablet drena a fila de eventos recebidos
    await tablet.idle();
    const tEnd = simTime;

    // Latência total ponta a ponta medida no relógio simulado
    const totalElapsed = tEnd - tStart;
    expect(totalElapsed).toBeLessThanOrEqual(15_000);

    const eventLatency = tablet.getPropagationLatency(expenseEvt.id);
    expect(eventLatency).toBeDefined();
    expect(eventLatency!).toBeLessThanOrEqual(15_000);

    // Tablet reflete gasto no extrato e saldo
    expect(tablet.getExistingEventIds().has("evt-tx-phone")).toBe(true);
    const tabletState = tablet.getState();
    expect(tabletState.accounts["acc-main"]?.balance).toBe(955);
    expect(tabletState.transactions["tx-lunch"]).toBeDefined();
    expect(tabletState.transactions["tx-lunch"]?.amount).toBe(45);

    tablet.stopLiveSync();
  });

  it("entrega do mesmo evento por múltiplos relays concorrentes é estritamente idempotente (aplicado 1 vez)", async () => {
    let simTime = 1_700_000_000_000;
    const now = () => simTime;

    const relay1 = new FakeMemoryRelay({ now });
    const relay2 = new FakeMemoryRelay({ now });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-2",
      relays: [relay1, relay2],
      groupSecret: secret,
      now,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-2",
      relays: [relay1, relay2],
      groupSecret: secret,
      now,
    });

    tablet.startLiveSync();

    // Celular cria conta e transação
    phone.appendLocalEvent({
      id: "evt-acc-multi",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-multi", name: "Conta Multi-Relay", type: "checking", balance: 500 },
    });
    phone.appendLocalEvent({
      id: "evt-tx-multi",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-coffee", accountId: "acc-multi", type: "expense", amount: 15, date: "2026-10-01" },
    });

    // Celular publica nos 2 relays concorrentes
    const pushRes = await phone.push();
    expect(pushRes.pushed).toBe(true);

    // Ambos os relays receberam o evento
    expect(relay1.getPublicationCountByEventId("evt-tx-multi")).toBe(1);
    expect(relay2.getPublicationCountByEventId("evt-tx-multi")).toBe(1);

    // Tablet processa notificações de ambos os relays concorrentes
    await tablet.idle();

    // Evento aplicado uma única vez no banco do tablet
    const tabletEvents = tablet.getAllEvents();
    const txEvents = tabletEvents.filter((e) => e.id === "evt-tx-multi");
    expect(txEvents).toHaveLength(1);

    // Saldo debitado apenas uma vez (500 - 15 = 485)
    expect(tablet.getState().accounts["acc-multi"]?.balance).toBe(485);

    // Tracker registra recebimento
    expect(tablet.tracker.hasReceived("evt-tx-multi", tablet.keys.publicKey)).toBe(true);

    tablet.stopLiveSync();
  });

  it("corrida simultânea entre assinatura ao vivo e pull periódico processa de forma atômica sem duplicações", async () => {
    let simTime = 1_700_000_000_000;
    const now = () => simTime;

    const relay = new FakeMemoryRelay({ now });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-race",
      relay,
      groupSecret: secret,
      now,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-race",
      relay,
      groupSecret: secret,
      now,
    });

    phone.appendLocalEvent({
      id: "evt-acc-race",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-race", name: "Conta Corrida", type: "checking", balance: 2000 },
    });
    const txEvt = phone.appendLocalEvent({
      id: "evt-tx-race",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-race-1", accountId: "acc-race", type: "expense", amount: 200, date: "2026-10-01" },
    });

    await phone.push();

    // Tablet inicia live sync
    tablet.startLiveSync();

    // Simula chegada concorrente: enfileira o evento via liveQueue E dispara pull() ao mesmo tempo
    tablet.enqueueLive(txEvt, Math.floor(simTime / 1000));
    const pullPromise = tablet.pull();

    await Promise.all([pullPromise, tablet.idle()]);

    // Evento aplicado exatamente 1 vez
    const count = tablet.getAllEvents().filter((e) => e.id === "evt-tx-race").length;
    expect(count).toBe(1);

    // Saldo consistente (2000 - 200 = 1800)
    expect(tablet.getState().accounts["acc-race"]?.balance).toBe(1800);

    tablet.stopLiveSync();
  });

  it("tablet offline enquanto celular lança 5 gastos reconecta autonomamente, reconcilia sem duplicar e não ecoa", async () => {
    let simTime = 1_700_000_000_000;
    const now = () => simTime;

    const relay = new FakeMemoryRelay({ now });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-offline-test",
      relay,
      groupSecret: secret,
      now,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-offline-test",
      relay,
      groupSecret: secret,
      now,
    });

    // Ambos iniciam com a conta inicial sincronizada
    phone.appendLocalEvent({
      id: "evt-acc-base",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-base", name: "Conta Base", type: "checking", balance: 5000 },
    });
    await phone.push();
    await tablet.pull();

    expect(tablet.getState().accounts["acc-base"]?.balance).toBe(5000);

    // Tablet fica offline
    tablet.setOnline(false);

    // Celular lança 5 gastos enquanto tablet está offline
    const expenseAmounts = [100, 250, 75, 420, 155]; // Total = 1000
    const expenseIds: string[] = [];

    for (let i = 0; i < expenseAmounts.length; i++) {
      simTime += 5000; // Relógio avança determinística e gradualmente
      const id = `evt-expense-offline-${i + 1}`;
      expenseIds.push(id);
      phone.appendLocalEvent({
        id,
        type: "TRANSACTION_CREATED",
        payload: {
          id: `tx-off-${i + 1}`,
          accountId: "acc-base",
          type: "expense",
          amount: expenseAmounts[i],
          description: `Gasto offline ${i + 1}`,
          date: "2026-10-01",
        },
      });
    }

    // Celular publica os 5 gastos no relay
    const phonePush = await phone.push();
    expect(phonePush.pushed).toBe(true);
    expect(phonePush.count).toBe(5);

    // Confirma que tablet ainda não recebeu nada por estar offline
    expect(tablet.getAllEvents()).toHaveLength(1); // Somente ACCOUNT_CREATED

    // Tablet volta online e reconecta de forma autônoma
    const reconnectResult = await tablet.reconnect();
    expect(reconnectResult.importedCount).toBe(5);

    // Tablet reconciliou todos os 5 gastos sem duplicar nenhum
    expect(tablet.getAllEvents()).toHaveLength(6);
    for (const expId of expenseIds) {
      expect(tablet.getExistingEventIds().has(expId)).toBe(true);
    }

    // Saldo consolidado confere exatamente com o do celular: 5000 - 1000 = 4000
    const expectedBalance = 5000 - 1000;
    expect(tablet.getState().accounts["acc-base"]?.balance).toBe(expectedBalance);
    expect(phone.getState().accounts["acc-base"]?.balance).toBe(expectedBalance);

    // Push subsequente do tablet NÃO republica nenhum dos 5 eventos recebidos (supressão estrita de eco)
    const pubsBefore = relay.getTotalPublications();
    const tabletPush = await tablet.push();
    expect(tabletPush.pushed).toBe(false);
    expect(tabletPush.count).toBe(0);
    expect(tabletPush.reason).toBe("no-events");
    expect(relay.getTotalPublications()).toBe(pubsBefore);
  });

  it("escrita concorrente offline bidirecional: celular (5 gastos) e tablet (2 gastos) convergem exatamente para 7 eventos", async () => {
    let simTime = 1_700_000_000_000;
    const now = () => simTime;

    const relay = new FakeMemoryRelay({ now });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-bidi",
      relay,
      groupSecret: secret,
      now,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-bidi",
      relay,
      groupSecret: secret,
      now,
    });

    // Ambos começam com uma conta inicial comum
    phone.appendLocalEvent({
      id: "evt-acc-bidi",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-bidi", name: "Conta Bidirecional", type: "checking", balance: 10000 },
      timestamp: 1_700_000_000_000,
    });
    await phone.push();
    await tablet.pull();

    // Ambos ficam offline
    phone.setOnline(false);
    tablet.setOnline(false);

    // Celular cria 5 gastos offline (5 x 100 = 500)
    for (let i = 1; i <= 5; i++) {
      phone.appendLocalEvent({
        id: `evt-phone-off-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-p-${i}`, accountId: "acc-bidi", type: "expense", amount: 100, date: "2026-10-01" },
        timestamp: 1_700_000_010_000 + i * 1000,
      });
    }

    // Tablet cria 2 gastos offline (2 x 350 = 700)
    for (let j = 1; j <= 2; j++) {
      tablet.appendLocalEvent({
        id: `evt-tablet-off-${j}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-t-${j}`, accountId: "acc-bidi", type: "expense", amount: 350, date: "2026-10-01" },
        timestamp: 1_700_000_020_000 + j * 1000,
      });
    }

    // Celular tenta push offline -> falha / retorna offline
    const phonePushOffline = await phone.push();
    expect(phonePushOffline.pushed).toBe(false);

    // Ambos reconectam
    await phone.reconnect();
    await tablet.reconnect();

    // Celular puxa o que o tablet publicou, e tablet puxa o que o celular publicou
    await phone.pull();
    await tablet.pull();

    // Ambos agora têm exatamente os mesmos 8 eventos (1 conta + 5 celular + 2 tablet)
    const phoneEvents = phone.getAllEvents();
    const tabletEvents = tablet.getAllEvents();
    expect(phoneEvents).toHaveLength(8);
    expect(tabletEvents).toHaveLength(8);

    const phoneIds = new Set(phoneEvents.map((e) => e.id));
    const tabletIds = new Set(tabletEvents.map((e) => e.id));
    expect(phoneIds).toEqual(tabletIds);

    // Saldo final idêntico em ambos: 10000 - 500 - 700 = 8800
    const expectedBalance = 10000 - 500 - 700;
    expect(phone.getState().accounts["acc-bidi"]?.balance).toBe(expectedBalance);
    expect(tablet.getState().accounts["acc-bidi"]?.balance).toBe(expectedBalance);

    // Total de publicações de gastos no relay foi de exatamente 7 eventos (sem republicações)
    for (let i = 1; i <= 5; i++) {
      expect(relay.getPublicationCountByEventId(`evt-phone-off-${i}`)).toBe(1);
    }
    for (let j = 1; j <= 2; j++) {
      expect(relay.getPublicationCountByEventId(`evt-tablet-off-${j}`)).toBe(1);
    }

    // Pushes subsequentes não produzem novos eventos
    const subPushPhone = await phone.push();
    const subPushTablet = await tablet.push();
    expect(subPushPhone.pushed).toBe(false);
    expect(subPushTablet.pushed).toBe(false);
  });

  it("mede latência de ponta a ponta com atraso de rede simulado e confirma que é inferior a 15 segundos", async () => {
    const clock = createSimulatedClock(1_700_000_000_000);
    const relay = new FakeMemoryRelay({ clock });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-latency",
      relay,
      groupSecret: secret,
      clock,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-latency",
      relay,
      groupSecret: secret,
      clock,
    });

    tablet.startLiveSync();

    // Celular cria gasto em t = 0
    const tCreated = clock.now();
    const evt = phone.appendLocalEvent({
      id: "evt-timed-1",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-timed-1", accountId: "acc-1", type: "expense", amount: 80, date: "2026-10-01" },
      timestamp: tCreated,
    });

    // Publicação enviada com 1.200 ms de atraso de rede até o relay
    clock.advance(1200);

    // Relay configurado com 3.300 ms de atraso de transmissão até o tablet
    relay.setDeliveryDelay(3300);

    await phone.push();
    expect(relay.getPublicationTimestamp(evt.id)).toBe(tCreated + 1200);

    await tablet.idle();

    // Tablet recebeu e registrou o timestamp de recebimento
    const tReceived = tablet.getEventReceivedAt(evt.id);
    expect(tReceived).toBe(tCreated + 4500);

    // Latência medida ponta a ponta
    const latency = tablet.getPropagationLatency(evt.id);
    expect(latency).toBe(4500);
    expect(latency!).toBeLessThanOrEqual(15_000); // FR-6 (< 15 segundos)

    tablet.stopLiveSync();
  });

  it("mesmo com rede lenta extrema (14.500 ms de latência), a propagação completa dentro do teto de 15s", async () => {
    const clock = createSimulatedClock(1_700_000_000_000);
    const relay = new FakeMemoryRelay({ clock });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-extreme",
      relay,
      groupSecret: secret,
      clock,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-extreme",
      relay,
      groupSecret: secret,
      clock,
    });

    tablet.startLiveSync();

    const tStart = clock.now();
    const evt = phone.appendLocalEvent({
      id: "evt-extreme-1",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-extreme", accountId: "acc-1", type: "expense", amount: 99, date: "2026-10-01" },
      timestamp: tStart,
    });

    // Atraso de 7.000 ms até o relay
    clock.advance(7000);

    // Atraso de 7.500 ms do relay até o tablet (total 14.500 ms)
    relay.setDeliveryDelay(7500);

    await phone.push();
    await tablet.idle();

    const latency = tablet.getPropagationLatency(evt.id);
    expect(latency).toBe(14500);
    expect(latency!).toBeLessThan(15000);
    expect(tablet.getExistingEventIds().has("evt-extreme-1")).toBe(true);

    tablet.stopLiveSync();
  });

  it("pull() multi-relay pagina ambos os relays independentemente sem interromper prematuramente", async () => {
    const clock = createSimulatedClock(1_700_000_000_000);
    const relay1 = new FakeMemoryRelay({ clock });
    const relay2 = new FakeMemoryRelay({ clock });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone1 = await createSimulatedDevice({
      deviceId: "celular-multi-1",
      relay: relay1,
      groupSecret: secret,
      clock,
    });
    const phone2 = await createSimulatedDevice({
      deviceId: "celular-multi-2",
      relay: relay2,
      groupSecret: secret,
      clock,
    });

    // Celular 1 publica eventos exclusivos no relay 1
    for (let i = 1; i <= 3; i++) {
      phone1.appendLocalEvent({
        id: `evt-r1-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-r1-${i}`, accountId: "acc-1", type: "expense", amount: 10 * i, date: "2026-10-01" },
      });
    }
    await phone1.push();

    // Celular 2 publica eventos exclusivos no relay 2
    for (let j = 1; j <= 2; j++) {
      phone2.appendLocalEvent({
        id: `evt-r2-${j}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-r2-${j}`, accountId: "acc-1", type: "income", amount: 50 * j, date: "2026-10-01" },
      });
    }
    await phone2.push();

    // Celular compartilhado publica evento em ambos os relays simultaneamente (duplicata entre relays)
    const phoneShared = await createSimulatedDevice({
      deviceId: "celular-multi-shared",
      relays: [relay1, relay2],
      groupSecret: secret,
      clock,
    });
    phoneShared.appendLocalEvent({
      id: "evt-shared-both",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-shared", accountId: "acc-1", type: "expense", amount: 99, date: "2026-10-01" },
    });
    await phoneShared.push();

    // Confirma que o evento compartilhado existe em ambos os relays
    expect(relay1.getPublicationCountByEventId("evt-shared-both")).toBe(1);
    expect(relay2.getPublicationCountByEventId("evt-shared-both")).toBe(1);

    // Tablet conectado a ambos os relays
    const tablet = await createSimulatedDevice({
      deviceId: "tablet-multi-pull",
      relays: [relay1, relay2],
      groupSecret: secret,
      clock,
    });

    // Executa pull() conectando nos 2 relays: unifica eventos exclusivos e descarta duplicata do evento compartilhado
    const pullRes = await tablet.pull();
    expect(pullRes.importedCount).toBe(6);

    // Todos os eventos foram importados sem perdas
    for (let i = 1; i <= 3; i++) {
      expect(tablet.getExistingEventIds().has(`evt-r1-${i}`)).toBe(true);
    }
    for (let j = 1; j <= 2; j++) {
      expect(tablet.getExistingEventIds().has(`evt-r2-${j}`)).toBe(true);
    }
    expect(tablet.getExistingEventIds().has("evt-shared-both")).toBe(true);

    // Evento compartilhado presente exatamente 1 vez
    const sharedEvents = tablet.getAllEvents().filter((e) => e.id === "evt-shared-both");
    expect(sharedEvents).toHaveLength(1);

    // Pull subsequente sem novos eventos é estritamente no-op
    const pull2 = await tablet.pull();
    expect(pull2.importedCount).toBe(0);
  });

  it("cenário de 3 aparelhos: A e B online transacionando em tempo real; C offline reconecta e reconcilia sem eco", async () => {
    const clock = createSimulatedClock(1_700_000_000_000);
    const relay = new FakeMemoryRelay({ clock });
    const secret = encodeGroupSecret(generateGroupSecret());

    const deviceA = await createSimulatedDevice({ deviceId: "dev-3a", relay, groupSecret: secret, clock });
    const deviceB = await createSimulatedDevice({ deviceId: "dev-3b", relay, groupSecret: secret, clock });
    const deviceC = await createSimulatedDevice({ deviceId: "dev-3c", relay, groupSecret: secret, clock });

    // Todos criam e sincronizam a conta base inicialmente
    deviceA.appendLocalEvent({
      id: "evt-acc-shared",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-shared", name: "Conta Compartilhada", type: "checking", balance: 10000 },
      timestamp: clock.now(),
    });
    await deviceA.push();
    await deviceB.pull();
    await deviceC.pull();

    // Avança relógio para garantir ordenação causal estrita pós-criação da conta
    clock.advance(1000);

    // A e B iniciam assinatura ao vivo
    deviceA.startLiveSync();
    deviceB.startLiveSync();
    deviceC.startLiveSync();

    // C fica offline (setOnline(false) fecha liveSubs de C no relay)
    deviceC.setOnline(false);

    // A lança 3 transações (3 x 100 = 300)
    for (let i = 1; i <= 3; i++) {
      clock.advance(100);
      deviceA.appendLocalEvent({
        id: `evt-a-tx-${i}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-a-${i}`, accountId: "acc-shared", type: "expense", amount: 100, date: "2026-10-01" },
      });
      await deviceA.push();
    }

    // B lança 2 transações (2 x 200 = 400)
    for (let j = 1; j <= 2; j++) {
      clock.advance(100);
      deviceB.appendLocalEvent({
        id: `evt-b-tx-${j}`,
        type: "TRANSACTION_CREATED",
        payload: { id: `tx-b-${j}`, accountId: "acc-shared", type: "expense", amount: 200, date: "2026-10-01" },
      });
      await deviceB.push();
    }

    // A e B processam em tempo real
    await deviceA.idle();
    await deviceB.idle();

    // Saldo consolidado em A e B: 10000 - 300 - 400 = 9300
    expect(deviceA.getState().accounts["acc-shared"]?.balance).toBe(9300);
    expect(deviceB.getState().accounts["acc-shared"]?.balance).toBe(9300);

    // C esteve offline e NÃO recebeu entregas enquanto desconectado
    expect(deviceC.getAllEvents()).toHaveLength(1); // Somente ACCOUNT_CREATED

    // C reconecta de forma autônoma
    const recResult = await deviceC.reconnect();
    expect(recResult.importedCount).toBe(5);

    // C atinge exatamente o mesmo saldo consolidado que A e B
    expect(deviceC.getState().accounts["acc-shared"]?.balance).toBe(9300);
    expect(deviceC.getAllEvents()).toHaveLength(6);

    // C faz push subsequente: zero publicações (supressão estrita de eco)
    const pubsBefore = relay.getTotalPublications();
    const pushC = await deviceC.push();
    expect(pushC.pushed).toBe(false);
    expect(pushC.count).toBe(0);
    expect(relay.getTotalPublications()).toBe(pubsBefore);

    deviceA.stopLiveSync();
    deviceB.stopLiveSync();
    deviceC.stopLiveSync();
  });

  it("propaga gasto via pull periódico em até 15 segundos sem depender de assinatura WebSocket", async () => {
    const clock = createSimulatedClock(1_700_000_000_000);
    const relay = new FakeMemoryRelay({ clock });
    const secret = encodeGroupSecret(generateGroupSecret());

    const phone = await createSimulatedDevice({
      deviceId: "celular-pull-only",
      relay,
      groupSecret: secret,
      clock,
    });

    const tablet = await createSimulatedDevice({
      deviceId: "tablet-pull-only",
      relay,
      groupSecret: secret,
      clock,
    });

    // Celular cria conta base e publica
    phone.appendLocalEvent({
      id: "evt-acc-pull-test",
      type: "ACCOUNT_CREATED",
      payload: { id: "acc-pull", name: "Conta Pull", type: "checking", balance: 3000 },
      timestamp: clock.now(),
    });
    await phone.push();
    await tablet.pull();

    // Celular cria um novo gasto em t0
    const t0 = clock.now();
    phone.appendLocalEvent({
      id: "evt-periodic-tx",
      type: "TRANSACTION_CREATED",
      payload: { id: "tx-pull-1", accountId: "acc-pull", type: "expense", amount: 150, date: "2026-10-01" },
      timestamp: t0,
    });
    await phone.push();

    // Tablet opera estritamente sem live sub (sem WebSocket ativo)
    // Simula o ciclo periódico de pull configurado no app (PULL_INTERVAL_MS = 8.000 ms <= 15.000 ms)
    clock.advance(8000);
    const pullResult = await tablet.pull();
    const t1 = clock.now();

    expect(pullResult.importedCount).toBe(1);
    expect(tablet.getExistingEventIds().has("evt-periodic-tx")).toBe(true);

    // Latência total do ciclo periódico é <= 15 segundos
    const totalLatency = t1 - t0;
    expect(totalLatency).toBe(8000);
    expect(totalLatency).toBeLessThanOrEqual(15_000);

    // Saldo reflete a despesa perfeitamente (3000 - 150 = 2850)
    expect(tablet.getState().accounts["acc-pull"]?.balance).toBe(2850);
  });

  describe("Story 5.8 - Publicar o marcador de reset e de restauração", () => {
    it("aparelho executa resetApp(), publica marcador no Grupo forte e pull subsequente não recria os eventos apagados", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const device = await createSimulatedDevice({
        deviceId: "dev-reset-1",
        relay,
        groupSecret: secret,
      });

      // 1. Aparelho cria conta e 2 despesas
      device.appendLocalEvent({
        id: "evt-acc-1",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-1", name: "Conta Principal", type: "checking", balance: 5000 },
      });
      device.appendLocalEvent({
        id: "evt-tx-1",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-1", accountId: "acc-1", type: "expense", amount: 100, date: "2026-10-01" },
      });
      device.appendLocalEvent({
        id: "evt-tx-2",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-2", accountId: "acc-1", type: "expense", amount: 200, date: "2026-10-02" },
      });

      // Publica no relay
      const pushRes = await device.push();
      expect(pushRes.pushed).toBe(true);
      expect(pushRes.count).toBe(3);
      expect(device.getAllEvents()).toHaveLength(3);
      expect(device.getState().accounts["acc-1"]?.balance).toBe(4700);

      // 2. Aparelho executa resetApp()
      const { markerEvent, published } = await device.resetApp();
      expect(published).toBe(true);
      expect(markerEvent.type).toBe(RESET_MARKER_EVENT_TYPE);
      expect((markerEvent.payload as ResetMarkerPayload).action).toBe("reset");
      expect((markerEvent.payload as ResetMarkerPayload).clearedEventIds).toEqual(
        expect.arrayContaining(["evt-acc-1", "evt-tx-1", "evt-tx-2"]),
      );
      expect(device.getAllEvents()).toHaveLength(0);

      // 3. Pulls subsequentes NÃO ressuscitam os eventos apagados
      const pull1 = await device.pull();
      expect(pull1.importedCount).toBe(0);
      expect(device.getAllEvents()).toHaveLength(0);

      const pull2 = await device.pull();
      expect(pull2.importedCount).toBe(0);
      expect(device.getAllEvents()).toHaveLength(0);

      // Verifica que knownMarkers retém o marcador
      expect(device.getKnownMarkers().length).toBeGreaterThanOrEqual(1);
    });

    it("aparelho executa restoreFromBackup(), publica marcador e pull subsequente não ressuscita eventos antigos descartados", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const device = await createSimulatedDevice({
        deviceId: "dev-restore-1",
        relay,
        groupSecret: secret,
      });

      // 1. Aparelho cria conta e 2 despesas e publica
      const accEvt = makeEvent({
        id: "evt-acc-orig",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-orig", name: "Conta", type: "checking", balance: 10000 },
        deviceId: "dev-restore-1",
      });
      const txOld1 = makeEvent({
        id: "evt-tx-old-1",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-old-1", accountId: "acc-orig", type: "expense", amount: 500, date: "2026-10-01" },
        deviceId: "dev-restore-1",
      });
      const txOld2 = makeEvent({
        id: "evt-tx-old-2",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-old-2", accountId: "acc-orig", type: "expense", amount: 1500, date: "2026-10-02" },
        deviceId: "dev-restore-1",
      });

      device.appendLocalEvent(accEvt);
      device.appendLocalEvent(txOld1);
      device.appendLocalEvent(txOld2);
      await device.push();
      expect(device.getAllEvents()).toHaveLength(3);

      // 2. Restaura backup que contém uma versão alternativa (accEvt e txBackup, descartando txOld1 e txOld2)
      const txBackup = makeEvent({
        id: "evt-tx-backup",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-bkp", accountId: "acc-orig", type: "expense", amount: 300, date: "2026-10-01" },
        deviceId: "dev-restore-1",
      });

      const { markerEvent, published } = await device.restoreFromBackup([accEvt, txBackup]);
      expect(published).toBe(true);
      expect(markerEvent.type).toBe(RESET_MARKER_EVENT_TYPE);
      expect((markerEvent.payload as ResetMarkerPayload).action).toBe("restore");
      expect((markerEvent.payload as ResetMarkerPayload).clearedEventIds).toEqual(
        expect.arrayContaining(["evt-tx-old-1", "evt-tx-old-2"]),
      );
      expect((markerEvent.payload as ResetMarkerPayload).clearedEventIds).not.toContain("evt-acc-orig");

      // Eventos locais contêm apenas accEvt e txBackup
      expect(device.getAllEvents().map((e) => e.id)).toEqual(["evt-acc-orig", "evt-tx-backup"]);

      // 3. Pull subsequente: não ressuscita txOld1 nem txOld2
      const pullRes = await device.pull();
      expect(pullRes.importedCount).toBe(0);

      const eventIdsAfter = device.getAllEvents().map((e) => e.id);
      expect(eventIdsAfter).not.toContain("evt-tx-old-1");
      expect(eventIdsAfter).not.toContain("evt-tx-old-2");
      expect(eventIdsAfter).toContain("evt-acc-orig");
      expect(eventIdsAfter).toContain("evt-tx-backup");

      // Saldo reflete os dados do backup: 10000 - 300 = 9700
      expect(device.getState().accounts["acc-orig"]?.balance).toBe(9700);
    });

    it("marcador originário do Grupo antigo (isStrong: false) é rejeitado e não apaga nem suprime dados", async () => {
      // 1. Teste funcional puro via filterEventsAgainstMarkers
      const evt1 = makeEvent({ id: "evt-leg-1", deviceId: "dev-leg-1" });
      const evt2 = makeEvent({ id: "evt-leg-2", deviceId: "dev-leg-1" });

      const legacyMarker = createResetMarkerEvent({
        action: "reset",
        deviceId: "dev-leg-1",
        clearedEventIds: ["evt-leg-1", "evt-leg-2"],
        timestamp: Date.now(),
      });

      // Com isStrong: false, o marcador é rejeitado e todos os eventos são mantidos
      const filteredLegacy = filterEventsAgainstMarkers({
        incomingEvents: [evt1, evt2],
        markers: [legacyMarker],
        isStrong: false,
      });
      expect(filteredLegacy).toHaveLength(2);
      expect(filteredLegacy.map((e) => e.id)).toEqual(["evt-leg-1", "evt-leg-2"]);

      // Com isStrong: true, o mesmo marcador é aceito e suprime os eventos
      const filteredStrong = filterEventsAgainstMarkers({
        incomingEvents: [evt1, evt2],
        markers: [legacyMarker],
        isStrong: true,
      });
      expect(filteredStrong).toHaveLength(0);

      // 2. Teste comportamental em SimulatedSyncDevice com canal legado
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());
      const parsedSecret = parseGroupSecret(secret);
      if (!parsedSecret.ok) {
        throw new Error("Falha ao analisar o segredo de grupo");
      }
      const strongKeys = deriveStrongGroupKeys(parsedSecret.secret);

      const deviceLegacy = await createSimulatedDevice({
        deviceId: "dev-legacy-node",
        relay,
        keys: {
          privateKey: strongKeys.nostrPrivateKey,
          publicKey: strongKeys.nostrPublicKey,
          encryptionKey: strongKeys.encryptionKey,
          isStrong: false, // Canal legado
        },
      });

      deviceLegacy.appendLocalEvent(evt1);
      deviceLegacy.appendLocalEvent(evt2);

      // Tentar registrar marcador legado no aparelho
      deviceLegacy.registerMarker(legacyMarker);

      // Criar um nó par que publica um evento remoto
      const peerNode = await createSimulatedDevice({
        deviceId: "dev-legacy-peer",
        relay,
        keys: {
          privateKey: strongKeys.nostrPrivateKey,
          publicKey: strongKeys.nostrPublicKey,
          encryptionKey: strongKeys.encryptionKey,
          isStrong: false,
        },
      });
      peerNode.appendLocalEvent({
        id: "evt-leg-remote",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-rem", accountId: "acc-1", type: "income", amount: 1000, date: "2026-10-01" },
      });
      await peerNode.push();

      // Pull no canal legado (isStrong: false) exercita pull() com isStrong: false e
      // filterEventsAgainstMarkers({ isStrong: false }), importando o evento sem supressão
      const pullResult = await deviceLegacy.pull();
      expect(pullResult.importedCount).toBe(1);

      // Pull no canal legado (isStrong: false) jamais suprime os dados locais nem remotos
      const events = deviceLegacy.getAllEvents();
      expect(events).toHaveLength(3);
      expect(events.map((e) => e.id)).toEqual(["evt-leg-1", "evt-leg-2", "evt-leg-remote"]);
    });

    it("concorrência offline: Aparelho B offline cria despesas enquanto Aparelho A reseta; ao sincronizarem, as despesas de B são preservadas e integradas em A", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-a-conc",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-b-conc",
        relay,
        groupSecret: secret,
      });

      // 1. Estado inicial compartilhado: Conta criada com R$ 10.000
      const accShared = makeEvent({
        id: "evt-acc-shared",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-shared", name: "Conta Conjunta", type: "checking", balance: 10000 },
        deviceId: "dev-a-conc",
      });
      deviceA.appendLocalEvent(accShared);
      await deviceA.push();
      await deviceB.pull();

      expect(deviceA.getState().accounts["acc-shared"]?.balance).toBe(10000);
      expect(deviceB.getState().accounts["acc-shared"]?.balance).toBe(10000);

      // 2. Aparelho B fica offline
      deviceB.setOnline(false);

      // 3. Enquanto B está offline:
      // - B cria 2 despesas offline (R$ 200 e R$ 300)
      deviceB.appendLocalEvent({
        id: "evt-tx-b-1",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-b-1", accountId: "acc-shared", type: "expense", amount: 200, date: "2026-10-01" },
        timestamp: 1_700_000_000_100,
      });
      deviceB.appendLocalEvent({
        id: "evt-tx-b-2",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-b-2", accountId: "acc-shared", type: "expense", amount: 300, date: "2026-10-02" },
        timestamp: 1_700_000_000_200,
      });

      // - A cria uma despesa de R$ 500 e publica
      deviceA.appendLocalEvent({
        id: "evt-tx-a-old",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-a-old", accountId: "acc-shared", type: "expense", amount: 500, date: "2026-10-01" },
        timestamp: 1_700_000_000_150,
      });
      await deviceA.push();

      // - A executa resetApp() e limpa seus dados locais
      const { markerEvent, published } = await deviceA.resetApp();
      expect(published).toBe(true);
      expect(deviceA.getAllEvents()).toHaveLength(0);
      expect((markerEvent.payload as ResetMarkerPayload).clearedEventIds).toEqual(
        expect.arrayContaining(["evt-acc-shared", "evt-tx-a-old"]),
      );

      // 4. B reconecta e publica suas despesas offline no relay
      const recResult = await deviceB.reconnect();
      expect(recResult.pushed).toBe(true);
      expect(recResult.pushCount).toBe(2);

      // 5. A faz pull subsequente:
      // - NÃO ressuscita evt-acc-shared nem evt-tx-a-old (suprimidos pelo marcador de reset)
      // - MAS importa integralmente evt-tx-b-1 e evt-tx-b-2 gerados por B concorrentemente offline!
      const pullA = await deviceA.pull();
      expect(pullA.importedCount).toBe(2);

      const aEventIds = deviceA.getAllEvents().map((e) => e.id);
      expect(aEventIds).not.toContain("evt-acc-shared");
      expect(aEventIds).not.toContain("evt-tx-a-old");
      expect(aEventIds).toContain("evt-tx-b-1");
      expect(aEventIds).toContain("evt-tx-b-2");
      expect(deviceA.getAllEvents()).toHaveLength(2);
    });

    it("eventos no relay Nostr permanecem íntegros fisicamente após a publicação do marcador", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const device = await createSimulatedDevice({
        deviceId: "dev-retention-test",
        relay,
        groupSecret: secret,
      });

      // 1. Cria 3 eventos e publica no relay
      device.appendLocalEvent({
        id: "evt-ret-1",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-ret", name: "Conta Retenção", type: "checking", balance: 8000 },
      });
      device.appendLocalEvent({
        id: "evt-ret-2",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-ret-1", accountId: "acc-ret", type: "expense", amount: 150, date: "2026-10-01" },
      });
      device.appendLocalEvent({
        id: "evt-ret-3",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-ret-2", accountId: "acc-ret", type: "expense", amount: 250, date: "2026-10-02" },
      });
      await device.push();

      const publicationsBeforeReset = relay.getTotalPublications();
      const relayEventsBeforeReset = relay.getEvents().length;
      expect(publicationsBeforeReset).toBeGreaterThanOrEqual(1);
      expect(relayEventsBeforeReset).toBeGreaterThanOrEqual(1);

      // 2. Aparelho executa resetApp() e publica marcador
      const { published } = await device.resetApp();
      expect(published).toBe(true);

      // 3. Verifica que os eventos no relay Nostr NÃO foram apagados fisicamente
      const publicationsAfterReset = relay.getTotalPublications();
      const relayEventsAfterReset = relay.getEvents().length;

      // Houve uma nova publicação (o próprio marcador), mas zero deleções
      expect(publicationsAfterReset).toBe(publicationsBeforeReset + 1);
      expect(relayEventsAfterReset).toBe(relayEventsBeforeReset + 1);

      // Consulta ao relay por kind 30333 ainda retorna todos os eventos publicados
      const queried = relay.query({ kinds: [30333], authors: [device.keys.publicKey] });
      expect(queried.length).toBe(relayEventsAfterReset);

      // O marcador está presente no relay
      const hasMarkerEvent = queried.some((ne) => ne.tags.some(([t, v]) => t === "marker" && v === "reset"));
      expect(hasMarkerEvent).toBe(true);

      // Os lotes originais contendo os eventos continuam íntegros nos relays descentralizados
      const hasOriginalBatches = queried.some((ne) => !ne.tags.some(([t]) => t === "marker"));
      expect(hasOriginalBatches).toBe(true);
    });

    it("subscrição ao vivo: Aparelho B com startLiveSync() recebe marcador de Aparelho A em tempo real, registra em knownMarkers e não polui getAllEvents()", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-live-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-live-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: async () => true,
      });

      // 1. Estado inicial compartilhado
      deviceA.appendLocalEvent({
        id: "evt-acc-live",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-live", name: "Conta Live", type: "checking", balance: 5000 },
      });
      deviceA.appendLocalEvent({
        id: "evt-tx-live",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-live-1", accountId: "acc-live", type: "expense", amount: 200, date: "2026-10-01" },
      });
      await deviceA.push();
      await deviceB.pull();

      expect(deviceA.getAllEvents()).toHaveLength(2);
      expect(deviceB.getAllEvents()).toHaveLength(2);

      // 2. Aparelho B ativa subscrição ao vivo
      const liveSub = deviceB.startLiveSync();

      // 3. Aparelho A executa resetApp() e publica o marcador no Grupo forte
      const { markerEvent, published } = await deviceA.resetApp();
      expect(published).toBe(true);
      expect(markerEvent.type).toBe(RESET_MARKER_EVENT_TYPE);

      // 4. Aparelho B processa a chegada do evento ao vivo
      await deviceB.idle();

      // Verifica que B registrou o marcador em knownMarkers
      expect(deviceB.getKnownMarkers().length).toBeGreaterThanOrEqual(1);
      const bMarker = deviceB.getKnownMarkers().find((m) => m.action === "reset" && m.deviceId === "dev-live-a");
      expect(bMarker).toBeDefined();
      expect(bMarker?.clearedEventIds).toEqual(expect.arrayContaining(["evt-acc-live", "evt-tx-live"]));

      // Verifica que getAllEvents() de B NÃO foi poluído com RESET_MARKER_EVENT_TYPE
      const bEventTypes = deviceB.getAllEvents().map((e) => e.type);
      expect(bEventTypes).not.toContain(RESET_MARKER_EVENT_TYPE);

      // Verifica que a Quarentena de B não contém erros de tipo desconhecido
      const replay = deviceB.getReplayResult();
      const unknownTypes = replay.quarantine.filter((q) => q.type === RESET_MARKER_EVENT_TYPE);
      expect(unknownTypes).toHaveLength(0);

      liveSub.close();
      deviceB.stopLiveSync();
    });
  });

  describe("Story 5.9 - Pedir confirmação antes de apagar por causa de um marcador", () => {
    it("confirmação do usuário: Aparelho B aceita marcador de Aparelho A -> dados locais de B são apagados, marcador registrado e pull subsequente não ressuscita dados antigos", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const promptMock = vi.fn(async (marker: ResetMarkerPayload) => true);

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-confirm-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-confirm-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      // 1. Estado compartilhado: Conta criada e despesa registrada
      deviceA.appendLocalEvent({
        id: "evt-acc-conf",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-conf", name: "Conta Confirmação", type: "checking", balance: 5000 },
      });
      deviceA.appendLocalEvent({
        id: "evt-tx-conf",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-conf", accountId: "acc-conf", type: "expense", amount: 150, date: "2026-10-01" },
      });
      await deviceA.push();
      await deviceB.pull();

      expect(deviceA.getAllEvents()).toHaveLength(2);
      expect(deviceB.getAllEvents()).toHaveLength(2);

      // 2. Aparelho A executa resetApp() e publica marcador de reset no Grupo forte
      const { markerEvent, published } = await deviceA.resetApp();
      expect(published).toBe(true);
      expect(markerEvent.type).toBe(RESET_MARKER_EVENT_TYPE);

      // 3. Aparelho B realiza pull(): intercepta o marcador remoto inédito, aciona o prompt de confirmação
      const pullResult = await deviceB.pull();
      expect(pullResult.importedCount).toBe(0);

      // Verifica que o prompt de confirmação foi acionado com o payload do marcador de A
      expect(promptMock).toHaveBeenCalledTimes(1);
      const passedPayload = promptMock.mock.calls[0][0];
      expect(passedPayload.action).toBe("reset");
      expect(passedPayload.deviceId).toBe("dev-confirm-a");

      // Como o usuário respondeu true (confirmou):
      // - Os dados locais de B foram apagados
      expect(deviceB.getAllEvents()).toHaveLength(0);

      // - O marcador foi registrado como aceito em knownMarkers
      expect(deviceB.getKnownMarkers().some((m) => m.deviceId === "dev-confirm-a" && m.action === "reset")).toBe(true);

      // - O marcador foi registrado em handledRemoteMarkerIds
      expect(deviceB.getHandledRemoteMarkerIds().has(markerEvent.id)).toBe(true);

      // 4. Pull subsequente de B não ressuscita os dados apagados
      await deviceB.pull();
      expect(deviceB.getAllEvents()).toHaveLength(0);
      expect(promptMock).toHaveBeenCalledTimes(1); // Não pergunta de novo
    });

    it("recusa do usuário: Aparelho B recusa marcador de Aparelho A -> nada é apagado, marcador registrado em handledRemoteMarkerIds e pulls seguintes não perguntam de novo", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      let promptCount = 0;
      const promptMock = vi.fn(async (marker: ResetMarkerPayload) => {
        promptCount++;
        return false; // Usuário recusa ("Manter dados")
      });

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-reject-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-reject-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      // 1. Estado compartilhado inicial
      deviceA.appendLocalEvent({
        id: "evt-acc-rej",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-rej", name: "Conta Preservada", type: "checking", balance: 10000 },
      });
      deviceA.appendLocalEvent({
        id: "evt-tx-rej",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-rej", accountId: "acc-rej", type: "income", amount: 2000, date: "2026-10-01" },
      });
      await deviceA.push();
      await deviceB.pull();

      expect(deviceB.getAllEvents()).toHaveLength(2);

      // 2. Aparelho A executa resetApp() e publica marcador
      const { markerEvent, published } = await deviceA.resetApp();
      expect(published).toBe(true);

      // 3. Aparelho B realiza pull(): recebe o marcador e o usuário recusa
      await deviceB.pull();

      expect(promptCount).toBe(1);
      expect(promptMock).toHaveBeenCalledTimes(1);

      // Como o usuário recusou:
      // - Nenhum dado de B é apagado (preservados integralmente)
      expect(deviceB.getAllEvents()).toHaveLength(2);
      expect(deviceB.getAllEvents().map((e) => e.id)).toEqual(["evt-acc-rej", "evt-tx-rej"]);
      expect(deviceB.getState().accounts["acc-rej"]?.balance).toBe(12000);

      // - Marcador registrado como tratado/dispensado em handledRemoteMarkerIds
      expect(deviceB.getHandledRemoteMarkerIds().has(markerEvent.id)).toBe(true);

      // - Marcador NÃO foi aceito em knownMarkers
      expect(deviceB.getKnownMarkers().some((m) => m.deviceId === "dev-reject-a" && m.action === "reset")).toBe(false);

      // 4. Pull subsequente: não pergunta de novo e preserva dados
      await deviceB.pull();
      expect(promptCount).toBe(1); // Não perguntou de novo
      expect(deviceB.getAllEvents()).toHaveLength(2);
    });

    it("segundo marcador diferente: Aparelho B que recusou marcador 1 é consultado novamente ao receber marcador 2", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const promptedActions: string[] = [];
      const promptMock = vi.fn(async (marker: ResetMarkerPayload) => {
        promptedActions.push(marker.action);
        // Recusa o 1º marcador (reset), aceita o 2º (restore)
        return promptedActions.length > 1;
      });

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-two-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-two-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      // 1. Estado compartilhado inicial
      deviceA.appendLocalEvent({
        id: "evt-acc-two",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-two", name: "Conta Dupla", type: "checking", balance: 3000 },
      });
      await deviceA.push();
      await deviceB.pull();
      expect(deviceB.getAllEvents()).toHaveLength(1);

      // 2. Aparelho A emite marcador 1 (reset)
      await deviceA.resetApp();

      // 3. Aparelho B faz pull(): prompt é chamado, B recusa
      await deviceB.pull();
      expect(promptMock).toHaveBeenCalledTimes(1);
      expect(promptedActions).toEqual(["reset"]);
      expect(deviceB.getAllEvents()).toHaveLength(1); // Preservado

      // 4. Aparelho A cria novo evento evt-tx-new e restaura backup substituindo-o, emitindo marcador 2 (restore)
      deviceA.appendLocalEvent({
        id: "evt-tx-new",
        type: "TRANSACTION_CREATED",
        payload: { id: "tx-new", accountId: "acc-two", type: "expense", amount: 100, date: "2026-10-01" },
      });
      const backupEvent = makeEvent({
        id: "evt-backup-1",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-backup", name: "Conta Backup", type: "checking", balance: 8000 },
        deviceId: "dev-two-a",
      });
      await deviceA.restoreFromBackup([backupEvent]);
      await deviceA.push();

      // 5. Aparelho B faz pull(): detecta marcador 2 (identificador diferente), pergunta novamente!
      await deviceB.pull();
      expect(promptMock).toHaveBeenCalledTimes(2);
      expect(promptedActions).toEqual(["reset", "restore"]);

      // Desta vez o usuário aceitou o marcador 2:
      // Marcador 2 registrado e evento do backup importado com sucesso
      expect(deviceB.getKnownMarkers().some((m) => m.action === "restore")).toBe(true);
      expect(deviceB.getAllEvents().map((e) => e.id)).toContain("evt-backup-1");
      expect(deviceB.getAllEvents().map((e) => e.id)).not.toContain("evt-tx-new");
    });

    it("marcador pendente de resposta do usuário: nenhum dado é apagado enquanto a Promise de confirmação não for resolvida", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      let resolvePrompt!: (val: boolean) => void;
      const promptPromise = new Promise<boolean>((resolve) => {
        resolvePrompt = resolve;
      });

      const promptMock = vi.fn(async () => promptPromise);

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-pending-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-pending-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      // 1. Estado inicial em B
      deviceB.appendLocalEvent({
        id: "evt-pending-local",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-pend", name: "Conta Pendente", type: "checking", balance: 500 },
      });
      expect(deviceB.getAllEvents()).toHaveLength(1);

      // 2. Aparelho A reseta e publica marcador
      await deviceA.resetApp();

      // 3. Aparelho B inicia pull (o diálogo fica aberto aguardando resposta)
      const pullPromise = deviceB.pull();

      // Aguarda microtasks avançarem até o prompt ser chamado
      await new Promise((r) => setTimeout(r, 20));
      expect(promptMock).toHaveBeenCalledTimes(1);

      // Enquanto a Promise de confirmação NÃO for resolvida:
      // O aparelho NÃO apaga nada sem a resposta do usuário!
      expect(deviceB.getAllEvents()).toHaveLength(1);
      expect(deviceB.getAllEvents()[0].id).toBe("evt-pending-local");

      // 4. Usuário finalmente clica em "Apagar dados" (resolve com true)
      resolvePrompt(true);
      await pullPromise;

      // Agora que a Promise foi resolvida como positiva, os dados são apagados
      expect(deviceB.getAllEvents()).toHaveLength(0);
    });

    it("marcador do próprio aparelho: Aparelho A que resetou recebe seu próprio marcador no pull e NUNCA abre diálogo", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const promptMock = vi.fn(async () => true);

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-own-a",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      deviceA.appendLocalEvent({
        id: "evt-own-1",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-own", name: "Conta Própria", type: "checking", balance: 1000 },
      });
      await deviceA.push();

      // Aparelho A reseta e publica marcador
      const { markerEvent } = await deviceA.resetApp();
      expect(markerEvent.deviceId).toBe("dev-own-a");

      // Aparelho A faz pull e encontra seu próprio marcador no relay
      await deviceA.pull();

      // O prompt de confirmação de exclusão NUNCA é chamado para marcadores do próprio aparelho
      expect(promptMock).not.toHaveBeenCalled();
    });

    it("marcador do Grupo legado (isStrong: false): rejeitado de imediato, nenhum diálogo exibido e nenhum dado apagado", async () => {
      const relay = new FakeMemoryRelay();
      const promptMock = vi.fn(async () => true);

      const secret = generateGroupSecret();
      const strongKeys = deriveStrongGroupKeys(secret);
      const legacyKeys: NostrSyncKeys = {
        privateKey: strongKeys.nostrPrivateKey,
        publicKey: strongKeys.nostrPublicKey,
        encryptionKey: strongKeys.encryptionKey,
        isStrong: false,
      };

      const deviceLegacy = await createSimulatedDevice({
        deviceId: "dev-leg-prompt",
        relay,
        keys: legacyKeys,
        groupSecret: "domus-legacy-code",
        promptResetConfirmation: promptMock,
      });

      deviceLegacy.appendLocalEvent({
        id: "evt-leg-save",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-leg", name: "Conta Legada Salva", type: "checking", balance: 4000 },
      });

      // Cria um evento marcador simulado
      const fakeMarker = createResetMarkerEvent({
        action: "reset",
        deviceId: "dev-leg-other",
        clearedEventIds: ["evt-leg-save"],
      });

      // Publica no relay como se viesse do canal legado
      const batchPayload = JSON.stringify([fakeMarker]);
      const nowSec = Math.floor(Date.now() / 1000);
      const nostrEvent = {
        id: "leg-marker-nostr-id",
        kind: 30333,
        created_at: nowSec,
        tags: [["d", "leg-batch"], ["marker", "reset"]],
        content: batchPayload,
        pubkey: legacyKeys.publicKey,
        sig: "fake-sig",
      };
      relay.publish(nostrEvent as any);

      // Device Legacy faz pull
      await deviceLegacy.pull();

      // Diálogo de confirmação NUNCA é aberto para canal legado
      expect(promptMock).not.toHaveBeenCalled();

      // Nenhum dado apagado
      expect(deviceLegacy.getAllEvents()).toHaveLength(1);
      expect(deviceLegacy.getAllEvents()[0].id).toBe("evt-leg-save");
    });

    it("subscrição ao vivo: Aparelho B com startLiveSync() recebe marcador remoto em tempo real e pede confirmação antes de apagar", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const promptMock = vi.fn(async (marker: ResetMarkerPayload) => true);

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-live-conf-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-live-conf-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      // 1. Estado inicial sincronizado
      deviceA.appendLocalEvent({
        id: "evt-acc-live-c",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-live-c", name: "Conta Ao Vivo", type: "checking", balance: 7500 },
      });
      await deviceA.push();
      await deviceB.pull();
      expect(deviceB.getAllEvents()).toHaveLength(1);

      // 2. Aparelho B ativa live sync
      const liveSub = deviceB.startLiveSync();

      // 3. Aparelho A reseta e publica marcador
      await deviceA.resetApp();

      // 4. Aparelho B processa o evento recebido ao vivo
      await deviceB.idle();

      // Verifica que prompt foi acionado e dados foram apagados após confirmação
      expect(promptMock).toHaveBeenCalledTimes(1);
      expect(deviceB.getAllEvents()).toHaveLength(0);
      expect(deviceB.getKnownMarkers().some((m) => m.deviceId === "dev-live-conf-a")).toBe(true);

      liveSub.close();
      deviceB.stopLiveSync();
    });

    it("subscrição ao vivo com recusa: Aparelho B com startLiveSync() recusa marcador e preserva dados locais", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const promptMock = vi.fn(async (marker: ResetMarkerPayload) => false);

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-live-rej-a",
        relay,
        groupSecret: secret,
      });

      const deviceB = await createSimulatedDevice({
        deviceId: "dev-live-rej-b",
        relay,
        groupSecret: secret,
        promptResetConfirmation: promptMock,
      });

      // 1. Estado inicial sincronizado
      deviceA.appendLocalEvent({
        id: "evt-acc-live-r",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-live-r", name: "Conta Preservada Live", type: "checking", balance: 9000 },
      });
      await deviceA.push();
      await deviceB.pull();
      expect(deviceB.getAllEvents()).toHaveLength(1);

      // 2. Aparelho B ativa live sync
      const liveSub = deviceB.startLiveSync();

      // 3. Aparelho A reseta e publica marcador
      await deviceA.resetApp();

      // 4. Aparelho B processa o evento recebido ao vivo
      await deviceB.idle();

      // Verifica que prompt foi acionado e dados foram preservados após recusa
      expect(promptMock).toHaveBeenCalledTimes(1);
      expect(deviceB.getAllEvents()).toHaveLength(1);
      expect(deviceB.getHandledRemoteMarkerIds().size).toBeGreaterThanOrEqual(1);
      expect(deviceB.getKnownMarkers().some((m) => m.deviceId === "dev-live-rej-a")).toBe(false);

      liveSub.close();
      deviceB.stopLiveSync();
    });

    it("sem manipulador confirmatório: o aparelho não apaga dados nem adiciona a knownMarkers", async () => {
      const relay = new FakeMemoryRelay();
      const secret = encodeGroupSecret(generateGroupSecret());

      const deviceA = await createSimulatedDevice({
        deviceId: "dev-no-handler-a",
        relay,
        groupSecret: secret,
      });

      // Dispositivo B sem promptResetConfirmation
      const deviceB = await createSimulatedDevice({
        deviceId: "dev-no-handler-b",
        relay,
        groupSecret: secret,
      });

      deviceB.appendLocalEvent({
        id: "evt-no-h",
        type: "ACCOUNT_CREATED",
        payload: { id: "acc-no-h", name: "Conta", type: "checking", balance: 100 },
      });

      // A emite reset
      await deviceA.resetApp();

      // B faz pull
      await deviceB.pull();

      // Sem resposta/confirmação, nenhum dado apagado e NÃO entra em knownMarkers
      expect(deviceB.getAllEvents()).toHaveLength(1);
      expect(deviceB.getKnownMarkers()).toHaveLength(0);
    });
  });
});
