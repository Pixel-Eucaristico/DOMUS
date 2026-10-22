import { describe, it, expect } from "vitest";
import {
  validateEnvelope,
  partitionEnvelopes,
  describeRejection,
  MIN_ENVELOPE_TIMESTAMP_MS,
  MAX_ENVELOPE_TIMESTAMP_MS,
} from "../index";

const valid = (over: Record<string, unknown> = {}) => ({
  id: "evt-1",
  type: "TRANSACTION_CREATED",
  payload: { amount: 1000, description: "segredo" },
  timestamp: 1_700_000_000_000,
  deviceId: "dev-a",
  signature: "sig",
  ...over,
});

const omit = (key: string) => {
  const o: Record<string, unknown> = valid();
  delete o[key];
  return o;
};

describe("validateEnvelope", () => {
  it("aceita envelope completo e normaliza", () => {
    const r = validateEnvelope(valid());
    expect(r).toEqual({ ok: true, event: valid() });
  });

  it("descarta payload nulo, array, texto ou ausente", () => {
    for (const payload of [null, [], [1], "x", 3]) {
      expect(validateEnvelope(valid({ payload }))).toMatchObject({ ok: false, reason: "invalid_payload" });
    }
    expect(validateEnvelope(omit("payload"))).toMatchObject({ ok: false, reason: "invalid_payload" });
  });

  it("descarta id ausente, vazio ou não texto", () => {
    expect(validateEnvelope(omit("id"))).toMatchObject({ ok: false, reason: "invalid_id" });
    expect(validateEnvelope(valid({ id: "" }))).toMatchObject({ ok: false, reason: "invalid_id" });
    expect(validateEnvelope(valid({ id: 42 }))).toMatchObject({ ok: false, reason: "invalid_id" });
  });

  it("descarta type ausente, vazio ou número", () => {
    expect(validateEnvelope(omit("type"))).toMatchObject({ ok: false, reason: "invalid_type" });
    expect(validateEnvelope(valid({ type: "" }))).toMatchObject({ ok: false, reason: "invalid_type" });
    expect(validateEnvelope(valid({ type: 7 }))).toMatchObject({ ok: false, reason: "invalid_type" });
  });

  it("aceita type bem formado e desconhecido", () => {
    const r = validateEnvelope(valid({ type: "FUTURE_EVENT_X" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.type).toBe("FUTURE_EVENT_X");
  });

  it("descarta timestamp texto, NaN, Infinity, 0, negativo ou ausente", () => {
    for (const timestamp of ["1700000000000", NaN, Infinity, 0, -5, 1e300, 1_700_000_000, 1_700_000_000_000.5]) {
      expect(validateEnvelope(valid({ timestamp }))).toMatchObject({ ok: false, reason: "invalid_timestamp" });
    }
    expect(validateEnvelope(omit("timestamp"))).toMatchObject({ ok: false, reason: "invalid_timestamp" });
  });

  it("timestamp: inteiro seguro em ms entre 2020-01-01 (incl.) e 2100-01-01 (excl.)", () => {
    expect(validateEnvelope(valid({ timestamp: MIN_ENVELOPE_TIMESTAMP_MS })).ok).toBe(true);
    expect(validateEnvelope(valid({ timestamp: MAX_ENVELOPE_TIMESTAMP_MS - 1 })).ok).toBe(true);
    expect(validateEnvelope(valid({ timestamp: MIN_ENVELOPE_TIMESTAMP_MS - 1 }))).toMatchObject({ reason: "invalid_timestamp" });
    expect(validateEnvelope(valid({ timestamp: MAX_ENVELOPE_TIMESTAMP_MS }))).toMatchObject({ reason: "invalid_timestamp" });
  });

  it("descarta id/type/deviceId só com espaços, mas preserva o valor original", () => {
    expect(validateEnvelope(valid({ id: "   " }))).toMatchObject({ ok: false, reason: "invalid_id" });
    expect(validateEnvelope(valid({ type: "\t\n " }))).toMatchObject({ ok: false, reason: "invalid_type" });
    expect(validateEnvelope(valid({ deviceId: " " }))).toMatchObject({ ok: false, reason: "invalid_device_id" });
    const r = validateEnvelope(valid({ id: " evt-1 ", type: " T " }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.event.id).toBe(" evt-1 ");
      expect(r.event.type).toBe(" T ");
    }
  });

  it("descarta deviceId ausente, vazio ou não texto", () => {
    expect(validateEnvelope(omit("deviceId"))).toMatchObject({ ok: false, reason: "invalid_device_id" });
    expect(validateEnvelope(valid({ deviceId: "" }))).toMatchObject({ ok: false, reason: "invalid_device_id" });
    expect(validateEnvelope(valid({ deviceId: 1 }))).toMatchObject({ ok: false, reason: "invalid_device_id" });
  });

  it("signature ausente (ou não texto) vira string vazia", () => {
    const r = validateEnvelope(omit("signature"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.signature).toBe("");
    const r2 = validateEnvelope(valid({ signature: 5 }));
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.event.signature).toBe("");
  });

  it("descarta itens que não são objeto", () => {
    for (const raw of [null, undefined, "x", 1, [valid()]]) {
      expect(validateEnvelope(raw)).toMatchObject({ ok: false, reason: "not_object" });
    }
  });

  it("descarta campos extras do envelope normalizado", () => {
    const r = validateEnvelope(valid({ extra: "x" }));
    expect(r.ok && Object.keys(r.event).sort()).toEqual(
      ["deviceId", "id", "payload", "signature", "timestamp", "type"],
    );
  });
});

describe("partitionEnvelopes", () => {
  it("lote misto: 3 válidos + 2 ruins → 3 aceitos", () => {
    const items = [
      valid({ id: "a" }),
      valid({ id: "b", payload: null }),
      valid({ id: "c", type: "FUTURE_EVENT_X" }),
      valid({ id: "", type: "X" }),
      valid({ id: "e" }),
    ];
    const { valid: ok, rejected } = partitionEnvelopes(items);
    expect(ok.map((e) => e.id)).toEqual(["a", "c", "e"]);
    expect(rejected.map((r) => r.reason)).toEqual(["invalid_payload", "invalid_id"]);
  });
});

describe("describeRejection", () => {
  it("registra id/type/motivo sem o conteúdo do payload", () => {
    const r = validateEnvelope(valid({ timestamp: NaN }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const line = describeRejection(r);
      expect(line).toBe("id=evt-1 type=TRANSACTION_CREATED reason=invalid_timestamp");
      expect(line).not.toContain("segredo");
    }
  });

  it("usa ? quando id/type não são texto", () => {
    const r = validateEnvelope({ id: 1, type: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(describeRejection(r)).toBe("id=? type=? reason=invalid_id");
  });

  it("escapa quebras de linha e caracteres de controle", () => {
    const r = validateEnvelope({ id: "a\nFAKE reason=ok\r\u0007", type: "T\tX" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const line = describeRejection(r);
      expect(line).not.toMatch(/[\u0000-\u001f]/);
      expect(line).toBe("id=a\\nFAKE reason=ok\\r\\u0007 type=T\\tX reason=invalid_timestamp");
    }
  });

  it("corta em 64 code points sem partir emoji", () => {
    const id = "😀".repeat(70);
    const r = validateEnvelope({ id, type: "T" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.id).toBe("😀".repeat(64) + "…");
      expect(r.id).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
    }
  });
});
