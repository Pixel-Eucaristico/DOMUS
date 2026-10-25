import type { SyncEvent } from "@packages/storage/src/eventStore";
import { compareEvents, eventTimestampKey } from "@packages/storage/src/eventOrder";
import { createEvent } from "@packages/events/src/factory";
import { GAMIFICATION_EVENTS, type XpGainedEvent, type XpGainedPayload } from "@packages/gamification/src/types";

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

/** Decimal simples: sinal opcional, dígitos e parte fracionária opcional. */
const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Texto decimal simples (espaços nas pontas são ignorados) vira número; o resto
 * devolve `undefined` (fica como está). Hexadecimal (`"0x1A"`), binário
 * (`"0b11"`), octal (`"0o7"`), expoente (`"1e3"`), `"Infinity"` e afins não são
 * horários e não viram número (o `Number()` puro aceitaria todos).
 */
export function numericTimestamp(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!PLAIN_DECIMAL.test(text)) return undefined;
  const n = Number(text);
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
 * primeiro), timestamp em texto numérico como número, na ordem total. Com o id
 * deste aparelho, `deviceId` "local"/vazio recebe o id (revisão de 23/10: o
 * banco não guarda mais "local" vindo de backup; é a mesma troca que a memória
 * faz ao carregar). Sem o id, e para o resto (payload), grava como veio; a
 * memória usa `prepareLocalLog`.
 */
export function prepareBackupForStorage(items: unknown, deviceId: string | null = null): PreparedLocalLog {
  const skippedIndexes: number[] = [];
  const objects: SyncEvent[] = [];
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        skippedIndexes.push(index);
        return;
      }
      const e = stampDeviceId(item as SyncEvent, deviceId);
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


// ─── Revisão de 23/10 (frente C): helpers puros usados pelos hooks ──────────

/** Resultado de `appendDispatched`. */
export interface DispatchAppendResult {
  /** Log em memória depois do `dispatch` (normalizado, sem repetidos, na ordem total). */
  events: SyncEvent[];
  /** O evento como é gravado (com o id do aparelho quando era vazio/"local"). */
  event: SyncEvent;
  /** `false` quando o id já estava no log: nada é gravado, contado nem sincronizado. */
  added: boolean;
}

/**
 * `dispatch` de um evento novo: carimba o id do aparelho (`stampDeviceId`) e o
 * junta ao log com `prepareLocalLog`. Id já presente em `prev` é descartado
 * (fica o primeiro, como o `INSERT OR IGNORE`) e `added` volta `false`.
 * Pura; não altera a entrada.
 */
export function appendDispatched(
  prev: readonly SyncEvent[],
  evt: SyncEvent,
  deviceId: string | null,
): DispatchAppendResult {
  const event = stampDeviceId(evt, deviceId);
  const id = event?.id;
  if (typeof id === "string" && prev.some((e) => e?.id === id)) {
    return { events: [...prev], event, added: false };
  }
  return { events: prepareLocalLog([...prev, event], deviceId).events, event, added: true };
}

/** Resultado de `appendGenerated`. */
export interface GeneratedAppendResult {
  /** Log em memória depois de juntar os eventos gerados. */
  events: SyncEvent[];
  /** Os eventos realmente novos, já carimbados, na ordem recebida — os que vão para o banco e para a contagem. */
  added: SyncEvent[];
}

/**
 * Eventos gerados pelo próprio app fora do `dispatch` (categorias padrão,
 * recuperação de XP): mesma regra do `dispatch` para cada um — carimbo do id
 * do aparelho, sem ids repetidos (nem com `prev` nem entre si), ordem total.
 * Pura; não altera a entrada.
 */
export function appendGenerated(
  prev: readonly SyncEvent[],
  evts: readonly SyncEvent[],
  deviceId: string | null,
): GeneratedAppendResult {
  const seen = new Set<string>();
  for (const e of prev) if (typeof e?.id === "string") seen.add(e.id);
  const added: SyncEvent[] = [];
  for (const raw of evts) {
    const event = stampDeviceId(raw, deviceId);
    const id = event?.id;
    if (typeof id === "string") {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    added.push(event);
  }
  if (added.length === 0) return { events: [...prev], added };
  return { events: prepareLocalLog([...prev, ...added], deviceId).events, added };
}

/**
 * Fim da hidratação: junta o log carregado (`prepared`, já saído de
 * `prepareLocalLog`) com os eventos despachados antes dela terminar (`prev`),
 * em vez de sobrescrevê-los. Id repetido: fica o do log carregado.
 * Pura; não altera a entrada.
 */
export function mergeHydrated(
  prepared: readonly SyncEvent[],
  prev: readonly SyncEvent[],
  deviceId: string | null,
): SyncEvent[] {
  if (prev.length === 0) return [...prepared];
  return prepareLocalLog([...prepared, ...prev], deviceId).events;
}

/**
 * `importEvents` do sync: junta ao log os eventos aceitos por
 * `selectEventsToImport`, com a mesma normalização, deduplicação (fica o já
 * existente) e ordem total da hidratação. Pura; não altera a entrada.
 */
export function mergeImported(
  prev: readonly SyncEvent[],
  imported: readonly SyncEvent[],
  deviceId: string | null,
): SyncEvent[] {
  if (imported.length === 0) return [...prev];
  return prepareLocalLog([...prev, ...imported], deviceId).events;
}

/**
 * Eventos de um backup a exportar (manual criptografado, manual simples e
 * automático): sem ids repetidos (fica o primeiro), "local"/vazio com o id real
 * deste aparelho (`eventsForExport`) e na ordem total. Pura; não altera a entrada.
 */
export function buildExportEvents(events: readonly SyncEvent[], deviceId: string | null): SyncEvent[] {
  const objects = events.filter((e) => typeof e === "object" && e !== null && !Array.isArray(e));
  return eventsForExport(dedupeById(objects).events, deviceId).sort(compareEvents);
}

// ─── Recuperação de XP ──────────────────────────────────────────────────────

/** Prefixo dos ids da recuperação de XP gravados antes da revisão de 23/10. */
export const LEGACY_XP_RECOVERY_ID_PREFIX = "xp-recovery-";
/** Marca no payload da recuperação de XP (ids novos vêm do `createEvent`, sem prefixo). */
export const XP_RECOVERY_MARKER = "xp-recovery";

/**
 * Evento de recuperação de XP: id e timestamp do mesmo instante (`createEvent`,
 * com o contador da 3.4) e a marca `recovery` no payload, que o reducer ignora.
 */
export function createXpRecoveryEvent(amount: number, deviceId: string | null): SyncEvent {
  const payload: XpGainedPayload & { description: string; recovery: string } = {
    amount,
    source: "streak_bonus",
    description: "Correção de XP Domus",
    recovery: XP_RECOVERY_MARKER,
  };
  const evt = createEvent<XpGainedEvent>(GAMIFICATION_EVENTS.XP_GAINED, payload, deviceId ?? "local");
  return { ...evt, type: evt.type as string, payload };
}

/** Recuperação de XP, do formato antigo (prefixo no id) ou do novo (marca no payload). */
export function isXpRecoveryEvent(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const { id, payload } = e as { id?: unknown; payload?: unknown };
  if (typeof id === "string" && id.startsWith(LEGACY_XP_RECOVERY_ID_PREFIX)) return true;
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { recovery?: unknown }).recovery === XP_RECOVERY_MARKER
  );
}
