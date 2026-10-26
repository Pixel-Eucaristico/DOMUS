import { describe, it, expect } from "vitest";
import {
  SCHEMA_REGISTRY,
  currentSchemaVersion,
  readSchemaVersion,
  shouldStampSchemaVersion,
  stampSchemaVersion,
  stripPayloadMetadata,
  upcastPayload,
  type SchemaRegistry,
} from "../index";

/**
 * Story 3.8: registro de versões do formato e conversão por passos. Registro só de
 * teste — os tipos reais continuam todos na v1.
 */

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

const T = "ACCOUNT_CREATED";

/** v1 → v2 preenche `currency`; v2 → v3 renomeia `balance` para `amount` (só para provar o encadeamento). */
const REG: SchemaRegistry = {
  [T]: {
    current: 3,
    upcasters: {
      1: (p) => ({ ...p, currency: p.currency ?? "BRL" }),
      2: (p) => {
        const { balance, ...rest } = p;
        return { ...rest, amount: balance };
      },
    },
  },
  BORN_VERSIONED: { current: 1, stamp: true },
  GAP: { current: 3, upcasters: { 1: (p) => ({ ...p, a: 1 }) } },
  THROWS: { current: 2, upcasters: { 1: () => { throw new Error("falhou"); } } },
  NOT_OBJECT: { current: 2, upcasters: { 1: () => [] as unknown as Record<string, unknown> } },
};

describe("readSchemaVersion", () => {
  it("ausente ou undefined = 1", () => {
    expect(readSchemaVersion({})).toEqual({ ok: true, version: 1 });
    expect(readSchemaVersion({ schemaVersion: undefined })).toEqual({ ok: true, version: 1 });
  });

  it("aceita inteiro seguro ≥ 1", () => {
    expect(readSchemaVersion({ schemaVersion: 1 })).toEqual({ ok: true, version: 1 });
    expect(readSchemaVersion({ schemaVersion: 99 })).toEqual({ ok: true, version: 99 });
  });

  it("recusa texto, 0, fração, negativo, null, não finito e inteiro inseguro", () => {
    for (const v of ["2", 0, 1.5, -1, null, NaN, Infinity, 2 ** 53, true, {}]) {
      expect(readSchemaVersion({ schemaVersion: v })).toEqual({ ok: false });
    }
  });
});

describe("registro", () => {
  it("registro real: todos os tipos na v1, nenhum carimbo", () => {
    expect(SCHEMA_REGISTRY).toEqual({});
    expect(currentSchemaVersion("ACCOUNT_CREATED")).toBe(1);
    expect(shouldStampSchemaVersion("ACCOUNT_CREATED")).toBe(false);
  });

  it("tipo fora do registro = v1; não herda do protótipo", () => {
    expect(currentSchemaVersion("QUALQUER", REG)).toBe(1);
    expect(currentSchemaVersion("toString", REG)).toBe(1);
    expect(shouldStampSchemaVersion("toString", REG)).toBe(false);
  });

  it("carimbo só com versão > 1 ou tipo que nasce versionado", () => {
    expect(shouldStampSchemaVersion(T, REG)).toBe(true);
    expect(shouldStampSchemaVersion("BORN_VERSIONED", REG)).toBe(true);
    expect(shouldStampSchemaVersion("OUTRO", REG)).toBe(false);
  });
});

