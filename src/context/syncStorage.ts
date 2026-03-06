import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@packages/storage/src/eventStore";

export const DEVICE_ID_KEY = "domus_device_id";
export const LAST_SYNC_KEY = "domus_last_sync_ts";
export const GROUP_CODE_KEY = "domus_nostr_group_code";
export const LAST_PULL_TS_KEY = "domus_nostr_last_pull_ts";
export const LAST_PUSH_HASH_KEY = "domus_nostr_last_push_hash";

export const PULL_INTERVAL_MS = 8_000;

export function generateDeviceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function loadOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
  } catch {}
  const id = generateDeviceId();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {}
  return id;
}

export function computeEventHash(events: SyncEvent[]): string {
  if (events.length === 0) return "empty";
  const ids = events.map((e) => e.id).sort().join(",");
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    const c = ids.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return `${events.length}-${hash.toString(36)}`;
}
