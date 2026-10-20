// ─── Flag "Consultas de itens, preços e ícones" (FR-28, Story 12.6) ─────────
//
// Fonte única da flag de aparelho que libera quatro envios a serviços externos:
// consulta de código de barras (Open Food Facts, Cosmos), download da tabela
// NCM (Siscomex), atualização automática de preços (páginas de produto) e
// ícones de lojas (serviço de favicon do Google).
//
// Estado do aparelho em AsyncStorage, sem Evento no log (AD-6). O
// armazenamento é injetável, para que os testes não dependam do módulo nativo.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const EXTERNAL_LOOKUPS_KEY = "domus_external_lookups_v1";
/** Presente = quem já usa o app (mesma chave do DemoModeProvider). */
export const WELCOME_KEY = "domus_welcome_done_v1";

export interface ExternalLookupsSettings {
  /** Flag ligada: os quatro envios externos estão permitidos */
  enabled: boolean;
  /** true depois que o aviso único foi visto (ou não se aplica) */
  noticeShown: boolean;
}

/** Instalação nova: desligada e sem aviso. */
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
const listeners = new Set<(s: ExternalLookupsSettings) => void>();

function publish(next: ExternalLookupsSettings): void {
  cached = next;
  listeners.forEach((l) => l(next));
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
  cached = null;
  pending = null;
  listeners.clear();
}

async function readFromStorage(
  storage: KeyValueStorage,
): Promise<ExternalLookupsSettings> {
  let raw: string | null = null;
  try {
    raw = await storage.getItem(EXTERNAL_LOOKUPS_KEY);
  } catch {
    // Falha de leitura: trata como desligada, sem gravar nada
    return { ...DEFAULT_EXTERNAL_LOOKUPS };
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ExternalLookupsSettings>;
      return {
        enabled: parsed.enabled === true,
        noticeShown: parsed.noticeShown !== false,
      };
    } catch {
      return { ...DEFAULT_EXTERNAL_LOOKUPS };
    }
  }

  // Primeira leitura sem a chave: decide pela chave da introdução (decisão D-B)
  let existingUser = false;
  try {
    existingUser = (await storage.getItem(WELCOME_KEY)) !== null;
  } catch {
    existingUser = false;
  }
  const initial: ExternalLookupsSettings = existingUser
    ? { enabled: true, noticeShown: false }
    : { enabled: false, noticeShown: true };
  try {
    await storage.setItem(EXTERNAL_LOOKUPS_KEY, JSON.stringify(initial));
  } catch {
    // ignora — a próxima abertura decide de novo
  }
  return initial;
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
      pending = readFromStorage(storage).then((s) => {
        // Uma gravação feita durante a leitura vence
        if (!cached) publish(s);
        return cached ?? s;
      });
    }
    return pending;
  }
  return readFromStorage(storage);
}

async function save(
  next: ExternalLookupsSettings,
  storage: KeyValueStorage,
): Promise<void> {
  // Grava primeiro: se falhar, o interruptor não mostra um valor que não ficou salvo
  await storage.setItem(EXTERNAL_LOOKUPS_KEY, JSON.stringify(next));
  if (storage === defaultStorage) publish(next);
}

export async function setExternalLookupsEnabled(
  enabled: boolean,
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  const current = await loadExternalLookups(storage);
  const next = { ...current, enabled };
  await save(next, storage);
  return next;
}

export async function markExternalLookupsNoticeShown(
  storage: KeyValueStorage = defaultStorage,
): Promise<ExternalLookupsSettings> {
  const current = await loadExternalLookups(storage);
  if (current.noticeShown) return current;
  const next = { ...current, noticeShown: true };
  await save(next, storage);
  return next;
}
