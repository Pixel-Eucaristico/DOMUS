/**
 * Story 3.8: versão do formato do payload por tipo de evento — puro, sem `react-native`.
 *
 * `schemaVersion` mora no **payload** (o envelope do AD-2 não muda). Ausente = versão 1.
 * O registro declara a versão atual de cada tipo e as conversões `vN → vN+1`. O replay
 * converte o payload **em memória** até a versão atual antes de `validatePayload` e do
 * reducer; o log nunca é reescrito.
 *
 * Regra de evolução de um tipo:
 * - Campo novo é **opcional** por padrão: não precisa de versão nova.
 * - Campo **obrigatório** novo (ou mudança de significado) exige subir `current` e
 *   escrever a conversão `v(current-1) → current`, que preenche o campo nos eventos
 *   antigos. A conversão só preenche campo **ausente** (ex.: `p.currency ?? "BRL"`),
 *   nunca sobrescreve valor presente. `PAYLOAD_SPECS` (`src/context/replayValidation.ts`) descreve sempre a
 *   versão atual.
 * - A v2 de um tipo **já publicado** precisa continuar legível como v1 pelas versões
 *   instaladas (elas ignoram `schemaVersion` e aplicam o payload como v1): mantenha os
 *   campos da v1 preenchidos ou crie um tipo novo.
 * - Tipo novo que nasce versionado (ex.: `PAYSLIP_*`) entra com `current: 1` e
 *   `stamp: true`; o carimbo acontece no `appendDispatched`/`appendGenerated`.
 * - Nunca reescreva eventos do log; conversões são puras e não alteram a entrada
 *   (o replay passa a cada passo uma cópia profunda do payload).
 * - Nunca copie um objeto do estado nem o payload de outro evento para um payload
 *   novo: versões antigas guardam `schemaVersion` no estado (os reducers espalham o
 *   payload) e a cópia levaria uma versão errada para o evento novo.
 * - A gravação local (`appendDispatched`/`appendGenerated` e o modo demo) carimba
 *   sempre a versão atual, mesmo que o payload traga uma versão menor.
 *
 * `profileId` (perfil futuro, PRD §5): aceito no payload sem conferência de valor
 * (qualquer tipo é aceito, sem recusa); só a chave de topo do payload é retirada
 * (um `profileId` aninhado fica como está); e é retirado de **todo** tipo, então
 * nenhum reducer pode depender dele.
 *
 * Não confundir com o `schemaVersion` do backup (`BACKUP_SCHEMA_VERSION`), que
 * versiona o arquivo, não o evento.
 */

/** Campo da versão do formato no payload. */
export const SCHEMA_VERSION_FIELD = "schemaVersion";
/** Campo do perfil (futuro) no payload: aceito, sem efeito no estado. */
export const PROFILE_ID_FIELD = "profileId";
/** Metadados do payload retirados antes do reducer (os reducers espalham o payload no estado). */
export const PAYLOAD_METADATA_FIELDS: readonly string[] = [SCHEMA_VERSION_FIELD, PROFILE_ID_FIELD];

/** Converte um payload da versão N para a N+1. Pura: devolve um objeto novo. */
export type PayloadUpcaster = (payload: Readonly<Record<string, unknown>>) => Record<string, unknown>;

export interface TypeSchema {
  /** Versão atual do formato (inteiro ≥ 1). */
  current: number;
  /** Carimba `schemaVersion` mesmo em v1 (tipo que nasce versionado). */
  stamp?: boolean;
  /** `upcasters[N]` converte vN → vN+1. */
  upcasters?: Readonly<Record<number, PayloadUpcaster>>;
}

export type SchemaRegistry = Readonly<Record<string, TypeSchema>>;

/**
 * Registro real. Tipo ausente = versão atual 1, sem carimbo. Hoje todos os tipos
 * publicados estão na v1, então nada do formato publicado muda.
 * Story 11.4: `PAYSLIP_*` nascem versionados (`schemaVersion: 1` carimbado).
 */
export const SCHEMA_REGISTRY: SchemaRegistry = {
  PAYSLIP_RECORDED: { current: 1, stamp: true },
  PAYSLIP_DELETED: { current: 1, stamp: true },
};

export function currentSchemaVersion(type: string, registry: SchemaRegistry = SCHEMA_REGISTRY): number {
  return Object.prototype.hasOwnProperty.call(registry, type) ? registry[type]!.current : 1;
}

