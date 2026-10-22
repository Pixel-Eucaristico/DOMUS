import { describe, it, expect, vi } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";

// Nenhum reducer real lança erro com payload que passa na conferência por tipo;
// para exercitar o caminho "reducer lança erro" o reducer de domínio é envolvido
// e lança quando a conta tem um id marcador.
vi.mock("@packages/domain/src/reducer", async () => {
  const actual = await vi.importActual<typeof import("@packages/domain/src/reducer")>("@packages/domain/src/reducer");
  return {
    domainReducer: (state: unknown, event: { payload: { id?: string } }) => {
      if (event.payload.id === "boom") throw new TypeError("falha simulada");
      if (event.payload.id === "boom-long") throw new Error("linha 1\n" + "x".repeat(400));
      return actual.domainReducer(state as never, event as never);
    },
  };
});

import { replayAllEvents, MAX_REASON_LENGTH } from "../replay";

const T0 = 1_792_627_200_000;
let n = 0;
function ev(type: string, payload: object, id = `e-${++n}`): SyncEvent {
  return { id, type, payload, timestamp: T0 + ++n, deviceId: "dev-a", signature: "" };
}

const account = ev("ACCOUNT_CREATED", { id: "acc-1", name: "Carteira", type: "wallet", balance: 100 }, "acc");
const income = ev("TRANSACTION_CREATED", {
  id: "tx-1", accountId: "acc-1", type: "income", amount: 50, categoryId: "outros", date: "2026-10-01",
}, "tx1");

describe("replayAllEvents — reducer que lança erro", () => {
  it("vai para a Quarentena com a mensagem do erro e os demais são aplicados, sem efeito parcial", () => {
    const boom = ev("ACCOUNT_CREATED", { id: "boom", name: "X", type: "wallet", balance: 1 }, "boom-evt");
    const result = replayAllEvents([account, boom, income]);
    expect(result.quarantine).toEqual([
      { id: "boom-evt", type: "ACCOUNT_CREATED", kind: "reducer_error", reason: "erro no reducer: TypeError: falha simulada" },
    ]);
    const without = replayAllEvents([account, income]);
    expect(result.domain).toEqual(without.domain);
    expect(result.domain.accounts["acc-1"].balance).toBe(150);
  });

  it("mensagem longa com quebra de linha: escapada e cortada com '…'", () => {
    const boom = ev("ACCOUNT_CREATED", { id: "boom-long", name: "X", type: "wallet", balance: 1 }, "boom-long-evt");
    const [entry] = replayAllEvents([boom]).quarantine;
    expect(entry.kind).toBe("reducer_error");
    expect(entry.reason.startsWith("erro no reducer: Error: linha 1\\nxxx")).toBe(true);
    expect(entry.reason).not.toContain("\n");
    expect(entry.reason.endsWith("…")).toBe(true);
    // 160 code points + "…"; o "\n" escapado vira dois caracteres depois do corte
    expect(Array.from(entry.reason).length).toBeLessThanOrEqual(MAX_REASON_LENGTH + 2);
  });
});
