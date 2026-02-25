import { describe, it, expect, vi } from "vitest";
import { MeshManager } from "../src/meshManager";
import { WebRTCManager } from "../src/webrtcManager";
import { EventStore } from "../src/eventStore";
import { createMockFactory } from "./helpers";
import { createSimpleCrypto } from "../src/crypto";
import type { SyncEvent, EventBatchMessage, HandshakeMessage, PeerListMessage, HeartbeatMessage } from "../src/types";

const crypto = createSimpleCrypto();

function setupMesh() {
  const factory = createMockFactory("d1");
  const webrtc = new WebRTCManager({
    deviceId: "d1",
    networkId: "NET",
    connectionFactory: factory,
  });
  const eventStore = new EventStore("d1", "priv1", crypto);
  const onSyncComplete = vi.fn();

  const mesh = new MeshManager({
    deviceId: "d1",
    publicKey: "pub1",
    networkId: "NET",
    webrtc,
    eventStore,
    onSyncComplete,
  });

  return { mesh, webrtc, eventStore, onSyncComplete };
}

describe("MeshManager", () => {
  describe("peer management", () => {
    it("adds and retrieves known peers", () => {
      const { mesh } = setupMesh();
      mesh.addKnownPeer({
        deviceId: "d2",
        publicKey: "pk2",
        lastSeen: Date.now(),
        connected: true,
      });
      const peers = mesh.getKnownPeers();
      expect(peers).toHaveLength(1);
      expect(peers[0]?.deviceId).toBe("d2");
    });

    it("removes a known peer", () => {
      const { mesh } = setupMesh();
      mesh.addKnownPeer({
        deviceId: "d2",
        publicKey: "pk2",
        lastSeen: Date.now(),
        connected: true,
      });
      mesh.removeKnownPeer("d2");
      expect(mesh.getKnownPeers()).toHaveLength(0);
    });
  });

  describe("handleMessage - HANDSHAKE", () => {
    it("registers peer and sends events since their last timestamp", async () => {
      const { mesh, webrtc, eventStore } = setupMesh();
      await eventStore.appendEvent("A", { v: 1 });

      const sendSpy = vi.spyOn(webrtc, "sendMessage");

      const handshake: HandshakeMessage = {
        type: "HANDSHAKE",
        deviceId: "d2",
        publicKey: "pk2",
        networkId: "NET",
        lastEventTimestamp: 0,
      };

      mesh.handleMessage("d2", handshake);

      const peers = mesh.getKnownPeers();
      expect(peers.find((p) => p.deviceId === "d2")).toBeTruthy();
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe("handleMessage - EVENT_BATCH", () => {
    it("adds remote events and calls onSyncComplete", () => {
      const { mesh, onSyncComplete } = setupMesh();

      const batch: EventBatchMessage = {
        type: "EVENT_BATCH",
        deviceId: "d2",
        events: [
          { id: "re1", type: "X", payload: {}, timestamp: Date.now(), deviceId: "d2", signature: "s" },
          { id: "re2", type: "Y", payload: {}, timestamp: Date.now(), deviceId: "d2", signature: "s" },
        ],
      };

      mesh.handleMessage("d2", batch);
      expect(onSyncComplete).toHaveBeenCalledWith("d2", 2);
    });

    it("does not duplicate events", () => {
      const { mesh, eventStore, onSyncComplete } = setupMesh();
      const event: SyncEvent = {
        id: "re1",
        type: "X",
        payload: {},
        timestamp: Date.now(),
        deviceId: "d2",
        signature: "s",
      };

      mesh.handleMessage("d2", { type: "EVENT_BATCH", deviceId: "d2", events: [event] });
      mesh.handleMessage("d2", { type: "EVENT_BATCH", deviceId: "d2", events: [event] });

      expect(eventStore.getEventCount()).toBe(1);
      expect(onSyncComplete).toHaveBeenCalledWith("d2", 0);
    });
  });

  describe("handleMessage - PEER_LIST", () => {
    it("adds new peers from list, ignoring self", () => {
      const { mesh } = setupMesh();
      const peerList: PeerListMessage = {
        type: "PEER_LIST",
        deviceId: "d2",
        peers: [
          { deviceId: "d1", publicKey: "pk1", lastSeen: 1, connected: true },
          { deviceId: "d3", publicKey: "pk3", lastSeen: 2, connected: false },
        ],
      };

      mesh.handleMessage("d2", peerList);
      const known = mesh.getKnownPeers();
      expect(known.find((p) => p.deviceId === "d3")).toBeTruthy();
      expect(known.find((p) => p.deviceId === "d1")).toBeUndefined();
    });
  });

  describe("handleMessage - HEARTBEAT", () => {
    it("updates peer lastSeen", () => {
      const { mesh } = setupMesh();
      mesh.addKnownPeer({
        deviceId: "d2",
        publicKey: "pk2",
        lastSeen: 1000,
        connected: true,
      });

      const heartbeat: HeartbeatMessage = {
        type: "HEARTBEAT",
        deviceId: "d2",
        timestamp: Date.now(),
      };

      mesh.handleMessage("d2", heartbeat);
      const peer = mesh.getKnownPeers().find((p) => p.deviceId === "d2");
      expect(peer?.lastSeen).toBeGreaterThan(1000);
    });
  });

  describe("syncWithPeer", () => {
    it("sends events and handshake to peer", async () => {
      const { mesh, webrtc, eventStore } = setupMesh();
      await eventStore.appendEvent("INIT", {});

      const sendSpy = vi.spyOn(webrtc, "sendMessage");
      mesh.syncWithPeer("d2");
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe("broadcastEvent", () => {
    it("broadcasts an event to all connected peers", () => {
      const { mesh, webrtc } = setupMesh();
      const broadcastSpy = vi.spyOn(webrtc, "broadcastMessage");

      const event: SyncEvent = {
        id: "e1",
        type: "A",
        payload: {},
        timestamp: Date.now(),
        deviceId: "d1",
        signature: "s",
      };

      mesh.broadcastEvent(event);
      expect(broadcastSpy).toHaveBeenCalled();
    });
  });

  describe("onPeerConnected / onPeerDisconnected", () => {
    it("registers peer on connect and marks disconnected", () => {
      const { mesh } = setupMesh();
      mesh.onPeerConnected("d2", "pk2");
      const connected = mesh.getKnownPeers().find((p) => p.deviceId === "d2");
      expect(connected?.connected).toBe(true);

      mesh.onPeerDisconnected("d2");
      const disconnected = mesh.getKnownPeers().find((p) => p.deviceId === "d2");
      expect(disconnected?.connected).toBe(false);
    });
  });

  describe("heartbeat", () => {
    it("starts and stops heartbeat interval", () => {
      const { mesh } = setupMesh();
      mesh.startHeartbeat(100);
      mesh.stopHeartbeat();
    });
  });
});
