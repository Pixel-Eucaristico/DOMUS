// Publicação de chaves de IA e OCR cifradas para o Grupo forte (Story 10.4).
//
// Módulo puro: sem `react-native` nem `expo-secure-store` diretos — testável no
// Vitest. Aplica todas as guardas obrigatórias antes de emitir `KEY_SYNC_UPDATED`:
//   - aparelho nativo (!isWeb)
//   - fora do modo demo (!isDemoActive)
//   - opt-in local ligado (getKeySyncOptIn() === true)
//   - segredo de Grupo forte válido (parseGroupSecret)

import { createEvent } from "@packages/events/src/factory";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { parseGroupSecret } from "./groupSecret";
import {
  encryptSyncedKey,
  KEY_SYNC_EVENT_TYPE,
  isSyncedKeySlot,
  type KeySyncPayload,
  type SyncedKeySlot,
} from "./keySyncCipher";
import { getKeySyncOptIn } from "./keySyncOptIn";

export const AI_SYNCED_PROVIDERS = [
  "openai",
  "gemini",
  "claude",
  "deepseek",
  "qwen",
  "elevenlabs",
] as const;

export type AISyncedProvider = (typeof AI_SYNCED_PROVIDERS)[number];

export function slotForAIProvider(provider: string): SyncedKeySlot | null {
  const candidate = `ai:${provider}`;
  return isSyncedKeySlot(candidate) ? candidate : null;
}

export interface BuildEncryptedKeySyncEventParams {
  secret: Uint8Array;
  slot: SyncedKeySlot;
  apiKey: string;
  deviceId: string;
  rng?: (n: number) => Uint8Array;
}

/**
 * Monta um `SyncEvent` do tipo `KEY_SYNC_UPDATED` contendo apenas `{ slot, ciphertext, schemaVersion: 1 }`.
 */
export function buildEncryptedKeySyncEvent(
  params: BuildEncryptedKeySyncEventParams,
): SyncEvent {
  const ciphertext = encryptSyncedKey({
    secret: params.secret,
    slot: params.slot,
    apiKey: params.apiKey,
    rng: params.rng,
  });

  const payload: KeySyncPayload = {
    slot: params.slot,
    ciphertext,
    schemaVersion: 1,
  };

  return createEvent<SyncEvent>(
    KEY_SYNC_EVENT_TYPE,
    payload,
    params.deviceId || "local",
  );
}

export interface CollectLocalKeysParams {
  retrieveAIKey: (provider: AISyncedProvider) => Promise<string | null>;
  loadOCRKey: () => Promise<string | null>;
}

export interface CollectedLocalKey {
  slot: SyncedKeySlot;
  apiKey: string;
}

/**
 * Coleta todas as chaves locais não vazias de IA e OCR prontas para cifragem.
 * Falhas individuais de leitura são isoladas para não abortar os demais slots.
 */
export async function collectLocalKeysForSync(
  params: CollectLocalKeysParams,
): Promise<CollectedLocalKey[]> {
  const aiEntries = await Promise.all(
    AI_SYNCED_PROVIDERS.map(async (provider): Promise<CollectedLocalKey | null> => {
      try {
        const apiKey = await params.retrieveAIKey(provider);
        if (typeof apiKey !== "string" || apiKey.trim().length === 0) return null;
        return { slot: `ai:${provider}`, apiKey };
      } catch {
        return null;
      }
    }),
  );

  let ocrEntry: CollectedLocalKey | null = null;
  try {
    const ocrKey = await params.loadOCRKey();
    if (typeof ocrKey === "string" && ocrKey.trim().length > 0) {
      ocrEntry = { slot: "ocr:cloud_vision", apiKey: ocrKey };
    }
  } catch {
    ocrEntry = null;
  }

  const collected: CollectedLocalKey[] = [];
  for (const entry of aiEntries) {
    if (entry) collected.push(entry);
  }
  if (ocrEntry) collected.push(ocrEntry);
  return collected;
}

export interface PublishEncryptedKeyParams {
  slot: SyncedKeySlot;
  apiKey: string;
  deviceId: string;
  isDemoActive: boolean;
  isWeb?: boolean;
  getOptIn?: () => Promise<boolean>;
  loadStrongGroupSecret: () => Promise<string | null>;
  dispatch: (event: SyncEvent) => void;
  rng?: (n: number) => Uint8Array;
}

const isWebEnv = (): boolean => process.env.EXPO_OS === "web";

/**
 * Publica um evento `KEY_SYNC_UPDATED` cifrado se e somente se:
 * aparelho nativo, fora do modo demo, opt-in ligado e Grupo forte válido.
 */
export async function publishEncryptedKeyIfOptedIn(
  params: PublishEncryptedKeyParams,
): Promise<boolean> {
  const isWeb = params.isWeb ?? isWebEnv();
  if (isWeb || params.isDemoActive) return false;
  if (typeof params.apiKey !== "string" || params.apiKey.trim().length === 0) {
    return false;
  }

  try {
    const optedIn = await (params.getOptIn ?? getKeySyncOptIn)();
    if (!optedIn) return false;

    const rawSecret = await params.loadStrongGroupSecret();
    if (!rawSecret) return false;

    const parsed = parseGroupSecret(rawSecret);
    if (!parsed.ok) return false;

    try {
      const event = buildEncryptedKeySyncEvent({
        secret: parsed.secret,
        slot: params.slot,
        apiKey: params.apiKey,
        deviceId: params.deviceId,
        rng: params.rng,
      });
      params.dispatch(event);
      return true;
    } finally {
      parsed.secret.fill(0);
    }
  } catch {
    return false;
  }
}

export interface PublishAllLocalKeysParams {
  deviceId: string;
  isDemoActive: boolean;
  isWeb?: boolean;
  getOptIn?: () => Promise<boolean>;
  loadStrongGroupSecret: () => Promise<string | null>;
  retrieveAIKey: (provider: AISyncedProvider) => Promise<string | null>;
  loadOCRKey: () => Promise<string | null>;
  dispatch: (event: SyncEvent) => void;
  rng?: (n: number) => Uint8Array;
}

/**
 * Publica todas as chaves locais salvas (IA e OCR) ao ativar o opt-in no aparelho.
 * Retorna a quantidade de eventos emitidos.
 */
export async function publishAllLocalKeysIfOptedIn(
  params: PublishAllLocalKeysParams,
): Promise<number> {
  const isWeb = params.isWeb ?? isWebEnv();
  if (isWeb || params.isDemoActive) return 0;

  try {
    const optedIn = await (params.getOptIn ?? getKeySyncOptIn)();
    if (!optedIn) return 0;

    const rawSecret = await params.loadStrongGroupSecret();
    if (!rawSecret) return 0;

    const parsed = parseGroupSecret(rawSecret);
    if (!parsed.ok) return 0;

    try {
      const keys = await collectLocalKeysForSync({
        retrieveAIKey: params.retrieveAIKey,
        loadOCRKey: params.loadOCRKey,
      });
      const stillOptedIn = await (params.getOptIn ?? getKeySyncOptIn)();
      if (!stillOptedIn) return 0;

      let published = 0;
      for (const entry of keys) {
        try {
          const event = buildEncryptedKeySyncEvent({
            secret: parsed.secret,
            slot: entry.slot,
            apiKey: entry.apiKey,
            deviceId: params.deviceId,
            rng: params.rng,
          });
          params.dispatch(event);
          published++;
        } catch {
          continue;
        }
      }
      return published;
    } finally {
      parsed.secret.fill(0);
    }
  } catch {
    return 0;
  }
}
