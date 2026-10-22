import type { SyncEvent } from "@packages/storage/src/eventStore";

/**
 * Normalização do log local ao carregar (hidratação) e ao restaurar backup
 * (Story 3.2) — pura, sem `react-native`.
 *
 * - item que não é objeto é pulado (só o índice é registrado), em vez de
 *   derrubar o carregamento do log inteiro;
 * - `deviceId` `"local"`, vazio ou ausente vira o id deste aparelho;
 * - payload em texto JSON vira objeto (texto inválido fica como está e o
 *   replay o manda para a Quarentena).
 *
 * Só altera a cópia em memória; não grava nada.
 */
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

    const blankDevice = typeof e.deviceId !== "string" || e.deviceId.trim() === "" || e.deviceId === "local";
    if (blankDevice) next = { ...next, deviceId: deviceId || "local" };

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
  const n = typeof e.timestamp === "number" ? e.timestamp : Number(e.timestamp);
  return Number.isFinite(n) ? n : 0;
}
