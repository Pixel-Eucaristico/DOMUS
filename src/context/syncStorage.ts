import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";
import type { SyncEvent } from "@packages/storage/src/eventStore";

export const DEVICE_ID_KEY = "domus_device_id";
export const LAST_SYNC_KEY = "domus_last_sync_ts";
export const GROUP_CODE_KEY = "domus_nostr_group_code";
export const STRONG_GROUP_SECRET_KEY = "domus_strong_group_secret_v1";
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

// ── Group code ────────────────────────────────────────────────────────────────
// O group code gera as chaves do sync: guardado em SecureStore no nativo.
// Na web não há SecureStore: usa webSecrets (AES-GCM com chave não extraível no IndexedDB).
// `process.env.EXPO_OS` é trocado pela plataforma no build e dispensa importar react-native (testável no vitest).
const isWeb = (): boolean => process.env.EXPO_OS === "web";

/** Lê o group code; migra o valor legado de AsyncStorage para SecureStore. */
export async function loadGroupCode(): Promise<string | null> {
  if (isWeb()) return webSecrets.get(GROUP_CODE_KEY);

  try {
    const secure = await SecureStore.getItemAsync(GROUP_CODE_KEY);
    if (secure) return secure;
  } catch {
    // SecureStore indisponível: cai para o valor legado abaixo
  }

  const legacy = await AsyncStorage.getItem(GROUP_CODE_KEY);
  if (legacy) {
    try {
      await SecureStore.setItemAsync(GROUP_CODE_KEY, legacy);
      await AsyncStorage.removeItem(GROUP_CODE_KEY);
    } catch {
      // migração falhou: mantém o legado e tenta de novo no próximo boot
    }
  }
  return legacy;
}

/** Grava o group code em SecureStore (web: cifrado; AsyncStorage só se o SecureStore falhar no nativo). */
export async function saveGroupCode(code: string): Promise<void> {
  if (isWeb()) {
    await webSecrets.set(GROUP_CODE_KEY, code);
    return;
  }
  try {
    await SecureStore.setItemAsync(GROUP_CODE_KEY, code);
    await AsyncStorage.removeItem(GROUP_CODE_KEY);
    return;
  } catch (err) {
    console.warn("[syncStorage] SecureStore falhou ao gravar group code; usando AsyncStorage.", err);
  }
  await AsyncStorage.setItem(GROUP_CODE_KEY, code);
}

/** Remove o group code de todos os armazenamentos. */
export async function clearGroupCode(): Promise<void> {
  if (isWeb()) {
    await webSecrets.remove(GROUP_CODE_KEY);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(GROUP_CODE_KEY);
  } catch {
    // chave pode não existir
  }
  await AsyncStorage.removeItem(GROUP_CODE_KEY);
}

// ── Strong group secret (Story 4.3) ──────────────────────────────────────────
// O segredo do Grupo forte é gerado com 256 bits de aleatoriedade criptográfica.
// Guardado estritamente em SecureStore (nativo) ou webSecrets (web).
// NUNCA cai para AsyncStorage nem em caso de falha (Story 6.3).

/** Lê o segredo do Grupo forte de SecureStore (nativo) ou webSecrets (web). */
export async function loadStrongGroupSecret(): Promise<string | null> {
  if (isWeb()) return webSecrets.get(STRONG_GROUP_SECRET_KEY);

  try {
    return await SecureStore.getItemAsync(STRONG_GROUP_SECRET_KEY);
  } catch {
    return null;
  }
}

/** Grava o segredo do Grupo forte exclusivamente em SecureStore ou webSecrets. */
export async function saveStrongGroupSecret(secret: string): Promise<void> {
  if (isWeb()) {
    const ok = await webSecrets.set(STRONG_GROUP_SECRET_KEY, secret);
    if (!ok) {
      throw new Error("Falha ao salvar segredo forte em webSecrets.");
    }
    return;
  }
  await SecureStore.setItemAsync(STRONG_GROUP_SECRET_KEY, secret);
}

/** Remove o segredo do Grupo forte de todos os armazenamentos seguros. */
export async function clearStrongGroupSecret(): Promise<void> {
  if (isWeb()) {
    await webSecrets.remove(STRONG_GROUP_SECRET_KEY);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(STRONG_GROUP_SECRET_KEY);
  } catch {
    // chave pode não existir
  }
  try {
    await AsyncStorage.removeItem(STRONG_GROUP_SECRET_KEY);
  } catch {}
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
