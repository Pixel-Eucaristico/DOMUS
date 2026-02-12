export interface SyncEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface DeviceIdentity {
  deviceId: string;
  networkId: string;
  publicKey: string;
  privateKey: string;
}

export interface PeerInfo {
  deviceId: string;
  publicKey: string;
  lastSeen: number;
  connected: boolean;
}

export type MessageType = "HANDSHAKE" | "EVENT_BATCH" | "PEER_LIST" | "HEARTBEAT";

export interface HandshakeMessage {
  type: "HANDSHAKE";
  deviceId: string;
  publicKey: string;
  networkId: string;
  lastEventTimestamp: number;
}

export interface EventBatchMessage {
  type: "EVENT_BATCH";
  deviceId: string;
  events: SyncEvent[];
}

export interface PeerListMessage {
  type: "PEER_LIST";
  deviceId: string;
  peers: PeerInfo[];
}

export interface HeartbeatMessage {
  type: "HEARTBEAT";
  deviceId: string;
  timestamp: number;
}

export type SyncMessage =
  | HandshakeMessage
  | EventBatchMessage
  | PeerListMessage
  | HeartbeatMessage;

export interface RTCSignalOffer {
  type: "offer";
  sdp: string;
  deviceId: string;
  networkId: string;
}

export interface RTCSignalAnswer {
  type: "answer";
  sdp: string;
  deviceId: string;
}

export type RTCSignal = RTCSignalOffer | RTCSignalAnswer;

export interface DataChannelAdapter {
  send(data: string): void;
  close(): void;
  onMessage: ((data: string) => void) | null;
  onClose: (() => void) | null;
  onOpen: (() => void) | null;
  readyState: "connecting" | "open" | "closing" | "closed";
}

export interface PeerConnectionAdapter {
  createOffer(): Promise<RTCSignalOffer>;
  createAnswer(offer: RTCSignalOffer): Promise<RTCSignalAnswer>;
  acceptAnswer(answer: RTCSignalAnswer): Promise<void>;
  createDataChannel(label: string): DataChannelAdapter;
  onDataChannel: ((channel: DataChannelAdapter) => void) | null;
  onConnectionStateChange: ((state: string) => void) | null;
  close(): void;
  connectionState: string;
}

export interface PeerConnectionFactory {
  create(config: { iceServers: Array<{ urls: string }> }): PeerConnectionAdapter;
}
