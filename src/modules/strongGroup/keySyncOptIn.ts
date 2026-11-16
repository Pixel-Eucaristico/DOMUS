// ─── Opt-in de sincronização de chaves de IA e OCR (Story 10.3) ───────────────
//
// Flag estritamente local por aparelho em AsyncStorage (`domus_key_sync_opt_in_v1`).
// Começa desligada (`false`), só pode ser exibida e ativada em aparelho nativo
// conectado a um Grupo forte, e nunca gera evento `SETTING_CHANGED`.
//
// `process.env.EXPO_OS` é trocado pela plataforma no build do Expo e dispensa
// importar `react-native`, mantendo o módulo testável no Vitest.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEY_SYNC_OPT_IN_KEY = "domus_key_sync_opt_in_v1";

export interface KeySyncDisableNotice {
  readonly title: string;
  readonly message: string;
}

export const KEY_SYNC_DISABLE_NOTICE: KeySyncDisableNotice = Object.freeze({
  title: "Sincronização de chaves desligada",
  message:
    "Este aparelho parou de publicar e de receber chaves de IA e OCR. As chaves já salvas continuam no armazenamento seguro deste aparelho. Eventos cifrados já publicados continuam nos relays públicos e não podem ser apagados; para invalidá-los, troque a chave no provedor.",
});

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface CanShowKeySyncOptionParams {
  isStrongGroup: boolean;
  isWeb?: boolean;
}

export interface KeySyncOptInOptions {
  storage?: KeyValueStorage;
  isWeb?: boolean;
}

const defaultStorage: KeyValueStorage = AsyncStorage;

const isWebEnv = (): boolean => process.env.EXPO_OS === "web";

// ─── Cache em memória + assinantes ──────────────────────────────────────────

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;
const listeners = new Set<(enabled: boolean) => void>();

function notifyListeners(enabled: boolean): void {
  listeners.forEach((listener) => {
    try {
      listener(enabled);
    } catch {
      // Isola falha de assinante para não interromper os demais nem rejeitar setKeySyncOptIn
    }
  });
}

/**
 * Informa se a opção de sincronizar chaves de IA e OCR pode ser exibida.
 * Só retorna `true` em aparelho nativo com Grupo forte ativo.
 */
export function canShowKeySyncOption({
  isStrongGroup,
  isWeb = isWebEnv(),
}: CanShowKeySyncOptionParams): boolean {
  return !isWeb && isStrongGroup === true;
}

/** Assina mudanças locais da flag de opt-in. */
export function subscribeKeySyncOptIn(
  listener: (enabled: boolean) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Só para testes: limpa o cache em memória e os assinantes. */
export function resetKeySyncOptInCache(): void {
  cached = null;
  pending = null;
  listeners.clear();
}

async function readFromStorage(storage: KeyValueStorage): Promise<boolean> {
  try {
    const raw = await storage.getItem(KEY_SYNC_OPT_IN_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

/**
 * Lê o estado local do opt-in.
 * Na web sempre retorna `false` sem tocar no storage.
 * Apenas o valor exato `"true"` ativa; qualquer outro valor ou erro retorna `false`.
 */
export async function getKeySyncOptIn(
  options: KeySyncOptInOptions = {},
): Promise<boolean> {
  const isWeb = options.isWeb ?? isWebEnv();
  if (isWeb) return false;

  const storage = options.storage ?? defaultStorage;
  if (storage === defaultStorage) {
    if (cached !== null) return cached;
    if (!pending) {
      pending = readFromStorage(storage)
        .then((enabled) => {
          // Uma gravação concluída durante a leitura tem prioridade
          if (cached === null) cached = enabled;
          return cached;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  }

  return readFromStorage(storage);
}

/**
 * Atualiza o opt-in local no `AsyncStorage` do aparelho.
 * Na web é no-op e retorna `false` sem gravar nada.
 * Grava antes de atualizar cache/assinantes para evitar estado divergente em caso de erro.
 */
export async function setKeySyncOptIn(
  enabled: boolean,
  options: KeySyncOptInOptions = {},
): Promise<boolean> {
  const isWeb = options.isWeb ?? isWebEnv();
  if (isWeb) return false;

  const storage = options.storage ?? defaultStorage;
  const next = enabled === true;
  await storage.setItem(KEY_SYNC_OPT_IN_KEY, next ? "true" : "false");
  if (storage === defaultStorage) {
    cached = next;
  }
  notifyListeners(next);
  return next;
}

export interface DisableKeySyncOptInOptions extends KeySyncOptInOptions {
  onNotice?: (notice: KeySyncDisableNotice) => void;
}

export interface DisableKeySyncOptInResult {
  disabled: boolean;
}

/**
 * Desliga o opt-in local de sincronização de chaves (Story 10.6).
 * Na web é no-op e retorna `{ disabled: false }` sem tocar no storage nem emitir aviso.
 * Em aparelho nativo, persiste `"false"` e aciona `onNotice` somente após gravação bem-sucedida.
 */
export async function disableKeySyncOptIn(
  options: DisableKeySyncOptInOptions = {},
): Promise<DisableKeySyncOptInResult> {
  const isWeb = options.isWeb ?? isWebEnv();
  if (isWeb) return { disabled: false };

  await setKeySyncOptIn(false, options);
  try {
    options.onNotice?.(KEY_SYNC_DISABLE_NOTICE);
  } catch {
    // Isola falha de UI para não acionar rollback após a persistência já concluída
  }
  return { disabled: true };
}

export interface ToggleKeySyncOptInParams extends KeySyncOptInOptions {
  nextValue: boolean;
  previousValue: boolean;
  setEnabled: (enabled: boolean) => void;
  onEnabled?: () => void;
  onNotice?: (notice: KeySyncDisableNotice) => void;
  onError?: () => void;
}

/**
 * Orquestra o toggle do opt-in de sincronização de chaves com rollback em caso de erro.
 */
export async function toggleKeySyncOptIn({
  nextValue,
  previousValue,
  setEnabled,
  onEnabled,
  onNotice,
  onError,
  ...options
}: ToggleKeySyncOptInParams): Promise<void> {
  try {
    if (nextValue) {
      const saved = await setKeySyncOptIn(true, options);
      setEnabled(saved);
      if (saved) {
        onEnabled?.();
      }
    } else {
      await disableKeySyncOptIn({ ...options, onNotice });
      setEnabled(false);
    }
  } catch {
    setEnabled(previousValue);
    onError?.();
  }
}