describe("upcastPayload", () => {
  it("ausente = v1, converte por passos até a atual e tira schemaVersion/profileId", () => {
    const p = deepFreeze({ id: "a", balance: 100, profileId: "perfil-1" });
    expect(upcastPayload(T, p, REG)).toEqual({
      ok: true,
      fromVersion: 1,
      payload: { id: "a", amount: 100, currency: "BRL" },
    });
  });

  it("começa da versão declarada", () => {
    const p = deepFreeze({ id: "a", balance: 5, currency: "USD", schemaVersion: 2 });
    expect(upcastPayload(T, p, REG)).toEqual({
      ok: true,
      fromVersion: 2,
      payload: { id: "a", amount: 5, currency: "USD" },
    });
  });

  it("já na versão atual: sem conversão, sem metadados", () => {
    const p = deepFreeze({ id: "a", amount: 5, currency: "USD", schemaVersion: 3 });
    expect(upcastPayload(T, p, REG)).toEqual({ ok: true, fromVersion: 3, payload: { id: "a", amount: 5, currency: "USD" } });
  });

  it("registro real: payload sem metadados volta o próprio objeto", () => {
    const p = deepFreeze({ id: "a", balance: 1 });
    const r = upcastPayload(T, p);
    expect(r.ok && r.payload).toBe(p);
  });

  it("versão mais nova que a conhecida", () => {
    expect(upcastPayload(T, { schemaVersion: 4 }, REG)).toEqual({
      ok: false,
      problem: "future_version",
      version: 4,
      current: 3,
    });
    expect(upcastPayload(T, { schemaVersion: 2 })).toMatchObject({ ok: false, problem: "future_version" });
  });

  it("versão inválida", () => {
    for (const v of ["2", 0, 1.5, -3]) {
      expect(upcastPayload(T, { schemaVersion: v }, REG)).toEqual({ ok: false, problem: "invalid_version" });
    }
  });

  it("passo faltando", () => {
    expect(upcastPayload("GAP", {}, REG)).toEqual({ ok: false, problem: "missing_upcaster", from: 2 });
  });

  it("conversão que lança erro ou não devolve objeto", () => {
    expect(upcastPayload("THROWS", {}, REG)).toMatchObject({ ok: false, problem: "upcaster_error", from: 1 });
    expect(upcastPayload("NOT_OBJECT", {}, REG)).toMatchObject({ ok: false, problem: "upcaster_error", from: 1 });
  });

  it("conversão que altera objeto aninhado não toca a entrada (cópia profunda, R2)", () => {
    const reg: SchemaRegistry = {
      X: {
        current: 2,
        upcasters: {
          1: (p) => {
            ((p.item as Record<string, unknown>).tags as unknown[]).push("hack");
            (p.item as Record<string, unknown>).name = "mudou";
            return p;
          },
        },
      },
    };
    const input = { item: { name: "Fone", tags: ["a"] } };
    const before = JSON.parse(JSON.stringify(input));
    expect(upcastPayload("X", input, reg)).toEqual({
      ok: true,
      fromVersion: 1,
      payload: { item: { name: "mudou", tags: ["a", "hack"] } },
    });
    expect(input).toEqual(before);
  });

  it("conversão que altera o objeto recebido não toca a entrada", () => {
    const reg: SchemaRegistry = {
      X: {
        current: 2,
        upcasters: {
          1: (p) => {
            (p as Record<string, unknown>).hack = true;
            return { ...p };
          },
        },
      },
    };
    const input = { a: 1 };
    expect(upcastPayload("X", input, reg)).toEqual({ ok: true, fromVersion: 1, payload: { a: 1, hack: true } });
    expect(input).toEqual({ a: 1 });
  });
});

describe("stripPayloadMetadata", () => {
  it("tira só schemaVersion e profileId", () => {
    expect(stripPayloadMetadata({ a: 1, schemaVersion: 2, profileId: "p" })).toEqual({ a: 1 });
    const same = { a: 1 };
    expect(stripPayloadMetadata(same)).toBe(same);
  });
});

describe("stampSchemaVersion", () => {
  it("carimba a versão atual em tipo com versão > 1 e em tipo que nasce versionado", () => {
    const e = deepFreeze({ id: "1", type: T, payload: { id: "a" } });
    expect(stampSchemaVersion(e, REG)).toEqual({ id: "1", type: T, payload: { id: "a", schemaVersion: 3 } });
    const b = deepFreeze({ id: "2", type: "BORN_VERSIONED", payload: {} });
    expect(stampSchemaVersion(b, REG).payload).toEqual({ schemaVersion: 1 });
  });

  it("versão menor (ou undefined) é trocada pela atual (R1)", () => {
    const low = deepFreeze({ id: "1", type: T, payload: { a: 1, schemaVersion: 1 } });
    expect(stampSchemaVersion(low, REG).payload).toEqual({ a: 1, schemaVersion: 3 });
    const und = { id: "1", type: T, payload: { schemaVersion: undefined } };
    expect(stampSchemaVersion(und, REG).payload).toEqual({ schemaVersion: 3 });
  });

  it("tipo v1, payload não objeto ou versão atual/maior/inválida: devolve o próprio evento", () => {
    const v1 = { id: "1", type: "OUTRO", payload: { a: 1 } };
    expect(stampSchemaVersion(v1, REG)).toBe(v1);
    expect(stampSchemaVersion(v1)).toBe(v1);
    const text = { id: "1", type: T, payload: "{}" };
    expect(stampSchemaVersion(text, REG)).toBe(text);
    const has = { id: "1", type: T, payload: { schemaVersion: 3 } };
    expect(stampSchemaVersion(has, REG)).toBe(has);
    for (const v of [4, "2", 0, null]) {
      const e = { id: "1", type: T, payload: { schemaVersion: v } };
      expect(stampSchemaVersion(e, REG)).toBe(e);
    }
  });
});

describe("SCHEMA_REGISTRY real é bem formado (R6)", () => {
  it("current inteiro ≥ 1 e conversões 1..current-1 presentes", () => {
    const check = (registry: SchemaRegistry) => {
      const problems: string[] = [];
      for (const [type, schema] of Object.entries(registry)) {
        if (!Number.isSafeInteger(schema.current) || schema.current < 1) problems.push(`${type}: current`);
        for (let v = 1; v < schema.current; v++) {
          if (typeof schema.upcasters?.[v] !== "function") problems.push(`${type}: v${v}→v${v + 1}`);
        }
      }
      return problems;
    };
    expect(check(SCHEMA_REGISTRY)).toEqual([]);
    // O próprio verificador pega um registro mal configurado.
    expect(check({ A: { current: 0 }, B: { current: 3, upcasters: { 1: (p) => p } }, C: { current: 1.5 } })).toEqual([
      "A: current",
      "B: v2→v3",
      "C: current",
      "C: v1→v2",
    ]);
  });
});
