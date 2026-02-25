import type {
  PeerConnectionAdapter,
  PeerConnectionFactory,
  DataChannelAdapter,
  RTCSignalOffer,
  RTCSignalAnswer,
  SyncMessage,
} from "./types";
import { serializeMessage, deserializeMessage } from "./messageProtocol";

const STUN_SERVER = "stun:stun.l.google.com:19302";
const DATA_CHANNEL_LABEL = "orcafacil-sync";

export interface WebRTCManagerConfig {
  deviceId: string;
  networkId: string;
  connectionFactory: PeerConnectionFactory;
  onMessage?: (peerId: string, message: SyncMessage) => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDisconnected?: (peerId: string) => void;
}

interface PeerConnection {
  peerId: string;
  connection: PeerConnectionAdapter;
  channel: DataChannelAdapter | null;
}

export class WebRTCManager {
  private config: WebRTCManagerConfig;
  private peers: Map<string, PeerConnection> = new Map();

  constructor(config: WebRTCManagerConfig) {
    this.config = config;
  }

  async createOffer(): Promise<RTCSignalOffer> {
    const connection = this.config.connectionFactory.create({
      iceServers: [{ urls: STUN_SERVER }],
    });

    const channel = connection.createDataChannel(DATA_CHANNEL_LABEL);
    const offer = await connection.createOffer();

    const tempId = "pending-" + Date.now().toString(36);
    this.peers.set(tempId, { peerId: tempId, connection, channel });

    this.setupChannelListeners(tempId, channel);
    this.setupConnectionListeners(tempId, connection);

    return offer;
  }

  async acceptOffer(offer: RTCSignalOffer): Promise<RTCSignalAnswer> {
    const connection = this.config.connectionFactory.create({
      iceServers: [{ urls: STUN_SERVER }],
    });

    const peerId = offer.deviceId;

    connection.onDataChannel = (channel) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.channel = channel;
        this.setupChannelListeners(peerId, channel);
      }
    };

    const answer = await connection.createAnswer(offer);

    this.peers.set(peerId, { peerId, connection, channel: null });
    this.setupConnectionListeners(peerId, connection);

    return answer;
  }

  async completeConnection(
    answer: RTCSignalAnswer,
    offerId?: string,
  ): Promise<void> {
    const peerId = answer.deviceId;
    const pendingKey = offerId ?? Array.from(this.peers.keys()).find((k) =>
      k.startsWith("pending-"),
    );

    if (!pendingKey) {
      throw new Error("No pending connection to complete");
    }

    const peer = this.peers.get(pendingKey);
    if (!peer) {
      throw new Error("Pending peer not found");
    }

    await peer.connection.acceptAnswer(answer);

    this.peers.delete(pendingKey);
    peer.peerId = peerId;
    this.peers.set(peerId, peer);
  }

  sendMessage(peerId: string, message: SyncMessage): boolean {
    const peer = this.peers.get(peerId);
    if (!peer?.channel || peer.channel.readyState !== "open") {
      return false;
    }
    peer.channel.send(serializeMessage(message));
    return true;
  }

  broadcastMessage(message: SyncMessage): string[] {
    const sent: string[] = [];
    for (const [peerId] of this.peers) {
      if (this.sendMessage(peerId, message)) {
        sent.push(peerId);
      }
    }
    return sent;
  }

  disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.channel?.close();
      peer.connection.close();
      this.peers.delete(peerId);
    }
  }

  disconnectAll(): void {
    for (const [peerId] of this.peers) {
      this.disconnectPeer(peerId);
    }
  }

  getConnectedPeerIds(): string[] {
    const connected: string[] = [];
    for (const [peerId, peer] of this.peers) {
      if (
        peer.channel?.readyState === "open" &&
        !peerId.startsWith("pending-")
      ) {
        connected.push(peerId);
      }
    }
    return connected;
  }

  isConnectedTo(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    if (!peer?.channel) return false;
    return peer.channel.readyState === "open";
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  private setupChannelListeners(
    peerId: string,
    channel: DataChannelAdapter,
  ): void {
    channel.onOpen = () => {
      this.config.onPeerConnected?.(peerId);
    };

    channel.onMessage = (data: string) => {
      const message = deserializeMessage(data);
      if (message) {
        this.config.onMessage?.(peerId, message);
      }
    };

    channel.onClose = () => {
      this.config.onPeerDisconnected?.(peerId);
    };
  }

  private setupConnectionListeners(
    peerId: string,
    connection: PeerConnectionAdapter,
  ): void {
    connection.onConnectionStateChange = (state: string) => {
      if (state === "disconnected" || state === "failed" || state === "closed") {
        this.config.onPeerDisconnected?.(peerId);
      }
    };
  }
}
