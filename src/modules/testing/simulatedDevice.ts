/**
 * Story 5.1: Simulador de nó de sincronização (SimulatedSyncDevice).
 *
 * Combina eventStore em memória, createSyncGroupTracker com armazenamento em memória,
 * chaves derivadas do Grupo forte (HKDF) e operações desacopladas de push, pull e assinatura ao vivo.
 *
 * Módulo puramente em memória, rápido e determinístico (< 2s no Vitest), sem React ou React Native.
 */

import { SQLiteEventStore, type SyncEvent } from "@packages/storage/src/eventStore";
import { createMemoryAdapter } from "@packages/storage/src/memoryAdapter";
import { finalizeEvent, type UnsignedEvent } from "nostr-tools/pure";
import {
  createSyncGroupTracker,
  type SyncGroupTracker,
  type SyncGroupTrackingStorage,
} from "../syncGroupTracking";
import { parseSyncPayloadDetailed, advanceRelayCursor } from "../syncPayload";
import {
  encryptStrongPayload,
  decryptStrongPayload,
} from "../strongGroup/eventCipher";
import {
  deriveStrongGroupKeys,
  generateGroupSecret,
  encodeGroupSecret,
  parseGroupSecret,
} from "../strongGroup/groupSecret";
import { partitionStrongBatches, computeStrongBatchId, type NostrSyncKeys } from "../nostrSync";
import {
  shouldPublishGroupEvents,
  processIncomingEvents,
  processPushResult,
  resolvePullSyncOptions,
} from "../syncDecisions";
import { replayAllEvents, type ReplayResult } from "@/src/context/replay";
import type { AppState } from "@packages/domain/src/state";
import type { FakeMemoryRelay, RelaySubscription, NostrEvent, NostrFilter } from "./fakeMemoryRelay";

export class MemoryTrackingStorage implements SyncGroupTrackingStorage {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

export interface DevicePushResult {
  pushed: boolean;
  count: number;
  reason?: string;
  confirmedEventIds: string[];
  failedEventIds: string[];
}

export interface CreateSimulatedDeviceOptions {
  deviceId: string;
  relay: FakeMemoryRelay;
  groupSecret?: string;
  keys?: NostrSyncKeys;
  initialEvents?: readonly SyncEvent[];
  cursor?: number | null;
}

export class SimulatedSyncDevice {
  readonly deviceId: string;
  readonly relay: FakeMemoryRelay;
  readonly keys: NostrSyncKeys;
  readonly groupCode: string;
  readonly eventStore: SQLiteEventStore;
  readonly tracker: SyncGroupTracker;

  private cursor: number | null = null;
  private seq = 0;
  private lastPushHash = "empty";
  private isOnline = true;
  private liveSub: RelaySubscription | null = null;
  private lastCreatedAt = 0;
  private importTail: Promise<void> = Promise.resolve();
  private heldImports = 0;
  private liveQueue: { event: SyncEvent; createdAt: number }[] = [];
  private drainScheduled = false;

  constructor(params: {
    deviceId: string;
    relay: FakeMemoryRelay;
    keys: NostrSyncKeys;
    groupCode: string;
    eventStore: SQLiteEventStore;
    tracker: SyncGroupTracker;
    cursor?: number | null;
  }) {
    this.deviceId = params.deviceId;
    this.relay = params.relay;
    this.keys = params.keys;
    this.groupCode = params.groupCode;
    this.eventStore = params.eventStore;
    this.tracker = params.tracker;
    this.cursor = params.cursor ?? null;
  }

  /**
   * Adiciona um evento local no eventStore deste aparelho com identificador determinístico.
   */
  appendLocalEvent(params: {
    id?: string;
    type: string;
    payload: unknown;
    timestamp?: number;
    signature?: string;
  }): SyncEvent {
    this.seq++;
    const id = params.id ?? `${this.deviceId}-evt-${this.seq}`;
    const timestamp = params.timestamp ?? 1_700_000_000_000 + this.seq * 1_000;
    const signature = params.signature ?? `sig-${id}`;

    const event: SyncEvent = {
      id,
      type: params.type,
      payload: params.payload,
      timestamp,
      deviceId: this.deviceId,
      signature,
    };

    this.eventStore.appendEvent(event);
    return event;
  }

  /**
   * Story 5.6: Simula a restauração de backup contendo eventos de um deviceId antigo,
   * inserindo-os no banco de dados local sem registrá-los no tracker como recebidos
   * nem publicados, tornando-os elegíveis para envio ao grupo caso o grupo ainda não os possua.
   */
  restoreBackupEvents(events: SyncEvent[]): void {
    for (const evt of events) {
      this.eventStore.appendEvent(evt);
    }
  }

