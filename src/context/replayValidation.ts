import type { SyncEvent } from "@packages/storage/src/eventStore";
import { PAYSLIP_KINDS, PAYSLIP_SOURCES } from "@packages/events/src/types";
import { PAYSLIP_PERIOD_PATTERN } from "@packages/domain/src/payslips";

/**
 * Conferências do replay local (Story 3.2) — puras, sem `react-native`.
 *
 * - `validateLocalEvent`: só a forma do envelope, depois de normalizar valores
 *   antigos. Diferente do `validateEnvelope` da 3.1 (estrito, para o sync):
 *   relógio errado ou `deviceId` vazio não recusam um evento local.
 * - `validatePayload`: campos que cada reducer (e o que o app deriva do estado)
 *   lê, com o tipo certo. O motivo nomeia o campo, nunca o valor.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type LocalEnvelopeProblem = "not_object" | "invalid_id" | "invalid_type" | "invalid_payload";

export type LocalEventCheck =
  | { ok: true; event: SyncEvent }
  | { ok: false; problem: LocalEnvelopeProblem };

/**
 * Forma mínima para o replay: `id` e `type` texto não vazio, `payload` objeto.
 * Normaliza sem recusar: payload em texto JSON → objeto; timestamp em texto →
 * número quando finito. Timestamp fora de faixa, em segundos ou não finito e
 * `deviceId` vazio ficam como estão. Nunca altera o item recebido.
 */
export function validateLocalEvent(raw: unknown): LocalEventCheck {
  if (!isPlainObject(raw)) return { ok: false, problem: "not_object" };
  if (!isNonEmptyString(raw.id)) return { ok: false, problem: "invalid_id" };
  if (!isNonEmptyString(raw.type)) return { ok: false, problem: "invalid_type" };

  let payload: unknown = raw.payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return { ok: false, problem: "invalid_payload" };
    }
  }
  if (!isPlainObject(payload)) return { ok: false, problem: "invalid_payload" };

  let timestamp: unknown = raw.timestamp;
  if (typeof timestamp === "string" && timestamp.trim() !== "") {
    const n = Number(timestamp);
    if (Number.isFinite(n)) timestamp = n;
  }

  return {
    ok: true,
    event: {
      ...(raw as unknown as SyncEvent),
      payload,
      timestamp: timestamp as number,
    },
  };
}

// ─── Payload por tipo ───────────────────────────────────────────────────────

export type Kind = "string" | "number" | "boolean" | "object" | "array";

export interface FieldSpec {
  kind: Kind | Kind[];
  optional?: boolean;
  /** Campos de um objeto aninhado. */
  fields?: Record<string, FieldSpec>;
  /** Campos de cada elemento (objeto) de um array. */
  each?: Record<string, FieldSpec>;
  /** Texto: não pode ser vazio (nem só espaços). */
  nonEmpty?: boolean;
  /** Texto: precisa casar o padrão. */
  pattern?: RegExp;
  /** Valor precisa ser um destes. */
  enum?: readonly unknown[];
}

const str: FieldSpec = { kind: "string" };
const num: FieldSpec = { kind: "number" };
const optStr: FieldSpec = { kind: "string", optional: true };
const optNum: FieldSpec = { kind: "number", optional: true };
const optBool: FieldSpec = { kind: "boolean", optional: true };

const TX_ITEMS: FieldSpec = {
  kind: "array",
  optional: true,
  each: { amount: num, categoryId: optStr, groupOverride: optStr },
};

/** Campos opcionais de transação que o reducer e o `calculate503020` leem. */
const TX_OPTIONAL: Record<string, FieldSpec> = {
  status: optStr,
  targetAccountId: optStr,
  description: optStr,
  categoryId: optStr,
  groupOverride: optStr,
  isCdbDividend: optBool,
  items: TX_ITEMS,
};

const ACCOUNT_OPTIONAL: Record<string, FieldSpec> = {
  name: optStr,
  cdbDividendsTotal: optNum,
  creditLimit: optNum,
};

/** Linha do holerite (rubrica ou desconto). */
const PAYSLIP_LINE: Record<string, FieldSpec> = { name: str, value: num };
/** Id de holerite: texto não vazio (revisão R4). */
const PAYSLIP_ID: FieldSpec = { kind: "string", nonEmpty: true };

/** Campos exigidos de um payload, por nome. */
export type PayloadSpec = Record<string, FieldSpec>;

/**
 * Campos exigidos por tipo, conferidos antes do reducer. Descreve sempre a
 * versão **atual** do formato de cada tipo (Story 3.8: o replay converte o
 * payload até a versão atual antes desta conferência). Tipo ausente aqui
 * (ex.: `ONBOARDING_FINISHED`, `SEASON_ENDED`) não lê nada do payload.
 */
