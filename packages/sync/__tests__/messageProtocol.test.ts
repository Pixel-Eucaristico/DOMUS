import { describe, it, expect } from "vitest";
import {
  createHandshake,
  createEventBatch,
  createPeerList,
  createHeartbeat,
  serializeMessage,
  deserializeMessage,
} from "../src/messageProtocol";

describe("messageProtocol", () => {
  it("creates a handshake message", () => {
    const msg = createHandshake("d1", "pubkey", "NET1", 12345);
    expect(msg.type).toBe("HANDSHAKE");
    expect(msg.deviceId).toBe("d1");
    expect(msg.publicKey).toBe("pubkey");
    expect(msg.networkId).toBe("NET1");
    expect(msg.lastEventTimestamp).toBe(12345);
  });

  it("creates an event batch message", () => {
    const msg = createEventBatch("d1", [
      { id: "e1", type: "A", payload: {}, timestamp: 1, deviceId: "d1", signature: "s" },
    ]);
    expect(msg.type).toBe("EVENT_BATCH");
    expect(msg.events).toHaveLength(1);
  });

  it("creates a peer list message", () => {
    const msg = createPeerList("d1", [
      { deviceId: "d2", publicKey: "pk", lastSeen: 1, connected: true },
    ]);
    expect(msg.type).toBe("PEER_LIST");
    expect(msg.peers).toHaveLength(1);
  });

  it("creates a heartbeat message", () => {
    const msg = createHeartbeat("d1");
    expect(msg.type).toBe("HEARTBEAT");
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it("serializes and deserializes correctly", () => {
    const original = createHandshake("d1", "pk", "NET", 0);
    const serialized = serializeMessage(original);
    const deserialized = deserializeMessage(serialized);
    expect(deserialized).toEqual(original);
  });

  it("returns null for invalid JSON", () => {
    expect(deserializeMessage("not json")).toBeNull();
  });

  it("returns null for invalid message type", () => {
    expect(deserializeMessage('{"type": "INVALID"}')).toBeNull();
  });
});