  /**
   * Retorna todos os eventos armazenados localmente.
   */
  getAllEvents(): SyncEvent[] {
    return this.eventStore.getAllEvents();
  }

  /**
   * Retorna o conjunto de IDs de todos os eventos locais.
   */
  getExistingEventIds(): Set<string> {
    return new Set(this.getAllEvents().map((e) => e.id));
  }

  /**
   * Publica os eventos locais deste aparelho para o relay Nostr em memória.
   * Utiliza shouldPublishGroupEvents para garantir idempotência e supressão de loops.
   * Atualiza o tracker apenas para lotes confirmados e retém o hash se houver falha de lote.
   */
  async push(options?: { force?: boolean }): Promise<DevicePushResult> {
    if (!this.isOnline) {
      return { pushed: false, count: 0, reason: "offline", confirmedEventIds: [], failedEventIds: [] };
    }

    const decision = shouldPublishGroupEvents({
      events: this.getAllEvents(),
      groupId: this.keys.publicKey,
      isStrong: true,
      tracker: this.tracker,
      lastHash: this.lastPushHash,
      force: options?.force,
      deviceId: this.deviceId,
    });

    if (!decision.shouldPublish) {
      return { pushed: false, count: 0, reason: decision.reason, confirmedEventIds: [], failedEventIds: [] };
    }

    const eventsToPublish = decision.pendingEvents;
    const batches = partitionStrongBatches(eventsToPublish);
    const confirmedEventIds: string[] = [];
    const failedEventIds: string[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchId = computeStrongBatchId(this.deviceId, batch);
      const batchEventIds = batch.map((e) => e.id);

      const batchPayload = JSON.stringify(
        batch.map((e) => ({
          id: e.id,
          type: e.type,
          payload: e.payload,
          timestamp: e.timestamp,
          deviceId: e.deviceId,
          signature: e.signature || "",
        })),
      );

      const encrypted = encryptStrongPayload(batchPayload, {
        encryptionKey: this.keys.encryptionKey,
        nostrPublicKey: this.keys.publicKey,
      });

      const nowSec = Math.floor(Date.now() / 1000);
      this.lastCreatedAt = Math.max(nowSec, this.lastCreatedAt + 1, (this.cursor ?? 0) + 1);

      const nostrEvent = {
        kind: 30333,
        created_at: this.lastCreatedAt,
        tags: [
          ["d", batchId],
          ["t", "domus-sync"],
          ["device", this.deviceId],
          ["batch", String(batch.length)],
        ],
        content: encrypted,
        pubkey: this.keys.publicKey,
      } as UnsignedEvent;

      const signed = finalizeEvent(nostrEvent, this.keys.privateKey);
      const pubRes = this.relay.publish(signed, batchEventIds);
      if (pubRes.ok) {
        confirmedEventIds.push(...batchEventIds);
      } else {
        failedEventIds.push(...batchEventIds);
      }
    }

    const outcome = processPushResult({
      result: {
        published: confirmedEventIds.length,
        confirmedEventIds,
        failedEventIds,
        rejectedEventIds: [],
        batches: [],
      },
      myEvents: eventsToPublish,
      currentHash: decision.hash,
    });

    if (outcome.eventsToMark.length > 0) {
      await this.tracker.markPublished(
        outcome.eventsToMark,
        this.keys.publicKey,
      );
    }

    if (outcome.shouldAdvanceHash) {
      this.lastPushHash = decision.hash;
    }

    if (outcome.shouldThrow) {
      return {
        pushed: confirmedEventIds.length > 0,
        count: confirmedEventIds.length,
        reason: confirmedEventIds.length > 0 ? "partial-failure" : "relay-failed",
        confirmedEventIds,
        failedEventIds,
      };
    }

    return {
      pushed: true,
      count: confirmedEventIds.length,
      confirmedEventIds,
      failedEventIds,
    };
  }

  /** Retorna o cursor atual do relay (maior created_at de evento válido recebido) */
  getCursor(): number | null {
    return this.cursor;
  }

  /** Permite ajustar o cursor diretamente para cenários de teste */
  setCursor(cursor: number | null): void {
    this.cursor = cursor;
  }

  /**
   * Executa uma operação sob o mutex de importação (serializado via Promise tail).
   */
  withImportLock<T>(fn: () => Promise<T>): Promise<T> {
    this.heldImports++;
    const run = this.importTail.then(fn);
    this.importTail = run.then(
      () => {},
      () => {},
    );
    return run.finally(() => {
      this.heldImports--;
    });
  }

  /**
   * Retorna true enquanto houver importação em curso ou na fila do mutex.
   */
  isImporting(): boolean {
    return this.heldImports > 0;
  }

