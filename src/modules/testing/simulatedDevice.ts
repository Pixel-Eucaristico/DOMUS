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
import { parseSyncPayloadDetailed } from "../syncPayload";
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
import { partitionStrongBatches, type NostrSyncKeys } from "../nostrSync";
import {
  shouldPublishGroupEvents,
  processIncomingEvents,
} from "../syncDecisions";
import { replayAllEvents, type ReplayResult } from "@/src/context/replay";
import type { AppState } from "@packages/domain/src/state";
import type { FakeMemoryRelay, RelaySubscription } from "./fakeMemoryRelay";

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

export interface CreateSimulatedDeviceOptions {
  deviceId: string;
  relay: FakeMemoryRelay;
  groupSecret?: string;
  keys?: NostrSyncKeys;
  initialEvents?: readonly SyncEvent[];
}

export class SimulatedSyncDevice {
  readonly deviceId: string;
  readonly relay: FakeMemoryRelay;
  readonly keys: NostrSyncKeys;
  readonly groupCode: string;
  readonly eventStore: SQLiteEventStore;
  readonly tracker: SyncGroupTracker;

  private seq = 0;
  private lastPushHash = "empty";
  private isOnline = true;
  private liveSub: RelaySubscription | null = null;
  private lastCreatedAt = 0;

  constructor(params: {
    deviceId: string;
    relay: FakeMemoryRelay;
    keys: NostrSyncKeys;
    groupCode: string;
    eventStore: SQLiteEventStore;
    tracker: SyncGroupTracker;
  }) {
    this.deviceId = params.deviceId;
    this.relay = params.relay;
    this.keys = params.keys;
    this.groupCode = params.groupCode;
    this.eventStore = params.eventStore;
    this.tracker = params.tracker;
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
   */
  async push(options?: { force?: boolean }): Promise<{
    pushed: boolean;
    count: number;
    reason?: string;
  }> {
    if (!this.isOnline) {
      return { pushed: false, count: 0, reason: "offline" };
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
      return { pushed: false, count: 0, reason: decision.reason };
    }

    const eventsToPublish = decision.myEvents;
    const batches = partitionStrongBatches(eventsToPublish);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchId = `sync-${this.deviceId}-${batchIndex}`;

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
      this.lastCreatedAt = Math.max(nowSec, this.lastCreatedAt + 1);

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
      this.relay.publish(signed, batch.map((e) => e.id));
    }

    await this.tracker.markPublished(
      eventsToPublish.map((e) => e.id),
      this.keys.publicKey,
    );
    this.lastPushHash = decision.hash;

    return { pushed: true, count: eventsToPublish.length };
  }

  /**
   * Puxa eventos dos relays, decifra com a chave do Grupo forte, processa
   * via processIncomingEvents e grava apenas inéditos no eventStore.
   */
  async pull(): Promise<{ importedCount: number }> {
    if (!this.isOnline) {
      return { importedCount: 0 };
    }

    const nostrEvents = this.relay.query({
      kinds: [30333],
      authors: [this.keys.publicKey],
    });

    let totalImported = 0;
    const allForeignIds: string[] = [];
    const seenLocal = this.getExistingEventIds();

    for (const ne of nostrEvents) {
      const res = decryptStrongPayload(ne.content, {
        encryptionKey: this.keys.encryptionKey,
        nostrPublicKey: this.keys.publicKey,
      });
      if (!res.ok) continue;

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

    return { importedCount: totalImported };
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
      async (ne) => {
        if (!this.isOnline) return;

        const res = decryptStrongPayload(ne.content, {
          encryptionKey: this.keys.encryptionKey,
          nostrPublicKey: this.keys.publicKey,
        });
        if (!res.ok) return;

        const parsed = parseSyncPayloadDetailed(res.plaintext);
        const incoming = processIncomingEvents({
          incomingEvents: parsed.events,
          currentDeviceId: this.deviceId,
          existingIds: this.getExistingEventIds(),
        });

        if (incoming.foreignEventIds.length > 0) {
          await this.tracker.markReceived(incoming.foreignEventIds, this.keys.publicKey);
        }

        for (const evt of incoming.eventsToImport) {
          this.eventStore.appendEvent(evt);
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
  });
}
