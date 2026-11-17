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

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const defaultStorage: KeyValueStorage = AsyncStorage;

// ─── Cache em memória + assinantes (várias telas leem a mesma flag) ─────────

let cached: ExternalLookupsSettings | null = null;
let pending: Promise<ExternalLookupsSettings> | null = null;
let cacheEpoch = 0;
let writeTail: Promise<unknown> = Promise.resolve();
let activeWrites = 0;
const listeners = new Set<(s: ExternalLookupsSettings) => void>();

function publish(next: ExternalLookupsSettings): void {
  cached = next;
  listeners.forEach((l) => {
    try {
      l(next);
    } catch {
      // Isola erro de assinante individual para não interromper os demais
    }
  });
}

export function subscribeExternalLookups(
  listener: (s: ExternalLookupsSettings) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Último valor lido nesta sessão, ou null se ainda não carregou. */
export function getCachedExternalLookups(): ExternalLookupsSettings | null {
  return cached;
}

/** Só para testes: esquece o cache e os assinantes. */
export function resetExternalLookupsCache(): void {
  cacheEpoch += 1;
  cached = null;
  pending = null;
  writeTail = Promise.resolve();
  activeWrites = 0;
  listeners.clear();
}

interface ReadResult {
  settings: ExternalLookupsSettings;
  cacheable: boolean;
}

async function readFromStorage(
  storage: KeyValueStorage,
): Promise<ReadResult> {
  let raw: string | null = null;
  try {
    raw = await storage.getItem(EXTERNAL_LOOKUPS_KEY);
  } catch {
    // Falha transitória de leitura: trata como desligada sem fixar no cache
    return { settings: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: false };
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const obj = parsed as Partial<ExternalLookupsSettings>;
        return {
          settings: {
            enabled: obj.enabled === true,
            noticeShown: obj.noticeShown !== false,
          },
          cacheable: true,
        };
      }
      return { settings: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: true };
    } catch {
      return { settings: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: true };
    }
  }

  // Primeira leitura sem a chave: decide pela chave da introdução (decisão D-B)
  let existingUser = false;
  try {
    existingUser = (await storage.getItem(WELCOME_KEY)) !== null;
  } catch {
    // Falha ao ler WELCOME_KEY: não persiste como instalação nova para não perder o aviso
    return { settings: { ...DEFAULT_EXTERNAL_LOOKUPS }, cacheable: false };
  }

  const initial: ExternalLookupsSettings = existingUser
    ? { enabled: true, noticeShown: false }
    : { enabled: false, noticeShown: true };
  try {
    await storage.setItem(EXTERNAL_LOOKUPS_KEY, JSON.stringify(initial));
  } catch {
    // ignora — a próxima abertura decide de novo
  }
  return { settings: initial, cacheable: true };
}

/**
 * Lê a flag. Na primeira leitura sem chave, quem já usa o app (com
 * `domus_welcome_done_v1`) começa ligado e com aviso pendente; instalação nova
 * começa desligada e sem aviso. A decisão é gravada.
 */
export async function loadExternalLookups(
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  if (storage === defaultStorage) {
    if (cached) return cached;
    if (!pending) {
      const startEpoch = cacheEpoch;
      const run = readFromStorage(storage)
        .then(({ settings, cacheable }) => {
          if (cacheEpoch !== startEpoch) return settings;
          // Uma gravação feita durante a leitura vence
          if (!cached && cacheable) publish(settings);
          return cached ?? settings;
        })
        .finally(() => {
          if (pending === run) pending = null;
        });
      pending = run;
    }
    return pending;
  }
  return (await readFromStorage(storage)).settings;
}

async function save(
  next: ExternalLookupsSettings,
  storage: KeyValueStorage,
): Promise<void> {
  // Grava primeiro: se falhar, o interruptor não mostra um valor que não ficou salvo
  await storage.setItem(EXTERNAL_LOOKUPS_KEY, JSON.stringify(next));
  if (storage === defaultStorage) publish(next);
}

function enqueueDefaultWrite<T>(fn: () => Promise<T>): Promise<T> {
  if (activeWrites === 0) {
    activeWrites += 1;
    const run = fn().finally(() => {
      activeWrites = Math.max(0, activeWrites - 1);
    });
    writeTail = run.catch(() => {});
    return run;
  }
  activeWrites += 1;
  const chained = writeTail.then(fn, fn).finally(() => {
    activeWrites = Math.max(0, activeWrites - 1);
  });
  writeTail = chained.catch(() => {});
  return chained;
}

export async function setExternalLookupsEnabled(
  enabled: boolean,
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  const op = async () => {
    const current = await loadExternalLookups(storage);
    const next = { ...current, enabled };
    await save(next, storage);
    return next;
  };
  return storage === defaultStorage ? enqueueDefaultWrite(op) : op();
}

export async function markExternalLookupsNoticeShown(
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  const op = async () => {
    const current = await loadExternalLookups(storage);
    if (current.noticeShown) return current;
    const next = { ...current, noticeShown: true };
    await save(next, storage);
    return next;
  };
  return storage === defaultStorage ? enqueueDefaultWrite(op) : op();
}