  /**
   * Enfileira evento recebido ao vivo para importação ordenada sob o mutex.
   */
  enqueueLive(event: SyncEvent, createdAt: number): void {
    this.liveQueue.push({ event, createdAt });
    this.scheduleDrain();
  }

  /**
   * Enfileira rajada de eventos recebidos ao vivo em lote sob o mutex.
   */
  enqueueLiveBatch(events: SyncEvent[], createdAt: number): void {
    if (events.length === 0) return;
    for (const event of events) {
      this.liveQueue.push({ event, createdAt });
    }
    this.scheduleDrain();
  }

  /**
   * Resolve quando a fila e o mutex de importação estiverem ociosos (para testes).
   */
  async idle(): Promise<void> {
    while (this.heldImports > 0 || this.drainScheduled) {
      await this.importTail;
      await Promise.resolve();
    }
  }

  /**
   * Retorna a quantidade de eventos na fila aguardando importação.
   */
  queueSize(): number {
    return this.liveQueue.length;
  }

  private scheduleDrain(): void {
    if (this.drainScheduled || this.liveQueue.length === 0) return;
    this.drainScheduled = true;
    void this.withImportLock(() => this.drainOnce()).catch(() => {});
  }

  private async drainOnce(): Promise<void> {
    this.drainScheduled = false;
    while (this.liveQueue.length > 0) {
      const batch = this.liveQueue;
      this.liveQueue = [];
      const events = batch.map((b) => b.event);
      const createdAts = batch.map((b) => b.createdAt);

      const incoming = processIncomingEvents({
        incomingEvents: events,
        currentDeviceId: this.deviceId,
        existingIds: this.getExistingEventIds(),
      });

      for (const evt of incoming.eventsToImport) {
        this.eventStore.appendEvent(evt);
      }

      if (incoming.foreignEventIds.length > 0) {
        await this.tracker.markReceived(incoming.foreignEventIds, this.keys.publicKey);
      }

      if (createdAts.length > 0) {
        this.cursor = advanceRelayCursor(this.cursor, createdAts);
        if (this.cursor !== null && this.cursor > this.lastCreatedAt) {
          this.lastCreatedAt = this.cursor;
        }
      }
    }
  }

  /**
   * Puxa eventos dos relays de forma incremental e paginada, decifra com a chave do Grupo forte,
   * processa via processIncomingEvents, grava apenas inéditos no eventStore e avança o cursor.
   */
  async pull(): Promise<{ importedCount: number }> {
    if (!this.isOnline) {
      return { importedCount: 0 };
    }

    try {
      return await this.withImportLock(async () => {
        const pageSize = 500;
        const { since } = resolvePullSyncOptions({
          isRecovery: false,
          isStrong: true,
          cursor: this.cursor,
        });
        let currentUntil: number | undefined = undefined;
        const pageMax = 50;
        let pageCount = 0;
        const seenNostrIds = new Set<string>();
        const allNostrEvents: NostrEvent[] = [];

        while (pageCount < pageMax) {
          pageCount++;
          const filter: NostrFilter = {
            kinds: [30333],
            authors: [this.keys.publicKey],
            limit: pageSize,
          };
          if (since !== undefined) filter.since = since;
          if (currentUntil !== undefined) filter.until = currentUntil;

          const page = this.relay.query(filter);
          if (page.length === 0) break;

          let newInPage = 0;
          let minCreatedAt = Infinity;
          let maxCreatedAt = -Infinity;

          for (const ne of page) {
            if (!seenNostrIds.has(ne.id)) {
              seenNostrIds.add(ne.id);
              allNostrEvents.push(ne);
              newInPage++;
            }
            if (typeof ne.created_at === "number") {
              if (ne.created_at < minCreatedAt) minCreatedAt = ne.created_at;
              if (ne.created_at > maxCreatedAt) maxCreatedAt = ne.created_at;
            }
          }

          if (newInPage === 0 || page.length < pageSize) {
            break;
          }

          if (!Number.isFinite(minCreatedAt)) {
            break;
          }

          if (minCreatedAt === maxCreatedAt) {
            currentUntil = minCreatedAt - 1;
          } else {
            currentUntil = minCreatedAt;
          }

          if (since !== undefined && currentUntil < since) {
            break;
          }
        }

        let totalImported = 0;
        const allForeignIds: string[] = [];
        const seenLocal = this.getExistingEventIds();
        const createdAts: number[] = [];

        for (const ne of allNostrEvents) {
          const res = decryptStrongPayload(ne.content, {
            encryptionKey: this.keys.encryptionKey,
            nostrPublicKey: this.keys.publicKey,
          });
          if (!res.ok) continue;

          createdAts.push(ne.created_at);

          const parsed = parseSyncPayloadDetailed(res.plaintext);
          const incoming = processIncomingEvents({
            incomingEvents: parsed.events,
            currentDeviceId: this.deviceId,
            existingIds: seenLocal,
          });

          if (incoming.foreignEventIds.length > 0) {
            allForeignIds.push(...incoming.foreignEventIds);
          }

          for (const evt of incoming.eventsToImport) {
            seenLocal.add(evt.id);
            const appended = this.eventStore.appendEvent(evt);
            if (appended) {
              totalImported++;
            }
          }
        }

        if (allForeignIds.length > 0) {
          await this.tracker.markReceived(allForeignIds, this.keys.publicKey);
        }

        if (createdAts.length > 0) {
          this.cursor = advanceRelayCursor(this.cursor, createdAts);
          if (this.cursor !== null && this.cursor > this.lastCreatedAt) {
            this.lastCreatedAt = this.cursor;
          }
        }

        return { importedCount: totalImported };
      });
    } finally {
      this.scheduleDrain();
    }
  }