/** Decisão 2 (26/10): só tipos com versão atual > 1 ou que nascem versionados. */
export function shouldStampSchemaVersion(type: string, registry: SchemaRegistry = SCHEMA_REGISTRY): boolean {
  if (!Object.prototype.hasOwnProperty.call(registry, type)) return false;
  const schema = registry[type]!;
  return schema.current > 1 || schema.stamp === true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type SchemaVersionRead = { ok: true; version: number } | { ok: false };

/** Ausente (ou `undefined`) = 1; presente precisa ser inteiro seguro ≥ 1. */
export function readSchemaVersion(payload: Readonly<Record<string, unknown>>): SchemaVersionRead {
  if (!Object.prototype.hasOwnProperty.call(payload, SCHEMA_VERSION_FIELD)) return { ok: true, version: 1 };
  const v = payload[SCHEMA_VERSION_FIELD];
  if (v === undefined) return { ok: true, version: 1 };
  if (typeof v === "number" && Number.isSafeInteger(v) && v >= 1) return { ok: true, version: v };
  return { ok: false };
}

export type UpcastResult =
  | { ok: true; payload: Record<string, unknown>; fromVersion: number }
  | { ok: false; problem: "invalid_version" }
  | { ok: false; problem: "future_version"; version: number; current: number }
  | { ok: false; problem: "missing_upcaster"; from: number }
  | { ok: false; problem: "upcaster_error"; from: number; error: unknown };

/** Cópia rasa sem os metadados; devolve o próprio objeto quando não há nenhum. */
export function stripPayloadMetadata(payload: Record<string, unknown>): Record<string, unknown> {
  if (!PAYLOAD_METADATA_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(payload, f))) return payload;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!PAYLOAD_METADATA_FIELDS.includes(k)) out[k] = v;
  }
  return out;
}

/**
 * Converte o payload até a versão atual do tipo, passo a passo, e o devolve sem os
 * metadados (`schemaVersion`, `profileId`). Payload sem metadados e já na versão
 * atual volta o próprio objeto. Nunca altera a entrada.
 */
export function upcastPayload(
  type: string,
  payload: Record<string, unknown>,
  registry: SchemaRegistry = SCHEMA_REGISTRY,
): UpcastResult {
  const read = readSchemaVersion(payload);
  if (!read.ok) return { ok: false, problem: "invalid_version" };
  const current = currentSchemaVersion(type, registry);
  if (read.version > current) return { ok: false, problem: "future_version", version: read.version, current };

  let out = stripPayloadMetadata(payload);
  const upcasters = Object.prototype.hasOwnProperty.call(registry, type) ? registry[type]!.upcasters : undefined;
  for (let v = read.version; v < current; v++) {
    const step = upcasters && Object.prototype.hasOwnProperty.call(upcasters, v) ? upcasters[v] : undefined;
    if (typeof step !== "function") return { ok: false, problem: "missing_upcaster", from: v };
    let next: unknown;
    try {
      // Cópia profunda (payloads são JSON): uma conversão mal escrita que altere o
      // objeto, mesmo aninhado, não chega ao log. Não depende de `structuredClone`.
      next = step(JSON.parse(JSON.stringify(out)) as Record<string, unknown>);
    } catch (error) {
      return { ok: false, problem: "upcaster_error", from: v, error };
    }
    if (!isPlainObject(next)) {
      return { ok: false, problem: "upcaster_error", from: v, error: new TypeError("conversão não devolveu objeto") };
    }
    out = stripPayloadMetadata(next);
  }
  return { ok: true, payload: out, fromVersion: read.version };
}

/**
 * Carimbo da gravação local: tipo com versão atual > 1 (ou que nasce versionado) e
 * payload objeto recebe a versão atual — também quando traz uma versão menor ou
 * nenhuma (o evento é criado agora, pelo formato atual; sem isso ele seria
 * reconvertido no replay e perderia dado). Versão maior ou inválida fica como está
 * (o replay decide). O resto volta o próprio evento. Pura; não altera a entrada.
 */
export function stampSchemaVersion<T extends { type?: unknown; payload?: unknown }>(
  event: T,
  registry: SchemaRegistry = SCHEMA_REGISTRY,
): T {
  if (typeof event?.type !== "string" || !shouldStampSchemaVersion(event.type, registry)) return event;
  const payload = event.payload;
  if (!isPlainObject(payload)) return event;
  const current = currentSchemaVersion(event.type, registry);
  const read = readSchemaVersion(payload);
  if (!read.ok || read.version > current) return event;
  if (read.version === current && payload[SCHEMA_VERSION_FIELD] !== undefined) return event;
  return { ...event, payload: { ...payload, [SCHEMA_VERSION_FIELD]: current } };
}
