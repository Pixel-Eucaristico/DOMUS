export type {
  SyncEvent,
  DeviceIdentity,
  PeerInfo,
  MessageType,
  HandshakeMessage,
  EventBatchMessage,
  PeerListMessage,
  HeartbeatMessage,
  SyncMessage,
  RTCSignalOffer,
  RTCSignalAnswer,
  RTCSignal,
  DataChannelAdapter,
  PeerConnectionAdapter,
  PeerConnectionFactory,
} from "./src/types";

export type { CryptoAdapter } from "./src/crypto";
export { webCryptoAdapter, createSimpleCrypto } from "./src/crypto";

export { createDeviceIdentity, joinNetwork } from "./src/deviceIdentity";

export { EventStore } from "./src/eventStore";

export {
  createHandshake,
  createEventBatch,
  createPeerList,
  createHeartbeat,
  serializeMessage,
  deserializeMessage,
} from "./src/messageProtocol";

export { WebRTCManager } from "./src/webrtcManager";
export type { WebRTCManagerConfig } from "./src/webrtcManager";

export { MeshManager } from "./src/meshManager";
export type { MeshManagerConfig } from "./src/meshManager";

export {
  lastWriteWins,
  deduplicateEvents,
  resolveConflicts,
  mergeEventStreams,
} from "./src/conflictResolver";
