// Recebimento e decifragem de chaves de IA e OCR sincronizadas no Grupo forte (Story 10.5).
//
// Módulo puro: sem `react-native` nem `expo-secure-store` diretos — testável no
// Vitest. Aplica todas as guardas obrigatórias antes de decifrar e gravar:
//   - aparelho nativo (!isWeb)
//   - fora do modo demo (!isDemoActive)
//   - evento vindo do Grupo forte (isStrongGroup === true)
//   - opt-in local ligado (getKeySyncOptIn() === true)
//   - segredo de Grupo forte válido (parseGroupSecret)

import type { SyncEvent } from "@packages/storage/src/eventStore";
import { sortEvents } from "@packages/storage/src/eventOrder";
import { parseGroupSecret } from "./groupSecret";
import {
  decryptSyncedKey,
  isSyncedKeySlot,
  KEY_SYNC_EVENT_TYPE,
  type KeySyncPayload,
  type SyncedKeySlot,
} from "./keySyncCipher";
import { getKeySyncOptIn } from "./keySyncOptIn";
import { AI_SYNCED_PROVIDERS, type AISyncedProvider } from "./keySyncPublisher";

export interface ApplyIncomingKeySyncEventsParams {
  events: readonly SyncEvent[];
  isStrongGroup: boolean;
  isDemoActive: boolean;
  isWeb?: boolean;
  getOptIn?: () => Promise<boolean>;
  loadStrongGroupSecret: () => Promise<string | null>;
  storeAIKey: (provider: AISyncedProvider, apiKey: string) => Promise<void>;
  storeOCRKey: (apiKey: string) => Promise<void>;
  handledIds?: Set<string>;
}

export interface ApplyIncomingKeySyncEventsResult {
  applied: number;
  ignored: number;
  rejected: number;
}

const isWebEnv = (): boolean => process.env.EXPO_OS === "web";

function parseKeySyncPayload(raw: unknown): KeySyncPayload | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return null;
  }
  const candidate = obj as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) {
    return null;
  }
  if (!isSyncedKeySlot(candidate.slot)) {
    return null;
  }
  if (typeof candidate.ciphertext !== "string") {
    return null;
  }
  return {
    slot: candidate.slot,
    ciphertext: candidate.ciphertext,
    schemaVersion: 1,
  };
}

function aiProviderFromSlot(slot: SyncedKeySlot): AISyncedProvider | null {
  if (!slot.startsWith("ai:")) return null;
  const provider = slot.slice(3);
  return (AI_SYNCED_PROVIDERS as readonly string[]).includes(provider)
    ? (provider as AISyncedProvider)
    : null;
}

/**
 * Filtra, ordena e decifra eventos `KEY_SYNC_UPDATED` vindos do Grupo forte,
 * gravando apenas chaves válidas nos respectivos armazenamentos locais.
 * Rejeita silenciosamente payloads inválidos ou adulterados sem apagar chaves existentes.
 */
export async function applyIncomingKeySyncEvents(
  params: ApplyIncomingKeySyncEventsParams,
): Promise<ApplyIncomingKeySyncEventsResult> {
  const keySyncEvents = params.events.filter(
    (evt): evt is SyncEvent => Boolean(evt && evt.type === KEY_SYNC_EVENT_TYPE),
  );

  if (keySyncEvents.length === 0) {
    return { applied: 0, ignored: 0, rejected: 0 };
  }

  const isWeb = params.isWeb ?? isWebEnv();
  if (isWeb || params.isDemoActive || params.isStrongGroup !== true) {
    return { applied: 0, ignored: keySyncEvents.length, rejected: 0 };
  }

  let ignored = 0;
  const pendingEvents: SyncEvent[] = [];
  const batchIds = new Set<string>();
  for (const evt of keySyncEvents) {
    const hasId = typeof evt.id === "string" && evt.id.length > 0;
    if (hasId && (params.handledIds?.has(evt.id) || batchIds.has(evt.id))) {
      ignored++;
    } else {
      if (hasId) batchIds.add(evt.id);
      pendingEvents.push(evt);
    }
  }

  if (pendingEvents.length === 0) {
    return { applied: 0, ignored, rejected: 0 };
  }

  try {
    const optedIn = await (params.getOptIn ?? getKeySyncOptIn)();
    if (!optedIn) {
      return { applied: 0, ignored: keySyncEvents.length, rejected: 0 };
    }

    const rawSecret = await params.loadStrongGroupSecret();
    if (!rawSecret) {
      return { applied: 0, ignored: keySyncEvents.length, rejected: 0 };
    }

    const parsed = parseGroupSecret(rawSecret);
    if (!parsed.ok) {
      return { applied: 0, ignored: keySyncEvents.length, rejected: 0 };
    }

    let applied = 0;
    let rejected = 0;

    try {
      const stillOptedIn = await (params.getOptIn ?? getKeySyncOptIn)();
      if (!stillOptedIn) {
        return { applied: 0, ignored: keySyncEvents.length, rejected: 0 };
      }

      const ordered = sortEvents(pendingEvents);

      for (const evt of ordered) {
        const payload = parseKeySyncPayload(evt.payload);
        if (!payload) {
          rejected++;
          continue;
        }

        const decrypted = decryptSyncedKey({
          secret: parsed.secret,
          slot: payload.slot,
          ciphertext: payload.ciphertext,
        });
        if (!decrypted.ok) {
          rejected++;
          continue;
        }

        try {
          if (payload.slot === "ocr:cloud_vision") {
            await params.storeOCRKey(decrypted.apiKey);
          } else {
            const provider = aiProviderFromSlot(payload.slot);
            if (!provider) {
              rejected++;
              continue;
            }
            await params.storeAIKey(provider, decrypted.apiKey);
          }

          applied++;
          if (params.handledIds && typeof evt.id === "string" && evt.id.length > 0) {
            params.handledIds.add(evt.id);
          }
        } catch {
          rejected++;
        }
      }

      return { applied, ignored, rejected };
    } finally {
      parsed.secret.fill(0);
    }
  } catch {
    return { applied: 0, ignored: keySyncEvents.length, rejected: 0 };
  }
}