  /**
   * Executa um ciclo completo: push seguido de pull.
   */
  async sync(options?: { force?: boolean }): Promise<{
    pushed: boolean;
    pushCount: number;
    importedCount: number;
  }> {
    const pushRes = await this.push(options);
    const pullRes = await this.pull();
    return {
      pushed: pushRes.pushed,
      pushCount: pushRes.count,
      importedCount: pullRes.importedCount,
    };
  }

  /**
   * Inicia subscrição ao vivo de eventos do relay.
   */
  startLiveSync(): { close: () => void } {
    if (this.liveSub) {
      return { close: () => this.stopLiveSync() };
    }

    this.liveSub = this.relay.subscribe(
      { kinds: [30333], authors: [this.keys.publicKey] },
      (ne) => {
        if (!this.isOnline) return;

        const res = decryptStrongPayload(ne.content, {
          encryptionKey: this.keys.encryptionKey,
          nostrPublicKey: this.keys.publicKey,
        });
        if (!res.ok) return;

        const parsed = parseSyncPayloadDetailed(res.plaintext);
        if (parsed.events.length > 0) {
          this.enqueueLiveBatch(parsed.events, ne.created_at);
        }
      },
    );

    return { close: () => this.stopLiveSync() };
  }

  /**
   * Encerra a subscrição ao vivo.
   */
  stopLiveSync(): void {
    if (this.liveSub) {
      this.liveSub.close();
      this.liveSub = null;
    }
  }

  /**
   * Controla a conectividade do aparelho com o relay para simulação de offline/online.
   */
  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  getOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Retorna o estado financeiro consolidado derivado de replayAllEvents.
   */
  getState(): AppState {
    return replayAllEvents(this.getAllEvents()).domain;
  }

  /**
   * Retorna o resultado completo de replayAllEvents.
   */
  getReplayResult(): ReplayResult {
    return replayAllEvents(this.getAllEvents());
  }

  getLastPushHash(): string {
    return this.lastPushHash;
  }
}

/**
 * Cria e inicializa um novo nó simulado com banco SQLite em memória e tracker isolado.
 */
export async function createSimulatedDevice(
  options: CreateSimulatedDeviceOptions,
): Promise<SimulatedSyncDevice> {
  let keys = options.keys;
  let groupCode = options.groupSecret ?? "";

  if (!keys) {
    if (options.groupSecret) {
      const parsed = parseGroupSecret(options.groupSecret);
      if (!parsed.ok) {
        throw new Error(`Segredo de grupo inválido: ${parsed.reason}`);
      }
      const strongKeys = deriveStrongGroupKeys(parsed.secret);
      keys = {
        privateKey: strongKeys.nostrPrivateKey,
        publicKey: strongKeys.nostrPublicKey,
        encryptionKey: strongKeys.encryptionKey,
        isStrong: true,
      };
      groupCode = options.groupSecret;
    } else {
      const secret = generateGroupSecret();
      groupCode = encodeGroupSecret(secret);
      const strongKeys = deriveStrongGroupKeys(secret);
      keys = {
        privateKey: strongKeys.nostrPrivateKey,
        publicKey: strongKeys.nostrPublicKey,
        encryptionKey: strongKeys.encryptionKey,
        isStrong: true,
      };
    }
  }

  const db = createMemoryAdapter();
  const eventStore = new SQLiteEventStore(db);
  eventStore.initDatabase();

  if (options.initialEvents) {
    for (const evt of options.initialEvents) {
      eventStore.appendEvent(evt);
    }
  }

  const trackerStorage = new MemoryTrackingStorage();
  const tracker = createSyncGroupTracker({ storage: trackerStorage });
  await tracker.load();

  return new SimulatedSyncDevice({
    deviceId: options.deviceId,
    relay: options.relay,
    keys,
    groupCode,
    eventStore,
    tracker,
    cursor: options.cursor,
  });
}
