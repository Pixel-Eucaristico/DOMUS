// Orquestração do Grupo forte (Story 4.3): criação de novos grupos com segredo
// de 256 bits, persistência segura sem queda para AsyncStorage e carregamento
// priorizado no boot com compatibilidade para grupos legados.
// Story 4.9: Corte definitivo do canal legado por data e versão mínima.

import {
  generateGroupSecret,
  encodeGroupSecret,
  parseGroupSecret,
  deriveStrongGroupKeys,
} from "@/src/modules/strongGroup/groupSecret";
import {
  loadStrongGroupSecret,
  saveStrongGroupSecret,
  clearStrongGroupSecret,
  loadGroupCode,
  clearGroupCode,
} from "./syncStorage";
import { deriveKeysFromCode, type NostrSyncKeys } from "@/src/modules/nostrSync";
import type { SyncEvent } from "@packages/storage/src/eventStore";

export interface ActiveSyncGroup {
  code: string;
  isStrong: boolean;
  keys: NostrSyncKeys;
}

export interface CoexistingGroups {
  strong: ActiveSyncGroup | null;
  legacy: ActiveSyncGroup | null;
  legacyCutoff?: boolean;
  legacyCutoffReason?: "cutoff_date" | "version_deprecated" | null;
  legacyCode?: string | null;
}

export const LEGACY_CODE_DISCONTINUED_MESSAGE =
  "Códigos de 6 caracteres foram descontinuados. Use o QR Code ou cole o Segredo de 79 caracteres do aparelho principal.";

// ── Constantes de Corte do Grupo Antigo (Story 4.9) ─────────────────────────

export const LEGACY_CUTOFF_DATE_ISO = "2026-11-20T00:00:00.000Z";
export const LEGACY_CUTOFF_TIMESTAMP = Date.parse(LEGACY_CUTOFF_DATE_ISO); // 1795132800000
export const LEGACY_MIN_APP_VERSION = "1.8.0";

export const LEGACY_CUTOFF_MESSAGE =
  "A sincronização pelo código antigo foi encerrada por segurança. Migre para o Grupo seguro ou atualize o aplicativo.";

export const LEGACY_VERSION_TOO_OLD_MESSAGE =
  "Esta versão do aplicativo não suporta mais o formato legado de sincronização. Atualize o aplicativo para continuar.";

export const LEGACY_GROUP_CUTOFF_WARNING_TYPE = "LEGACY_GROUP_CUTOFF_WARNING";
export const LEGACY_CUTOFF_WARNING_STORAGE_KEY_PREFIX = "domus_legacy_cutoff_warning_sent_";

/**
 * Compara duas versões semver (ex.: "1.8.0" vs "1.7.9").
 * Retorna 1 se v1 > v2, -1 se v1 < v2, 0 se iguais.
 */
