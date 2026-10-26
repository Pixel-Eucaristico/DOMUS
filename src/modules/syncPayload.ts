import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  describeRejection,
  partitionEnvelopes,
  type EnvelopeRejection,
} from "@packages/events/src/validateEnvelope";

/**
 * Parsing puro do conteúdo decriptado de um evento Nostr do DOMUS (Story 3.1).
 * Sem `react-native` nem `nostr-tools` — testável no vitest.
 */

export interface ParsedSyncPayload {
  events: SyncEvent[];
  rejected: EnvelopeRejection[];
  /** true quando o texto não é JSON: o evento do relay é ignorado inteiro. */
  malformedJson: boolean;
}

export function parseSyncPayloadDetailed(decrypted: string): ParsedSyncPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decrypted);
  } catch {
    return { events: [], rejected: [], malformedJson: true };
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const { valid, rejected } = partitionEnvelopes(items);
  return { events: valid, rejected, malformedJson: false };
}

/**
 * Revalida eventos antes de gravar (defesa em profundidade em `importEvents`).
 * Descartes são contados e registrados só com id/type/motivo — nunca o payload.
 */
export function filterImportableEvents(
  events: readonly unknown[],
  warn: (message: string) => void = (m) => console.warn(m),
): { valid: SyncEvent[]; discarded: number } {
  const { valid, rejected } = partitionEnvelopes(events);
  for (const r of rejected) {
    warn(`[EventStore] Envelope descartado na importação: ${describeRejection(r)}`);
  }
  if (rejected.length > 0) {
    warn(`[EventStore] ${rejected.length} evento(s) descartado(s) na importação.`);
  }
  return { valid, discarded: rejected.length };
}

export interface ImportSelection {
  /** Eventos a gravar, na ordem recebida, já validados e sem repetidos. */
  toAppend: SyncEvent[];
  /** Envelopes malformados descartados. */
  discarded: number;
  /** Válidos ignorados por já existirem (no log local ou antes no mesmo lote). */
  duplicates: number;
}

/**
 * Laço puro do `importEvents`: valida cada evento, ignora ids já gravados e
 * repetidos dentro do lote, e preserva a ordem. Não muta `existingIds`.
 */
export function selectEventsToImport(
  events: readonly unknown[],
  existingIds: ReadonlySet<string>,
  warn: (message: string) => void = (m) => console.warn(m),
): ImportSelection {
  const { valid, discarded } = filterImportableEvents(events, warn);
  const seen = new Set(existingIds);
  const toAppend: SyncEvent[] = [];
  let duplicates = 0;
  for (const evt of valid) {
    if (seen.has(evt.id)) {
      duplicates++;
      continue;
    }
    seen.add(evt.id);
    toAppend.push(evt);
  }
  return { toAppend, discarded, duplicates };
}

/**
 * Conjunto limitado de chaves já avisadas: devolve `true` só na primeira vez que
 * vê a chave. Ao passar de `maxSize`, esquece as mais antigas (ordem de inserção).
 */
export function createWarnOnce(maxSize = 1000): (key: string) => boolean {
  const seen = new Set<string>();
  return (key: string) => {
    if (seen.has(key)) return false;
    seen.add(key);
    while (seen.size > maxSize) {
      const oldest = seen.values().next().value as string;
      seen.delete(oldest);
    }
    return true;
  };
}

/** Linha única de resumo por pull; `null` quando nada foi descartado. */
export function describePullDiscards(stats: {
  discarded: number;
  total: number;
  malformedRelayEvents: number;
}): string | null {
  const { discarded, total, malformedRelayEvents } = stats;
  if (discarded === 0 && malformedRelayEvents === 0) return null;
  let line = `[NostrSync] Pull: ${discarded} descartados de ${total}`;
  if (malformedRelayEvents > 0) line += `; ${malformedRelayEvents} evento(s) do relay com JSON malformado`;
  return line + ".";
}

// ── Cursor dos relays (Story 3.6) ─────────────────────────────────────────────
// O cursor é o maior `created_at` (segundos, relógio da publicação no relay) já
// recebido. Nunca usa o `timestamp` de domínio do evento (relógio de quem o criou).

/** Chave nova do cursor dos relays no AsyncStorage (segundos de `created_at`). */
export const RELAY_CURSOR_KEY = "domus_relay_cursor_v1";
/** Chave antiga (`lastPullTs`, em ms de `timestamp` de domínio): ignorada e apagada. */
export const LEGACY_LAST_PULL_TS_KEY = "domus_nostr_last_pull_ts";
/** Folga ao montar o `since` da assinatura; a releitura é descartada pelo id. */
export const RELAY_CURSOR_OVERLAP_SEC = 60;
/** Sem cursor, a assinatura começa em `agora − 60 s` (como antes da 3.6). */
export const SUBSCRIPTION_DEFAULT_LOOKBACK_SEC = 60;

function isValidCreatedAt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * Avança o cursor para o maior `created_at` recebido. Nunca anda para trás;
 * valores não finitos, não numéricos ou ≤ 0 são ignorados.
 */
export function advanceRelayCursor(
  current: number | null,
  createdAts: readonly unknown[],
): number | null {
  let next = isValidCreatedAt(current) ? Math.floor(current) : null;
  for (const c of createdAts) {
    if (!isValidCreatedAt(c)) continue;
    const s = Math.floor(c);
    if (next === null || s > next) next = s;
  }
  return next;
}

/**
 * `since` da assinatura ao vivo: `cursor − RELAY_CURSOR_OVERLAP_SEC`; sem cursor,
 * `agora − 60 s`. Defesa extra: um cursor à frente do relógio local (publicador com
 * relógio adiantado) não leva o `since` para depois de `agora − 60 s`.
 */
export function subscriptionSince(cursor: number | null, nowSec: number): number {
  const fallback = Math.floor(nowSec) - SUBSCRIPTION_DEFAULT_LOOKBACK_SEC;
  if (!isValidCreatedAt(cursor)) return fallback;
  return Math.max(0, Math.min(Math.floor(cursor) - RELAY_CURSOR_OVERLAP_SEC, fallback));
}

/** Lê o valor salvo; qualquer coisa que não seja inteiro positivo vira `null`. */
export function parseRelayCursor(raw: string | null | undefined): number | null {
  if (raw == null || !/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Subconjunto do AsyncStorage usado pelo cursor (injetável no teste). */
export interface CursorStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

/**
 * Carrega o cursor da chave nova e apaga a chave antiga (`lastPullTs`), que não
 * é migrada: era em ms de `timestamp` de domínio, outro relógio. Falhas do
 * storage viram "sem cursor".
 */
export async function loadRelayCursor(storage: CursorStorage): Promise<number | null> {
  try {
    await storage.removeItem(LEGACY_LAST_PULL_TS_KEY);
  } catch {
    // tenta de novo no próximo boot
  }
  try {
    return parseRelayCursor(await storage.getItem(RELAY_CURSOR_KEY));
  } catch {
    return null;
  }
}
