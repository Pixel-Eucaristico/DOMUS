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
  RESET_MARKER_EVENT_TYPE,
  type ResetMarkerPayload,
  createResetMarkerEvent,
  filterEventsAgainstMarkers,
  shouldPromptForRemoteResetMarker,
  getResetMarkerId,
} from "../syncDecisions";
import { replayAllEvents, type ReplayResult } from "@/src/context/replay";
import type { AppState } from "@packages/domain/src/state";
import type {
  FakeMemoryRelay,
  RelaySubscription,
  NostrEvent,
  NostrFilter,
  SimulatedClock,
} from "./fakeMemoryRelay";
export {
  type SimulatedClock,
  createSimulatedClock,
  type DeliveryLogEntry,
} from "./fakeMemoryRelay";
export {
  RESET_MARKER_EVENT_TYPE,
  type ResetMarkerPayload,
  createResetMarkerEvent,
  filterEventsAgainstMarkers,
  shouldPromptForRemoteResetMarker,
  getResetMarkerId,
  formatResetMarkerPrompt,
  formatResetMarkerPromptMessage,
  type ShouldPromptForRemoteResetMarkerParams,
  type ResetMarkerPromptResult,
} from "../syncDecisions";

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
  relay?: FakeMemoryRelay;
  relays?: FakeMemoryRelay[];
  groupSecret?: string;
  keys?: NostrSyncKeys;
  initialEvents?: readonly SyncEvent[];
  cursor?: number | null;
  now?: () => number;
  clock?: SimulatedClock | (() => number);
  promptResetConfirmation?: (marker: ResetMarkerPayload) => Promise<boolean>;
}

export class SimulatedSyncDevice {
  readonly deviceId: string;
  readonly relays: FakeMemoryRelay[];
  readonly keys: NostrSyncKeys;
  readonly groupCode: string;
  readonly eventStore: SQLiteEventStore;
  readonly tracker: SyncGroupTracker;
  readonly knownMarkers: ResetMarkerPayload[] = [];
  readonly handledRemoteMarkerIds: Set<string> = new Set();
  private pendingMarkers: SyncEvent[] = [];
  private promptResetConfirmation?: (marker: ResetMarkerPayload) => Promise<boolean>;

  private cursor: number | null = null;
  private seq = 0;
  private lastPushHash = "empty";
  private isOnline = true;
  private liveSubs: RelaySubscription[] = [];
  private liveSyncActive = false;
  private lastCreatedAt = 0;
  private importTail: Promise<void> = Promise.resolve();
  private heldImports = 0;
  private liveQueue: { event: SyncEvent; createdAt: number; deliveredAt?: number }[] = [];
  private drainScheduled = false;

  private clock?: SimulatedClock;
  private nowFn: () => number = () => Date.now();
  private currentTime: number | null = null;
  private hasCustomNow = false;
  private receivedAtByEventId = new Map<string, number>();
  private recentLiveImportedIds = new Set<string>();

  constructor(params: {
    deviceId: string;
    relay?: FakeMemoryRelay;
    relays?: FakeMemoryRelay[];
    keys: NostrSyncKeys;
    groupCode: string;
    eventStore: SQLiteEventStore;
    tracker: SyncGroupTracker;
    cursor?: number | null;
    now?: () => number;
    clock?: SimulatedClock | (() => number);
    promptResetConfirmation?: (marker: ResetMarkerPayload) => Promise<boolean>;
  }) {
    this.deviceId = params.deviceId;
    if (params.relays && params.relays.length > 0) {
      this.relays = [...params.relays];
    } else if (params.relay) {
      this.relays = [params.relay];
    } else {
      throw new Error("Pelo menos um relay deve ser fornecido ao SimulatedSyncDevice");
    }
    this.keys = params.keys;
    this.groupCode = params.groupCode;
    this.eventStore = params.eventStore;
    this.tracker = params.tracker;
    this.cursor = params.cursor ?? null;
    this.promptResetConfirmation = params.promptResetConfirmation;

    const clock = params.clock ?? this.relays[0].getClock?.();
    if (clock) {
      this.setClock(clock);
    } else if (params.now) {
      this.nowFn = params.now;
      this.hasCustomNow = true;
    } else if (this.relays.length > 0 && typeof this.relays[0].getNow === "function") {
      this.nowFn = () => this.relays[0].getNow();
      this.hasCustomNow = true;
    } else {
      this.nowFn = () => (this.currentTime !== null ? this.currentTime : Date.now());
    }
  }

