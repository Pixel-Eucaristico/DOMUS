import type {
  PeerConnectionAdapter,
  PeerConnectionFactory,
  DataChannelAdapter,
  RTCSignalOffer,
  RTCSignalAnswer,
} from "@packages/sync/src/types";

function createWebDataChannelAdapter(
  dc: RTCDataChannel,
): DataChannelAdapter {
  const adapter: DataChannelAdapter = {
    send(data: string) {
      dc.send(data);
    },
    close() {
      dc.close();
    },
    onMessage: null,
    onClose: null,
    onOpen: null,
    get readyState() {
      const s = dc.readyState;
      if (s === "connecting") return "connecting" as const;
      if (s === "open") return "open" as const;
      if (s === "closing") return "closing" as const;
      return "closed" as const;
    },
  };

  dc.onmessage = (ev) => {
    adapter.onMessage?.(ev.data as string);
  };
  dc.onclose = () => {
    adapter.onClose?.();
  };
  dc.onopen = () => {
    adapter.onOpen?.();
  };

  return adapter;
}

function createWebPeerConnectionAdapter(
  config: { iceServers: Array<{ urls: string }> },
  deviceId: string,
  networkId: string,
): PeerConnectionAdapter {
  const pc = new RTCPeerConnection({ iceServers: config.iceServers });

  const adapter: PeerConnectionAdapter = {
    async createOffer(): Promise<RTCSignalOffer> {
      const dc = pc.createDataChannel("orcafacil-sync");
      const channelAdapter = createWebDataChannelAdapter(dc);

      adapter.onDataChannel?.(channelAdapter);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await waitForIceGathering(pc);

      return {
        type: "offer",
        sdp: pc.localDescription?.sdp ?? "",
        deviceId,
        networkId,
      };
    },

    async createAnswer(offer: RTCSignalOffer): Promise<RTCSignalAnswer> {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: offer.sdp }),
      );

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await waitForIceGathering(pc);

      return {
        type: "answer",
        sdp: pc.localDescription?.sdp ?? "",
        deviceId,
      };
    },

    async acceptAnswer(answer: RTCSignalAnswer): Promise<void> {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: answer.sdp }),
      );
    },

    createDataChannel(label: string): DataChannelAdapter {
      const dc = pc.createDataChannel(label);
      return createWebDataChannelAdapter(dc);
    },

    onDataChannel: null,
    onConnectionStateChange: null,

    close() {
      pc.close();
    },

    get connectionState() {
      return pc.connectionState ?? pc.iceConnectionState;
    },
  };

  pc.ondatachannel = (ev) => {
    const channelAdapter = createWebDataChannelAdapter(ev.channel);
    adapter.onDataChannel?.(channelAdapter);
  };

  pc.onconnectionstatechange = () => {
    adapter.onConnectionStateChange?.(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    if (!pc.connectionState) {
      adapter.onConnectionStateChange?.(pc.iceConnectionState);
    }
  };

  return adapter;
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      resolve();
    }, 5000);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
}

export function createBrowserPeerConnectionFactory(
  deviceId: string,
  networkId: string,
): PeerConnectionFactory {
  return {
    create(config: { iceServers: Array<{ urls: string }> }) {
      return createWebPeerConnectionAdapter(config, deviceId, networkId);
    },
  };
}

export function isWebRTCAvailable(): boolean {
  return typeof RTCPeerConnection !== "undefined";
}

export function compressSignal(signal: RTCSignalOffer | RTCSignalAnswer): string {
  const compact = {
    t: signal.type === "offer" ? "o" : "a",
    s: signal.sdp,
    d: signal.deviceId,
    ...(signal.type === "offer" ? { n: (signal as RTCSignalOffer).networkId } : {}),
  };
  return JSON.stringify(compact);
}

export function decompressSignal(data: string): RTCSignalOffer | RTCSignalAnswer | null {
  try {
    const compact = JSON.parse(data) as Record<string, string>;
    if (compact.t === "o") {
      return {
        type: "offer",
        sdp: compact.s,
        deviceId: compact.d,
        networkId: compact.n ?? "",
      };
    } else if (compact.t === "a") {
      return {
        type: "answer",
        sdp: compact.d ? compact.s : "",
        deviceId: compact.d,
      };
    }
    return null;
  } catch {
    return null;
  }
}
