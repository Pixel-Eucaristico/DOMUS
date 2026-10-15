import AsyncStorage from "@react-native-async-storage/async-storage";
import { createWebSecretStore, type KeyVault } from "./webSecretStore";

// Instância padrão para a web: chave AES não extraível no IndexedDB, segredos cifrados no AsyncStorage.

const DB_NAME = "domus_secure";
const STORE_NAME = "keys";
const KEY_ID = "master-v1";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const indexedDbVault: KeyVault = {
  async load() {
    const db = await openDb();
    const value = await request(db.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY_ID));
    return (value as CryptoKey | undefined) ?? null;
  },
  async save(key) {
    const db = await openDb();
    await request(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(key, KEY_ID));
  },
};

export const webSecrets = createWebSecretStore({
  vault: indexedDbVault,
  storage: AsyncStorage,
  getCrypto: () => (typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto),
});
