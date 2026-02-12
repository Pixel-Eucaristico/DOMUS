import { describe, it, expect, vi } from "vitest";
import { WebRTCManager } from "../src/webrtcManager";
import { createMockFactory, createMockChannel } from "./helpers";
import { createHandshake } from "../src/messageProtocol";

describe("WebRTCManager", () => {
  it("creates an offer", async () => {
    const onPeerConnected = vi.fn();
    const manager = new WebRTCManager({
      deviceId: "d1",
      networkId: "NET",
      connectionFactory: createMockFactory("d1"),
      onPeerConnected,
    });

    const offer = await manager.createOffer();
    expect(offer.type).toBe("offer");
    expect(offer.sdp).toBeTruthy();
    expect(offer.deviceId).toBe("d1");
    expect(manager.getPeerCount()).toBe(1);
  });

  it("accepts an offer and returns an answer", async () => {
    const manager = new WebRTCManager({
      deviceId: "d2",
      networkId: "NET",
      connectionFactory: createMockFactory("d2"),
    });

    const answer = await manager.acceptOffer({
      type: "offer",
      sdp: "mock-sdp",
      deviceId: "d1",
      networkId: "NET",
    });
    expect(answer.type).toBe("answer");
    expect(answer.deviceId).toBe("d2");
  });

  it("completes a connection from offer side", async () => {
    const manager = new WebRTCManager({
      deviceId: "d1",
      networkId: "NET",
      connectionFactory: createMockFactory("d1"),
    });

    await manager.createOffer();
    await manager.completeConnection({
      type: "answer",
      sdp: "mock-answer",
      deviceId: "d2",
    });

    expect(manager.getPeerCount()).toBe(1);
  });

  it("sends a message to a peer", async () => {
    const factory = createMockFactory("d1");
    const manager = new WebRTCManager({
      deviceId: "d1",
      networkId: "NET",
      connectionFactory: factory,
    });

    await manager.createOffer();
    await manager.completeConnection({
      type: "answer",
      sdp: "mock",
      deviceId: "d2",
    });

    const msg = createHandshake("d1", "pk", "NET", 0);
    const sent = manager.sendMessage("d2", msg);
    expect(sent).toBe(true);
  });

  it("broadcasts a message to all peers", async () => {
    const manager = new WebRTCManager({
      deviceId: "d1",
      networkId: "NET",
      connectionFactory: createMockFactory("d1"),
    });

    await manager.createOffer();
    await manager.completeConnection({
      type: "answer",
      sdp: "mock",
      deviceId: "d2",
    });

    const msg = createHandshake("d1", "pk", "NET", 0);
    const sent = manager.broadcastMessage(msg);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBe("d2");
  });

  it("disconnects a peer", async () => {
    const manager = new WebRTCManager({
      deviceId: "d1",
      networkId: "NET",
      connectionFactory: createMockFactory("d1"),
    });

    await manager.createOffer();
    await manager.completeConnection({
      type: "answer",
      sdp: "mock",
      deviceId: "d2",
    });

    manager.disconnectPeer("d2");
    expect(manager.getPeerCount()).toBe(0);
  });

  it("disconnects all peers", async () => {
    const manager = new WebRTCManager({
      deviceId: "d1",
      networkId: "NET",
      connectionFactory: createMockFactory("d1"),
    });

    await manager.createOffer();
    await manager.completeConnection({
      type: "answer",
      sdp: "mock",
      deviceId: "d2",
    });

    manager.disconnectAll();
    expect(manager.getPeerCount()).toBe(0);
  });
});