export const PAYLOAD_SPECS: Readonly<Record<string, PayloadSpec>> = {
  // Domínio
  ACCOUNT_CREATED: { id: str, type: str, balance: num, ...ACCOUNT_OPTIONAL },
  ACCOUNT_UPDATED: { id: str, type: optStr, balance: optNum, ...ACCOUNT_OPTIONAL },
  ACCOUNT_DELETED: { id: str },
  TRANSACTION_CREATED: { id: str, accountId: str, type: str, amount: num, date: str, ...TX_OPTIONAL },
  TRANSACTION_UPDATED: {
    id: str, accountId: optStr, type: optStr, amount: optNum, date: optStr, ...TX_OPTIONAL,
  },
  TRANSACTION_DELETED: { id: str },
  CATEGORY_CREATED: { id: str, name: optStr, group: optStr },
  INVOICE_IMPORTED: { invoiceId: str, totalAmount: optNum, items: { kind: "array", optional: true } },
  INVOICE_CONFIRMED: { invoiceId: str },
  // Story 11.4: holerite (v1)
  // Revisão R4: id não vazio, period AAAA-MM, source e kind por enum. Valores
  // negativos são aceitos (descontos/estornos).
  PAYSLIP_RECORDED: {
    id: PAYSLIP_ID,
    period: { kind: "string", pattern: PAYSLIP_PERIOD_PATTERN },
    company: str,
    cnpj: optStr,
    grossSalary: num,
    netSalary: num,
    deductions: { kind: "array", each: PAYSLIP_LINE },
    earnings: { kind: "array", optional: true, each: PAYSLIP_LINE },
    fgts: optNum,
    source: { kind: "string", optional: true, enum: PAYSLIP_SOURCES },
    kind: { kind: "string", optional: true, enum: PAYSLIP_KINDS },
    transactionId: optStr,
  },
  PAYSLIP_DELETED: { id: PAYSLIP_ID },
  // Gamificação
  XP_GAINED: { amount: num, source: optStr },
  LEVEL_UP: { newLevel: num },
  STREAK_UPDATED: { currentStreak: num, longestStreak: num, lastActiveDate: str },
  ACHIEVEMENT_UNLOCKED: { achievementId: str, xpReward: num, rarity: optStr },
  MONTHLY_TROPHY_COMPLETED: { trophyId: str, monthKey: str, xpReward: num },
  // tier opcional: eventos antigos podem não ter; a tela trata ausente como bronze (Story 11.8)
  SEASONAL_TROPHY_SELECTED: { trophyId: str, monthKey: str, tier: optNum },
  SEASONAL_TROPHY_COMPLETED: { trophyId: str, monthKey: str, tier: optNum, xpReward: num },
  // Onboarding
  ONBOARDING_STARTED: { startDate: str, difficulty: str },
  ONBOARDING_STEP_COMPLETED: { step: str, day: num },
  ONBOARDING_DAY_COMPLETED: { day: num },
  ONBOARDING_ADJUSTED: { newDifficulty: str },
  // Temporada
  SEASON_STARTED: { seasonId: str, year: num, month: num, startDate: str },
  SEASON_EVALUATED: {
    archetype: str, seasonId: optStr, totalXp: optNum, level: optNum, budgetScore: optNum, streakDays: optNum,
  },
  ARCHETYPE_EVOLVED: { newArchetype: str },
  SEASON_BADGE_EARNED: { badgeId: str, name: optStr, seasonId: optStr },
  // Wishlist
  WISHLIST_LIST_CREATED: { id: str, name: str, createdAt: { kind: ["string", "number"], optional: true } },
  WISHLIST_ITEM_ADDED: {
    item: {
      kind: "object",
      fields: {
        id: str, listId: str, urgencyLevel: str, orderIndex: num, name: optStr, price: optNum, quantity: optNum,
      },
    },
  },
  WISHLIST_ITEM_UPDATED: {
    itemId: str,
    changes: {
      kind: "object",
      fields: { urgencyLevel: optStr, orderIndex: optNum, name: optStr, price: optNum, quantity: optNum },
    },
  },
  WISHLIST_ITEM_PRIORITY_CHANGED: { itemId: str, newUrgency: str, newOrderIndex: num },
  WISHLIST_ITEM_REORDERED: { itemId: str, newOrderIndex: num, urgencyLevel: str },
  WISHLIST_ITEM_REMOVED: { itemId: str },
  WISHLIST_PRICE_UPDATED: { itemId: str, newPrice: num },
  WISHLIST_ITEM_CONVERTED_TO_EXPENSE: { itemId: str },
  WISHLIST_SAVINGS_GOAL_SET: { itemId: str, savingsGoal: { kind: "object" } },
  WISHLIST_LIST_DELETED: { listId: str },
};

function matchesKind(value: unknown, kind: Kind): boolean {
  switch (kind) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isPlainObject(value);
    case "array":
      return Array.isArray(value);
  }
}

/** Devolve o caminho do primeiro campo inválido, ou `null`. */
function checkFields(obj: Record<string, unknown>, fields: Record<string, FieldSpec>, prefix: string): string | null {
  for (const [name, spec] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${name}` : name;
    const value = Object.prototype.hasOwnProperty.call(obj, name) ? obj[name] : undefined;
    if (value === undefined || value === null) {
      if (spec.optional) continue;
      return path;
    }
    const kinds = Array.isArray(spec.kind) ? spec.kind : [spec.kind];
    if (!kinds.some((k) => matchesKind(value, k))) return path;
    if (spec.nonEmpty && typeof value === "string" && value.trim() === "") return path;
    if (spec.pattern && typeof value === "string" && !spec.pattern.test(value)) return path;
    if (spec.enum && !spec.enum.includes(value)) return path;
    if (spec.fields) {
      const bad = checkFields(value as Record<string, unknown>, spec.fields, path);
      if (bad) return bad;
    }
    if (spec.each) {
      const arr = value as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const el = arr[i];
        const elPath = `${path}[${i}]`;
        if (!isPlainObject(el)) return elPath;
        const bad = checkFields(el, spec.each, elPath);
        if (bad) return bad;
      }
    }
  }
  return null;
}

/**
 * Confere o payload de um tipo conhecido. Devolve o caminho do campo ausente
 * ou com tipo errado (ex.: `"item.listId"`), ou `null` se está bom. `specs`
 * só é trocado em teste (Story 3.8: formato de uma versão simulada).
 */
export function validatePayload(
  type: string,
  payload: Record<string, unknown>,
  specs: Readonly<Record<string, PayloadSpec>> = PAYLOAD_SPECS,
): string | null {
  const spec = Object.prototype.hasOwnProperty.call(specs, type) ? specs[type] : undefined;
  if (!spec) return null;
  return checkFields(payload, spec, "");
}
