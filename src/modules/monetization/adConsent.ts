// ─── Consentimento de anúncio personalizado (D9, Story 12.4) ────────────────
//
// Fonte única do consentimento e das `requestOptions` de todos os anúncios do
// Google (abertura do app, intersticial diário, banner e nativo). Sem
// consentimento, todo pedido é não personalizado.
//
// Estado do aparelho em AsyncStorage, sem Evento no log (AD-6). Padrão `false`,
// inclusive para quem já usa o app. O armazenamento é injetável, para que os
// testes não dependam do módulo nativo.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const PERSONALIZED_ADS_KEY = "domus_personalized_ads_v1";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
}

export interface AdRequestOptions {
  requestNonPersonalizedAdsOnly: boolean;
}

const defaultStorage: KeyValueStorage = AsyncStorage;

/** Puro: monta as opções de pedido a partir do consentimento. */
export function adRequestOptions(consent: boolean): AdRequestOptions {
  return { requestNonPersonalizedAdsOnly: consent !== true };
}

// ─── Cache em memória + assinantes (vários anúncios leem o mesmo valor) ─────

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;
const listeners = new Set<(consent: boolean) => void>();

function publish(next: boolean): void {
  cached = next;
  listeners.forEach((l) => l(next));
}

export function subscribePersonalizedAdsConsent(
  listener: (consent: boolean) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Último valor lido nesta sessão, ou null se ainda não carregou. */
export function getCachedPersonalizedAdsConsent(): boolean | null {
  return cached;
}

/** Só para testes: esquece o cache e os assinantes. */
export function resetPersonalizedAdsConsentCache(): void {
  cached = null;
  pending = null;
  listeners.clear();
}

async function readFromStorage(storage: KeyValueStorage): Promise<boolean> {
  try {
    return (await storage.getItem(PERSONALIZED_ADS_KEY)) === "true";
  } catch {
    // Falha de leitura: trata como sem consentimento
    return false;
  }
}

/** Lê o consentimento. Ausente, inválido ou com falha de leitura: `false`. */
export async function loadPersonalizedAdsConsent(
  storage: KeyValueStorage = defaultStorage,
): Promise<boolean> {
  if (storage !== defaultStorage) return readFromStorage(storage);
  if (cached !== null) return cached;
  if (!pending) {
    pending = readFromStorage(storage).then((v) => {
      // Uma gravação feita durante a leitura vence
      if (cached === null) publish(v);
      pending = null;
      return cached ?? v;
    });
  }
  return pending;
}

/**
 * Grava o consentimento. Vale para o próximo anúncio pedido.
 * Revogar (`false`) vale nesta sessão mesmo se a gravação falhar; conceder só
 * vale se a gravação der certo (o erro é repassado).
 */
export async function setPersonalizedAdsConsent(
  consent: boolean,
  storage: KeyValueStorage = defaultStorage,
): Promise<void> {
  const isDefault = storage === defaultStorage;
  try {
    await storage.setItem(PERSONALIZED_ADS_KEY, consent ? "true" : "false");
  } catch (err) {
    if (!consent) {
      // Revogar com falha: tenta apagar a chave (ausente = sem consentimento),
      // para o personalizado não voltar na próxima abertura
      try {
        await storage.removeItem?.(PERSONALIZED_ADS_KEY);
      } catch {
        // best-effort
      }
      if (isDefault) publish(false);
    }
    throw err;
  }
  if (isDefault) publish(consent);
}

/** Opções de pedido para o próximo anúncio, lendo o consentimento atual. */
export async function getAdRequestOptions(
  storage: KeyValueStorage = defaultStorage,
): Promise<AdRequestOptions> {
  return adRequestOptions(await loadPersonalizedAdsConsent(storage));
}
