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
import {
  createCachedStorageFlag,
  type CachedReadResult,
  type KeyValueStorage,
} from "@/src/modules/privacy/cachedStorageFlag";

export type { KeyValueStorage };

export const PERSONALIZED_ADS_KEY = "domus_personalized_ads_v1";

export interface AdRequestOptions {
  requestNonPersonalizedAdsOnly: boolean;
}

const defaultStorage: KeyValueStorage = AsyncStorage;
const flagStore = createCachedStorageFlag<boolean>(defaultStorage);

/** Puro: monta as opções de pedido a partir do consentimento. */
export function adRequestOptions(consent: boolean): AdRequestOptions {
  return { requestNonPersonalizedAdsOnly: consent !== true };
}

/** Puro: indica se há algum modo de apoio que solicita anúncios do Google. */
export function hasAdSupportMode(modes: Iterable<string>): boolean {
  for (const mode of modes) {
    if (mode !== "links") return true;
  }
  return false;
}

/** Puro: determina se um componente de anúncio pode iniciar pedido na plataforma atual. */
export function shouldRequestAd(
  enabled: boolean,
  loaded: boolean,
  isWebEnv: boolean,
): boolean {
  return enabled && loaded && !isWebEnv;
}

export function subscribePersonalizedAdsConsent(
  listener: (consent: boolean) => void,
): () => void {
  return flagStore.subscribe(listener);
}

/** Último valor lido nesta sessão, ou null se ainda não carregou. */
export function getCachedPersonalizedAdsConsent(): boolean | null {
  return flagStore.getCached();
}

/** Só para testes: esquece o cache e os assinantes. */
export function resetPersonalizedAdsConsentCache(): void {
  flagStore.reset();
}

async function readFromStorage(
  storage: KeyValueStorage,
): Promise<CachedReadResult<boolean>> {
  try {
    return {
      value: (await storage.getItem(PERSONALIZED_ADS_KEY)) === "true",
      cacheable: true,
    };
  } catch {
    // Falha de leitura: trata como sem consentimento
    return { value: false, cacheable: true };
  }
}

/** Lê o consentimento. Ausente, inválido ou com falha de leitura: `false`. */
export async function loadPersonalizedAdsConsent(
  storage: KeyValueStorage = defaultStorage,
): Promise<boolean> {
  return flagStore.load(storage, readFromStorage);
}

async function writeConsentToStorage(
  consent: boolean,
  storage: KeyValueStorage,
  isDefault: boolean,
): Promise<void> {
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
      if (isDefault) flagStore.notify(false);
    }
    throw err;
  }
  if (isDefault) flagStore.notify(consent);
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
  return flagStore.enqueueWrite(storage, () =>
    writeConsentToStorage(consent, storage, isDefault),
  );
}

/** Opções de pedido para o próximo anúncio, lendo o consentimento atual. */
export async function getAdRequestOptions(
  storage: KeyValueStorage = defaultStorage,
): Promise<AdRequestOptions> {
  return adRequestOptions(await loadPersonalizedAdsConsent(storage));
}
