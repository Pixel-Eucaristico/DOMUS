import type {
  SyncMessage,
  HandshakeMessage,
  EventBatchMessage,
  PeerListMessage,
  HeartbeatMessage,
  SyncEvent,
  PeerInfo,
} from "./types";

export function createHandshake(
  deviceId: string,
  publicKey: string,
  networkId: string,
  lastEventTimestamp: number,
): HandshakeMessage {
  return {
    type: "HANDSHAKE",
    deviceId,
    publicKey,
    networkId,
    lastEventTimestamp,
  };
}

export function createEventBatch(
  deviceId: string,
  events: SyncEvent[],
): EventBatchMessage {
  return {
    type: "EVENT_BATCH",
    deviceId,
    events,
  };
}

export function createPeerList(
  deviceId: string,
  peers: PeerInfo[],
): PeerListMessage {
  return {
    type: "PEER_LIST",
    deviceId,
    peers,
  };
}

export function createHeartbeat(deviceId: string): HeartbeatMessage {
  return {
    type: "HEARTBEAT",
    deviceId,
    timestamp: Date.now(),
  };
}

export function serializeMessage(message: SyncMessage): string {
  return JSON.stringify(message);
}

export function deserializeMessage(data: string): SyncMessage | null {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const validTypes = ["HANDSHAKE", "EVENT_BATCH", "PEER_LIST", "HEARTBEAT"];
    if (typeof parsed.type !== "string" || !validTypes.includes(parsed.type)) {
      return null;
    }
    return parsed as unknown as SyncMessage;
  } catch {
    return null;
  }
}
