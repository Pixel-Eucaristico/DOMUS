import type {
  OleriteReadingPayload,
  OleriteReadingAddedEvent,
} from "../../events/src/types";
import { EVENT_TYPES } from "../../events/src/types";
import { createEvent, generateId } from "../../events/src/factory";

export interface CreateOleriteReadingParams {
  id?: string;
  value: number;
  unit: string;
  confidence?: number;
  imageUri?: string;
  timestamp?: Date | string;
  location?: string;
}

export interface OleriteEvolutionPoint {
  id: string;
  value: number;
  unit: string;
  timestamp: string;
  delta: number | null;
  location?: string;
}

export function createOleriteReadingEvent(
  params: CreateOleriteReadingParams,
  deviceId: string = "local",
): OleriteReadingAddedEvent {
  let isoTimestamp: string;
  if (params.timestamp instanceof Date) {
    isoTimestamp = Number.isNaN(params.timestamp.getTime())
      ? new Date().toISOString()
      : params.timestamp.toISOString();
  } else if (typeof params.timestamp === "string" && params.timestamp.trim()) {
    const parsedDate = new Date(params.timestamp.trim());
    isoTimestamp = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : params.timestamp.trim();
  } else {
    isoTimestamp = new Date().toISOString();
  }

  const payload: OleriteReadingPayload = {
    id: params.id ?? generateId(),
    value: params.value,
    unit: params.unit.trim() || "L",
    confidence:
      typeof params.confidence === "number" && !Number.isNaN(params.confidence)
        ? Math.max(0, Math.min(1, params.confidence))
        : 1,
    imageUri: params.imageUri ?? "",
    timestamp: isoTimestamp,
    ...(params.location?.trim() ? { location: params.location.trim() } : {}),
  };

  return createEvent<OleriteReadingAddedEvent>(
    EVENT_TYPES.OLERITE_READING_ADDED,
    payload,
    deviceId,
  );
}

function normalizeReadingsInput(
  readings: Record<string, OleriteReadingPayload> | OleriteReadingPayload[] | undefined,
): OleriteReadingPayload[] {
  if (!readings) return [];
  return Array.isArray(readings) ? [...readings] : Object.values(readings);
}

/**
 * Retorna as leituras de olerite ordenadas cronologicamente (mais antiga -> mais recente).
 */
export function getChronologicalOleriteReadings(
  readings: Record<string, OleriteReadingPayload> | OleriteReadingPayload[] | undefined,
): OleriteReadingPayload[] {
  return normalizeReadingsInput(readings).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return a.timestamp.localeCompare(b.timestamp);
    }
    return timeA - timeB;
  });
}

/**
 * Calcula o consumo/variação média entre leituras consecutivas em ordem cronológica.
 * Retorna 0 se houver menos de 2 leituras compatíveis.
 */
export function calculateAverageOleriteConsumption(
  readings: Record<string, OleriteReadingPayload> | OleriteReadingPayload[] | undefined,
): number {
  const sorted = getChronologicalOleriteReadings(readings);
  if (sorted.length < 2) return 0;

  let totalDelta = 0;
  let validPairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const current = sorted[i]!;
    if (prev.unit !== current.unit) continue;
    const delta = current.value - prev.value;
    totalDelta += delta;
    validPairs++;
  }

  if (validPairs === 0) return 0;
  const average = totalDelta / validPairs;
  return Math.round(average * 100) / 100;
}

/**
 * Gera a série de evolução histórica com deltas consecutivos para exibição em gráfico/lista.
 */
export function getOleriteEvolutionSeries(
  readings: Record<string, OleriteReadingPayload> | OleriteReadingPayload[] | undefined,
): OleriteEvolutionPoint[] {
  const sorted = getChronologicalOleriteReadings(readings);
  return sorted.map((reading, index) => {
    const prev = index > 0 ? sorted[index - 1] : undefined;
    const delta =
      prev !== undefined && prev.unit === reading.unit
        ? Math.round((reading.value - prev.value) * 100) / 100
        : null;
    return {
      id: reading.id,
      value: reading.value,
      unit: reading.unit,
      timestamp: reading.timestamp,
      delta,
      ...(reading.location ? { location: reading.location } : {}),
    };
  });
}
