import type { SyncEvent } from "@packages/storage/src/eventStore";
import { compareEvents, eventTimestampKey } from "@packages/storage/src/eventOrder";

/** Ordem total do log (Story 3.4): `(timestamp, deviceId, id)`. */
export { compareEvents };

/**
 * Normalização do log local ao carregar (hidratação) e ao restaurar backup
 * (Story 3.2) — pura, sem `react-native`.
 *
 * - item que não é objeto é pulado (só o índice é registrado), em vez de
 *   derrubar o carregamento do log inteiro;
 * - `deviceId` `"local"` (sem diferenciar maiúsculas), vazio ou ausente vira o
 *   id deste aparelho (sem o id, fica `"local"`);
 * - payload em texto JSON vira objeto (texto inválido fica como está e o
 *   replay o manda para a Quarentena);
 * - timestamp em texto numérico vira número (Story 3.4).
 *
 * Só altera a cópia em memória; não grava nada.
 */
/** `deviceId` ausente, vazio, só espaços ou o marcador `"local"` (qualquer caixa). */
export function isBlankDeviceId(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "" || value.trim().toLowerCase() === "local";
}

/** Texto numérico (não vazio, finito) vira número; o resto devolve `undefined` (fica como está). */
function numericTimestamp(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export interface NormalizedStoredEvents {
  events: SyncEvent[];
  /** Índices dos itens pulados por não serem objeto. */
  skippedIndexes: number[];
}

export function normalizeStoredEvents(items: unknown, deviceId: string | null): NormalizedStoredEvents {
  const events: SyncEvent[] = [];
  const skippedIndexes: number[] = [];
  if (!Array.isArray(items)) return { events, skippedIndexes };

  items.forEach((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      skippedIndexes.push(index);
      return;
    }
    const e = item as SyncEvent;
    let next: SyncEvent = e;

    if (isBlankDeviceId(e.deviceId) && deviceId) next = { ...next, deviceId };
    else if (isBlankDeviceId(e.deviceId) && e.deviceId !== "local") next = { ...next, deviceId: "local" };

    const ts = numericTimestamp(e.timestamp);
    if (ts !== undefined) next = { ...next, timestamp: ts };

    if (typeof e.payload === "string") {
      try {
        next = { ...next, payload: JSON.parse(e.payload) };
      } catch {
        // fica como texto; o replay coloca o evento na Quarentena
      }
    }
    events.push(next);
  });

  return { events, skippedIndexes };
}

/** Chave de ordenação tolerante: timestamp em texto vira número; não finito vale 0. */
export function eventSortKey(e: { timestamp: unknown }): number {
  return eventTimestampKey(e);
}

// ─── Story 3.4: log local pronto para a memória ─────────────────────────────

export interface PreparedLocalLog {
  /** Normalizados, sem ids repetidos e na ordem total (`compareEvents`). */
  events: SyncEvent[];
  /** Índices dos itens pulados por não serem objeto. */
  skippedIndexes: number[];
  /** Ids descartados por repetição (fica o primeiro, como o `INSERT OR IGNORE`). */
  duplicateIds: string[];
}

/**
 * Sem ids repetidos: fica a primeira ocorrência na ordem recebida, a mesma
 * regra do `INSERT OR IGNORE` do SQLite. Item sem `id` em texto não é
 * deduplicado (o replay o manda para a Quarentena). Não altera a entrada.
 */
export function dedupeById<T extends { id?: unknown }>(events: readonly T[]): { events: T[]; duplicateIds: string[] } {
  const seen = new Set<string>();
  const out: T[] = [];
  const duplicateIds: string[] = [];
  for (const e of events) {
    const id = e?.id;
    if (typeof id === "string") {
      if (seen.has(id)) {
        duplicateIds.push(id);
        continue;
      }
      seen.add(id);
    }
    out.push(e);
  }
  return { events: out, duplicateIds };
}

/**
 * Normaliza (`normalizeStoredEvents`), deduplica por id (fica o primeiro) e
 * ordena pela ordem total. Usado na hidratação, na restauração, no import do
 * sync e no `dispatch`, para que a memória tenha sempre a ordem que o log terá
 * ao ser recarregado. Pura; não altera a entrada.
 */
export function prepareLocalLog(items: unknown, deviceId: string | null): PreparedLocalLog {
  const { events: normalized, skippedIndexes } = normalizeStoredEvents(items, deviceId);
  const { events, duplicateIds } = dedupeById(normalized);
  return { events: events.sort(compareEvents), skippedIndexes, duplicateIds };
}

/**
 * Backup a gravar na restauração: só objetos, sem ids repetidos (fica o
 * primeiro), timestamp em texto numérico como número, na ordem total. O resto
 * (deviceId, payload) é gravado como veio; a memória usa `prepareLocalLog`.
 */
export function prepareBackupForStorage(items: unknown): PreparedLocalLog {
  const skippedIndexes: number[] = [];
  const objects: SyncEvent[] = [];
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        skippedIndexes.push(index);
        return;
      }
      const e = item as SyncEvent;
      const ts = numericTimestamp(e.timestamp);
      objects.push(ts !== undefined ? { ...e, timestamp: ts } : e);
    });
  }
  const { events, duplicateIds } = dedupeById(objects);
  return { events: events.sort(compareEvents), skippedIndexes, duplicateIds };
}

/**
 * Story 3.4/3.5: carimbo do `dispatch`. Com o id deste aparelho, um evento novo com
 * `deviceId` vazio/"local" recebe o id real (para não mudar de posição ao reabrir o app
 * nem sair como "local"); o resto (inclusive o `timestamp`) fica idêntico. Sem o id, ou
 * com `deviceId` já preenchido, devolve o próprio evento. Pura; não altera a entrada.
 */
export function stampDeviceId<T extends { deviceId?: unknown }>(event: T, deviceId: string | null): T {
  return deviceId && isBlankDeviceId(event.deviceId) ? { ...event, deviceId } : event;
}

/**
 * Eventos para exportar (backup manual e automático): `deviceId` "local" ou
 * vazio vira o id real deste aparelho, para que outro aparelho não o troque
 * pelo próprio id. Sem o id do aparelho, devolve como está.
 */
export function eventsForExport(events: readonly SyncEvent[], deviceId: string | null): SyncEvent[] {
  if (!deviceId) return [...events];
  return events.map((e) => (isBlankDeviceId(e?.deviceId) ? { ...e, deviceId } : e));
}

