import type { SyncEvent } from "../../storage/src/eventStore";

/**
 * Validação pura do envelope de um evento recebido pelo sync (Story 3.1).
 *
 * Recusa só envelope malformado. Um `type` bem formado e desconhecido é
 * aceito (Sprint Change 2026-10-22): o replay o ignora até uma versão que
 * o conheça reprocessá-lo (Stories 3.2/3.3).
 *
 * Sem dependências de `react-native` — testável no vitest.
 */

export type EnvelopeRejectionReason =
  | "not_object"
  | "invalid_id"
  | "invalid_type"
  | "invalid_timestamp"
  | "invalid_device_id"
  | "invalid_payload";

export interface EnvelopeRejection {
  ok: false;
  reason: EnvelopeRejectionReason;
  /** `id` do item, só quando é texto (para diagnóstico). */
  id?: string;
  /** `type` do item, só quando é texto (para diagnóstico). */
  type?: string;
}

export interface EnvelopeAccepted {
  ok: true;
  event: SyncEvent;
}

export type EnvelopeValidationResult = EnvelopeAccepted | EnvelopeRejection;

/** Texto com pelo menos um caractere que não é espaço; o valor original é preservado. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 01/01/2020 00:00:00 UTC em ms. */
export const MIN_ENVELOPE_TIMESTAMP_MS = 1_577_836_800_000;
/** 01/01/2100 00:00:00 UTC em ms (exclusivo). */
export const MAX_ENVELOPE_TIMESTAMP_MS = 4_102_444_800_000;

/**
 * Inteiro seguro em ms dentro de [2020-01-01, 2100-01-01). Recusa segundos,
 * frações e valores absurdos (ex.: 1e300). A regra de relógio fica para a 3.5.
 */
function isValidTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= MIN_ENVELOPE_TIMESTAMP_MS &&
    value < MAX_ENVELOPE_TIMESTAMP_MS
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MAX_DIAGNOSTIC_LENGTH = 64;

/**
 * Versão segura para log: corta em `max` code points (padrão 64, sem partir emoji)
 * e escapa quebras de linha e outros caracteres de controle. Exportada para o
 * replay (Story 3.2) usar o mesmo escape nos motivos da Quarentena.
 */
export function diagnosticString(value: unknown, max: number = MAX_DIAGNOSTIC_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const points = Array.from(value);
  const cut = points.length > max ? points.slice(0, max).join("") + "…" : value;
  // eslint-disable-next-line no-control-regex
  return cut.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (c) => {
    const code = c.charCodeAt(0);
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    if (c === "\t") return "\\t";
    return "\\u" + code.toString(16).padStart(4, "0");
  });
}

/**
 * Valida um item recebido e devolve o `SyncEvent` normalizado ou o motivo da recusa.
 * Regras: `id`, `type`, `deviceId` texto não vazio (nem só espaços); `timestamp` inteiro
 * seguro em ms entre 2020-01-01 e 2100-01-01;
 * `payload` objeto (não nulo, não array); `signature` ausente (ou não texto) vira `""`.
 */
export function validateEnvelope(raw: unknown): EnvelopeValidationResult {
  if (!isPlainObject(raw)) return { ok: false, reason: "not_object" };

  const id = diagnosticString(raw.id);
  const type = diagnosticString(raw.type);
  const reject = (reason: EnvelopeRejectionReason): EnvelopeRejection => ({ ok: false, reason, id, type });

  if (!isNonEmptyString(raw.id)) return reject("invalid_id");
  if (!isNonEmptyString(raw.type)) return reject("invalid_type");
  if (!isValidTimestamp(raw.timestamp)) return reject("invalid_timestamp");
  if (!isNonEmptyString(raw.deviceId)) return reject("invalid_device_id");
  if (!isPlainObject(raw.payload)) return reject("invalid_payload");

  return {
    ok: true,
    event: {
      id: raw.id,
      type: raw.type,
      payload: raw.payload,
      timestamp: raw.timestamp,
      deviceId: raw.deviceId,
      signature: typeof raw.signature === "string" ? raw.signature : "",
    },
  };
}

export interface EnvelopePartition {
  valid: SyncEvent[];
  rejected: EnvelopeRejection[];
}

/** Valida cada item sozinho: um item ruim não derruba os outros. */
export function partitionEnvelopes(items: readonly unknown[]): EnvelopePartition {
  const valid: SyncEvent[] = [];
  const rejected: EnvelopeRejection[] = [];
  for (const item of items) {
    const result = validateEnvelope(item);
    if (result.ok) valid.push(result.event);
    else rejected.push(result);
  }
  return { valid, rejected };
}

/**
 * Linha de diagnóstico de um descarte: só id, type e motivo — nunca o conteúdo do payload.
 */
export function describeRejection(rejection: EnvelopeRejection): string {
  return `id=${rejection.id ?? "?"} type=${rejection.type ?? "?"} reason=${rejection.reason}`;
}
