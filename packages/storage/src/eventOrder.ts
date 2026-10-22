/**
 * Ordem total do log de eventos (Story 3.4) — pura, sem dependências.
 *
 * Critério único usado em todo lugar que ordena o log (memória, replay e o
 * `ORDER BY timestamp, deviceId, id` do SQLite):
 *
 * 1. `timestamp` como número (texto é convertido; não finito vale 0);
 * 2. `deviceId` como texto, comparado por unidade de código (sem
 *    `localeCompare`, que muda com o idioma do aparelho);
 * 3. `id` como texto, pelo mesmo critério.
 *
 * Empate total devolve 0, e o `Array.prototype.sort` (estável) mantém a ordem.
 */

/** Chave numérica do timestamp: texto vira número; não finito vale 0. */
export function eventTimestampKey(e: { timestamp?: unknown } | null | undefined): number {
  const raw = e?.timestamp;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function textKey(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return String(value);
  } catch {
    // ex.: objeto sem protótipo ou com toString que lança
    return "";
  }
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

type OrderableEvent = { timestamp?: unknown; deviceId?: unknown; id?: unknown } | null | undefined;

/** Comparador da ordem total `(timestamp, deviceId, id)`. */
export function compareEvents(a: OrderableEvent, b: OrderableEvent): number {
  const ta = eventTimestampKey(a);
  const tb = eventTimestampKey(b);
  if (ta !== tb) return ta < tb ? -1 : 1;
  const byDevice = compareText(textKey(a?.deviceId), textKey(b?.deviceId));
  if (byDevice !== 0) return byDevice;
  return compareText(textKey(a?.id), textKey(b?.id));
}

/** Cópia ordenada; nunca altera o array recebido. */
export function sortEvents<T extends OrderableEvent>(events: readonly T[]): T[] {
  return [...events].sort(compareEvents);
}
