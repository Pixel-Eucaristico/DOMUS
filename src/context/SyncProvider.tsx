import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebRTCManager } from "@packages/sync/src/webrtcManager";
import { MeshManager } from "@packages/sync/src/meshManager";
import { EventStore } from "@packages/sync/src/eventStore";
import { createSimpleCrypto } from "@packages/sync/src/crypto";
import type {
  DeviceIdentity,
  PeerInfo,
  RTCSignalOffer,
  RTCSignalAnswer,
  SyncMessage,
} from "@packages/sync/src/types";
import {
  createBrowserPeerConnectionFactory,
  isWebRTCAvailable,
  compressSignal,
  decompressSignal,
} from "@/src/services/webrtcFactory";

const IDENTITY_KEY = "domus_device_identity";

type SyncStatus = "idle" | "creating_offer" | "waiting_answer" | "processing_answer" | "connecting" | "syncing" | "connected" | "error";

interface SyncContextValue {
  identity: DeviceIdentity | null;
  peers: PeerInfo[];
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  errorMessage: string | null;
  webrtcAvailable: boolean;
  offerQRData: string | null;
  answerQRData: string | null;
  createOffer: () => Promise<void>;
  processScannedOffer: (data: string) => Promise<void>;
  processScannedAnswer: (data: string) => Promise<void>;
  syncManual: () => void;
  addLocalEvents: (events: Array<{ id: string; type: string; payload: unknown; timestamp: number; deviceId: string; signature: string }>) => void;
  getEventStore: () => EventStore | null;
  resetSync: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function generateNetworkId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function loadOrCreateIdentity(): Promise<DeviceIdentity> {
  try {
    const stored = await AsyncStorage.getItem(IDENTITY_KEY);
    if (stored) {
      return JSON.parse(stored) as DeviceIdentity;
    }
  } catch {}

  const crypto = createSimpleCrypto();
  const { publicKey, privateKey } = await crypto.generateKeyPair();
  const identity: DeviceIdentity = {
    deviceId: generateId(),
    networkId: generateNetworkId(),
    publicKey,
    privateKey,
  };

  try {
    await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {}

  return identity;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<DeviceIdentity | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offerQRData, setOfferQRData] = useState<string | null>(null);
  const [answerQRData, setAnswerQRData] = useState<string | null>(null);
  const [webrtcAvailable] = useState(() => isWebRTCAvailable());

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const meshRef = useRef<MeshManager | null>(null);
  const eventStoreRef = useRef<EventStore | null>(null);

  useEffect(() => {
    loadOrCreateIdentity().then(setIdentity);
  }, []);

  useEffect(() => {
    if (!identity || !webrtcAvailable) return;

    const crypto = createSimpleCrypto();
    const store = new EventStore(identity.deviceId, identity.privateKey, crypto);
    eventStoreRef.current = store;

    const factory = createBrowserPeerConnectionFactory(identity.deviceId, identity.networkId);

    const webrtc = new WebRTCManager({
      deviceId: identity.deviceId,
      networkId: identity.networkId,
      connectionFactory: factory,
      onMessage: (peerId: string, message: SyncMessage) => {
        meshRef.current?.handleMessage(peerId, message);
      },
      onPeerConnected: (peerId: string) => {
        meshRef.current?.onPeerConnected(peerId, "");
        setSyncStatus("connected");
        updatePeersList();
      },
      onPeerDisconnected: (peerId: string) => {
        meshRef.current?.onPeerDisconnected(peerId);
        updatePeersList();
        const connectedIds = webrtcRef.current?.getConnectedPeerIds() ?? [];
        if (connectedIds.length === 0) {
          setSyncStatus("idle");
        }
      },
    });
    webrtcRef.current = webrtc;

    const mesh = new MeshManager({
      deviceId: identity.deviceId,
      publicKey: identity.publicKey,
      networkId: identity.networkId,
      webrtc,
      eventStore: store,
      onSyncComplete: (_peerId: string, eventsReceived: number) => {
        if (eventsReceived > 0) {
          setLastSyncTime(Date.now());
        }
        updatePeersList();
      },
    });
    meshRef.current = mesh;
    mesh.startHeartbeat(30000);

    return () => {
      mesh.stopHeartbeat();
      webrtc.disconnectAll();
    };
  }, [identity, webrtcAvailable]);

  const updatePeersList = useCallback(() => {
    if (meshRef.current) {
      setPeers([...meshRef.current.getKnownPeers()]);
    }
  }, []);

  const createOffer = useCallback(async () => {
    if (!webrtcRef.current || !identity) return;

    try {
      setSyncStatus("creating_offer");
      setErrorMessage(null);
      const offer = await webrtcRef.current.createOffer();
      const compressed = compressSignal(offer);
      setOfferQRData(compressed);
      setSyncStatus("waiting_answer");
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao criar oferta");
    }
  }, [identity]);

  const processScannedOffer = useCallback(async (data: string) => {
    if (!webrtcRef.current || !identity) return;

    try {
      setSyncStatus("processing_answer");
      setErrorMessage(null);

      const signal = decompressSignal(data);
      if (!signal || signal.type !== "offer") {
        setSyncStatus("error");
        setErrorMessage("QR code invalido: nao e uma oferta");
        return;
      }

      const answer = await webrtcRef.current.acceptOffer(signal);
      const compressed = compressSignal(answer);
      setAnswerQRData(compressed);
      setSyncStatus("connecting");
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao processar oferta");
    }
  }, [identity]);

  const processScannedAnswer = useCallback(async (data: string) => {
    if (!webrtcRef.current) return;

    try {
      setSyncStatus("connecting");
      setErrorMessage(null);

      const signal = decompressSignal(data);
      if (!signal || signal.type !== "answer") {
        setSyncStatus("error");
        setErrorMessage("QR code invalido: nao e uma resposta");
        return;
      }

      await webrtcRef.current.completeConnection(signal);
      setSyncStatus("connected");
      setOfferQRData(null);
      setAnswerQRData(null);
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao completar conexao");
    }
  }, []);

  const syncManual = useCallback(() => {
    if (!meshRef.current || !webrtcRef.current) return;

    const connectedIds = webrtcRef.current.getConnectedPeerIds();
    if (connectedIds.length === 0) return;

    setSyncStatus("syncing");
    for (const peerId of connectedIds) {
      meshRef.current.syncWithPeer(peerId);
    }
    setLastSyncTime(Date.now());
    setSyncStatus("connected");
    updatePeersList();
  }, [updatePeersList]);

  const addLocalEvents = useCallback(
    (events: Array<{ id: string; type: string; payload: unknown; timestamp: number; deviceId: string; signature: string }>) => {
      if (!eventStoreRef.current || !meshRef.current) return;

      for (const evt of events) {
        const added = eventStoreRef.current.addRemoteEvent(evt);
        if (added) {
          meshRef.current.broadcastEvent(evt);
        }
      }
    },
    [],
  );

  const getEventStore = useCallback(() => {
    return eventStoreRef.current;
  }, []);

  const resetSync = useCallback(() => {
    setOfferQRData(null);
    setAnswerQRData(null);
    setSyncStatus("idle");
    setErrorMessage(null);
  }, []);

  const value = useMemo<SyncContextValue>(
    () => ({
      identity,
      peers,
      syncStatus,
      lastSyncTime,
      errorMessage,
      webrtcAvailable,
      offerQRData,
      answerQRData,
      createOffer,
      processScannedOffer,
      processScannedAnswer,
      syncManual,
      addLocalEvents,
      getEventStore,
      resetSync,
    }),
    [
      identity,
      peers,
      syncStatus,
      lastSyncTime,
      errorMessage,
      webrtcAvailable,
      offerQRData,
      answerQRData,
      createOffer,
      processScannedOffer,
      processScannedAnswer,
      syncManual,
      addLocalEvents,
      getEventStore,
      resetSync,
    ],
  );

  return (
    <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return ctx;
}
