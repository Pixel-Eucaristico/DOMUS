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