export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) => {
    const [main, prerelease] = (v || "").replace(/^v/i, "").trim().split("-");
    const parts = (main || "").split(".").map((n) => parseInt(n, 10) || 0);
    return { parts, isPrerelease: Boolean(prerelease) };
  };
  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.parts.length, p2.parts.length);
  for (let i = 0; i < len; i++) {
    const a = p1.parts[i] ?? 0;
    const b = p2.parts[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  if (p1.isPrerelease && !p2.isPrerelease) return -1;
  if (!p1.isPrerelease && p2.isPrerelease) return 1;
  return 0;
}

/**
 * Verifica se a data limite de corte do Grupo legado foi atingida.
 */
export function isLegacyCutoffReached(now?: number): boolean {
  const current = typeof now === "number" ? now : Date.now();
  return current >= LEGACY_CUTOFF_TIMESTAMP;
}

/**
 * Verifica se a versão do aplicativo está abaixo da versão mínima para o legado.
 */
export function isAppVersionDeprecatedForLegacy(version?: string): boolean {
  const v = version ?? process.env.EXPO_PUBLIC_APP_VERSION ?? "1.8.0";
  return compareSemver(v, LEGACY_MIN_APP_VERSION) < 0;
}

/**
 * Retorna se o canal legado deve ser completamente desativado (por data ou versão).
 */
export function isLegacySyncDisabled(options?: { now?: number; version?: string }): boolean {
  return isLegacyCutoffReached(options?.now) || isAppVersionDeprecatedForLegacy(options?.version);
}

/**
 * Retorna a razão específica pela qual o canal legado foi desativado.
 */
export function getLegacySyncDisabledReason(options?: {
  now?: number;
  version?: string;
}): "cutoff_date" | "version_deprecated" | null {
  if (isAppVersionDeprecatedForLegacy(options?.version)) return "version_deprecated";
  if (isLegacyCutoffReached(options?.now)) return "cutoff_date";
  return null;
}

/**
 * Cria o evento de aviso prévio de corte a ser publicado no canal legado (Story 4.9).
 */
export function createLegacyCutoffWarningEvent(
  deviceId: string,
  cutoffDate: string = LEGACY_CUTOFF_DATE_ISO,
): SyncEvent {
  return {
    id: `legacy-cutoff-warning-${deviceId}`,
    type: LEGACY_GROUP_CUTOFF_WARNING_TYPE,
    payload: {
      cutoffDate,
      minVersion: LEGACY_MIN_APP_VERSION,
      message:
        "O canal de sincronização legado será encerrado em " +
        cutoffDate +
        ". Atualize o aplicativo e migre para o Grupo seguro com criptografia de ponta a ponta.",
    },
    timestamp: Date.now(),
    deviceId,
    signature: "",
  };
}

/**
 * Cria exclusivamente um novo Grupo forte (Story 4.3).
 * Nunca mais utiliza o gerador legado de 6 caracteres.
 * Persiste o segredo em SecureStore (nativo) ou webSecrets (web) sem queda para AsyncStorage.
 * Aceita a opção keepLegacy para não apagar o código do grupo legado durante a convivência (Story 4.7).
 */
export async function createStrongSyncGroup(options?: { keepLegacy?: boolean }): Promise<ActiveSyncGroup> {
  const secret = generateGroupSecret();
  const code = encodeGroupSecret(secret);
  const strongKeys = deriveStrongGroupKeys(secret);
  secret.fill(0);
  const keys: NostrSyncKeys = {
    privateKey: strongKeys.nostrPrivateKey,
    publicKey: strongKeys.nostrPublicKey,
    encryptionKey: strongKeys.encryptionKey,
    isStrong: true,
  };

  // Persiste de forma segura; se falhar no nativo, lança erro e não conclui
  await saveStrongGroupSecret(code);
  // Limpa código legado anterior se keepLegacy não foi explicitamente solicitado
  if (!options?.keepLegacy) {
    await clearGroupCode();
  }

  return { code, isStrong: true, keys };
}

/**
 * Resolve o ingresso em um Grupo forte (Story 4.4).
 * Rejeita códigos vazios. Normaliza qualquer prefixo domus:// antes do parsing.
 * Recusa tentativas de pareamento com o código antigo de 6 caracteres com mensagem
 * amigável que orienta o uso do QR Code ou do segredo forte do aparelho principal.
 * Em caso de segredo inválido ou truncado, emite erro claro e nunca grava dados no armazenamento.
 * Suporta opção keepLegacy para preservar o código legado existente durante a convivência (Story 4.7).
 */
export async function resolveJoinSyncGroup(
  code: string,
  options?: { keepLegacy?: boolean },
): Promise<ActiveSyncGroup> {
  const raw = (code ?? "").trim();
  if (!raw) {
    throw new Error("Código de grupo vazio.");
  }

  let normalized = raw;
  if (normalized.toLowerCase().startsWith("domus://")) {
    normalized = normalized.slice("domus://".length).trim();
  }

  if (!normalized) {
    throw new Error("Código de grupo vazio.");
  }

  const parsed = parseGroupSecret(normalized);
  if (parsed.ok) {
    const finalCode = encodeGroupSecret(parsed.secret);
    const strongKeys = deriveStrongGroupKeys(parsed.secret);
    parsed.secret.fill(0);
    const keys: NostrSyncKeys = {
      privateKey: strongKeys.nostrPrivateKey,
      publicKey: strongKeys.nostrPublicKey,
      encryptionKey: strongKeys.encryptionKey,
      isStrong: true,
    };
    await saveStrongGroupSecret(finalCode);
    if (!options?.keepLegacy) {
      await clearGroupCode();
    }
    return { code: finalCode, isStrong: true, keys };
  }

  // Recusa códigos legados de 6 caracteres com erro explícito instrutivo
  const stripped = normalized.replace(/[\s\-\u00AD\u2010-\u2015\u2212\u200B-\u200D\u2060\uFEFF]+/g, "");
  if (parsed.reason === "legacy-code" || (!normalized.startsWith("DOMUS") && stripped.length === 6)) {
    throw new Error(LEGACY_CODE_DISCONTINUED_MESSAGE);
  }

  throw new Error("Segredo de grupo inválido.");
}

/**
 * Carrega todos os grupos configurados no dispositivo (Story 4.7 e Story 4.9).
 * Retorna o Grupo forte e o Grupo legado quando coexistindo.
 * Se a data de corte for atingida ou a versão for incompatível (Story 4.9), o canal legado
 * não é ativado (legacy = null) e sinaliza legacyCutoff = true.
 */
export async function loadCoexistingGroups(options?: {
  now?: number;
  version?: string;
}): Promise<CoexistingGroups> {
  let strong: ActiveSyncGroup | null = null;
  const strongSecret = await loadStrongGroupSecret();
  if (strongSecret) {
    const parsed = parseGroupSecret(strongSecret);
    if (parsed.ok) {
      const strongKeys = deriveStrongGroupKeys(parsed.secret);
      parsed.secret.fill(0);
      strong = {
        code: strongSecret,
        isStrong: true,
        keys: {
          privateKey: strongKeys.nostrPrivateKey,
          publicKey: strongKeys.nostrPublicKey,
          encryptionKey: strongKeys.encryptionKey,
          isStrong: true,
        },
      };
    }
  }

  let legacy: ActiveSyncGroup | null = null;
  const legacyCode = await loadGroupCode();
  const disabled = isLegacySyncDisabled(options);
  const legacyCutoff = Boolean(legacyCode && disabled);
  const legacyCutoffReason = legacyCutoff ? getLegacySyncDisabledReason(options) : null;

  if (legacyCode && !disabled) {
    const keys = await deriveKeysFromCode(legacyCode);
    legacy = {
      code: legacyCode,
      isStrong: false,
      keys: {
        ...keys,
        isStrong: false,
      },
    };
  }

  return {
    strong,
    legacy,
    legacyCutoff,
    legacyCutoffReason,
    legacyCode: legacyCode ?? null,
  };
}

/**
 * Carrega o grupo ativo durante o boot do sync engine.
 * Prioriza o segredo do Grupo forte. Se ausente, cai para o grupo legado
 * para manter compatibilidade durante a janela de transição.
 * Delega para loadCoexistingGroups().
 */
export async function loadActiveSyncGroup(options?: {
  now?: number;
  version?: string;
}): Promise<ActiveSyncGroup | null> {
  const { strong, legacy } = await loadCoexistingGroups(options);
  return strong ?? legacy;
}

/**
 * Remove tanto o segredo forte quanto o código legado dos armazenamentos.
 */
export async function clearAllSyncGroupSecrets(): Promise<void> {
  await Promise.all([clearGroupCode(), clearStrongGroupSecret()]);
}

/**
 * Determina se um aparelho é elegível para migrar para o Grupo forte (Story 4.8 e 4.9).
 * Elegível se e somente se conectado a um canal legado (inclusive pós-corte) e ainda sem Grupo forte ativo.
 */
export function canMigrateToStrongGroup(
  coexisting: CoexistingGroups,
  isStrongGroup?: boolean,
  groupCode?: string | null,
): boolean {
  if (coexisting.strong || isStrongGroup) return false;
  return Boolean(
    coexisting.legacy ||
      coexisting.legacyCutoff ||
      coexisting.legacyCode ||
      groupCode,
  );
}