  get relay(): FakeMemoryRelay {
    return this.relays[0];
  }

  getNow(): number {
    return this.nowFn();
  }

  setClock(clock?: SimulatedClock | (() => number)): void {
    if (!clock) {
      this.clock = undefined;
      this.currentTime = null;
      this.hasCustomNow = false;
      this.nowFn = () => Date.now();
    } else if (typeof clock === "function") {
      this.clock = undefined;
      this.nowFn = clock;
      this.hasCustomNow = true;
    } else {
      this.clock = clock;
      this.nowFn = () => clock.now();
      this.hasCustomNow = true;
    }
  }

  getClock(): SimulatedClock | undefined {
    return this.clock;
  }

  setNow(now: number | (() => number)): void {
    if (typeof now === "function") {
      this.setClock(now);
    } else {
      this.currentTime = now;
      this.clock = undefined;
      this.nowFn = () => this.currentTime!;
      this.hasCustomNow = true;
    }
  }

  advanceTime(ms: number): number {
    if (this.clock) {
      return this.clock.advance(ms);
    }
    const next = this.getNow() + ms;
    this.setNow(next);
    return next;
  }

  getEventReceivedAt(eventId: string): number | undefined {
    return this.receivedAtByEventId.get(eventId);
  }

  getPropagationLatency(eventId: string, createdAt?: number): number | undefined {
    const receivedAt = this.getEventReceivedAt(eventId);
    if (receivedAt === undefined) return undefined;
    if (createdAt !== undefined) {
      const createdMs = createdAt < 1e11 ? createdAt * 1000 : createdAt;
      return receivedAt - createdMs;
    }
    const ev = this.getAllEvents().find((e) => e.id === eventId);
    return ev ? receivedAt - ev.timestamp : undefined;
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
    const timestamp = params.timestamp ?? (this.hasCustomNow ? this.getNow() : 1_700_000_000_000 + this.seq * 1_000);
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

    await this.flushPendingMarkers();

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

      const nowSec = Math.floor(this.getNow() / 1000);
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
      let batchConfirmed = false;
      for (const r of this.relays) {
        const pubRes = r.publish(signed, batchEventIds);
        if (pubRes.ok) {
          batchConfirmed = true;
        }
      }
      if (batchConfirmed) {
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

  /**
   * Story 5.8: Retorna os marcadores conhecidos ativos neste aparelho.
   */
  getKnownMarkers(): readonly ResetMarkerPayload[] {
    return this.knownMarkers;
  }

  /**
   * Story 5.8: Registra manualmente um marcador no aparelho (para testes e simulação).
   */
  registerMarker(marker: ResetMarkerPayload | SyncEvent): void {
    if (!marker || typeof marker !== "object") return;
    if ("clearedEventIds" in marker && Array.isArray(marker.clearedEventIds)) {
      this.knownMarkers.push(marker);
    } else if ("type" in marker && marker.type === RESET_MARKER_EVENT_TYPE && marker.payload) {
      let payload: ResetMarkerPayload | undefined;
      try {
        payload = (typeof marker.payload === "string" ? JSON.parse(marker.payload) : marker.payload) as ResetMarkerPayload;
      } catch {
        payload = undefined;
      }
      if (payload && typeof payload === "object" && Array.isArray(payload.clearedEventIds)) {
        this.knownMarkers.push(payload);
      }
    }
  }

  /**
   * Story 5.9: Define ou altera dinamicamente o manipulador de confirmação de reset remoto.
   */
  setPromptResetConfirmation(handler?: (marker: ResetMarkerPayload) => Promise<boolean>): void {
    this.promptResetConfirmation = handler;
  }

  /**
   * Story 5.9: Retorna o conjunto de IDs de marcadores remotos já tratados (aceitos ou dispensados).
   */
  getHandledRemoteMarkerIds(): ReadonlySet<string> {
    return this.handledRemoteMarkerIds;
  }

  /**
   * Story 5.9: Trata a chegada de um marcador de reset ou restauração de forma segura e determinística.
   * Retorna true se o marcador foi aceito e os dados locais foram apagados; false caso contrário.
   */
  async handleRemoteMarker(marker: SyncEvent): Promise<boolean> {
    if (this.keys.isStrong === false) {
      return false;
    }

    if (!marker || marker.type !== RESET_MARKER_EVENT_TYPE || !marker.payload) {
      return false;
    }

    let payload: ResetMarkerPayload | undefined;
    try {
      payload = (typeof marker.payload === "string" ? JSON.parse(marker.payload) : marker.payload) as ResetMarkerPayload;
    } catch {
      return false;
    }

    if (!payload || typeof payload !== "object" || !Array.isArray(payload.clearedEventIds)) {
      return false;
    }

    const markerDeviceId = marker.deviceId || payload.deviceId;
    if (markerDeviceId === this.deviceId) {
      if (
        !this.knownMarkers.some(
          (m) =>
            m.timestamp === payload!.timestamp &&
            m.deviceId === payload!.deviceId &&
            m.action === payload!.action,
        )
      ) {
        this.knownMarkers.push(payload);
      }
      return false;
    }

    const shouldPrompt = shouldPromptForRemoteResetMarker({
      marker,
      currentDeviceId: this.deviceId,
      isStrong: true,
      handledMarkerIds: this.handledRemoteMarkerIds,
    });

    if (!shouldPrompt) {
      return false;
    }

    const markerId = getResetMarkerId(marker);
    if (marker.id) this.handledRemoteMarkerIds.add(marker.id);
    if (markerId) this.handledRemoteMarkerIds.add(markerId);

    if (this.promptResetConfirmation) {
      const confirmed = await this.promptResetConfirmation(payload);
      if (confirmed) {
        this.eventStore.clearAllEvents();
        this.cursor = null;
        this.lastCreatedAt = 0;
        if (
          !this.knownMarkers.some(
            (m) =>
              m.timestamp === payload!.timestamp &&
              m.deviceId === payload!.deviceId &&
              m.action === payload!.action,
          )
        ) {
          this.knownMarkers.push(payload);
        }
        return true;
      }
      return false;
    }

    // Sem manipulador confirmatório: o aparelho jamais apaga dados locais nem adiciona a knownMarkers sem resposta do usuário.
    return false;
  }

  /**
   * Story 5.8: Publica um evento marcador no Grupo forte ou enfileira se offline.
   */
  async publishMarker(markerEvent: SyncEvent): Promise<boolean> {
    if (this.keys.isStrong === false) {
      return false;
    }

    if (!this.isOnline) {
      if (!this.pendingMarkers.some((m) => m.id === markerEvent.id)) {
        this.pendingMarkers.push(markerEvent);
      }
      return false;
    }

    const batch = [markerEvent];
    const batchId = computeStrongBatchId(this.deviceId, batch);
    const batchEventIds = [markerEvent.id];

    const batchPayload = JSON.stringify([
      {
        id: markerEvent.id,
        type: markerEvent.type,
        payload: markerEvent.payload,
        timestamp: markerEvent.timestamp,
        deviceId: markerEvent.deviceId,
        signature: markerEvent.signature || "",
      },
    ]);

    const encrypted = encryptStrongPayload(batchPayload, {
      encryptionKey: this.keys.encryptionKey,
      nostrPublicKey: this.keys.publicKey,
    });

    const nowSec = Math.floor(this.getNow() / 1000);
    this.lastCreatedAt = Math.max(nowSec, this.lastCreatedAt + 1, (this.cursor ?? 0) + 1);

    const actionTag = (markerEvent.payload as ResetMarkerPayload)?.action ?? "reset";
    const nostrEvent = {
      kind: 30333,
      created_at: this.lastCreatedAt,
      tags: [
        ["d", batchId],
        ["t", "domus-sync"],
        ["device", this.deviceId],
        ["batch", "1"],
        ["marker", actionTag],
      ],
      content: encrypted,
      pubkey: this.keys.publicKey,
    } as UnsignedEvent;

    const signed = finalizeEvent(nostrEvent, this.keys.privateKey);
    let batchConfirmed = false;
    for (const r of this.relays) {
      const pubRes = r.publish(signed, batchEventIds);
      if (pubRes.ok) {
        batchConfirmed = true;
      }
    }

    if (batchConfirmed) {
      await this.tracker.markPublished([markerEvent.id], this.keys.publicKey);
      this.pendingMarkers = this.pendingMarkers.filter((m) => m.id !== markerEvent.id);
    }

    return batchConfirmed;
  }

  /**
   * Story 5.8: Descarrega marcadores que foram gerados offline na reconexão.
   */
  private async flushPendingMarkers(): Promise<void> {
    if (!this.isOnline || this.keys.isStrong === false || this.pendingMarkers.length === 0) {
      return;
    }
    const toFlush = [...this.pendingMarkers];
    this.pendingMarkers = [];
    for (const marker of toFlush) {
      const ok = await this.publishMarker(marker);
      if (!ok) {
        this.pendingMarkers.push(marker);
      }
    }
  }

  /**
   * Story 5.8: Apaga o log local de eventos e publica um marcador de reset no Grupo forte.
   */
  async resetApp(): Promise<{ markerEvent: SyncEvent; published: boolean }> {
    const currentEvents = this.getAllEvents();
    const clearedEventIds = currentEvents.map((e) => e.id);
    const now = this.getNow();

    this.cursor = null;
    this.lastCreatedAt = 0;
    this.eventStore.clearAllEvents();

    const markerEvent = createResetMarkerEvent({
      action: "reset",
      deviceId: this.deviceId,
      clearedEventIds,
      clearedBefore: now,
      timestamp: now,
    });

    this.knownMarkers.push(markerEvent.payload as ResetMarkerPayload);

    const published = await this.publishMarker(markerEvent);
    return { markerEvent, published };
  }

  /**
   * Story 5.8: Restaura eventos a partir de um backup, descartando os eventos locais anteriores
   * e publicando um marcador de restauração no Grupo forte.
   */
  async restoreFromBackup(events: SyncEvent[]): Promise<{ markerEvent: SyncEvent; published: boolean }> {
    const currentEvents = this.getAllEvents();
    const restoredIds = new Set(events.map((e) => e.id));
    const clearedEventIds = currentEvents
      .filter((e) => !restoredIds.has(e.id))
      .map((e) => e.id);
    const now = this.getNow();

    this.eventStore.clearAllEvents();
    for (const evt of events) {
      this.eventStore.appendEvent(evt);
    }

    const markerEvent = createResetMarkerEvent({
      action: "restore",
      deviceId: this.deviceId,
      clearedEventIds,
      clearedBefore: now,
      timestamp: now,
    });

    this.knownMarkers.push(markerEvent.payload as ResetMarkerPayload);

    const published = await this.publishMarker(markerEvent);
    return { markerEvent, published };
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
  enqueueLive(event: SyncEvent, createdAt: number, deliveredAt?: number): void {
    this.liveQueue.push({ event, createdAt, deliveredAt });
    this.scheduleDrain();
  }

  /**
   * Enfileira rajada de eventos recebidos ao vivo em lote sob o mutex.
   */
  enqueueLiveBatch(events: SyncEvent[], createdAt: number, deliveredAt?: number): void {
    if (events.length === 0) return;
    for (const event of events) {
      this.liveQueue.push({ event, createdAt, deliveredAt });
    }
    this.scheduleDrain();
  }

  /**
   * Resolve quando a fila e o mutex de importação estiverem ociosos (para testes).
   */
  async idle(): Promise<void> {
    while (this.heldImports > 0 || this.drainScheduled || this.liveQueue.length > 0) {
      await this.importTail;
      await Promise.resolve();
    }
    const now = this.getNow();
    for (const id of this.recentLiveImportedIds) {
      if (!this.receivedAtByEventId.has(id)) {
        this.receivedAtByEventId.set(id, now);
      }
    }
    this.recentLiveImportedIds.clear();
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

      if (this.keys.isStrong !== false) {
        for (const evt of events) {
          if (evt && typeof evt === "object" && evt.type === RESET_MARKER_EVENT_TYPE) {
            await this.handleRemoteMarker(evt);
          }
        }
      }

      const domainEvents = events.filter((e) => e.type !== RESET_MARKER_EVENT_TYPE);
      const filteredEvents = filterEventsAgainstMarkers({
        incomingEvents: domainEvents,
        markers: this.knownMarkers,
        isStrong: this.keys.isStrong !== false,
      });

      const incoming = processIncomingEvents({
        incomingEvents: filteredEvents,
        currentDeviceId: this.deviceId,
        existingIds: this.getExistingEventIds(),
      });

      const now = this.getNow();
      for (const item of batch) {
        const evt = item.event;
        const deliveredAt = item.deliveredAt ?? now;
        if (!this.receivedAtByEventId.has(evt.id)) {
          this.receivedAtByEventId.set(evt.id, deliveredAt);
        }
      }

      for (const evt of incoming.eventsToImport) {
        this.recentLiveImportedIds.add(evt.id);
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
          nowSec: Math.floor(this.getNow() / 1000),
        });
        const pageMax = 50;
        const seenNostrIds = new Set<string>();
        const allNostrEvents: NostrEvent[] = [];

        for (const r of this.relays) {
          const seenThisRelay = new Set<string>();
          let currentUntil: number | undefined = undefined;
          let pageCount = 0;

          while (pageCount < pageMax) {
            pageCount++;
            const filter: NostrFilter = {
              kinds: [30333],
              authors: [this.keys.publicKey],
              limit: pageSize,
            };
            if (since !== undefined) filter.since = since;
            if (currentUntil !== undefined) filter.until = currentUntil;

            const page = r.query(filter);
            if (page.length === 0) break;

            let newInPage = 0;
            let minCreatedAt = Infinity;
            let maxCreatedAt = -Infinity;

            for (const ne of page) {
              if (!seenThisRelay.has(ne.id)) {
                seenThisRelay.add(ne.id);
                newInPage++;
                if (!seenNostrIds.has(ne.id)) {
                  seenNostrIds.add(ne.id);
                  allNostrEvents.push(ne);
                }
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
        }

        let totalImported = 0;
        const allForeignIds: string[] = [];
        const seenLocal = this.getExistingEventIds();
        const createdAts: number[] = [];

        // Pré-passo (Story 5.8): Decifra e extrai todos os marcadores de controle em this.knownMarkers
        // antes de importar os eventos de domínio, garantindo que marcadores de batches mais recentes
        // estejam ativos mesmo se o relay entregar batches fora de ordem cronológica.
        const decryptedBatches: { ne: NostrEvent; parsedEvents: SyncEvent[] }[] = [];

        for (const ne of allNostrEvents) {
          const res = decryptStrongPayload(ne.content, {
            encryptionKey: this.keys.encryptionKey,
            nostrPublicKey: this.keys.publicKey,
          });
          if (!res.ok) continue;

          createdAts.push(ne.created_at);

          const parsed = parseSyncPayloadDetailed(res.plaintext);
          decryptedBatches.push({ ne, parsedEvents: parsed.events });

          if (this.keys.isStrong !== false) {
            for (const evt of parsed.events) {
              if (evt && typeof evt === "object" && evt.type === RESET_MARKER_EVENT_TYPE) {
                const wasReset = await this.handleRemoteMarker(evt);
                if (wasReset) {
                  seenLocal.clear();
                }
              }
            }
          }
        }

        for (const { parsedEvents } of decryptedBatches) {
          const domainEvents = parsedEvents.filter((e) => e.type !== RESET_MARKER_EVENT_TYPE);
          const filteredEvents = filterEventsAgainstMarkers({
            incomingEvents: domainEvents,
            markers: this.knownMarkers,
            isStrong: this.keys.isStrong !== false,
          });

          const incoming = processIncomingEvents({
            incomingEvents: filteredEvents,
            currentDeviceId: this.deviceId,
            existingIds: seenLocal,
          });

          if (incoming.foreignEventIds.length > 0) {
            allForeignIds.push(...incoming.foreignEventIds);
          }

          const now = this.getNow();
          for (const evt of incoming.eventsToImport) {
            seenLocal.add(evt.id);
            const appended = this.eventStore.appendEvent(evt);
            if (appended) {
              if (!this.receivedAtByEventId.has(evt.id)) {
                this.receivedAtByEventId.set(evt.id, now);
              }
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

  private openLiveSubscriptions(): void {
    if (this.liveSubs.length > 0) return;
    for (const relay of this.relays) {
      const sub = relay.subscribe(
        { kinds: [30333], authors: [this.keys.publicKey] },
        (ne, deliveryTimestamp) => {
          if (!this.isOnline) return;

          const res = decryptStrongPayload(ne.content, {
            encryptionKey: this.keys.encryptionKey,
            nostrPublicKey: this.keys.publicKey,
          });
          if (!res.ok) return;

          const parsed = parseSyncPayloadDetailed(res.plaintext);
          if (parsed.events.length > 0) {
            this.enqueueLiveBatch(parsed.events, ne.created_at, deliveryTimestamp);
          }
        },
      );
      this.liveSubs.push(sub);
    }
  }

  /**
   * Inicia subscrição ao vivo de eventos de todos os relays conectados.
   */
  startLiveSync(): { close: () => void } {
    this.liveSyncActive = true;
    if (this.isOnline && this.liveSubs.length === 0) {
      this.openLiveSubscriptions();
    }
    return { close: () => this.stopLiveSync() };
  }

  /**
   * Encerra a subscrição ao vivo em todos os relays.
   */
  stopLiveSync(): void {
    this.liveSyncActive = false;
    for (const sub of this.liveSubs) {
      sub.close();
    }
    this.liveSubs = [];
  }

  /**
   * Controla a conectividade do aparelho com o relay para simulação de offline/online.
   */
  setOnline(online: boolean): void {
    this.isOnline = online;
    if (!online) {
      for (const sub of this.liveSubs) {
        sub.close();
      }
      this.liveSubs = [];
    } else {
      if (this.liveSyncActive && this.liveSubs.length === 0) {
        this.startLiveSync();
      }
    }
  }

  getOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Story 5.7: Reconecta o aparelho à rede e aos relays, restabelecendo a subscrição ao vivo
   * (se estava ativa anteriormente) e executando reconciliação autônoma (sync: push + pull).
   */
  async reconnect(): Promise<{
    pushed: boolean;
    pushCount: number;
    importedCount: number;
  }> {
    this.setOnline(true);
    await this.flushPendingMarkers();
    return this.sync();
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
    relays: options.relays,
    keys,
    groupCode,
    eventStore,
    tracker,
    cursor: options.cursor,
    now: options.now,
    clock: options.clock,
    promptResetConfirmation: options.promptResetConfirmation,
  });
}
