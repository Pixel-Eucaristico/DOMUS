// Orquestração do Grupo forte (Story 4.3): criação de novos grupos com segredo
// de 256 bits, persistência segura sem queda para AsyncStorage e carregamento
// priorizado no boot com compatibilidade para grupos legados.

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
  saveGroupCode,
  clearGroupCode,
} from "./syncStorage";
import { deriveKeysFromCode, type NostrSyncKeys } from "@/src/modules/nostrSync";

export interface ActiveSyncGroup {
  code: string;
  isStrong: boolean;
  keys: NostrSyncKeys;
}

/**
 * Cria exclusivamente um novo Grupo forte (Story 4.3).
 * Nunca mais utiliza o gerador legado de 6 caracteres.
 * Persiste o segredo em SecureStore (nativo) ou webSecrets (web) sem queda para AsyncStorage.
 */
export async function createStrongSyncGroup(): Promise<ActiveSyncGroup> {
  const secret = generateGroupSecret();
  const code = encodeGroupSecret(secret);
  const strongKeys = deriveStrongGroupKeys(secret);
  secret.fill(0);
  const keys: NostrSyncKeys = {
    privateKey: strongKeys.nostrPrivateKey,
    publicKey: strongKeys.nostrPublicKey,
    encryptionKey: strongKeys.encryptionKey,
  };

  // Persiste de forma segura; se falhar no nativo, lança erro e não conclui
  await saveStrongGroupSecret(code);
  // Limpa código legado anterior se houver
  await clearGroupCode();

  return { code, isStrong: true, keys };
}

/**
 * Resolve o ingresso em um grupo (Grupo forte ou legado).
 * Rejeita códigos vazios. Se o código começar com "DOMUS" e for inválido, lança erro
 * imediatamente sem cair para o armazenamento de grupo legado.
 */
export async function resolveJoinSyncGroup(code: string): Promise<ActiveSyncGroup> {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) {
    throw new Error("Código de grupo vazio.");
  }

  if (normalized.startsWith("DOMUS")) {
    const parsed = parseGroupSecret(normalized);
    if (!parsed.ok) {
      throw new Error("Segredo de grupo inválido.");
    }
    const finalCode = encodeGroupSecret(parsed.secret);
    const strongKeys = deriveStrongGroupKeys(parsed.secret);
    parsed.secret.fill(0);
    const keys: NostrSyncKeys = {
      privateKey: strongKeys.nostrPrivateKey,
      publicKey: strongKeys.nostrPublicKey,
      encryptionKey: strongKeys.encryptionKey,
    };
    await saveStrongGroupSecret(finalCode);
    await clearGroupCode();
    return { code: finalCode, isStrong: true, keys };
  }

  const keys = await deriveKeysFromCode(normalized);
  await saveGroupCode(normalized);
  await clearStrongGroupSecret();
  return { code: normalized, isStrong: false, keys };
}

/**
 * Carrega o grupo ativo durante o boot do sync engine.
 * Prioriza o segredo do Grupo forte. Se ausente, cai para o grupo legado
 * para manter compatibilidade durante a janela de transição.
 */
export async function loadActiveSyncGroup(): Promise<ActiveSyncGroup | null> {
  const strongSecret = await loadStrongGroupSecret();
  if (strongSecret) {
    const parsed = parseGroupSecret(strongSecret);
    if (parsed.ok) {
      const strongKeys = deriveStrongGroupKeys(parsed.secret);
      return {
        code: strongSecret,
        isStrong: true,
        keys: {
          privateKey: strongKeys.nostrPrivateKey,
          publicKey: strongKeys.nostrPublicKey,
          encryptionKey: strongKeys.encryptionKey,
        },
      };
    }
  }

  const legacy = await loadGroupCode();
  if (legacy) {
    const keys = await deriveKeysFromCode(legacy);
    return {
      code: legacy,
      isStrong: false,
      keys,
    };
  }

  return null;
}

/**
 * Remove tanto o segredo forte quanto o código legado dos armazenamentos.
 */
export async function clearAllSyncGroupSecrets(): Promise<void> {
  await Promise.all([clearGroupCode(), clearStrongGroupSecret()]);
}
