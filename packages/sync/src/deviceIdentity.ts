import type { DeviceIdentity } from "./types";
import type { CryptoAdapter } from "./crypto";

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

export async function createDeviceIdentity(
  cryptoAdapter: CryptoAdapter,
): Promise<DeviceIdentity> {
  const deviceId = generateId();
  const networkId = generateNetworkId();
  const { publicKey, privateKey } = await cryptoAdapter.generateKeyPair();

  return {
    deviceId,
    networkId,
    publicKey,
    privateKey,
  };
}

export function joinNetwork(
  identity: DeviceIdentity,
  networkId: string,
): DeviceIdentity {
  return { ...identity, networkId };
}
