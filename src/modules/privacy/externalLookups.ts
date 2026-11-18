// ─── Flag "Consultas de itens, preços e ícones" (Story 12.6) ─────────────────
//
// Flag única de aparelho em AsyncStorage (AD-6) que controla os quatro envios
// não cobertos pela flag da IA: código de barras (Open Food Facts / Cosmos),
// tabela NCM (Siscomex), atualização automática de preços e ícones das lojas
// (favicon do Google).
//
// Padrão: instalação nova começa desligada; quem já usa (com `domus_welcome_done_v1`)
// começa ligado e recebe um aviso único (decisão D-B). Enquanto carrega, tratar
// como desligada.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createCachedStorageFlag,
  type CachedReadResult,
  type KeyValueStorage,
} from "./cachedStorageFlag";

export type { KeyValueStorage };

export const EXTERNAL_LOOKUPS_KEY = "domus_external_lookups_v1";
export const WELCOME_KEY = "domus_welcome_done_v1";

export interface ExternalLookupsSettings {
  enabled: boolean;
  noticeShown: boolean;
}

export const DEFAULT_EXTERNAL_LOOKUPS: ExternalLookupsSettings = {
  enabled: false,
  noticeShown: true,
};

const defaultStorage: KeyValueStorage = AsyncStorage;
const flagStore = createCachedStorageFlag<ExternalLookupsSettings>(defaultStorage);

export function subscribeExternalLookups(
  listener: (s: ExternalLookupsSettings) => void,
): () => void {
  return flagStore.subscribe(listener);
}

/** Último valor lido nesta sessão, ou null se ainda não carregou. */
export function getCachedExternalLookups(): ExternalLookupsSettings | null {
  return flagStore.getCached();
}

/** Só para testes: esquece o cache e os assinantes. */
export function resetExternalLookupsCache(): void {
  flagStore.reset();
}

async function readFromStorage(
  storage: KeyValueStorage,
): Promise<CachedReadResult<ExternalLookupsSettings>> {
  let raw: string | null = null;
  try {
    raw = await storage.getItem(EXTERNAL_LOOKUPS_KEY);
  } catch {
    // Falha transitória de leitura: trata como desligada sem fixar no cache
    return { value: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: false };
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const obj = parsed as Partial<ExternalLookupsSettings>;
        return {
          value: {
            enabled: obj.enabled === true,
            noticeShown: obj.noticeShown !== false,
          },
          cacheable: true,
        };
      }
      return { value: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: true };
    } catch {
      return { value: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: true };
    }
  }

  // Primeira leitura sem a chave: decide pela chave da introdução (decisão D-B)
  let existingUser = false;
  try {
    existingUser = (await storage.getItem(WELCOME_KEY)) !== null;
  } catch {
    // Falha ao ler WELCOME_KEY: não persiste como instalação nova para não perder o aviso
    return { value: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: false };
  }

  const initial: ExternalLookupsSettings = existingUser
    ? { enabled: true, noticeShown: false }
    : { enabled: false, noticeShown: true };
  try {
    await storage.setItem(EXTERNAL_LOOKUPS_KEY, JSON.stringify(initial));
  } catch {
    // ignora — a próxima abertura decide de novo
  }
  return { value: initial, cacheable: true };
}

/**
 * Lê a flag. Na primeira leitura sem chave, quem já usa o app (com
 * `domus_welcome_done_v1`) começa ligado e com aviso pendente; instalação nova
 * começa desligada e sem aviso. A decisão é gravada.
 */
export async function loadExternalLookups(
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  return flagStore.load(storage, readFromStorage);
}

async function save(
  next: ExternalLookupsSettings,
  storage: KeyValueStorage,
): Promise<void> {
  // Grava primeiro: se falhar, o interruptor não mostra um valor que não ficou salvo
  await storage.setItem(EXTERNAL_LOOKUPS_KEY, JSON.stringify(next));
  if (storage === defaultStorage) flagStore.notify(next);
}

export async function setExternalLookupsEnabled(
  enabled: boolean,
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  return flagStore.enqueueWrite(storage, async () => {
    const current = await loadExternalLookups(storage);
    const next = { ...current, enabled };
    await save(next, storage);
    return next;
  });
}

export async function markExternalLookupsNoticeShown(
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  return flagStore.enqueueWrite(storage, async () => {
    const current = await loadExternalLookups(storage);
    if (current.noticeShown) return current;
    const next = { ...current, noticeShown: true };
    await save(next, storage);
    return next;
  });
}
