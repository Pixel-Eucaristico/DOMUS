import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { webSecrets } from "@/src/modules/security/infrastructure/webSecrets";

export const DEVICE_KEY_STORAGE = "domus_auto_backup_device_key";

/**
 * process.env.EXPO_OS é definido pelo compilador do Expo (no build nativo é "android"/"ios", na web é "web")
 * e dispensa importar react-native (testável no vitest).
 */
export const isWeb = (): boolean => process.env.EXPO_OS === "web";

/**
 * Lê a chave de dispositivo do armazenamento seguro (SecureStore no nativo, webSecrets na web).
 * Em caso de erro na camada segura, propaga a exceção para que o chamador possa diferenciar
 * ausência de chave de falha de hardware/keystore.
 */
export async function loadSecureDeviceKey(): Promise<string | null> {
  if (isWeb()) {
    return webSecrets.get(DEVICE_KEY_STORAGE);
  }
  return SecureStore.getItemAsync(DEVICE_KEY_STORAGE);
}

/**
 * Salva a chave de dispositivo exclusivamente no armazenamento seguro.
 * No nativo, remove qualquer resíduo em texto puro de AsyncStorage.
 * Na web, o AsyncStorage é o backend de armazenamento do webSecrets (cifrado por AES-GCM),
 * portanto o removeItem nunca é chamado na web.
 */
export async function saveSecureDeviceKey(key: string): Promise<void> {
  const trimmed = key?.trim();
  if (!trimmed) {
    throw new Error("Chave de dispositivo inválida (vazia).");
  }
  if (isWeb()) {
    const ok = await webSecrets.set(DEVICE_KEY_STORAGE, trimmed);
    if (!ok) {
      throw new Error("Falha ao salvar chave do dispositivo em webSecrets.");
    }
    return;
  }
  await SecureStore.setItemAsync(DEVICE_KEY_STORAGE, trimmed);
  await AsyncStorage.removeItem(DEVICE_KEY_STORAGE).catch(() => {});
}

/**
 * Remove a chave de dispositivo do armazenamento seguro de forma idempotente.
 */
export async function deleteSecureDeviceKey(): Promise<void> {
  if (isWeb()) {
    try {
      await webSecrets.remove(DEVICE_KEY_STORAGE);
    } catch {
      // Falhas silenciosas para idempotência
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(DEVICE_KEY_STORAGE);
  } catch {
    // Chave pode não existir no SecureStore
  }
}

/**
 * Gera 24 caracteres alfanuméricos sem ambiguidade (sem 0/O/1/I), formatados com hífen a cada 6 caracteres.
 */
export function generateDeviceBackupKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  const bytes = new Uint8Array(24);
  const cryptoObj =
    typeof globalThis !== "undefined" && globalThis.crypto
      ? globalThis.crypto
      : typeof crypto !== "undefined"
      ? crypto
      : undefined;

  if (!cryptoObj?.getRandomValues) {
    throw new Error("crypto.getRandomValues indisponível para geração de chave segura.");
  }

  cryptoObj.getRandomValues(bytes);
  for (let i = 0; i < 24; i++) {
    if (i > 0 && i % 6 === 0) key += "-";
    key += chars[bytes[i] % chars.length];
  }
  return key;
}

/**
 * Retorna a chave de dispositivo já gerada, ou null se ainda não existir.
 * Migra automaticamente chave legada de AsyncStorage para SecureStore/webSecrets.
 */
export async function getDeviceBackupKey(): Promise<string | null> {
  if (isWeb()) {
    // Na web, webSecrets gerencia a criptografia AES-GCM em AsyncStorage e migra chaves legadas
    try {
      return await webSecrets.get(DEVICE_KEY_STORAGE);
    } catch (error) {
      console.error("[deviceBackupKey] Erro ao carregar chave do webSecrets:", error);
      throw error;
    }
  }

  // Ambiente Nativo
  try {
    const secure = await SecureStore.getItemAsync(DEVICE_KEY_STORAGE);
    if (secure) {
      // Remove resíduo legado em AsyncStorage no nativo
      await AsyncStorage.removeItem(DEVICE_KEY_STORAGE).catch(() => {});
      return secure;
    }
  } catch (err) {
    console.error("[deviceBackupKey] Erro ao carregar chave do SecureStore:", err);
    // Se o SecureStore falhar na leitura (ex.: keystore corrompido ou bloqueado),
    // tenta verificar se há cópia legada em AsyncStorage como fallback emergencial
    const legacy = await AsyncStorage.getItem(DEVICE_KEY_STORAGE).catch(() => null);
    if (legacy) return legacy;
    // Se não há legado, propaga o erro para não presumir chave ausente
    throw err;
  }

  // Se o SecureStore respondeu null (não há chave no SecureStore), verifica legado em AsyncStorage
  try {
    const legacy = await AsyncStorage.getItem(DEVICE_KEY_STORAGE);
    if (legacy && legacy.trim()) {
      const trimmedLegacy = legacy.trim();
      try {
        await SecureStore.setItemAsync(DEVICE_KEY_STORAGE, trimmedLegacy);
        await AsyncStorage.removeItem(DEVICE_KEY_STORAGE);
      } catch (migrationErr) {
        console.error(
          "[deviceBackupKey] Falha ao migrar chave legada para SecureStore:",
          migrationErr
        );
        // Mantém no AsyncStorage para o usuário não perder backups existentes
      }
      return trimmedLegacy;
    }
  } catch (err) {
    console.error("[deviceBackupKey] Erro ao ler chave legada de AsyncStorage:", err);
  }

  return null;
}

let inFlightPromise: Promise<string> | null = null;

/**
 * Gera (ou retorna existente) a chave de dispositivo usada no auto-backup.
 * Salva a nova chave estritamente no armazenamento seguro, nunca no AsyncStorage.
 * Protegido contra condições de corrida por promessa em voo.
 */
export async function getOrCreateDeviceBackupKey(): Promise<string> {
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = (async () => {
    try {
      const existing = await getDeviceBackupKey();
      if (existing) return existing;

      const newKey = generateDeviceBackupKey();
      await saveSecureDeviceKey(newKey);
      return newKey;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Remove a chave de dispositivo do armazenamento seguro e do AsyncStorage.
 */
export async function clearDeviceBackupKey(): Promise<void> {
  await deleteSecureDeviceKey();
  if (!isWeb()) {
    await AsyncStorage.removeItem(DEVICE_KEY_STORAGE).catch(() => {});
  }
}
