import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";
import { appAlert } from "@/src/services/appAlert";

export const DEVICE_ID_KEY = "domus_device_id";
export const LAST_SYNC_KEY = "domus_last_sync_ts";
export const GROUP_CODE_KEY = "domus_nostr_group_code";
export const STRONG_GROUP_SECRET_KEY = "domus_strong_group_secret_v1";
export const LAST_PUSH_HASH_KEY = "domus_nostr_last_push_hash";
export const GROUP_PUSH_HASHES_KEY = "domus_group_push_hashes_v1";
export const SYNC_GROUP_TRACKING_KEY = "domus_sync_group_tracking_v1";
export const HANDLED_REMOTE_MARKERS_STORAGE_KEY = "@domus:handled_remote_markers";

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

export const SECURE_STORAGE_UNAVAILABLE_TITLE = "Armazenamento seguro indisponível";
export const SECURE_STORAGE_UNAVAILABLE_MESSAGE =
  "O código de pareamento foi mantido apenas na memória desta sessão porque o armazenamento protegido do aparelho falhou. O sincronismo continua funcionando agora, mas o pareamento pode ser solicitado novamente ao reabrir o aplicativo.";

let inMemoryGroupCode: string | null = null;
let hasWarnedSecureStorageFailure = false;

/**
 * Reseta o estado em memória para isolamento em testes unitários.
 */
export function _resetGroupCodeMemoryState(): void {
  inMemoryGroupCode = null;
  hasWarnedSecureStorageFailure = false;
}

/** Lê o group code; migra o valor legado de AsyncStorage para SecureStore; fallback para valor em memória. */
export async function loadGroupCode(): Promise<string | null> {
  if (isWeb()) {
    try {
      const secure = await webSecrets.get(GROUP_CODE_KEY);
      if (secure) return secure;
    } catch (err) {
      console.warn("[syncStorage] webSecrets falhou na leitura do group code.", err);
    }
    return inMemoryGroupCode;
  }

  try {
    const secure = await SecureStore.getItemAsync(GROUP_CODE_KEY);
    if (secure) return secure;
  } catch (err) {
    console.warn("[syncStorage] SecureStore falhou na leitura do group code.", err);
  }

  // Se o código foi definido nesta sessão e está na memória (ex.: gravação falhou),
  // a sessão ativa prevalece sobre qualquer resíduo legado desatualizado no AsyncStorage
  if (inMemoryGroupCode) {
    return inMemoryGroupCode;
  }

  try {
    const legacy = await AsyncStorage.getItem(GROUP_CODE_KEY);
    if (legacy && legacy.trim()) {
      const trimmedLegacy = legacy.trim();
      try {
        await SecureStore.setItemAsync(GROUP_CODE_KEY, trimmedLegacy);
        await AsyncStorage.removeItem(GROUP_CODE_KEY);
      } catch {
        // migração falhou: mantém o legado e tenta de novo no próximo boot
      }
      return trimmedLegacy;
    }
  } catch {}

  return null;
}

/**
 * Grava o group code em SecureStore (web: cifrado; no nativo, se SecureStore falhar,
 * mantém em memória volátil e alerta o usuário uma vez sem gravar texto puro em AsyncStorage).
 */
export async function saveGroupCode(code: string): Promise<void> {
  const trimmed = code?.trim();
  if (!trimmed) {
    throw new Error("Código de grupo inválido (vazio).");
  }

  if (isWeb()) {
    try {
      const ok = await webSecrets.set(GROUP_CODE_KEY, trimmed);
      if (!ok) {
        inMemoryGroupCode = trimmed;
        if (!hasWarnedSecureStorageFailure) {
          hasWarnedSecureStorageFailure = true;
          appAlert(SECURE_STORAGE_UNAVAILABLE_TITLE, SECURE_STORAGE_UNAVAILABLE_MESSAGE);
        }
      } else {
        inMemoryGroupCode = null;
      }
      return;
    } catch (err) {
      console.warn(
        "[syncStorage] webSecrets lançou erro ao gravar group code; mantendo em memória.",
        err
      );
      inMemoryGroupCode = trimmed;
      if (!hasWarnedSecureStorageFailure) {
        hasWarnedSecureStorageFailure = true;
        appAlert(SECURE_STORAGE_UNAVAILABLE_TITLE, SECURE_STORAGE_UNAVAILABLE_MESSAGE);
      }
      return;
    }
  }

  try {
    await SecureStore.setItemAsync(GROUP_CODE_KEY, trimmed);
    await AsyncStorage.removeItem(GROUP_CODE_KEY).catch(() => {});
    inMemoryGroupCode = null;
    return;
  } catch (err) {
    console.warn(
      "[syncStorage] SecureStore falhou ao gravar group code; mantendo apenas em memória.",
      err
    );
    inMemoryGroupCode = trimmed;
    if (!hasWarnedSecureStorageFailure) {
      hasWarnedSecureStorageFailure = true;
      appAlert(SECURE_STORAGE_UNAVAILABLE_TITLE, SECURE_STORAGE_UNAVAILABLE_MESSAGE);
    }
    // NUNCA grava em AsyncStorage em texto puro (Story 6.3, FR-23, NFR-1)
  }
}

/** Remove o group code de todos os armazenamentos e zera a memória volátil. */
export async function clearGroupCode(): Promise<void> {
  inMemoryGroupCode = null;
  hasWarnedSecureStorageFailure = false;
  if (isWeb()) {
    try {
      await webSecrets.remove(GROUP_CODE_KEY);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(GROUP_CODE_KEY);
  } catch {
    // chave pode não existir
  }
  await AsyncStorage.removeItem(GROUP_CODE_KEY).catch(() => {});
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

// ── Story 5.9: Marcadores remotos tratados (reset e restore) ─────────────────

/**
 * Lê os IDs de marcadores remotos já tratados (aceitos ou dispensados).
 */
export async function loadHandledRemoteMarkers(
  storage: Pick<typeof AsyncStorage, "getItem"> = AsyncStorage,
): Promise<string[]> {
  try {
    const raw = await storage.getItem(HANDLED_REMOTE_MARKERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string");
    }
  } catch {}
  return [];
}

/**
 * Persiste os IDs de marcadores remotos tratados no AsyncStorage.
 */
export async function saveHandledRemoteMarkers(
  markerIds: readonly string[] | ReadonlySet<string>,
  storage: Pick<typeof AsyncStorage, "setItem"> = AsyncStorage,
): Promise<void> {
  try {
    const list = Array.from(markerIds);
    await storage.setItem(HANDLED_REMOTE_MARKERS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export { computeEventHash } from "@/src/modules/syncDecisions";
