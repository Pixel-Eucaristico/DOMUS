import type { PeerInfo, SyncEvent, SyncMessage } from "./types";
import { WebRTCManager } from "./webrtcManager";
import { EventStore } from "./eventStore";
import {
  createHandshake,
  createEventBatch,
  createPeerList,
  createHeartbeat,
} from "./messageProtocol";

export interface MeshManagerConfig {
  deviceId: string;
  publicKey: string;
  networkId: string;
  webrtc: WebRTCManager;
  eventStore: EventStore;
  onSyncComplete?: (peerId: string, eventsReceived: number) => void;
}

export class MeshManager {
  private config: MeshManagerConfig;
  private knownPeers: Map<string, PeerInfo> = new Map();
  private peerLastSync: Map<string, number> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: MeshManagerConfig) {
    this.config = config;
  }

  handleMessage(peerId: string, message: SyncMessage): void {
    switch (message.type) {
      case "HANDSHAKE":
        this.handleHandshake(peerId, message);
        break;
      case "EVENT_BATCH":
        this.handleEventBatch(peerId, message);
        break;
      case "PEER_LIST":
        this.handlePeerList(message);
        break;
      case "HEARTBEAT":
        this.handleHeartbeat(peerId, message);
        break;
    }
  }

  syncWithPeer(peerId: string): void {
    const lastSync = this.peerLastSync.get(peerId) ?? 0;
    const events = this.config.eventStore.getEventsSince(lastSync);

    if (events.length > 0) {
      const batch = createEventBatch(this.config.deviceId, events);
      this.config.webrtc.sendMessage(peerId, batch);
    }

    const handshake = createHandshake(
      this.config.deviceId,
      this.config.publicKey,
      this.config.networkId,
      lastSync,
    );
    this.config.webrtc.sendMessage(peerId, handshake);
  }

  broadcastEvent(event: SyncEvent): string[] {
    const batch = createEventBatch(this.config.deviceId, [event]);
    return this.config.webrtc.broadcastMessage(batch);
  }

  broadcastPeerList(): void {
    const peers = this.getKnownPeers();
    const message = createPeerList(this.config.deviceId, peers);
    this.config.webrtc.broadcastMessage(message);
  }

  startHeartbeat(intervalMs: number = 30000): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = createHeartbeat(this.config.deviceId);
      this.config.webrtc.broadcastMessage(heartbeat);
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  addKnownPeer(peer: PeerInfo): void {
    this.knownPeers.set(peer.deviceId, peer);
  }

  removeKnownPeer(deviceId: string): void {
    this.knownPeers.delete(deviceId);
    this.peerLastSync.delete(deviceId);
  }

  getKnownPeers(): PeerInfo[] {
    return Array.from(this.knownPeers.values());
  }

  getConnectedPeers(): PeerInfo[] {
    const connectedIds = new Set(this.config.webrtc.getConnectedPeerIds());
    return this.getKnownPeers().filter((p) => connectedIds.has(p.deviceId));
  }

  onPeerConnected(peerId: string, publicKey: string): void {
    this.knownPeers.set(peerId, {
      deviceId: peerId,
      publicKey,
      lastSeen: Date.now(),
      connected: true,
    });
    this.syncWithPeer(peerId);
    this.broadcastPeerList();
  }

  onPeerDisconnected(peerId: string): void {
    const peer = this.knownPeers.get(peerId);
    if (peer) {
      this.knownPeers.set(peerId, { ...peer, connected: false });
    }
  }

  private handleHandshake(
    peerId: string,
    message: Extract<SyncMessage, { type: "HANDSHAKE" }>,
  ): void {
    this.knownPeers.set(peerId, {
      deviceId: message.deviceId,
      publicKey: message.publicKey,
      lastSeen: Date.now(),
      connected: true,
    });

    const eventsSince = this.config.eventStore.getEventsSince(
      message.lastEventTimestamp,
    );
    if (eventsSince.length > 0) {
      const batch = createEventBatch(this.config.deviceId, eventsSince);
      this.config.webrtc.sendMessage(peerId, batch);
    }
  }

  private handleEventBatch(
    peerId: string,
    message: Extract<SyncMessage, { type: "EVENT_BATCH" }>,
  ): void {
    const added = this.config.eventStore.addRemoteEvents(message.events);
    this.peerLastSync.set(peerId, Date.now());

    const peer = this.knownPeers.get(peerId);
    if (peer) {
      this.knownPeers.set(peerId, { ...peer, lastSeen: Date.now() });
    }

    this.config.onSyncComplete?.(peerId, added);
  }

  private handlePeerList(
    message: Extract<SyncMessage, { type: "PEER_LIST" }>,
  ): void {
    for (const peer of message.peers) {
      if (
        peer.deviceId !== this.config.deviceId &&
        !this.knownPeers.has(peer.deviceId)
      ) {
        this.knownPeers.set(peer.deviceId, {
          ...peer,
          connected: false,
        });
      }
    }
  }

  private handleHeartbeat(
    peerId: string,
    _message: Extract<SyncMessage, { type: "HEARTBEAT" }>,
  ): void {
    const peer = this.knownPeers.get(peerId);
    if (peer) {
      this.knownPeers.set(peerId, {
        ...peer,
        lastSeen: Date.now(),
        connected: true,
      });
    }
  }
}
