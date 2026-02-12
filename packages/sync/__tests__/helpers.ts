import type {
  PeerConnectionAdapter,
  PeerConnectionFactory,
  DataChannelAdapter,
  RTCSignalOffer,
  RTCSignalAnswer,
} from "../src/types";

export function createMockChannel(): DataChannelAdapter {
  const channel: DataChannelAdapter = {
    readyState: "open",
    onMessage: null,
    onClose: null,
    onOpen: null,
    send(_data: string) {},
    close() {
      channel.readyState = "closed";
      channel.onClose?.();
    },
  };
  return channel;
}

export function createMockConnection(
  deviceId: string,
): PeerConnectionAdapter {
  let dataChannel: DataChannelAdapter | null = null;

  const conn: PeerConnectionAdapter = {
    connectionState: "new",
    onDataChannel: null,
    onConnectionStateChange: null,

    async createOffer(): Promise<RTCSignalOffer> {
      return {
        type: "offer",
        sdp: "mock-sdp-offer-" + Date.now(),
        deviceId,
        networkId: "TEST",
      };
    },

    async createAnswer(offer: RTCSignalOffer): Promise<RTCSignalAnswer> {
      void offer;
      conn.connectionState = "connected";
      return {
        type: "answer",
        sdp: "mock-sdp-answer-" + Date.now(),
        deviceId,
      };
    },

    async acceptAnswer(_answer: RTCSignalAnswer): Promise<void> {
      conn.connectionState = "connected";
    },

    createDataChannel(_label: string): DataChannelAdapter {
      dataChannel = createMockChannel();
      return dataChannel;
    },

    close() {
      conn.connectionState = "closed";
      dataChannel?.close();
    },
  };
  return conn;
}

export function createMockFactory(deviceId: string): PeerConnectionFactory {
  return {
    create(_config) {
      return createMockConnection(deviceId);
    },
  };
}
